/**
 * drawer.js — the mobile off-canvas nav drawer (audit gap #5). The
 * `@media (max-width:719px)` rule in styles.js has only ever stacked the
 * two columns; the approved mockup's drawer (toggle button, slide-in,
 * scrim, Escape/scrim/selection close) never shipped. This owns exactly
 * that behaviour — open/close state plus the three ways to close it — over
 * whatever toggle/nav/scrim elements index.js's mount() hands it.
 */

/**
 * createDrawerController(doc, toggle, navPane, scrim) -> controller
 * `navPane` gets `.mw-drawer-open` toggled; `scrim` gets `.mw-scrim-active`.
 * The controller also exposes `closeOnNavigate()` for mount() to call from
 * inside its own navigate() so selecting an article closes the drawer.
 */
function createDrawerController(doc, toggle, navPane, scrim) {
  function isOpen() {
    return (navPane.className || "").split(/\s+/).includes("mw-drawer-open");
  }

  function setClass(el, className, on) {
    const classes = (el.className || "").split(/\s+/).filter(Boolean).filter((c) => c !== className);
    if (on) classes.push(className);
    el.className = classes.join(" ");
  }

  function open() {
    setClass(navPane, "mw-drawer-open", true);
    setClass(scrim, "mw-scrim-active", true);
  }

  function close() {
    setClass(navPane, "mw-drawer-open", false);
    setClass(scrim, "mw-scrim-active", false);
  }

  function toggleDrawer() {
    if (isOpen()) close();
    else open();
  }

  // Exposed as a standalone function (not only wired via doc.addEventListener)
  // so tests can call it directly with a synthetic `{ key }` event — the
  // fake DOM's doc.addEventListener is a no-op stub (it has no document-wide
  // dispatch mechanism, TEST-8), so real Escape-key delivery is only
  // exercisable this way outside a real browser.
  function onKeydown(e) {
    if (e.key === "Escape" && isOpen()) close();
  }

  if (toggle) toggle.addEventListener("click", toggleDrawer);
  if (scrim) scrim.addEventListener("click", close);
  if (doc) doc.addEventListener("keydown", onKeydown);

  return { open, close, toggle: toggleDrawer, isOpen, closeOnNavigate: close, onKeydown };
}

export { createDrawerController };
