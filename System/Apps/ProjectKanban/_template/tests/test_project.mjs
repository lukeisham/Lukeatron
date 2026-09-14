// project — smoke tests (TEST-1: node:test + node:assert/strict, TEST-8: a
// small hand-built fake DOM, no jsdom). Mirrors test_board.mjs's own fake
// DOM, extended with what this module's modules use that board's never did:
// value/checked/disabled properties, getElementById, and an awaitable
// dispatch() so an async click handler can be awaited by a test.
//
// Scope: grouping.js/copy.js/edits.js are pure and get the most direct
// coverage. sections.js/actions.js/task-row.js/note-box.js/print.js build
// DOM from a fake and are exercised the same way
// render.js/card.js are in test_board.mjs. project.js itself self-invokes
// against the real `document`/`window`/`location` at import time (the same
// shape board.js/controls.js take) — it stays manual-verification-only;
// its source is grepped below for the structural guarantees instead.
//
// Run: node tests/test_project.mjs

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.join(here, "..", "app", "project");
const moduleUrl = (name) => path.join(projectDir, name);

// ---------------------------------------------------------------------------
// Fake DOM (TEST-8) — FakeElement/FakeText mirror test_board.mjs's own,
// plus value/checked/disabled/hidden and an awaitable dispatch() this
// module's async click/change handlers need.
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
    this.value = "";
    this.checked = false;
    this.disabled = false;
    this.hidden = false;
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
    if (name === "value") this.value = String(value);
    if (name === "checked") this.checked = true;
    if (name === "disabled") this.disabled = true;
    if (name === "hidden") this.hidden = true;
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
  addEventListener(type, handler) {
    (this._listeners[type] ??= []).push(handler);
  }
  removeEventListener(type, handler) {
    this._listeners[type] = (this._listeners[type] ?? []).filter((h) => h !== handler);
  }
  /** Awaitable, unlike test_board.mjs's version — this module's handlers
   * are async (they await a network round-trip), and tests need to observe
   * the DOM only after that settles. */
  dispatch(type, event = {}) {
    const results = (this._listeners[type] ?? []).map((handler) => handler(event));
    return Promise.all(results);
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

// Node's own global `navigator` is a non-configurable-by-default getter
// (built-in fetch/navigator globals) — a plain `globalThis.navigator = ...`
// throws. defineProperty is what lets each test swap in its own fake.
function setNavigator(clipboard) {
  Object.defineProperty(globalThis, "navigator", { value: { clipboard }, configurable: true, writable: true });
}

// FakeElement.textContent (mirroring test_board.mjs's own) is shallow — one
// level of direct text-node children, the same shape real DOM needs no help
// with. print.js nests text several levels deep (h1 > text, ul > li > ul >
// li > text), so a few tests need every descendant's text, not just the top.
function deepText(node) {
  if (node.nodeType === 3) return node.textContent;
  return (node.children ?? []).map(deepText).join(" ");
}

function findById(node, id) {
  if (node._attrs?.id === id) return node;
  for (const child of node.children ?? []) {
    const found = findById(child, id);
    if (found) return found;
  }
  return null;
}

function installFakeDom() {
  const body = new FakeElement("body");
  globalThis.document = {
    createElement: (tag) => new FakeElement(tag),
    createElementNS: (_ns, tag) => new FakeElement(tag),
    createTextNode: (text) => new FakeText(text),
    body,
    getElementById: (id) => findById(body, id),
  };
}

installFakeDom();

const grouping = await import(moduleUrl("grouping.js"));
const copy = await import(moduleUrl("copy.js"));
const edits = await import(moduleUrl("edits.js"));
const sections = await import(moduleUrl("sections.js"));
const actions = await import(moduleUrl("actions.js"));
const taskRow = await import(moduleUrl("task-row.js"));
const noteBox = await import(moduleUrl("note-box.js"));
const print = await import(moduleUrl("print.js"));

// ---------------------------------------------------------------------------
// Fixture builders — shaped per server.py's confirmed TaskView/ProjectView.
// ---------------------------------------------------------------------------

function guessable(value, guessed = false) {
  return { value, guessed };
}

function task(overrides = {}) {
  return {
    index: "1",
    action: "Do the thing",
    owner: "Luke",
    kind: "mine",
    status: "☐ Open",
    state: "🟢 on track",
    lane: guessable("mine"),
    due_column: guessable("THIS WEEK"),
    due_date: null,
    due_text: null,
    link_key: null,
    ...overrides,
  };
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
    next_action: null,
    mtime: 111,
    purpose: null,
    definition_of_done: [],
    decision_log: [],
    events: [],
    documents: [],
    people: [],
    tasks: [],
    done_tasks: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// grouping.js — FR-3/AD-1
// ---------------------------------------------------------------------------

test("AC-1: 3+ siblings sharing a stem lift to one group; the stem is the shared words", () => {
  const tasks = ["A", "B", "C"].map((suffix, i) => task({ index: String(i), action: `Email Keith about ${suffix}` }));
  const groups = grouping.groupByStem(tasks);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].stem, "Email Keith about");
  assert.equal(groups[0].tasks.length, 3);
});

