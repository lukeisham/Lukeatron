import assert from "node:assert/strict";
import { test } from "node:test";
import { hitTest, mountDragDrop, parseDurationMs, DOCK_WIDTH, RIBBON_HIT_DISTANCE } from "../app/story/drag-drop.js";
import { EVT_NOTICE } from "../app/shared/events.js";
import { DRAG_THRESHOLD_PX } from "../app/diagram/selection.js";
import { layout, ribbonCurve, pointOnCurve } from "../app/story/story-layout.js";
import { FakeDocument, FakeWindow, fire, makeElement, placed } from "./helpers/fake-dom-drag.js";

const SVG = "http://www.w3.org/2000/svg";
const CANVAS_LEFT = 100;
const CANVAS_TOP = 400;
const flush = async () => {
  for (let i = 0; i < 4; i++) await Promise.resolve();
};

const chainBeads = [{ uid: "a" }, { uid: "b" }, { uid: "c" }];
const chainRibbons = [["a", "b"], ["b", "c"]];

/* ---------- hitTest: pure, real layout ---------- */

const chain = layout(chainBeads, chainRibbons);
const centerOf = (uid) => {
  const p = chain.positions[uid];
  return { x: p.x + p.w / 2, y: p.y + p.h / 2 };
};

test("hitTest: a point on a bead gives that bead", () => {
  assert.deepEqual(hitTest(centerOf("b"), chain, chainBeads), { type: "bead", uid: "b" });
});

test("hitTest: the dock wins over its bead, and only for a bead that can still pair", () => {
  const p = chain.positions.b;
  const onDock = { x: p.x + p.w - 2, y: p.y + p.h / 2 };
  assert.deepEqual(hitTest(onDock, chain, chainBeads), { type: "dock", uid: "b" });
  assert.deepEqual(hitTest(onDock, chain, chainBeads, { canPair: false }), { type: "bead", uid: "b" });
  const tandemBeads = [{ uid: "a" }, { uid: "b", with: "X" }, { uid: "c" }];
  assert.deepEqual(hitTest(onDock, chain, tandemBeads), { type: "bead", uid: "b" });
});

test("hitTest: the dock half outside the bead still counts, beyond it does not", () => {
  const p = chain.positions.b;
  const y = p.y + p.h / 2;
  assert.deepEqual(hitTest({ x: p.x + p.w + DOCK_WIDTH / 2 - 1, y }, chain, chainBeads), { type: "dock", uid: "b" });
  assert.notEqual(hitTest({ x: p.x + p.w + DOCK_WIDTH, y: p.y }, chain, chainBeads).type, "dock");
});

test("hitTest: near a ribbon gives the ribbon, far from it gives empty space", () => {
  const curve = ribbonCurve(["a", "b"], chain);
  const mid = pointOnCurve(curve, 0.5);
  assert.deepEqual(hitTest({ x: mid.x, y: mid.y }, chain, chainBeads), { type: "ribbon", from: "a", to: "b" });
  assert.deepEqual(hitTest({ x: mid.x, y: mid.y + RIBBON_HIT_DISTANCE - 2 }, chain, chainBeads), { type: "ribbon", from: "a", to: "b" });
  assert.deepEqual(hitTest({ x: mid.x, y: mid.y + RIBBON_HIT_DISTANCE + 20 }, chain, chainBeads), { type: "empty" });
});

test("hitTest: a bead wins over a ribbon that runs under it", () => {
  const behindBead = { ...chain, ribbonPaths: [{ from: "a", to: "c", loop: false, curve: ribbonCurve(["a", "c"], chain) }] };
  assert.deepEqual(hitTest(centerOf("b"), behindBead, chainBeads), { type: "bead", uid: "b" });
});

test("hitTest: empty tray space is empty; off the tray is null (guard)", () => {
  assert.deepEqual(hitTest({ x: 600, y: 100 }, chain, chainBeads), { type: "empty" });
  assert.equal(hitTest({ x: 600, y: 100 }, chain, chainBeads, { inTray: false }), null);
  assert.equal(hitTest(centerOf("b"), chain, chainBeads, { inTray: false }), null);
});

