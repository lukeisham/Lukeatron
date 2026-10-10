// The panel's only network access (JS-5): Home's two Larder routes. Rejects with an Error on any
// non-OK reply so callers can show their error state.

async function getJson(path) {
  const response = await fetch(path, { credentials: "same-origin" });
  if (!response.ok) throw new Error(`Larder: ${path} answered ${response.status}`);
  return response.json();
}

export async function getRecipes() {
  const { recipes } = await getJson("/api/larder/recipes");
  if (!Array.isArray(recipes)) throw new Error("Larder: the recipe list reply had no recipes array");
  return recipes;
}

export function getRecipe(slug) {
  return getJson(`/api/larder/recipe/${encodeURIComponent(slug)}`);
}
