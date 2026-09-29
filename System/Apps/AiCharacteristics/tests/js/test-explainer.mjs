// Smoke tests for AiCharacteristics EXPLAINER (nine required exports,
// GeneratorShell.spec.md FR-5/AD-1).
import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { loadCartridge, readFixture } from "./vm-harness.mjs";

test("EXPLAINER imports cleanly and exports exactly the nine required functions", () => {
  const sandbox = loadCartridge();
  const keys = Array.from(vm.runInContext("Object.keys(EXPLAINER).sort()", sandbox));
  assert.deepEqual(keys, [
    "clauseOf", "funcOf", "needSpace", "phraseOf",
    "posShort", "rules", "tables", "toMarkdown", "toText",
  ]);
});

test("happy path: rules()/tables()/toMarkdown() surface the honesty caveat and per-characteristic why-text for a flagged document", () => {
  const sandbox = loadCartridge();
  const text = readFixture("ai-sample.md");
  const R = vm.runInContext("ENGINE.parse(" + JSON.stringify(text) + ")", sandbox);
  sandbox.R = R;

  const rulesHtml = vm.runInContext("EXPLAINER.rules(R)", sandbox);
  assert.match(rulesHtml, /unreliable/i); // caveat always first
  assert.match(rulesHtml, /Why a model does this/);
  assert.match(rulesHtml, /Lexical Markers/);

  const tablesHtml = vm.runInContext("EXPLAINER.tables(R)", sandbox);
  assert.match(tablesHtml, /<table/);
  assert.match(tablesHtml, /unreliable/i);

  const md = vm.runInContext("EXPLAINER.toMarkdown(R)", sandbox);
  assert.match(md, /^# AI Characteristics/);
  assert.doesNotMatch(md, /this text is (ai|human)-written/i);
});

test("guard path: clauseOf/phraseOf return null off-range instead of throwing, and needSpace holds punctuation-spacing rules", () => {
  const sandbox = loadCartridge();
  const text = readFixture("ai-sample.md");
  const R = vm.runInContext("ENGINE.parse(" + JSON.stringify(text) + ")", sandbox);
  sandbox.R = R;

  const outOfRange = vm.runInContext("EXPLAINER.clauseOf(R, -1)", sandbox);
  assert.equal(outOfRange, null);
  assert.equal(vm.runInContext("EXPLAINER.phraseOf(R, 0)", sandbox), null);

  const noSpaceBeforeComma = vm.runInContext(
    'EXPLAINER.needSpace({isWord:true,text:"word"}, {isWord:false,text:","})',
    sandbox
  );
  assert.equal(noSpaceBeforeComma, false);
  const spaceBetweenWords = vm.runInContext(
    'EXPLAINER.needSpace({isWord:true,text:"a"}, {isWord:true,text:"b"})',
    sandbox
  );
  assert.equal(spaceBetweenWords, true);
});
