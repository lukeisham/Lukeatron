/**
 * index.js — createMiniWikiModule(options) factory (spec FR-1), mirroring
 * SpellingModule's createSpellingModule(options) shape (Spelling/src/index.js):
 * one public factory, no globals leaked beyond what a host explicitly binds
 * at build time, everything else injected for testability (TEST-4/TEST-8).
 *
 * MiniWiki is a SHARED module: any cartridge's build can embed its own
 * ARTICLES JSON (build/extract_articles.py's output) and mount an instance
 * without touching this file — the module owns no per-cartridge content.
 */
import { getAncestors, getTopLevel, getChildren, flatIndex } from "./tree.js";
import { buildLinkCatalogue } from "./autolink.js";
import { generateSearchTerms } from "./search-terms.js";
import { formatReferences } from "./references.js";
import { copyToClipboard } from "./clipboard.js";
import { MINIWIKI_CSS } from "./styles.js";
import { MINIWIKI_INTERACTIVE_CSS } from "./styles-interactive.js";
import {
  el,
  renderSideMenu,
  renderHome,
  renderAllIndex,
  renderSectionPage,
  renderArticlePage,
} from "./ui.js";
import { createPreviewPopover, createHoverHandlers } from "./popover.js";
import { createDrawerController } from "./drawer.js";
import { setActiveNavLink } from "./nav-active.js";

