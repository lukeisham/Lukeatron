import test from 'node:test';
import assert from 'node:assert/strict';
import { NO_DEFAULT, loadDefaultSort, loadOpenChoices, loadToggles, saveDefaultSort, saveOpenChoices, saveToggles } from '../app/settings.js';
import { OPENING_CHOICES, SORTS, applyOpenChoices, createState, openKey, toggleOpened } from '../app/state.js';
import { payload } from './fixture.mjs';

function fakeStorage(initial = {}) {
  const data = { ...initial };
  return { getItem: (key) => data[key] ?? null, setItem: (key, value) => { data[key] = value; }, data };
}

const allOff = {
  showDefinitions: false, showAiExamples: false, showQuotes: false, showConfidence: false, showGroups: false, showLabels: false, reveal: false,
  tableNames: false, tableDefinitions: false, tableExamples: false, indexFull: false, editMode: false,
};

test('the display and table toggles survive a save and a reload', () => {
  const storage = fakeStorage();
  saveToggles(storage, allOff);
  assert.deepEqual(loadToggles(storage), allOff);
});

test('nothing saved, or junk saved, leaves the defaults alone', () => {
  assert.deepEqual(loadToggles(fakeStorage()), {});
  assert.deepEqual(loadToggles(fakeStorage({ 'research.toggles': 'not json' })), {});
  assert.deepEqual(loadToggles(fakeStorage({ 'research.toggles': '{"reveal":"yes","showQuotes":false}' })), { showQuotes: false });
});

test('blocked storage never throws', () => {
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  const warn = console.warn;
  console.warn = () => {};
  try {
    saveToggles(blocked, allOff);
    saveDefaultSort(blocked, 'brainstorming');
    assert.deepEqual(loadToggles(blocked), {});
    assert.equal(loadDefaultSort(blocked, OPENING_CHOICES), NO_DEFAULT);
    assert.deepEqual(loadToggles(null), {});
  } finally {
    console.warn = warn;
  }
});

test('the opening group is remembered only if it is a real group', () => {
  const storage = fakeStorage();
  saveDefaultSort(storage, 'research');
  assert.equal(loadDefaultSort(storage, OPENING_CHOICES), 'research');
  saveDefaultSort(storage, 'bogus');
  assert.equal(loadDefaultSort(storage, OPENING_CHOICES), NO_DEFAULT);
});

test('Compare can be the opening group although it is not a sort button', () => {
  const storage = fakeStorage();
  saveDefaultSort(storage, 'compare');
  assert.equal(loadDefaultSort(storage, OPENING_CHOICES), 'compare');
  assert.equal(OPENING_CHOICES.length, SORTS.length + 1);
});

function firstHeading(state) {
  const [hierarchy, roots] = Object.entries(state.trees).find(([, nodes]) => nodes.some((node) => node.kind === 'node'));
  return [hierarchy, roots.find((node) => node.kind === 'node').id];
}

test('headings Luke opened or closed are remembered; an unknown or junk entry is ignored', () => {
  const storage = fakeStorage();
  const first = createState(payload());
  const [hierarchy, id] = firstHeading(first);
  const key = openKey(hierarchy, id);
  const wasOpen = first.opened.has(key);
  toggleOpened(first, hierarchy, id);
  const json = saveOpenChoices(storage, first);
  assert.equal(saveOpenChoices(storage, first, json), json); // unchanged: nothing is written again

  const second = createState(payload());
  applyOpenChoices(second, loadOpenChoices(storage));
  assert.equal(second.opened.has(key), !wasOpen);

  const third = createState(payload());
  applyOpenChoices(third, { 'labels:99999': true });
  assert.equal(third.opened.has('labels:99999'), false); // a heading that no longer exists
  assert.deepEqual(loadOpenChoices(fakeStorage({ 'research.opened': '{"a":true,"b":"x"}' })), { a: true });
  assert.deepEqual(loadOpenChoices(fakeStorage({ 'research.opened': 'junk' })), {});
});
