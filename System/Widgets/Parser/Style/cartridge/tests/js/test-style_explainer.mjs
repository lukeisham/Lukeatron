// test-style_explainer.mjs — TEST-1/TEST-2 smoke coverage for
// Style/cartridge/build/style_explainer.js. Pure logic/data module (reads
// only ParseResult + CONTENT, FR-3) — vm-executed against a plain sandbox,
// no fake DOM (mirrors test-style_engine.mjs's rationale).

import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXPLAINER_SRC = fs.readFileSync(path.join(__dirname, "..", "..", "build", "style_explainer.js"), "utf-8");

const CONTENT = {
  "1.1": { n: "Use the active voice", l: "clarity", d: "Prefer active constructions.", e: ["Before: X / After: Y"] },
  "8.1": { n: "Passive voice as a distancing register", l: "clarity", d: "A functional register choice.", e: ["Errors were made."] },
  "2.1": { n: "Omit needless words", l: "brevity", d: "Every word should pull its weight.", e: ["Before: A / After: B"] },
  "6.6": { n: "Agentless, data-centric framing", l: "academic-english", d: "Keep the focus on the data." },
};

function makeSandbox() {
  const sandbox = { CONTENT, console };
  vm.createContext(sandbox);
  vm.runInContext(EXPLAINER_SRC, sandbox, { filename: "style_explainer.js" });
  return sandbox;
}

function genreParseResult() {
  return {
    _toks: [{ text: "The" }, { text: "report" }, { text: "was" }, { text: "reviewed" }],
    spans: [{ start: 2, end: 3, id: "1.1", label: "Use the active voice", confidence: 0.85 }],
    findings: [{ id: "1.1", label: "Use the active voice", severity: "flag", spanRef: 0, start: 2, end: 3, cat: "genre", explain: "Matches §1.1.", confidence: 0.85 }],
    summary: { classifications: [{ id: "1", label: "Clarity", cat: "genre" }], counts: { sweepCategory: "genre" } },
  };
}

function registerParseResult() {
  return {
    _toks: [],
    spans: [],
    findings: [
      { id: "6.6", label: "Agentless, data-centric framing", severity: "flag", start: 0, end: 3, cat: "register", explain: "§6.6 — flagged.", confidence: 0.8 },
    ],
    summary: { classifications: [{ id: "6", label: "Academic English", cat: "register" }], counts: { sweepCategory: "register" } },
  };
}

test("style_explainer.js: imports (vm-executes) cleanly and exposes exactly the nine required names", () => {
  const { EXPLAINER } = makeSandbox();
  ["tables", "rules", "toMarkdown", "toText", "funcOf", "phraseOf", "clauseOf", "posShort", "needSpace"].forEach((name) => {
    assert.equal(typeof EXPLAINER[name], "function", `missing required export: ${name}`);
  });
});

test("genre sweep: tables() renders a findings table with the excerpt, rule id, and a Before/After-sourced suggestion", () => {
  const { EXPLAINER } = makeSandbox();
  const html = EXPLAINER.tables(genreParseResult());
  assert.ok(html.includes("was reviewed"), "expected the flagged excerpt in the table");
  assert.ok(html.includes("1.1"), "expected the rule id in the table");
  assert.ok(html.includes("Before: X / After: Y"), "expected the CONTENT-sourced suggestion");
  assert.ok(html.includes('class="xt"'), "expected the shared .xt explainer-table class to be reused");
});

test("genre sweep: rules() deduplicates and pulls the rule's definition from CONTENT", () => {
  const { EXPLAINER } = makeSandbox();
  const html = EXPLAINER.rules(genreParseResult());
  assert.ok(html.includes("Prefer active constructions."));
  assert.ok(html.includes('class="cat"'));
});

test("register sweep: tables() renders a traffic-light row with the correct glyph for a flagged rule", () => {
  const { EXPLAINER } = makeSandbox();
  const html = EXPLAINER.tables(registerParseResult());
  assert.ok(html.includes("🔴"), "expected the red-light glyph for a severity:flag finding");
  assert.ok(html.includes("Agentless, data-centric framing"));
});

test("toText()/toMarkdown() produce non-empty, distinct plain-text/markdown exports", () => {
  const { EXPLAINER } = makeSandbox();
  const R = genreParseResult();
  const text = EXPLAINER.toText(R), md = EXPLAINER.toMarkdown(R);
  assert.ok(text.length > 0);
  assert.ok(md.includes("|"), "expected a markdown table");
  assert.notEqual(text, md);
});

