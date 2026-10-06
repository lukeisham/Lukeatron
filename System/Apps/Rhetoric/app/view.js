/**
 * Derives what is on screen from state — the one source that render.js draws and actions.js
 * copies, so Print/Copy can never disagree with the screen (frontend.spec AD-5).
 *
 * A view is `{ mode: 'tree' | 'flat' | 'device', items }`, where each item is
 * `{ kind: 'node', id, hierarchy, name, definition, children }` or `{ kind: 'device', device }`.
 */

import { matchesName } from './search.js';
import { stripInline } from './markup.js';
import { formatDate, groupEntries, indexEntry, yearNumber } from './quoteindex.js';
import { COMPARE, EDITABLE_TREES, EVERYTHING, GRAMMAR, INDEX, TOPICAL, TREE_SORTS, UNSORTED_ID, flipsidePairs, parseView, openKey, sortedDevices } from './state.js';

// Heading rows for the Everything view: one per group, in the order the trees are filed.
const GROUPS = [
  { hierarchy: 'category', name: 'Category', definition: 'what devices are' },
  { hierarchy: 'form', name: 'Form', definition: 'what devices look like' },
  { hierarchy: 'function', name: 'Function', definition: 'what devices do' },
];

// `draggable` and `removeFrom` (the `{ id, name }` of the Type or label the row can be taken out of) are set only in the editable trees.
const EMPTY_GROUP_HINT = 'Nothing is filed in this group yet.';
const EMPTY_GRAMMAR_HINT = 'No labels yet. Add one above, then add devices to it.';

const deviceItem = (device, { draggable = false, removeFrom = null } = {}) => ({ kind: 'device', device, draggable, removeFrom });

function countDevices(node) {
  return node.children.reduce((sum, child) => sum + (child.kind === 'device' ? 1 : countDevices(child)), 0);
}

/**
 * A copy of `node` keeping only devices that pass `keep`; with `pruneEmpty`, headings left empty are dropped.
 * `reveal.on` makes a heading show its sub-labels and its own devices only while it is in `reveal.opened`;
 * a closed heading shows nothing beneath it. A heading with anything beneath it carries `foldable` and `open` for its button and marker;
 * `leaf` is true when it has no sub-labels of its own (devices and tables do not count), which draws its marker as an empty box.
 * In Topical a real Type, and in Grammar every label, is `editable` (renamed or edited, deleted, dropped onto) and its devices can be removed from it;
 * `parentId` is the label above (null at the top), which lets a drag tell siblings from other labels.
 */
function filterNode(state, hierarchy, node, keep, pruneEmpty, reveal, parentId = null) {
  const open = !reveal.on || reveal.opened.has(openKey(hierarchy, node.id));
  const editable = EDITABLE_TREES.has(hierarchy) && !(hierarchy === TOPICAL && node.id === UNSORTED_ID);
  const placement = { draggable: EDITABLE_TREES.has(hierarchy), removeFrom: editable ? { id: node.id, name: node.name } : null };
  const children = [];
  for (const child of open ? node.children : []) {
    if (child.kind === 'device') {
      const device = state.devices.get(child.id);
      if (!device) console.warn(`view: tree ${hierarchy} references unknown device ${child.id}`);
      else if (keep(device)) children.push(deviceItem(device, placement));
    } else {
      const kept = filterNode(state, hierarchy, child, keep, pruneEmpty, reveal, node.id);
      if (kept) children.push(kept);
    }
  }
  if (pruneEmpty && children.length === 0) return null;
  const deviceCount = countDevices(node);
  const tables = node.tables ?? []; // a closed heading hides its tables with everything else beneath it
  return {
    kind: 'node', id: node.id, hierarchy, name: node.name, definition: node.definition, children,
    tables: open ? tables : [], deviceCount, leaf: !node.children.some((child) => child.kind !== 'device'), foldable: reveal.on && (node.children.length > 0 || tables.length > 0), open, editable, parentId,
  };
}

/** The pairs a search leaves, and the one shown: the chosen pair if it survives the search, else the first. A pair matches on either name (a Flipside's label carries both). */
function compareView(state, matches) {
  const pairs = flipsidePairs(state).filter(({ flipside }) => matches(flipside));
  const current = pairs.find(({ flipside }) => flipside.id === state.comparePairId) ?? pairs[0] ?? null;
  return { mode: 'compare', pairs, current, items: current ? [current] : [], hint: 'No fallacy matches.' };
}

/** Every real quote that matches the search (on its words, its source or its device's name), grouped in the chosen order. */
function indexView(state) {
  const entries = [];
  for (const quote of state.quotes) {
    const device = state.devices.get(quote.deviceId);
    if (!device) {
      console.warn(`view: quote ${quote.id} points at unknown device ${quote.deviceId}`);
      continue;
    }
    const searched = `${stripInline(quote.text)} ${stripInline(quote.source)} ${device.label}`;
    if (matchesName(searched, state.query, state.fuzzy)) entries.push(indexEntry(quote, device));
  }
  return { mode: 'index', items: groupEntries(entries, state.indexOrder), hint: 'No quotes match.' };
}

