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
    "explainer", "xtables", "rules", "spellLabel", "spellTog", "sweepbar",
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

/** Two clauses at distinct array positions, for AD-S4's hueIndex-vs-array-position test. */
function fixedParseResultTwoClauses() {
  return {
    meta: { overCap: false, wordCount: 4 },
    summary: { classifications: [{ id: "1a", label: "Declarative" }] },
    tokens: [
      { tags: [{ id: "n1", confidence: 0.95 }] },
      { tags: [{ id: "v1", confidence: 0.9 }] },
      { tags: [{ id: "n2", confidence: 0.95 }] },
      { tags: [{ id: "v2", confidence: 0.9 }] },
    ],
    _toks: [
      { text: "Cats", isWord: true },
      { text: "run", isWord: true },
      { text: "Dogs", isWord: true },
      { text: "bark", isWord: true },
    ],
    _clauses: [
      { start: 0, end: 1, abbr: "A" }, // no hueIndex -> falls back to array position (pal[0])
      { start: 2, end: 3, abbr: "B", hueIndex: 0 }, // array position 1, but hueIndex pins it to pal[0]
    ],
    findings: [],
  };
}

function makeSandbox({ levels = ["sentential", "clausal", "phrasal", "lexical"], spellingAvailable = false, sweeps = undefined, clausePalette = undefined, parseResult = undefined } = {}) {
  const doc = createFakeDOM();
  mountShellIds(doc);
  doc.body.querySelectorAll = () => []; // buildFocusBar's post-innerHTML walk (see fake-dom.mjs header)

  const CONFIG = {
    name: "Test parser",
    cap: 100,
    inputUnit: "one sentence",
    tentativeThreshold: 0.7,
    levels,
    clausePalette: clausePalette || [{ h50: "#fff", h100: "#eee", h600: "#333", h800: "#111", hf: "rgba(0,0,0,.1)", name: "teal" }],
    lexicon: { enabled: false },
  };
  if (sweeps) CONFIG.sweeps = sweeps;
  const parseCalls = [];
  const ENGINE = {
    tokenize(text) { return text.split(/\s+/).filter(Boolean).map((w) => ({ text: w, isWord: true })); },
    parse(text, selection) { parseCalls.push({ text, selection }); return parseResult || fixedParseResult(); },
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
  return { sandbox, doc, CONFIG, parseCalls };
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

test("AD-S4: render() looks up a clause's hue by cl.hueIndex when set, not just array position; falls back to array position when absent (Grammar's own clauses never set it)", () => {
  const palette = [
    { h50: "#AAA000", h100: "#eee", h600: "#333", h800: "#111", hf: "rgba(0,0,0,.1)", name: "first" },
    { h50: "#BBB000", h100: "#eee", h600: "#333", h800: "#111", hf: "rgba(0,0,0,.1)", name: "second" },
  ];
  const { sandbox, doc } = makeSandbox({ clausePalette: palette, parseResult: fixedParseResultTwoClauses() });
  sandbox.UI.init();
  doc.getElementById("input").innerText = "Cats run Dogs bark";
  sandbox.UI.parseNow();

  const stageHtml = doc.getElementById("stage").innerHTML;
  const clauseA = /data-ci="0"[^>]*style="([^"]*)"/.exec(stageHtml);
  const clauseB = /data-ci="1"[^>]*style="([^"]*)"/.exec(stageHtml);
  assert.ok(clauseA, "expected clause A (array position 0, no hueIndex) to render");
  assert.ok(clauseB, "expected clause B (array position 1, hueIndex:0) to render");
  assert.ok(clauseA[1].includes("--h50:#AAA000"), "clause A has no hueIndex -> falls back to array position 0 -> pal[0]");
  assert.ok(clauseB[1].includes("--h50:#AAA000"), "clause B is at array position 1 but hueIndex:0 pins it to pal[0], not pal[1]");
  assert.ok(!clauseB[1].includes("--h50:#BBB000"), "clause B must NOT get the array-position-1 hue once hueIndex overrides it");
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

// ---- Sweep selector (FR-19/FR-20, ParserShell.spec.md) ----
// A cartridge that omits CONFIG.sweeps entirely (every cartridge today,
// Grammar included) must see zero behaviour change from this addition —
// asserted directly here, not just inferred from the byte-diff regression
// check performed against Grammar's actual build (Style/Specs/StyleParser.spec.md AC-S5).

