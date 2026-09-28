import test from "node:test";
import assert from "node:assert/strict";

import {
  createStoryStore,
  loadStory,
  MAX_BEADS,
  MAX_RIBBONS,
  TANDEM_MAX,
  UNDO_MS,
  MAX_NOTE,
  TANDEM_FULL_MESSAGE,
  addBead,
  storyStore,
} from "../app/story/story-model.js";
import { MAX_LABEL } from "../app/data/elements.js";
import { EVT_STORY_CHANGED } from "../app/shared/events.js";

const KNOWN = new Set(["A", "B", "C", "D", "E", "Rg"]);

/** A store wired to fakes: element lookup, event target, clock and warning log. */
function makeStore(overrides = {}) {
  const events = [];
  const warnings = [];
  const clock = { t: 1000 };
  const store = createStoryStore({
    elementExists: (id) => KNOWN.has(id),
    eventTarget: { dispatchEvent: (event) => events.push(event) },
    now: () => clock.t,
    warn: (message) => warnings.push(message),
    ...overrides,
  });
  return { store, events, warnings, clock };
}

const uids = (store) => store.getState().beads.map((bead) => bead.uid);
const ribbons = (store) => store.getState().ribbons;
const elementIds = (store) => store.getState().beads.map((bead) => bead.elementId);

/** Adds each element after the previous one (empty-space drops) and returns the new uids. */
function buildChain(store, ids) {
  return ids.map((id) => {
    const result = store.addBead(id, { type: "empty" });
    assert.equal(result.ok, true);
    return result.uid;
  });
}

