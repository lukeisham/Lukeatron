import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, setSortOrder, sortedEntries } from '../app/state.js';
import { renderList } from '../app/render.js';
import { currentView, viewToText } from '../app/view.js';
import { fakeDoc, findAll, withClass } from './fake-dom.mjs';
import { payload } from './fixture.mjs';

// The fixture plus a third entry, "Shared Ground", filed as the Counterpart of Metaphor (id 1).
function counterpartState() {
  const data = payload();
  data.entries[3] = {
    name: 'Shared Ground', definition: 'd', ai_confidence_rating: 'low',
    counterpart_of: 1, examples: [],
  };
  data.trees.brainstorming[0].children[0].children.push({ kind: 'entry', id: 3 });
  const state = createState(data);
  state.reveal = false;
  return state;
}

test('a Counterpart shows as [Form]/[Counterpart]; an ordinary entry keeps its own name', () => {
  const state = counterpartState();
  assert.equal(state.entries.get(3).label, 'Metaphor/Shared Ground');
  assert.equal(state.entries.get(1).label, 'Metaphor');
});

test('the list row, the copy text and search all use the combined name', () => {
  const state = counterpartState();
  state.sortOrder = 'brainstorming';
  const container = fakeDoc.createElement('div');
  renderList(fakeDoc, container, state, currentView(state));
  const names = findAll(container, withClass('entry-name')).map((n) => n.textContent);
  assert.ok(names.includes('Metaphor/Shared Ground'));
  assert.match(viewToText(state, currentView(state)), /• Metaphor\/Shared Ground/);
  state.query = 'metaphor/shared';
  assert.deepEqual(currentView(state).items[0].children[0].children.map((i) => i.entry.label), ['Metaphor/Shared Ground']);
});

test('flat sorts order by the combined name', () => {
  const state = counterpartState();
  assert.deepEqual(sortedEntries(state, 'alphabetical').map((d) => d.label), ['Anaphora', 'Metaphor', 'Metaphor/Shared Ground']);
});

test('a Counterpart pointing at a missing base falls back to its own name', () => {
  const data = payload();
  data.entries[2].counterpart_of = 99;
  const warn = console.warn;
  console.warn = () => {};
  try {
    assert.equal(createState(data).entries.get(2).label, 'Anaphora');
  } finally {
    console.warn = warn;
  }
});
