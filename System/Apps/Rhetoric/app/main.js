/** Wires the page: loads data once, then re-renders on each state change (frontend.spec AD-1). */

import {
  addLabelPlacement, addPlacement, createLabel, createType, deleteLabel, deleteType, editLabel, fetchItems, moveLabel, moveType, removeLabelPlacement,
  removePlacement, renameType, saveLabelTables, saveTypeTables,
} from './api.js';
import { bindDragAndDrop } from './drag.js';
import { copyCurrentView, printCurrentView } from './actions.js';
import { INDEX_ORDERS } from './quoteindex.js';
import { renderCompareBar, renderCount, renderIndexOrders, renderList, renderSortButtons, renderStatus } from './render.js';
import { stripInline } from './markup.js';
import { bindDevicePicker } from './picker.js';
import { bindTableEditor } from './tableeditor.js';
import { MAX_TABLES, newTable } from './tablegrid.js';
import {
  COMPARE, EVERYTHING, FULL_VIEW, GRAMMAR, INDEX, MAX_LABEL_DEPTH, OPENING_CHOICES, SORTS, TOPICAL, UNSORTED_ID, createState, deviceView, openWithAncestors,
  setActiveView, setComparePair, setEditableTree, setIndexOrder, setSortOrder, subtreeView, toggleExpanded, toggleOpened, treeLabels,
} from './state.js';
import { NO_DEFAULT, loadDefaultSort, loadToggles, saveDefaultSort, saveToggles } from './settings.js';
import { insertionIndex } from './order.js';
import { currentView } from './view.js';

const $ = (id) => document.getElementById(id);
const els = {
  list: $('list'), sort: $('sort'), search: $('search'), fuzzy: $('fuzzy'),
  showDefinitions: $('show-definitions'), showExamples: $('show-examples'),
  showConfidence: $('show-confidence'), reveal: $('reveal'), editMode: $('edit-mode'), defaultSort: $('default-sort'),
  displayButton: $('display-button'), displayPanel: $('display-panel'),
  indexBar: $('index-bar'), indexOrders: $('index-orders'), indexFull: $('index-full'),
  compare: $('compare'), compareBar: $('compare-bar'), comparePick: $('compare-pick'), comparePrev: $('compare-prev'), compareNext: $('compare-next'), compareCount: $('compare-count'),
  tableNames: $('table-names'), tableDefinitions: $('table-definitions'), tableExamples: $('table-examples'),
  typeForm: $('type-form'), typeName: $('type-name'), typeParent: $('type-parent'), typeStatus: $('type-status'),
  grammarBar: $('grammar-bar'), labelForm: $('label-form'), labelName: $('label-name'), labelDefinition: $('label-definition'), labelParent: $('label-parent'),
  deviceForm: $('label-device-form'), devicePick: $('device-pick'), devicePickList: $('device-pick-list'), deviceLabel: $('device-label'), grammarStatus: $('grammar-status'),
  tableDialog: $('table-dialog'), tableForm: $('table-form'), tableTitle: $('table-dialog-title'), tableCaption: $('table-caption'), tableCols: $('table-cols'),
  tableRows: $('table-rows'), tableColHeads: $('table-col-heads'), tableRowHeads: $('table-row-heads'), tableGrid: $('table-grid'), tableStatus: $('table-status'),
  tableDelete: $('table-delete'), tableCancel: $('table-cancel'),
  deviceCount: $('device-count'), print: $('print'), copy: $('copy'), copyStatus: $('copy-status'), home: $('home'),
};

const STATUS_MS = 2000;
let state = null;
let devicePicker = null;
let tableEditor = null;

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
  els.grammarBar.hidden = state.sortOrder !== GRAMMAR;
  if (state.sortOrder === TOPICAL) fillParentPicker(els.typeParent, TOPICAL, 'Type');
  if (state.sortOrder === GRAMMAR) fillLabelPickers();
  els.compareBar.hidden = state.sortOrder !== COMPARE;
  els.indexBar.hidden = state.sortOrder !== INDEX;
  if (state.sortOrder === INDEX) renderIndexOrders(document, els.indexOrders, INDEX_ORDERS, state.indexOrder);
  els.compare.setAttribute('aria-pressed', String(state.sortOrder === COMPARE));
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

