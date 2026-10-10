import { EVT_OPEN_ABOUT, EVT_OPEN_LISTS, EVT_BEFORE_PRINT, EVT_AFTER_PRINT } from "../shared/events.js";
import { setPrintTarget } from "../shared/output.js";

/** Zoom is measured against the whole-poster view (the reset state): 1 = poster fits, 6 = six times closer. */
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 6;
/** Each toolbar `+` / `−` press multiplies (divides) the zoom by this. */
export const ZOOM_STEP = 1.25;
/** At least this fraction of the poster, on each axis, must stay inside the view. */
export const MIN_VISIBLE_FRACTION = 0.25;
/** An arrow key pans the view by this fraction of its own size. */
export const KEY_PAN_FRACTION = 0.1;
/** The one UI preference, owned by this module alone. */
export const PREFS_KEY = "storytelling.prefs.v1";

const ZOOM_FALLBACK_DURATION_MS = 180;
const ZOOM_SNAP_EPSILON = 1e-6;
const WHEEL_LINE_PX = 16;
const WHEEL_SENSITIVITY = 0.0015;
const WHEEL_PINCH_SENSITIVITY = 0.01;
const VIEWPORT_TILE_SELECTOR = ".tile";
/** Print targets that show the whole poster whatever the on-screen zoom. */
const FULL_POSTER_PRINT_TARGETS = ["table", "story-with-table"];

/* ------------------------------------------------------------------ pure viewBox maths */

/**
 * Parses an SVG viewBox attribute.
 * @param {string|null} text
 * @returns {{x:number,y:number,w:number,h:number}|null} null when it is not four numbers with a positive size
 */
export function parseViewBox(text) {
  if (typeof text !== "string") return null;
  const parts = text.trim().split(/[\s,]+/).map(Number);
  if (parts.length !== 4 || !parts.every(Number.isFinite)) return null;
  const [x, y, w, h] = parts;
  return w > 0 && h > 0 ? { x, y, w, h } : null;
}

/** Formats a viewBox for the attribute, rounded so animation never writes 17-digit numbers. */
export function formatViewBox(vb) {
  return [vb.x, vb.y, vb.w, vb.h].map((n) => Number(n.toFixed(3))).join(" ");
}

/** How far in the view is: 1 at the whole-poster view, 6 at maximum. */
export function zoomLevel(vb, home) {
  return home.w / vb.w;
}

/** The whole-poster view: a copy of the home box. */
export function resetViewBox(home) {
  return { ...home };
}

function clampViewBoxAxis(start, size, homeStart, homeSize) {
  const minVisible = Math.min(size, homeSize * MIN_VISIBLE_FRACTION);
  const lowest = homeStart + minVisible - size;
  const highest = homeStart + homeSize - minVisible;
  return Math.min(Math.max(start, lowest), highest);
}

/** Slides the view back until at least a quarter of the poster (or the whole view, when zoomed past 4x) is inside it. */
export function clampViewBox(vb, home) {
  return {
    x: clampViewBoxAxis(vb.x, vb.w, home.x, home.w),
    y: clampViewBoxAxis(vb.y, vb.h, home.y, home.h),
    w: vb.w,
    h: vb.h,
  };
}

/**
 * Zooms by `factor` keeping the source-coordinate `point` under the same screen position.
 * The resulting zoom is held to 1x–6x; reaching 1x snaps to the whole-poster view.
 */
export function zoomViewBoxAt(vb, home, factor, point) {
  const current = zoomLevel(vb, home);
  const target = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current * factor));
  if (target <= MIN_ZOOM + ZOOM_SNAP_EPSILON) return resetViewBox(home);
  const ratio = current / target;
  const next = {
    x: point.x - (point.x - vb.x) * ratio,
    y: point.y - (point.y - vb.y) * ratio,
    w: home.w / target,
    h: home.h / target,
  };
  return clampViewBox(next, home);
}

/** Moves the view by (dx, dy) in source units, then clamps. */
export function panViewBox(vb, home, dx, dy) {
  return clampViewBox({ ...vb, x: vb.x + dx, y: vb.y + dy }, home);
}

