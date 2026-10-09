/**
 * The dialog that adds or edits one label table: its size, whether the first row and first column are
 * headings, a caption, and a grid of cells to type or paste into. It edits a copy and hands the finished table
 * to `save`; the dialog stays open until the save succeeds, so nothing typed is lost to a failed save.
 * The grid logic (limits, resizing, pasting) is in tablegrid.js; main.js decides what saving means.
 */

import { MAX_CAPTION, MAX_CELL, MAX_COLS, MAX_ROWS, clampCols, clampRows, isHeadingCell, pasteCells, resizeCells, tidyTable } from './tablegrid.js';

/**
 * @param {object} parts the dialog's elements: dialog, form, title, caption, cols, rows, colHeads, rowHeads, grid, status, remove, cancel
 * @returns {{ open: (table: object, how: { heading: string, canDelete: boolean, save: (table: object) => Promise<boolean>, remove: () => Promise<boolean> }) => void }}
 */
export function bindTableEditor(doc, parts) {
  const { dialog, form, title, caption, cols, rows, colHeads, rowHeads, grid, status, remove, cancel } = parts;
  let draft = null;
  let how = null;

  caption.maxLength = MAX_CAPTION;
  cols.min = '1';
  cols.max = String(MAX_COLS);
  rows.min = '1';
  rows.max = String(MAX_ROWS);

  const cellInput = (row, col) => grid.querySelector(`[data-row="${row}"][data-col="${col}"]`);

  /** Reads what is typed back into the draft, so a redraw (a new size, a heading switch) loses nothing. */
  function sync() {
    draft.caption = caption.value;
    draft.colHeads = colHeads.checked;
    draft.rowHeads = rowHeads.checked;
    grid.querySelectorAll('input').forEach((input) => { draft.cells[Number(input.dataset.row)][Number(input.dataset.col)] = input.value; });
  }

  function drawGrid() {
    cols.value = String(draft.cells[0].length);
    rows.value = String(draft.cells.length);
    grid.replaceChildren(...draft.cells.map((line, row) => {
      const tr = doc.createElement('tr');
      line.forEach((text, col) => {
        const td = doc.createElement('td');
        const input = doc.createElement('input');
        input.type = 'text';
        input.className = 'table-grid-input';
        input.maxLength = MAX_CELL;
        input.value = text;
        input.dataset.row = String(row);
        input.dataset.col = String(col);
        input.setAttribute('aria-label', `Row ${row + 1}, column ${col + 1}`);
        if (isHeadingCell(draft, row, col)) input.dataset.heading = 'true';
        td.appendChild(input);
        tr.appendChild(td);
      });
      return tr;
    }));
  }

  /** The size boxes were changed: keep the text that still fits and redraw. */
  function resize() {
    sync();
    draft.cells = resizeCells(draft.cells, clampRows(Number(rows.value)), clampCols(Number(cols.value)));
    drawGrid();
  }

  function setBusy(busy) {
    form.querySelectorAll('button, input').forEach((control) => { control.disabled = busy; });
  }

  async function finish(attempt, failure) {
    setBusy(true);
    status.textContent = '';
    const saved = await attempt();
    setBusy(false);
    if (saved) dialog.close();
    else status.textContent = failure;
  }

  cols.addEventListener('change', resize);
  rows.addEventListener('change', resize);
  for (const box of [colHeads, rowHeads]) box.addEventListener('change', () => { sync(); drawGrid(); });

  grid.addEventListener('paste', (event) => {
    const input = event.target.closest?.('input');
    if (!input) return;
    sync();
    const cells = pasteCells(draft.cells, Number(input.dataset.row), Number(input.dataset.col), event.clipboardData.getData('text'));
    if (!cells) return; // one plain value: the browser pastes it into this cell
    event.preventDefault();
    draft.cells = cells;
    drawGrid();
    cellInput(input.dataset.row, input.dataset.col)?.focus();
  });

  // Enter moves down a cell rather than saving the whole table by accident.
  form.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || !event.target.matches('input')) return;
    event.preventDefault();
    if (event.target === cols || event.target === rows) return resize();
    if (event.target === caption) return cellInput(0, 0)?.focus();
    if (event.target.dataset.row !== undefined) cellInput(Number(event.target.dataset.row) + 1, event.target.dataset.col)?.focus();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    sync();
    finish(() => how.save(tidyTable(draft)), 'Could not save: the table is still open here.');
  });
  remove.addEventListener('click', () => {
    if (window.confirm('Delete this table?')) finish(() => how.remove(), 'Could not delete: the table is still open here.');
  });
  cancel.addEventListener('click', () => dialog.close());

  return {
    open(table, options) {
      how = options;
      draft = { caption: table.caption, colHeads: table.colHeads, rowHeads: table.rowHeads, cells: table.cells.map((line) => [...line]) };
      title.textContent = options.heading;
      caption.value = draft.caption;
      colHeads.checked = draft.colHeads;
      rowHeads.checked = draft.rowHeads;
      remove.hidden = !options.canDelete;
      status.textContent = '';
      setBusy(false);
      drawGrid();
      dialog.showModal();
      cellInput(0, 0)?.focus();
    },
  };
}
