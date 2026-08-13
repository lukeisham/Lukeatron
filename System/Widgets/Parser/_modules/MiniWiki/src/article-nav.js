/**
 * article-nav.js — "See also" and prev/next SIBLING navigation for the foot
 * of an article page (audit gap #3 and #4). Pure data helpers over
 * tree.js's getChildren (no new tree traversal invented), plus the two DOM
 * renderers ui.js composes in. Kept out of ui.js per SR-1/CSS-1's "one file,
 * one job" instinct — ui.js already renders everything else on the page.
 *
 * "Related" here means siblings (same parent) — the only relationship the
 * build-time article model actually carries (Specs/MiniWikiModule.spec.md
 * §4 has no curated "related articles" field, and the extractor is out of
 * scope to change). This is a deliberate scope decision, not an oversight.
 */
import { getChildren } from "./tree.js";
import { el } from "./ui.js";

/** getSiblings(articlesById, article) -> Article[] including `article`
 * itself, id-sorted (getChildren's own order). A top-level article
 * (no parent) has no siblings. */
function getSiblings(articlesById, article) {
  if (!article || !article.parent) return [];
  return getChildren(articlesById, article.parent);
}

/**
 * getPrevNextSibling(articlesById, article) -> { prev, next }
 * Wraps at the ends of the sibling list. Both are `null` when `article`
 * has no siblings (only child, or top-level) — the foot section is then
 * omitted entirely by the renderer rather than showing a dead-end link.
 */
function getPrevNextSibling(articlesById, article) {
  const siblings = getSiblings(articlesById, article);
  if (siblings.length <= 1) return { prev: null, next: null };
  const idx = siblings.findIndex((s) => s.id === article.id);
  if (idx === -1) return { prev: null, next: null };
  const prev = siblings[(idx - 1 + siblings.length) % siblings.length];
  const next = siblings[(idx + 1) % siblings.length];
  return { prev, next };
}

/** getSeeAlso(articlesById, article, limit) -> Article[] — this article's
 * siblings, excluding itself, capped at `limit`. Empty when there are none. */
function getSeeAlso(articlesById, article, limit = 8) {
  return getSiblings(articlesById, article)
    .filter((s) => s.id !== article.id)
    .slice(0, limit);
}

function navLink(doc, className, label, articleId, onNavigate) {
  const a = el(doc, "a", className, label);
  a.href = "#/" + articleId;
  a.setAttribute("data-article-id", articleId);
  a.addEventListener("click", (e) => {
    // Guarded rather than an unconditional call: fake-dom.mjs's click()
    // helper (used by this module's own tests, TEST-8) dispatches a plain
    // {type, currentTarget, target} object with no preventDefault — a real
    // browser's click event always has one.
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    onNavigate(articleId);
  });
  return a;
}

/** renderSeeAlso(...) -> Element|null. Null (never an empty section) when
 * the article has no siblings — distinct from the key-search-terms box,
 * which is unrelated content. */
function renderSeeAlso(doc, articlesById, article, onNavigate) {
  const items = getSeeAlso(articlesById, article);
  if (!items.length) return null;
  const section = el(doc, "section", "mw-see-also");
  section.appendChild(el(doc, "div", "mw-see-also-title", "See also"));
  const links = el(doc, "div", "mw-see-also-links");
  for (const item of items) {
    links.appendChild(navLink(doc, "mw-see-also-link", item.title, item.id, onNavigate));
  }
  section.appendChild(links);
  return section;
}

/** renderPrevNextNav(...) -> Element|null. Null when the node has no
 * siblings at all (both prev and next are null). */
function renderPrevNextNav(doc, articlesById, article, onNavigate) {
  const { prev, next } = getPrevNextSibling(articlesById, article);
  if (!prev && !next) return null;
  const nav = el(doc, "div", "mw-article-nav");
  if (prev) nav.appendChild(navLink(doc, "mw-nav-button mw-nav-prev", "← " + prev.title, prev.id, onNavigate));
  if (next) nav.appendChild(navLink(doc, "mw-nav-button mw-nav-next", next.title + " →", next.id, onNavigate));
  return nav;
}

export { getSiblings, getPrevNextSibling, getSeeAlso, renderSeeAlso, renderPrevNextNav };
