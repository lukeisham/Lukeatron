import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import {
  ADDED_PLACEMENT,
  LAYOUT,
  ORIGINAL_BLOCK_ORDER,
  POSTER_TO_REVISED,
  REVISED_BLOCK_ORDER,
  blockOf,
  blockSpan,
  checkLayout,
  tileRect,
  viewBoxFor,
} from "../app/data/layout.js";

const ROOT = new URL("../", import.meta.url);
const readJson = (path) => JSON.parse(readFileSync(new URL(path, ROOT), "utf8"));

/** The first-pass transcription is a stand-in: rename the sub-tile "H" to "5maH" as BUILD-NOTES decides. */
function loadPoster() {
  return readJson("reference/elements-pass1.json").elements.map((element) =>
    element.parent === "5ma" && element.id === "H" ? { ...element, id: "5maH", symbol: "H" } : element,
  );
}
const loadAdded = () => readJson("reference/work/added-elements.json").elements;

const poster = loadPoster();
const added = loadAdded();
const all = [...poster, ...added];

const close = (actual, expected, message) =>
  assert.ok(Math.abs(actual - expected) < 0.01, `${message ?? ""} expected ${expected}, got ${actual}`);

const cellKey = (rect) => `${rect.x}|${rect.y}`;

describe("fixtures", () => {
  test("181 poster and 36 added elements with unique ids", () => {
    assert.equal(poster.length, 181);
    assert.equal(added.length, 36);
    assert.equal(new Set(all.map((el) => el.id)).size, 217);
  });
});

describe("POSTER_TO_REVISED", () => {
  // The spec calls this "a permutation of 0-19", but its values run to 22: it is an injection of the
  // 20 poster columns into 23 revised columns, and the three unused columns are exactly the added blocks'.
  test("maps the 20 poster columns to 20 distinct revised columns within 0-22", () => {
    assert.equal(POSTER_TO_REVISED.length, 20);
    assert.equal(new Set(POSTER_TO_REVISED).size, 20);
    assert.ok(POSTER_TO_REVISED.every((col) => Number.isInteger(col) && col >= 0 && col <= 22));
  });

  test("the revised columns it leaves free are the added blocks' own: 16, 17 (genre) and 21 (structure B)", () => {
    const free = Array.from({ length: 23 }, (_, i) => i).filter((col) => !POSTER_TO_REVISED.includes(col));
    assert.deepEqual(free, [16, 17, 21]);
  });

  test("is the permutation FR-D11 gives", () => {
    assert.deepEqual([...POSTER_TO_REVISED], [22, 20, 19, 18, 15, 14, 13, 5, 4, 12, 11, 10, 9, 8, 7, 6, 3, 2, 1, 0]);
  });
});

describe("block order", () => {
  test("REVISED_BLOCK_ORDER is the spec's left-to-right order", () => {
    assert.deepEqual([...REVISED_BLOCK_ORDER], [
      "fandom", "production", "metatropes", "charmod", "villains", "archetypes", "heroes",
      "genre", "plotdev", "storymod", "setting", "structureB", "structureA",
    ]);
  });

  test("column widths are 1,1,2,2,4,3,3,2,1,1,1,1,1 and add to 23", () => {
    const widths = REVISED_BLOCK_ORDER.map((block) => blockSpan(block, "revised").columns);
    assert.deepEqual(widths, [1, 1, 2, 2, 4, 3, 3, 2, 1, 1, 1, 1, 1]);
    assert.equal(widths.reduce((a, b) => a + b, 0), 23);
  });

  test("blocks abut with no gap and no overlap", () => {
    let next = 0;
    for (const block of REVISED_BLOCK_ORDER) {
      const span = blockSpan(block, "revised");
      assert.equal(span.firstCol, next, `${block} starts where the previous block ended`);
      next = span.lastCol + 1;
    }
    assert.equal(next, 23);
  });

  test("Character modifiers sits directly between Metatropes and Villains", () => {
    const at = REVISED_BLOCK_ORDER.indexOf("charmod");
    assert.equal(REVISED_BLOCK_ORDER[at - 1], "metatropes");
    assert.equal(REVISED_BLOCK_ORDER[at + 1], "villains");
    assert.equal(blockSpan("charmod", "revised").firstCol, 4);
    assert.equal(blockSpan("charmod", "revised").lastCol, 5);
  });

  test("the right-hand block, Genre to Structure, is seven columns", () => {
    const first = blockSpan("genre", "revised").firstCol;
    const last = blockSpan("structureA", "revised").lastCol;
    assert.equal(last - first + 1, 7);
    assert.deepEqual(REVISED_BLOCK_ORDER.slice(REVISED_BLOCK_ORDER.indexOf("genre")),
      ["genre", "plotdev", "storymod", "setting", "structureB", "structureA"]);
  });

  test("original order is the poster's; genre and structureB do not exist there", () => {
    assert.deepEqual([...ORIGINAL_BLOCK_ORDER], [
      "structureA", "setting", "storymod", "plotdev", "heroes", "charmod",
      "archetypes", "villains", "metatropes", "production", "fandom",
    ]);
    assert.equal(blockSpan("genre", "original"), null);
    assert.equal(blockSpan("structureB", "original"), null);
  });

  test("multi-column blocks are mirrored: revised columns fall as poster columns rise", () => {
    for (const [first, last] of [[4, 6], [7, 8], [9, 11], [12, 15], [16, 17]]) {
      for (let col = first; col < last; col += 1) {
        assert.equal(POSTER_TO_REVISED[col] - 1, POSTER_TO_REVISED[col + 1], `poster columns ${col},${col + 1}`);
      }
    }
  });
});

