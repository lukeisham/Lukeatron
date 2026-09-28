import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { mountAgentApi, buildManifest } from "../app/agent/agent-api.js";
import { EVT_AGENT_SESSION, AGENT_STATUS_TEXT } from "../app/shared/events.js";
import { createStoryStore, MAX_BEADS } from "../app/story/story-model.js";
import { saveStory, listStories, resetStoryStore } from "../app/story/story-store.js";
import { layout } from "../app/story/story-layout.js";
import { storyText } from "../app/story/story-text.js";
import { listText } from "../app/lists/list-text.js";
import { ELEMENTS, CATEGORIES } from "../app/data/elements.js";
import { LIBRARY } from "../app/data/library.js";
import { createFakeDoc } from "./helpers/fake-dom-agent.js";

const CONTROL_TEXT = String.fromCharCode(0, 1, 2);

/** Hand-built localStorage stand-in; story-store keeps its own memory copy, so it is reset per page. */
function fakeStorage() {
  const data = {};
  return {
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => { data[key] = value; },
    removeItem: (key) => { delete data[key]; },
  };
}

/** A fresh page: its own model store, saved-story storage, fake document and window. */
function makePage() {
  resetStoryStore();
  const doc = createFakeDoc();
  const storage = fakeStorage();
  const store = createStoryStore({ eventTarget: doc, warn: () => {} });
  const storyStoreApi = { save: (payload) => saveStory(payload, storage), list: () => listStories(storage) };
  const win = {};
  const mounted = mountAgentApi({ store, storyStoreApi, doc, win });
  return { doc, store, storyStoreApi, win, agent: win.storytellingAgent, mounted };
}

const WRITE_LEVERS = ["add", "addRogue", "pair", "split", "link", "cut", "move", "remove", "newRibbon", "setActive", "setName", "setNote", "clear", "openLibrary", "save"];
const READ_LEVERS = ["help", "categories", "elements", "element", "library", "libraryEntry", "story", "text", "check", "lists"];

/** Valid-shaped arguments for each write lever, used where the guard must fire before validation. */
const VALID_WRITE_CALLS = {
  add: ["C"], addRogue: ["Twin"], pair: ["b1", "Pt"], split: ["b1"], link: ["b1", "b2"], cut: ["b1", "b2"], move: ["b1", { after: "b2" }],
  remove: ["b1"], newRibbon: [], setActive: ["b1"], setName: ["x"], setNote: ["b1", "x"], clear: [], openLibrary: ["quest-heros-journey"], save: [{ name: "x" }],
};

const isBadResult = (result) => result.ok === false && typeof result.error.code === "string" && typeof result.error.message === "string" && result.error.hint.length > 0;

describe("AC-A1: session guard", () => {
  let page;
  beforeEach(() => { page = makePage(); });

  test("every write lever returns no-session and changes nothing", () => {
    const before = JSON.stringify(page.store.getState());
    for (const name of WRITE_LEVERS) {
      for (const args of [[], VALID_WRITE_CALLS[name]]) {
        const result = page.agent[name](...args);
        assert.equal(result.ok, false, name);
        assert.equal(result.error.code, "no-session", name);
        assert.ok(result.error.hint.includes("begin"), name);
      }
    }
    assert.equal(JSON.stringify(page.store.getState()), before);
  });

  test("every read lever works with no session", () => {
    const calls = { elements: [{ limit: 2 }], element: ["C"], libraryEntry: ["quest-heros-journey"], lists: ["all"] };
    for (const name of READ_LEVERS) assert.equal(page.agent[name](...(calls[name] ?? [])).ok, true, name);
  });

  test("a write works after begin and is refused again after end", () => {
    assert.equal(page.agent.begin({ name: "Try" }).ok, true);
    assert.equal(page.agent.add("C").ok, true);
    assert.equal(page.agent.end().ok, true);
    assert.equal(page.agent.add("Re").error.code, "no-session");
  });
});

