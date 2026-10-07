import test from 'node:test';
import assert from 'node:assert/strict';
import { parseInline, stripInline } from '../app/markup.js';

test('star-wrapped words become italic segments, the rest stay plain', () => {
  assert.deepEqual(parseInline('a *veni, vidi* b'), [
    { text: 'a ', italic: false, bold: false },
    { text: 'veni, vidi', italic: true, bold: false },
    { text: ' b', italic: false, bold: false },
  ]);
});

test('text without markup is one plain segment; quotes and brackets pass through', () => {
  assert.deepEqual(parseInline('"x" (Caesar)'), [{ text: '"x" (Caesar)', italic: false, bold: false }]);
});

test('stripInline removes the star markers', () => {
  assert.equal(stripInline('carpe *diem*'), 'carpe diem');
});

test('underscore-wrapped words become bold segments', () => {
  assert.deepEqual(parseInline('a _heavy_ b'), [
    { text: 'a ', italic: false, bold: false },
    { text: 'heavy', italic: false, bold: true },
    { text: ' b', italic: false, bold: false },
  ]);
});

test('bold and italic can sit one inside the other, in either order', () => {
  assert.deepEqual(parseInline('*a _b_ c*'), [
    { text: 'a ', italic: true, bold: false },
    { text: 'b', italic: true, bold: true },
    { text: ' c', italic: true, bold: false },
  ]);
  assert.deepEqual(parseInline('_x *y*_'), [
    { text: 'x ', italic: false, bold: true },
    { text: 'y', italic: true, bold: true },
  ]);
});

test('stripInline removes the underscore markers too; a lone underscore stays', () => {
  assert.equal(stripInline('a _bold_ and *italic* word'), 'a bold and italic word');
  assert.equal(stripInline('snake_case'), 'snake_case');
});
