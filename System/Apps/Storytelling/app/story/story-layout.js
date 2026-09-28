/**
 * story-layout.js — the one automatic arrangement of a story map (FR-C7).
 *
 * Pure and deterministic: no DOM, no storage, no randomness. The canvas draws what this returns and
 * story-text numbers beads from it, so screen, print and Copy cannot disagree (D-13).
 *
 * All coordinates are in map pixels with the origin at the top-left of the tray content.
 */

/** Width of one tile; a tandem (width class 2) is exactly two tiles, at zero gap (style FR-S3a/S16). */
export const BEAD_W = 64;
export const BEAD_H = 72;
/** Empty space between one layer's widest bead and the next layer. */
export const LAYER_GAP = 38;
/** Empty space between two lanes. */
export const LANE_GAP = 18;
export const PAD_X = 18;
export const PAD_Y = 14;
/** How far a loop ribbon rises above the higher of its two beads. */
export const LOOP_HEIGHT = 46;
/** How far a loop ribbon first pushes out to the right of its source bead. */
export const LOOP_OUT = 24;
/** A forward ribbon never bends tighter than this, so a short hop still curves. */
export const MIN_CURVE_DX = 12;

const TANDEM_WIDTH_CLASS = 2;

/**
 * Width class of a bead: 2 for a tandem (it carries `with`), 1 otherwise.
 * @param {{ with?: string }} bead
 * @returns {1|2}
 */
export function beadWidthClass(bead) {
  return bead && bead.with ? TANDEM_WIDTH_CLASS : 1;
}

/**
 * Arrange a story map.
 *
 * @param {Array<{ uid: string, with?: string }>} beads in the order they were added
 * @param {Array<[string, string]>} ribbons `[fromUid, toUid]` pairs, in the order they were made
 * @returns {{
 *   positions: Object<string, { x: number, y: number, w: number, h: number, layer: number, lane: number, widthClass: 1|2 }>,
 *   ribbonPaths: Array<{ from: string, to: string, loop: boolean, curve: Array<{x:number,y:number}> }>,
 *   loopRibbons: Array<[string, string]>,
 *   stepNumbers: Object<string, number>,
 *   order: string[],
 *   width: number,
 *   height: number
 * }} `order` lists uids in reading order (step 1 first). Unknown-uid ribbons are skipped with a warning.
 */
export function layout(beads, ribbons) {
  const uids = collectUids(beads);
  const known = new Set(uids);
  const links = collectLinks(ribbons, known);
  if (uids.length === 0) return emptyLayout();

  const loopIdx = findLoopRibbonIndexes(uids, links);
  const dagLinks = links.filter((_, i) => !loopIdx.has(i));

  const layerOf = assignLayers(uids, dagLinks);
  const laneOf = assignLanes(uids, dagLinks, layerOf);
  const widthClassOf = new Map(beads.filter((b) => known.has(b.uid)).map((b) => [b.uid, beadWidthClass(b)]));

  const result = placeBeads(uids, layerOf, laneOf, widthClassOf, loopIdx.size > 0);
  result.loopRibbons = [...loopIdx].map((i) => [links[i].from, links[i].to]);
  result.ribbonPaths = links.map((link, i) => {
    const loop = loopIdx.has(i);
    return { from: link.from, to: link.to, loop, curve: curveBetween(result.positions, link.from, link.to, loop) };
  });
  return result;
}

/**
 * The four Bezier control points of a ribbon in an existing layout. Shared by drawing and hit-testing
 * so the line you see is the line you hit.
 *
 * @param {[string, string]} ribbon `[fromUid, toUid]`
 * @param {{ positions: object, loopRibbons?: Array<[string,string]> }} layoutResult from `layout()`
 * @param {boolean} [loop] force the loop variant on or off; by default read from `layoutResult.loopRibbons`
 * @returns {Array<{x:number,y:number}>|null} `[p0, p1, p2, p3]`, or null if either bead is not in the layout
 */
export function ribbonCurve(ribbon, layoutResult, loop) {
  const [from, to] = ribbon;
  const isLoop = loop !== undefined
    ? loop
    : (layoutResult.loopRibbons || []).some(([f, t]) => f === from && t === to);
  return curveBetween(layoutResult.positions, from, to, isLoop);
}

