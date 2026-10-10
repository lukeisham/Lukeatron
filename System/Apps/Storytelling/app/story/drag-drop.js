/**
 * drag-drop.js — the pointer gestures that build and edit the story map.
 *
 * Three gestures, all with pointer events, all starting only after a move of more
 * than DRAG_THRESHOLD_PX so a plain press stays a click:
 *   - "tile": a diagram tile (or the Rogue card) dragged into the tray  -> addBead / pairBead
 *   - "bead": a bead dragged around                                     -> moveBead / mergeBeads / removeBead
 *   - "link": a bead's link dot dragged onto another bead                -> linkBeads
 * A background press is never ours: dragging the diagram background pans (viewport.js).
 *
 * This file only calls the model; it never edits a story itself (documentation contract row).
 */
import { EVT_NOTICE } from "../shared/events.js";
import { DRAG_THRESHOLD_PX } from "../diagram/selection.js";
import { pointOnCurve, ribbonCurve } from "./story-layout.js";
import { addBead, moveBead, removeBead, linkBeads, pairBead, mergeBeads, getStoryState } from "./story-model.js";

/** Width and height of a bead's dock notch; half of it sits outside the bead's right edge. */
export const DOCK_WIDTH = 14;
export const DOCK_HEIGHT = 30;
/** How close (px) the pointer must be to a ribbon's curve to count as "on" it. */
export const RIBBON_HIT_DISTANCE = 14;

const RIBBON_SAMPLES = 32;
const DRAG_SVG_NS = "http://www.w3.org/2000/svg";
const DRAG_DEFAULT_MS = 180;
const DRAG_FALLBACK_STORE = Object.freeze({ addBead, moveBead, removeBead, linkBeads, pairBead, mergeBeads, getStoryState });
const DRAG_IGNORED_PRESS = ".st-bead__remove, .st-bead__dock, input, textarea, button, select";
const DRAG_CAPS_PARTS = ["is-dragging", "is-dragging-pairable"];

/* ---------- pure geometry: no DOM ---------- */

function dragRectContains(rect, x, y) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

function dockRectOf(position) {
  return {
    x: position.x + position.w - DOCK_WIDTH / 2,
    y: position.y + position.h / 2 - DOCK_HEIGHT / 2,
    w: DOCK_WIDTH,
    h: DOCK_HEIGHT,
  };
}

function pointToSegmentDistance(px, py, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / lengthSquared));
  return Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy));
}

function distanceToCurve(point, curve) {
  let best = Infinity;
  let previous = pointOnCurve(curve, 0);
  for (let i = 1; i <= RIBBON_SAMPLES; i++) {
    const next = pointOnCurve(curve, i / RIBBON_SAMPLES);
    best = Math.min(best, pointToSegmentDistance(point.x, point.y, previous, next));
    previous = next;
  }
  return best;
}

function curveOfPath(path, layoutResult) {
  return path.curve ?? ribbonCurve([path.from, path.to], layoutResult, path.loop);
}

function nearestRibbon(point, layoutResult, excludeUid, maxDistance) {
  let best = null;
  let bestDistance = maxDistance;
  for (const path of layoutResult.ribbonPaths ?? []) {
    if (path.from === excludeUid || path.to === excludeUid) continue;
    const curve = curveOfPath(path, layoutResult);
    if (!curve) continue;
    const distance = distanceToCurve(point, curve);
    if (distance <= bestDistance) {
      bestDistance = distance;
      best = { type: "ribbon", from: path.from, to: path.to };
    }
  }
  return best;
}

/**
 * What would a release at `point` do? Priority: dock, then bead, then ribbon, then empty tray space.
 *
 * @param {{x:number,y:number}} point in canvas-content pixels (the layout's coordinate space)
 * @param {{ positions?: object, ribbonPaths?: Array }|null} layoutResult from `layout()`
 * @param {Array<{uid:string, with?:string}>} [beads] used to tell which beads are already tandems
 * @param {{ inTray?: boolean, excludeUid?: string|null, canPair?: boolean, ribbonDistance?: number }} [options]
 *   `inTray` false means the pointer is off the tray (result null); `excludeUid` is the bead being dragged
 *   (hitting it or its dock gives `{type:"self"}`, and its own ribbons are skipped); `canPair` says whether
 *   the dragged thing could join a bead in tandem, which decides whether docks exist.
 * @returns {{type:"dock"|"bead"|"self",uid:string}|{type:"ribbon",from:string,to:string}|{type:"empty"}|null}
 *   `self` is not a model target: it means "back where it came from". `null` means off the tray.
 */
