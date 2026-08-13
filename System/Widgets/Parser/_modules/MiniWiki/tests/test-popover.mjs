import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakeDOM } from "../../../_shell/tests/js/fake-dom.mjs";
import {
  findLinkAncestor,
  formatPreviewHtml,
  computePosition,
  createPreviewPopover,
  createHoverHandlers,
} from "../src/popover.js";

function sampleArticle() {
  return { id: "1.1", title: "Denying the Antecedent", lead: "The mirror fallacy of affirming the consequent." };
}

test("popover.js imports cleanly and formatPreviewHtml() escapes and truncates the lead", () => {
  const html = formatPreviewHtml({ title: "<b>X</b>", lead: "a".repeat(120) });
  assert.match(html, /&lt;b&gt;X&lt;\/b&gt;/);
  assert.match(html, /…/);
});

test("computePosition() sits above the link, flipping below only on top overflow", () => {
  const below = computePosition({ top: 5, bottom: 25, left: 10 }, 60);
  assert.equal(below.top, 33, "flips below when there's no room above");
  const above = computePosition({ top: 200, bottom: 220, left: 10 }, 60);
  assert.equal(above.top, 132, "sits above when there's room");
});

test("findLinkAncestor() walks up to the nearest .wikilink from a nested target", () => {
  const doc = createFakeDOM();
  const link = doc.createElement("a");
  link.className = "wikilink";
  const inner = doc.createElement("span");
  link.appendChild(inner);
  assert.equal(findLinkAncestor(inner), link);
  assert.equal(findLinkAncestor(doc.createElement("div")), null);
});

test("happy path: hover handlers show the popover after the delay and hide it on mouseout", async () => {
  const doc = createFakeDOM();
  const link = doc.createElement("a");
  link.className = "wikilink";
  link.setAttribute("data-article-id", "1.1");

  const popover = createPreviewPopover(doc);
  const articles = { "1.1": sampleArticle() };
  const handlers = createHoverHandlers(popover, (id) => articles[id] || null);

  handlers.onMouseOver({ target: link });
  assert.equal(popover.style.display, "none", "not shown before the ~150ms delay elapses");
  await new Promise((resolve) => setTimeout(resolve, 170));
  assert.equal(popover.style.display, "block");
  assert.match(popover.innerHTML, /Denying the Antecedent/);

  handlers.onMouseOut({ target: link });
  assert.equal(popover.style.display, "none");
});

test("guard path: focus/blur show and hide immediately, and a non-link target is a no-op", () => {
  const doc = createFakeDOM();
  const link = doc.createElement("a");
  link.className = "wikilink";
  link.setAttribute("data-article-id", "1.1");

  const popover = createPreviewPopover(doc);
  const articles = { "1.1": sampleArticle() };
  const handlers = createHoverHandlers(popover, (id) => articles[id] || null);

  handlers.onFocusIn({ target: link });
  assert.equal(popover.style.display, "block");
  handlers.onFocusOut({ target: link });
  assert.equal(popover.style.display, "none");

  const plain = doc.createElement("div");
  handlers.onMouseOver({ target: plain });
  assert.equal(popover.style.display, "none", "hovering a non-wikilink element is a no-op");
});
