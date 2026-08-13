// test-style_engine.mjs — TEST-1/TEST-2 smoke coverage for
// Style/cartridge/build/style_engine.js. Pure logic/data module (no DOM,
// ParserShell.spec.md FR-3 — ENGINE reads only its own tokenize() output
// and CONFIG/CONTENT), so this runs the real source via node:vm against a
// plain sandbox (CONFIG/CONTENT globals only) rather than TEST-8's fake
// DOM, which this module never touches (StyleParser.spec.md §9).

import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENGINE_SRC = fs.readFileSync(path.join(__dirname, "..", "..", "build", "style_engine.js"), "utf-8");

// Mirrors Style/cartridge/build/config.yaml's real sweeps.items/colours.palette
// shape (names/order) so hueIndexForSweep() resolves exactly as it does in
// the shipped cartridge, not a test-only stand-in.
const REAL_SWEEPS_CONFIG = {
  clausePalette: [{ name: "teal" }, { name: "amber" }, { name: "purple" }, { name: "pink" }, { name: "coral" }],
  sweeps: {
    items: [
      { id: "clarity", category: "genre", hue: "teal", oppositeId: "obscurity" },
      { id: "brevity", category: "genre", hue: "amber", oppositeId: "verbosity" },
      { id: "coherence", category: "genre", hue: "purple", oppositeId: "incoherence" },
      { id: "voice", category: "genre", hue: "pink", oppositeId: "affectation" },
      { id: "diction", category: "genre", hue: "coral", oppositeId: "ornament" },
      { id: "academic-english", category: "register" },
      { id: "simple-descriptive-english", category: "register" },
    ],
  },
};

function makeSandbox() {
  const CONFIG = Object.assign({ name: "Style parser", version: "1.0.0", cap: 1000, tentativeThreshold: 0.7 }, REAL_SWEEPS_CONFIG);
  const sandbox = { CONFIG, console };
  vm.createContext(sandbox);
  vm.runInContext(ENGINE_SRC, sandbox, { filename: "style_engine.js" });
  return sandbox;
}

test("style_engine.js: imports (vm-executes) cleanly and exposes ENGINE.parse/tokenize/CLOSED", () => {
  const { ENGINE } = makeSandbox();
  assert.equal(typeof ENGINE.parse, "function");
  assert.equal(typeof ENGINE.tokenize, "function");
  assert.ok(ENGINE.CLOSED && typeof ENGINE.CLOSED === "object");
});

test("tokenize(): splits words and punctuation into separate tokens with correct char offsets", () => {
  const { ENGINE } = makeSandbox();
  const toks = ENGINE.tokenize("Cats run.");
  assert.equal(toks.length, 3);
  assert.equal(toks[0].text, "Cats");
  assert.equal(toks[0].isWord, true);
  assert.equal(toks[2].text, ".");
  assert.equal(toks[2].isWord, false);
  assert.equal(toks[0].start, 0);
  assert.equal(toks[0].end, 4);
});

test("no sweep selected: parse() returns a usable ParseResult with a 'select a sweep' classification, not an error", () => {
  const { ENGINE } = makeSandbox();
  const R = ENGINE.parse("Cats run.", undefined);
  assert.equal(R.meta.overCap, false);
  assert.equal(R.findings.length, 0);
  assert.equal(R.summary.classifications[0].id, "—");
});

test("over-cap input short-circuits to the minimal overCap ParseResult (FR-8), never truncates", () => {
  const { ENGINE } = makeSandbox();
  const longText = new Array(1002).join("word "); // 1001 words > CONFIG.cap (1000)
  const R = ENGINE.parse(longText, { sweeps: { clarity: { on: true, opposite: false } } });
  assert.equal(R.meta.overCap, true);
  assert.ok(R.meta.wordCount > 1000);
});

test("Clarity (affirmative): AC-S1 — flags the passive constructions in the worked-example sentence under §1.1", () => {
  const { ENGINE } = makeSandbox();
  const text = "The report was reviewed by the committee, and a decision was reached by them to approve the project.";
  const R = ENGINE.parse(text, { sweeps: { clarity: { on: true, opposite: false } } });
  assert.equal(R.summary.classifications[0].id, "1");
  const passiveFindings = R.findings.filter((f) => f.id === "1.1");
  assert.equal(passiveFindings.length, 2, "expected both 'was reviewed' and 'was reached' to be flagged");
  passiveFindings.forEach((f) => assert.equal(f.severity, "flag"));
  assert.equal(R.summary.counts.sweepCategory, "genre");
});

