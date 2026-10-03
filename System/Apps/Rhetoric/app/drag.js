/**
 * Drag a device row onto a Type heading in the Topical view. Delegated on the list element, so a
 * re-render needs no rebinding; render.js marks the draggable rows and droppable Types, and nothing
 * else in the list reacts. Dropping copies: a device may sit under several Types.
 */

const DROP_CLASS = 'drop-target';
const DRAGGING_CLASS = 'dragging';

/** @param {(typeId: number, deviceId: number) => void} onDrop */
export function bindDragAndDrop(list, onDrop) {
  let hovered = null;
  const clearHover = () => {
    hovered?.classList.remove(DROP_CLASS);
    hovered = null;
  };

  // `closest` is missing on text nodes, which a drag of selected text reports as its target.
  list.addEventListener('dragstart', (event) => {
    const row = event.target.closest?.('[data-device-id][draggable="true"]');
    if (!row) return;
    event.dataTransfer.setData('text/plain', row.dataset.deviceId);
    event.dataTransfer.effectAllowed = 'copy';
    row.classList.add(DRAGGING_CLASS);
  });

  list.addEventListener('dragend', (event) => {
    event.target.classList?.remove(DRAGGING_CLASS);
    clearHover();
  });

  list.addEventListener('dragover', (event) => {
    const type = event.target.closest?.('[data-droppable]');
    if (!type) return clearHover();
    event.preventDefault(); // without this the browser refuses the drop
    event.dataTransfer.dropEffect = 'copy';
    if (type === hovered) return;
    clearHover();
    hovered = type;
    type.classList.add(DROP_CLASS);
  });

  list.addEventListener('dragleave', (event) => {
    if (!list.contains(event.relatedTarget)) clearHover();
  });

  list.addEventListener('drop', (event) => {
    const type = event.target.closest?.('[data-droppable]');
    clearHover();
    if (!type) return;
    event.preventDefault();
    const dropped = event.dataTransfer.getData('text/plain');
    const deviceId = Number(dropped);
    if (dropped === '' || !Number.isInteger(deviceId)) return console.warn('drag: drop carried no device id', { dropped });
    onDrop(Number(type.dataset.nodeId), deviceId);
  });
}
