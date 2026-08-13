/**
 * markdown.js — the tiny amount of markdown rendering MiniWiki needs at
 * RUNTIME (the build-time extractor does its own paragraph-only render
 * into body_html already; this file exists for the module's public
 * renderBody() escape hatch when a host passes raw markdown directly,
 * e.g. from a future non-extractor content source). One job (SR-1):
 * escape untrusted text, then apply a handful of inline markers.
 */

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** renderInline(text) -> escaped HTML with bold/italic markers applied. */
function renderInline(text) {
  const escaped = escapeHtml(text);
  return escaped
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}

/** renderParagraphs(text) -> one <p> per blank-line-separated block. */
function renderParagraphs(text) {
  if (typeof text !== "string" || text.trim().length === 0) return "";
  return text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${renderInline(block)}</p>`)
    .join("");
}

export { escapeHtml, renderInline, renderParagraphs };
