/* Riddle cartridge ENGINE (present mode) — GeneratorShell.spec.md §3b.
   getPool/render/checkAnswer are the three required-by-config exports
   (generator.answer: true makes checkAnswer required; generator.explainer:
   false means explainItem is never called, so it is intentionally
   omitted — riddles get no explainer, per the task brief).

   checkAnswer implements _research/seed/riddles.md's "Answer-Checking
   Guidance" section verbatim: lowercase + whitespace-collapse + leading-
   article strip + hyphen-as-space normalisation, singular/plural
   tolerance, exact match against the canonical answer or any accepted
   variant, then a length-scaled Levenshtein tolerance against the
   canonical answer only (never against variants — the guidance's own
   "Variant Matching Strategy" requires variants to match exactly after
   normalisation, fuzzy tolerance is for typos on the canonical spelling
   only). */
var ENGINE = (function () {
  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function getPool() {
    return Object.keys(CONTENT).map(function (id) {
      return CONTENT[id];
    });
  }

  function render(item) {
    var meta = item.tradition + " · difficulty: " + item.difficulty;
    return {
      html: "<p>" + esc(item.text) + "</p><p>" + esc(meta) + "</p>",
      clueHtml: "<p>" + esc(item.clue) + "</p>",
      canonicalText: item.text,
    };
  }

  // ---- Answer normalisation & fuzzy matching --------------------------

  var LEADING_ARTICLE_RE = /^(a|an|the)\s+/;

  function normalise(raw) {
    var s = String(raw == null ? "" : raw).toLowerCase().trim();
    s = s.replace(/\s+/g, " ");
    s = s.replace(LEADING_ARTICLE_RE, "");
    // Hyphen/space are typographic variants of the same separator in this
    // seed data ("book-worm" vs "book worm") — folding hyphens to spaces
    // lets both normalise to a form that exact-matches whichever spacing
    // the accepted-variants list happens to use (Edge Case #3).
    s = s.replace(/-/g, " ");
    s = s.replace(/\s+/g, " ").trim();
    return s;
  }

  function stripTrailingS(s) {
    return s.length > 1 && s.charAt(s.length - 1) === "s" ? s.slice(0, -1) : s;
  }

  function candidateForms(normalised) {
    var forms = [normalised];
    var singular = stripTrailingS(normalised);
    if (singular !== normalised) forms.push(singular);
    return forms;
  }

  function levenshtein(a, b) {
    var m = a.length;
    var n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    var prev = new Array(n + 1);
    var cur = new Array(n + 1);
    for (var j = 0; j <= n; j++) prev[j] = j;
    for (var i = 1; i <= m; i++) {
      cur[0] = i;
      for (var k = 1; k <= n; k++) {
        var cost = a.charAt(i - 1) === b.charAt(k - 1) ? 0 : 1;
        cur[k] = Math.min(prev[k] + 1, cur[k - 1] + 1, prev[k - 1] + cost);
      }
      var tmp = prev;
      prev = cur;
      cur = tmp;
    }
    return prev[n];
  }

  // Answer-Checking Guidance's edit-distance table, keyed by canonical
  // answer length after normalisation.
  function toleranceFor(len) {
    if (len <= 3) return 0;
    if (len <= 6) return 1;
    if (len <= 12) return 2;
    return 3;
  }

  function checkAnswer(item, userAnswer) {
    var raw = String(userAnswer == null ? "" : userAnswer);
    var normalisedInput = normalise(raw);
    if (!normalisedInput) {
      return { correct: false, message: "Type an answer first." };
    }
    var inputForms = candidateForms(normalisedInput);

    var acceptable = [item.canonicalAnswer].concat(item.variants || []);
    for (var a = 0; a < acceptable.length; a++) {
      var acceptedForms = candidateForms(normalise(acceptable[a]));
      for (var f = 0; f < inputForms.length; f++) {
        if (acceptedForms.indexOf(inputForms[f]) !== -1) {
          return { correct: true, message: "Correct!" };
        }
      }
    }

    var canonicalNorm = normalise(item.canonicalAnswer);
    var tolerance = toleranceFor(canonicalNorm.length);
    for (var g = 0; g < inputForms.length; g++) {
      if (levenshtein(inputForms[g], canonicalNorm) <= tolerance) {
        return { correct: true, message: "Correct! (accepted with a minor spelling variation)" };
      }
    }

    return {
      correct: false,
      message: "Not quite — the answer is “" + item.displayAnswer + "”.",
    };
  }

  return {
    getPool: getPool,
    render: render,
    checkAnswer: checkAnswer,
    // Exposed for tests/test-check-answer.mjs (TEST-9: import the real
    // module, don't re-implement the algorithm in the test).
    _normalise: normalise,
    _levenshtein: levenshtein,
  };
})();