test("hitTest: an empty story is all empty space", () => {
  assert.deepEqual(hitTest({ x: 5, y: 5 }, layout([], []), []), { type: "empty" });
});

test("hitTest: the dragged bead is 'self', and its own ribbons are skipped", () => {
  assert.deepEqual(hitTest(centerOf("b"), chain, chainBeads, { excludeUid: "b" }), { type: "self", uid: "b" });
  const mid = pointOnCurve(ribbonCurve(["a", "b"], chain), 0.5);
  assert.deepEqual(hitTest(mid, chain, chainBeads, { excludeUid: "b" }), { type: "empty" });
  const p = chain.positions.b;
  assert.deepEqual(hitTest({ x: p.x + p.w, y: p.y + p.h / 2 }, chain, chainBeads, { excludeUid: "b" }), { type: "self", uid: "b" });
});

test("parseDurationMs reads ms and s and falls back on nonsense", () => {
  assert.equal(parseDurationMs("180ms", 1), 180);
  assert.equal(parseDurationMs(" 0.25s ", 1), 250);
  assert.equal(parseDurationMs("", 7), 7);
  assert.equal(parseDurationMs(undefined, 7), 7);
});

/* ---------- gestures: fake DOM ---------- */

function fakeStore() {
  const calls = [];
  const results = {};
  const record = (name, defaultResult) => (...args) => {
    calls.push([name, ...args]);
    return results[name] ?? defaultResult;
  };
  return {
    calls,
    results,
    addBead: record("addBead", { ok: true, uid: "n1", placed: "joined" }),
    moveBead: record("moveBead", { ok: true }),
    removeBead: record("removeBead", { ok: true }),
    linkBeads: record("linkBeads", { ok: true }),
    pairBead: record("pairBead", { ok: true }),
    mergeBeads: record("mergeBeads", { ok: true }),
    getStoryState: () => ({ beads: chainBeads, ribbons: chainRibbons, activeUid: "c" }),
  };
}

function setup({ reducedMotion = false } = {}) {
  const doc = new FakeDocument();
  const win = new FakeWindow({ reducedMotion });
  const diagramHost = makeElement("div");
  const tile = placed(makeElement("g", ["tile"], { "data-element-id": "Fi" }), 20, 30, 62, 75);
  tile.namespaceURI = SVG;
  diagramHost.appendChild(tile);
  const background = makeElement("rect");
  diagramHost.appendChild(background);

  const trayEl = placed(makeElement("div", ["st-tray"]), CANVAS_LEFT, CANVAS_TOP - 20, 800, 240);
  const canvasEl = placed(makeElement("div", ["st-canvas"]), CANVAS_LEFT, CANVAS_TOP, 800, 200);
  trayEl.appendChild(canvasEl);
  const threads = makeElement("svg", ["st-threads"]);
  canvasEl.appendChild(threads);
  const beadEls = {};
  for (const uid of ["a", "b", "c"]) {
    const bead = makeElement("div", ["st-bead"], { "data-bead-uid": uid });
    for (const part of ["st-bead__dock", "st-bead__link-dot", "st-bead__remove"]) bead.appendChild(makeElement("span", [part]));
    const pos = chain.positions[uid];
    placed(bead, CANVAS_LEFT + pos.x, CANVAS_TOP + pos.y, pos.w, pos.h);
    canvasEl.appendChild(bead);
    beadEls[uid] = bead;
  }
  const dropTargets = [];
  const canvas = {
    canvasEl,
    trayEl,
    getLayoutResult: () => chain,
    setDropTarget: (target) => dropTargets.push(target),
    render() {},
  };
  const store = fakeStore();
  const handle = mountDragDrop({ diagramHost, canvas }, { store, document: doc, window: win });
  const env = { doc, win, diagramHost, tile, background, canvasEl, trayEl, beadEls, threads, canvas, store, dropTargets, handle };
  env.press = (target, x, y, props = {}) => fire(target, "pointerdown", { clientX: x, clientY: y, ...props }, { doc, win });
  env.move = (x, y, props = {}) => fire(doc, "pointermove", { clientX: x, clientY: y, ...props }, { doc, win });
  env.release = (x, y, props = {}) => fire(doc, "pointerup", { clientX: x, clientY: y, ...props }, { doc, win });
  env.key = (key) => fire(doc, "keydown", { key }, { doc, win });
  env.ghosts = () => doc.body.children.filter((node) => node.classes.has("st-ghost"));
  env.atCanvas = (point) => ({ x: CANVAS_LEFT + point.x, y: CANVAS_TOP + point.y });
  env.docListenerCount = () => doc.listenerCount();
  return env;
}

