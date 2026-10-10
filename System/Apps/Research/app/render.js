/**
 * Draws a view into the list. Text always goes in through textContent / text nodes, never
 * innerHTML (JS-6), so a `<script>` in a definition shows as literal text.
 *
 * One entry-row template serves every view. Definitions and examples are always in the
 * DOM; body classes (list.css) hide them per the two toggles, and `.expanded` overrides both,
 * so toggling a checkbox or expanding a row never re-renders.
 */

import { parseInline, stripInline } from './markup.js';
import { isHeadingCell, longestWord } from './tablegrid.js';
import { filingLines } from './view.js';

function make(doc, tag, className, text) {
  const node = doc.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function wrapIn(parent, child) {
  parent.appendChild(child);
  return parent;
}

const MOST_EXAMPLES = 8; // an entry with this many examples or more draws its dot at full size

/** How far a dot grows within its band, 0 to 1: the log of what it holds against the log of `most`, so it grows gently. */
function fullness(count, most) {
  return most > 0 ? Math.min(1, Math.log1p(count) / Math.log1p(most)) : 0;
}

function marker(doc, size, fill) {
  const node = make(doc, 'span', `marker ${size}`);
  if (fill !== undefined) node.style.setProperty('--fill', fill.toFixed(3));
  node.setAttribute('aria-hidden', 'true');
  return node;
}

/** A span (or another `tag`) holding `text` with its `*italic*` pieces drawn as <em> and its `_bold_` pieces as <strong>, never as HTML. */
function inlineSpan(doc, className, text, tag = 'span') {
  const wrapper = make(doc, tag, className);
  for (const segment of parseInline(text)) {
    let piece = doc.createTextNode(segment.text);
    if (segment.bold) piece = wrapIn(make(doc, 'strong'), piece);
    if (segment.italic) piece = wrapIn(make(doc, 'em', 'latin'), piece);
    wrapper.appendChild(piece);
  }
  return wrapper;
}

const exampleText = (doc, text) => inlineSpan(doc, 'example-text', text);

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

function kindBadge(doc) {
  const badge = make(doc, 'span', 'kind-badge', 'Type');
  badge.title = 'A type: like a topic, but it can hold topics and other types';
  return badge;
}

function removeButton(doc, entry, labelName) {
  const button = make(doc, 'button', 'placement-remove', '×');
  button.setAttribute('type', 'button');
  button.setAttribute('aria-label', `Remove ${entry.label} from ${labelName}`);
  button.title = `Remove from ${labelName}`;
  return button;
}

function entryRow(doc, state, listing, mode) {
  const { entry } = listing;
  const expanded = mode === 'entry' || state.expanded.has(entry.id);
  const item = make(doc, 'li', expanded ? 'entry expanded' : 'entry');
  item.dataset.entryId = String(entry.id);
  if (listing.draggable) item.setAttribute('draggable', 'true');

  const row = make(doc, 'div', 'entry-row');
  row.setAttribute('role', 'button');
  row.setAttribute('tabindex', '0');
  row.setAttribute('aria-expanded', String(expanded));
  row.append(marker(doc, 'marker-medium', fullness(entry.examples.length, MOST_EXAMPLES)), make(doc, 'span', 'entry-name', entry.label));
  if (entry.kind === 'type') row.appendChild(kindBadge(doc));
  if (RATING_TITLES[entry.aiConfidenceRating]) row.appendChild(confidenceBadge(doc, entry.aiConfidenceRating));
  if (listing.removeFrom != null) row.appendChild(removeButton(doc, entry, stripInline(listing.removeFrom.name)));
  item.appendChild(row);

  if (entry.definition) item.appendChild(make(doc, 'p', 'entry-definition', entry.definition));

  if (entry.examples.length > 0) {
    const examples = make(doc, 'ul', 'examples');
    entry.examples.forEach((example, index) => {
      const item = make(doc, 'li', `example example-${entry.exampleKinds[index]}`);
      item.append(marker(doc, 'marker-small'), exampleText(doc, example));
      examples.appendChild(item);
    });
    item.appendChild(examples);
  }
  const filings = filingLines(listing.filings);
  if (filings.length > 0) item.appendChild(filingsBlock(doc, filings));
  return item;
}

/** The filing lines under a single entry (the fixed groups, then Labels): where it is filed in each, one path per filing. */
function filingsBlock(doc, filings) {
  const block = make(doc, 'dl', 'entry-filings');
  for (const [title, paths] of filings) {
    block.appendChild(make(doc, 'dt', '', title));
    const value = make(doc, 'dd', paths.length > 0 ? '' : 'filings-none');
    value.textContent = paths.length > 0 ? paths.join('; ') : 'none';
    block.appendChild(value);
  }
  return block;
}

function revealButton(doc, node) {
  const button = make(doc, 'button', 'reveal-toggle', `${node.open ? '▾' : '▸'}${node.entryCount > 0 ? ` ${node.entryCount}` : ''}`);
  button.setAttribute('type', 'button');
  button.setAttribute('aria-expanded', String(node.open));
  button.setAttribute('aria-label', `${node.open ? 'Close' : 'Open'} ${stripInline(node.name)}${node.entryCount > 0 ? `, ${node.entryCount} ${node.entryCount === 1 ? 'topic' : 'topics'}` : ''}`);
  return button;
}

// A label adds entries and tables, and its Edit changes the explanation as well as the name. A link label holds neither, so it only renames and deletes.
const LABEL_BUTTONS = [['label-add', 'Add topic'], ['label-table-add', 'Add table'], ['label-rename', 'Edit'], ['label-delete', 'Delete']];
const LINK_BUTTONS = LABEL_BUTTONS.filter(([className]) => ['label-rename', 'label-delete'].includes(className));

function labelActions(doc, node) {
  const actions = make(doc, 'span', 'label-actions');
  for (const [className, label] of node.about ? LINK_BUTTONS : LABEL_BUTTONS) {
    const button = make(doc, 'button', `label-action ${className}`, label);
    button.setAttribute('type', 'button');
    button.setAttribute('aria-label', `${label} ${stripInline(node.name)}`);
    actions.appendChild(button);
  }
  return actions;
}

/** A table cell (or heading) holding `text`, with its `*italic*` pieces drawn as <em> and its `_bold_` pieces as <strong>. */
function gridCell(doc, tag, text, scope) {
  const cell = make(doc, tag);
  if (scope) cell.setAttribute('scope', scope);
  cell.appendChild(inlineSpan(doc, '', text));
  return cell;
}

/**
 * One saved table under a label. Headings are real <th> cells (column headings in <thead>, row headings
 * at the start of a row), drawn bold by labeltable.css. `--cols` and `--word` (the columns and the longest word)
 * are what labeltable.css sizes the text from so the table fits the width it is given.
 */
function tableItem(doc, node, table, index) {
  const item = make(doc, 'li', 'label-table-item');
  item.dataset.tableIndex = String(index);
  if (node.editable) {
    const edit = make(doc, 'button', 'label-action label-table-edit', 'Edit table');
    edit.setAttribute('type', 'button');
    edit.setAttribute('aria-label', `Edit table ${index + 1} of ${stripInline(node.name)}`);
    item.appendChild(edit);
  }
  const grid = make(doc, 'table', 'label-table');
  grid.style.setProperty('--cols', String(table.cells[0].length));
  grid.style.setProperty('--word', String(longestWord(table)));
  if (table.caption) grid.appendChild(make(doc, 'caption', 'label-table-caption', table.caption));
  const rows = table.cells.map((cells, row) => {
    const line = make(doc, 'tr');
    cells.forEach((text, col) => {
      const heading = isHeadingCell(table, row, col);
      line.appendChild(gridCell(doc, heading ? 'th' : 'td', text, heading ? (row === 0 && table.colHeads ? 'col' : 'row') : undefined));
    });
    return line;
  });
  if (table.colHeads) {
    const head = make(doc, 'thead');
    head.appendChild(rows.shift());
    grid.appendChild(head);
  }
  const body = make(doc, 'tbody');
  rows.forEach((line) => body.appendChild(line));
  grid.appendChild(body);
  const wrap = make(doc, 'div', 'label-table-wrap');
  wrap.appendChild(grid);
  item.appendChild(wrap);
  return item;
}

/** A link label's name: plain weight and underlined (list.css), going to its own section of the About page. Not draggable on its own, so a drag from it moves the row. */
function aboutLink(doc, node) {
  const link = inlineSpan(doc, 'node-name node-link-name', node.name, 'a');
  link.setAttribute('href', `about.html#${encodeURIComponent(node.about)}`);
  link.setAttribute('draggable', 'false');
  link.title = 'Open its section of the About page';
  return link;
}

function nodeRow(doc, state, node, mode, depth) {
  const isLink = Boolean(node.about); // a link label: its name goes to its own section of the About page
  const item = make(doc, 'li', `${depth === 0 ? 'node node-root' : 'node'}${isLink ? ' node-link' : ''}`);
  if (isLink) item.dataset.link = 'true';
  if (node.group) item.dataset.group = node.hierarchy;
  else item.dataset.nodeId = String(node.id);
  item.dataset.hierarchy = node.hierarchy;
  if (node.editable) item.dataset.droppable = 'true';
  if (node.parentId != null) item.dataset.parentId = String(node.parentId);

  const row = make(doc, 'div', 'heading-row');
  if (!isLink) { // a link's own anchor is the control, so the row is not a second one
    row.setAttribute('role', 'button');
    row.setAttribute('tabindex', '0');
  }
  // A label holding sub-labels, entries or tables is a large dot, sized by how many entries it holds, and largest at the top level;
  // a type holding nothing is a medium dot (it is an entry); any other label holding nothing is an outlined circle.
  const band = depth === 0 || node.group ? 'marker-top' : 'marker-large';
  const dot = node.group ? marker(doc, band, 1)
    : !node.empty ? marker(doc, band, fullness(node.entryCount, state.entries.size))
    : node.entry ? marker(doc, 'marker-medium', fullness(node.entry.examples.length, MOST_EXAMPLES))
    : marker(doc, 'marker-empty');
  row.append(dot, isLink ? aboutLink(doc, node) : inlineSpan(doc, 'node-name', node.name));
  if (node.entry) row.appendChild(kindBadge(doc));
  if (node.entry && RATING_TITLES[node.entry.aiConfidenceRating]) row.appendChild(confidenceBadge(doc, node.entry.aiConfidenceRating));
  if (node.definition) row.appendChild(inlineSpan(doc, 'node-definition', node.definition));
  if (node.editable) {
    row.setAttribute('draggable', 'true'); // the handle for reordering labels
    row.title = 'Drag to reorder';
    row.appendChild(labelActions(doc, node));
  }
  if (node.foldable) row.appendChild(revealButton(doc, node));
  item.appendChild(row);

  if (node.entry && node.entry.examples.length > 0) {
    const examples = make(doc, 'ul', 'examples node-examples');
    node.entry.examples.forEach((example, index) => {
      const line = make(doc, 'li', `example example-${node.entry.exampleKinds[index]}`);
      line.append(marker(doc, 'marker-small'), exampleText(doc, example));
      examples.appendChild(line);
    });
    item.appendChild(examples);
  }

  const tables = node.tables ?? [];
  if (node.children.length > 0 || tables.length > 0) {
    const children = make(doc, 'ul', 'node-children');
    children.style.setProperty('--depth', String(depth + 1));
    tables.forEach((table, index) => children.appendChild(tableItem(doc, node, table, index)));
    node.children.forEach((child) => children.appendChild(itemFor(doc, state, child, mode, depth + 1)));
    item.appendChild(children);
  }
  return item;
}

function itemFor(doc, state, item, mode, depth) {
  return item.kind === 'node'
    ? nodeRow(doc, state, item, mode, depth)
    : entryRow(doc, state, item, mode);
}

function message(doc, text) {
  return make(doc, 'p', 'list-message', text);
}

/** One row of the Compare table: a row heading, then the base's cell and the Counterpart's cell. */
function compareRow(doc, className, title, cellFor, pair) {
  const row = make(doc, 'tr', `compare-row ${className}`);
  const heading = make(doc, 'th', 'compare-row-title', title);
  heading.setAttribute('scope', 'row');
  const baseCell = cellFor(pair.base);
  const counterpartCell = cellFor(pair.counterpart);
  baseCell.dataset.side = 'Topic'; // read by compare.css to label the cells once they stack on a narrow screen
  counterpartCell.dataset.side = 'Counterpart';
  row.append(heading, baseCell, counterpartCell);
  return row;
}

const nameCell = (doc) => (entry) => {
  const cell = make(doc, 'td', 'compare-cell');
  cell.appendChild(make(doc, 'span', 'entry-name', entry.name));
  if (RATING_TITLES[entry.aiConfidenceRating]) cell.appendChild(confidenceBadge(doc, entry.aiConfidenceRating));
  return cell;
};

const definitionCell = (doc) => (entry) => make(doc, 'td', 'compare-cell', entry.definition);

const examplesCell = (doc) => (entry) => {
  const cell = make(doc, 'td', 'compare-cell');
  const list = make(doc, 'ul', 'compare-examples');
  for (const example of entry.examples) {
    const item = make(doc, 'li', 'compare-example');
    item.append(marker(doc, 'marker-small'), exampleText(doc, example));
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
  for (const title of ['Topic', 'Counterpart']) {
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
    const option = make(doc, 'option', '', pair.base.name);
    option.value = String(pair.counterpart.id);
    option.selected = pair === view.current;
    return option;
  }));
  pick.disabled = view.pairs.length === 0;
  prev.disabled = index <= 0;
  next.disabled = index < 0 || index >= view.pairs.length - 1;
  count.textContent = view.current ? `${index + 1} of ${view.pairs.length}` : '';
}

