// controls — smoke tests (TEST-1: node:test + node:assert/strict). Covers
// toolbar.js's pure state functions (no DOM needed — they only read/write a
// plain object's .dataset, so no FakeElement class is required the way
// test_board.mjs needs one for real DOM construction) and storage.js's
// guarded localStorage wrapper (a hand-built fake storage, TEST-8's spirit
// applied to Web Storage rather than the DOM). controls.js itself (the
// click-wiring entry point) stays manual-verification-only, the same scope
// board.js takes in test_board.mjs — its own source is grepped below for
// the AC-2 structural guarantee instead.
//
// Run: node tests/test_controls.mjs

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import * as toolbar from "../app/controls/toolbar.js";
import * as storage from "../app/controls/storage.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const controlsDir = path.join(here, "..", "app", "controls");

// ---------------------------------------------------------------------------
// toolbar.js — FR-1, FR-3, FR-4
// ---------------------------------------------------------------------------

test("FR-1: applyView sets body.dataset.view for one of the six known views", () => {
  const body = { dataset: {} };
  toolbar.applyView(body, "Church");
  assert.equal(body.dataset.view, "Church");
});

test("FR-1: applyView ignores an unrecognised view rather than setting a dead attribute", () => {
  const body = { dataset: { view: "All" } };
  toolbar.applyView(body, "Nonexistent");
  assert.equal(body.dataset.view, "All", "the previous value must be left untouched");
});

test("FR-3: applyDensity resolves anything but the literal string 'condensed' to 'expanded'", () => {
  const body = { dataset: {} };
  toolbar.applyDensity(body, "condensed");
  assert.equal(body.dataset.density, "condensed");
  toolbar.applyDensity(body, "garbage");
  assert.equal(body.dataset.density, "expanded");
});

test("FR-3: nextDensity toggles both directions", () => {
  assert.equal(toolbar.nextDensity("expanded"), "condensed");
  assert.equal(toolbar.nextDensity("condensed"), "expanded");
});

test("FR-4: applyPalette sets one of the three known palettes, rejects anything else", () => {
  const body = { dataset: {} };
  toolbar.applyPalette(body, "paper");
  assert.equal(body.dataset.palette, "paper");
  toolbar.applyPalette(body, "not-a-palette");
  assert.equal(body.dataset.palette, "paper", "an unknown palette must not overwrite the last valid one");
});

test("FR-4: nextPalette cycles default -> paper -> dark -> default", () => {
  assert.equal(toolbar.nextPalette("default"), "paper");
  assert.equal(toolbar.nextPalette("paper"), "dark");
  assert.equal(toolbar.nextPalette("dark"), "default");
});

test("FR-10: nextPalette treats a never-chosen palette (null/undefined) as 'default' for cycling", () => {
  assert.equal(toolbar.nextPalette(null), "paper");
  assert.equal(toolbar.nextPalette(undefined), "paper");
});

