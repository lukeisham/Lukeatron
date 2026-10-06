import test from "node:test";
import assert from "node:assert/strict";

import { mountLibraryPanel, examplesLeadFirst, summaryOf, hoverTextOf } from "../app/story/library-panel.js";
import { createStoryStore } from "../app/story/story-model.js";
import { LIBRARY } from "../app/data/library.js";
import { EVT_OPEN_LIBRARY } from "../app/shared/events.js";
import { makeDocument, pressKey } from "./helpers/fake-dom-library.js";

/** A panel on a fake document, with a spy for `openStory` and a settable map state. */
function setup(overrides = {}) {
  const doc = makeDocument();
  const host = doc.createElement("aside");
  doc.body.appendChild(host);
  const calls = [];
  const state = { beads: [], ribbons: [] };
  const opened = [];
  const panel = mountLibraryPanel(host, {
    doc,
    open: (shape) => { calls.push(shape); return { ok: true, beads: [], ribbons: [] }; },
    getState: () => state,
    onOpened: (info) => opened.push(info),
    ...overrides,
  });
  const entryButton = (id) => host.querySelector(`[data-entry-id=${id}]`);
  return { doc, host, panel, calls, state, opened, entryButton };
}

test("mounts hidden and lists the twelve entries with type, lead-first examples and credit", () => {
  const { host } = setup();
  assert.equal(host.hidden, true);
  const buttons = host.querySelectorAll("button.st-library-panel__entry");
  assert.equal(buttons.length, 12);
  assert.deepEqual(buttons.map((b) => b.getAttribute("data-entry-id")), LIBRARY.map((e) => e.id));
  const first = buttons[0];
  assert.equal(first.querySelector(".st-library-panel__type").textContent, "Quest / Hero's Journey");
  assert.equal(first.querySelector(".st-library-panel__lead").textContent, "Star Wars");
  assert.equal(
    first.querySelector(".st-library-panel__examples").textContent,
    ", The Hobbit, Avatar: The Last Airbender, The Wizard of Oz",
  );
  assert.equal(first.querySelector(".st-library-panel__credit").textContent, LIBRARY[0].credit);
});

test("each card has a one-line summary under it and a hover-over with the credit and every step's note", () => {
  const { host } = setup();
  const first = host.querySelectorAll("button.st-library-panel__entry")[0];
  assert.equal(first.querySelector(".st-library-panel__summary").textContent, "9 elements, from Call To Adventure to The Dénouement.");
  const hover = first.getAttribute("data-tip");
  assert.ok(hover.startsWith(LIBRARY[0].credit + "\n\n1. Call To Adventure — Luke first refuses"));
  assert.ok(hover.includes("6. The Dragon + The Chosen One — Darth Vader serves the Emperor"));
  assert.equal(hover.split("\n").length, 2 + LIBRARY[0].beads.length);
  for (const button of host.querySelectorAll("button.st-library-panel__entry")) assert.ok(button.getAttribute("data-tip"));
});

test("summaryOf and hoverTextOf: unknown element falls back to its id; one-bead and note-less entries", () => {
  const names = new Map([["A", "Alpha"]]);
  assert.equal(summaryOf({ beads: [{ elementId: "A" }] }, names), "One element: Alpha.");
  assert.equal(summaryOf({ beads: [{ elementId: "A" }, { elementId: "Zed" }] }, names), "2 elements, from Alpha to Zed.");
  assert.equal(hoverTextOf({ credit: "c", beads: [{ elementId: "A" }] }, names), "c\n\n1. Alpha");
});

test("examplesLeadFirst moves the lead to the front", () => {
  assert.deepEqual(examplesLeadFirst({ lead: "B", examples: ["A", "B", "C"] }), ["B", "A", "C"]);
});

test("the open-library event shows the panel", () => {
  const { doc, host } = setup();
  doc.dispatchEvent({ type: EVT_OPEN_LIBRARY });
  assert.equal(host.hidden, false);
});

test("choosing an entry opens an editable copy named for the type and closes the panel", () => {
  const { panel, host, calls, opened, entryButton } = setup();
  panel.open();
  entryButton("interactive-choice").click();
  assert.equal(calls.length, 1);
  const entry = LIBRARY.find((e) => e.id === "interactive-choice");
  assert.equal(calls[0].name, entry.title);
  assert.deepEqual(calls[0].beads, entry.beads);
  assert.notEqual(calls[0], entry, "the model receives a copy, not the frozen entry");
  assert.equal(host.hidden, true);
  assert.equal(opened[0].entry.id, "interactive-choice");
});

