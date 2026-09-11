// Small DOM helpers shared by every rendering module (SR-4: written once, imported
// everywhere, instead of copy-pasted per view).
//
// Every helper here builds nodes with createElement/createElementNS and sets text
// with textContent — never innerHTML with dynamic content (HTML-6, FR-14 of
// monitor.spec.md, JS-6): store text is Luke-authored but still untrusted input to
// a renderer, so it never crosses into markup.

const SVG_NS = "http://www.w3.org/2000/svg";

/** Build an HTML element, set attributes, append children (nodes or strings, the
 * latter becoming text nodes — never parsed as markup). */
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  applyAttrs(node, attrs);
  appendChildren(node, children);
  return node;
}

/** Build an SVG element in the SVG namespace — required for every tag inside an
 * <svg> root (SVG-2: case-sensitive tag and attribute names). */
export function svgEl(tag, attrs = {}, children = []) {
  const node = document.createElementNS(SVG_NS, tag);
  applyAttrs(node, attrs);
  appendChildren(node, children);
  return node;
}

function applyAttrs(node, attrs) {
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === "class") {
      node.setAttribute("class", value);
    } else if (key.startsWith("on") && typeof value === "function") {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === "dataset") {
      for (const [dKey, dValue] of Object.entries(value)) node.dataset[dKey] = dValue;
    } else {
      node.setAttribute(key, String(value));
    }
  }
}

function appendChildren(node, children) {
  const list = Array.isArray(children) ? children : [children];
  for (const child of list) {
    if (child === null || child === undefined || child === false) continue;
    node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
  }
}

/** Remove every child of a node. Used before re-rendering a mount point so a
 * repeated render never leaves stale listeners behind (JS-6). */
export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

/** One click puts `text` on the clipboard (FR-7). Resolves true/false so a caller
 * can show a brief confirmation without pretending the copy always succeeds — a
 * guard against a "shouldn't happen" state that still needs a visible outcome. */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.warn("copyToClipboard: clipboard API unavailable or refused", err);
    return false;
  }
}

/** Read a CSS custom property off :root, trimmed. Every colour, size and shade
 * factor this module needs comes through here — never a literal (documentation
 * spec, "colours live in exactly one file"). */
export function token(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
