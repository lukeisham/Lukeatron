import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, entryView, setActiveView } from '../app/state.js';
import { renderList } from '../app/render.js';
import { currentView, viewToText } from '../app/view.js';
import { loadToggles, saveToggles } from '../app/settings.js';
import { fakeDoc, findAll, withClass } from './fake-dom.mjs';
import { payload } from './fixture.mjs';

function stateOn(entryId) {
  const state = createState(payload());
  setActiveView(state, entryView(entryId));
  return state;
}

function draw(state) {
  const container = fakeDoc.createElement('div');
  renderList(fakeDoc, container, state, currentView(state));
  return container;
}

test('Labels are off by default: a single entry shows no filings', () => {
  const state = stateOn(2);
  assert.equal(state.showLabels, false);
  assert.equal(findAll(draw(state), withClass('entry-filings')).length, 0);
  assert.doesNotMatch(viewToText(state, currentView(state)), /Labels:/);
});

test('Show Labels lists every label holding the entry, as a path', () => {
  const state = stateOn(2);
  state.showLabels = true;
  const [item] = currentView(state).items;
  assert.deepEqual(item.filings, { labels: ['Clause', 'Clause > Independent clause'] });
  assert.match(viewToText(state, currentView(state)), /Labels: Clause; Clause > Independent clause/);
  assert.equal(findAll(draw(state), withClass('entry-filings')).length, 1);
});

test('an entry filed under no label says none', () => {
  const state = stateOn(1);
  state.showLabels = true;
  assert.deepEqual(currentView(state).items[0].filings.labels, []);
  assert.match(viewToText(state, currentView(state)), /Labels: none/);
});

test('filings appear only in a single entry view, not in a group list', () => {
  const state = createState(payload());
  state.showLabels = true;
  state.sortOrder = 'labels';
  assert.equal(findAll(draw(state), withClass('entry-filings')).length, 0);
});

test('the option is saved between visits', () => {
  const store = {};
  const storage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v; } };
  saveToggles(storage, { showLabels: true });
  assert.equal(loadToggles(storage).showLabels, true);
});
