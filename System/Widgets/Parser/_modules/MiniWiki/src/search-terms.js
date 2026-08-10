/**
 * search-terms.js — deterministic "key search terms" generation
 * (requirement 9). NOT an LLM at runtime: a fixed, reproducible scoring
 * pass over the article's own title, ancestor titles, and distinctive
 * body words, minus STOPWORDS. Same input -> same output, every time
 * (asserted by tests/test-search-terms.mjs).
 */

const STOPWORDS = new Set(
  (
    "a an the of and or but if then else for to in on at by with from as is " +
    "are was were be been being this that these those it its into onto over " +
    "under not no nor so than too very can will would should could may might " +
    "must shall do does did have has had which who whom whose what when " +
    "where why how also such each other some any all both more most own " +
    "same per via"
  ).split(/\s+/)
);

function tokenizeWords(text) {
  if (!text) return [];
  return text.match(/[A-Za-z][A-Za-z'-]*/g) || [];
}

/** A capitalised token is a candidate proper noun / technical term. */
function isCapitalisedTechnical(word) {
  return /^[A-Z]/.test(word) && word.length > 1;
}

/**
 * generateSearchTerms(article, ancestors, limit = 10) -> string[]
 * Weighted term set: title words (weight 3) > ancestor-title words
 * (weight 2) > capitalised/technical body words (weight 1). Deduplicated,
 * stopworded, sorted by weight desc then alphabetically for a stable
 * order across runs.
 */
function generateSearchTerms(article, ancestors = [], limit = 10) {
  const scores = new Map();
  const display = new Map();

  function add(word, weight) {
    const key = word.toLowerCase();
    if (key.length < 3 || STOPWORDS.has(key)) return;
    const prior = scores.get(key) || 0;
    scores.set(key, Math.max(prior, weight));
    if (!display.has(key)) display.set(key, word);
  }

  tokenizeWords(article.title).forEach((w) => add(w, 3));
  ancestors.forEach((a) => tokenizeWords(a.title).forEach((w) => add(w, 2)));

  const bodySource = [
    article.lead || "",
    (article.characteristics || []).join(" "),
    (article.examples || []).join(" "),
  ].join(" ");
  tokenizeWords(bodySource).forEach((w) => {
    if (isCapitalisedTechnical(w)) add(w, 1);
  });

  return [...scores.keys()]
    .sort((a, b) => {
      const diff = scores.get(b) - scores.get(a);
      return diff !== 0 ? diff : a < b ? -1 : a > b ? 1 : 0;
    })
    .slice(0, limit)
    .map((key) => display.get(key) || key);
}

export { STOPWORDS, tokenizeWords, generateSearchTerms };
