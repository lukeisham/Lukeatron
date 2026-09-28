/**
 * story-model.js — the only place a story (a graph of beads and ribbons) is changed.
 *
 * No DOM, no storage (story-map AD-C1). A store holds `{ beads, ribbons, activeUid }`, applies each
 * operation to a working copy and commits it only when the whole operation succeeds, so a refused
 * operation never leaves a half-changed map. Each commit sends `storytelling:story-changed` on
 * `document` (or an injected event target).
 *
 * Bead   = { uid, elementId, with?, label?, withLabel?, note? }     (key order is fixed, FR-A11)
 * Ribbon = [fromUid, toUid]
 * Target = { type: "empty" } | { type: "bead", uid } | { type: "ribbon", from, to } | { type: "dock", uid }
 *
 * Every operation returns `{ ok: true, ... }` or `{ ok: false, error: { code, message } }`.
 */
import { EVT_STORY_CHANGED } from "../shared/events.js";
import { ELEMENTS, ROGUE, MAX_LABEL } from "../data/elements.js";

export const MAX_BEADS = 200;
export const MAX_RIBBONS = 400;
export const TANDEM_MAX = 2;
export const UNDO_MS = 6000;
export const MAX_NOTE = 80;
export const DEFAULT_ROGUE_LABEL = "Rogue";
export const TANDEM_FULL_MESSAGE = "A tandem holds two";

/* ---------- small helpers ---------- */

const isPlainObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const ribbonKey = (from, to) => `${from}\u0000${to}`;
const textLength = (text) => [...text].length;

function refuse(code, message) {
  return { ok: false, error: { code, message } };
}

/** Guard for a caller mistake ("shouldn't happen" from the UI): refuse and say where (JS-2). */
function refuseBadCall(ctx, where, code, message) {
  ctx.warn(`story-model ${where}: ${message}`);
  return refuse(code, message);
}

let defaultLookup = null;
/** Default element check: every poster element plus the Rogue card. Built once, on first use. */
function defaultElementExists(elementId) {
  if (!defaultLookup) defaultLookup = new Set([...ELEMENTS.map((element) => element.id), ROGUE.id]);
  return defaultLookup.has(elementId);
}

function makeUidCounter() {
  let next = 1;
  return () => `b${next++}`;
}

const isRogueId = (elementId) => elementId === ROGUE.id;
const elementCount = (bead) => (bead.with ? 2 : 1);

/**
 * The one place a bead's shape is decided: fixed key order, absent fields omitted, a rogue half
 * always carries a label and a non-rogue half never does (AD-C2).
 */
function canonicalBead({ uid, elementId, with: partner, label, withLabel, note }) {
  const bead = { uid, elementId };
  if (partner) bead.with = partner;
  if (isRogueId(elementId)) bead.label = label || DEFAULT_ROGUE_LABEL;
  if (partner && isRogueId(partner)) bead.withLabel = withLabel || DEFAULT_ROGUE_LABEL;
  if (note) bead.note = note;
  return bead;
}

const cloneBead = (bead) => canonicalBead(bead);
const cloneState = (state) => ({
  beads: state.beads.map(cloneBead),
  ribbons: state.ribbons.map(([from, to]) => [from, to]),
  activeUid: state.activeUid,
});

const findBead = (work, uid) => work.beads.find((bead) => bead.uid === uid);
const ribbonIndex = (work, from, to) => work.ribbons.findIndex((r) => r[0] === from && r[1] === to);

/** Clean plain text: control characters and whitespace runs become one space; trimmed. */
function cleanText(value) {
  return value.replace(/[\u0000-]+/g, " ").replace(/\s+/g, " ").trim();
}

