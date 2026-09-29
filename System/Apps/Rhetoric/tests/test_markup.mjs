import test from 'node:test';
import assert from 'node:assert/strict';
import { parseInline, stripInline } from '../app/markup.js';

test('star-wrapped words become italic segments, the rest stay plain', () => {
  assert.deepEqual(parseInline('a *veni, vidi* b'), [
    { text: 'a ', italic: false },
    { text: 'veni, vidi', italic: true },
    { text: ' b', italic: false },
  ]);
});

test('text without markup is one plain segment; quotes and brackets pass through', () => {
  assert.deepEqual(parseInline('"x" (Caesar)'), [{ text: '"x" (Caesar)', italic: false }]);
});

test('stripInline removes the star markers', () => {
  assert.equal(stripInline('carpe *diem*'), 'carpe diem');
});
