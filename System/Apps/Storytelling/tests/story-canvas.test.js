import assert from "node:assert/strict";
import { test, beforeEach, afterEach } from "node:test";
import { createFakeDocument, createFakeTimers, fire } from "./helpers/fake-dom-canvas.js";
import { EVT_SELECT, EVT_OPEN, EVT_OPEN_LIBRARY, EVT_NOTICE, EVT_AGENT_SESSION, EVT_BEFORE_PRINT, EVT_AFTER_PRINT, AGENT_STATUS_TEXT } from "../app/shared/events.js";
import {
  mountStoryCanvas,
  printScaleFor,
  PRINT_SHEET_WIDTH_PX,
  HINT_BRANCH,
  HINT_INSERT,
  HINT_ADD,
  HINT_DOCK,
} from "../app/story/story-canvas.js";
import {
  storyStore,
  getStoryState,
  getActiveUid,
  addBead,
  pairBead,
  newRibbon,
  clearStory,
  canUndoClear,
  UNDO_MS,
} from "../app/story/story-model.js";
import { openSavedStory as openSaved, listStories as listSaved, saveStory as saveToStore, writeDraft, readDraft, resetStoryStore } from "../app/story/story-store.js";

const EMPTY = { type: "empty" };

function makeStorage() {
  const data = new Map();
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => void data.set(key, String(value)),
    removeItem: (key) => void data.delete(key),
  };
}

function makeQuotaStorage() {
  const storage = makeStorage();
  storage.setItem = () => {
    const error = new Error("full");
    error.name = "QuotaExceededError";
    throw error;
  };
  return storage;
}

function makeBrokenStorage() {
  const fail = () => {
    throw new Error("blocked");
  };
  return { getItem: fail, setItem: fail, removeItem: fail };
}

let canvas;
let timers;
let calls;
let currentStorage;

function setup({ storage = makeStorage() } = {}) {
  globalThis.document = createFakeDocument();
  resetStoryStore();
  storyStore.restore({ beads: [], ribbons: [], activeUid: null });
  timers = createFakeTimers();
  calls = { copy: [], print: [] };
  const host = document.createElement("div");
  document.body.appendChild(host);
  canvas = mountStoryCanvas(host, {
    storage,
    setTimer: timers.setTimer,
    clearTimer: timers.clearTimer,
    copyText: async (text) => {
      calls.copy.push(text);
      return { ok: true };
    },
    setPrintTarget: (target, tone) => calls.print.push([target, tone]),
  });
  currentStorage = storage;
  return { storage };
}

beforeEach(() => setup());
afterEach(() => canvas.destroy());

const q = (selector) => canvas.areaEl.querySelector(selector);
const qa = (selector) => canvas.areaEl.querySelectorAll(selector);
const beadNode = (uid) => qa(".st-bead").find((node) => node.getAttribute("data-bead-uid") === uid);
const click = (node) => fire(node, "click");
const say = () => q(".st-story__message").textContent;
const promptButton = (label) => qa(".st-story__prompt-btn").find((button) => button.textContent === label);
const flush = async () => {
  await new Promise((resolve) => queueMicrotask(resolve));
  await new Promise((resolve) => queueMicrotask(resolve));
};
const muteWarnings = () => {
  const original = console.warn;
  console.warn = () => {};
  return () => {
    console.warn = original;
  };
};

/** a→b (b is a tandem with Re), a→c (branch), c→rogue. Returns the uids. */
function buildFork() {
  const a = addBead("Ae", EMPTY).uid;
  const b = addBead("Srs", EMPTY).uid;
  const c = addBead("C", { type: "bead", uid: a }).uid;
  pairBead(b, "Re");
  const rogue = addBead("Rg", EMPTY).uid;
  return { a, b, c, rogue };
}

/* ---------- render ---------- */