test("clauseOf()/phraseOf()/posShort() behave per Style's flat-span model (no phrase/POS structure)", () => {
  const { EXPLAINER } = makeSandbox();
  const R = { _clauses: [{ start: 2, end: 3, id: "1.1", label: "Use the active voice (1.1)" }] };
  assert.equal(EXPLAINER.clauseOf(R, 2).id, "1.1");
  assert.equal(EXPLAINER.clauseOf(R, 0), null);
  assert.equal(EXPLAINER.phraseOf(R, 2), null);
  assert.equal(EXPLAINER.posShort({ text: "report" }), "");
});

test("needSpace() suppresses the space before closing punctuation, matching standard English typesetting", () => {
  const { EXPLAINER } = makeSandbox();
  assert.equal(EXPLAINER.needSpace({ text: "cat" }, { text: "." }), false);
  assert.equal(EXPLAINER.needSpace({ text: "cat" }, { text: "dog" }), true);
});

// ---- remaining-sweeps follow-up: multi-sweep filtering/grouping (style-parser-remaining-sweeps plan) ----
// The reference slice only ever exercised exactly one active sweep at a
// time (AC-S1-S4); genreRules()/registerRules() used to hang everything
// off classifications[0], which only happened to be correct in that
// single-sweep world. These fixtures exercise 2+ simultaneously active
// sweeps, which the extension makes a normal, expected combination.

function twoGenresParseResult() {
  return {
    _toks: [{ text: "The" }, { text: "report" }, { text: "was" }, { text: "reviewed" }],
    spans: [
      { start: 2, end: 3, id: "1.1", label: "Use the active voice", confidence: 0.85 },
      { start: 0, end: 1, id: "2.1", label: "Omit needless words", confidence: 0.65 },
    ],
    findings: [
      { id: "1.1", label: "Use the active voice", severity: "flag", spanRef: 0, start: 2, end: 3, cat: "genre", explain: "Matches §1.1.", confidence: 0.85 },
      { id: "2.1", label: "Omit needless words", severity: "flag", spanRef: 1, start: 0, end: 1, cat: "genre", explain: "Matches §2.1.", confidence: 0.65 },
    ],
    summary: {
      classifications: [{ id: "1", label: "Clarity", cat: "genre" }, { id: "2", label: "Brevity", cat: "genre" }],
      counts: { sweepCategory: "genre" },
    },
  };
}

function mixedParseResult() {
  return {
    _toks: [{ text: "The" }, { text: "report" }, { text: "was" }, { text: "reviewed" }],
    spans: [{ start: 2, end: 3, id: "1.1", label: "Use the active voice", confidence: 0.85 }],
    findings: [
      { id: "1.1", label: "Use the active voice", severity: "flag", spanRef: 0, start: 2, end: 3, cat: "genre", explain: "Matches §1.1.", confidence: 0.85 },
      { id: "6.6", label: "Agentless, data-centric framing", severity: "flag", start: 0, end: 3, cat: "register", explain: "§6.6 — flagged.", confidence: 0.8 },
    ],
    summary: {
      classifications: [{ id: "1", label: "Clarity", cat: "genre" }, { id: "6", label: "Academic English", cat: "register" }],
      counts: { sweepCategory: "mixed" },
    },
  };
}

test("multi-genre: rules() gives each active genre its own sub-heading, not one heading borrowing classifications[0] for everything", () => {
  const { EXPLAINER } = makeSandbox();
  const html = EXPLAINER.rules(twoGenresParseResult());
  const clarityIdx = html.indexOf("Clarity");
  const brevityIdx = html.indexOf("Brevity");
  assert.ok(clarityIdx !== -1 && brevityIdx !== -1, "expected both genre headings to appear");
  // Each genre's own rule must fall under ITS OWN heading, not the other's.
  const clarityBlock = html.slice(clarityIdx, brevityIdx > clarityIdx ? brevityIdx : undefined);
  assert.ok(clarityBlock.includes("Use the active voice") && !clarityBlock.includes("Omit needless words"));
});

test("mixed (genre + register): tables() renders both a findings table and a scorecard, each showing only its own category's findings", () => {
  const { EXPLAINER } = makeSandbox();
  const html = EXPLAINER.tables(mixedParseResult());
  const tableCount = (html.match(/<table/g) || []).length;
  assert.equal(tableCount, 2, "expected one genre findings table + one register scorecard");
  const [genrePart, registerPart] = html.split(/(?=<table)/).slice(0, 2);
  assert.ok(genrePart.includes("§1.1") && !genrePart.includes("§6.6"), "genre table must not leak the register finding");
  assert.ok(registerPart.includes("§6.6") && !registerPart.includes("§1.1"), "register scorecard must not leak the genre finding");
});
