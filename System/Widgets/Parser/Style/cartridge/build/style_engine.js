/* ============================================================
   CARTRIDGE · ENGINE (ParserShell.spec.md FR-4) — Style, all 7 sweeps
   StyleParser.spec.md §4/§5 + the remaining-sweeps follow-up. Tier A
   throughout (Parser_guide.md §4): fuzzy pattern/phrase-list matching,
   confidence-weighted, no lexicon. Pure logic/data — reads only its own
   tokenize() output and CONFIG/CONTENT, never the DOM (FR-3), which is
   why its tests are plain TEST-1/TEST-2 node:test smoke tests, not
   TEST-8 fake-DOM (StyleParser.spec.md §9).
   ============================================================ */
var ENGINE = (function () {
  // Style has no closed-class word lists of its own (no lexicon, FR-4) —
  // declared as a separate top-level var and referenced by name in the
  // final return (not inlined as `CLOSED: {}`), matching Grammar's own
  // pattern and assemble.py's RETURN_OBJECT_RE, which cannot parse a
  // nested `{...}` literal inside the return statement itself.
  var CLOSED = {};

  // Same generic English tokenizer regex as Grammar's cartridge (SR-6,
  // match the neighbours) — tokenizing is not grammar-specific.
  function tokenize(text) {
    var toks = [], re = /[A-Za-zÀ-ɏ]+(?:['’][A-Za-z]+)*(?:-[A-Za-zÀ-ɏ]+(?:['’][A-Za-z]+)*)*|\d+(?:[.,]\d+)*|[.,;:!?…—–\-()"'“”‘’%]/g, m;
    while ((m = re.exec(text)) !== null) {
      var t = m[0];
      toks.push({ i: toks.length, text: t, start: m.index, end: m.index + t.length, isWord: /[A-Za-z\d]/.test(t), tags: [], final: null });
    }
    return toks;
  }

  // ---- sentence splitting (token-index ranges) ----
  // Heuristic (Tier A): a sentence ends at . ! or ? followed by whitespace
  // or end of input. Good enough for the reference slice's paragraph-level
  // rules; not a full abbreviation-aware sentence boundary detector.
  function splitSentences(toks) {
    var sentences = [], start = 0;
    for (var i = 0; i < toks.length; i++) {
      var t = toks[i];
      if (/^[.!?]$/.test(t.text)) {
        var next = toks[i + 1];
        // A sentence-ending mark is a boundary when it's the last token or
        // is followed by a whitespace gap (next token's start is past this
        // one's end — the tokenizer discards whitespace, so a gap is the
        // only signal that whitespace was there). A glued-on next token
        // (e.g. a decimal point mid-number) never reaches this branch at
        // all — tokenize()'s number pattern already consumes "3.14" whole.
        if (!next || next.start > t.end) {
          sentences.push({ start: start, end: i });
          start = i + 1;
        }
      }
    }
    if (start < toks.length) sentences.push({ start: start, end: toks.length - 1 });
    return sentences;
  }

  // No space before closing punctuation, none after an opening bracket/
  // quote — mirrors EXPLAINER.needSpace()'s own rule (style_explainer.js),
  // reimplemented locally rather than imported (ENGINE reads only its own
  // tokenize() output and CONFIG/CONTENT, never EXPLAINER — FR-3/FR-4).
  // Blindly joining every token with " " would render "etc ." / "( 2023 )"
  // / "45 %" — breaking any punctuation-adjacent rule regex (Latin
  // abbreviations, citation years, percent signs) that expects normal
  // English spacing.
  function joinsWithoutSpace(prevText, nextText) {
    if (/^[.,;:!?)%]$/.test(nextText)) return true;
    if (/^[("“]$/.test(prevText)) return true;
    return false;
  }

  function sentenceText(toks, sent) {
    var out = "";
    for (var i = sent.start; i <= sent.end; i++) {
      if (i > sent.start && !joinsWithoutSpace(toks[i - 1].text, toks[i].text)) out += " ";
      out += toks[i].text;
    }
    return out;
  }

  // Maps a character-offset regex match (run against the sentence's own
  // joined text — see sentenceText) back onto that sentence's token range,
  // since ParseResult spans/findings are token-index based (ParserShell.spec.md §6).
  // Mirrors sentenceText()'s own spacing rule so offsets line up exactly.
  function charRangeToTokenRange(toks, sent, charStart, charEnd) {
    var lo = null, hi = null, pos = 0;
    for (var i = sent.start; i <= sent.end; i++) {
      if (i > sent.start && !joinsWithoutSpace(toks[i - 1].text, toks[i].text)) pos += 1;
      var tokStart = pos, tokEnd = pos + toks[i].text.length;
      if (tokEnd > charStart && tokStart < charEnd) {
        if (lo === null) lo = i;
        hi = i;
      }
      pos = tokEnd;
    }
    if (lo === null) { lo = sent.start; hi = sent.start; }
    return { start: lo, end: hi };
  }

  function findAllMatches(re, text) {
    var out = [], m;
    re.lastIndex = 0;
    while ((m = re.exec(text)) !== null) {
      out.push({ start: m.index, end: m.index + m[0].length, text: m[0] });
      if (m[0].length === 0) re.lastIndex++; // guard against zero-width infinite loops
    }
    return out;
  }

  // ---- shared detectors, reused across genre passes (SR-4 — one helper,
  // not five copies) ----
  var PASSIVE_RE = /\b(am|is|are|was|were|be|being|been)\s+(\w+ed|made|given|taken|shown|held|found|brought|thought|kept|left|sent|built|felt|meant|said|told|heard|understood|chosen|broken|spoken|driven|written|done|seen|known|reached|born)\b/gi;
  // Elevated/unusual vocabulary — shared by Voice's overwriting check
  // (§4.3/§11.2) and Diction's offbeat-word check (§5.2/§12.2): both ask
  // "is this word doing more than plain work requires," just from two
  // angles (atmosphere vs. plainness) that the same closed list serves.
  var ORNATE_WORDS = ["resplendent", "cerulean", "majestic", "opulent", "effulgent", "verdant", "luminous", "ethereal", "sumptuous", "gilded"];
  // Long/inflated words with a short, plain equivalent — shared by
  // Brevity's §2.3/§9.2 and Simple/Descriptive English's §7.2.
  var INFLATED_WORDS = [["utilize", "use"], ["facilitate", "help"], ["commence", "start"], ["terminate", "end"], ["endeavour", "try"], ["endeavor", "try"], ["ascertain", "find out"], ["notwithstanding", "despite"], ["heretofore", "before now"], ["methodology", "method"]];

  function genreRuleHit(toks, sent, charMatch, ruleId, label, confidence) {
    var range = charRangeToTokenRange(toks, sent, charMatch.start, charMatch.end);
    return { range: range, id: ruleId, label: label, confidence: confidence, excerpt: charMatch.text };
  }

  // ---- hue resolution (AD-S4, StyleParser.spec.md — resolved) ----
  // Maps a sweep id (a genre or its antithesis) to a CONFIG.clausePalette
  // index, read from the cartridge's own manifest (config.yaml's
  // sweeps.items[].hue, matched by name against clausePalette). An
  // antithesis shares its genre's hue (same detector, two mutually
  // exclusive modes — StyleParser.spec.md's colour-model note). Cached
  // once per parse() call's module lifetime; CONFIG never changes at runtime.
  var _hueCache = null;
  function hueIndexForSweep(sweepId) {
    if (!_hueCache) {
      _hueCache = {};
      var items = (CONFIG.sweeps && CONFIG.sweeps.items) || [];
      var palette = CONFIG.clausePalette || [];
      items.forEach(function (item) {
        if (item.category !== "genre" || !item.hue) return;
        var idx = -1;
        for (var i = 0; i < palette.length; i++) { if (palette[i].name === item.hue) { idx = i; break; } }
        if (idx === -1) return;
        _hueCache[item.id] = idx;
        if (item.oppositeId) _hueCache[item.oppositeId] = idx;
      });
    }
    return _hueCache[sweepId];
  }

  // Turns a genre pass's flat `hits` list into ParseResult spans/findings/
  // clauses, tagging every clause with the sweep's hue (hueIndex) and
  // every finding with cat:"genre" (StyleParser.spec.md's Explainer needs
  // this to separate genre findings from register findings once 2+ sweeps
  // of different categories run together — see style_explainer.js).
  function buildGenreResult(hits, sweepId, opposite) {
    // Non-overlapping by construction (each detector scans disjoint
    // sentence text); sort by start so rendering walks in document order.
    hits.sort(function (a, b) { return a.range.start - b.range.start; });
    var hueIdx = hueIndexForSweep(sweepId);
    var spans = [], findings = [], clauses = [];
    hits.forEach(function (h) {
      var span = { start: h.range.start, end: h.range.end, id: h.id, label: h.label, kind: "clause", confidence: h.confidence, tent: h.confidence < CONFIG.tentativeThreshold };
      spans.push(span);
      var clause = { start: h.range.start, end: h.range.end, id: h.id, label: h.label + " (" + h.id + ")", abbr: h.id, dep: false };
      if (typeof hueIdx === "number") clause.hueIndex = hueIdx;
      clauses.push(clause);
      findings.push({
        id: h.id, label: h.label, severity: opposite ? "check" : "flag", spanRef: spans.length - 1,
        start: h.range.start, end: h.range.end, cat: "genre",
        explain: opposite
          ? "Recognised as “" + h.label.toLowerCase() + "” (§" + h.id + ") — a deliberate register, not an error to fix: “" + h.excerpt + "”."
          : "Matches §" + h.id + " (" + h.label + "): “" + h.excerpt + "”.",
        confidence: h.confidence,
      });
    });
    return { spans: spans, findings: findings, clauses: clauses };
  }

  // ---- Clarity / Obscurity pass (§1/§8) ----
  var VAGUE_PHRASES = ["a period of", "a number of", "a certain amount of", "considerable", "a great deal of"];
  var NEGATIVE_RE = /\b(not\s+\w*n't|does\s+not\s+\w+\s+no\b|do\s+not\s+\w+\s+no\b|was\s+not\s+very\b)/gi;
  var NOMINALISATION_RE = /\b(our|their|his|her|its|the)\s+(lack|absence|failure)\s+of\b/gi;

  function clarityPass(toks, opposite) {
    var sentences = splitSentences(toks);
    var hits = [];
    sentences.forEach(function (sent) {
      var stext = sentenceText(toks, sent);
      findAllMatches(PASSIVE_RE, stext).forEach(function (m) {
        hits.push(genreRuleHit(toks, sent, m, opposite ? "8.1" : "1.1", opposite ? "Passive voice as a distancing register" : "Use the active voice", 0.85));
      });
      if (!opposite) {
        findAllMatches(NEGATIVE_RE, stext).forEach(function (m) {
          hits.push(genreRuleHit(toks, sent, m, "1.2", "Put statements in positive form", 0.6));
        });
        findAllMatches(NOMINALISATION_RE, stext).forEach(function (m) {
          hits.push(genreRuleHit(toks, sent, m, "1.4", "Make characters the subjects of your sentences", 0.6));
        });
      }
      VAGUE_PHRASES.forEach(function (phrase) {
        var idx = stext.toLowerCase().indexOf(phrase);
        if (idx !== -1) hits.push(genreRuleHit(toks, sent, { start: idx, end: idx + phrase.length, text: stext.substr(idx, phrase.length) }, opposite ? "8.2" : "1.3", opposite ? "Abstraction as a deliberate screen" : "Use definite, specific, concrete language", 0.7));
      });
    });
    return hits;
  }

  // ---- Brevity / Verbosity pass (§2/§9) ----
  var WORDY_PHRASES = ["the fact that", "in the event that", "due to the fact that", "there is a", "there are many", "in order to", "at this point in time", "for the purpose of"];
  var HEDGE_INFLATION_PHRASES = ["it is generally felt that", "it is widely believed that", "a fairly significant number of", "somewhat unnecessary"];

  function brevityPass(toks, opposite) {
    var sentences = splitSentences(toks);
    var hits = [];
    sentences.forEach(function (sent) {
      var stext = sentenceText(toks, sent);
      var lower = stext.toLowerCase();
      if (!opposite) {
        WORDY_PHRASES.forEach(function (phrase) {
          var idx = lower.indexOf(phrase);
          if (idx !== -1) hits.push(genreRuleHit(toks, sent, { start: idx, end: idx + phrase.length, text: stext.substr(idx, phrase.length) }, "2.1", "Omit needless words", 0.65));
        });
        HEDGE_INFLATION_PHRASES.forEach(function (phrase) {
          var idx = lower.indexOf(phrase);
          if (idx !== -1) hits.push(genreRuleHit(toks, sent, { start: idx, end: idx + phrase.length, text: stext.substr(idx, phrase.length) }, "2.2", "If it is possible to cut a word out, always cut it out", 0.6));
        });
      }
      INFLATED_WORDS.forEach(function (pair) {
        var idx = lower.indexOf(pair[0]);
        if (idx !== -1) hits.push(genreRuleHit(toks, sent, { start: idx, end: idx + pair[0].length, text: stext.substr(idx, pair[0].length) }, opposite ? "9.2" : "2.3", opposite ? "Prefer the longer, more formal word" : "Never use a long word where a short one will do", 0.7));
      });
      if (opposite) {
        // §9.1 — sustained qualification/restatement as a chosen register:
        // heuristic proxy is a cumulative/periodic sentence (3+ commas).
        var commaCount = (stext.match(/,/g) || []).length;
        if (commaCount >= 3) hits.push(genreRuleHit(toks, sent, { start: 0, end: stext.length, text: stext }, "9.1", "Elaborate and qualify deliberately", 0.5));
      }
    });
    return hits;
  }

  // ---- Coherence / Incoherence pass (§3/§10) ----
  var COHERENCE_CONNECTORS = ["therefore", "however", "in addition", "moreover", "thus", "furthermore", "meanwhile", "similarly", "consequently", "as a result"];
  var DECISION_VERBS_RE = /\b(decided|concluded|announced|agreed|approved|declined|resolved)\b/i;
  var LONG_PARENTHETICAL_RE = /,\s*((?:\S+\s+){6,}?\S+),\s*\w+/;
  var PARALLEL_BREAK_RE = /\b\w+ing\b[^,.;]*,\s*\w+ing\b[^,.;]*,?\s*and\s+you\s+(must|should|need to)\s+\w+/i;

  function coherencePass(toks, opposite) {
    var sentences = splitSentences(toks);
    var texts = sentences.map(function (s) { return sentenceText(toks, s); });
    var hits = [];

    // §3.1/§10.1 — old-before-new: a non-first sentence opening with an
    // indefinite article is a fuzzy signal of new-info-first ordering
    // (Tier A heuristic — deliberately low confidence, not a hard rule).
    sentences.forEach(function (sent, i) {
      if (i === 0) return;
      var stext = texts[i];
      var m = /^(a|an)\b/i.exec(stext);
      if (m) hits.push(genreRuleHit(toks, sent, { start: 0, end: m[0].length, text: m[0] }, opposite ? "10.1" : "3.1", opposite ? "New-before-old ordering, for defamiliarisation" : "Old information before new information", 0.45));
    });

    // §3.2/§10.2 — cohesive paragraphs: absence of any connector across a
    // multi-sentence paragraph.
    if (sentences.length >= 3) {
      var full = texts.join(" ").toLowerCase();
      var hasConnector = COHERENCE_CONNECTORS.some(function (c) { return full.indexOf(c) !== -1; });
      if (!hasConnector) hits.push(genreRuleHit(toks, sentences[0], { start: 0, end: texts[0].length, text: texts[0] }, opposite ? "10.2" : "3.2", opposite ? "Deliberately disjointed juxtaposition" : "Build cohesive paragraphs", 0.55));
    }

    if (!opposite) {
      // §3.3 — keep related words together: a long parenthetical wedged
      // before a late decision-verb (no antithesis rule for this one).
      sentences.forEach(function (sent, i) {
        var stext = texts[i];
        var m = LONG_PARENTHETICAL_RE.exec(stext);
        if (m && DECISION_VERBS_RE.test(stext.slice(m.index))) hits.push(genreRuleHit(toks, sent, { start: m.index, end: m.index + m[0].length, text: m[0] }, "3.3", "Keep related words together", 0.5));
      });
      // §3.4 — parallelism: a gerund/gerund/"and you must" break (no
      // antithesis rule for this one either).
      sentences.forEach(function (sent, i) {
        var stext = texts[i];
        var m = PARALLEL_BREAK_RE.exec(stext);
        if (m) hits.push(genreRuleHit(toks, sent, { start: m.index, end: m.index + m[0].length, text: m[0] }, "3.4", "Express coordinate ideas in similar form", 0.6));
      });
    }
    return hits;
  }

  // ---- Voice / Affectation pass (§4/§11) ----
  var AFFECTED_PHRASES = ["one cannot but", "it behooves", "suffice it to say", "one is compelled to", "one cannot help but"];

  function voicePass(toks, opposite) {
    var sentences = splitSentences(toks);
    var hits = [];
    sentences.forEach(function (sent) {
      var stext = sentenceText(toks, sent);
      var lower = stext.toLowerCase();
      if (!opposite) {
        // §4.1 — no antithesis run: passive-as-distancing-register is
        // already Clarity/Obscurity's own §8.1, not duplicated here.
        findAllMatches(PASSIVE_RE, stext).forEach(function (m) {
          hits.push(genreRuleHit(toks, sent, m, "4.1", "Never use the passive where you can use the active", 0.85));
        });
      }
      AFFECTED_PHRASES.forEach(function (phrase) {
        var idx = lower.indexOf(phrase);
        if (idx !== -1) hits.push(genreRuleHit(toks, sent, { start: idx, end: idx + phrase.length, text: stext.substr(idx, phrase.length) }, opposite ? "11.1" : "4.2", opposite ? "Adopt a mannered or period voice" : "Write in a way that comes naturally", 0.6));
      });
      var ornateHits = ORNATE_WORDS.filter(function (w) { return lower.indexOf(w) !== -1; });
      // §4.3 flags overwriting only once 2+ ornate words pile up in one
      // sentence; §11.2 recognises the register from even a single one.
      if (ornateHits.length && (opposite || ornateHits.length >= 2)) {
        var w = ornateHits[0], idx = lower.indexOf(w);
        hits.push(genreRuleHit(toks, sent, { start: idx, end: idx + w.length, text: stext.substr(idx, w.length) }, opposite ? "11.2" : "4.3", opposite ? "Elevated, ornate prose for atmosphere" : "Do not overwrite", 0.6));
      }
    });
    return hits;
  }

  // ---- Diction / Ornament pass (§5/§12) ----
  var CLICHES = ["baptism of fire", "nose to the grindstone", "leave no stone unturned", "at the end of the day", "low-hanging fruit", "think outside the box", "tip of the iceberg", "level playing field", "back to square one"];
  var SIMILE_MARKERS_RE = /\b(like a|like an|as if|as though)\b/gi;

  function dictionPass(toks, opposite) {
    var sentences = splitSentences(toks);
    var hits = [];
    sentences.forEach(function (sent) {
      var stext = sentenceText(toks, sent);
      var lower = stext.toLowerCase();
      if (!opposite) {
        // §5.1 — no antithesis run: Ornament still bans dead metaphor
        // (freshness isn't lifted, only sparingness is — §12's own note).
        CLICHES.forEach(function (phrase) {
          var idx = lower.indexOf(phrase);
          if (idx !== -1) hits.push(genreRuleHit(toks, sent, { start: idx, end: idx + phrase.length, text: stext.substr(idx, phrase.length) }, "5.1", "Avoid dead metaphors and clichéd similes", 0.75));
        });
      }
      ORNATE_WORDS.forEach(function (w) { // reused from Voice — same "elevated word" question, opposite angle
        var idx = lower.indexOf(w);
        if (idx !== -1) hits.push(genreRuleHit(toks, sent, { start: idx, end: idx + w.length, text: stext.substr(idx, w.length) }, opposite ? "12.2" : "5.2", opposite ? "Reach for the unusual or elevated word" : "Prefer the standard to the offbeat", 0.55));
      });
      // §5.3 flags 2+ figures piling up in one sentence; §12.1 recognises
      // that same density as deliberate, sustained figuration.
      var simileHits = findAllMatches(SIMILE_MARKERS_RE, stext);
      if (simileHits.length >= 2) {
        simileHits.forEach(function (m) {
          hits.push(genreRuleHit(toks, sent, m, opposite ? "12.1" : "5.3", opposite ? "Dense, sustained original figuration" : "Use figures of speech sparingly", 0.6));
        });
      }
    });
    return hits;
  }

  // Dispatch table for parse() — one entry per genre sweep, each pass
  // returning a flat `hits` list (buildGenreResult turns it into
  // spans/findings/clauses, tagged with the sweep's own hue).
  var GENRE_SWEEPS = [
    { id: "clarity", pass: clarityPass, section: "1", label: "Clarity", oppSection: "8", oppLabel: "Obscurity" },
    { id: "brevity", pass: brevityPass, section: "2", label: "Brevity", oppSection: "9", oppLabel: "Verbosity" },
    { id: "coherence", pass: coherencePass, section: "3", label: "Coherence", oppSection: "10", oppLabel: "Incoherence" },
    { id: "voice", pass: voicePass, section: "4", label: "Voice", oppSection: "11", oppLabel: "Affectation" },
    { id: "diction", pass: dictionPass, section: "5", label: "Diction", oppSection: "12", oppLabel: "Ornament" },
  ];

  // ---- shared register-pass helpers (na/verdict) ----
  // Both register passes (Academic English, Simple/Descriptive English)
  // are scorecards: every rule in the sweep always produces exactly one
  // finding (na/check/info/flag) — deliberately unlike a genre pass,
  // which only emits a finding when something's actually hit
  // (Style_content.md's Schema note: "the whole feature is the full
  // checklist, not a decluttered flag list").
  function registerHelpers(toks) {
    function na(id, label) { return { id: id, label: label, severity: "na", cat: "register", explain: "§" + id + " (" + label + ") — no matching content in this input to evaluate.", confidence: 0.5 }; }
    function verdict(id, label, sev, explain, sent) {
      var range = sent ? sent : { start: 0, end: toks.length - 1 };
      return { id: id, label: label, severity: sev, cat: "register", explain: "§" + id + " (" + label + ") — " + explain, confidence: sev === "flag" ? 0.8 : sev === "info" ? 0.55 : 0.9, start: range.start, end: range.end };
    }
    return { na: na, verdict: verdict };
  }

  // ---- Academic English scorecard pass (§6) ----
  var SUBJECTIVE_QUALIFIERS = ["large", "often", "significant", "big", "huge", "small", "tiny", "many", "surprising", "dramatic"];
  var VALUE_LADEN = ["dramatic", "surprising", "disappointing", "concerning", "impressive", "alarming", "exciting"];
  var GENERIC_MOTION_VERBS = ["went up", "went down", "changed", "shifted", "moved"];
  var PRECISE_VERBS = ["plateaued", "diverged", "fluctuated", "monotonically increased", "monotonically decreased"];
  var FIRST_PERSON_FINDING_RE = /\bwe\s+(found|observed|discovered|noted)\b/i;
  var HEDGE_WORDS = ["may", "might", "could", "suggests", "suggest", "indicates", "indicate", "appears to", "appear to"];
  var CAUSAL_VERBS = ["causes", "cause", "drives", "drive", "induces", "induce"];
  var ASSOCIATIVE_PHRASES = ["is correlated with", "co-varies with", "is associated with", "was associated with"];
  var CONCESSIVE_WORDS = ["while", "though", "however", "that said", "although"];
  var CITATION_RE = /\b[A-Z][a-z]+\s+et al\.|\(\d{4}\)/;
  var PERCENT_RE = /\d+(\.\d+)?%/;
  var ABSOLUTE_NEAR_PERCENT_RE = /\(from\s+\d+(\.\d+)?\s+to\s+\d+(\.\d+)?/i;
  var DISPERSION_RE = /\b(SD|standard deviation|interquartile range|CI|confidence interval)\b/i;
  var PAST_TENSE_HINT_RE = /\b(measured|yielded|found|observed|collected|recorded|conducted)\b/i;
  var PRESENT_TENSE_FINDING_RE = /\b(is|are)\s+\w+ed\b/;

  function containsAny(text, list) {
    var lower = text.toLowerCase();
    return list.some(function (w) { return lower.indexOf(w) !== -1; });
  }

  function academicEnglishPass(toks) {
    var sentences = splitSentences(toks);
    var texts = sentences.map(function (s) { return sentenceText(toks, s); });
    var full = texts.join(" ");
    var H = registerHelpers(toks);

    var findings = [];

    // 6.1 Tense precision
    var methodologySent = sentences.filter(function (s, i) { return PAST_TENSE_HINT_RE.test(texts[i]); });
    if (methodologySent.length) {
      var presentViolation = sentences.filter(function (s, i) { return PRESENT_TENSE_FINDING_RE.test(texts[i]) && !/figure|table/i.test(texts[i]); });
      findings.push(presentViolation.length
        ? H.verdict("6.1", "Tense precision", "flag", "present tense used for a completed finding — prefer past tense.", presentViolation[0])
        : H.verdict("6.1", "Tense precision", "check", "past tense used for methodology/findings.", methodologySent[0]));
    } else findings.push(H.na("6.1", "Tense precision"));

    // 6.2 Quantification over qualification
    var qualIdx = texts.findIndex(function (t) { return containsAny(t, SUBJECTIVE_QUALIFIERS); });
    if (qualIdx !== -1) {
      var hasNumber = /\d/.test(texts[qualIdx]);
      var hasDispersion = DISPERSION_RE.test(texts[qualIdx]);
      findings.push(!hasNumber
        ? H.verdict("6.2", "Quantification over qualification", "flag", "a subjective qualifier appears with no accompanying number.", sentences[qualIdx])
        : hasDispersion
          ? H.verdict("6.2", "Quantification over qualification", "check", "a central tendency is paired with a dispersion measure.", sentences[qualIdx])
          : H.verdict("6.2", "Quantification over qualification", "info", "a number is present but no dispersion measure (SD, CI, IQR) accompanies it.", sentences[qualIdx]));
    } else findings.push(H.na("6.2", "Quantification over qualification"));

    // 6.3 Non-evaluative language
    var valueIdx = texts.findIndex(function (t) { return containsAny(t, VALUE_LADEN); });
    findings.push(valueIdx !== -1
      ? H.verdict("6.3", "Non-evaluative language", "flag", "a value-laden adjective appears in a results statement.", sentences[valueIdx])
      : H.verdict("6.3", "Non-evaluative language", "check", "no value-laden adjectives detected."));

    // 6.4 Precise relational verbs
    var genericIdx = texts.findIndex(function (t) { return containsAny(t, GENERIC_MOTION_VERBS); });
    var preciseIdx = texts.findIndex(function (t) { return containsAny(t, PRECISE_VERBS); });
    if (genericIdx !== -1) findings.push(H.verdict("6.4", "Precise relational verbs", "flag", "a generic motion verb describes a quantitative change — prefer a precise relational verb (plateaued, diverged, fluctuated…).", sentences[genericIdx]));
    else if (preciseIdx !== -1) findings.push(H.verdict("6.4", "Precise relational verbs", "check", "a precise relational verb is used.", sentences[preciseIdx]));
    else findings.push(H.na("6.4", "Precise relational verbs"));

    // 6.5 Dual absolute and relative framing
    var pctIdx = texts.findIndex(function (t) { return PERCENT_RE.test(t); });
    if (pctIdx !== -1) {
      findings.push(ABSOLUTE_NEAR_PERCENT_RE.test(texts[pctIdx])
        ? H.verdict("6.5", "Dual absolute and relative framing", "check", "a percentage is paired with its absolute values.", sentences[pctIdx])
        : H.verdict("6.5", "Dual absolute and relative framing", "flag", "a percentage appears with no accompanying absolute values.", sentences[pctIdx]));
    } else findings.push(H.na("6.5", "Dual absolute and relative framing"));

    // 6.6 Agentless, data-centric framing
    var agentIdx = texts.findIndex(function (t) { return FIRST_PERSON_FINDING_RE.test(t); });
    findings.push(agentIdx !== -1
      ? H.verdict("6.6", "Agentless, data-centric framing", "flag", "first-person research-verb phrasing (“we found…”) — prefer passive, data-centric framing.", sentences[agentIdx])
      : H.verdict("6.6", "Agentless, data-centric framing", "check", "results reporting stays data-centric."));

    // 6.7 Epistemic hedging (Tier A template suggestion — AD-S2)
    var interpIdx = texts.findIndex(function (t, i) { return i > 0 && /\b(this|these|therefore|thus)\b/i.test(t); });
    if (interpIdx !== -1) {
      findings.push(containsAny(texts[interpIdx], HEDGE_WORDS)
        ? H.verdict("6.7", "Epistemic hedging", "check", "a hedge word is present.", sentences[interpIdx])
        : H.verdict("6.7", "Epistemic hedging", "info", "consider a hedge such as “may”, “might”, or “suggests”.", sentences[interpIdx]));
    } else findings.push(H.na("6.7", "Epistemic hedging"));

    // 6.8 Causal versus associative distinction
    var causalIdx = texts.findIndex(function (t) { return containsAny(t, CAUSAL_VERBS); });
    if (causalIdx !== -1) findings.push(H.verdict("6.8", "Causal versus associative distinction", "info", "causal language is used — confirm the study design supports it, or switch to associative framing.", sentences[causalIdx]));
    else {
      var assocIdx = texts.findIndex(function (t) { return containsAny(t, ASSOCIATIVE_PHRASES); });
      findings.push(assocIdx !== -1 ? H.verdict("6.8", "Causal versus associative distinction", "check", "associative framing is used.", sentences[assocIdx]) : H.na("6.8", "Causal versus associative distinction"));
    }

    // 6.9 Boundary and scope framing (Tier A template suggestion — AD-S2)
    if (interpIdx !== -1) {
      findings.push(containsAny(texts[interpIdx], CONCESSIVE_WORDS)
        ? H.verdict("6.9", "Boundary and scope framing", "check", "a concessive clause marks the limits of this interpretation.", sentences[interpIdx])
        : H.verdict("6.9", "Boundary and scope framing", "info", "consider a concessive clause (“while…”, “though…”) to mark this claim's limits.", sentences[interpIdx]));
    } else findings.push(H.na("6.9", "Boundary and scope framing"));

    // 6.10 Attribution and epistemic distance
    findings.push(CITATION_RE.test(full)
      ? H.verdict("6.10", "Attribution and epistemic distance", "check", "a citation-shaped reference is present.")
      : H.na("6.10", "Attribution and epistemic distance"));

    return findings;
  }

  // ---- Simple/Descriptive English scorecard pass (§7, ASD-STE100-paraphrased) ----
  var PHRASAL_VERBS = ["take off", "put back", "turn on", "turn off", "hook up", "set up", "carry out", "check out", "look into"];
  var CONTRACTION_RE = /\b\w+n't\b|\b(it's|that's|there's|let's|we're|you're|they're|i'm|he's|she's)\b/i;
  var MODAL_PASSIVE_RE = /\b(should|must|will|can|could|would)\s+be\s+\w+ed\b/i;
  var NOMINALIZED_ACTION_RE = /\b(do|make|perform|conduct)\s+(a|an|the)\s+(\w+ion|\w+ment|\w+ance)\s+of\b/i;
  var COMPLEX_TENSE_RE = /\b(has been|have been|had been|will have been|having)\b/i;
  // e.g./i.e. tokenize into 4 separate letter/period tokens each (no
  // internal-abbreviation awareness — splitSentences()'s own documented
  // limit) and sentenceText() puts a space back after each inner period
  // ("e. g."), so this tolerates that one residual gap; single-period
  // abbreviations (etc./cf./vs.) reconstruct with no gap at all.
  var LATIN_ABBR_RE = /\b(e\.\s?g\.|i\.\s?e\.|etc\.|cf\.|vs\.)/i;
  var IMPERATIVE_VERBS = ["remove", "install", "tighten", "check", "inspect", "replace", "disconnect", "connect", "open", "close", "lift", "attach", "fit"];
  var ARTICLE_RE = /\b(the|a|an|this|that|these|those)\b/i;
  var MODAL_INSTRUCTION_RE = /\b(should be|you should|must be)\s+\w+/i;
  var STATE_ADJ_RE = /\b(is|are)\s+(hot|high|low|full|empty|open|closed|live|energised|energized)\b/i;
  // Near-synonym pairs — presence of BOTH members flags inconsistent naming.
  // §7.16 ("key words for structure") is scoped to action verbs; §7.19
  // ("consistent terminology") is scoped to part/component nouns — two
  // different pair-lists, one shared detection mechanism (SR-4).
  var ACTION_SYNONYM_PAIRS = [["remove", "take out"], ["install", "fit"]];
  var PART_SYNONYM_PAIRS = [["panel", "cover"], ["bolt", "screw"]];
  var CONNECTOR_WORDS_SDE = ["then", "next", "after that", "before", "once"];

  function simpleDescriptiveEnglishPass(toks) {
    var sentences = splitSentences(toks);
    var texts = sentences.map(function (s) { return sentenceText(toks, s); });
    var full = texts.join(" ");
    var lowerFull = full.toLowerCase();
    var wordCounts = texts.map(function (t) { return t.split(/\s+/).filter(Boolean).length; });
    var H = registerHelpers(toks);

    var findings = [];

    // 7.1 approved technical term — no controlled-vocabulary lookup exists
    // in this Tier-A build (needs a real terminology dictionary — Tier-B
    // territory, same reasoning as Academic English's §6.10 out-of-scope note).
    findings.push(H.na("7.1", "Use the approved technical term"));

    // 7.2 short, familiar word (reuses Brevity's INFLATED_WORDS list, SR-4)
    var longWordIdx = texts.findIndex(function (t) { var lt = t.toLowerCase(); return INFLATED_WORDS.some(function (p) { return lt.indexOf(p[0]) !== -1; }); });
    findings.push(longWordIdx !== -1
      ? H.verdict("7.2", "Prefer the short, familiar word", "flag", "a long/technical word appears where a short, familiar one would do.", sentences[longWordIdx])
      : H.verdict("7.2", "Prefer the short, familiar word", "check", "no inflated vocabulary detected."));

    // 7.3 no compound verb constructions
    var modalIdx = texts.findIndex(function (t) { return MODAL_PASSIVE_RE.test(t); });
    findings.push(modalIdx !== -1
      ? H.verdict("7.3", "No compound verb constructions", "flag", "a modal/auxiliary verb chain is used — prefer a simple form.", sentences[modalIdx])
      : H.verdict("7.3", "No compound verb constructions", "check", "no compound verb chains detected."));

    // 7.4 use the active voice (reuses PASSIVE_RE, SR-4)
    var passiveIdx = texts.findIndex(function (t) { return PASSIVE_RE.test(t); });
    findings.push(passiveIdx !== -1
      ? H.verdict("7.4", "Use the active voice", "flag", "a passive construction is used — prefer the active voice.", sentences[passiveIdx])
      : H.verdict("7.4", "Use the active voice", "check", "no passive constructions detected."));

    // 7.5 use a verb to describe an action
    var nominalIdx = texts.findIndex(function (t) { return NOMINALIZED_ACTION_RE.test(t); });
    findings.push(nominalIdx !== -1
      ? H.verdict("7.5", "Use a verb to describe an action", "flag", "an action is turned into a noun phrase — use the verb directly.", sentences[nominalIdx])
      : H.verdict("7.5", "Use a verb to describe an action", "check", "no nominalised actions detected."));

    // 7.6 approved verb forms only
    var complexTenseIdx = texts.findIndex(function (t) { return COMPLEX_TENSE_RE.test(t); });
    findings.push(complexTenseIdx !== -1
      ? H.verdict("7.6", "Approved verb forms only", "flag", "a complex tense form is used — restrict to infinitive, imperative, simple present/past/future, or past participle as adjective.", sentences[complexTenseIdx])
      : H.verdict("7.6", "Approved verb forms only", "check", "no disallowed verb forms detected."));

    // 7.7 short, clear sentences, no more than 20 words
    var longSentIdx = wordCounts.findIndex(function (n) { return n > 20; });
    findings.push(longSentIdx !== -1
      ? H.verdict("7.7", "Short, clear sentences, no more than 20 words", "flag", "a sentence exceeds the 20-word cap (" + wordCounts[longSentIdx] + " words).", sentences[longSentIdx])
      : H.verdict("7.7", "Short, clear sentences, no more than 20 words", "check", "every sentence is within the 20-word cap."));

    // 7.8 no contractions, no omitted words
    var contractionIdx = texts.findIndex(function (t) { return CONTRACTION_RE.test(t); });
    findings.push(contractionIdx !== -1
      ? H.verdict("7.8", "No contractions, no omitted words", "flag", "a contraction is used — spell out the full form.", sentences[contractionIdx])
      : H.verdict("7.8", "No contractions, no omitted words", "check", "no contractions detected."));

    // 7.9 vertical lists for complex text — nothing complex present -> N/A
    // (Style_content.md's own example of a legitimate N/A case).
    var complexIdx = texts.findIndex(function (t) { return (t.match(/\band\b/gi) || []).length >= 2 || (t.match(/,/g) || []).length >= 3; });
    findings.push(complexIdx !== -1
      ? H.verdict("7.9", "Vertical lists for complex text", "info", "a complex multi-part instruction could be a vertical list instead.", sentences[complexIdx])
      : H.na("7.9", "Vertical lists for complex text"));

    // 7.10 connecting words link related sentences
    if (sentences.length >= 2) {
      var hasConnector = CONNECTOR_WORDS_SDE.some(function (c) { return lowerFull.indexOf(c) !== -1; });
      findings.push(hasConnector
        ? H.verdict("7.10", "Connecting words link related sentences", "check", "a connecting word links the instruction sequence.")
        : H.verdict("7.10", "Connecting words link related sentences", "info", "consider a connecting word (“then”, “next”) between these instructions."));
    } else findings.push(H.na("7.10", "Connecting words link related sentences"));

    // 7.11 use an article or demonstrative adjective where applicable
    var bareNounIdx = -1;
    for (var vi = 0; vi < IMPERATIVE_VERBS.length && bareNounIdx === -1; vi++) {
      var re11 = new RegExp("\\b" + IMPERATIVE_VERBS[vi] + "\\s+([a-z]+)\\b", "i");
      for (var ti = 0; ti < texts.length; ti++) {
        var m11 = re11.exec(texts[ti]);
        if (m11 && !ARTICLE_RE.test(m11[1])) { bareNounIdx = ti; break; }
      }
    }
    var hasImperative11 = IMPERATIVE_VERBS.some(function (v) { return lowerFull.indexOf(v) !== -1; });
    findings.push(bareNounIdx !== -1
      ? H.verdict("7.11", "Use an article or demonstrative adjective where applicable", "flag", "an instruction verb is followed by a bare noun with no article.", sentences[bareNounIdx])
      : hasImperative11
        ? H.verdict("7.11", "Use an article or demonstrative adjective where applicable", "check", "instruction verbs are followed by an article or demonstrative.")
        : H.na("7.11", "Use an article or demonstrative adjective where applicable"));

    // 7.12 separate descriptive context from instructions
    var mixedIdx = texts.findIndex(function (t) {
      if (!STATE_ADJ_RE.test(t)) return false;
      return IMPERATIVE_VERBS.some(function (v) { return new RegExp("\\band\\b.*\\b" + v + "\\b", "i").test(t); });
    });
    var hasState12 = texts.some(function (t) { return STATE_ADJ_RE.test(t); });
    findings.push(mixedIdx !== -1
      ? H.verdict("7.12", "Separate descriptive context from instructions", "flag", "a state description and an instruction are folded into one sentence — split them.", sentences[mixedIdx])
      : hasState12
        ? H.verdict("7.12", "Separate descriptive context from instructions", "check", "descriptive context is kept separate from instructions.")
        : H.na("7.12", "Separate descriptive context from instructions"));

    // 7.13 one instruction per sentence
    var twoInstrIdx = texts.findIndex(function (t) {
      var hits = IMPERATIVE_VERBS.filter(function (v) { return new RegExp("\\b" + v + "\\b", "i").test(t); });
      return hits.length >= 2 && /\band\b/i.test(t);
    });
    var hasImperative13 = texts.some(function (t) { return IMPERATIVE_VERBS.some(function (v) { return new RegExp("\\b" + v + "\\b", "i").test(t); }); });
    findings.push(twoInstrIdx !== -1
      ? H.verdict("7.13", "One instruction per sentence", "flag", "two instructions are joined by “and” in one sentence — split them.", sentences[twoInstrIdx])
      : hasImperative13
        ? H.verdict("7.13", "One instruction per sentence", "check", "each sentence carries a single instruction.")
        : H.na("7.13", "One instruction per sentence"));

    // 7.14 write instructions in the imperative
    var modalInstrIdx = texts.findIndex(function (t) { return MODAL_INSTRUCTION_RE.test(t); });
    var hasImperative14 = texts.some(function (t) { return IMPERATIVE_VERBS.some(function (v) { return new RegExp("^" + v + "\\b", "i").test(t.trim()); }); });
    findings.push(modalInstrIdx !== -1
      ? H.verdict("7.14", "Write instructions in the imperative", "flag", "an instruction is hedged with a modal (“should be…”) instead of a bare imperative.", sentences[modalInstrIdx])
      : hasImperative14
        ? H.verdict("7.14", "Write instructions in the imperative", "check", "instructions are written in the imperative.")
        : H.na("7.14", "Write instructions in the imperative"));

    // 7.15 give information gradually — heuristic: 3+ comma-separated
    // segments in one sentence introduces too many new facts at once.
    var overloadedIdx = texts.findIndex(function (t) { return (t.match(/,/g) || []).length >= 3; });
    findings.push(overloadedIdx !== -1
      ? H.verdict("7.15", "Give information gradually", "info", "several new facts are introduced in one sentence — consider giving them one at a time.", sentences[overloadedIdx])
      : H.verdict("7.15", "Give information gradually", "check", "information is introduced gradually."));

    // 7.16 use key words for structure (no elegant variation for the same action)
    var variedActionIdx = ACTION_SYNONYM_PAIRS.findIndex(function (pair) { return lowerFull.indexOf(pair[0]) !== -1 && lowerFull.indexOf(pair[1]) !== -1; });
    findings.push(variedActionIdx !== -1
      ? H.verdict("7.16", "Use key words for structure", "flag", "the same action is named two different ways (“" + ACTION_SYNONYM_PAIRS[variedActionIdx][0] + "” / “" + ACTION_SYNONYM_PAIRS[variedActionIdx][1] + "”) — use one term throughout.")
      : H.na("7.16", "Use key words for structure"));

    // 7.17 one topic per paragraph, no more than five sentences
    findings.push(sentences.length > 5
      ? H.verdict("7.17", "One topic per paragraph, no more than five sentences", "flag", "this paragraph runs to " + sentences.length + " sentences — split it.")
      : H.verdict("7.17", "One topic per paragraph, no more than five sentences", "check", "the paragraph is within the five-sentence limit."));

    // 7.18 no phrasal verbs
    var phrasalIdx = PHRASAL_VERBS.findIndex(function (p) { return lowerFull.indexOf(p) !== -1; });
    findings.push(phrasalIdx !== -1
      ? H.verdict("7.18", "No phrasal verbs", "flag", "a phrasal verb (“" + PHRASAL_VERBS[phrasalIdx] + "”) is used — prefer the single-word verb.")
      : H.verdict("7.18", "No phrasal verbs", "check", "no phrasal verbs detected."));

    // 7.19 consistent terminology (same part/component named two ways)
    var variedTermIdx = PART_SYNONYM_PAIRS.findIndex(function (pair) { return lowerFull.indexOf(pair[0]) !== -1 && lowerFull.indexOf(pair[1]) !== -1; });
    findings.push(variedTermIdx !== -1
      ? H.verdict("7.19", "Consistent terminology", "flag", "the same part is named two different ways (“" + PART_SYNONYM_PAIRS[variedTermIdx][0] + "” / “" + PART_SYNONYM_PAIRS[variedTermIdx][1] + "”) — use one term throughout.")
      : H.na("7.19", "Consistent terminology"));

    // 7.20 no Latin abbreviations
    findings.push(LATIN_ABBR_RE.test(full)
      ? H.verdict("7.20", "No Latin abbreviations", "flag", "a Latin abbreviation is used — spell it out in English.")
      : H.verdict("7.20", "No Latin abbreviations", "check", "no Latin abbreviations detected."));

    return findings;
  }

  var REGISTER_SWEEPS = [
    { id: "academic-english", pass: academicEnglishPass, section: "6", label: "Academic English" },
    { id: "simple-descriptive-english", pass: simpleDescriptiveEnglishPass, section: "7", label: "Simple/Descriptive English" },
  ];

  function parse(text, selection) {
    var toks = tokenize(text);
    var wordCount = toks.filter(function (t) { return t.isWord; }).length;
    if (wordCount > CONFIG.cap) {
      return { meta: { asset: CONFIG.name, version: CONFIG.version, cap: CONFIG.cap, wordCount: wordCount, overCap: true } };
    }

    var sel = (selection && selection.sweeps) || {};
    var spans = [], findings = [], clauses = [], classifications = [], counts = {};

    // Reaches "mixed" for ANY 2+ simultaneously active sweeps of different
    // categories, not just exactly-one-genre-plus-one-register — needed
    // now that 5 genres and 2 registers can each be selected independently
    // in any combination (Style_content.md's Sweep model).
    function markCategory(cat) {
      if (!counts.sweepCategory) counts.sweepCategory = cat;
      else if (counts.sweepCategory !== cat) counts.sweepCategory = "mixed";
    }

    GENRE_SWEEPS.forEach(function (g) {
      var s = sel[g.id];
      if (!s || !s.on) return;
      var opposite = !!s.opposite;
      var gres = buildGenreResult(g.pass(toks, opposite), g.id, opposite);
      // buildGenreResult() numbers each finding's spanRef against its OWN
      // local spans array (0-based); once a second genre sweep's results
      // are concatenated on, those local indices collide with the first
      // sweep's — offset by the running spans[] length so spanRef stays a
      // correct absolute index (ParserShell.spec.md §6: "spanRef: index
      // into spans[]"), not just coincidentally right for a single sweep.
      var spanOffset = spans.length;
      gres.findings.forEach(function (f) { if (f.spanRef !== undefined) f.spanRef += spanOffset; });
      spans = spans.concat(gres.spans);
      findings = findings.concat(gres.findings);
      clauses = clauses.concat(gres.clauses);
      classifications.push({ id: opposite ? g.oppSection : g.section, label: opposite ? g.oppLabel : g.label, cat: "genre" });
      markCategory("genre");
    });

    REGISTER_SWEEPS.forEach(function (r) {
      var s = sel[r.id];
      if (!s || !s.on) return;
      findings = findings.concat(r.pass(toks));
      classifications.push({ id: r.section, label: r.label, cat: "register" });
      markCategory("register");
    });

    if (!classifications.length) {
      // id "—" (not a-z) deliberately: ui.js's summary line strips a
      // trailing lowercase letter from every classification id (Grammar's
      // own subtype-suffix convention, e.g. "4.1n" -> "4.1") — "none" would
      // render as the confusing "(non)"; a non-letter id sidesteps that.
      classifications.push({ id: "—", label: "Select a sweep above, then Parse." });
    }

    // Every word token needs a tags[0] with a confidence (render()'s
    // unconditional `R.tokens[i].tags[0].confidence` read, ui.js:182) —
    // Style has no per-word POS tagging, so untouched words get a trivial,
    // never-tentative default tag; words inside a genre span inherit that
    // finding's own id/confidence instead.
    var spanTagByToken = {};
    spans.forEach(function (s) {
      for (var i = s.start; i <= s.end; i++) spanTagByToken[i] = { id: s.id, label: s.label, confidence: s.confidence };
    });
    var tokens = toks.map(function (t) {
      var tag = t.isWord ? (spanTagByToken[t.i] || { id: "-", label: "", confidence: 1 }) : null;
      return { i: t.i, text: t.text, start: t.start, end: t.end, isWord: t.isWord, tags: tag ? [tag] : [] };
    });

    return {
      meta: { asset: CONFIG.name, version: CONFIG.version, cap: CONFIG.cap, wordCount: wordCount, overCap: false },
      tokens: tokens,
      spans: spans,
      findings: findings,
      summary: { classifications: classifications, counts: counts },
      _toks: toks,
      _clauses: clauses,
    };
  }

  return { parse: parse, tokenize: tokenize, CLOSED: CLOSED };
})();
