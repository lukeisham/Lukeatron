// board.js — the browser-side board grid, ProjectKanban's front door
// (board.spec.md). This file is the thin entry-point glue: fetch once,
// mount once, show an error if that fails. It is manual-verification-only,
// the same scope every sibling app's own bootstrap file takes (see
// ProjectDashboard monitor's unblock.js) — render.js and card.js hold the
// actual DOM-building logic, and tests/test_board.mjs exercises those
// against a fake DOM (TEST-8).
//
// Toggle contract with `controls` (FR-2, documentation.spec.md D-11): every
// toggle is a class/attribute flip on <body>, never a re-render or a
// re-fetch. This module's CSS (board.css / card.css) reacts to exactly
// these two attributes — `controls` must match these names exactly:
//
//   body[data-density="condensed"]  — card density. Absent, or "expanded",
//                                      shows the full card.
//   body[data-lane-hues="mono"]       — no-op since 2026-09-12: tokens.css
//                                      now ships all five lanes at one
//                                      neutral ink by default (house
//                                      two-accent cap). "full" is inert too
//                                      — kept wired for a future distinct
//                                      per-lane colour mode, not removed.
//
// This file reads none of these attributes and never listens for them to
// change (AC-3) — that is entirely `controls`' and this module's CSS's job.
//
// FR-12: this file (and everything under app/board/) never imports an edit
// client — there is no code path here that could reach POST /api/edit.

import { fetchBoard } from "../shared/board-client.js";
import { renderBoard, renderLoadError } from "./render.js";

function mountElement() {
  const mount = document.getElementById("board-root");
  if (!mount) {
    console.warn("board.js: no #board-root element found in the page — nothing to render into");
    return null;
  }
  return mount;
}

// outline-print.spec.md FR-1/AC-9: the hash names the open route.
// project.js owns rendering (and un-hiding #project-root) while a project
// is open; this file's own job is only to stay out of its way and to
// re-render itself the moment the hash names the board again.
function isProjectRoute() {
  return location.hash.startsWith("#project=");
}

async function init() {
  if (isProjectRoute()) return; // project.js owns rendering while a project is open (outline-print FR-1)
  const mount = mountElement();
  if (!mount) return;
  try {
    const board = await fetchBoard();
    renderBoard(mount, board);
  } catch (err) {
    console.warn("board.js: the board fetch failed —", err);
    renderLoadError(mount, err instanceof Error ? err.message : String(err));
  }
}

window.addEventListener("hashchange", () => {
  if (!isProjectRoute()) init();
});

init();
