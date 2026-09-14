// B-7 unblock UI — smoke tests (TEST-1: node:test + node:assert/strict,
// TEST-2: three things per module, not exhaustive coverage).
//
// Scope note: `render.js`'s own `buildSkeleton` builds its DOM through a
// template string assigned to innerHTML — faithfully faking enough of
// `document` to run an innerHTML parse without jsdom (TEST-8 forbids it)
// would mean hand-rolling an HTML parser, out of proportion for a smoke
// test, so that one function is left to manual verification in a real
// browser. Every other DOM-building export in `render.js`
// (`buildCandidateRow`, `renderSummary`, `renderError`,
// `renderCapacityFigure`) builds through plain `createElement`/`textContent`
// calls with no innerHTML anywhere, so TEST-8's small hand-built fake below
// exercises them for real — this is what caught the outline-class mismatch
// fixed in candidate-list.css (`candidate-outline-this-week`, not
// `-week`): a fake DOM that records class names is exactly the kind of
// check a template-string reading would never have run against. `unblock.js`
// itself (the event-wiring entry point) stays manual-verification-only —
// its own DOM comes from `render.js`'s `buildSkeleton`, so testing it would
// still need the innerHTML parse this file deliberately doesn't build.
//
// Run: node tests/test_unblock.mjs

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.join(here, "..", "app", "unblock");
const moduleUrl = (name) => `${path.join(appDir, name)}`;

// ---------------------------------------------------------------------------
// A small hand-built fake DOM (TEST-8) — only what render.js's
// createElement-based exports actually use: creation, className/classList,
// dataset, textContent, appendChild, and the title attribute markGuessed
// sets/clears. No innerHTML support by design (see the scope note above).
// ---------------------------------------------------------------------------

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.dataset = {};
    this.children = [];
    this._classes = new Set();
    this._title = "";
  }
  get className() {
    return [...this._classes].join(" ");
  }
  set className(value) {
    this._classes = new Set(String(value).split(/\s+/).filter(Boolean));
  }
  get classList() {
    const classes = this._classes;
    return {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      toggle: (c, on) => (on ? classes.add(c) : classes.delete(c)),
      contains: (c) => classes.has(c),
    };
  }
  get textContent() {
    return this._textContent ?? "";
  }
  set textContent(value) {
    this._textContent = value;
    this.children = [];
  }
  appendChild(child) {
    this.children.push(child);
    return child;
  }
  setAttribute(name, value) {
    this[name] = String(value);
  }
  get title() {
    return this._title;
  }
  set title(value) {
    this._title = value;
  }
  removeAttribute(name) {
    if (name === "title") this._title = "";
  }
  querySelectorAll(selector) {
    // Only the "class-name search" shape render.js/tests need, over a flat
    // subtree — enough for this smoke test, not a real CSS engine.
    const className = selector.replace(/^\./, "");
    const found = [];
    const walk = (node) => {
      for (const child of node.children) {
        if (child._classes?.has(className)) found.push(child);
        walk(child);
      }
    };
    walk(this);
    return found;
  }
}

globalThis.document = { createElement: (tag) => new FakeElement(tag) };

const format = await import(moduleUrl("format.js"));
const capacity = await import(moduleUrl("capacity.js"));
const candidates = await import(moduleUrl("candidates.js"));
const writeControls = await import(moduleUrl("write-controls.js"));
const render = await import(moduleUrl("render.js"));

// ---------------------------------------------------------------------------
// format.js
// ---------------------------------------------------------------------------

test("format: effort/tokens rank order matches the glossary's own vocabulary", () => {
  assert.equal(format.effortRank("⚡ minutes"), 0);
  assert.equal(format.effortRank("🔨 an hour"), 1);
  assert.equal(format.effortRank("🏔️ a session"), 2);
  assert.equal(format.effortRank("bogus"), null); // JS-2: unknown is null, never a silent 0
  assert.equal(format.tokensRank("little"), 0);
  assert.equal(format.tokensRank("plenty"), 2);
  assert.equal(format.effortWeight("⚡ minutes"), 1); // model.py's 1-based scale
  assert.equal(format.effortWeight("🏔️ a session"), 3);
});

test("format: state cycles through all five values and wraps", () => {
  const seen = new Set();
  let state = null;
  for (let i = 0; i < format.STATE_CYCLE.length; i += 1) {
    state = format.nextState(state);
    seen.add(state);
  }
  assert.equal(seen.size, format.STATE_CYCLE.length);
  assert.equal(format.nextState(format.STATE_CYCLE.at(-1)), format.STATE_CYCLE[0]);
});

