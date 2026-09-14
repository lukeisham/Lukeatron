// storage.js — the three remembered choices, read and written through a
// guarded wrapper (controls.spec.md FR-7, AD-2: a per-browser convenience,
// never a file `!ProjectSweep` would have to read).
//
// Every read and write is wrapped in try/catch (JS-2): private-browsing
// modes and a user's own storage settings can make localStorage throw on
// *any* call, not just return null, so a guard around getItem/setItem is
// the only way this module never breaks the toolbar it serves. A blocked
// store degrades to "nothing remembered" — controls.js's own defaults
// apply — never a thrown error reaching the click handler.

const PREFIX = "projectkanban.controls.";

const KEYS = Object.freeze({
  view: `${PREFIX}view`,
  density: `${PREFIX}density`,
  palette: `${PREFIX}palette`,
});

function safeGet(storage, key) {
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch (err) {
    console.warn(`storage.js: could not read "${key}" — falling back to the default`, err);
    return null;
  }
}

function safeSet(storage, key, value) {
  if (!storage) return;
  try {
    storage.setItem(key, value);
  } catch (err) {
    console.warn(`storage.js: could not write "${key}" — this choice will not persist`, err);
  }
}

/**
 * The three stored choices, or `null` per field when nothing was ever saved
 * (first visit) or the read failed. Callers apply their own defaults — this
 * function never invents one, so "never stored" and "explicitly chosen"
 * stay distinguishable (needed for FR-10's palette toggle: an unset palette
 * lets `prefers-color-scheme` decide; an explicit one always wins).
 */
export function loadPreferences(storage) {
  return {
    view: safeGet(storage, KEYS.view),
    density: safeGet(storage, KEYS.density),
    palette: safeGet(storage, KEYS.palette),
  };
}

export function saveView(storage, view) {
  safeSet(storage, KEYS.view, view);
}

export function saveDensity(storage, density) {
  safeSet(storage, KEYS.density, density);
}

export function savePalette(storage, palette) {
  safeSet(storage, KEYS.palette, palette);
}

export { KEYS as STORAGE_KEYS };
