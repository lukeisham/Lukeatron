import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, setSortOrder } from '../app/state.js';
import { renderList } from '../app/render.js';
import { currentView, viewToText } from '../app/view.js';
import { fakeDoc, findAll, withClass } from './fake-dom.mjs';

// Topic 1 (Metaphor); types 2 (Figures, holding type 3 and topic 1) and 3 (Tropes, holding topic 1);
// Figures sits at the top of Templates and Research, Tropes is also listed in Alphabetical and sits nowhere else.
function typedState() {
  const leaf = (id) => ({ kind: 'entry', id });
  const tropes = { kind: 'node', type: true, id: 3, name: 'Tropes', definition: 'figures of meaning', children: [leaf(1)] };
  const figures = { kind: 'node', type: true, id: 2, name: 'Figures', definition: 'devices of style', children: [tropes, leaf(1)] };
  const state = createState({
    trees: { templates: [figures], brainstorming: [], research: [figures], topical: [], labels: [] },
    quotes: [],
    entries: {
      1: { name: 'Metaphor', kind: 'entry', definition: 'a comparison', ai_confidence_rating: 'high', examples: ['all the *world*'] },
      2: { name: 'Figures', kind: 'type', definition: 'devices of style', ai_confidence_rating: 'medium', examples: ['a *figure* of speech'] },
      3: { name: 'Tropes', kind: 'type', definition: 'figures of meaning', ai_confidence_rating: 'low', examples: [] },
    },
  });
  state.reveal = false;
  return state;
}

const draw = (state) => {
  const container = fakeDoc.createElement('div');
  renderList(fakeDoc, container, state, currentView(state));
  return container;
};

test('Alphabetical lists types and topics together, each type tagged', () => {
  const state = typedState();
  setSortOrder(state, 'alphabetical');
  const view = currentView(state);
  assert.deepEqual(view.items.map((item) => item.entry.name), ['Figures', 'Metaphor', 'Tropes']);
  const container = draw(state);
  const badges = findAll(container, withClass('kind-badge')).map((badge) => badge.textContent);
  assert.deepEqual(badges, ['Type', 'Type']);
});

test('in a group a type is a heading holding types and topics, with its own rating and example', () => {
  const state = typedState();
  setSortOrder(state, 'templates');
  const [figures] = currentView(state).items;
  assert.equal(figures.entry.name, 'Figures');
  assert.deepEqual(figures.children.map((child) => child.kind === 'node' ? child.name : child.entry.name), ['Tropes', 'Metaphor']);
  const container = draw(state);
  assert.equal(findAll(container, withClass('node')).length, 2);
  assert.equal(findAll(container, withClass('confidence-badge')).length, 4); // Figures, Tropes, and Metaphor under each of them
  assert.equal(findAll(container, withClass('node-examples')).length, 1); // only Figures has an example
});

test('a type listed in two groups shows the same contents in each', () => {
  const state = typedState();
  setSortOrder(state, 'templates');
  const first = currentView(state).items[0].children.length;
  setSortOrder(state, 'research');
  assert.equal(currentView(state).items[0].children.length, first);
});

test('search keeps a type whose own name matches even when nothing it holds does', () => {
  const state = typedState();
  setSortOrder(state, 'templates');
  state.query = 'figures';
  const items = currentView(state).items;
  assert.deepEqual(items.map((item) => item.name), ['Figures']);
  assert.deepEqual(items[0].children, []);
});

test('copy text carries a type heading, its example when examples are on, then what it holds', () => {
  const state = typedState();
  setSortOrder(state, 'templates');
  state.showDefinitions = false;
  state.showAiExamples = true;
  state.showQuotes = true;
  const lines = viewToText(state, currentView(state)).split('\n');
  assert.equal(lines[0], '• Figures — devices of style');
  assert.equal(lines[1], '  · a figure of speech');
  assert.ok(lines.includes('  • Tropes — figures of meaning'));
  state.showAiExamples = false;
  state.showQuotes = false;
  assert.ok(!viewToText(state, currentView(state)).includes('a figure of speech'));
});
