import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COMPARATORS, createState, deviceView, setActiveView, setSortOrder, sortedDevices, subtreeView, toggleExpanded, toggleOpened, openWithAncestors,
} from '../app/state.js';
import { currentView, viewToText } from '../app/view.js';
import { payload, plainState } from './fixture.mjs';

const names = (items) => items.map((item) => item.device.name);

function threeDeviceState() {
  const data = payload();
  data.devices[3] = { name: 'Zeugma', definition: 'd', popularity: 50, topical_rank: null, examples: [] };
  data.devices[4] = { name: 'Chiasmus', definition: 'd', popularity: null, topical_rank: 2, examples: [] };
  return createState(data);
}

test('popularity: highest first, unscored after, alphabetically', () => {
  const state = threeDeviceState();
  assert.deepEqual(sortedDevices(state, 'popularity').map((d) => d.name), ['Metaphor', 'Zeugma', 'Anaphora', 'Chiasmus']);
  assert.ok(COMPARATORS.alphabetical({ label: 'a' }, { label: 'B' }) < 0);
});

test('flat sorts render devices only, no heading rows', () => {
  const state = plainState();
  setSortOrder(state, 'alphabetical');
  const view = currentView(state);
  assert.equal(view.mode, 'flat');
  assert.deepEqual(names(view.items), ['Anaphora', 'Metaphor']);
});

test('tree sort renders that hierarchy with its own headings and device leaves', () => {
  const state = plainState();
  setSortOrder(state, 'form');
  const view = currentView(state);
  assert.equal(view.mode, 'tree');
  assert.equal(view.items[0].name, 'Form Root');
  assert.equal(view.items[0].children[0].name, 'Form Type');
  assert.deepEqual(names(view.items[0].children[0].children), ['Metaphor', 'Anaphora']);
});

test('a subtree view shows only that node; switching to another hierarchy drops it', () => {
  const state = plainState();
  state.sortOrder = 'category';
  setActiveView(state, subtreeView('category', 2));
  assert.equal(currentView(state).items[0].name, 'Category Type');
  setSortOrder(state, 'function');
  assert.equal(state.activeView, 'full');
});

test('a device view survives a sort change and shows that device alone', () => {
  const state = plainState();
  setActiveView(state, deviceView(1));
  setSortOrder(state, 'popularity');
  assert.equal(state.activeView, 'device:1');
  assert.deepEqual(names(currentView(state).items), ['Metaphor']);
});

test('search narrows a tree and prunes headings left empty; no query keeps empty headings', () => {
  const state = plainState();
  state.sortOrder = 'category';
  state.query = 'metaph';
  const view = currentView(state);
  assert.deepEqual(names(view.items[0].children[0].children), ['Metaphor']);
  state.query = 'zzzz';
  assert.deepEqual(currentView(state).items, []);
});

test('the same device record is resolved from every tree', () => {
  const state = plainState();
  const seen = [];
  for (const sort of ['category', 'form', 'function']) {
    setSortOrder(state, sort);
    seen.push(currentView(state).items[0].children[0].children[0].device);
  }
  assert.ok(seen.every((device) => device === state.devices.get(1)));
});

test('toggleExpanded flips and reports the new state', () => {
  const state = plainState();
  assert.equal(toggleExpanded(state, 1), true);
  assert.equal(toggleExpanded(state, 1), false);
});

test('copy text follows the toggles, but an expanded device shows both', () => {
  const state = plainState();
  setSortOrder(state, 'alphabetical');
  state.showDefinitions = false;
  state.showAiExamples = false;
  state.showQuotes = false;
  assert.equal(viewToText(state, currentView(state)), '• Anaphora\n• Metaphor');
  toggleExpanded(state, 1);
  assert.equal(
    viewToText(state, currentView(state)),
    '• Anaphora\n• Metaphor\n  a comparison without "like"\n  · carpe diem is a "saying" (Horace)',
  );
});

test('copy of a tree view carries headings with definitions, indented', () => {
  const state = plainState();
  state.sortOrder = 'category';
  state.showAiExamples = false;
  state.showQuotes = false;
  state.showDefinitions = false;
  assert.equal(
    viewToText(state, currentView(state)).split('\n')[0],
    '• Category Root — Category root definition',
  );
  assert.match(viewToText(state, currentView(state)), /\n {2}• Category Type — Category type definition\n {4}• Metaphor/);
});

