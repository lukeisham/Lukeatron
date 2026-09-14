// board — smoke tests (TEST-1: node:test + node:assert/strict, TEST-8: a
// small hand-built fake DOM, no jsdom). Mirrors the house pattern in
// System/Apps/ProjectDashboard/_template/tests/test_unblock.mjs.
//
// Scope: render.js and card.js hold all the real DOM-building logic and are
// what's exercised here. board.js is the thin fetch-and-mount entry point
// (the same scope ProjectDashboard's own unblock.js takes) — it stays
// manual-verification-only; its own source is grepped below for AC-3/FR-12
// instead, which is the structural evidence the delegating brief asks for.
//
// Run: node tests/test_board.mjs

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const boardDir = path.join(here, "..", "app", "board");
const appDir = path.join(here, "..", "app");
const moduleUrl = (name) => path.join(boardDir, name);

// ---------------------------------------------------------------------------
// A small hand-built fake DOM (TEST-8) — only what render.js's and card.js's
// createElement/createElementNS-based exports actually use: creation,
// className/classList, dataset, textContent, appendChild/removeChild,
// setAttribute/getAttribute (including "class" and "title"), and a minimal
// addEventListener/dispatch pair so FR-11's click wiring is testable without
// simulating real DOM event bubbling. No innerHTML support anywhere (SR-8:
// nothing in the source under test uses it either — see the JS-6 test below).
// ---------------------------------------------------------------------------

class FakeText {
  constructor(text) {
    this.nodeType = 3;
    this.textContent = text;
  }
}

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.dataset = {};
    this.children = [];
    this._classes = new Set();
    this._attrs = {};
    this._listeners = {};
    this._title = "";
  }
  get className() {
    return [...this._classes].join(" ");
  }
  set className(value) {
    this._classes = new Set(String(value).split(/\s+/).filter(Boolean));
  }
  get classList() {
    const classes = this._classes;
    return {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      toggle: (c, on) => (on ? classes.add(c) : classes.delete(c)),
      contains: (c) => classes.has(c),
    };
  }
  get textContent() {
    if (this._textContent !== undefined) return this._textContent;
    return this.children.filter((c) => c.nodeType === 3).map((c) => c.textContent).join("");
  }
  set textContent(value) {
    this._textContent = value;
    this.children = [];
  }
  appendChild(child) {
    this._textContent = undefined;
    this.children.push(child);
    return child;
  }
  get firstChild() {
    return this.children[0] ?? null;
  }
  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) this.children.splice(idx, 1);
    return child;
  }
  setAttribute(name, value) {
    if (name === "class") {
      this.className = value;
      return;
    }
    this._attrs[name] = String(value);
    if (name === "title") this._title = String(value);
  }
  getAttribute(name) {
    return this._attrs[name] ?? null;
  }
  get title() {
    return this._title;
  }
  set title(value) {
    this._title = value;
    this._attrs.title = value;
  }
  removeAttribute(name) {
    delete this._attrs[name];
    if (name === "title") this._title = "";
  }
  addEventListener(type, handler) {
    (this._listeners[type] ??= []).push(handler);
  }
  dispatch(type, event = {}) {
    for (const handler of this._listeners[type] ?? []) handler(event);
  }
  querySelectorAll(selector) {
    const className = selector.replace(/^\./, "");
    const found = [];
    const walk = (node) => {
      for (const child of node.children ?? []) {
        if (child._classes?.has(className)) found.push(child);
        walk(child);
      }
    };
    walk(this);
    return found;
  }
}

globalThis.document = {
  createElement: (tag) => new FakeElement(tag),
  createElementNS: (_ns, tag) => new FakeElement(tag),
  createTextNode: (text) => new FakeText(text),
};

const render = await import(moduleUrl("render.js"));
const card = await import(moduleUrl("card.js"));

// ---------------------------------------------------------------------------
// Fixture builders — shaped exactly like server.py's GET /api/board.json
// (Guessable = {value, guessed}; ProjectView fields per the delegating
// brief's confirmed shape).
// ---------------------------------------------------------------------------

