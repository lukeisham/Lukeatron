import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";
import * as storeModule from "../app/story/story-store.js";
import {
  saveStory,
  listStories,
  openSavedStory,
  deleteStory,
  writeDraft,
  readDraft,
  storageStatus,
  resetStoryStore,
} from "../app/story/story-store.js";

const STORIES_KEY = "storytelling.stories.v1";
const DRAFT_KEY = "storytelling.draft.v1";

/** The module keeps state between calls, so every test starts from a fresh page (TEST-4). */
beforeEach(() => {
  resetStoryStore();
});

/** Hand-built localStorage stand-in; `data` is exposed so tests can see and seed what is stored. */
function createFakeStorage(seed = {}) {
  const data = { ...seed };
  return {
    data,
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = String(value);
    },
    removeItem: (key) => {
      delete data[key];
    },
  };
}

function storageError(name, message = name) {
  const error = new Error(message);
  error.name = name;
  return error;
}

/** Storage whose writes fail with `writeError` while `failing` is true. */
function createFailingWriteStorage(writeError) {
  const storage = createFakeStorage();
  const realSetItem = storage.setItem;
  storage.failing = true;
  storage.setItem = (key, value) => {
    if (storage.failing) throw writeError;
    realSetItem(key, value);
  };
  return storage;
}

/** Storage that cannot even be read (a browser blocking site data). */
function createUnreadableStorage() {
  return {
    getItem: () => {
      throw storageError("SecurityError", "access denied");
    },
    setItem: () => {
      throw storageError("SecurityError", "write denied");
    },
    removeItem: () => {},
  };
}

/** Runs `body` with console.warn silenced and collected, so expected warnings do not clutter the report. */
function withWarnings(body) {
  const original = console.warn;
  const warnings = [];
  console.warn = (message) => warnings.push(String(message));
  try {
    body();
  } finally {
    console.warn = original;
  }
  return warnings;
}

const oneBead = [{ uid: "b1", elementId: "Hro" }];
const twoBeads = [
  { uid: "b1", elementId: "Hro" },
  { uid: "b2", elementId: "Vll" },
];

test("the exports are the documented, unambiguous names (they become globals once bundled)", () => {
  assert.deepEqual(Object.keys(storeModule).sort(), [
    "deleteStory",
    "listStories",
    "openSavedStory",
    "readDraft",
    "resetStoryStore",
    "saveStory",
    "storageStatus",
    "writeDraft",
  ]);
});

test("save, list and open round-trip a story", () => {
  const storage = createFakeStorage();
  assert.deepEqual(saveStory({ name: "Test Story", beads: twoBeads, ribbons: [["b1", "b2"]] }, storage), { ok: true });

  const listed = listStories(storage);
  assert.deepEqual(listed, { ok: true, stories: [{ name: "Test Story" }] });

  const opened = openSavedStory("Test Story", storage);
  assert.deepEqual(opened, { ok: true, name: "Test Story", beads: twoBeads, ribbons: [["b1", "b2"]] });
  assert.equal("agent" in opened, false, "a story Luke saved carries no agent flag");
});

test("AC-C6: a saved story and the draft are both there after a page reload", () => {
  const storage = createFakeStorage();
  saveStory({ name: "Kept", beads: oneBead }, storage);
  writeDraft(twoBeads, [["b1", "b2"]], storage);

  resetStoryStore(); // a new page over the same storage

  assert.deepEqual(listStories(storage).stories, [{ name: "Kept" }]);
  assert.deepEqual(openSavedStory("Kept", storage).beads, oneBead);
  const draft = readDraft(storage);
  assert.deepEqual(draft, { ok: true, beads: twoBeads, ribbons: [["b1", "b2"]] });
});

test("a saved story shares nothing with the caller's arrays or with what open returned", () => {
  const storage = createFakeStorage();
  const beads = [{ uid: "b1", elementId: "Hro" }];
  saveStory({ name: "Copy", beads }, storage);
  beads[0].elementId = "CHANGED";

  const first = openSavedStory("Copy", storage);
  assert.equal(first.beads[0].elementId, "Hro");
  first.beads[0].elementId = "ALSO CHANGED";
  assert.equal(openSavedStory("Copy", storage).beads[0].elementId, "Hro");
});

