/**
 * Derives what is on screen from state — the one source that render.js draws and actions.js
 * copies, so Print/Copy can never disagree with the screen (frontend.spec AD-5).
 *
 * A view is `{ mode: 'tree' | 'flat' | 'entry', items }`, where each item is
 * `{ kind: 'node', id, hierarchy, name, definition, children }` or `{ kind: 'entry', entry }`.
 */

import { matchesName } from './search.js';
import { stripInline } from './markup.js';
import { formatDate, groupRows, indexRow, yearNumber } from './quoteindex.js';
import { COMPARE, EDITABLE_TREES, EVERYTHING, LABELS, INDEX, TREE_SORTS, counterpartPairs, parseView, openKey, sortedEntries } from './state.js';

// Heading rows for the Everything view: one per group, in the order the trees are filed.
const GROUPS = [
  { hierarchy: 'templates', name: 'Templates', definition: 'forms that give a piece its shape' },
  { hierarchy: 'brainstorming', name: 'Brainstorming', definition: 'forms for finding something to say' },
  { hierarchy: 'research', name: 'Research', definition: 'forms for gathering and weighing sources' },
  { hierarchy: 'topical', name: 'Topical', definition: 'forms by subject' },
];

// `draggable` and `removeFrom` (the `{ id, name }` of the label the row can be taken out of) are set only in the editable tree.
const EMPTY_GROUP_HINT = 'Nothing is filed in this group yet.';
const EMPTY_LABELS_HINT = 'No labels yet. Add one above, then add forms to it.';

const entryItem = (entry, { draggable = false, removeFrom = null } = {}) => ({ kind: 'entry', entry, draggable, removeFrom });

/** Every path (`Parent > Child`) of a group's tree that holds the entry directly, or, for a type heading, the path to the heading itself. */
function pathsHolding(state, hierarchy, entryId) {
  const out = [];
  const walk = (nodes, path) => {
    for (const node of nodes.filter((child) => child.kind === 'node')) {
      const here = [...path, stripInline(node.name)];
      if (node.type && node.id === entryId) out.push(here.join(' > '));
      if (node.children.some((child) => child.kind === 'entry' && child.id === entryId)) out.push(here.join(' > '));
      walk(node.children, here);
    }
  };
  walk(state.trees[hierarchy] ?? [], []);
  return out;
}

/** How a single entry is filed, for the Display options: `groups` (the fixed groups, as `[title, paths]` pairs) and `labels` are lists of paths, or null while that option is off. */
export function filingsOf(state, entryId) {
  return {
    groups: state.showGroups ? GROUPS.map(({ hierarchy, name }) => [name, pathsHolding(state, hierarchy, entryId)]) : null,
    labels: state.showLabels ? pathsHolding(state, LABELS, entryId) : null,
  };
}

function countEntries(node) {
  return node.children.reduce((sum, child) => sum + (child.kind === 'entry' ? 1 : countEntries(child)), 0);
}

/**
 * A copy of `node` keeping only entries that pass `keep`; with `pruneEmpty`, headings left empty are dropped.
 * `reveal.on` makes a heading show its sub-labels and its own entries only while it is in `reveal.opened`;
 * a closed heading shows nothing beneath it. A heading with anything beneath it carries `foldable` and `open` for its button and marker;
 * `empty` is true when it holds no sub-labels, entries or tables, which draws its marker as an outlined circle.
 * In Labels every label is `editable` (renamed or edited, deleted, dropped onto) and its entries can be removed from it;
 * `parentId` is the label above (null at the top), which lets a drag tell siblings from other labels.
 * A link label carries `about`, the id of its own section on the About page (null on every other row); it holds nothing, so it is never `foldable`.
 */
