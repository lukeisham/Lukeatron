// Measures the cue-based detector's (detectBeats()) sentence-labelling
// accuracy against all 36 seeded tales' ground-truth spans, and guards
// against a silent regression (TEST-2: happy path produces the right
// output — here "the right output" is the measured number itself).
//
// Ground truth for each tale is derived the same way render() derives it
// for a spans-carrying pool item: scoreFromSpans() + splitIntoBeats().
// detectBeats() never sees the spans — it is the same function a
// Tier-B-fetched (spanless) tale would run through.
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const BUILD_DIR = path.resolve(HERE, "../../cartridge/build");

const pool = JSON.parse(readFileSync(path.join(BUILD_DIR, "pool.json"), "utf8"));
global.CONTENT = pool;
global.CONFIG = { clausePalette: [{ h100: "#9FE1CB", h800: "#085041" }, { h100: "#FAC775", h800: "#633806" }, { h100: "#F3B8AB", h800: "#7A2C1C" }] };

const ENGINE = require(path.join(BUILD_DIR, "engine.js"));

function measure() {
  const ids = Object.keys(pool);
  let totalSentences = 0;
  let correct = 0;
  const perTale = [];
  ids.forEach((id) => {
    const item = pool[id];
    const sentences = ENGINE.splitSentences(item.tale);
    const gtScores = ENGINE.scoreFromSpans(sentences, item.setupSpan, item.twistSpan, item.resultSpan);
    const gtSplit = ENGINE.splitIntoBeats(gtScores);
    const gtLabels = ENGINE.labelsFromSplit(sentences.length, gtSplit);

    const predLabels = ENGINE.detectBeats(item.tale).labels;

    let hit = 0;
    for (let i = 0; i < sentences.length; i++) {
      if (predLabels[i] === gtLabels[i]) hit++;
    }
    totalSentences += sentences.length;
    correct += hit;
    perTale.push({ id, n: sentences.length, hit });
  });
  return { ids, totalSentences, correct, perTale, accuracy: correct / totalSentences };
}

test("detectBeats() sentence-labelling accuracy against all 40 seeded tales", () => {
  // 2026-08-13 (Luke's instruction): Turkey/Middle East (4) removed, Persia
  // (Pre-Islamic) (3), American Gothic (3), and Australian Gothic (2) added.
  const { ids, totalSentences, accuracy, perTale } = measure();
  assert.equal(ids.length, 40, "expected all 40 seeded tales in the pool");
  // eslint-disable-next-line no-console
  console.log(`FolkTale detector accuracy: ${(accuracy * 100).toFixed(1)}% (${totalSentences} sentences, 40 tales)`);
  const worst = perTale
    .map((t) => ({ ...t, acc: t.n ? t.hit / t.n : 1 }))
    .sort((a, b) => a.acc - b.acc)
    .slice(0, 5);
  console.log("Worst 5 tales:", worst.map((t) => `${t.id}:${(t.acc * 100).toFixed(0)}%`).join(", "));
  // Baseline was ~64% on 36 tales (2026-08-12); re-measured after the
  // 2026-08-13 content change — see this run's console output for the
  // current number. This guard only catches a future regression, it does
  // not claim the heuristic is highly accurate.
  assert.ok(accuracy >= 0.5, `accuracy regressed below 50% floor: ${(accuracy * 100).toFixed(1)}%`);
});
