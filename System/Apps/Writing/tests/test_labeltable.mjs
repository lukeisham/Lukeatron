import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, setSortOrder, toggleOpened } from '../app/state.js';
import { renderList } from '../app/render.js';
import { currentView, viewToText } from '../app/view.js';
import { fakeDoc, findAll, withClass } from './fake-dom.mjs';
import { payload } from './fixture.mjs';

const CASES = {
  caption: 'Latin cases', colHeads: true, rowHeads: true,
  cells: [['', 'Singular', 'Plural'], ['Nominative', '*puella*', 'puellae'], ['Genitive', 'puellae', 'puellarum']],
};

/** The fixture's Labels tree with `tables` on the Clause label (id 1), drawn with every heading open. */
function drawWith(tables, { sort = 'labels', open = true } = {}) {
  const data = payload();
  data.trees.labels[0].tables = tables;
  const state = createState(data);
  setSortOrder(state, sort);
  if (!open) state.opened.delete('labels:1');
  const container = fakeDoc.createElement('div');
  renderList(fakeDoc, container, state, currentView(state));
  return { state, container };
}

const tag = (name) => (node) => node.tag === name;

test('a label with a table draws it first among what is beneath the label, before its sub-labels and entries', () => {
  const { container } = drawWith([CASES]);
  const [clause] = findAll(container, withClass('node-root'));
  const [list] = findAll(clause, withClass('node-children'));
  assert.deepEqual(list.children.slice(0, 2).map((n) => n.className.split(' ')[0]), ['label-table-item', 'node']);
  assert.equal(findAll(container, tag('table')).length, 1);
});

test('column headings are <th scope="col"> in <thead> and row headings are <th scope="row">, the rest plain cells', () => {
  const { container } = drawWith([CASES]);
  const [head] = findAll(container, tag('thead'));
  assert.deepEqual(findAll(head, tag('th')).map((n) => [n.textContent, n.attributes.scope]), [['', 'col'], ['Singular', 'col'], ['Plural', 'col']]);
  const [body] = findAll(container, tag('tbody'));
  assert.deepEqual(findAll(body, tag('th')).map((n) => [n.textContent, n.attributes.scope]), [['Nominative', 'row'], ['Genitive', 'row']]);
  assert.deepEqual(findAll(body, tag('td')).map((n) => n.textContent), ['puella', 'puellae', 'puellae', 'puellarum']);
});

test('with column headings off there is no <thead>, and with row headings off every body cell is a plain cell', () => {
  const { container } = drawWith([{ caption: '', colHeads: false, rowHeads: false, cells: [['a', 'b'], ['c', 'd']] }]);
  assert.equal(findAll(container, tag('thead')).length, 0);
  assert.equal(findAll(container, tag('th')).length, 0);
  assert.deepEqual(findAll(container, tag('td')).map((n) => n.textContent), ['a', 'b', 'c', 'd']);
  assert.equal(findAll(container, tag('caption')).length, 0);
});

test('only row headings: the first cell of every row is a row heading, including the first row', () => {
  const { container } = drawWith([{ caption: '', colHeads: false, rowHeads: true, cells: [['x', 'y'], ['z', 'w']] }]);
  assert.deepEqual(findAll(container, tag('th')).map((n) => [n.textContent, n.attributes.scope]), [['x', 'row'], ['z', 'row']]);
  assert.equal(findAll(container, tag('thead')).length, 0);
});

test('a caption is drawn, and cell text goes in as text and italics, never as markup', () => {
  const { container } = drawWith([{ caption: 'Cases', colHeads: false, rowHeads: false, cells: [['<script>alert(1)</script>', '*puella* est']] }]);
  assert.equal(findAll(container, tag('caption'))[0].textContent, 'Cases');
  assert.equal(findAll(container, tag('script')).length, 0);
  const cells = findAll(container, tag('td'));
  assert.equal(cells[0].textContent, '<script>alert(1)</script>');
  assert.deepEqual(findAll(cells[1], tag('em')).map((n) => n.textContent), ['puella']);
});

