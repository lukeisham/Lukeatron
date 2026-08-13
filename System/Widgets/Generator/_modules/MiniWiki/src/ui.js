/**
 * ui.js — DOM rendering for MiniWiki: side menu (requirement 7), home page
 * (requirement 6), section landing pages (decision 2), article pages with
 * references (requirement 8) and the key-search-terms box (requirement 9),
 * and the lazy-expansion tree (decision 3, via tree.js's getChildren/
 * getTopLevel). No `innerHTML` with unescaped source text (JS-6) — the
 * only `innerHTML` assignment in this file is `article.body_html`, which
 * is pre-escaped at build time by build/extract_articles.py's
 * escape_html(), then re-linked by autolink.js's autolinkHtml(), which
 * only rewrites text runs between existing tags and never introduces raw
 * user/content text outside a tag.
 */
import { getAncestors, getTopLevel, getChildren, flatIndex, isFlatCatalogue } from "./tree.js";
import { autolinkHtml } from "./autolink.js";
import { generateSearchTerms } from "./search-terms.js";
import { formatReferences } from "./references.js";
import { copyToClipboard } from "./clipboard.js";
import { renderSearchBox } from "./search-ui.js";
import { renderSeeAlso, renderPrevNextNav } from "./article-nav.js";

function el(doc, tag, className, text) {
  const e = doc.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

/**
 * itemLabel(article) -> display title, with the article's source attributed
 * in brackets when present ("Riddle EX-001 [Anglo-Saxon Exeter Book]") — the
 * flat-catalogue requirement that every entry visibly names where it came
 * from, wherever its title appears (side menu, home grid, article page).
 * Hierarchical articles rarely carry `source` (extract_articles.py's dialect
 * has no such field), so this is a no-op there.
 */
function itemLabel(article) {
  return article.source ? `${article.title} [${article.source}]` : article.title;
}

function linkItem(doc, label, onClick, className = "mw-menu-link", navId) {
  const li = doc.createElement("li");
  const a = el(doc, "a", className, label);
  a.href = "#";
  if (navId !== undefined) a.setAttribute("data-nav-id", navId);
  a.addEventListener("click", (e) => {
    e.preventDefault();
    onClick();
  });
  li.appendChild(a);
  return li;
}

/** Side menu (requirement 7): search box, Home, All, Surprise me, then
 * either a flat list of every item (flat catalogue — riddles/folk-tales/
 * psychometric items, no nesting) or Categories + the lazy tree
 * (hierarchical cartridges). `opts.search` (index.js's search(query))
 * backs the live search box (audit gap #1) — `menuBody` (everything below
 * the box) is hidden while a query has the result list open, restored
 * when cleared. */
function renderSideMenu(doc, articlesById, opts) {
  const nav = el(doc, "nav", "mw-side-menu");

  const menuBody = el(doc, "div", "mw-menu-body");
  const top = el(doc, "ul", "mw-menu-top");
  top.appendChild(linkItem(doc, "Home", opts.onHome, "mw-menu-link", "home"));
  top.appendChild(linkItem(doc, "All", opts.onAll, "mw-menu-link", "all"));
  top.appendChild(linkItem(doc, "Surprise me", opts.onSurprise));
  menuBody.appendChild(top);

  if (isFlatCatalogue(articlesById)) {
    menuBody.appendChild(el(doc, "div", "mw-menu-heading", "All items"));
    const itemList = el(doc, "ul", "mw-menu-categories");
    for (const item of flatIndex(articlesById)) {
      itemList.appendChild(linkItem(doc, itemLabel(item), () => opts.onNavigate(item.id), "mw-menu-link", item.id));
    }
    menuBody.appendChild(itemList);
  } else {
    menuBody.appendChild(el(doc, "div", "mw-menu-heading", "Categories"));
    const categoryList = el(doc, "ul", "mw-menu-categories");
    for (const cat of getTopLevel(articlesById)) {
      categoryList.appendChild(linkItem(doc, cat.title, () => opts.onNavigate(cat.id), "mw-menu-link", cat.id));
    }
    menuBody.appendChild(categoryList);

    menuBody.appendChild(el(doc, "div", "mw-menu-heading", "Browse"));
    menuBody.appendChild(renderTree(doc, articlesById, opts.expandedIds, opts.onNavigate));
  }

  if (opts.search) {
    nav.appendChild(renderSearchBox(doc, { search: opts.search, onNavigate: opts.onNavigate, menuBody }));
  }
  nav.appendChild(menuBody);
  return nav;
}

/** Lazy-expansion tree (decision 3): expandedIds starts empty; expanding a
 * node reveals only its direct children, keeping the DOM bounded regardless
 * of the cartridge's total article count (verified at 155 articles). */
function renderTree(doc, articlesById, expandedIds, onNavigate) {
  const container = el(doc, "ul", "mw-tree");
  renderTreeLevel(doc, articlesById, getTopLevel(articlesById), container, expandedIds, onNavigate);
  return container;
}

function renderTreeLevel(doc, articlesById, nodes, ul, expandedIds, onNavigate) {
  for (const a of nodes) {
    const li = el(doc, "li", "mw-tree-item");
    const hasChildren = (a.children || []).length > 0;
    if (hasChildren) {
      const toggle = el(doc, "button", "mw-tree-toggle", expandedIds.has(a.id) ? "▼" : "▶");
      toggle.type = "button";
      toggle.setAttribute("aria-label", (expandedIds.has(a.id) ? "Collapse " : "Expand ") + a.title);
      toggle.addEventListener("click", () => {
        if (expandedIds.has(a.id)) expandedIds.delete(a.id);
        else expandedIds.add(a.id);
        const parentUl = li.parentElement;
        const fresh = el(doc, "ul", parentUl.className);
        renderTreeLevel(doc, articlesById, nodes, fresh, expandedIds, onNavigate);
        parentUl.replaceWith(fresh);
      });
      li.appendChild(toggle);
    } else {
      li.appendChild(el(doc, "span", "mw-tree-leaf", "·"));
    }
    const link = el(doc, "a", "mw-tree-link", a.title);
    link.href = "#/" + a.id;
    link.setAttribute("data-nav-id", a.id);
    link.addEventListener("click", (e) => {
      e.preventDefault();
      onNavigate(a.id);
    });
    li.appendChild(link);
    ul.appendChild(li);
    if (hasChildren && expandedIds.has(a.id)) {
      const childUl = el(doc, "ul", "mw-tree-children");
      renderTreeLevel(doc, articlesById, getChildren(articlesById, a.id), childUl, expandedIds, onNavigate);
      li.appendChild(childUl);
    }
  }
}

function categoryCard(doc, article, onNavigate) {
  const card = el(doc, "div", "mw-home-card");
  const link = el(doc, "a", "mw-home-card-title", itemLabel(article));
  link.href = "#/" + article.id;
  link.addEventListener("click", (e) => {
    e.preventDefault();
    onNavigate(article.id);
  });
  card.appendChild(link);
  if (article.lead) card.appendChild(el(doc, "p", "mw-home-card-lead", article.lead));
  return card;
}

/** Home page (requirement 6): generated overview — a flat catalogue lists
 * EVERY item (there are no categories to summarise); a hierarchical
 * cartridge lists its top-level categories and their lead sentences.
 * Either way, never hand-written. */
function renderHome(doc, articlesById, cartridgeName, onNavigate) {
  const flat = isFlatCatalogue(articlesById);
  const main = el(doc, "div", "mw-page mw-home");
  main.appendChild(el(doc, "h1", "mw-title", cartridgeName || "Mini-Wiki"));
  main.appendChild(
    el(
      doc,
      "p",
      "mw-lead",
      flat
        ? `A complete catalogue of ${cartridgeName || "this topic"}'s items.`
        : `An overview of ${cartridgeName || "this topic"}'s top-level categories.`
    )
  );
  const list = el(doc, "div", "mw-home-categories");
  const items = flat ? flatIndex(articlesById) : getTopLevel(articlesById);
  for (const item of items) {
    list.appendChild(categoryCard(doc, item, onNavigate));
  }
  main.appendChild(list);
  return main;
}

/** "All" page: full flat browsable index (requirement 7). */
function renderAllIndex(doc, articlesById, onNavigate) {
  const main = el(doc, "div", "mw-page mw-all");
  main.appendChild(el(doc, "h1", "mw-title", "All articles"));
  const list = el(doc, "ul", "mw-all-list");
  for (const a of flatIndex(articlesById)) {
    const li = doc.createElement("li");
    const link = el(doc, "a", "mw-all-link", `${a.id} — ${itemLabel(a)}`);
    link.href = "#/" + a.id;
    link.addEventListener("click", (e) => {
      e.preventDefault();
      onNavigate(a.id);
    });
    li.appendChild(link);
    list.appendChild(li);
  }
  main.appendChild(list);
  return main;
}

/** Section landing page (decision 2): a role:"section" node (empty body,
 * has children) renders as a page listing its children — never a stub
 * article with empty sections. */
function renderSectionPage(doc, articlesById, article, onNavigate) {
  const main = el(doc, "div", "mw-page mw-section");
  main.appendChild(breadcrumb(doc, articlesById, article, onNavigate));
  main.appendChild(el(doc, "h1", "mw-title", article.title));
  if (article.lead) main.appendChild(el(doc, "p", "mw-lead", article.lead));
  const list = el(doc, "div", "mw-home-categories");
  for (const child of getChildren(articlesById, article.id)) {
    list.appendChild(categoryCard(doc, child, onNavigate));
  }
  main.appendChild(list);
  return main;
}

function breadcrumb(doc, articlesById, article, onNavigate) {
  const ancestors = getAncestors(articlesById, article.id);
  const crumb = el(doc, "div", "mw-breadcrumb");
  if (ancestors.length === 0) return crumb;
  for (const a of ancestors) {
    const link = el(doc, "a", "mw-breadcrumb-link", a.title);
    link.href = "#/" + a.id;
    link.addEventListener("click", (e) => {
      e.preventDefault();
      onNavigate(a.id);
    });
    crumb.appendChild(link);
    crumb.appendChild(doc.createTextNode(" › "));
  }
  crumb.appendChild(doc.createTextNode(article.title));
  return crumb;
}

function wireWikilinks(container, onNavigate) {
  const links = container.querySelectorAll ? container.querySelectorAll("a.wikilink") : [];
  links.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      onNavigate(link.getAttribute("data-article-id"));
    });
  });
}

