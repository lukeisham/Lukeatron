// The depot ticker (FR-1d–FR-1i): two lanes split on Impact→Kind, the only
// moving element in the application, read-only (FR-1e, D-31 — dispatch lives in
// `unblock`, never here). No write client is imported by this module or by
// anything it calls.

import { el, clear } from "../shared/dom.js";
import { stripMarkdown, kindName, KIND_MINE, KIND_HANDOVER } from "../shared/format.js";
import { kindColour } from "./colour.js";

function restThreshold() {
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--tick-rest-below");
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : 8;
}

function renderChip(job, onOpen) {
  const clean = stripMarkdown(job.task);
  return el(
    "button",
    {
      class: "ticker-chip",
      type: "button",
      style: `--chip-kind: var(--k${job.kind})`,
      title: clean,
      onClick: () => onOpen(job),
    },
    clean.length > 90 ? `${clean.slice(0, 87)}…` : clean
  );
}

/** One lane: a count anchored at its own left end (FR-1d), at rest (rendered
 * once, FR-1i) below the rest threshold, or rolling (rendered twice, back to
 * back, FR-1i) at or above it. `direction` picks which way it scrolls so the
 * two lanes run opposite each other (FR-1d) — a CSS modifier only, never a
 * different rate or easing (both read `--tick-rate` / `--tick-ease`, AD-6). */
function renderLane(jobs, { label, direction, onOpen }) {
  const rolling = jobs.length >= restThreshold();
  const chips = () => jobs.map((job) => renderChip(job, onOpen));
  const track = el("div", { class: `ticker-track${rolling ? " ticker-track-rolling" : ""}`, style: `--ticker-job-count: ${jobs.length}` }, [
    ...chips(),
    ...(rolling ? chips() : []), // FR-1i: a rolling lane's content is the list twice
  ]);
  const lane = el("div", { class: `ticker-lane ticker-lane-${direction}` }, [
    el("span", { class: "ticker-lane-count" }, `${jobs.length} ${label}`),
    el("div", { class: "ticker-viewport" }, track),
  ]);
  return lane;
}

function renderJobDetail(job) {
  return el("div", { class: "ticker-detail", role: "note" }, [
    el("strong", {}, kindName(job.kind)),
    el("p", {}, stripMarkdown(job.task)),
    job.source ? el("p", { class: "ticker-detail-source" }, `Source: ${job.source}`) : null,
  ]);
}

/**
 * Renders the depot ticker into `container`. `board.depot` is model's
 * DepotJob list (already mapped Impact→Kind — FR-7 of model.spec.md); this
 * view only splits it into the two lanes and draws it.
 */
export function renderTicker(container, board) {
  clear(container);
  const luke = board.depot.filter((job) => job.kind === KIND_MINE);
  const agent = board.depot.filter((job) => job.kind === KIND_HANDOVER);

  const detail = el("div", { class: "ticker-detail-slot", hidden: true });
  const showDetail = (job) => {
    clear(detail);
    detail.hidden = false;
    detail.appendChild(renderJobDetail(job));
  };

  const lukeLane = renderLane(luke, { label: "yours", direction: "left", onOpen: showDetail });
  const agentLane = renderLane(agent, { label: "an agent can take", direction: "right", onOpen: showDetail });

  container.appendChild(el("div", { class: "depot-ticker" }, [lukeLane, agentLane, detail]));
}
