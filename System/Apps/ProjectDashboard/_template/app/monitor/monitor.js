// B-6: monitor UI module — the monitor spec
//
// The entry point: state, the toolbar (view/colour/front toggles, rotation,
// breadcrumb, the wiki door, the occlusion diagnostic), altitude navigation,
// and wiring the board/list/week/opened-stack/ticker pieces together.
//
// This module imports no write client, anywhere in its dependency graph
// (FR-13, D-2) — grep confirms it: nothing here or in anything it imports
// reaches `/api/edit` or `/api/request`. The only route to action is the
// `unblock:open` event opened-stack.js dispatches (FR-6c) — a DOM event, not
// an import, so this stays structurally incapable of writing anything.

import { el, clear } from "../shared/dom.js";
import { fetchBoard } from "../shared/board-client.js";
import { renderMass } from "./board-view.js";
import { renderListView } from "./list-view.js";
import { renderWeekView } from "./week-view.js";
import { renderOpenedStack } from "./opened-stack.js";
import { renderTicker } from "./ticker.js";

const state = {
  board: null,
  view: "board", // "board" | "list" | "week" — FR-3
  altitude: "board", // "board" | "quadrant" | "stack" — FR-4
  quadrant: null,
  projectId: null,
  stackReturn: null, // {view, altitude, quadrant} snapshot to restore on "back" from list/week
  rotation: 0, // FR-21
  colourMode: "project", // FR-20
  frontMode: "due", // FR-20a
  weekSpan: "week",
  weekDayIndex: 0,
  hoveredId: null,
};

let root;

// AC-4: "returning to the board restores the identical board — same scroll,
// same state, no reload". Every render() rebuilds .view-body from scratch
// (JS-6: a fresh node per render, never a stale listener carried over), which
// would otherwise reset scrollTop to 0 on every altitude change. Keyed on
// (view, altitude, quadrant) rather than projectId, since the promise is
// about the board/list/week surface the reader left, not the opened stack.
const scrollPositions = new Map();
let lastRenderKey = null;

function viewKey() {
  return `${state.view}|${state.altitude}|${state.quadrant ?? ""}`;
}

function resetAltitudeView() {
  state.rotation = 0; // FR-21: changing altitude returns the board to 0°
}

function findProject(id) {
  return state.board.projects.find((p) => p.id === id) ?? null;
}

function openStackFromMass(project) {
  state.stackReturn = { view: state.view, altitude: state.altitude, quadrant: state.quadrant };
  state.projectId = project.id;
  state.altitude = "stack";
  resetAltitudeView();
  render();
}

function openStackById(projectId) {
  const project = findProject(projectId);
  if (!project) {
    console.warn("monitor.js: openStackById — no such project", projectId);
    return;
  }
  openStackFromMass(project);
}

function backFromStack() {
  if (state.stackReturn) {
    state.view = state.stackReturn.view;
    state.altitude = state.stackReturn.altitude;
    state.quadrant = state.stackReturn.quadrant;
  } else {
    state.altitude = "board";
  }
  state.projectId = null;
  resetAltitudeView();
  render();
}

function openQuadrant(context) {
  state.altitude = "quadrant";
  state.quadrant = context;
  resetAltitudeView();
  render();
}

function backToBoard() {
  state.altitude = "board";
  state.quadrant = null;
  resetAltitudeView();
  render();
}

function setView(view) {
  state.view = view;
  if (view !== "board") {
    state.altitude = "board";
    state.quadrant = null;
  }
  render();
}

function rotate(delta) {
  state.rotation = (((state.rotation + delta) % 4) + 4) % 4;
  render();
}

function renderBreadcrumb() {
  const crumbs = [state.view];
  if (state.altitude !== "board" && state.quadrant) crumbs.push(state.quadrant);
  if (state.projectId) crumbs.push(state.projectId);
  return el("nav", { class: "breadcrumb", "aria-label": "breadcrumb" }, crumbs.join(" › "));
}