describe("AC-A2: begin and the status event", () => {
  test("begin on a non-empty map returns map-not-empty and changes nothing; force succeeds", () => {
    const page = makePage();
    page.store.addBead("C", { type: "empty" });
    const before = JSON.stringify(page.store.getState());
    const refused = page.agent.begin({ name: "Mine" });
    assert.equal(refused.error.code, "map-not-empty");
    assert.match(refused.error.hint, /Luke has a story open/);
    assert.equal(JSON.stringify(page.store.getState()), before);
    assert.equal(page.agent.story().agent, false);
    assert.equal(page.agent.add("Re").error.code, "no-session");

    const forced = page.agent.begin({ force: true });
    assert.equal(forced.ok, true);
    assert.equal(forced.mapWasEmpty, false);
    assert.equal(JSON.stringify(page.store.getState()), before, "force does not clear Luke's map");
    assert.equal(page.agent.story().agent, true);
  });

  test("begin on an empty map succeeds, names the story and announces the session", () => {
    const page = makePage();
    assert.deepEqual(page.agent.begin({ name: "  A   mystery " }), { ok: true, name: "A mystery", mapWasEmpty: true });
    const opened = page.doc.events.filter((event) => event.type === EVT_AGENT_SESSION).at(-1);
    assert.deepEqual(opened.detail, { active: true, name: "A mystery" });
    assert.equal(AGENT_STATUS_TEXT, "An agent is editing this story");
    page.agent.end();
    assert.equal(page.doc.events.filter((event) => event.type === EVT_AGENT_SESSION).at(-1).detail.active, false);
  });

  test("begin during an open session is idempotent even on the agent's own map", () => {
    const page = makePage();
    page.agent.begin({ name: "One" });
    page.agent.add("C");
    assert.equal(page.agent.begin().ok, true);
    assert.equal(page.agent.story().name, "One");
  });
});

describe("AC-A3: parity with story-model", () => {
  test("levers and direct model calls give the same state, story() and text()", () => {
    const viaLevers = makePage();
    const { agent } = viaLevers;
    agent.begin({ name: "Parity" });
    const uid = (result) => result.uid;
    const b1 = uid(agent.add("C"));
    const b2 = uid(agent.add("Re"));
    const b3 = uid(agent.add("Pt", { after: b2, note: "the twist" }));
    const b4 = uid(agent.add("Cmx", { branchFrom: b2 }));
    const b5 = uid(agent.addRogue("The twin", { after: b3 }));
    assert.equal(agent.pair(b3, "Hil").placed, "paired");
    const b6 = uid(agent.add("Den", { insertOn: [b3, b5] }));
    assert.equal(agent.link(b4, b6).ok, true);
    assert.equal(agent.setNote(b1, "the start").ok, true);
    assert.equal(agent.move(b4, { after: b1 }).ok, true);
    assert.equal(agent.setActive(b1).ok, true);
    const b7 = uid(agent.add("Chk"));
    assert.equal(agent.split(b3).ok, true);
    assert.equal(agent.remove(b7).ok, true);
    assert.equal(agent.cut(b2, b4).error.code, "no-such-ribbon");

    const direct = createStoryStore({ warn: () => {}, eventTarget: createFakeDoc() });
    direct.addBead("C", { type: "empty" });
    direct.addBead("Re", { type: "empty" });
    direct.setActive(b2);
    direct.addBead("Pt", { type: "empty" }, { note: "the twist" });
    direct.addBead("Cmx", { type: "bead", uid: b2 });
    direct.setActive(b3);
    direct.addBead("Rg", { type: "empty" }, { label: "The twin" });
    direct.pairBead(b3, "Hil");
    direct.addBead("Den", { type: "ribbon", from: b3, to: b5 });
    direct.linkBeads(b4, b6);
    direct.setNote(b1, "the start");
    direct.moveBead(b4, { type: "bead", uid: b1 });
    direct.setActive(b1);
    direct.addBead("Chk", { type: "empty" });
    direct.splitBead(b3);
    direct.removeBead(b7);

    assert.deepEqual(viaLevers.store.getState(), direct.getState());
    const second = makePage();
    second.store.restore(direct.getState());
    second.agent.begin({ name: "Parity", force: true });
    assert.deepEqual(agent.story(), second.agent.story());
    assert.equal(agent.text().text, second.agent.text().text);
    const { beads, ribbons } = direct.getState();
    assert.equal(agent.text().text, storyText("Parity", beads, ribbons, layout(beads, ribbons)));
  });

  test("model refusals come through unchanged in code, with a hint", () => {
    const page = makePage();
    page.agent.begin();
    const a = page.agent.add("C").uid;
    const b = page.agent.add("Re").uid;
    assert.equal(page.agent.link(a, b).error.code, "duplicate-ribbon");
    assert.equal(page.agent.link(a, a).error.code, "self-link");
    assert.equal(page.agent.pair(a, "C").error.code, "same-element");
    assert.equal(page.agent.split(a).error.code, "not-tandem");
    page.agent.pair(a, "Pt");
    assert.equal(page.agent.pair(a, "Hil").error.code, "tandem-full");
    assert.equal(page.agent.add("C", { label: "x" }).error.code, "bad-argument");
    assert.equal(page.agent.remove("nope").error.code, "unknown-bead");
    assert.ok(isBadResult(page.agent.link(a, a)));
  });

  test("the caps apply", () => {
    const page = makePage();
    page.agent.begin();
    for (let i = 0; i < MAX_BEADS; i += 1) assert.equal(page.agent.add("C").ok, true);
    assert.equal(page.agent.add("C").error.code, "cap-reached");
  });

  test("clear empties the map and the model's Undo restores it", () => {
    const page = makePage();
    page.agent.begin();
    page.agent.add("C");
    page.agent.add("Re");
    const before = page.store.getState();
    assert.deepEqual(page.agent.clear(), { ok: true, cleared: true });
    assert.equal(page.agent.story().beads.length, 0);
    assert.equal(page.store.undo().ok, true);
    assert.deepEqual(page.store.getState(), before);
  });

  test("openLibrary loads an editable copy, named for the story", () => {
    const page = makePage();
    page.agent.begin();
    const entry = LIBRARY[0];
    const opened = page.agent.openLibrary(entry.id);
    assert.equal(opened.ok, true);
    assert.equal(opened.name, entry.title);
    assert.equal(page.agent.story().beads.length, entry.beads.length);
    assert.equal(page.agent.story().name, entry.title);
    assert.equal(page.agent.openLibrary("nope").ok, false);
  });
});

