/**
 * styles.js — MiniWiki's own CSS, exported as a string (JS-7: no build
 * step / bundler beyond this repo's own concatenating bundler). The shell
 * never ships a stylesheet for a peer module (spelling-seam.js doesn't
 * either); miniwiki-seam.js injects this text into a <style> element once,
 * on mount. Every colour is one of the shell's own custom properties
 * (--bg/--card/--ink/--ink2/--ink3/--line/--line2/--acc/--accbg/--radius)
 * per the mockup's own "no new colours invented" rule (NOTES.md
 * "Design system adherence") — CSS-2.
 */

const MINIWIKI_CSS = `
.mw-root { display: flex; gap: 20px; }
.mw-side-menu { flex: 0 0 260px; max-height: 70vh; overflow-y: auto; font-size: 13px; }
.mw-menu-top { list-style: none; margin: 0 0 12px; padding: 0; }
.mw-menu-top li { margin: 2px 0; }
.mw-menu-link, .mw-tree-link, .mw-all-link, .mw-breadcrumb-link, .mw-home-card-title {
  color: var(--ink); text-decoration: none; display: inline-block; padding: 3px 6px;
  border-radius: 4px; word-break: break-word;
}
.mw-menu-link:hover, .mw-tree-link:hover, .mw-all-link:hover, .mw-home-card-title:hover {
  background: var(--accbg); color: var(--acc);
}
.mw-menu-link.mw-active, .mw-tree-link.mw-active { background: var(--accbg); color: var(--acc); font-weight: 600; }
.mw-menu-heading { font-size: 11px; text-transform: uppercase; letter-spacing: .4px; color: var(--ink3); margin: 12px 0 4px; }
.mw-menu-categories, .mw-tree, .mw-tree-children, .mw-all-list { list-style: none; margin: 0; padding: 0; }
.mw-tree-children { padding-left: 14px; }
.mw-tree-item { margin: 2px 0; }
.mw-tree-toggle { background: none; border: none; color: var(--ink3); cursor: pointer; width: 16px; font-size: 11px; }
.mw-tree-toggle:hover { color: var(--ink); }
.mw-tree-leaf { display: inline-block; width: 16px; text-align: center; color: var(--ink3); }
.mw-article-pane { flex: 1; min-width: 0; }
.mw-page { font-size: 14px; }
.mw-title { font-size: 22px; font-weight: 600; margin: 0 0 8px; color: var(--ink); }
.mw-lead { font-size: 15px; font-weight: 500; margin: 0 0 14px; }
.mw-breadcrumb { font-size: 12px; color: var(--ink2); margin-bottom: 10px; }
.mw-attribution { font-size: 12px; color: var(--ink2); margin: -6px 0 14px; }
.mw-breadcrumb .mw-breadcrumb-link { padding: 0 2px; }
.mw-body p { font-size: 13.5px; line-height: 1.6; margin: 0 0 10px; }
.mw-section-block { margin: 16px 0; }
.mw-section-heading, .mw-reference-list + .mw-section-heading {
  font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: .4px; color: var(--ink2); margin: 0 0 6px;
}
.mw-characteristics, .mw-examples { font-size: 13.5px; margin: 0; padding-left: 20px; max-height: 320px; overflow-y: auto; }
.mw-characteristics li, .mw-examples li { margin: 4px 0; line-height: 1.5; }
.mw-worked-example { font-size: 13.5px; line-height: 1.6; background: var(--accbg); border-radius: var(--radius); padding: 10px 12px; }
.wikilink { color: var(--acc); text-decoration: none; cursor: help; }
.wikilink:hover { text-decoration: underline; }
.mw-home-categories { display: grid; gap: 10px; }
.mw-home-card { border: 1px solid var(--line); border-radius: var(--radius); padding: 12px 14px; }
.mw-home-card-lead { margin: 4px 0 0; font-size: 13px; color: var(--ink2); }
.mw-reference-list { font-size: 12.5px; padding-left: 18px; color: var(--ink2); }
.mw-reference-list li { margin: 4px 0; }

/* Requirement 9: key search-terms box, visually distinct from ordinary
   sections — a bordered, tinted "special box" at the very foot of the page. */
.mw-search-terms-box {
  margin-top: 22px; padding: 14px; border: 1px solid var(--line2); border-radius: var(--radius);
  background: var(--accbg);
}
.mw-search-terms-box .mw-section-heading { color: var(--acc); }
.mw-term-list { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
.mw-term-chip {
  border: 1px solid var(--line2); background: var(--card); color: var(--ink);
  border-radius: 999px; padding: 3px 10px; font-size: 12px; cursor: pointer;
}
.mw-term-chip:hover { background: var(--acc); color: #fff; border-color: var(--acc); }
.mw-copy-all {
  border: 1px solid var(--acc); background: var(--acc); color: #fff; border-radius: 4px;
  padding: 5px 12px; font-size: 12px; cursor: pointer;
}
.mw-copy-all:hover { opacity: .9; }

/* Model decision (fit report §7): explicit non-Latin fallback stack for
   the Greek and Hebrew cartridge. */
[data-mw-cartridge="Greek and Hebrew"] .mw-title,
[data-mw-cartridge="Greek and Hebrew"] .mw-lead,
[data-mw-cartridge="Greek and Hebrew"] .mw-body,
[data-mw-cartridge="Greek and Hebrew"] .mw-characteristics,
[data-mw-cartridge="Greek and Hebrew"] .mw-examples {
  font-family: "Noto Serif Greek", "SBL BibLit", "Noto Sans Hebrew", "Times New Roman", serif;
}

@media (max-width: 719px) {
  .mw-root { flex-direction: column; }
  .mw-side-menu { flex: none; max-height: none; }
}
`;

export { MINIWIKI_CSS };