function renderToolbar(diagnostic) {
  const viewToggle = el("div", { class: "toggle-group", role: "group", "aria-label": "view" }, [
    el("button", { class: `toggle${state.view === "board" ? " toggle-active" : ""}`, type: "button", onClick: () => setView("board") }, "▦ board"),
    el("button", { class: `toggle${state.view === "list" ? " toggle-active" : ""}`, type: "button", onClick: () => setView("list") }, "☰ list"),
    el("button", { class: `toggle${state.view === "week" ? " toggle-active" : ""}`, type: "button", onClick: () => setView("week") }, "🗓 week"),
  ]);

  const showMassControls = state.view === "board" && state.altitude !== "stack";
  const colourToggle = showMassControls
    ? el("div", { class: "toggle-group", role: "group", "aria-label": "colour" }, [
        el(
          "button",
          { class: `toggle${state.colourMode === "project" ? " toggle-active" : ""}`, type: "button", onClick: () => { state.colourMode = "project"; render(); } },
          "colour = project"
        ),
        el(
          "button",
          { class: `toggle${state.colourMode === "kind" ? " toggle-active" : ""}`, type: "button", onClick: () => { state.colourMode = "kind"; render(); } },
          "colour = kind"
        ),
      ])
    : null;

  const frontToggle = showMassControls
    ? el("div", { class: "toggle-group", role: "group", "aria-label": "front" }, [
        el(
          "button",
          { class: `toggle${state.frontMode === "due" ? " toggle-active" : ""}`, type: "button", onClick: () => { state.frontMode = "due"; render(); } },
          "front = due soonest"
        ),
        el(
          "button",
          { class: `toggle${state.frontMode === "short" ? " toggle-active" : ""}`, type: "button", onClick: () => { state.frontMode = "short"; render(); } },
          "front = shortest"
        ),
      ])
    : null;

  const rotation = showMassControls
    ? el("div", { class: "toggle-group", role: "group", "aria-label": "rotate" }, [
        el("button", { class: "toggle", type: "button", onClick: () => rotate(-1) }, "↺"),
        el("span", {}, `${state.rotation * 90}°`),
        el("button", { class: "toggle", type: "button", onClick: () => rotate(1) }, "↻"),
      ])
    : null;

  const backButton =
    state.altitude === "quadrant"
      ? el("button", { class: "link-button", type: "button", onClick: backToBoard }, "‹ board")
      : state.altitude === "stack"
        ? el("button", { class: "link-button", type: "button", onClick: backFromStack }, "‹ back")
        : null;

  const wikiDoor = el("a", { class: "wiki-door link-button", href: "http://localhost:8787", target: "_blank", rel: "noopener" }, "LukeatronWiki ↗");

  const diagnosticText =
    diagnostic != null
      ? el(
          "span",
          { class: "occlusion-diagnostic" },
          `hidden at this angle: ${diagnostic.hiddenThisAngle}/${diagnostic.total} · hidden from all four: ${diagnostic.hiddenAllFour}`
        )
      : el("span", { class: "occlusion-diagnostic" }, "");

  return el("div", { class: "toolbar" }, [backButton, viewToggle, colourToggle, frontToggle, rotation, renderBreadcrumb(), diagnosticText, wikiDoor]);
}

// FR-0b: the legend, in plain words, always on screen — never a hover-only
// tooltip (FR-0c). Covers exactly the four things a reader can't tell apart
// without it: crown brightness, the two fluorescent outlines, the week
// rail's three dot shapes, and the ticker's two lane directions.
function renderLegend() {
  return el(
    "p",
    { class: "legend" },
    "Crown: bright = needs you, dim = waiting on someone else. Outline: cyan = due this week, magenta = overdue. " +
      "Week dot: circle = due, square = wake, diamond = incoming. Ticker: left lane = yours, right lane = an agent can take."
  );
}

function renderThisWeekPanel() {
  const { board } = state;
  if (board.nothing_needs_you) {
    return el("div", { class: "this-week-panel" }, el("p", { class: "nothing-needs-you" }, "Nothing needs you this week."));
  }
  const byId = new Map(board.projects.map((p) => [p.id, p]));
  const nameFor = (id) => {
    const p = byId.get(id);
    return p ? `${p.id} — ${p.title || ""}` : id;
  };
  const selected = el(
    "ul",
    {},
    board.this_week.selected.map((id) => el("li", {}, el("button", { class: "link-button", type: "button", onClick: () => openStackById(id) }, nameFor(id))))
  );
  const rest = el("details", {}, [
    el("summary", {}, `not this week (${board.this_week.not_this_week.length})`),
    el(
      "ul",
      {},
      board.this_week.not_this_week.map((id) => el("li", {}, el("button", { class: "link-button", type: "button", onClick: () => openStackById(id) }, nameFor(id))))
    ),
  ]);
  return el("div", { class: "this-week-panel" }, [el("h2", {}, "This week"), selected, rest]);
}