function filterNode(state, hierarchy, node, keep, pruneEmpty, reveal, parentId = null) {
  const open = !reveal.on || reveal.opened.has(openKey(hierarchy, node.id));
  const editable = EDITABLE_TREES.has(hierarchy);
  const placement = { draggable: EDITABLE_TREES.has(hierarchy), removeFrom: editable ? { id: node.id, name: node.name } : null };
  const self = node.type ? state.entries.get(node.id) : null; // a type heading is also an entry, with its own example and rating
  const children = [];
  for (const child of open ? node.children : []) {
    if (child.kind === 'entry') {
      const entry = state.entries.get(child.id);
      if (!entry) console.warn(`view: tree ${hierarchy} references unknown entry ${child.id}`);
      else if (keep(entry)) children.push(entryItem(entry, placement));
    } else {
      const kept = filterNode(state, hierarchy, child, keep, pruneEmpty, reveal, node.id);
      if (kept) children.push(kept);
    }
  }
  if (pruneEmpty && children.length === 0 && !(self && keep(self))) return null;
  const entryCount = countEntries(node);
  const tables = node.tables ?? []; // a closed heading hides its tables with everything else beneath it
  return {
    kind: 'node', id: node.id, hierarchy, entry: self, name: node.name, definition: node.definition, about: node.about ?? null, children,
    tables: open ? tables : [], entryCount, empty: node.children.length === 0 && tables.length === 0, foldable: reveal.on && (node.children.length > 0 || tables.length > 0), open, editable, parentId,
  };
}

/** The pairs a search leaves, and the one shown: the chosen pair if it survives the search, else the first. A pair matches on either name (a Counterpart's label carries both). */
function compareView(state, matches) {
  const pairs = counterpartPairs(state).filter(({ counterpart }) => matches(counterpart));
  const current = pairs.find(({ counterpart }) => counterpart.id === state.comparePairId) ?? pairs[0] ?? null;
  return { mode: 'compare', pairs, current, items: current ? [current] : [], hint: 'No form matches.' };
}

/** Every real quote that matches the search (on its words, its source or its entry's name), grouped in the chosen order. */
function indexView(state) {
  const rows = [];
  for (const quote of state.quotes) {
    const entry = state.entries.get(quote.entryId);
    if (!entry) {
      console.warn(`view: quote ${quote.id} points at unknown entry ${quote.entryId}`);
      continue;
    }
    const searched = `${stripInline(quote.text)} ${stripInline(quote.source)} ${entry.label}`;
    if (matchesName(searched, state.query, state.fuzzy)) rows.push(indexRow(quote, entry));
  }
  return { mode: 'index', items: groupRows(rows, state.indexOrder), hint: 'No quotes match.' };
}

export function currentView(state) {
  const searching = state.query.trim() !== '';
  const matches = (entry) => matchesName(entry.label, state.query, state.fuzzy);
  const view = parseView(state.activeView);
  // Search lists its matches in full, so it ignores what is open and closed; an isolated heading shows everything beneath it.
  const reveal = { on: state.reveal && !searching, opened: state.opened };

  if (view.kind === 'entry') {
    const entry = state.entries.get(view.id);
    return { mode: 'entry', items: entry && matches(entry) ? [{ ...entryItem(entry), filings: filingsOf(state, entry.id) }] : [] };
  }

  if (state.sortOrder === COMPARE) return compareView(state, matches);
  if (state.sortOrder === INDEX) return indexView(state);

  if (state.sortOrder === EVERYTHING) {
    if (!searching) return { mode: 'tree', items: [], hint: 'Type to search every form, or choose a group above.' };
    // Each entry is listed under every node it is filed in, across all four trees.
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
    // The editable group keeps empty labels while searching: they are where a found entry gets dropped.
    const pruneEmpty = searching && !EDITABLE_TREES.has(hierarchy);
    const items = roots
      .map((root) => filterNode(state, hierarchy, root, matches, pruneEmpty, isolated ? { ...reveal, on: false } : reveal))
      .filter(Boolean);
    return { mode: 'tree', items, hint: roots.length === 0 ? (hierarchy === LABELS ? EMPTY_LABELS_HINT : EMPTY_GROUP_HINT) : undefined };
  }

  const items = sortedEntries(state, state.sortOrder).filter(matches).map(entryItem);
  return { mode: 'flat', items };
}

/** Whether an entry shows its definition, AI examples and quotes: each global toggle, or the row was clicked open. */
export function showsDetail(state, entry, mode) {
  const opened = mode === 'entry' || state.expanded.has(entry.id);
  return {
    definition: opened || state.showDefinitions,
    aiExamples: opened || state.showAiExamples,
    quotes: opened || state.showQuotes,
  };
}

