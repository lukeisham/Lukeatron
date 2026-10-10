import test from 'node:test';
import assert from 'node:assert/strict';
import { FULL_VIEW, createState, treeLabels, setActiveView, setEditableTree, setSortOrder, subtreeView, toggleOpened } from '../app/state.js';
import { renderList } from '../app/render.js';
import { bindDragAndDrop } from '../app/drag.js';
import { currentView, viewToText } from '../app/view.js';
import { fakeDoc, findAll, withClass } from './fake-dom.mjs';
import { payload } from './fixture.mjs';

function grammarState() {
  const state = createState(payload());
  state.reveal = false;
  setSortOrder(state, 'grammar');
  return state;
}

function draw(state) {
  const container = fakeDoc.createElement('div');
  renderList(fakeDoc, container, state, currentView(state));
  return container;
}

test('the Grammar group is a tree filed under its own hierarchy, and keeps a label that holds nothing', () => {
  const view = currentView(grammarState());
  assert.equal(view.mode, 'tree');
  assert.deepEqual(view.items.map((n) => n.name), ['Clause', 'Phrase']);
  assert.equal(view.items.at(-1).hierarchy, 'grammar');
  assert.equal(view.items.at(-1).children.length, 0);
});

test('labels nest, and a device sits under a label and under a label inside it', () => {
  const [clause] = currentView(grammarState()).items;
  assert.equal(clause.children[0].name, 'Independent clause');
  assert.equal(clause.children[0].children[0].device.name, 'Anaphora');
  assert.equal(clause.children[1].device.name, 'Anaphora');
});

test('each label shows its explanation beside its name, and carries Add device, Add table, Edit and Delete', () => {
  const container = draw(grammarState());
  assert.deepEqual(findAll(container, withClass('node-definition')).map((n) => n.textContent),
    ['a group of words with a subject and a verb', 'can stand alone', 'a group of words without a verb of its own']);
  assert.deepEqual(findAll(container, withClass('type-action')).map((n) => n.textContent),
    ['Add device', 'Add table', 'Edit', 'Delete', 'Add device', 'Add table', 'Edit', 'Delete', 'Add device', 'Add table', 'Edit', 'Delete']);
  assert.equal(findAll(container, withClass('label-add')).length, 3);
});

test('every label is droppable and a drag handle, and a nested label knows its parent', () => {
  const container = draw(grammarState());
  const droppable = findAll(container, (n) => n.dataset.droppable === 'true');
  assert.deepEqual(droppable.map((n) => [n.dataset.nodeId, n.dataset.parentId]), [['1', undefined], ['2', '1'], ['3', undefined]]);
  assert.equal(findAll(container, (n) => withClass('heading-row')(n) && n.attributes.draggable === 'true').length, 3);
});

test('a device row under a label is draggable and carries a remove cross naming the label', () => {
  const state = grammarState();
  const container = draw(state);
  const labels = findAll(container, withClass('placement-remove')).map((n) => n.attributes['aria-label']);
  assert.deepEqual(labels, ['Remove Anaphora from Independent clause', 'Remove Anaphora from Clause']);
  assert.ok(findAll(container, withClass('device')).every((n) => n.attributes.draggable === 'true'));
});

test('there is no device explanation, slot or summary any more', () => {
  const state = grammarState();
  assert.equal(findAll(draw(state), withClass('device-explanation')).length, 0);
  assert.equal(state.devices.get(2).explanation, undefined);
});

test('an empty Grammar group tells Luke how to start', () => {
  const state = grammarState();
  setEditableTree(state, 'grammar', []);
  assert.equal(draw(state).textContent, 'No labels yet. Add one above, then add devices to it.');
});

test('searching keeps empty labels as places to add a found device', () => {
  const state = grammarState();
  state.query = 'meta';
  assert.deepEqual(currentView(state).items.map((n) => n.name), ['Clause', 'Phrase']);
});

test('Copy writes each label with its explanation and the devices under it', () => {
  const state = grammarState();
  state.showDefinitions = false;
  state.showAiExamples = false;
  state.showQuotes = false;
  assert.equal(viewToText(state, currentView(state)), [
    '• Clause — a group of words with a subject and a verb',
    '  • Independent clause — can stand alone',
    '    • Anaphora',
    '  • Anaphora',
    '• Phrase — a group of words without a verb of its own',
  ].join('\n'));
});

test('setEditableTree swaps the Grammar tree and drops an isolated view of a label that is gone', () => {
  const state = grammarState();
  setActiveView(state, subtreeView('grammar', 2));
  setEditableTree(state, 'grammar', [{ kind: 'node', id: 3, name: 'Phrase', definition: 'd', children: [] }]);
  assert.equal(state.activeView, FULL_VIEW);
  assert.equal(state.nodesById.grammar.has(2), false);
  assert.equal(state.trees.topical.length, 2); // Topical is untouched
});

