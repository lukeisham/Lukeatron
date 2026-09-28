// flourish.js — the three small acknowledgements the interface gives back
// (plan projectkanban-ui-flourishes): a wash on whatever was just copied,
// a wash and a ✓ on a control whose edit just saved, and a red that stays on
// a control whose edit failed. This file only adds and removes classes and
// one throwaway ✓ node; every colour, size and duration lives in
// flourish.css and tokens.css (CSS-2). Nothing here touches the network,
// delays an event, or moves other elements.
//
// Every helper tolerates a null target and a fake DOM (TEST-8): the fake has
// classList/addEventListener but no parentNode, offsetLeft or removeAttribute.

import { el } from "./dom.js";

const doneHandlers = new WeakMap();

// Restart a one-shot CSS animation carried by `cls`: drop the class, force a
// reflow so the browser sees it removed, add it back, and clear it again when
// this node's own animation ends. A child's animationend bubbles up here, so
// only an event whose target is the node itself counts.
function restart(node, cls) {
  const previous = doneHandlers.get(node);
  if (previous) node.removeEventListener?.("animationend", previous);
  node.classList.remove(cls);
  void node.offsetWidth;
  node.classList.add(cls);
  const done = (event) => {
    if (event?.target && event.target !== node) return;
    node.classList.remove(cls);
    node.removeEventListener?.("animationend", done);
    doneHandlers.delete(node);
  };
  doneHandlers.set(node, done);
  node.addEventListener("animationend", done);
}

/** A soft accent wash over `target`, fading out — for what was just copied. */
export function wash(target) {
  if (!target) return;
  restart(target, "is-washed");
}

/** A saved edit: wash the control and drop a ✓ on its top-right corner. The
 * mark is positioned from the control's own box (layout geometry, not a
 * design value) and floats above the row, so nothing around it moves. Where
 * the fade has been switched off (reduced motion) the mark simply stays
 * until the next render replaces the page. */
export function markSaved(control) {
  if (!control) return;
  restart(control, "is-saved");
  const row = control.parentNode;
  if (!row?.appendChild || control.offsetLeft === undefined) return;
  const mark = el("span", { class: "project-saved-mark", "aria-hidden": "true" }, "✓");
  mark.style.left = `${control.offsetLeft + control.offsetWidth}px`;
  mark.style.top = `${control.offsetTop}px`;
  mark.addEventListener("animationend", () => mark.parentNode?.removeChild(mark));
  row.appendChild(mark);
}

/** A failed edit: red, and it stays red until the person next touches the
 * control. Never fades — a refusal must not be able to go unnoticed. */
export function markFailed(control) {
  if (!control) return;
  control.classList.add("is-failed");
  control.setAttribute("aria-invalid", "true");
  const clear = () => {
    control.classList.remove("is-failed");
    if (control.removeAttribute) control.removeAttribute("aria-invalid");
    else control.setAttribute("aria-invalid", "false");
    control.removeEventListener?.("input", clear);
    control.removeEventListener?.("change", clear);
  };
  control.addEventListener("input", clear);
  control.addEventListener("change", clear);
}

// The control class each editable field renders as (task-row.js).
const CONTROL_CLASS = { due: "project-task-due", owner: "project-task-owner", kind: "project-task-lane" };

/** After a successful edit re-renders the page, flash the control that was
 * edited. `flash` is `{ index, field }` (the row's `data-task-index` and the
 * edit field); a field with no surviving control — a ticked-done row has left
 * the open list — gets no flourish. Returns true when a control was flashed. */
export function applyFlash(root, flash) {
  if (!root || !flash) return false;
  const cls = CONTROL_CLASS[flash.field];
  if (!cls) return false;
  const control = root.querySelector(`.project-task-row[data-task-index="${flash.index}"] .${cls}`);
  if (!control) return false;
  markSaved(control);
  return true;
}
