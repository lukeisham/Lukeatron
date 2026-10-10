/**
 * story-highlight.js — marks the poster tiles used by the open story.
 *
 * It only toggles the class `is-in-story` on each `<g class="tile">` and fills or hides the
 * `<text class="step-badge">` the diagram generator put inside it. It never touches tile data or the
 * printed table: the mark itself is drawn by CSS.
 */
import { EVT_STORY_CHANGED } from "../shared/events.js";
import { ROGUE } from "../data/elements.js";
import { layout } from "./story-layout.js";
import { getStoryState } from "./story-model.js";

export const IN_STORY_CLASS = "is-in-story";
const TILE_SELECTOR = "g.tile";
const BADGE_SELECTOR = ".step-badge";

/** Element ids a bead uses: its own and, for a tandem, its partner's. */
function idsOfBead(bead) {
  return bead.with ? [bead.elementId, bead.with] : [bead.elementId];
}

/**
 * The ids of every poster element used in a story. The Rogue card is not a poster tile, so it is never included.
 * @param {Array<{ elementId: string, with?: string }>} beads
 * @returns {Set<string>}
 */
export function elementsInStory(beads) {
  const ids = new Set();
  for (const bead of beads) {
    for (const id of idsOfBead(bead)) {
      if (id !== ROGUE.id) ids.add(id);
    }
  }
  return ids;
}

/**
 * The step number to show on each element: the lowest step of any bead that uses it.
 * Both halves of a tandem take the tandem's step. Beads missing from `stepNumbers` are skipped.
 * @param {Array<{ uid: string, elementId: string, with?: string }>} beads
 * @param {{ stepNumbers: Record<string, number> }} layoutResult result of `layout()`
 * @returns {Record<string, number>} element id to step number
 */
export function badgeFor(beads, layoutResult) {
  const steps = {};
  for (const bead of beads) {
    const step = layoutResult.stepNumbers[bead.uid];
    if (step === undefined) continue;
    for (const id of idsOfBead(bead)) {
      if (id === ROGUE.id) continue;
      if (!Object.hasOwn(steps, id) || step < steps[id]) steps[id] = step;
    }
  }
  return steps;
}

function showBadge(badge, step) {
  badge.textContent = String(step);
  badge.removeAttribute("hidden");
}

function hideBadge(badge) {
  badge.textContent = "";
  badge.setAttribute("hidden", "");
}

/**
 * Keeps the diagram's tile marks in step with the story map.
 * Options (for tests): `eventTarget` (default `document`), `getState` (default the app store),
 * `layoutFn` (default `layout`).
 * @param {Element} diagramHost the element holding the diagram's `<svg>`
 * @returns {{ refresh: () => void, destroy: () => void }} call `refresh()` after the diagram is redrawn
 */
export function mountStoryHighlight(diagramHost, options = {}) {
  const eventTarget = options.eventTarget ?? globalThis.document;
  const getState = options.getState ?? getStoryState;
  const layoutFn = options.layoutFn ?? layout;
  const warnedTiles = new WeakSet();
  let current = { beads: [], ribbons: [] };

  function warnOnceAboutBadge(tile, elementId) {
    if (warnedTiles.has(tile)) return;
    warnedTiles.add(tile);
    console.warn(`story-highlight: tile "${elementId}" has no .step-badge element; its step number is skipped`);
  }

  function applyMarks() {
    const { beads, ribbons } = current;
    const inStory = elementsInStory(beads);
    const steps = inStory.size > 0 ? badgeFor(beads, layoutFn(beads, ribbons)) : {};
    for (const tile of diagramHost.querySelectorAll(TILE_SELECTOR)) {
      const elementId = tile.getAttribute("data-element-id");
      const marked = inStory.has(elementId);
      tile.classList.toggle(IN_STORY_CLASS, marked);
      const badge = tile.querySelector(BADGE_SELECTOR);
      if (!badge) {
        if (marked) warnOnceAboutBadge(tile, elementId);
        continue;
      }
      if (marked && Object.hasOwn(steps, elementId)) showBadge(badge, steps[elementId]);
      else hideBadge(badge);
    }
  }

  function setStory(state) {
    current = { beads: state?.beads ?? [], ribbons: state?.ribbons ?? [] };
    applyMarks();
  }

  const onChanged = (event) => setStory(event.detail);
  eventTarget?.addEventListener?.(EVT_STORY_CHANGED, onChanged);
  setStory(getState());

  return {
    refresh: () => applyMarks(),
    destroy: () => eventTarget?.removeEventListener?.(EVT_STORY_CHANGED, onChanged),
  };
}
