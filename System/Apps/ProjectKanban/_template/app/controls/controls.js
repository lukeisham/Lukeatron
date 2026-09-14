// controls.js — the toolbar's entry point (controls.spec.md). Wires the
// static buttons already in index.html to toolbar.js's pure state functions
// and to storage.js's guarded persistence. This file holds no rendering
// logic of its own — it only reads dataset/aria-pressed off the real
// buttons and applies the same functions test_controls.mjs exercises
// directly against a fake DOM (TEST-8, mirroring board.js's own
// thin-entry-point scope, see that file's header comment).
//
// FR-6: every case below except "refresh" only ever calls an apply*()
// function (a dataset write) and a save*() function (a guarded storage
// write) — never fetchBoard(), never renderBoard(), never a DOM walk over
// #board-root. test_controls.mjs's AC-2 test greps this file to hold that
// boundary structurally, the same way test_board.mjs's AC-3 test does for
// board.js's own no-listener guarantee.

import {
  VIEWS,
  DEFAULT_VIEW,
  DEFAULT_DENSITY,
  PALETTE_ORDER,
  DEFAULT_PALETTE,
  nextDensity,
  nextPalette,
  applyView,
  applyDensity,
  applyPalette,
} from "./toolbar.js";
import { loadPreferences, saveView, saveDensity, savePalette } from "./storage.js";
import { init as initAutoRefresh } from "./auto-refresh.js";

function getStorage() {
  try {
    return window.localStorage;
  } catch (err) {
    // Some browsers throw on the *property access* itself in a locked-down
    // privacy mode, not only on getItem/setItem (JS-2: guard the access,
    // not just the calls) — storage.js's own guards handle a null storage
    // from here on.
    console.warn("controls.js: localStorage is unavailable — choices will not persist", err);
    return null;
  }
}

function setPressedView(toolbar, view) {
  for (const btn of toolbar.querySelectorAll('[data-action="view"]')) {
    btn.setAttribute("aria-pressed", String(btn.dataset.viewValue === view));
  }
}

function setDensityLabel(toolbar, density) {
  const btn = toolbar.querySelector('[data-action="density-toggle"]');
  if (btn) btn.textContent = `Density: ${density}`;
}

function setPaletteLabel(toolbar, palette) {
  const btn = toolbar.querySelector('[data-action="palette-cycle"]');
  if (btn) btn.textContent = `Palette: ${palette}`;
}

function handleClick(event, toolbar, body, storage, state) {
  const target = event.target.closest("[data-action]");
  if (!target) return;

  switch (target.dataset.action) {
    case "view": {
      const view = target.dataset.viewValue;
      state.view = view;
      applyView(body, view);
      saveView(storage, view);
      setPressedView(toolbar, view);
      return;
    }
    case "density-toggle": {
      const next = nextDensity(state.density);
      state.density = next;
      applyDensity(body, next);
      saveDensity(storage, next);
      setDensityLabel(toolbar, next);
      return;
    }
    case "palette-cycle": {
      const next = nextPalette(state.palette);
      state.palette = next;
      applyPalette(body, next);
      savePalette(storage, next);
      setPaletteLabel(toolbar, next);
      return;
    }
    case "refresh": {
      // FR-8: the only control allowed to touch the network. board.js
      // (see that file's own header comment) only self-invokes once at
      // module load and exports no re-render entry point; calling
      // fetchBoard()+renderBoard() from here would mean re-implementing
      // board.js's own fetch/error-handling sequence a second time rather
      // than reusing it. A full reload is the honest stand-in until
      // board.js exports a redraw hook — flagged to the boss agent as a
      // real gap, not silently built around.
      location.reload();
      return;
    }
    default:
      console.warn(`controls.js: unrecognised toolbar action "${target.dataset.action}"`, target);
  }
}

function init() {
  const toolbar = document.querySelector(".app-toolbar");
  if (!toolbar) {
    console.warn("controls.js: no .app-toolbar element found in the page — controls cannot wire up");
    return;
  }

  const body = document.body;
  const storage = getStorage();
  const prefs = loadPreferences(storage);

  const state = {
    view: VIEWS.includes(prefs.view) ? prefs.view : DEFAULT_VIEW,
    density: prefs.density === "condensed" ? "condensed" : DEFAULT_DENSITY,
    palette: PALETTE_ORDER.includes(prefs.palette) ? prefs.palette : null,
  };

  applyView(body, state.view);
  setPressedView(toolbar, state.view);

  applyDensity(body, state.density);
  setDensityLabel(toolbar, state.density);

  // FR-10: only apply an explicit palette attribute when one was actually
  // stored — leaving it unset on a true first visit is what lets
  // `prefers-color-scheme` (tokens.css) decide the initial look.
  if (state.palette) applyPalette(body, state.palette);
  setPaletteLabel(toolbar, state.palette ?? DEFAULT_PALETTE);

  // JS-6: one delegated listener over the whole toolbar rather than one
  // per button — the button set is fixed (not dynamically added/removed),
  // but delegation still means one listener to reason about instead of
  // several.
  toolbar.addEventListener("click", (event) => handleClick(event, toolbar, body, storage, state));

  // wishlist #5: a self-contained poller, not a toolbar control — no
  // dataset write, no save*() call, nothing for handleClick to route.
  initAutoRefresh();
}

init();
