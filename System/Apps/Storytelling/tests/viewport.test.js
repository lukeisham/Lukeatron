import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import {
  MAX_ZOOM,
  PREFS_KEY,
  ZOOM_STEP,
  blendViewBox,
  clampViewBox,
  clientToViewBox,
  easeViewBoxInOut,
  formatViewBox,
  moveViewTo,
  mountToolbar,
  mountViewport,
  panViewBox,
  parseViewBox,
  readPopularityPref,
  resetViewBox,
  viewBoxScale,
  wheelZoomFactor,
  writePopularityPref,
  zoomLevel,
  zoomViewBoxAt,
} from "../app/diagram/viewport.js";
import { EVT_AFTER_PRINT, EVT_BEFORE_PRINT, EVT_OPEN_ABOUT, EVT_OPEN_LISTS } from "../app/shared/events.js";
import {
  buildDiagram,
  fire,
  installFakeDocument,
  memoryStorage,
  recordEvents,
  throwingStorage,
} from "./helpers/fake-dom-viewport.js";

const HOME = { x: 0, y: 0, w: 1000, h: 800 };
// Values read back from the viewBox attribute are rounded to 3 decimals, so those checks pass a looser tolerance.
const near = (actual, expected, message, tolerance = 1e-6) => assert.ok(Math.abs(actual - expected) < tolerance, `${message ?? ""} expected ${expected}, got ${actual}`);
const viewBoxOf = (svg) => parseViewBox(svg.getAttribute("viewBox"));

describe("viewBox maths (pure)", () => {
  test("parseViewBox accepts four numbers and refuses everything else", () => {
    assert.deepEqual(parseViewBox("0 0 1000 800"), HOME);
    assert.deepEqual(parseViewBox("-5,10,20,30"), { x: -5, y: 10, w: 20, h: 30 });
    assert.equal(parseViewBox("0 0 1000"), null);
    assert.equal(parseViewBox("0 0 0 800"), null);
    assert.equal(parseViewBox(null), null);
  });

  test("zoom keeps the point under the pointer fixed", () => {
    const point = { x: 250, y: 200 };
    const zoomed = zoomViewBoxAt(HOME, HOME, 2, point);
    near(zoomed.w, 500);
    near(zoomed.h, 400);
    near((point.x - zoomed.x) / zoomed.w, (point.x - HOME.x) / HOME.w, "x fraction");
    near((point.y - zoomed.y) / zoomed.h, (point.y - HOME.y) / HOME.h, "y fraction");
  });

  test("zoom is held between 1x and 6x, and 1x is exactly the whole poster", () => {
    const tooFar = zoomViewBoxAt(HOME, HOME, 100, { x: 500, y: 400 });
    near(zoomLevel(tooFar, HOME), MAX_ZOOM);
    const twice = zoomViewBoxAt(HOME, HOME, 2, { x: 100, y: 100 });
    assert.deepEqual(zoomViewBoxAt(twice, HOME, 0.001, { x: 500, y: 400 }), HOME);
    assert.deepEqual(zoomViewBoxAt(HOME, HOME, 0.5, { x: 10, y: 10 }), HOME);
  });

  test("clamp keeps at least a quarter of the poster in view", () => {
    const twice = { x: 0, y: 0, w: 500, h: 400 };
    const farRight = clampViewBox({ ...twice, x: 9000, y: 9000 }, HOME);
    assert.equal(farRight.x, 750);
    assert.equal(farRight.y, 600);
    const farLeft = clampViewBox({ ...twice, x: -9000, y: -9000 }, HOME);
    assert.equal(farLeft.x, -250);
    assert.equal(farLeft.y, -200);
  });

  test("clamp beyond 4x keeps the whole view inside the poster", () => {
    const sixfold = { x: 0, y: 0, w: HOME.w / 6, h: HOME.h / 6 };
    const pushed = clampViewBox({ ...sixfold, x: 9000, y: -9000 }, HOME);
    near(pushed.x, HOME.w - sixfold.w);
    near(pushed.y, 0);
  });

  test("pan moves by source units and clamps", () => {
    const twice = { x: 100, y: 100, w: 500, h: 400 };
    assert.deepEqual(panViewBox(twice, HOME, 50, -30), { x: 150, y: 70, w: 500, h: 400 });
    assert.equal(panViewBox(twice, HOME, 99999, 0).x, 750);
  });

  test("reset returns a copy of the whole-poster box", () => {
    const back = resetViewBox(HOME);
    assert.deepEqual(back, HOME);
    assert.notEqual(back, HOME);
  });

  test("clientToViewBox accounts for the letterbox that meet leaves", () => {
    const wide = { left: 10, top: 20, width: 800, height: 400 };
    near(viewBoxScale(wide, HOME), 0.5);
    const centre = clientToViewBox(wide, HOME, 10 + 400, 20 + 200);
    near(centre.x, 500);
    near(centre.y, 400);
    const leftEdgeOfPoster = clientToViewBox(wide, HOME, 10 + 150, 20);
    near(leftEdgeOfPoster.x, 0);
  });

  test("wheel: up zooms in, down zooms out, ctrl (trackpad pinch) has more gain", () => {
    assert.ok(wheelZoomFactor({ deltaY: -100 }) > 1);
    assert.ok(wheelZoomFactor({ deltaY: 100 }) < 1);
    assert.ok(wheelZoomFactor({ deltaY: -5, ctrlKey: true }) > wheelZoomFactor({ deltaY: -5 }));
  });

  test("easing and blend hit their endpoints", () => {
    assert.equal(easeViewBoxInOut(0), 0);
    assert.equal(easeViewBoxInOut(1), 1);
    assert.deepEqual(blendViewBox(HOME, { x: 100, y: 100, w: 500, h: 400 }, 1), { x: 100, y: 100, w: 500, h: 400 });
    assert.equal(formatViewBox({ x: 1 / 3, y: 0, w: 1000, h: 800 }), "0.333 0 1000 800");
  });
});

