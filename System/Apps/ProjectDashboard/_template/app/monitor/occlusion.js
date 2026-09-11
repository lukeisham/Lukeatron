// FR-22b's occlusion hit-test, transcribed exactly — and FR-22a's diagnostic,
// which runs this test over every pair and reports the residue. This is
// diagnostic information that gates nothing (AD-5): reachability, not
// visibility, is the guarantee (FR-22). Pure functions — no DOM — so the
// arithmetic is unit-testable on its own (tests/occlusion.test.mjs).

const LANE_FACTOR = 1.6;

/**
 * FR-22b: is `b` hidden by `a`, at one rotation?
 *
 * Three conditions, all required:
 *   1. `a` is nearer the viewer than `b` — `a`'s screen base sits below `b`'s
 *      (`b.base < a.base`, painter's-order coordinate).
 *   2. They share a lane — horizontal screen centres within 1.6× the cube's
 *      scaled HALF-width: `|a.x - b.x| < (cubeWidth / 2) * scale * 1.6`.
 *
 *      `cubeWidth` is TILE_WIDTH, the top-face diamond corner to corner, so the
 *      half-width is `cubeWidth / 2`. FR-22b's prose says half-width and its
 *      literal said `cube_width * a.scale * 1.6`; the two disagreed, and the
 *      literal was the error — the design measured this rule with a half-width
 *      (`G.cw = 30`, the cell HALF-width, in the batch-six mockup that produced
 *      the "4 of 40 hidden from all four" figure). Taking the literal doubled
 *      the lane and reported 22 of 40, five times the measured residue, which
 *      would have condemned the rotation the board's whole design rests on.
 *      Spec corrected to match its own prose; see the registry's phase log.
 *   3. `a`'s silhouette top edge sits at or above `b`'s: `a.top <= b.top`.
 *
 * @param {{x: number, base: number, top: number}} a
 * @param {{x: number, base: number, top: number}} b
 * @param {{cubeWidth: number, scale: number}} params
 */
export function isHiddenBy(a, b, { cubeWidth, scale }) {
  if (!(b.base < a.base)) return false;
  const sharesLane = Math.abs(a.x - b.x) < (cubeWidth / 2) * scale * LANE_FACTOR;
  if (!sharesLane) return false;
  return a.top <= b.top;
}

/**
 * FR-22a: "hidden at this angle", run once over every pair, at the board's
 * current rotation. Returns the set of ids hidden by at least one other stack.
 *
 * @param {{id: string, x: number, base: number, top: number}[]} stacks
 * @param {{cubeWidth: number, scale: number}} params
 * @returns {Set<string>}
 */
export function hiddenAtThisAngle(stacks, params) {
  const hidden = new Set();
  for (const a of stacks) {
    for (const b of stacks) {
      if (a === b || hidden.has(b.id)) continue;
      if (isHiddenBy(a, b, params)) hidden.add(b.id);
    }
  }
  return hidden;
}

/**
 * FR-22a: "hidden from all four" — the intersection of a stack's hidden-or-not
 * result across all four rotation indices.
 *
 * @param {Set<string>[]} hiddenPerRotation — exactly four sets, one per r.
 * @returns {Set<string>}
 */
export function hiddenFromAllRotations(hiddenPerRotation) {
  const [first, ...rest] = hiddenPerRotation;
  const result = new Set(first);
  for (const id of first) {
    if (!rest.every((set) => set.has(id))) result.delete(id);
  }
  return result;
}
