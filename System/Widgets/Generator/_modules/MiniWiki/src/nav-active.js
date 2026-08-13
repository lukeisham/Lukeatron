/**
 * nav-active.js — wires `.mw-active` onto the current article's side-menu
 * and tree entry (audit bug: styles.js has always styled `.mw-active`, but
 * nothing in ui.js/index.js ever applied it — StyleGuide's 03/04 docs
 * called this out as a known gap; this closes it). One job (SR-1): given a
 * nav container and the current key, clear the old highlight and set the
 * new one. No re-render — the lazy tree keeps whatever nodes are already
 * expanded, so this only ever toggles a class on existing anchors.
 */

function clearActive(navContainer, className) {
  for (const link of navContainer.querySelectorAll("." + className)) {
    link.className = link.className
      .split(/\s+/)
      .filter((c) => c !== "mw-active")
      .join(" ");
  }
}

function applyActive(navContainer, className, key) {
  for (const link of navContainer.querySelectorAll("." + className)) {
    if (link.getAttribute("data-nav-id") === key) {
      link.className = (link.className + " mw-active").trim();
    }
  }
}

/**
 * setActiveNavLink(navContainer, key) — key is "home", "all", or an
 * article id. Matches on the `data-nav-id` attribute every relevant link
 * carries (menu top links + tree/category links, wired in ui.js). Silently
 * no-ops when nothing matches (e.g. the current article sits inside a
 * still-collapsed branch of the lazy tree) rather than forcing an expand —
 * this mirrors the tree's own lazy-expansion contract.
 */
function setActiveNavLink(navContainer, key) {
  if (!navContainer || !navContainer.querySelectorAll) return;
  for (const className of ["mw-menu-link", "mw-tree-link"]) {
    clearActive(navContainer, className);
    applyActive(navContainer, className, key);
  }
}

export { setActiveNavLink };