// What differs between the two editable groups: where a failure is reported and what a name clash means.
const EDITING = {
  [TOPICAL]: { status: () => els.typeStatus, clash: 'A Type with that name already exists' },
  [GRAMMAR]: { status: () => els.grammarStatus, clash: 'A label with that name already exists here' },
};

/**
 * Sends one change to an editable group (Topical or Grammar) and redraws from the tree the server answers
 * with, so the screen only ever shows what was saved. A failure leaves the screen as it was and says why.
 * @param {string} hierarchy TOPICAL or GRAMMAR
 * @param {string} [clash] what a 409 means for this change, when it is not a name clash
 * @param {string} [refused] what a 400 means for this change, when there is something to say about it
 * @returns {Promise<boolean>} whether the change was saved
 */
async function saveChange(hierarchy, change, clash, refused) {
  const editing = EDITING[hierarchy];
  try {
    setEditableTree(state, hierarchy, await change());
  } catch (error) {
    console.error(`Could not save the ${hierarchy} change`, error);
    flashStatus(editing.status(), error.status === 409 ? (clash ?? editing.clash) : error.status === 400 && refused ? refused : 'Could not save — is the server running?');
    return false;
  }
  refresh();
  return true;
}

/** The Type or label a button or row sits in: its group and its node in the saved tree. */
function nodeOf(element) {
  const heading = element.closest('[data-node-id]');
  return { hierarchy: heading.dataset.hierarchy, node: state.nodesById[heading.dataset.hierarchy].get(Number(heading.dataset.nodeId)) };
}

function renameFromRow(button) {
  const { hierarchy, node } = nodeOf(button);
  if (hierarchy === GRAMMAR) return editLabelFromRow(node);
  const name = window.prompt('Rename this Type', node.name)?.trim();
  if (name && name !== node.name) saveChange(TOPICAL, () => renameType(node.id, name));
}

/** Two prompts, name then explanation; cancelling either leaves the label as it was. */
function editLabelFromRow(label) {
  const name = window.prompt('Name of this label', label.name)?.trim();
  if (!name) return;
  const definition = window.prompt(`What "${stripInline(name)}" means`, label.definition)?.trim();
  if (definition && (name !== label.name || definition !== label.definition)) saveChange(GRAMMAR, () => editLabel(label.id, name, definition));
}

const SAVE_TABLES = { [TOPICAL]: saveTypeTables, [GRAMMAR]: saveLabelTables };

/** Opens the table dialog on a new table (`index` null) or on one of this Type's or label's saved tables; saving writes the whole list. */
function editTable(button, index) {
  const { hierarchy, node } = nodeOf(button);
  const tables = node.tables ?? [];
  if (index === null && tables.length >= MAX_TABLES) return flashStatus(EDITING[hierarchy].status(), `A ${hierarchy === GRAMMAR ? 'label' : 'Type'} holds up to ${MAX_TABLES} tables`);
  const saveList = (next) => saveChange(hierarchy, () => SAVE_TABLES[hierarchy](node.id, next));
  tableEditor.open(index === null ? newTable() : tables[index], {
    heading: `${index === null ? 'Add a table to' : `Edit table ${index + 1} of`} \u201c${stripInline(node.name)}\u201d`,
    canDelete: index !== null,
    save: (table) => {
      openWithAncestors(state, hierarchy, node.id); // so the table is seen
      return saveList(index === null ? [...tables, table] : tables.map((saved, at) => (at === index ? table : saved)));
    },
    remove: () => saveList(tables.filter((_, at) => at !== index)),
  });
}

function deleteFromRow(button) {
  const { hierarchy, node } = nodeOf(button);
  const withTables = (node.tables ?? []).length > 0 ? ' Its tables go with it.' : '';
  if (hierarchy === GRAMMAR) {
    if (window.confirm(`Delete the label "${stripInline(node.name)}"? Its devices stay in the library and under any other label.${withTables}`)) {
      saveChange(GRAMMAR, () => deleteLabel(node.id), 'Delete its sub-labels first');
    }
    return;
  }
  if (window.confirm(`Delete the Type "${stripInline(node.name)}"? Its devices stay in the library and in any other Type.${withTables}`)) {
    saveChange(TOPICAL, () => deleteType(node.id), 'Delete its sub-Types first');
  }
}

const idsOf = (nodes) => nodes.map((node) => node.id);

