/* FolkTale generator — present-mode ENGINE (GeneratorShell.spec.md §3b).
   getPool()/render() are the two required exports; checkAnswer/explainItem
   are omitted on purpose (generator.answer/generator.explainer are both
   false in config.yaml — a quiz/answer surface doesn't fit "read a tale
   and see its three beats").

   Beat model: every tale is split into SETUP / TWIST / RESULT at sentence
   granularity by one shared function, splitIntoBeats() — a DP that picks
   the single best (setupEnd, twistEnd) cut of the sentence sequence given
   a per-sentence, per-beat score. Two different scorers feed it:

     * scoreFromSpans()  — used whenever a pool item carries the seed's
       ground-truth setupSpan/twistSpan/resultSpan (every one of the 36
       shipped tales does): scores each sentence by word-overlap against
       the three quoted spans. This is how the shipped tales render —
       accurate by construction, not by the heuristic detector.

     * scoreFromCues()   — the seed's BEAT-DETECTION GUIDANCE (temporal
       connectives, adversative connectives, conclusive connectives,
       discourse markers) turned into weighted keyword lookups. This is
       the only scorer available for a tale with no stored spans — e.g.
       a Tier-B-fetched item — so it is what "the ENGINE finds beats in a
       tale it has never seen" actually means here.

   detectBeats(taleText) (cue-only) is exported for the accuracy-validation
   test (tests/js/test-beat-accuracy.mjs), which compares its sentence
   labels against scoreFromSpans()'s labels for all 36 seeded tales — the
   only place a real "detector accuracy" number can come from. */
