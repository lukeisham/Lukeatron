// The Larder panel over Home: a sheet with a spine (title, count) and a leaf (search + index, or one
// recipe). Home calls mount() once at page load and open()/close() from the command bar.
import { getRecipes, getRecipe } from "./api.js";
import { rank, matchReason } from "./search.js";
import { renderRecipe, displayMode, joinParts } from "./recipe-view.js";

const STYLESHEET = new URL("./larder.css", import.meta.url).href;
const OPEN_CLASS = "larder-open";
const FOCUSABLE = "button, input, a[href]";
const MESSAGES = {
  loading: "Loading recipes…",
  failed: "Couldn't load the recipes.",
  none: "No recipes yet — add one with !TabularRecipe.",
  recipeFailed: "Couldn't open that recipe.",
};
const noMatch = (query) => `No recipes match “${query}”.`;
const countText = (n) => `${n} ${n === 1 ? "recipe" : "recipes"}`;

// Static markup only — no recipe text is ever interpolated here (JS-6).
const TEMPLATE = `
  <section class="larder-sheet" role="dialog" aria-modal="true" aria-labelledby="larder-title">
    <div class="larder-spine">
      <h2 class="larder-title" id="larder-title">Larder</h2>
      <hr class="larder-rule">
      <p class="larder-purpose">Saved recipes, cooked from here.</p>
      <p class="larder-count"></p>
    </div>
    <div class="larder-leaf">
      <button type="button" class="larder-close" aria-label="Close">✕</button>
      <div class="larder-scroll">
        <div class="larder-list">
          <label class="larder-search-label" for="larder-search">Search recipes</label>
          <input type="search" id="larder-search" class="larder-search" autocomplete="off"
                 placeholder="recipes, ingredients, source…" role="combobox" aria-expanded="true"
                 aria-controls="larder-results" aria-autocomplete="list">
          <div class="larder-message-row">
            <p class="larder-message" role="status"></p>
            <button type="button" class="larder-retry" hidden>Retry</button>
          </div>
          <ul class="larder-results" id="larder-results" role="listbox" aria-label="Recipes"></ul>
        </div>
        <div class="larder-detail" hidden></div>
      </div>
    </div>
  </section>`;

function addStylesheetOnce() {
  if (document.querySelector(`link[href="${STYLESHEET}"]`)) return;
  const sheet = document.createElement("link");
  sheet.rel = "stylesheet";
  sheet.href = STYLESHEET;
  document.head.append(sheet);
}

function textNode(tag, className, text) {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
}

function resultRow(recipe, query, index) {
  const row = document.createElement("li");
  row.className = "larder-row";
  row.id = `larder-row-${index}`;
  row.setAttribute("role", "option");
  row.dataset.slug = recipe.slug;
  const head = textNode("span", "larder-row-head", "");
  head.append(
    textNode("span", "larder-row-title", recipe.title),
    textNode("span", "larder-leader", ""),
    textNode("span", "larder-row-time", recipe.time_total ?? ""),
  );
  row.append(head, textNode("span", "larder-row-meta", joinParts(displayMode(recipe.mode), recipe.source)));
  const reason = matchReason(recipe, query);
  if (reason) row.append(textNode("span", "larder-row-reason", reason));
  return row;
}

