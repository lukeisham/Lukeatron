import { test } from "node:test";
import assert from "node:assert/strict";
import { createBackend, supportsGzipDecompression, decompressGzipBase64 } from "../src/backend.js";
import zlib from "node:zlib";
import { check, classifyWord } from "../src/rules.js";
import { tokenize } from "../src/tokenizer.js";
import { createSpellingModule } from "../src/index.js";

// Small hand-built in-memory dictionary -- TEST-4: never a real .db.
const FAKE_WORDS = new Map([
  ["the", { rank: 1, variant: null }],
  ["quick", { rank: 500, variant: null }],
  ["brown", { rank: 600, variant: null }],
  ["fox", { rank: 700, variant: null }],
  ["run", { rank: 200, variant: null }],
  ["running", { rank: 900, variant: null }],
  ["make", { rank: 300, variant: null }],
  ["try", { rank: 400, variant: null }],
  ["colour", { rank: 50, variant: null }],
  ["color", { rank: 50, variant: "US" }],
  ["it", { rank: 2, variant: null }],
  ["self", { rank: 800, variant: null }],
  ["aware", { rank: 850, variant: null }],
  ["can", { rank: 20, variant: null }],
  ["and", { rank: 3, variant: null }],
  ["systems", { rank: 950, variant: null }],
  ["are", { rank: 15, variant: null }],
  ["word", { rank: 100, variant: null }],
]);

function fakeBackend() {
  return createBackend((word) => FAKE_WORDS.get(word));
}

test("backend.js imports cleanly and createBackend() rejects a non-function rawQuery", () => {
  assert.throws(() => createBackend(null), TypeError);
});

test("createBackend(): has()/query() are case-insensitive and reflect the injected lookup", () => {
  const backend = fakeBackend();
  assert.equal(backend.has("THE"), true);
  assert.equal(backend.has("zzzznotaword"), false);
  const row = backend.query("Color");
  assert.equal(row.rank, 50);
  assert.equal(row.variant, "US");
  assert.equal(row.pos, null); // SCOWL carries no POS data -- documented deviation
});

test("rules.classifyWord: dictionary hit, ALL-CAPS, CamelCase, morphology, contraction, hyphenated compound all accept", () => {
  const backend = fakeBackend();
  const ctx = { backend, isIgnored: () => false, isLearned: () => false };
  assert.equal(classifyWord("the", ctx).accepted, true); // rule 1
  assert.equal(classifyWord("NASA", ctx).accepted, true); // rule 3
  assert.equal(classifyWord("getRunning", ctx).accepted, true); // rule 4 (camelCase, not in dict)
  assert.equal(classifyWord("running", ctx).accepted, true); // rule 6 morphology
  assert.equal(classifyWord("it's", ctx).accepted, true); // rule 7 (whitelist)
  assert.equal(classifyWord("self-aware", ctx).accepted, true); // rule 8
  assert.equal(classifyWord("zzqxnotaword", ctx).accepted, false); // rule 10
});

test("rules.classifyWord: 'Teh' at sentence start still flags (spec §4 rule 5 note)", () => {
  const backend = fakeBackend();
  const ctx = { backend, isIgnored: () => false, isLearned: () => false };
  assert.equal(classifyWord("Teh", ctx, { sentenceInitial: true }).accepted, false);
});

test("rules.classifyWord: a mid-sentence Title-Case token (proper noun shape) is accepted (measured false-positive fix)", () => {
  const backend = fakeBackend(); // "Melbourne" is deliberately NOT in the fake dictionary
  const ctx = { backend, isIgnored: () => false, isLearned: () => false };
  assert.equal(classifyWord("Melbourne", ctx, { sentenceInitial: false }).accepted, true);
  assert.equal(classifyWord("Melbourne", ctx, { sentenceInitial: true }).accepted, false);
});

test("rules.check(): flags a real misspelling and does not flag proper nouns/ALL-CAPS/hyphenated compounds (AC-2 style)", () => {
  const backend = fakeBackend();
  const ctx = { backend, isIgnored: () => false, isLearned: () => false };
  const text = "The quick brown fox can run. NASA and self-aware systems are zzqxnotaword.";
  const findings = check(tokenize(text), ctx);
  const misspelledWords = findings.filter((f) => !f.kind).map((f) => f.word);
  assert.deepEqual(misspelledWords, ["zzqxnotaword"]);
});

test("rules.check(): repeated word is flagged as kind:'repeat', distinct from a misspelling", () => {
  const backend = fakeBackend();
  const ctx = { backend, isIgnored: () => false, isLearned: () => false };
  const findings = check(tokenize("the the fox"), ctx);
  const repeats = findings.filter((f) => f.kind === "repeat");
  assert.equal(repeats.length, 1);
  assert.equal(repeats[0].word, "the");
});

test("createSpellingModule(): isValid()/lookup() happy path and guard path (empty/invalid input)", () => {
  const spelling = createSpellingModule({ backend: fakeBackend() });
  assert.equal(spelling.isValid("the"), true);
  assert.equal(spelling.isValid("zzqxnotaword"), false);
  assert.equal(spelling.lookup(""), null); // guard
  assert.equal(spelling.lookup("the").known, true);
  assert.equal(spelling.lookup("zzqxnotaword").known, false);
});

// TASK-1 (test-and-refine pass, 2026-08-10) -- gzip decompression seam.
test("supportsGzipDecompression(): true under Node v26 (DecompressionStream + Response both present)", () => {
  assert.equal(supportsGzipDecompression(), true);
});

test("decompressGzipBase64(): round-trips real gzip bytes back to the original payload (happy path)", async () => {
  const original = "the quick brown fox jumps over the lazy dog".repeat(50);
  const gz = zlib.gzipSync(Buffer.from(original, "utf-8"), { level: 9 });
  const base64Gz = gz.toString("base64");

  const out = await decompressGzipBase64(base64Gz);
  const outText = Buffer.from(out).toString("utf-8");
  assert.equal(outText, original);
});

test("decompressGzipBase64(): rejects when DecompressionStream is unavailable (guard path)", async () => {
  const realDS = globalThis.DecompressionStream;
  delete globalThis.DecompressionStream;
  try {
    await assert.rejects(() => decompressGzipBase64("dGVzdA=="), /DecompressionStream unsupported/);
  } finally {
    globalThis.DecompressionStream = realDS;
  }
});
