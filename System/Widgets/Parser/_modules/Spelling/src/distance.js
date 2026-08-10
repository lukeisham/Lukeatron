/**
 * distance.js — weighted OSA (optimal-string-alignment) Damerau-Levenshtein
 * distance with QWERTY-adjacency-weighted substitution/transposition cost
 * (spec §6; `fuzzy-matching.md` §1/§4). Two-row space optimisation.
 *
 * A QWERTY-adjacent substitution or transposition costs 0.5 instead of 1.0,
 * so "teh"->"the" (adjacent transposition) ranks closer than "teh"->"tea"
 * (non-adjacent substitution) at the same raw edit count.
 */
import { areAdjacent } from "./qwerty.js";

const SUB_COST_ADJACENT = 0.5;
const SUB_COST_DEFAULT = 1.0;
const INDEL_COST = 1.0;

/**
 * weightedOSADistance(a, b, maxDist = Infinity) -> number
 * Returns the weighted OSA distance, or `maxDist + 1` if it provably
 * exceeds `maxDist` (early-exit, mirrors the research's pseudocode).
 */
function weightedOSADistance(a, b, maxDist = Infinity) {
  if (Math.abs(a.length - b.length) > maxDist) return maxDist + 1;
  const len1 = a.length;
  const len2 = b.length;

  // OSA's transposition rule needs the row from TWO steps back (d[i-2][j-2]),
  // not one (a naive two-row version — including the research pseudocode
  // this was first drafted from — silently degrades to plain weighted
  // Levenshtein, undercounting transpositions as distance 2 instead of 1;
  // caught by this file's own tests, e.g. "teh"->"the" must be 1). Three
  // rows are kept for that reason; still O(min(m,n)) space, just x3.
  let prevPrev = new Array(len2 + 1).fill(Infinity);
  let prev = new Array(len2 + 1);
  let curr = new Array(len2 + 1);
  for (let j = 0; j <= len2; j++) prev[j] = j;

  for (let i = 1; i <= len1; i++) {
    curr[0] = i;
    let minInRow = i;

    for (let j = 1; j <= len2; j++) {
      const same = a[i - 1] === b[j - 1];
      const subCost = same ? 0 : (areAdjacent(a[i - 1], b[j - 1]) ? SUB_COST_ADJACENT : SUB_COST_DEFAULT);

      const del = curr[j - 1] + INDEL_COST;
      const ins = prev[j] + INDEL_COST;
      const sub = prev[j - 1] + subCost;
      curr[j] = Math.min(del, ins, sub);

      if (
        i > 1 && j > 1 &&
        a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]
      ) {
        const transposeCost = areAdjacent(a[i - 1], a[i - 2]) ? SUB_COST_ADJACENT : SUB_COST_DEFAULT;
        curr[j] = Math.min(curr[j], prevPrev[j - 2] + transposeCost);
      }

      if (curr[j] < minInRow) minInRow = curr[j];
    }

    if (minInRow > maxDist) return maxDist + 1;
    [prevPrev, prev, curr] = [prev, curr, prevPrev];
  }

  return prev[len2];
}

export { weightedOSADistance, SUB_COST_ADJACENT, SUB_COST_DEFAULT, INDEL_COST };
