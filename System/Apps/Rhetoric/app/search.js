/** Exact and fuzzy device-name matching, both case-insensitive. */

// Below this length fuzzy would match almost anything, so it behaves as exact.
const FUZZY_MIN_LENGTH = 5;
const LONG_QUERY_LENGTH = 8;

function allowedTypos(query) {
  return query.length >= LONG_QUERY_LENGTH ? 2 : 1;
}

/**
 * Smallest edit distance between `pattern` and any substring of `text`
 * (Sellers' approximate-substring variant of Levenshtein): the free start
 * column lets the match begin anywhere in `text`.
 */
function bestSubstringDistance(pattern, text) {
  let previous = Array.from({ length: text.length + 1 }, () => 0);
  for (let row = 1; row <= pattern.length; row += 1) {
    const current = [row];
    for (let col = 1; col <= text.length; col += 1) {
      const substitution = previous[col - 1] + (pattern[row - 1] === text[col - 1] ? 0 : 1);
      current[col] = Math.min(substitution, previous[col] + 1, current[col - 1] + 1);
    }
    previous = current;
  }
  return Math.min(...previous);
}

export function matchesName(name, query, fuzzy) {
  const needle = query.trim().toLowerCase();
  if (needle === '') return true;
  const haystack = name.toLowerCase();
  if (haystack.includes(needle)) return true;
  if (!fuzzy || needle.length < FUZZY_MIN_LENGTH) return false;
  return bestSubstringDistance(needle, haystack) <= allowedTypos(needle);
}
