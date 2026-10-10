/**
 * story-store.js — persistence for saved stories and the draft.
 *
 * The only file that touches `localStorage`, under `storytelling.stories.v1` and
 * `storytelling.draft.v1`. Every function takes an optional storage object (default: the browser's
 * localStorage, looked up safely because merely reading it can throw when it is blocked), so tests
 * pass a hand-built fake.
 *
 * Shape:
 *   stories: { version, stories: [{ name, beads, ribbons, agent? }] }   newest first, at most 200
 *   draft:   { version, beads, ribbons }
 *
 * Storage failure: if storage is missing, blocked, unreadable or full, the store keeps
 * working from memory and `storageStatus()` / `listStories().message` say why ("Storage full" or
 * "Storage unavailable"). A later successful write clears the message.
 *
 * Agent guard: an agent's save (`agent: true`) may replace only a story that an agent saved.
 * A save that does not pass `agent: true` is Luke's own gesture and may replace any story.
 */

const STORIES_KEY = "storytelling.stories.v1";
const DRAFT_KEY = "storytelling.draft.v1";
const CURRENT_VERSION = 1;
const MAX_SAVED = 200;
const MAX_NAME = 60;
const STORAGE_FULL_MESSAGE = "Storage full";
const STORAGE_UNAVAILABLE_MESSAGE = "Storage unavailable";

// Working copy of everything; storage is only ever a mirror of it.
let memoryStories = [];
let memoryDraft = null;
let savedStoriesRead = false;
let draftRead = false;
let storageProblem = "";

/** The given storage, else the browser's localStorage, else null (blocked storage throws on access). */
function resolveStorage(storage) {
  if (storage) return storage;
  try {
    return globalThis.localStorage ?? null;
  } catch (error) {
    return null;
  }
}

