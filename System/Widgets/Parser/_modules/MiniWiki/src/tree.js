/**
 * tree.js — tree helpers over the ARTICLES-by-id map: ancestors, top-level
 * categories, a flat sorted index, and a lazy-expansion window for
 * virtualised rendering (model decision #3 — must stay usable at 155
 * articles and on mobile). No DOM here (SR-1); ui.js owns rendering.
 */

function byIdNumeric(a, b) {
  const pa = a.id.split(".").map(Number);
  const pb = b.id.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d;
  }
  return 0;
}

/** getAncestors(articlesById, id) -> Article[] root-first, excluding id itself. */
function getAncestors(articlesById, id) {
  const chain = [];
  let current = articlesById[id];
  while (current && current.parent && articlesById[current.parent]) {
    current = articlesById[current.parent];
    chain.unshift(current);
  }
  return chain;
}

/** getTopLevel(articlesById) -> Article[] with no parent, id-sorted. */
function getTopLevel(articlesById) {
  return Object.values(articlesById)
    .filter((a) => !a.parent)
    .sort(byIdNumeric);
}

/** flatIndex(articlesById) -> every Article, id-sorted (backs the "All" page). */
function flatIndex(articlesById) {
  return Object.values(articlesById).sort(byIdNumeric);
}

function getChildren(articlesById, id) {
  const article = articlesById[id];
  if (!article || !article.children) return [];
  return article.children.map((cid) => articlesById[cid]).filter(Boolean).sort(byIdNumeric);
}

/**
 * visibleNodes(articlesById, expandedIds) -> Article[]
 * Lazy-expansion tree window: only top-level nodes plus the children of
 * any id present in `expandedIds` are returned, in display order, each
 * tagged with its `depth`. A 155-article cartridge renders a handful of
 * DOM nodes at rest instead of the whole tree; expanding a node reveals
 * only its direct children (themselves collapsed), so a depth-4 tree
 * never renders more than the path the user actually opened.
 */
function visibleNodes(articlesById, expandedIds) {
  const out = [];
  function walk(list, depth) {
    for (const a of list) {
      out.push({ article: a, depth, hasChildren: (a.children || []).length > 0 });
      if ((a.children || []).length > 0 && expandedIds.has(a.id)) {
        walk(getChildren(articlesById, a.id), depth + 1);
      }
    }
  }
  walk(getTopLevel(articlesById), 0);
  return out;
}

export { byIdNumeric, getAncestors, getTopLevel, flatIndex, getChildren, visibleNodes };
