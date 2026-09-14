// Slot assignment: which lattice slot each project stands on. Pure functions —
// no DOM — so the placement rule is unit-testable on its own
// (tests/lattice.test.mjs). This is "monitor places, it does not rank" (FR-1f):
// every input ordering here comes from `model` verbatim; this file only turns
// two 1-D orderings into a 2-D slot.

import { QUADRANT_N, BOARD_N, QUADRANT_ORIGIN, rotateIndex } from "./geometry.js";

/** Split `n` items into `parts` groups as evenly as possible, earlier groups
 * taking the remainder — e.g. 15 into 4 gives [4, 4, 4, 3]. This is what keeps
 * a 15-project quadrant's heaviest-effort column no deeper than any other
 * (FR-1f's "4 columns for a 3-value scale" only works if no column floods). */
function splitEvenly(n, parts) {
  const base = Math.floor(n / parts);
  const remainder = n % parts;
  return Array.from({ length: parts }, (_, i) => base + (i < remainder ? 1 : 0));
}

/**
 * Assign one quadrant's projects to local (lu, lv) slots.
 *
 * @param {string[]} effortOrderIds — model's per-quadrant `effort` ordering,
 *   heaviest first (FR-14a). Split into QUADRANT_N contiguous columns —
 *   heaviest column leftmost (lu=0) — so effort reads left-to-right.
 * @param {string[]} frontOrderIds — model's per-quadrant `due` or `short`
 *   ordering, whichever the front toggle selects (FR-14). Within a column,
 *   this decides depth — most urgent (or shortest) frontmost (lv=0).
 * @returns {Map<string, {lu: number, lv: number}>}
 */
export function assignQuadrantSlots(effortOrderIds, frontOrderIds) {
  const columnSizes = splitEvenly(effortOrderIds.length, QUADRANT_N);
  const slotById = new Map();
  let cursor = 0;
  columnSizes.forEach((size, lu) => {
    const columnIds = new Set(effortOrderIds.slice(cursor, cursor + size));
    cursor += size;
    const orderedForColumn = frontOrderIds.filter((id) => columnIds.has(id));
    orderedForColumn.forEach((id, lv) => slotById.set(id, { lu, lv }));
  });
  return slotById;
}

/** A quadrant's local (lu, lv) as a canonical (u, w) pair, local to that
 * quadrant's own 4×4 block (used directly at the quadrant altitude). Depth is
 * flipped (`QUADRANT_N - 1 - lv`) so lv=0 (front, most urgent) lands at the
 * larger local-w — the edge nearest the viewer once projected (geometry.js
 * tileCentre: larger u+w reads nearer). */
export function localCanonical(lu, lv) {
  return [lu, QUADRANT_N - 1 - lv];
}

/** The same slot's canonical (u, w) in the whole 8×8 board lattice — the
 * quadrant's fixed origin (geometry.js QUADRANT_ORIGIN) plus its local slot.
 * This is the coordinate that never changes across a rotation (documentation
 * spec glossary, "rotation": "no project changes quadrant, slot or
 * neighbour") — only what it displays as, via rotateIndex, does. */
export function boardCanonical(context, lu, lv) {
  const origin = QUADRANT_ORIGIN[context];
  const [localU, localW] = localCanonical(lu, lv);
  return [origin.u + localU, origin.w + localW];
}

/** Display coordinate for a board-altitude slot at rotation `r`. */
export function boardDisplay(context, lu, lv, r) {
  const [u, w] = boardCanonical(context, lu, lv);
  return rotateIndex(u, w, BOARD_N, r);
}

/** Display coordinate for a quadrant-altitude slot at rotation `r` — the
 * quadrant's own 4×4 lattice, rotated independently of the board (FR-21a:
 * "one quadrant's own N at the quadrant altitude"). */
export function quadrantDisplay(lu, lv, r) {
  const [u, w] = localCanonical(lu, lv);
  return rotateIndex(u, w, QUADRANT_N, r);
}
