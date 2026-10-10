/**
 * All app state in one plain object. Every function here either
 * builds it or changes one field; nothing here touches the DOM.
 */

export const SORTS = [
  { key: 'alphabetical', label: 'Alphabetical' },
  { key: 'templates', label: 'Templates' },
  { key: 'brainstorming', label: 'Brainstorming' },
  { key: 'research', label: 'Research' },
  { key: 'topical', label: 'Topical' },
  { key: 'labels', label: 'Labels' },
  { key: 'index', label: 'Index' },
];

/** The group that shows one entry beside its Counterpart in a table; it is neither a tree nor a flat list, and has its own button beside About instead of a place in `SORTS`. */
export const COMPARE = 'compare';

/** Every group the app can open on: the sort buttons plus Compare (the "Open on" menu in index.html lists the same keys). */
export const OPENING_CHOICES = [...SORTS, { key: COMPARE, label: 'Compare' }];

/** The group that files entries under Luke's own labels (named, optionally explained, up to five levels deep); it is edited in the app, and it is kept out of the no-group search. */
export const LABELS = 'labels';

/** How many levels of labels the Labels group holds; mirrors labels.MAX_DEPTH. */
export const MAX_LABEL_DEPTH = 5;

/** The group that lists every real quote, ordered by `indexOrder` (see quoteindex.js); it is not a tree and not an entry list. */
export const INDEX = 'index';

export const TREE_SORTS = new Set(['templates', 'brainstorming', 'research', 'topical', LABELS]);

/** The tree Luke edits in the app. */
export const EDITABLE_TREES = new Set([LABELS]);

/** Label ids overlap other hierarchies' node ids, so an open heading is keyed by hierarchy too. */
export const openKey = (hierarchy, nodeId) => `${hierarchy}:${nodeId}`;

/** `sortOrder` is null when no group is selected: search then covers all four classification trees at once, so one entry can appear once per way it is filed. */
export const EVERYTHING = null;

export const FULL_VIEW = 'full';

export function subtreeView(hierarchy, nodeId) {
  return `subtree:${hierarchy}:${nodeId}`;
}

export function entryView(entryId) {
  return `entry:${entryId}`;
}

/** @returns {{kind: 'full'} | {kind: 'subtree', hierarchy: string, id: number} | {kind: 'entry', id: number}} */
export function parseView(view) {
  const [kind, ...rest] = view.split(':');
  if (kind === 'subtree') return { kind, hierarchy: rest[0], id: Number(rest[1]) };
  if (kind === 'entry') return { kind, id: Number(rest[0]) };
  return { kind: 'full' };
}

/** The headings open when the app starts: every one with sub-labels under it (so the sub-labels show). The rest start closed. */
function initiallyOpen(trees) {
  const keys = new Set();
  const walk = (hierarchy, nodes) => {
    for (const node of nodes.filter((child) => child.kind === 'node')) {
      if (node.children.some((child) => child.kind === 'node')) keys.add(openKey(hierarchy, node.id));
      walk(hierarchy, node.children);
    }
  };
  for (const [hierarchy, roots] of Object.entries(trees)) walk(hierarchy, roots);
  return keys;
}

function indexNodes(roots, into) {
  for (const node of roots) {
    into.set(node.id, node);
    indexNodes(node.children.filter((child) => child.kind === 'node'), into);
  }
}

export function createState(payload) {
  const entries = new Map(
    Object.entries(payload.entries).map(([id, record]) => [
      Number(id),
      {
        id: Number(id),
        kind: record.kind ?? 'entry', // 'entry', or 'type': a type is listed beside forms and heads a group tree
        name: record.name,
        definition: record.definition,
        aiConfidenceRating: record.ai_confidence_rating,
        counterpartOf: record.counterpart_of ?? null,
        examples: record.examples,
        exampleKinds: record.example_kinds ?? record.examples.map(() => 'ai'), // 'ai' (constructed) or 'quote' (real), one per example
      },
    ]),
  );
  for (const entry of entries.values()) {
    const base = entry.counterpartOf == null ? null : entries.get(entry.counterpartOf);
    if (entry.counterpartOf != null && !base) console.warn(`state: counterpart ${entry.id} points at unknown base ${entry.counterpartOf}`);
    entry.label = base ? `${base.name}/${entry.name}` : entry.name;
  }
  const nodesById = {};
  for (const [hierarchy, roots] of Object.entries(payload.trees)) {
    nodesById[hierarchy] = new Map();
    indexNodes(roots, nodesById[hierarchy]);
  }
  const quotes = (payload.quotes ?? []).map((quote) => ({
    id: quote.id,
    entryId: quote.entry_id,
    text: quote.text, // the quoted words, with *italic* and _bold_ markup
    source: quote.source, // the closing parenthesis: who said it, where and when
    author: quote.author ?? null,
    date: quote.date ?? null, // 'YYYY', 'YYYY-MM-DD' or null when not known
  }));
  return {
    trees: payload.trees,
    entries,
    quotes,
    nodesById,
    sortOrder: EVERYTHING,
    activeView: FULL_VIEW,
    query: '',
    fuzzy: false,
    showDefinitions: true,
    showAiExamples: true, // the constructed examples
    showQuotes: true, // the real, credited quotes
    showConfidence: true,
    showLabels: false, // a single entry's view also lists the labels it is filed under; off by default
    showGroups: false, // ...and in the fixed groups (Templates, Brainstorming, Research, Topical); off by default
    tableNames: true, // the Compare table's own switches: its Name, Definition and Examples rows
    tableDefinitions: true,
    tableExamples: true,
    indexOrder: 'first_line', // the Index group's order: a key of INDEX_ORDERS in quoteindex.js
    indexFull: false, // Index: full quotes with a link to the entry, instead of one line each
    comparePairId: null, // the Counterpart's id of the pair shown in Compare; null shows the first pair
    reveal: true, // the "Indent" menu option: headings open and close, a click on one shows or hides what is beneath it; off lists every sub-label and entry
    openChoices: new Map(), // openKey -> true/false for each heading Luke has opened or closed himself; only these are remembered between visits (settings.js), so a new label starts as the defaults say
    opened: initiallyOpen(payload.trees), // openKeys of the headings that are open: their sub-labels and their own entries show; a closed heading shows nothing beneath it
    editMode: true, // the "Edit mode" menu option: on shows the add forms and the Rename, Edit, Delete and × buttons and lets rows be dragged; off is read only
    expanded: new Set(),
  };
}

