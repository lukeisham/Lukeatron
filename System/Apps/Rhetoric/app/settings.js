/**
 * What Luke sets stays set between visits, kept in the browser. Storage can be blocked or hold
 * junk, so every access is guarded and falls back to the defaults. `storage` is passed in
 * (localStorage in the page, a fake in tests).
 */

export const TOGGLE_FIELDS = ['showDefinitions', 'showExamples', 'showConfidence', 'showExplanations', 'reveal', 'tableNames', 'tableDefinitions', 'tableExamples', 'indexFull'];
export const NO_DEFAULT = 'none'; // open on the search-only screen

const TOGGLES_KEY = 'rhetoric.toggles';
const DEFAULT_SORT_KEY = 'rhetoric.defaultSort';

/** @returns {Object<string, boolean>} only the saved toggles that hold a real boolean */
export function loadToggles(storage) {
  try {
    const saved = JSON.parse(storage.getItem(TOGGLES_KEY) ?? '{}');
    return Object.fromEntries(TOGGLE_FIELDS.filter((field) => typeof saved?.[field] === 'boolean').map((field) => [field, saved[field]]));
  } catch (error) {
    console.warn('toggles: storage unavailable or unreadable', error);
    return {};
  }
}

export function saveToggles(storage, state) {
  try {
    storage.setItem(TOGGLES_KEY, JSON.stringify(Object.fromEntries(TOGGLE_FIELDS.map((field) => [field, state[field]]))));
  } catch (error) {
    console.warn('toggles: could not save', error);
  }
}

/** @returns {string} the saved group key if it is one of `sorts`, else NO_DEFAULT */
export function loadDefaultSort(storage, sorts) {
  try {
    const saved = storage.getItem(DEFAULT_SORT_KEY);
    return sorts.some((sort) => sort.key === saved) ? saved : NO_DEFAULT;
  } catch (error) {
    console.warn('default group: storage unavailable', error);
    return NO_DEFAULT;
  }
}

export function saveDefaultSort(storage, value) {
  try {
    storage.setItem(DEFAULT_SORT_KEY, value);
  } catch (error) {
    console.warn('default group: could not save', error);
  }
}
