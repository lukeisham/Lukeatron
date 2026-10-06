import { test } from "node:test";
import assert from "node:assert/strict";
import { buildDiagramSvg, drawDiagram, estimateSvgTextWidth, fitTileName } from "../app/diagram/diagram-svg.js";
import { ELEMENTS, GROUPS, ROGUE } from "../app/data/elements.js";
import { LAYOUT, tileRect, viewBoxFor } from "../app/data/layout.js";
import { CONNECTORS, ROGUE_CAPTION, KEY_CALLOUT } from "../app/data/furniture.js";
import { makeFakeSvgDocument } from "./helpers/fake-svg-dom.js";

const doc = makeFakeSvgDocument();
const revised = buildDiagramSvg(doc, "revised");
const original = buildDiagramSvg(doc, "original");

const elementTiles = (svg) => svg.querySelectorAll("g.tile").filter((g) => g.getAttribute("data-element-id") !== "Rg");
const tileById = (svg, id) => svg.querySelector(`g.tile[data-element-id="${id}"]`);
/** Drawn tile edges are snapped to an eighth of a unit (see snappedRect), so compare to layout within an eighth (each edge moves at most a sixteenth, so a width up to an eighth). */
const EDGE_TOLERANCE = 1 / 8 + 1e-9;
const assertNear = (actual, expected, message) => {
  assert.equal(actual.length, expected.length, message);
  actual.forEach((value, index) => assert.ok(Math.abs(value - expected[index]) <= EDGE_TOLERANCE, `${message}: ${actual} vs ${expected}`));
};
const asList = (r) => [r.x, r.y, r.w, r.h];
const rectOf = (tile) => {
  const rect = tile.querySelector("rect.tile-rect");
  return { x: Number(rect.getAttribute("x")), y: Number(rect.getAttribute("y")), w: Number(rect.getAttribute("width")), h: Number(rect.getAttribute("height")) };
};

test("uses createElementNS with the SVG namespace only", () => {
  assert.ok(doc.createdWithNamespace.length > 0);
  assert.ok(doc.createdWithNamespace.every((ns) => ns === "http://www.w3.org/2000/svg"));
});

test("root svg carries viewBox, aspect ratio, pop switch and label", () => {
  assert.equal(revised.tagName, "svg");
  assert.equal(revised.getAttribute("viewBox"), "0 0 1489.3 1632");
  assert.equal(original.getAttribute("viewBox"), "0 0 1303 1632");
  assert.equal(revised.getAttribute("viewBox"), viewBoxFor("revised").attr);
  assert.equal(revised.getAttribute("preserveAspectRatio"), "xMidYMid meet");
  assert.equal(revised.getAttribute("data-pop"), "on");
  assert.ok(revised.getAttribute("aria-label"));
  assert.ok(revised.getAttribute("role"));
});

test("layers are in painter's order and the interaction layer is empty", () => {
  for (const svg of [revised, original]) {
    const order = svg.children.map((child) => child.classes.filter((c) => c !== "layer")[0]);
    assert.deepEqual(order, ["layer-furniture", "layer-tiles", "layer-connectors", "interaction-layer"]);
    assert.equal(svg.querySelector(".interaction-layer").children.length, 0);
  }
});

test("217 element tiles in revised, 181 in original, unique ids, rects equal tileRect", () => {
  assert.equal(elementTiles(revised).length, 217);
  assert.equal(elementTiles(original).length, 181);
  for (const [svg, name] of [[revised, "revised"], [original, "original"]]) {
    const ids = elementTiles(svg).map((g) => g.getAttribute("data-element-id"));
    assert.equal(new Set(ids).size, ids.length);
    for (const element of ELEMENTS) {
      const expected = tileRect(element, name);
      const tile = tileById(svg, element.id);
      if (expected === null) assert.equal(tile, null, `${element.id} must not be drawn in ${name}`);
      else assertNear(asList(rectOf(tile)), asList(expected), `${element.id} rect in ${name}`);
    }
  }
});

test("every tile has tabindex, aria-label, symbol, name, hidden step badge and a known group class", () => {
  for (const tile of elementTiles(revised)) {
    const id = tile.getAttribute("data-element-id");
    const element = ELEMENTS.find((candidate) => candidate.id === id);
    assert.equal(tile.getAttribute("tabindex"), "0");
    assert.equal(tile.getAttribute("aria-label"), element.name);
    assert.equal(tile.querySelector("text.sym").textContent, element.symbol ?? element.id);
    assert.equal(tile.querySelector("text.nm").textContent, element.name);
    assert.equal(tile.querySelectorAll("text.step-badge").length, 1);
    assert.equal(tile.querySelector("text.step-badge").textContent, "");
    const groupClass = tile.classes.find((c) => c.startsWith("tile-"));
    assert.ok(Object.hasOwn(GROUPS, groupClass.slice(5)), `${id}: ${groupClass}`);
    assert.equal(groupClass, `tile-${element.group}`);
  }
});