test("AC-1: CH-06-style — eleven actions sharing a stem become one heading and eleven differences", () => {
  const endings = ["Sara", "the venue", "catering", "music", "signage", "parking", "cleanup", "photos", "RSVPs", "seating", "the budget"];
  const tasks = endings.map((ending, i) => task({ index: String(i), action: `Email Keith about ${ending}` }));
  const groups = grouping.groupByStem(tasks);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].tasks.length, 11);
  const diffs = groups[0].tasks.map((t) => grouping.stemDifference(groups[0], t));
  assert.deepEqual(diffs.sort(), [...endings].sort());
});

test("FR-3: fewer than three sharing a stem never group — two is not enough", () => {
  const tasks = [task({ index: "0", action: "Email Keith about the venue" }), task({ index: "1", action: "Email Keith about the budget" })];
  const groups = grouping.groupByStem(tasks);
  assert.ok(groups.every((g) => g.stem === null), "no group should form from only two sharing a stem");
});

test("Adversarial (risk table): a genuinely different action must not be swept into a group it only superficially resembles", () => {
  // Only "Email"/"Email Keith" is common to all three — MIN_STEM_WORDS=2
  // keeps the one-word match from forming a false group, and there are
  // never three sharing the true two-word-or-longer stem either.
  const tasks = [
    task({ index: "0", action: "Email Keith about the venue" }),
    task({ index: "1", action: "Email Keith about the budget" }),
    task({ index: "2", action: "Email Sara about the invoice" }),
  ];
  const groups = grouping.groupByStem(tasks);
  assert.ok(groups.every((g) => g.stem === null), "no group should form — the third task is genuinely different");
  assert.equal(groups.length, 3);
});

test("AC-2/FR-6: stemDifference is display-only — the full action (stem included) is always available on the task itself", () => {
  const tasks = ["A", "B", "C"].map((s, i) => task({ index: String(i), action: `Call Sara about ${s}` }));
  const groups = grouping.groupByStem(tasks);
  const [group] = groups;
  const chipTask = group.tasks[0];
  assert.equal(grouping.stemDifference(group, chipTask), "A");
  assert.equal(chipTask.action, "Call Sara about A", "the chip's own task keeps its full original action text");
});

test("grouping.js: a missing/non-string action is warned about and treated as empty, never thrown", () => {
  const originalWarn = console.warn;
  let warned = false;
  console.warn = () => (warned = true);
  try {
    const tasks = [task({ index: "0", action: undefined })];
    assert.doesNotThrow(() => grouping.groupByStem(tasks));
    assert.ok(warned);
  } finally {
    console.warn = originalWarn;
  }
});

// ---------------------------------------------------------------------------
// copy.js — FR-6/FR-7/AC-2/AC-10
// ---------------------------------------------------------------------------

test("FR-6: taskCopyText is the raw action, never a grouped/truncated form", () => {
  assert.equal(copy.taskCopyText(task({ action: "Email Keith about the venue" })), "Email Keith about the venue");
});