/** Full article page: lead, auto-linked body, characteristics, examples,
 * worked example, MLA references (requirement 8), search-terms box
 * (requirement 9). */
function renderArticlePage(doc, articlesById, article, linkCatalogue, onNavigate) {
  const main = el(doc, "div", "mw-page mw-article");
  main.appendChild(breadcrumb(doc, articlesById, article, onNavigate));
  main.appendChild(el(doc, "h1", "mw-title", itemLabel(article)));
  if (article.lead) main.appendChild(el(doc, "p", "mw-lead", article.lead));
  // Task A: every catalogue entry carries a visible source (shown in the
  // title above via itemLabel) and licence note. The licence gets its own
  // small attribution line — never fabricated, omitted entirely when the
  // extractor found none (HTML-6/JS-2's "never invent content" spirit,
  // matching how the MLA references section below is already omitted).
  if (article.licence) {
    main.appendChild(el(doc, "p", "mw-attribution", `Licence: ${article.licence}`));
  }

  if (article.body_html) {
    const body = el(doc, "div", "mw-body");
    body.innerHTML = autolinkHtml(article.body_html, linkCatalogue, article.id);
    wireWikilinks(body, onNavigate);
    main.appendChild(body);
  }

  if (article.characteristics && article.characteristics.length) {
    const section = el(doc, "section", "mw-section-block");
    section.appendChild(el(doc, "h2", "mw-section-heading", "Key characteristics"));
    const ul = el(doc, "ul", "mw-characteristics");
    for (const c of article.characteristics) ul.appendChild(el(doc, "li", null, c));
    section.appendChild(ul);
    main.appendChild(section);
  }

  if (article.worked_example) {
    const section = el(doc, "section", "mw-section-block");
    section.appendChild(el(doc, "h2", "mw-section-heading", "Worked example"));
    section.appendChild(el(doc, "p", "mw-worked-example", article.worked_example));
    main.appendChild(section);
  }

  if (article.examples && article.examples.length) {
    const section = el(doc, "section", "mw-section-block");
    section.appendChild(el(doc, "h2", "mw-section-heading", "Examples"));
    const ul = el(doc, "ul", "mw-examples");
    for (const ex of article.examples) ul.appendChild(el(doc, "li", null, ex));
    section.appendChild(ul);
    main.appendChild(section);
  }

  // Requirement 8: omit the section entirely when nothing is sourceable —
  // never fabricate a citation.
  const refs = formatReferences(article);
  if (refs.length) {
    const section = el(doc, "section", "mw-references");
    section.appendChild(el(doc, "h2", "mw-section-heading", "References"));
    const ol = el(doc, "ol", "mw-reference-list");
    for (const r of refs) ol.appendChild(el(doc, "li", null, r));
    section.appendChild(ol);
    main.appendChild(section);
  }

  // Audit gaps #3/#4: "See also" (sibling chips, distinct from the
  // key-search-terms box below) and prev/next sibling navigation, both
  // omitted entirely rather than rendered empty when there are no siblings.
  const seeAlso = renderSeeAlso(doc, articlesById, article, onNavigate);
  if (seeAlso) main.appendChild(seeAlso);
  const prevNext = renderPrevNextNav(doc, articlesById, article, onNavigate);
  if (prevNext) main.appendChild(prevNext);

  main.appendChild(renderSearchTermsBox(doc, article, getAncestors(articlesById, article.id)));
  return main;
}