/** Press the tile, move past the threshold, then to (x, y) in client pixels. */
function dragTileTo(env, x, y) {
  env.press(env.tile, 30, 40);
  env.move(30 + DRAG_THRESHOLD_PX + 3, 40);
  env.move(x, y);
}

const OFF_TRAY = { x: 500, y: 100 };

test("a tile dragged over empty tray space then released adds a bead to the active story", async () => {
  const env = setup();
  const spot = env.atCanvas({ x: 600, y: 100 });
  dragTileTo(env, spot.x, spot.y);
  assert.equal(env.ghosts().length, 1);
  assert.equal(env.ghosts()[0].style.pointerEvents, "none");
  assert.ok(env.tile.classes.has("is-picked"));
  assert.ok(env.trayEl.classes.has("is-dragging-pairable"));
  assert.deepEqual(env.dropTargets.at(-1), { type: "empty" });
  env.release(spot.x, spot.y);
  assert.deepEqual(env.store.calls, [["addBead", "Fi", { type: "empty" }]]);
  assert.equal(env.dropTargets.at(-1), null);
  assert.ok(!env.tile.classes.has("is-picked"));
  assert.equal(env.trayEl.classes.has("is-dragging"), false);
  const ghost = env.ghosts()[0];
  assert.equal(ghost.animations.length, 1);
  ghost.animations[0].finish();
  await flush();
  assert.equal(env.ghosts().length, 0);
});

test("the ghost is a stripped clone: no element id, and it follows the pointer by the grab offset", () => {
  const env = setup();
  dragTileTo(env, 400, 300);
  const [ghost] = env.ghosts();
  assert.equal(ghost.getAttribute("data-element-id"), null);
  assert.equal(ghost.namespaceURI, SVG);
  assert.equal(ghost.style.transform, "translate3d(390px, 290px, 0)");
});

test("dropping a tile on a bead branches; on a ribbon inserts; on a dock pairs", () => {
  const env = setup();
  const onBead = env.atCanvas(centerOf("b"));
  dragTileTo(env, onBead.x, onBead.y);
  assert.deepEqual(env.dropTargets.at(-1), { type: "bead", uid: "b" });
  env.release(onBead.x, onBead.y);

  const mid = env.atCanvas(pointOnCurve(ribbonCurve(["b", "c"], chain), 0.5));
  dragTileTo(env, mid.x, mid.y);
  assert.deepEqual(env.dropTargets.at(-1), { type: "ribbon", from: "b", to: "c" });
  env.release(mid.x, mid.y);

  const p = chain.positions.a;
  const dock = env.atCanvas({ x: p.x + p.w - 2, y: p.y + p.h / 2 });
  dragTileTo(env, dock.x, dock.y);
  assert.deepEqual(env.dropTargets.at(-1), { type: "dock", uid: "a" });
  env.release(dock.x, dock.y);

  assert.deepEqual(env.store.calls, [
    ["addBead", "Fi", { type: "bead", uid: "b" }],
    ["addBead", "Fi", { type: "ribbon", from: "b", to: "c" }],
    ["pairBead", "a", "Fi"],
  ]);
});

