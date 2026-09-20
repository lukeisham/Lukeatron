// task-row.js — one Next Actions row: the four per-row edits (tick done,
// due date, owner, lane) plus its copy button, or — for a linked row
// (FR-5/D-7) — a plain-English explanation in place of every control. Used
// both for a solo task and for one chip inside a stem group (actions.js
// decides which text to show as the row's label; the edit controls and the
// copy button are identical either way).
//
// `submitEdit(field, task, value)` is injected by project.js, which owns
// the network round-trip, the mtime and the error banner — this file only
// ever calls it and reacts to `{ ok }`, reverting its own control's value
// on a refusal so the screen never shows an edit that didn't actually save.

import { el } from "../shared/dom.js";
import { buildCopyButton, taskCopyText } from "./copy.js";
import { moveTask } from "./reorder.js";

// Grounded in the Kind column's own live vocabulary (a scan of registry.md
// files under Memory/Medium-Term/Projects/), not invented: these five
// values are what board.spec.md's own five lanes are derived from.
const LANE_KIND_OPTIONS = [
  { value: "mine", label: "Mine" },
  { value: "delegate", label: "Delegate" },
  { value: "waiting", label: "Waiting" },
  { value: "incoming", label: "Incoming" },
  { value: "unshaped", label: "Unshaped" },
];

function buildTickControl(task, submitEdit) {
  const checkbox = el("input", { type: "checkbox", class: "project-task-tick", "aria-label": `Mark "${task.action}" done` });
  checkbox.addEventListener("change", async () => {
    checkbox.disabled = true;
    const { ok } = await submitEdit("status", task, "☑ Done");
    if (!ok) {
      checkbox.checked = false;
      checkbox.disabled = false;
    }
    // On success project.js re-renders the whole page from a fresh fetch —
    // a done task is no longer in tasks[] at all, so nothing more to do here.
  });
  return checkbox;
}

function buildDueControl(task, submitEdit) {
  const input = el("input", {
    type: "date",
    class: "project-task-due",
    "aria-label": `Due date for "${task.action}"`,
    value: task.due_date ?? "",
  });
  input.addEventListener("change", async () => {
    const previous = task.due_date ?? "";
    input.disabled = true;
    const { ok } = await submitEdit("due", task, input.value);
    if (!ok) {
      input.value = previous;
      input.disabled = false;
    }
  });
  return input;
}

function buildOwnerControl(task, submitEdit) {
  // FR-9: a free-text field, so spellcheck applies.
  const input = el("input", {
    type: "text",
    class: "project-task-owner",
    "aria-label": `Owner of "${task.action}"`,
    value: task.owner ?? "",
    spellcheck: "true",
  });
  input.addEventListener("change", async () => {
    const previous = task.owner ?? "";
    const next = input.value.trim();
    input.disabled = true;
    const { ok } = await submitEdit("owner", task, next);
    if (!ok) {
      input.value = previous;
      input.disabled = false;
    }
  });
  return input;
}

function buildLaneControl(task, submitEdit) {
  const options = [...LANE_KIND_OPTIONS];
  // JS-2: live data has a handful of stray Kind values outside the five
  // canonical ones (e.g. "Human") — showing the raw value rather than
  // silently snapping to "Mine" keeps the control honest about what's
  // actually on disk.
  if (task.kind && !options.some((opt) => opt.value === task.kind)) {
    options.push({ value: task.kind, label: task.kind });
  }
  const select = el(
    "select",
    { class: "project-task-lane", "aria-label": `Lane for "${task.action}"` },
    options.map((opt) => el("option", { value: opt.value, selected: opt.value === task.kind ? "true" : null }, opt.label))
  );
  select.addEventListener("change", async () => {
    const previous = task.kind ?? "";
    select.disabled = true;
    const { ok } = await submitEdit("kind", task, select.value);
    if (!ok) {
      select.value = previous;
      select.disabled = false;
    }
  });
  return select;
}