describe("viewport wiring", () => {
  let doc;
  let restore;
  let host;
  let svg;
  let tiles;
  let storage;
  let mount;

  beforeEach(() => {
    ({ doc, restore } = installFakeDocument());
    ({ host, svg, tiles } = buildDiagram(doc));
    storage = memoryStorage();
    mount = mountViewport(host, { storage });
  });
  afterEach(() => restore());

  test("mounting starts with popularity on and the viewBox untouched", () => {
    assert.equal(svg.getAttribute("data-pop"), "on");
    assert.equal(svg.getAttribute("viewBox"), "0 0 1000 800");
  });

  test("wheel zooms around the pointer immediately and blocks page scroll", () => {
    const allowed = fire(svg, "wheel", { clientX: 125, clientY: 100, deltaY: -300 });
    assert.equal(allowed, false, "preventDefault was called");
    const vb = viewBoxOf(svg);
    assert.ok(zoomLevel(vb, HOME) > 1);
    near((250 - vb.x) / vb.w, 0.25, "point under the pointer stays put", 0.001);
  });

  test("wheel out at the whole-poster view changes nothing", () => {
    fire(svg, "wheel", { clientX: 250, clientY: 200, deltaY: 500 });
    assert.equal(svg.getAttribute("viewBox"), "0 0 1000 800");
  });

  test("dragging the background pans; the pointer is captured and the cue class comes and goes", () => {
    fire(svg, "wheel", { clientX: 250, clientY: 200, deltaY: -400 });
    const before = viewBoxOf(svg);
    fire(svg, "pointerdown", { clientX: 200, clientY: 200 });
    assert.ok(svg.captured.has(1));
    fire(svg, "pointermove", { clientX: 150, clientY: 180 });
    assert.ok(host.classList.contains("is-panning"));
    const scale = viewBoxScale(svg.rect, before);
    const after = viewBoxOf(svg);
    near(after.x, before.x + 50 / scale, "dragged left, view moves right", 0.01);
    near(after.y, before.y + 20 / scale, "dragged up, view moves down", 0.01);
    fire(svg, "pointerup", { clientX: 150, clientY: 180 });
    assert.equal(host.classList.contains("is-panning"), false);
  });

  test("a press that starts on a tile never pans (drag-drop owns it)", () => {
    fire(svg, "wheel", { clientX: 250, clientY: 200, deltaY: -400 });
    const before = svg.getAttribute("viewBox");
    fire(tiles[0], "pointerdown", { clientX: 200, clientY: 200 });
    fire(tiles[0], "pointermove", { clientX: 100, clientY: 100 });
    assert.equal(svg.getAttribute("viewBox"), before);
  });

  test("two-finger pinch zooms in when the fingers spread apart", () => {
    fire(svg, "pointerdown", { pointerId: 1, pointerType: "touch", clientX: 200, clientY: 200 });
    fire(svg, "pointerdown", { pointerId: 2, pointerType: "touch", clientX: 300, clientY: 200 });
    fire(svg, "pointermove", { pointerId: 2, pointerType: "touch", clientX: 400, clientY: 200 });
    assert.ok(zoomLevel(viewBoxOf(svg), HOME) > 1.5);
    fire(svg, "pointerup", { pointerId: 2, pointerType: "touch" });
    fire(svg, "pointerup", { pointerId: 1, pointerType: "touch" });
  });

  test("arrow keys pan by a tenth of the view once zoomed; other keys are ignored", () => {
    fire(svg, "wheel", { clientX: 250, clientY: 200, deltaY: -400 });
    const before = viewBoxOf(svg);
    assert.equal(fire(host, "keydown", { key: "ArrowRight" }), false);
    near(viewBoxOf(svg).x, before.x + before.w * 0.1, "x", 0.01);
    fire(host, "keydown", { key: "ArrowUp" });
    near(viewBoxOf(svg).y, before.y - before.h * 0.1, "y", 0.01);
    const settled = svg.getAttribute("viewBox");
    fire(host, "keydown", { key: "ArrowLeft", ctrlKey: true });
    assert.equal(svg.getAttribute("viewBox"), settled, "modifier combos are left to the browser");
  });

  test("moveViewTo eases across frames, and reduced motion is instant", () => {
    const frames = [];
    const env = { durationMs: 180, reducedMotion: false, raf: (fn) => frames.push(fn) - 1, caf: () => {} };
    const target = { x: 250, y: 200, w: 500, h: 400 };
    moveViewTo(svg, target, { animate: true, env });
    assert.equal(svg.getAttribute("viewBox"), "0 0 1000 800", "nothing moves before the first frame");
    frames.shift()(1000);
    frames.shift()(1090);
    const midway = viewBoxOf(svg);
    assert.ok(midway.w < 1000 && midway.w > 500, `midway width ${midway.w}`);
    frames.shift()(1180);
    assert.deepEqual(viewBoxOf(svg), target);
    assert.equal(frames.length, 0);

    moveViewTo(svg, HOME, { animate: true, env: { ...env, reducedMotion: true } });
    assert.deepEqual(viewBoxOf(svg), HOME);
  });

  test("a wheel turn during an animation cancels it", () => {
    const frames = [];
    const cancelled = [];
    const env = { durationMs: 180, reducedMotion: false, raf: (fn) => frames.push(fn) - 1, caf: (id) => cancelled.push(id) };
    moveViewTo(svg, { x: 250, y: 200, w: 500, h: 400 }, { animate: true, env });
    fire(svg, "wheel", { clientX: 250, clientY: 200, deltaY: -100 });
    assert.deepEqual(cancelled, [0]);
  });

  test("a redraw is a new SVG: refresh restores the saved popularity and re-reads the home viewBox", () => {
    writePopularityPref(false, storage);
    const fresh = doc.createElement("svg");
    fresh.setAttribute("viewBox", "0 0 500 400");
    fresh.rect = { left: 0, top: 0, width: 500, height: 400 };
    svg.remove();
    host.append(fresh);
    mount.refresh();
    assert.equal(fresh.getAttribute("data-pop"), "off");
    assert.deepEqual(mount.getViewBox(), { x: 0, y: 0, w: 500, h: 400 });
  });
});

