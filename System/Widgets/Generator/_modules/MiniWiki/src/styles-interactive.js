/**
 * styles-interactive.js — CSS for the five audit-gap features (search box,
 * hover popover, see-also, prev/next, mobile drawer). Split out of
 * styles.js per CSS-1 ("one file, one job... split when it grows") now
 * that the base article/menu stylesheet plus this file's rules would push
 * a single string past a legible size — this file owns exactly the
 * interactive-feature rules, styles.js keeps the base page/menu rules.
 * Same tokens-only rule as styles.js (CSS-2): only the shell's own
 * --bg/--card/--ink/--ink2/--ink3/--line/--line2/--acc/--accbg/--radius.
 */

const MINIWIKI_INTERACTIVE_CSS = `
/* Live search box (audit gap #1) */
.mw-search-wrap { position: relative; margin-bottom: 12px; }
.mw-search-box {
  border: 1px solid var(--line2); border-radius: var(--radius); padding: 8px 10px;
  font-size: 13px; width: 100%; color: var(--ink); background: var(--card);
}
.mw-search-box:focus { outline: none; border-color: var(--acc); box-shadow: 0 0 0 3px var(--accbg); }
.mw-search-results {
  display: none; border: 1px solid var(--line); border-radius: var(--radius);
  background: var(--card); max-height: 300px; overflow-y: auto; margin-top: 4px;
}
.mw-search-results.mw-search-results-visible { display: block; }
.mw-search-result-item { padding: 7px 10px; cursor: pointer; border-bottom: 1px solid var(--line); font-size: 12px; }
.mw-search-result-item:last-child { border-bottom: none; }
.mw-search-result-item:hover { background: var(--accbg); }
.mw-search-result-title { font-weight: 600; color: var(--ink); margin-bottom: 2px; }
.mw-search-result-snippet { color: var(--ink3); font-size: 11px; }
.mw-search-empty { padding: 8px 10px; color: var(--ink3); font-size: 12px; }

/* Hover/focus preview popover (audit gap #2) */
.mw-preview-popover {
  position: absolute; background: var(--card); border: 1px solid var(--line2);
  border-radius: var(--radius); padding: 8px 11px; font-size: 12px; line-height: 1.5;
  max-width: 280px; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12); z-index: 100; pointer-events: none;
}
.mw-preview-lead { color: var(--ink3); font-size: 12px; }

/* See also (audit gap #3) — distinct from .mw-search-terms-box */
.mw-see-also { margin-top: 16px; padding: 12px; background: var(--accbg); border-radius: var(--radius); font-size: 12px; }
.mw-see-also-title { font-weight: 600; color: var(--ink2); margin-bottom: 6px; }
.mw-see-also-links { display: flex; gap: 8px; flex-wrap: wrap; }
.mw-see-also-link {
  color: var(--acc); text-decoration: none; padding: 2px 6px; border-radius: 3px;
  background: var(--card); border: 1px solid var(--line); font-size: 11px;
}
.mw-see-also-link:hover { background: var(--accbg); }

/* Prev/next sibling navigation (audit gap #4) */
.mw-article-nav {
  display: flex; justify-content: space-between; gap: 12px; margin-top: 24px;
  padding-top: 16px; border-top: 1px solid var(--line); font-size: 12px;
}
.mw-nav-button { color: var(--acc); text-decoration: none; }
.mw-nav-button:hover { text-decoration: underline; }
.mw-nav-next { margin-left: auto; }

/* Mobile off-canvas drawer (audit gap #5) */
.mw-nav-toggle {
  display: none; align-items: center; justify-content: center; background: var(--card);
  border: 1px solid var(--line2); border-radius: var(--radius); padding: 6px 12px;
  cursor: pointer; font-size: 18px; color: var(--ink); width: 36px; height: 36px;
}
.mw-nav-scrim {
  display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.3); z-index: 40;
}
.mw-nav-scrim.mw-scrim-active { display: block; }

@media (max-width: 719px) {
  /* position:fixed rather than relying on DOM order: mount() appends the
     toggle wherever it finds a common ancestor for navContainer (index.js),
     which can land after the article pane in source order. Fixing its
     position keeps it visible top-left regardless. */
  .mw-nav-toggle { display: inline-flex; position: fixed; top: 12px; left: 12px; z-index: 46; margin-bottom: 10px; }
  .mw-side-menu {
    position: fixed; left: 0; top: 0; bottom: 0; width: 280px; max-height: none;
    background: var(--bg); z-index: 45; transform: translateX(-100%);
    transition: transform 0.25s ease; overflow-y: auto; padding: 16px;
  }
  .mw-side-menu.mw-drawer-open { transform: translateX(0); }
}

@media (min-width: 720px) {
  .mw-nav-toggle { display: none; }
  .mw-nav-scrim { display: none !important; }
}
`;

export { MINIWIKI_INTERACTIVE_CSS };