export function hitTest(point, layoutResult, beads = [], options = {}) {
  const { inTray = true, excludeUid = null, canPair = true, ribbonDistance = RIBBON_HIT_DISTANCE } = options;
  if (!inTray) return null;
  if (!point || !layoutResult) return { type: "empty" };
  const positions = layoutResult.positions ?? {};
  const tandemUids = new Set(beads.filter((bead) => bead.with).map((bead) => bead.uid));
  const isTandem = (uid) => tandemUids.has(uid) || positions[uid].widthClass === 2;
  const uids = Object.keys(positions);

  for (const uid of uids) {
    if (isTandem(uid) || !dragRectContains(dockRectOf(positions[uid]), point.x, point.y)) continue;
    if (uid === excludeUid) return { type: "self", uid };
    if (canPair) return { type: "dock", uid };
  }
  for (const uid of uids) {
    if (!dragRectContains(positions[uid], point.x, point.y)) continue;
    return uid === excludeUid ? { type: "self", uid } : { type: "bead", uid };
  }
  return nearestRibbon(point, layoutResult, excludeUid, ribbonDistance) ?? { type: "empty" };
}

/**
 * Milliseconds from a CSS time string ("180ms", "0.18s"); `fallback` when unreadable.
 * @param {string|undefined|null} text
 * @param {number} fallback
 * @returns {number}
 */
export function parseDurationMs(text, fallback) {
  const match = /^\s*(-?\d*\.?\d+)\s*(ms|s)\s*$/.exec(text ?? "");
  if (!match) return fallback;
  return match[2] === "s" ? Number(match[1]) * 1000 : Number(match[1]);
}

function dragTargetKey(target) {
  if (!target || target.type === "self") return "none";
  return `${target.type}|${target.uid ?? ""}|${target.from ?? ""}|${target.to ?? ""}`;
}

function dragModelTarget(target) {
  return { ...target };
}

/* ---------- the mount ---------- */

/**
 * Wire the drag gestures.
 *
 * @param {{ diagramHost: HTMLElement, canvas: { canvasEl: HTMLElement, trayEl: HTMLElement,
 *   getLayoutResult: () => object, setDropTarget: (target: object|null) => void, render: () => void } }} parts
 * @param {{ store?: object, document?: Document, window?: Window }} [options] `store` defaults to the app's
 *   story model; tests pass a fake with the same method names.
 * @returns {{ destroy: () => void }}
 */
