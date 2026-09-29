/** Wires the page: loads data once, then re-renders on each state change (frontend.spec AD-1). */

import { fetchItems } from './api.js';
import { copyCurrentView, printCurrentView } from './actions.js';
import { renderList, renderSortButtons, renderStatus } from './render.js';
import {
  FULL_VIEW, SORTS, createState, deviceView, setActiveView, setSortOrder, subtreeView, toggleExpanded,
} from './state.js';
import { currentView } from './view.js';

const $ = (id) => document.getElementById(id);
const els = {
  list: $('list'), sort: $('sort'), search: $('search'), fuzzy: $('fuzzy'),
  showDefinitions: $('show-definitions'), showExamples: $('show-examples'),
  print: $('print'), copy: $('copy'), copyStatus: $('copy-status'), home: $('home'),
};

const COPY_STATUS_MS = 2000;
let state = null;

function refresh() {
  renderSortButtons(document, els.sort, SORTS, state.sortOrder);
  renderList(document, els.list, state, currentView(state));
  els.home.hidden = state.activeView === FULL_VIEW;
}

function applyToggles() {
  document.body.classList.toggle('hide-definitions', !state.showDefinitions);
  document.body.classList.toggle('hide-examples', !state.showExamples);
}

function hasTextSelection() {
  return (window.getSelection()?.toString() ?? '') !== '';
}

function onListClick(event) {
  if (hasTextSelection()) return; // a drag-select to copy text must not toggle the row
  const headingRow = event.target.closest('.heading-row');
  if (headingRow) {
    const node = headingRow.closest('[data-node-id]');
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
    setSortOrder(state, button.dataset.sort);
    refresh();
  });
  els.search.addEventListener('input', () => { state.query = els.search.value; refresh(); });
  els.fuzzy.addEventListener('change', () => { state.fuzzy = els.fuzzy.checked; refresh(); });
  els.showDefinitions.addEventListener('change', () => { state.showDefinitions = els.showDefinitions.checked; applyToggles(); });
  els.showExamples.addEventListener('change', () => { state.showExamples = els.showExamples.checked; applyToggles(); });
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
  bindControls();
  applyToggles();
  refresh();
}

start();
