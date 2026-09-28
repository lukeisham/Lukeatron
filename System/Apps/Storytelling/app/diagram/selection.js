import { EVT_OPEN, EVT_SELECT } from "../shared/events.js";

/** A press that travels further than this many pixels is a drag: it never opens, never clears. One shared constant (viewport spec risk table). */
export const DRAG_THRESHOLD_PX = 5;

const SELECTION_TILE_SELECTOR = ".tile";
const SELECTION_CLASS = "is-selected";
const SELECTION_ID_ATTR = "data-element-id";

let selectedElementId = null;

/** The id of the selected element, or null. Selection alone opens nothing and enables no print/copy. */
export function getSelectedElementId() {
  return selectedElementId;
}

function emitSelectionEvent(name, detail) {
  document.dispatchEvent(new CustomEvent(name, { detail }));
}

function tileFromTarget(target) {
  return target?.closest?.(SELECTION_TILE_SELECTOR) ?? null;
}

function elementIdOfTile(tile) {
  return tile.getAttribute(SELECTION_ID_ATTR);
}

function findTileById(host, elementId) {
  return host.querySelectorAll(SELECTION_TILE_SELECTOR).find((tile) => elementIdOfTile(tile) === elementId) ?? null;
}

function keyIs(event, ...names) {
  return names.includes(event.key);
}

/**
 * Wires selection onto the diagram host. Tiles are found by class `tile` and attribute `data-element-id`, so the
 * host survives the SVG being redrawn (call `refresh()` after a redraw). Drag START belongs to drag-drop.js: this
 * module never calls preventDefault on a tile press, it only watches how far the pointer travelled.
 * @param {Element} host the `#diagram-host` element
 * @returns {{select: Function, clear: Function, getSelectedId: Function, refresh: Function, destroy: Function}}
 */
export function mountSelection(host) {
  selectedElementId = null;
  let press = null;
  // Set when the latest press was a drag, so the dblclick the browser may still fire afterwards is ignored.
  let lastPressWasDrag = false;

  function paint() {
    for (const tile of host.querySelectorAll(SELECTION_TILE_SELECTOR)) {
      tile.classList.toggle(SELECTION_CLASS, selectedElementId !== null && elementIdOfTile(tile) === selectedElementId);
    }
  }

  function select(elementId) {
    if (elementId === selectedElementId) return;
    selectedElementId = elementId;
    paint();
    emitSelectionEvent(EVT_SELECT, { elementId });
  }

  function clear() {
    if (selectedElementId === null) return;
    selectedElementId = null;
    paint();
    emitSelectionEvent(EVT_SELECT, { elementId: null });
  }

  function open(elementId) {
    select(elementId);
    emitSelectionEvent(EVT_OPEN, { elementId });
  }

  function onPointerMove(event) {
    if (!press || event.pointerId !== press.pointerId) return;
    const travelled = Math.hypot(event.clientX - press.x, event.clientY - press.y);
    if (travelled > DRAG_THRESHOLD_PX) press.moved = true;
  }

  function endPress(event, cancelled) {
    if (!press || event.pointerId !== press.pointerId) return;
    const finished = press;
    stopTracking();
    lastPressWasDrag = finished.moved || cancelled;
    if (!finished.onTile && !lastPressWasDrag) clear();
  }

  function onPointerUp(event) { endPress(event, false); }
  function onPointerCancel(event) { endPress(event, true); }

  function stopTracking() {
    press = null;
    document.removeEventListener("pointermove", onPointerMove, true);
    document.removeEventListener("pointerup", onPointerUp, true);
    document.removeEventListener("pointercancel", onPointerCancel, true);
  }

  function onPointerDown(event) {
    if (event.button !== undefined && event.button !== 0) return;
    if (press) {
      // A second finger means pinch, not a click: the first press can no longer clear or open.
      press.moved = true;
      return;
    }
    const tile = tileFromTarget(event.target);
    lastPressWasDrag = false;
    press = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, moved: false, onTile: tile !== null };
    // Capture phase on the document: drag-drop may take pointer capture or stop propagation, and we must still see the release.
    document.addEventListener("pointermove", onPointerMove, true);
    document.addEventListener("pointerup", onPointerUp, true);
    document.addEventListener("pointercancel", onPointerCancel, true);
    if (tile) select(elementIdOfTile(tile));
  }

  function onDoubleClick(event) {
    const tile = tileFromTarget(event.target);
    if (!tile || lastPressWasDrag) return;
    open(elementIdOfTile(tile));
  }

  function onKeyDown(event) {
    const tile = tileFromTarget(event.target);
    if (!tile || event.ctrlKey || event.metaKey || event.altKey) return;
    if (keyIs(event, "Enter")) {
      event.preventDefault();
      open(elementIdOfTile(tile));
    } else if (keyIs(event, " ", "Spacebar")) {
      event.preventDefault();
      select(elementIdOfTile(tile));
    }
  }

  host.addEventListener("pointerdown", onPointerDown);
  host.addEventListener("dblclick", onDoubleClick);
  host.addEventListener("keydown", onKeyDown);

  return {
    select,
    clear,
    getSelectedId: getSelectedElementId,
    /** Re-applies the cue after the SVG was redrawn; clears the selection if that element no longer exists. */
    refresh() {
      if (selectedElementId !== null && !findTileById(host, selectedElementId)) clear();
      else paint();
    },
    destroy() {
      stopTracking();
      host.removeEventListener("pointerdown", onPointerDown);
      host.removeEventListener("dblclick", onDoubleClick);
      host.removeEventListener("keydown", onKeyDown);
    },
  };
}