/** Ids of the Types or labels sharing `parentId` (null: the top level), from the saved tree, not the screen, so a search that hides rows cannot skew where a drop lands. Topical's derived Unsorted is not one. */
function savedSiblingIds(hierarchy, parentId) {
  const parent = parentId == null ? null : state.nodesById[hierarchy].get(parentId);
  return idsOf((parent ? parent.children : state.trees[hierarchy]).filter((child) => child.kind === 'node' && !(hierarchy === TOPICAL && child.id === UNSORTED_ID)));
}

const PLACING = {
  [TOPICAL]: { add: addPlacement, remove: removePlacement, move: moveType },
  [GRAMMAR]: { add: addLabelPlacement, remove: removeLabelPlacement, move: moveLabel },
};

/** What a Type or label dropped on `overType` becomes: under it (last) for 'inside', or beside it under its parent, before or after. */
function movedTo(hierarchy, id, overType, side) {
  const parentId = side === 'inside' ? overType : parentOf(hierarchy, overType);
  const index = side === 'inside' ? savedSiblingIds(hierarchy, parentId).length : insertionIndex(savedSiblingIds(hierarchy, parentId), id, overType, side);
  return { parentId, index };
}

function onEditableDrop({ kind, hierarchy, id, overType, overDevice, side }) {
  const placing = PLACING[hierarchy];
  if (kind === 'type') {
    const { parentId, index } = movedTo(hierarchy, id, overType, side);
    if (parentId !== null) openWithAncestors(state, hierarchy, parentId); // so the Type or label is seen landing
    return void saveChange(hierarchy, () => placing.move(id, index, parentId), undefined, `There is no room: Types and labels go ${MAX_LABEL_DEPTH} levels deep, counting what is beneath them`);
  }
  openWithAncestors(state, hierarchy, overType); // so the device is seen landing
  if (overDevice === null) return void saveChange(hierarchy, () => placing.add(overType, id));
  const placedIds = state.nodesById[hierarchy].get(overType).children.filter((child) => child.kind === 'device').map((child) => child.id);
  saveChange(hierarchy, () => placing.add(overType, id, insertionIndex(placedIds, id, overDevice, side)));
}

/** The Type or label above this one in the saved tree, or null at the top. */
function parentOf(hierarchy, labelId) {
  const find = (nodes, parentId) => {
    for (const node of nodes.filter((child) => child.kind === 'node')) {
      if (node.id === labelId) return { parentId };
      const found = find(node.children, node.id);
      if (found) return found;
    }
    return null;
  };
  return find(state.trees[hierarchy], null)?.parentId ?? null;
}

// ---- Grammar forms: add a label, add a device ----

function optionFor(value, text, selected) {
  const option = document.createElement('option');
  option.value = String(value);
  option.textContent = text;
  option.selected = selected;
  return option;
}

/** Refills an "Add under" menu from the saved tree of `hierarchy`: the top level, or any label or Type with room for another level; keeps what Luke had chosen. */
function fillParentPicker(select, hierarchy, noun) {
  const parentChoice = select.value;
  select.replaceChildren(
    optionFor('', 'At the top level', parentChoice === ''),
    ...treeLabels(state, hierarchy).filter((label) => label.depth < MAX_LABEL_DEPTH).map((label) => optionFor(label.id, `Under ${stripInline(label.path)}`, parentChoice === String(label.id))),
  );
  select.title = `Where the new ${noun} goes: at the top, or under one, up to ${MAX_LABEL_DEPTH} levels deep`;
}

/** Refills the two label pickers from the saved tree, keeping what Luke had chosen. */
function fillLabelPickers() {
  const labels = treeLabels(state, GRAMMAR);
  const indent = (label) => `${'\u2003'.repeat(label.depth - 1)}${stripInline(label.name)}`;
  fillParentPicker(els.labelParent, GRAMMAR, 'label');
  const labelChoice = els.deviceLabel.value;
  els.deviceLabel.replaceChildren(
    ...(labels.length === 0 ? [optionFor('', 'Add a label first', true)] : labels.map((label) => optionFor(label.id, indent(label), labelChoice === String(label.id)))),
  );
  els.deviceLabel.disabled = labels.length === 0;
}

async function onAddLabel(event) {
  event.preventDefault();
  const name = els.labelName.value.trim();
  const definition = els.labelDefinition.value.trim();
  if (!name || !definition) return;
  const parentId = els.labelParent.value === '' ? null : Number(els.labelParent.value);
  if (parentId !== null) openWithAncestors(state, GRAMMAR, parentId); // so the new sub-label is seen
  if (await saveChange(GRAMMAR, () => createLabel(name, definition, parentId))) {
    els.labelName.value = '';
    els.labelDefinition.value = '';
    els.labelName.focus();
  }
}

