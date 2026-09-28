// edits.js — the one place POST /api/edit (and POST /api/undo, GET
// /api/undo-state.json) are called (JS-5: raw fetch calls
// centralised, the same discipline shared/board-client.js's fetchBoard
// already keeps for GET /api/board.json). D-14/AD-3/SR-9: the server sends
// a code; this module is the ONLY place that code becomes a sentence Luke
// can act on. Nothing past this file ever sees `error` or `field` — only
// console.warn does, for whoever reads the browser console.

// FR-12: one sentence per code in server.spec.md's registry, worded for the
// person doing the task, not for whoever built it (SR-9).
const ERROR_SENTENCES = {
  stale_mtime: "This project changed since you opened it — refresh and try again.",
  linked_row: "This action is shared with another project — edit it there; !ProjectSweep keeps them in sync.",
  fence_violation: "That edit was refused for a reason outside your control — nothing was changed. Tell Luke's agent maintainer.",
  project_not_found: "That row no longer exists — refresh the page.",
  row_not_found: "That row no longer exists — refresh the page.",
  table_corruption: "That value can't be safely stored (likely a \"|\" or a newline) — try again without it.",
  reorder_mismatch: "That list doesn't match what's on this row's table anymore — refresh and try again.",
  undo_unavailable: "There is nothing to undo — the last change was made before undo existed, or wasn't a single-cell edit.",
  undo_conflict: "That cell has changed since — refresh; nothing was undone.",
  bad_request: "That edit didn't go through — try again.",
  internal: "Something went wrong on this end — nothing was changed. Try again in a moment.",
};

const FALLBACK_SENTENCE = ERROR_SENTENCES.internal;

// One POST-and-explain round-trip, shared by postEdit and postUndo so a code
// can only ever become a sentence in one place. `what` names the request in
// the console warnings for whoever reads them.
async function postJson(url, body, what) {
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.warn(`edits.js: the ${what} request never reached the server —`, err);
    throw new Error(FALLBACK_SENTENCE);
  }

  if (response.ok) return response.json();

  let code = null;
  try {
    const payload = await response.json();
    code = typeof payload?.error === "string" ? payload.error : null;
  } catch (err) {
    console.warn(`edits.js: a refused ${what}'s response body was not valid JSON`, err);
  }
  console.warn(`edits.js: ${what} refused — code="${code ?? "unknown"}", HTTP ${response.status}`);
  throw new Error(ERROR_SENTENCES[code] ?? FALLBACK_SENTENCE);
}

/**
 * POSTs one edit intent (`{project_id, mtime, field, ...}`, per
 * server.spec.md FR-5). Resolves with the server's success payload
 * (`{ok, mtime, ...}`) or throws an Error whose `.message` is already the
 * plain sentence FR-12 requires — a caller shows `err.message` directly,
 * with no translation of its own.
 */
export function postEdit(body) {
  return postJson("/api/edit", body, "edit");
}

/** POSTs `{project_id, mtime}` to undo the last single-cell write. The server
 * works out WHAT to restore from its own log; the body never names a row or a
 * value. Same success/throw contract as postEdit. */
export function postUndo(body) {
  return postJson("/api/undo", body, "undo");
}

/** GET what an undo would restore right now (`{available, project_id, row,
 * column, value, prev, at, reason}`), or null if it could not be read — the
 * Undo button is a convenience, so a failed read hides it rather than
 * blocking the page. */
export async function fetchUndoState() {
  try {
    const response = await fetch("/api/undo-state.json", { cache: "no-store" });
    if (!response.ok) {
      console.warn(`edits.js: undo state unavailable — HTTP ${response.status}`);
      return null;
    }
    return await response.json();
  } catch (err) {
    console.warn("edits.js: undo state could not be read —", err);
    return null;
  }
}