describe("popularity toggle", () => {
  let doc;
  let restore;

  beforeEach(() => { ({ doc, restore } = installFakeDocument()); });
  afterEach(() => restore());

  test("the P key flips data-pop and saves { popularity }", () => {
    const storage = memoryStorage();
    const { host, svg } = buildDiagram(doc);
    mountViewport(host, { storage });
    fire(host, "keydown", { key: "p" });
    assert.equal(svg.getAttribute("data-pop"), "off");
    assert.deepEqual(JSON.parse(storage.data[PREFS_KEY]), { popularity: false });
    fire(host, "keydown", { key: "P" });
    assert.equal(svg.getAttribute("data-pop"), "on");
    assert.deepEqual(JSON.parse(storage.data[PREFS_KEY]), { popularity: true });
  });

  test("a saved 'off' is restored on mount, without touching zoom", () => {
    const storage = memoryStorage({ [PREFS_KEY]: JSON.stringify({ popularity: false }) });
    const { host, svg } = buildDiagram(doc);
    mountViewport(host, { storage });
    assert.equal(svg.getAttribute("data-pop"), "off");
    assert.equal(svg.getAttribute("viewBox"), "0 0 1000 800");
  });

  test("toggling leaves zoom and pan exactly as they were", () => {
    const { host, svg } = buildDiagram(doc);
    mountViewport(host, { storage: memoryStorage() });
    fire(svg, "wheel", { clientX: 250, clientY: 200, deltaY: -400 });
    const zoomed = svg.getAttribute("viewBox");
    fire(host, "keydown", { key: "p" });
    assert.equal(svg.getAttribute("viewBox"), zoomed);
  });

  test("unavailable storage: falls back to on, still toggles, never throws", () => {
    const { host, svg } = buildDiagram(doc);
    mountViewport(host, { storage: throwingStorage() });
    assert.equal(svg.getAttribute("data-pop"), "on");
    assert.doesNotThrow(() => fire(host, "keydown", { key: "p" }));
    assert.equal(svg.getAttribute("data-pop"), "off");
  });

  test("read/write helpers survive junk, a throwing default localStorage, and missing storage", () => {
    assert.equal(readPopularityPref(memoryStorage({ [PREFS_KEY]: "{not json" })), true);
    assert.equal(readPopularityPref(memoryStorage({ [PREFS_KEY]: JSON.stringify({ popularity: "no" }) })), true);
    assert.equal(readPopularityPref(throwingStorage()), true);
    assert.equal(writePopularityPref(false, throwingStorage()), false);

    const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    Object.defineProperty(globalThis, "localStorage", { configurable: true, get() { throw new Error("blocked"); } });
    try {
      assert.equal(readPopularityPref(), true);
      assert.equal(writePopularityPref(false), false);
    } finally {
      if (original) Object.defineProperty(globalThis, "localStorage", original);
      else delete globalThis.localStorage;
    }
  });
});

