import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { LIBRARY } from "../app/data/library.js";

const NOTE_MAX = 80;
const POSTER_CREDIT =
  "Built from the outline in the Periodic Table of Storytelling (ComputerSherpa)";

// Read the reference JSON directly: elements.js is a stub until the assembler runs, and the
// data test must not depend on its emptiness (BUILD-NOTES).
function readJson(relativePath) {
  return JSON.parse(readFileSync(new URL(relativePath, import.meta.url), "utf8"));
}

function knownElementIds() {
  const poster = readJson("../reference/elements-pass1.json").elements.map((el) => el.id);
  const added = readJson("../reference/work/added-elements.json").elements.map((el) => el.id);
  // The Five Man Band sub-tile Hero is "5maH" in the final data (BUILD-NOTES); the pass-1 file
  // still calls it "H", which collides with the grid Hero.
  return new Set([...poster, ...added, "5maH"]);
}

const ELEMENT_IDS = knownElementIds();

const SEED_ORDER = [
  "Quest / Hero's Journey",
  "Voyage & Return",
  "Overcoming the Monster",
  "Comedy / Satire",
  "Tragedy / Dystopia",
  "Mystery / Closed circle",
  "Rebirth / Redemption",
  "Confined-space / Heist-ish",
  "Romance dynamics",
  "Found family / Ensemble",
  "Workplace / Everyday",
  "Interactive / Choice",
];
const POSTER_TITLES = new Set([
  "Quest / Hero's Journey",
  "Rebirth / Redemption",
  "Found family / Ensemble",
  "Workplace / Everyday",
  "Interactive / Choice",
]);

test("reference data loads and includes the ids the library relies on", () => {
  assert.ok(ELEMENT_IDS.size >= 181 + 36, "expected poster plus added ids");
  assert.ok(ELEMENT_IDS.has("5maH"));
  assert.ok(ELEMENT_IDS.has("Cal"));
  assert.ok(ELEMENT_IDS.has("Ccs"));
  assert.ok(!ELEMENT_IDS.has("Rg"), "the Rogue card is not an element");
});

test("library has exactly twelve entries, in seed-list order, with unique ids", () => {
  assert.equal(LIBRARY.length, 12);
  assert.deepEqual(LIBRARY.map((entry) => entry.title), SEED_ORDER);
  assert.equal(new Set(LIBRARY.map((entry) => entry.id)).size, 12);
});

test("every entry has its required fields filled in", () => {
  for (const entry of LIBRARY) {
    for (const field of ["id", "title", "lead", "credit"]) {
      assert.equal(typeof entry[field], "string", `${entry.id}.${field}`);
      assert.ok(entry[field].trim().length > 0, `${entry.id}.${field} is empty`);
    }
    assert.ok(Array.isArray(entry.examples) && entry.examples.length > 0, `${entry.id} examples`);
    for (const example of entry.examples) {
      assert.ok(typeof example === "string" && example.trim().length > 0, `${entry.id} example`);
    }
    assert.ok(entry.examples.includes(entry.lead), `${entry.id}: lead must be one of examples`);
    assert.ok(["poster", "authored"].includes(entry.origin), `${entry.id} origin`);
    assert.ok(entry.beads.length >= 1 && Array.isArray(entry.ribbons), `${entry.id} shape`);
  }
});

test("poster-derived entries are the five the spec names, with matching credit lines", () => {
  for (const entry of LIBRARY) {
    const expectPoster = POSTER_TITLES.has(entry.title);
    assert.equal(entry.origin, expectPoster ? "poster" : "authored", entry.id);
    const expectedCredit = expectPoster
      ? POSTER_CREDIT
      : `Our reading of ${entry.lead} as ${entry.title} — an interpretation`;
    assert.equal(entry.credit, expectedCredit, entry.id);
  }
});

