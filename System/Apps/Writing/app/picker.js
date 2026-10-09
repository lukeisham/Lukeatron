/**
 * The type-ahead pickers: a text box with a drop-down list that narrows as Luke types, matching the way the
 * search box does (`matchesName`, so the Fuzzy option applies). Choosing an option fills the box and remembers
 * it; `chosen()` also accepts a name typed out in full. Two use it: the Labels entry box, and the "Under …"
 * parent box of the label form, which would be a very long menu once there are dozens of labels.
 */

import { matchesName } from './search.js';

export const PICKER_LIMIT = 12;
export const PARENT_LIMIT = 200; // a parent list keeps tree order and scrolls, so it is not cut short

const byLabel = (a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });

/** The items whose shown label matches `query`, A to Z (or as given when `sorted` is false), at most `limit`; an empty query lists the first ones. */
export function pickerOptions(entries, query, fuzzy, limit = PICKER_LIMIT, sorted = true) {
  const found = [...entries].filter((entry) => matchesName(entry.label, query, fuzzy));
  return (sorted ? found.sort(byLabel) : found).slice(0, limit);
}

/** The one entry the typed text names exactly (case-blind), or null; a Counterpart's label is `Pattern/Counterpart`. */
export function exactEntry(entries, text) {
  const wanted = text.trim().toLowerCase();
  if (wanted === '') return null;
  const found = [...entries].filter((entry) => entry.label.toLowerCase() === wanted);
  return found.length === 1 ? found[0] : null;
}

/**
 * Wires `input` and its `list` (a `ul`). `getEntries()` (the `{id, label}` items) and `isFuzzy()` are read on
 * every keystroke so a redraw of the page never leaves them stale. `limit` and `sorted` suit a long list that
 * must keep its own order, such as a tree.
 * @returns {{chosen: () => number | null, isEmpty: () => boolean, clear: () => void}}
 */
export function bindEntryPicker({ input, list, getEntries, isFuzzy, limit = PICKER_LIMIT, sorted = true }) {
  let options = [];
  let active = -1;
  let picked = null;

  const close = () => {
    list.hidden = true;
    active = -1;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
  };

  const highlight = (index) => {
    active = index;
    [...list.children].forEach((item, position) => item.setAttribute('aria-selected', String(position === index)));
    if (index >= 0) input.setAttribute('aria-activedescendant', list.children[index].id);
    else input.removeAttribute('aria-activedescendant');
  };

  const open = () => {
    options = pickerOptions(getEntries(), input.value, isFuzzy(), limit, sorted);
    list.replaceChildren(...options.map((entry, position) => {
      const item = list.ownerDocument.createElement('li');
      item.id = `${list.id}-option-${position}`;
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', 'false');
      item.className = 'picker-option';
      item.textContent = entry.label;
      item.dataset.entryId = String(entry.id);
      return item;
    }));
    list.hidden = options.length === 0;
    input.setAttribute('aria-expanded', String(options.length > 0));
    highlight(options.length > 0 && input.value.trim() !== '' ? 0 : -1);
  };

  const choose = (entry) => {
    picked = entry.id;
    input.value = entry.label;
    close();
  };

  input.addEventListener('input', () => { picked = null; open(); });
  input.addEventListener('focus', open);
  input.addEventListener('blur', close);
  // mousedown, not click: a click would arrive after the box has lost focus and closed the list.
  list.addEventListener('mousedown', (event) => {
    const item = event.target.closest('[data-entry-id]');
    if (!item) return;
    event.preventDefault();
    choose(options[[...list.children].indexOf(item)]);
  });
  input.addEventListener('keydown', (event) => {
    const isOpen = !list.hidden;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!isOpen) return open();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      highlight((active + step + options.length) % options.length);
    } else if (event.key === 'Enter' && isOpen && active >= 0) {
      event.preventDefault(); // choose the highlighted entry; a second Enter then submits the form
      choose(options[active]);
    } else if (event.key === 'Escape' && isOpen) {
      event.preventDefault();
      event.stopPropagation(); // the Display menu's own Escape handler must not also fire
      close();
    }
  });

  return {
    // A remembered choice counts only while it is still among the items (its label may have been deleted since).
    chosen: () => (picked !== null && [...getEntries()].some((entry) => entry.id === picked) ? picked : exactEntry(getEntries(), input.value)?.id ?? null),
    // Whether the box holds nothing, which a parent picker reads as "at the top level".
    isEmpty: () => input.value.trim() === '',
    clear: () => { picked = null; input.value = ''; close(); },
  };
}
