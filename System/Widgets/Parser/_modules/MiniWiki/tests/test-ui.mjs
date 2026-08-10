import { test } from "node:test";
import assert from "node:assert/strict";
// Shared per vibe-coding-rules.md SR-4 (Spelling/tests/test-ui.mjs already
// pulls this in the same way for the same reason).
import { createFakeDOM } from "../../../_shell/tests/js/fake-dom.mjs";
import { renderHome, renderSectionPage, renderArticlePage, buildLinkCatalogue } from "../src/ui.js";

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