/**
 * A point on a cubic Bezier.
 * @param {Array<{x:number,y:number}>} curve four control points
 * @param {number} t 0..1
 * @returns {{x:number,y:number}}
 */
export function pointOnCurve(curve, t) {
  const [p0, p1, p2, p3] = curve;
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return { x: a * p0.x + b * p1.x + c * p2.x + d * p3.x, y: a * p0.y + b * p1.y + c * p2.y + d * p3.y };
}

function emptyLayout() {
  return { positions: {}, ribbonPaths: [], loopRibbons: [], stepNumbers: {}, order: [], width: 0, height: 0 };
}

function collectUids(beads) {
  const seen = new Set();
  const uids = [];
  for (const bead of beads) {
    if (seen.has(bead.uid)) {
      console.warn(`story-layout: duplicate bead uid "${bead.uid}" ignored`);
      continue;
    }
    seen.add(bead.uid);
    uids.push(bead.uid);
  }
  return uids;
}

function collectLinks(ribbons, known) {
  const links = [];
  for (const [from, to] of ribbons) {
    if (!known.has(from) || !known.has(to)) {
      console.warn(`story-layout: ribbon ${from} -> ${to} names a bead not in the map; skipped`);
      continue;
    }
    links.push({ from, to });
  }
  return links;
}

/**
 * FR-C7 step 1. Depth-first walk from beads with no incoming ribbon (in bead order); a ribbon that
 * points at a bead still on the walk's stack closes a cycle and is a loop ribbon. Beads the roots
 * cannot reach (a pure cycle) are walked afterwards in bead order, so every bead is visited.
 * Iterative, so a 200-bead chain cannot overflow the call stack.
 */
function findLoopRibbonIndexes(uids, links) {
  const outgoing = new Map(uids.map((uid) => [uid, []]));
  const hasIncoming = new Set();
  links.forEach((link, i) => {
    outgoing.get(link.from).push({ to: link.to, index: i });
    hasIncoming.add(link.to);
  });

  const ON_STACK = 1;
  const DONE = 2;
  const state = new Map();
  const loops = new Set();

  const walk = (start) => {
    const stack = [{ uid: start, next: 0 }];
    state.set(start, ON_STACK);
    while (stack.length > 0) {
      const frame = stack[stack.length - 1];
      const edges = outgoing.get(frame.uid);
      if (frame.next >= edges.length) {
        state.set(frame.uid, DONE);
        stack.pop();
        continue;
      }
      const edge = edges[frame.next++];
      const targetState = state.get(edge.to);
      if (targetState === ON_STACK) loops.add(edge.index);
      else if (targetState === undefined) {
        state.set(edge.to, ON_STACK);
        stack.push({ uid: edge.to, next: 0 });
      }
    }
  };

  for (const uid of uids) if (!hasIncoming.has(uid) && !state.has(uid)) walk(uid);
  for (const uid of uids) if (!state.has(uid)) walk(uid);
  return loops;
}

/** FR-C7 step 2: longest path from any source, over the acyclic ribbons (Kahn's order, bead-order ties). */
function assignLayers(uids, dagLinks) {
  const layerOf = new Map(uids.map((uid) => [uid, 0]));
  const remaining = new Map(uids.map((uid) => [uid, 0]));
  const outgoing = new Map(uids.map((uid) => [uid, []]));
  for (const { from, to } of dagLinks) {
    remaining.set(to, remaining.get(to) + 1);
    outgoing.get(from).push(to);
  }
  const queue = uids.filter((uid) => remaining.get(uid) === 0);
  for (let head = 0; head < queue.length; head++) {
    const uid = queue[head];
    for (const to of outgoing.get(uid)) {
      layerOf.set(to, Math.max(layerOf.get(to), layerOf.get(uid) + 1));
      remaining.set(to, remaining.get(to) - 1);
      if (remaining.get(to) === 0) queue.push(to);
    }
  }
  return layerOf;
}

/**
 * FR-C7 step 3. Beads are visited by (layer, bead order). A start takes a new lane below all existing
 * ones; a bead that is its parent's first child, or a merge, takes its first parent's lane. If that
 * (layer, lane) cell is already taken the bead falls back to a new lane, so nothing ever overlaps.
 */
