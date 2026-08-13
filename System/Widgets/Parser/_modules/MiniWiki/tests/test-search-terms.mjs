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

test("guard path: quotation proper nouns from examples never become search terms", () => {
  // Regression: "Simple Sentence" yielded Ishmael/Melville/Moby-Dick off its
  // illustrative quotation, which say nothing about the topic being searched.
  const simpleSentence = {
    title: "Simple Sentence",
    lead: "Contains exactly one independent clause.",
    examples: ['"Call me Ishmael." (Herman Melville, Moby-Dick)'],
  };
  const terms = generateSearchTerms(simpleSentence, [{ title: "Sentential Level" }]).map(
    (t) => t.toLowerCase()
  );
  ["ishmael", "melville", "moby-dick", "herman"].forEach((junk) => {
    assert.equal(terms.includes(junk), false, `example proper noun leaked: ${junk}`);
  });
  // Sentence-initial capitals are orthography, not terminology.
  assert.equal(terms.includes("contains"), false);
  // The topic's own vocabulary still survives.
  assert.ok(terms.includes("sentence"));
  assert.ok(terms.includes("sentential"));
});