export function currentView(state) {
  const searching = state.query.trim() !== '';
  const matches = (device) => matchesName(device.label, state.query, state.fuzzy);
  const view = parseView(state.activeView);
  // Search lists its matches in full, so it ignores what is open and closed; an isolated heading shows everything beneath it.
  const reveal = { on: state.reveal && !searching, opened: state.opened };

  if (view.kind === 'device') {
    const device = state.devices.get(view.id);
    return { mode: 'device', items: device && matches(device) ? [deviceItem(device)] : [] };
  }

  if (state.sortOrder === COMPARE) return compareView(state, matches);
  if (state.sortOrder === INDEX) return indexView(state);

  if (state.sortOrder === EVERYTHING) {
    if (!searching) return { mode: 'tree', items: [], hint: 'Type to search every device, or choose a group above.' };
    // Each device is listed under every node it is filed in, across all three trees.
    const items = GROUPS.map(({ hierarchy, name, definition }) => ({
      kind: 'node', group: true, hierarchy, name, definition,
      children: state.trees[hierarchy]
        .map((root) => filterNode(state, hierarchy, root, matches, searching, reveal))
        .filter(Boolean),
    })).filter((group) => group.children.length > 0);
    return { mode: 'tree', items };
  }

  if (TREE_SORTS.has(state.sortOrder)) {
    const hierarchy = state.sortOrder;
    const isolated = view.kind === 'subtree';
    const roots = isolated
      ? [state.nodesById[hierarchy].get(view.id)].filter(Boolean)
      : state.trees[hierarchy];
    // The editable groups keep empty Types and labels while searching: they are where a found device gets dropped.
    const pruneEmpty = searching && !EDITABLE_TREES.has(hierarchy);
    const items = roots
      .map((root) => filterNode(state, hierarchy, root, matches, pruneEmpty, isolated ? { ...reveal, on: false } : reveal))
      .filter(Boolean);
    return { mode: 'tree', items, hint: roots.length === 0 ? (hierarchy === GRAMMAR ? EMPTY_GRAMMAR_HINT : EMPTY_GROUP_HINT) : undefined };
  }

  const items = sortedDevices(state, state.sortOrder).filter(matches).map(deviceItem);
  return { mode: 'flat', items };
}

/** Whether a device shows its definition and examples: the global toggle, or the row was clicked open. */
export function showsDetail(state, device, mode) {
  const opened = mode === 'device' || state.expanded.has(device.id);
  return {
    definition: opened || state.showDefinitions,
    examples: opened || state.showExamples,
  };
}

/** The Index as text: a line per group heading, then each quote's first line, source and year, or with Full display the whole quote, its source line and its device. */
function indexToText(state, groups) {
  const lines = [];
  for (const { heading, entries } of groups) {
    if (lines.length > 0) lines.push('');
    lines.push(heading);
    for (const { quote, device, firstLine, sourceShort, year } of entries) {
      if (!state.indexFull) {
        lines.push(`  ${firstLine} — ${[sourceShort, year].filter(Boolean).join(', ')}`);
        continue;
      }
      lines.push(`  ${stripInline(quote.text)}`, `  — ${stripInline(quote.source)}`);
      if (quote.date && !quote.source.includes(String(Math.abs(yearNumber(quote.date))))) lines.push(`  ${formatDate(quote.date)}`);
      lines.push(`  → ${device.label}`);
    }
  }
  return lines.join('\n');
}

/** The Compare pair as text, honouring the table's three switches: a heading per side, then its definition and examples. */
function compareToText(state, current) {
  if (!current) return '';
  const lines = [];
  for (const [role, device] of [['Fallacy', current.fallacy], ['Flipside', current.flipside]]) {
    if (lines.length > 0) lines.push('');
    lines.push(state.tableNames ? `• ${role}: ${device.name}` : `• ${role}`);
    if (state.tableDefinitions && device.definition) lines.push(`  ${device.definition}`);
    if (state.tableExamples) device.examples.forEach((example) => lines.push(`  □ ${stripInline(example)}`));
  }
  return lines.join('\n');
}

/** A label's table as text: its caption, then a line per row with cells separated by ` | `, and a rule under the column headings. */
function tableToText(table, pad) {
  const lines = table.caption ? [`${pad}${stripInline(table.caption)}`] : [];
  table.cells.forEach((row, index) => {
    lines.push(`${pad}${row.map(stripInline).join(' | ')}`);
    if (index === 0 && table.colHeads) lines.push(`${pad}${'-'.repeat(Math.max(3, lines.at(-1).length - pad.length))}`);
  });
  return lines;
}

/** Plain-text rendering of a view, honouring the same toggles the screen does. */
export function viewToText(state, view) {
  if (view.mode === 'compare') return compareToText(state, view.current);
  if (view.mode === 'index') return indexToText(state, view.items);
  const lines = [];
  const write = (item, depth) => {
    const pad = '  '.repeat(depth);
    if (item.kind === 'node') {
      lines.push(`${pad}• ${stripInline(item.name)} — ${stripInline(item.definition)}`);
      (item.tables ?? []).forEach((table) => lines.push(...tableToText(table, `${pad}  `)));
      item.children.forEach((child) => write(child, depth + 1));
      return;
    }
    const { device } = item;
    const shown = showsDetail(state, device, view.mode);
    lines.push(`${pad}• ${device.label}`);
    if (shown.definition && device.definition) lines.push(`${pad}  ${device.definition}`);
    if (shown.examples) device.examples.forEach((example) => lines.push(`${pad}  □ ${stripInline(example)}`));
  };
  view.items.forEach((item) => write(item, 0));
  return lines.join('\n');
}
