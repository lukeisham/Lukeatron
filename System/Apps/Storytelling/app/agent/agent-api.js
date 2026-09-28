/**
 * agent-api.js — `window.storytellingAgent`: hidden, self-describing levers an AI agent can call
 * from inside the open page (agent-api.spec).
 *
 * Every lever is synchronous, takes and returns plain JSON, and never throws. Success is
 * `{ ok: true, … }`; failure is `{ ok: false, error: { code, message, hint } }`. Writes go through
 * the same story-model functions the mouse gestures call (AD-A2), and saves go through
 * story-store.saveStory with `agent: true` (FR-A8). The manifest, the `<meta>` tag and `help()` are all
 * generated from one lever table (AD-A5), so they cannot drift from the code.
 *
 * Every top-level name here starts with `agent`/`AGENT` because the single-file bundler refuses a
 * name declared in two modules.
 */
import { EVT_AGENT_SESSION } from "../shared/events.js";
import { storyStore, MAX_BEADS, MAX_RIBBONS, MAX_NOTE, UNDO_MS } from "../story/story-model.js";
import { saveStory, listStories } from "../story/story-store.js";
import { layout } from "../story/story-layout.js";
import { storyText } from "../story/story-text.js";
import { listText } from "../lists/list-text.js";
import { ELEMENTS, CATEGORIES, ROGUE, MAX_LABEL } from "../data/elements.js";
import { ROGUE_DETAIL_TEXT } from "../data/furniture.js";
import { LIBRARY } from "../data/library.js";

export const AGENT_GLOBAL_NAME = "storytellingAgent";
export const AGENT_META_NAME = "storytelling-agent";
export const AGENT_MANIFEST_ID = "storytelling-agent-manifest";
export const AGENT_MAX_NAME = 60;

const AGENT_MAX_ID_LENGTH = 60;
const AGENT_MAX_QUERY = 80;
const AGENT_DEFAULT_LIMIT = 60;
const AGENT_MAX_LIMIT = 300;

/* ---------- results ---------- */

/** What the agent should try next, per error code (also published in the manifest). */
export const AGENT_HINTS = Object.freeze({
  "bad-argument": "Check the lever's arguments against help().manifest.levers.",
  "unknown-element": "Search with elements({ query }) or list ids with elements({ category }).",
  "unknown-bead": "Call story() to see the uids of the beads that exist.",
  "no-such-ribbon": "Call story() and use one of its ribbons ([fromUid, toUid]).",
  "cap-reached": `A story holds at most ${MAX_BEADS} beads and ${MAX_RIBBONS} ribbons; remove something first.`,
  "tandem-full": "A bead holds at most two elements; add a new bead instead.",
  "same-element": "A tandem needs two different elements (two rogue cards are fine); choose another element.",
  "self-link": "A bead cannot link to itself; choose a different bead.",
  "duplicate-ribbon": "Those beads are already linked; call story() to see the ribbons.",
  "not-tandem": "Only a tandem can be split; call pair(uid, elementId) first.",
  "not-rogue": "Only a rogue card has a label.",
  "too-long": `Shorten the text: names ${AGENT_MAX_NAME}, notes ${MAX_NOTE}, labels ${MAX_LABEL} characters.`,
  "nothing-to-undo": "There is no cleared story to restore.",
  "bad-shape": "The story data could not be read; call story() to see what is loaded.",
  "no-session": "Call begin({ name }) first; write levers work only inside a session.",
  "map-not-empty": "Luke has a story open — ask him, or call begin({force:true}).",
  "not-agent-story": "An agent may replace only stories an agent saved; choose a new name.",
  exists: "That name is taken; choose another name, or pass { replace: true } to replace a story an agent saved.",
  "storage-unavailable": "The browser would not let the page save; tell Luke.",
  "internal-error": "This should not happen; tell Luke and call story() to check the map.",
});

const agentIsRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const agentTextLength = (text) => [...text].length;

function agentFail(code, message, hint = AGENT_HINTS[code] ?? "Call help() for the lever list.") {
  return { ok: false, error: { code, message, hint } };
}

/** Plain JSON copy, so no result aliases frozen library data or live model state. */
const agentPlain = (value) => JSON.parse(JSON.stringify(value));

/** Turns a story-model result into the agent shape, adding a hint to a refusal. */
function agentFromModel(result, hint) {
  if (result.ok) return agentPlain(result);
  const { code, message } = result.error;
  return agentFail(code, message, hint ?? AGENT_HINTS[code]);
}

