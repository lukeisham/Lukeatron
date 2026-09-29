// DECISIONS.md D-3: "the same spec derives the correct option — never
// hand-record the answer separately." This test proves it: for every
// Abstract/Diagrammatic Reasoning item in the shipped pool, the letter
// ENGINE._deriveAnswerId() derives from the item's rule spec must equal
// the seed content's own answer key (transcribed once, here, purely for
// verification — production code never reads this table).
// engine.js is a browser IIFE assigning `var ENGINE = ...` in global scope
// (matches every other cartridge engine — see Riddle/tests/test-engine.mjs),
// so it is loaded with Node's vm module against a fake CONTENT global
// rather than imported as an ES module.
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

// Transcribed verbatim from _research/seed/psychometrics.md's
// **correct_answer:** field for each AR-* item — the seed's answer key,
// not anything ENGINE or pool.json stores.
const SEEDED_ANSWERS = {
  "AR-01": "A", "AR-02": "C", "AR-03": "A", "AR-04": "D",
  "AR-05": "A", "AR-06": "B", "AR-07": "A", "AR-08": "B",
  "AR-09": "A", "AR-10": "A", "AR-11": "A", "AR-12": "E",
};

test("engine.js imports cleanly and exposes the present-mode contract", () => {
  assert.equal(typeof ENGINE.getPool, "function");
  assert.equal(typeof ENGINE.render, "function");
  assert.equal(typeof ENGINE.checkAnswer, "function");
  assert.equal(typeof ENGINE._deriveAnswerId, "function");
});

test("every abstract-reasoning item's derived answer equals the seed's answer key", () => {
  const abstractItems = ENGINE.getPool().filter((item) => item.category === "abstract-reasoning");
  assert.equal(abstractItems.length, 12, "expected all 12 seeded abstract-reasoning items in the pool");

  const results = abstractItems.map((item) => ({
    id: item.id,
    derived: ENGINE._deriveAnswerId(item),
    seeded: SEEDED_ANSWERS[item.id],
  }));

  const mismatches = results.filter((r) => r.derived !== r.seeded);
  assert.equal(
    mismatches.length,
    0,
    "rule spec derived a different answer than the seed key: " + JSON.stringify(mismatches)
  );

  // Also confirms the derivation is doing real work, not silently failing
  // (guard against a false-pass where every item derives to null).
  results.forEach((r) => assert.notEqual(r.derived, null, r.id + ": derivation returned null"));
});

test("a rule spec whose row disagrees fails closed (returns null, never a guess)", () => {
  const broken = {
    id: "TEST-BROKEN",
    kind: "matrix",
    rows: 1,
    cols: 2,
    grid: [[{ shape: "circle", fill: "filled" }, null]],
    missing: { r: 0, c: 1 },
    rules: [{ attr: "shape", by: "row" }],
    options: { A: { shape: "square" }, B: { shape: "triangle" } },
  };
  assert.equal(ENGINE._deriveAnswerId(broken), null);
});