test('everything search lists a device once per way it is filed, under each group', () => {
  const state = plainState();
  setSortOrder(state, null);
  state.query = 'metaph';
  const view = currentView(state);
  assert.equal(view.mode, 'tree');
  assert.deepEqual(view.items.map((group) => group.name), ['Category', 'Form', 'Function']);
  for (const group of view.items) {
    assert.deepEqual(names(group.children[0].children[0].children), ['Metaphor']);
  }
  const hits = viewToText(state, view).split('\n').filter((line) => line.trim() === '• Metaphor');
  assert.equal(hits.length, 3);
});

test('everything search keeps exact as the default and fuzzy behind the checkbox', () => {
  const state = plainState();
  setSortOrder(state, null);
  state.query = 'metaphr';
  assert.deepEqual(currentView(state).items, []);
  state.fuzzy = true;
  assert.equal(currentView(state).items.length, 3);
});

test('no group selected and no query shows a hint, not the whole database', () => {
  const state = plainState();
  assert.equal(state.sortOrder, null);
  const view = currentView(state);
  assert.deepEqual(view.items, []);
  assert.match(view.hint, /Type to search/);
});

// ---- Reveal mode --------------------------------------------------------------

test('open and closed (the default): a heading with sub-labels starts open, the Types start closed, each with a button', () => {
  const state = createState(payload());
  setSortOrder(state, 'form');
  const view = currentView(state);
  const root = view.items[0];
  const type = root.children[0];
  assert.equal(type.children.length, 0);
  assert.equal(type.foldable, true);
  assert.equal(root.open, true);
  assert.equal(type.open, false);
  assert.equal(type.deviceCount, 2);
  assert.equal(root.deviceCount, 2);
  assert.equal(viewToText(state, view).includes('Metaphor'), false);
});

test('opening a heading shows the devices beneath it; closing it again takes them away', () => {
  const state = createState(payload());
  setSortOrder(state, 'form');
  const typeId = currentView(state).items[0].children[0].id;
  assert.equal(toggleOpened(state, 'form', typeId), true);
  assert.deepEqual(names(currentView(state).items[0].children[0].children), ['Metaphor', 'Anaphora']);
  assert.equal(toggleOpened(state, 'form', typeId), false);
  assert.equal(currentView(state).items[0].children[0].children.length, 0);
});

test('closing a root hides its sub-labels and devices; opening it shows the sub-labels again, still closed', () => {
  const state = createState(payload());
  setSortOrder(state, 'form');
  const rootId = currentView(state).items[0].id;
  assert.equal(toggleOpened(state, 'form', rootId), false);
  assert.equal(currentView(state).items[0].children.length, 0);
  assert.equal(toggleOpened(state, 'form', rootId), true);
  const type = currentView(state).items[0].children[0];
  assert.equal(type.children.length, 0);
  assert.equal(type.open, false);
});

test('openWithAncestors opens the heading and every heading above it, and leaves an unknown one alone', () => {
  const state = createState(payload());
  setSortOrder(state, 'form');
  const view = currentView(state);
  const [rootId, typeId] = [view.items[0].id, view.items[0].children[0].id];
  state.opened.clear();
  openWithAncestors(state, 'form', typeId);
  assert.deepEqual([...state.opened].sort(), [`form:${rootId}`, `form:${typeId}`].sort());
  openWithAncestors(state, 'form', 99999);
  assert.equal(state.opened.size, 2);
});

test('reveal off lists every device with no reveal buttons', () => {
  const state = createState(payload());
  state.reveal = false;
  setSortOrder(state, 'form');
  const type = currentView(state).items[0].children[0];
  assert.equal(type.children.length, 2);
  assert.equal(type.foldable, false);
});

test('searching lists its matches in full, and an isolated heading shows all beneath it', () => {
  const state = createState(payload());
  setSortOrder(state, 'form');
  state.query = 'meta';
  assert.deepEqual(names(currentView(state).items[0].children[0].children), ['Metaphor']);
  state.query = '';
  const typeId = currentView(state).items[0].children[0].id;
  setActiveView(state, subtreeView('form', typeId));
  assert.equal(currentView(state).items[0].children.length, 2);
});