test("format: markGuessed toggles the one guessed-vs-stated treatment (STYLE.md)", () => {
  const classes = new Set();
  const el = {
    classList: { toggle: (name, on) => (on ? classes.add(name) : classes.delete(name)) },
    title: "",
    removeAttribute: (name) => {
      if (name === "title") el.title = "";
    },
  };
  format.markGuessed(el, true, "effort");
  assert.ok(classes.has("guessed"));
  assert.match(el.title, /guessed/);
  format.markGuessed(el, false, "effort");
  assert.ok(!classes.has("guessed"));
  assert.equal(el.title, "");
});

// ---------------------------------------------------------------------------
// capacity.js — FR-2a's own OQ-3 default, FR-2b's provisional duration/
// energy ceiling
// ---------------------------------------------------------------------------

test("capacity: agent ceiling admits progressively more as the bucket grows (OQ-3 default)", () => {
  assert.equal(capacity.agentCeiling("little"), 0);
  assert.equal(capacity.agentCeiling("some"), 1);
  assert.equal(capacity.agentCeiling("plenty"), 2);
});

test("capacity: a thin budget never produces a negative ceiling, and low energy narrows it", () => {
  assert.equal(capacity.lukeCeiling("10min", "normal"), 0);
  assert.equal(capacity.lukeCeiling("session", "low"), 1);
  assert.equal(capacity.lukeCeiling("10min", "low"), 0); // clamped, never negative (FR-3b's spirit)
});

test("capacity: session state starts on Luke, and never persists between calls (AD-1)", () => {
  const a = capacity.createCapacityState();
  a.worker = "agent";
  const b = capacity.createCapacityState();
  assert.equal(b.worker, "luke"); // a fresh call is not contaminated by a's mutation
});

// ---------------------------------------------------------------------------
// candidates.js — FR-1, FR-3, FR-3a/b, FR-4, model FR-6 (mind projects)
// ---------------------------------------------------------------------------

function field(value, guessed = false) {
  return { value, guessed };
}

function task({ index, action, kind, kindGuessed = false, effort, effortGuessed = false, tokens = "some", tokensGuessed = false, due = null }) {
  return {
    index,
    action,
    kind: field(kind, kindGuessed),
    effort: field(effort, effortGuessed),
    tokens: field(tokens, tokensGuessed),
    due,
  };
}

function project({ id, title, context = "Church", tasks, outline = "none", isMindProject = false }) {
  return { id, title, context, tasks, outline, is_mind_project: isMindProject, stale_handover: false };
}

test("candidates: a project's row is its first open kind-3/4 task, never a stray kind-1 next_action", () => {
  const p = project({
    id: "CH-01",
    title: "Test project",
    tasks: [
      task({ index: "1", action: "waiting on someone else", kind: 1 }),
      task({ index: "2", action: "actually mine", kind: 3, effort: "⚡ minutes" }),
    ],
  });
  const rows = candidates.buildCandidates({ projects: [p], depot: [] });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].action, "actually mine");
  assert.equal(rows[0].kind, 3);
});

test("candidates: a mind project (model FR-6) never produces a row, however open its 2s/5s are", () => {
  const mind = project({
    id: "PP-14",
    title: "Mind project",
    isMindProject: true,
    tasks: [task({ index: "1", action: "someday idea", kind: 2 })],
  });
  const rows = candidates.buildCandidates({ projects: [mind], depot: [] });
  assert.equal(rows.length, 0);
});

test("candidates: forWorker hides kind-3 (Luke-only) work from an agent (AC-2, AC-7)", () => {
  const rows = [
    { kind: 3, id: "a" },
    { kind: 4, id: "b" },
  ];
  const forAgent = candidates.forWorker(rows, "agent");
  assert.deepEqual(forAgent.map((r) => r.id), ["b"]);
  assert.equal(candidates.forWorker(rows, "luke").length, 2);
});

test("candidates: a little agent budget shortens the list without emptying it (AC-1b)", () => {
  const p1 = project({ id: "A", title: "A", tasks: [task({ index: "1", action: "small", kind: 4, tokens: "little" })] });
  const p2 = project({ id: "B", title: "B", tasks: [task({ index: "1", action: "big", kind: 4, tokens: "plenty" })] });
  const rows = candidates.forWorker(candidates.buildCandidates({ projects: [p1, p2], depot: [] }), "agent");
  const { fitting, dropped } = candidates.applyFit(rows, "agent", capacity.agentCeiling("little"));
  assert.deepEqual(fitting.map((r) => r.title), ["A"]);
  assert.deepEqual(dropped.map((r) => r.title), ["B"]);
});

