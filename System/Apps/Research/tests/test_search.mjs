import test from 'node:test';
import assert from 'node:assert/strict';
import { matchesName } from '../app/search.js';

test('exact mode matches a case-insensitive substring and rejects a typo', () => {
  assert.equal(matchesName('Metaphor', 'ETAP', false), true);
  assert.equal(matchesName('Metaphor', 'metapher', false), false);
});

test('empty query matches everything', () => {
  assert.equal(matchesName('Metaphor', '   ', false), true);
});

test('fuzzy mode finds a name with one typo that exact mode misses', () => {
  assert.equal(matchesName('Metaphor', 'metapher', false), false);
  assert.equal(matchesName('Metaphor', 'metapher', true), true);
});

test('short queries do not fuzzy-match', () => {
  assert.equal(matchesName('Metaphor', 'mxta', true), false);
});

test('fuzzy mode rejects an unrelated name', () => {
  assert.equal(matchesName('Anaphora', 'metapher', true), false);
});
