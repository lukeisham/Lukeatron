/**
 * Drag and drop in the Topical view, delegated on the list element so a re-render needs no
 * rebinding. render.js marks what can move (`draggable`: device rows and a real Type's heading
 * row) and what can receive (`data-droppable`: real Types); nothing else in the list reacts.
 *
 * It serves both editable groups (Topical's Types, Grammar's labels): a drop is reported with the group it
 * happened in (`hierarchy`), and never lands across groups. A Type or label can be dropped on any other Type or
 * label of its group except itself and what is beneath it; where it goes depends on where in the heading it lands.
 *
 * What a drop means is reported, not decided here (main.js decides, with the data):
 *   a device on a Type or label heading or its empty space -> { overDevice: null, side: null }  (put it last)
 *   a device on another device row in that Type or label   -> { overDevice, side }              (put it there)
 *   a Type or label on another Type or label              -> { overDevice: null, side }        (move it)
 * For a device, `side` is 'before' or 'after' the row under the pointer, by which half of it the pointer is in.
 * For a Type or label, `side` is 'before' or 'after' the heading (its top or bottom quarter: beside it, under its
 * parent) or 'inside' (the middle, or anywhere over what is beneath the heading: last among its sub-labels). A link label
 * (`data-link`) has no inside: the middle counts as the nearer edge, and a device cannot be dropped on it.
 */

const DROP_CLASS = 'drop-target';
const SIDE_CLASS = { before: 'drop-before', after: 'drop-after' };
const DRAGGING_CLASS = 'dragging';

function sideOf(event, element) {
  const box = element.getBoundingClientRect();
  return event.clientY < box.top + box.height / 2 ? 'before' : 'after';
}

const EDGE = 0.25; // the top and bottom quarter of a heading mean beside it; the middle half means inside it

/** Where on a Type or label heading the pointer is: 'before', 'after', or 'inside' (the middle, or below the heading over what it holds). */
function zoneOf(event, heading) {
  const box = heading.getBoundingClientRect();
  const fraction = (event.clientY - box.top) / box.height;
  if (fraction < EDGE) return 'before';
  return fraction > 1 - EDGE && fraction <= 1 ? 'after' : 'inside';
}

/** @param {(drop: {kind: 'device' | 'type', hierarchy: string, id: number, overType: number, overDevice: number | null, side: string | null}) => void} onDrop */
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
    const type = event.target.closest?.('[data-droppable]');
    if (!type || !dragged) return null;
    if (type.dataset.hierarchy !== dragged.hierarchy) return null;
    const overType = Number(type.dataset.nodeId);
    const isLink = type.dataset.link === 'true'; // a link label holds nothing: a Type or label lands beside it, a device nowhere on it
    if (dragged.kind === 'type') {
      if (dragged.item.contains(type)) return null; // itself, or something beneath it: it cannot go under itself
      const heading = type.querySelector('.heading-row');
      const zone = zoneOf(event, heading);
      const side = zone === 'inside' && isLink ? sideOf(event, heading) : zone;
      return { element: type, className: side === 'inside' ? DROP_CLASS : SIDE_CLASS[side], overType, overDevice: null, side };
    }
    if (isLink) return null;
    const row = event.target.closest('[data-device-id]');
    if (row && Number(row.dataset.deviceId) !== dragged.id) {
      const side = sideOf(event, row);
      return { element: row, className: SIDE_CLASS[side], overType, overDevice: Number(row.dataset.deviceId), side };
    }
    return row ? null : { element: type, className: DROP_CLASS, overType, overDevice: null, side: null };
  }

  list.addEventListener('dragstart', (event) => {
    if (list.ownerDocument?.body?.classList.contains('read-only')) return event.preventDefault(); // read-only mode: nothing moves
    const device = event.target.closest?.('[data-device-id][draggable="true"]');
    const handle = device ? null : event.target.closest?.('.heading-row[draggable="true"]');
    if (!device && !handle) return;
    const heading = handle?.closest('[data-node-id]');
    dragged = device
      ? { kind: 'device', hierarchy: device.closest('[data-hierarchy]').dataset.hierarchy, id: Number(device.dataset.deviceId) }
      : { kind: 'type', hierarchy: heading.dataset.hierarchy, item: heading, id: Number(heading.dataset.nodeId) };
    event.dataTransfer.setData('text/plain', String(dragged.id)); // Firefox starts no drag without data
    event.dataTransfer.effectAllowed = dragged.kind === 'device' ? 'copy' : 'move';
    (device ?? handle).classList.add(DRAGGING_CLASS);
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
    event.dataTransfer.dropEffect = dragged.kind === 'device' ? 'copy' : 'move';
    showHover(target.element, target.className);
  });

  list.addEventListener('dragleave', (event) => {
    if (!list.contains(event.relatedTarget)) clearHover();
  });

  list.addEventListener('drop', (event) => {
    const target = landing(event);
    const drop = target && { kind: dragged.kind, hierarchy: dragged.hierarchy, id: dragged.id, overType: target.overType, overDevice: target.overDevice, side: target.side };
    clearHover();
    if (!drop) return;
    event.preventDefault();
    onDrop(drop);
  });
}