function render() {
  const previousBody = root.querySelector(".view-body");
  if (previousBody && lastRenderKey != null) {
    scrollPositions.set(lastRenderKey, previousBody.scrollTop);
  }

  clear(root);
  const body = el("div", { class: "view-body" });
  let diagnostic = null;

  if (state.altitude === "stack" && state.projectId) {
    const project = findProject(state.projectId);
    if (project) renderOpenedStack(body, project, { onBack: backFromStack });
  } else if (state.view === "board") {
    diagnostic = renderMass(body, state.board, {
      colourMode: state.colourMode,
      frontMode: state.frontMode,
      rotation: state.rotation,
      altitude: state.altitude,
      context: state.quadrant,
      hoveredId: state.hoveredId,
      onHoverChange: (id) => {
        state.hoveredId = id;
        render();
      },
      onOpenStack: (project) => {
        if (state.altitude === "board") {
          openQuadrant(project.context);
        } else {
          openStackFromMass(project);
        }
      },
    });
  } else if (state.view === "list") {
    renderListView(body, state.board, { onOpenStack: openStackById });
  } else if (state.view === "week") {
    renderWeekView(body, state.board, {
      span: state.weekSpan,
      dayIndex: state.weekDayIndex,
      onSpanChange: (span) => {
        state.weekSpan = span;
        render();
      },
      onDayIndexChange: (i) => {
        state.weekDayIndex = i;
        render();
      },
      onOpenStack: openStackById,
    });
  }

  // HTML-3: exactly one <h1> per page, present at every altitude — screen-
  // reader-only, since Monitor's own landing job ("eight seconds, no
  // decisions") calls for no visible heading chrome at the board altitude.
  root.appendChild(el("h1", { class: "visually-hidden" }, "Monitor"));
  root.appendChild(renderToolbar(diagnostic));
  if (state.altitude !== "stack") {
    root.appendChild(renderLegend());
    root.appendChild(renderThisWeekPanel());
  }
  root.appendChild(body);

  if (state.altitude !== "stack") {
    const tickerMount = el("div", {});
    renderTicker(tickerMount, state.board);
    root.appendChild(tickerMount);
  }

  lastRenderKey = viewKey();
  body.scrollTop = scrollPositions.get(lastRenderKey) ?? 0;
}

function renderLoading() {
  clear(root);
  root.appendChild(el("p", { class: "muted state-message" }, "Loading the board…"));
}

function renderError(message) {
  clear(root);
  root.appendChild(
    el("div", { class: "state-message" }, [
      el("p", {}, "The board could not be loaded."),
      el("p", { class: "muted" }, message),
    ])
  );
}

/** FR-4 keyboard support for rotation (`↺ ↻` and the arrow keys, FR-21). */
function handleKeydown(event) {
  if (state.view !== "board" || state.altitude === "stack") return;
  if (event.key === "ArrowLeft") rotate(-1);
  if (event.key === "ArrowRight") rotate(1);
}

/** unblock.js hides #monitor-root itself when its own door opens (its header
 * comment documents the `projectdashboard:open-unblock` contract) and
 * dispatches `projectdashboard:monitor-show` on `document` when it closes —
 * this module's only remaining job at that seam is to refresh the board, since
 * a visit to Unblock can write to the very files this board reads (FR-13's
 * "the three faces read one model" only holds if Monitor re-fetches rather
 * than keeps showing what it cached before the write). */
function wireUnblockReturn() {
  document.addEventListener("projectdashboard:monitor-show", async () => {
    try {
      state.board = await fetchBoard();
    } catch (err) {
      console.warn("monitor.js: board refresh after Unblock failed", err);
      renderError(err.message);
      return;
    }
    render();
  });
}

async function main() {
  root = document.getElementById("monitor-root");
  if (!root) {
    console.warn("monitor.js: no #monitor-root mount point found");
    return;
  }
  root.classList.add("monitor");
  wireUnblockReturn();
  window.addEventListener("keydown", handleKeydown);

  renderLoading();
  try {
    state.board = await fetchBoard();
  } catch (err) {
    console.warn("monitor.js: board fetch failed", err);
    renderError(err.message);
    return;
  }
  render();
}

main();