test("Clarity toggled to Obscurity: AC-S2 — the same passive spans are recognised under §8.1, not flagged as errors", () => {
  const { ENGINE } = makeSandbox();
  const text = "The report was reviewed by the committee, and a decision was reached by them to approve the project.";
  const R = ENGINE.parse(text, { sweeps: { clarity: { on: true, opposite: true } } });
  assert.equal(R.summary.classifications[0].id, "8");
  const hits = R.findings.filter((f) => f.id === "8.1");
  assert.equal(hits.length, 2);
  hits.forEach((f) => assert.equal(f.severity, "check", "opposite-mode hits are recognitions (check), not violations (flag)"));
});

test("Academic English: AC-S3 — a mixed-conformance paragraph produces a 10-rule scorecard with the expected red flags", () => {
  const { ENGINE } = makeSandbox();
  const text = "We found an inverse relationship between X and Y. This is a big change. Scores went up.";
  const R = ENGINE.parse(text, { sweeps: { "academic-english": { on: true, opposite: false } } });
  assert.equal(R.findings.length, 10, "every one of §6.1-6.10 must produce exactly one finding (register scorecard shows every light)");
  const byId = Object.fromEntries(R.findings.map((f) => [f.id, f]));
  assert.equal(byId["6.6"].severity, "flag", "6.6 agentless framing: 'we found' should be flagged");
  assert.equal(byId["6.2"].severity, "flag", "6.2 quantification: 'big' with no number should be flagged");
  assert.equal(byId["6.4"].severity, "flag", "6.4 precise relational verbs: 'went up' should be flagged");
  assert.equal(R.summary.counts.sweepCategory, "register");
  // No severity outside the four legal values (ParserShell.spec.md §6).
  R.findings.forEach((f) => assert.ok(["check", "info", "flag", "na"].includes(f.severity)));
});

test("every word token carries a tags[0] with a numeric confidence (render()'s unconditional read, ui.js render())", () => {
  const { ENGINE } = makeSandbox();
  const R = ENGINE.parse("The report was reviewed by the committee.", { sweeps: { clarity: { on: true, opposite: false } } });
  R.tokens.forEach((t) => {
    if (t.isWord) {
      assert.equal(t.tags.length, 1);
      assert.equal(typeof t.tags[0].confidence, "number");
    }
  });
});

test("_clauses spans are non-overlapping and sorted, each within tokens[] bounds (render()'s clauseAt() walk)", () => {
  const { ENGINE } = makeSandbox();
  const text = "The report was reviewed by the committee, and a decision was reached by them to approve the project.";
  const R = ENGINE.parse(text, { sweeps: { clarity: { on: true, opposite: false } } });
  let lastEnd = -1;
  R._clauses.forEach((c) => {
    assert.ok(c.start <= c.end);
    assert.ok(c.start > lastEnd, "clauses must be non-overlapping and in order");
    assert.ok(c.end < R._toks.length);
    lastEnd = c.end;
  });
});

// ---- remaining-sweeps follow-up coverage (style-parser-remaining-sweeps plan) ----

test("splitSentences regression: a normal multi-sentence paragraph actually splits (the old letter-lookahead check never split anything)", () => {
  const { ENGINE } = makeSandbox();
  const R = ENGINE.parse("The experiment lasted six months. Researchers collected data at three sites. Funding came from NSF.", { sweeps: { coherence: { on: true } } });
  // §3.2 (cohesive paragraphs) only fires when splitSentences() sees 3+
  // real sentences and finds no connector across them — a direct proof
  // the splitter now works, not just an incidental side effect.
  assert.ok(R.findings.some((f) => f.id === "3.2"), "expected §3.2 to fire on a connector-less 3-sentence paragraph");
});

test("Brevity (affirmative): flags needless-word/hedge phrases and an inflated word", () => {
  const { ENGINE } = makeSandbox();
  const text = "In light of the fact that the meeting has been postponed, it is necessary for us to reschedule. We should utilize a better methodology.";
  const R = ENGINE.parse(text, { sweeps: { brevity: { on: true } } });
  assert.equal(R.summary.classifications[0].id, "2");
  assert.ok(R.findings.some((f) => f.id === "2.1"), "expected §2.1 (omit needless words) to fire on 'the fact that'");
  assert.ok(R.findings.some((f) => f.id === "2.3"), "expected §2.3 (long word) to fire on 'utilize'/'methodology'");
  R.findings.forEach((f) => assert.equal(f.severity, "flag"));
});

