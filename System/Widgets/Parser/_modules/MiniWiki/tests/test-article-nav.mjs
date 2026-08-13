import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakeDOM } from "../../../_shell/tests/js/fake-dom.mjs";
import { getSeeAlso, getPrevNextSibling, renderSeeAlso, renderPrevNextNav } from "../src/article-nav.js";

function sampleArticles() {
  return {
    "1": { id: "1", title: "Root", role: "section", parent: null, children: ["1.1", "1.2", "1.3"] },
    "1.1": { id: "1.1", title: "First", role: "article", parent: "1", children: [] },
    "1.2": { id: "1.2", title: "Second", role: "article", parent: "1", children: [] },
    "1.3": { id: "1.3", title: "Third", role: "article", parent: "1", children: [] },
    "2": { id: "2", title: "Only Child", role: "section", parent: null, children: ["2.1"] },
    "2.1": { id: "2.1", title: "Lonely", role: "article", parent: "2", children: [] },
  };
}

test("article-nav.js imports cleanly and getSeeAlso() lists siblings, excluding self", () => {
  const articles = sampleArticles();
  const seeAlso = getSeeAlso(articles, articles["1.2"]);
  assert.deepEqual(seeAlso.map((a) => a.id), ["1.1", "1.3"]);
});

test("happy path: getPrevNextSibling() wraps at the first and last sibling", () => {
  const articles = sampleArticles();
  assert.deepEqual(getPrevNextSibling(articles, articles["1.1"]), {
    prev: articles["1.3"],
    next: articles["1.2"],
  });
  assert.deepEqual(getPrevNextSibling(articles, articles["1.3"]), {
    prev: articles["1.2"],
    next: articles["1.1"],
  });
});

test("guard path: an only-child (or top-level, or unparented sole) article has no prev/next or see-also", () => {
  const articles = sampleArticles();
  const { prev, next } = getPrevNextSibling(articles, articles["2.1"]);
  assert.equal(prev, null);
  assert.equal(next, null);
  assert.deepEqual(getSeeAlso(articles, articles["2.1"]), []);

  const doc = createFakeDOM();
  assert.equal(renderSeeAlso(doc, articles, articles["2.1"], () => {}), null);
  assert.equal(renderPrevNextNav(doc, articles, articles["2.1"], () => {}), null);
});

test("renderSeeAlso() and renderPrevNextNav() render clickable chips/links that navigate", () => {
  const doc = createFakeDOM();
  const articles = sampleArticles();
  let navigatedTo = null;
  const onNavigate = (id) => (navigatedTo = id);

  const seeAlso = renderSeeAlso(doc, articles, articles["1.1"], onNavigate);
  const chip = seeAlso.querySelector(".mw-see-also-link");
  assert.match(chip.textContent, /Second|Third/);
  chip.click();
  assert.ok(navigatedTo === "1.2" || navigatedTo === "1.3");

  navigatedTo = null;
  const nav = renderPrevNextNav(doc, articles, articles["1.1"], onNavigate);
  const prevLink = nav.querySelector(".mw-nav-prev");
  const nextLink = nav.querySelector(".mw-nav-next");
  assert.match(prevLink.textContent, /Third/);
  assert.match(nextLink.textContent, /Second/);
  nextLink.click();
  assert.equal(navigatedTo, "1.2");
});
