/** Wires the page: loads data once, then re-renders on each state change (frontend.spec AD-1). */

import { addPlacement, createType, deleteType, fetchItems, moveType, removePlacement, renameType } from './api.js';
import { bindDragAndDrop } from './drag.js';
import { copyCurrentView, printCurrentView } from './actions.js';
import { renderCompareBar, renderCount, renderList, renderSortButtons, renderStatus } from './render.js';
import {
  COMPARE, EVERYTHING, FULL_VIEW, SORTS, TOPICAL, UNSORTED_ID, createState, deviceView, revealKey, setActiveView, setComparePair, setSortOrder,
  setTopicalTree, subtreeView, toggleExpanded, toggleRevealed,
} from './state.js';
import { NO_DEFAULT, loadDefaultSort, loadToggles, saveDefaultSort, saveToggles } from './settings.js';
import { insertionIndex } from './order.js';
import { currentView } from './view.js';

const $ = (id) => document.getElementById(id);
const els = {
  list: $('list'), sort: $('sort'), search: $('search'), fuzzy: $('fuzzy'),
  showDefinitions: $('show-definitions'), showExamples: $('show-examples'), showExplanations: $('show-explanations'),
  showConfidence: $('show-confidence'), reveal: $('reveal'), defaultSort: $('default-sort'),
  displayButton: $('display-button'), displayPanel: $('display-panel'),
  compareBar: $('compare-bar'), comparePick: $('compare-pick'), comparePrev: $('compare-prev'), compareNext: $('compare-next'), compareCount: $('compare-count'),
  tableNames: $('table-names'), tableDefinitions: $('table-definitions'), tableExamples: $('table-examples'),
  typeForm: $('type-form'), typeName: $('type-name'), typeStatus: $('type-status'),
  deviceCount: $('device-count'), print: $('print'), copy: $('copy'), copyStatus: $('copy-status'), home: $('home'),
};

const STATUS_MS = 2000;
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
  const view = currentView(state);
  renderList(document, els.list, state, view);
  els.home.hidden = state.activeView === FULL_VIEW;
  els.typeForm.hidden = state.sortOrder !== TOPICAL;
  els.compareBar.hidden = state.sortOrder !== COMPARE;
  if (view.mode === 'compare') renderCompareBar(document, { pick: els.comparePick, prev: els.comparePrev, next: els.compareNext, count: els.compareCount }, view);
}

/** Moves the Compare pair by `step` places through the pairs the search leaves. */
function stepCompare(step) {
  const view = currentView(state);
  const target = view.pairs[view.pairs.indexOf(view.current) + step];
  if (target) setComparePair(state, target.flipside.id);
  refresh();
}

function flashStatus(element, text) {
  element.textContent = text;
  setTimeout(() => { element.textContent = ''; }, STATUS_MS);
}

/**
 * Sends one Topical change and redraws from the tree the server answers with, so the screen
 * only ever shows what was saved. A failure leaves the screen as it was and says why.
 * @returns {Promise<boolean>} whether the change was saved
 */
async function saveTopical(change) {
  try {
    setTopicalTree(state, await change());
  } catch (error) {
    console.error('Could not save the Topical change', error);
    flashStatus(els.typeStatus, error.status === 409 ? 'A Type with that name already exists' : 'Could not save — is the server running?');
    return false;
  }
  refresh();
  return true;
}

function topicalNode(element) {
  const typeElement = element.closest('[data-node-id]');
  return state.nodesById[TOPICAL].get(Number(typeElement.dataset.nodeId));
}

function renameFromRow(button) {
  const type = topicalNode(button);
  const name = window.prompt('Rename this Type', type.name)?.trim();
  if (name && name !== type.name) saveTopical(() => renameType(type.id, name));
}

function deleteFromRow(button) {
  const type = topicalNode(button);
  if (window.confirm(`Delete the Type "${type.name}"? Its devices stay in the library and in any other Type.`)) {
    saveTopical(() => deleteType(type.id));
  }
}

const idsOf = (nodes) => nodes.map((node) => node.id);

