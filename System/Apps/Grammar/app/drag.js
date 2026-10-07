/**
 * Drag and drop in the Labels view, delegated on the list element so a re-render needs no rebinding. render.js marks
 * what can move (`draggable`: entry rows and a label's heading row) and what can receive (`data-droppable`: labels);
 * nothing else in the list reacts.
 *
 * A drop is reported with the group it happened in (`hierarchy`), and never lands across groups. A label can be dropped
 * on any other label of its group except itself and what is beneath it; where it goes depends on where in the heading it
 * lands.
 *
 * What a drop means is reported, not decided here (main.js decides, with the data):
 *   an entry on a label heading or its empty space -> { overEntry: null, side: null }  (put it last)
 *   an entry on another entry row in that label    -> { overEntry, side }              (put it there)
 *   a label on another label                       -> { overEntry: null, side }        (move it)
 * For an entry, `side` is 'before' or 'after' the row under the pointer, by which half of it the pointer is in.
 * For a label, `side` is 'before' or 'after' the heading (its top or bottom quarter: beside it, under its parent) or
 * 'inside' (the middle, or anywhere over what is beneath the heading: last among its sub-labels). A link label
 * (`data-link`) has no inside: the middle counts as the nearer edge, and an entry cannot be dropped on it.
 */

const DROP_CLASS = 'drop-target';
const SIDE_CLASS = { before: 'drop-before', after: 'drop-after' };
const DRAGGING_CLASS = 'dragging';

function sideOf(event, element) {
  const box = element.getBoundingClientRect();
  return event.clientY < box.top + box.height / 2 ? 'before' : 'after';
}

const EDGE = 0.25; // the top and bottom quarter of a heading mean beside it; the middle half means inside it

/** Where on a label heading the pointer is: 'before', 'after', or 'inside' (the middle, or below the heading over what it holds). */
function zoneOf(event, heading) {
  const box = heading.getBoundingClientRect();
  const fraction = (event.clientY - box.top) / box.height;
  if (fraction < EDGE) return 'before';
  return fraction > 1 - EDGE && fraction <= 1 ? 'after' : 'inside';
}

/** @param {(drop: {kind: 'entry' | 'label', hierarchy: string, id: number, overLabel: number, overEntry: number | null, side: string | null}) => void} onDrop */
export function bindDragAndDrop(list, onDrop) {
  let dragged = null; // what is in flight; null for anything that did not start in the list (e.g. selected text)
  let hovered = null; // { element, className }

  const clearHover = () => {
    hovered?.element.classList.remove(hovered.className);
    hovered = null;
  };
  const showHover = (element, className) => {
    if (hovered?.element === element && hovered.className === className) return;
    clearHover();
    element.classList.add(className);
    hovered = { element, className };
  };

  // The row under the pointer, or null when this drag has nowhere to land there. `closest` is
  // missing on text nodes, which is what a drag of selected text reports as its target.
  function landing(event) {
    const label = event.target.closest?.('[data-droppable]');
    if (!label || !dragged) return null;
    if (label.dataset.hierarchy !== dragged.hierarchy) return null;
    const overLabel = Number(label.dataset.nodeId);
    const isLink = label.dataset.link === 'true'; // a link label holds nothing: a label lands beside it, an entry nowhere on it
    if (dragged.kind === 'label') {
      if (dragged.item.contains(label)) return null; // itself, or something beneath it: it cannot go under itself
      const heading = label.querySelector('.heading-row');
      const zone = zoneOf(event, heading);
      const side = zone === 'inside' && isLink ? sideOf(event, heading) : zone;
      return { element: label, className: side === 'inside' ? DROP_CLASS : SIDE_CLASS[side], overLabel, overEntry: null, side };
    }
    if (isLink) return null;
    const row = event.target.closest('[data-entry-id]');
    if (row && Number(row.dataset.entryId) !== dragged.id) {
      const side = sideOf(event, row);
      return { element: row, className: SIDE_CLASS[side], overLabel, overEntry: Number(row.dataset.entryId), side };
    }
    return row ? null : { element: label, className: DROP_CLASS, overLabel, overEntry: null, side: null };
  }

  list.addEventListener('dragstart', (event) => {
    if (list.ownerDocument?.body?.classList.contains('read-only')) return event.preventDefault(); // read-only mode: nothing moves
    const entry = event.target.closest?.('[data-entry-id][draggable="true"]');
    const handle = entry ? null : event.target.closest?.('.heading-row[draggable="true"]');
    if (!entry && !handle) return;
    const heading = handle?.closest('[data-node-id]');
    dragged = entry
      ? { kind: 'entry', hierarchy: entry.closest('[data-hierarchy]').dataset.hierarchy, id: Number(entry.dataset.entryId) }
      : { kind: 'label', hierarchy: heading.dataset.hierarchy, item: heading, id: Number(heading.dataset.nodeId) };
    event.dataTransfer.setData('text/plain', String(dragged.id)); // Firefox starts no drag without data
    event.dataTransfer.effectAllowed = dragged.kind === 'entry' ? 'copy' : 'move';
    (entry ?? handle).classList.add(DRAGGING_CLASS);
  });

  list.addEventListener('dragend', (event) => {
    event.target.classList?.remove(DRAGGING_CLASS);
    dragged = null;
    clearHover();
  });

  list.addEventListener('dragover', (event) => {
    const target = landing(event);
    if (!target) return clearHover();
    event.preventDefault(); // without this the browser refuses the drop
    event.dataTransfer.dropEffect = dragged.kind === 'entry' ? 'copy' : 'move';
    showHover(target.element, target.className);
  });

  list.addEventListener('dragleave', (event) => {
    if (!list.contains(event.relatedTarget)) clearHover();
  });

  list.addEventListener('drop', (event) => {
    const target = landing(event);
    const drop = target && { kind: dragged.kind, hierarchy: dragged.hierarchy, id: dragged.id, overLabel: target.overLabel, overEntry: target.overEntry, side: target.side };
    clearHover();
    if (!drop) return;
    event.preventDefault();
    onDrop(drop);
  });
}