/**
 * One index line. Both forms are always in the DOM and the body class `index-full-on` (index.css) picks
 * one, so the Full display toggle never re-renders: a single line (first line, source, year), or the
 * whole quote, its source line and a link to its entry.
 */
function indexRowItem(doc, row) {
  const { quote, entry } = row;
  const item = make(doc, 'li', 'index-row');
  const line = make(doc, 'div', 'index-compact');
  const leader = make(doc, 'span', 'index-leader');
  leader.setAttribute('aria-hidden', 'true');
  line.append(make(doc, 'span', 'index-first', row.firstLine), leader, make(doc, 'span', 'index-source', row.sourceShort));
  if (row.year) line.appendChild(make(doc, 'span', 'index-year', row.year));

  const full = make(doc, 'div', 'index-full');
  const words = make(doc, 'p', 'index-quote');
  words.appendChild(exampleText(doc, quote.text));
  const credit = make(doc, 'p', 'index-credit');
  credit.appendChild(exampleText(doc, quote.source));
  full.append(words, credit);
  const link = make(doc, 'button', 'index-entry-link', `→ ${entry.label}`);
  link.setAttribute('type', 'button');
  link.dataset.entryId = String(entry.id);
  link.setAttribute('aria-label', `Show the topic ${entry.label}`);
  full.appendChild(link);
  item.append(line, full);
  return item;
}