test("Verbosity (Brevity toggled to opposite): recognises a cumulative sentence and a formal-word choice, not as errors", () => {
  const { ENGINE } = makeSandbox();
  const R = ENGINE.parse("We gather, in this place, at this hour, to remember, to give thanks, and to commit ourselves anew.", { sweeps: { brevity: { on: true, opposite: true } } });
  assert.equal(R.summary.classifications[0].id, "9");
  assert.ok(R.findings.some((f) => f.id === "9.1"));
  R.findings.forEach((f) => assert.equal(f.severity, "check"));
});

test("Coherence (affirmative): §3.1 old-before-new, §3.3 keep-related-words-together, §3.4 parallelism all fire on their worked examples", () => {
  const { ENGINE } = makeSandbox();
  const r1 = ENGINE.parse("The central bank announced a radical shift in monetary policy yesterday. A rising wave of inflation had prompted the decision.", { sweeps: { coherence: { on: true } } });
  assert.ok(r1.findings.some((f) => f.id === "3.1"));
  const r3 = ENGINE.parse("The committee, after reviewing all the evidence and consulting with outside experts over the course of three meetings, decided.", { sweeps: { coherence: { on: true } } });
  assert.ok(r3.findings.some((f) => f.id === "3.3"));
  const r4 = ENGINE.parse("The role involves writing reports, managing a team, and you must attend weekly meetings.", { sweeps: { coherence: { on: true } } });
  assert.ok(r4.findings.some((f) => f.id === "3.4"));
});

test("Incoherence (Coherence toggled to opposite): recognises new-before-old and disjointed juxtaposition as a technique", () => {
  const { ENGINE } = makeSandbox();
  const R = ENGINE.parse("It watched from the treeline for eleven minutes before the boy noticed. Nobody in the house knew what it was. A stranger arrived later that week.", { sweeps: { coherence: { on: true, opposite: true } } });
  assert.equal(R.summary.classifications[0].id, "10");
  assert.ok(R.findings.some((f) => f.id === "10.1"));
  assert.ok(R.findings.some((f) => f.id === "10.2"));
  R.findings.forEach((f) => assert.equal(f.severity, "check"));
});

test("Voice (affirmative): §4.1 passive, §4.2 affected phrase, §4.3 overwriting (2+ ornate words) all fire", () => {
  const { ENGINE } = makeSandbox();
  const r1 = ENGINE.parse("Mistakes were made during the audit process.", { sweeps: { voice: { on: true } } });
  assert.ok(r1.findings.some((f) => f.id === "4.1"));
  const r2 = ENGINE.parse("One cannot but be struck by the manifold splendours of the vista.", { sweeps: { voice: { on: true } } });
  assert.ok(r2.findings.some((f) => f.id === "4.2"));
  const r3 = ENGINE.parse("The resplendent, majestic orb of day sank beneath the cerulean horizon.", { sweeps: { voice: { on: true } } });
  assert.ok(r3.findings.some((f) => f.id === "4.3"));
});

test("Affectation (Voice toggled to opposite): recognises a mannered voice and elevated prose, and never re-runs §4.1's passive check", () => {
  const { ENGINE } = makeSandbox();
  const R = ENGINE.parse("One cannot but confess that mistakes were made during the audit process.", { sweeps: { voice: { on: true, opposite: true } } });
  assert.ok(R.findings.some((f) => f.id === "11.1"));
  assert.ok(!R.findings.some((f) => f.id === "4.1"), "§4.1 has no antithesis run — Clarity/Obscurity's §8.1 already owns passive-as-register");
});

test("Diction (affirmative): §5.1 cliché, §5.2 offbeat word, §5.3 overloaded figures all fire", () => {
  const { ENGINE } = makeSandbox();
  const r1 = ENGINE.parse("We kept our nose to the grindstone and left no stone unturned.", { sweeps: { diction: { on: true } } });
  assert.ok(r1.findings.some((f) => f.id === "5.1"));
  const r2 = ENGINE.parse("The resplendent prose drew every eye.", { sweeps: { diction: { on: true } } });
  assert.ok(r2.findings.some((f) => f.id === "5.2"));
  const r3 = ENGINE.parse("The meeting was tense, like a storm and as if a battle.", { sweeps: { diction: { on: true } } });
  assert.ok(r3.findings.some((f) => f.id === "5.3"));
});

test("Ornament (Diction toggled to opposite): recognises dense original figuration and an elevated word, but never runs the cliché check", () => {
  const { ENGINE } = makeSandbox();
  const R = ENGINE.parse("The house exhaled dust, like a storm and as if a battle, resplendent in its ruin.", { sweeps: { diction: { on: true, opposite: true } } });
  assert.ok(R.findings.some((f) => f.id === "12.1"));
  assert.ok(R.findings.some((f) => f.id === "12.2"));
  assert.ok(!R.findings.some((f) => f.id === "5.1"), "§5.1's freshness/cliché ban is not lifted in Ornament — no antithesis run for it");
});

