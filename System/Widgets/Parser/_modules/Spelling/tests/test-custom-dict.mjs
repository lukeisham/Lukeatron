import { test } from "node:test";
import assert from "node:assert/strict";
import { createCustomDict } from "../src/custom-dict.js";

test("custom-dict.js imports cleanly and ignore()/isIgnored() work session-only, never calling persist", () => {
  let persistCalls = 0;
  const dict = createCustomDict({ persist: () => persistCalls++ });
  dict.ignore("Lukeatron");
  assert.equal(dict.isIgnored("lukeatron"), true); // case-insensitive
  assert.equal(persistCalls, 0);
});

test("happy path: learn() then isLearned() true; unlearn() reverses it", () => {
  const dict = createCustomDict();
  dict.learn("lukeatron");
  assert.equal(dict.isLearned("lukeatron"), true);
  assert.equal(dict.isLearned("LUKEATRON"), true); // case-insensitive by default
  dict.unlearn("lukeatron");
  assert.equal(dict.isLearned("lukeatron"), false);
});

// --- TEST-7 gate tests (named per spec §8) --------------------------------

test("TEST-7 gate: learn() writes are blocked without a persist callback and the in-memory state still updates", () => {
  const dict = createCustomDict(); // no persist supplied
  assert.doesNotThrow(() => dict.learn("Copilot", true));
  assert.equal(dict.isLearned("Copilot"), true); // exact case match required (caseSensitive:true)
  assert.equal(dict.isLearned("copilot"), false);
  assert.equal(dict.isLearned("COPILOT"), false);
});

test("TEST-7 gate: learn() writes flow through when a persist callback is supplied", () => {
  let received = null;
  const dict = createCustomDict({ persist: (fullDict) => { received = fullDict; } });
  dict.learn("widget", false);
  assert.ok(received, "persist should have been called");
  assert.ok(received.widget, "persist must receive the FULL updated dict object, not a partial diff");
  assert.equal(received.widget.caseSensitive, false);
  assert.equal(received.widget.source, "manual");
});

test("TEST-7 gate: importDictionary() rejects a malformed payload without mutating existing state", () => {
  const dict = createCustomDict();
  dict.learn("existing");
  const wordsBefore = JSON.parse(dict.exportDictionary()).words;

  const badJson = dict.importDictionary("{ not valid json");
  assert.equal(badJson.ok, false);
  assert.ok(badJson.error);
  assert.deepEqual(JSON.parse(dict.exportDictionary()).words, wordsBefore);

  const missingWords = dict.importDictionary(JSON.stringify({ version: "1.0" }));
  assert.equal(missingWords.ok, false);
  assert.deepEqual(JSON.parse(dict.exportDictionary()).words, wordsBefore);
});

test("TEST-7 gate: importDictionary() merges a valid payload and calls persist once", () => {
  let persistCalls = 0;
  const dict = createCustomDict({ persist: () => persistCalls++ });
  const payload = JSON.stringify({
    version: "1.0",
    exportedAt: "2026-08-09T00:00:00Z",
    words: {
      imported1: { addedAt: "2026-08-09T00:00:00Z", caseSensitive: false, source: "manual" },
      imported2: { addedAt: "2026-08-09T00:00:00Z", caseSensitive: false, source: "manual" },
    },
  });

  const result = dict.importDictionary(payload);
  assert.equal(result.ok, true);
  assert.equal(result.added, 2);
  assert.equal(dict.isLearned("imported1"), true);
  assert.equal(dict.isLearned("imported2"), true);
  assert.equal(persistCalls, 1);
});

// --- AC-4: export/import round-trip across a fresh instance ---------------

test("AC-4: exportDictionary() output re-imported into a fresh module instance reproduces the same isLearned results", () => {
  const original = createCustomDict();
  original.learn("lukeatron");
  original.learn("Copilot", true);

  const exported = original.exportDictionary();

  const fresh = createCustomDict();
  const result = fresh.importDictionary(exported);
  assert.equal(result.ok, true);
  assert.equal(fresh.isLearned("lukeatron"), original.isLearned("lukeatron"));
  assert.equal(fresh.isLearned("Copilot"), original.isLearned("Copilot"));
  assert.equal(fresh.isLearned("copilot"), original.isLearned("copilot"));
});
