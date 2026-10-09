import test from 'node:test';
import assert from 'node:assert/strict';
import { COMPARE, createState, counterpartPairs, setComparePair, setSortOrder } from '../app/state.js';
import { renderCompareBar, renderList } from '../app/render.js';
import { currentView, viewToText } from '../app/view.js';
import { fakeDoc, findAll, withClass } from './fake-dom.mjs';
import { payload } from './fixture.mjs';

// The fixture plus two Counterparts: "Shared Ground" answers Metaphor (id 1), "Flagged Pun" answers Anaphora (id 2).
function compareState() {
  const data = payload();
  data.entries[3] = { name: 'Shared Ground', definition: 'fair use of metaphor', popularity: 10, ai_confidence_rating: 'medium', counterpart_of: 1, examples: ['the *common* ground'] };
  data.entries[4] = { name: 'Flagged Pun', definition: 'an announced pun', popularity: 5, ai_confidence_rating: 'low', counterpart_of: 2, examples: [] };
  const state = createState(data);
  setSortOrder(state, COMPARE);
  return state;
}

test('pairs list each Counterpart beside its base, in the base\'s alphabetical order', () => {
  const pairs = counterpartPairs(compareState());
  assert.deepEqual(pairs.map((p) => [p.base.name, p.counterpart.name]), [['Anaphora', 'Flagged Pun'], ['Metaphor', 'Shared Ground']]);
});

test('a Counterpart whose base is missing is left out of the pairs', () => {
  const state = compareState();
  state.entries.get(3).counterpartOf = 99;
  assert.deepEqual(counterpartPairs(state).map((p) => p.counterpart.name), ['Flagged Pun']);
});

test('the view shows the first pair until one is chosen, then the chosen pair', () => {
  const state = compareState();
  assert.equal(currentView(state).current.counterpart.name, 'Flagged Pun');
  setComparePair(state, 3);
  const view = currentView(state);
  assert.equal(view.mode, 'compare');
  assert.equal(view.current.counterpart.name, 'Shared Ground');
  assert.equal(view.pairs.length, 2);
});

test('a search narrows the pairs by either name and falls back to the first match', () => {
  const state = compareState();
  setComparePair(state, 3);
  state.query = 'pun';
  const view = currentView(state);
  assert.deepEqual(view.pairs.map((p) => p.counterpart.name), ['Flagged Pun']);
  assert.equal(view.current.counterpart.name, 'Flagged Pun');
  state.query = 'metaphor';
  assert.equal(currentView(state).current.counterpart.name, 'Shared Ground');
  state.query = 'zzz';
  assert.equal(currentView(state).current, null);
});

test('the table has a Name, Definition and Examples row with a cell per side', () => {
  const state = compareState();
  setComparePair(state, 3);
  const container = fakeDoc.createElement('div');
  renderList(fakeDoc, container, state, currentView(state));
  const rows = findAll(container, withClass('compare-row'));
  assert.deepEqual(rows.map((r) => r.children[0].textContent), ['Name', 'Definition', 'Examples']);
  const names = findAll(container, withClass('entry-name')).map((n) => n.textContent);
  assert.deepEqual(names, ['Metaphor', 'Shared Ground']); // bare names, not the Form/Counterpart label
  assert.match(container.textContent, /fair use of metaphor/);
  assert.match(container.textContent, /the common ground/);
});

test('an empty search shows a message instead of a table', () => {
  const state = compareState();
  state.query = 'zzz';
  const container = fakeDoc.createElement('div');
  renderList(fakeDoc, container, state, currentView(state));
  assert.equal(container.textContent, 'No form matches.');
});

test('the picker lists the forms and disables Prev and Next at the ends', () => {
  const state = compareState();
  const parts = { pick: fakeDoc.createElement('select'), prev: fakeDoc.createElement('button'), next: fakeDoc.createElement('button'), count: fakeDoc.createElement('span') };
  renderCompareBar(fakeDoc, parts, currentView(state));
  assert.deepEqual(parts.pick.children.map((o) => o.textContent), ['Anaphora', 'Metaphor']);
  assert.deepEqual(parts.pick.children.map((o) => o.value), ['4', '3']);
  assert.equal(parts.prev.disabled, true);
  assert.equal(parts.next.disabled, false);
  assert.equal(parts.count.textContent, '1 of 2');
  setComparePair(state, 3);
  renderCompareBar(fakeDoc, parts, currentView(state));
  assert.equal(parts.next.disabled, true);
  assert.equal(parts.count.textContent, '2 of 2');
});

test('Copy writes both sides and honours the table\'s three switches', () => {
  const state = compareState();
  setComparePair(state, 3);
  assert.equal(viewToText(state, currentView(state)), [
    '• Form: Metaphor', '  a comparison without "like"', '  □ carpe diem is a "saying" (Horace)', '',
    '• Counterpart: Shared Ground', '  fair use of metaphor', '  □ the common ground',
  ].join('\n'));
  state.tableNames = false;
  state.tableExamples = false;
  assert.equal(viewToText(state, currentView(state)), ['• Form', '  a comparison without "like"', '', '• Counterpart', '  fair use of metaphor'].join('\n'));
  state.tableDefinitions = false;
  assert.equal(viewToText(state, currentView(state)), '• Form\n\n• Counterpart');
});