test("AC-10: documentCopyText is always the full path, even though a row may show only a filename", () => {
  const doc = { file: "Memory/Medium-Term/Projects/PP-01/documents/tax_2026.pdf", description: "Tax file" };
  assert.equal(copy.documentCopyText(doc), doc.file);
});

test("FR-7: sectionCopyText builds dot points from each item's own full-text function", () => {
  const docs = [{ file: "a/b/one.pdf" }, { file: "a/b/two.pdf" }];
  const text = copy.sectionCopyText(docs, copy.documentCopyText);
  assert.equal(text, "• a/b/one.pdf\n• a/b/two.pdf");
});

test("buildCopyButton copies the given text and shows a brief confirmation", async () => {
  const written = [];
  setNavigator({ writeText: async (text) => written.push(text) });
  const button = copy.buildCopyButton("Copy thing", () => "the full text");
  await button.dispatch("click", {});
  assert.deepEqual(written, ["the full text"]);
  assert.equal(button.textContent, "Copied");
});

test("buildCopyButton shows a failure state when the clipboard API refuses, without throwing", async () => {
  const originalWarn = console.warn;
  console.warn = () => {};
  setNavigator({
    writeText: async () => {
      throw new Error("denied");
    },
  });
  const button = copy.buildCopyButton("Copy thing", () => "text");
  try {
    await assert.doesNotReject(button.dispatch("click", {}));
    assert.equal(button.textContent, "Copy failed");
  } finally {
    console.warn = originalWarn;
  }
});

// ---------------------------------------------------------------------------
// edits.js — FR-12/AC-8, SR-9/D-14
// ---------------------------------------------------------------------------

test("postEdit resolves the server's success payload on a 2xx response", async () => {
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ ok: true, mtime: 222 }) });
  const result = await edits.postEdit({ project_id: "PK-1", mtime: 111, field: "owner", row: "1", value: "Sara" });
  assert.deepEqual(result, { ok: true, mtime: 222 });
});

test("AC-8: a stale_mtime refusal produces a plain sentence Luke can act on, never the raw code", async () => {
  globalThis.fetch = async () => ({ ok: false, status: 409, json: async () => ({ error: "stale_mtime" }) });
  await assert.rejects(edits.postEdit({ project_id: "PK-1", mtime: 111, field: "owner", row: "1", value: "Sara" }), (err) => {
    assert.match(err.message, /changed since you opened it/i);
    assert.ok(!/stale_mtime/.test(err.message), "the raw error code must never reach the sentence");
    return true;
  });
});

test("FR-5/FR-12: linked_row gets a plain-English explanation naming no code", async () => {
  globalThis.fetch = async () => ({ ok: false, status: 409, json: async () => ({ error: "linked_row" }) });
  await assert.rejects(edits.postEdit({ project_id: "PK-1", mtime: 111, field: "status", row: "1", value: "☑ Done" }), (err) => {
    assert.match(err.message, /shared with another project/i);
    return true;
  });
});

test("FR-12: an unrecognised/missing code falls back to the generic sentence rather than throwing on the translation itself", async () => {
  globalThis.fetch = async () => ({ ok: false, status: 500, json: async () => ({}) });
  await assert.rejects(edits.postEdit({ project_id: "PK-1", mtime: 111, field: "note", value: "x" }), /Something went wrong/);
});

test("JS-2: a network failure (fetch itself rejects) still resolves to a sentence, never an uncaught rejection", async () => {
  const originalWarn = console.warn;
  console.warn = () => {};
  globalThis.fetch = async () => {
    throw new Error("offline");
  };
  try {
    await assert.rejects(edits.postEdit({ project_id: "PK-1", mtime: 111, field: "owner", row: "1", value: "x" }), /Something went wrong/);
  } finally {
    console.warn = originalWarn;
  }
});

// ---------------------------------------------------------------------------
// sections.js — FR-2, FR-7, AC-10, FR-13
// ---------------------------------------------------------------------------

test("AC-10: the Documents row shows a basename with the full path on hover, but the row's own copy is the full path", () => {
  const doc = { file: "Memory/Medium-Term/Projects/PP-01/documents/tax_2026.pdf", description: null };
  const p = project({ documents: [doc] });
  const section = sections.buildDocumentsSection(p);
  const textEl = section.querySelectorAll("project-row-text")[0];
  assert.equal(textEl.textContent, "tax_2026.pdf");
  assert.equal(textEl.getAttribute("title"), doc.file);
});

