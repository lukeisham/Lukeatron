// The one HTML escaper for Lukeatron pages (JS-6). Each app serves only its own folder, so an app
// copies this file verbatim to its own escape-html.js; tests/escape-html.test.js fails on any drift.

const HTML_ENTITIES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/**
 * Safe for element text and for quoted attribute values. Not for URLs, inline scripts or styles.
 * @param {unknown} value
 * @returns {string}
 */
export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => HTML_ENTITIES[character]);
}
