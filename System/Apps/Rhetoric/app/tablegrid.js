/**
 * The grid of one label table, as plain data (no DOM): the limits, a new table, changing its size, and
 * spreading pasted spreadsheet text over it. tableeditor.js wires this to the dialog; render.js draws a saved one.
 *
 * A table is `{ caption, colHeads, rowHeads, cells }`: `cells` is the whole grid as drawn, rectangular; with
 * `colHeads` its first row is the column headings, with `rowHeads` its first column is the row headings.
 * The limits mirror labeltables.py, which refuses anything past them.
 */

import { stripInline } from './markup.js';

export const MAX_TABLES = 5; // per label
export const MAX_ROWS = 20;
export const MAX_COLS = 8;
export const MAX_CELL = 200; // characters in one cell
export const MAX_CAPTION = 120;

const clamp = (value, low, high) => Math.min(high, Math.max(low, Math.trunc(value) || low));

export const clampRows = (rows) => clamp(rows, 1, MAX_ROWS);
export const clampCols = (cols) => clamp(cols, 1, MAX_COLS);

/** A blank table of `rows` by `cols`, with column headings on and row headings off. */
export function newTable(rows = 3, cols = 3) {
  return { caption: '', colHeads: true, rowHeads: false, cells: blankGrid(clampRows(rows), clampCols(cols)) };
}

const blankGrid = (rows, cols) => Array.from({ length: rows }, () => Array(cols).fill(''));

/** The grid cut or padded with blanks to `rows` by `cols` (kept within the limits); what fits keeps its text. */
export function resizeCells(cells, rows, cols) {
  const height = clampRows(rows);
  const width = clampCols(cols);
  return Array.from({ length: height }, (_, row) => Array.from({ length: width }, (__, col) => cells[row]?.[col] ?? ''));
}

/** Whether the cell at (row, col) is a heading under the table's two switches. */
export const isHeadingCell = (table, row, col) => (table.colHeads && row === 0) || (table.rowHeads && col === 0);

/**
 * `text` pasted at (row, col): a spreadsheet copy is lines of tab-separated cells. It fills the grid from that
 * cell, growing it (to the limits) when it runs past the edge; what would pass the limits is dropped. Pasting a
 * single plain value returns null, so the browser's own paste into that one input goes ahead.
 * @returns {string[][] | null} the new cells, or null when `text` is one value
 */
export function pasteCells(cells, row, col, text) {
  const lines = text.replace(/\r\n?/g, '\n').replace(/\n$/, '').split('\n').map((line) => line.split('\t'));
  if (lines.length === 1 && lines[0].length === 1) return null;
  const width = clampCols(Math.max(cells[0]?.length ?? 1, col + Math.max(...lines.map((line) => line.length))));
  const height = clampRows(Math.max(cells.length, row + lines.length));
  const grown = resizeCells(cells, height, width);
  lines.forEach((line, y) => line.forEach((value, x) => {
    if (row + y < height && col + x < width) grown[row + y][col + x] = value.trim().slice(0, MAX_CELL);
  }));
  return grown;
}

/** A table ready to save: text trimmed, the caption cut to its limit. */
export function tidyTable(table) {
  return {
    caption: table.caption.trim().slice(0, MAX_CAPTION),
    colHeads: table.colHeads,
    rowHeads: table.rowHeads,
    cells: table.cells.map((row) => row.map((cell) => cell.trim().slice(0, MAX_CELL))),
  };
}

/** The longest unbroken word in any cell (at least 4, at most 24): the width a column needs, which render.js hands to the CSS that shrinks the text. */
export function longestWord(table) {
  const longest = Math.max(...table.cells.flat().flatMap((cell) => stripInline(cell).split(/\s+/)).map((word) => word.length));
  return clamp(longest, 4, 24);
}
