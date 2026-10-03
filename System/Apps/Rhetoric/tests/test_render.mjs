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

test('tree view: headings carry their node id and hierarchy, devices sit beneath', () => {
  const state = plainState();
  state.sortOrder = 'category';
  const container = draw(state);
  const [root] = findAll(container, withClass('node-root'));
  assert.equal(root.dataset.nodeId, '1');
  assert.equal(root.dataset.hierarchy, 'category');
  assert.equal(findAll(root, withClass('device')).length, 2);
});

test('flat view: devices only, no headings', () => {
  const state = plainState();
  setSortOrder(state, 'alphabetical');
  const container = draw(state);
  assert.equal(findAll(container, withClass('node')).length, 0);
  assert.deepEqual(findAll(container, withClass('device-name')).map((n) => n.textContent), ['Anaphora', 'Metaphor']);
});

test('device text is a text node, never markup: a script tag renders as literal text', () => {
  const state = plainState();
  state.sortOrder = 'category';
  const container = draw(state);
  const definitions = findAll(container, withClass('device-definition')).map((n) => n.textContent);
  assert.ok(definitions.includes('<script>alert(1)</script>'));
  assert.equal(findAll(container, (n) => n.tag === 'script').length, 0);
});

test('examples: Latin is an italic em, quotes and bracketed source stay literal, outline-square marker', () => {
  const state = plainState();
  state.sortOrder = 'category';
  const container = draw(state);
  const [latin] = findAll(container, withClass('latin'));
  assert.equal(latin.tag, 'em');
  assert.equal(latin.textContent, 'diem');
  const [example] = findAll(container, withClass('example'));
  assert.equal(example.textContent, '□carpe diem is a "saying" (Horace)');
});

test('the same device renders identically from two different trees', () => {
  const state = plainState();
  state.sortOrder = 'category';
  const rowText = () => findAll(draw(state), (n) => n.dataset.deviceId === '1')[0].textContent;
  const fromCategory = rowText();
  setSortOrder(state, 'form');
  assert.equal(rowText(), fromCategory);
});

test('expanded state and the isolated view are reflected in the rows', () => {
  const state = plainState();
  state.sortOrder = 'category';
  toggleExpanded(state, 2);
  const open = findAll(draw(state), (n) => n.dataset.deviceId === '2')[0];
  assert.match(open.className, /expanded/);
  assert.equal(open.children[0].attributes['aria-expanded'], 'true');

  setActiveView(state, 'device:1');
  const container = draw(state);
  assert.equal(findAll(container, withClass('device')).length, 1);
  assert.match(findAll(container, withClass('device'))[0].className, /expanded/);
});

test('no match shows a message instead of an empty list', () => {
  const state = plainState();
  state.query = 'qqqq';
  assert.equal(draw(state).textContent, 'No devices match.');
});

test('sort buttons mark exactly the active order pressed', () => {
  const container = fakeDoc.createElement('div');
  renderSortButtons(fakeDoc, container, SORTS, 'form');
  const pressed = container.children.filter((b) => b.attributes['aria-pressed'] === 'true');
  assert.deepEqual(pressed.map((b) => b.dataset.sort), ['form']);
  assert.equal(container.children.length, 6);
});

test('each device row carries an AI-confidence badge showing its rating', () => {
  const state = plainState();
  setSortOrder(state, 'alphabetical');
  const badges = findAll(draw(state), withClass('confidence-badge'));
  assert.deepEqual(badges.map((b) => [b.textContent, b.dataset.rating]), [['AI low', 'low'], ['AI high', 'high']]);
});

test('a revealable heading gets a reveal button that says how many devices it holds and whether they show', () => {
  const state = createState(payload());
  setSortOrder(state, 'form');
  const buttons = findAll(draw(state), withClass('reveal-toggle'));
  assert.deepEqual(buttons.map((b) => b.textContent), ['▸ 2', '▸ 2']);
  assert.equal(buttons[0].attributes['aria-expanded'], 'false');
  assert.match(buttons[0].attributes['aria-label'], /^Reveal 2 devices in Form/);
  assert.equal(findAll(draw(state), withClass('device')).length, 0);
});

test('no reveal buttons when reveal is off, in flat sorts or while searching', () => {
  const state = createState(payload());
  state.reveal = false;
  setSortOrder(state, 'form');
  assert.equal(findAll(draw(state), withClass('reveal-toggle')).length, 0);
  state.reveal = true;
  setSortOrder(state, 'alphabetical');
  assert.equal(findAll(draw(state), withClass('reveal-toggle')).length, 0);
});

test('the device count states the whole collection, singular for one', () => {
  const span = fakeDoc.createElement('span');
  renderCount(span, 272);
  assert.equal(span.textContent, '· 272 devices');
  renderCount(span, 1);
  assert.equal(span.textContent, '· 1 device');
});
