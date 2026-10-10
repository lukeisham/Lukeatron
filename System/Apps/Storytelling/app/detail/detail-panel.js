/** The element detail panel. Opens on `storytelling:open`; Print and Copy live only here. */
import { EVT_OPEN } from "../shared/events.js";
import { setPrintTarget, copyText } from "../shared/output.js";
import { setTip } from "../shared/tooltip.js";
import { ELEMENTS, GROUPS, ROGUE } from "../data/elements.js";
import { ROGUE_DETAIL_TEXT } from "../data/furniture.js";

const POPULARITY_UNIT = "kilowicks";
const POPULARITY_NOTE = "thousands of links to its page in the TV Tropes wiki";
const PRINT_TONE = "colour";
const DASH = "—";

const detailSymbolOf = (element) => element.symbol ?? element.id;

/** The credit line: the element's source URL (TV Tropes, or Wikipedia for an added element); may be undefined. */
export function creditOf(element) {
  return element.sourceUrl;
}

const sourceLinkOf = (element) => (isWebUrl(element.sourceUrl) ? element.sourceUrl : null);

/**
 * The text Copy puts on the clipboard: `<symbol> — <name>`, description, `Example: …`,
 * `In this story: …` (only when a bead note is supplied), then the credit. Lines with no content are omitted.
 * @param {{id:string, symbol?:string, name:string, description?:string, example?:string, added?:boolean, sourceUrl?:string}} element
 * @param {string} [note] the bead's library note
 * @returns {string}
 */
export function elementCopyText(element, note) {
  const lines = [`${detailSymbolOf(element)} ${DASH} ${element.name}`];
  if (element.description) lines.push(element.description);
  if (element.example) lines.push(`Example: ${element.example}`);
  if (note) lines.push(`In this story: ${note}`);
  const credit = creditOf(element);
  if (credit) lines.push(credit);
  return lines.join("\n");
}

/** "<n> kilowicks", or null when there is no number: rogue, or an added element with no TV Tropes page. */
export function popularityText(element) {
  if (element.rogue) return null;
  const value = element.popText ?? element.popularity;
  if (value === undefined || value === null) {
    if (!element.added) console.warn(`detail-panel: poster element "${element.id}" has no popularity`);
    return null;
  }
  return `${value} ${POPULARITY_UNIT}`;
}

