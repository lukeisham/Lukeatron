import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakeDOM } from "../../../_shell/tests/js/fake-dom.mjs";
import { createDrawerController } from "../src/drawer.js";

function buildDrawerParts(doc) {
  const toggle = doc.createElement("button");
  const navPane = doc.createElement("nav");
  const scrim = doc.createElement("div");
  return { toggle, navPane, scrim };
}

test("drawer.js imports cleanly and the toggle button opens then closes the drawer", () => {
  const doc = createFakeDOM();
  const { toggle, navPane, scrim } = buildDrawerParts(doc);
  const drawer = createDrawerController(doc, toggle, navPane, scrim);

  assert.equal(drawer.isOpen(), false);
  toggle.click();
  assert.equal(drawer.isOpen(), true);
  assert.match(navPane.className, /mw-drawer-open/);
  assert.match(scrim.className, /mw-scrim-active/);

  toggle.click();
  assert.equal(drawer.isOpen(), false);
  assert.doesNotMatch(navPane.className, /mw-drawer-open/);
});

test("happy path: clicking the scrim closes the drawer", () => {
  const doc = createFakeDOM();
  const { toggle, navPane, scrim } = buildDrawerParts(doc);
  const drawer = createDrawerController(doc, toggle, navPane, scrim);
  drawer.open();
  assert.equal(drawer.isOpen(), true);
  scrim.click();
  assert.equal(drawer.isOpen(), false);
});

test("happy path: Escape closes the drawer only while it is open", () => {
  const doc = createFakeDOM();
  const { toggle, navPane, scrim } = buildDrawerParts(doc);
  const drawer = createDrawerController(doc, toggle, navPane, scrim);

  drawer.onKeydown({ key: "Escape" });
  assert.equal(drawer.isOpen(), false, "no-op when already closed");

  drawer.open();
  drawer.onKeydown({ key: "Enter" });
  assert.equal(drawer.isOpen(), true, "only Escape closes it");
  drawer.onKeydown({ key: "Escape" });
  assert.equal(drawer.isOpen(), false);
});

test("guard path: closeOnNavigate() closes the drawer, e.g. when an article is selected", () => {
  const doc = createFakeDOM();
  const { toggle, navPane, scrim } = buildDrawerParts(doc);
  const drawer = createDrawerController(doc, toggle, navPane, scrim);
  drawer.open();
  drawer.closeOnNavigate();
  assert.equal(drawer.isOpen(), false);
});