/** Validates a label or note. `max` is the character limit; empty text yields `undefined`. */
function readText(ctx, where, value, max, what) {
  if (value === undefined || value === null) return { ok: true, text: undefined };
  if (typeof value !== "string") return refuseBadCall(ctx, where, "bad-argument", `${what} must be text`);
  const text = cleanText(value);
  if (textLength(text) > max) return refuse("too-long", `${what} can be at most ${max} characters`);
  return { ok: true, text: text || undefined };
}

/* ---------- ribbons ---------- */

function addRibbon(work, from, to) {
  if (from === to) return refuse("self-link", "A bead cannot link to itself");
  if (ribbonIndex(work, from, to) >= 0) return refuse("duplicate-ribbon", "Those beads are already linked");
  if (work.ribbons.length >= MAX_RIBBONS) {
    return refuse("cap-reached", `A story holds at most ${MAX_RIBBONS} ribbons`);
  }
  work.ribbons.push([from, to]);
  return { ok: true };
}

/**
 * Takes a bead out of the ribbon graph and reconnects each bead that led into it to each bead it
 * led to (FR-C6). Healed ribbons take the place of the ribbon that led in, so a parent's first
 * child — which decides its lane — stays the first child. Returns the ribbons it added.
 */
function disconnect(work, uid, ctx) {
  const successors = work.ribbons.filter(([from]) => from === uid).map(([, to]) => to);
  const untouched = work.ribbons.filter(([from, to]) => from !== uid && to !== uid);
  const present = new Set(untouched.map(([from, to]) => ribbonKey(from, to)));
  const healed = [];
  const rebuilt = [];
  for (const ribbon of work.ribbons) {
    const [from, to] = ribbon;
    if (from === uid) continue;
    if (to !== uid) {
      rebuilt.push(ribbon);
      continue;
    }
    for (const next of successors) {
      if (from === next || present.has(ribbonKey(from, next))) continue;
      if (untouched.length + healed.length >= MAX_RIBBONS) {
        ctx.warn(`story-model remove: ribbon cap reached while reconnecting ${from} to ${next}`);
        continue;
      }
      present.add(ribbonKey(from, next));
      healed.push([from, next]);
      rebuilt.push([from, next]);
    }
  }
  work.ribbons = rebuilt;
  return healed;
}

/* ---------- targets ---------- */

function readTarget(ctx, where, target) {
  if (target === undefined || target === null) return { ok: true, target: { type: "empty" } };
  if (!isPlainObject(target)) return refuseBadCall(ctx, where, "bad-argument", "target must be an object");
  const { type } = target;
  if (type === "empty") return { ok: true, target: { type } };
  if ((type === "bead" || type === "dock") && typeof target.uid === "string") {
    return { ok: true, target: { type, uid: target.uid } };
  }
  if (type === "ribbon" && typeof target.from === "string" && typeof target.to === "string") {
    return { ok: true, target: { type, from: target.from, to: target.to } };
  }
  return refuseBadCall(ctx, where, "bad-argument", `unusable target ${JSON.stringify(target)}`);
}

/** Connects the bead `uid` (already in `work.beads`, carrying no ribbons) per the drop target. */
function attach(work, ctx, where, uid, target) {
  if (target.type === "bead") {
    if (target.uid === uid) return refuse("self-link", "A bead cannot branch from itself");
    if (!findBead(work, target.uid)) {
      return refuseBadCall(ctx, where, "unknown-bead", `no bead ${target.uid}`);
    }
    const added = addRibbon(work, target.uid, uid);
    return added.ok ? { ok: true, placed: "branched" } : added;
  }
  if (target.type === "ribbon") {
    const index = ribbonIndex(work, target.from, target.to);
    if (index < 0) {
      return refuseBadCall(ctx, where, "no-such-ribbon", `no ribbon ${target.from} → ${target.to}`);
    }
    if (work.ribbons.length >= MAX_RIBBONS) {
      return refuse("cap-reached", `A story holds at most ${MAX_RIBBONS} ribbons`);
    }
    work.ribbons.splice(index, 1, [target.from, uid], [uid, target.to]);
    return { ok: true, placed: "inserted" };
  }
  const active = work.activeUid;
  if (active && active !== uid && findBead(work, active)) {
    const added = addRibbon(work, active, uid);
    return added.ok ? { ok: true, placed: "joined" } : added;
  }
  return { ok: true, placed: "started" };
}

