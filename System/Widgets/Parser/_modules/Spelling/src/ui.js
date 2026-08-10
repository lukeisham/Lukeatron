/**
 * ui.js — the replacement UI (spec FR-9, FR-10, FR-11).
 *
 * Rendering: CSS Custom Highlight API primary (no DOM mutation, caret- and
 * undo-safe — AD-2), a non-mutating absolutely-positioned overlay as the
 * ONLY fallback (never the innerHTML+TreeWalker approach the research
 * confirmed breaks IME composition and undo history in both Chrome and
 * Firefox — that approach is excluded outright, not offered as a tier).
 *
 * Every DOM write here uses `textContent`/attribute setters, never
 * `innerHTML` with dynamic content (JS-6). A "shouldn't happen" state
 * (missing document, missing anchor) warns via `console.warn` with enough
 * context to locate the call site rather than failing silently (JS-2).
 */

const HIGHLIGHT_NAME = "spelling-misspelled";
const POPOVER_ID = "spelling-suggestions";
const OVERLAY_ID = "spelling-overlay";

/** supportsHighlightAPI() -> boolean (spec FR-9). */
function supportsHighlightAPI() {
  return (
    typeof CSS !== "undefined" &&
    typeof CSS.highlights !== "undefined" &&
    typeof Highlight !== "undefined"
  );
}

function resolveDocument(explicitDoc, el) {
  return explicitDoc ?? el?.ownerDocument ?? (typeof globalThis.document !== "undefined" ? globalThis.document : null);
}

function buildRangeForToken(doc, inputEl, token) {
  const textNode = inputEl.firstChild ?? inputEl;
  const range = doc.createRange();
  range.setStart(textNode, token.start);
  range.setEnd(textNode, token.end);
  return range;
}

function renderHighlightsViaHighlightAPI(doc, inputEl, tokens) {
  const highlight = new Highlight();
  for (const token of tokens) {
    try {
      highlight.add(buildRangeForToken(doc, inputEl, token));
    } catch (err) {
      console.warn("SpellingModule.renderHighlights: could not build a Range for token", token, err);
    }
  }
  CSS.highlights.set(HIGHLIGHT_NAME, highlight);
}

