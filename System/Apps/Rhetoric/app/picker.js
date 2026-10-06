/**
 * The device picker for the Grammar group: a text box with a drop-down list that narrows as Luke types,
 * matching the way the search box does (`matchesName`, so the Fuzzy option applies). Choosing an option
 * fills the box and remembers the device; `chosen()` also accepts a name typed out in full.
 */

import { matchesName } from './search.js';

export const PICKER_LIMIT = 12;

const byLabel = (a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });

/** The devices whose shown label matches `query`, A to Z, at most `limit`; an empty query lists the first ones. */
export function pickerOptions(devices, query, fuzzy, limit = PICKER_LIMIT) {
  return [...devices].filter((device) => matchesName(device.label, query, fuzzy)).sort(byLabel).slice(0, limit);
}

/** The one device the typed text names exactly (case-blind), or null; a Flipside's label is `Fallacy/Flipside`. */
export function exactDevice(devices, text) {
  const wanted = text.trim().toLowerCase();
  if (wanted === '') return null;
  const found = [...devices].filter((device) => device.label.toLowerCase() === wanted);
  return found.length === 1 ? found[0] : null;
}

/**
 * Wires `input` and its `list` (a `ul`). `getDevices()` and `isFuzzy()` are read on every keystroke so a
 * redraw of the page never leaves them stale.
 * @returns {{chosen: () => number | null, clear: () => void}}
 */
export function bindDevicePicker({ input, list, getDevices, isFuzzy }) {
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
    options = pickerOptions(getDevices(), input.value, isFuzzy());
    list.replaceChildren(...options.map((device, position) => {
      const item = list.ownerDocument.createElement('li');
      item.id = `${list.id}-option-${position}`;
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', 'false');
      item.className = 'picker-option';
      item.textContent = device.label;
      item.dataset.deviceId = String(device.id);
      return item;
    }));
    list.hidden = options.length === 0;
    input.setAttribute('aria-expanded', String(options.length > 0));
    highlight(options.length > 0 && input.value.trim() !== '' ? 0 : -1);
  };

  const choose = (device) => {
    picked = device.id;
    input.value = device.label;
    close();
  };

  input.addEventListener('input', () => { picked = null; open(); });
  input.addEventListener('focus', open);
  input.addEventListener('blur', close);
  // mousedown, not click: a click would arrive after the box has lost focus and closed the list.
  list.addEventListener('mousedown', (event) => {
    const item = event.target.closest('[data-device-id]');
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
      event.preventDefault(); // choose the highlighted device; a second Enter then submits the form
      choose(options[active]);
    } else if (event.key === 'Escape' && isOpen) {
      event.preventDefault();
      event.stopPropagation(); // the Display menu's own Escape handler must not also fire
      close();
    }
  });

  return {
    chosen: () => picked ?? exactDevice(getDevices(), input.value)?.id ?? null,
    clear: () => { picked = null; input.value = ''; close(); },
  };
}