/** The entry's examples that `shown` (from `showsDetail`) lets through, each with its kind. */
export function shownExamples(entry, shown) {
  return entry.examples
    .map((text, index) => ({ text, kind: entry.exampleKinds[index] }))
    .filter(({ kind }) => (kind === 'quote' ? shown.quotes : shown.aiExamples));
}

/** The Index as text: a line per group heading, then each quote's first line, source and year, or with Full display the whole quote, its source line and its entry. */
function indexToText(state, groups) {
  const lines = [];
  for (const { heading, rows } of groups) {
    if (lines.length > 0) lines.push('');
    lines.push(heading);
    for (const { quote, entry, firstLine, sourceShort, year } of rows) {
      if (!state.indexFull) {
        lines.push(`  ${firstLine} — ${[sourceShort, year].filter(Boolean).join(', ')}`);
        continue;
      }
      lines.push(`  ${stripInline(quote.text)}`, `  — ${stripInline(quote.source)}`);
      if (quote.date && !quote.source.includes(String(Math.abs(yearNumber(quote.date))))) lines.push(`  ${formatDate(quote.date)}`);
      lines.push(`  → ${entry.label}`);
    }
  }
  return lines.join('\n');
}

/** The Compare pair as text, honouring the table's three switches: a heading per side, then its definition and examples. */
function compareToText(state, current) {
  if (!current) return '';
  const lines = [];
  for (const [role, entry] of [['Form', current.base], ['Counterpart', current.counterpart]]) {
    if (lines.length > 0) lines.push('');
    lines.push(state.tableNames ? `• ${role}: ${entry.name}` : `• ${role}`);
    if (state.tableDefinitions && entry.definition) lines.push(`  ${entry.definition}`);
    if (state.tableExamples) entry.examples.forEach((example) => lines.push(`  · ${stripInline(example)}`));
  }
  return lines.join('\n');
}

/** One cell as a comma-separated value: a cell holding a comma, a quote or a line break is wrapped in quotes, with its own quotes doubled, so a pasted row keeps its columns. */
function csvCell(text) {
  const plain = stripInline(text);
  return /[",\n]/.test(plain) ? `"${plain.replace(/"/g, '""')}"` : plain;
}

/** A label's table as text: its caption, then a line per row with the cells separated by commas (comma-separated values, so a spreadsheet reads the columns). */
function tableToText(table, pad) {
  const lines = table.caption ? [`${pad}${stripInline(table.caption)}`] : [];
  table.cells.forEach((row) => lines.push(`${pad}${row.map(csvCell).join(',')}`));
  return lines;
}

/** The [title, paths] pairs of an entry's filings that are switched on: the fixed groups, then Labels. */
export function filingLines(filings) {
  return [...(filings?.groups ?? []), ['Labels', filings?.labels]].filter(([, paths]) => paths != null);
}

/** Plain-text rendering of a view, honouring the same toggles the screen does. */
export function viewToText(state, view) {
  if (view.mode === 'compare') return compareToText(state, view.current);
  if (view.mode === 'index') return indexToText(state, view.items);
  const lines = [];
  const write = (item, depth) => {
    const pad = '  '.repeat(depth);
    if (item.kind === 'node') {
      const note = item.about ? ' (link to About)' : item.definition ? ` — ${stripInline(item.definition)}` : '';
      lines.push(`${pad}• ${stripInline(item.name)}${note}`);
      if (item.entry) shownExamples(item.entry, showsDetail(state, item.entry, view.mode)).forEach(({ text }) => lines.push(`${pad}  · ${stripInline(text)}`));
      (item.tables ?? []).forEach((table) => lines.push(...tableToText(table, `${pad}  `)));
      item.children.forEach((child) => write(child, depth + 1));
      return;
    }
    const { entry } = item;
    const shown = showsDetail(state, entry, view.mode);
    lines.push(`${pad}• ${entry.label}`);
    if (shown.definition && entry.definition) lines.push(`${pad}  ${entry.definition}`);
    shownExamples(entry, shown).forEach(({ text }) => lines.push(`${pad}  · ${stripInline(text)}`));
    for (const [title, paths] of filingLines(item.filings)) lines.push(`${pad}  ${title}: ${paths.length > 0 ? paths.join('; ') : 'none'}`);
  };
  view.items.forEach((item) => write(item, 0));
  return lines.join('\n');
}
