import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, setSortOrder, sortedDevices } from '../app/state.js';
import { renderList } from '../app/render.js';
import { currentView, viewToText } from '../app/view.js';
import { fakeDoc, findAll, withClass } from './fake-dom.mjs';
import { payload } from './fixture.mjs';

// The fixture plus a third device, "Shared Ground", filed as the Flipside of Metaphor (id 1).
function flipsideState() {
  const data = payload();
  data.devices[3] = {
    name: 'Shared Ground', definition: 'd', popularity: 10, ai_confidence_rating: 'low',
    topical_rank: null, flipside_of: 1, examples: [],
  };
  data.trees.form[0].children[0].children.push({ kind: 'device', id: 3 });
  const state = createState(data);
  state.reveal = false;
  return state;
}

test('a Flipside shows as [Fallacy]/[Flipside]; an ordinary device keeps its own name', () => {
  const state = flipsideState();
  assert.equal(state.devices.get(3).label, 'Metaphor/Shared Ground');
  assert.equal(state.devices.get(1).label, 'Metaphor');
});

test('the list row, the copy text and search all use the combined name', () => {
  const state = flipsideState();
  state.sortOrder = 'form';
  const container = fakeDoc.createElement('div');
  renderList(fakeDoc, container, state, currentView(state));
  const names = findAll(container, withClass('device-name')).map((n) => n.textContent);
  assert.ok(names.includes('Metaphor/Shared Ground'));
  assert.match(viewToText(state, currentView(state)), /• Metaphor\/Shared Ground/);
  state.query = 'metaphor/shared';
  assert.deepEqual(currentView(state).items[0].children[0].children.map((i) => i.device.label), ['Metaphor/Shared Ground']);
});

test('flat sorts order by the combined name', () => {
  const state = flipsideState();
  assert.deepEqual(sortedDevices(state, 'alphabetical').map((d) => d.label), ['Anaphora', 'Metaphor', 'Metaphor/Shared Ground']);
});

test('a Flipside pointing at a missing fallacy falls back to its own name', () => {
  const data = payload();
  data.devices[2].flipside_of = 99;
  const warn = console.warn;
  console.warn = () => {};
  try {
    assert.equal(createState(data).devices.get(2).label, 'Anaphora');
  } finally {
    console.warn = warn;
  }
});
