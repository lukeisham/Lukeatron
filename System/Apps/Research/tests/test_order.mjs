import test from 'node:test';
import assert from 'node:assert/strict';
import { insertionIndex } from '../app/order.js';

test('insertionIndex counts in the list with the moved id taken out', () => {
  const ids = [10, 20, 30, 40];
  assert.equal(insertionIndex(ids, 40, 20, 'before'), 1);
  assert.equal(insertionIndex(ids, 40, 20, 'after'), 2);
  assert.equal(insertionIndex(ids, 10, 30, 'after'), 2); // 10 leaves first, so 30 sits at 1
  assert.equal(insertionIndex(ids, 10, 30, 'before'), 1);
  assert.equal(insertionIndex(ids, 30, 10, 'before'), 0);
});

test('an id missing from the list lands last, with a warning', () => {
  const warn = console.warn;
  const warnings = [];
  console.warn = (...args) => warnings.push(args);
  try {
    assert.equal(insertionIndex([1, 2], 3, 99, 'before'), 2);
  } finally {
    console.warn = warn;
  }
  assert.equal(warnings.length, 1);
});
