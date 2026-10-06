import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FULL_VIEW, UNSORTED_ID, createState, openKey, setActiveView, setSortOrder, setEditableTree, subtreeView, toggleOpened, treeLabels,
} from '../app/state.js';
import { currentView, viewToText } from '../app/view.js';
import { renderList } from '../app/render.js';
import { bindDragAndDrop } from '../app/drag.js';
import { fakeDoc, findAll, withClass } from './fake-dom.mjs';
import { payload } from './fixture.mjs';

function topicalState() {
  const state = createState(payload());
  setSortOrder(state, 'topical');
  return state;
}

function draw(state) {
  const container = fakeDoc.createElement('div');
  renderList(fakeDoc, container, state, currentView(state));
  return container;
}

const typeOf = (view, name) => view.items.find((node) => node.name === name);

// ---- View ------------------------------------------------------------------------------------

test('topical is a tree: a real Type is editable, Unsorted is not, and Unsorted starts open', () => {
  const view = currentView(topicalState());
  assert.equal(view.mode, 'tree');
  const [irony, unsorted] = view.items;
  assert.equal(irony.editable, true);
  assert.equal(unsorted.editable, false);
  assert.equal(irony.children.length, 0, 'a real Type starts closed like any heading');
  assert.deepEqual(unsorted.children.map((c) => c.device.name), ['Anaphora']);
});

test('devices in the Topical tree are draggable; only those under a real Type can be removed from it', () => {
  const state = topicalState();
  toggleOpened(state, 'topical', 7);
  const [irony, unsorted] = currentView(state).items;
  assert.deepEqual([irony.children[0].draggable, irony.children[0].removeFrom], [true, { id: 7, name: 'Irony' }]);
  assert.deepEqual([unsorted.children[0].draggable, unsorted.children[0].removeFrom], [true, null]);
  state.reveal = false;
  setSortOrder(state, 'form');
  assert.equal(currentView(state).items[0].children[0].children[0].draggable, false);
});

test('opening a Type does not open the category node that shares its id', () => {
  const state = topicalState();
  const before = state.opened.has(openKey('category', 1));
  toggleOpened(state, 'topical', 1);
  assert.equal(state.opened.has(openKey('category', 1)), before);
  setSortOrder(state, 'category');
  assert.equal(currentView(state).items[0].open, before);
});

test('searching keeps empty Types as drop targets and shows every match', () => {
  const state = topicalState();
  state.query = 'anaph';
  const view = currentView(state);
  assert.deepEqual(view.items.map((n) => n.name), ['Irony', 'Unsorted']);
  assert.equal(typeOf(view, 'Irony').children.length, 0);
  assert.equal(typeOf(view, 'Unsorted').children.length, 1);
});

test('setEditableTree swaps the tree and drops an isolated view of a Type that no longer exists', () => {
  const state = topicalState();
  setActiveView(state, subtreeView('topical', 7));
  setEditableTree(state, 'topical', [{ kind: 'node', id: UNSORTED_ID, name: 'Unsorted', definition: '', children: [{ kind: 'device', id: 1 }] }]);
  assert.equal(state.activeView, FULL_VIEW);
  assert.deepEqual(currentView(state).items.map((n) => n.name), ['Unsorted']);
  assert.equal(state.nodesById.topical.has(7), false);
});

test('Copy writes the Topical Types and the devices revealed under them', () => {
  const state = topicalState();
  toggleOpened(state, 'topical', 7);
  const lines = viewToText(state, currentView(state)).split('\n');
  assert.ok(lines.some((line) => line.startsWith('• Irony')));
  assert.ok(lines.includes('  • Metaphor'));
});

// ---- Render ----------------------------------------------------------------------------------

test('a real Type is droppable and carries Add table, Rename and Delete; Unsorted carries none', () => {
  const container = draw(topicalState());
  const droppable = findAll(container, (n) => n.dataset.droppable === 'true');
  assert.deepEqual(droppable.map((n) => n.dataset.nodeId), ['7']);
  assert.equal(findAll(container, withClass('type-actions')).length, 1);
  assert.deepEqual(findAll(container, withClass('type-action')).map((n) => n.textContent), ['Add table', 'Rename', 'Delete']);
});

test('a Type with no definition draws no definition text', () => {
  const definitions = findAll(draw(topicalState()), withClass('node-definition')).map((n) => n.textContent);
  assert.deepEqual(definitions, ['not yet placed under a Type']);
});

test('Topical device rows are draggable; rows under a Type have a remove cross, rows under Unsorted do not', () => {
  const state = topicalState();
  toggleOpened(state, 'topical', 7);
  const container = draw(state);
  const devices = findAll(container, withClass('device'));
  assert.deepEqual(devices.map((n) => n.attributes.draggable), ['true', 'true']);
  const crosses = findAll(container, withClass('placement-remove'));
  assert.equal(crosses.length, 1);
  assert.equal(crosses[0].attributes['aria-label'], 'Remove Metaphor from Irony');
});

