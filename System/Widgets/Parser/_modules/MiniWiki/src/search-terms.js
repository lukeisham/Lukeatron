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
 * midSentenceCapitals(text) -> Set<string> (lowercased keys)
 * Every sentence's FIRST word is capitalised by orthography, not because it
 * is a term ("Contains exactly one independent clause" would otherwise yield
 * "Contains"). We therefore only trust a capital that appears somewhere other
 * than a sentence opening. A word capitalised in both positions still counts,
 * because its mid-sentence occurrence vouches for it.
 */
function midSentenceCapitals(text) {
  const keys = new Set();
  if (!text) return keys;
  text.split(/(?<=[.!?:;])\s+|\n+/).forEach((sentence) => {
    tokenizeWords(sentence)
      .slice(1)
      .forEach((word) => {
        if (isCapitalisedTechnical(word)) keys.add(word.toLowerCase());
      });
  });
  return keys;
}

/**
 * generateSearchTerms(article, ancestors, limit = 10) -> string[]
 * Weighted term set: title words (weight 3) > ancestor-title words
 * (weight 2) > capitalised/technical words from the article's own explanatory
 * prose, excluding examples and sentence-initial capitals (weight 1). Deduplicated,
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

  // Examples are deliberately EXCLUDED. They are illustrative quotations, so
  // their proper nouns describe the quotation's source, not the topic — "Simple
  // Sentence" was yielding Ishmael/Melville/Moby-Dick off "Call me Ishmael."
  // These terms exist to search the web about the TOPIC, so only the article's
  // own explanatory prose may contribute them.
  const bodySource = [
    article.lead || "",
    (article.characteristics || []).join(" "),
  ].join(" ");
  const trusted = midSentenceCapitals(bodySource);
  tokenizeWords(bodySource).forEach((w) => {
    if (isCapitalisedTechnical(w) && trusted.has(w.toLowerCase())) add(w, 1);
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