describe("toolbar", () => {
  let doc;
  let restore;
  let svg;
  let toolbarHost;
  let printCalls;
  let storage;
  let diagramHost;

  const button = (action) => toolbarHost.querySelector(`[data-action="${action}"]`);
  const click = (el) => fire(el, "click");

  beforeEach(() => {
    ({ doc, restore } = installFakeDocument());
    ({ host: diagramHost, svg } = buildDiagram(doc));
    storage = memoryStorage();
    mountViewport(diagramHost, { storage });
    toolbarHost = doc.createElement("header");
    doc.body.append(toolbarHost);
    printCalls = [];
    mountToolbar(toolbarHost, { getSvg: () => svg, printTable: (target, tone) => printCalls.push([target, tone]), storage });
  });
  afterEach(() => restore());

  test("builds every control in order", () => {
    const actions = toolbarHost.querySelectorAll(".st-toolbar__button").map((b) => b.getAttribute("data-action"));
    assert.deepEqual(actions, ["zoom-in", "zoom-out", "reset", "popularity", "print-table", "lists", "about", "story-toggle"]);
    assert.equal(button("popularity").getAttribute("aria-pressed"), "true");
    assert.equal(toolbarHost.getAttribute("role"), "toolbar");
  });

  test("+ multiplies the zoom by 1.25, − undoes it, reset returns to the whole poster", () => {
    click(button("zoom-in"));
    near(zoomLevel(viewBoxOf(svg), HOME), ZOOM_STEP, "", 0.01);
    click(button("zoom-in"));
    near(zoomLevel(viewBoxOf(svg), HOME), ZOOM_STEP ** 2, "", 0.01);
    click(button("zoom-out"));
    near(zoomLevel(viewBoxOf(svg), HOME), ZOOM_STEP, "", 0.01);
    click(button("zoom-in"));
    click(button("reset"));
    assert.equal(svg.getAttribute("viewBox"), "0 0 1000 800");
  });

  test("zoom-in never passes 6x", () => {
    for (let i = 0; i < 30; i += 1) click(button("zoom-in"));
    near(zoomLevel(viewBoxOf(svg), HOME), MAX_ZOOM, "", 0.01);
  });

  test("Popularity button and the P key stay in step", () => {
    click(button("popularity"));
    assert.equal(svg.getAttribute("data-pop"), "off");
    assert.equal(button("popularity").getAttribute("aria-pressed"), "false");
    fire(diagramHost, "keydown", { key: "p" });
    assert.equal(svg.getAttribute("data-pop"), "on");
    assert.equal(button("popularity").getAttribute("aria-pressed"), "true");
    assert.deepEqual(JSON.parse(storage.data[PREFS_KEY]), { popularity: true });
  });

  test("Print table opens a Colour / Grayscale menu; choosing prints the table and closes it", () => {
    const menu = toolbarHost.querySelector(".st-toolbar__menu");
    assert.equal(menu.hidden, true);
    click(button("print-table"));
    assert.equal(menu.hidden, false);
    assert.equal(button("print-table").getAttribute("aria-expanded"), "true");
    const labels = menu.querySelectorAll(".st-toolbar__menu-item").map((i) => i.textContent);
    assert.deepEqual(labels, ["Colour", "Grayscale"]);

    click(menu.querySelector('[data-tone="colour"]'));
    assert.equal(menu.hidden, true);
    click(button("print-table"));
    click(menu.querySelector('[data-tone="gray"]'));
    assert.deepEqual(printCalls, [["table", "colour"], ["table", "gray"]]);
  });

  test("Escape and an outside click close the menu; Escape returns focus to the button", () => {
    const menu = toolbarHost.querySelector(".st-toolbar__menu");
    click(button("print-table"));
    fire(menu, "keydown", { key: "Escape" });
    assert.equal(menu.hidden, true);
    assert.equal(doc.activeElement, button("print-table"));
    click(button("print-table"));
    fire(diagramHost, "click");
    assert.equal(menu.hidden, true);
    assert.deepEqual(printCalls, [], "closing prints nothing");
  });

  test("the default print action is setPrintTarget from shared/output.js", () => {
    const fresh = doc.createElement("header");
    doc.body.append(fresh);
    mountToolbar(fresh, { getSvg: () => svg, storage });
    let printed = 0;
    const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { print: () => { printed += 1; }, addEventListener() {}, removeEventListener() {} },
    });
    try {
      click(fresh.querySelector('[data-action="print-table"]'));
      click(fresh.querySelector('[data-tone="gray"]'));
    } finally {
      if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
      else delete globalThis.window;
    }
    assert.equal(printed, 1);
    assert.equal(doc.body.getAttribute("data-print"), "table");
    assert.equal(doc.body.getAttribute("data-tone"), "gray");
  });

  test("Lists and About dispatch their open events on document", () => {
    const lists = recordEvents(doc, EVT_OPEN_LISTS);
    const about = recordEvents(doc, EVT_OPEN_ABOUT);
    click(button("lists"));
    click(button("about"));
    assert.equal(lists.length, 1);
    assert.equal(about.length, 1);
  });

  test("with no SVG drawn yet the zoom buttons do nothing and do not throw", () => {
    const empty = doc.createElement("header");
    doc.body.append(empty);
    mountToolbar(empty, { getSvg: () => null, storage });
    assert.doesNotThrow(() => click(empty.querySelector('[data-action="zoom-in"]')));
    assert.doesNotThrow(() => click(empty.querySelector('[data-action="popularity"]')));
  });
});

