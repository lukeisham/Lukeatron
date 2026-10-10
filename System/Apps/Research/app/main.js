/** Wires the page: loads data once, then re-renders on each state change. */

import {
  addPlacement, createLabel, createLabelLink, deleteLabel, editLabel, fetchItems, moveLabel, removePlacement, saveLabelTables,
} from './api.js';
import { bindDragAndDrop } from './drag.js';
import { copyCurrentView, printCurrentView } from './actions.js';
import { INDEX_ORDERS } from './quoteindex.js';
import { renderCompareBar, renderCount, renderIndexOrders, renderList, renderSortButtons, renderStatus } from './render.js';
import { stripInline } from './markup.js';
import { PARENT_LIMIT, bindEntryPicker } from './picker.js';
import { bindTableEditor } from './tableeditor.js';
import { MAX_TABLES, newTable } from './tablegrid.js';
import {
  COMPARE, EVERYTHING, FULL_VIEW, INDEX, LABELS, MAX_LABEL_DEPTH, OPENING_CHOICES, SORTS, applyOpenChoices, createState, entryView, openWithAncestors,
  setActiveView, setComparePair, setEditableTree, setIndexOrder, setSortOrder, subtreeView, toggleExpanded, toggleOpened, treeLabels,
} from './state.js';
import { NO_DEFAULT, loadDefaultSort, loadOpenChoices, loadToggles, saveDefaultSort, saveOpenChoices, saveToggles } from './settings.js';
import { insertionIndex } from './order.js';
import { currentView } from './view.js';

const $ = (id) => document.getElementById(id);
const els = {
  list: $('list'), sort: $('sort'), search: $('search'), fuzzy: $('fuzzy'),
  showDefinitions: $('show-definitions'), showAiExamples: $('show-ai-examples'), showQuotes: $('show-quotes'), showGroups: $('show-groups'), showLabels: $('show-labels'),
  showConfidence: $('show-confidence'), reveal: $('reveal'), editMode: $('edit-mode'), defaultSort: $('default-sort'),
  displayButton: $('display-button'), displayPanel: $('display-panel'),
  indexBar: $('index-bar'), indexOrders: $('index-orders'), indexFull: $('index-full'),
  compare: $('compare'), compareBar: $('compare-bar'), comparePick: $('compare-pick'), comparePrev: $('compare-prev'), compareNext: $('compare-next'), compareCount: $('compare-count'),
  tableNames: $('table-names'), tableDefinitions: $('table-definitions'), tableExamples: $('table-examples'),
  labelsBar: $('labels-bar'), labelForm: $('label-form'), labelName: $('label-name'), labelDefinition: $('label-definition'), labelParent: $('label-parent'), labelParentList: $('label-parent-list'),
  entryForm: $('label-entry-form'), entryPick: $('entry-pick'), entryPickList: $('entry-pick-list'), entryLabel: $('entry-label'), labelsStatus: $('labels-status'),
  tableDialog: $('table-dialog'), tableForm: $('table-form'), tableTitle: $('table-dialog-title'), tableCaption: $('table-caption'), tableCols: $('table-cols'),
  tableRows: $('table-rows'), tableColHeads: $('table-col-heads'), tableRowHeads: $('table-row-heads'), tableGrid: $('table-grid'), tableStatus: $('table-status'),
  tableDelete: $('table-delete'), tableCancel: $('table-cancel'),
  entryCount: $('entry-count'), print: $('print'), copy: $('copy'), copyStatus: $('copy-status'), home: $('home'),
};

const STATUS_MS = 2000;
const LINK_ADDED = 'Link added: its empty section is at the end of the About page';
let state = null;
let labelParentPicker = null;
let entryPicker = null;
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

let savedOpenChoices = null; // the JSON last written for the open and closed headings, so refresh writes only when a choice changed

function refresh() {
  savedOpenChoices = saveOpenChoices(storage, state, savedOpenChoices);
  renderSortButtons(document, els.sort, SORTS, state.sortOrder);
  const view = currentView(state);
  renderList(document, els.list, state, view);
  els.home.hidden = state.activeView === FULL_VIEW;
  els.labelsBar.hidden = state.sortOrder !== LABELS;
  if (state.sortOrder === LABELS) fillEntryTargets();
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
  if (target) setComparePair(state, target.counterpart.id);
  refresh();
}

function flashStatus(element, text) {
  element.textContent = text;
  setTimeout(() => { element.textContent = ''; }, STATUS_MS);
}

/**
 * Sends one change to the Labels group and redraws from the tree the server answers with, so the screen only ever shows
 * what was saved. A failure leaves the screen as it was and says why.
 * @param {string} [clash] what a 409 (deleting a label that still has sub-labels) means for this change
 * @param {string} [refused] what a 400 means for this change, when there is something to say about it
 * @returns {Promise<boolean>} whether the change was saved
 */
