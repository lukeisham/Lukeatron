// One recipe's page inside the leaf: title, deck, the table image, Method, and the margin column.
// larder.js calls renderRecipe() and keeps the returned handle until the view changes.
// Every string from a recipe goes in through textContent; the SVG only ever becomes an <img>.

const COPY_LABEL = "Copy list";
const FALLBACK_LABEL = "Select and copy";
const COPIED_TEXT = "Copied ✓";
const SELECTED_TEXT = "Selected — now copy it";
const CONFIRMATION_MS = 2000;

function element(doc, tag, className, text) {
  const node = doc.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export const displayMode = (mode) => (mode ? mode[0].toUpperCase() + mode.slice(1) : "");
export const joinParts = (...parts) => parts.filter(Boolean).join(" · ");

function paragraphs(doc, className, text) {
  return String(text ?? "").split("\n").filter((line) => line.trim())
    .map((line) => element(doc, "p", className, line));
}

function section(doc, heading, ...body) {
  const block = element(doc, "section", `larder-block larder-block-${heading.toLowerCase().replace(/ /g, "-")}`);
  block.append(element(doc, "h4", "larder-block-title", heading), ...body);
  return block;
}

function svgImage(doc, recipe, blobUrls) {
  if (!recipe.svg) return null;
  const url = URL.createObjectURL(new Blob([recipe.svg], { type: "image/svg+xml" }));
  blobUrls.push(url);
  const image = element(doc, "img", "larder-table");
  image.alt = `Ingredient and step table for ${recipe.title}`;
  image.src = url;
  // A malformed SVG would otherwise leave a broken-image box with no explanation (JS-2).
  image.addEventListener("error", () => {
    console.warn("Larder: the table image would not draw for", recipe.slug);
    image.replaceWith(element(doc, "p", "larder-message", "The table couldn't be drawn."));
  });
  return image;
}

// based_on may hold a slug or a title; only a recipe present in the loaded list becomes a link.
function findBasis(recipes, basedOn) {
  const wanted = String(basedOn).toLowerCase();
  return recipes.find((r) => r.slug.toLowerCase() === wanted || r.title.toLowerCase() === wanted);
}

function basedOnBlock(doc, recipe, recipes, onOpen) {
  const basis = findBasis(recipes, recipe.based_on);
  if (!basis) return section(doc, "Based on", element(doc, "p", "", recipe.based_on));
  const link = element(doc, "button", "larder-link", basis.title);
  link.type = "button";
  link.addEventListener("click", () => onOpen(basis.slug));
  return section(doc, "Based on", link);
}

function ingredientsBlock(doc, lines, clipboard, timers) {
  const list = element(doc, "ul", "larder-ingredients");
  list.append(...lines.map((line) => element(doc, "li", "", line)));
  const button = element(doc, "button", "larder-copy", COPY_LABEL);
  button.type = "button";
  const status = element(doc, "span", "larder-copy-status");
  status.setAttribute("aria-live", "polite");

  function selectList() {
    const selection = list.ownerDocument.defaultView?.getSelection?.();
    if (!selection) {
      console.warn("Larder: no text selection available for the copy fallback");
      return;
    }
    const range = list.ownerDocument.createRange();
    range.selectNodeContents(list);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function say(text) {
    clearTimeout(timers.confirmation);
    status.textContent = text;
    timers.confirmation = setTimeout(() => { status.textContent = ""; }, CONFIRMATION_MS);
  }

  async function copy() {
    if (button.textContent === FALLBACK_LABEL) {
      selectList();
      say(SELECTED_TEXT);
      return;
    }
    try {
      if (!clipboard?.writeText) throw new Error("clipboard unavailable");
      await clipboard.writeText(lines.join("\n"));
      say(COPIED_TEXT);
    } catch {
      button.textContent = FALLBACK_LABEL;
      selectList();
      say(SELECTED_TEXT);
    }
  }
  button.addEventListener("click", copy);

  const head = element(doc, "div", "larder-copy-row");
  head.append(button, status);
  return section(doc, "Ingredients", head, list);
}

function marginColumn(doc, recipe, options, timers) {
  const margin = element(doc, "aside", "larder-margin");
  if (recipe.ingredients?.length) margin.append(ingredientsBlock(doc, recipe.ingredients, options.clipboard, timers));
  if (recipe.equipment?.length) {
    const list = element(doc, "ul", "larder-equipment");
    list.append(...recipe.equipment.map((item) => element(doc, "li", "", item)));
    margin.append(section(doc, "Equipment", list));
  }
  if (recipe.source) margin.append(section(doc, "Source", element(doc, "p", "", recipe.source)));
  if (recipe.based_on) margin.append(basedOnBlock(doc, recipe, options.recipes, options.onOpen));
  if (recipe.notes) margin.append(section(doc, "Notes", ...paragraphs(doc, "", recipe.notes)));
  return margin;
}

/**
 * Replaces container's children with the recipe page. Returns { destroy } — call it when the view
 * changes so the blob URL is revoked and the confirmation timer stops.
 */
export function renderRecipe(container, recipe, { recipes = [], onBack, onOpen, clipboard = globalThis.navigator?.clipboard } = {}) {
  const doc = container.ownerDocument;
  const blobUrls = [];
  const timers = { confirmation: 0 };

  const back = element(doc, "button", "larder-back", "‹ Back to index");
  back.type = "button";
  back.addEventListener("click", () => onBack());

  const deck = joinParts(displayMode(recipe.mode), recipe.time_total, recipe.serves && `serves ${recipe.serves}`);
  const method = element(doc, "section", "larder-method");
  method.append(element(doc, "h4", "larder-block-title", "Method"), ...paragraphs(doc, "", recipe.method));
  const columns = element(doc, "div", "larder-columns");
  columns.append(method, marginColumn(doc, recipe, { recipes, onOpen, clipboard }, timers));

  const page = element(doc, "article", "larder-recipe");
  page.append(back, element(doc, "h3", "larder-recipe-title", recipe.title));
  if (deck) page.append(element(doc, "p", "larder-deck", deck));
  const image = svgImage(doc, recipe, blobUrls);
  if (image) page.append(image);
  page.append(columns);
  container.replaceChildren(page);

  return {
    destroy() {
      clearTimeout(timers.confirmation);
      blobUrls.splice(0).forEach((url) => URL.revokeObjectURL(url));
    },
  };
}