test("colour is never inline on a tile (SVG-5, FR-D9)", () => {
  for (const svg of [revised, original]) {
    for (const tile of svg.querySelectorAll("g.tile")) {
      for (const node of [tile, ...tile.querySelectorAll("rect"), ...tile.querySelectorAll("text")]) {
        assert.equal(node.hasAttribute("fill"), false);
        assert.equal(node.hasAttribute("style"), false);
      }
    }
  }
});

test("the Five Man Band sub-tiles are placed by tileRect and H shows its symbol (AC-D5)", () => {
  const hero = tileById(revised, "5maH");
  assert.equal(hero.querySelector("text.sym").textContent, "H");
  assertNear(asList(rectOf(hero)), asList(tileRect(ELEMENTS.find((e) => e.id === "5maH"), "revised")), "5maH");
  assert.notEqual(tileById(revised, "H"), null, "the grid Hero H is a separate tile");
});

test("popularity text is on all 181 poster tiles as printed, on added tiles that have a TV Tropes number, absent on the rest and on rogue (AC-D7)", () => {
  const posterTiles = elementTiles(revised).filter((t) => !t.classes.includes("is-added"));
  assert.equal(posterTiles.length, 181);
  for (const tile of posterTiles) {
    const element = ELEMENTS.find((e) => e.id === tile.getAttribute("data-element-id"));
    const pops = tile.querySelectorAll("text.pop");
    assert.equal(pops.length, 1);
    assert.equal(pops[0].textContent, element.popText);
  }
  for (const tile of elementTiles(revised).filter((t) => t.classes.includes("is-added"))) {
    const element = ELEMENTS.find((e) => e.id === tile.getAttribute("data-element-id"));
    const pops = tile.querySelectorAll("text.pop");
    assert.equal(pops.length, element.popText === undefined ? 0 : 1, element.id);
    if (pops.length) assert.equal(pops[0].textContent, element.popText);
  }
  assert.equal(tileById(revised, "Rg").querySelectorAll("text.pop").length, 0);
  assert.equal(elementTiles(original).every((t) => t.querySelectorAll("text.pop").length === 1), true);
});

test("the Ae key's popularity row and its badge carry pop-key; the other rows do not", () => {
  const key = revised.querySelector("g.key-callout");
  const popKeyed = key.querySelectorAll(".pop-key");
  assert.ok(popKeyed.some((n) => n.textContent === KEY_CALLOUT.popularity.text));
  assert.ok(popKeyed.some((n) => n.tagName === "circle"));
  assert.equal(popKeyed.filter((n) => n.classes.includes("key-note")).length, 2);
  const identifier = key.querySelectorAll("text.key-label").find((n) => n.textContent === "Identifier");
  assert.equal(identifier.classes.includes("pop-key"), false);
});

test("exactly 36 tiles are is-added in revised, none in original (AC-D6, FR-D12)", () => {
  const added = elementTiles(revised).filter((t) => t.classes.includes("is-added"));
  assert.equal(added.length, 36);
  for (const tile of added) assert.equal(tile.querySelector("title"), null, "no hover text on an added tile");
  assert.equal(original.querySelectorAll(".is-added").length, 0);
});

test("one Rogue card in revised at x=29,y=1125, none in original (AC-D8, FR-D14)", () => {
  const cards = revised.querySelectorAll("g.rogue");
  assert.equal(cards.length, 1);
  assert.equal(cards[0].getAttribute("data-element-id"), ROGUE.id);
  assert.equal(cards[0].getAttribute("tabindex"), "0");
  assert.deepEqual(rectOf(cards[0]), { x: 29, y: 1125, w: 62.1, h: 75 });
  assert.equal(revised.querySelector("text.rogue-caption").textContent.replace(/\s+/g, " "), ROGUE_CAPTION);
  assert.equal(original.querySelectorAll("g.rogue").length, 0);
  assert.equal(original.querySelectorAll("text.rogue-caption").length, 0);
});

