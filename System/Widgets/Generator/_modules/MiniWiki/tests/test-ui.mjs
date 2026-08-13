import { test } from "node:test";
import assert from "node:assert/strict";
// Shared per vibe-coding-rules.md SR-4 (Spelling/tests/test-ui.mjs already
// pulls this in the same way for the same reason).
import { createFakeDOM } from "../../../_shell/tests/js/fake-dom.mjs";
import { renderHome, renderSideMenu, renderSectionPage, renderArticlePage } from "../src/ui.js";
// Fixed per REVIEW-vibe-rules.md's "dead pass-through re-exports" finding:
// buildLinkCatalogue lives in autolink.js — import it from there, not from
// ui.js's public surface (TEST-9: mirror the logic, don't hide its owner).
import { buildLinkCatalogue } from "../src/autolink.js";

function sampleArticles() {
  return {
    "1": {
      id: "1",
      title: "Formal Fallacies",
      role: "section",
      lead: "",
      body_html: "",
      parent: null,
      children: ["1.1"],
    },
    "1.1": {
      id: "1.1",
      title: "Affirming the Consequent",
      role: "article",
      lead: "A formal fallacy.",
      body_html: "<p>See Denying the Antecedent for the mirror case.</p>",
      parent: "1",
      children: [],
      characteristics: ["conditional reasoning error"],
      references: [{ title: "Logic — Content Source", container: "Draft catalogue", note: "" }],
    },
    "1.2": {
      id: "1.2",
      title: "Denying the Antecedent",
      role: "article",
      lead: "The mirror fallacy.",
      body_html: "<p>Body.</p>",
      parent: "1",
      children: [],
    },
  };
}

test("ui.js imports cleanly and renderHome() lists top-level categories with their lead", () => {
  const doc = createFakeDOM();
  const articles = sampleArticles();
  articles["1"].parent = null;
  const page = renderHome(doc, articles, "Logic", () => {});
  assert.equal(page.querySelector(".mw-title").textContent, "Logic");
  const cards = page.querySelectorAll(".mw-home-card-title");
  assert.ok(cards.length >= 1);
});

test("happy path: renderArticlePage() renders references + auto-linked body + search-terms box", () => {
  const doc = createFakeDOM();
  const articles = sampleArticles();
  const catalogue = buildLinkCatalogue(articles);
  let navigated = null;
  const page = renderArticlePage(doc, articles, articles["1.1"], catalogue, (id) => {
    navigated = id;
  });

  assert.equal(page.querySelector(".mw-title").textContent, "Affirming the Consequent");
  assert.ok(page.querySelector(".mw-references"), "references section should render");
  assert.ok(page.querySelector(".mw-search-terms-box"), "search-terms box should render");
  // The fake DOM stores innerHTML as a raw string (TEST-8: no HTML parsing,
  // see fake-dom.mjs's own header) — assert on the stored markup itself
  // rather than on DOM nodes parsed from it (real browsers do parse it;
  // click-wiring is exercised by the extractor + autolink unit tests instead).
  const body = page.querySelector(".mw-body");
  assert.match(body.innerHTML, /class="wikilink"/);
  assert.match(body.innerHTML, /data-article-id="1\.2"/);
  void navigated;
});

test("guard path: renderSectionPage() renders a landing page, never a stub with empty sections", () => {
  const doc = createFakeDOM();
  const articles = sampleArticles();
  const page = renderSectionPage(doc, articles, articles["1"], () => {});
  assert.equal(page.querySelector(".mw-title").textContent, "Formal Fallacies");
  assert.ok(page.querySelector(".mw-home-card-title"), "children should render as cards");
  assert.equal(page.querySelectorAll(".mw-references").length, 0);
});

function sampleFlatCatalogue() {
  return {
    "riddle-1": {
      id: "riddle-1",
      title: "Riddle One",
      role: "article",
      level: 1,
      lead: "What am I?",
      body_html: "<p>What am I?</p>",
      parent: null,
      children: [],
      siblings: [],
      source: "Grimm",
      licence: "Public domain",
    },
    "riddle-2": {
      id: "riddle-2",
      title: "Riddle Two",
      role: "article",
      level: 1,
      lead: "Guess again.",
      body_html: "<p>Guess again.</p>",
      parent: null,
      children: [],
      siblings: [],
      source: "Aesop",
    },
  };
}

test("Task A: renderSideMenu() shows a flat item list (no tree/toggle) for a flat catalogue", () => {
  const doc = createFakeDOM();
  const articles = sampleFlatCatalogue();
  const nav = renderSideMenu(doc, articles, {
    onHome: () => {},
    onAll: () => {},
    onSurprise: () => {},
    onNavigate: () => {},
    expandedIds: new Set(),
  });
  assert.equal(nav.querySelectorAll(".mw-tree-toggle").length, 0, "no expand/collapse tree for a flat catalogue");
  const itemList = nav.querySelector(".mw-menu-categories");
  const links = itemList.querySelectorAll(".mw-menu-link");
  assert.equal(links.length, 2);
  assert.equal(links[0].textContent, "Riddle One [Grimm]");
});

test("Task A: renderSideMenu() still renders the lazy tree for a hierarchical cartridge", () => {
  const doc = createFakeDOM();
  const articles = sampleArticles();
  const nav = renderSideMenu(doc, articles, {
    onHome: () => {},
    onAll: () => {},
    onSurprise: () => {},
    onNavigate: () => {},
    expandedIds: new Set(),
  });
  assert.ok(nav.querySelector(".mw-tree"), "hierarchical cartridges keep the tree");
});

test("Task A: renderHome() lists every item (not just top-level) with its source bracketed, for a flat catalogue", () => {
  const doc = createFakeDOM();
  const articles = sampleFlatCatalogue();
  const page = renderHome(doc, articles, "Riddles", () => {});
  const cards = page.querySelectorAll(".mw-home-card-title");
  assert.equal(cards.length, 2);
  assert.equal(cards[0].textContent, "Riddle One [Grimm]");
  assert.equal(cards[1].textContent, "Riddle Two [Aesop]");
});

test("Task A: renderArticlePage() shows the bracketed source in the title and a licence attribution line", () => {
  const doc = createFakeDOM();
  const articles = sampleFlatCatalogue();
  const page = renderArticlePage(doc, articles, articles["riddle-1"], [], () => {});
  assert.equal(page.querySelector(".mw-title").textContent, "Riddle One [Grimm]");
  assert.match(page.querySelector(".mw-attribution").textContent, /Public domain/);
  // Flat items have no siblings (parent: null) — See also/prev-next degrade
  // to omitted, exactly as recommended by miniwiki-module.md §6 point 6/7.
  assert.equal(page.querySelectorAll(".mw-see-also").length, 0);
  assert.equal(page.querySelectorAll(".mw-article-nav").length, 0);
});

test("guard path: renderArticlePage() omits the attribution line when there is no licence", () => {
  const doc = createFakeDOM();
  const articles = sampleFlatCatalogue();
  const page = renderArticlePage(doc, articles, articles["riddle-2"], [], () => {});
  assert.equal(page.querySelectorAll(".mw-attribution").length, 0);
});