async function saveChange(change, clash, refused) {
  try {
    setEditableTree(state, LABELS, await change());
  } catch (error) {
    console.error('Could not save the labels change', error);
    flashStatus(els.labelsStatus, error.status === 409 && clash ? clash : error.status === 400 && refused ? refused : 'Could not save — is the server running?');
    return false;
  }
  refresh();
  return true;
}

/** The label a button or row sits in, from the saved tree. */
function labelOf(element) {
  return state.nodesById[LABELS].get(Number(element.closest('[data-node-id]').dataset.nodeId));
}

function renameFromRow(button) {
  const label = labelOf(button);
  // Two prompts, name then explanation; cancelling either leaves it as it was. The explanation is optional: emptying
  // the second box and confirming clears it.
  const name = window.prompt('Name of this label', label.name)?.trim();
  if (!name) return;
  if (label.about) { // a link has no explanation to ask for; its About section keeps the heading it was made with
    if (name !== label.name) saveChange(() => editLabel(label.id, name, label.definition));
    return;
  }
  const definition = window.prompt(`What "${stripInline(name)}" means (optional)`, label.definition)?.trim();
  if (definition === undefined) return; // cancelled
  if (name !== label.name || definition !== label.definition) saveChange(() => editLabel(label.id, name, definition));
}

/** Opens the table dialog on a new table (`index` null) or on one of this label's saved tables; saving writes the whole list. */
function editTable(button, index) {
  const label = labelOf(button);
  const tables = label.tables ?? [];
  if (index === null && tables.length >= MAX_TABLES) return flashStatus(els.labelsStatus, `A label holds up to ${MAX_TABLES} tables`);
  const saveList = (next) => saveChange(() => saveLabelTables(label.id, next));
  tableEditor.open(index === null ? newTable() : tables[index], {
    heading: `${index === null ? 'Add a table to' : `Edit table ${index + 1} of`} “${stripInline(label.name)}”`,
    canDelete: index !== null,
    save: (table) => {
      openWithAncestors(state, LABELS, label.id); // so the table is seen
      return saveList(index === null ? [...tables, table] : tables.map((saved, at) => (at === index ? table : saved)));
    },
    remove: () => saveList(tables.filter((_, at) => at !== index)),
  });
}

function deleteFromRow(button) {
  const label = labelOf(button);
  if (label.about) { // a link: its section on the About page stays, since it may hold writing by now
    if (window.confirm(`Delete the link "${stripInline(label.name)}"? Its section stays on the About page.`)) saveChange(() => deleteLabel(label.id));
    return;
  }
  const withTables = (label.tables ?? []).length > 0 ? ' Its tables go with it.' : '';
  if (window.confirm(`Delete the label "${stripInline(label.name)}"? Its topics stay in the library and under any other label.${withTables}`)) {
    saveChange(() => deleteLabel(label.id), 'Delete its sub-labels first');
  }
}

const idsOf = (nodes) => nodes.map((node) => node.id);

/** Ids of the labels sharing `parentId` (null: the top level), from the saved tree, not the screen, so a search that hides rows cannot skew where a drop lands. */
function savedSiblingIds(parentId) {
  const parent = parentId == null ? null : state.nodesById[LABELS].get(parentId);
  return idsOf((parent ? parent.children : state.trees[LABELS]).filter((child) => child.kind === 'node'));
}

/** What a label dropped on `overLabel` becomes: under it (last) for 'inside', or beside it under its parent, before or after. */
function movedTo(id, overLabel, side) {
  const parentId = side === 'inside' ? overLabel : parentOf(overLabel);
  const index = side === 'inside' ? savedSiblingIds(parentId).length : insertionIndex(savedSiblingIds(parentId), id, overLabel, side);
  return { parentId, index };
}

function onEditableDrop({ kind, id, overLabel, overEntry, side }) {
  if (kind === 'label') {
    const { parentId, index } = movedTo(id, overLabel, side);
    if (parentId !== null) openWithAncestors(state, LABELS, parentId); // so the label is seen landing
    return void saveChange(() => moveLabel(id, index, parentId), undefined, `There is no room: labels go ${MAX_LABEL_DEPTH} levels deep, counting what is beneath them`);
  }
  openWithAncestors(state, LABELS, overLabel); // so the entry is seen landing
  if (overEntry === null) return void saveChange(() => addPlacement(overLabel, id));
  const placedIds = state.nodesById[LABELS].get(overLabel).children.filter((child) => child.kind === 'entry').map((child) => child.id);
  saveChange(() => addPlacement(overLabel, id, insertionIndex(placedIds, id, overEntry, side)));
}