test("name validation: empty, whitespace-only and over-long names are refused; 60 characters is fine", () => {
  const storage = createFakeStorage();
  assert.match(saveStory({ name: "", beads: oneBead }, storage).error, /required/i);
  assert.match(saveStory({ name: "   ", beads: oneBead }, storage).error, /required/i);
  assert.match(saveStory({ name: undefined, beads: oneBead }, storage).error, /required/i);
  assert.match(saveStory({ name: "a".repeat(61), beads: oneBead }, storage).error, /1–60/);
  assert.equal(saveStory({ name: "a".repeat(60), beads: oneBead }, storage).ok, true);
  assert.equal(listStories(storage).stories.length, 1, "only the valid one was saved");
});

test("map validation: an empty or missing map is refused", () => {
  const storage = createFakeStorage();
  assert.match(saveStory({ name: "Empty", beads: [] }, storage).error, /empty/i);
  assert.match(saveStory({ name: "Missing" }, storage).error, /empty/i);
  assert.equal(listStories(storage).stories.length, 0);
});

test("replace flow: a taken name is refused with exists:true, then replaced when replace:true", () => {
  const storage = createFakeStorage();
  saveStory({ name: "My Story", beads: oneBead }, storage);

  const refused = saveStory({ name: "My Story", beads: twoBeads }, storage);
  assert.equal(refused.ok, false);
  assert.equal(refused.exists, true);
  assert.deepEqual(openSavedStory("My Story", storage).beads, oneBead, "the original is untouched");

  assert.deepEqual(saveStory({ name: "My Story", beads: twoBeads, replace: true }, storage), { ok: true });
  assert.deepEqual(openSavedStory("My Story", storage).beads, twoBeads);
  assert.equal(listStories(storage).stories.length, 1, "replaced, not duplicated");
});

test("newest first; a replaced story moves to the front", () => {
  const storage = createFakeStorage();
  for (const name of ["One", "Two", "Three"]) saveStory({ name, beads: oneBead }, storage);
  assert.deepEqual(listStories(storage).stories.map((story) => story.name), ["Three", "Two", "One"]);

  saveStory({ name: "One", beads: twoBeads, replace: true }, storage);
  assert.deepEqual(listStories(storage).stories.map((story) => story.name), ["One", "Three", "Two"]);
});

test("cap of 200 (FR-C10): the 201st new name is refused with a message, nothing older is lost silently; replacing at the cap works", () => {
  const storage = createFakeStorage();
  for (let index = 0; index < 200; index += 1) {
    assert.equal(saveStory({ name: `Story ${index}`, beads: oneBead }, storage).ok, true);
  }
  const refused = saveStory({ name: "Story 200", beads: oneBead }, storage);
  assert.equal(refused.ok, false);
  assert.match(refused.error, /200/);

  const stories = listStories(storage).stories;
  assert.equal(stories.length, 200);
  assert.equal(stories.at(-1).name, "Story 0", "the oldest is still there");

  assert.equal(saveStory({ name: "Story 5", beads: twoBeads, replace: true }, storage).ok, true);
  assert.equal(listStories(storage).stories.length, 200);

  assert.equal(deleteStory("Story 6", storage).ok, true);
  assert.equal(saveStory({ name: "Story 200", beads: oneBead }, storage).ok, true, "room again after a delete");
});

test("delete removes a story from the list and from storage; an unknown name is an error", () => {
  const storage = createFakeStorage();
  saveStory({ name: "Story 1", beads: oneBead }, storage);
  saveStory({ name: "Story 2", beads: oneBead }, storage);

  assert.deepEqual(deleteStory("Story 1", storage), { ok: true });
  assert.deepEqual(listStories(storage).stories.map((story) => story.name), ["Story 2"]);
  assert.deepEqual(JSON.parse(storage.data[STORIES_KEY]).stories.map((story) => story.name), ["Story 2"]);

  assert.match(deleteStory("Nonexistent", storage).error, /not found/i);
});

test("deleting the last story stays deleted (it is not re-read back from storage)", () => {
  const storage = createFakeStorage();
  saveStory({ name: "Only", beads: oneBead }, storage);
  deleteStory("Only", storage);
  assert.deepEqual(listStories(storage).stories, []);
  assert.deepEqual(openSavedStory("Only", storage), { ok: false, error: "Story not found" });
});

test("open of an unknown name is an error, not a throw", () => {
  assert.match(openSavedStory("Nonexistent", createFakeStorage()).error, /not found/i);
});