test("candidates: an overdue project is exempted from the fit test rather than hidden (Risks table)", () => {
  const overdue = project({
    id: "C",
    title: "Overdue",
    outline: "overdue",
    tasks: [task({ index: "1", action: "huge but overdue", kind: 3, effort: "🏔️ a session" })],
  });
  const rows = candidates.buildCandidates({ projects: [overdue], depot: [] });
  const { fitting, exemptOverdue, dropped } = candidates.applyFit(rows, "luke", 0); // ceiling: minutes only
  assert.equal(fitting.length, 0);
  assert.equal(dropped.length, 0);
  assert.equal(exemptOverdue.length, 1);
});

test("candidates: cheapest-first ranking never lets urgency jump the queue (AC-1e)", () => {
  const cheap = project({ id: "P1", title: "Cheap", due: null, tasks: [task({ index: "1", action: "cheap", kind: 3, effort: "⚡ minutes" })] });
  const heavyOverdue = project({
    id: "P2",
    title: "Heavy overdue",
    outline: "overdue",
    tasks: [task({ index: "1", action: "heavy", kind: 3, effort: "🏔️ a session", due: "2020-01-01" })],
  });
  const rows = candidates.buildCandidates({ projects: [cheap, heavyOverdue], depot: [] });
  const sorted = candidates.sortCheapestFirst(rows, "luke", "2026-09-06");
  assert.deepEqual(sorted.map((r) => r.title), ["Cheap", "Heavy overdue"]);
});

// ---------------------------------------------------------------------------
// write-controls.js — TEST-7's two gate tests over the mtime guard: the
// blocked path (no known mtime, or a stale one) is genuinely blocked and
// touches the network not at all or gets the write refused; the permitted
// path (a fresh mtime) passes through and reaches the real fetch call.
// ---------------------------------------------------------------------------

function fakeFetchOnce(responder) {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, body: init?.body ? JSON.parse(init.body) : undefined });
    return responder(url, init);
  };
  return calls;
}

test("write-controls gate 1 (blocked): a row with no known mtime never reaches the network", async () => {
  const calls = fakeFetchOnce(() => {
    throw new Error("fetch must not be called");
  });
  const row = { projectId: "CH-01", row: "3", mtime: null };
  await assert.rejects(() => writeControls.markDone(row), writeControls.MissingMtimeError);
  assert.equal(calls.length, 0);
});

test("write-controls gate 1b (blocked): a stale mtime on the server surfaces as a conflict, not a silent retry", async () => {
  fakeFetchOnce(async () => new Response(JSON.stringify({ error: "conflict", message: "stale" }), { status: 409 }));
  const row = { projectId: "CH-01", row: "3", mtime: 12345 };
  await assert.rejects(
    () => writeControls.markDone(row),
    (err) => err instanceof writeControls.ApiError && err.kind === "conflict"
  );
});

test("write-controls gate 2 (permitted): a fresh mtime reaches the real request with the right shape", async () => {
  const calls = fakeFetchOnce(
    async () =>
      new Response(JSON.stringify({ ok: true, project_id: "CH-01", row: "3", column: "status", value: "☑ Done", mtime: 999, completion_logged: true }), {
        status: 200,
      })
  );
  const row = { projectId: "CH-01", row: "3", mtime: 12345 };
  const result = await writeControls.markDone(row);
  assert.equal(result.ok, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "/api/edit");
  assert.deepEqual(calls[0].body, { project_id: "CH-01", row: "3", mtime: 12345, action: "set_cell", column: "status", value: "☑ Done" });
});

test("write-controls: appendScrapToRow tolerates a missing mtime (writes.append_scrap's own contract)", async () => {
  const calls = fakeFetchOnce(async () => new Response(JSON.stringify({ ok: true, project_id: "CH-01", mtime: 1 }), { status: 200 }));
  const row = { projectId: "CH-01", mtime: null };
  const result = await writeControls.appendScrapToRow(row, "called Sarah, left a message");
  assert.equal(result.ok, true);
  assert.equal(calls[0].body.mtime, null);
});

test("write-controls gate 1 (blocked): cycleState never reaches the network without a known mtime", async () => {
  const calls = fakeFetchOnce(() => {
    throw new Error("fetch must not be called");
  });
  const row = { projectId: "CH-01", row: "3", state: null, mtime: null };
  await assert.rejects(() => writeControls.cycleState(row), writeControls.MissingMtimeError);
  assert.equal(calls.length, 0);
});

