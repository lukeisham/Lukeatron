// test-ui.mjs — TEST-8 coverage for _shell/src/ui.js (closes the TEST-8 gap
// flagged in the 2026-08-10 test-and-refine pass: the shell's own UI
// harness had zero node:test coverage).
//
// _shell/src/ui.js is not an ES module -- it is a plain script, concatenated
// verbatim into shell.html by assemble.py and executed there against
// globals the cartridge/shell define (CONFIG, ENGINE, EXPLAINER, LEX,
// SpellingSeam, document, window, navigator). TEST-9 requires importing the
// REAL module wherever possible; since it has no `export`, "importing" it
// here means running its actual, unmodified source text via node:vm inside
// a sandbox that supplies fake versions of exactly those globals -- this is
// the real file, not a re-typed copy (TEST-9's "don't duplicate the bug").
//
// Uses the shared fake DOM (fake-dom.mjs, SR-4) -- not jsdom, not any DOM
// library (TEST-1/TEST-8).

import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createFakeDOM } from "./fake-dom.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UI_SRC = fs.readFileSync(path.join(__dirname, "..", "..", "src", "ui.js"), "utf-8");

/**
 * mountShellIds(doc) -- pre-creates every element id _shell/src/ui.js's `$()`
 * helper looks up via getElementById, mirroring shell.html's static markup
 * (ui.js assumes the host HTML already has these elements; it never creates
 * them). Mirrors shell.html's id list exactly -- see _shell/src/shell.html.
 */
function mountShellIds(doc) {
  const ids = [
    "hdrname", "hdrmeta", "lexinfo", "input", "capwarn", "wcount", "focusbar",
    "key", "iconbar", "sline", "stage", "hoverhint", "tip", "ctx", "sugg",
    "explainer", "xtables", "rules", "spellLabel", "spellTog",
    "btnParse", "btnAll", "btnExplain", "btnPdf", "btnPdfBare", "btnMd", "btnTxt",
  ];
  for (const id of ids) {
    const el = doc.createElement(id === "input" ? "div" : "span");
    el.id = id; // routes through the fake registry (fake-dom.mjs's id setter)
    doc.body.appendChild(el);
  }
}

/** A minimal but real fixed-home ParseResult shape (mirrors the spec's §4/§6 schema). */
function fixedParseResult() {
  return {
    meta: { overCap: false, wordCount: 2 },
    summary: { classifications: [{ id: "1a", label: "Declarative" }] },
    tokens: [
      { tags: [{ id: "n1", confidence: 0.95 }] },
      { tags: [{ id: "v1", confidence: 0.9 }] },
    ],
    _toks: [
      { text: "Cats", isWord: true },
      { text: "run", isWord: true },
    ],
    _clauses: [],
    findings: [],
  };
}

function makeSandbox({ levels = ["sentential", "clausal", "phrasal", "lexical"], spellingAvailable = false } = {}) {
  const doc = createFakeDOM();
  mountShellIds(doc);
  doc.body.querySelectorAll = () => []; // buildFocusBar's post-innerHTML walk (see fake-dom.mjs header)

  const CONFIG = {
    name: "Test parser",
    cap: 100,
    inputUnit: "one sentence",
    tentativeThreshold: 0.7,
    levels,
    clausePalette: [{ h50: "#fff", h100: "#eee", h600: "#333", h800: "#111", hf: "rgba(0,0,0,.1)", name: "teal" }],
    lexicon: { enabled: false },
  };
  const ENGINE = {
    tokenize(text) { return text.split(/\s+/).filter(Boolean).map((w) => ({ text: w, isWord: true })); },
    parse(_text) { return fixedParseResult(); },
  };
  const EXPLAINER = {
    posShort() { return "N"; },
    funcOf() { return "subject"; },
    clauseOf() { return null; },
    phraseOf() { return null; },
    needSpace() { return true; },
    tables() { return "<table></table>"; },
    rules() { return "<ul></ul>"; },
    toMarkdown() { return "md"; },
    toText() { return "txt"; },
  };
  const SpellingSeam = {
    isAvailable() { return spellingAvailable; },
    init() { return spellingAvailable ? { check: () => [], renderHighlights() {} } : null; },
  };

  const sandbox = {
    document: doc,
    CONFIG, ENGINE, EXPLAINER, LEX: { count: 0, morphOnly: false }, SpellingSeam,
    navigator: {},
    console,
    Math,
    Object,
    Number,
    String,
    setTimeout,
    clearTimeout,
  };
  sandbox.window = sandbox; // ui.js does `window.ParserResult = ...`
  sandbox.window.addEventListener = () => {}; // ui.js wires "afterprint" once, in init()
  sandbox.window.scrollTo = () => {};
  vm.createContext(sandbox);
  vm.runInContext(UI_SRC, sandbox, { filename: "ui.js" });
  return { sandbox, doc, CONFIG };
}

