import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PRINT_TARGETS,
  PRINT_TONES,
  PRINT_TARGET_ATTRIBUTE,
  PRINT_TONE_ATTRIBUTE,
  setPrintTarget,
  copyText,
} from "../app/shared/output.js";
import { EVT_BEFORE_PRINT, EVT_AFTER_PRINT } from "../app/shared/events.js";

// Fake document and window for testing (TEST-8)
function createFakeDocument() {
  const attributes = new Map();
  const children = [];
  const doc = {
    body: {
      setAttribute(name, value) {
        attributes.set(name, value);
      },
      removeAttribute(name) {
        attributes.delete(name);
      },
      getAttribute(name) {
        return attributes.get(name);
      },
      appendChild(child) {
        children.push(child);
      },
      removeChild(child) {
        const idx = children.indexOf(child);
        if (idx >= 0) children.splice(idx, 1);
      },
    },
    createElement(tag) {
      if (tag === "textarea") {
        const textarea = {
          textContent: "",
          style: {},
          select() {
            doc.selectedText = textarea.textContent;
          },
        };
        return textarea;
      }
      return {};
    },
    children,
    selectedText: null,
    execCommand(cmd) {
      return cmd === "copy";
    },
  };
  return doc;
}

function createFakeWindow() {
  return {
    listeners: new Map(),
    print() {},
    addEventListener(event, handler) {
      if (!this.listeners.has(event)) {
        this.listeners.set(event, []);
      }
      this.listeners.get(event).push(handler);
    },
    removeEventListener(event, handler) {
      if (this.listeners.has(event)) {
        const list = this.listeners.get(event);
        const idx = list.indexOf(handler);
        if (idx >= 0) list.splice(idx, 1);
      }
    },
    fireAfterprint() {
      const handlers = this.listeners.get("afterprint") || [];
      handlers.forEach((h) => h());
    },
  };
}

// Constants are exported correctly
test("exports PRINT_TARGETS array", () => {
  assert.ok(Array.isArray(PRINT_TARGETS));
  assert.deepEqual(PRINT_TARGETS, [
    "element",
    "story",
    "story-with-table",
    "table",
    "list",
  ]);
});

test("exports PRINT_TONES array", () => {
  assert.ok(Array.isArray(PRINT_TONES));
  assert.deepEqual(PRINT_TONES, ["colour", "gray"]);
});

// setPrintTarget: valid target and tone
test("setPrintTarget with valid target and tone sets attributes", () => {
  const doc = createFakeDocument();
  const win = createFakeWindow();

  const result = setPrintTarget("story", "colour", { doc, win });

  assert.deepEqual(result, { ok: true });
  assert.equal(doc.body.getAttribute(PRINT_TARGET_ATTRIBUTE), "story");
  assert.equal(doc.body.getAttribute(PRINT_TONE_ATTRIBUTE), "colour");
});

test("setPrintTarget calls window.print()", () => {
  const doc = createFakeDocument();
  const win = createFakeWindow();
  let printCalled = false;
  win.print = () => {
    printCalled = true;
  };

  setPrintTarget("table", "gray", { doc, win });

  assert.ok(printCalled, "window.print() should be called");
});

test("setPrintTarget clears attributes on afterprint event", () => {
  const doc = createFakeDocument();
  const win = createFakeWindow();

  setPrintTarget("list", "colour", { doc, win });
  assert.ok(doc.body.getAttribute(PRINT_TARGET_ATTRIBUTE)); // Set before
  assert.ok(doc.body.getAttribute(PRINT_TONE_ATTRIBUTE)); // Set before

  win.fireAfterprint();

  assert.equal(doc.body.getAttribute(PRINT_TARGET_ATTRIBUTE), undefined);
  assert.equal(doc.body.getAttribute(PRINT_TONE_ATTRIBUTE), undefined);
});

// setPrintTarget: invalid target (gate test - TEST-7)
test("setPrintTarget rejects invalid target with error", () => {
  const doc = createFakeDocument();
  const win = createFakeWindow();
  let printCalled = false;
  win.print = () => {
    printCalled = true;
  };

  const result = setPrintTarget("invalid", "colour", { doc, win });

  assert.ok(!result.ok);
  assert.ok(result.error);
  assert.ok(!printCalled, "print should NOT be called for invalid target");
});