test("opening through a real store leaves the frozen entry unharmed and gives fresh uids", () => {
  const store = createStoryStore({ eventTarget: { dispatchEvent() {} } });
  const before = JSON.stringify(LIBRARY);
  const { panel, entryButton } = setup({ open: (shape) => store.openStory(shape), getState: () => store.getState() });
  panel.open();
  entryButton("workplace-everyday").click();
  const state = store.getState();
  const entry = LIBRARY.find((e) => e.id === "workplace-everyday");
  assert.equal(state.beads.length, entry.beads.length);
  assert.equal(JSON.stringify(LIBRARY), before);
  assert.ok(Object.isFrozen(entry) && Object.isFrozen(entry.beads[0]));
  state.beads[0].note = "edited";
  assert.notEqual(entry.beads[0].note, "edited");
});

test("guard: a failed open keeps the panel open and says why", () => {
  const { panel, host, entryButton } = setup({
    open: () => ({ ok: false, error: { code: "bad-shape", message: "Nope" } }),
  });
  panel.open();
  entryButton("comedy-satire").click();
  assert.equal(host.hidden, false);
  assert.equal(host.querySelector(".st-library-panel__status").textContent, "Nope");
});

test("unsaved map: asks first; Keep leaves the map alone, Replace opens the copy", () => {
  const { panel, host, calls, state, entryButton } = setup();
  state.beads = [{ uid: "x1", elementId: "H" }];
  panel.open();
  entryButton("quest-heros-journey").click();
  const confirm = host.querySelector(".st-library-panel__confirm");
  assert.equal(confirm.hidden, false);
  assert.equal(confirm.textContent.includes("Replace the map on screen?"), true);
  assert.equal(calls.length, 0, "nothing opened before the answer");

  host.querySelector(".st-library-panel__keep").click();
  assert.equal(confirm.hidden, true);
  assert.equal(calls.length, 0);
  assert.equal(host.hidden, false);

  entryButton("quest-heros-journey").click();
  host.querySelector(".st-library-panel__replace").click();
  assert.equal(calls.length, 1);
  assert.equal(host.hidden, true);
});

test("after a library open the map is clean, so the next open does not ask", () => {
  const { panel, host, calls, state, entryButton } = setup({
    open: (shape) => { state.beads = [{ uid: "n1", elementId: "H" }]; return { ok: true }; },
  });
  panel.open();
  entryButton("quest-heros-journey").click();
  panel.open();
  entryButton("comedy-satire").click();
  assert.equal(host.querySelector(".st-library-panel__confirm").hidden, true);
  assert.equal(host.hidden, true);
  state.beads = [{ uid: "n1", elementId: "H" }, { uid: "n2", elementId: "L" }];
  panel.open();
  entryButton("comedy-satire").click();
  assert.equal(host.querySelector(".st-library-panel__confirm").hidden, false);
  void calls;
});

test("Esc closes the panel; with the question showing, Esc only dismisses the question first", () => {
  const { doc, panel, host, state, entryButton } = setup();
  panel.open();
  pressKey(doc, "Escape");
  assert.equal(host.hidden, true);

  state.beads = [{ uid: "x1", elementId: "H" }];
  panel.open();
  entryButton("quest-heros-journey").click();
  pressKey(doc, "Escape");
  assert.equal(host.hidden, false);
  assert.equal(host.querySelector(".st-library-panel__confirm").hidden, true);
  pressKey(doc, "Escape");
  assert.equal(host.hidden, true);
});

test("Esc does nothing while the panel is closed; the Close button closes and restores focus", () => {
  const { doc, panel, host } = setup();
  const opener = doc.createElement("button");
  doc.body.appendChild(opener);
  opener.focus();
  pressKey(doc, "Escape");
  assert.equal(host.hidden, true);
  panel.open();
  assert.notEqual(doc.activeElement, opener);
  host.querySelector(".st-library-panel__close").click();
  assert.equal(host.hidden, true);
  assert.equal(doc.activeElement, opener);
});
