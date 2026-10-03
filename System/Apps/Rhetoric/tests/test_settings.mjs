import test from 'node:test';
import assert from 'node:assert/strict';
import { NO_DEFAULT, loadDefaultSort, loadToggles, saveDefaultSort, saveToggles } from '../app/settings.js';
import { SORTS } from '../app/state.js';

function fakeStorage(initial = {}) {
  const data = { ...initial };
  return { getItem: (key) => data[key] ?? null, setItem: (key, value) => { data[key] = value; }, data };
}

const allOff = { showDefinitions: false, showExamples: false, showConfidence: false, reveal: false };

test('the four display toggles survive a save and a reload', () => {
  const storage = fakeStorage();
  saveToggles(storage, allOff);
  assert.deepEqual(loadToggles(storage), allOff);
});

test('nothing saved, or junk saved, leaves the defaults alone', () => {
  assert.deepEqual(loadToggles(fakeStorage()), {});
  assert.deepEqual(loadToggles(fakeStorage({ 'rhetoric.toggles': 'not json' })), {});
  assert.deepEqual(loadToggles(fakeStorage({ 'rhetoric.toggles': '{"reveal":"yes","showExamples":false}' })), { showExamples: false });
});

test('blocked storage never throws', () => {
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  const warn = console.warn;
  console.warn = () => {};
  try {
    saveToggles(blocked, allOff);
    saveDefaultSort(blocked, 'form');
    assert.deepEqual(loadToggles(blocked), {});
    assert.equal(loadDefaultSort(blocked, SORTS), NO_DEFAULT);
    assert.deepEqual(loadToggles(null), {});
  } finally {
    console.warn = warn;
  }
});

test('the opening group is remembered only if it is a real group', () => {
  const storage = fakeStorage();
  saveDefaultSort(storage, 'function');
  assert.equal(loadDefaultSort(storage, SORTS), 'function');
  saveDefaultSort(storage, 'bogus');
  assert.equal(loadDefaultSort(storage, SORTS), NO_DEFAULT);
});