// applyPalette (toolbar.js) sets the attribute on the object it is handed —
// the test above only proves that against a fake object, so it cannot catch
// controls.js handing applyPalette the wrong element. The 2026-09-12 defect
// (Logs/issues.log) was exactly this: controls.js called
// applyPalette(document.body, ...), but every palette rule in tokens.css was
// keyed off `:root[data-palette=...]` (the <html> element), so the attribute
// landed on an element none of tokens.css's selectors ever matched. This
// test pins both ends of that contract by static inspection: controls.js
// must call applyPalette with document.body, and tokens.css must select
// data-palette off `body`, never `:root`.
test("FR-4/FR-10: applyPalette's caller and tokens.css's palette selectors target the same element (body, not :root)", () => {
  const controlsSource = readFileSync(path.join(controlsDir, "controls.js"), "utf8");

  // controls.js binds a local identifier to document.body once (e.g. `const
  // body = document.body;`), then passes that identifier to every applyX
  // call — find that identifier rather than assuming its name.
  const bodyBinding = controlsSource.match(/\b(?:const|let)\s+(\w+)\s*=\s*document\.body\s*;/);
  assert.ok(bodyBinding, "controls.js must bind a local identifier to document.body");
  const bodyName = bodyBinding[1];

  const applyPaletteCalls = controlsSource.match(/applyPalette\([^,]+,/g) ?? [];
  assert.ok(applyPaletteCalls.length > 0, "controls.js must call toolbar.applyPalette at least once");
  const applyPaletteArgPattern = new RegExp(`applyPalette\\(\\s*${bodyName}\\s*,`);
  for (const call of applyPaletteCalls) {
    assert.match(
      call,
      applyPaletteArgPattern,
      `${call.trim()} must pass ${bodyName} (document.body), not document.documentElement or any other element`
    );
  }

  const tokensPath = path.join(controlsDir, "..", "tokens.css");
  const tokensText = readFileSync(tokensPath, "utf8");
  const withoutComments = tokensText.replace(/\/\*[\s\S]*?\*\//g, "");

  // Catches both the direct-attribute form (`:root[data-palette="dark"]`)
  // and the FR-10 guard form (`:root:not([data-palette="default"])...`) —
  // any `:root` selector that ever mentions data-palette before its `{`.
  assert.ok(
    !/:root[^{]*data-palette/.test(withoutComments),
    "tokens.css must not select :root on data-palette — applyPalette writes the attribute to <body>, and :root is <html>"
  );

  const bodyPaletteSelectors = withoutComments.match(/body[^{]*\[data-palette="([a-z]+)"\]/g) ?? [];
  const namedPalettes = new Set(
    bodyPaletteSelectors.map((sel) => sel.match(/\[data-palette="([a-z]+)"\]/)[1])
  );
  for (const palette of toolbar.PALETTE_ORDER) {
    if (palette === toolbar.DEFAULT_PALETTE) continue; // "default" is the bare :root block — no override needed
    assert.ok(namedPalettes.has(palette), `tokens.css must have a body[data-palette="${palette}"] override block`);
  }
});

// ---------------------------------------------------------------------------
// storage.js — FR-7, AD-2
// ---------------------------------------------------------------------------

function fakeStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = String(value);
    },
    _data: data,
  };
}

function throwingStorage() {
  return {
    getItem: () => {
      throw new Error("blocked by privacy settings");
    },
    setItem: () => {
      throw new Error("blocked by privacy settings");
    },
  };
}

test("FR-7: loadPreferences returns null for every field on a first visit (nothing stored)", () => {
  const prefs = storage.loadPreferences(fakeStorage());
  assert.deepEqual(prefs, { view: null, density: null, palette: null });
});

test("FR-7: saveView/saveDensity/savePalette round-trip through loadPreferences", () => {
  const s = fakeStorage();
  storage.saveView(s, "Church");
  storage.saveDensity(s, "condensed");
  storage.savePalette(s, "dark");
  const prefs = storage.loadPreferences(s);
  assert.equal(prefs.view, "Church");
  assert.equal(prefs.density, "condensed");
  assert.equal(prefs.palette, "dark");
});

test("AD-2/JS-2: a storage that throws on every call degrades to defaults, never throws out of loadPreferences", () => {
  const s = throwingStorage();
  assert.doesNotThrow(() => storage.loadPreferences(s));
  assert.deepEqual(storage.loadPreferences(s), { view: null, density: null, palette: null });
});

test("AD-2/JS-2: a throwing storage never propagates out of a save* call", () => {
  const s = throwingStorage();
  assert.doesNotThrow(() => storage.saveView(s, "Church"));
});

test("JS-2: a null storage (localStorage access itself threw) is handled the same as a working-but-empty one", () => {
  assert.doesNotThrow(() => storage.loadPreferences(null));
  assert.deepEqual(storage.loadPreferences(null), { view: null, density: null, palette: null });
  assert.doesNotThrow(() => storage.saveView(null, "Church"));
});

// ---------------------------------------------------------------------------
// controls.js — FR-6/AC-2 structural guarantee (mirrors test_board.mjs's own
// AC-3 grep-based test for board.js): no toggle handler may re-fetch or
// re-render the board. The strongest proof available without executing the
// module (which self-invokes init() against a real document) is that it
// never imports the board's fetch/render functions at all — a handler can
// only call what it imports.
// ---------------------------------------------------------------------------

test("AC-2/FR-6: controls.js never imports fetchBoard or renderBoard — no toggle handler can reach either", () => {
  const source = readFileSync(path.join(controlsDir, "controls.js"), "utf8");
  const importLines = source.split("\n").filter((line) => line.trim().startsWith("import "));
  for (const line of importLines) {
    assert.ok(!line.includes("board-client"), `controls.js must not import the fetch client: ${line}`);
    assert.ok(!line.includes("render.js"), `controls.js must not import the render module: ${line}`);
  }
});

test("FR-8: refresh is the only action in controls.js that touches the network or reload", () => {
  const source = readFileSync(path.join(controlsDir, "controls.js"), "utf8");
  assert.match(source, /case "refresh":[\s\S]*?location\.reload\(\)/, "the refresh case must trigger a reload");
  const nonRefreshBody = source.replace(/case "refresh":[\s\S]*?return;\n\s*\}/, "");
  assert.ok(!/location\.reload|fetch\(/.test(nonRefreshBody), "no action other than refresh may touch the network or reload");
});

// ---------------------------------------------------------------------------
// controls.css — AC-8, FR-13, FR-12/AC-7
// ---------------------------------------------------------------------------

const CONTROLS_CSS_FILES = ["controls.css"];
const COLOUR_LITERAL = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\b(?:red|blue|green|black|white|orange|purple|yellow)\b(?!-)/;

test("AC-8: no colour literal in controls.css — every colour comes from a token", () => {
  for (const file of CONTROLS_CSS_FILES) {
    const text = readFileSync(path.join(controlsDir, file), "utf8");
    assert.ok(!COLOUR_LITERAL.test(text), `${file} contains a colour literal outside tokens.css`);
  }
});

test("FR-13: controls.css/controls.js reference nothing external (no CDN, no web font, no localhost exception needed here)", () => {
  const pattern = /https?:\/\/|\/\/fonts\./i;
  for (const file of ["controls.css", "controls.js", "toolbar.js", "storage.js"]) {
    const text = readFileSync(path.join(controlsDir, file), "utf8");
    assert.ok(!pattern.test(text), `${file} references something external`);
  }
});

test("AC-7: tokens.css zeroes all three motion durations under prefers-reduced-motion, with no !important anywhere", () => {
  const tokensPath = path.join(controlsDir, "..", "tokens.css");
  const text = readFileSync(tokensPath, "utf8");
  const withoutComments = text.replace(/\/\*[\s\S]*?\*\//g, "");
  assert.match(text, /prefers-reduced-motion:\s*reduce/);
  assert.ok(
    !/!important/.test(withoutComments),
    "CSS-5 forbids !important; reduced motion must work by zeroing the motion tokens instead"
  );
  const reducedBlock = text.match(/prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
  for (const token of ["--motion-fast", "--motion-medium", "--motion-slow"]) {
    assert.match(reducedBlock, new RegExp(`${token}\\s*:\\s*0s`), `${token} must be zeroed under reduced motion`);
  }
});
