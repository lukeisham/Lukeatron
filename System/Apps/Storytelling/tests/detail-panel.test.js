import assert from "node:assert/strict";
import { test } from "node:test";
import { EVT_OPEN } from "../app/shared/events.js";
import { elementCopyText, mountDetailPanel, popularityText } from "../app/detail/detail-panel.js";
import { createFakeDocument } from "./helpers/fake-dom-detail.js";

const POSTER = {
  id: "C", name: "Conflict", popularity: 0.04, popText: ".04", group: "structure",
  description: "Opposition of forces.", example: "Luke fights the Empire.",
  sourceUrl: "https://tvtropes.org/pmwiki/pmwiki.php/Main/Conflict",
};
const ADDED = {
  id: "Pro", name: "Prologue", group: "structure", added: true,
  description: "An opening scene.", example: "Inception opens with a dream.",
  sourceUrl: "https://en.wikipedia.org/wiki/Prologue",
};
const ADDED_TV = { ...ADDED, id: "Imr", name: "In Medias Res", popularity: 2.63, popText: "2.6", sourceUrl: "https://tvtropes.org/pmwiki/pmwiki.php/Main/InMediasRes" };
const FIVE_MAN_HERO = { id: "5maH", symbol: "H", name: "The Hero", popularity: 12, popText: "12", group: "heroes", description: "d", example: "e", sourceUrl: "https://example.org/h" };
const ROGUE = { id: "Rg", name: "Rogue element", group: "rogue", rogue: true };
const GROUPS = { structure: "Structure", heroes: "Heroes", rogue: "Rogue element" };
const ROGUE_TEXT = "A rogue element stands in when no element on the table fits exactly. Give each one its own name.";

function setup(extra = {}) {
  const doc = createFakeDocument();
  const host = doc.createElement("aside");
  const calls = { print: [], copy: [] };
  const table = new Map([POSTER, ADDED, ADDED_TV, FIVE_MAN_HERO].map((e) => [e.id, e]));
  const panel = mountDetailPanel(host, {
    doc, lookup: (id) => table.get(id), groups: GROUPS, rogue: ROGUE, rogueText: ROGUE_TEXT,
    print: (...args) => calls.print.push(args),
    copy: async (text) => { calls.copy.push(text); return { ok: true }; },
    ...extra,
  });
  const open = (detail) => doc.dispatchEvent({ type: EVT_OPEN, detail });
  return { doc, host, calls, panel, open };
}

const text = (host, cls) => host.find(cls).textContent;
const shown = (host, cls) => !host.find(cls).hidden;

test("starts hidden and opens on the open event, filling every field for a poster element", () => {
  const { host, open, panel } = setup();
  assert.equal(host.hidden, true);
  open({ elementId: "C" });
  assert.equal(host.hidden, false);
  assert.equal(panel.isOpen(), true);
  const tile = host.find("st-detail__tile");
  assert.equal(tile.textContent, "C");
  assert.ok(tile.classes.has("tile-structure"));
  assert.equal(text(host, "st-detail__name"), "Conflict");
  assert.equal(text(host, "st-detail__popularity-value"), ".04 kilowicks");
  assert.equal(host.find("st-detail__popularity-value").getAttribute("data-tip"), "thousands of links to its page in the TV Tropes wiki");
  assert.equal(text(host, "st-detail__group"), "Structure");
  assert.equal(text(host, "st-detail__description"), "Opposition of forces.");
  assert.equal(text(host, "st-detail__example"), "ExampleLuke fights the Empire.");
  assert.equal(shown(host, "st-detail__story"), false);
  const link = host.find("st-detail__credit-link");
  assert.equal(link.hidden, false);
  assert.equal(link.getAttribute("href"), POSTER.sourceUrl);
  assert.equal(link.getAttribute("rel"), "noopener");
  assert.equal(shown(host, "st-detail__tandem"), false);
});

test("the tile uses el.symbol when present and never sets an inline colour", () => {
  const { host, open } = setup();
  open({ elementId: "5maH" });
  assert.equal(text(host, "st-detail__tile"), "H");
  assert.equal(host.find("st-detail__tile").getAttribute("style"), null);
});

