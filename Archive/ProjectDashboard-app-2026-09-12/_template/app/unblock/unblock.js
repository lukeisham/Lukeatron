// B-7: unblock UI module — the unblock spec
//
// Entry point: mounts the panel, holds the (session-only, AD-1) capacity
// state, and wires every depot write control (FR-2a/AC-5a — this is the
// ONLY module in the app that imports write-capable calls; monitor.js
// never does, and must not (documentation spec D-2)).
//
// Coordination note for whoever builds monitor.js (B-6): index.html's
// comment reserves the page's one <h1> (HTML-3) for Monitor as the landing
// view. This module's own heading is an <h2> ("Unblock") for exactly that
// reason — not an oversight if you come looking for unblock's <h1>.
//
// The door: monitor's "take this to Unblock" control is B-6's to build.
// Until it exists, this module listens for a plain DOM CustomEvent so the
// two modules never need to import one another (D-2 is enforced by
// imports, not by convention):
//   document.dispatchEvent(new CustomEvent("projectdashboard:open-unblock",
//     { detail: { projectId } }))              // projectId optional
// A `#unblock` location hash is also honoured as a manual bridge for
// testing ahead of that control landing — remove once B-6 ships its own.

import { getBoard } from "./api.js";
import {
  createCapacityState,
  WORKERS,
  agentCeiling,
  lukeCeiling,
  fetchLukesCapacityFigure,
} from "./capacity.js";
import { buildCandidates, forWorker, applyFit, sortCheapestFirst } from "./candidates.js";
import {
  markDone,
  cycleState,
  appendScrapToRow,
  handOverRow,
  askAgentAboutRow,
  dispatchDepotRow,
  MissingMtimeError,
  ApiError,
} from "./write-controls.js";
import { effortWeight } from "./format.js";
import {
  buildSkeleton,
  buildCandidateRow,
  renderSummary,
  renderError,
  renderCapacityFigure,
} from "./render.js";

let els = null; // cached DOM refs into the mounted skeleton
let capacityState = createCapacityState();
let allRows = [];
let rowById = new Map();

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function mount() {
  const root = document.getElementById("unblock-root");
  root.appendChild(buildSkeleton());
  els = {
    root,
    workerButtons: [...root.querySelectorAll(".worker-btn")],
    panels: { luke: root.querySelector('[data-panel="luke"]'), agent: root.querySelector('[data-panel="agent"]') },
    durationSelect: root.querySelector(".duration-select"),
    energySelect: root.querySelector(".energy-select"),
    tokenSelect: root.querySelector(".token-select"),
    capacityFigure: root.querySelector(".capacity-figure"),
    summary: root.querySelector(".unblock-summary"),
    list: root.querySelector(".candidate-list"),
    error: root.querySelector(".unblock-error"),
    back: root.querySelector(".unblock-back"),
  };
  wireCapacityControls();
  wireList();
  els.back.addEventListener("click", close);
}

function wireCapacityControls() {
  for (const btn of els.workerButtons) {
    btn.addEventListener("click", () => {
      capacityState.worker = btn.dataset.worker;
      for (const b of els.workerButtons) b.setAttribute("aria-pressed", String(b === btn));
      els.panels.luke.hidden = capacityState.worker !== WORKERS.LUKE;
      els.panels.agent.hidden = capacityState.worker !== WORKERS.AGENT;
      renderList();
    });
  }
  els.durationSelect.addEventListener("change", () => {
    capacityState.duration = els.durationSelect.value;
    renderList();
  });
  els.energySelect.addEventListener("change", () => {
    capacityState.energy = els.energySelect.value;
    renderList();
  });
  els.tokenSelect.addEventListener("change", () => {
    capacityState.tokenBudget = els.tokenSelect.value;
    renderList();
  });
}

function wireList() {
  els.list.addEventListener("click", onListClick);
  els.list.addEventListener("submit", onListSubmit);
}

function rowFromEvent(target) {
  const li = target.closest("li.candidate-row");
  return li ? { li, row: rowById.get(li.dataset.rowId) } : { li: null, row: null };
}

async function onListClick(event) {
  const button = event.target.closest("button.candidate-control");
  if (!button) return;
  const { li, row } = rowFromEvent(button);
  if (!row) return;

  switch (button.dataset.action) {
    case "done":
      return runWrite(li, () => markDone(row));
    case "state":
      return runWrite(li, () => cycleState(row));
    case "ask-agent":
      return runWrite(li, () => askAgentAboutRow(row));
    case "dispatch":
      return runWrite(li, () => dispatchDepotRow(row));
    case "scrap-open":
      return toggleForm(li, "scrap-submit");
    case "hand-over-open":
      return toggleForm(li, "hand-over-submit");
    default:
      console.warn("unblock: unhandled control action", button.dataset.action); // JS-2: never fail silently
  }
}