test("renders a fork, a tandem and a rogue bead with numbered steps and threads", () => {
  const { a, b, c, rogue } = buildFork();
  fire(q(".st-bead__label-input"), "keydown", { key: "Escape" });

  assert.equal(qa(".st-bead").length, 4);
  assert.equal(qa(".st-thread").length, 3);
  assert.equal(canvas.threadsEl.tagName, "svg");
  assert.ok(canvas.threadsEl.classList.contains("st-threads"));

  const layoutResult = canvas.getLayoutResult();
  for (const uid of [a, b, c, rogue]) {
    const node = beadNode(uid);
    assert.equal(node.querySelector(".st-bead__step").textContent, String(layoutResult.stepNumbers[uid]));
    const box = layoutResult.positions[uid];
    assert.equal(node.style.transform, `translate(${box.x}px, ${box.y}px)`);
  }

  const tandem = beadNode(b);
  assert.equal(tandem.querySelectorAll(".st-bead__half").length, 2);
  assert.equal(tandem.querySelectorAll(".st-bead__seam").length, 1);
  assert.ok(tandem.querySelector(".st-bead__swap"));
  assert.ok(tandem.querySelector(".st-bead__split"));
  assert.equal(tandem.querySelector(".st-bead__dock"), null);
  assert.equal(tandem.getAttribute("data-width-class"), "2");
  assert.ok(tandem.classList.contains("is-tandem"));

  const single = beadNode(a);
  assert.ok(single.querySelector(".st-bead__dock"));
  assert.ok(single.querySelector(".st-bead__remove"));
  assert.ok(single.querySelector(".st-bead__link-dot"));
  assert.ok(single.querySelector(".st-bead__half").classList.contains("tile-setting"));

  const rogueNode = beadNode(rogue);
  assert.ok(rogueNode.classList.contains("is-rogue"));
  assert.equal(rogueNode.querySelector(".st-bead__symbol").textContent, "Rg");
  assert.equal(rogueNode.querySelector(".st-bead__name").textContent, "Rogue");
});

test("a tile with a symbol override shows it, and a library note prints under the bead", () => {
  addBead("5maH", EMPTY, {});
  const withNote = addBead("Ae", EMPTY, { note: "the fable at the start" }).uid;
  const symbols = qa(".st-bead__symbol").map((node) => node.textContent);
  assert.deepEqual(symbols, ["H", "Ae"]);
  assert.equal(beadNode(withNote).querySelector(".st-bead__note").textContent, "the fable at the start");
});

test("the empty state shows until a bead exists and the status line names the next join", () => {
  assert.equal(q(".st-tray__empty").hidden, false);
  assert.equal(q(".st-story__next").textContent, "Next tile starts a new ribbon");
  addBead("Ae", EMPTY);
  assert.equal(q(".st-tray__empty").hidden, true);
  assert.equal(q(".st-story__next").textContent, "Next tile joins: Ae — An Aesop");
  assert.equal(q(".st-story__count").textContent, "1 bead · 0 ribbons");
  newRibbon();
  assert.equal(q(".st-story__next").textContent, "Next tile starts a new ribbon");
});

test("a bead node survives a re-render so it can glide (same element, new transform)", () => {
  const a = addBead("Ae", EMPTY).uid;
  const before = beadNode(a);
  addBead("Srs", { type: "bead", uid: a });
  assert.equal(beadNode(a), before);
});

/* ---------- clear and undo ---------- */

test("Clear shows Undo for UNDO_MS and Undo restores the map exactly", () => {
  buildFork();
  fire(q(".st-bead__label-input"), "keydown", { key: "Escape" });
  const before = getStoryState();
  assert.equal(q(".st-story__undo").hidden, true);

  click(q(".st-story__clear"));
  assert.equal(getStoryState().beads.length, 0);
  assert.equal(q(".st-story__undo").hidden, false);
  assert.deepEqual([...timers.pending.values()].map((t) => t.ms), [UNDO_MS]);

  click(q(".st-story__undo-btn"));
  assert.deepEqual(getStoryState(), before);
  assert.equal(q(".st-story__undo").hidden, true);
  assert.equal(timers.pending.size, 0);
});

test("Undo disappears when the timer expires, and the snapshot is dropped", () => {
  addBead("Ae", EMPTY);
  click(q(".st-story__clear"));
  const [id] = [...timers.pending.keys()];
  timers.run(id);
  assert.equal(q(".st-story__undo").hidden, true);
  assert.equal(canUndoClear(), false);
});

test("Undo disappears on the next edit; Clear on an empty map does nothing", () => {
  addBead("Ae", EMPTY);
  click(q(".st-story__clear"));
  addBead("Srs", EMPTY);
  assert.equal(q(".st-story__undo").hidden, true);
  assert.equal(timers.pending.size, 0);

  clearStory();
  click(q(".st-story__clear"));
  click(q(".st-story__clear"));
  assert.equal(q(".st-story__clear").disabled, true);
});

/* ---------- save flow ---------- */

test("Save refuses an empty map, an empty name and a name over 60 characters, inline", () => {
  click(q(".st-story__save"));
  assert.match(say(), /empty/);
  addBead("Ae", EMPTY);
  click(q(".st-story__save"));
  assert.match(say(), /name/);
  q(".st-story__name").value = "x".repeat(61);
  click(q(".st-story__save"));
  assert.match(say(), /at most 60/);
  assert.equal(listSaved(currentStorage).stories.length, 0);
});