test("sweep selector absent (CONFIG.sweeps undefined): #sweepbar stays unrendered and ENGINE.parse still receives a usable call", () => {
  const { sandbox, doc, parseCalls } = makeSandbox(); // no `sweeps` option -> CONFIG.sweeps undefined
  sandbox.UI.init();
  assert.equal(doc.getElementById("sweepbar").innerHTML, "", "buildSweepBar() must no-op when CONFIG.sweeps is absent");

  doc.getElementById("input").innerText = "Cats run";
  sandbox.UI.parseNow();
  assert.equal(parseCalls.length, 1);
  assert.equal(parseCalls[0].text, "Cats run");
  // readSweepSelection() must return undefined (not {}) here — an extra
  // `undefined` argument is inert for any ENGINE.parse(text) that declares
  // only one parameter (ordinary JS call semantics), which is what makes
  // this addition byte-for-byte behaviour-safe for every existing cartridge.
  assert.equal(parseCalls[0].selection, undefined);
});

test("sweep selector present: buildSweepBar() renders one checkbox per CONFIG.sweeps.items and shows #sweepbar", () => {
  const sweeps = {
    enabled: true,
    items: [
      { id: "clarity", label: "Clarity", category: "genre", oppositeId: "obscurity", oppositeLabel: "Obscurity" },
      { id: "academic-english", label: "Academic English", category: "register" },
    ],
  };
  const { sandbox, doc } = makeSandbox({ sweeps });
  sandbox.UI.init();

  const bar = doc.getElementById("sweepbar");
  assert.equal(bar.style.display, "flex");
  // buildSweepBar() writes via innerHTML (fake DOM stores the string but does
  // not parse it into real children — see fake-dom.mjs's header note); assert
  // on the stored markup content, matching this file's existing buildFocusBar() pattern.
  const html = bar.innerHTML;
  assert.ok(html.includes("Clarity"), "expected a Clarity checkbox label");
  assert.ok(html.includes("Academic English"), "expected an Academic English checkbox label");
  assert.ok(html.includes("Obscurity"), "expected Clarity's opposite-toggle label (category:genre only)");
  assert.ok(!html.includes('data-for="academic-english"'), "a category:register item must not get an opposite toggle");
});

test("sweep selector: readSweepSelection() reads checkbox/opposite-toggle state into the {sweeps:{id:{on,opposite}}} shape ENGINE.parse receives", () => {
  const sweeps = {
    enabled: true,
    items: [{ id: "clarity", label: "Clarity", category: "genre", oppositeId: "obscurity", oppositeLabel: "Obscurity" }],
  };
  const { sandbox, doc, parseCalls } = makeSandbox({ sweeps });
  sandbox.UI.init();

  // The fake DOM's innerHTML setter does not parse HTML into real child
  // elements (documented limitation, fake-dom.mjs), so buildSweepBar()'s own
  // innerHTML-injected checkboxes are not walkable via querySelectorAll here.
  // Construct the equivalent real elements directly instead — exactly what a
  // real browser's HTML parser would have produced from that same markup —
  // so readSweepSelection()'s querySelectorAll("[...]") path, which real
  // browsers resolve correctly, has real nodes to find.
  const bar = doc.getElementById("sweepbar");
  const onCb = doc.createElement("input");
  onCb.setAttribute("type", "checkbox");
  onCb.className = "sweep-on";
  onCb.setAttribute("data-id", "clarity");
  onCb.checked = true;
  bar.appendChild(onCb);
  const oppCb = doc.createElement("input");
  oppCb.setAttribute("type", "checkbox");
  oppCb.className = "sweep-opp";
  oppCb.setAttribute("data-id", "clarity");
  oppCb.checked = true;
  bar.appendChild(oppCb);

  doc.getElementById("input").innerText = "The report was reviewed by the committee.";
  sandbox.UI.parseNow();

  assert.equal(parseCalls.length, 1);
  // Scalar-field assertions, not assert.deepEqual on the whole object: the
  // selection object is constructed inside the vm sandbox (a different
  // realm), and node:assert/strict's deepEqual compares prototype identity
  // across realms and fails even on matching structure — same reason this
  // file's other tests assert on primitive fields, not whole vm-returned objects.
  const sel = parseCalls[0].selection;
  assert.ok(sel && sel.sweeps, "expected a {sweeps:{...}} selection object");
  assert.equal(sel.sweeps.clarity.on, true);
  assert.equal(sel.sweeps.clarity.opposite, true);
  assert.equal(Object.keys(sel.sweeps).length, 1, "only the one declared sweep item should appear");
});