test("FR-A8 gate, blocked path: an agent save cannot replace a story an agent did not save, whatever replace says", () => {
  const storage = createFakeStorage();
  saveStory({ name: "Luke Story", beads: oneBead }, storage);

  const refused = saveStory({ name: "Luke Story", beads: twoBeads, agent: true, replace: true }, storage);
  assert.equal(refused.ok, false);
  assert.match(refused.error, /non-agent/i);
  assert.equal(refused.code, "not-agent-story");
  assert.deepEqual(openSavedStory("Luke Story", storage).beads, oneBead, "the story is unchanged");
  assert.equal("agent" in openSavedStory("Luke Story", storage), false);
});

test("FR-A8 gate, permitted paths: an agent replaces its own story; Luke may replace any story, agent-made or not", () => {
  const storage = createFakeStorage();
  saveStory({ name: "AI Story", beads: oneBead, agent: true }, storage);
  assert.deepEqual(listStories(storage).stories, [{ name: "AI Story", agent: true }]);

  assert.equal(saveStory({ name: "AI Story", beads: twoBeads, agent: true, replace: true }, storage).ok, true);
  assert.deepEqual(openSavedStory("AI Story", storage), { ok: true, name: "AI Story", beads: twoBeads, ribbons: [], agent: true });

  assert.equal(saveStory({ name: "AI Story", beads: oneBead, replace: true }, storage).ok, true, "Luke's own gesture");
  assert.equal("agent" in openSavedStory("AI Story", storage), false, "so it is now his, without the tag");
});

test("FR-A8: an agent that does not pass replace is told the name exists, for its own or anyone's story", () => {
  const storage = createFakeStorage();
  saveStory({ name: "Mine", beads: oneBead, agent: true }, storage);
  saveStory({ name: "Luke's", beads: oneBead }, storage);
  for (const name of ["Mine", "Luke's"]) {
    const result = saveStory({ name, beads: twoBeads, agent: true }, storage);
    assert.equal(result.ok, false);
    assert.equal(result.exists, true);
  }
});

test("FR-C12, full: a full storage keeps working in memory and reports 'Storage full'", () => {
  const storage = createFailingWriteStorage(storageError("QuotaExceededError", "Quota exceeded"));
  const warnings = withWarnings(() => {
    assert.deepEqual(saveStory({ name: "My Story", beads: oneBead }, storage), { ok: true });
  });
  assert.equal(warnings.length, 1, "the failure is reported to the console once");

  assert.deepEqual(storageStatus(), { available: false, message: "Storage full" });
  const listed = listStories(storage);
  assert.deepEqual(listed.stories, [{ name: "My Story" }]);
  assert.equal(listed.message, "Storage full");
  assert.deepEqual(openSavedStory("My Story", storage).beads, oneBead);

  withWarnings(() => writeDraft(oneBead, [], storage));
  assert.deepEqual(readDraft(storage).beads, oneBead, "the draft is kept in memory too");
});

test("FR-C12, other write errors (not just a full quota) are also flagged, as unavailable", () => {
  const storage = createFailingWriteStorage(storageError("SecurityError", "The operation is insecure"));
  withWarnings(() => saveStory({ name: "S", beads: oneBead }, storage));
  assert.deepEqual(storageStatus(), { available: false, message: "Storage unavailable" });
});

test("FR-C12, a draft write failure alone flags storage and still returns ok", () => {
  const storage = createFailingWriteStorage(storageError("QuotaExceededError"));
  let result;
  withWarnings(() => {
    result = writeDraft(oneBead, [], storage);
  });
  assert.deepEqual(result, { ok: true });
  assert.equal(storageStatus().available, false);
  assert.equal(storageStatus().message, "Storage full");
});

test("FR-C12, unreadable storage: reads are flagged with a message (not an empty one) and everything still works in memory", () => {
  const storage = createUnreadableStorage();
  let listed;
  withWarnings(() => {
    listed = listStories(storage);
  });
  assert.deepEqual(listed.stories, []);
  assert.equal(listed.message, "Storage unavailable");

  withWarnings(() => saveStory({ name: "In memory", beads: oneBead }, storage));
  assert.deepEqual(listStories(storage).stories, [{ name: "In memory" }]);
  assert.equal(storageStatus().message, "Storage unavailable");
});