test("AC-10: copying the whole Documents section yields full paths, not the filenames the rows show", async () => {
  const written = [];
  setNavigator({ writeText: async (text) => written.push(text) });
  const docs = [{ file: "a/b/one.pdf" }, { file: "a/b/two.pdf" }];
  const p = project({ documents: docs });
  const section = sections.buildDocumentsSection(p);
  const headingCopyBtn = section.querySelectorAll("project-copy-btn")[0];
  await headingCopyBtn.dispatch("click", {});
  assert.equal(written[0], "• a/b/one.pdf\n• a/b/two.pdf");
  assert.ok(!written[0].includes("one.pdf\n") || written[0].includes("a/b/one.pdf"), "must be full paths, not basenames");
});

test("FR-2: an empty section (no purpose written) renders nothing rather than an empty heading", () => {
  assert.equal(sections.buildPurposeSection(project({ purpose: null })), null);
  assert.equal(sections.buildDocumentsSection(project({ documents: [] })), null);
});

test("a stores.py '— | — | —' placeholder row (at least 8 live registries write this instead of an empty table) renders as no section, not a hollow row with a dead copy button", () => {
  const placeholderDoc = { file: null, description: null, status: null, on_close: null };
  const placeholderPerson = { person: null, id: null, role: null, link: null };
  const placeholderEvent = { date: null, event: null, type: null, link: null };
  assert.equal(sections.buildDocumentsSection(project({ documents: [placeholderDoc] })), null);
  assert.equal(sections.buildPeopleSection(project({ people: [placeholderPerson] })), null);
  assert.equal(sections.buildEventsSection(project({ events: [placeholderEvent] })), null);
});

test("a placeholder row is filtered even when it sits alongside a real one — the real row still renders", () => {
  const placeholderDoc = { file: null, description: null, status: null, on_close: null };
  const realDoc = { file: "documents/plan.md", description: "the plan", status: "Draft", on_close: null };
  const section = sections.buildDocumentsSection(project({ documents: [placeholderDoc, realDoc] }));
  const rows = section.querySelectorAll("project-row");
  assert.equal(rows.length, 1);
});

test("FR-13/JS-6: a document description containing <script> renders as literal text, never as markup", () => {
  const evil = "<script>alert(1)</script>";
  const p = project({ documents: [{ file: "x.pdf", description: evil }] });
  const section = sections.buildDocumentsSection(p);
  const detail = section.querySelectorAll("project-row-detail")[0];
  assert.equal(detail.textContent, evil);
  const scan = (node) => (node.tagName?.toLowerCase() === "script" ? true : (node.children ?? []).some(scan));
  assert.equal(scan(section), false);
});

// ---------------------------------------------------------------------------
// actions.js / task-row.js — FR-3, FR-4, FR-5/AC-4
// ---------------------------------------------------------------------------

test("AC-1: buildNextActionsSection renders one stem group for 3+ shared-stem tasks, no loose duplicates", () => {
  const tasks = ["A", "B", "C"].map((s, i) => task({ index: String(i), action: `Email Keith about ${s}` }));
  const p = project({ tasks });
  const section = actions.buildNextActionsSection(p, async () => ({ ok: true }));
  assert.equal(section.querySelectorAll("project-stem-group").length, 1);
  assert.equal(section.querySelectorAll("project-task-row").length, 3);
});

test("AC-2: copying one chip from a stem group carries the full action text, stem included", async () => {
  const written = [];
  setNavigator({ writeText: async (text) => written.push(text) });
  const tasks = ["A", "B", "C"].map((s, i) => task({ index: String(i), action: `Email Keith about ${s}` }));
  const p = project({ tasks });
  const section = actions.buildNextActionsSection(p, async () => ({ ok: true }));
  // [0] is the section heading's own "Copy Next Actions" — the chip's copy
  // button is the one inside its own task row, not the section's.
  const chipRow = section.querySelectorAll("project-task-row")[0];
  const chipCopyBtn = chipRow.querySelectorAll("project-copy-btn")[0];
  await chipCopyBtn.dispatch("click", {});
  assert.equal(written[0], "Email Keith about A");
});