test('a real Type heading is a drag handle; Unsorted is not', () => {
  const container = draw(topicalState());
  const handles = findAll(container, (n) => withClass('heading-row')(n) && n.attributes.draggable === 'true');
  assert.equal(handles.length, 1);
  assert.equal(handles[0].title, 'Drag to reorder');
});

test('other hierarchies draw no drag or Type controls', () => {
  const state = createState(payload());
  state.reveal = false;
  setSortOrder(state, 'form');
  const container = draw(state);
  assert.equal(findAll(container, withClass('type-actions')).length, 0);
  assert.equal(findAll(container, withClass('placement-remove')).length, 0);
  assert.equal(findAll(container, (n) => n.attributes.draggable).length, 0);
});

// ---- Drag and drop ---------------------------------------------------------------------------

function fakeList() {
  const handlers = {};
  return {
    handlers,
    addEventListener: (type, handler) => { handlers[type] = handler; },
    contains: (node) => node != null,
  };
}

/** An element with the dataset and class list drag.js touches, and a 100px-tall box at y 0-100. */
function element(dataset = {}) {
  const classes = new Set();
  const self = {
    dataset, classes,
    closest: () => ({ dataset: { hierarchy: 'topical' } }), // the group a device row sits in
    classList: { add: (c) => classes.add(c), remove: (c) => classes.delete(c) },
    getBoundingClientRect: () => ({ top: 0, height: 100 }),
    querySelector: () => self, // its heading row: the same box
    contains: (node) => node === self,
  };
  return self;
}

/** A pointer target whose `closest` answers by the attribute each selector asks for. */
function pointerAt({ type = null, row = null, handle = null } = {}) {
  const found = { 'data-droppable': type, 'data-device-id': row, 'heading-row': handle, 'data-node-id': type };
  return { closest: (selector) => Object.entries(found).find(([key]) => selector.includes(key))?.[1] ?? null };
}

function transfer() {
  const store = {};
  return { setData: (t, v) => { store[t] = v; }, getData: (t) => store[t] ?? '', effectAllowed: '', dropEffect: '' };
}

function startDrag(list, source) {
  const dataTransfer = transfer();
  list.handlers.dragstart({ target: source, dataTransfer });
  return dataTransfer;
}

function over(list, target, clientY, dataTransfer = transfer()) {
  let accepted = false;
  list.handlers.dragover({ target, clientY, dataTransfer, preventDefault: () => { accepted = true; } });
  return accepted;
}

const drop = (list, target, clientY) => list.handlers.drop({ target, clientY, dataTransfer: transfer(), preventDefault: () => {} });

function bound() {
  const list = fakeList();
  const drops = [];
  bindDragAndDrop(list, (d) => drops.push(d));
  return { list, drops };
}

test('a device dropped on a Type heading is reported with no device or side', () => {
  const { list, drops } = bound();
  const row = element({ deviceId: '2' });
  const typeEl = element({ nodeId: '7', hierarchy: 'topical' });
  startDrag(list, { closest: (s) => (s.includes('data-device-id') ? row : null), classList: row.classList });
  assert.ok(over(list, pointerAt({ type: typeEl }), 10));
  assert.ok(typeEl.classes.has('drop-target'));
  drop(list, pointerAt({ type: typeEl }), 10);
  assert.deepEqual(drops, [{ kind: 'device', hierarchy: 'topical', id: 2, overType: 7, overDevice: null, side: null }]);
  assert.equal(typeEl.classes.has('drop-target'), false);
});

test('a device dropped on another device row in a Type is reported before or after it, by pointer half', () => {
  const { list, drops } = bound();
  const row = element({ deviceId: '2' });
  startDrag(list, { closest: (s) => (s.includes('data-device-id') ? row : null), classList: row.classList });
  const typeEl = element({ nodeId: '7', hierarchy: 'topical' });
  const target = element({ deviceId: '1' });
  const at = () => pointerAt({ type: typeEl, row: target });
  over(list, at(), 20);
  assert.ok(target.classes.has('drop-before'));
  drop(list, at(), 20);
  over(list, at(), 80);
  assert.ok(target.classes.has('drop-after') && !target.classes.has('drop-before'));
  drop(list, at(), 80);
  assert.deepEqual(drops.map((d) => [d.overDevice, d.side]), [[1, 'before'], [1, 'after']]);
});

test('dropping a device on itself is not a drop target', () => {
  const { list, drops } = bound();
  const row = element({ deviceId: '2' });
  startDrag(list, { closest: (s) => (s.includes('data-device-id') ? row : null), classList: row.classList });
  const target = pointerAt({ type: element({ nodeId: '7', hierarchy: 'topical' }), row });
  assert.equal(over(list, target, 10), false);
  drop(list, target, 10);
  assert.deepEqual(drops, []);
});