test("every bead references a real element id and carries a one-line note", () => {
  for (const entry of LIBRARY) {
    const uids = new Set();
    for (const bead of entry.beads) {
      assert.ok(!uids.has(bead.uid), `${entry.id}: duplicate uid ${bead.uid}`);
      uids.add(bead.uid);
      assert.ok(ELEMENT_IDS.has(bead.elementId), `${entry.id}/${bead.uid}: unknown id ${bead.elementId}`);
      if (bead.with !== undefined) {
        assert.ok(ELEMENT_IDS.has(bead.with), `${entry.id}/${bead.uid}: unknown with ${bead.with}`);
        assert.notEqual(bead.with, bead.elementId, `${entry.id}/${bead.uid}: tandem pairs an element with itself`);
      }
      assert.equal(typeof bead.note, "string", `${entry.id}/${bead.uid}: note missing`);
      assert.ok(bead.note.trim().length > 0, `${entry.id}/${bead.uid}: note empty`);
      assert.ok(!bead.note.includes("\n"), `${entry.id}/${bead.uid}: note is not one line`);
      assert.ok(
        bead.note.length <= NOTE_MAX,
        `${entry.id}/${bead.uid}: note is ${bead.note.length} characters (max ${NOTE_MAX})`,
      );
    }
  }
});

test("authored entries have 4 to 10 beads; nothing exceeds the cap", () => {
  for (const entry of LIBRARY) {
    if (entry.origin === "authored") {
      assert.ok(entry.beads.length >= 4 && entry.beads.length <= 10, `${entry.id}: ${entry.beads.length} beads`);
    }
    assert.ok(entry.beads.length <= 10, `${entry.id}: too many beads`);
  }
});

test("ribbons join existing beads, with no self-links and no duplicates", () => {
  for (const entry of LIBRARY) {
    const uids = new Set(entry.beads.map((bead) => bead.uid));
    const seen = new Set();
    for (const ribbon of entry.ribbons) {
      assert.equal(ribbon.length, 2, `${entry.id}: ribbon is not a pair`);
      const [from, to] = ribbon;
      assert.ok(uids.has(from), `${entry.id}: ribbon from unknown bead ${from}`);
      assert.ok(uids.has(to), `${entry.id}: ribbon to unknown bead ${to}`);
      assert.notEqual(from, to, `${entry.id}: self-link on ${from}`);
      const key = `${from}>${to}`;
      assert.ok(!seen.has(key), `${entry.id}: duplicate ribbon ${key}`);
      seen.add(key);
    }
  }
});

test("every bead is connected to the rest of its story", () => {
  for (const entry of LIBRARY) {
    const touched = new Set(entry.ribbons.flat());
    for (const bead of entry.beads) {
      assert.ok(touched.has(bead.uid), `${entry.id}: bead ${bead.uid} has no ribbon`);
    }
  }
});

test("the Rogue card never appears in a library entry (OQ-R1)", () => {
  for (const entry of LIBRARY) {
    for (const bead of entry.beads) {
      assert.notEqual(bead.elementId, "Rg");
      assert.notEqual(bead.with, "Rg");
    }
  }
});

test("LIBRARY is deep-frozen: entries, arrays, beads and ribbons cannot be changed (AC-L3)", () => {
  // ES modules run in strict mode, so a write to a frozen object throws instead of failing quietly.
  const entry = LIBRARY[0];
  const before = JSON.stringify(LIBRARY);

  assert.ok(Object.isFrozen(LIBRARY));
  assert.ok(Object.isFrozen(entry));
  assert.ok(Object.isFrozen(entry.examples));
  assert.ok(Object.isFrozen(entry.beads));
  assert.ok(Object.isFrozen(entry.beads[0]));
  assert.ok(Object.isFrozen(entry.ribbons));
  assert.ok(Object.isFrozen(entry.ribbons[0]));

  assert.throws(() => { entry.title = "Changed"; }, TypeError);
  assert.throws(() => { entry.beads[0].note = "Changed"; }, TypeError);
  assert.throws(() => { entry.beads.push({ uid: "x", elementId: "C", note: "n" }); }, TypeError);
  assert.throws(() => { entry.ribbons[0][1] = "b9"; }, TypeError);
  assert.throws(() => { entry.extra = 1; }, TypeError);
  assert.throws(() => { delete entry.credit; }, TypeError);
  assert.throws(() => { LIBRARY.pop(); }, TypeError);
  assert.throws(() => { LIBRARY[0] = null; }, TypeError);

  assert.equal(JSON.stringify(LIBRARY), before, "a failed edit must change nothing");
});

test("every nested value in every entry is frozen", () => {
  const unfrozen = [];
  const walk = (value, path) => {
    if (value === null || typeof value !== "object") return;
    if (!Object.isFrozen(value)) unfrozen.push(path);
    for (const [key, child] of Object.entries(value)) walk(child, `${path}.${key}`);
  };
  walk(LIBRARY, "LIBRARY");
  assert.deepEqual(unfrozen, []);
});