function renderIndex(doc, container, groups) {
  const list = make(doc, 'ul', 'index-groups');
  for (const { heading, rows } of groups) {
    const group = make(doc, 'li', 'index-group');
    const rowList = make(doc, 'ul', 'index-rows');
    rows.forEach((row) => rowList.appendChild(indexRowItem(doc, row)));
    group.append(make(doc, 'h3', 'index-heading', heading), rowList);
    list.appendChild(group);
  }
  container.replaceChildren(list);
}

/** Fills the index bar's order buttons (one per `orders` element, as the sort buttons are drawn), the active one pressed. */
export function renderIndexOrders(doc, container, orders, activeKey) {
  container.replaceChildren(...orders.map(({ key, label, hint }) => {
    const button = make(doc, 'button', 'btn', label);
    button.setAttribute('type', 'button');
    button.setAttribute('aria-pressed', String(key === activeKey));
    button.title = hint;
    button.dataset.indexOrder = key;
    return button;
  }));
}

export function renderList(doc, container, state, view) {
  if (view.items.length === 0) {
    container.replaceChildren(message(doc, view.hint ?? 'No topics match.'));
    return;
  }
  if (view.mode === 'compare') {
    container.replaceChildren(compareTable(doc, view.current));
    return;
  }
  if (view.mode === 'index') return renderIndex(doc, container, view.items);
  const list = make(doc, 'ul', 'list-root');
  view.items.forEach((item) => list.appendChild(itemFor(doc, state, item, view.mode, 0)));
  container.replaceChildren(list);
}

export function renderStatus(doc, container, text) {
  container.replaceChildren(message(doc, text));
}

/** The quiet "· 272 topics, 14 types" beside the subtitle: the whole collection, not the current view; types are left out until there is one. */
export function renderCount(container, total, types = 0) {
  const text = `${total} ${total === 1 ? 'topic' : 'topics'}`;
  container.textContent = `· ${types > 0 ? `${text}, ${types} ${types === 1 ? 'type' : 'types'}` : text}`;
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