test("Save stores the story, lists newest first, and offers Replace for an existing name", () => {
  addBead("Ae", EMPTY);
  q(".st-story__name").value = "First";
  click(q(".st-story__save"));
  assert.match(say(), /Saved/);
  addBead("Srs", EMPTY);
  q(".st-story__name").value = "Second";
  click(q(".st-story__save"));
  const names = qa(".st-story__saved-item").map((item) => item.getAttribute("data-story-name"));
  assert.deepEqual(names, ["Second", "First"]);

  addBead("C", EMPTY);
  q(".st-story__name").value = "First";
  click(q(".st-story__save"));
  assert.equal(q(".st-story__prompt").hidden, false);
  assert.equal(openSaved("First").beads.length, 1, "nothing replaced yet");
  click(promptButton("Replace"));
  assert.equal(q(".st-story__prompt").hidden, true);
  assert.equal(openSaved("First").beads.length, 3);
  assert.equal(qa(".st-story__saved-item").length, 2);
});

test("Cancel on the Replace prompt keeps the old story", () => {
  addBead("Ae", EMPTY);
  q(".st-story__name").value = "Keep";
  click(q(".st-story__save"));
  addBead("Srs", EMPTY);
  click(q(".st-story__save"));
  click(promptButton("Cancel"));
  assert.equal(openSaved("Keep").beads.length, 1);
});

test("a saved story can be deleted after an inline confirmation", () => {
  addBead("Ae", EMPTY);
  q(".st-story__name").value = "Gone";
  click(q(".st-story__save"));
  click(q(".st-story__delete"));
  assert.equal(qa(".st-story__saved-item").length, 1, "still there until confirmed");
  click(promptButton("Delete"));
  assert.equal(qa(".st-story__saved-item").length, 0);
  assert.equal(q(".st-story__saved-empty").hidden, false);
});

test("opening a saved story with unsaved changes asks first; without them it opens directly", () => {
  addBead("Ae", EMPTY);
  q(".st-story__name").value = "Old";
  click(q(".st-story__save"));
  assert.equal(canvas.hasUnsavedChanges(), false);

  addBead("Srs", EMPTY);
  addBead("C", EMPTY);
  assert.equal(canvas.hasUnsavedChanges(), true);
  click(q(".st-story__open"));
  assert.equal(getStoryState().beads.length, 3, "unchanged until confirmed");
  click(promptButton("Cancel"));
  assert.equal(getStoryState().beads.length, 3);

  click(q(".st-story__open"));
  click(promptButton("Open anyway"));
  assert.equal(getStoryState().beads.length, 1);
  assert.equal(q(".st-story__name").value, "Old");
  assert.equal(canvas.hasUnsavedChanges(), false);

  click(q(".st-story__open"));
  assert.equal(q(".st-story__prompt").hidden, true, "no prompt when nothing is unsaved");
});

test("a story an agent saved carries the AI chip", () => {
  const { storage } = setup();
  const saved = { version: 1, stories: [{ name: "By agent", agent: true, beads: [{ uid: "z", elementId: "Ae" }], ribbons: [] }] };
  storage.setItem("storytelling.stories.v1", JSON.stringify(saved));
  canvas.destroy();
  resetStoryStore();
  const host = document.createElement("div");
  document.body.appendChild(host);
  canvas = mountStoryCanvas(host, { storage, setTimer: timers.setTimer, clearTimer: timers.clearTimer });
  assert.equal(q(".st-story__ai").textContent, "AI");
});

test("openShape loads a library-style shape and sets the name, asking first when unsaved", () => {
  const shape = { beads: [{ uid: "l1", elementId: "Ae", note: "n" }, { uid: "l2", elementId: "Srs" }], ribbons: [["l1", "l2"]] };
  addBead("C", EMPTY);
  canvas.openShape(shape, "Library story");
  assert.equal(q(".st-story__prompt").hidden, false);
  click(promptButton("Open anyway"));
  assert.equal(getStoryState().beads.length, 2);
  assert.equal(q(".st-story__name").value, "Library story");
  assert.equal(qa(".st-bead__note").length, 1);
});

/* ---------- draft and storage failure ---------- */

