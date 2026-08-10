import { test } from "node:test";
import assert from "node:assert/strict";
import { createSpellingModule } from "../src/index.js";
import { createBackend } from "../src/backend.js";

function fakeBackend() {
  const words = new Map([
    ["the", { rank: 1 }],
    ["necessary", { rank: 10 }],
    ["word", { rank: 100 }],
  ]);
  return createBackend((w) => words.get(w));
}

test("index.js imports cleanly and createSpellingModule() works with zero options", () => {
  const spelling = createSpellingModule();
  assert.equal(typeof spelling.check, "function");
  assert.equal(spelling.isValid("anything"), false); // NULL_BACKEND finds nothing, not misspelled-shaped
});

test("happy path: check()/suggest()/learn() compose correctly end to end", () => {
  const spelling = createSpellingModule({ backend: fakeBackend(), variant: "en-AU" });
  const findings = spelling.check("The necesary word.");
  assert.equal(findings.length, 1);
  assert.equal(findings[0].word, "necesary");

  assert.equal(spelling.suggest("necesary")[0], "necessary");

  spelling.learn("necesary"); // pretend the user wants it accepted anyway
  assert.equal(spelling.isValid("necesary"), true);
});

test("guard path: an unknown variant option warns and falls back to en-AU rather than throwing", () => {
  const originalWarn = console.warn;
  let warned = false;
  console.warn = () => { warned = true; };
  let spelling;
  try {
    spelling = createSpellingModule({ variant: "klingon" });
  } finally {
    console.warn = originalWarn;
  }
  assert.equal(warned, true);
  assert.equal(spelling.variant, "en-AU");
});