/** Ids from the saved tree, not the screen, so a search that hides rows cannot skew where a drop lands. */
function savedTypeIds() {
  return idsOf(state.trees[TOPICAL].filter((node) => node.id !== UNSORTED_ID));
}

function onTopicalDrop({ kind, id, overType, overDevice, side }) {
  if (kind === 'type') {
    return void saveTopical(() => moveType(id, insertionIndex(savedTypeIds(), id, overType, side)));
  }
  state.revealed.add(revealKey(TOPICAL, overType)); // so the device is seen landing
  if (overDevice === null) return void saveTopical(() => addPlacement(overType, id));
  const placedIds = idsOf(state.nodesById[TOPICAL].get(overType).children);
  saveTopical(() => addPlacement(overType, id, insertionIndex(placedIds, id, overDevice, side)));
}

function applyToggles() {
  document.body.classList.toggle('hide-definitions', !state.showDefinitions);
  document.body.classList.toggle('hide-examples', !state.showExamples);
  document.body.classList.toggle('hide-explanations', !state.showExplanations);
  document.body.classList.toggle('hide-confidence', !state.showConfidence);
  document.body.classList.toggle('hide-table-names', !state.tableNames);
  document.body.classList.toggle('hide-table-definitions', !state.tableDefinitions);
  document.body.classList.toggle('hide-table-examples', !state.tableExamples);
}

function hasTextSelection() {
  return (window.getSelection()?.toString() ?? '') !== '';
}

function onListClick(event) {
  if (hasTextSelection()) return; // a drag-select to copy text must not toggle the row
  const revealButton = event.target.closest('.reveal-toggle');
  if (revealButton) { // reveals or hides this heading's devices without isolating it
    const heading = revealButton.closest('[data-node-id]');
    toggleRevealed(state, heading.dataset.hierarchy, Number(heading.dataset.nodeId));
    return refresh();
  }
  const removeButton = event.target.closest('.placement-remove');
  if (removeButton) {
    const deviceId = Number(removeButton.closest('[data-device-id]').dataset.deviceId);
    return void saveTopical(() => removePlacement(topicalNode(removeButton).id, deviceId));
  }
  if (event.target.closest('.type-rename')) return renameFromRow(event.target);
  if (event.target.closest('.type-delete')) return deleteFromRow(event.target);
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
  flashStatus(els.copyStatus, ok ? 'Copied' : 'Copy failed');
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
  bindDragAndDrop(els.list, onTopicalDrop);
  els.typeForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = els.typeName.value.trim();
    if (name && await saveTopical(() => createType(name))) els.typeName.value = '';
  });
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
  els.showExplanations.addEventListener('change', () => { state.showExplanations = els.showExplanations.checked; applyToggles(); saveToggles(storage, state); });
  els.comparePick.addEventListener('change', () => { setComparePair(state, Number(els.comparePick.value)); refresh(); });
  els.comparePrev.addEventListener('click', () => stepCompare(-1));
  els.compareNext.addEventListener('click', () => stepCompare(1));
  for (const field of ['tableNames', 'tableDefinitions', 'tableExamples']) {
    els[field].addEventListener('change', () => { state[field] = els[field].checked; applyToggles(); saveToggles(storage, state); });
  }
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
  renderCount(els.deviceCount, state.devices.size);
  Object.assign(state, loadToggles(storage));
  els.showDefinitions.checked = state.showDefinitions;
  els.showExamples.checked = state.showExamples;
  els.showExplanations.checked = state.showExplanations;
  els.showConfidence.checked = state.showConfidence;
  els.tableNames.checked = state.tableNames;
  els.tableDefinitions.checked = state.tableDefinitions;
  els.tableExamples.checked = state.tableExamples;
  els.reveal.checked = state.reveal;
  const opening = loadDefaultSort(storage, SORTS);
  els.defaultSort.value = opening;
  if (opening !== NO_DEFAULT) setSortOrder(state, opening);
  bindControls();
  applyToggles();
  refresh();
}

start();
