// opened-stack.js — smoke tests (TEST-1, TEST-2, TEST-8: fake DOM, not jsdom).
// Run: node app/monitor/tests/opened-stack.test.mjs

import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { installFakeDom, FakeNode } from "./fake-dom.mjs";

installFakeDom();

const here = path.dirname(fileURLToPath(import.meta.url));
const { renderOpenedStack } = await import(path.join(here, "..", "opened-stack.js"));

function field(value, guessed = false) {
  return { value, guessed };
}

function task(index, action, { kind = 3, due = null, effort = "⚡ minutes" } = {}) {
  return { index, action, kind: field(kind), effort: field(effort), due };
}

function project(overrides = {}) {
  return {
    id: "PP-01",
    title: "Bookkeeping",
    path: "Memory/Medium-Term/Projects/PP-01",
    is_mind_project: false,
    footings: [],
    tasks: [task("1", "Pay invoice")],
    ...overrides,
  };
}

test("opened-stack: imports cleanly and renders one slice per open task, with the Unblock door", () => {
  const container = new FakeNode("div");
  renderOpenedStack(container, project(), { onBack: () => {} });

  const body = container.children[0];
  assert.equal(body.className, "opened-stack");
  const [toolbar, heading] = body.children;
  assert.equal(heading.tagName, "h2"); // HTML-3: the page's one <h1> lives in monitor.js
  assert.equal(heading.textContent, "PP-01 — Bookkeeping");
  const unblockBtn = toolbar.children.find((b) => b.textContent === "take this to Unblock");
  assert.ok(unblockBtn, "the single door to Unblock must be present (FR-6c)");
});

test("opened-stack: a grouped stem's slice label carries a title with the full text (FR-6a/AC-6a)", () => {
  const container = new FakeNode("div");
  const p = project({
    tasks: [task("1", "J9 Bookkeeping — file receipt"), task("2", "J9 Bookkeeping — pay invoice"), task("3", "J9 Bookkeeping — reconcile")],
  });
  renderOpenedStack(container, p, { onBack: () => {} });

  const slices = container.children[0].children.find((c) => c.className === "slices");
  const group = slices.children[0];
  assert.equal(group.className, "slice-group");
  const rows = group.children[1].children;
  for (const row of rows) {
    const label = row.children[2].children[0]; // slice-text -> slice-label
    assert.equal(label.className, "slice-label");
    assert.ok(label.attrs.title && label.attrs.title.startsWith("J9 Bookkeeping"), "full text must be reachable on hover");
  }
});

test("opened-stack: no registry path means no second copy target (FR-7 is optional, not invented)", () => {
  const container = new FakeNode("div");
  renderOpenedStack(container, project({ path: null }), { onBack: () => {} });

  const toolbar = container.children[0].children[0];
  assert.ok(!toolbar.children.some((b) => b.textContent === "⧉ copy path"));
});
