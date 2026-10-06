import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, deviceView, setActiveView } from '../app/state.js';
import { renderList } from '../app/render.js';
import { currentView, viewToText } from '../app/view.js';
import { loadToggles, saveToggles } from '../app/settings.js';
import { fakeDoc, findAll, withClass } from './fake-dom.mjs';
import { payload } from './fixture.mjs';

function stateOn(deviceId) {
  const state = createState(payload());
  setActiveView(state, deviceView(deviceId));
  return state;
}

function draw(state) {
  const container = fakeDoc.createElement('div');
  renderList(fakeDoc, container, state, currentView(state));
  return container;
}

test('Labels and Types are off by default: a single device shows no filings', () => {
  const state = stateOn(2);
  assert.equal(state.showLabels, false);
  assert.equal(state.showTypes, false);
  assert.equal(findAll(draw(state), withClass('device-filings')).length, 0);
  assert.doesNotMatch(viewToText(state, currentView(state)), /Labels:|Types:/);
});

test('Show Labels lists every Grammar label holding the device, as a path', () => {
  const state = stateOn(2);
  state.showLabels = true;
  const [item] = currentView(state).items;
  assert.deepEqual(item.filings, { labels: ['Clause', 'Clause > Independent clause'], types: null });
  assert.match(viewToText(state, currentView(state)), /Labels: Clause; Clause > Independent clause/);
  assert.doesNotMatch(viewToText(state, currentView(state)), /Types:/);
  assert.equal(findAll(draw(state), withClass('device-filings')).length, 1);
});

test('Show Types lists the Topical Types; the derived Unsorted heading is not a Type', () => {
  const state = stateOn(1);
  state.showTypes = true;
  assert.deepEqual(currentView(state).items[0].filings.types, ['Irony']);
  const unsorted = stateOn(2);
  unsorted.showTypes = true;
  assert.deepEqual(currentView(unsorted).items[0].filings.types, []);
  assert.match(viewToText(unsorted, currentView(unsorted)), /Types: none/);
});

test('filings appear only in a single device view, not in a group list', () => {
  const state = createState(payload());
  state.showLabels = true;
  state.showTypes = true;
  state.sortOrder = 'topical';
  assert.equal(findAll(draw(state), withClass('device-filings')).length, 0);
});

test('both options are saved between visits', () => {
  const store = {};
  const storage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v; } };
  saveToggles(storage, { showLabels: true, showTypes: true });
  const saved = loadToggles(storage);
  assert.equal(saved.showLabels, true);
  assert.equal(saved.showTypes, true);
});
