import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, setSortOrder } from '../app/state.js';
import { renderList } from '../app/render.js';
import { currentView, showsDetail, viewToText } from '../app/view.js';
import { fakeDoc, findAll, withClass } from './fake-dom.mjs';
import { payload } from './fixture.mjs';

function grammarState(sort) {
  const state = createState(payload());
  state.reveal = false;
  setSortOrder(state, sort);
  return state;
}

function draw(state) {
  const container = fakeDoc.createElement('div');
  renderList(fakeDoc, container, state, currentView(state));
  return container;
}

test('both grammatical groups are trees filed under their own hierarchy', () => {
  for (const sort of ['grammar_function', 'grammar_label']) {
    const view = currentView(grammarState(sort));
    assert.equal(view.mode, 'tree');
    assert.equal(view.items.at(-1).name, 'No grammatical term');
    assert.equal(view.items.at(-1).hierarchy, sort);
  }
});

test('labels nest: a device sits under its innermost label, inside its parent label', () => {
  const [clause] = currentView(grammarState('grammar_label')).items;
  assert.equal(clause.name, 'Clause');
  assert.equal(clause.children[0].name, 'Independent clause');
  assert.equal(clause.children[0].children[0].device.name, 'Anaphora');
});

test('an explanation shows under its device: summary, then each grammar slot with its labels and an example with italic key parts', () => {
  const state = grammarState('grammar_function');
  const container = draw(state);
  const [block] = findAll(container, withClass('device-explanation'));
  assert.equal(findAll(block, withClass('explanation-summary'))[0].textContent, 'Repeats the opening words.');
  assert.deepEqual(findAll(block, withClass('explanation-slot-name')).map((n) => n.textContent), ['Grammar function', 'Grammar form']);
  assert.deepEqual(findAll(block, withClass('explanation-labels')).map((n) => n.textContent), ['Independent clause', 'Independent clause, Conjunction']);
  assert.deepEqual(findAll(block, withClass('latin')).map((n) => n.textContent), ['We shall fight', 'We shall fight', 'and']);
  assert.deepEqual(findAll(block, withClass('explanation-example')).map((n) => n.textContent), [
    'We shall fight [independent clause] on the beaches',
    'We shall fight [independent clause], and [conjunction] never yield',
  ]);
  assert.equal(findAll(container, withClass('device-explanation')).length, 1); // Metaphor has none
});

test('an empty grammar slot is left out, not drawn blank', () => {
  const state = grammarState('grammar_function');
  state.devices.get(2).explanation.form = null;
  const [block] = findAll(draw(state), withClass('device-explanation'));
  assert.deepEqual(findAll(block, withClass('explanation-slot-name')).map((n) => n.textContent), ['Grammar function']);
});

test('no other group shows an explanation', () => {
  const state = grammarState('form');
  assert.equal(findAll(draw(state), withClass('device-explanation')).length, 0);
  assert.equal(showsDetail(state, state.devices.get(2), 'tree').explanation, false);
});

test('Copy carries the explanation when the screen does, and drops it when the toggle is off', () => {
  const state = grammarState('grammar_label');
  assert.match(viewToText(state, currentView(state)),
    /Repeats the opening words\.\n\s+Grammar function: Independent clause\n\s+We shall fight \[independent clause\] on the beaches\n\s+Grammar form: Independent clause, Conjunction\n\s+We shall fight \[independent clause\], and \[conjunction\] never yield/);
  state.showExplanations = false;
  assert.doesNotMatch(viewToText(state, currentView(state)), /Repeats the opening words/);
});

test('an empty grammatical group says so instead of "No devices match"', () => {
  const state = grammarState('grammar_label');
  state.trees.grammar_label = [];
  assert.equal(draw(state).textContent, 'Nothing is filed in this group yet.');
});

test('the no-group search does not cover the grammatical groups', () => {
  const state = createState(payload());
  state.query = 'a';
  const names = currentView(state).items.map((group) => group.hierarchy);
  assert.deepEqual(names, ['category', 'form', 'function']);
});