/* ---------- argument reading ---------- */

/** Control characters and whitespace runs become one space; trimmed (mirrors the model's clean-up). */
function agentCleanText(value) {
  return value.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
}

function agentReadUid(value, what = "uid") {
  if (typeof value !== "string" || !value || value.length > AGENT_MAX_ID_LENGTH) {
    return agentFail("bad-argument", `${what} must be a bead uid (text)`);
  }
  return { ok: true, value };
}

/** An optional options object: absent is `{}`; anything but a plain object with known keys is refused. */
function agentReadOptions(value, allowedKeys) {
  if (value === undefined) return { ok: true, value: {} };
  if (!agentIsRecord(value)) return agentFail("bad-argument", "options must be an object");
  const unknown = Object.keys(value).find((key) => !allowedKeys.includes(key));
  if (unknown !== undefined) {
    return agentFail("bad-argument", `unknown option "${agentCleanText(unknown).slice(0, 30)}"`, `Allowed options: ${allowedKeys.join(", ") || "none"}.`);
  }
  return { ok: true, value };
}

function agentReadName(value) {
  if (typeof value !== "string") return agentFail("bad-argument", "name must be text");
  const text = agentCleanText(value);
  if (!text) return agentFail("bad-argument", "name must not be empty");
  if (agentTextLength(text) > AGENT_MAX_NAME) return agentFail("too-long", `name can be at most ${AGENT_MAX_NAME} characters`);
  return { ok: true, value: text };
}

/* ---------- nearest element ids (FR-A9) ---------- */

