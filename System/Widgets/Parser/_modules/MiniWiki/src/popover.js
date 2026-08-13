/**
 * popover.js — hover/focus preview popover for wikilinks (audit gap #2).
 * `.wikilink` has only ever had `cursor:help` + a click handler; this adds
 * the actual preview. Kept out of ui.js (SR-1) — this owns exactly the
 * popover element, its positioning, and the delegated show/hide handlers.
 *
 * No `.closest()` is used (the fake DOM in _shell/tests/js/fake-dom.mjs
 * does not implement it, TEST-8, and this file avoids depending on a DOM
 * feature the test harness doesn't provide) — findLinkAncestor() below
 * walks `parentNode` by hand instead, which real DOM elements support too.
 */
import { el } from "./ui.js";

const PREVIEW_LEAD_LEN = 100;
const SHOW_DELAY_MS = 150;

function hasClass(node, className) {
  return (node.className || "").split(/\s+/).includes(className);
}

/** findLinkAncestor(node) -> the nearest `.wikilink`/`.mw-see-also-link`
 * element at or above `node`, or null. */
function findLinkAncestor(node) {
  let current = node;
  while (current) {
    if (current.className !== undefined && (hasClass(current, "wikilink") || hasClass(current, "mw-see-also-link"))) {
      return current;
    }
    current = current.parentNode;
  }
  return null;
}

/** formatPreviewHtml(article) -> the popover's inner markup: bold title +
 * a truncated lead sentence. Text-only inputs (title/lead are already
 * plain strings on the article record, never raw content HTML), so a
 * template literal here does not reopen the JS-6/HTML-6 escaping concern
 * that gates `.mw-body`'s innerHTML assignment. */
function formatPreviewHtml(article) {
  const lead = (article.lead || "").slice(0, PREVIEW_LEAD_LEN);
  const ellipsis = (article.lead || "").length > PREVIEW_LEAD_LEN ? "…" : "";
  return `<strong>${escapeHtml(article.title)}</strong>` + (lead ? `<br><span class="mw-preview-lead">${escapeHtml(lead)}${ellipsis}</span>` : "");
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** computePosition(rect, popoverHeight, viewportHeight) -> {top, left}.
 * Prefers sitting above the link; flips below when that would overflow the
 * top of the viewport (mirrors the mockup's own flip rule). */
function computePosition(rect, popoverHeight, viewportHeight) {
  let top = rect.top - popoverHeight - 8;
  if (top < 0) top = rect.bottom + 8;
  void viewportHeight; // reserved: bottom-overflow flip is symmetrical and not needed at the sizes this popover renders
  return { top, left: rect.left };
}

/** createPreviewPopover(doc) -> a detached, hidden popover Element ready
 * to append to the document (mount() owns where — see index.js). */
function createPreviewPopover(doc) {
  const popover = el(doc, "div", "mw-preview-popover");
  popover.style.display = "none";
  return popover;
}

function showPopover(doc, popover, article, anchorEl) {
  popover.innerHTML = formatPreviewHtml(article);
  popover.style.display = "block";
  const rect = anchorEl.getBoundingClientRect();
  const { top, left } = computePosition(rect, popover.offsetHeight || 60);
  popover.style.top = top + "px";
  popover.style.left = left + "px";
}

function hidePopover(popover) {
  popover.style.display = "none";
}

/**
 * createHoverHandlers(popover, getArticle) -> { onMouseOver, onMouseOut,
 * onFocusIn, onFocusOut } — plain functions taking a synthetic
 * `{ target }` event, so tests can call them directly without a real DOM
 * dispatch mechanism (fake-dom.mjs has no generic dispatchEvent, TEST-8).
 * Wire them with `container.addEventListener("mouseover", handlers.onMouseOver)`
 * etc. in a real (or the fake) DOM.
 */
function createHoverHandlers(popover, getArticle) {
  let showTimer = null;

  function cancelShow() {
    if (showTimer) {
      clearTimeout(showTimer);
      showTimer = null;
    }
  }

  function reveal(doc, link) {
    const articleId = link.getAttribute("data-article-id");
    const article = articleId && getArticle(articleId);
    if (!article) return;
    showPopover(doc, popover, article, link);
  }

  return {
    onMouseOver(e) {
      const link = findLinkAncestor(e.target);
      if (!link) return;
      cancelShow();
      const doc = link.ownerDocument;
      showTimer = setTimeout(() => reveal(doc, link), SHOW_DELAY_MS);
    },
    onMouseOut(e) {
      const link = findLinkAncestor(e.target);
      if (!link) return;
      cancelShow();
      hidePopover(popover);
    },
    onFocusIn(e) {
      const link = findLinkAncestor(e.target);
      if (!link) return;
      cancelShow();
      reveal(link.ownerDocument, link);
    },
    onFocusOut(e) {
      const link = findLinkAncestor(e.target);
      if (!link) return;
      cancelShow();
      hidePopover(popover);
    },
  };
}

export { findLinkAncestor, formatPreviewHtml, computePosition, createPreviewPopover, createHoverHandlers, showPopover, hidePopover };