function toggleForm(li, action) {
  const form = li.querySelector(`form[data-action="${action}"]`);
  if (!form) return;
  form.hidden = !form.hidden;
  if (!form.hidden) form.querySelector("input")?.focus();
}

async function onListSubmit(event) {
  const form = event.target.closest("form.candidate-inline-form");
  if (!form) return;
  event.preventDefault();
  const { li, row } = rowFromEvent(form);
  if (!row) return;
  const value = new FormData(form).get("value")?.toString().trim();
  if (form.dataset.action === "scrap-submit") return runWrite(li, () => appendScrapToRow(row, value));
  if (form.dataset.action === "hand-over-submit") return runWrite(li, () => handOverRow(row, value));
}

async function runWrite(li, run) {
  clearRowError(li);
  li.classList.add("pending"); // JS-5: a loading state before every request
  try {
    await run();
    await refresh(); // AD-2: optimistic-but-reconciled — always re-read the response's world
  } catch (err) {
    showRowError(li, err);
  } finally {
    li.classList.remove("pending");
  }
}

function clearRowError(li) {
  li.querySelector(".candidate-row-error")?.remove();
}

function showRowError(li, err) {
  const message =
    err instanceof MissingMtimeError || (err instanceof ApiError && err.kind === "conflict")
      ? err.message
      : err instanceof ApiError
        ? `Couldn't do that: ${err.message}`
        : (err && err.message) || "Something went wrong.";
  const box = document.createElement("p");
  box.className = "candidate-row-error";
  box.setAttribute("role", "alert");
  box.textContent = message;
  li.appendChild(box);
}

function currentCeiling() {
  return capacityState.worker === WORKERS.AGENT
    ? agentCeiling(capacityState.tokenBudget)
    : lukeCeiling(capacityState.duration, capacityState.energy);
}

function renderList() {
  const worker = capacityState.worker;
  const visible = forWorker(allRows, worker);
  const { fitting, exemptOverdue } = applyFit(visible, worker, currentCeiling());
  const exemptIds = new Set(exemptOverdue.map((r) => r.id));
  const shown = sortCheapestFirst([...fitting, ...exemptOverdue], worker, todayIso());

  els.list.innerHTML = "";
  rowById = new Map();
  for (const row of shown) {
    rowById.set(row.id, row);
    els.list.appendChild(buildCandidateRow(row, { exempt: exemptIds.has(row.id) }));
  }
  renderSummary(els.summary, { shown: shown.length, total: visible.length, worker });

  if (worker === WORKERS.LUKE) updateCapacityFigure(shown[0] ?? null);
  else els.capacityFigure.hidden = true;
}

let capacityFigureToken = 0;
async function updateCapacityFigure(topRow) {
  const requestToken = ++capacityFigureToken;
  if (!topRow || topRow.source !== "project" || effortWeight(topRow.effort) === null) {
    els.capacityFigure.hidden = true;
    return;
  }
  try {
    const result = await fetchLukesCapacityFigure({
      nextActionEffortWeight: effortWeight(topRow.effort),
      openCount: topRow.openCount,
    });
    if (requestToken !== capacityFigureToken) return; // a newer render superseded this request
    renderCapacityFigure(els.capacityFigure, result);
  } catch (err) {
    if (requestToken !== capacityFigureToken) return;
    console.warn("unblock: capacity figure fetch failed", err);
    els.capacityFigure.hidden = true;
  }
}

async function refresh() {
  renderError(els.error, null);
  try {
    const board = await getBoard();
    allRows = buildCandidates(board);
    renderList();
  } catch (err) {
    renderError(els.error, (err && err.message) || "Could not load the board.");
  }
}

function open(projectId) {
  const monitorRoot = document.getElementById("monitor-root");
  if (monitorRoot) monitorRoot.hidden = true;
  els.root.hidden = false;
  refresh().then(() => {
    if (!projectId) return;
    const prefix = `project:${projectId}:`;
    const li = [...els.list.querySelectorAll("li.candidate-row")].find((el) => el.dataset.rowId.startsWith(prefix));
    li?.scrollIntoView({ block: "center" });
    li?.classList.add("candidate-row-focused");
  });
}

function close() {
  els.root.hidden = true;
  const monitorRoot = document.getElementById("monitor-root");
  if (monitorRoot) monitorRoot.hidden = false;
  document.dispatchEvent(new CustomEvent("projectdashboard:monitor-show"));
}

function init() {
  mount();
  document.addEventListener("projectdashboard:open-unblock", (event) => open(event.detail?.projectId));
  if (location.hash === "#unblock") open(); // manual bridge — see module docstring
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
}

export { init, open, close, renderList as __renderListForTest };
