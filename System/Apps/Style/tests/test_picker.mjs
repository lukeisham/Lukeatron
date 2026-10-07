import test from 'node:test';
import assert from 'node:assert/strict';
import { PICKER_LIMIT, exactEntry, pickerOptions } from '../app/picker.js';

const entry = (id, label) => ({ id, label });
const entries = [entry(3, 'Metonymy'), entry(1, 'Metaphor'), entry(2, 'Anaphora'), entry(4, 'Begging the Question/Shared Ground')];
const labels = (list) => list.map((d) => d.label);

test('the options narrow as the text grows, as the search does, A to Z', () => {
  assert.deepEqual(labels(pickerOptions(entries, 'met', false)), ['Metaphor', 'Metonymy']);
  assert.deepEqual(labels(pickerOptions(entries, 'metap', false)), ['Metaphor']);
  assert.deepEqual(labels(pickerOptions(entries, 'MET', false)), ['Metaphor', 'Metonymy']);
  assert.deepEqual(labels(pickerOptions(entries, 'zzz', false)), []);
});

test('an empty query lists the first entries A to Z, capped', () => {
  assert.deepEqual(labels(pickerOptions(entries, '', false)), ['Anaphora', 'Begging the Question/Shared Ground', 'Metaphor', 'Metonymy']);
  const many = Array.from({ length: 40 }, (_, i) => entry(i, `Entry ${String(i).padStart(2, '0')}`));
  assert.equal(pickerOptions(many, '', false).length, PICKER_LIMIT);
});

test('the Fuzzy option lets a slip of the keys still find the entry', () => {
  assert.deepEqual(labels(pickerOptions(entries, 'metapher', false)), []);
  assert.deepEqual(labels(pickerOptions(entries, 'metapher', true)), ['Metaphor']);
});

test('a Counterpart is found by either half of its shown label', () => {
  assert.deepEqual(labels(pickerOptions(entries, 'shared', false)), ['Begging the Question/Shared Ground']);
  assert.deepEqual(labels(pickerOptions(entries, 'begging', false)), ['Begging the Question/Shared Ground']);
});

test('a name typed out in full counts as a choice, case-blind; a part of a name does not', () => {
  assert.equal(exactEntry(entries, ' metaphor ').id, 1);
  assert.equal(exactEntry(entries, 'meta'), null);
  assert.equal(exactEntry(entries, ''), null);
  assert.equal(exactEntry([entry(1, 'Same'), entry(2, 'same')], 'same'), null); // two entries, so no guess
});

test('a parent list keeps the tree order, narrows by any part of the path, and is not cut at twelve', () => {
  const tree = [entry(1, 'Figures'), entry(2, 'Figures > Tropes'), entry(3, 'Figures > Tropes > Irony'), entry(4, 'Arguments')];
  assert.deepEqual(labels(pickerOptions(tree, '', false, 200, false)), ['Figures', 'Figures > Tropes', 'Figures > Tropes > Irony', 'Arguments']);
  assert.deepEqual(labels(pickerOptions(tree, 'tropes', false, 200, false)), ['Figures > Tropes', 'Figures > Tropes > Irony']);
  const many = Array.from({ length: 40 }, (_, i) => entry(i, `Label ${i}`));
  assert.equal(pickerOptions(many, '', false, 200, false).length, 40);
  assert.equal(exactEntry(tree, 'figures > tropes')?.id, 2);
});
