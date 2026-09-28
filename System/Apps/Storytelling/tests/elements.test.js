import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { GROUPS, CATEGORIES, ELEMENTS, ROGUE, MAX_LABEL } from "../app/data/elements.js";

const posterElements = ELEMENTS.filter((el) => el.added !== true);
const addedElements = ELEMENTS.filter((el) => el.added === true);
const words = (text) => text.trim().split(/\s+/).length;
const isNonEmptyString = (value) => typeof value === "string" && value.trim() !== "";

test("counts: 217 elements, 181 poster, 36 added", () => {
  assert.equal(ELEMENTS.length, 217);
  assert.equal(posterElements.length, 181);
  assert.equal(addedElements.length, 36);
});

test("ids are unique", () => {
  const ids = ELEMENTS.map((el) => el.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("every element has the fields its kind requires", () => {
  for (const el of ELEMENTS) {
    for (const field of ["id", "name", "group", "category", "description", "example", "sourceUrl"]) {
      assert.ok(isNonEmptyString(el[field]), `${el.id}: ${field} missing or empty`);
    }
  }
  for (const el of posterElements) {
    assert.equal(typeof el.popularity, "number", `${el.id}: popularity`);
    assert.ok(isNonEmptyString(el.popText), `${el.id}: popText`);
    assert.equal(Number(el.popText), el.popularity, `${el.id}: popText disagrees with popularity`);
    assert.equal("order" in el, false, `${el.id}: poster element has order`);
  }
  for (const el of addedElements) {
    assert.equal("popularity" in el, false, `${el.id}: added element has popularity`);
    assert.equal("popText" in el, false, `${el.id}: added element has popText`);
    assert.equal(typeof el.order, "number", `${el.id}: order`);
  }
});

test("every element has a position: col/row, or x/y with a parent", () => {
  for (const el of posterElements) {
    if (el.parent === undefined) {
      assert.ok(Number.isInteger(el.col) && Number.isInteger(el.row), `${el.id}: col/row`);
    } else {
      assert.ok(Number.isFinite(el.x) && Number.isFinite(el.y), `${el.id}: x/y`);
    }
  }
});

test("every group is in GROUPS and every category is a CATEGORIES key", () => {
  const categoryKeys = new Set(CATEGORIES.map((c) => c.key));
  for (const el of ELEMENTS) {
    assert.ok(el.group in GROUPS, `${el.id}: unknown group ${el.group}`);
    assert.ok(categoryKeys.has(el.category), `${el.id}: unknown category ${el.category}`);
  }
  for (const key of categoryKeys) assert.ok(key in GROUPS, `category ${key} not in GROUPS`);
});

test("category rules (lists spec FR-K1) including the edge tiles", () => {
  const byId = new Map(ELEMENTS.map((el) => [el.id, el]));
  assert.equal(byId.get("Cal").category, "setting");
  assert.equal(byId.get("5ma").category, "heroes");
  assert.equal(byId.get("4wl").category, "metatropes");
  const paler = ELEMENTS.filter((el) => el.group === "villains2");
  assert.equal(paler.length, 4);
  for (const el of paler) assert.equal(el.category, "villains");
  for (const el of ELEMENTS.filter((e) => e.parent === "5ma")) assert.equal(el.category, "heroes");
  for (const el of ELEMENTS) {
    if (el.group !== "villains2" && el.group !== "highlight") assert.equal(el.category, el.group, el.id);
  }
});

test("categories are the twelve in order", () => {
  assert.deepEqual(
    CATEGORIES.map((c) => c.key),
    ["structure", "setting", "storymod", "plotdev", "genre", "heroes", "charmod", "archetypes", "villains", "metatropes", "production", "fandom"],
  );
});

test("exactly five sub-tiles have parent 5ma, and the Hero's id is 5maH with symbol H", () => {
  const subTiles = ELEMENTS.filter((el) => el.parent === "5ma");
  assert.equal(subTiles.length, 5);
  assert.deepEqual(subTiles.map((el) => el.id), ["5maH", "L", "S", "B", "Ch"]);
  assert.equal(subTiles[0].symbol, "H");
  assert.equal(ELEMENTS.filter((el) => el.symbol !== undefined).length, 1);
});

test("the rogue card is separate from ELEMENTS", () => {
  assert.deepEqual({ ...ROGUE }, { id: "Rg", name: "Rogue element", group: "rogue", rogue: true });
  assert.equal(ELEMENTS.some((el) => el.id === ROGUE.id), false);
  assert.ok(ROGUE.group in GROUPS);
  assert.equal(MAX_LABEL, 24);
});

test("word limits: description <= 25, example <= 20", () => {
  for (const el of ELEMENTS) {
    assert.ok(words(el.description) <= 25, `${el.id}: description has ${words(el.description)} words`);
    assert.ok(words(el.example) <= 20, `${el.id}: example has ${words(el.example)} words`);
  }
});

test("sourceUrl begins https://tvtropes.org/", () => {
  for (const el of ELEMENTS) assert.ok(el.sourceUrl.startsWith("https://tvtropes.org/"), el.id);
});

test("poster elements come first within a category, then added ones by order", () => {
  for (const { key } of CATEGORIES) {
    const inCategory = ELEMENTS.filter((el) => el.category === key);
    const firstAdded = inCategory.findIndex((el) => el.added === true);
    if (firstAdded === -1) continue;
    assert.ok(inCategory.slice(firstAdded).every((el) => el.added === true), `${key}: poster element after an added one`);
  }
  const genre = ELEMENTS.filter((el) => el.category === "genre");
  assert.equal(genre.length, 24);
});

test("the data is deep-frozen", () => {
  assert.ok(Object.isFrozen(ELEMENTS) && Object.isFrozen(ELEMENTS[0]));
  assert.ok(Object.isFrozen(CATEGORIES) && Object.isFrozen(CATEGORIES[0]));
  assert.ok(Object.isFrozen(GROUPS) && Object.isFrozen(ROGUE));
});

test("no two tiles share a cell in either layout", { skip: !existsSync(new URL("../app/data/layout.js", import.meta.url)) }, async () => {
  const { checkLayout } = await import("../app/data/layout.js");
  for (const layoutName of ["original", "revised"]) {
    assert.deepEqual(checkLayout(ELEMENTS, layoutName), [], `${layoutName} layout problems`);
  }
});
