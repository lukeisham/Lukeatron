/* ============================================================
   SHELL · SPELLING MODULE INJECTION SEAM
   ============================================================
   ParserShell.spec.md FR-11 / plan D-1: the spelling module
   (System/Widgets/Parser/_modules/Spelling/) is a PEER module, not
   shell code. The shell supplies DOM mount points and calls the
   module's own public API (SpellingModule.spec.md §3) — it never
   reaches into a cartridge's ENGINE.tokenize() for spell-checking
   (that coupling, present in the pre-shell monolith, is the exact
   defect D-5 cuts).

   THIS FILE IS THE INJECTION POINT. Two ways it resolves at build
   time (_shell/build/assemble.py, step "wire in spelling module"):

     1. If the cartridge's manifest sets spelling.enabled: true AND
        the assembler finds a built spelling-module bundle at
        _modules/Spelling/dist/spelling.bundle.js, that bundle's
        source is prepended above this file, verbatim, and it
        defines window.createSpellingModule per FR-1 of
        SpellingModule.spec.md.
     2. Otherwise (no bundle built yet, or spelling.enabled: false),
        this stub ships as-is: window.createSpellingModule stays
        undefined, and the block below degrades the UI accordingly
        — no crash, no silent partial feature, just an absent
        checkbox.

   The shell harness (ui.js) never assumes createSpellingModule
   exists; it feature-detects it once, here, and stores the result
   on SpellingSeam so ui.js has one boolean to check.
   ============================================================ */
var SpellingSeam = (function () {
  var available = typeof window !== "undefined" && typeof window.createSpellingModule === "function";
  var module = null;
  var backendPromise = null;

  /* The central dictionary (SPELLDB_B64, from _shell/build/assemble.py's
     embed_spelling_db()) ships gzip-compressed (~2.06 MB base64 vs ~4.55 MB
     raw — SpellingModule.spec.md's "Compression" measurement) and is
     decompressed + opened as a sql.js Database here, once, lazily. This is
     the shell's OWN sql.js wiring (b64bytes()/initSqlJs() from lexicon.js,
     already loaded for LEX) — NOT the shell's LEX portal itself (D-5: the
     spelling module never shares LEX's cartridge lexicon connection). */
  function loadBackend() {
    if (backendPromise) return backendPromise;
    if (typeof SPELLDB_B64 === "undefined" || !SPELLDB_B64 || SPELLDB_B64.indexOf("__") === 0) {
      backendPromise = Promise.resolve(null);
      return backendPromise;
    }
    backendPromise = window.SpellingBackend.decompressGzipBase64(SPELLDB_B64)
      .then(function (bytes) {
        return initSqlJs({ wasmBinary: b64bytes(SQLJS_WASM_B64).buffer }).then(function (SQL) {
          return window.SpellingBackend.createSqlJsBackend(new SQL.Database(bytes));
        });
      })
      .catch(function (e) {
        console.warn("SpellingSeam: dictionary load failed, spell check will treat every word as unknown", e);
        return null;
      });
    return backendPromise;
  }

  /* init(inputEl, options, onReady) — DB load + sql.js WASM init are both
     async, so this returns null immediately and calls onReady(module) once
     the module is actually constructed (D-1: the shell only supplies mount
     points; it never blocks on the module's own load path). */
  function init(inputEl, options, onReady) {
    if (!available) return null;
    if (module) { if (onReady) onReady(module); return module; }
    loadBackend().then(function (backend) {
      try {
        module = window.createSpellingModule(Object.assign({ document: document, backend: backend }, options || {}));
      } catch (e) {
        console.warn("SpellingSeam.init: createSpellingModule threw, disabling spell check", e);
        available = false;
        module = null;
      }
      if (onReady) onReady(module);
    });
    return null;
  }

  return { isAvailable: function () { return available; }, init: init };
})();
