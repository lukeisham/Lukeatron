import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_CELL, MAX_COLS, MAX_ROWS, clampCols, clampRows, isHeadingCell, longestWord, newTable, pasteCells, resizeCells, tidyTable,
} from '../app/tablegrid.js';

test('a new table is blank, has column headings on and row headings off, and stays within the limits', () => {
  const table = newTable(2, 4);
  assert.deepEqual(table, { caption: '', colHeads: true, rowHeads: false, cells: [['', '', '', ''], ['', '', '', '']] });
  assert.equal(newTable(0, 0).cells.length, 1);
  assert.equal(newTable(99, 99).cells.length, MAX_ROWS);
  assert.equal(newTable(99, 99).cells[0].length, MAX_COLS);
});

test('the counts are whole numbers within 1 and the limit, whatever is typed', () => {
  assert.deepEqual([clampRows(0), clampRows(-3), clampRows(2.9), clampRows(999), clampRows(NaN), clampRows('')], [1, 1, 2, MAX_ROWS, 1, 1]);
  assert.deepEqual([clampCols(0), clampCols(8), clampCols(9)], [1, MAX_COLS, MAX_COLS]);
});

test('resizing keeps the text that still fits and pads the rest with blanks', () => {
  const grid = [['a', 'b'], ['c', 'd']];
  assert.deepEqual(resizeCells(grid, 3, 3), [['a', 'b', ''], ['c', 'd', ''], ['', '', '']]);
  assert.deepEqual(resizeCells(grid, 1, 1), [['a']]);
  assert.deepEqual(grid, [['a', 'b'], ['c', 'd']]); // the original is not changed
});

test('a cell is a heading when it sits in the first row with column headings, or the first column with row headings', () => {
  const table = { colHeads: true, rowHeads: false };
  assert.deepEqual([isHeadingCell(table, 0, 2), isHeadingCell(table, 1, 0)], [true, false]);
  assert.deepEqual([isHeadingCell({ colHeads: false, rowHeads: true }, 2, 0), isHeadingCell({ colHeads: false, rowHeads: true }, 0, 1)], [true, false]);
  assert.equal(isHeadingCell({ colHeads: true, rowHeads: true }, 0, 0), true); // the corner
  assert.equal(isHeadingCell({ colHeads: false, rowHeads: false }, 0, 0), false);
});

test('pasting spreadsheet text fills the grid from the chosen cell and grows it to fit', () => {
  const blank = [['', ''], ['', '']];
  assert.deepEqual(pasteCells(blank, 0, 0, 'a\tb\nc\td'), [['a', 'b'], ['c', 'd']]);
  assert.deepEqual(pasteCells(blank, 1, 1, 'x\ty\nz\tw\n'), [['', '', ''], ['', 'x', 'y'], ['', 'z', 'w']]);
  assert.deepEqual(pasteCells(blank, 0, 0, 'a\r\nb'), [['a', ''], ['b', '']]);
});

test('a paste past the limits is cut off, and a single value is left to the browser', () => {
  const wide = pasteCells([['']], 0, 0, Array(12).fill('x').join('\t'));
  assert.equal(wide[0].length, MAX_COLS);
  const tall = pasteCells([['']], 0, 0, Array(30).fill('a\tb').join('\n'));
  assert.equal(tall.length, MAX_ROWS);
  assert.equal(pasteCells([['']], 0, 0, 'just one value'), null);
  assert.equal(pasteCells([['']], 0, 0, 'one value\n'), null);
  assert.equal(pasteCells([['']], 0, 0, 'y'.repeat(MAX_CELL + 50).concat('\tb'))[0][0].length, MAX_CELL);
});

test('tidying trims the text and the caption and cuts them to their limits', () => {
  const table = tidyTable({ caption: '  Cases ', colHeads: false, rowHeads: true, cells: [['  a ', 'b'.repeat(MAX_CELL + 5)]] });
  assert.equal(table.caption, 'Cases');
  assert.equal(table.cells[0][0], 'a');
  assert.equal(table.cells[0][1].length, MAX_CELL);
});

test('the longest word sets how much room a column needs, within 4 and 24 characters, ignoring the italic stars', () => {
  assert.equal(longestWord({ cells: [['a', 'to be']] }), 4);
  assert.equal(longestWord({ cells: [['nominative', 'a b']] }), 10);
  assert.equal(longestWord({ cells: [['*dominus*']] }), 7);
  assert.equal(longestWord({ cells: [['x'.repeat(60)]] }), 24);
  assert.equal(longestWord({ cells: [['']] }), 4);
});
