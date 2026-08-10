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
