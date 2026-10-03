/** Wires the page: loads data once, then re-renders on each state change (frontend.spec AD-1). */

import { fetchItems } from './api.js';
import { copyCurrentView, printCurrentView } from './actions.js';
import { renderList, renderSortButtons, renderStatus } from './render.js';
import {
  EVERYTHING, FULL_VIEW, SORTS, createState, deviceView, setActiveView, setSortOrder, subtreeView, toggleExpanded,
  toggleRevealed,
} from './state.js';
import { NO_DEFAULT, loadDefaultSort, loadToggles, saveDefaultSort, saveToggles } from './settings.js';
import { currentView } from './view.js';

const $ = (id) => document.getElementById(id);
const els = {
  list: $('list'), sort: $('sort'), search: $('search'), fuzzy: $('fuzzy'),
  showDefinitions: $('show-definitions'), showExamples: $('show-examples'),
  showConfidence: $('show-confidence'), reveal: $('reveal'), defaultSort: $('default-sort'),
  displayButton: $('display-button'), displayPanel: $('display-panel'),
  print: $('print'), copy: $('copy'), copyStatus: $('copy-status'), home: $('home'),
};

const COPY_STATUS_MS = 2000;
let state = null;

// Even reading `window.localStorage` can throw when site data is blocked; null makes every settings call fall back to defaults.
const storage = (() => {
  try {
    return window.localStorage;
  } catch (error) {
    console.warn('settings: storage unavailable', error);
    return null;
  }
})();

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

function setMenuOpen(open) {
  els.displayPanel.hidden = !open;
  els.displayButton.setAttribute('aria-expanded', String(open));
}

// The Display menu closes on a click elsewhere or Escape (focus returns to its button).
function bindMenu() {
  els.displayButton.addEventListener('click', () => setMenuOpen(els.displayPanel.hidden));
  document.addEventListener('click', (event) => {
    if (!els.displayPanel.hidden && !event.target.closest('.menu')) setMenuOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || els.displayPanel.hidden) return;
    setMenuOpen(false);
    els.displayButton.focus();
  });
}

function bindControls() {
  bindMenu();
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
  els.showConfidence.addEventListener('change', () => { state.showConfidence = els.showConfidence.checked; applyToggles(); saveToggles(storage, state); });
  els.reveal.addEventListener('change', () => { state.reveal = els.reveal.checked; refresh(); saveToggles(storage, state); });
  els.defaultSort.addEventListener('change', () => saveDefaultSort(storage, els.defaultSort.value));
  els.search.addEventListener('input', () => { state.query = els.search.value; refresh(); });
  els.fuzzy.addEventListener('change', () => { state.fuzzy = els.fuzzy.checked; refresh(); });
  els.showDefinitions.addEventListener('change', () => { state.showDefinitions = els.showDefinitions.checked; applyToggles(); saveToggles(storage, state); });
  els.showExamples.addEventListener('change', () => { state.showExamples = els.showExamples.checked; applyToggles(); saveToggles(storage, state); });
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
  Object.assign(state, loadToggles(storage));
  els.showDefinitions.checked = state.showDefinitions;
  els.showExamples.checked = state.showExamples;
  els.showConfidence.checked = state.showConfidence;
  els.reveal.checked = state.reveal;
  const opening = loadDefaultSort(storage, SORTS);
  els.defaultSort.value = opening;
  if (opening !== NO_DEFAULT) setSortOrder(state, opening);
  bindControls();
  applyToggles();
  refresh();
}

start();
