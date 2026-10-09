// auto-refresh.js — wishlist #5: polls the stat-only /api/board-changed.json
// endpoint on an interval and reloads the page when a real change is seen.
// Deliberately the same "honest full reload" the toolbar's own manual
// Refresh button already uses (controls.js's own "refresh" case, see that
// file's header comment) rather than a silent in-place patch — board.js
// exports no redraw hook to patch into (a real gap, logged separately in
// Logs/issues.log, not solved here).
//
// FR-6-style boundary (controls.js's own convention): this module owns no
// toolbar DOM and is wired from controls.js's init() as a plain function
// call — it is a self-contained poller, not a toolbar control, so it has
// no user-facing preference and nothing to persist via storage.js.

import { fetchBoardChanged } from "../shared/board-client.js";

const DEFAULT_INTERVAL_MS = 30000;

function isEditingFormControl(activeElement) {
  if (!activeElement) return false;
  const tag = (activeElement.tagName || "").toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  return Boolean(activeElement.isContentEditable);
}

/**
 * The pure decision: given the mtime first seen this page-load and the
 * mtime just polled, should this tick reload the page? `activeElement`
 * decides only whether an already-detected change gets deferred — it never
 * suppresses detection itself, so a change made while Luke is mid-edit is
 * still caught the next tick after focus moves on. Exported separately from
 * the poller below so it's testable without a real timer/fetch/reload
 * (mirroring toolbar.js's own pure-function/wiring split).
 */
export function shouldReload(seenMtime, polledMtime, activeElement) {
  if (polledMtime === null || seenMtime === null) return false;
  if (polledMtime <= seenMtime) return false;
  return !isEditingFormControl(activeElement);
}

/**
 * Builds a poller without starting it — `tick()` is exposed directly so a
 * test can drive discrete polls instead of waiting on a real interval.
 * The first successful poll only establishes the baseline mtime (whatever
 * changed before this page loaded is already what's on screen); every poll
 * after that can trigger a reload.
 */
export function createPoller({ intervalMs = DEFAULT_INTERVAL_MS, doc = document, win = window, poll = fetchBoardChanged } = {}) {
  let seenMtime = null;
  let timer = null;

  async function tick() {
    const polledMtime = await poll();
    if (polledMtime === null) return; // fetch failed this tick — try again next time, per fetchBoardChanged's own contract
    if (seenMtime === null) {
      seenMtime = polledMtime;
      return;
    }
    if (shouldReload(seenMtime, polledMtime, doc.activeElement)) {
      win.location.reload();
      return;
    }
    // Unchanged, or deferred because focus is in a form control — seenMtime
    // stays at its old value either way, so a deferred change still fires
    // on the very next tick once focus has moved on.
  }

  function start() {
    if (timer === null) timer = win.setInterval(tick, intervalMs);
  }

  function stop() {
    if (timer !== null) win.clearInterval(timer);
    timer = null;
  }

  return { tick, start, stop };
}

export function init(options) {
  createPoller(options).start();
}
