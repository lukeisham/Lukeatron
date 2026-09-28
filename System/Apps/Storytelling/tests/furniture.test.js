import assert from "node:assert/strict";
import { describe, test } from "node:test";
import * as furniture from "../app/data/furniture.js";

const {
  ABOUT,
  ADDED_ELEMENT_CREDIT,
  CHARACTER_MODIFIERS_LABEL,
  COLUMN_HEADINGS,
  CONNECTORS,
  KEY_CALLOUT,
  OUTLINE_EXAMPLES,
  POSTER_CREDITS,
  POSTER_TITLE,
  POSTER_VIEWBOX,
  ROGUE_CAPTION,
  ROGUE_DETAIL_TEXT,
  SUBTROPE_BOXES,
  TVTROPES_CREDIT,
} = furniture;

const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;

function assertDeepFrozen(value, path) {
  if (value === null || typeof value !== "object") return;
  assert.ok(Object.isFrozen(value), `${path} is not frozen`);
  for (const [key, inner] of Object.entries(value)) assertDeepFrozen(inner, `${path}.${key}`);
}

describe("furniture.js", () => {
  test("imports with every documented export", () => {
    const expected = [
      "ABOUT", "ADDED_ELEMENT_CREDIT", "CHARACTER_MODIFIERS_LABEL", "COLUMN_HEADINGS", "CONNECTORS",
      "KEY_CALLOUT", "OUTLINE_EXAMPLES", "POSTER_CREDITS", "POSTER_TITLE", "POSTER_VIEWBOX",
      "ROGUE_CAPTION", "ROGUE_DETAIL_TEXT", "SUBTROPE_BOXES", "TVTROPES_CREDIT",
    ];
    assert.deepEqual(Object.keys(furniture).sort(), expected);
    assert.deepEqual({ ...POSTER_VIEWBOX }, { width: 1303, height: 1632 });
  });

  test("every heading and label has non-empty text", () => {
    assert.equal(COLUMN_HEADINGS.length, 10);
    for (const heading of COLUMN_HEADINGS) {
      assert.ok(heading.lines.length > 0, heading.id);
      assert.ok(heading.lines.every(isNonEmptyString), heading.id);
    }
    assert.deepEqual([...CHARACTER_MODIFIERS_LABEL.lines], ["Character", "Modifiers"]);
    assert.ok(POSTER_TITLE.runs.every((run) => isNonEmptyString(run.text)));
    assert.equal(POSTER_TITLE.runs.map((run) => run.text).join(" "), POSTER_TITLE.text);
    for (const key of ["identifier", "tropeName", "popularity"]) assert.ok(isNonEmptyString(KEY_CALLOUT[key].text), key);
    assert.equal(KEY_CALLOUT.popularity.popKey, true);
    assert.equal(KEY_CALLOUT.popularity.note.length, 2);
    assert.ok(POSTER_CREDITS.lines.every(isNonEmptyString));
    assert.ok(isNonEmptyString(TVTROPES_CREDIT.text));
    assert.ok(!/http|\.png|logo/i.test(TVTROPES_CREDIT.text));
    for (const text of [ROGUE_CAPTION, ROGUE_DETAIL_TEXT, ADDED_ELEMENT_CREDIT]) assert.ok(isNonEmptyString(text));
    assert.equal(ROGUE_CAPTION, "Rogue — when nothing fits");
  });

  test("subtrope boxes carry all their printed items", () => {
    const [callBox, wallBox] = SUBTROPE_BOXES;
    assert.equal(callBox.items.length, 22);
    assert.ok(callBox.items.every(isNonEmptyString));
    assert.equal(wallBox.columns.length, 4);
    assert.equal(wallBox.columns.flatMap((column) => column.items).length, 15);
  });

  test("outline panel has the five franchise blocks with string chip ids and resolvable links", () => {
    const franchises = OUTLINE_EXAMPLES.franchises;
    assert.deepEqual(franchises.map((franchise) => franchise.id), ["star-wars", "kim-possible", "dilbert", "mass-effect", "avatar"]);
    for (const franchise of franchises) {
      assert.ok(isNonEmptyString(franchise.title), franchise.id);
      assert.ok(franchise.chips.length >= 3, franchise.id);
      const chipIds = franchise.chips.map((chip) => chip.id);
      assert.ok(chipIds.every((id) => typeof id === "string" && id.length > 0), franchise.id);
      assert.equal(new Set(chipIds).size, chipIds.length, `${franchise.id} repeats a chip id`);
      for (const link of franchise.links) {
        assert.ok(chipIds.includes(link.a) && chipIds.includes(link.b), `${franchise.id}: ${link.a}-${link.b}`);
        assert.ok(isNonEmptyString(link.d), `${franchise.id}: ${link.a}-${link.b} has no path`);
      }
    }
  });

  test("connectors are dashed polylines that stay inside the poster", () => {
    assert.equal(CONNECTORS.length, 6);
    for (const connector of CONNECTORS) {
      assert.ok(connector.points.length >= 2, connector.id);
      for (const [x, y] of connector.points) {
        assert.ok(x >= 0 && x <= POSTER_VIEWBOX.width && y >= 0 && y <= POSTER_VIEWBOX.height, connector.id);
      }
      assert.ok(connector.from.tileId && (connector.to.tileId || connector.to.furnitureId), connector.id);
    }
    const boxIds = SUBTROPE_BOXES.map((box) => box.id);
    for (const connector of CONNECTORS) {
      if (connector.to.furnitureId) assert.ok(boxIds.includes(connector.to.furnitureId), connector.id);
    }
  });

  test("About wording has the four statements and no licence claim for the poster", () => {
    assert.equal(ABOUT.statements.length, 4);
    assert.ok(ABOUT.statements.every((statement) => isNonEmptyString(statement.text)));
    assert.ok(ABOUT.statements[0].text.includes(ABOUT.statements[0].italic));
    assert.ok(ABOUT.statements[1].text.includes("CC BY-NC-SA 3.0"));
    assert.ok(ABOUT.licenceNotes[0].text.includes("not recorded"));
  });

  test("every export is deep-frozen", () => {
    for (const [name, value] of Object.entries(furniture)) assertDeepFrozen(value, name);
    assert.throws(() => {
      "use strict";
      COLUMN_HEADINGS[0].lines.push("x");
    }, TypeError);
  });
});