test("the draft is restored at mount and written on every change", () => {
  const storage = makeStorage();
  canvas.destroy();
  globalThis.document = createFakeDocument();
  resetStoryStore();
  storyStore.restore({ beads: [], ribbons: [], activeUid: null });
  writeDraft([{ uid: "x1", elementId: "Ae" }, { uid: "x2", elementId: "Srs" }], [["x1", "x2"]], storage);
  const host = document.createElement("div");
  document.body.appendChild(host);
  canvas = mountStoryCanvas(host, { storage, setTimer: timers.setTimer, clearTimer: timers.clearTimer });

  assert.equal(getStoryState().beads.length, 2);
  assert.equal(getStoryState().ribbons.length, 1);
  assert.equal(qa(".st-bead").length, 2);
  assert.equal(canvas.hasUnsavedChanges(), true);

  addBead("C", EMPTY);
  assert.equal(readDraft(storage).beads.length, 3);
  assert.equal(JSON.parse(storage.getItem("storytelling.draft.v1")).beads.length, 3);
});

test("a draft that cannot be read or written never breaks the app", () => {
  const restore = muteWarnings();
  try {
    canvas.destroy();
    globalThis.document = createFakeDocument();
    resetStoryStore();
    storyStore.restore({ beads: [], ribbons: [], activeUid: null });
    const host = document.createElement("div");
    document.body.appendChild(host);
    canvas = mountStoryCanvas(host, { storage: makeBrokenStorage(), setTimer: timers.setTimer, clearTimer: timers.clearTimer });
    addBead("Ae", EMPTY);
    assert.equal(qa(".st-bead").length, 1);
  } finally {
    restore();
  }
});

test("when storage is full the app keeps working and says so once, next to Save", () => {
  const restore = muteWarnings();
  try {
    canvas.destroy();
    globalThis.document = createFakeDocument();
    resetStoryStore();
    storyStore.restore({ beads: [], ribbons: [], activeUid: null });
    const host = document.createElement("div");
    document.body.appendChild(host);
    canvas = mountStoryCanvas(host, { storage: makeQuotaStorage(), setTimer: timers.setTimer, clearTimer: timers.clearTimer });
    assert.equal(q(".st-story__storage-note").hidden, true);

    addBead("Ae", EMPTY);
    const note = q(".st-story__storage-note");
    assert.equal(note.hidden, false);
    assert.match(note.textContent, /Storage full/);
    assert.match(note.textContent, /memory/);
    const text = note.textContent;

    q(".st-story__name").value = "Still saves";
    click(q(".st-story__save"));
    assert.match(say(), /Saved/);
    assert.equal(q(".st-story__storage-note").textContent, text);
    assert.equal(qa(".st-story__storage-note").length, 1);
  } finally {
    restore();
  }
});

/* ---------- keyboard ---------- */

const select = (elementId) => document.dispatchEvent(new CustomEvent(EVT_SELECT, { detail: { elementId } }));

test("with a tile selected, C and the Add to story button add it; modifiers and text fields are ignored", () => {
  assert.equal(q(".st-story__add").disabled, true);
  fire(document, "keydown", { key: "c" });
  assert.equal(getStoryState().beads.length, 0);

  select("Ae");
  assert.equal(q(".st-story__add").disabled, false);
  fire(document, "keydown", { key: "c", ctrlKey: true });
  fire(q(".st-story__name"), "keydown", { key: "c" });
  assert.equal(getStoryState().beads.length, 0);

  fire(document, "keydown", { key: "c" });
  assert.equal(getStoryState().beads[0].elementId, "Ae");
  click(q(".st-story__add"));
  assert.equal(getStoryState().beads.length, 2);
  assert.equal(getStoryState().ribbons.length, 1);

  select(null);
  assert.equal(q(".st-story__add").disabled, true);
});

test("adding the Rogue card with C opens a focused label field; Enter keeps the typed name, Esc keeps Rogue", () => {
  select("Rg");
  fire(document, "keydown", { key: "c" });
  const input = q(".st-bead__label-input");
  assert.ok(input);
  assert.equal(document.activeElement, input);
  input.value = "The Stranger";
  fire(input, "keydown", { key: "Enter" });
  assert.equal(getStoryState().beads[0].label, "The Stranger");
  assert.equal(q(".st-bead__label-input"), null);
  assert.equal(q(".st-bead__name").textContent, "The Stranger");

  fire(document, "keydown", { key: "c" });
  const second = q(".st-bead__label-input");
  second.value = "typed then abandoned";
  fire(second, "keydown", { key: "Escape" });
  assert.equal(getStoryState().beads[1].label, "Rogue");
  assert.equal(q(".st-bead__label-input"), null);
});

