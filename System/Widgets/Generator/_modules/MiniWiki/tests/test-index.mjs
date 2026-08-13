import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakeDOM } from "../../../_shell/tests/js/fake-dom.mjs";
import { createMiniWikiModule } from "../src/index.js";

function sampleArticles() {
  return [
    { id: "1", title: "Root", role: "article", lead: "Root lead.", body_html: "<p>Root body.</p>", parent: null, children: ["1.1"] },
    { id: "1.1", title: "Child", role: "article", lead: "Child lead.", body_html: "<p>Child body.</p>", parent: "1", children: [] },
  ];
}

/** A minimal fake `window` — just enough for mount()'s `typeof window !==
 * "undefined"` branches (location.hash, hashchange listener registration)
 * — installed/removed per test so other test files never see it (TEST-4:
 * reset shared/global state between tests). */
function withFakeWindow(initialHash, run) {
  const original = globalThis.window;
  globalThis.window = { location: { hash: initialHash }, addEventListener() {}, removeEventListener() {} };
  try {
    run();
  } finally {
    if (original === undefined) delete globalThis.window;
    else globalThis.window = original;
  }
}

test("index.js imports cleanly and createMiniWikiModule() works with zero options", () => {
  const wiki = createMiniWikiModule();
  assert.equal(typeof wiki.getArticle, "function");
  assert.equal(wiki.getArticle("anything"), null);
});

test("happy path: mount() wires the side menu and routes Home/All/article via the article container", () => {
  const doc = createFakeDOM();
  const nav = doc.createElement("div");
  const article = doc.createElement("div");
  const wiki = createMiniWikiModule({ articles: sampleArticles(), cartridgeName: "Test Cartridge", document: doc });

  const controls = wiki.mount(nav, article);
  assert.ok(nav.querySelectorAll(".mw-menu-link").length >= 3); // Home, All, Surprise me

  controls.navigate("1.1", { skipHash: true });
  assert.equal(article.querySelector(".mw-title").textContent, "Child");

  controls.showAll({ skipHash: true });
  assert.ok(article.querySelector(".mw-all-list"));
});

test("guard path: renderView() on an unknown id warns and renders a not-found page instead of throwing", () => {
  const doc = createFakeDOM();
  const container = doc.createElement("div");
  const wiki = createMiniWikiModule({ articles: sampleArticles(), document: doc });

  const originalWarn = console.warn;
  let warned = false;
  console.warn = () => { warned = true; };
  let page;
  try {
    page = wiki.renderView("article", "does-not-exist", container, () => {});
  } finally {
    console.warn = originalWarn;
  }
  assert.equal(warned, true);
  assert.match(page.textContent, /not found/i);
});

test("Task B concern #5 fix: a deep-link hash that matches no article renders the not-found page (not a silent redirect to home)", () => {
  withFakeWindow("#/does-not-exist", () => {
    const doc = createFakeDOM();
    const nav = doc.createElement("div");
    const article = doc.createElement("div");
    const wiki = createMiniWikiModule({ articles: sampleArticles(), document: doc });

    const originalWarn = console.warn;
    let warned = false;
    console.warn = () => {
      warned = true;
    };
    try {
      wiki.mount(nav, article);
    } finally {
      console.warn = originalWarn;
    }
    assert.equal(warned, true, "renderView's own not-found guard should have fired");
    assert.match(article.querySelector(".mw-not-found").textContent, /not found/i);
  });
});

test("Task B concern #4 fix: navigating to a deep child auto-expands its ancestor in the side menu tree", () => {
  withFakeWindow("", () => {
    const doc = createFakeDOM();
    const nav = doc.createElement("div");
    const article = doc.createElement("div");
    const wiki = createMiniWikiModule({ articles: sampleArticles(), document: doc });
    const controls = wiki.mount(nav, article);

    // Before navigating to the child, its parent's tree branch is collapsed.
    let toggle = nav.querySelector(".mw-tree-toggle");
    assert.equal(toggle.textContent, "▶");

    controls.navigate("1.1", { skipHash: true });

    toggle = nav.querySelector(".mw-tree-toggle");
    assert.equal(toggle.textContent, "▼", "ancestor should now be expanded");
    const childLink = nav.querySelector(".mw-tree-link.mw-active");
    assert.equal(childLink.getAttribute("data-nav-id"), "1.1");
  });
});

test("Task C: search() matches on the source field and on body text, not just title/lead", () => {
  const articles = [
    {
      id: "r1",
      title: "Riddle EX-001",
      role: "article",
      lead: "A moth ate words.",
      body_html: "<p>A moth ate words in the darkness of a library.</p>",
      parent: null,
      children: [],
      source: "Anglo-Saxon Exeter Book",
    },
  ];
  const wiki = createMiniWikiModule({ articles });
  assert.equal(wiki.search("exeter").length, 1, "should match the source field");
  assert.equal(wiki.search("library").length, 1, "should match body text beyond the lead");
  assert.equal(wiki.search("nonexistent-term").length, 0);
});