/* ---------- element / label validation ---------- */

function readElement(ctx, where, elementId, label) {
  if (typeof elementId !== "string" || !ctx.elementExists(elementId)) {
    return refuseBadCall(ctx, where, "unknown-element", `unknown element ${JSON.stringify(elementId)}`);
  }
  if (!isRogueId(elementId)) {
    if (label !== undefined && label !== null) {
      return refuseBadCall(ctx, where, "bad-argument", "only the Rogue card takes a label");
    }
    return { ok: true, label: undefined };
  }
  const text = readText(ctx, where, label, MAX_LABEL, "A label");
  if (!text.ok) return text;
  return { ok: true, label: text.text ?? DEFAULT_ROGUE_LABEL };
}

/* ---------- mutators: each edits a working copy and returns a result ---------- */

function mutateAdd(work, ctx, elementId, target, options) {
  const where = "addBead";
  const read = readTarget(ctx, where, target);
  if (!read.ok) return read;
  const opts = isPlainObject(options) ? options : {};
  if (read.target.type === "dock") return mutatePair(work, ctx, read.target.uid, elementId, opts);

  const element = readElement(ctx, where, elementId, opts.label);
  if (!element.ok) return element;
  const note = readText(ctx, where, opts.note, MAX_NOTE, "A note");
  if (!note.ok) return note;
  if (work.beads.length >= MAX_BEADS) return refuse("cap-reached", `A story holds at most ${MAX_BEADS} beads`);

  const uid = ctx.makeUid();
  work.beads.push(canonicalBead({ uid, elementId, label: element.label, note: note.text }));
  const attached = attach(work, ctx, where, uid, read.target);
  if (!attached.ok) return attached;
  work.activeUid = uid;
  return { ok: true, uid, placed: attached.placed };
}

function mutateMove(work, ctx, uid, target) {
  const where = "moveBead";
  const read = readTarget(ctx, where, target);
  if (!read.ok) return read;
  if (!findBead(work, uid)) return refuseBadCall(ctx, where, "unknown-bead", `no bead ${uid}`);
  if (read.target.type === "dock") return mutateMerge(work, ctx, uid, read.target.uid);

  disconnect(work, uid, ctx);
  const attached = attach(work, ctx, where, uid, read.target);
  if (!attached.ok) return attached;
  work.activeUid = uid;
  return { ok: true, uid, placed: attached.placed };
}

function mutateRemove(work, ctx, uid) {
  const index = work.beads.findIndex((bead) => bead.uid === uid);
  if (index < 0) return refuseBadCall(ctx, "removeBead", "unknown-bead", `no bead ${uid}`);
  const predecessor = work.ribbons.find(([, to]) => to === uid)?.[0] ?? null;
  const healed = disconnect(work, uid, ctx);
  work.beads.splice(index, 1);
  if (work.activeUid === uid) work.activeUid = predecessor;
  return { ok: true, uid, healed };
}

function mutateLink(work, ctx, fromUid, toUid) {
  if (!findBead(work, fromUid) || !findBead(work, toUid)) {
    return refuseBadCall(ctx, "linkBeads", "unknown-bead", `no bead ${!findBead(work, fromUid) ? fromUid : toUid}`);
  }
  return addRibbon(work, fromUid, toUid);
}

function mutateCut(work, ctx, fromUid, toUid) {
  const index = ribbonIndex(work, fromUid, toUid);
  if (index < 0) return refuseBadCall(ctx, "cutRibbon", "no-such-ribbon", `no ribbon ${fromUid} → ${toUid}`);
  work.ribbons.splice(index, 1);
  return { ok: true };
}