test("highlight calls are throttled to changes of target", () => {
  const env = setup();
  const spot = env.atCanvas({ x: 600, y: 100 });
  dragTileTo(env, spot.x, spot.y);
  env.move(spot.x + 3, spot.y + 2);
  env.move(spot.x + 6, spot.y + 4);
  assert.equal(env.dropTargets.length, 1);
});

test("releasing a tile outside the tray cancels: the model is not called and the ghost glides home", async () => {
  const env = setup();
  const off = { x: OFF_TRAY.x, y: OFF_TRAY.y };
  dragTileTo(env, off.x, off.y);
  assert.equal(env.dropTargets.length, 0);
  env.release(off.x, off.y);
  assert.deepEqual(env.store.calls, []);
  const [ghost] = env.ghosts();
  const last = ghost.animations[0].keyframes.at(-1).transform;
  assert.equal(last, "translate3d(20px, 30px, 0) scale(1)");
  ghost.animations[0].finish();
  await flush();
  assert.equal(env.ghosts().length, 0);
  assert.ok(!env.tile.classes.has("is-picked"));
});

test("a press that never passes the threshold starts nothing and leaves no listeners behind", () => {
  const env = setup();
  env.press(env.tile, 30, 40);
  env.move(30 + DRAG_THRESHOLD_PX - 1, 40);
  assert.equal(env.ghosts().length, 0);
  assert.ok(!env.tile.classes.has("is-picked"));
  env.release(32, 40);
  assert.deepEqual(env.store.calls, []);
  assert.equal(env.docListenerCount(), 0);
});

test("a press on the diagram background, a non-primary button, or a bead's remove button is not a drag", () => {
  const env = setup();
  env.press(env.background, 5, 5);
  env.move(200, 200);
  assert.equal(env.docListenerCount(), 0);
  env.press(env.tile, 30, 40, { button: 2 });
  assert.equal(env.docListenerCount(), 0);
  const remove = env.beadEls.b.children.find((c) => c.classes.has("st-bead__remove"));
  env.press(remove, 200, 440);
  assert.equal(env.docListenerCount(), 0);
});

test("Escape cancels a drag cleanly: no model call, listeners gone, tile un-picked after the glide", async () => {
  const env = setup();
  const spot = env.atCanvas({ x: 600, y: 100 });
  dragTileTo(env, spot.x, spot.y);
  const escape = env.key("Escape");
  assert.ok(escape.stopped);
  assert.deepEqual(env.store.calls, []);
  assert.equal(env.docListenerCount(), 0);
  assert.equal(env.dropTargets.at(-1), null);
  assert.equal(env.trayEl.classes.has("is-dragging"), false);
  env.ghosts()[0].animations[0].finish();
  await flush();
  assert.equal(env.ghosts().length, 0);
  assert.ok(!env.tile.classes.has("is-picked"));
  env.move(spot.x + 40, spot.y);
  assert.equal(env.ghosts().length, 0);
});

test("pointercancel cancels like Escape", () => {
  const env = setup();
  dragTileTo(env, 400, 300);
  fire(env.doc, "pointercancel", { pointerId: 1 }, { doc: env.doc, win: env.win });
  assert.deepEqual(env.store.calls, []);
  assert.equal(env.docListenerCount(), 0);
});

test("events from another pointer are ignored mid-drag", () => {
  const env = setup();
  dragTileTo(env, 400, 300);
  env.release(400, 300, { pointerId: 9 });
  assert.deepEqual(env.store.calls, []);
  assert.equal(env.ghosts().length, 1);
});