function createMiniWikiModule(options = {}) {
  const articlesList = Array.isArray(options.articles) ? options.articles : [];
  const cartridgeId = options.cartridgeId || "default";
  const cartridgeName = options.cartridgeName || "Mini-Wiki";
  const doc = options.document; // may be undefined; resolved per call, matching Spelling's pattern

  const articlesById = {};
  for (const article of articlesList) {
    articlesById[article.id] = article;
  }
  const linkCatalogue = buildLinkCatalogue(articlesById);
  const expandedIds = new Set();

  function getArticle(id) {
    return articlesById[id] || null;
  }

  function randomArticleId() {
    const articleIds = Object.keys(articlesById).filter((id) => articlesById[id].role === "article");
    const pool = articleIds.length ? articleIds : Object.keys(articlesById);
    if (!pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function search(query) {
    const q = (query || "").trim().toLowerCase();
    if (!q) return [];
    return flatIndex(articlesById).filter(
      (a) => a.title.toLowerCase().includes(q) || (a.lead && a.lead.toLowerCase().includes(q))
    );
  }

  function resolveDocument() {
    return doc || (typeof document !== "undefined" ? document : null);
  }

  /** renderView(view, id, container, onNavigate) -> Element | null */
  function renderView(view, id, container, onNavigate) {
    const d = resolveDocument();
    if (!d) {
      console.warn("MiniWikiModule.renderView: no document available");
      return null;
    }
    // textContent = "" (not innerHTML) so a fake DOM without an HTML
    // parser still actually empties `container.children` — real browsers
    // clear children either way, so this is behaviourally identical there.
    container.textContent = "";
    let page;
    if (view === "home") {
      page = renderHome(d, articlesById, cartridgeName, onNavigate);
    } else if (view === "all") {
      page = renderAllIndex(d, articlesById, onNavigate);
    } else {
      const article = getArticle(id);
      if (!article) {
        page = d.createElement("div");
        page.className = "mw-page mw-not-found";
        page.textContent = `Article not found: ${id}`;
        console.warn(`MiniWikiModule.renderView: unknown article id "${id}"`);
      } else if (article.role === "section") {
        page = renderSectionPage(d, articlesById, article, onNavigate);
      } else {
        page = renderArticlePage(d, articlesById, article, linkCatalogue, onNavigate);
      }
    }
    container.appendChild(page);
    if (cartridgeId) container.setAttribute("data-mw-cartridge", cartridgeName);
    return page;
  }

  /**
   * mount(navContainer, articleContainer, opts) — wires the side menu and
   * hash-based routing (requirement 7's Home/All/Surprise me/category
   * links, plus every article). Injects styles.js's CSS once via a
   * <style data-miniwiki> element so the host page needs no separate
   * stylesheet reference (mirrors how the shell's own CSS is inlined).
   */
  function mount(navContainer, articleContainer, opts = {}) {
    const d = resolveDocument();
    if (!d) {
      console.warn("MiniWikiModule.mount: no document available");
      return null;
    }
    injectStylesOnce(d);

    // Audit gap #2 (hover-preview popover): one popover element per mount,
    // appended alongside the article pane so it shares that pane's
    // positioning context; delegated show/hide handlers on articleContainer
    // cover every wikilink and "see also" chip regardless of how often the
    // article body is re-rendered underneath them.
    const popover = createPreviewPopover(d);
    const hoverHandlers = createHoverHandlers(popover, getArticle);
    articleContainer.addEventListener("mouseover", hoverHandlers.onMouseOver);
    articleContainer.addEventListener("mouseout", hoverHandlers.onMouseOut);
    articleContainer.addEventListener("focusin", hoverHandlers.onFocusIn);
    articleContainer.addEventListener("focusout", hoverHandlers.onFocusOut);
    if (articleContainer.parentNode) {
      articleContainer.parentNode.appendChild(popover);
    } else {
      articleContainer.appendChild(popover);
    }

    // Audit gap #5 (mobile drawer): the toggle button and scrim are created
    // here at mount time rather than baked into miniwiki-seam.js's static
    // document template, so the seam's launch logic stays untouched. Both
    // need a shared ancestor with navContainer to sit alongside it; when
    // the host hasn't given navContainer a parent (e.g. a bare test
    // fixture), the drawer simply isn't wired — there is nothing to toggle.
    let drawer = null;
    const navRoot = navContainer.parentNode;
    if (navRoot) {
      const toggle = el(d, "button", "mw-nav-toggle", "☰");
      toggle.type = "button";
      toggle.setAttribute("aria-label", "Toggle navigation");
      const scrim = el(d, "div", "mw-nav-scrim");
      // appendChild only (not insertBefore) — the fake DOM used by this
      // module's own tests (_shell/tests/js/fake-dom.mjs, TEST-8) implements
      // no insertBefore, and CSS (position:fixed for the drawer/scrim, and
      // the toggle only ever showing on the narrow breakpoint) makes DOM
      // order harmless here regardless.
      navRoot.appendChild(toggle);
      navRoot.appendChild(scrim);
      drawer = createDrawerController(d, toggle, navContainer, scrim);
    }

    function hashFor(id) {
      return "#/" + id;
    }

    function updateActive(key) {
      setActiveNavLink(navContainer, key);
    }

    function navigate(id, opts2 = {}) {
      renderView("article", id, articleContainer, navigate);
      updateActive(id);
      if (drawer) drawer.closeOnNavigate();
      if (!opts2.skipHash && typeof window !== "undefined") {
        window.location.hash = hashFor(id);
      }
      if (opts.onNavigate) opts.onNavigate(id);
    }

    function showHome(opts2 = {}) {
      renderView("home", null, articleContainer, navigate);
      updateActive("home");
      if (drawer) drawer.closeOnNavigate();
      if (!opts2.skipHash && typeof window !== "undefined") window.location.hash = "#/";
    }

    function showAll(opts2 = {}) {
      renderView("all", null, articleContainer, navigate);
      updateActive("all");
      if (drawer) drawer.closeOnNavigate();
      if (!opts2.skipHash && typeof window !== "undefined") window.location.hash = "#/all";
    }

    function showSurprise() {
      const id = randomArticleId();
      if (id) navigate(id);
    }

    navContainer.textContent = "";
    navContainer.appendChild(
      renderSideMenu(d, articlesById, {
        onHome: () => showHome(),
        onAll: () => showAll(),
        onSurprise: showSurprise,
        onNavigate: navigate,
        expandedIds,
        search,
      })
    );

    function routeFromHash() {
      if (typeof window === "undefined") return;
      const hash = window.location.hash.replace(/^#\/?/, "");
      if (!hash) {
        renderView("home", null, articleContainer, navigate);
        updateActive("home");
      } else if (hash === "all") {
        renderView("all", null, articleContainer, navigate);
        updateActive("all");
      } else if (articlesById[hash]) {
        renderView("article", hash, articleContainer, navigate);
        updateActive(hash);
      } else {
        renderView("home", null, articleContainer, navigate);
        updateActive("home");
      }
    }

    if (typeof window !== "undefined") {
      window.addEventListener("hashchange", routeFromHash);
      routeFromHash();
    } else {
      renderView("home", null, articleContainer, navigate);
      updateActive("home");
    }

    return { navigate, showHome, showAll, showSurprise };
  }

  return {
    getArticle,
    getTopLevel: () => getTopLevel(articlesById),
    getAncestors: (id) => getAncestors(articlesById, id),
    getChildren: (id) => getChildren(articlesById, id),
    flatIndex: () => flatIndex(articlesById),
    search,
    randomArticleId,
    renderView,
    mount,
    searchTerms: (id) => {
      const a = getArticle(id);
      return a ? generateSearchTerms(a, getAncestors(articlesById, id)) : [];
    },
    references: (id) => {
      const a = getArticle(id);
      return a ? formatReferences(a) : [];
    },
    copyToClipboard: (text) => copyToClipboard(text, resolveDocument()),
    cartridgeId,
    cartridgeName,
  };
}

let stylesInjected = false;
function injectStylesOnce(doc) {
  if (stylesInjected || doc.querySelector("style[data-miniwiki]")) return;
  const style = doc.createElement("style");
  style.setAttribute("data-miniwiki", "");
  style.textContent = MINIWIKI_CSS + "\n" + MINIWIKI_INTERACTIVE_CSS;
  doc.head.appendChild(style);
  stylesInjected = true;
}

export { createMiniWikiModule };
