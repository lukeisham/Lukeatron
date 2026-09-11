// Isometric lattice geometry: cube dimensions, the rotation transform (FR-21a),
// and screen projection. Pure functions only — no DOM — so the arithmetic that
// must be exact (FR-21a is transcribed, not re-derived) is unit-testable on its
// own (tests/geometry.test.mjs).
//
// Slot geometry belongs here, not to `model` (documentation spec, "model
// returns orderings, never coordinates") — this file is the "monitor places"
// half of that split.

/** One packed board is an 8×8 canonical lattice: a 2×2 arrangement of each
 * context's own 4×4 block (OQ-2's stated default). BOARD_N is "the size of the
 * lattice being turned" (FR-21a) at the board altitude; QUADRANT_N is the same
 * for one block alone at the quadrant altitude. */
export const QUADRANT_N = 4;
export const BOARD_N = QUADRANT_N * 2;

/** Each context's block origin in canonical (u, w) space — the corner of the
 * 8×8 lattice it occupies, fixed for the app's life ("no project changes
 * quadrant, slot or neighbour", documentation spec glossary, "rotation").
 * Chosen so the identity rotation (r=0) reproduces OQ-3's stated default
 * resting view: Research far, Personal Productivity right, Teaching left,
 * Church near — see projectPoint's screen mapping below for why (0,0) reads as
 * "far" and (BOARD_N,BOARD_N) as "near". */
export const QUADRANT_ORIGIN = Object.freeze({
  "Personal Research": { u: 0, w: 0 }, // far
  "Personal Productivity": { u: QUADRANT_N, w: 0 }, // right
  Teaching: { u: 0, w: QUADRANT_N }, // left
  Church: { u: QUADRANT_N, w: QUADRANT_N }, // near
});

/** The inverse of QUADRANT_ORIGIN, for labelling: which context currently sits
 * at a given board-altitude anchor corner (a, b) drawn from {0, BOARD_N}. */
export function contextAtOrigin(u, w) {
  for (const [context, origin] of Object.entries(QUADRANT_ORIGIN)) {
    if (origin.u === u && origin.w === w) return context;
  }
  return null;
}

/**
 * FR-21a — the standard 90°-step permutation of the lattice's (u, w) indices
 * about its centre, transcribed exactly. `n` is the size of the lattice being
 * turned (BOARD_N at the board altitude, QUADRANT_N at the quadrant altitude).
 * `r` is the rotation index 0..3. Returns the DISPLAY coordinate (u, v) for a
 * slot whose CANONICAL coordinate is (u, w) — canonical coordinates never
 * change; only which (u, v) they currently project to does (documentation
 * spec glossary, "rotation": "turns the view, never the data").
 */
export function rotateIndex(u, w, n, r) {
  switch (((r % 4) + 4) % 4) {
    case 0:
      return [u, w];
    case 1:
      return [w, n - 1 - u];
    case 2:
      return [n - 1 - u, n - 1 - w];
    case 3:
      return [n - 1 - w, u];
    default:
      throw new Error("unreachable");
  }
}

/**
 * FR-21a's corner form, for quadrant-label anchors: the same permutation
 * applied to one of the lattice's four corners (a, b), so a label rides the
 * corner its quadrant is currently drawn at. `n` is BOARD_N (labels are a
 * board-altitude concern only; the quadrant altitude has one label, fixed).
 */
export function rotateCorner(a, b, n, r) {
  switch (((r % 4) + 4) % 4) {
    case 0:
      return [a, b];
    case 1:
      return [b, n - a];
    case 2:
      return [n - a, n - b];
    case 3:
      return [n - b, a];
    default:
      throw new Error("unreachable");
  }
}

// ---------------------------------------------------------------------------
// Cube dimensions and screen projection. Geometry constants, not colour — no
// token exists for these because they are shape, not a palette value; the
// palette-owning file is tokens.css and nothing here contradicts that.
// ---------------------------------------------------------------------------

export const TILE_WIDTH = 64; // top-face diamond, corner to corner (horizontal)
export const TILE_DEPTH = 32; // top-face diamond, corner to corner (vertical)
export const STOREY_HEIGHT = 26; // one open task's worth of extrusion

/** Screen position of lattice point (u, v)'s footprint centre, before any
 * storey extrusion — the standard isometric lattice-to-screen mapping. Increasing
 * u moves right-and-down; increasing v moves left-and-down; this is why a
 * single lattice axis reads diagonally on screen, exactly as every isometric
 * tile lattice does. */
export function tileCentre(u, v) {
  return {
    x: (u - v) * (TILE_WIDTH / 2),
    y: (u + v) * (TILE_DEPTH / 2),
  };
}

/** Screen y of storey `k`'s footprint centre (k=0 is the ground storey), given
 * the stack sits at lattice point (u, v). Every cube instance for a stack
 * shares one (x) and is stacked upward by translating (y) alone (cube-defs.js
 * places `<use>` here) — this is the one seam between "where a stack stands"
 * (this file) and "how a cube is drawn" (cube-defs.js). */
export function storeyCentreY(u, v, k) {
  return tileCentre(u, v).y - k * STOREY_HEIGHT;
}

/** Screen position of a stack's ground-level footprint anchor (its base, for
 * the occlusion hit-test, FR-22b) and, given its open-task count, the top edge
 * of its silhouette (its topmost storey's top vertex). A storey count of 0 (a
 * plate) reads as the same top as a single storey — the flat plate occupies
 * the same reference plane a stack's first storey would extrude from. */
export function stackScreen(u, v, storeys) {
  const { x, y } = tileCentre(u, v);
  const base = y + TILE_DEPTH / 2; // the footprint's forward-most vertex
  const topStoreyIndex = Math.max(storeys - 1, 0);
  const top = storeyCentreY(u, v, topStoreyIndex) - TILE_DEPTH / 2; // topmost storey's top vertex
  return { x, base, top };
}