describe("no shared cells (AC-D5)", () => {
  for (const layoutName of ["original", "revised"]) {
    test(`no two tiles share a cell or overlap in ${layoutName}`, () => {
      const drawn = all.filter((el) => layoutName === "revised" || el.added !== true);
      const rects = drawn.map((el) => ({ id: el.id, rect: tileRect(el, layoutName) }));
      assert.equal(rects.length, layoutName === "revised" ? 217 : 181);
      assert.equal(new Set(rects.map((r) => cellKey(r.rect))).size, rects.length, "distinct origins");
      for (let i = 0; i < rects.length; i += 1) {
        for (let j = i + 1; j < rects.length; j += 1) {
          const a = rects[i].rect;
          const b = rects[j].rect;
          const across = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
          const down = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
          assert.ok(!(across > 0.5 && down > 0.5), `${rects[i].id} overlaps ${rects[j].id}`);
        }
      }
    });
  }

  test("every tile lies inside its viewBox", () => {
    for (const layoutName of ["original", "revised"]) {
      const box = viewBoxFor(layoutName);
      for (const el of all) {
        const rect = tileRect(el, layoutName);
        if (!rect) continue;
        assert.ok(rect.x >= 0 && rect.y >= 0 && rect.x + rect.w <= box.w && rect.y + rect.h <= box.h, `${el.id} in ${layoutName}`);
      }
    }
  });
});

describe("every poster element exactly once", () => {
  test("each of the 181 gets one rectangle, one block, in the revised layout", () => {
    const seen = new Set();
    for (const el of poster) {
      assert.ok(!seen.has(el.id), `${el.id} is not repeated`);
      seen.add(el.id);
      assert.ok(tileRect(el, "revised"));
      assert.ok(REVISED_BLOCK_ORDER.includes(blockOf(el)));
    }
    assert.equal(seen.size, 181);
  });

  test("poster tiles keep their row; only the column moves", () => {
    for (const el of poster.filter((e) => e.col !== undefined)) {
      const rect = tileRect(el, "revised");
      close(rect.y, 49 + el.row * 75, el.id);
      close(rect.x, 29 + POSTER_TO_REVISED[el.col] * 62.1, el.id);
    }
  });
});