test("an added element with no TV Tropes page: Wikipedia link, no number, no added notice", () => {
  const { host, open } = setup();
  open({ elementId: "Pro" });
  assert.equal(shown(host, "st-detail__popularity"), false);
  assert.ok(!host.textContent.includes("kilowicks"));
  assert.equal(shown(host, "st-detail__credit-link"), true);
  assert.equal(host.find("st-detail__credit-link").getAttribute("href"), ADDED.sourceUrl);
  assert.equal(shown(host, "st-detail__credit-text"), false);
  assert.ok(!host.textContent.includes("Added for this app"));
});

test("an added element with a TV Tropes page shows its number, with the explanation as a hover-over", () => {
  const { host, open } = setup();
  open({ elementId: "Imr" });
  const value = host.find("st-detail__popularity-value");
  assert.equal(shown(host, "st-detail__popularity"), true);
  assert.equal(value.textContent, "2.6 kilowicks");
  assert.equal(value.getAttribute("data-tip"), "thousands of links to its page in the TV Tropes wiki");
  assert.equal(host.find("st-detail__credit-link").getAttribute("href"), ADDED_TV.sourceUrl);
  assert.equal(shown(host, "st-detail__credit-text"), false);
});

test("the popularity explanation is a hover-over, not visible text", () => {
  const { host, open } = setup();
  open({ elementId: "C" });
  assert.ok(!host.textContent.includes("thousands of links"));
  assert.equal(host.find("st-detail__popularity-value").getAttribute("data-tip"), "thousands of links to its page in the TV Tropes wiki");
});

test("a bead note is shown under the example and copied", () => {
  const { host, open, calls, panel } = setup();
  open({ elementId: "C", note: "The hero meets the empire." });
  assert.equal(shown(host, "st-detail__story"), true);
  assert.equal(text(host, "st-detail__story"), "In this storyThe hero meets the empire.");
  return panel.copy().then(() => {
    assert.match(calls.copy[0], /Example: Luke fights the Empire\.\nIn this story: The hero meets the empire\.\nhttps:/);
  });
});

test("opening again without a note clears the earlier note", () => {
  const { host, open } = setup();
  open({ elementId: "C", note: "n" });
  open({ elementId: "Pro" });
  assert.equal(shown(host, "st-detail__story"), false);
});

test("Esc closes, Close closes, and Esc when closed does nothing", () => {
  const { doc, host, open, panel } = setup();
  open({ elementId: "C" });
  doc.dispatch("keydown", { key: "Enter" });
  assert.equal(panel.isOpen(), true);
  doc.dispatch("keydown", { key: "Escape" });
  assert.equal(panel.isOpen(), false);
  assert.equal(host.hidden, true);
  open({ elementId: "C" });
  host.find("st-detail__close").dispatch("click");
  assert.equal(host.hidden, true);
});

test("focus goes to Close on open and returns to the previously focused element on close", () => {
  const { doc, host, open, panel } = setup();
  const tile = doc.createElement("g");
  tile.focus();
  open({ elementId: "C" });
  assert.equal(doc.activeElement, host.find("st-detail__close"));
  panel.close();
  assert.equal(doc.activeElement, tile);
});

test("Print calls setPrintTarget('element', 'colour'); nothing prints while closed", () => {
  const { host, open, calls, panel } = setup();
  host.find("st-detail__print").dispatch("click");
  assert.deepEqual(calls.print, []);
  open({ elementId: "C" });
  host.find("st-detail__print").dispatch("click");
  assert.deepEqual(calls.print, [["element", "colour"]]);
  panel.close();
});

test("Copy sends the exact FR-V5 text and reports the result", async () => {
  const { host, open, calls } = setup();
  open({ elementId: "C" });
  host.find("st-detail__copy").dispatch("click");
  await Promise.resolve();
  await Promise.resolve();
  assert.deepEqual(calls.copy, [
    "C — Conflict\nOpposition of forces.\nExample: Luke fights the Empire.\nhttps://tvtropes.org/pmwiki/pmwiki.php/Main/Conflict",
  ]);
  assert.equal(text(host, "st-detail__status"), "Copied");
});