test("Simple/Descriptive English scorecard: every one of §7.1-7.20 produces exactly one finding, and violations are caught", () => {
  const { ENGINE } = makeSandbox();
  const text = "The panel should be removed. It's hot after operation, e.g. right after a long run of the equipment which some people would say went on for a very extended period of time indeed.";
  const R = ENGINE.parse(text, { sweeps: { "simple-descriptive-english": { on: true } } });
  assert.equal(R.findings.length, 20, "every one of §7.1-7.20 must produce exactly one finding");
  const byId = Object.fromEntries(R.findings.map((f) => [f.id, f]));
  assert.equal(byId["7.3"].severity, "flag", "7.3 compound verb: 'should be removed' should be flagged");
  assert.equal(byId["7.4"].severity, "flag", "7.4 active voice: 'should be removed' is passive, should be flagged");
  assert.equal(byId["7.8"].severity, "flag", "7.8 no contractions: \"It's\" should be flagged");
  assert.equal(byId["7.20"].severity, "flag", "7.20 no Latin abbreviations: 'e.g.' should be flagged");
  R.findings.forEach((f) => assert.ok(["check", "info", "flag", "na"].includes(f.severity)));
  R.findings.forEach((f) => assert.equal(f.cat, "register"));
});

test("multi-sweep: two genres active together stay category 'genre' and each gets its own hueIndex from the manifest palette", () => {
  const { ENGINE } = makeSandbox();
  const text = "The report was reviewed by the committee. In light of the fact that the deadline passed, we should reschedule.";
  const R = ENGINE.parse(text, { sweeps: { clarity: { on: true }, brevity: { on: true } } });
  assert.equal(R.summary.counts.sweepCategory, "genre");
  assert.ok(R.findings.every((f) => f.cat === "genre"));
  const clarityClause = R._clauses.find((c) => c.id === "1.1");
  const brevityClause = R._clauses.find((c) => c.id === "2.1");
  assert.equal(clarityClause.hueIndex, 0, "clarity is the first palette entry (teal)");
  assert.equal(brevityClause.hueIndex, 1, "brevity is the second palette entry (amber)");
  assert.notEqual(clarityClause.hueIndex, brevityClause.hueIndex, "two simultaneously active genres must not collide on the same hue");
});

test("multi-sweep: a genre + a register active together reach category 'mixed' with correctly tagged findings", () => {
  const { ENGINE } = makeSandbox();
  const text = "The report was reviewed by the committee. Remove the panel and disconnect the cable.";
  const R = ENGINE.parse(text, { sweeps: { clarity: { on: true }, "simple-descriptive-english": { on: true } } });
  assert.equal(R.summary.counts.sweepCategory, "mixed");
  assert.ok(R.findings.some((f) => f.cat === "genre"));
  assert.ok(R.findings.some((f) => f.cat === "register"));
  assert.equal(R.summary.classifications.length, 2);
});

test("multi-sweep: a second genre's findings carry spanRef offset correctly into the FINAL concatenated spans[], not their own local 0-based index", () => {
  const { ENGINE } = makeSandbox();
  // Voice's own passive detector (§4.1) fires on "were made" -- if the
  // second sweep's spanRef isn't offset past the first sweep's spans, it
  // wrongly points at Brevity's span instead of Voice's own.
  const text = "Mistakes were made during the audit process. In light of the fact that the deadline passed, we must act.";
  const R = ENGINE.parse(text, { sweeps: { brevity: { on: true }, voice: { on: true } } });
  const voiceFinding = R.findings.find((f) => f.id === "4.1");
  assert.ok(voiceFinding, "expected §4.1 to fire");
  assert.ok(voiceFinding.spanRef !== undefined, "expected a spanRef on the finding");
  const referencedSpan = R.spans[voiceFinding.spanRef];
  assert.equal(referencedSpan.id, "4.1", "spanRef must resolve to VOICE's own span, not a colliding index from Brevity's local numbering");
  assert.equal(referencedSpan.start, voiceFinding.start);
  assert.equal(referencedSpan.end, voiceFinding.end);
});

test("multi-sweep: an antithesis and its own genre's hueIndex resolve to the same palette slot (Obscurity shares Clarity's teal)", () => {
  const { ENGINE } = makeSandbox();
  const R = ENGINE.parse("The report was reviewed by the committee.", { sweeps: { clarity: { on: true, opposite: true } } });
  const clause = R._clauses.find((c) => c.id === "8.1");
  assert.equal(clause.hueIndex, 0, "Obscurity (clarity's antithesis) must share clarity's own palette index");
});
