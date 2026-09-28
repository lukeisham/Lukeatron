import { test } from "node:test";
import assert from "node:assert/strict";
import {
  sampleInsetPoint,
  channelsWithin,
  parseCssRgb,
  colourVerdict,
  countCheck,
  resultsMarkdown,
  emptyResultsTemplate,
} from "../verify/verify-checks.js";

const poster = (n) => Array.from({ length: n }, (_, i) => ({ id: `P${i}`, name: `Poster ${i}`, popText: ".5" }));
const added = (n) => Array.from({ length: n }, (_, i) => ({ id: `A${i}`, name: `Added ${i}`, added: true }));

test("sampleInsetPoint lands inside the rectangle, at integer pixels", () => {
  for (const rect of [{ x: 29, y: 49, w: 62.1, h: 75 }, { x: 91.1, y: 124, w: 62.1, h: 75 }, { x: 1141.3, y: 1125, w: 62.1, h: 75 }]) {
    const point = sampleInsetPoint(rect);
    assert.ok(Number.isInteger(point.x) && Number.isInteger(point.y));
    assert.ok(point.x > rect.x && point.x < rect.x + rect.w);
    assert.ok(point.y > rect.y && point.y < rect.y + rect.h);
  }
  assert.deepEqual(sampleInsetPoint({ x: 29, y: 49, w: 62.1, h: 75 }), { x: 33, y: 53 });
});

test("sampleInsetPoint clamps a small tile and refuses a degenerate one", () => {
  const point = sampleInsetPoint({ x: 10, y: 10, w: 6, h: 6 }, 20);
  assert.deepEqual(point, { x: 13, y: 13 });
  assert.throws(() => sampleInsetPoint({ x: 0, y: 0, w: 1, h: 75 }), /too small/);
});

test("channelsWithin: a difference of 6 passes, 7 fails, on any one channel", () => {
  assert.equal(channelsWithin([100, 100, 100], [106, 100, 100], 6), true);
  assert.equal(channelsWithin([100, 100, 100], [107, 100, 100], 6), false);
  assert.equal(channelsWithin([100, 100, 100], [100, 94, 100], 6), true);
  assert.equal(channelsWithin([100, 100, 100], [100, 100, 93], 6), false);
  assert.equal(channelsWithin([100, 100, 100], [107, 100, 100]), false);
  assert.equal(channelsWithin([100, 100, 100], [106, 100, 100]), true);
  assert.throws(() => channelsWithin([1, 2], [1, 2, 3]), /three channels/);
});

test("parseCssRgb reads computed colours and rejects the rest", () => {
  assert.deepEqual(parseCssRgb("rgb(217, 207, 232)"), [217, 207, 232]);
  assert.deepEqual(parseCssRgb("rgba(1, 2, 3, 0.5)"), [1, 2, 3]);
  assert.equal(parseCssRgb("none"), null);
  assert.equal(parseCssRgb(""), null);
});

test("colourVerdict passes, fails, and reports an unreadable fill", () => {
  assert.equal(colourVerdict([255, 240, 0], "rgb(250, 244, 0)").status, "pass");
  assert.equal(colourVerdict([255, 240, 0], "rgb(240, 240, 0)").status, "fail");
  assert.deepEqual(colourVerdict([255, 240, 0], "none"), { status: "unreadable", svgRgb: null });
});

test("countCheck: 181 poster and 36 added is ok", () => {
  const result = countCheck([...poster(181), ...added(36)]);
  assert.equal(result.poster, 181);
  assert.equal(result.added, 36);
  assert.equal(result.total, 217);
  assert.equal(result.ok, true);
});

test("countCheck: a missing poster element or a different source count is not ok", () => {
  const short = countCheck([...poster(180), ...added(36)]);
  assert.equal(short.posterOk, false);
  assert.equal(short.addedOk, true);
  assert.equal(short.ok, false);
  const other = countCheck([...poster(181), ...added(36)], { sourceCount: 182 });
  assert.equal(other.posterOk, false);
});

test("resultsMarkdown output is exact", () => {
  const text = resultsMarkdown([
    { id: "Can", name: "Canon", popText: ".87", colour: "pass", result: "pass" },
    { id: "H", name: "A | B", popText: "2.0", colour: "fail", result: "accepted difference" },
    { id: "Fan", name: "Fanon", popText: "1.3", colour: "pass", result: "" },
    { id: "Sho", name: "Shout Out", popText: "10", colour: "pass", result: "fail" },
  ]);
  assert.equal(
    text,
    [
      "| Id | Name | Popularity | Colour | Result |",
      "| --- | --- | --- | --- | --- |",
      "| Can | Canon | .87 | pass | pass |",
      "| H | A \\| B | 2.0 | fail | accepted difference |",
      "| Fan | Fanon | 1.3 | pass |  |",
      "| Sho | Shout Out | 10 | pass | fail |",
      "",
      "Totals: 4 elements — 1 pass, 1 fail, 1 accepted difference, 1 unchecked.",
      "",
    ].join("\n"),
  );
});

test("emptyResultsTemplate has one blank row for each of the 181 poster elements and none for added ones", () => {
  const text = emptyResultsTemplate([...poster(181), ...added(36)]);
  const lines = text.split("\n");
  const rows = lines.filter((line) => line.startsWith("| ") && !line.startsWith("| Id ") && !line.startsWith("| ---"));
  assert.equal(rows.length, 181);
  assert.ok(rows.every((line) => line.endsWith("|  |")), "result column is blank");
  assert.ok(!text.includes("| A0 "));
  assert.match(text, /Totals: 181 elements — 0 pass, 0 fail, 0 accepted difference, 181 unchecked\./);
});