test("no two tiles overlap in either layout, and the Rogue card is clear of them", () => {
  for (const svg of [revised, original]) {
    const rects = svg.querySelectorAll("g.tile").map((t) => rectOf(t));
    for (let i = 0; i < rects.length; i += 1) {
      for (let j = i + 1; j < rects.length; j += 1) {
        const a = rects[i];
        const b = rects[j];
        const across = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
        const down = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
        assert.ok(!(across > 0.5 && down > 0.5), `tiles ${i} and ${j} overlap`);
      }
    }
  }
});

test("every tile's name fits: at most 3 lines, each within the tile or compressed to fit (AC-D3)", () => {
  const usable = LAYOUT.geometry.cellWidth - 6;
  for (const element of [...ELEMENTS, ROGUE]) {
    const fit = fitTileName(element.name, usable);
    assert.ok(fit.lines.length >= 1 && fit.lines.length <= 3, `${element.name}: ${fit.lines.length} lines`);
    assert.ok(fit.fontSize >= 6.5 && fit.fontSize <= 8);
    for (const line of fit.lines) assert.ok(line.width <= usable + 1e-9, `${element.name}: "${line.text}"`);
    for (const line of fit.lines.filter((l) => !l.compressed)) assert.ok(estimateSvgTextWidth(line.text, fit.fontSize) <= usable);
  }
  const tspans = tileById(revised, "Ae").querySelectorAll("text.nm tspan");
  assert.equal(tspans.length, 1);
});

test("name text keeps the name intact across wrapped lines", () => {
  const name = "Sliding Scale of Idealism vs. Cynicism";
  const tile = elementTiles(revised).find((t) => t.querySelector("text.nm").textContent === name);
  assert.ok(tile);
  assert.ok(tile.querySelectorAll("text.nm tspan").length <= 3);
});

test("furniture: title, headings anchored to revised blocks, label, subtrope boxes, credits, panel", () => {
  const furniture = revised.querySelector(".layer-furniture");
  assert.equal(furniture.querySelectorAll("text.title-run").map((n) => n.textContent).join(" "), "The Periodic Table of Storytelling");
  assert.equal(furniture.querySelector("g.furniture-title").getAttribute("transform"), "translate(-746 0)");
  const metatropes = furniture.querySelectorAll("text.col-heading").find((n) => n.getAttribute("data-heading") === "metatropes");
  assert.equal(Number(metatropes.getAttribute("x")), 215.3);
  assert.ok(furniture.querySelectorAll("text.col-heading").some((n) => n.textContent === "Genre"));
  assert.equal(original.querySelectorAll("text.col-heading").some((n) => n.textContent === "Genre"), false);
  assert.equal(furniture.querySelectorAll("text.char-mod-text").map((n) => n.textContent).join("|"), "Character|Modifiers");
  assert.equal(furniture.querySelectorAll("g.subtrope-box").length, 2);
  assert.equal(furniture.querySelectorAll("text.subtrope-item").length, 22 + 15);
  assert.equal(furniture.querySelector("g.poster-credits"), null);
  assert.equal(furniture.querySelector("g.outline-panel"), null);
  assert.equal(furniture.querySelector("g.tvtropes-credit"), null);
});

test("original furniture sits at poster coordinates (no translate anywhere)", () => {
  assert.equal(original.querySelectorAll("[transform]").length, 0);
  const lines = original.querySelectorAll("line.connector");
  assert.equal(lines.length, CONNECTORS.length);
  lines.forEach((line, index) => {
    assert.deepEqual([line.getAttribute("x1"), line.getAttribute("y1")].map(Number), CONNECTORS[index].points[0]);
    assert.deepEqual([line.getAttribute("x2"), line.getAttribute("y2")].map(Number), CONNECTORS[index].points[1]);
  });
});

test("revised connectors are re-anchored to the current tile corners (mirrored)", () => {
  const byId = (id) => revised.querySelector(`line.connector[data-connector-id="${id}"]`);
  const cal = rectOf(tileById(revised, "Cal"));
  const top = byId("cal-to-call-box-top");
  assertNear([Number(top.getAttribute("x1")), Number(top.getAttribute("y1"))], [cal.x + cal.w, cal.y], "Cal corner");
  const band = byId("5ma-to-band-right");
  const chick = rectOf(tileById(revised, "Ch"));
  assertNear([Number(band.getAttribute("x2")), Number(band.getAttribute("y2"))], [chick.x, chick.y], "Ch corner");
  assert.equal(revised.querySelectorAll("line.connector").length, 6);
  for (const line of revised.querySelectorAll("line.connector")) {
    for (const name of ["x1", "y1", "x2", "y2"]) assert.ok(Number.isFinite(Number(line.getAttribute(name))));
    assert.equal(line.hasAttribute("fill"), false);
  }
});

