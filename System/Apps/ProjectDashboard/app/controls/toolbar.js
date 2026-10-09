// toolbar.js — the view buttons, density toggle and palette cycle
// (controls.spec.md FR-1..FR-4). Pure state-transition functions only: each
// one sets a single dataset attribute on <body> and nothing else (FR-6 — no
// re-render, no DOM walk, no fetch). controls.js wires these to the actual
// buttons and to storage.js; keeping them separate is what makes FR-1..FR-4
// testable without a real DOM (TEST-8).

// FR-1: the six views, in the order the toolbar presents them. "Lukeatron"
// and "All" are not project contexts — see controls.css's own comment on
// the view rules for how each of the six is actually realised.
export const VIEWS = Object.freeze(["Church", "Teaching", "Personal Productivity", "Personal Research", "Lukeatron", "All"]);
export const DEFAULT_VIEW = "All";

export const DENSITIES = Object.freeze(["expanded", "condensed"]);
export const DEFAULT_DENSITY = "expanded";

// FR-4: cycled default → paper → dark → default.
export const PALETTE_ORDER = Object.freeze(["default", "paper", "dark"]);
export const DEFAULT_PALETTE = "default";

/** FR-1: set body.dataset.view. Rejects anything not in VIEWS rather than
 * writing an attribute controls.css has no rule for (JS-2: warn loudly, no
 * silent mis-set). */
export function applyView(body, view) {
  if (!VIEWS.includes(view)) {
    console.warn(`toolbar.js: "${view}" is not one of the six known views — ignoring`, view);
    return;
  }
  body.dataset.view = view;
}

/** FR-3: set body.dataset.density. Anything other than "condensed" resolves
 * to "expanded" — the same absent-or-explicit shape board.css's own
 * data-density contract already uses, so an unrecognised stored value fails
 * safe to the full card rather than a card.css rule nobody wrote. */
export function applyDensity(body, density) {
  body.dataset.density = density === "condensed" ? "condensed" : "expanded";
}

export function nextDensity(current) {
  return current === "condensed" ? "expanded" : "condensed";
}

/** FR-4/FR-10: set body.dataset.palette explicitly. Unlike density, this
 * never falls back silently — an explicit "default" must still be written
 * (never deleted) so tokens.css's `:not([data-palette="default"])` guard
 * can tell "the viewer picked default" apart from "the viewer never chose",
 * which is what lets an explicit "default" choice beat a dark system. */
export function applyPalette(body, palette) {
  if (!PALETTE_ORDER.includes(palette)) {
    console.warn(`toolbar.js: "${palette}" is not one of the three known palettes — ignoring`, palette);
    return;
  }
  body.dataset.palette = palette;
}

/** The next palette in the cycle. `current` may be `null`/`undefined` (the
 * viewer has never chosen one) — treated as "default" for cycling purposes
 * only, so the first click always advances to "paper". */
export function nextPalette(current) {
  const idx = PALETTE_ORDER.indexOf(current ?? DEFAULT_PALETTE);
  const from = idx === -1 ? 0 : idx;
  return PALETTE_ORDER[(from + 1) % PALETTE_ORDER.length];
}
