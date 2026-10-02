/** Wires the page: loads data once, then re-renders on each state change (frontend.spec AD-1). */

import { fetchItems } from './api.js';
import { copyCurrentView, printCurrentView } from './actions.js';
import { renderList, renderSortButtons, renderStatus } from './render.js';
import {
  EVERYTHING, FULL_VIEW, SORTS, createState, deviceView, setActiveView, setSortOrder, subtreeView, toggleExpanded,
  toggleRevealed,
} from './state.js';
import { currentView } from './view.js';

const $ = (id) => document.getElementById(id);
const els = {
  list: $('list'), sort: $('sort'), search: $('search'), fuzzy: $('fuzzy'),
  showDefinitions: $('show-definitions'), showExamples: $('show-examples'),
  showConfidence: $('show-confidence'), reveal: $('reveal'), defaultSort: $('default-sort'),
  print: $('print'), copy: $('copy'), copyStatus: $('copy-status'), home: $('home'),
};

const COPY_STATUS_MS = 2000;
const DEFAULT_SORT_KEY = 'rhetoric.defaultSort';
const NO_DEFAULT = 'none'; // open on the search-only screen
let state = null;

// Which group the app opens on is remembered in this browser; storage can be blocked, so every access is guarded.
function savedDefaultSort() {
  try {
    const saved = localStorage.getItem(DEFAULT_SORT_KEY);
    return SORTS.some((sort) => sort.key === saved) ? saved : NO_DEFAULT;
  } catch (error) {
    console.warn('default group: storage unavailable', error);
    return NO_DEFAULT;
  }
}

function saveDefaultSort(value) {
  try {
    localStorage.setItem(DEFAULT_SORT_KEY, value);
  } catch (error) {
    console.warn('default group: could not save', error);
  }
}

// The four display toggles are remembered together, as one JSON object of booleans.
const TOGGLES_KEY = 'rhetoric.toggles';
const TOGGLE_FIELDS = ['showDefinitions', 'showExamples', 'showConfidence', 'reveal'];

function loadToggles() {
  try {
    const saved = JSON.parse(localStorage.getItem(TOGGLES_KEY) ?? '{}');
    return Object.fromEntries(TOGGLE_FIELDS.filter((field) => typeof saved?.[field] === 'boolean').map((field) => [field, saved[field]]));
  } catch (error) {
    console.warn('toggles: storage unavailable or unreadable', error);
    return {};
  }
}

function saveToggles() {
  try {
    localStorage.setItem(TOGGLES_KEY, JSON.stringify(Object.fromEntries(TOGGLE_FIELDS.map((field) => [field, state[field]]))));
  } catch (error) {
    console.warn('toggles: could not save', error);
  }
}

function refresh() {
  renderSortButtons(document, els.sort, SORTS, state.sortOrder);
  renderList(document, els.list, state, currentView(state));
  els.home.hidden = state.activeView === FULL_VIEW;
}

function applyToggles() {
  document.body.classList.toggle('hide-definitions', !state.showDefinitions);
  document.body.classList.toggle('hide-examples', !state.showExamples);
  document.body.classList.toggle('hide-confidence', !state.showConfidence);
}

function hasTextSelection() {
  return (window.getSelection()?.toString() ?? '') !== '';
}

function onListClick(event) {
  if (hasTextSelection()) return; // a drag-select to copy text must not toggle the row
  const revealButton = event.target.closest('.reveal-toggle');
  if (revealButton) { // reveals or hides this heading's devices without isolating it
    toggleRevealed(state, Number(revealButton.closest('[data-node-id]').dataset.nodeId));
    return refresh();
  }
  const headingRow = event.target.closest('.heading-row');
  if (headingRow) {
    const node = headingRow.closest('[data-node-id], [data-group]');
    if (node.dataset.group) { // a group heading in Everything opens that group's own view
      setSortOrder(state, node.dataset.group);
      return refresh();
    }
    setActiveView(state, subtreeView(node.dataset.hierarchy, node.dataset.nodeId));
    return refresh();
  }
  const row = event.target.closest('.device-row');
  if (!row) return;
  const item = row.closest('[data-device-id]');
  const expanded = toggleExpanded(state, Number(item.dataset.deviceId));
  item.classList.toggle('expanded', expanded);
  row.setAttribute('aria-expanded', String(expanded));
}

function onListDoubleClick(event) {
  const item = event.target.closest('[data-device-id]');
  if (!item) return;
  setActiveView(state, deviceView(item.dataset.deviceId));
  refresh();
}

// Enter opens like a click; Shift+Enter isolates like a double click, so the keyboard reaches both.
function onListKeydown(event) {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  if (!event.target.matches('.heading-row, .device-row')) return;
  event.preventDefault();
  if (event.shiftKey && event.target.matches('.device-row')) return onListDoubleClick(event);
  onListClick(event);
}

async function onCopy() {
  const ok = await copyCurrentView(state, navigator.clipboard);
  els.copyStatus.textContent = ok ? 'Copied' : 'Copy failed';
  setTimeout(() => { els.copyStatus.textContent = ''; }, COPY_STATUS_MS);
}

function bindControls() {
  els.list.addEventListener('click', onListClick);
  els.list.addEventListener('dblclick', onListDoubleClick);
  els.list.addEventListener('keydown', onListKeydown);
  els.sort.addEventListener('click', (event) => {
    const button = event.target.closest('[data-sort]');
    if (!button) return;
    // Pressing the selected group again clears it, which is the everything-search state.
    setSortOrder(state, button.dataset.sort === state.sortOrder ? EVERYTHING : button.dataset.sort);
    refresh();
  });
  els.showConfidence.addEventListener('change', () => { state.showConfidence = els.showConfidence.checked; applyToggles(); saveToggles(); });
  els.reveal.addEventListener('change', () => { state.reveal = els.reveal.checked; refresh(); saveToggles(); });
  els.defaultSort.addEventListener('change', () => saveDefaultSort(els.defaultSort.value));
  els.search.addEventListener('input', () => { state.query = els.search.value; refresh(); });
  els.fuzzy.addEventListener('change', () => { state.fuzzy = els.fuzzy.checked; refresh(); });
  els.showDefinitions.addEventListener('change', () => { state.showDefinitions = els.showDefinitions.checked; applyToggles(); saveToggles(); });
  els.showExamples.addEventListener('change', () => { state.showExamples = els.showExamples.checked; applyToggles(); saveToggles(); });
  els.home.addEventListener('click', () => { setActiveView(state, FULL_VIEW); refresh(); });
  els.print.addEventListener('click', () => printCurrentView(window));
  els.copy.addEventListener('click', onCopy);
}

async function start() {
  renderStatus(document, els.list, 'Loading…');
  try {
    state = createState(await fetchItems());
  } catch (error) {
    console.error('Could not load /api/items', error);
    renderStatus(document, els.list, 'The devices could not be loaded. Is the server running?');
    return;
  }
  Object.assign(state, loadToggles());
  els.showDefinitions.checked = state.showDefinitions;
  els.showExamples.checked = state.showExamples;
  els.showConfidence.checked = state.showConfidence;
  els.reveal.checked = state.reveal;
  const opening = savedDefaultSort();
  els.defaultSort.value = opening;
  if (opening !== NO_DEFAULT) setSortOrder(state, opening);
  bindControls();
  applyToggles();
  refresh();
}

start();