test("double-clicking a rogue bead's label edits it later; a long label is capped by the field", () => {
  const rogue = addBead("Rg", EMPTY).uid;
  fire(q(".st-bead__label-input"), "keydown", { key: "Escape" });
  fire(beadNode(rogue).querySelector(".st-bead__name"), "dblclick");
  const input = q(".st-bead__label-input");
  assert.equal(input.value, "Rogue");
  assert.equal(input.getAttribute("maxlength"), "24");
  input.value = "";
  fire(input, "keydown", { key: "Enter" });
  assert.equal(getStoryState().beads[0].label, "Rogue", "an empty label falls back to Rogue");
});

test("T pairs the selected tile with the focused bead, a third is refused, Shift+T splits", () => {
  const a = addBead("Ae", EMPTY).uid;
  beadNode(a).focus();
  fire(document, "keydown", { key: "t" });
  assert.equal(getStoryState().beads[0].with, undefined, "nothing selected yet");
  assert.match(say(), /Select a tile/);

  select("Re");
  fire(beadNode(a), "keydown", { key: "t" });
  assert.equal(getStoryState().beads[0].with, "Re");
  assert.equal(beadNode(a).querySelectorAll(".st-bead__half").length, 2);

  select("3as");
  fire(beadNode(a), "keydown", { key: "t" });
  assert.equal(say(), "A tandem holds two");

  fire(beadNode(a), "keydown", { key: "T", shiftKey: true });
  assert.equal(getStoryState().beads.length, 2);
  assert.equal(getStoryState().ribbons.length, 1);
});

test("T falls back to the active bead when none is focused", () => {
  const a = addBead("Ae", EMPTY).uid;
  select("Re");
  fire(document, "keydown", { key: "t" });
  assert.equal(getStoryState().beads.find((bead) => bead.uid === a).with, "Re");
});

test("Enter makes a focused bead active; Delete removes it and closes the chain up", () => {
  const a = addBead("Ae", EMPTY).uid;
  const b = addBead("Srs", EMPTY).uid;
  const c = addBead("C", EMPTY).uid;
  assert.equal(getActiveUid(), c);
  beadNode(a).focus();
  fire(beadNode(a), "keydown", { key: "Enter" });
  assert.equal(getActiveUid(), a);
  assert.ok(beadNode(a).classList.contains("is-active"));

  fire(beadNode(b), "keydown", { key: "Delete" });
  assert.deepEqual(getStoryState().beads.map((bead) => bead.uid), [a, c]);
  assert.deepEqual(getStoryState().ribbons, [[a, c]]);
  assert.ok(document.activeElement, "focus moves on to a remaining bead");
  assert.ok(document.activeElement.classList.contains("st-bead"));
});

test("Delete typed in a text field never removes a bead", () => {
  const a = addBead("Ae", EMPTY).uid;
  fire(q(".st-story__name"), "keydown", { key: "Delete" });
  assert.equal(getStoryState().beads.length, 1);
  assert.ok(beadNode(a));
});

test("L then Enter on another bead links them; Esc cancels; a duplicate says so", () => {
  const a = addBead("Ae", EMPTY).uid;
  newRibbon();
  const b = addBead("Srs", EMPTY).uid;
  assert.equal(getStoryState().ribbons.length, 0);

  beadNode(a).focus();
  fire(beadNode(a), "keydown", { key: "L" });
  assert.ok(beadNode(a).classList.contains("is-link-source"));
  assert.match(say(), /Linking/);
  fire(beadNode(a), "keydown", { key: "Escape" });
  assert.equal(beadNode(a).classList.contains("is-link-source"), false);

  fire(beadNode(a), "keydown", { key: "l" });
  beadNode(b).focus();
  fire(beadNode(b), "keydown", { key: "Enter" });
  assert.deepEqual(getStoryState().ribbons, [[a, b]]);

  fire(beadNode(a), "keydown", { key: "l" });
  fire(beadNode(b), "keydown", { key: "Enter" });
  assert.match(say(), /already linked/);
  assert.equal(getStoryState().ribbons.length, 1);
});

test("the remove, swap and split controls act on their bead", () => {
  const a = addBead("Ae", EMPTY).uid;
  pairBead(a, "Re");
  click(beadNode(a).querySelector(".st-bead__swap"));
  assert.equal(getStoryState().beads[0].elementId, "Re");
  click(beadNode(a).querySelector(".st-bead__split"));
  assert.equal(getStoryState().beads.length, 2);
  click(beadNode(a).querySelector(".st-bead__remove"));
  assert.equal(getStoryState().beads.length, 1);
});

