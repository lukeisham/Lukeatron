// Smoke tests for occlusion.js — the FR-22b hit-test and FR-22a's residue.
// Mirrors: app/monitor/occlusion.js

import { test } from "node:test";
import assert from "node:assert/strict";
import { isHiddenBy, hiddenAtThisAngle, hiddenFromAllRotations } from "../occlusion.js";

const params = { cubeWidth: 64, scale: 1 };

test("isHiddenBy: happy path — nearer, same lane, tall enough hides the farther stack", () => {
  const a = { x: 0, base: 100, top: 10 }; // near, tall
  const b = { x: 5, base: 50, top: 40 }; // far, shorter, same lane (|0-5| small)
  assert.equal(isHiddenBy(a, b, params), true);
});

test("isHiddenBy: guard — not nearer means never hidden, even in the same lane", () => {
  const a = { x: 0, base: 50, top: 10 };
  const b = { x: 0, base: 100, top: 40 }; // b is actually nearer than a
  assert.equal(isHiddenBy(a, b, params), false);
});

test("isHiddenBy: guard — different lane means never hidden, however tall", () => {
  const a = { x: 0, base: 100, top: -1000 };
  const b = { x: 500, base: 50, top: 40 }; // far outside 1.6x half-width
  assert.equal(isHiddenBy(a, b, params), false);
});

test("isHiddenBy: guard — same lane and nearer, but not tall enough, does not hide", () => {
  const a = { x: 0, base: 100, top: 60 };
  const b = { x: 0, base: 50, top: 40 }; // a's top (60) is below b's top (40)
  assert.equal(isHiddenBy(a, b, params), false);
});

test("hiddenAtThisAngle: a chain of three in one lane hides the two behind the front one", () => {
  const stacks = [
    { id: "front", x: 0, base: 100, top: 0 },
    { id: "middle", x: 0, base: 50, top: 20 },
    { id: "back", x: 0, base: 10, top: 40 },
  ];
  const hidden = hiddenAtThisAngle(stacks, params);
  assert.deepEqual([...hidden].sort(), ["back", "middle"]);
});

test("hiddenFromAllRotations: only the id hidden in every one of the four sets survives", () => {
  const r0 = new Set(["a", "b"]);
  const r1 = new Set(["a"]);
  const r2 = new Set(["a", "c"]);
  const r3 = new Set(["a", "b", "c"]);
  const result = hiddenFromAllRotations([r0, r1, r2, r3]);
  assert.deepEqual([...result], ["a"]);
});

test("isHiddenBy: the lane is 1.6x the cube's HALF-width, not its full width", () => {
  // Regression. FR-22b's prose says half-width; its literal once said
  // `cube_width * a.scale * 1.6`. The build followed the literal, doubling the
  // lane, and the board reported 22 of 40 hidden from all four rotations
  // against the design's measured 4 — five times the real residue, which would
  // have condemned the rotation the whole board rests on.
  //
  // With cubeWidth 64 at scale 1: half-width lane = 32 * 1.6 = 51.2.
  // A pair 70 apart is OUTSIDE that lane, but was inside the old 102.4 one.
  const a = { x: 0, base: 100, top: 0 };
  const b = { x: 70, base: 50, top: 40 }; // further back, shorter, 70 across
  assert.equal(isHiddenBy(a, b, { cubeWidth: 64, scale: 1 }), false);

  // ...and a pair 40 apart is still inside it, so the lane did not vanish.
  const c = { x: 40, base: 50, top: 40 };
  assert.equal(isHiddenBy(a, c, { cubeWidth: 64, scale: 1 }), true);
});