test("write-controls gate 2 (permitted): cycleState advances the state through format's own cycle and posts set_cell", async () => {
  const calls = fakeFetchOnce(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
  const row = { projectId: "CH-01", row: "3", state: format.STATE_CYCLE[0], mtime: 12345 };
  await writeControls.cycleState(row);
  assert.equal(calls[0].url, "/api/edit");
  assert.deepEqual(calls[0].body, {
    project_id: "CH-01",
    row: "3",
    mtime: 12345,
    action: "set_cell",
    column: "state",
    value: format.nextState(format.STATE_CYCLE[0]),
  });
});

test("write-controls gate 1 (blocked): handOverRow never reaches the network without a known mtime", async () => {
  const calls = fakeFetchOnce(() => {
    throw new Error("fetch must not be called");
  });
  const row = { projectId: "CH-01", row: "3", mtime: null };
  await assert.rejects(() => writeControls.handOverRow(row, "James"), writeControls.MissingMtimeError);
  assert.equal(calls.length, 0);
});

test("write-controls: handOverRow refuses a missing recipient before touching the network", async () => {
  const calls = fakeFetchOnce(() => {
    throw new Error("fetch must not be called");
  });
  const row = { projectId: "CH-01", row: "3", mtime: 12345 };
  await assert.rejects(() => writeControls.handOverRow(row, ""), /recipient/);
  assert.equal(calls.length, 0);
});

test("write-controls gate 2 (permitted): handOverRow posts the hand_over action with the recipient", async () => {
  const calls = fakeFetchOnce(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
  const row = { projectId: "CH-01", row: "3", mtime: 12345 };
  await writeControls.handOverRow(row, "James Cox");
  assert.equal(calls[0].url, "/api/edit");
  assert.deepEqual(calls[0].body, { project_id: "CH-01", row: "3", mtime: 12345, action: "hand_over", recipient: "James Cox" });
});

test("write-controls: askAgentAboutRow posts one request row against the project as source", async () => {
  const calls = fakeFetchOnce(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
  const row = { projectId: "CH-01", action: "confirm the date with James" };
  await writeControls.askAgentAboutRow(row);
  assert.equal(calls[0].url, "/api/request");
  assert.deepEqual(calls[0].body, { source: "project:CH-01", text: "confirm the date with James" });
});

test("write-controls: dispatchDepotRow appends one _requests.yaml row against the depot as source (AC-6)", async () => {
  const calls = fakeFetchOnce(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
  const row = { id: "7", action: "file the receipt" };
  await writeControls.dispatchDepotRow(row);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "/api/request");
  assert.deepEqual(calls[0].body, { source: "depot:7", text: "file the receipt" });
});

// ---------------------------------------------------------------------------
// render.js — TEST-8 over the fake DOM above. Covers every export except
// `buildSkeleton` (see the file's own scope note).
// ---------------------------------------------------------------------------

function candidateRow(overrides = {}) {
  return {
    source: "project",
    id: "project:CH-01:2",
    title: "Test project",
    action: "confirm the date with James",
    kind: format.KIND_MINE,
    effort: "⚡ minutes",
    effortGuessed: false,
    tokens: "some",
    tokensGuessed: false,
    due: null,
    outline: "none",
    ...overrides,
  };
}

test("render: a due-this-week project row carries the class this file's own CSS actually defines", () => {
  const li = render.buildCandidateRow(candidateRow({ outline: "this-week" }), { exempt: false });
  const badge = li.querySelectorAll(".candidate-outline")[0];
  assert.ok(badge, "no .candidate-outline element was built");
  // Guards the exact regression fixed in candidate-list.css: model.py's
  // outline value is "this-week", so the class must be
  // "candidate-outline-this-week", not "-week" (the two classes disagree
  // silently — no error, just an unstyled badge — which is why this needed
  // a test rather than a re-read).
  assert.ok(badge.classList.contains("candidate-outline-this-week"));
  assert.ok(!badge.classList.contains("candidate-outline-week"));
});

test("render: an overdue project row's badge takes the overdue class, and the exempt note only renders when exempt", () => {
  const row = candidateRow({ outline: "overdue" });
  const shown = render.buildCandidateRow(row, { exempt: false });
  const badge = shown.querySelectorAll(".candidate-outline")[0];
  assert.ok(badge.classList.contains("candidate-outline-overdue"));
  assert.equal(shown.querySelectorAll(".candidate-exempt-note").length, 0);

  const exempt = render.buildCandidateRow(row, { exempt: true });
  assert.equal(exempt.querySelectorAll(".candidate-exempt-note").length, 1);
});

test("render: kind 3 gets a done control, kind 4 gets hand-over (and its inline form), never both (FR-5/FR-6)", () => {
  const mine = render.buildCandidateRow(candidateRow({ kind: format.KIND_MINE }), { exempt: false });
  const mineActions = mine.querySelectorAll(".candidate-control").map((b) => b.dataset.action);
  assert.ok(mineActions.includes("done"));
  assert.ok(!mineActions.includes("hand-over-open"));

  const handover = render.buildCandidateRow(candidateRow({ kind: format.KIND_HANDOVER }), { exempt: false });
  const handoverActions = handover.querySelectorAll(".candidate-control").map((b) => b.dataset.action);
  assert.ok(handoverActions.includes("hand-over-open"));
  assert.ok(!handoverActions.includes("done"));
  assert.equal(handover.querySelectorAll(".candidate-inline-form").length, 2); // scrap + hand-over
});

test("render: a depot row offers only dispatch, badged 'depot', with no done/hand-over/scrap/ask control (AC-5a's other half)", () => {
  const depot = render.buildCandidateRow(
    candidateRow({ source: "depot", id: "depot:3", effort: null, outline: "none", kind: format.KIND_HANDOVER }),
    { exempt: false }
  );
  const actions = depot.querySelectorAll(".candidate-control").map((b) => b.dataset.action);
  assert.deepEqual(actions, ["dispatch"]);
  assert.equal(depot.querySelectorAll(".candidate-depot-badge").length, 1);
});

test("render: a guessed effort/tokens value carries the one guessed-vs-stated class; a stated one does not", () => {
  const guessed = render.buildCandidateRow(candidateRow({ effortGuessed: true, tokensGuessed: true }), { exempt: false });
  const effortEl = guessed.querySelectorAll(".candidate-effort")[0];
  const tokensEl = guessed.querySelectorAll(".candidate-tokens")[0];
  assert.ok(effortEl.classList.contains("guessed"));
  assert.ok(tokensEl.classList.contains("guessed"));

  const stated = render.buildCandidateRow(candidateRow({ effortGuessed: false, tokensGuessed: false }), { exempt: false });
  assert.ok(!stated.querySelectorAll(".candidate-effort")[0].classList.contains("guessed"));
});

test("render: renderSummary/renderError/renderCapacityFigure write the expected text and hidden state", () => {
  const summary = new FakeElement("p");
  render.renderSummary(summary, { shown: 2, total: 5, worker: "agent" });
  assert.match(summary.textContent, /Showing 2 of 5/);

  const errorEl = new FakeElement("p");
  errorEl.hidden = true;
  render.renderError(errorEl, "Could not load the board.");
  assert.equal(errorEl.hidden, false);
  render.renderError(errorEl, null);
  assert.equal(errorEl.hidden, true);

  const figureEl = new FakeElement("p");
  render.renderCapacityFigure(figureEl, null);
  assert.equal(figureEl.hidden, true);
  render.renderCapacityFigure(figureEl, { capacity: 42, fitted: false });
  assert.equal(figureEl.hidden, false);
  assert.ok(figureEl.classList.contains("guessed")); // fitted:false renders guessed (FR-11, AC-1d)
});

// ---------------------------------------------------------------------------
// Static vocabulary checks — AC-1f, AC-8, and D-17's retired-terms rule,
// automated rather than left to a manual grep before every change.
// ---------------------------------------------------------------------------

const SOURCE_FILES = ["format.js", "capacity.js", "candidates.js", "write-controls.js", "api.js", "unblock.js", "render.js"];

test("AC-1f: no reference to `importance` anywhere in this module", () => {
  for (const file of SOURCE_FILES) {
    const text = readFileSync(path.join(appDir, file), "utf8");
    assert.ok(!/importance/i.test(text), `${file} references importance`);
  }
});

test("AC-8: no park control, and `parked` appears nowhere in this module", () => {
  for (const file of SOURCE_FILES) {
    const text = readFileSync(path.join(appDir, file), "utf8");
    assert.ok(!/parked/i.test(text), `${file} references parked`);
  }
});

test("D-17: no retired term (grid, cell, weather, storm, yard, podium) appears in this module", () => {
  const retired = /\b(grid|weather|storm|overcast|\byard\b|podium)\b/i;
  for (const file of SOURCE_FILES) {
    const text = readFileSync(path.join(appDir, file), "utf8");
    assert.ok(!retired.test(text), `${file} uses a retired term`);
  }
});