test("clicking a ribbon selects it and offers Cut; clicking the tray clears the selection", () => {
  const a = addBead("Ae", EMPTY).uid;
  const b = addBead("Srs", EMPTY).uid;
  assert.equal(q(".st-thread-cut").hidden, true);
  click(q(".st-thread__hit"));
  assert.ok(q(".st-thread").classList.contains("is-selected"));
  assert.equal(q(".st-thread-cut").hidden, false);

  click(canvas.trayEl);
  assert.equal(q(".st-thread").classList.contains("is-selected"), false);
  assert.equal(q(".st-thread-cut").hidden, true);

  click(q(".st-thread__hit"));
  click(q(".st-thread-cut"));
  assert.deepEqual(getStoryState().ribbons, []);
  assert.ok(beadNode(a) && beadNode(b));
});

/* ---------- opening detail ---------- */

function collectOpens() {
  const opens = [];
  document.addEventListener(EVT_OPEN, (event) => opens.push(event.detail));
  return opens;
}

test("double-click opens the detail of the clicked half, with note, rogue label and tandem partner", () => {
  const opens = collectOpens();
  const single = addBead("Ae", EMPTY, { note: "why it is here" }).uid;
  fire(beadNode(single).querySelector(".st-bead__half"), "dblclick");
  assert.equal(opens[0].elementId, "Ae");
  assert.equal(opens[0].note, "why it is here");
  assert.equal(opens[0].tandemWith, undefined);

  pairBead(single, "Re");
  const halves = beadNode(single).querySelectorAll(".st-bead__half");
  fire(halves[1], "dblclick");
  assert.equal(opens[1].elementId, "Re");
  assert.equal(opens[1].tandemWith, "Ae");
  assert.equal(opens[1].note, "why it is here");
  assert.equal(opens[1].label, undefined);
});

test("double-click on a rogue half's symbol opens its detail with the label and the partner", () => {
  const opens = collectOpens();
  const a = addBead("Ae", EMPTY).uid;
  pairBead(a, "Rg", { label: "Zed" });
  const rogueHalf = beadNode(a).querySelectorAll(".st-bead__half")[1];
  fire(rogueHalf.querySelector(".st-bead__symbol"), "dblclick");
  assert.deepEqual(
    { id: opens[0].elementId, label: opens[0].label, other: opens[0].tandemWith, otherLabel: opens[0].tandemWithLabel },
    { id: "Rg", label: "Zed", other: "Ae", otherLabel: undefined },
  );

  fire(beadNode(a).querySelector(".st-bead__half").querySelector(".st-bead__symbol"), "dblclick");
  assert.equal(opens[1].elementId, "Ae");
  assert.equal(opens[1].tandemWith, "Rg");
  assert.equal(opens[1].tandemWithLabel, "Zed");
});

test("double-clicking a rogue half's label in a tandem edits that half's label", () => {
  const a = addBead("Ae", EMPTY).uid;
  pairBead(a, "Rg", { label: "Zed" });
  fire(beadNode(a).querySelectorAll(".st-bead__half")[1].querySelector(".st-bead__name"), "dblclick");
  const input = q(".st-bead__label-input");
  input.value = "Yara";
  fire(input, "keydown", { key: "Enter" });
  assert.equal(getStoryState().beads[0].withLabel, "Yara");
});

test("pairing a fresh Rogue card opens its label field on the tandem's second half", () => {
  const a = addBead("Ae", EMPTY).uid;
  pairBead(a, "Rg");
  const input = q(".st-bead__label-input");
  assert.ok(input);
  assert.equal(input.closest(".st-bead__half").getAttribute("data-half"), "with");
});

/* ---------- drop targets (called by drag-drop.js) ---------- */

test("setDropTarget marks the bead, ribbon, dock or tray and sets the exact hint words", () => {
  const a = addBead("Ae", EMPTY).uid;
  const b = addBead("Srs", EMPTY).uid;
  const tray = canvas.trayEl;
  const thread = q(".st-thread");

  canvas.setDropTarget({ type: "bead", uid: a });
  assert.ok(beadNode(a).classList.contains("is-drop-branch"));
  assert.equal(tray.getAttribute("data-hint"), HINT_BRANCH);
  assert.equal(HINT_BRANCH, "Branch from this bead");

  canvas.setDropTarget({ type: "ribbon", from: a, to: b });
  assert.equal(beadNode(a).classList.contains("is-drop-branch"), false);
  assert.ok(thread.classList.contains("is-drop-insert"));
  assert.equal(tray.getAttribute("data-hint"), "Insert on this ribbon");
  assert.equal(HINT_INSERT, "Insert on this ribbon");

  canvas.setDropTarget({ type: "dock", uid: b });
  assert.equal(thread.classList.contains("is-drop-insert"), false);
  assert.ok(beadNode(b).querySelector(".st-bead__dock").classList.contains("is-drop-dock"));
  assert.equal(tray.getAttribute("data-hint"), "Pair as a tandem");
  assert.equal(HINT_DOCK, "Pair as a tandem");

  canvas.setDropTarget({ type: "empty" });
  assert.equal(beadNode(b).querySelector(".st-bead__dock").classList.contains("is-drop-dock"), false);
  assert.equal(tray.getAttribute("data-hint"), "Add to the story");
  assert.equal(HINT_ADD, "Add to the story");

  canvas.setDropTarget(null);
  assert.equal(tray.getAttribute("data-hint"), null);
  assert.equal(tray.classList.contains("is-drop-add"), false);
});

