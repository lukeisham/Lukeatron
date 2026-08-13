import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakeDOM } from "../../../_shell/tests/js/fake-dom.mjs";
import { setActiveNavLink } from "../src/nav-active.js";

function buildNav(doc) {
  const nav = doc.createElement("nav");
  const home = doc.createElement("a");
  home.className = "mw-menu-link";
  home.setAttribute("data-nav-id", "home");
  const cat = doc.createElement("a");
  cat.className = "mw-menu-link";
  cat.setAttribute("data-nav-id", "1");
  const leaf = doc.createElement("a");
  leaf.className = "mw-tree-link";
  leaf.setAttribute("data-nav-id", "1.1");
  nav.appendChild(home);
  nav.appendChild(cat);
  nav.appendChild(leaf);
  return { nav, home, cat, leaf };
}

test("nav-active.js imports cleanly and setActiveNavLink() marks the matching link", () => {
  const doc = createFakeDOM();
  const { nav, leaf } = buildNav(doc);
  setActiveNavLink(nav, "1.1");
  assert.match(leaf.className, /\bmw-active\b/);
});

test("happy path: switching the active key moves mw-active off the old link and onto the new one", () => {
  const doc = createFakeDOM();
  const { nav, home, leaf } = buildNav(doc);
  setActiveNavLink(nav, "home");
  assert.match(home.className, /\bmw-active\b/);

  setActiveNavLink(nav, "1.1");
  assert.doesNotMatch(home.className, /\bmw-active\b/);
  assert.match(leaf.className, /\bmw-active\b/);
});

test("guard path: an unmatched key clears the previous highlight without throwing", () => {
  const doc = createFakeDOM();
  const { nav, home } = buildNav(doc);
  setActiveNavLink(nav, "home");
  setActiveNavLink(nav, "does-not-exist");
  assert.doesNotMatch(home.className, /\bmw-active\b/);
  // A missing/falsy container must not throw either (defensive per JS-2).
  setActiveNavLink(null, "home");
});
