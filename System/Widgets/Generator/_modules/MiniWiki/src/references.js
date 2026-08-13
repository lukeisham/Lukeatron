/**
 * references.js — MLA-style reference formatting (requirement 8), per
 * System/Templates/Template_MLA_Reference.md. Source data is ONLY the
 * extractor's `article.references` (build/extract_articles.py's
 * build_reference(), sourced from the content file's YAML frontmatter
 * `title:` / `description:` / `provenance:` fields) — this module never
 * invents a citation. An article with no `references` yields an empty
 * list; ui.js omits the section entirely rather than render an empty
 * heading.
 */

/**
 * formatMlaReference(ref) -> string
 * ref: {title, container, note} — the shape build_reference() emits.
 * Rendered as an MLA-style entry: the content file's own declared title,
 * its container/description, then any further provenance note — never a
 * fabricated author, date, or publisher beyond what frontmatter states.
 */
function formatMlaReference(ref) {
  if (!ref || !ref.title) return "";
  const sentence = (text) => text.trim().replace(/\.?$/, ".");
  const parts = [sentence(ref.title)];
  if (ref.container) parts.push(sentence(ref.container));
  if (ref.note && ref.note !== ref.container) parts.push(sentence(ref.note));
  return parts.join(" ");
}

/** formatReferences(article) -> string[] (never throws on a missing field). */
function formatReferences(article) {
  const refs = article && article.references;
  if (!Array.isArray(refs) || refs.length === 0) return [];
  return refs.map(formatMlaReference).filter(Boolean);
}

export { formatMlaReference, formatReferences };