// model.py's `lane_source`: true on the one open row (across the WHOLE
// Next Actions list, not necessarily the first one) whose own lane the
// project's board lane was actually rolled up from — the highest-demand
// lane among every open row, per model.py's `_lane_driver`. Just the glyph
// at rest (Luke's call, 2026-09-15): title carries the explanation on
// hover, aria-label carries the same text for anyone not hovering.
function buildLaneSourceBadge() {
  const label = "This row's lane sets the project's board lane — the highest-demand lane among all open actions, not necessarily the first one listed.";
  return el(
    "span",
    { class: "project-task-lane-source", title: label, "aria-label": label },
    "⚑"
  );
}

function buildLinkedRow(task, displayLabel) {
  return el("li", { class: "project-row project-task-row project-task-row--linked" }, [
    el("span", { class: "project-task-label" }, displayLabel),
    // FR-5/AC-4: plain words, no error code, no spec language.
    el("p", { class: "project-linked-note" }, "This action is shared with another project — edit it there; !ProjectSweep keeps them in sync."),
    task.lane_source ? buildLaneSourceBadge() : null,
    buildCopyButton(`Copy ${task.action}`, () => taskCopyText(task)),
  ].filter(Boolean));
}

/**
 * `displayLabel` is the text this row shows — the full action for a solo
 * task, or just the differing tail for one chip inside a stem group
 * (grouping.js's stemDifference). The copy button always reaches for
 * `task.action` itself (FR-6), never `displayLabel`.
 * `reorderCtx` is either null (no drag/move UI) or { submitReorder } for an
 * editable row in a non-multi_stream project.
 */
export function buildTaskRow(task, displayLabel, submitEdit, reorderCtx) {
  if (task.link_key) return buildLinkedRow(task, displayLabel);

  // model.py's `recurring_if_done`: a Done row bearing this reopens itself
  // on its own cadence (System/Apps/ProjectKanban/_template/recur.py) — the
  // dashed border is the row's own "this one comes back" mark, task-row.css.
  const rowClass = ["project-row", "project-task-row", task.recurring_if_done ? "project-task-row--recurring" : null]
    .filter(Boolean)
    .join(" ");

  const dragAttrs = reorderCtx ? { draggable: "true" } : {};

  return el("li", { class: rowClass, dataset: { taskIndex: task.index }, ...dragAttrs }, [
    reorderCtx ? el("span", { class: "project-task-drag-handle", "aria-hidden": "true", title: "Drag to reorder" }, "⠿") : null,
    buildTickControl(task, submitEdit),
    el("span", { class: "project-task-label" }, displayLabel),
    buildDueControl(task, submitEdit),
    buildOwnerControl(task, submitEdit),
    buildLaneControl(task, submitEdit),
    task.lane_source ? buildLaneSourceBadge() : null,
    buildCopyButton(`Copy ${task.action}`, () => taskCopyText(task)),
    reorderCtx ? el("button", {
      type: "button", class: "project-task-move-up", "aria-label": `Move "${task.action}" up`, title: "Move up",
      onclick: (event) => {
        const listEl = event.currentTarget.closest(".project-list");
        if (listEl) moveTask(listEl, reorderCtx.submitReorder, task.index, "up");
      },
    }, "↑") : null,
    reorderCtx ? el("button", {
      type: "button", class: "project-task-move-down", "aria-label": `Move "${task.action}" down`, title: "Move down",
      onclick: (event) => {
        const listEl = event.currentTarget.closest(".project-list");
        if (listEl) moveTask(listEl, reorderCtx.submitReorder, task.index, "down");
      },
    }, "↓") : null,
  ].filter(Boolean));
}

// wishlist #4b: a done row is read-only — it's already resolved, so none of
// the four edit controls apply (mirroring `buildLinkedRow`'s own
// no-controls-at-all shape, not a disabled version of the live row).
export function buildDoneTaskRow(task) {
  const rowClass = [
    "project-row",
    "project-task-row",
    "project-task-row--done",
    task.recurring_if_done ? "project-task-row--recurring" : null,
  ]
    .filter(Boolean)
    .join(" ");
  return el("li", { class: rowClass }, [
    el("span", { class: "project-task-label" }, task.action),
    el("span", { class: "project-task-owner-label" }, task.owner ?? "—"),
    buildCopyButton(`Copy ${task.action}`, () => taskCopyText(task)),
  ]);
}
