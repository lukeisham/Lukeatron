// actions.js — the Next Actions section: the only editable part of the
// project page (FR-2, FR-4). Stem grouping (FR-3/AD-1) is applied here as a
// pure rendering choice from grouping.js's output — the row handed to
// task-row.js is always the real TaskView, so every edit still names its
// own `row` index no matter how the group is drawn (D-12: the store never
// learns about the group).

import { el } from "../shared/dom.js";
import { groupByStem, stemDifference } from "./grouping.js";
import { buildTaskRow, buildDoneTaskRow } from "./task-row.js";
import { buildCopyButton, taskCopyText, sectionCopyText } from "./copy.js";
import { wireReorder } from "./reorder.js";

// wishlist #4b: reuses the section heading's existing small-button look
// (project-copy-btn, project.css) rather than inventing a second button
// style for what is functionally the same kind of control.
const DONE_TOGGLE_CLASS = "project-copy-btn";

function buildStemGroup(group, submitEdit, reorderCtx) {
  return el("li", { class: "project-stem-group" }, [
    el("h3", { class: "project-stem-heading" }, group.stem),
    el(
      "ul",
      { class: "project-stem-chips" },
      group.tasks.map((task) => buildTaskRow(task, stemDifference(group, task), submitEdit, reorderCtx))
    ),
  ]);
}

// wishlist #4b: `showDone`/`onToggleDone` are owned by project.js's own
// `state` object (D-2: one place holds it) — this function only ever reads
// the current value and fires the callback on click, the same division of
// labour `submitEdit` already has with every task-row control.
function buildDoneToggle(doneTasks, showDone, onToggleDone) {
  if (!doneTasks.length) return null;
  return el(
    "button",
    { type: "button", class: DONE_TOGGLE_CLASS, "aria-expanded": String(showDone), onclick: onToggleDone },
    showDone ? `Hide done actions (${doneTasks.length})` : `Show done actions (${doneTasks.length})`
  );
}

function buildDoneList(doneTasks) {
  return el(
    "ul",
    { class: "project-list project-done-actions" },
    doneTasks.map((task) => buildDoneTaskRow(task))
  );
}

export function buildNextActionsSection(project, submitEdit, showDone, onToggleDone, submitReorder) {
  const tasks = project.tasks ?? [];
  const doneTasks = project.done_tasks ?? [];
  const headingChildren = [el("h2", {}, "Next Actions")];
  if (tasks.length) headingChildren.push(buildCopyButton("Copy Next Actions", () => sectionCopyText(tasks, taskCopyText)));
  const toggle = buildDoneToggle(doneTasks, showDone, onToggleDone);
  if (toggle) headingChildren.push(toggle);
  const heading = el("div", { class: "project-section-heading" }, headingChildren);

  const children = [heading];

  if (!tasks.length) {
    children.push(el("p", { class: "project-empty" }, "No open actions."));
  } else {
    const reorderCtx = project.multi_stream ? null : { submitReorder };

    if (project.multi_stream && tasks.length) {
      children.push(el("p", { class: "project-multi-stream-note" }, "Reordering isn't available for multi-stream projects yet."));
    }

    // AC-1: three or more siblings sharing a stem become one heading and N
    // chips; anything not sharing a stem (including the stray one that only
    // looks alike) renders as its own row (grouping.js's own risk mitigation).
    const list = el("ul", { class: "project-list project-next-actions" });
    for (const group of groupByStem(tasks)) {
      if (group.stem === null) {
        list.appendChild(buildTaskRow(group.tasks[0], group.tasks[0].action, submitEdit, reorderCtx));
      } else {
        list.appendChild(buildStemGroup(group, submitEdit, reorderCtx));
      }
    }

    if (!project.multi_stream && tasks.length) wireReorder(list, submitReorder);

    children.push(list);
  }

  if (showDone && doneTasks.length) children.push(buildDoneList(doneTasks));

  return el("section", { class: "project-section" }, children);
}
