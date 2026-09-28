/**
 * Print and clipboard output for Storytelling (documentation.spec; story-map FR-C13; lists FR-K5, FR-K6).
 * The print CSS (style.spec FR-S9, FR-S11) keys off two attributes on <body>: `data-print` holds the
 * target and `data-tone` holds the tone. They exist only while a print is in progress.
 */

import { EVT_BEFORE_PRINT, EVT_AFTER_PRINT } from "./events.js";

export const PRINT_TARGETS = ["element", "story", "story-with-table", "table", "list"];
export const PRINT_TONES = ["colour", "gray"];
export const PRINT_TARGET_ATTRIBUTE = "data-print";
export const PRINT_TONE_ATTRIBUTE = "data-tone";

/**
 * Set the print attributes on the body and open the print dialog.
 * Announces EVT_BEFORE_PRINT on the document first (so the diagram and story map can prepare their print view) and
 * EVT_AFTER_PRINT when the attributes are cleared, on `afterprint` or at once if print throws. Never throws.
 *
 * @param {string} target - One of PRINT_TARGETS
 * @param {string} tone - One of PRINT_TONES
 * @param {{ doc?: Document, win?: Window }} [options] test overrides (default to the globals)
 * @returns {{ok: true} | {ok: false, error: string}}
 */
export function setPrintTarget(target, tone, { doc, win } = {}) {
  const document = doc || globalThis.document;
  const window = win || globalThis.window;

  if (!PRINT_TARGETS.includes(target)) {
    return { ok: false, error: `Invalid print target: "${target}"` };
  }
  if (!PRINT_TONES.includes(tone)) {
    return { ok: false, error: `Invalid print tone: "${tone}"` };
  }
  if (!document || !document.body || !window) {
    console.warn("output: setPrintTarget needs a page with a body and a window");
    return { ok: false, error: "No page to print" };
  }

  document.body.setAttribute(PRINT_TARGET_ATTRIBUTE, target);
  document.body.setAttribute(PRINT_TONE_ATTRIBUTE, tone);

  const detail = { target, tone };
  let finished = false;
  const clearAttributes = () => {
    if (finished) return;
    finished = true;
    document.body.removeAttribute(PRINT_TARGET_ATTRIBUTE);
    document.body.removeAttribute(PRINT_TONE_ATTRIBUTE);
    window.removeEventListener("afterprint", clearAttributes);
    announcePrintEvent(document, EVT_AFTER_PRINT, detail);
  };
  window.addEventListener("afterprint", clearAttributes);

  try {
    announcePrintEvent(document, EVT_BEFORE_PRINT, detail);
    window.print();
  } catch (err) {
    clearAttributes();
    console.warn("Print failed:", err);
    return { ok: false, error: err.message };
  }

  return { ok: true };
}

/** A listener that throws must not stop the print, so each announcement is guarded. A page without dispatchEvent simply has no listeners. */
function announcePrintEvent(document, eventName, detail) {
  if (typeof document.dispatchEvent !== "function") return;
  try {
    document.dispatchEvent(new CustomEvent(eventName, { detail }));
  } catch (err) {
    console.warn(`output: a ${eventName} listener failed:`, err);
  }
}

/**
 * Copy text to the clipboard: `navigator.clipboard.writeText` when present, else a hidden
 * textarea and `execCommand("copy")` (older browsers, `file://` pages). Never throws.
 *
 * @param {string} text - Text to copy
 * @param {{ nav?: Navigator, doc?: Document }} [options] test overrides (default to the globals)
 * @returns {Promise<{ok: true} | {ok: false, error: string}>}
 */
export async function copyText(text, { nav, doc } = {}) {
  const navigator = nav || globalThis.navigator;
  const document = doc || globalThis.document;

  if (typeof text !== "string") {
    console.warn("output: copyText was given something other than a string");
    return { ok: false, error: "Nothing to copy" };
  }

  if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return { ok: true };
    } catch (err) {
      console.warn("Clipboard API refused, trying the fallback:", err);
    }
  }

  return copyWithTextarea(text, document);
}

function copyWithTextarea(text, document) {
  let textarea = null;
  try {
    textarea = document.createElement("textarea");
    textarea.textContent = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    return document.execCommand("copy") ? { ok: true } : { ok: false, error: "execCommand('copy') returned false" };
  } catch (err) {
    return { ok: false, error: err.message };
  } finally {
    if (textarea) {
      try {
        document.body.removeChild(textarea);
      } catch (err) {
        console.warn("output: could not remove the copy helper:", err);
      }
    }
  }
}