describe("blocks are contiguous and mirrored", () => {
  test("each block occupies exactly its own column run, in both layouts", () => {
    for (const layoutName of ["original", "revised"]) {
      const byBlock = new Map();
      for (const el of all) {
        if (el.parent !== undefined || (layoutName === "original" && el.added === true)) continue;
        const rect = tileRect(el, layoutName);
        const col = Math.round((rect.x - 29) / 62.1);
        const block = blockOf(el);
        byBlock.set(block, (byBlock.get(block) ?? new Set()).add(col));
      }
      for (const [block, columns] of byBlock) {
        const span = blockSpan(block, layoutName);
        assert.deepEqual([...columns].sort((a, b) => a - b),
          Array.from({ length: span.columns }, (_, i) => span.firstCol + i), `${block} in ${layoutName}`);
      }
    }
  });

  test("a block's tiles keep their poster reading order, mirrored left-right", () => {
    for (const block of ["heroes", "charmod", "archetypes", "villains", "metatropes"]) {
      const tiles = poster.filter((el) => el.col !== undefined && blockOf(el) === block);
      for (const a of tiles) {
        for (const b of tiles.filter((t) => t.col > a.col && t.row === a.row)) {
          assert.ok(tileRect(a, "revised").x > tileRect(b, "revised").x, `${a.id} is right of ${b.id} after mirroring`);
        }
      }
    }
  });

  test("blockOf resolves highlight, paler-villain and hanging tiles by position", () => {
    const byId = Object.fromEntries(all.map((el) => [el.id, el]));
    assert.equal(blockOf(byId.Cal), "setting");
    assert.equal(blockOf(byId["5ma"]), "heroes");
    assert.equal(blockOf(byId["4wl"]), "metatropes");
    assert.equal(blockOf(byId.Hft), "charmod");
    assert.equal(blockOf(byId.Fht), "charmod");
    for (const id of ["5maH", "L", "S", "B", "Ch"]) assert.equal(blockOf(byId[id]), "heroes");
    assert.equal(blockOf(byId.Pro), "structureB");
    assert.equal(blockOf(byId.Com), "genre");
    assert.equal(blockOf(byId.Fnt), "genre");
  });
});

describe("original layout reproduces poster geometry", () => {
  test("Conflict (col 0, row 0) is at the grid origin", () => {
    assert.deepEqual(tileRect(poster.find((e) => e.id === "C"), "original"), { x: 29, y: 49, w: 62.1, h: 75 });
  });

  test("Heel Face Turn (col 7, row 14) hangs in the 15th row: x = 29 + 7 * 62.1, y = 49 + 14 * 75", () => {
    const rect = tileRect(poster.find((e) => e.id === "Hft"), "original");
    close(rect.x, 463.7);
    close(rect.y, 1099);
  });

  test("the last poster column, row 4 (Fandom) is at x = 29 + 19 * 62.1, y = 49 + 4 * 75", () => {
    const tile = poster.find((e) => e.col === 19 && e.row === 4);
    assert.ok(tile);
    const rect = tileRect(tile, "original");
    close(rect.x, 1208.9);
    close(rect.y, 349);
  });

  test("Five Man Band sub-tiles keep their explicit x,y", () => {
    const hero = tileRect(poster.find((e) => e.id === "5maH"), "original");
    assert.equal(hero.x, 135);
    assert.equal(hero.y, 1125);
  });

  test("viewBoxes", () => {
    assert.deepEqual(viewBoxFor("original"), { x: 0, y: 0, w: 1303, h: 1632, attr: "0 0 1303 1632" });
    assert.deepEqual(viewBoxFor("revised"), { x: 0, y: 0, w: 1489.3, h: 1632, attr: "0 0 1489.3 1632" });
  });
});

describe("Hft and Fht", () => {
  test("sit under revised columns 4-5", () => {
    const hft = tileRect(poster.find((e) => e.id === "Hft"), "revised");
    const fht = tileRect(poster.find((e) => e.id === "Fht"), "revised");
    close(fht.x, 29 + 4 * 62.1);
    close(hft.x, 29 + 5 * 62.1);
    close(hft.y, 1099);
    close(fht.y, 1099);
  });
});