test("_shell/src/ui.js: imports (vm-executes) cleanly and exposes UI.init/parseNow/setView", () => {
  const { sandbox } = makeSandbox();
  assert.equal(typeof sandbox.UI.init, "function");
  assert.equal(typeof sandbox.UI.parseNow, "function");
  assert.equal(typeof sandbox.UI.setView, "function");
});

test("display harness: parseNow() renders a fixed ParseResult into #stage with escaped word tokens", () => {
  const { sandbox, doc } = makeSandbox();
  sandbox.UI.init();
  doc.getElementById("input")._text = "Cats run";
  doc.getElementById("input").innerText = "Cats run"; // getInputText() reads innerText
  sandbox.UI.parseNow();

  const stageHtml = doc.getElementById("stage").innerHTML;
  assert.ok(stageHtml.includes("Cats"), "expected the rendered stage to contain the first token's text");
  assert.ok(stageHtml.includes("run"), "expected the rendered stage to contain the second token's text");
  assert.ok(stageHtml.includes('class="w'), "expected word tokens to be wrapped in .w spans (real render() markup, not a re-typed copy)");
  // window.ParserResult is set by the real parseNow() -- assert the actual
  // state change (TEST-6), not merely that nothing threw.
  assert.equal(sandbox.window.ParserResult.result.meta.wordCount, 2);
});

test("focus-level switch: setView() updates #stage's class and the focus-bar label (real behaviour, not absence-of-throw)", () => {
  const { sandbox, doc } = makeSandbox();
  sandbox.UI.init();
  doc.getElementById("input").innerText = "Cats run";
  sandbox.UI.parseNow();

  sandbox.UI.setView("lexical");
  assert.equal(doc.getElementById("stage").className, "v-lexical");
  const keyHtml = doc.getElementById("key").innerHTML;
  assert.ok(keyHtml.includes("Word focus") || keyHtml.toLowerCase().includes("word"), `expected the lexical focus label in #key, got: ${keyHtml}`);

  sandbox.UI.setView("sentential");
  assert.equal(doc.getElementById("stage").className, "v-sentential");
});

test("spelling-module-absent: SpellingSeam.isAvailable()===false hides the checkbox and parseNow() never throws or calls check()", () => {
  const { sandbox, doc } = makeSandbox({ spellingAvailable: false });
  sandbox.UI.init();

  // Real behaviour asserted, not just "didn't throw" (TEST-6): the label
  // stays hidden because initSpelling() returns early when unavailable.
  assert.equal(doc.getElementById("spellLabel").style.display, "none");

  doc.getElementById("input").innerText = "Cats run";
  assert.doesNotThrow(() => sandbox.UI.parseNow());
  // render() calls runSpellCheck() unconditionally; with no spelling module
  // wired in, it must be a no-op rather than throwing on a null `spelling`.
  assert.equal(doc.getElementById("stage").innerHTML.includes("Cats"), true);
});

test("spelling-module-present: initSpelling() shows the checkbox and wires SpellingSeam.init()", () => {
  const { sandbox, doc } = makeSandbox({ spellingAvailable: true });
  sandbox.UI.init();
  assert.equal(doc.getElementById("spellLabel").style.display, "flex");
});
