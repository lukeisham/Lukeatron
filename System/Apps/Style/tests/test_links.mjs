import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, setSortOrder, treeLabels } from '../app/state.js';
import { renderList } from '../app/render.js';
import { bindDragAndDrop } from '../app/drag.js';
import { currentView, viewToText } from '../app/view.js';
import { fakeDoc, findAll, withClass } from './fake-dom.mjs';
import { payload } from './fixture.mjs';

// Labels: Clause (id 1) with Independent clause inside it, Phrase (3), and a link label "On clauses" (4) at the top that points at its About section.
function linkState() {
  const data = payload();
  data.trees.labels.push({ kind: 'node', id: 4, name: 'On *clauses*', definition: '', about: 'link-on-clauses', tables: [], children: [] });
  const state = createState(data);
  state.reveal = false;
  setSortOrder(state, 'labels');
  return state;
}

function draw(state) {
  const container = fakeDoc.createElement('div');
  renderList(fakeDoc, container, state, currentView(state));
  return container;
}

const linkRow = (container) => findAll(container, (n) => n.dataset.link === 'true')[0];

test('a link label draws its name as an anchor to its own About section, with no marker role or tab stop on the row', () => {
  const container = draw(linkState());
  const [anchor] = findAll(container, withClass('node-link-name'));
  assert.equal(anchor.tag, 'a');
  assert.equal(anchor.attributes.href, 'about.html#link-on-clauses');
  assert.equal(anchor.attributes.draggable, 'false');
  assert.equal(anchor.textContent, 'On clauses');
  assert.deepEqual(findAll(anchor, withClass('latin')).map((n) => n.textContent), ['clauses']); // the name's *italics* still draw
  const row = findAll(linkRow(container), withClass('heading-row'))[0];
  assert.equal(row.attributes.role, undefined);
  assert.equal(row.attributes.tabindex, undefined);
});

test('ordinary labels stay plain spans and nothing else is a link', () => {
  const container = draw(linkState());
  assert.equal(findAll(container, withClass('node-link-name')).length, 1);
  assert.deepEqual(findAll(container, (n) => n.tag === 'a'), findAll(container, withClass('node-link-name')));
  assert.equal(findAll(container, (n) => n.dataset.link === 'true').length, 1);
});

test('a link offers only Edit and Delete: no Add element, no Add table, and no reveal button', () => {
  const state = linkState();
  state.reveal = true;
  const container = draw(state);
  const actions = findAll(linkRow(container), withClass('label-action')).map((n) => n.textContent);
  assert.deepEqual(actions, ['Edit', 'Delete']);
  assert.equal(findAll(linkRow(container), withClass('reveal-toggle')).length, 0);
});

test('a link stays in the tree while searching, and is still a drag handle and a drop place', () => {
  const state = linkState();
  state.query = 'meta';
  const names = currentView(state).items.map((n) => n.name);
  assert.ok(names.includes('On *clauses*'));
  const row = findAll(linkRow(draw(state)), withClass('heading-row'))[0];
  assert.equal(row.attributes.draggable, 'true');
  assert.equal(linkRow(draw(state)).dataset.droppable, 'true');
});

test('the pickers that name a place to file or nest never offer a link', () => {
  assert.deepEqual(treeLabels(linkState(), 'labels').map((l) => l.name), ['Clause', 'Independent clause', 'Phrase']);
});

test('Copy writes a link as its name and says it goes to About', () => {
  const state = linkState();
  state.showDefinitions = false;
  state.showAiExamples = false;
  state.showQuotes = false;
  const lines = viewToText(state, currentView(state)).split('\n');
  assert.equal(lines.at(-1), '• On clauses (link to About)');
});

// ---- Dragging: a label lands beside a link, never inside it, and an entry never lands on it -------------------------------------------------------

function element(dataset) {
  const classes = new Set();
  const self = {
    dataset, classes, classList: { add: (c) => classes.add(c), remove: (c) => classes.delete(c) },
    getBoundingClientRect: () => ({ top: 0, height: 100 }),
    querySelector: () => self,
    contains: (node) => node === self,
  };
  return self;
}

function drag(start) {
  const handlers = {};
  const drops = [];
  bindDragAndDrop({ addEventListener: (type, handler) => { handlers[type] = handler; }, contains: () => true }, (d) => drops.push(d));
  handlers.dragstart({ target: { closest: start }, dataTransfer: { setData() {} } });
  const over = (dataset, y) => {
    const label = element(dataset);
    const target = { closest: (s) => (s.includes('data-droppable') || s.includes('data-node-id') ? label : null) };
    let accepted = false;
    handlers.dragover({ target, clientY: y, dataTransfer: {}, preventDefault: () => { accepted = true; } });
    if (accepted) handlers.drop({ target, clientY: y, dataTransfer: {}, preventDefault: () => {} });
    return accepted;
  };
  return { over, drops };
}

test('a label dropped on the middle of a link lands before or after it by which half, never inside', () => {
  const own = element({ nodeId: '1', hierarchy: 'labels' });
  const { over, drops } = drag((s) => (s.includes('heading-row') ? { ...element({}), closest: () => own } : null));
  const link = { nodeId: '4', hierarchy: 'labels', link: 'true' };
  assert.equal(over(link, 40), true);
  assert.equal(over(link, 60), true);
  assert.deepEqual(drops.map((d) => [d.overLabel, d.side]), [[4, 'before'], [4, 'after']]);
});

test('an entry cannot be dropped on a link', () => {
  const { over, drops } = drag((s) => (s.includes('data-entry-id')
    ? { closest: () => ({ dataset: { hierarchy: 'labels' } }), dataset: { entryId: '2' }, classList: { add() {} } }
    : null));
  assert.equal(over({ nodeId: '4', hierarchy: 'labels', link: 'true' }, 50), false);
  assert.equal(over({ nodeId: '3', hierarchy: 'labels' }, 50), true); // an ordinary label still takes it
  assert.deepEqual(drops.map((d) => d.overLabel), [3]);
});