test('a Type dragged by its heading is reported against another Type, never against a device, itself or what is beneath it', () => {
  const { list, drops } = bound();
  const own = element({ nodeId: '7', hierarchy: 'topical' });
  const handle = { ...element(), closest: () => own };
  startDrag(list, { closest: (s) => (s.includes('heading-row') ? handle : null), classList: handle.classList });
  assert.ok(handle.classes.has('dragging'));
  assert.equal(over(list, pointerAt({ type: own }), 10), false);
  const other = element({ nodeId: '9', hierarchy: 'topical' });
  assert.ok(over(list, pointerAt({ type: other, row: element({ deviceId: '1' }) }), 90));
  assert.ok(other.classes.has('drop-after'));
  drop(list, pointerAt({ type: other }), 90);
  assert.deepEqual(drops, [{ kind: 'type', hierarchy: 'topical', id: 7, overType: 9, overDevice: null, side: 'after' }]);
});

test('a Type dropped on the top or bottom quarter of a heading goes beside it, and on the middle goes inside it', () => {
  const { list, drops } = bound();
  const own = element({ nodeId: '7', hierarchy: 'topical' });
  const handle = { ...element(), closest: () => own };
  startDrag(list, { closest: (s) => (s.includes('heading-row') ? handle : null), classList: handle.classList });
  const other = element({ nodeId: '9', hierarchy: 'topical' });
  const at = () => pointerAt({ type: other });
  over(list, at(), 10);
  assert.ok(other.classes.has('drop-before'));
  over(list, at(), 50);
  assert.ok(other.classes.has('drop-target') && !other.classes.has('drop-before'));
  drop(list, at(), 50);
  over(list, at(), 160); // below the heading, over what it holds: still inside it
  assert.ok(other.classes.has('drop-target'));
  drop(list, at(), 160);
  over(list, at(), 90);
  drop(list, at(), 90);
  assert.deepEqual(drops.map((d) => d.side), ['inside', 'inside', 'after']);
});

test('a Type cannot be dropped onto something beneath it', () => {
  const { list, drops } = bound();
  const own = element({ nodeId: '7', hierarchy: 'topical' });
  const child = element({ nodeId: '8', hierarchy: 'topical', parentId: '7' });
  own.contains = (node) => node === own || node === child;
  const handle = { ...element(), closest: () => own };
  startDrag(list, { closest: (s) => (s.includes('heading-row') ? handle : null), classList: handle.classList });
  assert.equal(over(list, pointerAt({ type: child }), 50), false);
  drop(list, pointerAt({ type: child }), 50);
  assert.deepEqual(drops, []);
});

test('a drag that did not start in the list (selected text) lands nowhere', () => {
  const { list, drops } = bound();
  const target = pointerAt({ type: element({ nodeId: '7', hierarchy: 'topical' }) });
  assert.equal(over(list, target, 10), false);
  drop(list, target, 10);
  assert.deepEqual(drops, []);
});

test('dragend clears the highlight and forgets the drag', () => {
  const { list, drops } = bound();
  const row = element({ deviceId: '2' });
  startDrag(list, { closest: (s) => (s.includes('data-device-id') ? row : null), classList: row.classList });
  const typeEl = element({ nodeId: '7', hierarchy: 'topical' });
  over(list, pointerAt({ type: typeEl }), 10);
  list.handlers.dragend({ target: { classList: row.classList } });
  assert.equal(typeEl.classes.has('drop-target'), false);
  assert.equal(row.classes.has('dragging'), false);
  assert.equal(over(list, pointerAt({ type: typeEl }), 10), false);
  assert.deepEqual(drops, []);
});

// ---- Nested Types (four levels) ------------------------------------------------------------------

const nestedTypes = () => [
  { kind: 'node', id: 1, name: 'Place', definition: '', children: [
    { kind: 'node', id: 2, name: 'Sound', definition: '', children: [
      { kind: 'node', id: 3, name: 'Rhythm', definition: '', children: [
        { kind: 'node', id: 4, name: 'Meter', definition: '', children: [{ kind: 'device', id: 1 }] }] }] }] },
];

test('treeLabels lists Types with level and path, and leaves out the derived Unsorted heading', () => {
  const state = topicalState();
  setEditableTree(state, 'topical', [...nestedTypes(), { kind: 'node', id: UNSORTED_ID, name: 'Unsorted', definition: '', children: [] }]);
  assert.deepEqual(treeLabels(state, 'topical').map((l) => [l.id, l.depth, l.path]), [
    [1, 1, 'Place'], [2, 2, 'Place > Sound'], [3, 3, 'Place > Sound > Rhythm'], [4, 4, 'Place > Sound > Rhythm > Meter'],
  ]);
});

test('a fourth-level Type draws, indents and carries its parent id for dragging', () => {
  const state = topicalState();
  setEditableTree(state, 'topical', nestedTypes());
  for (const id of [1, 2, 3, 4]) state.opened.add(openKey('topical', id));
  const container = draw(state);
  const meter = findAll(container, (n) => n.dataset?.nodeId === '4')[0];
  assert.equal(meter.dataset.parentId, '3');
  assert.equal(meter.dataset.droppable, 'true');
  assert.match(viewToText(state, currentView(state)), /Meter/);
});
