// The four Markdown marks as pure edits of (text, start, end) → {text, start, end}; no DOM.
// inbox-note.js applies the result with setRangeText so the browser's undo still works.

const LIST_PREFIX = "- ";
const LINK_URL = "https://";

function wrapToggle(pair, text, start, end) {
  const selected = text.slice(start, end);
  const size = pair.length;
  if (selected.length >= size * 2 && selected.startsWith(pair) && selected.endsWith(pair)) {
    const inner = selected.slice(size, -size);
    return { text: text.slice(0, start) + inner + text.slice(end), start, end: start + inner.length };
  }
  if (text.slice(start - size, start) === pair && text.slice(end, end + size) === pair) {
    return { text: text.slice(0, start - size) + selected + text.slice(end + size), start: start - size, end: end - size };
  }
  const next = text.slice(0, start) + pair + selected + pair + text.slice(end);
  return selected
    ? { text: next, start: start + size, end: end + size }
    : { text: next, start: start + size, end: start + size };
}

export const bold = (text, start, end) => wrapToggle("**", text, start, end);
export const italic = (text, start, end) => wrapToggle("_", text, start, end);

export function list(text, start, end) {
  const lineStart = text.lastIndexOf("\n", start - 1) + 1;
  const newline = text.indexOf("\n", end);
  const lineEnd = newline === -1 ? text.length : newline;
  const lines = text.slice(lineStart, lineEnd).split("\n");
  const allListed = lines.every((line) => line.startsWith(LIST_PREFIX));
  const block = lines.map((line) => (allListed ? line.slice(LIST_PREFIX.length) : LIST_PREFIX + line)).join("\n");
  return { text: text.slice(0, lineStart) + block + text.slice(lineEnd), start: lineStart, end: lineStart + block.length };
}

export function link(text, start, end) {
  const selected = text.slice(start, end);
  const next = `${text.slice(0, start)}[${selected}](${LINK_URL})${text.slice(end)}`;
  if (!selected) return { text: next, start: start + 1, end: start + 1 };
  const urlStart = start + selected.length + 3;
  return { text: next, start: urlStart, end: urlStart + LINK_URL.length };
}
