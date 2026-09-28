/**
 * library-panel.js — the Library panel (library.spec FR-L2, FR-L3, FR-L5).
 *
 * Lists the twelve ready-made story maps and opens the chosen one as an editable copy through the
 * story model's `openStory`. The frozen `LIBRARY` entries are only read here, never changed (FR-L4).
 * Panel visibility uses the `hidden` attribute.
 */
import { EVT_OPEN_LIBRARY } from "../shared/events.js";
import { LIBRARY } from "../data/library.js";
import { getStoryState, openStory } from "./story-model.js";

const CLS = "st-library-panel";
const REPLACE_QUESTION = "Replace the map on screen?";

function element(doc, tag, className, text) {
  const node = doc.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(doc, className, label) {
  const node = element(doc, "button", className, label);
  node.setAttribute("type", "button");
  return node;
}

/** Example works with the lead first (FR-L2), whatever order the data lists them in. */
export function examplesLeadFirst(entry) {
  return [entry.lead, ...entry.examples.filter((name) => name !== entry.lead)];
}

const librarySignatureOf = (state) => JSON.stringify([state.beads, state.ribbons]);

/**
 * @param {Element} host the `#library-panel` element
 * @param {{ library?: object[], open?: (shape: object) => object, getState?: () => object,
 *   isDirty?: () => boolean, onOpened?: (info: { entry: object, result: object }) => void,
 *   doc?: Document, eventTarget?: EventTarget }} [options] all injectable for tests
 * @returns {{ open: () => void, close: () => void, isOpen: () => boolean, markClean: () => void }}
 *   `markClean()` tells the panel the map on screen is saved or freshly opened (the canvas calls it after
 *   a save or opening a saved story), so opening another entry does not ask first.
 */
export function mountLibraryPanel(host, options = {}) {
  const doc = options.doc ?? globalThis.document;
  const eventTarget = options.eventTarget ?? doc;
  const library = options.library ?? LIBRARY;
  const openShape = options.open ?? openStory;
  const getState = options.getState ?? getStoryState;
  let cleanSignature = null;
  let pendingEntry = null;
  let returnFocusTo = null;

  // A non-empty map counts as unsaved unless it is exactly what a library open (or markClean) left.
  const isDirty = options.isDirty ?? (() => {
    const state = getState();
    return state.beads.length > 0 && librarySignatureOf(state) !== cleanSignature;
  });

  host.className = CLS;
  host.setAttribute("role", "dialog");
  host.setAttribute("aria-label", "Library of story maps");
  host.hidden = true;

  const title = element(doc, "h2", `${CLS}__title`, "Library");
  const hint = element(doc, "p", `${CLS}__hint`, "Open a ready-made story map as your own editable copy.");
  const closeButton = button(doc, `${CLS}__close`, "Close");
  const list = element(doc, "ul", `${CLS}__list`);
  const status = element(doc, "p", `${CLS}__status`);
  status.setAttribute("role", "status");

  const confirm = element(doc, "div", `${CLS}__confirm`);
  confirm.setAttribute("role", "alertdialog");
  confirm.setAttribute("aria-label", REPLACE_QUESTION);
  confirm.hidden = true;
  const confirmQuestion = element(doc, "p", `${CLS}__confirm-question`, REPLACE_QUESTION);
  const replaceButton = button(doc, `${CLS}__replace`, "Replace");
  const keepButton = button(doc, `${CLS}__keep`, "Keep my map");
  confirm.append(confirmQuestion, replaceButton, keepButton);

  const entryButtons = new Map();
  for (const entry of library) {
    const item = element(doc, "li", `${CLS}__item`);
    const choose = button(doc, `${CLS}__entry`);
    choose.setAttribute("data-entry-id", entry.id);
    const others = examplesLeadFirst(entry).slice(1);
    choose.append(
      element(doc, "span", `${CLS}__type`, entry.title),
      element(doc, "span", `${CLS}__lead`, entry.lead),
      element(doc, "span", `${CLS}__examples`, others.length ? `, ${others.join(", ")}` : ""),
      element(doc, "span", `${CLS}__credit`, entry.credit),
    );
    choose.addEventListener("click", () => openOrAsk(entry));
    item.appendChild(choose);
    list.appendChild(item);
    entryButtons.set(entry.id, choose);
  }
  host.append(title, hint, closeButton, list, confirm, status);

  function setStatus(message) {
    status.textContent = message;
  }

  function hideConfirm() {
    pendingEntry = null;
    confirm.hidden = true;
  }

  /** Opens a copy: the entry is copied into a fresh shape and named for its title (FR-L3). */
  function openCopy(entry) {
    hideConfirm();
    const result = openShape({ ...entry, name: entry.title });
    if (!result?.ok) {
      setStatus(result?.error?.message ?? "That story could not be opened.");
      return;
    }
    cleanSignature = librarySignatureOf(getState());
    setStatus("");
    options.onOpened?.({ entry, result });
    close();
  }

  function openOrAsk(entry) {
    setStatus("");
    if (isDirty()) {
      pendingEntry = entry;
      confirm.hidden = false;
      keepButton.focus?.();
      return;
    }
    openCopy(entry);
  }

  function open() {
    returnFocusTo = doc.activeElement ?? null;
    hideConfirm();
    setStatus("");
    host.hidden = false;
    entryButtons.get(library[0]?.id)?.focus?.();
  }

  function close() {
    hideConfirm();
    if (host.hidden) return;
    host.hidden = true;
    returnFocusTo?.focus?.();
    returnFocusTo = null;
  }

  // Esc first backs out of the replace question, then closes the panel.
  function onKeydown(event) {
    if (event.key !== "Escape" || host.hidden) return;
    if (pendingEntry) hideConfirm();
    else close();
  }

  closeButton.addEventListener("click", close);
  keepButton.addEventListener("click", () => {
    hideConfirm();
    entryButtons.get(library[0]?.id)?.focus?.();
  });
  replaceButton.addEventListener("click", () => {
    if (pendingEntry) openCopy(pendingEntry);
    else console.warn("library-panel: Replace pressed with no entry waiting");
  });
  eventTarget?.addEventListener?.(EVT_OPEN_LIBRARY, open);
  doc?.addEventListener?.("keydown", onKeydown);

  return {
    open,
    close,
    isOpen: () => !host.hidden,
    markClean: () => { cleanSignature = librarySignatureOf(getState()); },
  };
}
