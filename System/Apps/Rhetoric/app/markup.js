/**
 * Splits example text on the `*word*` italics convention (database.spec AD-6) into
 * segments. Returning data, not markup, keeps DB text out of innerHTML (JS-6):
 * render.js turns each segment into a text node or an <em>.
 */
export function parseInline(text) {
  return text
    .split(/\*([^*]+)\*/)
    .map((piece, index) => ({ text: piece, italic: index % 2 === 1 }))
    .filter((segment) => segment.text !== '');
}

export function stripInline(text) {
  return parseInline(text).map((segment) => segment.text).join('');
}