function assignLanes(uids, dagLinks, layerOf) {
  const parents = new Map(uids.map((uid) => [uid, []]));
  const firstChild = new Map();
  for (const { from, to } of dagLinks) {
    parents.get(to).push(from);
    if (!firstChild.has(from)) firstChild.set(from, to);
  }

  const indexOf = new Map(uids.map((uid, i) => [uid, i]));
  const ordered = [...uids].sort((a, b) => layerOf.get(a) - layerOf.get(b) || indexOf.get(a) - indexOf.get(b));

  const laneOf = new Map();
  const taken = new Set();
  let laneCount = 0;
  for (const uid of ordered) {
    const own = parents.get(uid);
    let lane;
    if (own.length > 0 && (own.length > 1 || firstChild.get(own[0]) === uid)) lane = laneOf.get(own[0]);
    if (lane === undefined || taken.has(`${layerOf.get(uid)}:${lane}`)) lane = laneCount++;
    laneCount = Math.max(laneCount, lane + 1);
    laneOf.set(uid, lane);
    taken.add(`${layerOf.get(uid)}:${lane}`);
  }
  return laneOf;
}

/** FR-C7 step 5: x from the widest bead of the layers before, y from the lane, numbers in (layer, lane) order. */
function placeBeads(uids, layerOf, laneOf, widthClassOf, hasLoops) {
  const layerCount = Math.max(...uids.map((uid) => layerOf.get(uid))) + 1;
  const laneCount = Math.max(...uids.map((uid) => laneOf.get(uid))) + 1;

  const layerWidth = new Array(layerCount).fill(0);
  for (const uid of uids) {
    const layer = layerOf.get(uid);
    layerWidth[layer] = Math.max(layerWidth[layer], widthClassOf.get(uid) * BEAD_W);
  }
  const layerX = [];
  let cursor = PAD_X;
  for (let layer = 0; layer < layerCount; layer++) {
    layerX.push(cursor);
    cursor += layerWidth[layer] + LAYER_GAP;
  }

  const top = PAD_Y + (hasLoops ? LOOP_HEIGHT : 0);
  const positions = {};
  for (const uid of uids) {
    const widthClass = widthClassOf.get(uid);
    positions[uid] = {
      x: layerX[layerOf.get(uid)],
      y: top + laneOf.get(uid) * (BEAD_H + LANE_GAP),
      w: widthClass * BEAD_W,
      h: BEAD_H,
      layer: layerOf.get(uid),
      lane: laneOf.get(uid),
      widthClass,
    };
  }

  const order = [...uids].sort((a, b) => positions[a].layer - positions[b].layer || positions[a].lane - positions[b].lane);
  const stepNumbers = {};
  order.forEach((uid, i) => { stepNumbers[uid] = i + 1; });

  return {
    positions,
    ribbonPaths: [],
    loopRibbons: [],
    stepNumbers,
    order,
    width: cursor - LAYER_GAP + PAD_X,
    height: top + laneCount * BEAD_H + (laneCount - 1) * LANE_GAP + PAD_Y,
  };
}

function curveBetween(positions, fromUid, toUid, loop) {
  const from = positions[fromUid];
  const to = positions[toUid];
  if (!from || !to) return null;
  return loop ? loopCurve(from, to) : forwardCurve(from, to);
}

/** Right side of the source to left side of the target; a tandem's edges are the whole pair's edges. */
function forwardCurve(from, to) {
  const p0 = { x: from.x + from.w, y: from.y + from.h / 2 };
  const p3 = { x: to.x, y: to.y + to.h / 2 };
  const dx = Math.max(MIN_CURVE_DX, (p3.x - p0.x) / 2);
  return [p0, { x: p0.x + dx, y: p0.y }, { x: p3.x - dx, y: p3.y }, p3];
}

/**
 * Leaves the source's right side, rises so the curve's peak clears the higher of the two beads by
 * LOOP_HEIGHT, and drops vertically into the top of the target (so the arrowhead points down). A cubic
 * with both inner control points at height c peaks at (y0 + y3 + 6c) / 8; solving for c hits the peak exactly.
 */
function loopCurve(from, to) {
  const p0 = { x: from.x + from.w, y: from.y + from.h / 2 };
  const p3 = { x: to.x + to.w / 2, y: to.y };
  const peakY = Math.min(from.y, to.y) - LOOP_HEIGHT;
  const controlY = (8 * peakY - p0.y - p3.y) / 6;
  return [p0, { x: p0.x + LOOP_OUT, y: controlY }, { x: p3.x, y: controlY }, p3];
}
