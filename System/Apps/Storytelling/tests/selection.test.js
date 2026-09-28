import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import { DRAG_THRESHOLD_PX, getSelectedElementId, mountSelection } from "../app/diagram/selection.js";
import { EVT_OPEN, EVT_SELECT } from "../app/shared/events.js";
import { buildDiagram, fire, installFakeDocument, recordEvents } from "./helpers/fake-dom-viewport.js";

describe("selection", () => {
  let doc;
  let restore;
  let host;
  let svg;
  let tiles;
  let selects;
  let opens;
  let mount;

  /** A press-and-release on `target`, moving `travel` px in between (all on the same pointer). */
  function press(target, { travel = 0, x = 100, y = 100 } = {}) {
    fire(target, "pointerdown", { clientX: x, clientY: y });
    if (travel) fire(target, "pointermove", { clientX: x + travel, clientY: y });
    fire(target, "pointerup", { clientX: x + travel, clientY: y });
  }

  beforeEach(() => {
    ({ doc, restore } = installFakeDocument());
    ({ host, svg, tiles } = buildDiagram(doc, { ids: ["A", "B", "C"] }));
    selects = recordEvents(doc, EVT_SELECT);
    opens = recordEvents(doc, EVT_OPEN);
    mount = mountSelection(host);
  });
  afterEach(() => restore());

  const isSelected = (tile) => tile.classList.contains("is-selected");

  test("the drag threshold is the single 5px constant", () => {
    assert.equal(DRAG_THRESHOLD_PX, 5);
  });

  test("pointerdown on a tile selects it at once, announces it, and opens nothing", () => {
    fire(tiles[0], "pointerdown");
    assert.equal(getSelectedElementId(), "A");
    assert.ok(isSelected(tiles[0]));
    assert.deepEqual(selects, [{ elementId: "A" }]);
    assert.deepEqual(opens, []);
  });

  test("a press on a child of the tile (its label) still selects the tile", () => {
    fire(tiles[1].children[0], "pointerdown");
    assert.equal(getSelectedElementId(), "B");
  });

  test("selection is one at a time", () => {
    press(tiles[0]);
    press(tiles[2]);
    assert.equal(getSelectedElementId(), "C");
    assert.equal(isSelected(tiles[0]), false);
    assert.ok(isSelected(tiles[2]));
    assert.deepEqual(selects, [{ elementId: "A" }, { elementId: "C" }]);
  });

  test("pressing the selected tile again announces nothing new", () => {
    press(tiles[0]);
    press(tiles[0]);
    assert.equal(selects.length, 1);
  });

  test("a background click clears the selection and announces null", () => {
    press(tiles[0]);
    press(svg);
    assert.equal(getSelectedElementId(), null);
    assert.equal(isSelected(tiles[0]), false);
    assert.deepEqual(selects.at(-1), { elementId: null });
  });

  test("a background click with nothing selected announces nothing", () => {
    press(svg);
    assert.deepEqual(selects, []);
  });

  test("a background press that travelled past 5px is a pan, and does not clear", () => {
    press(tiles[0]);
    press(svg, { travel: DRAG_THRESHOLD_PX + 1 });
    assert.equal(getSelectedElementId(), "A");
  });

  test("a wobble of exactly 5px still counts as a click", () => {
    press(tiles[0]);
    press(svg, { travel: DRAG_THRESHOLD_PX });
    assert.equal(getSelectedElementId(), null);
  });

  test("double-click on a tile opens it with its id", () => {
    press(tiles[1]);
    press(tiles[1]);
    fire(tiles[1], "dblclick");
    assert.deepEqual(opens, [{ elementId: "B" }]);
    assert.equal(getSelectedElementId(), "B");
  });

  test("a 6px drag never opens, even if the browser still fires dblclick", () => {
    press(tiles[0]);
    press(tiles[0], { travel: DRAG_THRESHOLD_PX + 1 });
    fire(tiles[0], "dblclick");
    assert.deepEqual(opens, []);
  });

  test("a cancelled pointer counts as a drag", () => {
    fire(tiles[0], "pointerdown");
    fire(tiles[0], "pointercancel");
    fire(tiles[0], "dblclick");
    assert.deepEqual(opens, []);
  });

  test("a double-click on the background opens nothing", () => {
    fire(svg, "dblclick");
    assert.deepEqual(opens, []);
  });

  test("a second finger turns the press into a pinch: it never clears", () => {
    press(tiles[0]);
    fire(svg, "pointerdown", { pointerId: 1 });
    fire(svg, "pointerdown", { pointerId: 2 });
    fire(svg, "pointerup", { pointerId: 2 });
    fire(svg, "pointerup", { pointerId: 1 });
    assert.equal(getSelectedElementId(), "A");
  });

  test("Enter on a focused tile opens it; Space selects without opening", () => {
    assert.equal(fire(tiles[2], "keydown", { key: " " }), false, "space is kept from scrolling the page");
    assert.equal(getSelectedElementId(), "C");
    assert.deepEqual(opens, []);
    fire(tiles[0], "keydown", { key: "Enter" });
    assert.deepEqual(opens, [{ elementId: "A" }]);
    assert.equal(getSelectedElementId(), "A");
  });

  test("keys on the bare background, or with a modifier, do nothing", () => {
    fire(svg, "keydown", { key: "Enter" });
    fire(tiles[0], "keydown", { key: "Enter", metaKey: true });
    assert.deepEqual(opens, []);
    assert.equal(getSelectedElementId(), null);
  });

  test("tile pointerdown is never prevented, so drag-drop can start", () => {
    assert.equal(fire(tiles[0], "pointerdown"), true);
  });

  test("programmatic select and clear behave like the pointer", () => {
    mount.select("B");
    assert.ok(isSelected(tiles[1]));
    mount.clear();
    assert.equal(isSelected(tiles[1]), false);
    assert.deepEqual(selects, [{ elementId: "B" }, { elementId: null }]);
  });

  test("refresh re-applies the cue after a redraw, and clears if the element is gone", () => {
    press(tiles[0]);
    const redrawn = doc.createElement("g");
    redrawn.classList.add("tile");
    redrawn.setAttribute("data-element-id", "A");
    svg.append(redrawn);
    tiles[0].remove();
    mount.refresh();
    assert.ok(isSelected(redrawn));

    redrawn.remove();
    mount.refresh();
    assert.equal(getSelectedElementId(), null);
    assert.deepEqual(selects.at(-1), { elementId: null });
  });

  test("destroy stops listening", () => {
    mount.destroy();
    fire(tiles[0], "pointerdown");
    assert.equal(getSelectedElementId(), null);
    assert.equal(doc.listenerCount("pointerup"), 0);
  });
});