/** Requirement 9: key search terms box, visually distinct, at the base of
 * the page. Each term is one-click copy; a "copy all" affordance sits
 * alongside. Works offline from file:// via clipboard.js's fallback. */
function renderSearchTermsBox(doc, article, ancestors, termLimit = 10) {
  const box = el(doc, "div", "mw-search-terms-box");
  box.appendChild(el(doc, "h2", "mw-section-heading", "Key search terms"));
  const terms = generateSearchTerms(article, ancestors, termLimit);
  const list = el(doc, "div", "mw-term-list");
  for (const term of terms) {
    const chip = el(doc, "button", "mw-term-chip", term);
    chip.type = "button";
    chip.title = `Copy "${term}"`;
    chip.addEventListener("click", () => {
      copyToClipboard(term, doc).then((ok) => flashCopied(chip, ok));
    });
    list.appendChild(chip);
  }
  box.appendChild(list);

  const copyAll = el(doc, "button", "mw-copy-all", "Copy all");
  copyAll.type = "button";
  copyAll.addEventListener("click", () => {
    copyToClipboard(terms.join(", "), doc).then((ok) => flashCopied(copyAll, ok));
  });
  box.appendChild(copyAll);
  return box;
}

function flashCopied(element, ok) {
  const original = element.textContent;
  element.textContent = ok ? "Copied!" : "Copy failed";
  setTimeout(() => {
    element.textContent = original;
  }, 1200);
}

export {
  el,
  renderSideMenu,
  renderTree,
  renderHome,
  renderAllIndex,
  renderSectionPage,
  renderArticlePage,
  renderSearchTermsBox,
};
