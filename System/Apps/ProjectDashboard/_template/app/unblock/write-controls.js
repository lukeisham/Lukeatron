// B-7 unblock UI — every depot/action write control (the unblock spec
// FR-2a/AC-5a: "every depot write control lives HERE... no other route
// exists on the monitoring face"). FR-5 done/state/scrap, FR-6 hand over,
// FR-7 ask an agent + dispatch. No park control anywhere (AC-8) — that
// tier was cut at PRD 1.9 and mind projects are excluded from this module
// entirely (candidates.js, model FR-6).

import { setCell, handOver, appendRequest, appendScrap, ApiError } from "./api.js";
import { nextState } from "./format.js";

/** Thrown client-side, before any network call, when a row carries no
 * known mtime (board.json does not surface one today — see candidates.js'
 * projectRow comment and the build report). Kept distinct from ApiError's
 * "conflict" so the UI can say the true thing: this was never confirmed
 * fresh, not "someone else changed it" (SR-9 — an honest message, not a
 * borrowed one). */
export class MissingMtimeError extends Error {
  constructor() {
    super("This project's file time isn't available yet, so a write can't be safely attempted. Reload once that lands.");
  }
}

function requireMtime(row) {
  if (typeof row.mtime !== "number") throw new MissingMtimeError();
  return row.mtime;
}

const DONE_MARK = "☑ Done";

export async function markDone(row) {
  const mtime = requireMtime(row);
  return setCell({ projectId: row.projectId, row: row.row, column: "status", value: DONE_MARK, mtime });
  // FR-5a: the completion-log append happens inside writes.py's set_cell,
  // in the same call, when the write lands a Done status — not a second
  // request from here (writes.spec.md FR-10).
}

export async function cycleState(row) {
  const mtime = requireMtime(row);
  const value = nextState(row.state ?? null);
  return setCell({ projectId: row.projectId, row: row.row, column: "state", value, mtime });
}

export async function handOverRow(row, recipient) {
  const mtime = requireMtime(row);
  if (!recipient) throw new Error("Hand over needs a recipient.");
  return handOver({ projectId: row.projectId, row: row.row, recipient, mtime });
}

export async function appendScrapToRow(row, text) {
  if (!text) throw new Error("A scrap needs some text.");
  // Unlike set_cell/hand_over, writes.append_scrap accepts a missing mtime
  // (its own signature: `mtime: float | None = None`) and simply skips the
  // staleness guard — so a scrap is not blocked by the mtime gap the other
  // controls are (see candidates.js' projectRow comment). Still passes a
  // known mtime through when this module has one, so a stale scrap is
  // still caught the moment the board object starts carrying one.
  const mtime = typeof row.mtime === "number" ? row.mtime : null;
  return appendScrap({ projectId: row.projectId, mtime, text });
}

export async function askAgentAboutRow(row, text) {
  return appendRequest({ source: `project:${row.projectId}`, text: text || row.action });
}

export async function dispatchDepotRow(row) {
  return appendRequest({ source: `depot:${row.id}`, text: row.action });
}

export { ApiError };
