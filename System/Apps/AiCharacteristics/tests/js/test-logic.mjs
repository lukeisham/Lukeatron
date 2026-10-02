// The page's pure logic: word limits, joining and sorting verdicts, the source line and the Scrape status line.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_WORDS, countWords, isCheckable, joinVerdicts, percent, scrapeFailure, scrapeStatus, sentence,
  sourceLine, splitCriteria, summarise,
} from "../../web/logic.js";

const live = [
  { id: "c-001", title: "Focal words", plain: "Fancy words.", status: "kept" },
  { id: "c-002", title: "Rule of three", plain: "", description: "Points in threes.", status: "new" },
  { id: "c-003", title: "Em dashes", plain: "Long dashes.", status: "changed" },
  { id: "c-004", title: "Hedging", plain: "Softeners.", status: "kept" },
];

test("word counting ignores extra whitespace and the limit is inclusive", () => {
  assert.equal(countWords("  one   two\nthree  "), 3);
  assert.equal(countWords("   "), 0);
  assert.equal(isCheckable("word ".repeat(MAX_WORDS)), true);
  assert.equal(isCheckable("word ".repeat(MAX_WORDS + 1)), false);
  assert.equal(isCheckable(""), false);
});

test("retired criteria are split out and never mixed into the live list", () => {
  const split = splitCriteria([...live, { id: "c-005", status: "retired" }]);
  assert.deepEqual(split.live.map((c) => c.id), ["c-001", "c-002", "c-003", "c-004"]);
  assert.deepEqual(split.retired.map((c) => c.id), ["c-005"]);
});

test("verdicts are joined to criteria, seen first, then by confidence, and fall back to the description", () => {
  const rows = joinVerdicts(live, [
    { id: "c-001", answer: "no", confidence: 0.99 },
    { id: "c-002", answer: "yes", confidence: 0.6 },
    { id: "c-003", answer: "yes", confidence: 0.9 },
    { id: "c-004", answer: "no", confidence: 0.5 },
    { id: "c-999", answer: "yes", confidence: 1 },
  ]);
  assert.deepEqual(rows.map((r) => r.id), ["c-003", "c-002", "c-001", "c-004"]);
  assert.equal(rows[1].plain, "Points in threes.");
  assert.deepEqual(summarise(rows), { seen: 2, total: 4 });
  assert.equal(percent(0.945), 95);
});

test("the source line names the article without its namespace, or says nothing was scraped", () => {
  assert.equal(sourceLine({ criteria: [] }), "Not scraped yet");
  const line = sourceLine({ scraped_at: "2026-10-02T09:00:00+00:00", article_title: "Wikipedia:Signs of AI writing" }, "UTC");
  assert.equal(line, "Built from Wikipedia, “Signs of AI writing” · scraped 2 Oct 2026, 9:00 am");
  assert.match(sourceLine({ scraped_at: "2026-10-02T09:00:00+00:00" }, "UTC"), /^Built from Wikipedia · scraped/);
});

test("the Scrape status line says built, nothing changed, or exactly what changed", () => {
  const none = { total: 16, new: [], changed: [], retired: [] };
  assert.equal(scrapeStatus({ ...none, new: new Array(16).fill("c") }), "Built 16 criteria from the article.");
  assert.equal(scrapeStatus(none), "Checked just now. Nothing has changed.");
  assert.equal(scrapeStatus({ ...none, new: ["a"], changed: ["b", "c"], retired: ["d"] }), "Updated just now: 1 added, 2 reworded, 1 retired.");
  assert.equal(scrapeStatus({ ...none, retired: ["d"] }), "Updated just now: 1 retired.");
});

test("failures read as sentences and say nothing was changed", () => {
  assert.equal(sentence("no Haiku key is set up"), "No Haiku key is set up.");
  assert.equal(sentence("Done."), "Done.");
  assert.equal(scrapeFailure("could not reach Wikipedia"), "Could not reach Wikipedia. Nothing was changed.");
});