test("a failed copy says so", async () => {
  const { host, open } = setup({ copy: async () => ({ ok: false }) });
  open({ elementId: "C" });
  await host.find("st-detail__copy").listeners.click[0]();
  assert.match(text(host, "st-detail__status"), /Could not copy/);
});

test("elementCopyText: source link, symbol override, optional parts omitted", () => {
  assert.equal(
    elementCopyText(ADDED),
    `Pro — Prologue\nAn opening scene.\nExample: Inception opens with a dream.\n${ADDED.sourceUrl}`,
  );
  assert.equal(elementCopyText(FIVE_MAN_HERO).split("\n")[0], "H — The Hero");
  assert.equal(elementCopyText({ id: "X", name: "Bare" }), "X — Bare");
});

test("popularityText: as printed, added, rogue", () => {
  assert.equal(popularityText(POSTER), ".04 kilowicks");
  assert.equal(popularityText({ ...POSTER, popText: undefined, popularity: 2 }), "2 kilowicks");
  assert.equal(popularityText(ADDED), null);
  assert.equal(popularityText(ADDED_TV), "2.6 kilowicks");
  assert.equal(popularityText(ROGUE), null);
});

test("the Rogue card shows the explanation and no popularity or credit", () => {
  const { host, open, panel } = setup();
  open({ elementId: "Rg" });
  assert.equal(text(host, "st-detail__name"), "Rogue element");
  assert.equal(text(host, "st-detail__description"), ROGUE_TEXT);
  assert.equal(shown(host, "st-detail__popularity"), false);
  assert.equal(shown(host, "st-detail__credit"), false);
  assert.ok(host.find("st-detail__tile").classes.has("tile-rogue"));
  assert.equal(panel.isOpen(), true);
});

test("a rogue bead opens with its label and note, no popularity", async () => {
  const { host, open, calls, panel } = setup();
  open({ elementId: "Rg", label: "The Trickster", note: "Steals the fire." });
  assert.equal(text(host, "st-detail__name"), "The Trickster");
  assert.equal(shown(host, "st-detail__popularity"), false);
  assert.equal(text(host, "st-detail__story"), "In this storySteals the fire.");
  assert.equal(shown(host, "st-detail__group"), true);
  await panel.copy();
  assert.equal(calls.copy[0], "Rg — The Trickster\nIn this story: Steals the fire.");
});

test("a tandem half shows 'In tandem with <other>'; Copy stays on the element opened", async () => {
  const { host, open, calls, panel } = setup();
  open({ elementId: "C", tandemWith: "Pro" });
  assert.equal(text(host, "st-detail__tandem"), "In tandem with Prologue");
  open({ elementId: "C", tandemWith: "Rg", tandemWithLabel: "The Trickster" });
  assert.equal(text(host, "st-detail__tandem"), "In tandem with The Trickster");
  await panel.copy();
  assert.ok(calls.copy[0].startsWith("C — Conflict"));
  assert.ok(!calls.copy[0].includes("tandem"));
});

test("guards: an unknown id or a malformed request does not open, and warns", () => {
  const { open, panel } = setup();
  const warnings = [];
  const original = console.warn;
  console.warn = (...args) => warnings.push(args.join(" "));
  try {
    open({ elementId: "nope" });
    open({});
    assert.equal(panel.isOpen(), false);
    assert.equal(warnings.length, 2);
  } finally {
    console.warn = original;
  }
});

test("destroy stops the panel listening", () => {
  const { open, panel } = setup();
  panel.destroy();
  open({ elementId: "C" });
  assert.equal(panel.isOpen(), false);
});

test("with real data and default wiring: a poster element, an added one and the Rogue card all open", () => {
  const doc = createFakeDocument();
  const host = doc.createElement("aside");
  const panel = mountDetailPanel(host, { doc });
  assert.equal(panel.open({ elementId: "C" }), true);
  assert.match(text(host, "st-detail__popularity-value"), /kilowicks$/);
  assert.equal(panel.open({ elementId: "Pro" }), true);
  assert.equal(shown(host, "st-detail__credit-text"), false);
  assert.equal(panel.open({ elementId: "Rg" }), true);
  assert.match(text(host, "st-detail__description"), /^A rogue element stands in/);
});
