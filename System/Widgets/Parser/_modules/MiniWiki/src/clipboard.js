/**
 * clipboard.js — copy-to-clipboard for the "key search terms" box
 * (requirement 9), offline-first: navigator.clipboard.writeText when
 * available, falling back to a hidden textarea + document.execCommand
 * ("copy") when it is not (older Safari, or a clipboard-permission-
 * denied file:// context). Never throws (JS-2): callers get a resolved
 * boolean, not a rejected promise, even when the fallback also fails.
 */

function legacyCopy(text, doc) {
  if (!doc || !doc.createElement) {
    console.warn("clipboard.legacyCopy: no document available for the execCommand fallback");
    return false;
  }
  const textarea = doc.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  doc.body.appendChild(textarea);
  textarea.select();
  let ok = false;
  try {
    ok = doc.execCommand ? doc.execCommand("copy") : false;
  } catch (e) {
    console.warn("clipboard.legacyCopy: execCommand fallback threw", e);
    ok = false;
  }
  doc.body.removeChild(textarea);
  return ok;
}

/** copyToClipboard(text, doc?) -> Promise<boolean> */
function copyToClipboard(text, doc) {
  const d = doc || (typeof document !== "undefined" ? document : undefined);
  if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text).then(
      () => true,
      () => legacyCopy(text, d)
    );
  }
  return Promise.resolve(legacyCopy(text, d));
}

export { copyToClipboard, legacyCopy };