/** The label above this one in the saved tree, or null at the top. */
function parentOf(labelId) {
  const find = (nodes, parentId) => {
    for (const node of nodes.filter((child) => child.kind === 'node')) {
      if (node.id === labelId) return { parentId };
      const found = find(node.children, node.id);
      if (found) return found;
    }
    return null;
  };
  return find(state.trees[LABELS], null)?.parentId ?? null;
}

// ---- Labels forms: add a label, add an entry ----

function optionFor(value, text, selected) {
  const option = document.createElement('option');
  option.value = String(value);
  option.textContent = text;
  option.selected = selected;
  return option;
}

/** Where a new label may go: any label with room for another level, named by its path. */
function parentChoices() {
  return treeLabels(state, LABELS).filter((label) => label.depth < MAX_LABEL_DEPTH).map((label) => ({ id: label.id, label: stripInline(label.path) }));
}

/** An "Under …" box: type-ahead over the saved tree (tree order, narrowing as Luke types); an empty box means the top level. */
function bindParentPicker(input, list) {
  input.title = `Where the new label goes: leave empty for the top, or type to find one to go under, up to ${MAX_LABEL_DEPTH} levels deep`;
  return bindEntryPicker({ input, list, getEntries: parentChoices, isFuzzy: () => state.fuzzy, limit: PARENT_LIMIT, sorted: false });
}

/** @returns {{parentId: number | null} | null} the chosen parent (null id = the top level), or null after reporting text that names no parent */
function readParent(picker) {
  if (picker.isEmpty()) return { parentId: null };
  const parentId = picker.chosen();
  if (parentId === null) {
    flashStatus(els.labelsStatus, 'Choose where the label goes from the list, or empty the box for the top level');
    return null;
  }
  return { parentId };
}

/** Refills the "add the topic to" menu from the saved tree, keeping what Luke had chosen. */
function fillEntryTargets() {
  const labels = treeLabels(state, LABELS);
  const indent = (label) => `${' '.repeat(label.depth - 1)}${stripInline(label.name)}`;
  const choice = els.entryLabel.value;
  els.entryLabel.replaceChildren(
    ...(labels.length === 0 ? [optionFor('', 'Add a label first', true)] : labels.map((label) => optionFor(label.id, indent(label), choice === String(label.id)))),
  );
  els.entryLabel.disabled = labels.length === 0;
}

/** Whether the form was sent by its Add link button (the name only, made a link to its own new About section) rather than Add label. */
const sentByLinkButton = (event) => event.submitter?.dataset.link === 'true';

async function onAddLabel(event) {
  event.preventDefault();
  const asLink = sentByLinkButton(event);
  const name = els.labelName.value.trim();
  const definition = els.labelDefinition.value.trim();
  if (!name) return;
  const parent = readParent(labelParentPicker);
  if (parent === null) return;
  const { parentId } = parent;
  if (parentId !== null) openWithAncestors(state, LABELS, parentId); // so the new sub-label is seen
  if (await saveChange(() => (asLink ? createLabelLink(name, parentId) : createLabel(name, definition, parentId)))) {
    els.labelName.value = '';
    els.labelDefinition.value = '';
    els.labelName.focus();
    if (asLink) flashStatus(els.labelsStatus, LINK_ADDED);
  }
}

async function onAddEntry(event) {
  event.preventDefault();
  const labelId = Number(els.entryLabel.value);
  const entryId = entryPicker.chosen();
  if (!labelId) return flashStatus(els.labelsStatus, 'Add a label first');
  if (entryId === null) return flashStatus(els.labelsStatus, 'Choose a topic from the list');
  const label = state.nodesById[LABELS].get(labelId);
  if (label.children.some((child) => child.kind === 'entry' && child.id === entryId)) {
    return flashStatus(els.labelsStatus, `Already under "${stripInline(label.name)}"`);
  }
  openWithAncestors(state, LABELS, labelId); // so the entry is seen landing
  if (await saveChange(() => addPlacement(labelId, entryId))) {
    entryPicker.clear();
    els.entryPick.focus(); // the label stays chosen, so the next topic goes to the same one, or pick another
  }
}

/** A label's Add topic button: points the entry form at it and moves to the entry box. */
function aimEntryFormAt(button) {
  els.entryLabel.value = String(labelOf(button).id);
  els.entryPick.focus();
}