test("FR-2: no open actions shows a plain empty state rather than an empty list", () => {
  const section = actions.buildNextActionsSection(project({ tasks: [] }), async () => ({ ok: true }));
  assert.equal(section.querySelectorAll("project-empty").length, 1);
});

test("wishlist #4b: no toggle renders when a project has no done tasks", () => {
  const p = project({ tasks: [task()], done_tasks: [] });
  const section = actions.buildNextActionsSection(p, async () => ({ ok: true }), false, () => {});
  const doneToggle = section.querySelectorAll("project-copy-btn").find((b) => /done/i.test(deepText(b)));
  assert.equal(doneToggle, undefined, "no done-toggle button when there are no done tasks to reveal");
  assert.equal(section.querySelectorAll("project-done-actions").length, 0);
});

test("wishlist #4b: showDone=false hides the done list even when done tasks exist", () => {
  const p = project({ tasks: [task()], done_tasks: [task({ index: "2", action: "Finished thing" })] });
  const section = actions.buildNextActionsSection(p, async () => ({ ok: true }), false, () => {});
  assert.equal(section.querySelectorAll("project-done-actions").length, 0);
  const toggle = section.querySelectorAll("project-copy-btn").find((b) => /show done/i.test(deepText(b)));
  assert.ok(toggle, "a 'Show done actions' toggle is present");
});

test("wishlist #4b: showDone=true reveals exactly the done tasks, read-only", () => {
  const doneTasks = [task({ index: "2", action: "Finished thing", owner: "Keith" })];
  const p = project({ tasks: [task()], done_tasks: doneTasks });
  const section = actions.buildNextActionsSection(p, async () => ({ ok: true }), true, () => {});
  const doneList = section.querySelectorAll("project-done-actions")[0];
  assert.ok(doneList, "the done list renders when showDone is true");
  const doneRows = doneList.querySelectorAll("project-task-row--done");
  assert.equal(doneRows.length, 1);
  assert.match(deepText(doneRows[0]), /Finished thing/);
  // read-only: none of the four edit controls, matching a linked row's own convention
  assert.equal(doneList.querySelectorAll("project-task-tick").length, 0);
  assert.equal(doneList.querySelectorAll("project-task-due").length, 0);
  assert.equal(doneList.querySelectorAll("project-task-owner").length, 0);
  assert.equal(doneList.querySelectorAll("project-task-lane").length, 0);
});

test("wishlist #4b: clicking the toggle calls onToggleDone rather than mutating state itself", async () => {
  let toggled = false;
  const p = project({ tasks: [task()], done_tasks: [task({ index: "2" })] });
  const section = actions.buildNextActionsSection(p, async () => ({ ok: true }), false, () => {
    toggled = true;
  });
  const toggle = section.querySelectorAll("project-copy-btn").find((b) => /show done/i.test(deepText(b)));
  await toggle.dispatch("click", {});
  assert.ok(toggled, "the section defers state ownership to project.js's callback, per D-2");
});

test("wishlist #4b: buildDoneTaskRow carries the task's own full action text on copy, never the display label", async () => {
  const written = [];
  setNavigator({ writeText: async (text) => written.push(text) });
  const t = task({ action: "Full completed action text" });
  const row = taskRow.buildDoneTaskRow(t);
  const copyBtn = row.querySelectorAll("project-copy-btn")[0];
  await copyBtn.dispatch("click", {});
  assert.equal(written[0], "Full completed action text");
});

test("FR-5/AC-4: a linked task offers none of the four edit controls and explains itself in plain words", () => {
  const t = task({ link_key: "bas-2026-q1" });
  const row = taskRow.buildTaskRow(t, t.action, async () => ({ ok: true }));
  assert.equal(row.querySelectorAll("project-task-tick").length, 0);
  assert.equal(row.querySelectorAll("project-task-due").length, 0);
  assert.equal(row.querySelectorAll("project-task-owner").length, 0);
  assert.equal(row.querySelectorAll("project-task-lane").length, 0);
  const note = row.querySelectorAll("project-linked-note")[0];
  assert.match(note.textContent, /shared with another project/i);
  assert.ok(!/link_key/i.test(note.textContent), "no spec language on screen");
});

