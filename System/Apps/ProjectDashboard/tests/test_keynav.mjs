// keynav — tests for board keyboard movement (app/board/keynav.js). TEST-1:
// node:test + node:assert/strict; TEST-8: a small hand-built fake, no jsdom.
// Visibility is an injected predicate because the real filter hides cards with
// CSS `display:none`, which a fake DOM cannot see.
//
// Run: node tests/test_keynav.mjs

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const boardDir = path.join(here, "..", "app", "board");
const { nextCard, attachKeynav } = await import(path.join(boardDir, "keynav.js"));

const LANES = ["mine", "delegate", "waiting", "incoming", "unshaped"];
const COLUMNS = ["OVERDUE", "THIS WEEK", "NEXT WEEK", "LATER", "NO DATE"];

// ---------------------------------------------------------------------------
// Pure movement. Layout (row, col), in document order:
//   row 0: A(0,0) B(0,0)  .  .  C(0,3)        A and B share one cell
//   row 1: (empty lane)
//   row 2: . E(2,1) . F(2,3)
//   row 3: (empty lane)
//   row 4: . . G(4,2)
// ---------------------------------------------------------------------------

const card = (name, row, col) => ({ el: { name }, row, col });
const A = card("A", 0, 0), B = card("B", 0, 0), C = card("C", 0, 3);
const E = card("E", 2, 1), F = card("F", 2, 3), G = card("G", 4, 2);
const CARDS = [A, B, C, E, F, G];
const all = () => true;
const nav = (from, move, isVisible = all) => nextCard(CARDS, from, move, { isVisible });

test("← and → walk one lane row in reading order, across cells and columns", () => {
  assert.equal(nav(A, "right"), B);
  assert.equal(nav(B, "right"), C);
  assert.equal(nav(C, "left"), B);
  assert.equal(nav(E, "right"), F);
});

test("← and → at the ends of a row do nothing — no wrap", () => {
  assert.equal(nav(A, "left"), null);
  assert.equal(nav(C, "right"), null);
  assert.equal(nav(G, "left"), null);
});

test("↑ and ↓ skip empty lane rows and prefer the same column", () => {
  assert.equal(nav(C, "down"), F); // same column 3, past the empty row 1
  assert.equal(nav(F, "up"), C);
  assert.equal(nav(E, "down"), G); // row 3 is empty; nearest column to 1 in row 4 is 2
});

test("↑ and ↓ take the nearest column when the same one is empty, the earlier one on a tie, the first card in a cell", () => {
  assert.equal(nav(A, "down"), E); // col 0 → nearest is col 1
  assert.equal(nav(G, "up"), E); // col 2: col 1 and col 3 are equally near — earlier wins
  assert.equal(nav(E, "up"), A); // cell (0,0) holds A then B — the first
});

test("↑ at the top and ↓ at the bottom do nothing", () => {
  assert.equal(nav(A, "up"), null);
  assert.equal(nav(G, "down"), null);
});

test("hidden cards are skipped, and a row whose cards are all hidden counts as empty", () => {
  assert.equal(nav(B, "right", (el) => el.name !== "C"), null);
  assert.equal(nav(A, "right", (el) => el.name !== "B"), C);
  const rowTwoHidden = (el) => el.name !== "E" && el.name !== "F";
  assert.equal(nav(A, "down", rowTwoHidden), G);
});

test("a card that is not among the cards yields null rather than throwing", () => {
  assert.equal(nextCard(CARDS, card("Z", 0, 0), "right", { isVisible: all }), null);
});

// ---------------------------------------------------------------------------
// The delegated listener, against a fake grid
// ---------------------------------------------------------------------------