describe("AC-A4: saving", () => {
  test("saves with the AI flag, refuses an existing name without replace, replaces its own", () => {
    const page = makePage();
    page.agent.begin({ name: "Mine" });
    page.agent.add("C");
    assert.equal(page.agent.save({}).ok, true, "name falls back to the session name");
    assert.deepEqual(page.storyStoreApi.list().stories, [{ name: "Mine", agent: true }]);
    assert.equal(page.agent.save({ name: "Mine" }).error.code, "exists");
    page.agent.add("Re");
    assert.equal(page.agent.save({ name: "Mine", replace: true }).ok, true);
    const stored = page.storyStoreApi.list().stories;
    assert.equal(stored.length, 1);
    assert.equal(stored[0].agent, true);
  });

  test("refuses to replace a story with no agent flag, whatever replace says", () => {
    const page = makePage();
    const luke = { name: "Luke's", beads: [{ uid: "b1", elementId: "C" }], ribbons: [] };
    assert.equal(page.storyStoreApi.save(luke).ok, true);
    page.agent.begin({ name: "Luke's" });
    page.agent.add("Re");
    assert.equal(page.agent.save({ name: "Luke's" }).error.code, "exists");
    const refused = page.agent.save({ name: "Luke's", replace: true });
    assert.equal(refused.error.code, "not-agent-story");
    assert.ok(refused.error.hint.length > 0);
    assert.deepEqual(page.storyStoreApi.list().stories, [{ name: "Luke's" }]);
  });

  test("the store's own guard also holds when the pre-check is bypassed", () => {
    const page = makePage();
    page.storyStoreApi.save({ name: "Luke's", beads: [{ uid: "b1", elementId: "C" }], ribbons: [] });
    const blindWin = {};
    mountAgentApi({
      store: page.store, doc: createFakeDoc(), win: blindWin,
      storyStoreApi: { list: () => ({ ok: true, stories: [] }), save: page.storyStoreApi.save },
    });
    blindWin.storytellingAgent.begin({ name: "Luke's" });
    blindWin.storytellingAgent.add("C");
    assert.equal(blindWin.storytellingAgent.save({ replace: true }).error.code, "not-agent-story");
    assert.deepEqual(page.storyStoreApi.list().stories, [{ name: "Luke's" }]);
  });

  test("an empty story, a missing name and a broken store are refused with hints", () => {
    const page = makePage();
    page.agent.begin();
    assert.equal(page.agent.save({ name: "x" }).error.code, "bad-argument");
    page.agent.add("C");
    const noName = page.agent.save({});
    assert.equal(noName.error.code, "bad-argument");
    assert.match(noName.error.hint, /setName/);
    const brokenWin = {};
    const denied = () => { throw new Error("denied"); };
    mountAgentApi({ store: page.store, doc: createFakeDoc(), win: brokenWin, storyStoreApi: { list: denied, save: denied } });
    brokenWin.storytellingAgent.begin({ force: true });
    assert.equal(brokenWin.storytellingAgent.save({ name: "x" }).error.code, "storage-unavailable");
  });

  test("there is no lever to delete a saved story or touch localStorage", () => {
    const page = makePage();
    for (const name of Object.keys(page.agent)) assert.doesNotMatch(name, /delete|storage|draft|write/i, name);
  });
});

