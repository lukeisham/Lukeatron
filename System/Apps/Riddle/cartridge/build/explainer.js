/* files.explainer stays a required manifest field in present mode
   (GeneratorShell.spec.md §3b), but its nine-key export set is only
   checked in analyse mode, and generator.explainer: false means the
   shell never calls ENGINE.explainItem either — riddles ship no
   explainer by design (task brief). Placeholder only. */
var EXPLAINER = (function () {
  return {};
})();