test("FR-C12, an unreadable draft is flagged too, and readDraft carries the message", () => {
  const storage = createUnreadableStorage();
  let draft;
  withWarnings(() => {
    draft = readDraft(storage);
  });
  assert.deepEqual(draft, { ok: true, beads: [], ribbons: [], message: "Storage unavailable" });
  assert.equal(storageStatus().available, false);
});

test("FR-C12, blocked localStorage (touching the global throws): no throw, kept in memory, message shown", () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get() {
      throw storageError("SecurityError", "The operation is insecure");
    },
  });
  try {
    withWarnings(() => {
      assert.deepEqual(saveStory({ name: "No storage", beads: oneBead }), { ok: true });
      assert.deepEqual(writeDraft(oneBead), { ok: true });
    });
    assert.deepEqual(listStories().stories, [{ name: "No storage" }]);
    assert.deepEqual(storageStatus(), { available: false, message: "Storage unavailable" });
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "localStorage", descriptor);
    else delete globalThis.localStorage;
  }
});

test("storage that recovers (space freed) clears the message on the next successful write", () => {
  const storage = createFailingWriteStorage(storageError("QuotaExceededError"));
  withWarnings(() => saveStory({ name: "A", beads: oneBead }, storage));
  assert.equal(storageStatus().available, false);

  storage.failing = false;
  saveStory({ name: "B", beads: oneBead }, storage);
  assert.deepEqual(storageStatus(), { available: true, message: "" });
  assert.deepEqual(JSON.parse(storage.data[STORIES_KEY]).stories.map((story) => story.name), ["B", "A"], "memory is written out in full");
});

test("guard: corrupt or foreign stored data is ignored with a warning and is not mistaken for a storage failure", () => {
  for (const bad of ["{not json", JSON.stringify({ version: 99, stories: [{ name: "x", beads: [] }] }), JSON.stringify({ version: 1, stories: "no" })]) {
    resetStoryStore();
    const storage = createFakeStorage({ [STORIES_KEY]: bad });
    let listed;
    const warnings = withWarnings(() => {
      listed = listStories(storage);
    });
    assert.deepEqual(listed, { ok: true, stories: [] });
    assert.equal(warnings.length, 1);
    assert.equal(storageStatus().available, true);
  }
});

test("guard: stored entries without a name or beads are skipped, valid ones kept", () => {
  const stored = { version: 1, stories: [{ name: "Good", beads: oneBead }, { name: 5, beads: [] }, { beads: [] }, null] };
  const storage = createFakeStorage({ [STORIES_KEY]: JSON.stringify(stored) });
  assert.deepEqual(listStories(storage).stories, [{ name: "Good" }]);
  assert.deepEqual(openSavedStory("Good", storage).ribbons, [], "missing ribbons default to none");
});

test("draft: empty before anything is written, then round-trips", () => {
  const storage = createFakeStorage();
  assert.deepEqual(readDraft(storage), { ok: true, beads: [], ribbons: [] });

  writeDraft(twoBeads, [["b1", "b2"]], storage);
  assert.deepEqual(JSON.parse(storage.data[DRAFT_KEY]), { version: 1, beads: twoBeads, ribbons: [["b1", "b2"]] });
  assert.deepEqual(readDraft(storage), { ok: true, beads: twoBeads, ribbons: [["b1", "b2"]] });
});

test("guard: a draft of an unknown version or shape is ignored with a warning", () => {
  const storage = createFakeStorage({ [DRAFT_KEY]: JSON.stringify({ version: 7, beads: oneBead }) });
  let draft;
  const warnings = withWarnings(() => {
    draft = readDraft(storage);
  });
  assert.deepEqual(draft, { ok: true, beads: [], ribbons: [] });
  assert.equal(warnings.length, 1);
});

test("TEST-4: resetStoryStore leaves no saved story, draft or storage message behind", () => {
  const storage = createFailingWriteStorage(storageError("QuotaExceededError"));
  withWarnings(() => {
    saveStory({ name: "Leaky", beads: oneBead }, storage);
    writeDraft(oneBead, [], storage);
  });
  resetStoryStore();

  const fresh = createFakeStorage();
  assert.deepEqual(listStories(fresh), { ok: true, stories: [] });
  assert.deepEqual(readDraft(fresh), { ok: true, beads: [], ribbons: [] });
  assert.deepEqual(storageStatus(), { available: true, message: "" });
});
