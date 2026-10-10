import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COMPARATORS, createState, entryView, setActiveView, setSortOrder, sortedEntries, subtreeView, toggleExpanded, toggleOpened, openWithAncestors,
} from '../app/state.js';
import { currentView, viewToText } from '../app/view.js';
import { payload, plainState } from './fixture.mjs';

const names = (items) => items.map((item) => item.entry.name);

function threeEntryState() {
  const data = payload();
  data.entries[3] = { name: 'Zeugma', definition: 'd', examples: [] };
  data.entries[4] = { name: 'Chiasmus', definition: 'd', examples: [] };
  return createState(data);
}

test('alphabetical: by name, ignoring case', () => {
  const state = threeEntryState();
  assert.deepEqual(sortedEntries(state, 'alphabetical').map((d) => d.name), ['Anaphora', 'Chiasmus', 'Metaphor', 'Zeugma']);
  assert.ok(COMPARATORS.alphabetical({ label: 'a' }, { label: 'B' }) < 0);
});

test('flat sorts render entries only, no heading rows', () => {
  const state = plainState();
  setSortOrder(state, 'alphabetical');
  const view = currentView(state);
  assert.equal(view.mode, 'flat');
  assert.deepEqual(names(view.items), ['Anaphora', 'Metaphor']);
});

test('tree sort renders that hierarchy with its own headings and entry leaves', () => {
  const state = plainState();
  setSortOrder(state, 'brainstorming');
  const view = currentView(state);
  assert.equal(view.mode, 'tree');
  assert.equal(view.items[0].name, 'Brainstorming Root');
  assert.equal(view.items[0].children[0].name, 'Brainstorming Type');
  assert.deepEqual(names(view.items[0].children[0].children), ['Metaphor', 'Anaphora']);
});

test('a subtree view shows only that node; switching to another hierarchy drops it', () => {
  const state = plainState();
  state.sortOrder = 'templates';
  setActiveView(state, subtreeView('templates', 2));
  assert.equal(currentView(state).items[0].name, 'Templates Type');
  setSortOrder(state, 'research');
  assert.equal(state.activeView, 'full');
});

test('an entry view survives a sort change and shows that entry alone', () => {
  const state = plainState();
  setActiveView(state, entryView(1));
  setSortOrder(state, 'topical');
  assert.equal(state.activeView, 'entry:1');
  assert.deepEqual(names(currentView(state).items), ['Metaphor']);
});

test('search narrows a tree and prunes headings left empty; no query keeps empty headings', () => {
  const state = plainState();
  state.sortOrder = 'templates';
  state.query = 'metaph';
  const view = currentView(state);
  assert.deepEqual(names(view.items[0].children[0].children), ['Metaphor']);
  state.query = 'zzzz';
  assert.deepEqual(currentView(state).items, []);
});

test('the same entry record is resolved from every tree', () => {
  const state = plainState();
  const seen = [];
  for (const sort of ['templates', 'brainstorming', 'research']) {
    setSortOrder(state, sort);
    seen.push(currentView(state).items[0].children[0].children[0].entry);
  }
  assert.ok(seen.every((entry) => entry === state.entries.get(1)));
});

test('toggleExpanded flips and reports the new state', () => {
  const state = plainState();
  assert.equal(toggleExpanded(state, 1), true);
  assert.equal(toggleExpanded(state, 1), false);
});

test('copy text follows the toggles, but an expanded entry shows both', () => {
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
  state.sortOrder = 'templates';
  state.showAiExamples = false;
  state.showQuotes = false;
  state.showDefinitions = false;
  assert.equal(
    viewToText(state, currentView(state)).split('\n')[0],
    '• Templates Root — Templates root definition',
  );
  assert.match(viewToText(state, currentView(state)), /\n {2}• Templates Type — Templates type definition\n {4}• Metaphor/);
});

