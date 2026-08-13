/* ============================================================
   SHELL · MINIWIKI MODULE INJECTION SEAM
   ============================================================
   MiniWikiModule.spec.md FR-1 / this module is a PEER module, not
   shell code (SR-4, mirrors spelling-seam.js). Per Luke's correction,
   the Mini-Wiki is NOT an in-page panel — it opens as its own
   complete, self-contained HTML document in a NEW BROWSER TAB, with
   its own hash routing (#/1.1.1), independent of the parser tab. The
   parser page carries exactly one launch button; this seam builds the
   wiki document as a string at click time and opens it.

   A cartridge stays ONE file on disk: nothing here writes a second
   file or makes a network request. The wiki document is assembled at
   RUNTIME (in the browser) from three build-time-embedded pieces —
   MINIWIKI_BUNDLE_SRC (the module's bundled JS, as a string),
   MINIWIKI_ARTICLES, and MINIWIKI_CARTRIDGE_NAME — all set by
   _shell/build/assemble.py from the cartridge's manifest
   (miniwiki.enabled + miniwiki.articlesFile). When miniwiki.enabled is
   false/absent, MINIWIKI_BUNDLE_SRC stays empty and isAvailable()
   is false: no button, no crash, no silent partial feature.

   Opening strategy (open()): Blob + URL.createObjectURL(...) is tried
   first — it works from file:// in every Chromium/Firefox/Safari
   version this shell targets and keeps the new tab's `document.write`
   surface out of the picture entirely. If that throws (a locked-down
   embedder without Blob URL support), it falls back to
   window.open("") + document.write(). If window.open ever returns
   null/undefined (pop-up blocked either way), open() returns false so
   the caller can show an inline "allow pop-ups" message instead of
   failing silently (JS-2).
   ============================================================ */
var MiniWikiSeam = (function () {
  var available =
    typeof MINIWIKI_BUNDLE_SRC !== "undefined" &&
    !!MINIWIKI_BUNDLE_SRC &&
    typeof MINIWIKI_ARTICLES !== "undefined" &&
    Array.isArray(MINIWIKI_ARTICLES) &&
    MINIWIKI_ARTICLES.length > 0;

  // The same design tokens the shell's own :root carries (shell.css) —
  // duplicated here because the wiki opens as a SEPARATE document that
  // cannot inherit the parser tab's stylesheet. MINIWIKI_CSS (injected
  // into the new document by the module's own mount(), via
  // styles.js's injectStylesOnce) references these var(--...) names, so
  // they must be declared before mount() runs.
  var ROOT_TOKENS_CSS =
    ":root{--bg:#faf9f5;--card:#fff;--ink:#1a1a17;--ink2:#5f5e5a;--ink3:#9a9891;" +
    "--line:#e3e1d9;--line2:#c9c7bd;--acc:#185FA5;--accbg:#E6F1FB;--radius:8px;font-size:16px;}" +
    "*{box-sizing:border-box;}" +
    "body{margin:0;background:var(--bg);color:var(--ink);" +
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;' +
    "line-height:1.55;}" +
    ".mw-page-wrap{max-width:1100px;margin:0 auto;padding:20px;}" +
    ".mw-page-header{display:flex;align-items:center;justify-content:space-between;" +
    "margin-bottom:16px;font-weight:600;font-size:16px;}";

  function buildDocument() {
    var title = (MINIWIKI_CARTRIDGE_NAME || "Mini-Wiki") + " — Mini-Wiki";
    return (
      "<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"utf-8\">" +
      '<meta name="viewport" content="width=device-width, initial-scale=1">' +
      "<title>" + escapeHtml(title) + "</title>" +
      "<style>" + ROOT_TOKENS_CSS + "</style></head><body>" +
      '<div class="mw-page-wrap">' +
      '<div class="mw-page-header"><span>' + escapeHtml(MINIWIKI_CARTRIDGE_NAME || "Mini-Wiki") + "</span>" +
      '<span style="font-size:12px;color:var(--ink3);">Offline · no network requests</span></div>' +
      '<div class="mw-root"><div id="miniwiki-nav"></div><div id="miniwiki-article" class="mw-article-pane"></div></div>' +
      "</div>" +
      "<script>\n" + safeScriptBody(MINIWIKI_BUNDLE_SRC) + "\n<\/script>" +
      "<script>\n" +
      "var MINIWIKI_ARTICLES = " + safeScriptBody(JSON.stringify(MINIWIKI_ARTICLES)) + ";\n" +
      "var MINIWIKI_CARTRIDGE_NAME = " + JSON.stringify(MINIWIKI_CARTRIDGE_NAME || "Mini-Wiki") + ";\n" +
      "var wiki = window.createMiniWikiModule({ document: document, articles: MINIWIKI_ARTICLES, " +
      "cartridgeName: MINIWIKI_CARTRIDGE_NAME });\n" +
      'wiki.mount(document.getElementById("miniwiki-nav"), document.getElementById("miniwiki-article"));\n' +
      "<\/script></body></html>"
    );
  }

  // A literal script-close sequence anywhere inside dynamic content — OR, as here,
  // anywhere in THIS FILE'S OWN source text — closes the surrounding
  // <script> tag early the moment this seam is embedded verbatim into
  // shell.html: the HTML parser has no notion of JS string literals, so
  // it does not matter that the text is "inside a string" from JS's point
  // of view. Every closing-tag literal above is written as "<\/script>"
  // (the backslash is a no-op to the JS engine, \/  ===  /) for exactly
  // this reason. safeScriptBody() applies the same escape to DYNAMIC
  // content at the point this seam assembles the new tab's document —
  // assemble.py already guards the embedded bundle text at build time,
  // and MINIWIKI_ARTICLES' body_html is build-time-escaped per HTML-6,
  // but neither of those is assumed safe against this specific
  // HTML-parser quirk without an explicit runtime check here too.
  function safeScriptBody(text) {
    return String(text).replace(/<\/script/gi, "<\\/script");
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /** open() -> boolean. Opens the wiki as a new, independent tab; returns
   * false (never throws) when the browser blocked the pop-up, so the
   * caller can show its own "allow pop-ups" message (JS-2). */
  function open_() {
    if (!available) return false;
    var html = buildDocument();
    try {
      var blob = new Blob([html], { type: "text/html" });
      var url = URL.createObjectURL(blob);
      var win = window.open(url, "_blank");
      if (!win) return false;
      // Revoke once the new tab has actually loaded the blob, not
      // immediately — an early revoke can race the load on some
      // embedders and blank the tab.
      win.addEventListener("load", function () {
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      });
      return true;
    } catch (e) {
      console.warn("MiniWikiSeam.open: Blob URL path failed, falling back to document.write", e);
    }
    try {
      var win2 = window.open("", "_blank");
      if (!win2) return false;
      win2.document.open();
      win2.document.write(html);
      win2.document.close();
      return true;
    } catch (e2) {
      console.warn("MiniWikiSeam.open: document.write fallback also failed", e2);
      return false;
    }
  }

  return { isAvailable: function () { return available; }, open: open_ };
})();
