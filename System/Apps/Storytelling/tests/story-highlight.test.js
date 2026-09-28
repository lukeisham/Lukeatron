import test from "node:test";
import assert from "node:assert/strict";

import { mountStoryHighlight, elementsInStory, badgeFor, IN_STORY_CLASS } from "../app/story/story-highlight.js";
import { layout } from "../app/story/story-layout.js";
import { EVT_STORY_CHANGED } from "../app/shared/events.js";
import { makeDocument, makeTile } from "./helpers/fake-dom-library.js";

const IDS = ["H", "L", "S", "B", "Ch", "Cal"];

/** A diagram host with one tile per id, a highlight mounted on it, and a way to send story changes. */
function setup({ missingBadge = [] } = {}) {
  const doc = makeDocument();
  const host = doc.createElement("div");
  doc.body.appendChild(host);
  const tiles = {};
  for (const id of IDS) {
    tiles[id] = makeTile(doc, id, { withBadge: !missingBadge.includes(id) });
    host.appendChild(tiles[id]);
  }
  const highlight = mountStoryHighlight(host, { eventTarget: doc, getState: () => ({ beads: [], ribbons: [] }) });
  const send = (beads, ribbons = []) => doc.dispatchEvent({ type: EVT_STORY_CHANGED, detail: { beads, ribbons } });
  const marked = () => IDS.filter((id) => tiles[id].classList.contains(IN_STORY_CLASS));
  const badge = (id) => tiles[id].querySelector(".step-badge");
  return { doc, host, tiles, highlight, send, marked, badge };
}

const chain = [
  { uid: "b1", elementId: "H" },
  { uid: "b2", elementId: "L" },
  { uid: "b3", elementId: "S" },
];
const chainRibbons = [["b1", "b2"], ["b2", "b3"]];

test("elementsInStory lists every element, both halves of tandems, never the Rogue card", () => {
  const ids = elementsInStory([
    { uid: "a", elementId: "H", with: "L" },
    { uid: "b", elementId: "Rg", label: "Villain" },
    { uid: "c", elementId: "S", with: "Rg", withLabel: "X" },
  ]);
  assert.deepEqual([...ids].sort(), ["H", "L", "S"]);
});

test("badgeFor gives the lowest step to an element used in several beads", () => {
  const beads = [
    { uid: "b1", elementId: "H" },
    { uid: "b2", elementId: "L", with: "S" },
    { uid: "b3", elementId: "H" },
  ];
  const result = layout(beads, [["b1", "b2"], ["b2", "b3"]]);
  assert.deepEqual(badgeFor(beads, result), { H: 1, L: 2, S: 2 });
});

test("badgeFor skips beads the layout does not know and the Rogue card", () => {
  const beads = [{ uid: "z", elementId: "H" }, { uid: "r", elementId: "Rg" }];
  assert.deepEqual(badgeFor(beads, { stepNumbers: { r: 1 } }), {});
});

test("marks exactly the elements in the story and fills their step numbers", () => {
  const { send, marked, badge } = setup();
  send(chain, chainRibbons);
  assert.deepEqual(marked(), ["H", "L", "S"]);
  assert.equal(badge("H").textContent, "1");
  assert.equal(badge("L").textContent, "2");
  assert.equal(badge("S").textContent, "3");
  assert.equal(badge("H").hasAttribute("hidden"), false);
  assert.equal(badge("B").hasAttribute("hidden"), true);
  assert.equal(badge("B").textContent, "");
});

test("a tandem marks both halves with the same step", () => {
  const { send, marked, badge } = setup();
  send([{ uid: "b1", elementId: "H", with: "L" }, { uid: "b2", elementId: "S" }], [["b1", "b2"]]);
  assert.deepEqual(marked(), ["H", "L", "S"]);
  assert.equal(badge("H").textContent, "1");
  assert.equal(badge("L").textContent, "1");
  assert.equal(badge("S").textContent, "2");
});

test("an element used in several beads shows the lowest step", () => {
  const { send, badge } = setup();
  send(
    [{ uid: "b1", elementId: "H" }, { uid: "b2", elementId: "L" }, { uid: "b3", elementId: "H" }],
    [["b1", "b2"], ["b2", "b3"]],
  );
  assert.equal(badge("H").textContent, "1");
});

test("editing the story updates the marks; an empty story clears them", () => {
  const { send, marked, badge } = setup();
  send(chain, chainRibbons);
  send([chain[0]], []);
  assert.deepEqual(marked(), ["H"]);
  assert.equal(badge("L").hasAttribute("hidden"), true);
  send([], []);
  assert.deepEqual(marked(), []);
  assert.equal(badge("H").textContent, "");
  assert.equal(badge("H").hasAttribute("hidden"), true);
});

test("it changes only the mark: the tile keeps its attributes and its other classes", () => {
  const { send, tiles } = setup();
  send(chain, chainRibbons);
  assert.equal(tiles.H.getAttribute("data-element-id"), "H");
  assert.equal(tiles.H.classList.contains("tile"), true);
  assert.equal(tiles.H.classList.contains("tile-test"), true);
  assert.equal(tiles.H.hasAttribute("fill"), false);
});

test("the Rogue card is never marked even if a tile for it exists", () => {
  const { doc, host, send } = setup();
  const rogue = makeTile(doc, "Rg");
  host.appendChild(rogue);
  send([{ uid: "b1", elementId: "Rg", label: "Villain" }], []);
  assert.equal(rogue.classList.contains(IN_STORY_CLASS), false);
});

test("guard: a tile with no badge node is warned about and skipped, still marked", (t) => {
  const warnings = [];
  t.mock.method(console, "warn", (message) => warnings.push(message));
  const { send, marked, badge } = setup({ missingBadge: ["L"] });
  send(chain, chainRibbons);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /"L"/);
  assert.deepEqual(marked(), ["H", "L", "S"]);
  assert.equal(badge("L"), null);
  assert.equal(badge("H").textContent, "1");
  send(chain, chainRibbons);
  assert.equal(warnings.length, 1, "warns once per tile, not on every change");
});

test("mount applies the current story, and refresh re-applies after a redraw", () => {
  const doc = makeDocument();
  const host = doc.createElement("div");
  doc.body.appendChild(host);
  const highlight = mountStoryHighlight(host, {
    eventTarget: doc,
    getState: () => ({ beads: chain, ribbons: chainRibbons }),
  });
  const redrawn = makeTile(doc, "L");
  host.appendChild(redrawn);
  assert.equal(redrawn.classList.contains(IN_STORY_CLASS), false);
  highlight.refresh();
  assert.equal(redrawn.classList.contains(IN_STORY_CLASS), true);
  assert.equal(redrawn.querySelector(".step-badge").textContent, "2");
});

test("destroy stops listening", () => {
  const { highlight, send, marked } = setup();
  highlight.destroy();
  send(chain, chainRibbons);
  assert.deepEqual(marked(), []);
});
