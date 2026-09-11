// The one place `GET /api/board.json` is fetched from (JS-5: raw fetch calls
// centralised). Read-only — this file has no write counterpart and must never
// grow one; `unblock` writes through its own `api.js` against `/api/edit` and
// `/api/request`, never through here (D-2, documentation spec's one-way rule).

/**
 * Fetch the board object. Throws on a network failure or a non-200 response so
 * the caller's own try/catch can show FR-15's explicit error state — this
 * function never swallows a failure into a fallback value.
 */
export async function fetchBoard() {
  const response = await fetch("/api/board.json");
  if (!response.ok) {
    let message = `board request failed (${response.status})`;
    try {
      const body = await response.json();
      if (body && typeof body.message === "string") message = body.message;
    } catch {
      // response body wasn't JSON — the status-based message above stands.
    }
    throw new Error(message);
  }
  return response.json();
}
