// keynav.js — keyboard movement between board cards (wishlist #2).
//
//   ← / →   previous / next visible card in the same lane row, in reading
//           order (crossing empty cells and column boundaries)
//   ↑ / ↓   the nearest visible card in the adjacent lane row that has any,
//           preferring the same column, else the nearest column
//   c       copy the focused card's title (Cmd/Ctrl/Alt+C are never touched)
//
// Enter and Space still open the project — that is card.js's own handler and
// is left exactly as it was. Every card keeps tabindex="0", so Tab order is
// unchanged: this only ADDS ways to move.
//
// FR-12: this file never imports an edit client — it moves focus and clicks
// the card's own Copy button, nothing else. The listener lives here, not in
// board.js: test_board.mjs's AC-3 forbids any listener in that file.

const KEY_TO_MOVE = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" };

// A card hidden by the view filter or density is `display:none`, which has no
// offsetParent. Injectable because a fake DOM cannot see CSS.
const defaultIsVisible = (el) => el.offsetParent !== null;

/**
 * Pure. `cards` is every card in document order as `{ el, row, col }` (row =
 * the lane's index, col = the column's index). Returns the descriptor to move
 * to, or null at an edge (no wrap) or when `current` isn't among `cards`.
 */
export function nextCard(cards, current, move, { isVisible = defaultIsVisible } = {}) {
  const visible = cards.filter((card) => card === current || isVisible(card.el));
  const at = visible.indexOf(current);
  if (at === -1) return null;

  if (move === "left" || move === "right") {
    const sameRow = visible.filter((card) => card.row === current.row);
    const next = sameRow[sameRow.indexOf(current) + (move === "right" ? 1 : -1)];
    return next ?? null;
  }

  const step = move === "down" ? 1 : -1;
  const rows = [...new Set(visible.map((card) => card.row))].sort((a, b) => a - b);
  const targetRow = step === 1 ? rows.find((r) => r > current.row) : [...rows].reverse().find((r) => r < current.row);
  if (targetRow === undefined) return null;

  // Nearest column wins; on a tie the earlier column; within a column the
  // first card in the cell. `visible` is in document order, so a stable
  // "first best" pass gives exactly that.
  let best = null;
  for (const card of visible) {
    if (card.row !== targetRow) continue;
    const distance = Math.abs(card.col - current.col);
    if (best === null || distance < best.distance || (distance === best.distance && card.col < best.card.col)) {
      best = { card, distance };
    }
  }
  return best ? best.card : null;
}

/**
 * Install ONE delegated keydown on the board grid (not one per card).
 * `lanes` / `columns` are the row and column orders (render.js owns them and
 * passes them in, which also keeps this file from importing render.js back).
 */
export function attachKeynav(grid, { lanes, columns, isVisible = defaultIsVisible }) {
  const describe = (cardEl) => {
    const cell = cardEl.closest?.(".board-cell");
    return {
      el: cardEl,
      row: lanes.indexOf(cell?.dataset?.lane),
      col: columns.indexOf(cell?.dataset?.column),
    };
  };

  grid.addEventListener("keydown", (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return; // Cmd+C, Alt+← (Back) etc. belong to the browser
    const target = event.target;
    if (!target?.classList?.contains("board-card")) return; // the copy button, or anything else, keeps its own keys

    const move = KEY_TO_MOVE[event.key];
    if (move) {
      event.preventDefault?.(); // keep arrows from scrolling the page while moving between cards
      const cards = [...grid.querySelectorAll(".board-card")].map(describe);
      const current = cards.find((card) => card.el === target);
      if (!current) return;
      const next = nextCard(cards, current, move, { isVisible });
      if (next) next.el.focus();
      return;
    }

    if (typeof event.key === "string" && event.key.toLowerCase() === "c") {
      event.preventDefault?.();
      // The card's own Copy button already does the copy, the "copied" look
      // and the never-open-the-project stopPropagation — one behaviour, not two.
      target.querySelector?.(".board-card-copy")?.click?.();
    }
  });
}