function applyToggles() {
  document.body.classList.toggle('hide-definitions', !state.showDefinitions);
  document.body.classList.toggle('hide-ai-examples', !state.showAiExamples);
  document.body.classList.toggle('hide-quotes', !state.showQuotes);
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
  const entryLink = event.target.closest('.index-entry-link');
  if (entryLink) { // a quote's entry opens on its own, with the Home link to come back to the index
    setActiveView(state, entryView(entryLink.dataset.entryId));
    return refresh();
  }
  const revealButton = event.target.closest('.reveal-toggle');
  if (revealButton) { // the same as a click on the heading, without the wait
    clearTimeout(openTimer);
    return toggleHeading(revealButton.closest('[data-node-id]'));
  }
  const removeButton = event.target.closest('.placement-remove');
  if (removeButton) {
    const entryId = Number(removeButton.closest('[data-entry-id]').dataset.entryId);
    return void saveChange(() => removePlacement(labelOf(removeButton).id, entryId));
  }
  if (event.target.closest('.label-add')) return aimEntryFormAt(event.target);
  if (event.target.closest('.label-table-add')) return editTable(event.target, null);
  const tableEdit = event.target.closest('.label-table-edit');
  if (tableEdit) return editTable(tableEdit, Number(tableEdit.closest('.label-table-item').dataset.tableIndex));
  if (event.target.closest('.label-rename')) return renameFromRow(event.target);
  if (event.target.closest('.label-delete')) return deleteFromRow(event.target);
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
  const row = event.target.closest('.entry-row');
  if (!row) return;
  const item = row.closest('[data-entry-id]');
  const expanded = toggleExpanded(state, Number(item.dataset.entryId));
  item.classList.toggle('expanded', expanded);
  row.setAttribute('aria-expanded', String(expanded));
}

/** A click on a label opens it (its sub-labels and entries show) or closes it (nothing beneath it shows). */
function toggleHeading(heading) {
  toggleOpened(state, heading.dataset.hierarchy, Number(heading.dataset.nodeId));
  refresh();
}

/** Shows `view` on its own; if it is already the whole screen, goes back to the full view. */
function isolateOrReturn(view) {
  setActiveView(state, state.activeView === view ? FULL_VIEW : view);
  refresh();
}

/** A double click on a label or entry shows just that one on screen; a double click on it again returns to the full view. */
function onListDoubleClick(event) {
  clearTimeout(openTimer); // the double click replaces the opening or closing its first click began
  if (event.target.closest('button')) return;
  const item = event.target.closest('[data-entry-id]');
  if (item) return isolateOrReturn(entryView(item.dataset.entryId));
  const heading = event.target.closest('.heading-row')?.closest('[data-node-id]');
  if (heading && heading.dataset.link !== 'true') isolateOrReturn(subtreeView(heading.dataset.hierarchy, heading.dataset.nodeId));
}

// Enter acts like a click; Shift+Enter acts like a double click (a label or entry shows alone, or goes back to the full view), so the keyboard reaches both.
function onListKeydown(event) {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  if (!event.target.matches('.heading-row, .entry-row')) return;
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
  els.labelForm.addEventListener('submit', onAddLabel);
  els.entryForm.addEventListener('submit', onAddEntry);
  tableEditor = bindTableEditor(document, {
    dialog: els.tableDialog, form: els.tableForm, title: els.tableTitle, caption: els.tableCaption, cols: els.tableCols, rows: els.tableRows,
    colHeads: els.tableColHeads, rowHeads: els.tableRowHeads, grid: els.tableGrid, status: els.tableStatus, remove: els.tableDelete, cancel: els.tableCancel,
  });
  labelParentPicker = bindParentPicker(els.labelParent, els.labelParentList);
  entryPicker = bindEntryPicker({ input: els.entryPick, list: els.entryPickList, getEntries: () => state.entries.values(), isFuzzy: () => state.fuzzy });
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
  els.showAiExamples.addEventListener('change', () => { state.showAiExamples = els.showAiExamples.checked; applyToggles(); saveToggles(storage, state); });
  els.showQuotes.addEventListener('change', () => { state.showQuotes = els.showQuotes.checked; applyToggles(); saveToggles(storage, state); });
  els.showGroups.addEventListener('change', () => { state.showGroups = els.showGroups.checked; refresh(); saveToggles(storage, state); });
  els.showLabels.addEventListener('change', () => { state.showLabels = els.showLabels.checked; refresh(); saveToggles(storage, state); });
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
    renderStatus(document, els.list, 'The topics could not be loaded. Is the server running?');
    return;
  }
  const typeCount = [...state.entries.values()].filter((entry) => entry.kind === 'type').length;
  renderCount(els.entryCount, state.entries.size - typeCount, typeCount);
  Object.assign(state, loadToggles(storage));
  applyOpenChoices(state, loadOpenChoices(storage));
  els.showDefinitions.checked = state.showDefinitions;
  els.showAiExamples.checked = state.showAiExamples;
  els.showQuotes.checked = state.showQuotes;
  els.showGroups.checked = state.showGroups;
  els.showConfidence.checked = state.showConfidence;
  els.showLabels.checked = state.showLabels;
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