function clearChildren(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

function renderHighlightsViaOverlay(doc, inputEl, tokens) {
  if (typeof doc.getElementById !== "function") {
    console.warn("SpellingModule.renderHighlights: document has no getElementById; cannot render overlay fallback");
    return;
  }

  let overlay = doc.getElementById(OVERLAY_ID);
  if (!overlay && typeof doc.createElement === "function") {
    overlay = doc.createElement("div");
    overlay.id = OVERLAY_ID;
    if (typeof overlay.style === "object") {
      overlay.style.position = "absolute";
      overlay.style.pointerEvents = "none";
    }
    const parent = inputEl.parentNode ?? doc.body;
    parent?.appendChild?.(overlay);
  }
  if (!overlay) {
    console.warn("SpellingModule.renderHighlights: could not create overlay element (no document.createElement)");
    return;
  }

  clearChildren(overlay);

  for (const token of tokens) {
    try {
      const range = buildRangeForToken(doc, inputEl, token);
      const rect = typeof range.getBoundingClientRect === "function" ? range.getBoundingClientRect() : null;
      if (!rect || typeof doc.createElement !== "function") continue;

      const mark = doc.createElement("span");
      mark.className = "spelling-mark";
      if (typeof mark.style === "object") {
        const scrollX = globalThis.scrollX ?? 0;
        const scrollY = globalThis.scrollY ?? 0;
        mark.style.position = "absolute";
        mark.style.left = `${rect.left + scrollX}px`;
        mark.style.top = `${rect.top + scrollY}px`;
        mark.style.width = `${rect.width}px`;
        mark.style.height = `${rect.height}px`;
      }
      overlay.appendChild(mark);
    } catch (err) {
      console.warn("SpellingModule.renderHighlights: overlay mark failed for token", token, err);
    }
  }
}

/**
 * renderHighlights(inputEl, tokens, options) -> void  (spec FR-9)
 * options: { document?: Document }
 */
function renderHighlights(inputEl, tokens, options = {}) {
  if (!inputEl) {
    console.warn("SpellingModule.renderHighlights: inputEl is required, got", inputEl);
    return;
  }
  const doc = resolveDocument(options.document, inputEl);
  if (!doc) {
    console.warn("SpellingModule.renderHighlights: no document available (pass options.document)");
    return;
  }

  if (supportsHighlightAPI()) {
    renderHighlightsViaHighlightAPI(doc, inputEl, tokens ?? []);
  } else {
    renderHighlightsViaOverlay(doc, inputEl, tokens ?? []);
  }
}

/** positionPopover(popover, anchorEl) — viewport-bounds-checked placement
 * (flip above if it would overflow the bottom; clamp horizontally). */
function positionPopover(popover, anchorEl) {
  if (typeof anchorEl?.getBoundingClientRect !== "function") return;
  const anchorRect = anchorEl.getBoundingClientRect();
  const innerWidth = globalThis.innerWidth ?? 1024;
  const innerHeight = globalThis.innerHeight ?? 768;

  let top = anchorRect.bottom + 4;
  let left = anchorRect.left;

  const popRect =
    typeof popover.getBoundingClientRect === "function"
      ? popover.getBoundingClientRect()
      : { width: 160, height: 120 };

  if (left + popRect.width > innerWidth) {
    left = Math.max(8, innerWidth - popRect.width - 8);
  }
  if (top + popRect.height > innerHeight) {
    const above = anchorRect.top - popRect.height - 4;
    top = above >= 0 ? above : anchorRect.bottom + 4;
  }

  if (typeof popover.style === "object") {
    popover.style.left = `${left}px`;
    popover.style.top = `${top}px`;
  }
}

function makeOption(doc, text, { role = "option", dataset = {} } = {}) {
  const el = doc.createElement("span");
  el.setAttribute("role", role);
  el.setAttribute("tabindex", "0");
  el.textContent = text; // JS-6: never innerHTML
  for (const [key, value] of Object.entries(dataset)) {
    el.setAttribute(`data-${key}`, value);
  }
  return el;
}

function attachPopoverKeyboardNav(popover, doc) {
  if (typeof popover.addEventListener !== "function") return;
  popover.addEventListener("keydown", (ev) => {
    const options =
      typeof popover.querySelectorAll === "function" ? popover.querySelectorAll('[role="option"]') : [];
    if (!options.length) return;
    const currentActive =
      (typeof popover.querySelector === "function" && popover.querySelector('[aria-selected="true"]')) ||
      options[0];
    const currentIndex = Array.prototype.indexOf.call(options, currentActive);

    const select = (el) => {
      currentActive?.removeAttribute?.("aria-selected");
      el.setAttribute("aria-selected", "true");
      el.focus?.();
    };

    if (ev.key === "ArrowDown") {
      select(options[(currentIndex + 1 + options.length) % options.length]);
      ev.preventDefault?.();
    } else if (ev.key === "ArrowUp") {
      select(options[(currentIndex - 1 + options.length) % options.length]);
      ev.preventDefault?.();
    } else if (ev.key === "Enter") {
      currentActive?.click?.();
    } else if (ev.key === "Escape") {
      if (typeof popover.style === "object") popover.style.display = "none";
    }
  });
}

/**
 * showSuggestions(word, anchorEl, actions, options) -> void  (spec FR-10)
 * actions: { onReplace(word), onIgnore(word), onLearn(word) }
 * options: { document?, getSuggestions?: (word) => string[] }
 */
function showSuggestions(word, anchorEl, actions = {}, options = {}) {
  const doc = resolveDocument(options.document, anchorEl);
  if (!doc || typeof doc.getElementById !== "function") {
    console.warn("SpellingModule.showSuggestions: no usable document for", word);
    return;
  }

  let popover = doc.getElementById(POPOVER_ID);
  if (!popover && typeof doc.createElement === "function") {
    popover = doc.createElement("div");
    popover.id = POPOVER_ID;
    doc.body?.appendChild?.(popover);
  }
  if (!popover) {
    console.warn("SpellingModule.showSuggestions: could not obtain or create the popover element");
    return;
  }

  popover.setAttribute("role", "listbox");
  popover.setAttribute("aria-label", "Spelling suggestions");
  if (typeof popover.style === "object") popover.style.display = "block";

  clearChildren(popover);

  const suggestions = typeof options.getSuggestions === "function" ? options.getSuggestions(word) : [];
  const doc_ = doc;
  for (const suggestionWord of suggestions) {
    const opt = makeOption(doc_, suggestionWord, { dataset: { word: suggestionWord } });
    opt.addEventListener?.("click", () => actions.onReplace?.(suggestionWord));
    popover.appendChild(opt);
  }

  const ignoreOpt = makeOption(doc_, "Ignore", { dataset: { action: "ignore" } });
  ignoreOpt.addEventListener?.("click", () => actions.onIgnore?.(word));
  popover.appendChild(ignoreOpt);

  const learnOpt = makeOption(doc_, "Add to dictionary", { dataset: { action: "learn" } });
  learnOpt.addEventListener?.("click", () => actions.onLearn?.(word));
  popover.appendChild(learnOpt);

  const firstOption =
    typeof popover.querySelector === "function" ? popover.querySelector('[role="option"]') : null;
  firstOption?.setAttribute?.("aria-selected", "true");
  if (firstOption?.id) popover.setAttribute("aria-activedescendant", firstOption.id);

  attachPopoverKeyboardNav(popover, doc);
  positionPopover(popover, anchorEl);
  popover.focus?.();
}

/**
 * replaceWord(range, replacement, doc) -> void  (spec FR-11)
 * Range API deleteContents + insertNode — never innerHTML — so caret and
 * undo history are preserved.
 */
function replaceWord(range, replacement, doc) {
  if (!range || typeof range.deleteContents !== "function") {
    console.warn("SpellingModule.replaceWord: range must support deleteContents/insertNode, got", range);
    return;
  }
  const document_ = doc ?? (typeof globalThis.document !== "undefined" ? globalThis.document : null);
  if (!document_ || typeof document_.createTextNode !== "function") {
    console.warn("SpellingModule.replaceWord: no document available to create the replacement text node");
    return;
  }
  range.deleteContents();
  range.insertNode(document_.createTextNode(replacement));
}

export {
  supportsHighlightAPI,
  renderHighlights,
  showSuggestions,
  positionPopover,
  replaceWord,
};