test("FR-4/AC-3: ticking a task submits field=\"status\" with a done value, naming the task's own row", async () => {
  const calls = [];
  const submitEdit = async (field, t, value) => {
    calls.push({ field, row: t.index, value });
    return { ok: true };
  };
  const t = task({ index: "7" });
  const row = taskRow.buildTaskRow(t, t.action, submitEdit);
  const checkbox = row.querySelectorAll("project-task-tick")[0];
  await checkbox.dispatch("change", {});
  assert.deepEqual(calls, [{ field: "status", row: "7", value: "☑ Done" }]);
});

test("AC-3: the owner field submits field=\"owner\" with the typed value and carries spellcheck", async () => {
  const calls = [];
  const submitEdit = async (field, t, value) => {
    calls.push({ field, value });
    return { ok: true };
  };
  const t = task();
  const row = taskRow.buildTaskRow(t, t.action, submitEdit);
  const ownerInput = row.querySelectorAll("project-task-owner")[0];
  assert.equal(ownerInput.getAttribute("spellcheck"), "true", "FR-9");
  ownerInput.value = "Keith";
  await ownerInput.dispatch("change", {});
  assert.deepEqual(calls, [{ field: "owner", value: "Keith" }]);
});

test("AC-3: the lane field submits field=\"kind\" with the raw Kind-column value", async () => {
  const calls = [];
  const submitEdit = async (field, t, value) => {
    calls.push({ field, value });
    return { ok: true };
  };
  const t = task({ kind: "mine" });
  const row = taskRow.buildTaskRow(t, t.action, submitEdit);
  const laneSelect = row.querySelectorAll("project-task-lane")[0];
  laneSelect.value = "waiting";
  await laneSelect.dispatch("change", {});
  assert.deepEqual(calls, [{ field: "kind", value: "waiting" }]);
});

test("a refused edit reverts the control's value rather than leaving the screen showing an unsaved change", async () => {
  const submitEdit = async () => ({ ok: false, message: "refused" });
  const t = task({ owner: "Luke" });
  const row = taskRow.buildTaskRow(t, t.action, submitEdit);
  const ownerInput = row.querySelectorAll("project-task-owner")[0];
  ownerInput.value = "Someone Else";
  await ownerInput.dispatch("change", {});
  assert.equal(ownerInput.value, "Luke", "the input must revert to the pre-edit value on refusal");
  assert.equal(ownerInput.disabled, false);
});

// ---------------------------------------------------------------------------
// note-box.js — FR-8/D-9
// ---------------------------------------------------------------------------

test("D-9: the note box defaults to Scraps & ideas, and Agent guidance's consequence is stated before it can be chosen", async () => {
  const calls = [];
  const submitNote = async (section, text) => {
    calls.push({ section, text });
    return { ok: true };
  };
  const box = noteBox.buildNoteBox(submitNote);
  const hint = box.querySelectorAll("project-note-guidance-hint")[0];
  assert.match(hint.textContent, /standing instruction/i, "the hint is present regardless of which section is selected");

  const textarea = box.querySelectorAll("project-note-text")[0];
  assert.equal(textarea.getAttribute("spellcheck"), "true", "FR-9");
  textarea.value = "a scrap of an idea";
  const submitBtn = box.querySelectorAll("project-note-submit")[0];
  await submitBtn.dispatch("click", {});
  assert.deepEqual(calls, [{ section: "scraps", text: "a scrap of an idea" }]);
});

test("AC-5: an empty note is refused client-side without ever calling submitNote", async () => {
  const calls = [];
  const box = noteBox.buildNoteBox(async (section, text) => {
    calls.push({ section, text });
    return { ok: true };
  });
  const submitBtn = box.querySelectorAll("project-note-submit")[0];
  await submitBtn.dispatch("click", {});
  assert.equal(calls.length, 0);
  const status = box.querySelectorAll("project-note-status")[0];
  assert.match(status.textContent, /write something/i);
});