test("a refused drop shows the model's message through the notice event and glides back", () => {
  const env = setup();
  env.store.results.pairBead = { ok: false, error: { code: "tandem-full", message: "A tandem holds two" } };
  const p = chain.positions.a;
  const dock = env.atCanvas({ x: p.x + p.w - 2, y: p.y + p.h / 2 });
  dragTileTo(env, dock.x, dock.y);
  env.release(dock.x, dock.y);
  assert.equal(env.dropTargets.at(-1), null);
  const [event] = env.doc.dispatched;
  assert.equal(event.type, EVT_NOTICE);
  assert.equal(event.detail.message, "A tandem holds two");
  assert.equal(env.ghosts()[0].animations[0].keyframes.at(-1).transform, "translate3d(20px, 30px, 0) scale(1)");
});

test("reduced motion: the ghost disappears at once with no animation", () => {
  const env = setup({ reducedMotion: true });
  const spot = env.atCanvas({ x: 600, y: 100 });
  dragTileTo(env, spot.x, spot.y);
  env.release(spot.x, spot.y);
  assert.equal(env.ghosts().length, 0);
  assert.deepEqual(env.store.calls, [["addBead", "Fi", { type: "empty" }]]);
});

test("a model that throws on release cancels the drag instead of breaking the page", () => {
  const env = setup();
  env.store.addBead = () => {
    throw new Error("boom");
  };
  const spot = env.atCanvas({ x: 600, y: 100 });
  const warn = console.warn;
  console.warn = () => {};
  try {
    dragTileTo(env, spot.x, spot.y);
    env.release(spot.x, spot.y);
  } finally {
    console.warn = warn;
  }
  assert.equal(env.docListenerCount(), 0);
  assert.equal(env.ghosts()[0].animations.length, 1);
});

/* ---------- dragging an existing bead ---------- */

function dragBeadTo(env, uid, x, y) {
  const c = env.atCanvas(centerOf(uid));
  env.press(env.beadEls[uid], c.x, c.y);
  env.move(c.x + DRAG_THRESHOLD_PX + 3, c.y);
  env.move(x, y);
}

test("dragging a bead onto empty space, a bead, or a ribbon moves it", () => {
  const env = setup();
  const empty = env.atCanvas({ x: 600, y: 100 });
  dragBeadTo(env, "a", empty.x, empty.y);
  assert.ok(env.beadEls.a.classes.has("is-picked"));
  assert.equal(env.trayEl.classes.has("is-dragging-pairable"), true);
  env.release(empty.x, empty.y);
  const onBead = env.atCanvas(centerOf("c"));
  dragBeadTo(env, "a", onBead.x, onBead.y);
  env.release(onBead.x, onBead.y);
  const mid = env.atCanvas(pointOnCurve(ribbonCurve(["b", "c"], chain), 0.5));
  dragBeadTo(env, "a", mid.x, mid.y);
  env.release(mid.x, mid.y);
  assert.deepEqual(env.store.calls, [
    ["moveBead", "a", { type: "empty" }],
    ["moveBead", "a", { type: "bead", uid: "c" }],
    ["moveBead", "a", { type: "ribbon", from: "b", to: "c" }],
  ]);
});

test("dropping a bead off the tray removes it", () => {
  const env = setup();
  dragBeadTo(env, "b", OFF_TRAY.x, OFF_TRAY.y);
  assert.equal(env.dropTargets.length, 0);
  env.release(OFF_TRAY.x, OFF_TRAY.y);
  assert.deepEqual(env.store.calls, [["removeBead", "b"]]);
  assert.equal(env.ghosts()[0].animations.length, 1);
});

test("dropping a bead on another bead's dock merges them", () => {
  const env = setup();
  const p = chain.positions.c;
  const dock = env.atCanvas({ x: p.x + p.w - 2, y: p.y + p.h / 2 });
  dragBeadTo(env, "a", dock.x, dock.y);
  assert.deepEqual(env.dropTargets.at(-1), { type: "dock", uid: "c" });
  env.release(dock.x, dock.y);
  assert.deepEqual(env.store.calls, [["mergeBeads", "a", "c"]]);
});

