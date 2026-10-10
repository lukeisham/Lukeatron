import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, setActiveView, setSortOrder, toggleExpanded } from '../app/state.js';
import { renderCount, renderList, renderSortButtons } from '../app/render.js';
import { SORTS } from '../app/state.js';
import { currentView } from '../app/view.js';
import { fakeDoc, findAll, withClass } from './fake-dom.mjs';
import { payload, plainState } from './fixture.mjs';

function draw(state) {
  const container = fakeDoc.createElement('div');
  renderList(fakeDoc, container, state, currentView(state));
  return container;
}

test('tree view: headings carry their node id and hierarchy, entries sit beneath', () => {
  const state = plainState();
  state.sortOrder = 'templates';
  const container = draw(state);
  const [root] = findAll(container, withClass('node-root'));
  assert.equal(root.dataset.nodeId, '1');
  assert.equal(root.dataset.hierarchy, 'templates');
  assert.equal(findAll(root, withClass('entry')).length, 2);
});

test('flat view: entries only, no headings', () => {
  const state = plainState();
  setSortOrder(state, 'alphabetical');
  const container = draw(state);
  assert.equal(findAll(container, withClass('node')).length, 0);
  assert.deepEqual(findAll(container, withClass('entry-name')).map((n) => n.textContent), ['Anaphora', 'Metaphor']);
});

test('entry text is a text node, never markup: a script tag renders as literal text', () => {
  const state = plainState();
  state.sortOrder = 'templates';
  const container = draw(state);
  const definitions = findAll(container, withClass('entry-definition')).map((n) => n.textContent);
  assert.ok(definitions.includes('<script>alert(1)</script>'));
  assert.equal(findAll(container, (n) => n.tag === 'script').length, 0);
});

test('examples: Latin is an italic em, quotes and bracketed source stay literal, small-dot marker', () => {
  const state = plainState();
  state.sortOrder = 'templates';
  const container = draw(state);
  const [latin] = findAll(container, withClass('latin'));
  assert.equal(latin.tag, 'em');
  assert.equal(latin.textContent, 'diem');
  const [example] = findAll(container, withClass('example'));
  assert.equal(example.textContent, 'carpe diem is a "saying" (Horace)');
});

test('the same entry renders identically from two different trees', () => {
  const state = plainState();
  state.sortOrder = 'templates';
  const rowText = () => findAll(draw(state), (n) => n.dataset.entryId === '1')[0].textContent;
  const fromTemplates = rowText();
  setSortOrder(state, 'brainstorming');
  assert.equal(rowText(), fromTemplates);
});

test('expanded state and the isolated view are reflected in the rows', () => {
  const state = plainState();
  state.sortOrder = 'templates';
  toggleExpanded(state, 2);
  const open = findAll(draw(state), (n) => n.dataset.entryId === '2')[0];
  assert.match(open.className, /expanded/);
  assert.equal(open.children[0].attributes['aria-expanded'], 'true');

  setActiveView(state, 'entry:1');
  const container = draw(state);
  assert.equal(findAll(container, withClass('entry')).length, 1);
  assert.match(findAll(container, withClass('entry'))[0].className, /expanded/);
});

test('no match shows a message instead of an empty list', () => {
  const state = plainState();
  state.query = 'qqqq';
  assert.equal(draw(state).textContent, 'No elements match.');
});

test('sort buttons mark exactly the active order pressed', () => {
  const container = fakeDoc.createElement('div');
  renderSortButtons(fakeDoc, container, SORTS, 'brainstorming');
  const pressed = container.children.filter((b) => b.attributes['aria-pressed'] === 'true');
  assert.deepEqual(pressed.map((b) => b.dataset.sort), ['brainstorming']);
  assert.equal(container.children.length, SORTS.length);
});

test('each entry row carries an AI-confidence badge showing its rating', () => {
  const state = plainState();
  setSortOrder(state, 'alphabetical');
  const badges = findAll(draw(state), withClass('confidence-badge'));
  assert.deepEqual(badges.map((b) => [b.textContent, b.dataset.rating]), [['AI low', 'low'], ['AI high', 'high']]);
});

test('a heading with something beneath it gets a button that says how many entries it holds and whether it is open', () => {
  const state = createState(payload());
  setSortOrder(state, 'brainstorming');
  const buttons = findAll(draw(state), withClass('reveal-toggle'));
  assert.deepEqual(buttons.map((b) => b.textContent), ['▾ 2', '▸ 2']);
  assert.equal(buttons[0].attributes['aria-expanded'], 'true');
  assert.equal(buttons[1].attributes['aria-expanded'], 'false');
  assert.match(buttons[0].attributes['aria-label'], /^Close Brainstorming Root, 2 elements/);
  assert.match(buttons[1].attributes['aria-label'], /^Open /);
  assert.equal(findAll(draw(state), withClass('entry')).length, 0);
});

test('no reveal buttons when reveal is off, in flat sorts or while searching', () => {
  const state = createState(payload());
  state.reveal = false;
  setSortOrder(state, 'brainstorming');
  assert.equal(findAll(draw(state), withClass('reveal-toggle')).length, 0);
  state.reveal = true;
  setSortOrder(state, 'alphabetical');
  assert.equal(findAll(draw(state), withClass('reveal-toggle')).length, 0);
});

test('the entry count states the whole collection, singular for one', () => {
  const span = fakeDoc.createElement('span');
  renderCount(span, 272);
  assert.equal(span.textContent, '· 272 elements');
  renderCount(span, 1);
  assert.equal(span.textContent, '· 1 element');
});

test('the entry count names the types separately once there are any', () => {
  const span = fakeDoc.createElement('span');
  renderCount(span, 3, 2);
  assert.equal(span.textContent, '· 3 elements, 2 types');
  renderCount(span, 3, 1);
  assert.equal(span.textContent, '· 3 elements, 1 type');
});

test('markers: a top-level label is the largest dot, a label below it large, an empty label an outlined circle, an entry medium, an example small', () => {
  const state = plainState();
  state.sortOrder = 'labels';
  const container = draw(state);
  const sizeOf = (marker) => marker.className.split(' ').find((name) => name.startsWith('marker-'));
  const headingMarkers = findAll(container, withClass('heading-row')).map((row) => sizeOf(findAll(row, withClass('marker'))[0]));
  assert.deepEqual(headingMarkers, ['marker-top', 'marker-large', 'marker-empty']);
  assert.ok(findAll(container, withClass('entry-row')).every((row) => sizeOf(findAll(row, withClass('marker'))[0]) === 'marker-medium'));
  assert.ok(findAll(container, withClass('example')).every((item) => sizeOf(findAll(item, withClass('marker'))[0]) === 'marker-small'));
});