export function mountDragDrop({ diagramHost, canvas }, options = {}) {
  const store = options.store ?? DRAG_FALLBACK_STORE;
  const doc = options.document ?? globalThis.document;
  const win = options.window ?? globalThis.window ?? {};
  const liveGhosts = new Set();
  let gesture = null;
  let clickGuard = null;

  /* ----- environment helpers ----- */

  const prefersReducedMotion = () => Boolean(win.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
  const motionMs = (name) => {
    const value = win.getComputedStyle?.(doc.documentElement)?.getPropertyValue(name);
    return parseDurationMs(value, DRAG_DEFAULT_MS);
  };

  function toCanvasPoint(event) {
    const rect = canvas.canvasEl.getBoundingClientRect();
    return {
      x: event.clientX - rect.left + (canvas.canvasEl.scrollLeft || 0),
      y: event.clientY - rect.top + (canvas.canvasEl.scrollTop || 0),
    };
  }

  function canvasToClient(x, y) {
    const rect = canvas.canvasEl.getBoundingClientRect();
    return { x: x + rect.left - (canvas.canvasEl.scrollLeft || 0), y: y + rect.top - (canvas.canvasEl.scrollTop || 0) };
  }

  function pointerIsInTray(event) {
    const rect = canvas.trayEl.getBoundingClientRect();
    return event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
  }

  function showNotice(message) {
    canvas.setDropTarget(null);
    doc.dispatchEvent(new CustomEvent(EVT_NOTICE, { detail: { message } }));
  }

  /* ----- ghost ----- */

  function buildGhost(source, rect) {
    let ghost;
    if (source.namespaceURI === DRAG_SVG_NS) {
      ghost = doc.createElementNS(DRAG_SVG_NS, "svg");
      const box = source.getBBox?.() ?? { x: 0, y: 0, width: rect.width, height: rect.height };
      ghost.setAttribute("viewBox", `${box.x} ${box.y} ${box.width} ${box.height}`);
      ghost.appendChild(source.cloneNode(true));
    } else {
      ghost = source.cloneNode(true);
      for (const control of [...ghost.querySelectorAll(".st-bead__remove, .st-bead__dock, .st-bead__link-dot")]) control.remove();
    }
    for (const node of [ghost, ...ghost.querySelectorAll("[data-element-id], [data-bead-uid]")]) {
      node.removeAttribute("data-element-id");
      node.removeAttribute("data-bead-uid");
      node.removeAttribute("tabindex");
      node.removeAttribute("id");
    }
    ghost.classList.add("st-ghost");
    ghost.setAttribute("aria-hidden", "true");
    const style = ghost.style;
    style.position = "fixed";
    style.left = "0px";
    style.top = "0px";
    style.margin = "0";
    style.width = `${rect.width}px`;
    style.height = `${rect.height}px`;
    style.pointerEvents = "none";
    style.zIndex = "1000";
    doc.body.appendChild(ghost);
    return ghost;
  }

  function placeGhost(x, y) {
    gesture.ghost.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    gesture.ghostX = x;
    gesture.ghostY = y;
  }

  function retireGhost(ghost, keyframes, onDone) {
    const finish = () => {
      liveGhosts.delete(ghost);
      ghost.remove();
      onDone?.();
    };
    liveGhosts.add(ghost);
    if (prefersReducedMotion() || typeof ghost.animate !== "function") {
      finish();
      return;
    }
    const animation = ghost.animate(keyframes, { duration: motionMs("--m-base"), easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" });
    animation.finished.then(finish, finish);
  }

  const ghostTransform = (x, y, scale = 1) => `translate3d(${x}px, ${y}px, 0) scale(${scale})`;

  function glideBack(state) {
    const from = ghostTransform(state.ghostX, state.ghostY);
    const to = ghostTransform(state.originRect.left, state.originRect.top);
    retireGhost(state.ghost, [{ transform: from, opacity: 1 }, { transform: to, opacity: 0.6 }], () => state.source.classList.remove("is-picked"));
  }

  function settleInto(state, uid) {
    const position = uid ? canvas.getLayoutResult()?.positions?.[uid] : null;
    const at = position ? canvasToClient(position.x + position.w / 2 - state.originRect.width / 2, position.y + position.h / 2 - state.originRect.height / 2) : { x: state.ghostX, y: state.ghostY };
    state.source.classList.remove("is-picked");
    retireGhost(state.ghost, [
      { transform: ghostTransform(state.ghostX, state.ghostY), opacity: 1 },
      { transform: ghostTransform(at.x, at.y, 1.06), opacity: 1, offset: 0.7 },
      { transform: ghostTransform(at.x, at.y, 1), opacity: 0 },
    ]);
  }

  function vanish(state) {
    state.source.classList.remove("is-picked");
    retireGhost(state.ghost, [
      { transform: ghostTransform(state.ghostX, state.ghostY), opacity: 1 },
      { transform: ghostTransform(state.ghostX, state.ghostY, 0.6), opacity: 0 },
    ]);
  }

  /* ----- starting a press ----- */

  function beadOf(element) {
    return element.closest(".st-bead");
  }

  function startPending(event, details) {
    if (gesture) return;
    gesture = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, dragging: false, ...details };
    doc.addEventListener("pointermove", onPointerMove);
    doc.addEventListener("pointerup", onPointerUp);
    doc.addEventListener("pointercancel", onPointerCancel);
    doc.addEventListener("keydown", onKeyDown, true);
  }

  const isPrimaryPress = (event) => event.button === 0 && event.isPrimary !== false;

  function onTilePress(event) {
    if (!isPrimaryPress(event) || !event.target?.closest) return;
    const tile = event.target.closest("[data-element-id]");
    if (!tile) return;
    startPending(event, { kind: "tile", source: tile, elementId: tile.getAttribute("data-element-id") });
  }

  function onCanvasPress(event) {
    if (!isPrimaryPress(event) || !event.target?.closest) return;
    const linkDot = event.target.closest(".st-bead__link-dot");
    const bead = beadOf(event.target);
    if (!bead) return;
    const beadUid = bead.getAttribute("data-bead-uid");
    if (linkDot) {
      startPending(event, { kind: "link", source: bead, beadUid });
      return;
    }
    if (event.target.closest(DRAG_IGNORED_PRESS)) return;
    startPending(event, { kind: "bead", source: bead, beadUid });
  }

  /* ----- during a drag ----- */

  function beginDrag(event) {
    const state = gesture;
    state.dragging = true;
    state.highlightKey = "none";
    state.beads = store.getStoryState().beads;
    doc.body?.classList.add("st-is-dragging");
    if (state.kind === "link") {
      state.linkPath = null;
      return;
    }
    const rect = state.source.getBoundingClientRect();
    state.originRect = rect;
    state.grabX = state.startX - rect.left;
    state.grabY = state.startY - rect.top;
    state.ghost = buildGhost(state.source, rect);
    state.source.classList.add("is-picked");
    state.canPair = state.kind === "tile" || !state.beads.find((bead) => bead.uid === state.beadUid)?.with;
    canvas.trayEl.classList.add(DRAG_CAPS_PARTS[0]);
    if (state.canPair) canvas.trayEl.classList.add(DRAG_CAPS_PARTS[1]);
  }

  function targetAt(event) {
    const state = gesture;
    return hitTest(toCanvasPoint(event), canvas.getLayoutResult(), state.beads, {
      inTray: pointerIsInTray(event),
      excludeUid: state.beadUid ?? null,
      canPair: state.kind === "link" ? false : state.canPair,
    });
  }

  function highlight(target) {
    const key = dragTargetKey(target);
    if (key === gesture.highlightKey) return;
    gesture.highlightKey = key;
    canvas.setDropTarget(key === "none" ? null : dragModelTarget(target));
  }

  function findBeadElement(uid) {
    return [...canvas.canvasEl.querySelectorAll(".st-bead")].find((el) => el.getAttribute("data-bead-uid") === uid) ?? null;
  }

  function markLinkTarget(target) {
    const uid = target?.type === "bead" ? target.uid : null;
    if (uid === gesture.linkTargetUid) return;
    if (gesture.linkTargetUid) findBeadElement(gesture.linkTargetUid)?.classList.remove("is-link-target");
    gesture.linkTargetUid = uid;
    if (uid) findBeadElement(uid)?.classList.add("is-link-target");
  }

  function drawTempLink(event) {
    const state = gesture;
    const threads = canvas.canvasEl.querySelector("svg.st-threads");
    if (!threads) return;
    if (!state.linkPath) {
      state.linkPath = doc.createElementNS(DRAG_SVG_NS, "path");
      state.linkPath.setAttribute("class", "st-thread--temp");
      state.linkPath.setAttribute("aria-hidden", "true");
      state.linkPath.style.pointerEvents = "none";
    }
    if (state.linkPath.parentNode !== threads) threads.appendChild(state.linkPath);
    const from = canvas.getLayoutResult()?.positions?.[state.beadUid];
    const end = toCanvasPoint(event);
    const start = from ? { x: from.x + from.w, y: from.y + from.h / 2 } : end;
    const reach = Math.max(24, Math.abs(end.x - start.x) / 2);
    state.linkPath.setAttribute("d", `M ${start.x} ${start.y} C ${start.x + reach} ${start.y}, ${end.x - reach} ${end.y}, ${end.x} ${end.y}`);
  }

  function onPointerMove(event) {
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    if (!gesture.dragging) {
      if (Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) <= DRAG_THRESHOLD_PX) return;
      beginDrag(event);
    }
    event.preventDefault?.();
    if (gesture.kind === "link") {
      drawTempLink(event);
      markLinkTarget(targetAt(event));
      return;
    }
    placeGhost(event.clientX - gesture.grabX, event.clientY - gesture.grabY);
    highlight(targetAt(event));
  }

  /* ----- finishing ----- */

  function swallowNextClick() {
    clickGuard?.();
    const remove = () => {
      clickGuard = null;
      win.removeEventListener?.("click", swallow, true);
      win.removeEventListener?.("pointerdown", remove, true);
    };
    const swallow = (event) => {
      event.stopPropagation();
      event.preventDefault?.();
      remove();
    };
    win.addEventListener?.("click", swallow, true);
    win.addEventListener?.("pointerdown", remove, true);
    clickGuard = remove;
  }

  /** Detach listeners and undo every mark the gesture put on the page; the ghost is handled separately. */
  function endGesture() {
    const state = gesture;
    if (!state) return;
    gesture = null;
    doc.removeEventListener("pointermove", onPointerMove);
    doc.removeEventListener("pointerup", onPointerUp);
    doc.removeEventListener("pointercancel", onPointerCancel);
    doc.removeEventListener("keydown", onKeyDown, true);
    if (!state.dragging) return;
    doc.body?.classList.remove("st-is-dragging");
    for (const name of DRAG_CAPS_PARTS) canvas.trayEl.classList.remove(name);
    if (state.linkTargetUid) findBeadElement(state.linkTargetUid)?.classList.remove("is-link-target");
    state.linkPath?.remove();
    if (state.highlightKey && state.highlightKey !== "none") canvas.setDropTarget(null);
    swallowNextClick();
  }

  function callModel(state, target) {
    const { kind, elementId, beadUid } = state;
    if (kind === "tile") {
      if (target.type === "dock") return { result: store.pairBead(target.uid, elementId), settleUid: target.uid };
      const result = store.addBead(elementId, dragModelTarget(target));
      return { result, settleUid: result.uid };
    }
    if (target.type === "dock") return { result: store.mergeBeads(beadUid, target.uid), settleUid: target.uid };
    return { result: store.moveBead(beadUid, dragModelTarget(target)), settleUid: beadUid };
  }

  function commitDrop(state, target) {
    if (state.kind === "bead" && target === null) {
      const result = store.removeBead(state.beadUid);
      if (result.ok) vanish(state);
      else refuse(state, result);
      return;
    }
    if (target === null || target.type === "self") {
      glideBack(state);
      return;
    }
    const { result, settleUid } = callModel(state, target);
    if (result.ok) settleInto(state, settleUid);
    else refuse(state, result);
  }

  function refuse(state, result) {
    showNotice(result.error?.message ?? "That could not be done");
    glideBack(state);
  }

  function commitLink(state, target) {
    if (target?.type !== "bead") return;
    const result = store.linkBeads(state.beadUid, target.uid);
    if (!result.ok) showNotice(result.error?.message ?? "That link could not be made");
  }

  function onPointerUp(event) {
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    const state = gesture;
    if (!state.dragging) {
      endGesture();
      return;
    }
    const target = targetAt(event);
    endGesture();
    try {
      if (state.kind === "link") commitLink(state, target);
      else commitDrop(state, target);
    } catch (error) {
      console.warn("drag-drop: the story model threw on release; drag cancelled", error);
      if (state.ghost) glideBack(state);
    }
  }

  function cancelDrag() {
    const state = gesture;
    if (!state) return;
    endGesture();
    if (state.dragging && state.ghost) glideBack(state);
  }

  function onPointerCancel(event) {
    if (gesture && event.pointerId === gesture.pointerId) cancelDrag();
  }

  function onKeyDown(event) {
    if (event.key !== "Escape" || !gesture?.dragging) return;
    event.stopPropagation();
    event.preventDefault?.();
    cancelDrag();
  }

  diagramHost.addEventListener("pointerdown", onTilePress);
  canvas.canvasEl.addEventListener("pointerdown", onCanvasPress);

  return {
    destroy() {
      cancelDrag();
      endGesture();
      clickGuard?.();
      diagramHost.removeEventListener("pointerdown", onTilePress);
      canvas.canvasEl.removeEventListener("pointerdown", onCanvasPress);
      for (const ghost of liveGhosts) ghost.remove();
      liveGhosts.clear();
    },
  };
}