var ENGINE = (function () {
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* ---------------------------------------------------------- sentences */

  var SENTENCE_RE = /[^.!?]+[.!?]+(?:["'’”)]*)(?:\s+|$)/g;

  function splitSentences(text) {
    var out = [];
    var matches = String(text).match(SENTENCE_RE);
    if (!matches) {
      var trimmed = String(text).trim();
      return trimmed ? [trimmed] : [];
    }
    matches.forEach(function (m) {
      var t = m.trim();
      if (t) out.push(t);
    });
    return out;
  }

  function words(text) {
    return String(text)
      .toLowerCase()
      .replace(/[‘’]/g, "'")
      .replace(/[^a-z0-9'\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean);
  }

  /* ------------------------------------------------------- shared split */

  /** scores: Array<{setup:number, twist:number, result:number}>, one per
   * sentence. Returns {setupEnd, twistEnd} — sentences [0,setupEnd) are
   * SETUP, [setupEnd,twistEnd) are TWIST, [twistEnd,n) are RESULT. Finds
   * the single contiguous three-way split maximising the summed score of
   * each region against its own beat — the DP both scorers below share
   * (JS-3: one small function, not three copies). */
  function splitIntoBeats(scores) {
    var n = scores.length;
    var setupP = [0], twistP = [0], resultP = [0];
    for (var i = 0; i < n; i++) {
      setupP.push(setupP[i] + scores[i].setup);
      twistP.push(twistP[i] + scores[i].twist);
      resultP.push(resultP[i] + scores[i].result);
    }
    var best = -Infinity, bestI = 0, bestJ = 0;
    for (var a = 0; a <= n; a++) {
      for (var b = a; b <= n; b++) {
        var total = setupP[a] + (twistP[b] - twistP[a]) + (resultP[n] - resultP[b]);
        if (total > best) { best = total; bestI = a; bestJ = b; }
      }
    }
    return { setupEnd: bestI, twistEnd: bestJ };
  }

  function labelsFromSplit(n, split) {
    var labels = [];
    for (var i = 0; i < n; i++) {
      if (i < split.setupEnd) labels.push("setup");
      else if (i < split.twistEnd) labels.push("twist");
      else labels.push("result");
    }
    return labels;
  }

  /* ------------------------------------------------ scorer: ground truth */

  function spanWordSet(spanText) {
    // Ground-truth spans sometimes elide connecting prose with "...";
    // strip it so the remaining fragments' words still score their real
    // sentences without an unmatched literal ellipsis token.
    var cleaned = String(spanText).replace(/\.\.\./g, " ").replace(/[“”]/g, '"');
    var set = {};
    words(cleaned).forEach(function (w) { set[w] = true; });
    return set;
  }

  function overlapScore(sentenceWords, wordSet) {
    if (!sentenceWords.length) return 0;
    var hit = 0;
    sentenceWords.forEach(function (w) { if (wordSet[w]) hit++; });
    return hit / sentenceWords.length;
  }

  function scoreFromSpans(sentences, setupSpan, twistSpan, resultSpan) {
    var setupSet = spanWordSet(setupSpan);
    var twistSet = spanWordSet(twistSpan);
    var resultSet = spanWordSet(resultSpan);
    return sentences.map(function (s) {
      var w = words(s);
      return {
        setup: overlapScore(w, setupSet),
        twist: overlapScore(w, twistSet),
        result: overlapScore(w, resultSet),
      };
    });
  }

  /* ------------------------------------------------------ scorer: cues */

  // Transcribed from _research/seed/folk-tales.md's "BEAT-DETECTION
  // GUIDANCE FOR LOGIC ENGINE" section. Multi-word phrases are stronger,
  // less ambiguous signals than single common words, so they carry more
  // weight (see PHRASE_WEIGHT below).
  var SETUP_CUES = [
    "once upon a time", "in ancient times", "one day", "there once was",
    "a long time ago", "in a distant land", "there lived", "there was",
    "once there was", "a poor", "a wealthy", "a young", "an old",
    "a beautiful", "a humble",
  ];
  var TWIST_CUES = [
    "but", "however", "yet", "when", "suddenly", "just then", "meanwhile",
    "alas", "unexpectedly", "and then", "thereupon", "forthwith",
    "presently", "decided", "discovered", "encountered", "appeared",
    "demanded", "refused", "seized", "began", "attempted", "could not",
    "was unable", "failed", "denied",
  ];
  var RESULT_CUES = [
    "so", "thus", "therefore", "in the end", "at last", "finally", "soon",
    "and so", "from that day on", "ever after", "learned", "understood",
    "realized", "realised", "proved", "showed", "demonstrated",
    "the moral is", "this teaches that", "never again", "forevermore",
    "to this day", "and lived happily", "was rewarded", "was punished",
    "was transformed", "could now", "was able to", "would never",
  ];

  function phraseWeight(phrase) {
    return phrase.indexOf(" ") >= 0 ? 1 : 0.4;
  }

  function cueScore(sentenceLower, cues) {
    var score = 0;
    cues.forEach(function (cue) {
      var count = 0, idx = 0;
      while ((idx = sentenceLower.indexOf(cue, idx)) !== -1) {
        count++;
        idx += cue.length;
      }
      score += count * phraseWeight(cue);
    });
    return score;
  }

  /** Cue-only detector: no ground-truth spans consulted. This is the
   * function a novel (Tier-B-fetched) tale actually runs through. */
  function detectBeats(taleText) {
    var sentences = splitSentences(taleText);
    var n = sentences.length;
    var scores = sentences.map(function (s, i) {
      var lower = s.toLowerCase();
      // Small positional prior (guidance: "SETUP precedes the
      // complication", "RESULT... marks the final section") — breaks
      // ties when a short sentence has no strong keyword cue at all,
      // without overriding a real keyword hit.
      var positionalSetup = n > 1 ? (n - 1 - i) / (n - 1) * 0.3 : 0;
      var positionalResult = n > 1 ? i / (n - 1) * 0.3 : 0;
      return {
        setup: cueScore(lower, SETUP_CUES) + positionalSetup,
        twist: cueScore(lower, TWIST_CUES),
        result: cueScore(lower, RESULT_CUES) + positionalResult,
      };
    });
    var split = splitIntoBeats(scores);
    return { sentences: sentences, labels: labelsFromSplit(n, split) };
  }

  /* --------------------------------------------------------------- pool */

  function getPool() {
    return Object.keys(CONTENT).map(function (id) { return CONTENT[id]; });
  }

  /* ------------------------------------------------------------- render */

  var BEAT_HUE_INDEX = { setup: 0, twist: 1, result: 2 };
  var BEAT_NAME = { setup: "Setup", twist: "Twist", result: "Result" };

  function hueFor(beat) {
    var palette = (typeof CONFIG !== "undefined" && CONFIG.clausePalette) || [];
    return palette[BEAT_HUE_INDEX[beat]] || { h100: "#eee", h800: "#333" };
  }

  function renderLegend() {
    var html = '<div class="ft-legend">';
    ["setup", "twist", "result"].forEach(function (beat) {
      var hue = hueFor(beat);
      html +=
        '<span class="ft-chip" style="background:' + hue.h100 + ";color:" + hue.h800 + '">' +
        esc(BEAT_NAME[beat]) +
        "</span>";
    });
    html += "</div>";
    return html;
  }

  function renderTale(sentences, labels) {
    var html = "";
    for (var i = 0; i < sentences.length; i++) {
      var beat = labels[i];
      var hue = hueFor(beat);
      html +=
        '<span class="ft-beat" data-beat="' + beat + '" style="background:' + hue.h100 + ";color:" + hue.h800 + '" title="' +
        esc(BEAT_NAME[beat]) + '">' + esc(sentences[i]) + "</span> ";
    }
    return html;
  }

  function render(item) {
    var sentences = splitSentences(item.tale);
    var split;
    if (item.setupSpan && item.twistSpan && item.resultSpan) {
      var scores = scoreFromSpans(sentences, item.setupSpan, item.twistSpan, item.resultSpan);
      split = splitIntoBeats(scores);
    } else {
      // No stored ground truth (a Tier-B-fetched item) — fall back to the
      // cue-based detector, the only signal available for an unseen tale.
      var detected = detectBeats(item.tale);
      sentences = detected.sentences;
      split = null;
    }
    var labels = split ? labelsFromSplit(sentences.length, split) : detectBeats(item.tale).labels;

    var meta =
      '<p class="ft-meta">' +
      esc(item.culture || "") +
      (item.translator ? " &middot; " + esc(item.translator) : "") +
      (item.year ? " (" + esc(item.year) + ")" : "") +
      "</p>";

    var html =
      renderLegend() +
      "<h2 class=\"ft-title\">" + esc(item.title || "") + "</h2>" +
      meta +
      '<p class="ft-tale">' + renderTale(sentences, labels) + "</p>";

    return {
      html: html,
      canonicalText: item.tale,
    };
  }

  return {
    getPool: getPool,
    render: render,
    // Exposed for the Node accuracy test (tests/js/test-beat-accuracy.mjs)
    // and the smoke test — not part of the required present-mode contract.
    splitSentences: splitSentences,
    splitIntoBeats: splitIntoBeats,
    labelsFromSplit: labelsFromSplit,
    scoreFromSpans: scoreFromSpans,
    detectBeats: detectBeats,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = ENGINE;
}