/** Pixels per source unit. `preserveAspectRatio="xMidYMid meet"` scales by the tighter axis. */
export function viewBoxScale(rect, vb) {
  return Math.min(rect.width / vb.w, rect.height / vb.h);
}

/** Converts a screen position to source coordinates, allowing for the letterbox that `meet` leaves. */
export function clientToViewBox(rect, vb, clientX, clientY) {
  const scale = viewBoxScale(rect, vb);
  const offsetX = (rect.width - vb.w * scale) / 2;
  const offsetY = (rect.height - vb.h * scale) / 2;
  return {
    x: vb.x + (clientX - rect.left - offsetX) / scale,
    y: vb.y + (clientY - rect.top - offsetY) / scale,
  };
}

/** Zoom factor for one wheel event. A trackpad pinch arrives as a ctrl-wheel with small deltas, so it gets a higher gain. */
export function wheelZoomFactor(event) {
  const lines = event.deltaMode === 1 ? WHEEL_LINE_PX : 1;
  const gain = event.ctrlKey ? WHEEL_PINCH_SENSITIVITY : WHEEL_SENSITIVITY;
  return Math.exp(-(event.deltaY ?? 0) * lines * gain);
}

/** Cubic in-out easing, the "mid" curve of the style spec. */
export function easeViewBoxInOut(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/** Linear blend between two viewBoxes at progress `t` (0..1). */
export function blendViewBox(from, to, t) {
  const mix = (a, b) => a + (b - a) * t;
  return { x: mix(from.x, to.x), y: mix(from.y, to.y), w: mix(from.w, to.w), h: mix(from.h, to.h) };
}

/* ------------------------------------------------------------------ per-SVG state and animation */

const viewportStates = new WeakMap();

/**
 * The viewport state of an SVG: its home viewBox (read once from the SVG's own attribute, never from layout.js),
 * the current viewBox, and any running animation.
 * @returns {{home:object, vb:object, target:object|null, frame:*}|null} null when the SVG has no usable viewBox
 */
export function getViewportState(svg) {
  if (!svg) return null;
  let state = viewportStates.get(svg);
  if (!state) {
    const home = parseViewBox(svg.getAttribute("viewBox"));
    if (!home) {
      console.warn("viewport: svg has no usable viewBox attribute, zoom and pan are disabled", svg.getAttribute("viewBox"));
      return null;
    }
    state = { home, vb: { ...home }, target: null, frame: null, cancel: null };
    viewportStates.set(svg, state);
  }
  return state;
}

/** Forgets the SVG's state so the next call re-reads its viewBox attribute as the new home. */
export function resetViewportState(svg) {
  const state = viewportStates.get(svg);
  if (state) cancelViewBoxAnimation(state);
  viewportStates.delete(svg);
}

function cancelViewBoxAnimation(state) {
  if (state.frame !== null && state.cancel) state.cancel(state.frame);
  state.frame = null;
  state.target = null;
}

function commitViewBox(svg, state, vb) {
  state.vb = vb;
  svg.setAttribute("viewBox", formatViewBox(vb));
}

function readZoomDurationMs() {
  try {
    const raw = globalThis.getComputedStyle?.(document.documentElement).getPropertyValue("--m-base").trim();
    const match = /^([\d.]+)(ms|s)$/.exec(raw ?? "");
    if (match) return Number(match[1]) * (match[2] === "s" ? 1000 : 1);
  } catch {
    // A missing or odd stylesheet is not an error: the fallback is the house value.
  }
  return ZOOM_FALLBACK_DURATION_MS;
}

function defaultZoomEnv() {
  const reduced = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
  return {
    durationMs: readZoomDurationMs(),
    reducedMotion: reduced,
    raf: globalThis.requestAnimationFrame?.bind(globalThis) ?? null,
    caf: globalThis.cancelAnimationFrame?.bind(globalThis) ?? null,
  };
}

/**
 * Moves the view to `target`. Animated moves ease over `--m-base`; reduced motion, a missing `requestAnimationFrame`,
 * or `animate: false` make it instant. Wheel, pinch and drag never animate, because lag on continuous input feels broken.
 * @param {{animate?:boolean, env?:object}} [options] `env` = `{durationMs, reducedMotion, raf, caf}`, injectable for tests
 */
export function moveViewTo(svg, target, { animate = false, env } = {}) {
  const state = getViewportState(svg);
  if (!state) return;
  cancelViewBoxAnimation(state);
  const settings = animate ? (env ?? defaultZoomEnv()) : null;
  if (!settings || settings.reducedMotion || !settings.raf || settings.durationMs <= 0) {
    commitViewBox(svg, state, target);
    return;
  }
  const from = state.vb;
  let startedAt = null;
  state.target = target;
  state.cancel = settings.caf;
  const step = (timestamp) => {
    startedAt ??= timestamp;
    const progress = Math.min(1, (timestamp - startedAt) / settings.durationMs);
    commitViewBox(svg, state, blendViewBox(from, target, easeViewBoxInOut(progress)));
    if (progress < 1) {
      state.frame = settings.raf(step);
    } else {
      state.frame = null;
      state.target = null;
    }
  };
  state.frame = settings.raf(step);
}

/** Zooms about the centre of the (destination) view by `factor`. Used by the toolbar; eases unless told otherwise. */
export function zoomBy(svg, factor, options = { animate: true }) {
  const state = getViewportState(svg);
  if (!state) return;
  const base = state.target ?? state.vb;
  const centre = { x: base.x + base.w / 2, y: base.y + base.h / 2 };
  moveViewTo(svg, zoomViewBoxAt(base, state.home, factor, centre), options);
}

/** Toolbar `+` (direction 1) and `−` (direction -1): one ×1.25 step. */
export function zoomStep(svg, direction, options = { animate: true }) {
  zoomBy(svg, direction > 0 ? ZOOM_STEP : 1 / ZOOM_STEP, options);
}

/** Toolbar reset: back to the whole poster. */
export function resetView(svg, options = { animate: true }) {
  const state = getViewportState(svg);
  if (state) moveViewTo(svg, resetViewBox(state.home), options);
}

/* ------------------------------------------------------------------ popularity preference */

const popularityListeners = new Set();

function defaultPrefsStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** The saved popularity choice; `true` when nothing valid is saved or storage is unavailable. Never throws. */
export function readPopularityPref(storage = defaultPrefsStorage()) {
  try {
    const saved = JSON.parse(storage?.getItem(PREFS_KEY) ?? "null");
    return typeof saved?.popularity === "boolean" ? saved.popularity : true;
  } catch {
    return true;
  }
}

/** Saves the popularity choice as `{ popularity }`. Returns false, silently, when storage refuses. */
export function writePopularityPref(on, storage = defaultPrefsStorage()) {
  try {
    storage.setItem(PREFS_KEY, JSON.stringify({ popularity: on }));
    return true;
  } catch {
    return false;
  }
}

/** Whether popularity is showing: read from the SVG root when there is one, else from the saved preference. */
export function isPopularityOn(svg, storage) {
  if (svg) return svg.getAttribute("data-pop") !== "off";
  return readPopularityPref(storage);
}

/** Sets `data-pop` on the SVG root without saving or announcing. */
export function applyPopularity(svg, on) {
  svg?.setAttribute("data-pop", on ? "on" : "off");
}

/** Sets, saves and announces the popularity choice. Zoom, pan and selection are untouched. */
export function setPopularity(svg, on, storage) {
  applyPopularity(svg, on);
  writePopularityPref(on, storage);
  for (const listener of [...popularityListeners]) listener(on);
  return on;
}

/** Flips popularity; returns the new value. */
export function togglePopularity(svg, storage) {
  return setPopularity(svg, !isPopularityOn(svg, storage), storage);
}

/** Calls `listener(on)` after every change, from the button or the `P` key. Returns an unsubscribe function. */
export function subscribePopularity(listener) {
  popularityListeners.add(listener);
  return () => popularityListeners.delete(listener);
}

/* ------------------------------------------------------------------ pointer, wheel and key wiring */

const ARROW_DIRECTIONS = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

function pointerDistance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function pointerMidpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/**
 * Attaches zoom, pan and the popularity toggle to the SVG inside `host`. Listeners sit on the host, so a redrawn SVG
 * needs no rewiring; where `MutationObserver` exists a redraw is noticed on its own, otherwise call `refresh()`.
 * Touches only the viewBox and `data-pop`; a container resize never reaches it.
 * @param {Element} host the `#diagram-host` element
 * @param {{storage?: Storage}} [options]
 * @returns {{refresh: Function, getViewBox: Function, destroy: Function}}
 */
export function mountViewport(host, { storage } = {}) {
  const touches = new Map();
  let panning = null;
  let pinch = null;
  let prepared = null;
  let printStash = null;
  host.style.touchAction = "none";

  function currentSvg() {
    return host.querySelector("svg");
  }

  function prepare(svg) {
    if (!svg || svg === prepared) return;
    prepared = svg;
    applyPopularity(svg, readPopularityPref(storage));
    getViewportState(svg);
  }

  function refresh() {
    const svg = currentSvg();
    if (svg) resetViewportState(svg);
    prepared = null;
    prepare(svg);
  }

  function liveState() {
    const svg = currentSvg();
    prepare(svg);
    const state = getViewportState(svg);
    if (!state) return null;
    cancelViewBoxAnimation(state);
    return { svg, state };
  }

  function onWheel(event) {
    const live = liveState();
    if (!live) return;
    event.preventDefault();
    const rect = live.svg.getBoundingClientRect();
    const point = clientToViewBox(rect, live.state.vb, event.clientX, event.clientY);
    commitViewBox(live.svg, live.state, zoomViewBoxAt(live.state.vb, live.state.home, wheelZoomFactor(event), point));
  }

  function beginPan(event, svg) {
    panning = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    try {
      svg.setPointerCapture?.(event.pointerId);
    } catch {
      // Capture is a nicety: a pointer that is already gone just stops panning.
    }
  }

  function onPointerDown(event) {
    const live = liveState();
    if (!live) return;
    if (event.pointerType === "touch") touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (touches.size === 2) {
      const [a, b] = [...touches.values()];
      panning = null;
      host.classList.remove("is-panning");
      pinch = { dist: pointerDistance(a, b), mid: pointerMidpoint(a, b) };
      return;
    }
    const onTile = event.target?.closest?.(VIEWPORT_TILE_SELECTOR);
    const primary = event.button === undefined || event.button === 0;
    if (!onTile && primary && !panning && !pinch) beginPan(event, live.svg);
  }

  function pinchTo(svg, state) {
    const [a, b] = [...touches.values()];
    const next = { dist: pointerDistance(a, b), mid: pointerMidpoint(a, b) };
    if (pinch.dist > 0 && next.dist > 0) {
      const rect = svg.getBoundingClientRect();
      const anchor = clientToViewBox(rect, state.vb, pinch.mid.x, pinch.mid.y);
      const zoomed = zoomViewBoxAt(state.vb, state.home, next.dist / pinch.dist, anchor);
      const scale = viewBoxScale(rect, zoomed);
      commitViewBox(svg, state, panViewBox(zoomed, state.home, -(next.mid.x - pinch.mid.x) / scale, -(next.mid.y - pinch.mid.y) / scale));
    }
    pinch = next;
  }

  function onPointerMove(event) {
    if (touches.has(event.pointerId)) touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (!pinch && !(panning && panning.pointerId === event.pointerId)) return;
    const live = liveState();
    if (!live) return;
    if (pinch) {
      if (touches.size === 2) pinchTo(live.svg, live.state);
      return;
    }
    const scale = viewBoxScale(live.svg.getBoundingClientRect(), live.state.vb);
    const dx = event.clientX - panning.x;
    const dy = event.clientY - panning.y;
    panning.x = event.clientX;
    panning.y = event.clientY;
    if (dx !== 0 || dy !== 0) host.classList.add("is-panning");
    commitViewBox(live.svg, live.state, panViewBox(live.state.vb, live.state.home, -dx / scale, -dy / scale));
  }

  function onPointerEnd(event) {
    touches.delete(event.pointerId);
    if (touches.size < 2) pinch = null;
    if (panning && panning.pointerId === event.pointerId) {
      panning = null;
      host.classList.remove("is-panning");
      try {
        currentSvg()?.releasePointerCapture?.(event.pointerId);
      } catch {
        // Already released by the browser.
      }
    }
  }

  function onKeyDown(event) {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const arrow = ARROW_DIRECTIONS[event.key];
    if (arrow) {
      const live = liveState();
      if (!live) return;
      event.preventDefault();
      const { vb, home } = live.state;
      commitViewBox(live.svg, live.state, panViewBox(vb, home, arrow[0] * vb.w * KEY_PAN_FRACTION, arrow[1] * vb.h * KEY_PAN_FRACTION));
    } else if (event.key === "p" || event.key === "P") {
      event.preventDefault();
      togglePopularity(currentSvg(), storage);
    }
  }

  // The home box is the whole poster (read from the SVG's own attribute at draw time), so a table print needs no layout import.
  function onBeforePrint(event) {
    if (printStash || !FULL_POSTER_PRINT_TARGETS.includes(event.detail?.target)) return;
    const svg = currentSvg();
    const state = getViewportState(svg);
    if (!state) return;
    cancelViewBoxAnimation(state);
    printStash = { svg, vb: state.vb };
    commitViewBox(svg, state, resetViewBox(state.home));
  }

  function onAfterPrint() {
    if (!printStash) return;
    const { svg, vb } = printStash;
    printStash = null;
    const state = svg === currentSvg() ? getViewportState(svg) : null;
    if (state) commitViewBox(svg, state, vb);
  }

  host.addEventListener("wheel", onWheel, { passive: false });
  host.addEventListener("pointerdown", onPointerDown);
  host.addEventListener("pointermove", onPointerMove);
  host.addEventListener("pointerup", onPointerEnd);
  host.addEventListener("pointercancel", onPointerEnd);
  host.addEventListener("keydown", onKeyDown);
  document.addEventListener(EVT_BEFORE_PRINT, onBeforePrint);
  document.addEventListener(EVT_AFTER_PRINT, onAfterPrint);

  const observer = typeof MutationObserver === "function" ? new MutationObserver(() => prepare(currentSvg())) : null;
  observer?.observe(host, { childList: true });
  prepare(currentSvg());

  return {
    refresh,
    /** The current viewBox as `{x,y,w,h}`, or null before an SVG is drawn. */
    getViewBox() {
      const state = getViewportState(currentSvg());
      return state ? { ...state.vb } : null;
    },
    destroy() {
      observer?.disconnect();
      host.removeEventListener("wheel", onWheel);
      host.removeEventListener("pointerdown", onPointerDown);
      host.removeEventListener("pointermove", onPointerMove);
      host.removeEventListener("pointerup", onPointerEnd);
      host.removeEventListener("pointercancel", onPointerEnd);
      host.removeEventListener("keydown", onKeyDown);
      document.removeEventListener(EVT_BEFORE_PRINT, onBeforePrint);
      document.removeEventListener(EVT_AFTER_PRINT, onAfterPrint);
    },
  };
}

/* ------------------------------------------------------------------ toolbar */

const TOOLBAR_PRINT_TONES = [
  { tone: "colour", label: "Colour" },
  { tone: "gray", label: "Grayscale" },
];

function makeToolbarButton(action, label, ariaLabel) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "st-toolbar__button";
  button.setAttribute("data-action", action);
  button.textContent = label;
  if (ariaLabel) button.setAttribute("aria-label", ariaLabel);
  return button;
}

