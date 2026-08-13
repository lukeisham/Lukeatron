/* ============================================================
   SHELL · PRESENT MODE (GeneratorShell.spec.md §3b, DECISIONS.md D-1)
   Never edited per cartridge. Reads ONLY CONFIG.generator and the ENGINE
   present-mode exports (getPool, render, checkAnswer, explainItem) — never
   the DOM beyond its own mount points, never a cartridge's name (D-3).

   Present-mode ENGINE contract (the cartridge side of this seam):

     var ENGINE = {
       getPool()                    -> PoolItem[]   REQUIRED
         Returns the full baked-in item pool. A cartridge typically builds
         this from the shell-injected CONTENT global (Object.values(CONTENT),
         itself compiled at build time from files.content — a JSON object
         keyed by item id) but MAY return a hardcoded array instead; the
         shell only requires a non-empty array back.

       render(item)                 -> { html, clueHtml?, canonicalText }  REQUIRED
         item: one PoolItem from getPool(). Returns the markup shown when
         the item displays (html — the cartridge is responsible for
         escaping any interpolated item text itself, HTML-6 applies to
         this string same as anywhere else), an optional clueHtml (present
         only when CONFIG.generator.clue is true), and canonicalText — the
         plain string the Copy button puts on the clipboard.

       checkAnswer(item, userAnswer) -> { correct, message }   REQUIRED iff
                                                                 CONFIG.generator.answer
         userAnswer: the raw, unnormalised string from #answerInput. The
         cartridge owns normalisation (case folding, punctuation, etc).

       explainItem(item)            -> html string             REQUIRED iff
                                                                 CONFIG.generator.explainer
         Shown in the #explainer panel on request.
     }

   PoolItem shape (cartridge-defined beyond these two shell-read fields):
     { id: string,                       // required, unique within the pool
       category: string,                 // required IFF CONFIG.generator.categories
                                          // is set; must match one categories[].id
       ...cartridge-defined fields ENGINE.render/checkAnswer/explainItem read }
   ============================================================ */
