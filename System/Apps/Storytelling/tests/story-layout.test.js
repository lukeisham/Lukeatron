import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  layout,
  ribbonCurve,
  pointOnCurve,
  beadWidthClass,
  BEAD_W,
  BEAD_H,
  LAYER_GAP,
  LANE_GAP,
  LOOP_HEIGHT,
} from '../app/story/story-layout.js';

const beadsOf = (...uids) => uids.map((uid) => ({ uid }));

function assertNoOverlaps(result) {
  const rects = Object.entries(result.positions);
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const [ua, a] = rects[i];
      const [ub, b] = rects[j];
      const apart = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
      assert.ok(apart, `beads ${ua} and ${ub} overlap`);
    }
  }
}

function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test('an empty map has zero size and nothing in it', () => {
  const result = layout([], []);
  assert.equal(result.width, 0);
  assert.equal(result.height, 0);
  assert.deepEqual(result.positions, {});
  assert.deepEqual(result.ribbonPaths, []);
  assert.deepEqual(result.stepNumbers, {});
});

test('a straight chain is one lane with layers 0..n and steps in order', () => {
  const result = layout(beadsOf('a', 'b', 'c', 'd'), [['a', 'b'], ['b', 'c'], ['c', 'd']]);
  const lanes = new Set(Object.values(result.positions).map((p) => p.lane));
  assert.deepEqual([...lanes], [0]);
  assert.deepEqual(['a', 'b', 'c', 'd'].map((u) => result.positions[u].layer), [0, 1, 2, 3]);
  assert.deepEqual(result.stepNumbers, { a: 1, b: 2, c: 3, d: 4 });
  assert.deepEqual(result.order, ['a', 'b', 'c', 'd']);
  assert.equal(result.positions.b.x, result.positions.a.x + BEAD_W + LAYER_GAP);
  assert.ok(result.ribbonPaths.every((r) => !r.loop));
  assert.equal(result.height > 0 && result.width > 0, true);
});

test('a fork puts the second child in a new lane and a merge takes the first parent lane', () => {
  const beads = beadsOf('a', 'b', 'c', 'd');
  const result = layout(beads, [['a', 'b'], ['a', 'c'], ['b', 'd'], ['c', 'd']]);
  const p = result.positions;
  assert.equal(p.b.lane, p.a.lane, 'first child continues the lane');
  assert.equal(p.c.lane, 1, 'second child starts a new lane below');
  assert.equal(p.d.lane, p.b.lane, 'merge rejoins the first parent lane');
  assert.equal(p.b.layer, 1);
  assert.equal(p.c.layer, 1);
  assert.equal(p.d.layer, 2);
  assert.equal(p.c.y, p.b.y + BEAD_H + LANE_GAP);
  assertNoOverlaps(result);
});

test('a merge from a later child does not land on a bead already in that cell', () => {
  // x is a's first child; m is a's second child AND a merge whose first parent is a, so both want lane 0
  const result = layout(beadsOf('a', 'q', 'x', 'm'), [['a', 'x'], ['a', 'm'], ['q', 'm']]);
  assertNoOverlaps(result);
  assert.notEqual(result.positions.x.lane, result.positions.m.lane);
});

test('longest path sets the layer even when a shorter path also reaches the bead', () => {
  const result = layout(beadsOf('a', 'b', 'c'), [['a', 'b'], ['b', 'c'], ['a', 'c']]);
  assert.equal(result.positions.c.layer, 2);
});

test('two unattached roots each get their own lane', () => {
  const result = layout(beadsOf('a', 'b', 'c'), [['a', 'b']]);
  assert.equal(result.positions.a.lane, 0);
  assert.equal(result.positions.c.lane, 1);
  assert.equal(result.positions.c.layer, 0);
  assertNoOverlaps(result);
});

test('a loop ribbon is flagged, layering ignores it, and it arcs above both beads', () => {
  const result = layout(beadsOf('a', 'b', 'c'), [['a', 'b'], ['b', 'c'], ['c', 'a']]);
  assert.deepEqual(result.loopRibbons, [['c', 'a']]);
  assert.deepEqual(result.ribbonPaths.map((r) => r.loop), [false, false, true]);
  assert.deepEqual(['a', 'b', 'c'].map((u) => result.positions[u].layer), [0, 1, 2]);

  const [p0, , , p3] = result.ribbonPaths[2].curve;
  const c = result.positions.c;
  const a = result.positions.a;
  assert.deepEqual(p0, { x: c.x + c.w, y: c.y + c.h / 2 }, 'leaves the right side of the source');
  assert.deepEqual(p3, { x: a.x + a.w / 2, y: a.y }, 'returns into the top of the target');

  let highest = Infinity;
  for (let i = 0; i <= 100; i++) highest = Math.min(highest, pointOnCurve(result.ribbonPaths[2].curve, i / 100).y);
  assert.ok(Math.abs(highest - (a.y - LOOP_HEIGHT)) < 1, `peak ${highest} should be about ${a.y - LOOP_HEIGHT}`);
  assert.ok(highest >= 0, 'the arc stays inside the map');
  assert.ok(result.positions.a.y >= LOOP_HEIGHT, 'room is left above the beads for the arc');
});

test('a map with no loop leaves no room above the first lane for an arc', () => {
  const withLoop = layout(beadsOf('a', 'b'), [['a', 'b'], ['b', 'a']]);
  const without = layout(beadsOf('a', 'b'), [['a', 'b']]);
  assert.equal(withLoop.positions.a.y - without.positions.a.y, LOOP_HEIGHT);
});

