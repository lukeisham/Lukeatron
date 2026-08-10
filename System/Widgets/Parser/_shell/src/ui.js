/* ============================================================
   SHELL · UI + HARNESS (ParserShell.spec.md FR-9/FR-10/FR-12)
   Never edited per cartridge. Reads ONLY CONFIG, CONTENT, ENGINE,
   EXPLAINER and the ParseResult schema (§4/§6 of the spec) — never
   the DOM, never re-derives Explainer content itself.

   AD-1: needSpace()/posShort() are NOT re-implemented here. They
   are required EXPLAINER exports (FR-5); this file calls
   EXPLAINER.needSpace(a,b) / EXPLAINER.posShort(t) exclusively.
   ============================================================ */
var UI = (function () {
  var R = null;
  var levels = CONFIG.levels && CONFIG.levels.length ? CONFIG.levels : ["default"];
  var CL_HOME = 1 < levels.length ? 1 : 0;
  var PH_HOME = 2 < levels.length ? 2 : -1;
  var W_HOME = levels.length - 1;
  var view = levels[Math.min(1, levels.length - 1)];

  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"); }
  // Renders footer attribution text into safe HTML, turning any
  // [label](url) markdown-style link into a real target=_blank anchor
  // (e.g. "CC-BY-SA" -> a link to the licence's own description page).
  // http(s)-only by construction: a non-http(s) "url" is left as literal
  // escaped text rather than becoming a clickable href.
  var LINK_RE = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  function renderAttribution(text) {
    var out = "", last = 0, m;
    LINK_RE.lastIndex = 0;
    while ((m = LINK_RE.exec(text))) {
      out += esc(text.slice(last, m.index));
      out += '<a href="' + esc(m[2]).replace(/"/g, "&quot;") + '" target="_blank" rel="noopener noreferrer">' + esc(m[1]) + "</a>";
      last = m.index + m[0].length;
    }
    return out + esc(text.slice(last));
  }
  function titleCase(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function levelIndex(v) { return levels.indexOf(v); }
  function focusLabel(v) {
    return (CONFIG.focusLabels && CONFIG.focusLabels[v]) || (titleCase(v) + " focus");
  }

  function getInputText() { return $("input").innerText.replace(/\s+/g, " ").trim(); }
  function wordCount(text) { return ENGINE.tokenize(text).filter(function (t) { return t.isWord; }).length; }
  function updateCount() {
    var wc = wordCount(getInputText());
    $("wcount").textContent = wc + " / " + CONFIG.cap + " words";
    $("wcount").style.color = wc > CONFIG.cap ? "var(--red)" : "";
  }

  /* ---- Focus-level bar (FR-12: built from CONFIG.levels, never hardcoded) ---- */
  function buildFocusBar() {
    var bar = $("focusbar");
    var html = '<span class="muted">Focus</span>';
    levels.forEach(function (lv) {
      html += '<button class="fv' + (lv === view ? " on" : "") + '" data-v="' + esc(lv) + '">' + esc(titleCase(lv)) + "</button>";
    });
    bar.innerHTML = html;
    bar.querySelectorAll(".fv").forEach(function (b) {
      b.addEventListener("click", function () { setView(b.dataset.v); });
    });
  }

  /* ---- Spell check (delegates to the injected SpellingSeam — FR-11, D-5) ---- */
  var spelling = null;
  var spellTimer = null;
  var spellTokens = [];
  function spellCheckAvailable() { return SpellingSeam.isAvailable(); }
  function initSpelling() {
    if (!spellCheckAvailable()) { $("spellLabel").style.display = "none"; return; }
    $("spellLabel").style.display = "flex";
    // FR-11: the shell supplies DOM mount points only (input + suggestion
    // popover) — it never passes ENGINE.tokenize or any cartridge data in.
    // SpellingSeam.init is async (dictionary decompress + sql.js load), so
    // `spelling` is only set once onReady fires; runSpellCheck() already
    // no-ops while it's null.
    SpellingSeam.init($("input"), { mounts: { input: $("input"), popover: $("spelling-suggestions") } }, function (m) {
      spelling = m;
      if (spelling) { runSpellCheck(); initSpellClickHandler(); }
    });
  }
  function runSpellCheck() {
    if (!spelling) { spellTokens = []; return; }
    var el = $("input");
    // Unchecked clears any highlights left over from before the toggle (and
    // skips the check) rather than leaving stale, now-misaligned marks on
    // screen — see spellTog's change listener below.
    spellTokens = $("spellTog").checked ? spelling.check(el.innerText) : [];
    if (typeof spelling.renderHighlights === "function") spelling.renderHighlights(el, spellTokens);
  }
  /* Locate the flagged token under a click point. The Highlight API never
     mutates the DOM (AD-2), so there is no per-word element to listen on —
     the shell maps the click's caret offset back onto the character-offset
     spans SpellingModule.check() already returned (FR-4). */
  function tokenRangeAt(start, end) {
    var textNode = $("input").firstChild || $("input");
    var r = document.createRange();
    r.setStart(textNode, start);
    r.setEnd(textNode, end);
    return r;
  }
  function tokenAtClientPoint(x, y) {
    var caretOffset = null;
    if (document.caretRangeFromPoint) {
      var cr = document.caretRangeFromPoint(x, y);
      if (cr) caretOffset = cr.startOffset;
    } else if (document.caretPositionFromPoint) {
      var pos = document.caretPositionFromPoint(x, y);
      if (pos) caretOffset = pos.offset;
    }
    if (caretOffset === null) return null;
    for (var i = 0; i < spellTokens.length; i++) {
      if (caretOffset >= spellTokens[i].start && caretOffset <= spellTokens[i].end) return spellTokens[i];
    }
    return null;
  }
  var spellClickWired = false;
  function initSpellClickHandler() {
    if (spellClickWired) return;
    spellClickWired = true;
    $("input").addEventListener("click", function (ev) {
      if (!spelling || !$("spellTog").checked) return;
      var tok = tokenAtClientPoint(ev.clientX, ev.clientY);
      if (!tok) { $("spelling-suggestions").style.display = "none"; return; }
      var anchorRange = tokenRangeAt(tok.start, tok.end);
      spelling.showSuggestions(tok.word, anchorRange, {
        onReplace: function (replacement) {
          spelling.replaceWord(tokenRangeAt(tok.start, tok.end), replacement);
          $("spelling-suggestions").style.display = "none";
          updateCount();
          runSpellCheck();
        },
        onIgnore: function (w) { spelling.ignore(w); $("spelling-suggestions").style.display = "none"; runSpellCheck(); },
        onLearn: function (w) { spelling.learn(w); $("spelling-suggestions").style.display = "none"; runSpellCheck(); }
      });
    });
  }

  /* ---- Parse-result rendering ---- */
  function clauseAt(clauses, i) {
    var f = null;
    clauses.forEach(function (c, cx) { if (i >= c.start && i <= c.end) f = cx; });
    return f;
  }

  function render() {
    if (!R) return;
    if (R.meta.overCap) {
      $("capwarn").textContent = "Over the " + CONFIG.cap + "-word cap (" + R.meta.wordCount + " words). This tool parses " + CONFIG.inputUnit + " at a time — nothing was truncated; shorten the input and parse again.";
      $("capwarn").style.display = "block";
      ["focusbar", "key", "hoverhint"].forEach(function (id) { $(id).style.display = "none"; });
      $("stage").innerHTML = ""; $("sline").textContent = ""; $("iconbar").innerHTML = ""; $("explainer").style.display = "none";
      return;
    }
    $("capwarn").style.display = "none";
    $("focusbar").style.display = "flex"; $("key").style.display = "block"; $("hoverhint").style.display = "block";
    var pal = CONFIG.clausePalette;
    $("sline").innerHTML = R.summary.classifications.map(function (c) { return esc(c.label) + " (" + c.id.replace(/[a-z]$/, "") + ")"; }).join(" · ");
    var toks = R._toks, clauses = R._clauses;
    var html = "", ci = -1, openCl = false, openPh = null;
    for (var i = 0; i < toks.length; i++) {
      var t = toks[i], cx = clauseAt(clauses, i);
      if (cx !== ci) {
        if (openPh) { html += "</span>"; openPh = null; }
        if (openCl) html += "</span>";
        ci = cx;
        if (cx !== null) {
          var cl = clauses[cx], hue = pal[cx % pal.length];
          var lbl = cl.abbr || (cl.role === "dependent" ? "DEP" : "IND " + (clauses.filter(function (c, k) { return !c.dep && k <= cx; }).length));
          html += '<span class="cl" data-ci="' + cx + '" style="--h50:' + hue.h50 + ';--h100:' + hue.h100 + ';--h600:' + hue.h600 + ';--h800:' + hue.h800 + ';--hf:' + hue.hf + ';"><span class="lbl">' + esc(lbl) + "</span>";
          openCl = true;
        } else openCl = false;
      }
      var ph = EXPLAINER.phraseOf(R, i);
      if (ph !== openPh) {
        if (openPh) html += "</span>";
        openPh = ph;
        if (ph) html += '<span class="ph' + (ph.tent ? " tentP" : "") + '" data-ps="' + ph.start + '" data-pe="' + ph.end + '">';
      }
      if (t.isWord) {
        var tag = R.tokens[i].tags[0];
        var tent = tag.confidence < CONFIG.tentativeThreshold;
        html += '<span class="w' + (tent ? " tentW" : "") + '" data-i="' + i + '">' + esc(t.text) + '<span class="pos">' + esc(EXPLAINER.posShort(t)) + "</span></span>";
      } else {
        html += '<span class="' + (cx === null ? "noclause" : "") + '">' + esc(t.text) + "</span>";
      }
      if (i < toks.length - 1 && EXPLAINER.needSpace(toks[i], toks[i + 1])) html += " ";
    }
    if (openPh) html += "</span>";
    if (openCl) html += "</span>";
    $("stage").innerHTML = html;
    renderKey(); renderIcons();
    $("hdrmeta").textContent = "Tier A · offline" + (CONFIG.lexicon && CONFIG.lexicon.enabled ? " · lexicon: " + (LEX.morphOnly ? "unavailable (morphology fallback)" : Number(LEX.count).toLocaleString() + " words") : "");
    $("explainer").style.display = "none";
    runSpellCheck();
  }

  function buildClauseChips() {
    var pal = CONFIG.clausePalette;
    return (R._clauses || []).map(function (cl, cx) {
      var hue = pal[cx % pal.length];
      var label = cl.abbr ? cl.abbr : (cl.typeName || cl.type || "clause");
      return '<span class="chip" style="background:' + hue.h50 + ';color:' + hue.h800 + ';">' + esc(hue.name) + " — " + esc(String(label).toLowerCase()) + (cl.modifies ? " (modifies “" + esc(cl.modifies) + "”)" : "") + "</span>";
    }).join(" ");
  }

  function renderKey() {
    var k = $("key");
    var p = levelIndex(view);
    var label = focusLabel(view);
    var chips = (p === 0 || p === CL_HOME) ? buildClauseChips() : "";
    var showHeading = !(p === CL_HOME && p !== 0);
    var desc;
    if (p === 0) desc = "structural boundaries shown, colour faded behind";
    else if (p === PH_HOME) desc = "sub-units shown in shades of their parent hue";
    else if (p === W_HOME) desc = "word-level tints inherit the parent hue · tag = word class · dashed underline = tentative";
    else desc = "colour intensity increases at finer focus levels · dashed underline = tentative";
    k.innerHTML = (showHeading ? "<strong>" + esc(label) + "</strong> — " + desc + (chips ? " · " : "") : "") + chips;
  }

  function renderIcons() {
    var groups = {};
    R.findings.forEach(function (f) {
      var key = f.id + "|" + f.severity;
      if (!groups[key]) groups[key] = { f: f, n: 0 };
      groups[key].n++;
    });
    var icons = { check: "✓", info: "◦", flag: "⚠" };
    $("iconbar").innerHTML = Object.keys(groups).map(function (k) {
      var g = groups[k], f = g.f;
      var mark = icons[f.severity] || "◦";
      var col = f.severity === "flag" ? "#A32D2D" : (f.severity === "check" ? "#3B6D11" : "var(--ink2)");
      return '<span class="ic"><span style="color:' + col + ';">' + mark + "</span> " + esc(f.label.toLowerCase()) + " " + f.id.replace(/[a-z]$/, "") + (g.n > 1 ? " ×" + g.n : "") + '<span class="tt"><strong>How this was calculated</strong><br>' + esc(f.explain) + "</span></span>";
    }).join("");
  }

  function setView(v) {
    view = v;
    $("stage").className = "v-" + v;
    document.querySelectorAll(".fv").forEach(function (b) { b.classList.toggle("on", b.dataset.v === v); });
    renderKey();
  }

  /* ---- Hover pop-up + right-click context menu ---- */
  function hoverText(i) {
    var p = levelIndex(view);
    var cl = EXPLAINER.clauseOf(R, i), ph = EXPLAINER.phraseOf(R, i), t = R._toks[i];
    if (p === 0) {
      var c0 = R.summary.classifications[0], c1 = R.summary.classifications[1];
      return { head: "Overview", txt: "In " + (cl ? String(cl.label).toLowerCase() : "the input") + (c0 ? " of a " + c0.label.toLowerCase() : "") + (c1 ? ", " + c1.label.toLowerCase() + "." : ".") };
    }
    if (p === CL_HOME) {
      var cc = cl ? CONTENT[cl.id] : null;
      return { head: "Structural unit", txt: (cl ? cl.label : "—") + (cc ? " — " + cc.d : "") };
    }
    if (p === PH_HOME) {
      var pc = ph ? CONTENT[ph.id] : null;
      return { head: "Sub-unit", txt: (ph ? ph.label : "not inside a sub-unit") + (pc ? " — " + pc.d : "") };
    }
    var txt = t.text + " — " + EXPLAINER.posShort(t) + " · " + EXPLAINER.funcOf(R, i) + (R.tokens[i].tags[0].confidence < CONFIG.tentativeThreshold ? " (tentative)" : "");
    var cid = R.tokens[i].tags[0].id;
    if (CONTENT[cid]) txt += ". " + CONTENT[cid].d;
    return { head: "Word class", txt: txt };
  }

  var tip;
  function initHoverAndContext() {
    tip = $("tip");
    $("stage").addEventListener("mousemove", function (ev) {
      if (!R) return;
      var w = ev.target.closest ? ev.target.closest(".w") : null;
      if (!w) { tip.style.display = "none"; return; }
      var i = +w.dataset.i;
      var h = hoverText(i);
      tip.innerHTML = "<b>" + esc(h.head) + "</b>" + esc(h.txt);
      tip.style.display = "block";
      var x = ev.pageX + 14, y = ev.pageY + 16;
      if (x + 310 > document.body.clientWidth) x = ev.pageX - 310;
      tip.style.left = x + "px"; tip.style.top = y + "px";
    });
    $("stage").addEventListener("mouseleave", function () { tip.style.display = "none"; });
    $("stage").addEventListener("contextmenu", function (ev) {
      if (!R) return;
      var w = ev.target.closest ? ev.target.closest(".w") : null;
      if (!w) return;
      ev.preventDefault();
      var i = +w.dataset.i, t = R._toks[i], cid = R.tokens[i].tags[0].id, c = CONTENT[cid];
      var ctx = $("ctx");
      ctx.innerHTML = '<div class="h">“' + esc(t.text) + '” — ' + esc(EXPLAINER.posShort(t)) + '</div><div>' + (c ? esc(c.d) : "") + '</div><div class="muted" style="padding-top:0;">Role here: ' + esc(EXPLAINER.funcOf(R, i)) + " · confidence " + Math.round(R.tokens[i].tags[0].confidence * 100) + "%</div>";
      ctx.style.left = (ev.pageX + 4) + "px"; ctx.style.top = (ev.pageY + 4) + "px"; ctx.style.display = "block";
    });
    document.addEventListener("click", function (ev) {
      if (ev.target.closest && (ev.target.closest("#ctx") || ev.target.closest("#sugg"))) return;
      $("ctx").style.display = "none";
      if (!(ev.target.closest && ev.target.closest("#input"))) $("spelling-suggestions").style.display = "none";
    });
  }

  /* ---- Actions ---- */
  function parseNow() {
    var text = getInputText();
    if (!text) return;
    R = ENGINE.parse(text);
    window.ParserResult = { result: R, parse: ENGINE.parse };
    render();
  }
  function explain() {
    if (!R || R.meta.overCap) return;
    $("xtables").innerHTML = EXPLAINER.tables(R);
    $("rules").innerHTML = EXPLAINER.rules(R);
    $("explainer").style.display = "block";
  }
  function copyText(s, btn) {
    function ok() { var old = btn.textContent; btn.textContent = "Copied ✓"; setTimeout(function () { btn.textContent = old; }, 1400); }
    if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(s).then(ok, fallback); }
    else fallback();
    function fallback() {
      var ta = document.createElement("textarea"); ta.value = s; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); ok(); } catch (e) { console.warn("copyText fallback failed", e); }
      document.body.removeChild(ta);
    }
  }

  function init() {
    $("hdrname").textContent = CONFIG.name;
    var lexinfo = $("lexinfo");
    if (CONFIG.lexicon && CONFIG.lexicon.enabled) {
      lexinfo.innerHTML = renderAttribution(" · lexicon " + (LEX.morphOnly ? "unavailable — morphology fallback" : Number(LEX.count).toLocaleString() + " words") + (CONFIG.lexicon.attribution ? " (" + CONFIG.lexicon.attribution + ")" : ""));
    }
    // AC-8: attribution is sourced from CONFIG.spelling.attribution, which
    // the assembler set from its own SPELLING_ATTRIBUTION constant — never
    // hardcoded per cartridge here.
    if (CONFIG.spelling && CONFIG.spelling.enabled && CONFIG.spelling.attribution) {
      $("spellinfo").innerHTML = renderAttribution(" · " + CONFIG.spelling.attribution);
    }
    buildFocusBar();
    $("stage").className = "v-" + view;
    initHoverAndContext();
    initSpelling();

    $("btnParse").addEventListener("click", parseNow);
    $("btnAll").addEventListener("click", function () { if (!R) parseNow(); if (R && !R.meta.overCap) { setView(levels[Math.min(1, levels.length - 1)]); explain(); window.scrollTo({ top: 0 }); } });
    $("btnExplain").addEventListener("click", function () { if (!R) parseNow(); explain(); });
    $("input").addEventListener("input", function () { updateCount(); clearTimeout(spellTimer); spellTimer = setTimeout(runSpellCheck, 600); });
    $("spellTog").addEventListener("change", runSpellCheck);
    $("btnPdf").addEventListener("click", function () { if (!R) parseNow(); explain(); document.body.className = "print-chrome"; window.print(); });
    $("btnPdfBare").addEventListener("click", function () { if (!R) parseNow(); explain(); document.body.className = "print-bare"; window.print(); });
    $("btnMd").addEventListener("click", function () { if (!R) parseNow(); if (R && !R.meta.overCap) copyText(EXPLAINER.toMarkdown(R), $("btnMd")); });
    $("btnTxt").addEventListener("click", function () { if (!R) parseNow(); if (R && !R.meta.overCap) copyText(EXPLAINER.toText(R), $("btnTxt")); });
    window.addEventListener("afterprint", function () { document.body.className = ""; });
    $("input").addEventListener("keydown", function (ev) { if (ev.key === "Enter") { ev.preventDefault(); parseNow(); } });
    updateCount();
  }

  return { init: init, parseNow: parseNow, setView: setView };
})();
