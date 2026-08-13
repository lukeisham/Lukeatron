import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakeDOM } from "../../../_shell/tests/js/fake-dom.mjs";
import { snippet, applySearchQuery, renderSearchBox } from "../src/search-ui.js";
import { createMiniWikiModule } from "../src/index.js";

function sampleArticles() {
  return [
    { id: "1", title: "Ethos", role: "article", lead: "Credibility appeals build trust.", body_html: "<p>a</p>", parent: null, children: [] },
    { id: "2", title: "Pathos", role: "article", lead: "Emotional appeals move an audience.", body_html: "<p>b</p>", parent: null, children: [] },
  ];
}

test("search-ui.js imports cleanly and snippet() truncates with an ellipsis", () => {
  assert.equal(snippet("short"), "short");
  assert.equal(snippet("a".repeat(90), 10), "a".repeat(10) + "…");
});

test("happy path: applySearchQuery() live-filters, hides the menu, and renders a clickable result", () => {
  const doc = createFakeDOM();
  const menuBody = doc.createElement("div");
  const results = doc.createElement("div");
  const wiki = createMiniWikiModule({ articles: sampleArticles(), document: doc });
  let navigatedTo = null;

  applySearchQuery(doc, "ethos", results, menuBody, wiki.search, (id) => (navigatedTo = id));

  assert.equal(menuBody.style.display, "none", "normal menu hides while results show");
  const titleEl = results.querySelector(".mw-search-result-title");
  assert.ok(titleEl, "a result row should render");
  assert.match(titleEl.textContent, /Ethos/);
  assert.match(results.querySelector(".mw-search-result-snippet").textContent, /Credibility appeals/);

  results.querySelector(".mw-search-result-item").click();
  assert.equal(navigatedTo, "1");
});

test("guard path: clearing the query restores the normal menu and an unmatched query shows 'No matches.'", () => {
  const doc = createFakeDOM();
  const menuBody = doc.createElement("div");
  const results = doc.createElement("div");
  const wiki = createMiniWikiModule({ articles: sampleArticles(), document: doc });

  applySearchQuery(doc, "nonexistent-topic", results, menuBody, wiki.search, () => {});
  assert.match(results.querySelector(".mw-search-empty").textContent, /No matches/);

  applySearchQuery(doc, "", results, menuBody, wiki.search, () => {});
  assert.equal(menuBody.style.display, "", "menu restored on an empty query");
  assert.doesNotMatch(results.className, /visible/);
});

test("renderSearchBox() builds an input + results container wired to the live search", () => {
  const doc = createFakeDOM();
  const menuBody = doc.createElement("div");
  const wiki = createMiniWikiModule({ articles: sampleArticles(), document: doc });
  const box = renderSearchBox(doc, { search: wiki.search, onNavigate: () => {}, menuBody });
  assert.ok(box.querySelector(".mw-search-box"));
  assert.ok(box.querySelector(".mw-search-results"));
});