test('a cycle with no root, a self-ribbon and a two-cycle all terminate with a loop flagged', () => {
  const pure = layout(beadsOf('a', 'b'), [['a', 'b'], ['b', 'a']]);
  assert.deepEqual(pure.loopRibbons, [['b', 'a']]);
  assert.deepEqual(pure.stepNumbers, { a: 1, b: 2 });

  const selfLoop = layout(beadsOf('a'), [['a', 'a']]);
  assert.deepEqual(selfLoop.loopRibbons, [['a', 'a']]);
  assert.equal(selfLoop.ribbonPaths[0].curve.length, 4);

  const knot = layout(beadsOf('a', 'b', 'c', 'd'), [['a', 'b'], ['b', 'c'], ['c', 'd'], ['d', 'b'], ['d', 'a'], ['c', 'a']]);
  assert.equal(Object.keys(knot.positions).length, 4);
  assertNoOverlaps(knot);
});

test('the same map lays out identically every time (AC-C5)', () => {
  const beads = beadsOf('a', 'b', 'c', 'd', 'e');
  const ribbons = [['a', 'b'], ['a', 'c'], ['b', 'd'], ['c', 'd'], ['d', 'b'], ['d', 'e']];
  const first = layout(beads, ribbons);
  for (let i = 0; i < 5; i++) assert.deepEqual(layout(structuredClone(beads), structuredClone(ribbons)), first);
});

test('tandem beads take width class 2, push later layers right, and leave no overlaps (AC-C13)', () => {
  const beads = [{ uid: 'a' }, { uid: 'b', with: 'X' }, { uid: 'c' }, { uid: 'd', with: 'Y' }, { uid: 'e' }];
  const result = layout(beads, [['a', 'b'], ['a', 'c'], ['b', 'd'], ['c', 'd'], ['d', 'e']]);
  const p = result.positions;
  assert.equal(beadWidthClass(beads[1]), 2);
  assert.equal(beadWidthClass(beads[0]), 1);
  assert.equal(p.b.widthClass, 2);
  assert.equal(p.b.w, 2 * BEAD_W);
  assert.equal(p.a.w, BEAD_W);
  // layer 1 holds a tandem (b) and a single (c): the next layer starts after the wider one
  assert.equal(p.d.x, p.b.x + 2 * BEAD_W + LAYER_GAP);
  assert.equal(p.c.x, p.b.x, 'beads in one layer share an x');
  assert.equal(result.width, p.e.x + BEAD_W + 18);
  assertNoOverlaps(result);
  // ribbons leave a tandem at its right edge and enter one at its left edge
  const bToD = result.ribbonPaths.find((r) => r.from === 'b' && r.to === 'd').curve;
  assert.equal(bToD[0].x, p.b.x + 2 * BEAD_W);
  assert.equal(bToD[3].x, p.d.x);
});

test('a 200-bead seeded random graph with forks, merges, loops and tandems has no overlaps', () => {
  const random = seededRandom(20260921);
  const beads = [];
  for (let i = 0; i < 200; i++) beads.push(random() < 0.25 ? { uid: `b${i}`, with: 'W' } : { uid: `b${i}` });
  const seen = new Set();
  const ribbons = [];
  for (let i = 1; i < 200; i++) {
    const links = 1 + Math.floor(random() * 2);
    for (let k = 0; k < links; k++) {
      const from = Math.floor(random() * i);
      const key = `${from}>${i}`;
      if (!seen.has(key)) { seen.add(key); ribbons.push([`b${from}`, `b${i}`]); }
    }
  }
  for (let i = 0; i < 20; i++) {
    const from = 1 + Math.floor(random() * 199);
    const to = Math.floor(random() * from);
    if (!seen.has(`${from}>${to}`)) { seen.add(`${from}>${to}`); ribbons.push([`b${from}`, `b${to}`]); }
  }
  const result = layout(beads, ribbons);
  assert.equal(Object.keys(result.positions).length, 200);
  assert.equal(new Set(Object.values(result.stepNumbers)).size, 200);
  assert.ok(result.loopRibbons.length > 0);
  assertNoOverlaps(result);
  assert.deepEqual(layout(beads, ribbons), result);
});

test('ribbonCurve matches the stored path and pointOnCurve hits both ends', () => {
  const result = layout(beadsOf('a', 'b', 'c'), [['a', 'b'], ['b', 'c'], ['c', 'a']]);
  for (const path of result.ribbonPaths) {
    const curve = ribbonCurve([path.from, path.to], result);
    assert.deepEqual(curve, path.curve);
    assert.deepEqual(pointOnCurve(curve, 0), curve[0]);
    assert.deepEqual(pointOnCurve(curve, 1), curve[3]);
  }
  const mid = pointOnCurve(result.ribbonPaths[0].curve, 0.5);
  const [p0, , , p3] = result.ribbonPaths[0].curve;
  assert.ok(mid.x > p0.x && mid.x < p3.x);
});

test('ribbonCurve can preview a not-yet-made ribbon and returns null for an unknown bead', () => {
  const result = layout(beadsOf('a', 'b'), [['a', 'b']]);
  assert.equal(ribbonCurve(['b', 'a'], result).length, 4);
  assert.equal(ribbonCurve(['b', 'a'], result, true)[3].y, result.positions.a.y);
  assert.equal(ribbonCurve(['a', 'zzz'], result), null);
});

test('guards: unknown-bead ribbons are skipped and duplicate uids ignored, each with a warning', () => {
  const warnings = [];
  const original = console.warn;
  console.warn = (message) => warnings.push(message);
  try {
    const result = layout([{ uid: 'a' }, { uid: 'b' }, { uid: 'a' }], [['a', 'b'], ['a', 'ghost']]);
    assert.equal(result.ribbonPaths.length, 1);
    assert.deepEqual(Object.keys(result.positions), ['a', 'b']);
    assert.equal(warnings.length, 2);
  } finally {
    console.warn = original;
  }
});