test("a drop-target mark survives a re-render while dragging", () => {
  const a = addBead("Ae", EMPTY).uid;
  canvas.setDropTarget({ type: "bead", uid: a });
  addBead("Srs", { type: "bead", uid: a });
  assert.ok(beadNode(a).classList.contains("is-drop-branch"));
  canvas.setDragging(true, true);
  assert.ok(canvas.trayEl.classList.contains("is-dragging"));
  assert.ok(canvas.trayEl.classList.contains("is-pairable"));
  canvas.setDragging(false);
  assert.equal(canvas.trayEl.getAttribute("data-hint"), null);
  assert.equal(beadNode(a).classList.contains("is-drop-branch"), false);
});

test("canvasEl is the layout-coordinate box inside the tray, areaEl is the whole area", () => {
  assert.ok(canvas.canvasEl.classList.contains("st-tray__content"));
  assert.ok(canvas.trayEl.contains(canvas.canvasEl));
  assert.ok(canvas.areaEl.classList.contains("st-story"));
  assert.ok(canvas.canvasEl.contains(canvas.threadsEl));
});

test("a refusal notice from drag-drop shows in the message area", () => {
  document.dispatchEvent(new CustomEvent(EVT_NOTICE, { detail: { message: "A tandem holds two" } }));
  assert.equal(say(), "A tandem holds two");
  assert.equal(q(".st-story__message").getAttribute("data-kind"), "error");
});

/* ---------- copy, print, library ---------- */

test("Copy sends the story text (name, one line per bead) and is off for an empty map", async () => {
  assert.equal(q(".st-story__copy").disabled, true);
  addBead("Ae", EMPTY);
  addBead("Srs", EMPTY);
  q(".st-story__name").value = "My tale";
  click(q(".st-story__copy"));
  await flush();
  assert.equal(calls.copy.length, 1);
  assert.equal(calls.copy[0], "My tale\n1. Ae — An Aesop\n2. Srs — Serious Business");
  assert.match(say(), /Copied/);
});

test("Print offers Ribbon only / Ribbon with table in Colour or Grayscale and closes after a choice", () => {
  assert.equal(q(".st-story__print-toggle").disabled, true);
  addBead("Ae", EMPTY);
  assert.equal(q(".st-story__print-menu").hidden, true);
  click(q(".st-story__print-toggle"));
  assert.equal(q(".st-story__print-menu").hidden, false);
  assert.equal(q(".st-story__print-toggle").getAttribute("aria-expanded"), "true");
  assert.equal(qa(".st-story__print-option").length, 4);

  const gray = qa(".st-story__print-option").find(
    (option) => option.getAttribute("data-print-target") === "story-with-table" && option.getAttribute("data-print-tone") === "gray",
  );
  click(gray);
  const colour = qa(".st-story__print-option").find(
    (option) => option.getAttribute("data-print-target") === "story" && option.getAttribute("data-print-tone") === "colour",
  );
  click(colour);
  assert.deepEqual(calls.print, [["story-with-table", "gray"], ["story", "colour"]]);
  assert.equal(q(".st-story__print-menu").hidden, true);
});

test("the Library button asks the app to open the library", () => {
  let opened = 0;
  document.addEventListener(EVT_OPEN_LIBRARY, () => { opened += 1; });
  click(q(".st-story__library"));
  assert.equal(opened, 1);
});

test("New ribbon clears the active bead", () => {
  addBead("Ae", EMPTY);
  click(q(".st-story__new-ribbon"));
  assert.equal(getActiveUid(), null);
  assert.equal(q(".st-story__next").textContent, "Next tile starts a new ribbon");
});

/* ---------- agent session and library wiring ---------- */

