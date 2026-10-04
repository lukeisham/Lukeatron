/**
 * Draws a view into the list. Text always goes in through textContent / text nodes, never
 * innerHTML (JS-6), so a `<script>` in a definition shows as literal text.
 *
 * One device-row template serves every view (AC-7). Definitions and examples are always in the
 * DOM; body classes (list.css) hide them per the two toggles, and `.expanded` overrides both,
 * so toggling a checkbox or expanding a row never re-renders.
 */

import { parseInline } from './markup.js';
import { GRAMMAR_SLOTS, GRAMMATICAL_SORTS } from './state.js';

function make(doc, tag, className, text) {
  const node = doc.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function marker(doc, glyph, extraClass = '') {
  const node = make(doc, 'span', `marker ${extraClass}`.trim(), glyph);
  node.setAttribute('aria-hidden', 'true');
  return node;
}

function exampleText(doc, text) {
  const wrapper = make(doc, 'span', 'example-text');
  for (const segment of parseInline(text)) {
    wrapper.appendChild(segment.italic
      ? make(doc, 'em', 'latin', segment.text)
      : doc.createTextNode(segment.text));
  }
  return wrapper;
}

const RATING_TITLES = {
  high: 'AI confidence: high — the AI is confident the definition, example and categorisation are accurate',
  medium: 'AI confidence: medium — the AI is fairly confident; worth a check',
  low: 'AI confidence: low — the AI is unsure; treat as a draft',
};

function confidenceBadge(doc, rating) {
  const badge = make(doc, 'span', 'confidence-badge', `AI ${rating}`);
  badge.dataset.rating = rating;
  badge.title = RATING_TITLES[rating];
  return badge;
}

function removeButton(doc, device, typeName) {
  const button = make(doc, 'button', 'placement-remove', '×');
  button.setAttribute('type', 'button');
  button.setAttribute('aria-label', `Remove ${device.label} from ${typeName}`);
  button.title = `Remove from ${typeName}`;
  return button;
}

/** A precise summary, then each filled grammar slot (Grammar function, Grammar form): its labels, and an example with its key parts italic and each term's definition in brackets. */
function explanationBlock(doc, explanation) {
  const block = make(doc, 'div', 'device-explanation');
  block.appendChild(make(doc, 'p', 'explanation-summary', explanation.summary));
  for (const { key, title } of GRAMMAR_SLOTS) {
    const slot = explanation[key];
    if (!slot) continue;
    const heading = make(doc, 'p', 'explanation-slot');
    heading.append(make(doc, 'span', 'explanation-slot-name', title), make(doc, 'span', 'explanation-labels', slot.labels.join(', ')));
    const example = make(doc, 'p', 'explanation-example');
    example.appendChild(exampleText(doc, slot.example));
    block.append(heading, example);
  }
  return block;
}

function deviceRow(doc, state, entry, mode) {
  const { device } = entry;
  const expanded = mode === 'device' || state.expanded.has(device.id);
  const item = make(doc, 'li', expanded ? 'device expanded' : 'device');
  item.dataset.deviceId = String(device.id);
  if (entry.draggable) item.setAttribute('draggable', 'true');

  const row = make(doc, 'div', 'device-row');
  row.setAttribute('role', 'button');
  row.setAttribute('tabindex', '0');
  row.setAttribute('aria-expanded', String(expanded));
  row.append(marker(doc, '•'), make(doc, 'span', 'device-name', device.label));
  if (RATING_TITLES[device.aiConfidenceRating]) row.appendChild(confidenceBadge(doc, device.aiConfidenceRating));
  if (entry.removeFrom != null) row.appendChild(removeButton(doc, device, entry.removeFrom.name));
  item.appendChild(row);

  if (device.definition) item.appendChild(make(doc, 'p', 'device-definition', device.definition));

  if (device.explanation && GRAMMATICAL_SORTS.has(state.sortOrder)) item.appendChild(explanationBlock(doc, device.explanation));

  if (device.examples.length > 0) {
    const examples = make(doc, 'ul', 'examples');
    for (const example of device.examples) {
      const entry = make(doc, 'li', 'example');
      entry.append(marker(doc, '□', 'marker-example'), exampleText(doc, example));
      examples.appendChild(entry);
    }
    item.appendChild(examples);
  }
  return item;
}

function revealButton(doc, node) {
  const button = make(doc, 'button', 'reveal-toggle', `${node.revealed ? '▾' : '▸'} ${node.deviceCount}`);
  button.setAttribute('type', 'button');
  button.setAttribute('aria-expanded', String(node.revealed));
  button.setAttribute('aria-label', `${node.revealed ? 'Hide' : 'Reveal'} ${node.deviceCount} devices in ${node.name}`);
  return button;
}

function typeActions(doc, node) {
  const actions = make(doc, 'span', 'type-actions');
  for (const [className, label] of [['type-rename', 'Rename'], ['type-delete', 'Delete']]) {
    const button = make(doc, 'button', `type-action ${className}`, label);
    button.setAttribute('type', 'button');
    button.setAttribute('aria-label', `${label} ${node.name}`);
    actions.appendChild(button);
  }
  return actions;
}

function nodeRow(doc, state, node, mode, depth) {
  const item = make(doc, 'li', depth === 0 ? 'node node-root' : 'node');
  if (node.group) item.dataset.group = node.hierarchy;
  else item.dataset.nodeId = String(node.id);
  item.dataset.hierarchy = node.hierarchy;
  if (node.editable) item.dataset.droppable = 'true';

  const row = make(doc, 'div', 'heading-row');
  row.setAttribute('role', 'button');
  row.setAttribute('tabindex', '0');
  row.append(marker(doc, '•'), make(doc, 'span', 'node-name', node.name));
  if (node.definition) row.appendChild(make(doc, 'span', 'node-definition', node.definition));
  if (node.editable) {
    row.setAttribute('draggable', 'true'); // the handle for reordering Types
    row.title = 'Drag to reorder';
    row.appendChild(typeActions(doc, node));
  }
  if (node.revealable) row.appendChild(revealButton(doc, node));
  item.appendChild(row);

  if (node.children.length > 0) {
    const children = make(doc, 'ul', 'node-children');
    children.style.setProperty('--depth', String(depth + 1));
    node.children.forEach((child) => children.appendChild(itemFor(doc, state, child, mode, depth + 1)));
    item.appendChild(children);
  }
  return item;
}

function itemFor(doc, state, item, mode, depth) {
  return item.kind === 'node'
    ? nodeRow(doc, state, item, mode, depth)
    : deviceRow(doc, state, item, mode);
}

function message(doc, text) {
  return make(doc, 'p', 'list-message', text);
}

/** One row of the Compare table: a row heading, then the fallacy's cell and the Flipside's cell. */
function compareRow(doc, className, title, cellFor, pair) {
  const row = make(doc, 'tr', `compare-row ${className}`);
  const heading = make(doc, 'th', 'compare-row-title', title);
  heading.setAttribute('scope', 'row');
  const fallacyCell = cellFor(pair.fallacy);
  const flipsideCell = cellFor(pair.flipside);
  fallacyCell.dataset.side = 'Fallacy'; // read by compare.css to label the cells once they stack on a narrow screen
  flipsideCell.dataset.side = 'Flipside';
  row.append(heading, fallacyCell, flipsideCell);
  return row;
}

const nameCell = (doc) => (device) => {
  const cell = make(doc, 'td', 'compare-cell');
  cell.appendChild(make(doc, 'span', 'device-name', device.name));
  if (RATING_TITLES[device.aiConfidenceRating]) cell.appendChild(confidenceBadge(doc, device.aiConfidenceRating));
  return cell;
};

const definitionCell = (doc) => (device) => make(doc, 'td', 'compare-cell', device.definition);

const examplesCell = (doc) => (device) => {
  const cell = make(doc, 'td', 'compare-cell');
  const list = make(doc, 'ul', 'compare-examples');
  for (const example of device.examples) {
    const item = make(doc, 'li', 'compare-example');
    item.append(marker(doc, '□', 'marker-example'), exampleText(doc, example));
    list.appendChild(item);
  }
  cell.appendChild(list);
  return cell;
};

/** The Compare table for one pair. All three rows are always in the DOM; body classes (compare.css) hide them per the table's switches. */
function compareTable(doc, pair) {
  const table = make(doc, 'table', 'compare-table');
  const head = make(doc, 'tr', 'compare-head');
  head.appendChild(make(doc, 'td', 'compare-corner'));
  for (const title of ['Fallacy', 'Flipside']) {
    const column = make(doc, 'th', 'compare-column-title', title);
    column.setAttribute('scope', 'col');
    head.appendChild(column);
  }
  const header = make(doc, 'thead');
  header.appendChild(head);
  const body = make(doc, 'tbody');
  body.append(
    compareRow(doc, 'compare-names', 'Name', nameCell(doc), pair),
    compareRow(doc, 'compare-definitions', 'Definition', definitionCell(doc), pair),
    compareRow(doc, 'compare-examples-row', 'Examples', examplesCell(doc), pair),
  );
  table.append(header, body);
  return table;
}

/** Fills the pair picker and its Prev/Next buttons from a Compare view; the elements stay in the page so the picker keeps focus. */
export function renderCompareBar(doc, parts, view) {
  const { pick, prev, next, count } = parts;
  const index = view.pairs.findIndex((pair) => pair === view.current);
  pick.replaceChildren(...view.pairs.map((pair) => {
    const option = make(doc, 'option', '', pair.fallacy.name);
    option.value = String(pair.flipside.id);
    option.selected = pair === view.current;
    return option;
  }));
  pick.disabled = view.pairs.length === 0;
  prev.disabled = index <= 0;
  next.disabled = index < 0 || index >= view.pairs.length - 1;
  count.textContent = view.current ? `${index + 1} of ${view.pairs.length}` : '';
}

export function renderList(doc, container, state, view) {
  if (view.items.length === 0) {
    container.replaceChildren(message(doc, view.hint ?? 'No devices match.'));
    return;
  }
  if (view.mode === 'compare') {
    container.replaceChildren(compareTable(doc, view.current));
    return;
  }
  const list = make(doc, 'ul', 'list-root');
  view.items.forEach((item) => list.appendChild(itemFor(doc, state, item, view.mode, 0)));
  container.replaceChildren(list);
}

export function renderStatus(doc, container, text) {
  container.replaceChildren(message(doc, text));
}

/** The quiet "· 272 devices" beside the subtitle: the whole collection, not the current view. */
export function renderCount(container, total) {
  container.textContent = `· ${total} device${total === 1 ? '' : 's'}`;
}

export function renderSortButtons(doc, container, sorts, activeKey) {
  const buttons = sorts.map(({ key, label }) => {
    const button = make(doc, 'button', 'sort-option', label);
    button.setAttribute('type', 'button');
    button.dataset.sort = key;
    button.setAttribute('aria-pressed', String(key === activeKey));
    return button;
  });
  container.replaceChildren(...buttons);
}