test('_underscored_ cell text is drawn bold, and bold inside italics carries both', () => {
  const { container } = drawWith([{ caption: '', colHeads: false, rowHeads: false, cells: [['_Nominative_ case', '*a _b_ c*']] }]);
  const cells = findAll(container, tag('td'));
  assert.deepEqual(findAll(cells[0], tag('strong')).map((n) => n.textContent), ['Nominative']);
  assert.equal(cells[0].textContent, 'Nominative case');
  assert.deepEqual(findAll(cells[1], tag('strong')).map((n) => n.textContent), ['b']);
  assert.equal(cells[1].textContent, 'a b c');
  assert.equal(findAll(cells[1], tag('em')).length, 3); // the plain, bold and plain pieces are all italic
});

test('the table carries its column count and its longest word for the CSS that sizes the text', () => {
  const { container } = drawWith([CASES]);
  const [table] = findAll(container, tag('table'));
  assert.equal(table.style.props['--cols'], '3');
  assert.equal(table.style.props['--word'], '10'); // "Nominative"
});

test('each table has an Edit table button in an editable group, labelled with its number and the label', () => {
  const { container } = drawWith([CASES, { ...CASES, caption: 'Second' }]);
  const buttons = findAll(container, withClass('label-table-edit'));
  assert.deepEqual(buttons.map((n) => n.attributes['aria-label']), ['Edit table 1 of Clause', 'Edit table 2 of Clause']);
  assert.deepEqual(findAll(container, withClass('label-table-item')).map((n) => n.dataset.tableIndex), ['0', '1']);
});

test('a closed label hides its tables with everything else beneath it, and a label with only a table can still be folded', () => {
  const closed = drawWith([CASES], { open: false });
  assert.equal(findAll(closed.container, tag('table')).length, 0);
  const data = payload();
  data.trees.labels[1].tables = [CASES]; // Phrase holds no entries or sub-labels, only a table
  const state = createState(data);
  setSortOrder(state, 'labels');
  const phrase = currentView(state).items.find((n) => n.name === 'Phrase');
  assert.equal(phrase.foldable, true);
  assert.equal(phrase.tables.length, 0); // starts closed
  toggleOpened(state, 'labels', 3);
  assert.equal(currentView(state).items.find((n) => n.name === 'Phrase').tables.length, 1);
});

test('a label with no tables key, or an empty list, draws no table', () => {
  assert.equal(findAll(drawWith([]).container, tag('table')).length, 0);
  const state = createState(payload()); // the fixture has no `tables` anywhere
  setSortOrder(state, 'labels');
  const container = fakeDoc.createElement('div');
  renderList(fakeDoc, container, state, currentView(state));
  assert.equal(findAll(container, tag('table')).length, 0);
});

test('Copy writes a table as text under its label: caption, then a row per line with commas between cells', () => {
  const { state } = drawWith([CASES]);
  const lines = viewToText(state, currentView(state)).split('\n');
  const start = lines.findIndex((line) => line.includes('Clause'));
  assert.deepEqual(lines.slice(start + 1, start + 5), [
    '  Latin cases',
    '  ,Singular,Plural',
    '  Nominative,puella,puellae',
    '  Genitive,puellae,puellarum',
  ]);
});

test('Copy quotes a cell that holds a comma or a quote, and drops the bold and italic marks', () => {
  const { state } = drawWith([{ caption: '', colHeads: false, rowHeads: false, cells: [['a, b', 'say "hi"', '_bold_ *it*'], ['', 'x', 'y']] }]);
  const lines = viewToText(state, currentView(state)).split('\n');
  const start = lines.findIndex((line) => line.includes('"a, b"'));
  assert.deepEqual(lines.slice(start, start + 2), ['  "a, b","say ""hi""",bold it', '  ,x,y']);
});
