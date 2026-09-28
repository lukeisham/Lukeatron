/**
 * story-text.js — plain-text copy of a story map (story-map FR-C13).
 *
 * Pure function: no DOM, no side effects. One line per bead in layout order, so the copy, the
 * screen and the print all number beads the same way (D-13).
 */
import { ELEMENTS, ROGUE } from "../data/elements.js";

const UNTITLED_NAME = "My story map";
const ROGUE_DEFAULT_LABEL = "Rogue";
const ROGUE_SYMBOL = "Rg";
const NOTE_INDENT = "  ";

let cachedElementLookup = null;

/** Looks an id up in the real data: `(elementId) => { id, name, symbol? } | undefined`. Built on first use. */
function defaultElementLookup() {
  if (!cachedElementLookup) {
    const byId = new Map(ELEMENTS.map((element) => [element.id, element]));
    cachedElementLookup = (elementId) => byId.get(elementId);
  }
  return cachedElementLookup;
}

/**
 * Produce the plain text that Copy puts on the clipboard (FR-C13):
 *
 *     <name>
 *     N. <symbol> — <name>                      a bead
 *     N. <sym> + <sym> — <name> + <name>        a tandem
 *     N. Rg — <label>                           a rogue card (as either half of a tandem: Rg and its label)
 *       <note>                                  the bead's note, indented, when it has one
 *
 * ` → a, b` is appended to a bead's line only when its ribbons do not lead solely to the
 * next-numbered bead; `a, b` are the step numbers of the beads it leads to, lowest first, so a
 * straight chain has no arrows and an element used twice is never ambiguous.
 *
 * @param {string} name Story name (falls back to "My story map" when blank)
 * @param {Array<{ uid: string, elementId: string, with?: string, label?: string, withLabel?: string, note?: string }>} beads
 * @param {Array<[string, string]>} ribbons [fromUid, toUid] pairs
 * @param {{ order: string[], stepNumbers: Object<string, number> }} layoutResult from `layout(beads, ribbons)`
 * @param {(elementId: string) => ({ id: string, name: string, symbol?: string } | undefined)} [lookup] defaults to ELEMENTS
 * @returns {string}
 */
export function storyText(name, beads, ribbons, layoutResult, lookup = defaultElementLookup()) {
  const beadsByUid = new Map(beads.map((bead) => [bead.uid, bead]));
  const { order, stepNumbers } = layoutResult;

  const lines = [name || UNTITLED_NAME];
  for (const uid of order) {
    const bead = beadsByUid.get(uid);
    const stepNumber = stepNumbers[uid];
    if (!bead || stepNumber === undefined) {
      console.warn(`story-text: bead "${uid}" is in the layout order but missing from the map or unnumbered; left out of the copy`);
      continue;
    }
    lines.push(beadLine(bead, stepNumber, lookup) + arrowSuffix(uid, stepNumber, ribbons, stepNumbers));
    if (bead.note) lines.push(`${NOTE_INDENT}${bead.note}`);
  }
  return lines.join("\n");
}

function beadLine(bead, stepNumber, lookup) {
  const halves = [describeHalf(bead.elementId, bead.label, lookup)];
  if (bead.with) halves.push(describeHalf(bead.with, bead.withLabel, lookup));
  const symbols = halves.map((half) => half.symbol).join(" + ");
  const names = halves.map((half) => half.name).join(" + ");
  return `${stepNumber}. ${symbols} — ${names}`;
}

/** The symbol and the name to print for one element of a bead; a rogue card shows `Rg` and its label. */
function describeHalf(elementId, label, lookup) {
  if (elementId === ROGUE.id) return { symbol: ROGUE_SYMBOL, name: label || ROGUE_DEFAULT_LABEL };
  const element = lookup(elementId);
  if (!element) {
    console.warn(`story-text: no element "${elementId}"; printing its id instead`);
    return { symbol: elementId, name: elementId };
  }
  return { symbol: element.symbol ?? element.id, name: element.name };
}

/** ` → 3, 5` for the beads this one leads to, or "" when it leads only to the next-numbered bead (or nowhere). */
function arrowSuffix(uid, stepNumber, ribbons, stepNumbers) {
  const targets = [...new Set(ribbons.filter(([from]) => from === uid).map(([, to]) => stepNumbers[to]))]
    .filter((target) => target !== undefined)
    .sort((a, b) => a - b);
  const leadsOnlyToNext = targets.length === 1 && targets[0] === stepNumber + 1;
  return targets.length === 0 || leadsOnlyToNext ? "" : ` → ${targets.join(", ")}`;
}
