// undo — tests for the header Undo button (undo.js) and the two calls edits.js
// makes for it (TEST-1: node:test + node:assert/strict, TEST-8: a small
// hand-built fake DOM, no jsdom). project.js itself self-invokes against the
// real `document`/`location` at import time, so — as test_project.mjs does —
// its source is grepped for the structural guarantees instead of imported.
//
// Run: node tests/test_undo.mjs

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.join(here, "..", "app", "project");
const moduleUrl = (name) => path.join(projectDir, name);

class FakeText {
  constructor(text) {
    this.nodeType = 3;
    this.textContent = text;
  }
}

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this._dataset = {};
    this.children = [];
    this._attrs = {};
    this._listeners = {};
    this.disabled = false;
  }
  get dataset() {
    return this._dataset;
  }
  set className(v) {
    this._attrs.class = v;
  }
  get className() {
    return this._attrs.class ?? "";
  }
  get textContent() {
    return this.children.map((c) => (c.nodeType === 3 ? c.textContent : c.textContent)).join("");
  }
  appendChild(child) {
    this.children.push(child);
    return child;
  }
  setAttribute(name, value) {
    this._attrs[name] = String(value);
    if (name === "disabled") this.disabled = true;
  }
  getAttribute(name) {
    return this._attrs[name] ?? null;
  }
  addEventListener(type, handler) {
    (this._listeners[type] ??= []).push(handler);
  }
  dispatch(type, event = {}) {
    return Promise.all((this._listeners[type] ?? []).map((h) => h(event)));
  }
}

globalThis.document = {
  createElement: (tag) => new FakeElement(tag),
  createTextNode: (text) => new FakeText(text),
};

const undo = await import(moduleUrl("undo.js"));
const edits = await import(moduleUrl("edits.js"));

const STATE = {
  available: true, project_id: "LU-03", row: "9", column: "status",
  value: "☑ Done", prev: "☐ Open", at: "2026-09-14T21:02:07", reason: null,
};

// ---------------------------------------------------------------------------
// Label
// ---------------------------------------------------------------------------

test("formatChanged reads day, month and 24h time straight from the logged string", () => {
  assert.equal(undo.formatChanged("2026-09-14T21:02:07"), "14 Sep, 21:02");
  assert.equal(undo.formatChanged("2026-01-05T08:09:00"), "5 Jan, 08:09");
  assert.equal(undo.formatChanged("garbage"), null);
  assert.equal(undo.formatChanged(undefined), null);
});

test("the label names the column, the row, the value it restores, and when it was changed", () => {
  assert.equal(undo.undoLabel(STATE), 'Undo: Status on row 9 → "☐ Open" — changed 14 Sep, 21:02');
});

test("a blank previous value is spelled out, and a missing time is simply omitted", () => {
  assert.equal(undo.undoLabel({ ...STATE, column: "due", prev: "", at: null }), "Undo: Due on row 9 → (blank)");
});

// ---------------------------------------------------------------------------
// Present / absent / disabled
// ---------------------------------------------------------------------------

test("no button when there is no state, or the last write was in another project", () => {
  assert.equal(undo.buildUndoButton(null, "LU-03", () => {}), null);
  assert.equal(undo.buildUndoButton({ ...STATE, project_id: "PP-01" }, "LU-03", () => {}), null);
});

test("an available undo gets an enabled button whose text and aria-label are the same label", () => {
  const button = undo.buildUndoButton(STATE, "LU-03", () => {});
  assert.equal(button.tagName, "button");
  assert.equal(button.disabled, false);
  assert.equal(button.textContent, undo.undoLabel(STATE));
  assert.equal(button.getAttribute("aria-label"), undo.undoLabel(STATE));
  assert.equal(button.getAttribute("type"), "button");
});

