import { test } from "node:test";
import assert from "node:assert/strict";
import { getAncestors, getTopLevel, flatIndex, getChildren, isFlatCatalogue } from "../src/tree.js";

function sampleArticles() {
  return {
    "1": { id: "1", title: "One", parent: null, children: ["1.1", "1.2"] },
    "1.1": { id: "1.1", title: "One One", parent: "1", children: [] },
    "1.2": { id: "1.2", title: "One Two", parent: "1", children: [] },
    "2": { id: "2", title: "Two", parent: null, children: [] },
  };
}

function sampleFlatCatalogue() {
  return {
    "riddle-1": { id: "riddle-1", title: "Riddle One", parent: null, children: [] },
    "riddle-2": { id: "riddle-2", title: "Riddle Two", parent: null, children: [] },
  };
}

test("tree.js imports cleanly and getTopLevel()/getChildren() compose correctly", () => {
  const articles = sampleArticles();
  const top = getTopLevel(articles);
  assert.deepEqual(top.map((a) => a.id), ["1", "2"]);
  assert.deepEqual(getChildren(articles, "1").map((a) => a.id), ["1.1", "1.2"]);
});

test("happy path: getAncestors()/flatIndex() reflect the id hierarchy", () => {
  const articles = sampleArticles();
  assert.deepEqual(getAncestors(articles, "1.1").map((a) => a.id), ["1"]);
  assert.deepEqual(flatIndex(articles).map((a) => a.id), ["1", "1.1", "1.2", "2"]);
});

test("guard path: isFlatCatalogue() is false for a hierarchical cartridge and true for a flat one", () => {
  assert.equal(isFlatCatalogue(sampleArticles()), false);
  assert.equal(isFlatCatalogue(sampleFlatCatalogue()), true);
  assert.equal(isFlatCatalogue({}), false); // nothing to prove flatness from
});