async function onAddDeviceToLabel(event) {
  event.preventDefault();
  const labelId = Number(els.deviceLabel.value);
  const deviceId = devicePicker.chosen();
  if (!labelId) return flashStatus(els.grammarStatus, 'Add a label first');
  if (deviceId === null) return flashStatus(els.grammarStatus, 'Choose a device from the list');
  const label = state.nodesById[GRAMMAR].get(labelId);
  if (label.children.some((child) => child.kind === 'device' && child.id === deviceId)) {
    return flashStatus(els.grammarStatus, `Already under "${stripInline(label.name)}"`);
  }
  openWithAncestors(state, GRAMMAR, labelId); // so the device is seen landing
  if (await saveChange(GRAMMAR, () => addLabelPlacement(labelId, deviceId))) {
    devicePicker.clear();
    els.devicePick.focus(); // the label stays chosen, so the next device goes to the same label, or pick another
  }
}

/** A label's Add device button: points the device form at that label and moves to the device box. */
function aimDeviceFormAt(button) {
  const { node } = nodeOf(button);
  els.deviceLabel.value = String(node.id);
  els.devicePick.focus();
}

function applyToggles() {
  document.body.classList.toggle('hide-definitions', !state.showDefinitions);
  document.body.classList.toggle('hide-examples', !state.showExamples);
  document.body.classList.toggle('hide-confidence', !state.showConfidence);
  document.body.classList.toggle('hide-table-names', !state.tableNames);
  document.body.classList.toggle('hide-table-definitions', !state.tableDefinitions);
  document.body.classList.toggle('hide-table-examples', !state.tableExamples);
  document.body.classList.toggle('read-only', !state.editMode);
  document.body.classList.toggle('index-full-on', state.indexFull);
  els.indexFull.setAttribute('aria-pressed', String(state.indexFull));
}

function hasTextSelection() {
  return (window.getSelection()?.toString() ?? '') !== '';
}

const DOUBLE_CLICK_MS = 250;
let openTimer = null;

function onListClick(event) {
  if (hasTextSelection()) return; // a drag-select to copy text must not toggle the row
  const deviceLink = event.target.closest('.index-device-link');
  if (deviceLink) { // a quote's device opens on its own, with the Home link to come back to the index
    setActiveView(state, deviceView(deviceLink.dataset.deviceId));
    return refresh();
  }
  const revealButton = event.target.closest('.reveal-toggle');
  if (revealButton) { // the same as a click on the heading, without the wait
    clearTimeout(openTimer);
    return toggleHeading(revealButton.closest('[data-node-id]'));
  }
  const removeButton = event.target.closest('.placement-remove');
  if (removeButton) {
    const deviceId = Number(removeButton.closest('[data-device-id]').dataset.deviceId);
    const { hierarchy, node } = nodeOf(removeButton);
    return void saveChange(hierarchy, () => PLACING[hierarchy].remove(node.id, deviceId));
  }
  if (event.target.closest('.label-add')) return aimDeviceFormAt(event.target);
  if (event.target.closest('.label-table-add')) return editTable(event.target, null);
  const tableEdit = event.target.closest('.label-table-edit');
  if (tableEdit) return editTable(tableEdit, Number(tableEdit.closest('.label-table-item').dataset.tableIndex));
  if (event.target.closest('.type-rename')) return renameFromRow(event.target);
  if (event.target.closest('.type-delete')) return deleteFromRow(event.target);
  const headingRow = event.target.closest('.heading-row');
  if (headingRow) {
    const node = headingRow.closest('[data-node-id], [data-group]');
    if (node.dataset.group) { // a group heading in Everything opens that group's own view
      setSortOrder(state, node.dataset.group);
      return refresh();
    }
    if (!headingRow.querySelector('.reveal-toggle')) return; // nothing beneath it to show, or Indent is off, or a search or an isolated view lists everything
    if (event.detail === 0) return toggleHeading(node); // the keyboard has no double click to wait for
    clearTimeout(openTimer); // a mouse click waits a moment, so the double click that isolates the heading does not first open or close it
    openTimer = setTimeout(() => toggleHeading(node), DOUBLE_CLICK_MS);
    return;
  }
  const row = event.target.closest('.device-row');
  if (!row) return;
  const item = row.closest('[data-device-id]');
  const expanded = toggleExpanded(state, Number(item.dataset.deviceId));
  item.classList.toggle('expanded', expanded);
  row.setAttribute('aria-expanded', String(expanded));
}