describe("AC-A5: bad arguments", () => {
  const GARBAGE = [null, 42, NaN, true, [], [[]], "", "x".repeat(10000), CONTROL_TEXT, { bogus: 1 }, Symbol("s"), () => 1, { after: {} }, { note: 5 }];

  function fuzz(page, levers) {
    const bead = page.agent.add("C").uid;
    assert.ok(bead);
    const seen = () => JSON.stringify([page.store.getState(), page.agent.story()]);
    const before = seen();
    let calls = 0;
    for (const name of levers) {
      const tries = [];
      for (const a of GARBAGE) {
        tries.push([a]);
        for (const b of GARBAGE.slice(0, 8)) {
          tries.push([a, b]);
          tries.push([a, b, null]);
        }
      }
      tries.push([bead, 42], [bead, null], ["C", 42], ["C", { after: "nope" }], ["C", { after: bead, branchFrom: bead }], [bead, "C", 42]);
      for (const args of tries) {
        let result;
        assert.doesNotThrow(() => { result = page.agent[name](...args); }, `${name} threw`);
        assert.ok(isBadResult(result), `${name} with ${args.map((x) => typeof x)} should be refused, got ${JSON.stringify(result)}`);
        assert.notEqual(result.error.code, "internal-error", name);
        assert.equal(seen(), before, `${name} changed state on a bad call`);
        calls += 1;
      }
    }
    return calls;
  }

  test("every lever refuses garbage with a code and a hint, throws nothing, changes nothing (session open)", () => {
    const page = makePage();
    page.agent.begin({ name: "Fuzz" });
    const calls = fuzz(page, Object.keys(page.agent));
    assert.ok(calls > 5000, `only ${calls} calls`);
    assert.equal(page.agent.story().beads.length, 1);
    assert.equal(page.agent.story().name, "Fuzz");
  });

  test("garbage with no session still returns no-session for writes and never throws", () => {
    const page = makePage();
    for (const name of WRITE_LEVERS) {
      for (const a of GARBAGE) assert.equal(page.agent[name](a, a).error.code, "no-session", name);
    }
  });

  test("required arguments cannot be left out", () => {
    const page = makePage();
    page.agent.begin();
    for (const name of ["add", "pair", "split", "link", "cut", "move", "remove", "setActive", "setName", "setNote", "openLibrary", "element", "libraryEntry", "lists"]) {
      assert.ok(isBadResult(page.agent[name]()), name);
    }
    assert.equal(page.agent.story().beads.length, 0);
  });

  test("unknown ids come back with the nearest matches in the hint", () => {
    const page = makePage();
    page.agent.begin();
    const result = page.agent.add("Plot Twis");
    assert.equal(result.error.code, "unknown-element");
    assert.match(result.error.hint, /Pt \(Plot Twist\)/);
    assert.match(page.agent.element("Cmx ").error.hint, /Cmx/);
  });

  test("text bounds: names 60, notes 80, labels 24, plain text", () => {
    const page = makePage();
    page.agent.begin();
    assert.equal(page.agent.setName("n".repeat(61)).error.code, "too-long");
    assert.equal(page.agent.setName("n".repeat(60)).ok, true);
    const uid = page.agent.add("C").uid;
    assert.equal(page.agent.setNote(uid, "n".repeat(81)).error.code, "too-long");
    assert.equal(page.agent.setNote(uid, "n".repeat(80)).ok, true);
    assert.equal(page.agent.addRogue("l".repeat(25)).error.code, "too-long");
    assert.equal(page.agent.addRogue("l".repeat(24)).ok, true);
    assert.equal(page.agent.setNote(uid, "  <b>hi</b> \t there ").ok, true);
    assert.equal(page.agent.story().beads.find((b) => b.uid === uid).note, "<b>hi</b> there");
    assert.equal(page.agent.setName("a" + CONTROL_TEXT + "b").name, "a b");
  });
});