function fakeBoard() {
  const focused = [];
  const clicks = [];
  const mk = (name, lane, column) => {
    const copyButton = { click: () => clicks.push(name) };
    const cell = { dataset: { lane, column } };
    return {
      name,
      classList: { contains: (c) => c === "board-card" },
      closest: (sel) => (sel === ".board-cell" ? cell : null),
      focus: () => focused.push(name),
      querySelector: (sel) => (sel === ".board-card-copy" ? copyButton : null),
    };
  };
  const cards = [mk("A", "mine", "OVERDUE"), mk("B", "mine", "LATER"), mk("C", "waiting", "LATER")];
  const listeners = {};
  const grid = {
    addEventListener: (type, fn) => (listeners[type] ??= []).push(fn),
    querySelectorAll: (sel) => (sel === ".board-card" ? cards : []),
  };
  attachKeynav(grid, { lanes: LANES, columns: COLUMNS, isVisible: () => true });
  const press = (target, key, mods = {}) => {
    const event = { key, target, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...mods };
    for (const fn of listeners.keydown ?? []) fn(event);
    return event;
  };
  return { cards, listeners, press, focused, clicks };
}

test("one keydown listener is installed on the grid, and nothing else", () => {
  const { listeners } = fakeBoard();
  assert.deepEqual(Object.keys(listeners), ["keydown"]);
  assert.equal(listeners.keydown.length, 1);
});

test("arrow keys move focus between cards and stop the page scrolling", () => {
  const { cards, press, focused } = fakeBoard();
  assert.equal(press(cards[0], "ArrowRight").defaultPrevented, true);
  assert.deepEqual(focused, ["B"]);
  press(cards[1], "ArrowDown"); // B is col LATER; the next occupied row down is waiting/C, same column
  assert.deepEqual(focused, ["B", "C"]);
});

test("an arrow at an edge does nothing and does not throw", () => {
  const { cards, press, focused } = fakeBoard();
  press(cards[0], "ArrowLeft");
  press(cards[0], "ArrowUp");
  assert.deepEqual(focused, []);
});

test("c copies through the card's own Copy button; Cmd+C, Ctrl+C and Alt+C are left alone", () => {
  const { cards, press, clicks } = fakeBoard();
  assert.equal(press(cards[0], "c").defaultPrevented, true);
  assert.deepEqual(clicks, ["A"]);
  for (const mods of [{ metaKey: true }, { ctrlKey: true }, { altKey: true }]) {
    const event = press(cards[1], "c", mods);
    assert.equal(event.defaultPrevented, false);
  }
  assert.deepEqual(clicks, ["A"]);
});

test("a keypress whose target is not a card — the copy button, an input — is ignored", () => {
  const { press, focused, clicks } = fakeBoard();
  const button = { classList: { contains: () => false } };
  press(button, "ArrowRight");
  press(button, "c");
  assert.deepEqual([focused, clicks], [[], []]);
});

test("Enter and Space are not handled here — card.js still owns them", () => {
  const { cards, press, focused, clicks } = fakeBoard();
  for (const key of ["Enter", " "]) assert.equal(press(cards[0], key).defaultPrevented, false);
  assert.deepEqual([focused, clicks], [[], []]);
});

// ---------------------------------------------------------------------------
// Contracts
// ---------------------------------------------------------------------------

test("render.js installs the listener; keynav.js imports no edit client and uses no innerHTML (FR-12, JS-6)", () => {
  assert.match(readFileSync(path.join(boardDir, "render.js"), "utf8"), /attachKeynav\(grid,/);
  const source = readFileSync(path.join(boardDir, "keynav.js"), "utf8");
  assert.ok(!/["']\/api\//.test(source), "keynav.js references an /api/ URL");
  assert.ok(!/from\s+["'].*(writes|edit)/i.test(source), "keynav.js imports an edit client");
  assert.ok(!/innerHTML/.test(source));
});

test("card.js still has tabindex=0 on every card and its own Enter/Space handler (Tab order unchanged)", () => {
  const source = readFileSync(path.join(boardDir, "card.js"), "utf8");
  assert.match(source, /tabindex: "0"/);
  assert.match(source, /event\.key !== "Enter" && event\.key !== " "/);
});