// ---------------------------------------------------------------------------
// print.js — FR-10
// ---------------------------------------------------------------------------

test("FR-10: printProject calls window.print() and touches nothing else", () => {
  let printCalls = 0;
  globalThis.window = { print: () => printCalls++ };
  print.printProject();
  assert.equal(printCalls, 1);
});

// ---------------------------------------------------------------------------
// Static checks — FR-1/AC-9 (board.js's other half), FR-12, JS-6, FR-13/FR-14
// mirroring test_board.mjs's/test_controls.mjs's own grepped vocabulary
// checks for the files that self-invoke and so stay manual-verification-only.
// ---------------------------------------------------------------------------

const ALL_JS_FILES = ["project.js", "edits.js", "grouping.js", "copy.js", "sections.js", "actions.js", "task-row.js", "note-box.js", "print.js"];
const ALL_CSS_FILES = ["project.css", "task-row.css", "note-box.css", "print.css"];

test("FR-1/AC-9: project.js listens for hashchange and renders into #project-root, matching board.js's own half of the route split", () => {
  const source = readFileSync(path.join(projectDir, "project.js"), "utf8");
  assert.match(source, /addEventListener\(\s*["']hashchange["']/);
  assert.match(source, /project-root/);
  assert.match(source, /isProjectRoute/);
});

test("JS-6: no innerHTML anywhere in this module", () => {
  for (const file of ALL_JS_FILES) {
    const text = readFileSync(path.join(projectDir, file), "utf8");
    assert.ok(!/innerHTML/.test(text), `${file} uses innerHTML`);
  }
});

test("FR-12/D-14/SR-9: edits.js is the only file that composes an ERROR_SENTENCES-style translation; no other file re-derives one", () => {
  for (const file of ALL_JS_FILES) {
    if (file === "edits.js") continue;
    const text = readFileSync(path.join(projectDir, file), "utf8");
    assert.ok(!/ERROR_SENTENCES/.test(text), `${file} must not duplicate edits.js's error-sentence table`);
  }
});

test("FR-14/AC-7: no external file reference anywhere in this module's own files", () => {
  const pattern = /https?:\/\/(?!localhost)|\/\/fonts\./i;
  for (const file of [...ALL_JS_FILES, ...ALL_CSS_FILES]) {
    const text = readFileSync(path.join(projectDir, file), "utf8");
    assert.ok(!pattern.test(text), `${file} references something external`);
  }
});

test("CSS-2/AC-8: no colour or raw pixel literal in this module's CSS — every value comes from a token", () => {
  const COLOUR_LITERAL = /#[0-9a-fA-F]{3,8}\b|\brgba?\(/;
  const RAW_PX = /:\s*-?\d+(\.\d+)?px/; // a literal px value not wrapped in var()
  for (const file of ALL_CSS_FILES) {
    const text = readFileSync(path.join(projectDir, file), "utf8");
    const withoutComments = text.replace(/\/\*[\s\S]*?\*\//g, "");
    assert.ok(!COLOUR_LITERAL.test(withoutComments), `${file} contains a colour literal outside tokens.css`);
    for (const line of withoutComments.split("\n")) {
      // A @media breakpoint condition is the one place CSS itself forbids a
      // var() (custom properties cannot appear in a media feature), so a
      // literal px there is a technical necessity, not a token violation.
      if (/@media/.test(line)) continue;
      if (RAW_PX.test(line) && !/var\(--/.test(line)) {
        assert.fail(`${file} sets a raw px value outside a custom property: "${line.trim()}"`);
      }
    }
  }
});

test("CSS-5: no !important anywhere in this module's CSS", () => {
  for (const file of ALL_CSS_FILES) {
    const text = readFileSync(path.join(projectDir, file), "utf8");
    assert.ok(!/!important/.test(text), `${file} uses !important`);
  }
});

test("AC-6: print.css keeps sections/groups/rows whole across a page break", () => {
  const text = readFileSync(path.join(projectDir, "print.css"), "utf8");
  assert.match(text, /break-inside:\s*avoid/);
});

