/**
 * Derives what is on screen from state — the one source that render.js draws and actions.js
 * copies, so Print/Copy can never disagree with the screen (frontend.spec AD-5).
 *
 * A view is `{ mode: 'tree' | 'flat' | 'device', items }`, where each item is
 * `{ kind: 'node', id, hierarchy, name, definition, children }` or `{ kind: 'device', device }`.
 */

import { matchesName } from './search.js';
import { stripInline } from './markup.js';
import { TREE_SORTS, parseView, sortedDevices } from './state.js';

const deviceItem = (device) => ({ kind: 'device', device });

/** A copy of `node` keeping only devices that pass `keep`; with `pruneEmpty`, headings left empty are dropped. */
function filterNode(state, hierarchy, node, keep, pruneEmpty) {
  const children = [];
  for (const child of node.children) {
    if (child.kind === 'device') {
      const device = state.devices.get(child.id);
      if (!device) console.warn(`view: tree ${hierarchy} references unknown device ${child.id}`);
      else if (keep(device)) children.push(deviceItem(device));
    } else {
      const kept = filterNode(state, hierarchy, child, keep, pruneEmpty);
      if (kept) children.push(kept);
    }
  }
  if (pruneEmpty && children.length === 0) return null;
  return { kind: 'node', id: node.id, hierarchy, name: node.name, definition: node.definition, children };
}

export function currentView(state) {
  const searching = state.query.trim() !== '';
  const matches = (device) => matchesName(device.name, state.query, state.fuzzy);
  const view = parseView(state.activeView);

  if (view.kind === 'device') {
    const device = state.devices.get(view.id);
    return { mode: 'device', items: device && matches(device) ? [deviceItem(device)] : [] };
  }

  if (TREE_SORTS.has(state.sortOrder)) {
    const hierarchy = state.sortOrder;
    const roots = view.kind === 'subtree'
      ? [state.nodesById[hierarchy].get(view.id)].filter(Boolean)
      : state.trees[hierarchy];
    const items = roots
      .map((root) => filterNode(state, hierarchy, root, matches, searching))
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
    lines.push(`${pad}• ${device.name}`);
    if (shown.definition && device.definition) lines.push(`${pad}  ${device.definition}`);
    if (shown.examples) device.examples.forEach((example) => lines.push(`${pad}  □ ${stripInline(example)}`));
  };
  view.items.forEach((item) => write(item, 0));
  return lines.join('\n');
}