// setPrintTarget: invalid tone (gate test - TEST-7)
test("setPrintTarget rejects invalid tone with error", () => {
  const doc = createFakeDocument();
  const win = createFakeWindow();
  let printCalled = false;
  win.print = () => {
    printCalled = true;
  };

  const result = setPrintTarget("story", "invalid", { doc, win });

  assert.ok(!result.ok);
  assert.ok(result.error);
  assert.ok(!printCalled, "print should NOT be called for invalid tone");
});

// setPrintTarget: print throws but attributes are cleared
test("setPrintTarget clears attributes even if print throws", () => {
  const doc = createFakeDocument();
  const win = createFakeWindow();
  win.print = () => {
    throw new Error("Print failed");
  };

  setPrintTarget("story", "colour", { doc, win });

  // Attributes are cleared immediately when print throws (JS-2: handle errors explicitly)
  assert.equal(doc.body.getAttribute(PRINT_TARGET_ATTRIBUTE), undefined);
  assert.equal(doc.body.getAttribute(PRINT_TONE_ATTRIBUTE), undefined);
});

// copyText: clipboard API available (happy path)
test("copyText uses clipboard.writeText when available", async () => {
  const nav = {
    clipboard: {
      writeText: async (text) => {
        assert.equal(text, "test text");
      },
    },
  };

  const result = await copyText("test text", { nav });

  assert.deepEqual(result, { ok: true });
});

// copyText: clipboard API unavailable, fallback to textarea (happy path)
test("copyText falls back to textarea + execCommand, selects the text, and removes the helper", async () => {
  const doc = createFakeDocument();
  const result = await copyText("fallback text", { nav: {}, doc });

  assert.deepEqual(result, { ok: true });
  assert.equal(doc.selectedText, "fallback text");
  assert.equal(doc.children.length, 0, "the hidden textarea is removed again");
});

test("copyText falls back when the clipboard API rejects (permission denied)", async () => {
  const doc = createFakeDocument();
  const nav = { clipboard: { writeText: async () => { throw new Error("denied"); } } };
  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    assert.deepEqual(await copyText("hello", { nav, doc }), { ok: true });
  } finally {
    console.warn = originalWarn;
  }
  assert.equal(doc.selectedText, "hello");
});

test("copyText reports failure, and still removes the helper, when execCommand returns false", async () => {
  const doc = createFakeDocument();
  doc.execCommand = () => false;
  const result = await copyText("x", { nav: {}, doc });
  assert.equal(result.ok, false);
  assert.match(result.error, /execCommand/);
  assert.equal(doc.children.length, 0);
});

test("copyText never throws with no navigator at all", async () => {
  const doc = createFakeDocument();
  const result = await copyText("x", { nav: null, doc: { ...doc, createElement: () => { throw new Error("no dom"); } } });
  assert.equal(result.ok, false);
});

test("copyText refuses a non-string without touching the clipboard", async () => {
  let touched = false;
  const nav = { clipboard: { writeText: async () => { touched = true; } } };
  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    const result = await copyText(undefined, { nav });
    assert.equal(result.ok, false);
  } finally {
    console.warn = originalWarn;
  }
  assert.equal(touched, false);
});

// copyText: fallback failure
test("copyText returns error when clipboard fails and fallback also fails", async () => {
  const doc = {
    createElement() {
      throw new Error("createElement failed");
    },
  };
  const nav = {};

  const result = await copyText("text", { nav, doc });

  assert.ok(!result.ok);
  assert.ok(result.error);
});

// setPrintTarget: the attribute names are the CSS contract
test("print attributes are `data-print` and `data-tone` on the body, as style.spec names them", () => {
  const doc = createFakeDocument();
  const win = createFakeWindow();
  setPrintTarget("story-with-table", "gray", { doc, win });
  assert.equal(PRINT_TARGET_ATTRIBUTE, "data-print");
  assert.equal(PRINT_TONE_ATTRIBUTE, "data-tone");
  assert.equal(doc.body.getAttribute("data-print"), "story-with-table");
  assert.equal(doc.body.getAttribute("data-tone"), "gray");
});