test("an agent session shows the agent status text, fills the name field, and clears when it ends", () => {
  document.dispatchEvent(new CustomEvent(EVT_AGENT_SESSION, { detail: { active: true, name: "A mystery" } }));
  assert.equal(say(), AGENT_STATUS_TEXT);
  assert.equal(q(".st-story__name").value, "A mystery");
  document.dispatchEvent(new CustomEvent(EVT_AGENT_SESSION, { detail: { active: false, name: null } }));
  assert.equal(say(), "");
  assert.equal(q(".st-story__name").value, "A mystery", "the agent's name stays for Luke to keep or edit");
});

test("a story saved by an agent (straight to storage) appears in the saved list, with its AI tag, on the session event", () => {
  assert.equal(qa(".st-story__saved-item").length, 0);
  assert.equal(q(".st-story__saved-empty").hidden, false);
  addBead("Ae", EMPTY);
  const { beads, ribbons } = getStoryState();
  assert.ok(saveToStore({ name: "Agent tale", beads, ribbons, agent: true }, currentStorage).ok);
  assert.equal(qa(".st-story__saved-item").length, 0, "nothing tells the canvas until the event");
  document.dispatchEvent(new CustomEvent(EVT_AGENT_SESSION, { detail: { active: true, name: "Agent tale" } }));
  const items = qa(".st-story__saved-item");
  assert.equal(items.length, 1);
  assert.equal(items[0].getAttribute("data-story-name"), "Agent tale");
  assert.ok(items[0].querySelector(".st-story__ai"));
  assert.equal(q(".st-story__saved-empty").hidden, true);
});

test("ending an agent session does not wipe an unrelated message", () => {
  document.dispatchEvent(new CustomEvent(EVT_AGENT_SESSION, { detail: { active: true, name: null } }));
  canvas.showMessage("Copied the story to the clipboard.");
  document.dispatchEvent(new CustomEvent(EVT_AGENT_SESSION, { detail: { active: false, name: null } }));
  assert.equal(say(), "Copied the story to the clipboard.");
});

test("loadShape opens without asking even when the map has unsaved changes, sets the name and returns the result", () => {
  addBead("Ae", EMPTY);
  assert.equal(canvas.hasUnsavedChanges(), true);
  const result = canvas.loadShape({ beads: [{ uid: "b1", elementId: "Srs" }], ribbons: [] }, "Library copy");
  assert.equal(result.ok, true);
  assert.equal(q(".st-story__name").value, "Library copy");
  assert.deepEqual(getStoryState().beads.map((bead) => bead.elementId), ["Srs"]);
  assert.equal(canvas.hasUnsavedChanges(), false, "a freshly opened map counts as clean");
});

test("loadShape returns the failure and leaves the map alone when the shape is bad", () => {
  addBead("Ae", EMPTY);
  const result = canvas.loadShape({ beads: "nope" }, "Broken");
  assert.equal(result.ok, false);
  assert.equal(getStoryState().beads.length, 1);
  assert.equal(q(".st-story__message").getAttribute("data-kind"), "error");
});

// Print scale: the map is zoomed down to the sheet's width while printing, and only for the story targets
test("printScaleFor shrinks a map wider than the sheet, never enlarges a narrow one", () => {
  assert.equal(printScaleFor(PRINT_SHEET_WIDTH_PX * 2), 0.5);
  assert.equal(printScaleFor(PRINT_SHEET_WIDTH_PX / 2), 1);
  assert.equal(printScaleFor(0), 1);
});

test("before-print sets --print-scale on the map for story and story-with-table, after-print clears it", () => {
  const ids = ["C", "3as", "Re", "Cmx", "Den", "End", "Chk", "Mcg", "Bks", "Ret", "Arc", "Rar", "Tri", "Hil", "Pro", "Imr"];
  for (const id of ids) addBead(id, EMPTY);
  const width = canvas.getLayoutResult().width;
  assert.ok(width > PRINT_SHEET_WIDTH_PX, "the chain must be wider than a sheet for this test to mean anything");
  for (const target of ["story", "story-with-table"]) {
    fire(document, EVT_BEFORE_PRINT, { detail: { target, tone: "colour" } });
    assert.equal(canvas.contentEl.style["--print-scale"], String(printScaleFor(width)), target);
    fire(document, EVT_AFTER_PRINT, { detail: { target, tone: "colour" } });
    assert.equal(canvas.contentEl.style["--print-scale"], undefined, target);
  }
});

test("guard: a table, element or list print leaves the map unscaled", () => {
  addBead("Ae", EMPTY);
  for (const target of ["table", "element", "list"]) {
    fire(document, EVT_BEFORE_PRINT, { detail: { target, tone: "colour" } });
    assert.equal(canvas.contentEl.style["--print-scale"], undefined, target);
  }
});