/** Changing sort drops a subtree filter that belongs to a different hierarchy; an entry view survives. */
export function setSortOrder(state, sortOrder) {
  state.sortOrder = sortOrder;
  const view = parseView(state.activeView);
  if (view.kind === 'subtree' && view.hierarchy !== sortOrder) state.activeView = FULL_VIEW;
}

/** Swaps in the tree the server returned after a change to the editable group; a view isolating a heading that was deleted falls back to the full list. */
export function setEditableTree(state, hierarchy, roots) {
  state.trees[hierarchy] = roots;
  state.nodesById[hierarchy] = new Map();
  indexNodes(roots, state.nodesById[hierarchy]);
  const view = parseView(state.activeView);
  if (view.kind === 'subtree' && view.hierarchy === hierarchy && !state.nodesById[hierarchy].has(view.id)) {
    state.activeView = FULL_VIEW;
  }
}

/** Every label of an editable group in tree order with its level (1 = top-level) and its path, for the pickers that name one. A link label is not one: nothing can be filed or nested under it. */
export function treeLabels(state, hierarchy) {
  const out = [];
  const walk = (nodes, depth, path) => {
    for (const node of nodes.filter((child) => child.kind === 'node' && !child.about)) {
      const labelPath = [...path, node.name];
      out.push({ id: node.id, name: node.name, depth, path: labelPath.join(' > ') });
      walk(node.children, depth + 1, labelPath);
    }
  };
  walk(state.trees[hierarchy], 1, []);
  return out;
}

/** Every Counterpart beside the base it answers, in the base's alphabetical order; a Counterpart whose base is missing is left out. */
export function counterpartPairs(state) {
  return [...state.entries.values()]
    .filter((entry) => entry.counterpartOf != null && state.entries.has(entry.counterpartOf))
    .map((counterpart) => ({ base: state.entries.get(counterpart.counterpartOf), counterpart }))
    .sort((a, b) => a.base.name.localeCompare(b.base.name, undefined, { sensitivity: 'base' }));
}

export function setIndexOrder(state, order) {
  state.indexOrder = order;
}

export function setComparePair(state, counterpartId) {
  state.comparePairId = counterpartId;
}

export function setActiveView(state, view) {
  state.activeView = view;
}

/** @returns {boolean} whether the heading is now open (its sub-labels and entries show) */
export function toggleOpened(state, hierarchy, nodeId) {
  const key = openKey(hierarchy, nodeId);
  const open = !state.opened.has(key);
  if (open) state.opened.add(key);
  else state.opened.delete(key);
  state.openChoices.set(key, open);
  return open;
}

/** Re-applies saved open/closed choices (a `{ openKey: boolean }` object), skipping any for a heading that no longer exists. */
export function applyOpenChoices(state, saved) {
  const existing = new Set(Object.entries(state.trees).flatMap(([hierarchy, roots]) => {
    const keys = [];
    const walk = (nodes) => nodes.filter((child) => child.kind === 'node').forEach((node) => { keys.push(openKey(hierarchy, node.id)); walk(node.children); });
    walk(roots);
    return keys;
  }));
  for (const [key, open] of Object.entries(saved)) {
    if (!existing.has(key)) continue;
    state.openChoices.set(key, open);
    if (open) state.opened.add(key);
    else state.opened.delete(key);
  }
}

/** Opens the heading and every heading above it, so something just added or dropped under it is seen. A heading not in the tree is left alone. */
export function openWithAncestors(state, hierarchy, nodeId) {
  const find = (nodes) => {
    for (const node of nodes.filter((child) => child.kind === 'node')) {
      if (node.id === nodeId) return [node.id];
      const path = find(node.children);
      if (path) return [node.id, ...path];
    }
    return null;
  };
  for (const id of find(state.trees[hierarchy]) ?? []) {
    state.opened.add(openKey(hierarchy, id));
    state.openChoices.set(openKey(hierarchy, id), true);
  }
}

/** @returns {boolean} whether the entry is now expanded */
export function toggleExpanded(state, entryId) {
  if (state.expanded.has(entryId)) {
    state.expanded.delete(entryId);
    return false;
  }
  state.expanded.add(entryId);
  return true;
}

// ---- Flat-sort comparators --------------------------------------------------

// Sorts by the shown label, so a Counterpart files under its base's name.
const byName = (a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });

export const COMPARATORS = {
  alphabetical: byName,
};

export function sortedEntries(state, sortOrder) {
  return [...state.entries.values()].sort(COMPARATORS[sortOrder]);
}