/** A click on a label or Type opens it (its sub-labels and devices show) or closes it (nothing beneath it shows). */
function toggleHeading(heading) {
  toggleOpened(state, heading.dataset.hierarchy, Number(heading.dataset.nodeId));
  refresh();
}

/** Shows `view` on its own; if it is already the whole screen, goes back to the full view. */
function isolateOrReturn(view) {
  setActiveView(state, state.activeView === view ? FULL_VIEW : view);
  refresh();
}

/** A double click on a label, Type or device shows just that one on screen; a double click on it again returns to the full view. */
function onListDoubleClick(event) {
  clearTimeout(openTimer); // the double click replaces the opening or closing its first click began
  if (event.target.closest('button')) return;
  const item = event.target.closest('[data-device-id]');
  if (item) return isolateOrReturn(deviceView(item.dataset.deviceId));
  const heading = event.target.closest('.heading-row')?.closest('[data-node-id]');
  if (heading) isolateOrReturn(subtreeView(heading.dataset.hierarchy, heading.dataset.nodeId));
}

// Enter acts like a click; Shift+Enter acts like a double click (a label or device shows alone, or goes back to the full view), so the keyboard reaches both.
function onListKeydown(event) {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  if (!event.target.matches('.heading-row, .device-row')) return;
  event.preventDefault();
  if (event.shiftKey) return onListDoubleClick(event);
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
  bindDragAndDrop(els.list, onEditableDrop);
  els.typeForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = els.typeName.value.trim();
    if (!name) return;
    const parentId = els.typeParent.value === '' ? null : Number(els.typeParent.value);
    if (parentId !== null) openWithAncestors(state, TOPICAL, parentId); // so the new sub-Type is seen
    if (await saveChange(TOPICAL, () => createType(name, parentId))) els.typeName.value = '';
  });
  els.labelForm.addEventListener('submit', onAddLabel);
  els.deviceForm.addEventListener('submit', onAddDeviceToLabel);
  tableEditor = bindTableEditor(document, {
    dialog: els.tableDialog, form: els.tableForm, title: els.tableTitle, caption: els.tableCaption, cols: els.tableCols, rows: els.tableRows,
    colHeads: els.tableColHeads, rowHeads: els.tableRowHeads, grid: els.tableGrid, status: els.tableStatus, remove: els.tableDelete, cancel: els.tableCancel,
  });
  devicePicker = bindDevicePicker({ input: els.devicePick, list: els.devicePickList, getDevices: () => state.devices.values(), isFuzzy: () => state.fuzzy });
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
  els.editMode.addEventListener('change', () => { state.editMode = els.editMode.checked; applyToggles(); saveToggles(storage, state); });
  els.showDefinitions.addEventListener('change', () => { state.showDefinitions = els.showDefinitions.checked; applyToggles(); saveToggles(storage, state); });
  els.showExamples.addEventListener('change', () => { state.showExamples = els.showExamples.checked; applyToggles(); saveToggles(storage, state); });
  // Like the group buttons, pressing Compare again leaves it for the everything-search state.
  els.compare.addEventListener('click', () => { setSortOrder(state, state.sortOrder === COMPARE ? EVERYTHING : COMPARE); refresh(); });
  els.indexOrders.addEventListener('click', (event) => {
    const button = event.target.closest('[data-index-order]');
    if (!button) return;
    setIndexOrder(state, button.dataset.indexOrder);
    refresh();
  });
  els.indexFull.addEventListener('click', () => { state.indexFull = !state.indexFull; applyToggles(); saveToggles(storage, state); });
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
  els.showConfidence.checked = state.showConfidence;
  els.tableNames.checked = state.tableNames;
  els.tableDefinitions.checked = state.tableDefinitions;
  els.tableExamples.checked = state.tableExamples;
  els.reveal.checked = state.reveal;
  els.editMode.checked = state.editMode;
  const opening = loadDefaultSort(storage, OPENING_CHOICES);
  els.defaultSort.value = opening;
  if (opening !== NO_DEFAULT) setSortOrder(state, opening);
  bindControls();
  applyToggles();
  refresh();
}

start();