function replaceBead(work, uid, patch) {
  const index = work.beads.findIndex((bead) => bead.uid === uid);
  work.beads[index] = canonicalBead({ ...work.beads[index], ...patch });
}

function mutatePair(work, ctx, uid, elementId, options) {
  const where = "pairBead";
  const bead = findBead(work, uid);
  if (!bead) return refuseBadCall(ctx, where, "unknown-bead", `no bead ${uid}`);
  const opts = isPlainObject(options) ? options : {};
  const element = readElement(ctx, where, elementId, opts.label);
  if (!element.ok) return element;
  if (elementCount(bead) >= TANDEM_MAX) return refuse("tandem-full", TANDEM_FULL_MESSAGE);
  if (bead.elementId === elementId && !isRogueId(elementId)) {
    return refuse("same-element", "A tandem cannot pair an element with itself");
  }
  replaceBead(work, uid, { with: elementId, withLabel: element.label });
  work.activeUid = uid;
  return { ok: true, uid, placed: "paired" };
}

function mutateSplit(work, ctx, uid) {
  const where = "splitBead";
  const index = work.beads.findIndex((bead) => bead.uid === uid);
  if (index < 0) return refuseBadCall(ctx, where, "unknown-bead", `no bead ${uid}`);
  const bead = work.beads[index];
  if (!bead.with) return refuse("not-tandem", "That bead is not a tandem");
  if (work.beads.length >= MAX_BEADS) return refuse("cap-reached", `A story holds at most ${MAX_BEADS} beads`);
  if (work.ribbons.length >= MAX_RIBBONS) {
    return refuse("cap-reached", `A story holds at most ${MAX_RIBBONS} ribbons`);
  }
  const secondUid = ctx.makeUid();
  const first = canonicalBead({ uid, elementId: bead.elementId, label: bead.label, note: bead.note });
  const second = canonicalBead({ uid: secondUid, elementId: bead.with, label: bead.withLabel });
  work.beads.splice(index, 1, first, second);
  work.ribbons = work.ribbons.map(([from, to]) => (from === uid ? [secondUid, to] : [from, to]));
  work.ribbons.push([uid, secondUid]);
  if (work.activeUid === uid) work.activeUid = secondUid;
  return { ok: true, uid, secondUid };
}

function mutateSwap(work, ctx, uid) {
  const bead = findBead(work, uid);
  if (!bead) return refuseBadCall(ctx, "swapTandem", "unknown-bead", `no bead ${uid}`);
  if (!bead.with) return refuse("not-tandem", "That bead is not a tandem");
  replaceBead(work, uid, {
    elementId: bead.with,
    with: bead.elementId,
    label: bead.withLabel,
    withLabel: bead.label,
  });
  return { ok: true, uid };
}

