/* AiCharacteristics ENGINE — GeneratorShell.spec.md §3/§6 (analyse mode).
   Flags AI-associated STYLISTIC and content characteristics in pasted
   text. This is NOT an authorship detector: see CONTENT["0.1"] and every
   finding's `explain` text for the honesty framing this cartridge is
   required to carry (Generator DECISIONS.md, task honesty requirement).

   Two detector kinds, both required to appear in ParseResult:
   - LOCAL: a regex/pattern match at a specific span of text -> a
     highlighted `_clauses` entry + one `findings[]` entry per match.
   - STATISTICAL: a whole-document measure (no single span "causes" it)
     -> one `findings[]` entry covering the whole input, no highlight. */
var ENGINE = (function () {
  var CLOSED = {};

  /* ---------------------------------------------------------- tokenize */
  var TOKEN_RE = /[A-Za-zÀ-ɏ]+(?:['’][A-Za-z]+)*(?:-[A-Za-zÀ-ɏ]+(?:['’][A-Za-z]+)*)*|\d+(?:[.,]\d+)*%?|[.,;:!?…—–\-()"'“”‘’]/g;

  function tokenize(text) {
    var toks = [];
    TOKEN_RE.lastIndex = 0;
    var m;
    while ((m = TOKEN_RE.exec(text))) {
      var raw = m[0];
      toks.push({
        i: toks.length,
        text: raw,
        start: m.index,
        end: m.index + raw.length,
        isWord: /[A-Za-zÀ-ɏ0-9]/.test(raw),
      });
    }
    return toks;
  }

  /* ------------------------------------------------------------ helpers */
  // Maps a raw-text char range (from a regex match against the whole
  // input) onto the inclusive token-index range it overlaps. Multi-word
  // matches ("in conclusion") span more than one token; this is why
  // detectors work over `text` + this mapping rather than re-deriving
  // their own tokenizer (SR-4 — one tokenizer, shared).
  function charRangeToTokenRange(toks, cStart, cEnd) {
    var s = null, e = null;
    for (var i = 0; i < toks.length; i++) {
      var t = toks[i];
      if (t.end > cStart && t.start < cEnd) {
        if (s === null) s = i;
        e = i;
      }
    }
    return s === null ? null : { start: s, end: e };
  }

  function splitSentences(text) {
    return text
      .split(/(?<=[.!?])\s+/)
      .map(function (s) { return s.trim(); })
      .filter(function (s) { return s.length > 0; });
  }

  function wordsIn(s) {
    var m = s.match(/[A-Za-zÀ-ɏ]+(?:['’][A-Za-z]+)*/g);
    return m || [];
  }

  var STOPWORDS = {
    the: 1, a: 1, an: 1, and: 1, or: 1, but: 1, of: 1, to: 1, in: 1, on: 1, for: 1,
    is: 1, are: 1, was: 1, were: 1, be: 1, been: 1, being: 1, it: 1, its: 1, this: 1,
    that: 1, these: 1, those: 1, as: 1, at: 1, by: 1, with: 1, from: 1, into: 1,
    which: 1, who: 1, what: 1, not: 1, no: 1, so: 1, than: 1, then: 1, there: 1,
    their: 1, they: 1, he: 1, she: 1, we: 1, you: 1, i: 1, has: 1, have: 1, had: 1,
    will: 1, would: 1, can: 1, could: 1, should: 1, may: 1, might: 1, do: 1, does: 1,
    did: 1, if: 1, when: 1, while: 1, also: 1, more: 1, most: 1, some: 1, such: 1,
  };

  var PRONOUN_RE = /\b(he|she|they|him|her|them|his|hers|their|theirs|it|its)\b/gi;

  /* ------------------------------------------------------- LOCAL rules */
  // 1.1 Focal word excess — regex list from _research/seed/ai-characteristics.md §1.1.
  var FOCAL_WORDS_RE = /\b(delve|delves|delved|delving|tapestry|intricate|meticulous|meticulously|pivotal|resonate|resonates|testament|compelling|paramount|unwavering|realm|navigate|navigating|landscape|foster|fosters|elevate|elevates|underscore|underscores|commendable|surpass|surpasses)\b/gi;

  // 4.2 Discourse marker clustering — §4.2.
  var DISCOURSE_MARKER_RE = /\b(In conclusion|In summary|Overall|Additionally|Furthermore|Moreover|However|On the other hand|As a result|Consequently|Therefore|Thus|It is important to note|It should be noted|To summarize|In the context of|With respect to|Regarding)\b/gi;

  // 5.3 False balance / artificial neutrality — §5.3.
  var FALSE_BALANCE_RE = /\b(some (people )?argue[^.]{0,80}while others argue|on (the )?one hand[^.]{0,120}on the other hand|has (its )?merits, but[^.]{0,80}also has merit)\b/gi;

  // 8.1 Specific numeric precision with unverifiable source — §8.1.
  var NUMERIC_PRECISION_RE = /\b\d{1,3}(?:,\d{3})*\.\d{1,2}\s?(?:%|percent|million|billion)\b/gi;

  function findAllMatches(re, text) {
    var out = [];
    var r = new RegExp(re.source, re.flags.indexOf("g") >= 0 ? re.flags : re.flags + "g");
    r.lastIndex = 0;
    var m;
    while ((m = r.exec(text))) {
      out.push({ start: m.index, end: m.index + m[0].length, text: m[0] });
      if (m[0].length === 0) r.lastIndex++; // guard against zero-width infinite loop (JS-2)
    }
    return out;
  }

  function localDetector(id, label, category, confidence, re, text) {
    return findAllMatches(re, text).map(function (m) {
      return { id: id, label: label, category: category, confidence: confidence, start: m.start, end: m.end, matchText: m.text };
    });
  }

  // 7.1 Excessive entity-name repetition — approximated without true NER
  // (CONTENT["7.1"].why states this limitation explicitly): a capitalised
  // word that is not sentence-initial, repeated 3+ times, with few
  // pronouns nearby, reads as a name being re-stated instead of pronominalised.
  function detectEntityRepetition(text, toks) {
    var counts = {};
    var occurrences = {};
    for (var i = 0; i < toks.length; i++) {
      var t = toks[i];
      if (!t.isWord || !/^[A-Z][a-z]+$/.test(t.text)) continue;
      var prev = toks[i - 1];
      var sentenceInitial = !prev || (!prev.isWord && /[.!?]/.test(prev.text));
      if (sentenceInitial) continue;
      var key = t.text;
      counts[key] = (counts[key] || 0) + 1;
      (occurrences[key] = occurrences[key] || []).push(t);
    }
    var pronounCount = (text.match(PRONOUN_RE) || []).length;
    var out = [];
    Object.keys(counts).forEach(function (name) {
      if (counts[name] < 3) return;
      if (pronounCount >= counts[name]) return; // enough pronoun variety alongside the name — not flagged
      occurrences[name].slice(1).forEach(function (t) {
        out.push({ id: "7.1", label: "Excessive entity-name repetition", category: "coherence", confidence: 0.6, start: t.start, end: t.end, matchText: t.text });
      });
    });
    return out;
  }

  /* --------------------------------------------------- STATISTICAL rules */
  // 2.1 Low burstiness — §2.1's own formula, applied literally.
  function detectBurstiness(text) {
    var sentences = splitSentences(text);
    if (sentences.length < 3) return null;
    var lens = sentences.map(function (s) { return wordsIn(s).length; }).filter(function (n) { return n > 0; });
    if (lens.length < 3) return null;
    var mean = lens.reduce(function (a, b) { return a + b; }, 0) / lens.length;
    var variance = lens.reduce(function (a, b) { return a + (b - mean) * (b - mean); }, 0) / lens.length;
    var sd = Math.sqrt(variance);
    if (mean === 0 && sd === 0) return null;
    // Standard corpus-linguistics burstiness index (Goh & Barabási),
    // B=(sd-mean)/(sd+mean), range [-1,1]: -1 = perfectly uniform sentence
    // length, +1 = extremely bursty. Chosen over the seed research's own
    // (variance-mean^2)/mean^2 formula (_research/seed/ai-characteristics.md
    // §2.1) because that formula gave a false "uniform" reading on a
    // deliberately bursty human-prose fixture (one very long semicolon-joined
    // sentence next to a three-word one) — this index reads that same input
    // correctly as bursty. The characteristic being measured (2.1) is
    // unchanged; only the statistic computing it differs from the seed text.
    var burstiness = (sd - mean) / (sd + mean);
    if (burstiness >= -0.2) return null;
    return {
      id: "2.1", label: "Low burstiness (uniform sentence length)", category: "syntactic", confidence: 0.75,
      explain: "Sentence lengths (words): " + lens.join(", ") + ". Mean " + mean.toFixed(1) + ", burstiness index=" + burstiness.toFixed(2) + " (below the -0.2 threshold used here for AI-typical uniformity; -1 is perfectly uniform, +1 is highly bursty).",
    };
  }

  // 3.2 High token-level repetition — top content word's share of all words.
  function detectHighRepetition(toks) {
    var words = toks.filter(function (t) { return t.isWord; }).map(function (t) { return t.text.toLowerCase(); });
    if (words.length < 20) return null;
    var freq = {};
    words.forEach(function (w) { if (!STOPWORDS[w]) freq[w] = (freq[w] || 0) + 1; });
    var top = null, topCount = 0;
    Object.keys(freq).forEach(function (w) { if (freq[w] > topCount) { top = w; topCount = freq[w]; } });
    if (!top) return null;
    var ratio = topCount / words.length;
    if (ratio <= 0.15) return null;
    return {
      id: "3.2", label: "High token-level repetition", category: "statistical", confidence: 0.6,
      explain: "\"" + top + "\" accounts for " + Math.round(ratio * 100) + "% of all word tokens (" + topCount + " of " + words.length + "), above the 15% threshold used here.",
    };
  }

  // 6.1 Absence of varied punctuation — expressive/contrastive marks per sentence.
  function detectPunctuationAbsence(text) {
    var sentences = splitSentences(text);
    if (sentences.length < 3) return null;
    var special = (text.match(/[!?;()—–]/g) || []).length;
    var ratio = special / sentences.length;
    if (ratio >= 0.15) return null;
    return {
      id: "6.1", label: "Absence of varied punctuation", category: "punctuation", confidence: 0.55,
      explain: "Only " + special + " expressive/contrastive marks (!?;()—–) across " + sentences.length + " sentences (" + ratio.toFixed(2) + " per sentence), well below typical human variety.",
    };
  }

  /* --------------------------------------------------------- assembly */
  function resolveNonOverlapping(matches) {
    var sorted = matches.slice().sort(function (a, b) { return a.start - b.start || a.end - b.end; });
    var kept = [], lastEnd = -1;
    sorted.forEach(function (m) {
      if (m.start > lastEnd) { kept.push(m); lastEnd = m.end; }
    });
    return kept;
  }

  var CATEGORY_ABBR = {
    lexical: "LEX", syntactic: "SYN", statistical: "STAT", discourse: "DISC",
    content: "CONT", punctuation: "PUNC", coherence: "COH", numerical: "NUM",
  };

  function parse(text, selection) {
    var toks = tokenize(text);
    var wordCount = toks.filter(function (t) { return t.isWord; }).length;
    var cap = CONFIG.cap;
    if (wordCount > cap) {
      return { meta: { asset: CONFIG.name, version: CONFIG.version, cap: cap, wordCount: wordCount, overCap: true } };
    }

    var localMatches = [].concat(
      localDetector("1.1", "Focal word excess", "lexical", 0.75, FOCAL_WORDS_RE, text),
      localDetector("4.2", "Discourse marker clustering", "discourse", 0.75, DISCOURSE_MARKER_RE, text),
      localDetector("5.3", "False balance / artificial neutrality", "content", 0.55, FALSE_BALANCE_RE, text),
      localDetector("8.1", "Specific numeric precision, unverifiable", "numerical", 0.35, NUMERIC_PRECISION_RE, text),
      detectEntityRepetition(text, toks)
    );

    // findings[]: one entry per occurrence (icon bar's own grouping counts
    // repeats, JS-2 — nothing here silently drops an instance).
    var findings = [{
      id: "0.1", label: "Read before interpreting", severity: "info", start: 0, end: Math.max(0, toks.length - 1),
      explain: CONTENT["0.1"] ? CONTENT["0.1"].d : "AI-detection is unreliable; this tool observes surface characteristics, not authorship.",
      confidence: 1,
    }];

    localMatches.forEach(function (m) {
      var range = charRangeToTokenRange(toks, m.start, m.end);
      if (!range) {
        console.warn("ENGINE.parse: LOCAL match had no overlapping token", m);
        return;
      }
      findings.push({
        id: m.id, label: m.label, severity: "check", start: range.start, end: range.end,
        explain: "Matched: “" + m.matchText + "”. " + ((CONTENT[m.id] && CONTENT[m.id].why) || ""),
        confidence: m.confidence,
      });
    });

    [detectBurstiness(text), detectHighRepetition(toks), detectPunctuationAbsence(text)].forEach(function (f) {
      if (!f) return;
      findings.push({
        id: f.id, label: f.label, severity: "check", start: 0, end: Math.max(0, toks.length - 1),
        explain: f.explain + " " + ((CONTENT[f.id] && CONTENT[f.id].why) || ""),
        confidence: f.confidence,
      });
    });

    // _clauses: the visually highlighted regions. Built only from LOCAL
    // matches (statistical findings describe the whole document and are
    // not rendered as a highlight — see honesty note in engine header).
    var candidateSpans = localMatches.map(function (m) {
      var range = charRangeToTokenRange(toks, m.start, m.end);
      if (!range) return null; // already warned above when building findings[]
      return {
        start: range.start, end: range.end, id: m.id, label: m.label, kind: "clause",
        confidence: m.confidence, tent: m.confidence < CONFIG.tentativeThreshold,
        abbr: CATEGORY_ABBR[m.category] || m.category.slice(0, 4).toUpperCase(),
        role: m.category,
      };
    }).filter(function (s) { return s !== null; });
    var clauses = resolveNonOverlapping(candidateSpans);

    var categoriesFlagged = {};
    findings.forEach(function (f) {
      if (f.id === "0.1" || !CONTENT[f.id]) return;
      categoriesFlagged[CONTENT[f.id].category || CONTENT[f.id].l] = true;
    });
    var classifications = [{ id: "0.1", label: "AI characteristics observed — not an authorship verdict" }];
    Object.keys(categoriesFlagged).forEach(function (cat) {
      classifications.push({ id: cat, label: cat });
    });

    return {
      meta: { asset: CONFIG.name, version: CONFIG.version, cap: cap, wordCount: wordCount, overCap: false, lexiconMode: "none" },
      tokens: toks.map(function (t) {
        return { i: t.i, text: t.text, start: t.start, end: t.end, isWord: t.isWord, tags: [{ id: "0.1", label: "token", confidence: 1 }] };
      }),
      spans: clauses,
      findings: findings,
      summary: {
        classifications: classifications,
        counts: { words: wordCount, findings: findings.length - 1, categoriesFlagged: Object.keys(categoriesFlagged).length },
      },
      _toks: toks,
      _clauses: clauses,
    };
  }

  return { parse: parse, tokenize: tokenize, CLOSED: CLOSED };
})();
