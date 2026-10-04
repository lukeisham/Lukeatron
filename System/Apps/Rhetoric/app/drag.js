/**
 * Drag and drop in the Topical view, delegated on the list element so a re-render needs no
 * rebinding. render.js marks what can move (`draggable`: device rows and a real Type's heading
 * row) and what can receive (`data-droppable`: real Types); nothing else in the list reacts.
 *
 * What a drop means is reported, not decided here (main.js decides, with the data):
 *   a device on a Type heading or its empty space  -> { overDevice: null, side: null }  (put it last)
 *   a device on another device row in that Type    -> { overDevice, side }              (put it there)
 *   a Type on another Type                         -> { overDevice: null, side }        (reorder)
 * `side` is 'before' or 'after' the row under the pointer, by which half of it the pointer is in.
 */

const DROP_CLASS = 'drop-target';
const SIDE_CLASS = { before: 'drop-before', after: 'drop-after' };
const DRAGGING_CLASS = 'dragging';

function sideOf(event, element) {
  const box = element.getBoundingClientRect();
  return event.clientY < box.top + box.height / 2 ? 'before' : 'after';
}

/** @param {(drop: {kind: 'device' | 'type', id: number, overType: number, overDevice: number | null, side: string | null}) => void} onDrop */
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
    const overType = Number(type.dataset.nodeId);
    if (dragged.kind === 'type') {
      if (dragged.id === overType) return null;
      const side = sideOf(event, type);
      return { element: type, className: SIDE_CLASS[side], overType, overDevice: null, side };
    }
    const row = event.target.closest('[data-device-id]');
    if (row && Number(row.dataset.deviceId) !== dragged.id) {
      const side = sideOf(event, row);
      return { element: row, className: SIDE_CLASS[side], overType, overDevice: Number(row.dataset.deviceId), side };
    }
    return row ? null : { element: type, className: DROP_CLASS, overType, overDevice: null, side: null };
  }

  list.addEventListener('dragstart', (event) => {
    const device = event.target.closest?.('[data-device-id][draggable="true"]');
    const handle = device ? null : event.target.closest?.('.heading-row[draggable="true"]');
    if (!device && !handle) return;
    dragged = device
      ? { kind: 'device', id: Number(device.dataset.deviceId) }
      : { kind: 'type', id: Number(handle.closest('[data-node-id]').dataset.nodeId) };
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
    const drop = target && { ...dragged, overType: target.overType, overDevice: target.overDevice, side: target.side };
    clearHover();
    if (!drop) return;
    event.preventDefault();
    onDrop(drop);
  });
}
