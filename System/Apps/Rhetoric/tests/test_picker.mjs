import test from 'node:test';
import assert from 'node:assert/strict';
import { PICKER_LIMIT, exactDevice, pickerOptions } from '../app/picker.js';

const device = (id, label) => ({ id, label });
const devices = [device(3, 'Metonymy'), device(1, 'Metaphor'), device(2, 'Anaphora'), device(4, 'Begging the Question/Shared Ground')];
const labels = (list) => list.map((d) => d.label);

test('the options narrow as the text grows, as the search does, A to Z', () => {
  assert.deepEqual(labels(pickerOptions(devices, 'met', false)), ['Metaphor', 'Metonymy']);
  assert.deepEqual(labels(pickerOptions(devices, 'metap', false)), ['Metaphor']);
  assert.deepEqual(labels(pickerOptions(devices, 'MET', false)), ['Metaphor', 'Metonymy']);
  assert.deepEqual(labels(pickerOptions(devices, 'zzz', false)), []);
});

test('an empty query lists the first devices A to Z, capped', () => {
  assert.deepEqual(labels(pickerOptions(devices, '', false)), ['Anaphora', 'Begging the Question/Shared Ground', 'Metaphor', 'Metonymy']);
  const many = Array.from({ length: 40 }, (_, i) => device(i, `Device ${String(i).padStart(2, '0')}`));
  assert.equal(pickerOptions(many, '', false).length, PICKER_LIMIT);
});

test('the Fuzzy option lets a slip of the keys still find the device', () => {
  assert.deepEqual(labels(pickerOptions(devices, 'metapher', false)), []);
  assert.deepEqual(labels(pickerOptions(devices, 'metapher', true)), ['Metaphor']);
});

test('a Flipside is found by either half of its shown label', () => {
  assert.deepEqual(labels(pickerOptions(devices, 'shared', false)), ['Begging the Question/Shared Ground']);
  assert.deepEqual(labels(pickerOptions(devices, 'begging', false)), ['Begging the Question/Shared Ground']);
});

test('a name typed out in full counts as a choice, case-blind; a part of a name does not', () => {
  assert.equal(exactDevice(devices, ' metaphor ').id, 1);
  assert.equal(exactDevice(devices, 'meta'), null);
  assert.equal(exactDevice(devices, ''), null);
  assert.equal(exactDevice([device(1, 'Same'), device(2, 'same')], 'same'), null); // two devices, so no guess
});

test('a parent list keeps the tree order, narrows by any part of the path, and is not cut at twelve', () => {
  const tree = [device(1, 'Figures'), device(2, 'Figures > Tropes'), device(3, 'Figures > Tropes > Irony'), device(4, 'Arguments')];
  assert.deepEqual(labels(pickerOptions(tree, '', false, 200, false)), ['Figures', 'Figures > Tropes', 'Figures > Tropes > Irony', 'Arguments']);
  assert.deepEqual(labels(pickerOptions(tree, 'tropes', false, 200, false)), ['Figures > Tropes', 'Figures > Tropes > Irony']);
  const many = Array.from({ length: 40 }, (_, i) => device(i, `Label ${i}`));
  assert.equal(pickerOptions(many, '', false, 200, false).length, 40);
  assert.equal(exactDevice(tree, 'figures > tropes')?.id, 2);
});