function guessable(value, guessed = false) {
  return { value, guessed };
}

function project(overrides = {}) {
  return {
    id: "PK-1",
    title: "Sample project",
    context: "Personal Productivity",
    lane: guessable("mine"),
    due_column: guessable("THIS WEEK"),
    due_date: null,
    due_text: null,
    open_count: 1,
    tasks: [],
    next_action: null,
    ...overrides,
  };
}

function board(overrides = {}) {
  return {
    projects: [],
    lane_counts: {},
    column_counts: {},
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// render.js
// ---------------------------------------------------------------------------

test("FR-1: lanes are fixed in demand order, columns in the fixed left-to-right order", () => {
  assert.deepEqual(
    render.LANE_ORDER.map((l) => l.value),
    ["mine", "delegate", "waiting", "incoming", "unshaped"]
  );
  assert.deepEqual(render.COLUMN_ORDER, ["OVERDUE", "THIS WEEK", "NEXT WEEK", "LATER", "NO DATE"]);

  const mount = new FakeElement("div");
  render.renderBoard(mount, board());
  const laneRows = mount.querySelectorAll(".board-lane-row");
  assert.deepEqual(
    laneRows.map((r) => r.dataset.lane),
    ["mine", "delegate", "waiting", "incoming", "unshaped"]
  );
});

test("AC-1: every project renders exactly once, in the lane and column the JSON assigned", () => {
  const p1 = project({ id: "A", lane: guessable("mine"), due_column: guessable("OVERDUE") });
  const p2 = project({ id: "B", lane: guessable("waiting"), due_column: guessable("LATER") });
  const b = board({ projects: [p1, p2], lane_counts: { mine: 1, waiting: 1 }, column_counts: { OVERDUE: 1, LATER: 1 } });

  const mount = new FakeElement("div");
  render.renderBoard(mount, b);

  const cells = mount.querySelectorAll(".board-cell");
  const mineOverdue = cells.find((c) => c.dataset.lane === "mine" && c.dataset.column === "OVERDUE");
  const waitingLater = cells.find((c) => c.dataset.lane === "waiting" && c.dataset.column === "LATER");
  assert.ok(mineOverdue.children.some((c) => c.dataset.projectId === "A"));
  assert.ok(waitingLater.children.some((c) => c.dataset.projectId === "B"));

  // exactly once each — no duplicate cards anywhere on the grid
  assert.equal(mount.querySelectorAll(".board-card").length, 2);
});

test("AC-2: header counts come from the JSON's own counts, never a count this module recomputes", () => {
  // Deliberately mismatched: one real card, but the JSON claims many more —
  // proving the header echoes the JSON rather than counting DOM nodes.
  const p1 = project({ id: "A", lane: guessable("mine"), due_column: guessable("OVERDUE") });
  const b = board({ projects: [p1], lane_counts: { mine: 99 }, column_counts: { OVERDUE: 42 } });

  const mount = new FakeElement("div");
  render.renderBoard(mount, b);

  const mineRail = mount.querySelectorAll(".board-lane-rail").find((r) => r.dataset.lane === "mine");
  const mineCount = mineRail.children.find((c) => c._classes.has("board-count"));
  assert.equal(mineCount.textContent, "99");

  const overdueHeader = mount.querySelectorAll(".board-column-header").find((h) => h.dataset.column === "OVERDUE");
  const overdueCount = overdueHeader.children.find((c) => c._classes.has("board-count"));
  assert.equal(overdueCount.textContent, "42");
});

test("AC-3: board.js fetches and renders exactly once, and listens for nothing but outline-print.spec.md FR-1's route switch", () => {
  const source = readFileSync(path.join(boardDir, "board.js"), "utf8");
  assert.equal((source.match(/fetchBoard\(/g) ?? []).length, 1, "fetchBoard() must be called exactly once");
  assert.equal((source.match(/renderBoard\(/g) ?? []).length, 1, "renderBoard() must be called exactly once");
  // outline-print.spec.md FR-1/AC-9 added board.js's one sanctioned listener:
  // it re-runs init() when the hash stops naming a project, never in
  // response to a controls toggle. Strip that one block before checking
  // that no OTHER listener exists that could re-render on a toggle — the
  // guarantee this test originally existed to prove.
  const withoutRouteListener = source.replace(/window\.addEventListener\(\s*["']hashchange["'][\s\S]*?\}\);/, "");
  assert.ok(!/addEventListener/.test(withoutRouteListener), "board.js must not listen for any event besides the FR-1 route switch — no toggle can re-run its render");
});

test("FR-8/AD-2: every lane×column cell renders even when the board is empty, keeping the grid's shape", () => {
  const mount = new FakeElement("div");
  render.renderBoard(mount, board());
  assert.equal(mount.querySelectorAll(".board-cell").length, 25);
});

test("FR-9: MINE and DELEGATE both empty shows the plain-English banner, and the grid still renders in full", () => {
  const b = board({ lane_counts: { waiting: 3 }, column_counts: { LATER: 3 } });
  const mount = new FakeElement("div");
  render.renderBoard(mount, b);
  const banners = mount.querySelectorAll(".board-nothing-needed");
  assert.equal(banners.length, 1);
  assert.match(banners[0].textContent, /nothing needs you/i);
  assert.equal(mount.querySelectorAll(".board-lane-row").length, 5);
});

test("FR-9: the banner is absent once either MINE or DELEGATE has anything in it", () => {
  const b = board({ lane_counts: { mine: 1 } });
  const mount = new FakeElement("div");
  render.renderBoard(mount, b);
  assert.equal(mount.querySelectorAll(".board-nothing-needed").length, 0);
});

test("FR-10/AC-5: a load failure renders a named error, never an empty grid (fetchBoard() rejecting)", async () => {
  const mount = new FakeElement("div");
  const failingFetchBoard = async () => {
    throw new Error("board request failed (500)");
  };
  try {
    await failingFetchBoard();
  } catch (err) {
    render.renderLoadError(mount, err.message);
  }
  const errors = mount.querySelectorAll(".board-error");
  assert.equal(errors.length, 1);
  const detail = mount.querySelectorAll(".board-error-detail")[0];
  assert.match(detail.textContent, /board request failed \(500\)/);
  assert.equal(mount.querySelectorAll(".board-cell").length, 0);
});

test("FR-10: a malformed board (missing required fields) renders a named error, not a silent empty board", () => {
  const mount = new FakeElement("div");
  render.renderBoard(mount, { projects: [] }); // lane_counts/column_counts missing
  assert.equal(mount.querySelectorAll(".board-error").length, 1);
  assert.equal(mount.querySelectorAll(".board-lane-row").length, 0);
});

test("render.js: an unrecognised lane/column is warned about and left off the grid, not silently mis-placed", () => {
  const originalWarn = console.warn;
  let warned = false;
  console.warn = () => {
    warned = true;
  };
  try {
    const p = project({ id: "BAD", lane: guessable("nowhere"), due_column: guessable("SOMEDAY") });
    const mount = new FakeElement("div");
    render.renderBoard(mount, board({ projects: [p] }));
    assert.equal(mount.querySelectorAll(".board-card").length, 0);
    assert.ok(warned);
  } finally {
    console.warn = originalWarn;
  }
});

// ---------------------------------------------------------------------------
// card.js
// ---------------------------------------------------------------------------

test("controls.spec.md FR-1/FR-2: each card carries data-context so the view filter can target it", () => {
  const p = project({ context: "Church" });
  const cardNode = card.buildCard(p);
  assert.equal(cardNode.dataset.context, "Church");
});

test("FR-11: clicking a card navigates to the project view; clicking copy does not", () => {
  const navigated = [];
  const copied = [];
  const p = project({ id: "P-1", title: "Sample" });
  const cardNode = card.buildCard(p, { navigate: (id) => navigated.push(id), copy: (text) => copied.push(text) });

  cardNode.dispatch("click", {});
  assert.deepEqual(navigated, ["P-1"]);

  const copyBtn = cardNode.querySelectorAll(".board-card-copy")[0];
  let stopped = false;
  copyBtn.dispatch("click", { stopPropagation: () => (stopped = true) });
  assert.equal(stopped, true, "the copy button must call event.stopPropagation()");
  assert.deepEqual(copied, ["Sample"]);
  assert.deepEqual(navigated, ["P-1"], "clicking copy must not also navigate");
});

test("FR-11: Enter/Space on a focused card also navigates (keyboard parity with click)", () => {
  const navigated = [];
  const p = project({ id: "P-2" });
  const cardNode = card.buildCard(p, { navigate: (id) => navigated.push(id), copy: () => {} });
  cardNode.dispatch("keydown", { key: "Enter" });
  cardNode.dispatch("keydown", { key: "x" }); // ignored
  assert.deepEqual(navigated, ["P-2"]);
});

test("AC-6/FR-14: a project title containing <script> renders as literal text, never as markup", () => {
  const evil = "<script>alert(1)</script>";
  const p = project({ title: evil });
  const cardNode = card.buildCard(p);
  const titleEl = cardNode.querySelectorAll(".board-card-title")[0];
  assert.equal(titleEl.textContent, evil);

  const scan = (node) => (node.tagName?.toLowerCase() === "script" ? true : (node.children ?? []).some(scan));
  assert.equal(scan(cardNode), false, "no <script> element may exist anywhere in the built card");
});

// ---------------------------------------------------------------------------
// Static checks — FR-12, FR-13/AC-7, JS-6, grepped rather than left to a
// manual pass before every change (mirrors test_unblock.mjs's own vocabulary checks).
// ---------------------------------------------------------------------------

const SOURCE_FILES = ["board.js", "render.js", "card.js"];
const STYLE_FILES = ["board.css", "card.css"];

test("FR-12: no import of an edit client anywhere in this module", () => {
  // Matches an actual usage (a quoted URL string, or an import/require of a
  // client module) — not the doc comments that explain, in plain prose, why
  // no such usage exists (those legitimately name "/api/edit" as text).
  for (const file of SOURCE_FILES) {
    const text = readFileSync(path.join(boardDir, file), "utf8");
    assert.ok(!/["']\/api\/edit["']/.test(text), `${file} references /api/edit as a live URL`);
    assert.ok(!/from\s+["'].*writes(\.js)?["']|from\s+["'].*edit-client/i.test(text), `${file} imports an edit client`);
  }
});

test("JS-6: no innerHTML anywhere in this module", () => {
  for (const file of SOURCE_FILES) {
    const text = readFileSync(path.join(boardDir, file), "utf8");
    assert.ok(!/innerHTML/.test(text), `${file} uses innerHTML`);
  }
});

test("AC-7/FR-13: no external file reference anywhere in this module's own files", () => {
  // D-13/AD-3: `localhost` is never "external" — controls.spec.md FR-9's
  // plain <a href="http://localhost:8787"> wiki link (added to app/index.html
  // by the controls module) is a navigational door to another local
  // Lukeatron service, not a loaded asset. What this rule actually forbids
  // is a CDN, a web font, or any linked resource the browser fetches from
  // somewhere that isn't this machine.
  const pattern = /https?:\/\/(?!localhost)|\/\/fonts\.|<link\s+[^>]*href=["']https?:\/\/(?!localhost)/i;
  for (const file of [...SOURCE_FILES, ...STYLE_FILES]) {
    const text = readFileSync(path.join(boardDir, file), "utf8");
    assert.ok(!pattern.test(text), `${file} references something external`);
  }
  const indexHtml = readFileSync(path.join(appDir, "index.html"), "utf8");
  assert.ok(!pattern.test(indexHtml), "app/index.html references something external");
});
