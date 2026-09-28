// reorder.mjs — drag-and-rearrange tests (TEST-3: one file per module,
// TEST-8: a small hand-built fake DOM, no jsdom). Mirrors test_project.mjs's
// own fake DOM.
//
// Run: node tests/test_reorder.mjs

import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.join(here, "..", "app", "project");
const moduleUrl = (name) => path.join(projectDir, name);

// ---------------------------------------------------------------------------
// Fake DOM (TEST-8) — FakeElement/FakeText mirror test_project.mjs's own
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
    this._dataset = {};
    this.children = [];
    this._classes = new Set();
    this._attrs = {};
    this._listeners = {};
    this._title = "";
    this.value = "";
    this.checked = false;
    this.disabled = false;
    this.hidden = false;
    this._parent = null;
  }

  get dataset() {
    return new Proxy(this._dataset, {
      set: (target, prop, value) => {
        target[prop] = value;
        // Convert camelCase to kebab-case for the attribute
        const attrName = `data-${prop.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
        this._attrs[attrName] = String(value);
        return true;
      },
      get: (target, prop) => {
        const attrName = `data-${prop.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
        return this._attrs[attrName];
      },
    });
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
    if (child instanceof FakeElement) {
      child._parent = this;
    }
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
  removeAttribute(name) {
    delete this._attrs[name];
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
  dispatch(type, event = {}) {
    // Set up the event object to have target and currentTarget, and simulate bubbling
    const fullEvent = {
      target: this,
      currentTarget: this,
      preventDefault: () => {},
      ...event,
    };

    // Collect all results from this element and all parents (event bubbling)
    const results = [];
    let current = this;
    const target = this;

    while (current) {
      fullEvent.currentTarget = current;
      const handlers = current._listeners[type] ?? [];
      for (const handler of handlers) {
        results.push(handler(fullEvent));
      }
      current = current._parent;
    }

    return Promise.all(results);
  }
  querySelectorAll(selector) {
    // Parse compound selectors: .class1.class2[data-attr] or just .className
    const classes = [];
    const attrs = [];

    // Extract classes
    const classMatches = selector.match(/\.([a-z0-9-]+)/gi) || [];
    for (const match of classMatches) {
      classes.push(match.slice(1));
    }

    // Extract attributes like [data-task-index]
    const attrMatches = selector.match(/\[([a-z-]+)\]/gi) || [];
    for (const match of attrMatches) {
      const attrName = match.slice(1, -1);
      attrs.push(attrName);
    }

    const found = [];
    const walk = (node) => {
      for (const child of node.children ?? []) {
        let matches = true;

        // Check all required classes
        for (const cls of classes) {
          if (!child._classes?.has(cls)) {
            matches = false;
            break;
          }
        }

        // Check all required attributes (must exist, not checking value)
        if (matches) {
          for (const attr of attrs) {
            if (child._attrs?.[attr] === undefined) {
              matches = false;
              break;
            }
          }
        }

        if (matches) {
          found.push(child);
        }
        walk(child);
      }
    };
    walk(this);
    return found;
  }
  closest(selector) {
    // Parse classes and attributes from selector
    const classes = [];
    const attrs = [];

    const classMatches = selector.match(/\.([a-z0-9-]+)/gi) || [];
    for (const match of classMatches) {
      classes.push(match.slice(1));
    }

    const attrMatches = selector.match(/\[([a-z-]+)\]/gi) || [];
    for (const match of attrMatches) {
      const attrName = match.slice(1, -1);
      attrs.push(attrName);
    }

    let current = this;
    while (current) {
      let matches = true;

      for (const cls of classes) {
        if (!current._classes?.has(cls)) {
          matches = false;
          break;
        }
      }

      if (matches) {
        for (const attr of attrs) {
          if (current._attrs?.[attr] === undefined) {
            matches = false;
            break;
          }
        }
      }

      if (matches) return current;
      current = current._parent;
    }
    return null;
  }
}

function installFakeDom() {
  const body = new FakeElement("body");
  globalThis.document = {
    createElement: (tag) => new FakeElement(tag),
    createElementNS: (_ns, tag) => new FakeElement(tag),
    createTextNode: (text) => new FakeText(text),
    body,
    getElementById: () => null,
  };
}

installFakeDom();

const reorder = await import(moduleUrl("reorder.js"));
const taskRow = await import(moduleUrl("task-row.js"));
const actions = await import(moduleUrl("actions.js"));

// ---------------------------------------------------------------------------
// Fixture builders
// ---------------------------------------------------------------------------

function task(overrides = {}) {
  return {
    index: "1",
    action: "Do the thing",
    owner: "Luke",
    kind: "mine",
    status: "☐ Open",
    state: "🟢 on track",
    due_column: { value: "THIS WEEK", guessed: false },
    due_date: null,
    due_text: null,
    link_key: null,
    lane_source: false,
    recurring_if_done: false,
    ...overrides,
  };
}

function project(overrides = {}) {
  return {
    id: "PK-1",
    title: "Sample project",
    context: "Personal Productivity",
    mtime: 111,
    multi_stream: false,
    tasks: [],
    done_tasks: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test("A project with multi_stream=false and 3+ open tasks: drag handles and move-up/down buttons ARE present on rows", () => {
  const tasks = [
    task({ index: "1", action: "Task one" }),
    task({ index: "2", action: "Task two" }),
    task({ index: "3", action: "Task three" }),
  ];
  const p = project({ tasks, multi_stream: false });
  const section = actions.buildNextActionsSection(p, async () => ({ ok: true }), false, () => {}, async () => {});

  // Find the ul.project-list
  const list = section.querySelectorAll(".project-next-actions")[0];
  assert.ok(list, "should have a project-next-actions list");

  // Count task rows (find all li.project-task-row directly in the list)
  const rows = [];
  for (const child of list.children) {
    if (child._classes?.has("project-task-row")) {
      rows.push(child);
    }
  }
  assert.equal(rows.length, 3, `should have exactly 3 task rows, got ${rows.length}`);

  for (const row of rows) {
    // Check for drag handle
    const dragHandles = [];
    for (const child of row.children) {
      if (child._classes?.has("project-task-drag-handle")) {
        dragHandles.push(child);
      }
    }
    assert.equal(dragHandles.length, 1, `Row ${row.dataset.taskIndex} should have a drag handle`);

    // Check for move buttons
    const moveUps = [];
    const moveDowns = [];
    for (const child of row.children) {
      if (child._classes?.has("project-task-move-up")) moveUps.push(child);
      if (child._classes?.has("project-task-move-down")) moveDowns.push(child);
    }
    assert.equal(moveUps.length, 1, `Row ${row.dataset.taskIndex} should have a move-up button`);
    assert.equal(moveDowns.length, 1, `Row ${row.dataset.taskIndex} should have a move-down button`);

    // Check for draggable attribute
    assert.equal(row.getAttribute("draggable"), "true", `Row ${row.dataset.taskIndex} should be draggable`);
  }
});

test("A project with multi_stream=true: NO drag handle, NO move buttons, and the explanatory note IS rendered", () => {
  const tasks = [
    task({ index: "1", action: "Task one" }),
    task({ index: "2", action: "Task two" }),
    task({ index: "3", action: "Task three" }),
  ];
  const p = project({ tasks, multi_stream: true });
  const section = actions.buildNextActionsSection(p, async () => ({ ok: true }), false, () => {}, async () => {});

  // Find the ul.project-list
  const list = section.querySelectorAll(".project-next-actions")[0];
  assert.ok(list, "should have a project-next-actions list");

  // Count task rows
  const rows = [];
  for (const child of list.children) {
    if (child._classes?.has("project-task-row")) {
      rows.push(child);
    }
  }
  assert.equal(rows.length, 3, `should have exactly 3 task rows`);

  for (const row of rows) {
    const dragHandles = [];
    const moveUps = [];
    const moveDowns = [];
    for (const child of row.children) {
      if (child._classes?.has("project-task-drag-handle")) dragHandles.push(child);
      if (child._classes?.has("project-task-move-up")) moveUps.push(child);
      if (child._classes?.has("project-task-move-down")) moveDowns.push(child);
    }
    assert.equal(dragHandles.length, 0, `Row ${row.dataset.taskIndex} should NOT have a drag handle`);
    assert.equal(moveUps.length, 0, `Row ${row.dataset.taskIndex} should NOT have a move-up button`);
    assert.equal(moveDowns.length, 0, `Row ${row.dataset.taskIndex} should NOT have a move-down button`);
  }

  // Check that the multi-stream note is present
  const notes = [];
  for (const child of section.children) {
    if (child._classes?.has("project-multi-stream-note")) {
      notes.push(child);
    }
  }
  assert.equal(notes.length, 1, "The multi-stream explanatory note should be present");
});

test("Drag-and-drop simulation: drop calls submitReorder with the expected reordered array", async () => {
  const calls = [];
  const submitReorder = async (order) => {
    calls.push(order);
    return { ok: true };
  };

  // Build a simple list manually to test drag/drop directly
  const list = new FakeElement("ul");
  list.className = "project-list";

  const row1 = new FakeElement("li");
  row1.className = "project-task-row";
  row1.dataset.taskIndex = "1";
  list.appendChild(row1);

  const row2 = new FakeElement("li");
  row2.className = "project-task-row";
  row2.dataset.taskIndex = "2";
  list.appendChild(row2);

  const row3 = new FakeElement("li");
  row3.className = "project-task-row";
  row3.dataset.taskIndex = "3";
  list.appendChild(row3);

  // Wire reorder handlers
  reorder.wireReorder(list, submitReorder);

  // Simulate drag: start on row 3
  await row3.dispatch("dragstart", { target: row3 });

  // Simulate dragover on row 1
  await row1.dispatch("dragover", { target: row1 });

  // Simulate drop on row 1
  await row1.dispatch("drop", { target: row1, preventDefault: () => {} });

  // Check that submitReorder was called with row 3 moved to position of row 1
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], ["3", "1", "2"], "row 3 should be moved to the position of row 1");
});

test("moveTask at the top of the list with direction='up' is a no-op (does not call submitReorder)", async () => {
  const calls = [];
  const submitReorder = async (order) => {
    calls.push(order);
    return { ok: true };
  };

  // Build list
  const list = new FakeElement("ul");
  list.className = "project-list";

  const row1 = new FakeElement("li");
  row1.className = "project-task-row";
  row1.dataset.taskIndex = "1";
  list.appendChild(row1);

  const row2 = new FakeElement("li");
  row2.className = "project-task-row";
  row2.dataset.taskIndex = "2";
  list.appendChild(row2);

  // Try to move the first row up
  await reorder.moveTask(list, submitReorder, "1", "up");

  // Should not call submitReorder
  assert.equal(calls.length, 0, "moveTask at the edge should be a no-op");
});

test("moveTask in the middle of the list calls submitReorder with the two ids swapped", async () => {
  const calls = [];
  const submitReorder = async (order) => {
    calls.push(order);
    return { ok: true };
  };

  // Build list
  const list = new FakeElement("ul");
  list.className = "project-list";

  const row1 = new FakeElement("li");
  row1.className = "project-task-row";
  row1.dataset.taskIndex = "1";
  list.appendChild(row1);

  const row2 = new FakeElement("li");
  row2.className = "project-task-row";
  row2.dataset.taskIndex = "2";
  list.appendChild(row2);

  const row3 = new FakeElement("li");
  row3.className = "project-task-row";
  row3.dataset.taskIndex = "3";
  list.appendChild(row3);

  // Move row 2 up
  await reorder.moveTask(list, submitReorder, "2", "up");

  assert.equal(calls.length, 1, "moveTask should call submitReorder once");
  assert.deepEqual(calls[0], ["2", "1", "3"], "row 2 and row 1 should be swapped");
});

test("moveTask with direction='down' moves a task down one position", async () => {
  const calls = [];
  const submitReorder = async (order) => {
    calls.push(order);
    return { ok: true };
  };

  // Build list
  const list = new FakeElement("ul");
  list.className = "project-list";

  const row1 = new FakeElement("li");
  row1.className = "project-task-row";
  row1.dataset.taskIndex = "1";
  list.appendChild(row1);

  const row2 = new FakeElement("li");
  row2.className = "project-task-row";
  row2.dataset.taskIndex = "2";
  list.appendChild(row2);

  const row3 = new FakeElement("li");
  row3.className = "project-task-row";
  row3.dataset.taskIndex = "3";
  list.appendChild(row3);

  // Move row 1 down
  await reorder.moveTask(list, submitReorder, "1", "down");

  assert.equal(calls.length, 1, "moveTask should call submitReorder once");
  assert.deepEqual(calls[0], ["2", "1", "3"], "row 1 and row 2 should be swapped");
});
