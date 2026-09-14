// Smoke tests for geometry.js (TEST-1: node:test + node:assert/strict; TEST-2:
// happy path + guard path, not exhaustive branch coverage).
// Mirrors: app/monitor/geometry.js

import { test } from "node:test";
import assert from "node:assert/strict";
import { rotateIndex, rotateCorner, tileCentre, stackScreen } from "../geometry.js";

test("rotateIndex: r=0 is the identity (FR-21a)", () => {
  assert.deepEqual(rotateIndex(2, 1, 4, 0), [2, 1]);
});

test("rotateIndex: all four cases transcribed exactly (FR-21a)", () => {
  const n = 4;
  const u = 1;
  const w = 3;
  assert.deepEqual(rotateIndex(u, w, n, 0), [u, w]);
  assert.deepEqual(rotateIndex(u, w, n, 1), [w, n - 1 - u]);
  assert.deepEqual(rotateIndex(u, w, n, 2), [n - 1 - u, n - 1 - w]);
  assert.deepEqual(rotateIndex(u, w, n, 3), [n - 1 - w, u]);
});

test("rotateIndex: a full 4-step turn returns to the start (no crooked resting angle)", () => {
  const n = 8;
  let [u, w] = [3, 5];
  for (let r = 0; r < 4; r++) [u, w] = rotateIndex(u, w, n, 1);
  assert.deepEqual([u, w], [3, 5]);
});

test("rotateCorner: the four canonical corners permute onto each other", () => {
  const n = 8;
  // Personal Research's anchor corner is (0, 0) — "far" at r=0 (geometry.js
  // QUADRANT_ORIGIN). One step should carry it to the corner that was
  // Teaching's ("left") at r=0.
  assert.deepEqual(rotateCorner(0, 0, n, 1), [0, n]);
});

test("tileCentre: increasing u moves right and down; increasing v moves left and down", () => {
  const origin = tileCentre(0, 0);
  const alongU = tileCentre(1, 0);
  const alongV = tileCentre(0, 1);
  assert.ok(alongU.x > origin.x && alongU.y > origin.y);
  assert.ok(alongV.x < origin.x && alongV.y > origin.y);
});

test("stackScreen: a taller stack's top sits higher on screen (smaller y) than a shorter one at the same slot", () => {
  const short = stackScreen(2, 2, 1);
  const tall = stackScreen(2, 2, 5);
  assert.equal(short.base, tall.base);
  assert.ok(tall.top < short.top);
});
