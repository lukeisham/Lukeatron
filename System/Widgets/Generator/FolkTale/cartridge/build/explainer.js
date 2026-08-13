/* FolkTale generator — files.explainer is a required manifest field in
   both modes (GeneratorShell.spec.md §3b), but its nine-key export set is
   only validated in analyse mode. generator.explainer is false in
   config.yaml (the beat legend/highlighting already is the explanation),
   so this file exists only to satisfy the required-field check. */
var EXPLAINER = (function () {
  return {};
})();
