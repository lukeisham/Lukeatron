// undo.js — the "Undo" button in a project's header. Pure builder, like
// sections.js's toggles: it is handed the server's undo-state and a callback,
// and owns no network call, no mtime and no re-render — project.js owns those,
// exactly as it does for submitEdit.
//
// The label names WHAT will be restored and WHEN that write was made, so a
// change from a previous day is never mistaken for "the thing I just did".

import { el } from "../shared/dom.js";

const COLUMN_NAMES = { status: "Status", due: "Due", owner: "Owner", kind: "Kind" };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-09-14T21:02:07" -> "14 Sep, 21:02"; anything unreadable -> null.
 * Read straight from the string, not through Date, so the clock time shown is
 * the one the log wrote, in the same timezone, on every machine. */
export function formatChanged(at) {
  const m = typeof at === "string" && at.match(/^\d{4}-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  const month = MONTHS[Number(m[1]) - 1];
  return month ? `${Number(m[2])} ${month}, ${m[3]}:${m[4]}` : null;
}

/** e.g. `Undo: Status on row 9 → "☐ Open" — changed 14 Sep, 21:02` */
export function undoLabel(state) {
  const column = COLUMN_NAMES[state.column] ?? state.column;
  const restored = state.prev === "" ? "(blank)" : `"${state.prev}"`;
  const when = formatChanged(state.at);
  return `Undo: ${column} on row ${state.row} → ${restored}${when ? ` — changed ${when}` : ""}`;
}

/**
 * Returns the button, or null when the last write was not in this project
 * (there is nothing to say about it here). When it was but cannot be undone,
 * the button is present, disabled, and says why in its own text.
 *
 * `onUndo` is called with no arguments and may return a promise; the button
 * is disabled while it runs so a double-click posts once.
 */
export function buildUndoButton(state, projectId, onUndo) {
  if (!state || state.project_id !== projectId) return null;

  if (!state.available) {
    const reason = state.reason || "Nothing to undo.";
    return el("button", { type: "button", class: "project-undo project-undo--unavailable", disabled: true, "aria-label": `Undo unavailable: ${reason}` }, `Undo — ${reason}`);
  }

  const label = undoLabel(state);
  const button = el("button", { type: "button", class: "project-undo", "aria-label": label, title: label }, label);
  button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      await onUndo();
    } finally {
      // A success re-renders the header and drops this node; a refusal leaves
      // it, and project.js refreshes the state, so re-enabling is only ever
      // visible when the click did nothing.
      button.disabled = false;
    }
  });
  return button;
}
