// render.js — builds the lane × column grid from a fetched Board object
// (board.spec.md; the JSON shape is confirmed in server.py's module
// docstring). Pure DOM construction: every card's placement and every
// header count comes from the object handed in — this file derives nothing
// of its own (FR-1, FR-7).
//
// Never fetches, never re-renders on its own. board.js calls renderBoard (or
// renderLoadError) exactly once per page load (FR-2, documentation.spec.md
// D-11) — every later density/palette/glyph toggle is a class flip that
// `controls` applies to <body>, reacted to only in board.css/card.css.

import { el, clear } from "../shared/dom.js";
import { buildCard } from "./card.js";
import { attachKeynav } from "./keynav.js";

export const LANE_ORDER = [
  { value: "mine", label: "Mine" },
  { value: "delegate", label: "Delegate" },
  { value: "waiting", label: "Waiting" },
  { value: "incoming", label: "Incoming" },
  { value: "unshaped", label: "Unshaped" },
];

export const COLUMN_ORDER = ["OVERDUE", "THIS WEEK", "NEXT WEEK", "LATER", "NO DATE"];

const REQUIRED_BOARD_FIELDS = ["projects", "lane_counts", "column_counts"];

/**
 * Returns a human-readable problem description, or null if `board` has the
 * shape server.py's docstring promises. A guard against a "shouldn't happen"
 * state (JS-2) — this module never assumes a fetch handed back what it
 * expected, and never renders a malformed board as if it were simply empty.
 */
export function validateBoardShape(board) {
  if (!board || typeof board !== "object") return "the response was not an object";
  for (const field of REQUIRED_BOARD_FIELDS) {
    if (!(field in board)) return `the response is missing "${field}"`;
  }
  if (!Array.isArray(board.projects)) return `"projects" was not a list`;
  return null;
}

function columnHeaderRow(board) {
  const cells = [el("div", { class: "board-rail-spacer" })];
  for (const column of COLUMN_ORDER) {
    cells.push(
      el("div", { class: "board-column-header", dataset: { column } }, [
        el("span", { class: "board-column-title" }, column),
        // FR-7: the JSON's own count, verbatim — never a length this module counts itself.
        el("span", { class: "board-count" }, String(board.column_counts[column] ?? 0)),
      ])
    );
  }
  return el("div", { class: "board-header-row" }, cells);
}

function groupProjectsByLaneColumn(projects) {
  const knownLanes = new Set(LANE_ORDER.map((lane) => lane.value));
  const knownColumns = new Set(COLUMN_ORDER);
  const map = new Map();
  for (const project of projects) {
    const lane = project.lane?.value;
    const column = project.due_column?.value;
    if (!knownLanes.has(lane) || !knownColumns.has(column)) {
      // A "shouldn't happen" state (JS-2): model.py's lane/due_column are
      // always one of the five fixed values. Warn loudly rather than either
      // crashing the whole board or silently dropping the project with no trace.
      console.warn("render.js: a project's lane/column is not one of the five fixed values — it will not be placed on the grid", project);
      continue;
    }
    const key = `${lane} ${column}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(project);
  }
  return map;
}

function laneRow(lane, board, byLaneColumn) {
  const rail = el("div", { class: "board-lane-rail", dataset: { lane: lane.value } }, [
    el("h2", { class: "board-lane-title" }, lane.label),
    el("span", { class: "board-count" }, String(board.lane_counts[lane.value] ?? 0)),
  ]);
  const cells = [rail];
  for (const column of COLUMN_ORDER) {
    const projects = byLaneColumn.get(`${lane.value} ${column}`) ?? [];
    // FR-8/AD-2: the cell is always built, even with zero cards, so the
    // grid keeps its shape instead of collapsing around what's missing.
    cells.push(
      el("div", { class: "board-cell", dataset: { lane: lane.value, column } }, [
        ...projects.map((project) => buildCard(project)),
      ])
    );
  }
  return el("div", { class: "board-lane-row", dataset: { lane: lane.value } }, cells);
}

function nothingNeedsYouBanner(board) {
  // FR-9: MINE and DELEGATE both empty is the one case worth naming outright.
  const mineEmpty = (board.lane_counts.mine ?? 0) === 0;
  const delegateEmpty = (board.lane_counts["delegate"] ?? 0) === 0;
  if (!mineEmpty || !delegateEmpty) return null;
  return el(
    "p",
    { class: "board-nothing-needed" },
    "Nothing needs you right now — every open project sits with delegate, waiting, incoming or unshaped."
  );
}

/** Builds the whole grid from `board` and mounts it into `container`, once. */
export function renderBoard(container, board) {
  const problem = validateBoardShape(board);
  if (problem) {
    console.warn("render.js: fetched board failed shape validation —", problem);
    renderLoadError(container, `The board came back in an unexpected shape (${problem}).`);
    return;
  }

  clear(container);
  const byLaneColumn = groupProjectsByLaneColumn(board.projects);
  const banner = nothingNeedsYouBanner(board);
  // AD-2: the grid is built in full regardless of the banner — an empty
  // MINE/DELEGATE still shows every other lane and column at full shape.
  const grid = el("section", { class: "board", "aria-label": "Project board" }, [
    columnHeaderRow(board),
    ...LANE_ORDER.map((lane) => laneRow(lane, board, byLaneColumn)),
  ]);
  // wishlist #2: arrow keys between cards, `c` to copy. One delegated listener
  // on the grid, installed here (not in board.js, whose contract test AC-3
  // forbids any listener) — see keynav.js.
  attachKeynav(grid, { lanes: LANE_ORDER.map((lane) => lane.value), columns: COLUMN_ORDER });
  if (banner) container.appendChild(banner);
  container.appendChild(grid);
}

/**
 * FR-10: a load failure never renders as emptiness. This names what's known
 * (the caller's own error message) instead of leaving the mount blank.
 */
export function renderLoadError(container, message) {
  clear(container);
  container.appendChild(
    el("div", { class: "board-error", role: "alert" }, [
      el("p", { class: "board-error-title" }, "The board could not be loaded."),
      el("p", { class: "board-error-detail" }, message || "No further detail was given."),
    ])
  );
}
