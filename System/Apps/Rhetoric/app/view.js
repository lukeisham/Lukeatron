/**
 * Derives what is on screen from state — the one source that render.js draws and actions.js
 * copies, so Print/Copy can never disagree with the screen (frontend.spec AD-5).
 *
 * A view is `{ mode: 'tree' | 'flat' | 'device', items }`, where each item is
 * `{ kind: 'node', id, hierarchy, name, definition, children }` or `{ kind: 'device', device }`.
 */

import { matchesName } from './search.js';
import { stripInline } from './markup.js';
import { EVERYTHING, TREE_SORTS, parseView, sortedDevices } from './state.js';

// Heading rows for the Everything view: one per group, in the order the trees are filed.
const GROUPS = [
  { hierarchy: 'category', name: 'Category', definition: 'what devices are' },
  { hierarchy: 'form', name: 'Form', definition: 'what devices look like' },
  { hierarchy: 'function', name: 'Function', definition: 'what devices do' },
];

const deviceItem = (device) => ({ kind: 'device', device });

function countDevices(node) {
  return node.children.reduce((sum, child) => sum + (child.kind === 'device' ? 1 : countDevices(child)), 0);
}

/**
 * A copy of `node` keeping only devices that pass `keep`; with `pruneEmpty`, headings left empty are dropped.
 * `reveal.on` hides a heading's devices until it, or a heading above it, is in `reveal.opened`
 * (or `open` is already true); such a heading carries `revealable` and `revealed` for its button.
 */
function filterNode(state, hierarchy, node, keep, pruneEmpty, reveal, open = !reveal.on) {
  const opened = open || reveal.opened.has(node.id);
  const children = [];
  for (const child of node.children) {
    if (child.kind === 'device') {
      const device = state.devices.get(child.id);
      if (!device) console.warn(`view: tree ${hierarchy} references unknown device ${child.id}`);
      else if (opened && keep(device)) children.push(deviceItem(device));
    } else {
      const kept = filterNode(state, hierarchy, child, keep, pruneEmpty, reveal, opened);
      if (kept) children.push(kept);
    }
  }
  if (pruneEmpty && children.length === 0) return null;
  const deviceCount = countDevices(node);
  return {
    kind: 'node', id: node.id, hierarchy, name: node.name, definition: node.definition, children,
    deviceCount, revealable: reveal.on && deviceCount > 0, revealed: opened,
  };
}

export function currentView(state) {
  const searching = state.query.trim() !== '';
  const matches = (device) => matchesName(device.label, state.query, state.fuzzy);
  const view = parseView(state.activeView);
  // Search lists its matches in full; an isolated heading shows everything beneath it.
  const reveal = { on: state.reveal && !searching, opened: state.revealed };

  if (view.kind === 'device') {
    const device = state.devices.get(view.id);
    return { mode: 'device', items: device && matches(device) ? [deviceItem(device)] : [] };
  }

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
    const items = roots
      .map((root) => filterNode(state, hierarchy, root, matches, searching, isolated ? { ...reveal, on: false } : reveal))
      .filter(Boolean);
    return { mode: 'tree', items };
  }

  const items = sortedDevices(state, state.sortOrder).filter(matches).map(deviceItem);
  return { mode: 'flat', items };
}

/** Whether a device shows its definition/examples: the global toggle, or the row was clicked open. */
export function showsDetail(state, device, mode) {
  const opened = mode === 'device' || state.expanded.has(device.id);
  return {
    definition: opened || state.showDefinitions,
    examples: opened || state.showExamples,
  };
}

/** Plain-text rendering of a view, honouring the same toggles the screen does. */
export function viewToText(state, view) {
  const lines = [];
  const write = (item, depth) => {
    const pad = '  '.repeat(depth);
    if (item.kind === 'node') {
      lines.push(`${pad}• ${item.name} — ${item.definition}`);
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
