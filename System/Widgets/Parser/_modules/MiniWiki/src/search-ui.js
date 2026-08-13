/**
 * search-ui.js — the live search box UI (audit gap #1). index.js's
 * search(query) has worked since the module shipped; nothing in src/
 * rendered an input for it. Kept out of ui.js per SR-1 — this owns exactly
 * one concern: the search box, its live-filtered result list, and toggling
 * the normal menu content out of the way while a query is active.
 */
import { el } from "./ui.js";

/** snippet(text, len) -> a plain-text lead excerpt, ellipsised if cut. */
function snippet(text, len = 80) {
  const t = (text || "").trim();
  if (t.length <= len) return t;
  return t.slice(0, len).trimEnd() + "…";
}

function renderResultItem(doc, article, onSelect) {
  const item = el(doc, "div", "mw-search-result-item");
  item.setAttribute("role", "button");
  item.tabIndex = 0;
  item.appendChild(el(doc, "div", "mw-search-result-title", article.title));
  const snippetText = snippet(article.lead);
  if (snippetText) item.appendChild(el(doc, "div", "mw-search-result-snippet", snippetText));
  item.addEventListener("click", () => onSelect(article.id));
  item.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") onSelect(article.id);
  });
  return item;
}

function setMenuVisible(menuBody, visible) {
  if (menuBody) menuBody.style.display = visible ? "" : "none";
}

/**
 * applySearchQuery(doc, query, resultsEl, menuBody, search, onNavigate) —
 * the live-filter step itself, factored out of the input-event wiring so
 * it can be called directly (fake-dom.mjs has no generic event dispatch,
 * TEST-8 — this mirrors popover.js's directly-callable-handler pattern
 * rather than requiring one). Empty/whitespace query restores the normal
 * menu; a non-empty query hides it and renders the result list (or a
 * "No matches." row).
 */
function applySearchQuery(doc, query, resultsEl, menuBody, search, onNavigate) {
  resultsEl.textContent = "";
  const trimmed = (query || "").trim();
  if (!trimmed) {
    resultsEl.className = "mw-search-results";
    setMenuVisible(menuBody, true);
    return;
  }
  setMenuVisible(menuBody, false);
  const matches = search(query);
  if (!matches.length) {
    resultsEl.appendChild(el(doc, "div", "mw-search-empty", "No matches."));
  } else {
    for (const article of matches) {
      resultsEl.appendChild(renderResultItem(doc, article, onNavigate));
    }
  }
  resultsEl.className = "mw-search-results mw-search-results-visible";
}

/**
 * renderSearchBox(doc, opts) -> Element
 * opts: { search(query) -> Article[], onNavigate(id), menuBody: Element }
 * `menuBody` is the rest of the side menu (Home/All/Surprise, categories,
 * tree) — hidden while a non-empty query has results shown, and restored
 * the moment the box is cleared, per the requirement that clearing the box
 * "restores the normal menu/tree".
 */
function renderSearchBox(doc, opts) {
  const wrap = el(doc, "div", "mw-search-wrap");
  const input = doc.createElement("input");
  input.type = "text";
  input.className = "mw-search-box";
  input.placeholder = "Search topics…";
  input.setAttribute("aria-label", "Search articles");
  wrap.appendChild(input);

  const results = el(doc, "div", "mw-search-results");
  wrap.appendChild(results);

  input.addEventListener("input", () => {
    applySearchQuery(doc, input.value, results, opts.menuBody, opts.search, opts.onNavigate);
  });
  return wrap;
}

export { snippet, applySearchQuery, renderSearchBox };