test("revised furniture never overlaps a tile", () => {
  const tiles = revised.querySelectorAll("g.tile").map((t) => rectOf(t));
  const overlaps = (a, b) => Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 0.5 && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 0.5;
  const translateOf = (group) => {
    const match = /translate\((\S+) (\S+)\)/.exec(group.getAttribute("transform") ?? "");
    return match ? [Number(match[1]), Number(match[2])] : [0, 0];
  };
  const boxes = [
    ...revised.querySelectorAll("g.subtrope-box").map((g) => ({ g, r: g.querySelector("rect.subtrope-rect") })),
    { g: revised.querySelector("g.key-callout"), r: revised.querySelector("rect.key-box") },
  ];
  for (const { g, r } of boxes) {
    const [dx, dy] = translateOf(g);
    const box = { x: Number(r.getAttribute("x")) + dx, y: Number(r.getAttribute("y")) + dy, w: Number(r.getAttribute("width")), h: Number(r.getAttribute("height")) };
    for (const tile of tiles) assert.equal(overlaps(box, tile), false, `${g.classes.join(".")} overlaps a tile`);
  }
});

test("drawDiagram clears the host, appends one svg and returns it; default is revised", () => {
  const host = doc.host();
  host.append(doc.createElement("p"));
  const first = drawDiagram(host);
  assert.equal(host.children.length, 1);
  assert.equal(host.children[0], first);
  assert.equal(first.getAttribute("data-layout"), "revised");
  const second = drawDiagram(host, "original");
  assert.equal(host.children.length, 1);
  assert.equal(host.children[0], second);
  assert.equal(second.getAttribute("viewBox"), "0 0 1303 1632");
});

test("guards: a bad layout name and a document without createElementNS both throw", () => {
  assert.throws(() => buildDiagramSvg(doc, "sideways"), /layoutName/);
  assert.throws(() => buildDiagramSvg({}, "revised"), /createElementNS/);
});

test("injectable data: a small element set draws only those tiles", () => {
  const sample = ELEMENTS.filter((e) => ["C", "Ae", "Pro"].includes(e.id));
  const originalWarn = console.warn;
  const warnings = [];
  console.warn = (message) => warnings.push(message);
  let svg;
  try {
    svg = buildDiagramSvg(doc, "revised", { ELEMENTS: sample });
  } finally {
    console.warn = originalWarn;
  }
  assert.deepEqual(elementTiles(svg).map((t) => t.getAttribute("data-element-id")), sample.map((e) => e.id));
  assert.ok(warnings.some((message) => message.includes("cal-to-call-box-top")), "connectors to absent tiles warn instead of failing silently");
  assert.equal(svg.querySelectorAll("line.connector").length, 0);
});

test("subtrope boxes contain all their text, in both layouts", () => {
  for (const svg of [original, revised]) {
    for (const group of svg.querySelectorAll("g.subtrope-box")) {
      const rect = group.querySelector("rect.subtrope-rect");
      const r = { x: Number(rect.getAttribute("x")), y: Number(rect.getAttribute("y")), w: Number(rect.getAttribute("width")), h: Number(rect.getAttribute("height")) };
      for (const node of group.querySelectorAll("text")) {
        const size = Number(node.getAttribute("font-size"));
        const right = Number(node.getAttribute("x")) + estimateSvgTextWidth(node.textContent, size);
        assert.ok(right <= r.x + r.w, `${node.textContent} runs past its box`);
        assert.ok(Number(node.getAttribute("y")) <= r.y + r.h, `${node.textContent} falls below its box`);
      }
    }
  }
});

test("shared tile edges are bit-identical, so a browser rounds both the same way", () => {
  const rects = revised.querySelectorAll("g.tile").filter((t) => t.getAttribute("data-element-id") !== "Rg").map((t) => rectOf(t));
  let shared = 0;
  for (const a of rects) {
    for (const b of rects) {
      const overlapY = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      const gap = b.x - (a.x + a.w);
      if (overlapY > 0.5 && Math.abs(gap) < 0.01) { shared += 1; assert.equal(a.x + a.w, b.x); }
    }
  }
  assert.ok(shared > 150, `only ${shared} shared vertical edges found`);
});