describe("Five Man Band sub-tiles mirror about 5ma", () => {
  const subs = poster.filter((e) => e.parent === "5ma");
  const parent = poster.find((e) => e.id === "5ma");
  const centre = (rect) => rect.x + rect.w / 2;

  test("five sub-tiles, ids as BUILD-NOTES names them", () => {
    assert.deepEqual(subs.map((e) => e.id), ["5maH", "L", "S", "B", "Ch"]);
  });

  test("each revised offset from the parent's centre is the negative of the original offset", () => {
    for (const sub of subs) {
      const before = centre(tileRect(sub, "original")) - centre(tileRect(parent, "original"));
      const after = centre(tileRect(sub, "revised")) - centre(tileRect(parent, "revised"));
      close(after, -before, sub.id);
    }
  });

  test("left-to-right order reverses and the row is unchanged", () => {
    const xs = subs.map((sub) => tileRect(sub, "revised").x);
    assert.deepEqual([...xs].sort((a, b) => b - a), xs, "Hero is now rightmost, Chick leftmost");
    for (const sub of subs) assert.equal(tileRect(sub, "revised").y, sub.y);
  });

  test("they move with the parent: 5ma's revised column carries them", () => {
    const parentCentre = centre(tileRect(parent, "revised"));
    close(parentCentre, 29 + POSTER_TO_REVISED[5] * 62.1 + 31.05);
    // Hero's original centre is 204.5 left of 5ma's (166.05 vs 370.55), so it lands 204.5 right.
    close(centre(tileRect(subs[0], "revised")), parentCentre + 204.5);
    close(centre(tileRect(subs[4], "revised")), parentCentre - 43.5);
  });
});

describe("added elements", () => {
  test("ADDED_PLACEMENT agrees with added-elements.json: block column, rows 2-13 by order", () => {
    const column = { structureB: 21, genre1: 16, genre2: 17 };
    for (const el of added) {
      assert.deepEqual(ADDED_PLACEMENT[el.id], { col: column[el.block], row: 2 + el.order }, el.id);
    }
    assert.equal(Object.keys(ADDED_PLACEMENT).length, 36);
  });

  test("tileRect places them in revised and returns null in original (AC-D6)", () => {
    for (const el of added) {
      assert.equal(tileRect(el, "original"), null);
      const rect = tileRect(el, "revised");
      assert.equal(rect.w, 62.1);
      assert.ok(rect.y >= 49 + 2 * 75 && rect.y <= 49 + 13 * 75);
    }
    const prologue = tileRect(added.find((e) => e.id === "Pro"), "revised");
    close(prologue.x, 29 + 21 * 62.1);
    close(prologue.y, 49 + 2 * 75);
  });
});

describe("checkLayout", () => {
  test("the full 217 data set is clean in both layouts", () => {
    assert.deepEqual(checkLayout(all, "original"), []);
    assert.deepEqual(checkLayout(all, "revised"), []);
  });

  test("reports a tile stacked on another (duplicate cell)", () => {
    const stacked = poster.map((el) => (el.id === "3as" ? { ...el, col: 0, row: 0 } : el));
    const problems = checkLayout([...stacked, ...added], "revised");
    assert.ok(problems.some((p) => p.includes("share a cell")), problems.join("; "));
  });

  test("reports a missing poster element and a missing added element", () => {
    const withoutPoster = checkLayout([...poster.slice(1), ...added], "revised");
    assert.ok(withoutPoster.some((p) => p.includes("expected 181")));
    const withoutAdded = checkLayout([...poster, ...added.slice(1)], "revised");
    assert.ok(withoutAdded.some((p) => p.includes("missing added element Pro")));
  });

  test("reports a duplicate id", () => {
    const twin = [...poster, { ...poster[1] }];
    assert.ok(checkLayout([...twin, ...added], "original").some((p) => p.includes("duplicate id")));
  });

  test("reports a block that is not contiguous", () => {
    const gap = poster.filter((el) => el.col !== 5);
    const problems = checkLayout([...gap, ...added], "revised");
    assert.ok(problems.some((p) => p.includes("heroes") && p.includes("not contiguous")), problems.join("; "));
  });

  test("reports an unplaceable element rather than throwing", () => {
    const problems = checkLayout([...poster, ...added, { id: "Zzz", name: "Nowhere", group: "structure" }], "revised");
    assert.ok(problems.some((p) => p.startsWith("Zzz:")));
  });

  test("rejects a layout name it does not know", () => {
    assert.throws(() => checkLayout(all, "sideways"), /layoutName/);
    assert.throws(() => tileRect(poster[0], "sideways"), /layoutName/);
  });
});

describe("LAYOUT", () => {
  test("gathers the pieces and the geometry constants", () => {
    assert.equal(LAYOUT.POSTER_TO_REVISED, POSTER_TO_REVISED);
    assert.equal(LAYOUT.tileRect, tileRect);
    assert.deepEqual({ ...LAYOUT.geometry }, {
      originX: 29, originY: 49, cellWidth: 62.1, cellHeight: 75, originalColumns: 20, revisedColumns: 23,
    });
  });
});
