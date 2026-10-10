/**
 * All app state in one plain object (frontend.spec AD-2, AD-5). Every function here either
 * builds it or changes one field; nothing here touches the DOM.
 */

export const SORTS = [
  { key: 'alphabetical', label: 'Alphabetical' },
  { key: 'form', label: 'Form' },
  { key: 'function', label: 'Function' },
  { key: 'category', label: 'Category' },
  { key: 'popularity', label: 'Popularity' },
  { key: 'topical', label: 'Topical' },
  { key: 'grammar', label: 'Grammar' },
  { key: 'index', label: 'Index' },
];

/** The group that shows one fallacy beside its Flipside in a table; it is neither a tree nor a flat list, and has its own button beside About instead of a place in `SORTS`. */
export const COMPARE = 'compare';

/** Every group the app can open on: the sort buttons plus Compare (the "Open on" menu in index.html lists the same keys). */
export const OPENING_CHOICES = [...SORTS, { key: COMPARE, label: 'Compare' }];

/** The group that files devices under Luke's own grammar labels (explained terms, up to five levels deep); like Topical it is edited in the app, and it is kept out of the no-group search. */
export const GRAMMAR = 'grammar';

/** How many levels of labels or Types the Grammar and Topical groups hold; mirrors grammar.MAX_DEPTH and topical.MAX_DEPTH. */
export const MAX_LABEL_DEPTH = 5;

/** The group that lists every real quote, ordered by `indexOrder` (see quoteindex.js); it is not a tree and not a device list. */
export const INDEX = 'index';

export const TREE_SORTS = new Set(['form', 'function', 'category', 'topical', GRAMMAR]);

/** Topical: Luke's own Types (items.py/topical.py build the tree). */
export const TOPICAL = 'topical';

/** The two trees Luke edits in the app: Topical's Types and Grammar's labels. */
export const EDITABLE_TREES = new Set([TOPICAL, GRAMMAR]);

/** Mirrors topical.UNSORTED_ID: the derived heading holding every device not yet under a Type. */
export const UNSORTED_ID = 0;

/** Type ids overlap other hierarchies' node ids, so an open heading is keyed by hierarchy too. */
export const openKey = (hierarchy, nodeId) => `${hierarchy}:${nodeId}`;

/** `sortOrder` is null when no group is selected: search then covers all three trees at once, so one device can appear once per way it is filed. */
export const EVERYTHING = null;

export const FULL_VIEW = 'full';

export function subtreeView(hierarchy, nodeId) {
  return `subtree:${hierarchy}:${nodeId}`;
}

export function deviceView(deviceId) {
  return `device:${deviceId}`;
}

/** @returns {{kind: 'full'} | {kind: 'subtree', hierarchy: string, id: number} | {kind: 'device', id: number}} */
export function parseView(view) {
  const [kind, ...rest] = view.split(':');
  if (kind === 'subtree') return { kind, hierarchy: rest[0], id: Number(rest[1]) };
  if (kind === 'device') return { kind, id: Number(rest[0]) };
  return { kind: 'full' };
}

/** The headings open when the app starts: every one with sub-labels under it (so the Types and sub-labels show), and Topical's Unsorted (so there is something to drag). The rest start closed. */
function initiallyOpen(trees) {
  const keys = new Set([openKey(TOPICAL, UNSORTED_ID)]);
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
  const devices = new Map(
    Object.entries(payload.devices).map(([id, record]) => [
      Number(id),
      {
        id: Number(id),
        name: record.name,
        definition: record.definition,
        popularity: record.popularity,
        aiConfidenceRating: record.ai_confidence_rating,
        flipsideOf: record.flipside_of ?? null,
        examples: record.examples,
        exampleKinds: record.example_kinds ?? record.examples.map(() => 'ai'), // 'ai' (constructed) or 'quote' (real), one per example
      },
    ]),
  );
  for (const device of devices.values()) {
    const fallacy = device.flipsideOf == null ? null : devices.get(device.flipsideOf);
    if (device.flipsideOf != null && !fallacy) console.warn(`state: flipside ${device.id} points at unknown fallacy ${device.flipsideOf}`);
    device.label = fallacy ? `${fallacy.name}/${device.name}` : device.name;
  }
  const nodesById = {};
  for (const [hierarchy, roots] of Object.entries(payload.trees)) {
    nodesById[hierarchy] = new Map();
    indexNodes(roots, nodesById[hierarchy]);
  }
  const quotes = (payload.quotes ?? []).map((quote) => ({
    id: quote.id,
    deviceId: quote.device_id,
    text: quote.text, // the quoted words, with *italic* and _bold_ markup
    source: quote.source, // the closing parenthesis: who said it, where and when
    author: quote.author ?? null,
    date: quote.date ?? null, // 'YYYY', 'YYYY-MM-DD' or null when not known
  }));
  return {
    trees: payload.trees,
    devices,
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
    showLabels: false, // a single device's view also lists where it is filed in Grammar (its labels); off by default
    showTypes: false, // ...and in Topical (its Types); off by default
    showGroups: false, // ...and in the fixed groups (Category, Form, Function); off by default
    tableNames: true, // the Compare table's own switches: its Name, Definition and Examples rows
    tableDefinitions: true,
    tableExamples: true,
    indexOrder: 'first_line', // the Index group's order: a key of INDEX_ORDERS in quoteindex.js
    indexFull: false, // Index: full quotes with a link to the device, instead of one line each
    comparePairId: null, // the Flipside's id of the pair shown in Compare; null shows the first pair
    reveal: true, // the "Indent" menu option: headings open and close, a click on one shows or hides what is beneath it; off lists every sub-label and device
    openChoices: new Map(), // openKey -> true/false for each heading Luke has opened or closed himself; only these are remembered between visits (settings.js), so a new label starts as the defaults say
    opened: initiallyOpen(payload.trees), // openKeys of the headings that are open: their sub-labels and their own devices show; a closed heading shows nothing beneath it
    editMode: true, // the "Edit mode" menu option: on shows the add forms and the Rename, Edit, Delete and × buttons and lets rows be dragged; off is read only
    expanded: new Set(),
  };
}