function agentEditDistance(a, b) {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const row = [i];
    for (let j = 1; j <= b.length; j += 1) {
      row[j] = Math.min(previous[j] + 1, row[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    previous = row;
  }
  return previous[b.length];
}

/** Up to five elements whose id or name is closest to `query`. */
function agentNearestElements(query, elements) {
  const wanted = String(query ?? "").slice(0, AGENT_MAX_ID_LENGTH).toLowerCase();
  if (!wanted) return [];
  const scored = elements.map((element) => {
    const id = element.id.toLowerCase();
    const name = element.name.toLowerCase();
    const contains = (id.includes(wanted) || name.includes(wanted) || (wanted.length > 2 && wanted.includes(name))) ? 0 : 1;
    return { element, contains, distance: Math.min(agentEditDistance(wanted, id), agentEditDistance(wanted, name)) };
  });
  scored.sort((x, y) => x.contains - y.contains || x.distance - y.distance);
  return scored.slice(0, 5).map((item) => item.element);
}

/* ---------- the lever table ---------- */

/** One example call and the shape of what comes back are part of each lever (FR-A2). */
function agentLever(name, kind, maxArgs, args, returns, example, run) {
  return { name, kind, maxArgs, arguments: args, returns, example, run };
}

const AGENT_PLACEMENT = "{ after?: uid, branchFrom?: uid, insertOn?: [fromUid, toUid] } (at most one; none = join after the active bead)";

/**
 * Builds the lever table for one mounted API. `ctx` carries the injected store, storage functions,
 * data and the session state; each `run` receives the caller's arguments only.
 */
function agentBuildLevers(ctx) {
  const { store, api, data } = ctx;
  const elementIds = new Set([...data.ELEMENTS.map((element) => element.id), data.ROGUE.id]);
  const elementById = (id) => (id === data.ROGUE.id ? agentRogueView(data) : agentElementView(data.ELEMENTS.find((element) => element.id === id)));
  const everyElement = () => [...data.ELEMENTS, data.ROGUE];

  const unknownElement = (id) => {
    const near = agentNearestElements(id, everyElement()).map((element) => `${element.id} (${element.name})`);
    const hint = near.length ? `Nearest matches: ${near.join(", ")}. Or search with elements({ query }).` : AGENT_HINTS["unknown-element"];
    return agentFail("unknown-element", "no such element", hint);
  };
  const readElementId = (value) => {
    if (typeof value !== "string" || value.length > AGENT_MAX_ID_LENGTH || !elementIds.has(value)) {
      return typeof value === "string" ? unknownElement(value) : agentFail("bad-argument", "elementId must be an element id (text)");
    }
    return { ok: true, value };
  };
  const readBead = (value, what) => {
    const uid = agentReadUid(value, what);
    if (!uid.ok) return uid;
    return store.getBead(uid.value) ? uid : agentFail("unknown-bead", `no bead ${uid.value}`);
  };
  const readCategory = (value) => {
    if (typeof value !== "string" || !(value === "rogue" || data.CATEGORIES.some((category) => category.key === value))) {
      return agentFail("bad-argument", "category must be a key from categories()", `Valid keys: ${data.CATEGORIES.map((c) => c.key).join(", ")}.`);
    }
    return { ok: true, value };
  };

  /** after / branchFrom / insertOn → a model target. `required` demands exactly one (move). */
  const readPlacement = (opts, required) => {
    const chosen = ["after", "branchFrom", "insertOn"].filter((key) => opts[key] !== undefined);
    if (chosen.length > 1) return agentFail("bad-argument", "give at most one of after, branchFrom, insertOn");
    if (chosen.length === 0) {
      return required
        ? agentFail("bad-argument", "give one of after, branchFrom, insertOn", "Say where the bead goes, e.g. move(uid, { after: otherUid }).")
        : { ok: true, target: { type: "empty" }, placed: undefined };
    }
    const [key] = chosen;
    if (key === "insertOn") {
      const pair = opts.insertOn;
      if (!Array.isArray(pair) || pair.length !== 2 || pair.some((uid) => typeof uid !== "string" || uid.length > AGENT_MAX_ID_LENGTH)) {
        return agentFail("bad-argument", "insertOn must be a ribbon [fromUid, toUid]");
      }
      const exists = store.getState().ribbons.some(([from, to]) => from === pair[0] && to === pair[1]);
      if (!exists) return agentFail("no-such-ribbon", `no ribbon ${pair[0]} → ${pair[1]}`);
      return { ok: true, target: { type: "ribbon", from: pair[0], to: pair[1] }, placed: "inserted" };
    }
    const bead = readBead(opts[key], key);
    if (!bead.ok) return bead;
    return { ok: true, target: { type: "bead", uid: bead.value }, placed: key === "after" ? "joined" : "branched" };
  };

  const addElement = (elementId, opts, placementOpts) => {
    const placement = readPlacement(placementOpts, false);
    if (!placement.ok) return placement;
    const result = agentFromModel(store.addBead(elementId, placement.target, opts));
    if (result.ok && placement.placed) result.placed = placement.placed;
    return result;
  };

  const levers = [
    agentLever("help", "read", 0, "()", "{ ok, manifest }", "storytellingAgent.help()", () => ({ ok: true, manifest: agentPlain(ctx.manifest) })),

    agentLever("categories", "read", 0, "()", "{ ok, categories: [{ key, label, count }] }", "storytellingAgent.categories()", () => ({
      ok: true,
      categories: data.CATEGORIES.map(({ key, label }) => ({ key, label, count: data.ELEMENTS.filter((element) => (element.category ?? element.group) === key).length })),
    })),

    agentLever("elements", "read", 1, "({ category?, query?, limit? })", "{ ok, total, elements: [{ id, name, category, description, example, popularity? }] } (rogue is id Rg)",
      'storytellingAgent.elements({ query: "twist", limit: 10 })', (rawOptions) => {
        const opts = agentReadOptions(rawOptions, ["category", "query", "limit"]);
        if (!opts.ok) return opts;
        const { category, query, limit } = opts.value;
        if (category !== undefined) {
          const checked = readCategory(category);
          if (!checked.ok) return checked;
        }
        if (query !== undefined && (typeof query !== "string" || query.length > AGENT_MAX_QUERY)) {
          return agentFail("bad-argument", `query must be text of at most ${AGENT_MAX_QUERY} characters`);
        }
        if (limit !== undefined && (!Number.isInteger(limit) || limit < 1 || limit > AGENT_MAX_LIMIT)) {
          return agentFail("bad-argument", `limit must be a whole number from 1 to ${AGENT_MAX_LIMIT}`);
        }
        const terms = (query ?? "").toLowerCase().split(/\s+/).filter(Boolean);
        const matches = [...data.ELEMENTS.map(agentElementView), agentRogueView(data)].filter((element) => {
          if (category !== undefined && element.category !== category) return false;
          const label = data.CATEGORIES.find((entry) => entry.key === element.category)?.label ?? "";
          const haystack = `${element.name} ${element.description ?? ""} ${element.category} ${label}`.toLowerCase();
          return terms.every((term) => haystack.includes(term));
        });
        return { ok: true, total: matches.length, elements: matches.slice(0, limit ?? AGENT_DEFAULT_LIMIT) };
      }),

    agentLever("element", "read", 1, "(id)", "{ ok, element: { id, name, category, description, example, popularity? } }", 'storytellingAgent.element("Pt")', (id) => {
      const checked = readElementId(id);
      return checked.ok ? { ok: true, element: agentPlain(elementById(id)) } : checked;
    }),

    agentLever("library", "read", 0, "()", "{ ok, entries: [{ id, title, examples, lead, origin }] } (the twelve story types)", "storytellingAgent.library()", () => ({
      ok: true,
      entries: agentPlain(data.LIBRARY.map(({ id, title, examples, lead, origin }) => ({ id, title, examples, lead, origin }))),
    })),

    agentLever("libraryEntry", "read", 1, "(id)", "{ ok, entry: { id, title, examples, lead, origin, credit, beads, ribbons } }", 'storytellingAgent.libraryEntry("quest-heros-journey")', (id) => {
      const entry = agentFindLibraryEntry(data, id);
      return entry.ok ? { ok: true, entry: agentPlain(entry.value) } : entry;
    }),

    agentLever("story", "read", 0, "()", "{ ok, name, agent, activeUid, beads: [{ uid, n, elementId, with?, label?, withLabel?, note?, layer, lane }], ribbons: [[fromUid, toUid]] }",
      "storytellingAgent.story()", () => ({ ok: true, ...agentStoryView(ctx) })),

    agentLever("text", "read", 0, "()", "{ ok, text } (the same text as Copy; empty for an empty map)", "storytellingAgent.text()", () => {
      const { beads, ribbons } = store.getState();
      if (beads.length === 0) return { ok: true, text: "" };
      return { ok: true, text: ctx.storyText(ctx.session.name ?? "", beads, ribbons, ctx.layout(beads, ribbons)) };
    }),

    agentLever("check", "read", 0, "()", "{ ok, beads, ribbons, forks, merges, loops (counts), roots, unreachable (uid lists), warnings: [text] }", "storytellingAgent.check()",
      () => ({ ok: true, ...agentCheck(store.getState(), ctx.layout) })),

    agentLever("lists", "read", 2, '(categoryKey | "all", { examples? })', "{ ok, text } (the same text as the Lists panel)", 'storytellingAgent.lists("all", { examples: true })', (key, rawOptions) => {
      const opts = agentReadOptions(rawOptions, ["examples"]);
      if (!opts.ok) return opts;
      if (opts.value.examples !== undefined && typeof opts.value.examples !== "boolean") return agentFail("bad-argument", "examples must be true or false");
      if (key !== "all") {
        const checked = readCategory(key);
        if (!checked.ok) return checked;
        if (key === "rogue") return agentFail("bad-argument", "the rogue card is in no list", 'Use a key from categories() or "all".');
      }
      return { ok: true, text: ctx.listText(key, { examples: opts.value.examples === true }) };
    }),

    agentLever("begin", "session", 1, "({ name?, force? })", "{ ok, name, mapWasEmpty }; map-not-empty if a story is open and force is not true", 'storytellingAgent.begin({ name: "Mystery" })', (rawOptions) => {
      const opts = agentReadOptions(rawOptions, ["name", "force"]);
      if (!opts.ok) return opts;
      if (opts.value.force !== undefined && typeof opts.value.force !== "boolean") return agentFail("bad-argument", "force must be true or false");
      let name = ctx.session.open ? ctx.session.name : null;
      if (opts.value.name !== undefined) {
        const read = agentReadName(opts.value.name);
        if (!read.ok) return read;
        name = read.value;
      }
      const empty = store.getState().beads.length === 0;
      if (!ctx.session.open && !empty && opts.value.force !== true) {
        return agentFail("map-not-empty", "a story is already open in the page");
      }
      ctx.setSession(true, name);
      return { ok: true, name: ctx.session.name, mapWasEmpty: empty };
    }),

    agentLever("end", "session", 0, "()", "{ ok, wasOpen }", "storytellingAgent.end()", () => {
      const wasOpen = ctx.session.open;
      ctx.setSession(false, ctx.session.name);
      return { ok: true, wasOpen };
    }),

    agentLever("add", "write", 2, `(elementId, { note?, label? } + ${AGENT_PLACEMENT})`, "{ ok, uid, placed: started|joined|branched|inserted }", 'storytellingAgent.add("Pt", { note: "The butler did it" })', (elementId, rawOptions) => {
      const opts = agentReadOptions(rawOptions, ["after", "branchFrom", "insertOn", "note", "label"]);
      if (!opts.ok) return opts;
      const id = readElementId(elementId);
      if (!id.ok) return id;
      const { after, branchFrom, insertOn, ...text } = opts.value;
      return addElement(id.value, text, { after, branchFrom, insertOn });
    }),

    agentLever("addRogue", "write", 2, `(label, { note? } + ${AGENT_PLACEMENT})`, "{ ok, uid, placed }", 'storytellingAgent.addRogue("The Twin", { after: "b2" })', (label, rawOptions) => {
      const opts = agentReadOptions(rawOptions, ["after", "branchFrom", "insertOn", "note"]);
      if (!opts.ok) return opts;
      if (typeof label !== "string" || !agentCleanText(label)) return agentFail("bad-argument", "label must be non-empty text", "Name the rogue element, e.g. addRogue(\"The Twin\").");
      const text = { value: label };
      const { after, branchFrom, insertOn, note } = opts.value;
      return addElement(data.ROGUE.id, { label: text.value, note }, { after, branchFrom, insertOn });
    }),

    agentLever("pair", "write", 3, "(uid, elementId, { label? })", "{ ok, uid, placed: \"paired\" } (a tandem: the bead now holds two elements)", 'storytellingAgent.pair("b2", "Dra")', (uid, elementId, rawOptions) => {
      const opts = agentReadOptions(rawOptions, ["label"]);
      if (!opts.ok) return opts;
      const bead = readBead(uid);
      if (!bead.ok) return bead;
      const id = readElementId(elementId);
      if (!id.ok) return id;
      return agentFromModel(store.pairBead(bead.value, id.value, opts.value));
    }),

    agentLever("split", "write", 1, "(uid)", "{ ok, uid, secondUid } (a tandem becomes two beads in sequence)", 'storytellingAgent.split("b2")', (uid) => {
      const bead = readBead(uid);
      return bead.ok ? agentFromModel(store.splitBead(bead.value)) : bead;
    }),

    agentLever("link", "write", 2, "(fromUid, toUid)", "{ ok } (adds a ribbon; merges and loops are made this way)", 'storytellingAgent.link("b3", "b5")', (fromUid, toUid) => {
      const from = readBead(fromUid, "fromUid");
      if (!from.ok) return from;
      const to = readBead(toUid, "toUid");
      return to.ok ? agentFromModel(store.linkBeads(from.value, to.value)) : to;
    }),

    agentLever("cut", "write", 2, "(fromUid, toUid)", "{ ok } (removes that ribbon)", 'storytellingAgent.cut("b3", "b5")', (fromUid, toUid) => {
      const from = agentReadUid(fromUid, "fromUid");
      if (!from.ok) return from;
      const to = agentReadUid(toUid, "toUid");
      if (!to.ok) return to;
      const exists = store.getState().ribbons.some(([a, b]) => a === from.value && b === to.value);
      return exists ? agentFromModel(store.cutRibbon(from.value, to.value)) : agentFail("no-such-ribbon", `no ribbon ${from.value} → ${to.value}`);
    }),

    agentLever("move", "write", 2, "(uid, { after | branchFrom | insertOn })", "{ ok, uid, placed }", 'storytellingAgent.move("b4", { after: "b1" })', (uid, rawOptions) => {
      const opts = agentReadOptions(rawOptions, ["after", "branchFrom", "insertOn"]);
      if (!opts.ok) return opts;
      const bead = readBead(uid);
      if (!bead.ok) return bead;
      const placement = readPlacement(opts.value, true);
      if (!placement.ok) return placement;
      const result = agentFromModel(store.moveBead(bead.value, placement.target));
      if (result.ok && placement.placed) result.placed = placement.placed;
      return result;
    }),

    agentLever("remove", "write", 1, "(uid)", "{ ok, uid, healed } (what led into the bead is reconnected to what it led to)", 'storytellingAgent.remove("b4")', (uid) => {
      const bead = readBead(uid);
      return bead.ok ? agentFromModel(store.removeBead(bead.value)) : bead;
    }),

    agentLever("newRibbon", "write", 0, "()", "{ ok } (the next add starts an unattached bead)", "storytellingAgent.newRibbon()", () => agentFromModel(store.newRibbon())),

    agentLever("setActive", "write", 1, "(uid)", "{ ok, uid } (the next plain add joins after this bead)", 'storytellingAgent.setActive("b2")', (uid) => {
      const bead = readBead(uid);
      return bead.ok ? agentFromModel(store.setActive(bead.value)) : bead;
    }),

    agentLever("setName", "write", 1, `(name)`, `{ ok, name } (1-${AGENT_MAX_NAME} characters, plain text)`, 'storytellingAgent.setName("A mystery")', (name) => {
      const read = agentReadName(name);
      if (!read.ok) return read;
      ctx.setSession(true, read.value);
      return { ok: true, name: read.value };
    }),

    agentLever("setNote", "write", 2, "(uid, text)", `{ ok, uid } (at most ${MAX_NOTE} characters; "" removes the note)`, 'storytellingAgent.setNote("b1", "A locked room")', (uid, text) => {
      const bead = readBead(uid);
      if (!bead.ok) return bead;
      if (typeof text !== "string") return agentFail("bad-argument", "text must be text");
      return agentFromModel(store.setNote(bead.value, text));
    }),

    agentLever("clear", "write", 0, "()", `{ ok, cleared } (Luke's inline Undo can restore it for ${UNDO_MS / 1000} seconds)`, "storytellingAgent.clear()", () => agentFromModel(store.clear())),

    agentLever("openLibrary", "write", 1, "(id)", "{ ok, name, note } (loads an editable copy of a library story, replacing the map)", 'storytellingAgent.openLibrary("quest-heros-journey")', (id) => {
      const entry = agentFindLibraryEntry(data, id);
      if (!entry.ok) return entry;
      const loaded = agentFromModel(store.openStory({ name: entry.value.title, beads: entry.value.beads, ribbons: entry.value.ribbons }));
      if (!loaded.ok) return loaded;
      ctx.setSession(true, entry.value.title);
      return { ok: true, name: entry.value.title, note: loaded.note };
    }),

    agentLever("save", "write", 1, "({ name?, replace? })", "{ ok, name, warning? } (saved with the AI tag; exists / not-agent-story if refused)", 'storytellingAgent.save({ name: "A mystery" })', (rawOptions) => {
      const opts = agentReadOptions(rawOptions, ["name", "replace"]);
      if (!opts.ok) return opts;
      if (opts.value.replace !== undefined && typeof opts.value.replace !== "boolean") return agentFail("bad-argument", "replace must be true or false");
      const name = agentReadName(opts.value.name ?? ctx.session.name ?? undefined);
      if (!name.ok) return agentFail(name.error.code, name.error.message, opts.value.name === undefined ? "Pass { name } or call setName(name) first." : undefined);
      return agentSave(ctx, name.value, opts.value.replace === true);
    }),
  ];
  return levers;
}

/* ---------- read helpers ---------- */

function agentElementView(element) {
  const view = { id: element.id, name: element.name, category: element.category ?? element.group, description: element.description, example: element.example };
  if (typeof element.popularity === "number") view.popularity = element.popularity;
  return view;
}

function agentRogueView(data) {
  return { id: data.ROGUE.id, name: data.ROGUE.name, category: "rogue", description: data.ROGUE_DETAIL_TEXT };
}

function agentFindLibraryEntry(data, id) {
  if (typeof id !== "string" || id.length > AGENT_MAX_ID_LENGTH) return agentFail("bad-argument", "id must be a library id (text)");
  const entry = data.LIBRARY.find((candidate) => candidate.id === id);
  if (entry) return { ok: true, value: entry };
  return agentFail("bad-argument", "no such library story", `Valid ids: ${data.LIBRARY.map((candidate) => candidate.id).join(", ")}.`);
}

function agentStoryView(ctx) {
  const { beads, ribbons, activeUid } = ctx.store.getState();
  const arranged = ctx.layout(beads, ribbons);
  const byUid = new Map(beads.map((bead) => [bead.uid, bead]));
  const ordered = arranged.order.map((uid) => byUid.get(uid)).filter(Boolean);
  return {
    name: ctx.session.name,
    agent: ctx.session.open,
    activeUid,
    beads: ordered.map((bead) => {
      const { uid, elementId, ...rest } = bead;
      const place = arranged.positions[uid];
      return { uid, n: arranged.stepNumbers[uid], elementId, ...rest, layer: place.layer, lane: place.lane };
    }),
    ribbons,
  };
}

/** Undirected connected pieces of the map, so "not joined to the rest" is one clear test. */
function agentConnectedToFirst(beads, ribbons, firstUid) {
  const neighbours = new Map(beads.map((bead) => [bead.uid, []]));
  for (const [from, to] of ribbons) {
    neighbours.get(from)?.push(to);
    neighbours.get(to)?.push(from);
  }
  const seen = new Set([firstUid]);
  const queue = [firstUid];
  while (queue.length) {
    for (const next of neighbours.get(queue.shift()) ?? []) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return seen;
}

function agentCheck({ beads, ribbons }, layoutFn) {
  const arranged = layoutFn(beads, ribbons);
  const incoming = new Map(beads.map((bead) => [bead.uid, 0]));
  const outgoing = new Map(beads.map((bead) => [bead.uid, 0]));
  for (const [from, to] of ribbons) {
    outgoing.set(from, (outgoing.get(from) ?? 0) + 1);
    incoming.set(to, (incoming.get(to) ?? 0) + 1);
  }
  const uids = arranged.order;
  const roots = uids.filter((uid) => incoming.get(uid) === 0);
  const joined = uids.length ? agentConnectedToFirst(beads, ribbons, uids[0]) : new Set();
  const unreachable = uids.filter((uid) => !joined.has(uid));
  const loops = arranged.loopRibbons.length;
  const warnings = [];
  if (beads.length === 0) warnings.push("The story is empty.");
  if (beads.length === 1) warnings.push("The story has only one bead.");
  if (unreachable.length) warnings.push(`${unreachable.length} bead(s) are not connected to the rest of the story: ${unreachable.join(", ")}.`);
  for (const [from, to] of arranged.loopRibbons) warnings.push(`The ribbon ${from} → ${to} loops back to an earlier bead.`);
  if (beads.length > 0 && uids.every((uid) => outgoing.get(uid) > 0)) warnings.push("The ribbon never ends: every bead leads on to another.");
  return {
    beads: beads.length,
    ribbons: ribbons.length,
    forks: uids.filter((uid) => outgoing.get(uid) > 1).length,
    merges: uids.filter((uid) => incoming.get(uid) > 1).length,
    loops,
    roots,
    unreachable,
    warnings,
  };
}

/* ---------- saving (FR-A8) ---------- */

function agentSave(ctx, name, replace) {
  const { beads, ribbons } = ctx.store.getState();
  if (beads.length === 0) return agentFail("bad-argument", "there is nothing to save", "Add beads first with add(elementId).");
  try {
    const existing = ctx.api.list().stories.find((story) => story.name === name);
    if (existing && !replace) return agentFail("exists", `a story named "${name}" is already saved`);
    if (existing && existing.agent !== true) return agentFail("not-agent-story", `"${name}" was not saved by an agent`);
    const result = ctx.api.save({ name, beads, ribbons, agent: true, replace });
    if (!result.ok) return agentSaveRefusal(result);
    ctx.setSession(true, name);
    const status = ctx.api.list();
    return status.message ? { ok: true, name, warning: `${status.message}; the story is kept only until the page closes` } : { ok: true, name };
  } catch (error) {
    console.warn(`agent-api save: ${error && error.message}`);
    return agentFail("storage-unavailable", "the story could not be saved");
  }
}

function agentSaveRefusal(result) {
  if (result.exists) return agentFail("exists", "that name is already saved");
  if (/non-agent/i.test(result.error ?? "")) return agentFail("not-agent-story", "that story was not saved by an agent");
  return agentFail("bad-argument", String(result.error ?? "the story could not be saved"));
}

/* ---------- manifest ---------- */

const AGENT_MANIFEST_BASE = Object.freeze({
  name: AGENT_GLOBAL_NAME,
  global: `window.${AGENT_GLOBAL_NAME}`,
  summary: "Levers to read the Periodic Table of Storytelling elements and build, name, save and check a story map (a ribbon of beads).",
  conventions: {
    calls: "Synchronous; plain JSON in and out; never throws.",
    success: "{ ok: true, ... }",
    failure: "{ ok: false, error: { code, message, hint } } — the hint says what to call or change next.",
    kinds: "read = always allowed and changes nothing; session = begin/end; write = needs a session (no-session otherwise).",
  },
  workflow: [
    "help() — read this manifest",
    "elements({ query }) — find element ids",
    "begin({ name }) — open a session (map-not-empty if Luke has a story open)",
    "add(elementId, ...) — build; story() and check() to review; text() for the copy text",
    "save({ name }) — save with the AI tag; end() when done",
  ],
  bounds: { nameCharacters: AGENT_MAX_NAME, noteCharacters: MAX_NOTE, labelCharacters: MAX_LABEL, beads: MAX_BEADS, ribbons: MAX_RIBBONS },
  errors: AGENT_HINTS,
});

/**
 * The self-description of the levers, generated from the lever table itself so it cannot drift.
 * @param {Array<{ name: string, kind: string, arguments: string, returns: string, example: string }>} levers
 * @param {object} [base] the fixed part of the manifest (name, conventions, bounds, error hints)
 * @returns {object} plain JSON: `{ ...base, levers: [{ name, kind, arguments, returns, example }] }`
 */
export function buildManifest(levers, base = AGENT_MANIFEST_BASE) {
  return agentPlain({
    ...base,
    levers: levers.map(({ name, kind, arguments: args, returns, example }) => ({ name, kind, arguments: args, returns, example })),
  });
}

/* ---------- mounting ---------- */

function agentGuard(lever, ctx, args) {
  if (lever.kind === "write" && !ctx.session.open) return agentFail("no-session", "no session is open");
  if (args.length > lever.maxArgs) {
    return agentFail("bad-argument", `${lever.name} takes ${lever.maxArgs === 0 ? "no arguments" : `at most ${lever.maxArgs} argument(s)`}`, `Call it as ${lever.example}`);
  }
  return null;
}

/** Runs one lever; the only place a thrown error is caught, so nothing can escape to the caller. */
function agentRun(lever, ctx, args) {
  try {
    return agentGuard(lever, ctx, args) ?? lever.run(...args);
  } catch (error) {
    console.warn(`agent-api ${lever.name}: ${error && error.message}`);
    return agentFail("internal-error", `${lever.name} failed unexpectedly`);
  }
}

function agentDefaultApi() {
  return { save: (payload) => saveStory(payload), list: () => listStories() };
}

/**
 * Installs `window.storytellingAgent`, the `<meta name="storytelling-agent">` tag and the JSON
 * manifest. No visible control is added (FR-A1). All dependencies are injectable for tests.
 *
 * @param {{ store?: object, storyStoreApi?: { save: Function, list: Function }, doc?: Document, win?: Window,
 *   data?: object, layoutFn?: Function, listTextFn?: Function, storyTextFn?: Function }} [options]
 * @returns {{ manifest: object, destroy: () => void }}
 */
export function mountAgentApi(options = {}) {
  const doc = options.doc ?? globalThis.document;
  const win = options.win ?? globalThis.window ?? globalThis;
  const ctx = {
    store: options.store ?? storyStore,
    api: options.storyStoreApi ?? agentDefaultApi(),
    data: options.data ?? { ELEMENTS, CATEGORIES, ROGUE, ROGUE_DETAIL_TEXT, LIBRARY },
    layout: options.layoutFn ?? layout,
    listText: options.listTextFn ?? listText,
    storyText: options.storyTextFn ?? storyText,
    session: { open: false, name: null },
    manifest: null,
    setSession(open, name) {
      this.session.open = open;
      this.session.name = name;
      agentAnnounce(doc, { active: open, name });
    },
  };
  const levers = agentBuildLevers(ctx);
  ctx.manifest = buildManifest(levers);

  const agent = {};
  for (const lever of levers) agent[lever.name] = (...args) => agentPlain(agentRun(lever, ctx, args));
  win[AGENT_GLOBAL_NAME] = Object.freeze(agent);

  const nodes = agentInstallNodes(doc, ctx.manifest);
  return {
    manifest: ctx.manifest,
    destroy() {
      for (const node of nodes) node.remove();
      delete win[AGENT_GLOBAL_NAME];
      ctx.session.open = false;
    },
  };
}

function agentInstallNodes(doc, manifest) {
  if (!doc || typeof doc.createElement !== "function") return [];
  const meta = doc.createElement("meta");
  meta.setAttribute("name", AGENT_META_NAME);
  meta.setAttribute("content", `window.${AGENT_GLOBAL_NAME}`);
  const script = doc.createElement("script");
  script.setAttribute("type", "application/json");
  script.setAttribute("id", AGENT_MANIFEST_ID);
  script.textContent = JSON.stringify(manifest);
  const parent = doc.head ?? doc.body;
  parent.appendChild(meta);
  parent.appendChild(script);
  return [meta, script];
}

/** Tells the page's status line a session opened, closed or was renamed; the API draws nothing itself. */
function agentAnnounce(doc, detail) {
  if (!doc || typeof doc.dispatchEvent !== "function") return;
  const event = typeof CustomEvent === "function" ? new CustomEvent(EVT_AGENT_SESSION, { detail }) : { type: EVT_AGENT_SESSION, detail };
  doc.dispatchEvent(event);
}