function makeNode(doc, tag, className, text) {
  const node = doc.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function makeButton(doc, className, label) {
  const button = makeNode(doc, "button", className, label);
  button.setAttribute("type", "button");
  return button;
}

function makeLabelledLine(doc, className, label) {
  const line = makeNode(doc, "p", className);
  const value = makeNode(doc, "span", "st-detail__value");
  line.append(makeNode(doc, "span", "st-detail__label", label), value);
  return { line, value };
}

function buildParts(doc) {
  const parts = {};
  parts.tile = makeNode(doc, "span", "st-detail__tile");
  parts.tile.setAttribute("aria-hidden", "true");
  parts.name = makeNode(doc, "h2", "st-detail__name");
  parts.name.setAttribute("id", "st-detail-name");
  parts.group = makeNode(doc, "p", "st-detail__group");
  parts.close = makeButton(doc, "st-detail__button st-detail__close", "Close");
  const titles = makeNode(doc, "div", "st-detail__titles");
  titles.append(parts.name, parts.group);
  parts.header = makeNode(doc, "div", "st-detail__header");
  parts.header.append(parts.tile, titles, parts.close);

  parts.tandem = makeNode(doc, "p", "st-detail__tandem");
  parts.popularity = makeNode(doc, "p", "st-detail__popularity");
  parts.popularityValue = makeNode(doc, "span", "st-detail__popularity-value");
  // The one-line explanation is a hover-over on the number (focusable so keyboard users get it too).
  setTip(parts.popularityValue, POPULARITY_NOTE);
  parts.popularityValue.setAttribute("tabindex", "0");
  parts.popularity.append(parts.popularityValue);

  parts.description = makeNode(doc, "p", "st-detail__description");
  const example = makeLabelledLine(doc, "st-detail__example", "Example");
  parts.example = example.line;
  parts.exampleValue = example.value;
  const story = makeLabelledLine(doc, "st-detail__story", "In this story");
  parts.story = story.line;
  parts.storyValue = story.value;

  parts.credit = makeNode(doc, "p", "st-detail__credit");
  parts.creditLabel = makeNode(doc, "span", "st-detail__label", "Source");
  parts.creditLink = makeNode(doc, "a", "st-detail__credit-link");
  parts.creditLink.setAttribute("target", "_blank");
  parts.creditLink.setAttribute("rel", "noopener");
  parts.creditText = makeNode(doc, "span", "st-detail__credit-text");
  parts.credit.append(parts.creditLabel, parts.creditLink, parts.creditText);

  parts.print = makeButton(doc, "st-detail__button st-detail__print", "Print");
  parts.copy = makeButton(doc, "st-detail__button st-detail__copy", "Copy");
  parts.status = makeNode(doc, "p", "st-detail__status");
  parts.status.setAttribute("role", "status");
  parts.status.setAttribute("aria-live", "polite");
  parts.actions = makeNode(doc, "div", "st-detail__actions");
  parts.actions.append(parts.print, parts.copy);
  return parts;
}

function setShown(node, shown) {
  node.hidden = !shown;
}

const isWebUrl = (url) => typeof url === "string" && /^https?:\/\//i.test(url);

function fillCredit(parts, element) {
  const credit = creditOf(element);
  const link = sourceLinkOf(element);
  setShown(parts.credit, Boolean(credit) || Boolean(link));
  setShown(parts.creditLabel, link !== null);
  setShown(parts.creditLink, link !== null);
  // A web URL shows as a link; any other credit text shows as plain text.
  const notice = link === null ? credit : null;
  setShown(parts.creditText, Boolean(notice));
  parts.creditText.textContent = notice ?? "";
  if (link) {
    parts.creditLink.setAttribute("href", link);
    parts.creditLink.textContent = link;
  }
}

function fillPopularity(parts, element) {
  const text = popularityText(element);
  setShown(parts.popularity, text !== null);
  if (text === null) return;
  parts.popularityValue.textContent = text;
}

function fillLine(line, valueNode, text) {
  setShown(line, Boolean(text));
  valueNode.textContent = text ?? "";
}

function fillParts(parts, element, groups, request) {
  const group = groups[element.group];
  parts.tile.className = `st-detail__tile tile-${element.group}${element.added ? " is-added" : ""}`;
  parts.tile.textContent = detailSymbolOf(element);
  parts.name.textContent = element.name;
  setShown(parts.group, Boolean(group) && group !== element.name);
  parts.group.textContent = group ?? "";

  setShown(parts.tandem, Boolean(request.tandemName));
  parts.tandem.textContent = request.tandemName ? `In tandem with ${request.tandemName}` : "";

  fillPopularity(parts, element);
  setShown(parts.description, Boolean(element.description));
  parts.description.textContent = element.description ?? "";
  fillLine(parts.example, parts.exampleValue, element.example);
  fillLine(parts.story, parts.storyValue, request.note);
  fillCredit(parts, element);
}

/** What is being shown: the element itself, or the Rogue card / a rogue bead built from ROGUE. */
function resolveSubject(request, lookup, rogue, rogueText) {
  if (request.elementId === rogue.id) {
    return request.label ? { ...rogue, name: request.label } : { ...rogue, description: rogueText };
  }
  return lookup(request.elementId);
}

function buildLookup(elements) {
  const byId = new Map(elements.map((element) => [element.id, element]));
  return (id) => byId.get(id);
}

/**
 * Builds the detail panel inside `host` (the aside; hidden until an open event arrives).
 * The open event's detail is `{ elementId, note?, label?, tandemWith?, tandemWithLabel? }`: `label` is a rogue bead's
 * own name; `tandemWith` is the other half's element id (`tandemWithLabel` when that half is a rogue bead).
 * @param {HTMLElement} host
 * @param {object} [options] test seams: `doc`, `lookup(id)`, `groups`, `rogue`, `rogueText`, `print`, `copy`
 * @returns {{open(request:object):boolean, close():void, isOpen():boolean, copy():Promise<void>, destroy():void}}
 */
export function mountDetailPanel(host, options = {}) {
  const doc = options.doc ?? globalThis.document;
  const lookup = options.lookup ?? buildLookup(ELEMENTS);
  const groups = options.groups ?? GROUPS;
  const rogue = options.rogue ?? ROGUE;
  const rogueText = options.rogueText ?? ROGUE_DETAIL_TEXT;
  const print = options.print ?? setPrintTarget;
  const copy = options.copy ?? copyText;

  const parts = buildParts(doc);
  let current = null; // { subject, note } while open
  let returnFocusTo = null;

  host.classList.add("st-detail");
  host.setAttribute("aria-labelledby", "st-detail-name");
  host.hidden = true;
  host.append(parts.header, parts.tandem, parts.popularity, parts.description, parts.example, parts.story, parts.credit, parts.actions, parts.status);

  const isOpen = () => current !== null;

  function close() {
    if (!isOpen()) return;
    current = null;
    host.hidden = true;
    parts.status.textContent = "";
    const target = returnFocusTo;
    returnFocusTo = null;
    if (target && typeof target.focus === "function") target.focus();
  }

  function open(request) {
    if (!request || typeof request.elementId !== "string") {
      console.warn("detail-panel: open request has no elementId", request);
      return false;
    }
    const subject = resolveSubject(request, lookup, rogue, rogueText);
    if (!subject) {
      console.warn(`detail-panel: no element with id "${request.elementId}"`);
      return false;
    }
    const other = request.tandemWith;
    const tandemName = request.tandemWithLabel ?? (other ? (lookup(other)?.name ?? other) : undefined);
    fillParts(parts, subject, groups, { note: request.note, tandemName });
    parts.status.textContent = "";
    if (!isOpen()) returnFocusTo = doc.activeElement ?? null;
    current = { subject, note: request.note };
    host.hidden = false;
    parts.close.focus();
    return true;
  }

  async function copyCurrent() {
    if (!isOpen()) return;
    const result = await copy(elementCopyText(current.subject, current.note));
    parts.status.textContent = result?.ok ? "Copied" : "Could not copy — select the text and copy it by hand";
  }

  const onOpenEvent = (event) => open(event.detail);
  const onKeydown = (event) => {
    if (event.key !== "Escape" || !isOpen()) return;
    event.preventDefault?.();
    close();
  };

  parts.close.addEventListener("click", close);
  parts.print.addEventListener("click", () => {
    if (isOpen()) print("element", PRINT_TONE);
  });
  parts.copy.addEventListener("click", copyCurrent);
  doc.addEventListener(EVT_OPEN, onOpenEvent);
  doc.addEventListener("keydown", onKeydown);

  function destroy() {
    doc.removeEventListener(EVT_OPEN, onOpenEvent);
    doc.removeEventListener("keydown", onKeydown);
  }

  return { open, close, isOpen, copy: copyCurrent, destroy };
}