function deepFreeze(value) {
  if (value && typeof value === "object") {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

test("constants match the spec", () => {
  assert.equal(MAX_BEADS, 200);
  assert.equal(MAX_RIBBONS, 400);
  assert.equal(TANDEM_MAX, 2);
  assert.equal(UNDO_MS, 6000);
  assert.equal(TANDEM_FULL_MESSAGE, "A tandem holds two");
});

/* ---------- add: the drop targets (FR-C3, C4, AC-C1, AC-C2) ---------- */

test("drop on empty space with no active bead starts an unattached bead and makes it active", () => {
  const { store } = makeStore();
  const result = store.addBead("A", { type: "empty" });
  assert.deepEqual(result, { ok: true, uid: "b1", placed: "started" });
  assert.deepEqual(store.getState(), {
    beads: [{ uid: "b1", elementId: "A" }],
    ribbons: [],
    activeUid: "b1",
  });
});

test("drop on empty space joins after the active bead, so a chain is effortless", () => {
  const { store } = makeStore();
  const [a, b, c] = buildChain(store, ["A", "B", "C"]);
  assert.deepEqual(ribbons(store), [[a, b], [b, c]]);
  assert.equal(store.getActiveUid(), c);
});

test("a missing target means empty space", () => {
  const { store } = makeStore();
  store.addBead("A");
  const second = store.addBead("B");
  assert.equal(second.placed, "joined");
});

test("newRibbon clears the active bead so the next drop starts an unattached bead", () => {
  const { store } = makeStore();
  const [a] = buildChain(store, ["A"]);
  assert.deepEqual(store.newRibbon(), { ok: true });
  assert.equal(store.getActiveUid(), null);
  const result = store.addBead("B", { type: "empty" });
  assert.equal(result.placed, "started");
  assert.deepEqual(ribbons(store), []);
  assert.notEqual(result.uid, a);
});

test("drop on a bead branches from it (a fork), leaving the active chain intact", () => {
  const { store } = makeStore();
  const [a, b] = buildChain(store, ["A", "B"]);
  const fork = store.addBead("C", { type: "bead", uid: a });
  assert.equal(fork.placed, "branched");
  assert.deepEqual(ribbons(store), [[a, b], [a, fork.uid]]);
  assert.equal(store.getActiveUid(), fork.uid);
});

test("drop on a ribbon splices a new bead into it, in the ribbon's place", () => {
  const { store } = makeStore();
  const [a, b, c] = buildChain(store, ["A", "B", "C"]);
  const inserted = store.addBead("D", { type: "ribbon", from: a, to: b });
  assert.equal(inserted.placed, "inserted");
  assert.deepEqual(ribbons(store), [[a, inserted.uid], [inserted.uid, b], [b, c]]);
});

test("guard: dropping on a ribbon or bead that does not exist is refused, changes nothing and warns", () => {
  const { store, warnings, events } = makeStore();
  buildChain(store, ["A", "B"]);
  const before = store.getState();
  const eventsBefore = events.length;
  const noRibbon = store.addBead("C", { type: "ribbon", from: "b1", to: "zz" });
  const noBead = store.addBead("C", { type: "bead", uid: "zz" });
  assert.equal(noRibbon.error.code, "no-such-ribbon");
  assert.equal(noBead.error.code, "unknown-bead");
  assert.deepEqual(store.getState(), before);
  assert.equal(events.length, eventsBefore);
  assert.equal(warnings.length, 2);
});

test("guard: an unknown element or a malformed target is refused with a warning", () => {
  const { store, warnings } = makeStore();
  assert.equal(store.addBead("nope", { type: "empty" }).error.code, "unknown-element");
  assert.equal(store.addBead(42, { type: "empty" }).error.code, "unknown-element");
  assert.equal(store.addBead("A", { type: "sideways" }).error.code, "bad-argument");
  assert.equal(store.addBead("A", "b1").error.code, "bad-argument");
  assert.deepEqual(store.getState().beads, []);
  assert.equal(warnings.length, 4);
});

test("the same element may fill several beads", () => {
  const { store } = makeStore();
  buildChain(store, ["A", "A", "A"]);
  assert.deepEqual(elementIds(store), ["A", "A", "A"]);
});

/* ---------- events ---------- */

test("every change sends storytelling:story-changed with copies of the beads, ribbons and active uid", () => {
  const { store, events } = makeStore();
  store.addBead("A");
  assert.equal(events.length, 1);
  assert.equal(events[0].type, EVT_STORY_CHANGED);
  assert.deepEqual(events[0].detail, { beads: [{ uid: "b1", elementId: "A" }], ribbons: [], activeUid: "b1" });
  events[0].detail.beads[0].elementId = "TAMPERED";
  assert.equal(store.getState().beads[0].elementId, "A");
});

test("a refused operation sends no event", () => {
  const { store, events } = makeStore();
  store.addBead("nope");
  assert.equal(events.length, 0);
});

test("with no document and no event target the store still works", () => {
  const store = createStoryStore({ elementExists: (id) => KNOWN.has(id) });
  assert.equal(store.addBead("A").ok, true);
});

test("the default element lookup is built on ELEMENTS + ROGUE (Rogue is always known)", () => {
  const store = createStoryStore({ eventTarget: { dispatchEvent() {} }, warn() {} });
  assert.equal(store.addBead("Rg").ok, true);
  assert.equal(store.addBead("definitely-not-an-element").error.code, "unknown-element");
});

test("the app's bound functions act on the shared store", () => {
  assert.equal(addBead("definitely-not-an-element").ok, false);
  assert.equal(typeof storyStore.getState, "function");
});

/* ---------- caps (FR-C1, AD-C4) ---------- */

test("the 200-bead cap refuses the next bead with a visible message", () => {
  const { store } = makeStore();
  for (let i = 0; i < MAX_BEADS; i += 1) assert.equal(store.addBead("A", { type: "empty" }).ok, true);
  const refused = store.addBead("B", { type: "empty" });
  assert.equal(refused.ok, false);
  assert.equal(refused.error.code, "cap-reached");
  assert.match(refused.error.message, /200 beads/);
  assert.equal(store.getState().beads.length, MAX_BEADS);
});

test("the 400-ribbon cap refuses a link and any drop that needs a new ribbon, leaving no stray bead", () => {
  const { store } = makeStore();
  const beadUids = [];
  for (let i = 0; i < 30; i += 1) beadUids.push(store.addBead("A", { type: "empty" }).uid);
  let added = store.getState().ribbons.length;
  outer: for (const from of beadUids) {
    for (const to of beadUids) {
      if (added >= MAX_RIBBONS) break outer;
      if (store.linkBeads(from, to).ok) added += 1;
    }
  }
  assert.equal(store.getState().ribbons.length, MAX_RIBBONS);
  const beadsBefore = store.getState().beads.length;
  const refusedLink = store.linkBeads(beadUids[5], beadUids[3]);
  const refusedBranch = store.addBead("B", { type: "bead", uid: beadUids[0] });
  assert.equal(refusedLink.ok, false);
  assert.equal(refusedBranch.error.code, "cap-reached");
  assert.equal(store.getState().beads.length, beadsBefore);
});

/* ---------- linking and cutting (FR-C5, AC-C3) ---------- */

test("linkBeads builds a merge and a loop", () => {
  const { store } = makeStore();
  const [a, b, c] = buildChain(store, ["A", "B", "C"]);
  const d = store.addBead("D", { type: "bead", uid: a }).uid; // fork a → b, a → d
  assert.equal(store.linkBeads(d, c).ok, true); // merge into c: b → c and d → c
  assert.equal(store.linkBeads(c, a).ok, true); // loop back to the start
  assert.deepEqual(ribbons(store), [[a, b], [b, c], [a, d], [d, c], [c, a]]);
});

test("guard: linking refuses self-links, duplicates and unknown beads", () => {
  const { store, warnings } = makeStore();
  const [a, b] = buildChain(store, ["A", "B"]);
  assert.equal(store.linkBeads(a, a).error.code, "self-link");
  assert.equal(store.linkBeads(a, b).error.code, "duplicate-ribbon");
  assert.equal(store.linkBeads(a, "zz").error.code, "unknown-bead");
  assert.deepEqual(ribbons(store), [[a, b]]);
  assert.equal(warnings.length, 1);
});

test("cutRibbon removes exactly that ribbon", () => {
  const { store } = makeStore();
  const [a, b, c] = buildChain(store, ["A", "B", "C"]);
  assert.deepEqual(store.cutRibbon(a, b), { ok: true });
  assert.deepEqual(ribbons(store), [[b, c]]);
});

test("guard: cutting a ribbon that is not there is refused", () => {
  const { store, warnings } = makeStore();
  const [a, b] = buildChain(store, ["A", "B"]);
  assert.equal(store.cutRibbon(b, a).error.code, "no-such-ribbon");
  assert.equal(warnings.length, 1);
});

/* ---------- active bead ---------- */

test("setActive changes which bead the next drop joins; an unknown bead is refused", () => {
  const { store } = makeStore();
  const [a, b] = buildChain(store, ["A", "B"]);
  assert.equal(store.setActive(a).ok, true);
  const next = store.addBead("C", { type: "empty" });
  assert.deepEqual(ribbons(store), [[a, b], [a, next.uid]]);
  assert.equal(store.setActive("zz").error.code, "unknown-bead");
});

/* ---------- remove and heal (FR-C6, AC-C4) ---------- */

test("removing a middle bead of a straight chain leaves an unbroken chain", () => {
  const { store } = makeStore();
  const [a, b, c, d] = buildChain(store, ["A", "B", "C", "D"]);
  const result = store.removeBead(b);
  assert.deepEqual(result, { ok: true, uid: b, healed: [[a, c]] });
  assert.deepEqual(uids(store), [a, c, d]);
  assert.deepEqual(ribbons(store), [[a, c], [c, d]]);
});

test("removing the first or last bead just shortens the chain", () => {
  const { store } = makeStore();
  const [a, b, c] = buildChain(store, ["A", "B", "C"]);
  store.removeBead(a);
  assert.deepEqual(ribbons(store), [[b, c]]);
  store.removeBead(c);
  assert.deepEqual(ribbons(store), []);
  assert.deepEqual(uids(store), [b]);
});

test("removing a bead that merges and forks reconnects every parent to every child, without duplicates", () => {
  const { store } = makeStore();
  const [p1, x, c1] = buildChain(store, ["A", "B", "C"]);
  const p2 = store.newRibbon() && store.addBead("D", { type: "empty" }).uid;
  store.linkBeads(p2, x);
  const c2 = store.addBead("E", { type: "bead", uid: x }).uid;
  store.linkBeads(p1, c1); // an existing ribbon the heal would otherwise duplicate
  store.removeBead(x);
  const keys = ribbons(store).map(([from, to]) => `${from}>${to}`).sort();
  assert.deepEqual(keys, [`${p1}>${c1}`, `${p1}>${c2}`, `${p2}>${c1}`, `${p2}>${c2}`].sort());
});

test("healing keeps a parent's first child first, so its lane does not change", () => {
  const { store } = makeStore();
  const [a, b, c] = buildChain(store, ["A", "B", "C"]);
  const d = store.addBead("D", { type: "bead", uid: a }).uid;
  store.removeBead(b);
  assert.deepEqual(ribbons(store), [[a, c], [a, d]]);
});

test("healing never makes a self-link when the removed bead sat in a loop", () => {
  const { store } = makeStore();
  const [a, b] = buildChain(store, ["A", "B"]);
  store.linkBeads(b, a);
  store.removeBead(b);
  assert.deepEqual(ribbons(store), []);
});

test("removing the active bead moves the active bead to the one before it", () => {
  const { store } = makeStore();
  const [a, b] = buildChain(store, ["A", "B"]);
  store.removeBead(b);
  assert.equal(store.getActiveUid(), a);
  store.removeBead(a);
  assert.equal(store.getActiveUid(), null);
});

test("guard: removing an unknown bead is refused", () => {
  const { store, warnings } = makeStore();
  assert.equal(store.removeBead("zz").error.code, "unknown-bead");
  assert.equal(warnings.length, 1);
});

/* ---------- move (FR-C6, AC-C4) ---------- */

test("moving a bead is one gesture: it heals its old place and joins the new target, sending one event", () => {
  const { store, events } = makeStore();
  const [a, b, c, d] = buildChain(store, ["A", "B", "C", "D"]);
  const before = events.length;
  const result = store.moveBead(b, { type: "empty" }); // active is d
  assert.deepEqual(result, { ok: true, uid: b, placed: "joined" });
  assert.equal(events.length, before + 1);
  assert.deepEqual(ribbons(store), [[a, c], [c, d], [d, b]]);
  assert.equal(store.getActiveUid(), b);
});

test("a bead can be moved onto another bead (branch) or onto a ribbon (insert)", () => {
  const { store } = makeStore();
  const [a, b, c, d] = buildChain(store, ["A", "B", "C", "D"]);
  assert.equal(store.moveBead(d, { type: "bead", uid: a }).placed, "branched");
  assert.deepEqual(ribbons(store), [[a, b], [b, c], [a, d]]);
  assert.equal(store.moveBead(d, { type: "ribbon", from: b, to: c }).placed, "inserted");
  assert.deepEqual(ribbons(store), [[a, b], [b, d], [d, c]]);
});

test("guard: a move that cannot land is refused and leaves the map exactly as it was", () => {
  const { store } = makeStore();
  const [a, b, c] = buildChain(store, ["A", "B", "C"]);
  const before = store.getState();
  assert.equal(store.moveBead(b, { type: "bead", uid: b }).error.code, "self-link");
  assert.equal(store.moveBead(b, { type: "ribbon", from: a, to: b }).error.code, "no-such-ribbon");
  assert.equal(store.moveBead("zz", { type: "empty" }).error.code, "unknown-bead");
  assert.deepEqual(store.getState(), before);
  assert.notEqual(c, undefined);
});

test("moving the active bead to empty space leaves it as a new unattached start", () => {
  const { store } = makeStore();
  const [a, b] = buildChain(store, ["A", "B"]);
  assert.equal(store.moveBead(b, { type: "empty" }).placed, "started");
  assert.deepEqual(ribbons(store), []);
  assert.equal(store.getActiveUid(), b);
  assert.notEqual(a, undefined);
});

/* ---------- tandem (FR-C16, AC-C12) ---------- */

test("a tile dropped on a dock pairs with that bead; the bead stays one bead and becomes active", () => {
  const { store } = makeStore();
  const [a] = buildChain(store, ["A"]);
  const result = store.addBead("B", { type: "dock", uid: a });
  assert.deepEqual(result, { ok: true, uid: a, placed: "paired" });
  assert.deepEqual(store.getState().beads, [{ uid: a, elementId: "A", with: "B" }]);
});

test("a tandem takes no third element and says 'A tandem holds two'", () => {
  const { store } = makeStore();
  const [a] = buildChain(store, ["A"]);
  store.addBead("B", { type: "dock", uid: a });
  const refused = store.addBead("C", { type: "dock", uid: a });
  assert.equal(refused.error.code, "tandem-full");
  assert.equal(refused.error.message, "A tandem holds two");
  assert.equal(store.pairBead(a, "C").error.message, TANDEM_FULL_MESSAGE);
  assert.equal(store.getState().beads[0].with, "B");
});

test("the same element cannot be paired with itself, but two rogue cards may pair with their own labels", () => {
  const { store } = makeStore();
  const [a] = buildChain(store, ["A"]);
  assert.equal(store.pairBead(a, "A").error.code, "same-element");
  const rogue = store.addBead("Rg", { type: "empty" }, { label: "Mentor" }).uid;
  assert.equal(store.pairBead(rogue, "Rg", { label: "Rival" }).ok, true);
  assert.deepEqual(store.getBead(rogue), {
    uid: rogue, elementId: "Rg", with: "Rg", label: "Mentor", withLabel: "Rival",
  });
});

test("guard: pairing needs a real bead and a real element", () => {
  const { store, warnings } = makeStore();
  const [a] = buildChain(store, ["A"]);
  assert.equal(store.pairBead("zz", "B").error.code, "unknown-bead");
  assert.equal(store.pairBead(a, "nope").error.code, "unknown-element");
  assert.equal(warnings.length, 2);
});

test("split returns two beads in sequence: ribbons in stay on the first, ribbons out move to the second", () => {
  const { store } = makeStore();
  const [a, t, c] = buildChain(store, ["A", "B", "C"]);
  store.pairBead(t, "D");
  store.setNote(t, "the pair");
  const result = store.splitBead(t);
  assert.equal(result.ok, true);
  const second = result.secondUid;
  assert.deepEqual(uids(store), [a, t, second, c]);
  assert.deepEqual(store.getBead(t), { uid: t, elementId: "B", note: "the pair" });
  assert.deepEqual(store.getBead(second), { uid: second, elementId: "D" });
  assert.deepEqual(ribbons(store), [[a, t], [second, c], [t, second]]);
});

test("split of the active tandem makes its second half active", () => {
  const { store } = makeStore();
  const [a] = buildChain(store, ["A"]);
  store.pairBead(a, "B");
  const { secondUid } = store.splitBead(a);
  assert.equal(store.getActiveUid(), secondUid);
});

test("guard: splitting a plain bead is refused; a tandem counts as one bead for the cap", () => {
  const { store } = makeStore();
  const [a] = buildChain(store, ["A"]);
  assert.equal(store.splitBead(a).error.code, "not-tandem");
  assert.equal(store.splitBead("zz").error.code, "unknown-bead");
  store.pairBead(a, "B");
  for (let i = 1; i < MAX_BEADS; i += 1) store.addBead("C", { type: "empty" });
  assert.equal(store.getState().beads.length, MAX_BEADS);
  assert.equal(store.splitBead(a).error.code, "cap-reached");
  assert.equal(store.getBead(a).with, "B");
});

test("swap exchanges the two halves, labels travelling with their cards", () => {
  const { store } = makeStore();
  const a = store.addBead("A").uid;
  store.pairBead(a, "Rg", { label: "Ghost" });
  assert.equal(store.swapTandem(a).ok, true);
  assert.deepEqual(store.getBead(a), { uid: a, elementId: "Rg", with: "A", label: "Ghost" });
  store.swapTandem(a);
  assert.deepEqual(store.getBead(a), { uid: a, elementId: "A", with: "Rg", withLabel: "Ghost" });
  assert.equal(store.swapTandem("zz").error.code, "unknown-bead");
  const [plain] = buildChain(store, ["B"]);
  assert.equal(store.swapTandem(plain).error.code, "not-tandem");
});

test("merge re-points the dragged bead's ribbons to the target and drops duplicates and self-links", () => {
  const { store } = makeStore();
  const [a, b, c, d] = buildChain(store, ["A", "B", "C", "D"]); // a→b→c→d
  store.linkBeads(a, c); // a→c already; merging c into b must not duplicate a→b
  const result = store.moveBead(c, { type: "dock", uid: b });
  assert.deepEqual(result, { ok: true, uid: b, merged: true });
  assert.deepEqual(store.getBead(b), { uid: b, elementId: "B", with: "C" });
  assert.deepEqual(uids(store), [a, b, d]);
  assert.deepEqual(ribbons(store), [[a, b], [b, d]]); // b→c self-link and a→c duplicate gone
  assert.equal(store.getActiveUid(), b);
});

test("guard: merging refuses two tandems, the same element, or the bead onto itself", () => {
  const { store } = makeStore();
  const [a, b, c, d] = buildChain(store, ["A", "B", "C", "A"]);
  store.pairBead(a, "E");
  const before = store.getState();
  assert.equal(store.mergeBeads(b, a).error.code, "tandem-full"); // 1 + 2 = 3
  assert.equal(store.mergeBeads(d, c).ok, true);
  const again = store.getState();
  assert.equal(store.mergeBeads(b, b).error.code, "self-link");
  const [x, y] = [store.addBead("B", { type: "empty" }).uid, store.addBead("B", { type: "empty" }).uid];
  assert.equal(store.mergeBeads(x, y).error.code, "same-element");
  assert.notDeepEqual(before, again);
});

/* ---------- rogue (FR-C15, AC-C11) ---------- */

test("a rogue bead gets the label 'Rogue' by default and keeps one it is given", () => {
  const { store } = makeStore();
  const plain = store.addBead("Rg").uid;
  const named = store.addBead("Rg", { type: "empty" }, { label: "  The   Stranger " }).uid;
  assert.equal(store.getBead(plain).label, "Rogue");
  assert.equal(store.getBead(named).label, "The Stranger");
});

test("the rogue card never depletes: it can be added any number of times", () => {
  const { store } = makeStore();
  buildChain(store, ["Rg", "Rg", "Rg"]);
  assert.deepEqual(elementIds(store), ["Rg", "Rg", "Rg"]);
});

test("rogue label rules: at most 24 characters, plain text, blank means Rogue", () => {
  const { store } = makeStore();
  assert.equal(MAX_LABEL, 24);
  assert.equal(store.addBead("Rg", { type: "empty" }, { label: "x".repeat(24) }).ok, true);
  const tooLong = store.addBead("Rg", { type: "empty" }, { label: "x".repeat(25) });
  assert.equal(tooLong.error.code, "too-long");
  assert.equal(store.addBead("Rg", { type: "empty" }, { label: "   " }).ok, true);
  const tabbed = store.addBead("Rg", { type: "empty" }, { label: "a\n\tb" }).uid;
  assert.equal(store.getBead(tabbed).label, "a b");
  assert.equal(store.getState().beads.at(-2).label, "Rogue");
  assert.equal(store.getState().beads.length, 3);
});

test("guard: a label on a non-rogue element or a non-text label is refused", () => {
  const { store, warnings } = makeStore();
  assert.equal(store.addBead("A", { type: "empty" }, { label: "Hero" }).error.code, "bad-argument");
  assert.equal(store.addBead("Rg", { type: "empty" }, { label: 5 }).error.code, "bad-argument");
  assert.equal(warnings.length, 2);
});

test("setLabel edits a rogue label (either half of a tandem); non-rogue halves refuse", () => {
  const { store } = makeStore();
  const a = store.addBead("Rg").uid;
  store.pairBead(a, "B");
  assert.equal(store.setLabel(a, "Oracle").ok, true);
  assert.equal(store.getBead(a).label, "Oracle");
  assert.equal(store.setLabel(a, "Nope", { half: "with" }).error.code, "not-rogue");
  assert.equal(store.setLabel(a, "x".repeat(25)).error.code, "too-long");
  assert.equal(store.setLabel(a, "").ok, true);
  assert.equal(store.getBead(a).label, "Rogue");
  const plain = store.addBead("C").uid;
  assert.equal(store.setLabel(plain, "x").error.code, "not-rogue");
});

/* ---------- notes ---------- */

test("setNote sets, replaces and clears a note; a note over 80 characters is refused", () => {
  const { store } = makeStore();
  const a = store.addBead("A").uid;
  store.setNote(a, "Opening image");
  assert.equal(store.getBead(a).note, "Opening image");
  store.setNote(a, "");
  assert.equal("note" in store.getBead(a), false);
  assert.equal(store.setNote(a, "n".repeat(MAX_NOTE + 1)).error.code, "too-long");
  assert.equal(store.setNote(a, "n".repeat(MAX_NOTE)).ok, true);
  assert.equal(store.setNote("zz", "x").error.code, "unknown-bead");
});

test("a note can be given when a bead is added", () => {
  const { store } = makeStore();
  const uid = store.addBead("A", { type: "empty" }, { note: "Start here" }).uid;
  assert.deepEqual(store.getBead(uid), { uid, elementId: "A", note: "Start here" });
});

/* ---------- clear and undo (FR-C17, AC-C14) ---------- */

test("Clear empties the map at once and Undo restores it exactly, active bead included", () => {
  const { store, clock } = makeStore();
  const [a, b, c] = buildChain(store, ["A", "B", "Rg"]);
  store.pairBead(b, "D");
  store.setNote(a, "start");
  store.setActive(b);
  const before = store.getState();
  assert.deepEqual(store.clear(), { ok: true, cleared: true });
  assert.deepEqual(store.getState(), { beads: [], ribbons: [], activeUid: null });
  assert.equal(store.canUndo(), true);
  clock.t += UNDO_MS - 1;
  assert.equal(store.undoRemainingMs(), 1);
  assert.deepEqual(store.undo(), { ok: true });
  assert.deepEqual(store.getState(), before);
  assert.equal(store.getActiveUid(), b);
  assert.equal(store.canUndo(), false);
  assert.notEqual(c, undefined);
});

test("Undo is gone after 6 seconds", () => {
  const { store, clock } = makeStore();
  buildChain(store, ["A"]);
  store.clear();
  clock.t += UNDO_MS;
  assert.equal(store.canUndo(), false);
  assert.equal(store.undo().error.code, "nothing-to-undo");
  assert.deepEqual(store.getState().beads, []);
});

test("Undo is gone after any edit, and the caller's timer can drop it early", () => {
  const { store } = makeStore();
  buildChain(store, ["A"]);
  store.clear();
  store.addBead("B");
  assert.equal(store.canUndo(), false);
  assert.equal(store.undo().ok, false);

  store.clear();
  assert.equal(store.canUndo(), true);
  store.discardUndo();
  assert.equal(store.canUndo(), false);
});

test("Clear on an empty map does nothing: no event, and an existing Undo is kept", () => {
  const { store, events } = makeStore();
  assert.deepEqual(store.clear(), { ok: true, cleared: false });
  assert.equal(events.length, 0);
  buildChain(store, ["A"]);
  store.clear();
  const count = events.length;
  assert.deepEqual(store.clear(), { ok: true, cleared: false });
  assert.equal(events.length, count);
  assert.equal(store.canUndo(), true);
});

test("Clear and Undo each send a story-changed event; picking an active bead does not drop Undo", () => {
  const { store, events } = makeStore();
  buildChain(store, ["A"]);
  const n = events.length;
  store.clear();
  assert.deepEqual(events.at(-1).detail.beads, []);
  store.newRibbon();
  assert.equal(store.canUndo(), true);
  store.undo();
  assert.equal(events.length, n + 3);
  assert.equal(events.at(-1).detail.beads.length, 1);
});

test("snapshot and restore round-trip the whole map by value", () => {
  const { store } = makeStore();
  buildChain(store, ["A", "B"]);
  const snap = store.snapshot();
  store.addBead("C");
  assert.equal(store.restore(snap).ok, true);
  assert.deepEqual(store.getState(), snap);
  snap.beads[0].elementId = "X";
  assert.equal(store.getState().beads[0].elementId, "A");
  assert.equal(store.restore({ beads: 1 }).error.code, "bad-argument");
});

/* ---------- loadStory: one loader for saved stories and library entries (FR-C14, L3) ---------- */

const librarySample = () =>
  deepFreeze({
    id: "quest",
    title: "Quest",
    beads: [
      { uid: "q1", elementId: "A", note: "Call" },
      { uid: "q2", elementId: "B", with: "C", note: "Trial" },
      { uid: "q3", elementId: "Rg", label: "Guide" },
    ],
    ribbons: [["q1", "q2"], ["q2", "q3"], ["q3", "q1"]],
  });

test("loadStory opens frozen library data as an editable copy with fresh uids and notes intact", () => {
  const input = librarySample();
  const loaded = loadStory(input, { elementExists: (id) => KNOWN.has(id) });
  assert.equal(loaded.ok, true);
  assert.deepEqual(loaded.beads.map((b) => b.uid), ["b1", "b2", "b3"]);
  assert.deepEqual(loaded.ribbons, [["b1", "b2"], ["b2", "b3"], ["b3", "b1"]]);
  assert.deepEqual(loaded.beads[1], { uid: "b2", elementId: "B", with: "C", note: "Trial" });
  assert.deepEqual(loaded.beads[2], { uid: "b3", elementId: "Rg", label: "Guide" });
  assert.deepEqual(loaded.uidMap, { q1: "b1", q2: "b2", q3: "b3" });
  assert.equal(Object.isFrozen(loaded.beads[0]), false);
});

test("loadStory never aliases its input: editing the copy leaves the original untouched", () => {
  const input = librarySample();
  const loaded = loadStory(input, { elementExists: (id) => KNOWN.has(id) });
  loaded.beads[0].elementId = "E";
  loaded.beads.push({ uid: "x" });
  loaded.ribbons[0][1] = "zzz";
  assert.equal(input.beads[0].elementId, "A");
  assert.equal(input.beads.length, 3);
  assert.deepEqual(input.ribbons[0], ["q1", "q2"]);
  const again = loadStory(input, { elementExists: (id) => KNOWN.has(id) });
  assert.equal(again.beads[0].elementId, "A");
});

test("opening a library entry in a store edits the copy only, never the entry", () => {
  const input = librarySample();
  const { store, events } = makeStore();
  const opened = store.openStory(input);
  assert.equal(opened.ok, true);
  assert.equal(events.length, 1);
  assert.equal(store.getActiveUid(), "b3");
  store.removeBead("b1");
  store.setNote("b2", "changed");
  store.clear();
  assert.equal(input.beads.length, 3);
  assert.equal(input.beads[1].note, "Trial");
  assert.equal(store.openStory(input).ok, true);
  assert.equal(store.getBead("b4").note, "Call");
});

test("opening a story drops the Undo snapshot (it replaces the map)", () => {
  const { store } = makeStore();
  buildChain(store, ["A"]);
  store.clear();
  store.openStory(librarySample());
  assert.equal(store.canUndo(), false);
});

test("loadStory carries name and agent flag through and reports both", () => {
  const loaded = loadStory({ name: "Mine", agent: true, beads: [{ uid: "u", elementId: "A" }], ribbons: [] }, {
    elementExists: (id) => KNOWN.has(id),
  });
  assert.equal(loaded.name, "Mine");
  assert.equal(loaded.agent, true);
  assert.equal(loaded.note, "");
});

test("beads whose element no longer exists are dropped with their ribbons, with a one-line note", () => {
  const loaded = loadStory(
    {
      beads: [
        { uid: "1", elementId: "A" },
        { uid: "2", elementId: "gone" },
        { uid: "3", elementId: "B", with: "vanished" },
      ],
      ribbons: [["1", "2"], ["2", "3"], ["1", "3"]],
    },
    { elementExists: (id) => KNOWN.has(id) },
  );
  assert.equal(loaded.ok, true);
  assert.deepEqual(loaded.beads.map((b) => b.elementId), ["A", "B"]);
  assert.equal("with" in loaded.beads[1], false);
  assert.deepEqual(loaded.ribbons, [["b1", "b2"]]);
  assert.deepEqual(loaded.dropped, { beads: 1, ribbons: 2, halves: 1 });
  assert.match(loaded.note, /^Left out 1 bead whose element no longer exists\./);
  assert.equal(loaded.note.includes("\n"), false);
});

test("loadStory drops duplicate and self ribbons and fills a missing rogue label", () => {
  const loaded = loadStory(
    {
      beads: [{ uid: "1", elementId: "A" }, { uid: "2", elementId: "Rg" }],
      ribbons: [["1", "2"], ["1", "2"], ["2", "2"]],
    },
    { elementExists: (id) => KNOWN.has(id) },
  );
  assert.deepEqual(loaded.ribbons, [["b1", "b2"]]);
  assert.equal(loaded.beads[1].label, "Rogue");
  assert.equal(loaded.dropped.ribbons, 2);
});

test("guard: loadStory refuses malformed shapes with a warning and never throws", () => {
  const original = console.warn;
  const seen = [];
  console.warn = (message) => seen.push(message);
  try {
    const lookup = { elementExists: (id) => KNOWN.has(id) };
    const bad = [
      null,
      "story",
      {},
      { beads: "no" },
      { beads: [], ribbons: "no" },
      { beads: [{ elementId: "A" }] },
      { beads: [{ uid: "1", elementId: "A" }, { uid: "1", elementId: "B" }] },
      { beads: [{ uid: "1", elementId: "A", with: "A" }] },
      { beads: [{ uid: "1", elementId: "A", note: "n".repeat(MAX_NOTE + 1) }] },
      { beads: [{ uid: "1", elementId: "Rg", label: "x".repeat(25) }] },
      { beads: [{ uid: "1", elementId: "A" }], ribbons: [["1"]] },
    ];
    for (const shape of bad) {
      const result = loadStory(shape, lookup);
      assert.equal(result.ok, false);
      assert.equal(result.error.code, "bad-shape");
    }
    assert.equal(seen.length, bad.length);
  } finally {
    console.warn = original;
  }
});

test("guard: loadStory refuses more than 200 beads, and a failed open leaves the current map alone", () => {
  const beads = Array.from({ length: MAX_BEADS + 1 }, (_, i) => ({ uid: `u${i}`, elementId: "A" }));
  const { store } = makeStore();
  buildChain(store, ["A", "B"]);
  const before = store.getState();
  const original = console.warn;
  console.warn = () => {};
  try {
    const result = store.openStory({ beads, ribbons: [] });
    assert.equal(result.ok, false);
  } finally {
    console.warn = original;
  }
  assert.deepEqual(store.getState(), before);
});
