// Smoke tests for Riddle/cartridge/build/engine.js's ENGINE.checkAnswer
// (TEST-1: node:test + node:assert/strict only; TEST-9: imports the real
// module, no re-implemented copy of the algorithm).
//
// engine.js is a browser IIFE that assigns `var ENGINE = ...` in global
// scope rather than exporting via ES modules (matches every other
// cartridge engine in this project — see Sandbox's engine.js). It is
// loaded here with Node's vm module against a fake `CONTENT` global (the
// only free variable it reads besides its own closure), then ENGINE is
// read back off that same context — no source is duplicated or rewritten.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import vm from "node:vm";

const here = path.dirname(fileURLToPath(import.meta.url));
const engineSrc = readFileSync(path.join(here, "..", "cartridge", "build", "engine.js"), "utf8");
const poolSrc = readFileSync(path.join(here, "..", "cartridge", "build", "pool.json"), "utf8");

const CONTENT = JSON.parse(poolSrc);
const sandbox = { CONTENT };
vm.createContext(sandbox);
vm.runInContext(engineSrc, sandbox, { filename: "engine.js" });
const ENGINE = sandbox.ENGINE;

test("imports cleanly and exposes the present-mode contract", () => {
  assert.equal(typeof ENGINE.getPool, "function");
  assert.equal(typeof ENGINE.render, "function");
  assert.equal(typeof ENGINE.checkAnswer, "function");
});

test("getPool returns every compiled riddle with id + category", () => {
  const pool = ENGINE.getPool();
  assert.equal(pool.length, 61);
  for (const item of pool) {
    assert.equal(typeof item.id, "string");
    assert.equal(typeof item.category, "string");
  }
});

test("render returns riddle html, clueHtml, and canonicalText", () => {
  const item = CONTENT["EX-001"];
  const rendered = ENGINE.render(item);
  assert.match(rendered.html, /moth ate words/);
  assert.match(rendered.clueHtml, /consumes words/);
  assert.equal(rendered.canonicalText, item.text);
});

// ---- checkAnswer: Answer-Checking Guidance worked examples ----------
//
// Only guidance examples that do NOT contradict the seed data's own
// accepted-variants lists are asserted here (see build report: two of
// the guidance's own worked examples — FO-003/CH-005 "watch" and CH-007
// "silhouette" — claim a variant should be rejected when that exact word
// is actually present in the riddle's `accepted variants` array; that is
// a defect in the guidance document, not in this engine, so those two
// cases are not encoded as must-fail assertions here).

test("EX-001 Bookworm: guidance's Example 1 near-misses", () => {
  const item = CONTENT["EX-001"];
  assert.equal(ENGINE.checkAnswer(item, "book worm").correct, true);
  assert.equal(ENGINE.checkAnswer(item, "book-worm").correct, true);
  assert.equal(ENGINE.checkAnswer(item, "moth").correct, true);
  assert.equal(ENGINE.checkAnswer(item, "bookworms").correct, true, "plural should match");
  assert.equal(ENGINE.checkAnswer(item, "bookwrom").correct, true, "typo within edit-distance tolerance");
  assert.equal(ENGINE.checkAnswer(item, "spider").correct, false, "unrelated word must be rejected");
});

test("EN-002 Egg: guidance's Example 2 near-misses", () => {
  const item = CONTENT["EN-002"];
  assert.equal(ENGINE.checkAnswer(item, "the egg").correct, true, "article should be stripped");
  assert.equal(ENGINE.checkAnswer(item, "a chicken egg").correct, true);
  assert.equal(ENGINE.checkAnswer(item, "eggs").correct, true, "plural should match");
  assert.equal(ENGINE.checkAnswer(item, "eg").correct, false, "3-char canonical has zero edit-distance tolerance");
  assert.equal(ENGINE.checkAnswer(item, "embryo").correct, false, "unrelated word must be rejected");
});

test("GR-001 Human being: guidance's Example 5 synonym variants", () => {
  const item = CONTENT["GR-001"];
  assert.equal(ENGINE.checkAnswer(item, "human being").correct, true);
  assert.equal(ENGINE.checkAnswer(item, "human").correct, true);
  assert.equal(ENGINE.checkAnswer(item, "mankind").correct, true);
  assert.equal(ENGINE.checkAnswer(item, "man").correct, true);
  assert.equal(ENGINE.checkAnswer(item, "person").correct, true);
  assert.equal(ENGINE.checkAnswer(item, "baby").correct, false, "unrelated word must be rejected");
});

test("checkAnswer edge cases: empty input and single-letter canonical", () => {
  assert.equal(ENGINE.checkAnswer(CONTENT["EX-001"], "").correct, false, "empty input is always incorrect");
  assert.equal(ENGINE.checkAnswer(CONTENT["EX-001"], "   ").correct, false, "whitespace-only input is always incorrect");
  // FO-007's answer is the single letter "R" — the letter/word variant
  // ("letter r") must match too (Edge Case #2 in the guidance).
  assert.equal(ENGINE.checkAnswer(CONTENT["FO-007"], "r").correct, true);
  assert.equal(ENGINE.checkAnswer(CONTENT["FO-007"], "letter r").correct, true);
});
