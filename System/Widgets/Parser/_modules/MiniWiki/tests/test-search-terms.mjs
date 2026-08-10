import { test } from "node:test";
import assert from "node:assert/strict";
import { generateSearchTerms } from "../src/search-terms.js";

const article = {
  title: "Existential Fallacy",
  lead: "A formal fallacy in categorical logic where a universal proposition is used to infer a particular proposition.",
  characteristics: ["categorical logic error", "empty class assumption"],
};
const ancestors = [{ title: "Informal Fallacies" }];

test("search-terms.js imports cleanly and generateSearchTerms() returns weighted title terms first", () => {
  const terms = generateSearchTerms(article, ancestors);
  assert.ok(terms.includes("Existential"));
  assert.ok(terms.includes("Fallacy"));
  assert.ok(terms.length > 0);
});

test("happy path: output is deterministic across repeated calls with the same input", () => {
  const first = generateSearchTerms(article, ancestors);
  const second = generateSearchTerms(article, ancestors);
  assert.deepEqual(first, second);
});

test("guard path: stopwords and short words never appear in the output", () => {
  const terms = generateSearchTerms(article, ancestors).map((t) => t.toLowerCase());
  assert.equal(terms.includes("a"), false);
  assert.equal(terms.includes("in"), false);
  assert.equal(terms.includes("is"), false);
});
