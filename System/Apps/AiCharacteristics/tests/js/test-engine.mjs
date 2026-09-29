// Smoke tests for AiCharacteristics ENGINE (TEST-1/TEST-2/TEST-3/TEST-8's
// stdlib-only sibling: no DOM here, so plain node:test/node:assert suffice).
import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { loadCartridge, readFixture } from "./vm-harness.mjs";

test("ENGINE imports cleanly and exports the required analyse-mode contract", () => {
  const sandbox = loadCartridge();
  // Array.from(): the vm sandbox is a separate realm, so its Array.prototype
  // differs from this file's — deepEqual would otherwise fail on prototype
  // identity even though the elements match.
  const keys = Array.from(vm.runInContext("Object.keys(ENGINE).sort()", sandbox));
  assert.deepEqual(keys, ["CLOSED", "parse", "tokenize"]);
  assert.equal(vm.runInContext("typeof ENGINE.parse", sandbox), "function");
  assert.equal(vm.runInContext("typeof ENGINE.tokenize", sandbox), "function");
});

test("happy path: the AI-styled fixture flags all 8 seeded categories with both LOCAL and STATISTICAL findings", () => {
  const sandbox = loadCartridge();
  const text = readFixture("ai-sample.md");
  const R = vm.runInContext("ENGINE.parse(" + JSON.stringify(text) + ")", sandbox);

  assert.equal(R.meta.overCap, false);
  assert.ok(R.meta.wordCount > 0);

  const content = sandbox.CONTENT;
  const categoriesHit = new Set();
  const detectionTypesHit = new Set();
  R.findings.forEach((f) => {
    if (f.id === "0.1") return;
    const c = content[f.id];
    assert.ok(c, "every finding id must resolve in CONTENT: " + f.id);
    categoriesHit.add(c.category);
    detectionTypesHit.add(c.detectionType);
  });

  // The eight seeded categories from _research/seed/ai-characteristics.md,
  // one representative characteristic implemented per category.
  const expectedCategories = [
    "Lexical Markers", "Syntactic Rhythm & Structure", "Statistical Distributions",
    "Discourse Scaffolding", "Content-Level Signals", "Punctuation & Formatting",
    "Coherence & Reference", "Numerical & Naming Patterns",
  ];
  expectedCategories.forEach((cat) => assert.ok(categoriesHit.has(cat), "missing category: " + cat));
  assert.equal(categoriesHit.size, expectedCategories.length);

  // Both detector kinds must appear (Requirements: "Both must appear in the ParseResult").
  const hasLocal = [...detectionTypesHit].some((t) => t.indexOf("LOCAL") >= 0);
  const hasStatistical = [...detectionTypesHit].some((t) => t.indexOf("STATISTICAL") >= 0);
  assert.ok(hasLocal, "no LOCAL detector fired");
  assert.ok(hasStatistical, "no STATISTICAL detector fired");

  // Honesty requirement: the caveat finding is always present and first.
  assert.equal(R.findings[0].id, "0.1");
  assert.match(R.findings[0].explain, /unreliable/i);
});

test("guard path: over-cap input short-circuits, and the human-authored fixture yields characteristics-observed (not a verdict)", () => {
  const sandbox = loadCartridge({ cap: 5 });
  const overCapResult = vm.runInContext(
    "ENGINE.parse(" + JSON.stringify("one two three four five six seven eight") + ")",
    sandbox
  );
  assert.equal(overCapResult.meta.overCap, true);
  assert.equal(overCapResult.tokens, undefined, "over-cap result must short-circuit to meta only");

  const humanSandbox = loadCartridge();
  const humanText = readFixture("human-sample.md");
  const R = vm.runInContext("ENGINE.parse(" + JSON.stringify(humanText) + ")", humanSandbox);
  assert.equal(R.meta.overCap, false);
  // No authorship verdict anywhere in the output shape: only observation
  // language, and it is legal (and expected here) for zero characteristics
  // to fire on genuinely human prose.
  const allText = JSON.stringify(R.summary.classifications) + JSON.stringify(R.findings);
  assert.doesNotMatch(allText, /written by (a|an) (ai|human)/i);
  assert.doesNotMatch(allText, /this (text|passage) is (ai|human)/i);
  assert.equal(R.findings[0].id, "0.1");
  assert.match(R.summary.classifications[0].label, /not an authorship verdict/);
});
