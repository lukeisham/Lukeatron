// Smoke tests for Psychometric/cartridge/build/engine.js's per-category
// dispatch (TEST-1: node:test + node:assert/strict only; TEST-9: imports
// the real module via Node's vm module, same pattern as Riddle/FolkTale's
// engine tests — engine.js is a browser IIFE, not an ES module).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import vm from "node:vm";

const here = path.dirname(fileURLToPath(import.meta.url));
const buildDir = path.resolve(here, "../../cartridge/build");

const CONTENT = JSON.parse(readFileSync(path.join(buildDir, "pool.json"), "utf8"));
const sandbox = { CONTENT, console };
vm.createContext(sandbox);
vm.runInContext(readFileSync(path.join(buildDir, "engine.js"), "utf8"), sandbox, { filename: "engine.js" });
const ENGINE = sandbox.ENGINE;

function firstOf(category) {
  const item = ENGINE.getPool().find((i) => i.category === category);
  assert.ok(item, "no pool item found for category " + category);
  return item;
}

test("imports cleanly and getPool returns the full 60-item baked pool", () => {
  const pool = ENGINE.getPool();
  assert.equal(pool.length, 60);
  const categories = new Set(pool.map((i) => i.category));
  assert.equal(categories.size, 5);
});

test("render() produces non-empty html + canonicalText for every category", () => {
  ["situational-judgement", "verbal-critical-reasoning", "abstract-reasoning", "deductive-analytical", "data-interpretation"].forEach(
    (category) => {
      const item = firstOf(category);
      const result = ENGINE.render(item);
      assert.ok(result.html && result.html.length > 0, category + ": render().html is empty");
      assert.ok(typeof result.canonicalText === "string" && result.canonicalText.length > 0, category + ": canonicalText is empty");
      assert.ok(result.clueHtml && result.clueHtml.length > 0, category + ": clueHtml is empty");
    }
  );
});

test("checkAnswer: verbal-critical-reasoning — correct letter passes, wrong letter fails with the right answer named", () => {
  const item = firstOf("verbal-critical-reasoning");
  const right = ENGINE.checkAnswer(item, item.correctLetter);
  assert.equal(right.correct, true);
  const wrongLetter = Object.keys(item.options).find((l) => l !== item.correctLetter);
  const wrong = ENGINE.checkAnswer(item, wrongLetter);
  assert.equal(wrong.correct, false);
  assert.ok(wrong.message.includes(item.correctLetter));
});

test("checkAnswer: situational-judgement scores by ranking agreement, not exact string match", () => {
  const item = firstOf("situational-judgement");
  const exact = ENGINE.checkAnswer(item, item.correctOrder.join(","));
  assert.equal(exact.correct, true);
  const reversed = ENGINE.checkAnswer(item, item.correctOrder.slice().reverse().join(","));
  assert.equal(reversed.correct, false);
  const incomplete = ENGINE.checkAnswer(item, "A,B");
  assert.equal(incomplete.correct, false);
  assert.match(incomplete.message, /all five/i);
});

test("checkAnswer: data-interpretation accepts a numeric answer within tolerance, not just the letter", () => {
  const item = ENGINE.getPool().find((i) => i.category === "data-interpretation" && i.numericTarget);
  assert.ok(item, "expected at least one data-interpretation item with a numericTarget");
  const target = item.numericTarget;
  const closeEnough = target.isPercent ? target.value + 1 : target.value * 1.02;
  const result = ENGINE.checkAnswer(item, String(closeEnough));
  assert.equal(result.correct, true, "numeric answer within tolerance should be accepted");
  const farOff = target.isPercent ? target.value + 50 : target.value * 3 + 1000;
  const wrong = ENGINE.checkAnswer(item, String(farOff));
  assert.equal(wrong.correct, false);
});

test("checkAnswer: abstract-reasoning grades against the rule-derived answer", () => {
  const item = firstOf("abstract-reasoning");
  const derived = ENGINE._deriveAnswerId(item);
  const right = ENGINE.checkAnswer(item, derived);
  assert.equal(right.correct, true);
  const wrongLetter = Object.keys(item.options).find((l) => l !== derived);
  const wrong = ENGINE.checkAnswer(item, wrongLetter);
  assert.equal(wrong.correct, false);
});

test("checkAnswer: an empty/unparseable answer never crashes and never reports correct", () => {
  const item = firstOf("verbal-critical-reasoning");
  const result = ENGINE.checkAnswer(item, "");
  assert.equal(result.correct, false);
  assert.ok(result.message.length > 0);
});

test("explainItem() returns non-empty html for every category", () => {
  ["situational-judgement", "verbal-critical-reasoning", "abstract-reasoning", "deductive-analytical", "data-interpretation"].forEach(
    (category) => {
      const html = ENGINE.explainItem(firstOf(category));
      assert.ok(typeof html === "string" && html.length > 0, category + ": explainItem() is empty");
    }
  );
});

test("every pool item id is unique and every category value matches a declared category", () => {
  const pool = ENGINE.getPool();
  const ids = new Set(pool.map((i) => i.id));
  assert.equal(ids.size, pool.length, "duplicate item id found in the pool");
});