describe("read levers", () => {
  test("categories lists twelve with counts that add up to the elements", () => {
    const { agent } = makePage();
    const { categories } = agent.categories();
    assert.equal(categories.length, CATEGORIES.length);
    assert.equal(categories.reduce((sum, c) => sum + c.count, 0), ELEMENTS.filter((e) => CATEGORIES.some((c) => c.key === (e.category ?? e.group))).length);
  });

  test("elements filters by category and query, limits, and returns rogue as Rg", () => {
    const { agent } = makePage();
    const all = agent.elements({ limit: 300 });
    assert.equal(all.total, ELEMENTS.length + 1);
    assert.ok(all.elements.some((e) => e.id === "Rg" && e.category === "rogue" && !("popularity" in e)));
    const villains = agent.elements({ category: "villains", limit: 300 });
    assert.ok(villains.elements.length > 3 && villains.elements.every((e) => e.category === "villains"));
    assert.equal(agent.elements({ limit: 3 }).elements.length, 3);
    const twist = agent.elements({ query: "PLOT twist" });
    assert.ok(twist.elements.some((e) => e.id === "Pt"));
    const poster = ELEMENTS.find((e) => typeof e.popularity === "number");
    assert.equal(agent.element(poster.id).element.popularity, poster.popularity);
    const added = ELEMENTS.find((e) => e.added);
    assert.ok(!("popularity" in agent.element(added.id).element));
    assert.equal(agent.elements({ category: "nonsense" }).error.code, "bad-argument");
    assert.equal(agent.elements({ limit: 0 }).error.code, "bad-argument");
    assert.deepEqual(agent.elements({ query: "zzzqqq" }).elements, []);
  });

  test("the query also matches the category label", () => {
    const { agent } = makePage();
    assert.ok(agent.elements({ query: "Fandom", limit: 300 }).elements.some((e) => e.category === "fandom"));
  });

  test("library and libraryEntry return plain copies of the frozen entries", () => {
    const { agent } = makePage();
    assert.equal(agent.library().entries.length, LIBRARY.length);
    const entry = agent.libraryEntry(LIBRARY[1].id).entry;
    assert.deepEqual(entry, JSON.parse(JSON.stringify(LIBRARY[1])));
    entry.beads.length = 0;
    assert.ok(LIBRARY[1].beads.length > 0);
  });

  test("lists returns exactly what the Lists panel text is", () => {
    const { agent } = makePage();
    assert.equal(agent.lists("all", { examples: true }).text, listText("all", { examples: true }));
    assert.equal(agent.lists("villains").text, listText("villains", { examples: false }));
    assert.equal(agent.lists("nope").error.code, "bad-argument");
  });

  test("story() carries step numbers, layers and lanes in reading order", () => {
    const page = makePage();
    page.agent.begin({ name: "S" });
    const a = page.agent.add("C").uid;
    const b = page.agent.add("Re").uid;
    const c = page.agent.add("Pt", { branchFrom: a }).uid;
    const story = page.agent.story();
    assert.equal(story.name, "S");
    assert.equal(story.activeUid, c);
    assert.deepEqual(story.ribbons, [[a, b], [a, c]]);
    assert.deepEqual(story.beads.map((bead) => bead.n), [1, 2, 3]);
    assert.deepEqual(story.beads.map((bead) => [bead.layer, bead.lane]), [[0, 0], [1, 0], [1, 1]]);
    assert.deepEqual(Object.keys(story.beads[0]), ["uid", "n", "elementId", "layer", "lane"]);
  });

  test("check() reports forks, merges, loops, roots and warnings, and changes nothing", () => {
    const page = makePage();
    page.agent.begin();
    assert.deepEqual(page.agent.check().warnings, ["The story is empty."]);
    const a = page.agent.add("C").uid;
    assert.deepEqual(page.agent.check().warnings, ["The story has only one bead."]);
    const b = page.agent.add("Re").uid;
    const c = page.agent.add("Pt", { branchFrom: a }).uid;
    page.agent.link(b, c);
    page.agent.newRibbon();
    const lonely = page.agent.add("Den").uid;
    const before = JSON.stringify(page.store.getState());
    const report = page.agent.check();
    assert.equal(JSON.stringify(page.store.getState()), before);
    assert.equal(report.beads, 4);
    assert.equal(report.ribbons, 3);
    assert.equal(report.forks, 1);
    assert.equal(report.merges, 1);
    assert.deepEqual(report.roots, [a, lonely]);
    assert.deepEqual(report.unreachable, [lonely]);
    assert.ok(report.warnings.some((w) => w.includes(lonely) && /not connected/.test(w)));
    page.agent.link(c, a);
    assert.equal(page.agent.check().loops, 1);
    assert.ok(page.agent.check().warnings.some((w) => /loops back/.test(w)));
  });

  test("a ribbon that leads on forever is warned about", () => {
    const page = makePage();
    page.agent.begin();
    const a = page.agent.add("C").uid;
    const b = page.agent.add("Re").uid;
    page.agent.link(b, a);
    assert.ok(page.agent.check().warnings.some((w) => /never ends/.test(w)));
  });

  test("text() is the Copy text, empty for an empty map", () => {
    const page = makePage();
    assert.deepEqual(page.agent.text(), { ok: true, text: "" });
    page.agent.begin({ name: "T" });
    page.agent.add("C", { note: "hello" });
    const text = page.agent.text().text;
    assert.ok(text.startsWith("T\n1. C — Conflict"));
    assert.ok(text.includes("hello"));
  });
});

