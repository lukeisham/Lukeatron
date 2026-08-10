import { test } from "node:test";
import assert from "node:assert/strict";
import { tokenize, isAllCaps, isCamelCase } from "../src/tokenizer.js";

test("tokenizer module imports cleanly and tokenize() handles empty input", () => {
  assert.deepEqual(tokenize(""), []);
  assert.deepEqual(tokenize(undefined), []);
});

test("AC-1 fixture: don't, self-aware, iPhone, NASA2, email, URL, 3.14, it's are each one token", () => {
  const cases = [
    ["don't", true],
    ["self-aware", true],
    ["iPhone", true],
    ["NASA2", true],
    ["user@example.com", false],
    ["https://example.com/x", false],
    ["3.14", false],
    ["it's", true],
  ];
  for (const [text, expectedIsWord] of cases) {
    const toks = tokenize(text);
    assert.equal(toks.length, 1, `expected exactly one token for "${text}", got ${toks.length}`);
    assert.equal(toks[0].text, text);
    assert.equal(toks[0].start, 0);
    assert.equal(toks[0].end, text.length);
    assert.equal(toks[0].isWord, expectedIsWord, `isWord mismatch for "${text}"`);
  }
});

test("offsets are character-accurate against the original string, including curly apostrophes", () => {
  const text = "She said “it’s fine” and left.";
  const toks = tokenize(text);
  for (const t of toks) {
    assert.equal(text.slice(t.start, t.end), t.text, `offset mismatch for token "${t.text}"`);
  }
  const itsToken = toks.find((t) => t.text === "it’s");
  assert.ok(itsToken, "curly-apostrophe contraction should stay one token, original curly quote preserved in .text");
  assert.equal(itsToken.isWord, true);
});

test("whitespace and punctuation runs are grouped by same class (guard path)", () => {
  const toks = tokenize("a   b!!c");
  const nonWord = toks.filter((t) => !t.isWord);
  assert.equal(nonWord.length, 2); // one whitespace run, one punctuation run
  assert.equal(nonWord[0].text, "   ");
  assert.equal(nonWord[1].text, "!!");
});

test("isAllCaps / isCamelCase classify per FR-8 rules 7/8", () => {
  assert.equal(isAllCaps("NASA2"), true);
  assert.equal(isAllCaps("NASA"), true);
  assert.equal(isAllCaps("Nasa"), false);
  assert.equal(isCamelCase("iPhone"), true);
  assert.equal(isCamelCase("getElementById"), true);
  assert.equal(isCamelCase("Apple"), false); // simple sentence-case, not camelCase
  assert.equal(isCamelCase("iOS"), false); // < 4 chars
});
