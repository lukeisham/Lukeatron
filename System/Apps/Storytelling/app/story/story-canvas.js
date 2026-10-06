/**
 * story-canvas.js — the story map's renderer and its own toolbar (story-map FR-C4, C8–C12, C13, C15–C17).
 *
 * Draws beads and ribbons from `layout()` and the story store; it never decides where a bead sits and
 * never changes a story except through the bound story-model functions. Pointer drags (ghost, hit-testing,
 * link-dot drag) belong to drag-drop.js, which uses `getLayoutResult()`, `setDropTarget()` and
 * `setDragging()` from here.
 *
 * `canvasEl` is the content box (`.st-tray__content`), NOT the whole area: drag-drop.js turns pointer
 * positions into layout coordinates with `canvasEl.getBoundingClientRect()`, so it must be the element
 * whose top-left is the layout origin (no padding or border; it moves with the tray's scroll). The whole
 * area is `areaEl`.
 *
 * DOM contract (class and data-attribute names are the interface for drag-drop.js and the CSS):
 *   .st-story                                   the whole area (areaEl)
 *     .st-story__toolbar                        savebar + actions
 *     .st-story__saved                          saved-stories list + Library button
 *     .st-story__status                         count + "Next tile joins…" line
 *     .st-tray[data-hint][data-empty]           the scrolling tray (trayEl)
 *       .st-tray__empty                         empty state
 *       .st-tray__content                       relative box sized to the layout (canvasEl = contentEl)
 *         svg.st-threads                        ribbons (threadsEl)
 *         .st-tray__beads                       the beads
 *         button.st-thread-cut                  cut control for the selected ribbon
 * See the module's report for the full list.
 */
import { EVT_SELECT, EVT_OPEN, EVT_STORY_CHANGED, EVT_OPEN_LIBRARY, EVT_NOTICE, EVT_AGENT_SESSION, EVT_BEFORE_PRINT, EVT_AFTER_PRINT, AGENT_STATUS_TEXT } from "../shared/events.js";
import { ELEMENTS, ROGUE, MAX_LABEL } from "../data/elements.js";
import { setPrintTarget, copyText } from "../shared/output.js";
import { layout, pointOnCurve } from "./story-layout.js";
import { storyText } from "./story-text.js";
import { setTip } from "../shared/tooltip.js";
import {
  MAX_BEADS,
  MAX_RIBBONS,
  UNDO_MS,
  DEFAULT_ROGUE_LABEL,
  getStoryState,
  getActiveUid,
  addBead,
  removeBead,
  linkBeads,
  cutRibbon,
  pairBead,
  splitBead,
  swapTandem,
  setLabel,
  setActive,
  newRibbon,
  clearStory,
  undoClear,
  canUndoClear,
  discardUndo,
  openStory,
} from "./story-model.js";
import {
  saveStory,
  listStories,
  openSavedStory,
  deleteStory,
  writeDraft,
  readDraft,
  storageStatus,
} from "./story-store.js";

const CANVAS_SVG_NS = "http://www.w3.org/2000/svg";
const NAME_MAX = 60;

/** Drop-target wording (story-map FR-C3); drag-drop.js relies on the tray's `data-hint` carrying these. */
export const HINT_BRANCH = "Branch from this bead";
export const HINT_INSERT = "Insert on this ribbon";
export const HINT_ADD = "Add to the story";
export const HINT_DOCK = "Pair as a tandem";

const CANVAS_ELEMENTS = new Map([...ELEMENTS, ROGUE].map((element) => [element.id, element]));

/* ---------- small DOM helpers (never innerHTML, D-11) ---------- */