function isQuotaError(error) {
  return Boolean(error) && (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED" || error.code === 22 || error.code === 1014);
}

/** Records that storage failed, warning only when the problem is new so a blocked page does not spam the console. */
function noteStorageFailure(action, error) {
  const message = isQuotaError(error) ? STORAGE_FULL_MESSAGE : STORAGE_UNAVAILABLE_MESSAGE;
  if (storageProblem !== message) console.warn(`story-store: could not ${action}: ${error?.message ?? error}`);
  storageProblem = message;
}

function noteStorageWorks() {
  storageProblem = "";
}

/** A copy that shares nothing with the caller, in exactly the form storage would return. */
function plainCopy(value) {
  return JSON.parse(JSON.stringify(value));
}

function isSavedStory(candidate) {
  return Boolean(candidate) && typeof candidate.name === "string" && Array.isArray(candidate.beads);
}

/** Saved stories from a stored JSON string; unreadable or foreign data is reported and treated as empty (not as a storage failure). */
function parseSavedStories(json) {
  try {
    const data = JSON.parse(json);
    if (data && data.version === CURRENT_VERSION && Array.isArray(data.stories)) {
      return data.stories.filter(isSavedStory).map((story) => ({ ...story, ribbons: Array.isArray(story.ribbons) ? story.ribbons : [] }));
    }
    console.warn(`story-store: ignoring saved stories of an unknown shape (version ${data && data.version})`);
  } catch (error) {
    console.warn(`story-store: ignoring unreadable saved stories: ${error.message}`);
  }
  return [];
}

/** Reads the saved stories from storage once per page; afterwards memory is the source. */
function readSavedStoriesOnce(storage) {
  if (savedStoriesRead) return;
  savedStoriesRead = true;
  const target = resolveStorage(storage);
  if (!target) {
    noteStorageFailure("read saved stories", new Error("localStorage is not available"));
    return;
  }
  try {
    const json = target.getItem(STORIES_KEY);
    if (json) memoryStories = parseSavedStories(json);
  } catch (error) {
    noteStorageFailure("read saved stories", error);
  }
}

function persistSavedStories(storage) {
  const target = resolveStorage(storage);
  if (!target) {
    noteStorageFailure("save stories", new Error("localStorage is not available"));
    return;
  }
  try {
    target.setItem(STORIES_KEY, JSON.stringify({ version: CURRENT_VERSION, stories: memoryStories }));
    noteStorageWorks();
  } catch (error) {
    noteStorageFailure("save stories", error);
  }
}

function checkStoryName(name) {
  if (typeof name !== "string" || name.trim() === "") return "Name is required";
  if (name.length > MAX_NAME) return `Name must be 1–${MAX_NAME} characters`;
  return "";
}

/**
 * Save a story under a name (newest first; at most 200 saved).
 * A name that is already taken is refused with `exists: true` unless `replace` is true, so the
 * caller can ask inline. Refusals never throw; they return `{ ok: false, error, exists?, code? }`.
 * An agent save (`agent: true`) is also refused (`code: "not-agent-story"`, message contains
 * "non-agent") when the existing story was not saved by an agent, whatever `replace` says.
 *
 * @param {{ name: string, beads: object[], ribbons?: Array<[string, string]>, agent?: boolean, replace?: boolean }} story
 * @param {Storage} [storage] test stand-in for localStorage
 * @returns {{ ok: true } | { ok: false, error: string, exists?: boolean, code?: string }}
 */
export function saveStory({ name, beads, ribbons = [], agent = false, replace = false }, storage) {
  readSavedStoriesOnce(storage);

  const nameProblem = checkStoryName(name);
  if (nameProblem) return { ok: false, error: nameProblem };
  if (!Array.isArray(beads) || beads.length === 0) return { ok: false, error: "Map is empty" };

  const existing = memoryStories.find((story) => story.name === name);
  if (existing && !replace) return { ok: false, error: "Story already exists", exists: true, code: "exists" };
  if (existing && agent && existing.agent !== true) {
    return { ok: false, error: "Cannot replace a non-agent story as an agent", code: "not-agent-story" };
  }
  if (!existing && memoryStories.length >= MAX_SAVED) {
    return { ok: false, error: `Saved stories are full (${MAX_SAVED}) — delete one to save another`, code: "full" };
  }

  const record = { name, beads: plainCopy(beads), ribbons: plainCopy(Array.isArray(ribbons) ? ribbons : []), ...(agent && { agent: true }) };
  memoryStories = [record, ...memoryStories.filter((story) => story !== existing)];

  persistSavedStories(storage);
  return { ok: true };
}

/**
 * The saved stories, newest first, each `{ name, agent? }`. `message` is present when storage has
 * failed, so the UI can say the list lives in memory only.
 *
 * @param {Storage} [storage]
 * @returns {{ ok: true, stories: Array<{ name: string, agent?: true }>, message?: string }}
 */
export function listStories(storage) {
  readSavedStoriesOnce(storage);
  return {
    ok: true,
    stories: memoryStories.map((story) => ({ name: story.name, ...(story.agent && { agent: true }) })),
    ...(storageProblem && { message: storageProblem }),
  };
}

/**
 * Open a saved story by name: a copy of its beads and ribbons, plus `agent` if an agent saved it.
 *
 * @param {string} name
 * @param {Storage} [storage]
 * @returns {{ ok: true, name: string, beads: object[], ribbons: Array<[string, string]>, agent?: true } | { ok: false, error: string }}
 */
export function openSavedStory(name, storage) {
  readSavedStoriesOnce(storage);
  const story = memoryStories.find((candidate) => candidate.name === name);
  if (!story) return { ok: false, error: "Story not found" };
  return { ok: true, name: story.name, beads: plainCopy(story.beads), ribbons: plainCopy(story.ribbons), ...(story.agent && { agent: true }) };
}

/**
 * Delete a saved story.
 *
 * @param {string} name
 * @param {Storage} [storage]
 * @returns {{ ok: boolean, error?: string }}
 */
export function deleteStory(name, storage) {
  readSavedStoriesOnce(storage);
  if (!memoryStories.some((story) => story.name === name)) return { ok: false, error: "Story not found" };
  memoryStories = memoryStories.filter((story) => story.name !== name);
  persistSavedStories(storage);
  return { ok: true };
}

/**
 * Write the current, unsaved map as the draft; called on every change.
 * Always succeeds from the caller's view: if storage fails the draft stays in memory.
 *
 * @param {object[]} beads
 * @param {Array<[string, string]>} [ribbons]
 * @param {Storage} [storage]
 * @returns {{ ok: true }}
 */
export function writeDraft(beads, ribbons = [], storage) {
  memoryDraft = { version: CURRENT_VERSION, beads: plainCopy(Array.isArray(beads) ? beads : []), ribbons: plainCopy(Array.isArray(ribbons) ? ribbons : []) };
  draftRead = true;

  const target = resolveStorage(storage);
  if (!target) {
    noteStorageFailure("write the draft", new Error("localStorage is not available"));
    return { ok: true };
  }
  try {
    target.setItem(DRAFT_KEY, JSON.stringify(memoryDraft));
    noteStorageWorks();
  } catch (error) {
    noteStorageFailure("write the draft", error);
  }
  return { ok: true };
}

/**
 * The draft to restore at load: empty beads and ribbons when there is none.
 * `message` is present when storage has failed.
 *
 * @param {Storage} [storage]
 * @returns {{ ok: true, beads: object[], ribbons: Array<[string, string]>, message?: string }}
 */
export function readDraft(storage) {
  if (!draftRead) {
    draftRead = true;
    readDraftFromStorage(storage);
  }
  return {
    ok: true,
    beads: memoryDraft ? plainCopy(memoryDraft.beads) : [],
    ribbons: memoryDraft ? plainCopy(memoryDraft.ribbons) : [],
    ...(storageProblem && { message: storageProblem }),
  };
}

function readDraftFromStorage(storage) {
  const target = resolveStorage(storage);
  if (!target) {
    noteStorageFailure("read the draft", new Error("localStorage is not available"));
    return;
  }
  let json;
  try {
    json = target.getItem(DRAFT_KEY);
  } catch (error) {
    noteStorageFailure("read the draft", error);
    return;
  }
  if (!json) return;
  try {
    const data = JSON.parse(json);
    if (data && data.version === CURRENT_VERSION && Array.isArray(data.beads)) {
      memoryDraft = { version: CURRENT_VERSION, beads: data.beads, ribbons: Array.isArray(data.ribbons) ? data.ribbons : [] };
    } else {
      console.warn("story-store: ignoring a draft of an unknown shape");
    }
  } catch (error) {
    console.warn(`story-store: ignoring an unreadable draft: ${error.message}`);
  }
}

/**
 * Whether storage is working, for the UI's one-time note next to Save.
 *
 * @returns {{ available: boolean, message: string }} `message` is "" when available
 */
export function storageStatus() {
  return { available: storageProblem === "", message: storageProblem };
}

/** Forget everything held in memory, as at a fresh page load. For tests, which share this module's state. */
export function resetStoryStore() {
  memoryStories = [];
  memoryDraft = null;
  savedStoriesRead = false;
  draftRead = false;
  storageProblem = "";
}