describe("print view (whole poster)", () => {
  let doc;
  let restore;
  let host;
  let svg;
  let mount;

  const beforePrint = (target) => fire(doc, EVT_BEFORE_PRINT, { detail: { target, tone: "colour" } });
  const afterPrint = (target) => fire(doc, EVT_AFTER_PRINT, { detail: { target, tone: "colour" } });
  const zoomIn = () => fire(svg, "wheel", { clientX: 250, clientY: 200, deltaY: -400 });

  beforeEach(() => {
    ({ doc, restore } = installFakeDocument());
    ({ host, svg } = buildDiagram(doc));
    mount = mountViewport(host, { storage: memoryStorage() });
  });
  afterEach(() => restore());

  test("table and story-with-table print the whole poster, then put the zoomed view back", () => {
    for (const target of ["table", "story-with-table"]) {
      zoomIn();
      const zoomed = svg.getAttribute("viewBox");
      assert.notEqual(zoomed, "0 0 1000 800");
      beforePrint(target);
      assert.equal(svg.getAttribute("viewBox"), "0 0 1000 800", target);
      afterPrint(target);
      assert.equal(svg.getAttribute("viewBox"), zoomed, target);
      near(mount.getViewBox().w, viewBoxOf(svg).w, `${target} state matches attribute`, 1e-3);
      fire(svg, "wheel", { clientX: 250, clientY: 200, deltaY: 4000 });
    }
  });

  test("guard: element, story and list prints leave the view alone", () => {
    zoomIn();
    const zoomed = svg.getAttribute("viewBox");
    for (const target of ["element", "story", "list"]) {
      beforePrint(target);
      assert.equal(svg.getAttribute("viewBox"), zoomed, target);
    }
    afterPrint("list");
    assert.equal(svg.getAttribute("viewBox"), zoomed);
  });

  test("two before-print events in a row still restore the original zoom, and an unmatched after-print does nothing", () => {
    zoomIn();
    const zoomed = svg.getAttribute("viewBox");
    beforePrint("table");
    beforePrint("table");
    afterPrint("table");
    assert.equal(svg.getAttribute("viewBox"), zoomed);
    afterPrint("table");
    assert.equal(svg.getAttribute("viewBox"), zoomed);
  });

  test("destroy stops listening for print events", () => {
    zoomIn();
    const zoomed = svg.getAttribute("viewBox");
    mount.destroy();
    beforePrint("table");
    assert.equal(svg.getAttribute("viewBox"), zoomed);
  });
});