test('everything search lists an entry once per way it is filed, under each group', () => {
  const state = plainState();
  setSortOrder(state, null);
  state.query = 'metaph';
  const view = currentView(state);
  assert.equal(view.mode, 'tree');
  assert.deepEqual(view.items.map((group) => group.name), ['Templates', 'Brainstorming', 'Research', 'Topical']);
  for (const group of view.items) {
    assert.deepEqual(names(group.children[0].children[0].children), ['Metaphor']);
  }
  const hits = viewToText(state, view).split('\n').filter((line) => line.trim() === '• Metaphor');
  assert.equal(hits.length, 4);
});

test('everything search keeps exact as the default and fuzzy behind the checkbox', () => {
  const state = plainState();
  setSortOrder(state, null);
  state.query = 'metaphr';
  assert.deepEqual(currentView(state).items, []);
  state.fuzzy = true;
  assert.equal(currentView(state).items.length, 4);
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
  setSortOrder(state, 'brainstorming');
  const view = currentView(state);
  const root = view.items[0];
  const type = root.children[0];
  assert.equal(type.children.length, 0);
  assert.equal(type.foldable, true);
  assert.equal(root.open, true);
  assert.equal(type.open, false);
  assert.equal(type.entryCount, 2);
  assert.equal(root.entryCount, 2);
  assert.equal(viewToText(state, view).includes('Metaphor'), false);
});

test('opening a heading shows the entries beneath it; closing it again takes them away', () => {
  const state = createState(payload());
  setSortOrder(state, 'brainstorming');
  const typeId = currentView(state).items[0].children[0].id;
  assert.equal(toggleOpened(state, 'brainstorming', typeId), true);
  assert.deepEqual(names(currentView(state).items[0].children[0].children), ['Metaphor', 'Anaphora']);
  assert.equal(toggleOpened(state, 'brainstorming', typeId), false);
  assert.equal(currentView(state).items[0].children[0].children.length, 0);
});

test('closing a root hides its sub-labels and entries; opening it shows the sub-labels again, still closed', () => {
  const state = createState(payload());
  setSortOrder(state, 'brainstorming');
  const rootId = currentView(state).items[0].id;
  assert.equal(toggleOpened(state, 'brainstorming', rootId), false);
  assert.equal(currentView(state).items[0].children.length, 0);
  assert.equal(toggleOpened(state, 'brainstorming', rootId), true);
  const type = currentView(state).items[0].children[0];
  assert.equal(type.children.length, 0);
  assert.equal(type.open, false);
});

test('openWithAncestors opens the heading and every heading above it, and leaves an unknown one alone', () => {
  const state = createState(payload());
  setSortOrder(state, 'brainstorming');
  const view = currentView(state);
  const [rootId, typeId] = [view.items[0].id, view.items[0].children[0].id];
  state.opened.clear();
  openWithAncestors(state, 'brainstorming', typeId);
  assert.deepEqual([...state.opened].sort(), [`brainstorming:${rootId}`, `brainstorming:${typeId}`].sort());
  openWithAncestors(state, 'brainstorming', 99999);
  assert.equal(state.opened.size, 2);
});

test('reveal off lists every entry with no reveal buttons', () => {
  const state = createState(payload());
  state.reveal = false;
  setSortOrder(state, 'brainstorming');
  const type = currentView(state).items[0].children[0];
  assert.equal(type.children.length, 2);
  assert.equal(type.foldable, false);
});

test('searching lists its matches in full, and an isolated heading shows all beneath it', () => {
  const state = createState(payload());
  setSortOrder(state, 'brainstorming');
  state.query = 'meta';
  assert.deepEqual(names(currentView(state).items[0].children[0].children), ['Metaphor']);
  state.query = '';
  const typeId = currentView(state).items[0].children[0].id;
  setActiveView(state, subtreeView('brainstorming', typeId));
  assert.equal(currentView(state).items[0].children.length, 2);
});