/** Drag one bead onto another's dock (FR-C16c): its ribbons move to the target, its element joins it. */
function mutateMerge(work, ctx, fromUid, intoUid) {
  const where = "mergeBeads";
  const from = findBead(work, fromUid);
  const into = findBead(work, intoUid);
  if (!from || !into) {
    return refuseBadCall(ctx, where, "unknown-bead", `no bead ${!from ? fromUid : intoUid}`);
  }
  if (from === into) return refuse("self-link", "A bead cannot join itself");
  if (elementCount(from) + elementCount(into) > TANDEM_MAX) return refuse("tandem-full", TANDEM_FULL_MESSAGE);
  if (from.elementId === into.elementId && !isRogueId(from.elementId)) {
    return refuse("same-element", "A tandem cannot pair an element with itself");
  }
  const seen = new Set();
  work.ribbons = work.ribbons
    .map(([a, b]) => [a === fromUid ? intoUid : a, b === fromUid ? intoUid : b])
    .filter(([a, b]) => {
      const key = ribbonKey(a, b);
      if (a === b || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  replaceBead(work, intoUid, {
    with: from.elementId,
    withLabel: from.label,
    note: into.note ?? from.note,
  });
  work.beads.splice(work.beads.findIndex((bead) => bead.uid === fromUid), 1);
  work.activeUid = intoUid;
  return { ok: true, uid: intoUid, merged: true };
}

function mutateSetNote(work, ctx, uid, text) {
  if (!findBead(work, uid)) return refuseBadCall(ctx, "setNote", "unknown-bead", `no bead ${uid}`);
  const note = readText(ctx, "setNote", text, MAX_NOTE, "A note");
  if (!note.ok) return note;
  replaceBead(work, uid, { note: note.text });
  return { ok: true, uid };
}

function mutateSetLabel(work, ctx, uid, text, options) {
  const where = "setLabel";
  const bead = findBead(work, uid);
  if (!bead) return refuseBadCall(ctx, where, "unknown-bead", `no bead ${uid}`);
  const half = isPlainObject(options) && options.half === "with" ? "with" : "main";
  const rogue = half === "with" ? bead.with && isRogueId(bead.with) : isRogueId(bead.elementId);
  if (!rogue) return refuse("not-rogue", "Only a Rogue card has a label");
  const label = readText(ctx, where, text, MAX_LABEL, "A label");
  if (!label.ok) return label;
  replaceBead(work, uid, half === "with" ? { withLabel: label.text } : { label: label.text });
  return { ok: true, uid };
}

/* ---------- loadStory: the one loader (FR-C14, library FR-L3) ---------- */

function refuseShape(message) {
  console.warn(`story-model loadStory: ${message}`);
  return refuse("bad-shape", message);
}

function readLoadedBeads(rawBeads, elementExists, makeUid) {
  const seenUids = new Set();
  const dropped = { beads: 0, ribbons: 0, halves: 0 };
  const uidMap = new Map();
  const beads = [];
  for (const raw of rawBeads) {
    if (!isPlainObject(raw) || typeof raw.uid !== "string" || !raw.uid || typeof raw.elementId !== "string") {
      return refuseShape("a bead needs a uid and an elementId");
    }
    if (seenUids.has(raw.uid)) return refuseShape(`two beads share the uid ${raw.uid}`);
    seenUids.add(raw.uid);
    if (!elementExists(raw.elementId)) {
      dropped.beads += 1;
      continue;
    }
    let partner = raw.with;
    if (partner !== undefined && (typeof partner !== "string" || !partner)) {
      return refuseShape(`bead ${raw.uid} has an unusable "with"`);
    }
    if (partner !== undefined && !elementExists(partner)) {
      dropped.halves += 1;
      partner = undefined;
    }
    if (partner === raw.elementId && !isRogueId(partner)) {
      return refuseShape(`bead ${raw.uid} pairs an element with itself`);
    }
    const texts = {};
    for (const [key, max, applies] of [
      ["label", MAX_LABEL, isRogueId(raw.elementId)],
      ["withLabel", MAX_LABEL, partner !== undefined && isRogueId(partner)],
      ["note", MAX_NOTE, true],
    ]) {
      if (raw[key] === undefined || !applies) continue;
      if (typeof raw[key] !== "string") return refuseShape(`bead ${raw.uid} has a ${key} that is not text`);
      const text = cleanText(raw[key]);
      if (textLength(text) > max) return refuseShape(`bead ${raw.uid} has a ${key} over ${max} characters`);
      texts[key] = text;
    }
    const uid = makeUid();
    uidMap.set(raw.uid, uid);
    beads.push(canonicalBead({ uid, elementId: raw.elementId, with: partner, ...texts }));
  }
  if (beads.length > MAX_BEADS) return refuseShape(`a story holds at most ${MAX_BEADS} beads`);
  return { ok: true, beads, dropped, uidMap, knownUids: seenUids };
}

function readLoadedRibbons(rawRibbons, uidMap, knownUids, dropped) {
  const ribbons = [];
  const seen = new Set();
  for (const raw of rawRibbons) {
    if (!Array.isArray(raw) || raw.length !== 2 || typeof raw[0] !== "string" || typeof raw[1] !== "string") {
      return refuseShape("a ribbon must be [fromUid, toUid]");
    }
    const from = uidMap.get(raw[0]);
    const to = uidMap.get(raw[1]);
    if (!from || !to) {
      if (!knownUids.has(raw[0]) || !knownUids.has(raw[1])) {
        console.warn(`story-model loadStory: ribbon ${raw[0]} → ${raw[1]} names a bead that is not in the story`);
      }
      dropped.ribbons += 1;
      continue;
    }
    const key = ribbonKey(from, to);
    if (from === to || seen.has(key)) {
      dropped.ribbons += 1;
      continue;
    }
    seen.add(key);
    ribbons.push([from, to]);
  }
  if (ribbons.length > MAX_RIBBONS) return refuseShape(`a story holds at most ${MAX_RIBBONS} ribbons`);
  return { ok: true, ribbons };
}

function droppedNote({ beads, halves }) {
  const parts = [];
  if (beads) parts.push(`Left out ${beads} bead${beads === 1 ? "" : "s"} whose element no longer exists.`);
  if (halves) parts.push(`Left out ${halves} tandem partner${halves === 1 ? "" : "s"} that no longer exist${halves === 1 ? "s" : ""}.`);
  return parts.join(" ");
}

/**
 * Validates a story shape (saved story, draft or library entry) and returns an editable copy with
 * fresh bead uids. Never aliases or mutates its input, so deep-frozen library data is safe.
 * Beads whose element no longer exists are dropped with their ribbons (FR-C12).
 *
 * @param {{ beads: object[], ribbons?: string[][], name?: string, agent?: boolean }} shape
 * @param {{ elementExists?: (id: string) => boolean, makeUid?: () => string }} [options]
 * @returns {{ ok: true, beads: object[], ribbons: string[][], name?: string, agent: boolean,
 *   dropped: { beads: number, ribbons: number, halves: number }, note: string,
 *   uidMap: Record<string, string> } | { ok: false, error: { code: string, message: string } }}
 */
export function loadStory(shape, options = {}) {
  const elementExists = options.elementExists ?? defaultElementExists;
  const makeUid = options.makeUid ?? makeUidCounter();
  if (!isPlainObject(shape) || !Array.isArray(shape.beads)) return refuseShape("a story needs a beads array");
  if (shape.ribbons !== undefined && !Array.isArray(shape.ribbons)) return refuseShape("ribbons must be an array");

  const read = readLoadedBeads(shape.beads, elementExists, makeUid);
  if (!read.ok) return read;
  const ribbonRead = readLoadedRibbons(shape.ribbons ?? [], read.uidMap, read.knownUids, read.dropped);
  if (!ribbonRead.ok) return ribbonRead;
  return {
    ok: true,
    beads: read.beads,
    ribbons: ribbonRead.ribbons,
    name: typeof shape.name === "string" ? shape.name : undefined,
    agent: shape.agent === true,
    dropped: read.dropped,
    note: droppedNote(read.dropped),
    uidMap: Object.fromEntries(read.uidMap),
  };
}

/* ---------- the store ---------- */

/**
 * Builds a story store. Options (all injectable for tests):
 *  - `elementExists(id)` element lookup, default ELEMENTS + ROGUE;
 *  - `eventTarget` receiver of `storytelling:story-changed`, default `document` when there is one;
 *  - `makeUid()` bead id source; `now()` clock for the Undo window; `warn(msg)` guard logger.
 */
export function createStoryStore(options = {}) {
  const ctx = {
    elementExists: options.elementExists ?? defaultElementExists,
    makeUid: options.makeUid ?? makeUidCounter(),
    now: options.now ?? (() => Date.now()),
    warn: options.warn ?? ((...args) => console.warn(...args)),
  };
  let state = { beads: [], ribbons: [], activeUid: null };
  let undoSnapshot = null;
  let undoDeadline = 0;

  function emit() {
    const target = options.eventTarget ?? globalThis.document;
    if (!target || typeof target.dispatchEvent !== "function") return;
    const detail = cloneState(state);
    const event = typeof CustomEvent === "function"
      ? new CustomEvent(EVT_STORY_CHANGED, { detail })
      : { type: EVT_STORY_CHANGED, detail };
    target.dispatchEvent(event);
  }

  function discardUndo() {
    undoSnapshot = null;
    undoDeadline = 0;
  }

  /** Runs a mutator on a copy; commits, drops the Undo snapshot (a map edit) and announces on success. */
  function commit(mutator, { edit = true } = {}) {
    const work = cloneState(state);
    const result = mutator(work);
    if (!result.ok) return result;
    state = work;
    if (edit) discardUndo();
    emit();
    return result;
  }

  function canUndo() {
    if (!undoSnapshot) return false;
    if (ctx.now() >= undoDeadline) {
      discardUndo();
      return false;
    }
    return true;
  }

  return {
    /** Current `{ beads, ribbons, activeUid }` as a deep copy. */
    getState: () => cloneState(state),
    /** One bead (a copy) or `undefined`. */
    getBead: (uid) => {
      const bead = findBead(state, uid);
      return bead ? cloneBead(bead) : undefined;
    },
    getActiveUid: () => state.activeUid,

    /** Drop, add-tile, or `C`: `options = { label?, note? }`. A `dock` target pairs (tandem). */
    addBead: (elementId, target, options) => commit((work) => mutateAdd(work, ctx, elementId, target, options)),
    /** Move a bead to any target; a `dock` target merges it into that bead. */
    moveBead: (uid, target) => commit((work) => mutateMove(work, ctx, uid, target)),
    /** Remove a bead and reconnect what led into it to what it led to. */
    removeBead: (uid) => commit((work) => mutateRemove(work, ctx, uid)),
    linkBeads: (fromUid, toUid) => commit((work) => mutateLink(work, ctx, fromUid, toUid)),
    cutRibbon: (fromUid, toUid) => commit((work) => mutateCut(work, ctx, fromUid, toUid)),

    /** `T` with a tile and a bead selected: the tile joins the bead in tandem. `options = { label? }`. */
    pairBead: (uid, elementId, options) => commit((work) => mutatePair(work, ctx, uid, elementId, options)),
    splitBead: (uid) => commit((work) => mutateSplit(work, ctx, uid)),
    swapTandem: (uid) => commit((work) => mutateSwap(work, ctx, uid)),
    mergeBeads: (fromUid, intoUid) => commit((work) => mutateMerge(work, ctx, fromUid, intoUid)),

    setNote: (uid, text) => commit((work) => mutateSetNote(work, ctx, uid, text)),
    /** Edit a rogue label; `options = { half: "with" }` edits the tandem partner's. */
    setLabel: (uid, text, options) => commit((work) => mutateSetLabel(work, ctx, uid, text, options)),

    /** Make a bead the active one (a click, or `Enter`). Not a map edit: Undo stays offered. */
    setActive: (uid) =>
      commit((work) => {
        if (!findBead(work, uid)) return refuseBadCall(ctx, "setActive", "unknown-bead", `no bead ${uid}`);
        work.activeUid = uid;
        return { ok: true, uid };
      }, { edit: false }),
    /** New ribbon: clear the active bead so the next drop starts an unattached bead. */
    newRibbon: () =>
      commit((work) => {
        work.activeUid = null;
        return { ok: true };
      }, { edit: false }),

    /** Empty the map, keeping one snapshot for `undo()`. Does nothing on an empty map. */
    clear: () => {
      if (state.beads.length === 0) return { ok: true, cleared: false };
      undoSnapshot = cloneState(state);
      undoDeadline = ctx.now() + UNDO_MS;
      state = { beads: [], ribbons: [], activeUid: null };
      emit();
      return { ok: true, cleared: true };
    },
    /** True while the snapshot from `clear()` is still offered (within UNDO_MS and no edit since). */
    canUndo,
    /** Milliseconds left in the Undo window; 0 when it is gone. */
    undoRemainingMs: () => (canUndo() ? undoDeadline - ctx.now() : 0),
    /** Restore the snapshot exactly, active bead included, and forget it. */
    undo: () => {
      if (!canUndo()) return refuse("nothing-to-undo", "There is nothing to undo");
      state = cloneState(undoSnapshot);
      discardUndo();
      emit();
      return { ok: true };
    },
    /** The caller's timer calls this at UNDO_MS so the snapshot is dropped. */
    discardUndo,

    /** A deep copy of the whole map, for callers that keep their own snapshot. */
    snapshot: () => cloneState(state),
    /** Replace the whole map from a `snapshot()`. Counts as an edit. */
    restore: (snapshot) => {
      if (!isPlainObject(snapshot) || !Array.isArray(snapshot.beads) || !Array.isArray(snapshot.ribbons)) {
        return refuseBadCall(ctx, "restore", "bad-argument", "restore needs a snapshot from snapshot()");
      }
      return commit((work) => {
        work.beads = snapshot.beads.map(cloneBead);
        work.ribbons = snapshot.ribbons.map(([from, to]) => [from, to]);
        work.activeUid = snapshot.activeUid ?? null;
        return { ok: true };
      });
    },

    /**
     * Open a saved story, draft or library entry as an editable copy (see `loadStory`). The last bead
     * becomes the active one so a new tile continues the story. Returns the `loadStory` result.
     */
    openStory: (shape) => {
      const loaded = loadStory(shape, { elementExists: ctx.elementExists, makeUid: ctx.makeUid });
      if (!loaded.ok) return loaded;
      commit((work) => {
        work.beads = loaded.beads.map(cloneBead);
        work.ribbons = loaded.ribbons.map(([from, to]) => [from, to]);
        work.activeUid = work.beads.length ? work.beads[work.beads.length - 1].uid : null;
        return { ok: true };
      });
      return loaded;
    },
  };
}

/* ---------- the app's own store, and bound functions for the modules that use it ---------- */

/** The one store the running app uses. Modules import the bound functions below. */
export const storyStore = createStoryStore();

export const getStoryState = () => storyStore.getState();
export const getActiveUid = () => storyStore.getActiveUid();
export const addBead = (elementId, target, options) => storyStore.addBead(elementId, target, options);
export const moveBead = (uid, target) => storyStore.moveBead(uid, target);
export const removeBead = (uid) => storyStore.removeBead(uid);
export const linkBeads = (fromUid, toUid) => storyStore.linkBeads(fromUid, toUid);
export const cutRibbon = (fromUid, toUid) => storyStore.cutRibbon(fromUid, toUid);
export const pairBead = (uid, elementId, options) => storyStore.pairBead(uid, elementId, options);
export const splitBead = (uid) => storyStore.splitBead(uid);
export const swapTandem = (uid) => storyStore.swapTandem(uid);
export const mergeBeads = (fromUid, intoUid) => storyStore.mergeBeads(fromUid, intoUid);
export const setNote = (uid, text) => storyStore.setNote(uid, text);
export const setLabel = (uid, text, options) => storyStore.setLabel(uid, text, options);
export const setActive = (uid) => storyStore.setActive(uid);
export const newRibbon = () => storyStore.newRibbon();
export const clearStory = () => storyStore.clear();
export const undoClear = () => storyStore.undo();
export const canUndoClear = () => storyStore.canUndo();
export const discardUndo = () => storyStore.discardUndo();
export const openStory = (shape) => storyStore.openStory(shape);