describe("AC-A6: the manifest is generated from the levers", () => {
  test("help() lists exactly the levers that exist, in the same order", () => {
    const page = makePage();
    const manifest = page.agent.help().manifest;
    assert.deepEqual(manifest.levers.map((lever) => lever.name), Object.keys(page.agent));
    assert.deepEqual(page.mounted.manifest, manifest);
    for (const lever of manifest.levers) {
      assert.equal(typeof page.agent[lever.name], "function", lever.name);
      for (const field of ["kind", "arguments", "returns", "example"]) assert.equal(typeof lever[field], "string", `${lever.name}.${field}`);
      assert.ok(lever.example.startsWith(`storytellingAgent.${lever.name}(`), lever.name);
      assert.ok(["read", "write", "session"].includes(lever.kind));
    }
    assert.deepEqual(manifest.levers.filter((l) => l.kind === "write").map((l) => l.name), WRITE_LEVERS);
  });

  test("the meta tag and the JSON script carry the same manifest; nothing else is added", () => {
    const page = makePage();
    const meta = page.doc.findMeta("storytelling-agent");
    assert.equal(meta.getAttribute("content"), "window.storytellingAgent");
    const script = page.doc.getElementById("storytelling-agent-manifest");
    assert.equal(script.getAttribute("type"), "application/json");
    assert.deepEqual(JSON.parse(script.textContent), page.agent.help().manifest);
    assert.equal(page.doc.head.children.length, 2, "only the meta and the manifest (AC-A8)");
    assert.deepEqual(page.doc.events, [], "mounting announces nothing");
  });

  test("buildManifest reads the table it is given, so it cannot list a lever that is not there", () => {
    const table = [{ name: "one", kind: "read", arguments: "()", returns: "{ ok }", example: "storytellingAgent.one()", run: () => 1 }];
    const built = buildManifest(table, { name: "x" });
    assert.deepEqual(built, { name: "x", levers: [{ name: "one", kind: "read", arguments: "()", returns: "{ ok }", example: "storytellingAgent.one()" }] });
  });

  test("the published error table covers every code the levers return", () => {
    const page = makePage();
    const codes = Object.keys(page.agent.help().manifest.errors);
    for (const code of ["bad-argument", "unknown-element", "unknown-bead", "cap-reached", "map-not-empty", "no-session", "not-agent-story", "exists", "storage-unavailable"]) {
      assert.ok(codes.includes(code), code);
    }
  });

  test("destroy removes the levers and the tags", () => {
    const page = makePage();
    page.mounted.destroy();
    assert.equal(page.win.storytellingAgent, undefined);
    assert.equal(page.doc.head.children.length, 0);
  });

  test("the agent object is frozen and every result is plain JSON", () => {
    const page = makePage();
    assert.throws(() => { page.agent.extra = 1; }, TypeError);
    page.agent.begin();
    page.agent.add("C");
    for (const name of [...READ_LEVERS.filter((n) => !["element", "libraryEntry", "lists"].includes(n)), "end"]) {
      const result = page.agent[name]();
      assert.deepEqual(result, JSON.parse(JSON.stringify(result)), name);
    }
  });
});
