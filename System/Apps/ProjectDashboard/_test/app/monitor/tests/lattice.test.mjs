// Smoke tests for lattice.js — slot assignment and the board/quadrant
// canonical coordinate seam. Mirrors: app/monitor/lattice.js

import { test } from "node:test";
import assert from "node:assert/strict";
import { assignQuadrantSlots, boardCanonical, boardDisplay } from "../lattice.js";

test("assignQuadrantSlots: 15 projects split into columns no deeper than 4 (Church's real count)", () => {
  const ids = Array.from({ length: 15 }, (_, i) => `p${i}`);
  const slots = assignQuadrantSlots(ids, ids); // front order == effort order here, only depth matters
  const depthPerColumn = new Map();
  for (const { lu, lv } of slots.values()) {
    depthPerColumn.set(lu, Math.max(depthPerColumn.get(lu) ?? 0, lv + 1));
  }
  for (const depth of depthPerColumn.values()) assert.ok(depth <= 4, `column depth ${depth} exceeds the 4x4 lattice`);
  assert.equal(slots.size, 15);
});

test("assignQuadrantSlots: heaviest-effort project lands in the leftmost column", () => {
  const effortOrder = ["heavy", "medium", "light"]; // heaviest first, per model's ordering
  const slots = assignQuadrantSlots(effortOrder, effortOrder);
  assert.equal(slots.get("heavy").lu, 0);
  assert.ok(slots.get("light").lu >= slots.get("heavy").lu);
});

test("assignQuadrantSlots: within a column, the front toggle's order decides depth", () => {
  // 5 items into 4 columns -> sizes [2,1,1,1]: "a" and "b" share column 0.
  const effortOrder = ["a", "b", "x", "y", "z"];
  const dueOrder = ["b", "a", "x", "y", "z"]; // b is more urgent than a
  const slots = assignQuadrantSlots(effortOrder, dueOrder);
  assert.equal(slots.get("a").lu, 0);
  assert.equal(slots.get("b").lu, 0);
  assert.equal(slots.get("b").lv, 0);
  assert.equal(slots.get("a").lv, 1);
});

test("boardCanonical: no project changes quadrant or slot across a rotation — only boardDisplay changes", () => {
  const canonicalBefore = boardCanonical("Church", 1, 2);
  // boardDisplay at every r reads the SAME canonical cell; canonical itself
  // never takes a rotation argument, which is the guarantee.
  const r0 = boardDisplay("Church", 1, 2, 0);
  const r1 = boardDisplay("Church", 1, 2, 1);
  assert.deepEqual(boardCanonical("Church", 1, 2), canonicalBefore);
  assert.notDeepEqual(r0, r1); // the DISPLAY position does change with rotation
});
