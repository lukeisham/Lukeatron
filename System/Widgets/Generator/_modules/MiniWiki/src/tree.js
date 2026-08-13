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
 * isFlatCatalogue(articlesById) -> boolean
 * Flatness is a property of the DATA, not a mode a caller declares: true
 * when no article has a parent and no article has children — i.e. every
 * entry is its own top-level, childless item (a riddle/folk-tale/
 * psychometric-item catalogue, per `_research/miniwiki-module.md` §6).
 * False (the default) keeps every hierarchical cartridge — Grammar,
 * Logic, Rhetoric, … — rendering the tree exactly as before. An empty
 * articlesById is treated as hierarchical (nothing to prove otherwise),
 * so callers don't need a separate "no articles" branch.
 */
function isFlatCatalogue(articlesById) {
  const all = Object.values(articlesById);
  if (!all.length) return false;
  return all.every((a) => !a.parent && (!a.children || a.children.length === 0));
}

export { byIdNumeric, getAncestors, getTopLevel, flatIndex, getChildren, isFlatCatalogue };
