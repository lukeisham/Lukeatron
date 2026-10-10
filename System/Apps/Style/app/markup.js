/**
 * Splits text on the `*italic*` and `_bold_` conventions into segments, each with its own
 * `italic` and `bold` flag; one can sit inside the other (`*a _b_ c*`), so a segment can carry both.
 * Returning data, not markup, keeps DB text out of innerHTML (JS-6): render.js turns each segment into a text node,
 * an <em>, a <strong>, or both.
 */
const MARKED = /\*([^*]+)\*|_([^_]+)_/;

export function parseInline(text, italic = false, bold = false) {
  const segments = [];
  let rest = text;
  for (let found = MARKED.exec(rest); found; found = MARKED.exec(rest)) {
    const [whole, starred, underscored] = found;
    if (found.index > 0) segments.push({ text: rest.slice(0, found.index), italic, bold });
    segments.push(...(starred !== undefined
      ? parseInline(starred, true, bold)
      : parseInline(underscored, italic, true)));
    rest = rest.slice(found.index + whole.length);
  }
  if (rest !== '') segments.push({ text: rest, italic, bold });
  return segments;
}

export function stripInline(text) {
  return parseInline(text).map((segment) => segment.text).join('');
}