test("every target/tone pair in the spec is accepted (documentation.spec)", () => {
  for (const target of ["element", "story", "story-with-table", "table", "list"]) {
    for (const tone of ["colour", "gray"]) {
      const doc = createFakeDocument();
      assert.deepEqual(setPrintTarget(target, tone, { doc, win: createFakeWindow() }), { ok: true }, `${target}/${tone}`);
    }
  }
});

test("guard: an invalid target leaves the body untouched", () => {
  const doc = createFakeDocument();
  setPrintTarget("bogus", "colour", { doc, win: createFakeWindow() });
  assert.equal(doc.body.getAttribute(PRINT_TARGET_ATTRIBUTE), undefined);
  assert.equal(doc.body.getAttribute(PRINT_TONE_ATTRIBUTE), undefined);
});

test("print failure is reported, not swallowed", () => {
  const win = createFakeWindow();
  win.print = () => { throw new Error("blocked"); };
  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    assert.deepEqual(setPrintTarget("list", "colour", { doc: createFakeDocument(), win }), { ok: false, error: "blocked" });
  } finally {
    console.warn = originalWarn;
  }
});

test("afterprint listener removes itself so repeated prints do not stack handlers", () => {
  const doc = createFakeDocument();
  const win = createFakeWindow();
  setPrintTarget("table", "colour", { doc, win });
  win.fireAfterprint();
  assert.equal(win.listeners.get("afterprint").length, 0);
});

// Print events: how the diagram and the story map learn to prepare their print view
function createRecordingDocument() {
  const doc = createFakeDocument();
  doc.events = [];
  doc.dispatchEvent = (event) => {
    doc.events.push({ type: event.type, detail: event.detail, printAttribute: doc.body.getAttribute("data-print") });
    return true;
  };
  return doc;
}

test("before-print is announced with target and tone, after the attributes are set and before print()", () => {
  const doc = createRecordingDocument();
  const win = createFakeWindow();
  win.print = () => doc.events.push({ type: "print()" });
  setPrintTarget("story-with-table", "gray", { doc, win });
  assert.deepEqual(doc.events.map((e) => e.type), [EVT_BEFORE_PRINT, "print()"]);
  assert.deepEqual(doc.events[0].detail, { target: "story-with-table", tone: "gray" });
  assert.equal(doc.events[0].printAttribute, "story-with-table");
});

test("after-print is announced once, after the attributes are cleared, even if afterprint fires twice", () => {
  const doc = createRecordingDocument();
  const win = createFakeWindow();
  setPrintTarget("table", "colour", { doc, win });
  win.fireAfterprint();
  win.fireAfterprint();
  const after = doc.events.filter((e) => e.type === EVT_AFTER_PRINT);
  assert.equal(after.length, 1);
  assert.deepEqual(after[0].detail, { target: "table", tone: "colour" });
  assert.equal(after[0].printAttribute, undefined);
});

test("a print failure still announces after-print, so listeners restore their view", () => {
  const doc = createRecordingDocument();
  const win = createFakeWindow();
  win.print = () => { throw new Error("blocked"); };
  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    setPrintTarget("table", "colour", { doc, win });
  } finally {
    console.warn = originalWarn;
  }
  assert.deepEqual(doc.events.map((e) => e.type), [EVT_BEFORE_PRINT, EVT_AFTER_PRINT]);
});

test("guard: an invalid target announces nothing", () => {
  const doc = createRecordingDocument();
  setPrintTarget("bogus", "colour", { doc, win: createFakeWindow() });
  assert.equal(doc.events.length, 0);
});

test("a listener that throws does not stop the print", () => {
  const doc = createRecordingDocument();
  doc.dispatchEvent = () => { throw new Error("listener broke"); };
  let printed = false;
  const win = createFakeWindow();
  win.print = () => { printed = true; };
  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    assert.deepEqual(setPrintTarget("table", "colour", { doc, win }), { ok: true });
  } finally {
    console.warn = originalWarn;
  }
  assert.ok(printed);
});
