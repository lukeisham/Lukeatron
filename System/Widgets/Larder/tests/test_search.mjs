// Recipe search: AND matching, ranking, the empty query, the match-reason line (panel AC-1, AC-2).
// Mirrors: web/search.js   Run: node --test tests/test_search.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { rank, matchReason } from "../web/search.js";

const recipe = (fields) => ({
  slug: "", title: "", source: "", mode: "", time_total: "", serves: "",
  saved: "", based_on: "", ingredients: [], has_svg: false, ...fields,
});

const recipes = [
  recipe({ slug: "lentil-stew", title: "Lentil stew", saved: "2026-01-10", ingredients: ["1 cup lentils", "2 medium carrots"] }),
  recipe({ slug: "carrot-soup", title: "Carrot soup", saved: "2026-02-01", ingredients: ["500 g carrots"] }),
  recipe({ slug: "green-curry", title: "Green curry", saved: "2026-03-05", source: "Test Kitchen", mode: "thermomix", ingredients: ["2 tbsp curry paste"] }),
  recipe({ slug: "red-dinner", title: "Red dinner", saved: "2026-01-20", based_on: "curry", ingredients: ["1 tbsp curry paste", "1 onion"] }),
  recipe({ slug: "plain-rice", title: "Plain rice", saved: "2025-12-01", ingredients: ["1 cup rice"] }),
];
const slugs = (list) => list.map((r) => r.slug);

test("AC-1: carrot finds every recipe with carrot in its ingredients, title match first", () => {
  assert.deepEqual(slugs(rank(recipes, "carrot")), ["carrot-soup", "lentil-stew"]);
});

test("AC-2: every word must match; nonsense matches nothing; empty returns all newest first", () => {
  assert.deepEqual(slugs(rank(recipes, "curry paste")), ["green-curry", "red-dinner"]);
  assert.deepEqual(slugs(rank(recipes, "curry onion")), ["red-dinner"]);
  assert.deepEqual(rank(recipes, "zzz"), []);
  assert.deepEqual(slugs(rank(recipes, "  ")), ["green-curry", "carrot-soup", "red-dinner", "lentil-stew", "plain-rice"]);
});

test("rank returns a new array and leaves the input order alone", () => {
  const before = slugs(recipes);
  const result = rank(recipes, "");
  assert.notEqual(result, recipes);
  assert.deepEqual(slugs(recipes), before);
});

test("matchReason is empty for a title hit and names the ingredient otherwise", () => {
  assert.equal(matchReason(recipes[1], "carrot"), "");
  assert.equal(matchReason(recipes[0], "carrot"), "in ingredients: 2 medium carrots");
  assert.equal(matchReason(recipes[0], ""), "");
  assert.equal(matchReason(recipes[3], "curry onion"), "in ingredients: 1 tbsp curry paste");
  assert.equal(matchReason(recipe({ based_on: "curry" }), "curry"), "based on: curry");
  assert.equal(matchReason(recipe({ source: "Test Kitchen" }), "kitchen"), "in source: Test Kitchen");
  assert.equal(matchReason(recipe({ mode: "thermomix" }), "thermo"), "in mode: thermomix");
});

test("guard: a non-array list warns and returns an empty array", (t) => {
  const warn = t.mock.method(console, "warn", () => {});
  assert.deepEqual(rank(null, "carrot"), []);
  assert.equal(warn.mock.callCount(), 1);
});
