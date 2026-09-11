// week-view.js — smoke tests (TEST-1, TEST-2, TEST-8: fake DOM, not jsdom).
// Run: node app/monitor/tests/week-view.test.mjs

import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { installFakeDom, FakeNode } from "./fake-dom.mjs";

installFakeDom();

const here = path.dirname(fileURLToPath(import.meta.url));
const { renderWeekView } = await import(path.join(here, "..", "week-view.js"));

function localTodayISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function isoPlusDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function board({ overdue = 0, todayItems = [] } = {}) {
  const days = Array.from({ length: 7 }, (_, i) => ({
    date: isoPlusDays(i),
    items: i === 0 ? todayItems : [],
  }));
  days[0].date = localTodayISO();
  return { week: { days, overdue: Array.from({ length: overdue }, (_, i) => ({ project_id: `PP-0${i}`, source: "due", kind: 3 })) } };
}

test("week-view: imports cleanly and renders the rail with the overdue cap and seven days", () => {
  const container = new FakeNode("div");
  renderWeekView(container, board({ overdue: 3 }), { span: "week", onOpenStack: () => {}, onSpanChange: () => {} });

  const root = container.children[0];
  assert.equal(root.className, "week-view");
  const rail = root.children[1];
  assert.equal(rail.className, "week-rail");
  const [capButton, ...columns] = rail.children;
  assert.equal(capButton.className, "week-overdue-cap");
  assert.equal(capButton.children[0].textContent, "3");
  assert.equal(columns.length, 7);
});

test("week-view: the empty week is drawn plainly, not as an error (FR-16)", () => {
  const container = new FakeNode("div");
  renderWeekView(container, board(), { span: "week", onOpenStack: () => {}, onSpanChange: () => {} });

  const strip = container.children[0].children[2];
  assert.match(strip.children[0].textContent, /Nothing on this day/);
});

test("week-view: hovering a day with items swaps the reading strip to that day (FR-16b)", () => {
  const container = new FakeNode("div");
  const items = [{ source: "due", kind: 3, project_id: "PP-01" }];
  renderWeekView(container, board({ todayItems: items }), { span: "week", onOpenStack: () => {}, onSpanChange: () => {} });

  const rail = container.children[0].children[1];
  const todayColumn = rail.children[1]; // capButton is [0]; today is the first day column
  todayColumn.dispatch("click");

  const strip = container.children[0].children[2];
  assert.equal(strip.children[0].className, "week-strip");
  const row = strip.children[0].children[1].children[0]; // ul -> first li
  assert.equal(row.children[0].textContent, "due");
});