function announceToolbarEvent(eventName) {
  document.dispatchEvent(new CustomEvent(eventName, { detail: {} }));
}

/**
 * Builds the toolbar inside `host`: `+`, `−`, reset, Popularity, Print table (Colour / Grayscale), Lists, About.
 * @param {Element} host the `#toolbar` element
 * @param {{getSvg: () => Element|null, printTable?: Function, storage?: Storage}} options
 *   `printTable(target, tone)` defaults to `setPrintTarget` from shared/output.js; injectable for tests.
 * @returns {{syncPopularity: Function, closeMenu: Function, destroy: Function}}
 */
export function mountToolbar(host, { getSvg, printTable = setPrintTarget, storage } = {}) {
  if (typeof getSvg !== "function") {
    console.warn("viewport: mountToolbar needs a getSvg function; the zoom and popularity controls will do nothing");
    getSvg = () => null;
  }
  host.textContent = "";
  host.classList.add("st-toolbar");
  host.setAttribute("role", "toolbar");
  host.setAttribute("aria-label", "Diagram controls");

  const zoomIn = makeToolbarButton("zoom-in", "+", "Zoom in");
  const zoomOut = makeToolbarButton("zoom-out", "−", "Zoom out");
  const reset = makeToolbarButton("reset", "Reset", "Reset view to the whole poster");
  const popularity = makeToolbarButton("popularity", "Popularity");
  const lists = makeToolbarButton("lists", "Lists");
  const about = makeToolbarButton("about", "About");
  const storyToggle = makeToolbarButton("story-toggle", "Story tray", "Show or hide the story placement area");
  storyToggle.setAttribute("aria-pressed", "true");

  const printWrap = document.createElement("div");
  printWrap.className = "st-toolbar__menu-wrap";
  const printButton = makeToolbarButton("print-table", "Print table");
  printButton.setAttribute("aria-haspopup", "true");
  printButton.setAttribute("aria-expanded", "false");
  const menu = document.createElement("div");
  menu.className = "st-toolbar__menu";
  menu.setAttribute("role", "menu");
  menu.hidden = true;
  for (const { tone, label } of TOOLBAR_PRINT_TONES) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "st-toolbar__menu-item";
    item.setAttribute("role", "menuitem");
    item.setAttribute("data-tone", tone);
    item.textContent = label;
    item.addEventListener("click", () => {
      closeMenu();
      printTable("table", tone);
    });
    menu.append(item);
  }
  printWrap.append(printButton, menu);

  function syncPopularity(on = isPopularityOn(getSvg(), storage)) {
    popularity.setAttribute("aria-pressed", on ? "true" : "false");
  }

  function closeMenu() {
    menu.hidden = true;
    printButton.setAttribute("aria-expanded", "false");
  }

  function toggleMenu() {
    const opening = menu.hidden;
    menu.hidden = !opening;
    printButton.setAttribute("aria-expanded", opening ? "true" : "false");
  }

  storyToggle.addEventListener("click", () => {
    const hidden = document.body.classList.toggle("st-story-hidden");
    storyToggle.setAttribute("aria-pressed", hidden ? "false" : "true");
  });
  zoomIn.addEventListener("click", () => zoomStep(getSvg(), 1));
  zoomOut.addEventListener("click", () => zoomStep(getSvg(), -1));
  reset.addEventListener("click", () => resetView(getSvg()));
  popularity.addEventListener("click", () => togglePopularity(getSvg(), storage));
  printButton.addEventListener("click", toggleMenu);
  lists.addEventListener("click", () => announceToolbarEvent(EVT_OPEN_LISTS));
  about.addEventListener("click", () => announceToolbarEvent(EVT_OPEN_ABOUT));
  printWrap.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || menu.hidden) return;
    closeMenu();
    printButton.focus();
  });
  const onOutsideClick = (event) => {
    if (!menu.hidden && !printWrap.contains(event.target)) closeMenu();
  };
  document.addEventListener("click", onOutsideClick);
  const unsubscribe = subscribePopularity(syncPopularity);

  host.append(zoomIn, zoomOut, reset, popularity, printWrap, lists, about, storyToggle);
  syncPopularity();

  return {
    syncPopularity,
    closeMenu,
    destroy() {
      unsubscribe();
      document.removeEventListener("click", onOutsideClick);
    },
  };
}