/** Changing sort drops a subtree filter that belongs to a different hierarchy; a device view survives. */
export function setSortOrder(state, sortOrder) {
  state.sortOrder = sortOrder;
  const view = parseView(state.activeView);
  if (view.kind === 'subtree' && view.hierarchy !== sortOrder) state.activeView = FULL_VIEW;
}

/** Swaps in the tree the server returned after a change to an editable group; a view isolating a heading that was deleted falls back to the full list. */
export function setEditableTree(state, hierarchy, roots) {
  state.trees[hierarchy] = roots;
  state.nodesById[hierarchy] = new Map();
  indexNodes(roots, state.nodesById[hierarchy]);
  const view = parseView(state.activeView);
  if (view.kind === 'subtree' && view.hierarchy === hierarchy && !state.nodesById[hierarchy].has(view.id)) {
    state.activeView = FULL_VIEW;
  }
}

/** Every label or Type of an editable group in tree order with its level (1 = top-level) and its path, for the pickers that name one. Topical's derived Unsorted heading is not one, and neither is a link label: nothing can be filed or nested under it. */
export function treeLabels(state, hierarchy) {
  const out = [];
  const walk = (nodes, depth, path) => {
    for (const node of nodes.filter((child) => child.kind === 'node' && !child.about && !(hierarchy === TOPICAL && child.id === UNSORTED_ID))) {
      const labelPath = [...path, node.name];
      out.push({ id: node.id, name: node.name, depth, path: labelPath.join(' > ') });
      walk(node.children, depth + 1, labelPath);
    }
  };
  walk(state.trees[hierarchy], 1, []);
  return out;
}

/** Every Flipside beside the fallacy it answers, in the fallacy's alphabetical order; a Flipside whose fallacy is missing is left out. */
export function flipsidePairs(state) {
  return [...state.devices.values()]
    .filter((device) => device.flipsideOf != null && state.devices.has(device.flipsideOf))
    .map((flipside) => ({ fallacy: state.devices.get(flipside.flipsideOf), flipside }))
    .sort((a, b) => a.fallacy.name.localeCompare(b.fallacy.name, undefined, { sensitivity: 'base' }));
}

export function setIndexOrder(state, order) {
  state.indexOrder = order;
}

export function setComparePair(state, flipsideId) {
  state.comparePairId = flipsideId;
}

export function setActiveView(state, view) {
  state.activeView = view;
}

/** @returns {boolean} whether the heading is now open (its sub-labels and devices show) */
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

/** @returns {boolean} whether the device is now expanded */
export function toggleExpanded(state, deviceId) {
  if (state.expanded.has(deviceId)) {
    state.expanded.delete(deviceId);
    return false;
  }
  state.expanded.add(deviceId);
  return true;
}

// ---- Flat-sort comparators --------------------------------------------------

// Sorts by the shown label, so a Flipside files under its fallacy's name.
const byName = (a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });

/** Orders by `key` in `direction`; a device with no value sorts after every valued one, then by name. */
function rankedThenAlphabetical(key, direction) {
  return (a, b) => {
    const missingA = a[key] == null;
    const missingB = b[key] == null;
    if (missingA || missingB) return missingA === missingB ? byName(a, b) : missingA ? 1 : -1;
    return (a[key] - b[key]) * direction || byName(a, b);
  };
}

export const COMPARATORS = {
  alphabetical: byName,
  popularity: rankedThenAlphabetical('popularity', -1),
};

export function sortedDevices(state, sortOrder) {
  return [...state.devices.values()].sort(COMPARATORS[sortOrder]);
}
