/**
 * benchmark.mjs — measures suggestion quality (new vs. old) and the
 * false-positive rate (spec AC-6), against the REAL shipped dictionary
 * (data/spelling.db, opened read-only via Node's built-in `node:sqlite` --
 * a dev-time-only tool, not part of the shipped module or its test suite;
 * TEST-4's "never touch a real .db" applies to `tests/`, not to this
 * benchmark script).
 *
 * Corpus: bench/corpus/birkbeck_sample.json -- a 600-pair sample drawn from
 * the REAL Birkbeck Spelling Error Corpus (University of Birkbeck / Oxford
 * Text Archive, https://ota.bodleian.ox.ac.uk/repository/xmlui/handle/
 * 20.500.12024/0643), licensed CC-BY-NC-SA 3.0. DEV-TIME BENCHMARK ONLY --
 * never embedded in a shipped widget (see bench/corpus/README.md). This is
 * NOT the specific "aspell.dat" 531-item sub-corpus the spec names (that
 * file does not exist as a separate item in this release's download; see
 * bench/corpus/README.md for exactly which source files were sampled).
 *
 * Run: node bench/benchmark.mjs
 */
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { createBackend } from "../src/backend.js";
import { suggest } from "../src/suggest.js";
import { classifyWord } from "../src/rules.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(HERE, "..", "data", "spelling.db");
const CORPUS_PATH = join(HERE, "corpus", "birkbeck_sample.json");
const HOLDOUT_PATH = join(HERE, "corpus", "holdout_proper_nouns.json");

// --- old implementation, mirrored from Grammar/build/template.html:1118-1129 ---
// (naive edit-1 candidate generation, frequency-only sort, no distance
// weighting, no phonetic fallback -- kept here ONLY for the before/after
// benchmark comparison, not part of the shipped module.)
function oldSuggestions(word, backend, limit = 3) {
  const w = word.toLowerCase();
  const letters = "abcdefghijklmnopqrstuvwxyz";
  const edits = new Set();
  for (let i = 0; i < w.length; i++) {
    edits.add(w.slice(0, i) + w.slice(i + 1));
    if (i < w.length - 1) edits.add(w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2));
    for (const c of letters) {
      edits.add(w.slice(0, i) + c + w.slice(i + 1));
      edits.add(w.slice(0, i) + c + w.slice(i));
    }
  }
  for (const c of letters) edits.add(w + c);

  const candidates = [...edits].filter((e) => e !== w && e.length > 1 && backend.has(e));
  candidates.sort((a, b) => (backend.query(a)?.rank ?? 999999) - (backend.query(b)?.rank ?? 999999));
  return candidates.slice(0, limit);
}

function rankOf(list, target) {
  const idx = list.indexOf(target);
  return idx === -1 ? Infinity : idx + 1;
}

function evaluate(name, suggestFn, pairs, backend, limit) {
  let mrr = 0;
  let hitsAt1 = 0;
  let hitsAt3 = 0;
  let found = 0;
  const t0 = performance.now();
  for (const { correct, misspelling } of pairs) {
    const results = suggestFn(misspelling, backend, limit);
    const rank = rankOf(results, correct);
    if (Number.isFinite(rank)) {
      found++;
      if (rank <= 3) {
        mrr += 1 / rank;
        hitsAt3++;
      }
      if (rank === 1) hitsAt1++;
    }
  }
  const elapsedMs = performance.now() - t0;
  const n = pairs.length;
  return {
    name,
    n,
    mrrAt3: mrr / n,
    precisionAt1: hitsAt1 / n,
    precisionAt3: hitsAt3 / n,
    recall: found / n,
    totalMs: elapsedMs,
    avgMsPerWord: elapsedMs / n,
  };
}

function main() {
  const db = new DatabaseSync(DB_PATH, { readOnly: true });
  const stmt = db.prepare("SELECT rank, variant FROM words WHERE word = ?");
  const backend = createBackend((word) => stmt.get(word));

  const allPairs = JSON.parse(readFileSync(CORPUS_PATH, "utf8"));
  const inDict = allPairs.filter((p) => backend.has(p.correct));
  const excluded = allPairs.length - inDict.length;

  console.log(`Corpus: ${allPairs.length} pairs loaded, ${inDict.length} usable ` +
    `(correct word present in the shipped dictionary), ${excluded} excluded (correct word not in dict -- neither algorithm could ever find these, excluded from BOTH sides for fairness).`);
  console.log();

  const oldResult = evaluate("OLD (edit-1, frequency-only, no phonetic)", oldSuggestions, inDict, backend, 3);
  const newResult = evaluate("NEW (weighted OSA + Metaphone + edit-2 fallback)", suggest, inDict, backend, 3);

  for (const r of [oldResult, newResult]) {
    console.log(`--- ${r.name} ---`);
    console.log(`  n = ${r.n}`);
    console.log(`  MRR@3        = ${r.mrrAt3.toFixed(4)}`);
    console.log(`  Precision@1  = ${(r.precisionAt1 * 100).toFixed(1)}%`);
    console.log(`  Precision@3  = ${(r.precisionAt3 * 100).toFixed(1)}%`);
    console.log(`  Recall@3     = ${(r.recall * 100).toFixed(1)}%`);
    console.log(`  Total time   = ${r.totalMs.toFixed(0)}ms  (${r.avgMsPerWord.toFixed(2)}ms/word avg -- MEASURED, Node in-process, not sql.js-in-browser)`);
    console.log();
  }

  console.log(`Delta: MRR@3 ${oldResult.mrrAt3.toFixed(4)} -> ${newResult.mrrAt3.toFixed(4)} ` +
    `(${newResult.mrrAt3 > oldResult.mrrAt3 ? "+" : ""}${((newResult.mrrAt3 - oldResult.mrrAt3) * 100).toFixed(1)} points)`);
  console.log(`Delta: Precision@1 ${(oldResult.precisionAt1 * 100).toFixed(1)}% -> ${(newResult.precisionAt1 * 100).toFixed(1)}%`);
  console.log();

  // --- false-positive rate (AC-6) ---
  const holdout = JSON.parse(readFileSync(HOLDOUT_PATH, "utf8"));
  const ctx = { backend, isIgnored: () => false, isLearned: () => false };
  const falsePositives = [];
  for (const word of holdout) {
    // Evaluated as a mid-sentence token (not sentence-initial) -- the
    // realistic position for a proper noun in running text; see rules.js's
    // file header for why sentence-initial position is treated differently.
    const decision = classifyWord(word, ctx, { sentenceInitial: false });
    if (!decision.accepted) falsePositives.push(word);
  }
  const fpRate = (falsePositives.length / holdout.length) * 100;
  console.log(`--- False-positive rate (holdout: ${holdout.length} proper nouns/jargon) ---`);
  console.log(`  Flagged as misspelled: ${falsePositives.length}/${holdout.length} = ${fpRate.toFixed(2)}%`);
  console.log(`  Budget (spec §4 AC-6): <= 2%  ->  ${fpRate <= 2 ? "PASS" : "FAIL"}`);
  if (falsePositives.length > 0) {
    console.log(`  Flagged words: ${falsePositives.join(", ")}`);
  }

  db.close();
}

main();
