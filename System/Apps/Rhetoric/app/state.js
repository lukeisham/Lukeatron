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
];

export const TREE_SORTS = new Set(['form', 'function', 'category']);

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
        topicalRank: record.topical_rank,
        examples: record.examples,
      },
    ]),
  );
  const nodesById = {};
  for (const [hierarchy, roots] of Object.entries(payload.trees)) {
    nodesById[hierarchy] = new Map();
    indexNodes(roots, nodesById[hierarchy]);
  }
  return {
    trees: payload.trees,
    devices,
    nodesById,
    sortOrder: EVERYTHING,
    activeView: FULL_VIEW,
    query: '',
    fuzzy: false,
    showDefinitions: true,
    showExamples: true,
    showConfidence: true,
    reveal: true, // groups and types only, with a reveal button on each; off lists every device
    revealed: new Set(), // node ids whose devices Luke has revealed
    expanded: new Set(),
  };
}

/** Changing sort drops a subtree filter that belongs to a different hierarchy; a device view survives. */
export function setSortOrder(state, sortOrder) {
  state.sortOrder = sortOrder;
  const view = parseView(state.activeView);
  if (view.kind === 'subtree' && view.hierarchy !== sortOrder) state.activeView = FULL_VIEW;
}

export function setActiveView(state, view) {
  state.activeView = view;
}

/** @returns {boolean} whether the node's devices are now revealed */
export function toggleRevealed(state, nodeId) {
  if (state.revealed.has(nodeId)) {
    state.revealed.delete(nodeId);
    return false;
  }
  state.revealed.add(nodeId);
  return true;
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

const byName = (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });

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
  topical: rankedThenAlphabetical('topicalRank', 1),
};

export function sortedDevices(state, sortOrder) {
  return [...state.devices.values()].sort(COMPARATORS[sortOrder]);
}
