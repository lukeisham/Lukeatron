/**
 * autolink.js — prose cross-linking with a generic-title exclusion list
 * and a title-collision rule (model decision #4, CONTENT-FIT-REPORT.md
 * §4). buildLinkCatalogue() is scoped to whatever ARTICLES map it is
 * given — normally one cartridge's worth, since the shell mounts one
 * MiniWiki instance per cartridge build (model decision #5's per-
 * cartridge extractor output). The collision rule below covers the case
 * where a host ever merges more than one cartridge's articles into a
 * single lookup.
 */

// Verbatim from CONTENT-FIT-REPORT.md §4's exclusion list, lower-cased for
// case-insensitive matching.
const EXCLUDED_TITLES = new Set(
  [
    "style",
    "example",
    "examples",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
    "eleven",
    "twelve",
    "forty",
    "one thousand",
  ].map((t) => t.toLowerCase())
);

/** isExcludedTitle(title) -> true if this title must never be auto-linked. */
function isExcludedTitle(title) {
  if (typeof title !== "string") return true;
  const lower = title.trim().toLowerCase();
  if (EXCLUDED_TITLES.has(lower)) return true;
  // Generic heuristic (report §4/§8-#7's "Tropes & symbols: all single-word
  // titles in sections 5–7"): a bare single word of 4 characters or fewer
  // is too likely to appear in ordinary prose to link safely.
  if (!/\s/.test(lower) && lower.length <= 4) return true;
  return false;
}

/**
 * buildLinkCatalogue(articlesById) -> [{id, title}], longest title first.
 *
 * COLLISION RULE: if two different ids share the same (case-insensitive)
 * title, the FIRST one encountered (object key iteration order) wins and
 * every later duplicate is excluded from the catalogue entirely — a
 * mention of that title is never auto-linked to either article, rather
 * than risk silently sending the reader to the wrong one.
 */
function buildLinkCatalogue(articlesById) {
  const firstSeenId = new Map(); // lowercase title -> id
  const collided = new Set();
  for (const [id, article] of Object.entries(articlesById)) {
    if (!article || typeof article.title !== "string") continue;
    const key = article.title.trim().toLowerCase();
    if (!key) continue;
    if (firstSeenId.has(key)) {
      collided.add(key);
      continue;
    }
    firstSeenId.set(key, id);
  }
  const entries = [];
  for (const [title, id] of firstSeenId) {
    if (collided.has(title)) continue;
    if (isExcludedTitle(articlesById[id].title)) continue;
    entries.push({ id, title: articlesById[id].title });
  }
  entries.sort((a, b) => b.title.length - a.title.length);
  return entries;
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * autolinkHtml(html, catalogue, selfId) -> html with the first
 * whole-word, case-insensitive occurrence of each OTHER article's title
 * wrapped in a `.wikilink` anchor. Operates on already-escaped HTML by
 * only rewriting the text runs between tags, so it never mangles markup.
 */
function autolinkHtml(html, catalogue, selfId) {
  if (typeof html !== "string" || html.length === 0) return html;
  const linked = new Set();
  const tagRe = /<[^>]*>/g;
  let lastIndex = 0;
  let match;
  const segments = [];
  while ((match = tagRe.exec(html)) !== null) {
    segments.push({ text: html.slice(lastIndex, match.index), tag: match[0] });
    lastIndex = tagRe.lastIndex;
  }
  segments.push({ text: html.slice(lastIndex), tag: "" });

  let result = "";
  for (const seg of segments) {
    let text = seg.text;
    for (const { id, title } of catalogue) {
      if (id === selfId) continue;
      const key = title.toLowerCase();
      if (linked.has(key)) continue;
      const re = new RegExp(`\\b${escapeRegExp(title)}\\b`, "i");
      const m = text.match(re);
      if (m) {
        text = text.replace(re, `<a class="wikilink" href="#/${id}" data-article-id="${id}">${m[0]}</a>`);
        linked.add(key);
      }
    }
    result += text + seg.tag;
  }
  return result;
}

export { EXCLUDED_TITLES, isExcludedTitle, buildLinkCatalogue, autolinkHtml };
