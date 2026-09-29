// The four marks on an empty box, a selection, and an already-marked selection (note-box AC-1).
// Mirrors: web/marks.js   Run: node --test tests/test_marks.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { bold, italic, list, link } from "../web/marks.js";

test("bold wraps, inserts at the caret, and toggles both ways", () => {
  assert.deepEqual(bold("Call now", 0, 4), { text: "**Call** now", start: 2, end: 6 });
  assert.deepEqual(bold("", 0, 0), { text: "****", start: 2, end: 2 });
  assert.deepEqual(bold("**Call** now", 0, 8), { text: "Call now", start: 0, end: 4 });
  assert.deepEqual(bold("**Call** now", 2, 6), { text: "Call now", start: 0, end: 4 });
});

test("italic uses underscores and toggles", () => {
  assert.deepEqual(italic("hymn", 0, 4), { text: "_hymn_", start: 1, end: 5 });
  assert.deepEqual(italic("_hymn_", 1, 5), { text: "hymn", start: 0, end: 4 });
});

test("list prefixes every touched line, and removes when all are listed", () => {
  assert.deepEqual(list("a\nb\nc", 0, 3), { text: "- a\n- b\nc", start: 0, end: 7 });
  assert.deepEqual(list("- a\n- b", 1, 5), { text: "a\nb", start: 0, end: 3 });
  assert.equal(list("x", 1, 1).text, "- x");
});

test("link selects the URL for overtyping, or puts the caret in the brackets", () => {
  assert.deepEqual(link("see agenda", 4, 10), { text: "see [agenda](https://)", start: 13, end: 21 });
  assert.deepEqual(link("", 0, 0), { text: "[](https://)", start: 1, end: 1 });
});