test("an unavailable undo in this project is disabled and says why, in text", () => {
  const state = { ...STATE, available: false, reason: "The last change was a note, and notes can't be undone." };
  const button = undo.buildUndoButton(state, "LU-03", () => {});
  assert.equal(button.disabled, true);
  assert.match(button.textContent, /notes can't be undone/);
  assert.match(button.getAttribute("aria-label"), /notes can't be undone/);
  assert.match(button.className, /project-undo--unavailable/);
});

// ---------------------------------------------------------------------------
// Pressing it
// ---------------------------------------------------------------------------

test("one press calls onUndo once, and the button is disabled while it runs", async () => {
  let calls = 0;
  let release;
  const gate = new Promise((r) => (release = r));
  const button = undo.buildUndoButton(STATE, "LU-03", async () => {
    calls += 1;
    await gate;
  });
  const pressed = button.dispatch("click");
  assert.equal(button.disabled, true);
  release();
  await pressed;
  assert.equal(calls, 1);
});

test("after a refusal the button is enabled again", async () => {
  const button = undo.buildUndoButton(STATE, "LU-03", async () => ({ ok: false }));
  await button.dispatch("click");
  assert.equal(button.disabled, false);
});

// ---------------------------------------------------------------------------
// edits.js — postUndo / fetchUndoState
// ---------------------------------------------------------------------------

function stubFetch(handler) {
  const seen = [];
  globalThis.fetch = async (url, init) => {
    seen.push({ url, init });
    return handler(url, init);
  };
  return seen;
}

const json = (status, body) => ({ ok: status < 400, status, json: async () => body });

test("postUndo POSTs only the project and mtime to /api/undo and returns the payload", async () => {
  const seen = stubFetch(() => json(200, { ok: true, row: "9", column: "status", value: "☐ Open", mtime: 5 }));
  const result = await edits.postUndo({ project_id: "LU-03", mtime: 4 });
  assert.equal(result.mtime, 5);
  assert.equal(seen[0].url, "/api/undo");
  assert.equal(seen[0].init.method, "POST");
  assert.deepEqual(JSON.parse(seen[0].init.body), { project_id: "LU-03", mtime: 4 });
});

test("postUndo turns each undo refusal into its own plain sentence", async () => {
  const warn = console.warn;
  console.warn = () => {};
  try {
    stubFetch(() => json(409, { error: "undo_conflict" }));
    await assert.rejects(edits.postUndo({ project_id: "LU-03", mtime: 4 }), /changed since — refresh; nothing was undone/);
    stubFetch(() => json(409, { error: "undo_unavailable" }));
    await assert.rejects(edits.postUndo({ project_id: "LU-03", mtime: 4 }), /nothing to undo/);
    stubFetch(() => json(409, { error: "stale_mtime" }));
    await assert.rejects(edits.postUndo({ project_id: "LU-03", mtime: 4 }), /changed since you opened it/);
  } finally {
    console.warn = warn;
  }
});

test("fetchUndoState returns the payload, and null (never a throw) when it cannot be read", async () => {
  const warn = console.warn;
  console.warn = () => {};
  try {
    stubFetch(() => json(200, STATE));
    assert.deepEqual(await edits.fetchUndoState(), STATE);
    stubFetch(() => json(500, { error: "internal" }));
    assert.equal(await edits.fetchUndoState(), null);
    globalThis.fetch = async () => {
      throw new TypeError("offline");
    };
    assert.equal(await edits.fetchUndoState(), null);
  } finally {
    console.warn = warn;
  }
});

// ---------------------------------------------------------------------------
// project.js — structural guarantees (it cannot be imported: see header)
// ---------------------------------------------------------------------------

const projectSource = readFileSync(moduleUrl("project.js"), "utf8");

test("submitUndo sends only the project id and mtime, and keeps the mtime the server returns", () => {
  const fn = projectSource.match(/async function submitUndo\(\) \{[\s\S]*?\n\}\n/)[0];
  assert.match(fn, /postUndo\(\{ project_id: state\.project\.id, mtime: state\.mtime \}\)/);
  assert.match(fn, /state\.mtime = result\.mtime/);
  assert.doesNotMatch(fn, /row:|value:/, "the request must never name a row or a value");
});

test("the undo state is re-read on every project load and after a note, and cleared between projects", () => {
  assert.match(projectSource, /renderProjectPage\(root, project\);\s*refreshUndo\(\);/);
  assert.match(projectSource, /clearEditError\(\);\s*refreshUndo\(\);/);
  assert.match(projectSource, /state\.undo = null;/);
  assert.match(projectSource, /project-undo-slot/);
});