export function mount(host, { onClose } = {}) {
  addStylesheetOnce();
  host.classList.add("larder-host");
  host.innerHTML = `<div class="larder-backdrop" hidden>${TEMPLATE}</div>`;
  const backdrop = host.firstElementChild;
  const sheet = backdrop.querySelector(".larder-sheet");
  const countLine = backdrop.querySelector(".larder-count");
  const scroller = backdrop.querySelector(".larder-scroll");
  const listView = backdrop.querySelector(".larder-list");
  const detailView = backdrop.querySelector(".larder-detail");
  const search = backdrop.querySelector(".larder-search");
  const message = backdrop.querySelector(".larder-message");
  const retry = backdrop.querySelector(".larder-retry");
  const results = backdrop.querySelector(".larder-results");

  let recipes = [];
  let listLoaded = false;
  let shown = [];
  let active = 0;
  let isOpen = false;
  let recipeHandle = null;
  let listScroll = 0;
  let openRequest = 0;

  const showingRecipe = () => !detailView.hidden;

  function setMessage(text, { withRetry = false } = {}) {
    message.textContent = text;
    retry.hidden = !withRetry;
  }

  function highlight(index) {
    active = index;
    for (const [i, row] of [...results.children].entries()) {
      row.setAttribute("aria-selected", String(i === index));
    }
    const row = results.children[index];
    if (row) {
      search.setAttribute("aria-activedescendant", row.id);
      row.scrollIntoView?.({ block: "nearest" });
    } else {
      search.removeAttribute("aria-activedescendant");
    }
  }

  function renderResults() {
    if (!listLoaded) return;
    const query = search.value.trim();
    shown = rank(recipes, query);
    results.replaceChildren(...shown.map((recipe, index) => resultRow(recipe, query, index)));
    if (recipes.length === 0) setMessage(MESSAGES.none);
    else if (shown.length === 0) setMessage(noMatch(query));
    else setMessage("");
    highlight(0);
  }

  async function loadList() {
    const request = ++openRequest;
    listLoaded = false;
    results.replaceChildren();
    countLine.textContent = "";
    setMessage(MESSAGES.loading);
    try {
      const loaded = await getRecipes();
      if (request !== openRequest) return;
      recipes = loaded;
      listLoaded = true;
      countLine.textContent = countText(recipes.length);
      renderResults();
    } catch (failure) {
      if (request !== openRequest) return;
      console.warn("Larder: could not load the recipe list", failure);
      setMessage(MESSAGES.failed, { withRetry: true });
    }
  }

  function leaveRecipe() {
    recipeHandle?.destroy();
    recipeHandle = null;
    detailView.replaceChildren();
    detailView.hidden = true;
    listView.hidden = false;
    scroller.scrollTop = listScroll;
  }

  function back() {
    leaveRecipe();
    search.focus();
  }

  async function openRecipe(slug) {
    const request = ++openRequest;
    let recipe;
    try {
      recipe = await getRecipe(slug);
    } catch (failure) {
      if (request !== openRequest) return;
      console.warn("Larder: could not load recipe", slug, failure);
      // A failure from a "Based on" link happens inside the recipe view, where the message row is hidden.
      if (showingRecipe()) back();
      setMessage(MESSAGES.recipeFailed);
      return;
    }
    if (request !== openRequest) return;
    if (!showingRecipe()) listScroll = scroller.scrollTop;
    recipeHandle?.destroy();
    listView.hidden = true;
    detailView.hidden = false;
    recipeHandle = renderRecipe(detailView, recipe, { recipes, onBack: back, onOpen: openRecipe });
    scroller.scrollTop = 0;
    detailView.querySelector(".larder-back")?.focus();
  }

  function trapTab(event) {
    const focusable = [...sheet.querySelectorAll(FOCUSABLE)].filter((node) => !node.disabled && !node.closest("[hidden]"));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || !sheet.contains(document.activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !sheet.contains(document.activeElement))) {
      event.preventDefault();
      first.focus();
    }
  }

  function onKeydown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      if (showingRecipe()) back();
      else close();
    } else if (event.key === "Tab") {
      trapTab(event);
    } else if (showingRecipe() || event.target !== search) {
      return;
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (shown.length) highlight((active + (event.key === "ArrowDown" ? 1 : -1) + shown.length) % shown.length);
    } else if (event.key === "Enter" && shown[active]) {
      event.preventDefault();
      openRecipe(shown[active].slug);
    }
  }

  function open() {
    if (isOpen) {
      search.focus();
      return;
    }
    isOpen = true;
    listScroll = 0;
    backdrop.hidden = false;
    scroller.scrollTop = 0;
    document.documentElement.classList.add(OPEN_CLASS);
    document.addEventListener("keydown", onKeydown);
    loadList();
    search.focus();
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    openRequest += 1;
    document.removeEventListener("keydown", onKeydown);
    document.documentElement.classList.remove(OPEN_CLASS);
    leaveRecipe();
    search.value = "";
    backdrop.hidden = true;
    onClose?.();
  }

  // A drag that starts inside the sheet (selecting the copied list) and ends on the backdrop is not a backdrop click.
  let pressedOnBackdrop = false;
  backdrop.addEventListener("mousedown", (event) => { pressedOnBackdrop = event.target === backdrop; });
  backdrop.addEventListener("click", (event) => {
    if ((event.target === backdrop && pressedOnBackdrop) || event.target.closest(".larder-close")) close();
  });
  results.addEventListener("click", (event) => {
    const row = event.target.closest(".larder-row");
    if (row) openRecipe(row.dataset.slug);
  });
  retry.addEventListener("click", () => {
    loadList();
    search.focus();
  });
  search.addEventListener("input", renderResults);

  return { open, close };
}
