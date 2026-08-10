import { test } from "node:test";
import assert from "node:assert/strict";
import { getAncestors, getTopLevel, flatIndex, getChildren, visibleNodes } from "../src/tree.js";

function sampleArticles() {
  return {
    "1": { id: "1", title: "One", parent: null, children: ["1.1", "1.2"] },
    "1.1": { id: "1.1", title: "One One", parent: "1", children: [] },
    "1.2": { id: "1.2", title: "One Two", parent: "1", children: [] },
    "2": { id: "2", title: "Two", parent: null, children: [] },
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

test("guard path: visibleNodes() only reveals children of an expanded id", () => {
  const articles = sampleArticles();
  const collapsed = visibleNodes(articles, new Set());
  assert.deepEqual(collapsed.map((n) => n.article.id), ["1", "2"]);

  const expanded = visibleNodes(articles, new Set(["1"]));
  assert.deepEqual(expanded.map((n) => n.article.id), ["1", "1.1", "1.2", "2"]);
});
