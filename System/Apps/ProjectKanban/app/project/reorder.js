// reorder.js — drag-and-rearrange for the Next Actions list. Owns only the
// DOM interaction and the flat-order computation; project.js owns the
// network round-trip (submitReorder), exactly as task-row.js's own edit
// controls already defer to submitEdit rather than calling the network
// themselves.
//
// Reordering operates on the FLAT visual order of every draggable row
// (`.project-task-row[data-task-index]`) inside the list, in DOM order —
// this naturally spans stem-group chips and top-level rows alike without
// this module needing to know anything about grouping.js's own grouping.
//
// Not truly optimistic: a drop (or a move-button press) disables the list,
// submits the reorder, and relies on the existing silent-refetch-and-
// rerender path (submitReorder, in project.js) to redraw in the new order —
// the same non-optimistic pattern every other per-row edit control here
// already uses (task-row.js's tick/due/owner/lane controls).

function currentOrder(listEl) {
  return Array.from(listEl.querySelectorAll(".project-task-row[data-task-index]")).map(
    (row) => row.dataset.taskIndex
  );
}

function reorderedList(order, draggedId, targetId) {
  const withoutDragged = order.filter((id) => id !== draggedId);
  const targetPos = withoutDragged.indexOf(targetId);
  if (targetPos === -1) {
    console.warn("reorder.js: drop target not found in the current order — leaving order unchanged", { draggedId, targetId });
    return order;
  }
  withoutDragged.splice(targetPos, 0, draggedId);
  return withoutDragged;
}

async function submitOrder(listEl, submitReorder, order, draggedId, targetId) {
  if (draggedId === targetId) return;
  const newOrder = reorderedList(order, draggedId, targetId);
  listEl.setAttribute("aria-busy", "true");
  try {
    await submitReorder(newOrder);
  } finally {
    listEl.removeAttribute("aria-busy");
  }
}

/**
 * Wires delegated drag/drop listeners onto `listEl` (event delegation,
 * JS-6 — one listener set on the container, not one per row). Call this
 * once, only when the project is NOT multi_stream (actions.js decides).
 * `submitReorder(rowOrder)` is project.js's own network round-trip.
 */
export function wireReorder(listEl, submitReorder) {
  let draggedId = null;

  listEl.addEventListener("dragstart", (event) => {
    const row = event.target.closest(".project-task-row[data-task-index]");
    if (!row) return;
    draggedId = row.dataset.taskIndex;
    if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
  });

  listEl.addEventListener("dragover", (event) => {
    if (draggedId === null) return;
    const row = event.target.closest(".project-task-row[data-task-index]");
    if (!row) return;
    event.preventDefault(); // required to allow a drop
    row.classList.add("project-task-row--drag-over");
  });

  listEl.addEventListener("dragleave", (event) => {
    const row = event.target.closest(".project-task-row[data-task-index]");
    if (row) row.classList.remove("project-task-row--drag-over");
  });

  listEl.addEventListener("drop", async (event) => {
    const row = event.target.closest(".project-task-row[data-task-index]");
    row?.classList.remove("project-task-row--drag-over");
    if (!row || draggedId === null) return;
    event.preventDefault();
    const targetId = row.dataset.taskIndex;
    const dragged = draggedId;
    draggedId = null;
    await submitOrder(listEl, submitReorder, currentOrder(listEl), dragged, targetId);
  });

  listEl.addEventListener("dragend", () => {
    draggedId = null;
    listEl.querySelectorAll(".project-task-row--drag-over").forEach((row) => row.classList.remove("project-task-row--drag-over"));
  });
}

/**
 * Moves `taskId` one step up or down in the flat visual order and submits
 * the result — the keyboard-operable equivalent of a drag. `direction` is
 * `"up"` or `"down"`. A no-op at either edge of the list.
 */
export async function moveTask(listEl, submitReorder, taskId, direction) {
  const order = currentOrder(listEl);
  const pos = order.indexOf(taskId);
  if (pos === -1) {
    console.warn("reorder.js: moveTask could not find this task in the current order", taskId);
    return;
  }
  const swapWith = direction === "up" ? pos - 1 : pos + 1;
  if (swapWith < 0 || swapWith >= order.length) return; // already at an edge
  const newOrder = [...order];
  [newOrder[pos], newOrder[swapWith]] = [newOrder[swapWith], newOrder[pos]];
  listEl.setAttribute("aria-busy", "true");
  try {
    await submitReorder(newOrder);
  } finally {
    listEl.removeAttribute("aria-busy");
  }
}