test('treeLabels lists every label in tree order with its level and path', () => {
  assert.deepEqual(treeLabels(grammarState(), 'grammar'), [
    { id: 1, name: 'Clause', depth: 1, path: 'Clause' },
    { id: 2, name: 'Independent clause', depth: 2, path: 'Clause > Independent clause' },
    { id: 3, name: 'Phrase', depth: 1, path: 'Phrase' },
  ]);
});

test('opening a label does not open the Topical Type or category node that shares its id', () => {
  const state = grammarState();
  state.reveal = true;
  const before = currentView(state).items.map((node) => node.open);
  toggleOpened(state, 'grammar', 1);
  const [clause, phrase] = currentView(state).items;
  assert.deepEqual([clause.open, phrase.open], [!before[0], before[1]]);
});

test('the no-group search does not cover the Grammar group', () => {
  const state = createState(payload());
  state.query = 'a';
  const names = currentView(state).items.map((group) => group.hierarchy);
  assert.deepEqual(names, ['category', 'form', 'function']);
});

// ---- Dragging labels: beside any label, or inside one, never into itself or what is beneath it ----------------------------------------------------

function element(dataset) {
  const classes = new Set();
  const self = {
    dataset, classes, classList: { add: (c) => classes.add(c), remove: (c) => classes.delete(c) },
    getBoundingClientRect: () => ({ top: 0, height: 100 }),
    querySelector: () => self, // its heading row: the same box
    contains: (node) => node === self,
  };
  return self;
}

function dragLabel(fromDataset, beneath = []) {
  const handlers = {};
  const drops = [];
  bindDragAndDrop({ addEventListener: (type, handler) => { handlers[type] = handler; }, contains: () => true }, (d) => drops.push(d));
  const own = element(fromDataset);
  const below = beneath.map((dataset) => element(dataset));
  own.contains = (node) => node === own || below.includes(node);
  const handle = { ...element({}), closest: () => own };
  handlers.dragstart({ target: { closest: (s) => (s.includes('heading-row') ? handle : null) }, dataTransfer: { setData() {} } });
  const at = (dataset, y) => {
    const label = [own, ...below].find((node) => node.dataset === dataset) ?? element(dataset);
    const target = { closest: (s) => (s.includes('data-droppable') || s.includes('data-node-id') ? label : null) };
    let accepted = false;
    handlers.dragover({ target, clientY: y, dataTransfer: {}, preventDefault: () => { accepted = true; } });
    if (accepted) handlers.drop({ target, clientY: y, dataTransfer: {}, preventDefault: () => {} });
    return accepted;
  };
  return { at, drops };
}

test('a label can be dropped beside or inside any label of its group, but not into another group', () => {
  const { at, drops } = dragLabel({ nodeId: '1', hierarchy: 'grammar' });
  assert.equal(at({ nodeId: '3', hierarchy: 'topical' }, 10), false); // another group
  assert.equal(at({ nodeId: '3', hierarchy: 'grammar' }, 90), true); // after a top-level label
  assert.equal(at({ nodeId: '5', hierarchy: 'grammar', parentId: '3' }, 10), true); // before a sub-label: it changes level
  assert.equal(at({ nodeId: '3', hierarchy: 'grammar' }, 50), true); // inside a label
  assert.deepEqual(drops.map((d) => [d.overType, d.side]), [[3, 'after'], [5, 'before'], [3, 'inside']]);
});

test('a label cannot be dropped onto itself or onto a label beneath it', () => {
  const sub = { nodeId: '2', hierarchy: 'grammar', parentId: '1' };
  const itself = { nodeId: '1', hierarchy: 'grammar' };
  const { at, drops } = dragLabel(itself, [sub]);
  assert.equal(at(itself, 50), false);
  assert.equal(at(sub, 50), false);
  assert.deepEqual(drops, []);
});

// ---- *Italics* in a label's name and explanation, by the same star rule as examples ----

test('a label name and explanation draw their *starred* pieces as italics, and Copy drops the stars', () => {
  const state = grammarState();
  state.showDefinitions = false;
  state.showAiExamples = false;
  state.showQuotes = false;
  setEditableTree(state, 'grammar', [{ kind: 'node', id: 1, name: 'The *Clause*', definition: 'a group of words with a *subject* and a *verb*', children: [] }]);
  const container = draw(state);
  const [name] = findAll(container, withClass('node-name'));
  assert.equal(name.textContent, 'The Clause');
  assert.deepEqual(findAll(name, withClass('latin')).map((n) => n.textContent), ['Clause']);
  const [definition] = findAll(container, withClass('node-definition'));
  assert.deepEqual(findAll(definition, withClass('latin')).map((n) => n.textContent), ['subject', 'verb']);
  assert.equal(viewToText(state, currentView(state)), '• The Clause — a group of words with a subject and a verb');
  assert.equal(findAll(container, (n) => n.attributes['aria-label'] === 'Edit The Clause').length, 1);
});