var PresentMode = (function () {
  var $ = function (id) { return document.getElementById(id); };

  var pool = [];
  var queue = [];
  var currentItem = null;
  var lastItemId = null;
  var activeCategory = null; // null = all categories

  function poolForCategory() {
    if (!activeCategory) return pool;
    return pool.filter(function (item) { return item.category === activeCategory; });
  }

  // Fisher-Yates — never repeat an item until the filtered pool is
  // exhausted, then reshuffle (task D: "a naive random pick that repeats
  // immediately feels broken").
  function shuffle(items) {
    var arr = items.slice();
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  function refillQueue() {
    var source = poolForCategory();
    queue = shuffle(source);
    // Avoid an immediate repeat across a reshuffle boundary when there is
    // more than one item to choose from.
    if (queue.length > 1 && queue[0].id === lastItemId) {
      var tmp = queue[0]; queue[0] = queue[1]; queue[1] = tmp;
    }
  }

  function nextItem() {
    if (!queue.length) refillQueue();
    return queue.shift();
  }

  function clearFeedback() {
    var fb = $("answerFeedback");
    fb.style.display = "none";
    fb.textContent = "";
    fb.className = "present-only";
    var input = $("answerInput");
    if (input) input.value = "";
  }

  function generate() {
    if (!pool.length) return;
    var item = nextItem();
    if (!item) return;
    currentItem = item;
    lastItemId = item.id;

    var result = ENGINE.render(item);
    $("pstage").innerHTML = result.html;
    $("pstage").style.display = "block";

    var clueBox = $("clueBox");
    clueBox.style.display = "none";
    clueBox.innerHTML = "";
    currentItem._clueHtml = result.clueHtml || "";

    $("explainer").style.display = "none";
    clearFeedback();
  }

  function revealClue() {
    if (!currentItem) return;
    var clueBox = $("clueBox");
    clueBox.innerHTML = currentItem._clueHtml || "";
    clueBox.style.display = "block";
  }

  function checkAnswer() {
    if (!currentItem) return;
    var input = $("answerInput");
    var result = ENGINE.checkAnswer(currentItem, input.value);
    var fb = $("answerFeedback");
    fb.textContent = result.message || (result.correct ? "Correct" : "Not quite");
    fb.className = "present-only " + (result.correct ? "answer-correct" : "answer-incorrect");
    fb.style.display = "block";
  }

  function explainCurrent() {
    if (!currentItem) return;
    $("xtables").innerHTML = "";
    $("rules").innerHTML = ENGINE.explainItem(currentItem);
    $("explainer").style.display = "block";
  }

  /* ---- Copy (JS-5: async clipboard API, execCommand fallback for file://) ---- */
  function copyCurrent() {
    if (!currentItem) return;
    var result = ENGINE.render(currentItem);
    var text = result.canonicalText || "";
    var btn = $("btnCopy");
    function ok() {
      var old = btn.textContent;
      btn.textContent = "Copied ✓";
      setTimeout(function () { btn.textContent = old; }, 1400);
    }
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); ok(); }
      catch (e) { console.warn("PresentMode.copyCurrent: execCommand fallback failed", e); }
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(ok, fallback);
    } else {
      fallback();
    }
  }

  /* ---- Category picker (only rendered when CONFIG.generator.categories is set) ---- */
  function buildCategoryBar() {
    if (!CONFIG.generator.categories) return;
    var bar = $("categoryBar");
    var html = '<span class="muted">Category</span>' +
      '<button class="fv on" data-cat="">All</button>';
    CONFIG.generator.categories.forEach(function (cat) {
      html += '<button class="fv" data-cat="' + esc(cat.id) + '">' + esc(cat.label) + "</button>";
    });
    bar.innerHTML = html;
    bar.style.display = "flex";
    bar.querySelectorAll(".fv").forEach(function (b) {
      b.addEventListener("click", function () {
        activeCategory = b.dataset.cat || null;
        bar.querySelectorAll(".fv").forEach(function (o) { o.classList.toggle("on", o === b); });
        queue = []; // force a re-shuffle scoped to the new category
      });
    });
  }

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"); }

  /** Called by ApiSeam after a successful Tier B refresh (task E) — merges
   * newly-fetched items into the live pool, skipping any id already
   * present so a re-run of the same prompt can't duplicate entries. Does
   * not disturb the in-flight queue beyond making the new items eligible
   * on the next reshuffle. */
  function addToPool(items) {
    var existingIds = {};
    pool.forEach(function (item) { existingIds[item.id] = true; });
    items.forEach(function (item) {
      if (item && item.id && !existingIds[item.id]) {
        pool.push(item);
        existingIds[item.id] = true;
      }
    });
  }

  function init() {
    $("hdrname").textContent = CONFIG.name;
    $("hdrmeta").textContent = "Tier A · offline";

    pool = ENGINE.getPool();
    if (!pool || !pool.length) {
      console.warn("PresentMode.init: ENGINE.getPool() returned an empty pool");
    }

    buildCategoryBar();

    $("presentToolbar").style.display = "flex";
    $("btnGenerate").addEventListener("click", generate);
    $("btnCopy").addEventListener("click", copyCurrent);

    if (CONFIG.generator.clue) {
      $("btnClue").style.display = "";
      $("btnClue").addEventListener("click", revealClue);
    }

    if (CONFIG.generator.answer) {
      $("answerBar").style.display = "flex";
      $("btnCheck").addEventListener("click", checkAnswer);
      $("answerInput").addEventListener("keydown", function (ev) {
        if (ev.key === "Enter") { ev.preventDefault(); checkAnswer(); }
      });
    }

    if (CONFIG.generator.explainer) {
      $("btnExplainPresent").style.display = "";
      $("btnExplainPresent").addEventListener("click", explainCurrent);
    }

    ApiSeam.initSettingsUI();

    generate();
  }

  return { init: init, generate: generate, addToPool: addToPool };
})();