test("dropping a bead back on itself changes nothing", () => {
  const env = setup();
  const c = env.atCanvas(centerOf("b"));
  dragBeadTo(env, "b", c.x + 4, c.y + 4);
  assert.equal(env.dropTargets.length, 0);
  env.release(c.x + 4, c.y + 4);
  assert.deepEqual(env.store.calls, []);
});

test("the click that ends a bead drag is swallowed once, and the next real click passes", () => {
  const env = setup();
  const c = env.atCanvas(centerOf("b"));
  dragBeadTo(env, "b", c.x + 4, c.y + 4);
  env.release(c.x + 4, c.y + 4);
  const swallowed = fire(env.beadEls.b, "click", {}, { doc: env.doc, win: env.win });
  assert.ok(swallowed.stopped);
  const next = fire(env.beadEls.b, "click", {}, { doc: env.doc, win: env.win });
  assert.equal(next.stopped, false);
});

test("a plain press on a bead (no movement) starts nothing", () => {
  const env = setup();
  const c = env.atCanvas(centerOf("b"));
  env.press(env.beadEls.b, c.x, c.y);
  env.release(c.x, c.y);
  assert.equal(env.ghosts().length, 0);
  assert.deepEqual(env.store.calls, []);
  assert.equal(env.docListenerCount(), 0);
});

/* ---------- link dot ---------- */

const linkDotOf = (env, uid) => env.beadEls[uid].children.find((c) => c.classes.has("st-bead__link-dot"));

test("dragging from a link dot draws a live temporary link and links on release over another bead", () => {
  const env = setup();
  const start = env.atCanvas(centerOf("a"));
  env.press(linkDotOf(env, "a"), start.x, start.y);
  const over = env.atCanvas(centerOf("c"));
  env.move(start.x + 20, start.y);
  env.move(over.x, over.y);
  const temp = env.threads.querySelector(".st-thread--temp");
  assert.ok(temp, "temporary path exists");
  assert.match(temp.getAttribute("d"), /^M /);
  assert.ok(env.beadEls.c.classes.has("is-link-target"));
  assert.equal(env.ghosts().length, 0);
  env.release(over.x, over.y);
  assert.deepEqual(env.store.calls, [["linkBeads", "a", "c"]]);
  assert.equal(env.threads.querySelector(".st-thread--temp"), null);
  assert.ok(!env.beadEls.c.classes.has("is-link-target"));
  assert.equal(env.docListenerCount(), 0);
});

test("releasing a link drag on empty space, on its own bead, or off the tray links nothing", () => {
  const env = setup();
  const start = env.atCanvas(centerOf("a"));
  for (const end of [env.atCanvas({ x: 600, y: 100 }), start, OFF_TRAY]) {
    env.press(linkDotOf(env, "a"), start.x, start.y);
    env.move(start.x + 20, start.y);
    env.move(end.x, end.y);
    env.release(end.x, end.y);
  }
  assert.deepEqual(env.store.calls, []);
});

test("a refused link shows the model's message", () => {
  const env = setup();
  env.store.results.linkBeads = { ok: false, error: { code: "duplicate-ribbon", message: "Already linked" } };
  const start = env.atCanvas(centerOf("a"));
  const over = env.atCanvas(centerOf("b"));
  env.press(linkDotOf(env, "a"), start.x, start.y);
  env.move(start.x + 20, start.y);
  env.move(over.x, over.y);
  env.release(over.x, over.y);
  assert.equal(env.doc.dispatched[0].detail.message, "Already linked");
});

/* ---------- destroy ---------- */

test("destroy removes the host listeners and any ghost; a later press does nothing", () => {
  const env = setup();
  dragTileTo(env, 400, 300);
  env.handle.destroy();
  assert.equal(env.diagramHost.listenerCount(), 0);
  assert.equal(env.canvasEl.listenerCount(), 0);
  assert.equal(env.docListenerCount(), 0);
  assert.equal(env.ghosts().length, 0);
  env.press(env.tile, 30, 40);
  env.move(200, 200);
  assert.equal(env.ghosts().length, 0);
});
