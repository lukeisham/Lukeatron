/**
 * Draws a view into the list. Text always goes in through textContent / text nodes, never
 * innerHTML (JS-6), so a `<script>` in a definition shows as literal text.
 *
 * One device-row template serves every view (AC-7). Definitions and examples are always in the
 * DOM; body classes (list.css) hide them per the two toggles, and `.expanded` overrides both,
 * so toggling a checkbox or expanding a row never re-renders.
 */

import { parseInline } from './markup.js';

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

function deviceRow(doc, state, device, mode) {
  const expanded = mode === 'device' || state.expanded.has(device.id);
  const item = make(doc, 'li', expanded ? 'device expanded' : 'device');
  item.dataset.deviceId = String(device.id);

  const row = make(doc, 'div', 'device-row');
  row.setAttribute('role', 'button');
  row.setAttribute('tabindex', '0');
  row.setAttribute('aria-expanded', String(expanded));
  row.append(marker(doc, '•'), make(doc, 'span', 'device-name', device.label));
  if (RATING_TITLES[device.aiConfidenceRating]) row.appendChild(confidenceBadge(doc, device.aiConfidenceRating));
  item.appendChild(row);

  if (device.definition) item.appendChild(make(doc, 'p', 'device-definition', device.definition));

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

function nodeRow(doc, state, node, mode, depth) {
  const item = make(doc, 'li', depth === 0 ? 'node node-root' : 'node');
  if (node.group) item.dataset.group = node.hierarchy;
  else item.dataset.nodeId = String(node.id);
  item.dataset.hierarchy = node.hierarchy;

  const row = make(doc, 'div', 'heading-row');
  row.setAttribute('role', 'button');
  row.setAttribute('tabindex', '0');
  row.append(
    marker(doc, '•'),
    make(doc, 'span', 'node-name', node.name),
    make(doc, 'span', 'node-definition', node.definition),
  );
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
    : deviceRow(doc, state, item.device, mode);
}

function message(doc, text) {
  return make(doc, 'p', 'list-message', text);
}

export function renderList(doc, container, state, view) {
  if (view.items.length === 0) {
    container.replaceChildren(message(doc, view.hint ?? 'No devices match.'));
    return;
  }
  const list = make(doc, 'ul', 'list-root');
  view.items.forEach((item) => list.appendChild(itemFor(doc, state, item, view.mode, 0)));
  container.replaceChildren(list);
}

export function renderStatus(doc, container, text) {
  container.replaceChildren(message(doc, text));
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