function canvasNode(tag, className, text) {
  const node = globalThis.document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function canvasButton(className, label, attributes = {}) {
  const button = canvasNode("button", className, label);
  button.setAttribute("type", "button");
  for (const [name, value] of Object.entries(attributes)) button.setAttribute(name, value);
  return button;
}

function canvasSvgNode(tag, attributes = {}) {
  const node = globalThis.document.createElementNS(CANVAS_SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, String(value));
  return node;
}

const canvasClosest = (node, selector) => (node && typeof node.closest === "function" ? node.closest(selector) : null);

function canvasIsEditable(node) {
  const tag = String(node?.tagName ?? "").toUpperCase();
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || node?.isContentEditable === true;
}

/* ---------- what a bead shows ---------- */

function halfInfo(bead, which) {
  const elementId = which === "with" ? bead.with : bead.elementId;
  const label = which === "with" ? bead.withLabel : bead.label;
  const element = CANVAS_ELEMENTS.get(elementId);
  const rogue = elementId === ROGUE.id;
  if (!element) console.warn(`story-canvas: bead ${bead.uid} names unknown element ${elementId}`);
  return {
    which,
    elementId,
    rogue,
    label: rogue ? label || DEFAULT_ROGUE_LABEL : undefined,
    group: rogue ? "rogue" : element?.group ?? "unknown",
    added: Boolean(element?.added),
    symbol: rogue ? ROGUE.id : element?.symbol ?? elementId,
    name: rogue ? label || DEFAULT_ROGUE_LABEL : element?.name ?? elementId,
  };
}

const beadHalves = (bead) => (bead.with ? [halfInfo(bead, "main"), halfInfo(bead, "with")] : [halfInfo(bead, "main")]);

function beadTitle(bead) {
  const halves = beadHalves(bead);
  return { symbol: halves.map((h) => h.symbol).join(" + "), name: halves.map((h) => h.name).join(" + ") };
}

function beadFaceSignature(bead, step, editingHalf) {
  return JSON.stringify([bead.elementId, bead.with, bead.label, bead.withLabel, bead.note, step, editingHalf]);
}

/* ---------- DOM builders ---------- */

function buildHalfNode(half, editingHalf, onLabelKey, onLabelBlur) {
  const classes = ["st-bead__half", `tile-${half.group}`];
  if (half.added) classes.push("is-added");
  if (half.rogue) classes.push("is-rogue");
  const node = canvasNode("div", classes.join(" "));
  node.setAttribute("data-element-id", half.elementId);
  node.setAttribute("data-half", half.which);
  node.appendChild(canvasNode("span", "st-bead__symbol", half.symbol));
  if (editingHalf === half.which && half.rogue) {
    const input = canvasNode("input", "st-bead__label-input");
    input.setAttribute("type", "text");
    input.setAttribute("maxlength", String(MAX_LABEL));
    input.setAttribute("aria-label", "Name for this rogue element");
    input.value = half.label;
    input.addEventListener("keydown", onLabelKey);
    input.addEventListener("blur", onLabelBlur);
    node.appendChild(input);
  } else {
    node.appendChild(canvasNode("span", "st-bead__name", half.name));
  }
  return node;
}

function buildSeamNode() {
  const seam = canvasNode("span", "st-bead__seam");
  seam.appendChild(canvasNode("span", "st-bead__seam-plus", "+"));
  seam.appendChild(canvasButton("st-bead__swap", "⇄", { "aria-label": "Swap the two elements" }));
  seam.appendChild(canvasButton("st-bead__split", "Split", { "aria-label": "Split into two beads" }));
  return seam;
}

/** Fills a bead node's children; returns its dock node (or null for a tandem, which takes no third). */
function fillBeadNode(node, bead, step, editingHalf, handlers) {
  const halves = beadHalves(bead);
  const tiles = canvasNode("div", "st-bead__tiles");
  const halfNodes = halves.map((half) => buildHalfNode(half, editingHalf, handlers.onLabelKey, handlers.onLabelBlur));
  tiles.appendChild(halfNodes[0]);
  if (halfNodes[1]) {
    tiles.appendChild(buildSeamNode());
    tiles.appendChild(halfNodes[1]);
  }
  const parts = [canvasNode("span", "st-bead__step", String(step)), tiles];
  parts.push(canvasButton("st-bead__remove", "×", { "aria-label": `Remove step ${step}` }));
  parts.push(canvasButton("st-bead__link-dot", "", { "aria-label": `Link from step ${step}`, tabindex: "-1" }));
  let dock = null;
  if (!bead.with) {
    dock = canvasNode("span", "st-bead__dock");
    dock.setAttribute("data-dock-for", bead.uid);
    dock.setAttribute("aria-hidden", "true");
    parts.push(dock);
  }
  if (bead.note) parts.push(canvasNode("span", "st-bead__note", bead.note));
  node.replaceChildren(...parts);
  const title = beadTitle(bead);
  node.setAttribute("aria-label", `Step ${step}: ${title.name}`);
  setTip(node, bead.note);
  return dock;
}

function buildThreadsRoot() {
  const svg = canvasSvgNode("svg", { class: "st-threads", "aria-hidden": "false", focusable: "false" });
  const defs = canvasSvgNode("defs");
  const marker = canvasSvgNode("marker", {
    id: "st-arrow",
    viewBox: "0 0 10 10",
    refX: 9,
    refY: 5,
    markerWidth: 7,
    markerHeight: 7,
    orient: "auto-start-reverse",
  });
  marker.appendChild(canvasSvgNode("path", { class: "st-threads__arrow", d: "M0,0 L10,5 L0,10 z", fill: "currentColor" }));
  defs.appendChild(marker);
  return { svg, defs };
}

const curvePath = ([p0, p1, p2, p3]) => `M${p0.x},${p0.y} C${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`;

function buildThreadNode(ribbonPath, steps, selected) {
  const classes = ["st-thread"];
  if (ribbonPath.loop) classes.push("is-loop");
  if (selected) classes.push("is-selected");
  const group = canvasSvgNode("g", {
    class: classes.join(" "),
    tabindex: 0,
    role: "button",
    "data-from": ribbonPath.from,
    "data-to": ribbonPath.to,
    "aria-label": `Ribbon from step ${steps[ribbonPath.from]} to step ${steps[ribbonPath.to]}. Enter selects it, Delete cuts it.`,
  });
  const d = curvePath(ribbonPath.curve);
  group.appendChild(canvasSvgNode("path", { class: "st-thread__hit", d, fill: "none", stroke: "transparent", "stroke-width": 14, "pointer-events": "stroke" }));
  group.appendChild(canvasSvgNode("path", { class: "st-thread__line", d, fill: "none", "marker-end": "url(#st-arrow)" }));
  return group;
}

function buildToolbarDom() {
  const root = canvasNode("div", "st-story");
  const toolbar = canvasNode("div", "st-story__toolbar");
  toolbar.setAttribute("role", "toolbar");
  toolbar.setAttribute("aria-label", "Story map");

  const savebar = canvasNode("div", "st-story__savebar");
  const nameLabel = canvasNode("label", "st-story__name-label");
  nameLabel.appendChild(canvasNode("span", "st-story__name-caption", "Story name"));
  const nameInput = canvasNode("input", "st-story__name");
  nameInput.setAttribute("type", "text");
  nameInput.setAttribute("maxlength", String(NAME_MAX));
  nameInput.setAttribute("placeholder", "Name this story");
  nameLabel.appendChild(nameInput);
  const saveButton = canvasButton("st-story__save", "Save");
  const message = canvasNode("span", "st-story__message");
  message.setAttribute("role", "status");
  const storageNote = canvasNode("span", "st-story__storage-note");
  storageNote.hidden = true;
  const prompt = canvasNode("span", "st-story__prompt");
  prompt.hidden = true;
  savebar.append(nameLabel, saveButton, message, storageNote, prompt);

  const actions = canvasNode("div", "st-story__actions");
  const newRibbonButton = canvasButton("st-story__new-ribbon", "New ribbon");
  const addButton = canvasButton("st-story__add", "Add to story");
  const clearButton = canvasButton("st-story__clear", "Clear");
  const undo = canvasNode("span", "st-story__undo");
  undo.hidden = true;
  const undoButton = canvasButton("st-story__undo-btn", "Undo");
  const undoTimer = canvasNode("span", "st-story__undo-timer");
  undoTimer.setAttribute("aria-hidden", "true");
  undo.append(undoButton, undoTimer);
  const copyButton = canvasButton("st-story__copy", "Copy");
  const printWrap = canvasNode("span", "st-story__print");
  const printToggle = canvasButton("st-story__print-toggle", "Print", { "aria-haspopup": "true", "aria-expanded": "false" });
  const printMenu = canvasNode("span", "st-story__print-menu");
  printMenu.hidden = true;
  for (const [target, targetLabel] of [["story", "Ribbon only"], ["story-with-table", "Ribbon with table"]]) {
    for (const [tone, toneLabel] of [["colour", "Colour"], ["gray", "Grayscale"]]) {
      printMenu.appendChild(canvasButton("st-story__print-option", `${targetLabel} — ${toneLabel}`, {
        "data-print-target": target,
        "data-print-tone": tone,
      }));
    }
  }
  printWrap.append(printToggle, printMenu);
  actions.append(newRibbonButton, addButton, clearButton, undo, copyButton, printWrap);
  toolbar.append(savebar, actions);

  const saved = canvasNode("div", "st-story__saved");
  const savedHead = canvasNode("div", "st-story__saved-head");
  savedHead.appendChild(canvasNode("span", "st-story__saved-title", "Saved stories"));
  const libraryButton = canvasButton("st-story__library", "Library");
  savedHead.appendChild(libraryButton);
  const savedList = canvasNode("ul", "st-story__saved-list");
  const savedEmpty = canvasNode("p", "st-story__saved-empty", "No saved stories yet.");
  saved.append(savedHead, savedList, savedEmpty);

  const status = canvasNode("div", "st-story__status");
  const count = canvasNode("span", "st-story__count");
  const next = canvasNode("span", "st-story__next");
  next.setAttribute("role", "status");
  status.append(count, next);

  const tray = canvasNode("div", "st-tray");
  tray.setAttribute("role", "region");
  tray.setAttribute("aria-label", "Story map tray");
  tray.setAttribute("tabindex", "-1");
  const empty = canvasNode("p", "st-tray__empty", "Drag a tile here, or select one and press C, to start a story.");
  const content = canvasNode("div", "st-tray__content");
  const { svg, defs } = buildThreadsRoot();
  const beadsLayer = canvasNode("div", "st-tray__beads");
  const cut = canvasButton("st-thread-cut", "Cut", { "aria-label": "Cut this ribbon" });
  cut.hidden = true;
  content.append(svg, beadsLayer, cut);
  tray.append(empty, content);

  root.append(toolbar, saved, status, tray);
  return {
    root, nameInput, saveButton, message, storageNote, prompt, newRibbonButton, addButton, clearButton, undo,
    undoButton, undoTimer, copyButton, printToggle, printMenu, libraryButton, savedList, savedEmpty, count, next,
    tray, empty, content, svg, defs, beadsLayer, cut,
  };
}

/**
 * Usable sheet width for a landscape print, in CSS px: Letter (279.4mm) less the 10mm @page margins on each side is
 * about 980px, the narrower of Letter and A4, so one scale fits both. print.css applies it as `zoom` on the map.
 */
export const PRINT_SHEET_WIDTH_PX = 980;
const PRINT_SCALE_PROPERTY = "--print-scale";
const MAP_PRINT_TARGETS = ["story", "story-with-table"];

/** Factor that fits a map of `mapWidth` px on one sheet's width; never above 1 (a small map prints at its own size). */
export function printScaleFor(mapWidth, sheetWidth = PRINT_SHEET_WIDTH_PX) {
  return mapWidth > sheetWidth ? sheetWidth / mapWidth : 1;
}

const signatureOf = (state) => JSON.stringify([state.beads, state.ribbons]);
const threadKey = (from, to) => `${from}\u0000${to}`;
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

function emitOnDocument(type, detail) {
  const target = globalThis.document;
  const event = typeof CustomEvent === "function" ? new CustomEvent(type, { detail }) : { type, detail };
  target.dispatchEvent(event);
}

/**
 * Mounts the story map (toolbar, saved list, status line and tray) inside `host`.
 *
 * @param {HTMLElement} host
 * @param {{ storage?: object, setTimer?: Function, clearTimer?: Function,
 *   copyText?: Function, setPrintTarget?: Function }} [options] injection points for tests
 * @returns {{ areaEl: HTMLElement, canvasEl: HTMLElement, trayEl: HTMLElement, contentEl: HTMLElement, threadsEl: Element,
 *   getLayoutResult: () => object, setDropTarget: (target: object|null) => void,
 *   setDragging: (active: boolean, pairable?: boolean) => void, showMessage: (text: string, kind?: string) => void,
 *   openShape: (shape: object, name?: string) => void, loadShape: (shape: object, name?: string) => object,
 *   hasUnsavedChanges: () => boolean,
 *   render: () => void, destroy: () => void }}
 */
export function mountStoryCanvas(host, options = {}) {
  const storage = options.storage;
  const startTimer = options.setTimer ?? ((fn, ms) => globalThis.setTimeout(fn, ms));
  const stopTimer = options.clearTimer ?? ((id) => globalThis.clearTimeout(id));
  const doCopy = options.copyText ?? copyText;
  const doPrint = options.setPrintTarget ?? setPrintTarget;

  const dom = buildToolbarDom();
  const { tray, content, svg, beadsLayer } = dom;
  host.appendChild(dom.root);

  const beadNodes = new Map();
  const dockNodes = new Map();
  const faceSignatures = new Map();
  let threadNodes = new Map();
  let markedNodes = [];
  let lastLayout = layout([], []);
  let lastBeads = new Map();
  let hasRendered = false;
  let selectedElementId = null;
  let selectedRibbon = null;
  let linkFrom = null;
  let editing = null;
  let focusEditorNext = false;
  let dropTarget = null;
  let undoTimerId = null;
  let storageNoticeShown = false;
  let quietRogueEdit = 0;
  let savedSignature = signatureOf({ beads: [], ribbons: [] });

  /* ----- messages, prompts, storage notice ----- */

  function say(text, kind = "info") {
    dom.message.textContent = text;
    dom.message.setAttribute("data-kind", kind);
  }

  function clearPrompt() {
    dom.prompt.replaceChildren();
    dom.prompt.hidden = true;
  }

  function askPrompt(text, choices) {
    const parts = [canvasNode("span", "st-story__prompt-text", text)];
    for (const choice of choices) {
      const button = canvasButton("st-story__prompt-btn", choice.label, { "data-choice": choice.label });
      button.addEventListener("click", () => {
        clearPrompt();
        if (choice.run) choice.run();
      });
      parts.push(button);
    }
    dom.prompt.replaceChildren(...parts);
    dom.prompt.hidden = false;
  }

  function checkStorage() {
    const status = storageStatus();
    if (status.available || storageNoticeShown) return;
    storageNoticeShown = true;
    dom.storageNote.textContent = `${status.message || "Storage unavailable"} — saving is off, so your story is kept in memory only until you close this page.`;
    dom.storageNote.hidden = false;
  }

  /* ----- saved stories ----- */

  function renderSaved() {
    const result = listStories(storage);
    const items = (result.stories ?? []).map((story) => {
      const item = canvasNode("li", "st-story__saved-item");
      item.setAttribute("data-story-name", story.name);
      item.appendChild(canvasButton("st-story__open", story.name));
      if (story.agent) {
        const chip = canvasNode("span", "st-story__ai", "AI");
        setTip(chip, "Saved by an agent");
        item.appendChild(chip);
      }
      item.appendChild(canvasButton("st-story__delete", "Delete", { "aria-label": `Delete ${story.name}` }));
      return item;
    });
    dom.savedList.replaceChildren(...items);
    dom.savedEmpty.hidden = items.length > 0;
    checkStorage();
  }

  const hasUnsavedChanges = () => {
    const state = getStoryState();
    return state.beads.length > 0 && signatureOf(state) !== savedSignature;
  };

  function loadShape(shape, name) {
    quietRogueEdit += 1;
    let loaded;
    try {
      loaded = openStory(shape);
    } finally {
      quietRogueEdit -= 1;
    }
    if (!loaded.ok) {
      say(loaded.error.message, "error");
      return loaded;
    }
    dom.nameInput.value = name ?? shape.name ?? "";
    savedSignature = signatureOf(getStoryState());
    say(loaded.note || (dom.nameInput.value ? `Opened “${dom.nameInput.value}”.` : "Opened."));
    return loaded;
  }

  /** Asks first when the map has unsaved changes; `loadShape` is the same open without asking, for a caller (the Library panel) that already did. */
  function openShape(shape, name) {
    clearPrompt();
    const title = name ?? shape.name ?? "this story";
    if (!hasUnsavedChanges()) {
      loadShape(shape, name);
      return;
    }
    askPrompt(`Open “${title}”? The current map has unsaved changes.`, [
      { label: "Open anyway", run: () => loadShape(shape, name) },
      { label: "Cancel" },
    ]);
  }

  function openSaved(name) {
    const result = openSavedStory(name, storage);
    if (!result.ok) {
      say(result.error, "error");
      return;
    }
    openShape({ beads: result.beads, ribbons: result.ribbons, name, agent: result.agent }, name);
  }

  function performSave(name, replace) {
    const state = getStoryState();
    const result = saveStory({ name, beads: state.beads, ribbons: state.ribbons, replace }, storage);
    if (result.exists) {
      askPrompt(`“${name}” already exists.`, [
        { label: "Replace", run: () => performSave(name, true) },
        { label: "Cancel" },
      ]);
      return;
    }
    if (!result.ok) {
      say(result.error, "error");
      return;
    }
    savedSignature = signatureOf(state);
    say(`Saved “${name}”.`);
    renderSaved();
    checkStorage();
  }

  function onSave() {
    clearPrompt();
    const state = getStoryState();
    const name = dom.nameInput.value.trim();
    if (state.beads.length === 0) return say("The map is empty — add a tile before saving.", "error");
    if (!name) return say(`Give the story a name (1–${NAME_MAX} characters).`, "error");
    if (name.length > NAME_MAX) return say(`A name can be at most ${NAME_MAX} characters.`, "error");
    return performSave(name, false);
  }

  function askDelete(name) {
    askPrompt(`Delete “${name}”?`, [
      {
        label: "Delete",
        run: () => {
          const result = deleteStory(name, storage);
          say(result.ok ? `Deleted “${name}”.` : result.error, result.ok ? "info" : "error");
          renderSaved();
        },
      },
      { label: "Keep" },
    ]);
  }

  /* ----- clear and undo (FR-C17) ----- */

  function onUndoExpiry() {
    undoTimerId = null;
    discardUndo();
    syncUndo();
  }

  function syncUndo() {
    const visible = canUndoClear();
    dom.undo.hidden = !visible;
    if (visible && undoTimerId === null) {
      dom.undoTimer.style.setProperty("--undo-ms", `${UNDO_MS}ms`);
      dom.undoTimer.setAttribute("data-undo-ms", String(UNDO_MS));
      undoTimerId = startTimer(onUndoExpiry, UNDO_MS);
    } else if (!visible && undoTimerId !== null) {
      stopTimer(undoTimerId);
      undoTimerId = null;
    }
  }

  /* ----- adding, pairing, splitting, linking ----- */

  const reportFailure = (result) => {
    if (!result.ok) say(result.error.message, "error");
    return result;
  };

  function focusedBeadUid() {
    const focused = canvasClosest(globalThis.document.activeElement, ".st-bead");
    return focused ? focused.getAttribute("data-bead-uid") : null;
  }

  const targetBeadUid = () => focusedBeadUid() ?? getActiveUid();

  function addSelectedTile() {
    if (!selectedElementId) return say("Select a tile first.", "error");
    return reportFailure(addBead(selectedElementId, { type: "empty" }));
  }

  function pairSelectedTile() {
    if (!selectedElementId) return say("Select a tile first.", "error");
    const uid = targetBeadUid();
    if (!uid) return say("Select a bead to pair the tile with.", "error");
    return reportFailure(pairBead(uid, selectedElementId));
  }

  function splitTargetBead() {
    const uid = targetBeadUid();
    if (!uid) return say("Select a bead to split.", "error");
    return reportFailure(splitBead(uid));
  }

  function startLink(uid) {
    linkFrom = uid;
    say(`Linking from step ${lastLayout.stepNumbers[uid]} — Tab to another bead, then Enter. Esc cancels.`);
    render();
  }

  function finishLink(toUid) {
    const from = linkFrom;
    linkFrom = null;
    const result = linkBeads(from, toUid);
    if (result.ok) say("Linked.");
    else say(result.error.message, "error");
    render();
  }

  function removeAndRefocus(uid) {
    const index = lastLayout.order.indexOf(uid);
    if (!reportFailure(removeBead(uid)).ok) return;
    const order = lastLayout.order;
    const next = order[Math.min(index, order.length - 1)];
    const node = next ? beadNodes.get(next) : null;
    (node ?? tray).focus();
  }

  function cutSelectedRibbon() {
    if (!selectedRibbon) return;
    const { from, to } = selectedRibbon;
    selectedRibbon = null;
    reportFailure(cutRibbon(from, to));
    render();
  }

  /* ----- rogue label editing (FR-C15) ----- */

  function startLabelEdit(uid, half) {
    editing = { uid, half };
    focusEditorNext = true;
    render();
  }

  function commitLabel(input) {
    if (!editing) return;
    const { uid, half } = editing;
    editing = null;
    const result = setLabel(uid, input.value, half === "with" ? { half: "with" } : undefined);
    if (!result.ok) {
      say(result.error.message, "error");
      render();
    }
    beadNodes.get(uid)?.focus();
  }

  function cancelLabel(uid) {
    editing = null;
    render();
    beadNodes.get(uid)?.focus();
  }

  const labelHandlers = {
    onLabelKey(event) {
      if (event.key !== "Enter" && event.key !== "Escape") return;
      if (event.stopPropagation) event.stopPropagation();
      if (event.preventDefault) event.preventDefault();
      if (event.key === "Enter") commitLabel(event.target);
      else if (editing) cancelLabel(editing.uid);
    },
    onLabelBlur(event) {
      commitLabel(event.target);
    },
  };

  /** A rogue bead just added (or a rogue just paired) opens its label field, focused. */
  function findNewRogue(state) {
    if (quietRogueEdit > 0 || !hasRendered) return null;
    const last = state.beads[state.beads.length - 1];
    const added = state.beads.length === lastBeads.size + 1 && last && !lastBeads.has(last.uid);
    if (added && last.elementId === ROGUE.id && last.label === DEFAULT_ROGUE_LABEL) return { uid: last.uid, half: "main" };
    if (state.beads.length !== lastBeads.size) return null;
    const paired = state.beads.filter((bead) => {
      const before = lastBeads.get(bead.uid);
      return before && !before.with && bead.with === ROGUE.id && bead.withLabel === DEFAULT_ROGUE_LABEL;
    });
    return paired.length === 1 ? { uid: paired[0].uid, half: "with" } : null;
  }

  /* ----- opening detail ----- */

  /** Detail for the clicked half; the detail panel needs the rogue label and the other half (FR-V11). */
  function openDetail(bead, which) {
    const halves = beadHalves(bead);
    const clicked = halves.find((half) => half.which === which) ?? halves[0];
    const other = halves.find((half) => half !== clicked);
    const detail = { elementId: clicked.elementId, uid: bead.uid };
    if (bead.note) detail.note = bead.note;
    if (clicked.rogue) detail.label = clicked.label;
    if (other) {
      detail.tandemWith = other.elementId;
      if (other.rogue) detail.tandemWithLabel = other.label;
    }
    emitOnDocument(EVT_OPEN, detail);
  }

  /* ----- rendering ----- */

  function beadStateClasses(node, bead, state) {
    node.classList.toggle("is-active", state.activeUid === bead.uid);
    node.classList.toggle("is-tandem", Boolean(bead.with));
    node.classList.toggle("is-rogue", bead.elementId === ROGUE.id);
    node.classList.toggle("is-link-source", linkFrom === bead.uid);
    node.classList.toggle("is-editing", editing?.uid === bead.uid);
    if (state.activeUid === bead.uid) node.setAttribute("aria-current", "true");
    else node.removeAttribute("aria-current");
  }

  function ensureBeadNode(uid) {
    let node = beadNodes.get(uid);
    if (node) return node;
    node = canvasNode("div", "st-bead");
    node.setAttribute("data-bead-uid", uid);
    node.setAttribute("tabindex", "0");
    node.setAttribute("role", "group");
    node.style.position = "absolute";
    node.style.left = "0px";
    node.style.top = "0px";
    beadNodes.set(uid, node);
    return node;
  }

  function reconcileBeads(state, result) {
    const seen = new Set();
    for (const uid of result.order) {
      const bead = state.beads.find((candidate) => candidate.uid === uid);
      const box = result.positions[uid];
      const node = ensureBeadNode(uid);
      seen.add(uid);
      const editingHalf = editing?.uid === uid ? editing.half : null;
      const signature = beadFaceSignature(bead, result.stepNumbers[uid], editingHalf);
      if (faceSignatures.get(uid) !== signature) {
        faceSignatures.set(uid, signature);
        const dock = fillBeadNode(node, bead, result.stepNumbers[uid], editingHalf, labelHandlers);
        if (dock) dockNodes.set(uid, dock);
        else dockNodes.delete(uid);
      }
      beadStateClasses(node, bead, state);
      node.setAttribute("data-width-class", String(box.widthClass));
      node.setAttribute("data-step", String(result.stepNumbers[uid]));
      node.style.width = `${box.w}px`;
      node.style.height = `${box.h}px`;
      node.style.transform = `translate(${box.x}px, ${box.y}px)`;
    }
    for (const [uid, node] of [...beadNodes]) {
      if (seen.has(uid)) continue;
      node.remove();
      beadNodes.delete(uid);
      dockNodes.delete(uid);
      faceSignatures.delete(uid);
    }
    let cursor = beadsLayer.firstChild;
    for (const uid of result.order) {
      const node = beadNodes.get(uid);
      if (node === cursor) cursor = cursor.nextSibling;
      else beadsLayer.insertBefore(node, cursor);
    }
  }

  function renderThreads(state, result) {
    threadNodes = new Map();
    const groups = [];
    for (const path of result.ribbonPaths) {
      if (!path.curve) continue;
      const selected = selectedRibbon?.from === path.from && selectedRibbon?.to === path.to;
      const group = buildThreadNode(path, result.stepNumbers, selected);
      threadNodes.set(threadKey(path.from, path.to), group);
      groups.push(group);
    }
    svg.replaceChildren(dom.defs, ...groups);
    svg.setAttribute("width", String(result.width));
    svg.setAttribute("height", String(result.height));
    const cutPath = selectedRibbon
      ? result.ribbonPaths.find((path) => path.from === selectedRibbon.from && path.to === selectedRibbon.to)
      : null;
    dom.cut.hidden = !cutPath?.curve;
    if (cutPath?.curve) {
      const middle = pointOnCurve(cutPath.curve, 0.5);
      dom.cut.style.transform = `translate(${middle.x}px, ${middle.y}px)`;
      dom.cut.style.position = "absolute";
      dom.cut.style.left = "0px";
      dom.cut.style.top = "0px";
    }
  }

  function renderStatus(state) {
    const beadCount = state.beads.length;
    let count = `${plural(beadCount, "bead")} · ${plural(state.ribbons.length, "ribbon")}`;
    if (beadCount >= MAX_BEADS) count += ` — the story holds at most ${MAX_BEADS} beads`;
    else if (state.ribbons.length >= MAX_RIBBONS) count += ` — the story holds at most ${MAX_RIBBONS} ribbons`;
    dom.count.textContent = count;
    const active = state.beads.find((bead) => bead.uid === state.activeUid);
    if (active) {
      const title = beadTitle(active);
      dom.next.textContent = `Next tile joins: ${title.symbol} — ${title.name}`;
    } else {
      dom.next.textContent = "Next tile starts a new ribbon";
    }
  }

  function syncButtons(state) {
    const empty = state.beads.length === 0;
    dom.copyButton.disabled = empty;
    dom.printToggle.disabled = empty;
    dom.clearButton.disabled = empty;
    dom.addButton.disabled = !selectedElementId;
    if (empty) {
      dom.printMenu.hidden = true;
      dom.printToggle.setAttribute("aria-expanded", "false");
    }
  }

  function render() {
    const state = getStoryState();
    const result = layout(state.beads, state.ribbons);
    const newRogue = findNewRogue(state);
    if (newRogue) {
      editing = newRogue;
      focusEditorNext = true;
    }
    if (editing && !state.beads.some((bead) => bead.uid === editing.uid)) editing = null;
    if (linkFrom && !state.beads.some((bead) => bead.uid === linkFrom)) linkFrom = null;
    if (selectedRibbon && !state.ribbons.some(([from, to]) => from === selectedRibbon.from && to === selectedRibbon.to)) {
      selectedRibbon = null;
    }
    lastLayout = result;
    tray.setAttribute("data-empty", state.beads.length === 0 ? "true" : "false");
    dom.empty.hidden = state.beads.length > 0;
    content.style.width = `${result.width}px`;
    content.style.height = `${result.height}px`;
    reconcileBeads(state, result);
    renderThreads(state, result);
    renderStatus(state);
    syncButtons(state);
    syncUndo();
    lastBeads = new Map(state.beads.map((bead) => [bead.uid, bead]));
    hasRendered = true;
    applyDropTarget();
    if (focusEditorNext && editing) {
      const input = beadNodes.get(editing.uid)?.querySelector(".st-bead__label-input");
      if (input) {
        input.focus();
        if (input.select) input.select();
      }
    }
    focusEditorNext = false;
  }

  /* ----- drop-target marking (called by drag-drop.js) ----- */

  function mark(node, className) {
    if (!node) return;
    node.classList.add(className);
    markedNodes.push({ node, className });
  }

  function applyDropTarget() {
    for (const { node, className } of markedNodes) node.classList.remove(className);
    markedNodes = [];
    const target = dropTarget;
    if (!target) {
      tray.removeAttribute("data-hint");
      tray.removeAttribute("data-drop");
      return;
    }
    tray.setAttribute("data-drop", target.type);
    if (target.type === "bead") {
      mark(beadNodes.get(target.uid), "is-drop-branch");
      tray.setAttribute("data-hint", HINT_BRANCH);
    } else if (target.type === "ribbon") {
      mark(threadNodes.get(threadKey(target.from, target.to)), "is-drop-insert");
      tray.setAttribute("data-hint", HINT_INSERT);
    } else if (target.type === "dock") {
      mark(dockNodes.get(target.uid), "is-drop-dock");
      tray.setAttribute("data-hint", HINT_DOCK);
    } else {
      mark(tray, "is-drop-add");
      tray.setAttribute("data-hint", HINT_ADD);
    }
  }

  function setDropTarget(target) {
    dropTarget = target ?? null;
    applyDropTarget();
  }

  function setDragging(active, pairable = true) {
    tray.classList.toggle("is-dragging", Boolean(active));
    tray.classList.toggle("is-pairable", Boolean(active && pairable));
    if (!active) setDropTarget(null);
  }

  /* ----- event handling ----- */

  const beadUidOf = (node) => canvasClosest(node, ".st-bead")?.getAttribute("data-bead-uid") ?? null;

  function selectRibbon(group) {
    selectedRibbon = { from: group.getAttribute("data-from"), to: group.getAttribute("data-to") };
    render();
  }

  function onTrayClick(event) {
    const target = event.target;
    if (canvasClosest(target, ".st-bead__label-input")) return;
    if (canvasClosest(target, ".st-thread-cut")) return cutSelectedRibbon();
    const uid = beadUidOf(target);
    if (canvasClosest(target, ".st-bead__remove")) return removeAndRefocus(uid);
    if (canvasClosest(target, ".st-bead__swap")) return void reportFailure(swapTandem(uid));
    if (canvasClosest(target, ".st-bead__split")) return void reportFailure(splitBead(uid));
    if (canvasClosest(target, ".st-bead__link-dot")) return startLink(uid);
    if (uid) {
      if (linkFrom && linkFrom !== uid) return finishLink(uid);
      selectedRibbon = null;
      return void setActive(uid);
    }
    const thread = canvasClosest(target, ".st-thread");
    if (thread) return selectRibbon(thread);
    if (selectedRibbon) {
      selectedRibbon = null;
      render();
    }
  }

  function onTrayDoubleClick(event) {
    const half = canvasClosest(event.target, ".st-bead__half");
    if (!half || canvasClosest(event.target, ".st-bead__label-input")) return;
    const uid = beadUidOf(half);
    const bead = lastBeads.get(uid);
    if (!bead) return;
    const which = half.getAttribute("data-half");
    const elementId = which === "with" ? bead.with : bead.elementId;
    const onLabel = Boolean(canvasClosest(event.target, ".st-bead__name"));
    if (elementId === ROGUE.id && onLabel) startLabelEdit(uid, which);
    else openDetail(bead, which);
  }

  function onBeadKey(event, beadNode) {
    const uid = beadNode.getAttribute("data-bead-uid");
    const key = event.key;
    if (key === "Enter") {
      event.preventDefault?.();
      if (linkFrom && linkFrom !== uid) return finishLink(uid);
      if (linkFrom === uid) {
        linkFrom = null;
        say("Link cancelled.");
        return render();
      }
      return void setActive(uid);
    }
    if (key === "Delete" || key === "Backspace") {
      event.preventDefault?.();
      return removeAndRefocus(uid);
    }
    if ((key === "l" || key === "L") && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault?.();
      return startLink(uid);
    }
    return undefined;
  }

  function onThreadKey(event, group) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault?.();
      return selectRibbon(group);
    }
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault?.();
      selectedRibbon = { from: group.getAttribute("data-from"), to: group.getAttribute("data-to") };
      return cutSelectedRibbon();
    }
    return undefined;
  }

  function onTrayKeydown(event) {
    if (canvasIsEditable(event.target)) return undefined;
    if (event.key === "Escape") {
      const hadState = linkFrom || selectedRibbon;
      linkFrom = null;
      selectedRibbon = null;
      if (hadState) render();
      return undefined;
    }
    const thread = canvasClosest(event.target, ".st-thread");
    if (thread) return onThreadKey(event, thread);
    const beadNode = canvasClosest(event.target, ".st-bead");
    if (beadNode && event.target === beadNode) return onBeadKey(event, beadNode);
    return undefined;
  }

  function onDocumentKeydown(event) {
    if (event.ctrlKey || event.metaKey || event.altKey || canvasIsEditable(event.target)) return;
    const key = String(event.key ?? "").toLowerCase();
    if (key === "c") {
      if (selectedElementId) {
        event.preventDefault?.();
        addSelectedTile();
      }
    } else if (key === "t") {
      event.preventDefault?.();
      if (event.shiftKey) splitTargetBead();
      else pairSelectedTile();
    }
  }

  function onDocumentSelect(event) {
    selectedElementId = event.detail?.elementId ?? null;
    dom.addButton.disabled = !selectedElementId;
  }

  function onNotice(event) {
    const message = event.detail?.message;
    if (message) say(message, "error");
  }

  // An agent's save reaches storage without passing through the canvas, so the session event is the cue to re-read the saved list.
  function onAgentSession(event) {
    renderSaved();
    const { active, name } = event.detail ?? {};
    if (active) {
      say(AGENT_STATUS_TEXT);
      if (name) dom.nameInput.value = name;
    } else if (dom.message.textContent === AGENT_STATUS_TEXT) {
      say("");
    }
  }

  function onStoryChanged(event) {
    const detail = event.detail ?? getStoryState();
    try {
      writeDraft(detail.beads, detail.ribbons, storage);
    } catch (error) {
      console.warn(`story-canvas: could not write the draft: ${error?.message ?? error}`);
    }
    checkStorage();
    render();
  }

  async function onCopy() {
    const state = getStoryState();
    if (state.beads.length === 0) return;
    const result = layout(state.beads, state.ribbons);
    const text = storyText(dom.nameInput.value.trim(), state.beads, state.ribbons, result);
    let copied = { ok: false };
    try {
      copied = await doCopy(text);
    } catch (error) {
      console.warn(`story-canvas: copy failed: ${error?.message ?? error}`);
    }
    say(copied.ok ? "Copied the story to the clipboard." : "Could not copy — select the text and copy it by hand.", copied.ok ? "info" : "error");
  }

  function togglePrintMenu(open) {
    const next = open ?? dom.printMenu.hidden;
    dom.printMenu.hidden = !next;
    dom.printToggle.setAttribute("aria-expanded", next ? "true" : "false");
  }

  function onPrintChoice(option) {
    togglePrintMenu(false);
    doPrint(option.getAttribute("data-print-target"), option.getAttribute("data-print-tone"));
  }

  function onSavedClick(event) {
    const item = canvasClosest(event.target, ".st-story__saved-item");
    if (!item) return;
    const name = item.getAttribute("data-story-name");
    if (canvasClosest(event.target, ".st-story__delete")) askDelete(name);
    else if (canvasClosest(event.target, ".st-story__open")) openSaved(name);
  }

  function onToolbarKeydown(event) {
    if (event.key !== "Escape") return;
    if (!dom.printMenu.hidden) togglePrintMenu(false);
    if (!dom.prompt.hidden) clearPrompt();
  }

  /* ----- wiring ----- */

  const on = (node, type, handler) => node.addEventListener(type, handler);
  const doc = globalThis.document;
  on(dom.saveButton, "click", onSave);
  on(dom.nameInput, "keydown", (event) => {
    if (event.key === "Enter") onSave();
  });
  on(dom.newRibbonButton, "click", () => void newRibbon());
  on(dom.addButton, "click", addSelectedTile);
  on(dom.clearButton, "click", () => void clearStory());
  on(dom.undoButton, "click", () => {
    const result = undoClear();
    if (!result.ok) say(result.error.message, "error");
  });
  on(dom.copyButton, "click", onCopy);
  on(dom.printToggle, "click", () => togglePrintMenu());
  on(dom.printMenu, "click", (event) => {
    const option = canvasClosest(event.target, ".st-story__print-option");
    if (option) onPrintChoice(option);
  });
  on(dom.libraryButton, "click", () => emitOnDocument(EVT_OPEN_LIBRARY, {}));
  on(dom.savedList, "click", onSavedClick);
  on(dom.root.querySelector(".st-story__toolbar"), "keydown", onToolbarKeydown);
  on(tray, "click", onTrayClick);
  on(tray, "dblclick", onTrayDoubleClick);
  on(tray, "keydown", onTrayKeydown);
  doc.addEventListener(EVT_STORY_CHANGED, onStoryChanged);
  doc.addEventListener(EVT_SELECT, onDocumentSelect);
  doc.addEventListener(EVT_NOTICE, onNotice);
  doc.addEventListener(EVT_AGENT_SESSION, onAgentSession);
  doc.addEventListener("keydown", onDocumentKeydown);

  // Runs inside setPrintTarget just before window.print(); the layout width is the map's true width, unaffected by the on-screen tray.
  function onBeforePrint(event) {
    if (!MAP_PRINT_TARGETS.includes(event.detail?.target)) return;
    content.style.setProperty(PRINT_SCALE_PROPERTY, String(printScaleFor(lastLayout.width)));
  }
  function onAfterPrint() {
    content.style.removeProperty(PRINT_SCALE_PROPERTY);
  }
  doc.addEventListener(EVT_BEFORE_PRINT, onBeforePrint);
  doc.addEventListener(EVT_AFTER_PRINT, onAfterPrint);

  function restoreDraft() {
    try {
      const draft = readDraft(storage);
      if (!draft.ok || draft.beads.length === 0 || getStoryState().beads.length > 0) return;
      quietRogueEdit += 1;
      try {
        const loaded = openStory({ beads: draft.beads, ribbons: draft.ribbons });
        if (loaded.ok && loaded.note) say(loaded.note);
      } finally {
        quietRogueEdit -= 1;
      }
    } catch (error) {
      console.warn(`story-canvas: could not restore the draft: ${error?.message ?? error}`);
    }
  }

  function destroy() {
    doc.removeEventListener(EVT_STORY_CHANGED, onStoryChanged);
    doc.removeEventListener(EVT_SELECT, onDocumentSelect);
    doc.removeEventListener(EVT_NOTICE, onNotice);
    doc.removeEventListener(EVT_AGENT_SESSION, onAgentSession);
    doc.removeEventListener("keydown", onDocumentKeydown);
    doc.removeEventListener(EVT_BEFORE_PRINT, onBeforePrint);
    doc.removeEventListener(EVT_AFTER_PRINT, onAfterPrint);
    if (undoTimerId !== null) stopTimer(undoTimerId);
    undoTimerId = null;
    dom.root.remove();
  }

  restoreDraft();
  render();
  renderSaved();

  return {
    areaEl: dom.root,
    canvasEl: content,
    trayEl: tray,
    contentEl: content,
    threadsEl: svg,
    getLayoutResult: () => lastLayout,
    setDropTarget,
    setDragging,
    showMessage: say,
    openShape,
    loadShape,
    hasUnsavedChanges,
    render,
    destroy,
  };
}
