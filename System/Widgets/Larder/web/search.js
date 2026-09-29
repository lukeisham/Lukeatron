// Ranks the already-loaded recipe list against what has been typed. Pure: no DOM, no fetch, so the
// node tests call it directly. The panel calls rank() per keystroke and matchReason() per result row.

const TITLE_SCORE = 4;
const TITLE_PREFIX_BONUS = 2;
const INGREDIENT_SCORE = 2;
const OTHER_FIELD_SCORE = 1;

function queryWords(query) {
  return String(query ?? "").toLowerCase().split(/\s+/).filter(Boolean);
}

// Lowercased once per recipe per call, so the per-word loops below only do substring checks.
function searchable(recipe) {
  return {
    title: String(recipe.title ?? "").toLowerCase(),
    ingredients: (recipe.ingredients ?? []).map((line) => String(line).toLowerCase()),
    based_on: String(recipe.based_on ?? "").toLowerCase(),
    source: String(recipe.source ?? "").toLowerCase(),
    mode: String(recipe.mode ?? "").toLowerCase(),
  };
}

function scoreWord(fields, word) {
  let score = 0;
  if (fields.title.includes(word)) {
    score += TITLE_SCORE + (fields.title.startsWith(word) ? TITLE_PREFIX_BONUS : 0);
  }
  if (fields.ingredients.some((line) => line.includes(word))) score += INGREDIENT_SCORE;
  for (const key of ["based_on", "source", "mode"]) {
    if (fields[key].includes(word)) score += OTHER_FIELD_SCORE;
  }
  return score;
}

// Total score, or 0 when any word matches nowhere (the AND rule).
function scoreRecipe(recipe, words) {
  const fields = searchable(recipe);
  let total = 0;
  for (const word of words) {
    const wordScore = scoreWord(fields, word);
    if (wordScore === 0) return 0;
    total += wordScore;
  }
  return total;
}

const newestFirst = (a, b) => String(b.saved ?? "").localeCompare(String(a.saved ?? ""));

export function rank(recipes, query) {
  if (!Array.isArray(recipes)) {
    console.warn("search.rank: recipes must be an array, got", typeof recipes);
    return [];
  }
  const words = queryWords(query);
  if (words.length === 0) return [...recipes].sort(newestFirst);
  return recipes
    .map((recipe) => ({ recipe, score: scoreRecipe(recipe, words) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || newestFirst(a.recipe, b.recipe))
    .map((entry) => entry.recipe);
}

// The result row's "why did this match" line. Empty when the title already explains the hit.
export function matchReason(recipe, query) {
  const words = queryWords(query);
  if (words.length === 0) return "";
  const fields = searchable(recipe);
  const hits = (text) => words.some((word) => text.includes(word));
  if (hits(fields.title)) return "";
  const ingredientIndex = fields.ingredients.findIndex(hits);
  if (ingredientIndex !== -1) return `in ingredients: ${recipe.ingredients[ingredientIndex]}`;
  if (hits(fields.based_on)) return `based on: ${recipe.based_on}`;
  if (hits(fields.source)) return `in source: ${recipe.source}`;
  if (hits(fields.mode)) return `in mode: ${recipe.mode}`;
  return "";
}
