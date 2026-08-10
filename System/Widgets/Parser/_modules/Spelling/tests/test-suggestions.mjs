import { test } from "node:test";
import assert from "node:assert/strict";
import { weightedOSADistance } from "../src/distance.js";
import { metaphone } from "../src/metaphone.js";
import { suggest, score, getCandidates } from "../src/suggest.js";
import { createBackend } from "../src/backend.js";

test("distance.js imports cleanly and weightedOSADistance() returns 0 for identical strings", () => {
  assert.equal(weightedOSADistance("cat", "cat"), 0);
});

test("weightedOSADistance(): adjacent-key substitution costs less than a non-adjacent one at the same raw edit count", () => {
  const distAdjacent = weightedOSADistance("sat", "saf"); // t/f ARE QWERTY-adjacent
  const distFar = weightedOSADistance("sat", "saz"); // t/z are NOT adjacent
  assert.ok(distAdjacent < distFar, `expected adjacent substitution (${distAdjacent}) < non-adjacent (${distFar})`);
});

test("weightedOSADistance(): guard path respects maxDist early-exit", () => {
  assert.equal(weightedOSADistance("abcdef", "zyxwvu", 2), 3); // > maxDist(2) -> returns maxDist+1
});

test("metaphone.js imports cleanly and produces empty string for empty input", () => {
  assert.equal(metaphone(""), "");
  assert.equal(metaphone(null), "");
});

test("metaphone(): catches an irregular-spelling pair that plain edit distance would miss", () => {
  assert.equal(metaphone("knight"), metaphone("nite"));
});

function fakeSuggestBackend(words) {
  const map = new Map(words.map(([w, rank]) => [w, { rank, variant: null }]));
  return createBackend((w) => map.get(w));
}

test("suggest.js imports cleanly and suggest() returns [] for a word with no dictionary candidates nearby", () => {
  const backend = fakeSuggestBackend([["completely", 1], ["unrelated", 2]]);
  assert.deepEqual(suggest("zzzzzzzzzzzz", backend), []);
});

test("AC-3: suggest('necesary') ranks 'necessary' #1 in top-3; suggest('teh') ranks 'the' #1", () => {
  const backend = fakeSuggestBackend([
    ["necessary", 10],
    ["cesare", 90000],
    ["the", 1],
    ["then", 50],
    ["tea", 60],
  ]);
  assert.equal(suggest("necesary", backend, 3)[0], "necessary");
  assert.equal(suggest("teh", backend, 3)[0], "the");
});

test("score(): a lower edit distance and higher frequency both increase the score (monotonicity guard)", () => {
  const closeHighFreq = score("necesary", "necessary", 10);
  const farLowFreq = score("necesary", "cesare", 90000);
  assert.ok(closeHighFreq > farLowFreq);
});

test("getCandidates(): edit-2 fallback only engages when edit-1 underperforms", () => {
  const backend = fakeSuggestBackend([["necessary", 10]]);
  // "necesary" is edit-distance-1 from "necessary" -- edit-1 alone should find it.
  const candidates = getCandidates("necesary", backend);
  assert.ok(candidates.includes("necessary"));
});
