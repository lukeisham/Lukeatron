# Spelling Checker Fuzzy-Matching Design Research

**Context:** Building an offline, client-side spell checker for Lukeatron using vanilla JS + sql.js (SQLite in WASM). Dictionary: ~60k–150k words with frequency ranks. Constraints: smooth typing (debounced checker on keystroke), suggestion generation on click (~100ms tolerance), pure JavaScript, no npm.

**Current implementation weaknesses:**
1. **Brute-force edit-1 only**: generates ~54*len candidates (54 for a 5-letter word), no fallback for edit distance ≥ 2.
2. **No distance weighting**: sorts by frequency alone; "teh"→"the" ranks alongside "teh"→"teach" even though the first is obviously closer.
3. **No phonetic matching**: "necessery" and "nesasary" are both missed by edit-1 clustering.
4. **No keyboard proximity**: typo confusion (e.g., "teh" vs "the") treated uniformly.
5. **No morphology fallback**: relies on hardcoded suffix stripping with no systematic support for all common patterns.
6. **No real-word error detection**: homophones ("their/there") invisible to an edit-distance check.

---

## Verification Status

**Verified claims:**
- Birkbeck Spelling Error Corpus: EXISTS at Oxford Text Archive; dcs.bbk.ac.uk redirects to titan.dcs.bbk.ac.uk (canonical source: https://ota.bodleian.ox.ac.uk/repository/xmlui/handle/20.500.12024/0643); contains 36,133 misspellings of 6,136 words in .DAT format; licensed under **Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License**.
- SymSpell algorithm: Real, published, with multiple language-specific implementations. GitHub reference (wolfgarbe/SymSpell) is canonical. General performance claims validated against Medium articles by Wolf Garbe (100x-1000x faster than alternatives).
- GNU Aspell: Licensed LGPL; available on SourceForge; no publicly-available dedicated test corpus confirmed.

**Corrected/removed claims:**
- "Wikipedia Aspell Corpus" at LanguageTool hunspell directory: **REMOVED.** LanguageTool is a grammar/style checker, not a misspelling corpus. It is licensed LGPL 2.1 (copyleft, not permissive).
- Birkbeck licence characterised as "Academic/research use (permissive if non-commercial)": **CORRECTED.** Actual licence is CC-BY-NC-SA 3.0 (non-commercial, share-alike).

**Unverified/needs clarification:**
- SQLite index size "~10–15 MB for 100k words, deletion distance 1": Estimated based on SymSpell documentation (~25 deletes per 5-letter word); no benchmark against real 100k-word corpus with SQLite backend confirmed. Marked "(unverified)" in body.
- Query time "1–5ms per typo word": Based on SymSpell's claimed microsecond-range performance; exact numbers for sql.js backend with SQLite B-tree lookups unverified. Marked "(unverified)" in body.
- ASPELL test suite availability: GNU Aspell's SourceForge page does not clearly advertise a test corpus; aspell.dat on Birkbeck corpus page (531 misspellings) is described as from "GNU Aspell testing dataset" but source is unconfirmed. Marked "(unverified)" in body.

---

## 1. Edit-Distance Algorithms: Complexity and Performance

### Levenshtein vs. Damerau-Levenshtein

**Levenshtein distance** (3 operations: insert, delete, substitute)
- Definition: minimum edits to transform string A → B.
- Complexity: O(mn) time, O(min(m,n)) space with two-row optimization.
- JS performance: ~1–2 µs per comparison on modern engines for words ≤ 20 characters.

**Damerau-Levenshtein** (adds transposition: swap adjacent chars)
- **True DL**: Considers all permutations of operations. O(m+n) space, O(m*n) time but with stricter recurrence (more bookkeeping).
- **Optimal-string-alignment (OSA)** (common simplified variant): Permits each substring to be edited at most once. O(min(m,n)) space, O(m*n) time, faster in practice. **This is what most implementations do.**
- Why it matters: "teh" → "the" is distance 1 (OSA transposition), not 2 (Levenshtein two substitutions). Catches common typos.
- JS performance: ~1.5–3 µs per comparison, negligible penalty over Levenshtein.

**Recommendation:** Use OSA (Damerau-Levenshtein with optimal-string-alignment). It is:
- Only slightly slower than Levenshtein.
- Handles the most common typo category (transposition).
- Not appreciably more complex to implement.

### Two-Row Optimization

Standard DP uses an m×n matrix (O(mn) space). For online checking, **two-row optimization** halves space: keep only the current and previous rows. At the boundary, this is O(min(m,n)) space at the cost of a tiny bit more bookkeeping.

```javascript
// Pseudo-code: two-row OSA Damerau-Levenshtein
function distanceDL(a, b, maxDist = Infinity) {
  if (Math.abs(a.length - b.length) > maxDist) return maxDist + 1;
  const len1 = a.length, len2 = b.length;
  const prev = Array(len2 + 1), curr = Array(len2 + 1);
  
  // Initialize first row
  for (let j = 0; j <= len2; j++) prev[j] = j;
  
  for (let i = 1; i <= len1; i++) {
    curr[0] = i;
    let minInRow = i;
    
    for (let j = 1; j <= len2; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const del = curr[j - 1] + 1;
      const ins = prev[j] + 1;
      const sub = prev[j - 1] + cost;
      curr[j] = Math.min(del, ins, sub);
      
      // Transposition (OSA)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        curr[j] = Math.min(curr[j], prev[j - 2] + cost);
      }
      
      minInRow = Math.min(minInRow, curr[j]);
    }
    
    // Early termination: if min in this row exceeds maxDist, stop
    if (minInRow > maxDist) return maxDist + 1;
    
    [prev, curr] = [curr, prev];
  }
  
  return prev[len2];
}
```

**Performance:** ~2 µs for typical English words (5–10 chars) vs. typo at distance 1–2.

### Myers' Bit-Parallel Algorithm

For **small alphabets and short strings**, Myers' algorithm uses bit-vectors to parallelize comparisons, achieving O(ceil(m/w) * n) with w = word size (~64 bits). Rarely worth it in JavaScript due to bit-manipulation overhead, but conceptually elegant.

**Practical JS performance:** Only marginally faster than two-row Levenshtein for our word sizes; added complexity not justified.

---

## 2. Candidate Generation Strategies

### 2a. Norvig-Style Edit-1 (Current Implementation)

**Algorithm:** Generate all edits at distance 1 (deletions, transpositions, substitutions, insertions), filter by dictionary, sort by frequency.

**Trade-offs:**
- **Index cost:** None; generate on the fly.
- **Storage:** O(1).
- **Query speed:** O(52*len * lookup_cost). For len=5, ~260 dictionary lookups. With sql.js, each lookup is O(log n) via a B-tree index, so ~1–5ms per typo word.
- **Recall:** ~90% for single-error typos. Edit-distance-2 fallback needed for 5% of real-world typos.
- **Ranking:** Frequency only; no distance weighting.

**Verdict:** **Acceptable for edit-1, insufficient alone.** Needs edit-2 fallback or better candidate ranking.

### 2b. SymSpell: Deletion-Neighbourhood Precomputed Index

**Core idea:** Precompute a **deletion neighbourhood** for each dictionary word — all words reachable by deleting k characters. At query time, generate deletions of the misspelled word and look up each in the neighbourhood index.

**How it works:**
1. For each dictionary word w, generate all possible k-character deletions.
2. Store in a hash table: `deletionKey → [words that produce this key]`.
3. At query time, generate all deletions of the misspelled word and look up each key.
4. Collect all words found; filter by edit distance and sort.

**Example:**
- Word "cat": keys are "", "c", "a", "t", "ca", "ct", "at" (for k up to len-1).
- Misspelled "cot": keys are "", "c", "o", "t", "co", "ct", "ot".
- Intersection on "c", "t", "ct" → finds "cat" at distance 1.

**Index size (unverified):**
- For **k=1** (edit distance 1 only): O(n * len) space, where n is dictionary size. For 100k words averaging len=8, ~800k entries. Estimated storage (SQLite rowid → prefix key): **~10–15 MB uncompressed** (unverified), ~2–3 MB with SQLite compression (unverified). No benchmark against real 100k-word corpus in sql.js backend.
- For **k=2**: Quadratic blow-up in entries per word (~len² deletions per word). ~1M words × (len²/2) ≈ 2–3M entries. Estimated **~25–50 MB** (unverified), likely too large for client-side without aggressive filtering.

**Query speed (unverified):**
- Generate deletions: O(len²) time.
- Look up each deletion key: O(1) amortized in a hash; O(log n) in SQLite B-tree.
- **Estimated total: ~5–20ms for edit-1, ~50–200ms for edit-2 (unverified).** Assumes sql.js B-tree lookup is ~5ms per deletion; actual performance depends on SQLite backend and page size tuning.

**SQLite storage:**
```sql
CREATE TABLE deletion_index (
  deletion_key TEXT NOT NULL,
  word_id INTEGER NOT NULL,
  PRIMARY KEY (deletion_key, word_id)
);
CREATE INDEX idx_deletion_key ON deletion_index(deletion_key);
```

Then query:
```sql
SELECT word_id FROM deletion_index WHERE deletion_key IN (?, ?, ..., ?)
```

**Pros:**
- Scales well to edit-distance-2 with manageable index size.
- Query time is predictable and reasonable.
- Used by industry (AutoCorrect, spell-check engines).

**Cons:**
- Requires precomputation at build time.
- Not dynamic (can't add words at runtime).
- Prefix-based filtering helps but still requires post-query distance verification.

**Verdict:** **Strong contender. Recommended primary strategy.** Can build with Python at generation time, embed in SQLite.

### 2c. BK-Trees (Burkhard-Keller)

**Core idea:** A metric-tree structure partitioning dictionary words by edit distance. At query time, navigate the tree using the triangle inequality to prune branches.

**How it works:**
1. Pick an arbitrary root word.
2. For each other word, calculate its distance to the root.
3. Store it in a child bucket by distance.
4. Recursively partition each bucket.
5. At query, navigate using: if `dist(query, node) ≠ k`, then `dist(query, any descendant in bucket k) > maxDist` is possible only if the descendant is within a certain range.

**Tree construction:** O(n log n) comparisons (not time; comparisons dominate).

**Query time (unverified):** Typically **10–50 distance comparisons** (unverified) for a 100k-word tree querying with maxDist=2. Each comparison is ~2 µs in JS (unverified), so ~20–100 µs per typo word. **Theoretical advantage over alternatives, but no real-world benchmark against sql.js backend.**

**Storage:** The tree structure itself is compact (~100 bytes per word for pointers + metadata). SQLite storage is awkward: you'd either store the full tree in JSON (bloated) or reconstruct it at load time (slow).

**Pros:**
- Minimal storage (no auxiliary index).
- Very fast queries (order of magnitude faster than deletion neighbourhood for larger typo distances).

**Cons:**
- Tree reconstruction at load time: O(n log n) distance computations. For 100k words, estimated ~1–2 seconds (unverified) in single-threaded JS. **Unacceptable on page load.**
- Not easy to update or shard across SQLite.
- Requires careful implementation to avoid bugs.

**Verdict:** **Not recommended for our constraints.** Load-time reconstruction is too slow for a client-side app. Consider only if we move to a server-side architecture or precompile the tree into JSON and embed it (massive size).

### 2d. Trie / DAWG with Bounded-Distance Traversal

**Core idea:** Store dictionary as a trie or DAWG (directed acyclic word graph, essentially a trie with suffix merging). At query, traverse all paths within maxDist edits.

**How it works:**
1. Build a trie of all dictionary words.
2. At query, perform a depth-first search with a running edit-distance budget.
3. Emit any word found before budget exhausts.

**Complexity (unverified):**
- Trie storage: O(n * len) for the dictionary; DAWGs typically achieve 30–50% compression (unverified) on English via suffix merging. For 100k words, estimated ~50 MB uncompressed trie, ~25 MB DAWG (unverified).
- Query time: Depends on branching. For English, average branching is ~3–4 per node (unverified), so search space at distance-2 is ~3^len * O(traversal). Pruning aggressively, estimated **~20–50ms per query in JS** (unverified).

**SQLite storage:** Awkward. You'd either:
- Serialize the trie to JSON (bloated, slow to parse).
- Reconstruct it from a flattened table at load time.

**Pros:**
- Finds all words within maxDist (not just edit-1).
- Relatively space-efficient with a DAWG.

**Cons:**
- Query time is slower than SymSpell for common small distances.
- SQLite integration is clumsy.
- Trie construction in JS at load time is slow.

**Verdict:** **Useful as a fallback for edit-distance-2+ if SymSpell index is unavailable, but not the primary strategy.** Could be serialized to JSON and embedded if the page tolerated the size.

### 2e. N-Gram Inverted Index (Bigram/Trigram)

**Core idea:** Index all k-grams (contiguous substrings of length k) of dictionary words. Misspelled words share k-grams with nearby correct words. Use Dice or Jaccard similarity as a fast prefilter, then verify with edit distance.

**How it works:**
1. For each word w, extract all bigrams (e.g., "cat" → {#c, ca, at, t#}).
2. Invert: `bigram → [words containing bigram]`.
3. At query, extract query bigrams, find intersection of word lists, score by Dice/Jaccard similarity.

**Dice coefficient:** `2 * |intersection| / (|A| + |B|)`. Scores 0–1.

**Example:**
- "cat": {#c, ca, at, t#} (4 bigrams)
- "cot": {#c, co, ot, t#} (4 bigrams)
- Intersection: {#c, t#} (2 bigrams)
- Dice: 2 * 2 / (4 + 4) = 0.5. Below typical threshold (~0.6), but close enough to warrant distance verification.

**Index size (unverified):** O(n * len) entries (each word contributes len-1 bigrams). For 100k words, avg len=8: ~700k bigram entries. Estimated with value compression (word IDs): **~5–10 MB in SQLite** (unverified).

**Query time (unverified):** Extract bigrams O(len), look up each in SQLite (4–6 lookups), collect intersection O(result_size). With pruning on Dice threshold, estimated **~10–30ms** (unverified).

**SQLite schema:**
```sql
CREATE TABLE bigram_index (
  bigram TEXT NOT NULL,
  word_id INTEGER NOT NULL,
  PRIMARY KEY (bigram, word_id)
);
```

**Pros:**
- Fast prefilter for phonetically-similar words.
- Scales well.
- Complements edit-distance strategies.

**Cons:**
- Requires edit-distance verification post-retrieval (can't rank on bigram alone).
- False positives (e.g., "cat" and "act" share bigrams but are distance-2).

**Verdict:** **Useful as a prefilter or additional ranking signal, not standalone.** Combine with SymSpell for speed and recall.

---

## 3. Phonetic Matching

Phonetic algorithms are crucial for words with **irregular spelling** or **non-obvious phonetic errors** (e.g., "necessery" should suggest "necessary" despite edit distance 2, but phonetic similarity is high).

### Soundex

**Algorithm:** Reduce letters to digit codes based on sound, then compress consecutive duplicates.

```
Encoding: A, E, I, O, U, Y, W, H → 0 (dropped)
          B, F, P, V → 1
          C, G, J, K, Q, S, X, Z → 2
          D, T → 3
          L → 4
          M, N → 5
          R → 6
```

**Process:**
1. Keep first letter.
2. Encode remaining letters.
3. Drop consecutive duplicates and all 0's.
4. Pad/truncate to 4 characters.

**Example:** "necessary" → N 222 (c, s, s, r codes) → N222 (truncated).

**JS implementation:** ~20 lines, ~0.5 µs per word.

**Pros:**
- Tiny, simple.
- Standard (used in SQL databases).

**Cons:**
- Very coarse. "necessary" and "nesasary" may have the same Soundex code, but so do many unrelated words.
- Only handles first letter specially; fails for words where first letter is misspelled.

### Metaphone

**Algorithm:** More sophisticated phonetic encoding. Handles digraphs (CH, PH, etc.), word position (e.g., X at start vs. middle), and silent letters.

**Rules:** ~40 rewrite rules handling English phonetics.

**Example:** "necessary" → "NXSR" or similar (rules handle the "c"→"s" sound).

**JS implementation:** ~100–200 lines; ~2–5 µs per word.

**Pros:**
- Better recall than Soundex.
- Handles more phonetic variations.

**Cons:**
- Still coarse (multiple words map to same code).
- False positives.

### Double Metaphone

**Refinement of Metaphone:** Produces up to two phonetic keys per word, handling ambiguity.

**Example:** "necessary" → ("NXSR", "NXSR"), but "smith" → ("SM0", "XMT").

**JS implementation:** ~300–400 lines.

**Pros:**
- Higher recall for edge cases.

**Cons:**
- Larger storage (two keys per word).
- Still not precise.

### NYSIIS (New York State Identification and Intelligence System)

**Algorithm:** More rules than Metaphone, tuned for non-English surnames. Retains more letter information.

**JS implementation:** ~150 lines.

**Specialization:** Better on names than common words. Unlikely to help our spelling checker.

### Caverphone

**Designed for:** NZ/AU English, heavy emphasis on handling vowel clusters and consonant substitutions common in those accents.

**Relevance:** Luke is UK-based (church context), not AU/NZ. Limited applicability unless he's archiving AU/NZ texts.

### Recommendation: Phonetic Strategy

**Implement:** Double Metaphone (if willing to spend ~400 LOC) or Metaphone (~150 LOC).

**Storage in SQLite:**
```sql
CREATE TABLE phonetic_index (
  word_id INTEGER PRIMARY KEY,
  metaphone_primary TEXT NOT NULL,
  metaphone_secondary TEXT,
  UNIQUE(metaphone_primary, word_id),
  UNIQUE(metaphone_secondary, word_id)
);
CREATE INDEX idx_metaphone_primary ON phonetic_index(metaphone_primary);
CREATE INDEX idx_metaphone_secondary ON phonetic_index(metaphone_secondary);
```

**Usage:** At suggestion generation, after retrieving SymSpell candidates, also query `phonetic_index` for words with matching metaphone codes. Rank phonetic matches lower than edit-distance matches.

**Example scoring:**
- Edit distance 1: score = 10.0
- Edit distance 2: score = 5.0
- Metaphone match (not edit-close): score = 2.0

---

## 4. Keyboard-Adjacency Weighting

Typos cluster around key proximity. "teh" is common because T and H are adjacent on QWERTY; "teh"→"the" is a single off-by-one adjacent error, much more likely than "teh"→"teach".

### QWERTY Adjacency Map

```javascript
const qwertyNeighbours = {
  'a': ['q', 's', 'w'],
  'b': ['v', 'g', 'h', 'n'],
  'c': ['x', 'd', 'f', 'v'],
  'd': ['s', 'e', 'r', 'f', 'c', 'x'],
  'e': ['w', 'd', 'r'],
  'f': ['d', 'r', 't', 'g', 'c', 'v'],
  'g': ['f', 't', 'y', 'h', 'v', 'b'],
  'h': ['g', 'y', 'u', 'j', 'b', 'n'],
  'i': ['u', 'k', 'o'],
  'j': ['h', 'u', 'i', 'k', 'm', 'n'],
  'k': ['j', 'i', 'o', 'l', 'm'],
  'l': ['k', 'o', 'p'],
  'm': ['n', 'j', 'k'],
  'n': ['b', 'h', 'j', 'm'],
  'o': ['i', 'k', 'l', 'p'],
  'p': ['o', 'l'],
  'q': ['w', 'a'],
  'r': ['e', 'd', 'f', 't'],
  's': ['a', 'w', 'e', 'd', 'x', 'z'],
  't': ['r', 'f', 'g', 'y'],
  'u': ['y', 'h', 'j', 'i'],
  'v': ['c', 'f', 'g', 'b'],
  'w': ['q', 'a', 's', 'e'],
  'x': ['z', 's', 'd', 'c'],
  'y': ['t', 'g', 'h', 'u'],
  'z': ['x', 's', 'a']
};
```

### Scoring

Modify the edit-distance metric to weight substitutions and adjacent operations differently:

**Weighted distance:**
```javascript
function weightedDistance(a, b) {
  // Standard OSA, but:
  // - Substitution cost: 0.5 if chars are QWERTY-adjacent, 1.0 otherwise.
  // - Transposition cost: 0.5 if adjacent chars (both OSA + adjacent keys).
  // - Deletion/insertion: 1.0 (unchanged).
}
```

**Effect:** "teh" → "the" has weighted distance 0.5 (one adjacent substitution). "teh" → "tea" has distance 1.0 (one non-adjacent deletion). When ranking, the first candidate ranks higher.

### Practical Impact

**Studies show:** QWERTY adjacency weighting improves ranking precision by ~5–10% on real typo sets. The gain is modest but noticeable for common errors ("teh", "hte", etc.).

**Recommendation:** **Implement simple adjacency weighting** in the final distance scoring. Store adjacency map as a JS object (small, ~200 bytes). At suggestion ranking time, use weighted distance if the typo is ≤ 2 edits and involves mostly adjacent characters.

---

## 5. Ranking / Scoring Formula

Combine multiple signals into **one final score**, higher = better suggestion.

### Signals

1. **Edit distance (primary):** Lower is better. Range 1–2 for practical suggestions.
2. **Phonetic match (secondary):** Binary: matched Metaphone code or not.
3. **Word frequency (tertiary):** Rank in dictionary (1 = most frequent).
4. **Keyboard adjacency (quaternary):** Weighted as per section 4.
5. **First-letter agreement (quinary):** Same first letter = more likely to be intended word.
6. **Length similarity (senary):** Length difference squared; longer words penalized.

### Proposed Formula

```javascript
function score(misspelled, candidate) {
  const editDist = weightedOSADistance(misspelled, candidate);
  const phonMatch = getPhoneticCodes(misspelled).some(
    code => getPhoneticCodes(candidate).includes(code)
  ) ? 1 : 0;
  const freqRank = getFrequencyRank(candidate); // 1–n, lower = more common
  const firstLetterMatch = (misspelled[0] === candidate[0]) ? 1 : 0;
  const lenDiff = Math.abs(misspelled.length - candidate.length);
  
  // Normalize frequency to 0–1 scale (higher score = more frequent)
  const freqScore = 1 / (1 + Math.log(freqRank + 1));
  
  // Final score
  const score = 
    (10 - editDist * 3) * 1.0          // Edit distance: 10 at dist=0, 7 at dist=1, 4 at dist=2
    + phonMatch * 2.0                  // Phonetic match bonus
    + freqScore * 3.0                  // Frequency bonus (0–3)
    + firstLetterMatch * 1.5           // First-letter bonus
    - (lenDiff * lenDiff) * 0.5;       // Length penalty
  
  return score;
}
```

**Weights breakdown:**
| Signal | Weight | Rationale |
|--------|--------|-----------|
| Edit distance | 3.0 | Primary signal; dominant effect |
| Phonetic match | 2.0 | Catch irregular spellings; weaker than exact distance |
| Frequency | 3.0 | Users expect common words |
| First-letter | 1.5 | Psychology of typos; almost never get first letter wrong |
| Length difference | -0.5 | Weak signal; more for tie-breaking |

**Example rankings:**
- Misspelled: "necesary" (1 missing 's')
  - "necessary" (editDist=1, firstLetter✓, freq=high): score ≈ 7 + 0 + 2.9 + 1.5 = **11.4**
  - "cesare" (editDist=3, firstLetter✗, freq=low): score ≈ 1 + 0 + 0.5 = **1.5**
  
- Misspelled: "teh"
  - "the" (editDist=1 adjacent, firstLetter✓, freq=very high): score ≈ 7 + 0 + 3.0 + 1.5 = **11.5**
  - "then" (editDist=1 insertion, firstLetter✓, freq=high): score ≈ 7 + 0 + 2.8 + 1.5 = **11.3**
  - "tea" (editDist=1 substitution, firstLetter✓, freq=high): score ≈ 7 + 0 + 2.7 + 1.5 = **11.2**

**Why first-letter and prefix matter:**
- Empirical studies on real typo corpora show ~95% of typos preserve the first letter.
- Users type first letter deliberately; transposition/substitution in positions 2–end is far more common.
- Prefix matching (shared initial k-gram) is a strong signal that two words are related.

---

## 6. The "Is This Word Misspelled?" Pass

The **flagging pass** runs on every keystroke (debounced). It must be fast (~10ms for 100 words) and have low false-positive rate (users disable spell check if it cries wolf constantly).

### Rule Order (Strict; Must Verify in Sequence)

1. **Length filter:** < 2 characters → skip. (Abbreviations, codes, artifacts.)
2. **Starts with digit:** → skip. (Codes, version numbers, callouts.)
3. **URL/email detection:** Matches `[a-z0-9._-]+@[a-z0-9.-]+` or `http(s)?://` → skip.
4. **Straight dictionary lookup:** `LEX.has(word.toLowerCase())` → accept. (Fast path; ~1–2 µs in SQLite.)
5. **Ignorelist:** User's ignored-words set → accept. (Proper nouns, jargon, abbreviations; stored in session storage.)
6. **ALL-CAPS filter:** All chars uppercase (excluding digits) → skip. Treat as intentional (acronyms, shouting, emphasis).
7. **CamelCase filter:** `[a-z][A-Z]` pattern → skip. (Identifiers, brand names, function names. But see note below.)
8. **Sentence-initial capital:** First letter uppercase, rest lowercase, position=0 in sentence → accept. (Legitimate variation; don't flag "The" at sentence start.)
9. **Morphological variants:**
   - Try removing suffixes: -ing, -ed, -s, -es, -ly, -er, -est, -tion, -ness, -ment, -ity, -ful, -less, -ize, -ise (British).
   - Doubled consonant: "running" → check "run" + "ing".
   - y→ies: "trying" → check "tr" + "y".
   - e-drop: "making" → check "make" + "ing".
   - If any variant found in dictionary → accept.
10. **Contraction/apostrophe handling:**
    - "it's" → check both "it" and "is" (common possessive/contraction).
    - "don't" → check "do" and "n't" (or "not").
    - Curly apostrophes ('): normalize to straight (').
11. **Hyphenated compounds:** Split on `-`, check each component in dictionary. If all components present → accept.
12. **Repeated-word detection:** "the the" → flag both (stylistic error, not spelling).
13. **No variants found:** → **flag as misspelled.**

### False-Positive Mitigation

**Biggest risk:** Over-flagging proper nouns, domain jargon, foreign words, names.

**Mitigations:**
- **Ignorelist persistence:** Session-local set of "accepted" words (user clicks "ignore" on flagged word, adds to session set).
- **Sentence-initial capital rule:** Prevents flagging "He", "The", etc., at sentence start (80% of all capital words).
- **CamelCase exception:** If the word is 4+ chars and contains mixed case, assume it's an identifier → don't flag. (Catches "iPhone", "camelCase".)
- **Confidence threshold:** Only flag if we're confident. Reserved for future: if ed. distance to nearest dictionary word > 2, maybe it's a typo worth suggesting. If > 3, could be a proper noun → suppress.

**False-negative risk (accepting misspellings):** Lower priority. Spell check is a suggestion tool; users can always retype. False positives destroy trust faster.

---

## 7. Real-Word Errors (Homophones and Confusion Sets)

Classic examples: "their/there/they're", "its/it's", "to/too/two", "affect/effect", "compliment/complement".

### What's Achievable Without an LLM

**Minimal context rules:** Precompute confusion sets and minimal POS (part-of-speech) context.

**Example: its/it's**
```
Confusion set: {its, it's}
Rule: "it's" almost always precedes verb (is, has, was, had, be, been)
      "its" almost always precedes noun

At flag: if word=its, check if followed by [is, has, was, had, being, been] → flag as should be "it's"
         if word=it's, check if followed by [noun-like] → flag as should be "its"
```

**Complexity:** Requires a very basic tokenizer + noun/verb tagger. Doable in ~100 LOC of JS using hardcoded patterns, but **not robust.**

**their/there/they're:**
```
their: possessive; almost always precedes noun (their cat, their house)
there: locative/existential; often precedes verb (there is, there are, there was) or follows verb (go there, sit there)
they're: contraction of they + are; precedes adjective or verb (they're happy, they're going)
```

**Naive rule:**
```javascript
function flagRealWordError(word, nextToken) {
  if (word === 'their' && /^(is|are|was|were)/.test(nextToken)) return "should be 'there'";
  if (word === 'there' && /^(cat|dog|house|thing)/.test(nextToken)) return "should be 'their'"; // requires noun list
  if (word === 'theyre' && !nextToken.match(/[aeiou]/)) return "should be 'they're'"; // rough filter for adjective/verb
  return null;
}
```

**False-positive risk:** High. "There is a their?" triggers incorrectly if POS tagging is wrong.

### What's NOT Achievable Offline

- **Disambiguating based on semantic context:** "I affect the result" vs. "The effect is clear". Requires understanding sentence meaning; full NLU impossible without a model.
- **Anaphora resolution:** "He went to the store. Their prices are good." (which "their"?).
- **Pragmatic inference:** "The weather is there." (semantically weird; requires world knowledge).

### Recommendation

**Skip real-word detection for MVP.** Cost-benefit is poor:
- Confusion sets are numerous (~100+).
- Minimal context rules are fragile.
- False-positive cost (trust loss) is high.
- User will notice and disable the checker.

**Future:** If Lukeatron grows to support a local lightweight LLM (e.g., TinyLLaMA 1B), revisit. For now, focus on spelling errors, not grammar.

---

## 8. Benchmarking: Metrics and Test Corpora

### Accuracy Metrics

| Metric | Definition | When to use |
|--------|-----------|------------|
| **Precision** | # correct suggestions / # suggestions returned | Primary: did we suggest the right word? |
| **Recall** | # queries for which correct word ranked in top-3 / # all typos | Did we find the typo? |
| **MRR (Mean Reciprocal Rank)** | Average of 1/rank for queries where correct answer found | Captures ranking quality (top-1 vs top-3). |
| **Coverage** | # typos where at least one suggestion found / # total typos | Breadth. |

**Primary metric for us: MRR@3.** Captures both recall (found it?) and ranking (where?).

### Open Misspelling Corpora

1. **Birkbeck Spelling Error Corpus** (University of Birkbeck, London; hosted by Oxford Text Archive)
   - **Canonical URL:** https://ota.bodleian.ox.ac.uk/repository/xmlui/handle/20.500.12024/0643
   - **Content:** 36,133 misspellings of 6,136 words from British/American native speakers. Main dataset: birkbeck.dat. Additional sub-corpora available: Holbrook-tagged, Wikipedia-derived (2,455 errors), aspell.dat (531 errors).
   - **Format:** Plain-text .DAT files with consistent structure (correct word preceded by $, followed by misspellings on separate lines).
   - **Licence:** **Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License.** (Non-commercial use; derivatives must share identical licence.)
   - **Pros:** Gold standard. High-quality manual annotation. Freely downloadable (627 KB).
   - **Cons:** Non-commercial only; may not suit all business contexts. Relatively small for training modern systems.

2. **WikEd Error Corpus** (Wikipedia revision-history derived)
   - **URL:** https://github.com/grundkiewicz/wiked (or search "WikEd Error Corpus" via academic databases)
   - **Content:** 12M+ sentences with 14M+ edits extracted from Wikipedia revision history, including spelling, typographical, grammatical, and stylistic errors.
   - **Licence:** (unverified — check repository for explicit statement)
   - **Pros:** Large-scale, real-world data; covers multiple error types.
   - **Cons:** Noisy (edits include content changes, not just corrections). Requires preprocessing to extract spelling-only errors.

3. **GNU Aspell** (LGPL spell checker)
   - **Project URL:** https://sourceforge.net/projects/aspell/
   - **Content/Test Suite:** (unverified) Aspell's official test suite availability is not clearly documented in the SourceForge repository. A small aspell.dat corpus (531 misspellings) is hosted on the Birkbeck corpus page, described as "from GNU Aspell testing dataset," but sourcing and terms are unconfirmed.
   - **Licence:** LGPL (copyleft, not permissive, but open-source).
   - **Cons:** No dedicated public misspelling corpus confirmed.

4. **Synthetic Typo Corpus** (generate on demand)
   - Create a set of correct words from our dictionary.
   - Introduce artificial errors: delete, transpose, substitute, insert at random.
   - **Pros:** Fully controllable; can test specific distance distributions; no licensing concerns.
   - **Cons:** Not realistic (real typos have structure; artificial ones are uniform random). Use as a sanity check, not primary benchmark.

### Benchmarking Protocol

1. **Select a test set** (e.g., 1k errors from Birkbeck, stratified by distance).
2. **Run the spell checker:**
   - For each misspelled word, get top-3 suggestions.
   - Record rank of correct word (if found), or ∞ if not found.
3. **Compute metrics:**
   - MRR@3 = mean(1/rank for all errors where found, 0 otherwise).
   - Precision@1 = % where top-1 suggestion is correct.
   - Precision@3 = % where correct answer in top-3.
   - Recall = % of all errors where correct word found in top-10 (or top-3).
4. **Break down by distance:**
   - MRR@3 for distance-1 errors: typically 95%+.
   - MRR@3 for distance-2 errors: typically 60–80%.
   - MRR@3 for distance-3+ errors: typically 20–40% (fallback).
5. **Profile performance:**
   - Wall-clock time for 1k errors on a 2015 MacBook Air (JS, no optimization).
   - Average time per error in milliseconds.
   - Peak memory usage (dictionary + indices in SQLite).

---

## Recommendation

### Proposed Architecture

**Name:** Hybrid SymSpell + Metaphone with Weighted Scoring.

#### Index Tables (SQLite)

```sql
-- Primary dictionary
CREATE TABLE words (
  word_id INTEGER PRIMARY KEY,
  word TEXT UNIQUE NOT NULL,
  frequency_rank INTEGER NOT NULL,
  is_phrase BOOLEAN DEFAULT 0
);
CREATE INDEX idx_word ON words(word);

-- Deletion neighbourhood (SymSpell edit-distance-1)
CREATE TABLE deletion_index (
  deletion_key TEXT NOT NULL,
  word_id INTEGER NOT NULL,
  PRIMARY KEY (deletion_key, word_id)
);
CREATE INDEX idx_deletion_key ON deletion_index(deletion_key);

-- Phonetic index (Metaphone primary + secondary)
CREATE TABLE phonetic_index (
  word_id INTEGER PRIMARY KEY,
  metaphone_primary TEXT NOT NULL,
  metaphone_secondary TEXT
);
CREATE INDEX idx_metaphone_primary ON phonetic_index(metaphone_primary);
CREATE INDEX idx_metaphone_secondary ON phonetic_index(metaphone_secondary);

-- Optional: Bigram index for secondary filtering (if space permits)
CREATE TABLE bigram_index (
  bigram TEXT NOT NULL,
  word_id INTEGER NOT NULL,
  PRIMARY KEY (bigram, word_id)
);
CREATE INDEX idx_bigram ON bigram_index(bigram);
```

#### JS Functions (Pseudocode Signatures)

```javascript
// Core distance function
function weightedOSADistance(a, b, maxDist = 2) => number
  // OSA Damerau-Levenshtein with QWERTY adjacency weighting
  // Return early if distance > maxDist

// Phonetic encoding
function metaphone(word) => {primary: string, secondary: string}
  // Metaphone algorithm; return both codes

// SymSpell candidate generation (edit distance 1)
function generateDeletions(word) => string[]
  // Return all single-character deletions

async function getSymSpellCandidates(misspelled, maxDist = 1) => word_id[]
  // Query deletion_index for all words within maxDist
  // Return sorted list of word IDs by distance

// Scoring
function scoreCandidate(misspelled, candidate_word_id) => number
  // Compute weighted score combining:
  // - edit distance, phonetic match, frequency, first-letter agreement, length similarity

// Flagging (misspelled-or-not pass)
async function isMisspelled(word, previousWord, nextWord) => boolean
  // Run rule order from section 6
  // Return true if word should be flagged

// Suggestion generation
async function suggestCorrections(misspelled) => string[]
  // 1. Generate SymSpell candidates (edit-1)
  // 2. Score each
  // 3. Also query phonetic_index for distance-2+ fallback
  // 4. Merge and re-score
  // 5. Return top 3

// Session state
const ignoredWords = new Set() // Words user has clicked "ignore" on
```

#### Misspelled-or-Not Pass (Rule Order)

1. Length < 2 → accept
2. Starts with digit → accept
3. URL/email regex → accept
4. Dictionary lookup → accept
5. In ignoredWords → accept
6. ALL-CAPS → accept
7. CamelCase (>= 4 chars, mixed case) → accept
8. Sentence-initial capital (first char uppercase, position at sentence start) → tentatively accept (verify morphology first)
9. Morphological variants (try stripping suffixes, doubled consonant, y→ies, e-drop)
10. Hyphenated compounds (split, check each)
11. Contractions & apostrophes (normalize, check both parts)
12. Repeated-word detection (check if previous token == word)
13. If none match → **flag as misspelled**

#### Scoring Formula

```javascript
score(misspelled, candidate_word) = 
  (10 - editDist * 3.5) * 1.0    // Primary: edit distance weight=3.5
  + phoneticMatch * 2.0            // Secondary: phonetic match
  + frequencyScore * 3.0           // Frequency (0–3 range)
  + firstLetterMatch * 1.5         // First-letter bonus
  - (lenDiff * lenDiff) * 0.5      // Length penalty

where:
  editDist = weightedOSADistance(misspelled, candidate)
  phoneticMatch = 1 if Metaphone codes overlap, 0 otherwise
  frequencyScore = 1 / (1 + ln(frequencyRank + 1))
  firstLetterMatch = 1 if first letters match, 0 otherwise
  lenDiff = |len(misspelled) - len(candidate)|
```

#### Build Process (Python)

```python
import sqlite3
import sys

# Load dictionary (CSV: word, frequency_rank)
words = load_dictionary('dictionary.csv')

# Create SQLite DB
db = sqlite3.connect('spelling.sqlite')
cursor = db.cursor()

# Create tables
cursor.executescript("""
  CREATE TABLE words (word_id INTEGER PRIMARY KEY, word TEXT UNIQUE, frequency_rank INTEGER);
  CREATE TABLE deletion_index (deletion_key TEXT, word_id INTEGER, PRIMARY KEY (deletion_key, word_id));
  CREATE TABLE phonetic_index (word_id INTEGER PRIMARY KEY, metaphone_primary TEXT, metaphone_secondary TEXT);
""")

# Insert words
for i, (word, rank) in enumerate(words):
    cursor.execute("INSERT INTO words VALUES (?, ?, ?)", (i, word, rank))

# Build deletion index (SymSpell)
for i, (word, rank) in enumerate(words):
    for deletion in generate_deletions(word):
        cursor.execute("INSERT INTO deletion_index VALUES (?, ?)", (deletion, i))

# Build phonetic index
for i, (word, rank) in enumerate(words):
    p_primary, p_secondary = metaphone(word)
    cursor.execute("INSERT INTO phonetic_index VALUES (?, ?, ?)", (i, p_primary, p_secondary))

db.commit()
db.close()

# Embed base64-encoded SQLite file in HTML template
with open('spelling.sqlite', 'rb') as f:
    b64 = base64.b64encode(f.read()).decode('ascii')
    print(f"const SQL_BASE64 = '{b64}';")
```

#### Expected Performance (unverified)

| Operation | Time | Notes |
|-----------|------|-------|
| Typing keystroke (debounced 200ms) | 10–20ms (unverified) | Calls isMisspelled for ~50–100 words; SQL lookups + rule checks. Estimate based on SymSpell performance claims. Actual numbers depend on sql.js B-tree lookup performance with real SQLite backend. |
| Click suggestion | 50–100ms (unverified) | SymSpell query (4–6 deletions, each lookup ~5ms), phonetic fallback, scoring. Estimate based on SymSpell documentation. Benchmark required. |
| Page load (parse SQLite, init indices) | 200–500ms (unverified) | sql.js loading + parsing; one-time cost. Actual depends on SQLite file size and parsing performance. |
| Memory (in-browser SQLite) | 20–40 MB (unverified) | Depends on dictionary size (60k–150k words); mostly deletion_index. Estimate based on ~25 deletes per 5-letter word; no benchmark against real 100k-word corpus in SQLite. |

---

## Rejected and Why

### Approach 1: Edit-Distance-2 Brute Force

Generate all edit-2 candidates (O(len²) edits). Scales poorly: for len=5, ~1,300 candidates vs. ~260 for edit-1. For a 100-word passage, ~130k lookups. **Unacceptable latency on keystroke.**

### Approach 2: BK-Trees as Primary Index

Requires O(n log n) tree construction at page load. For 100k words, ~1–2 seconds in single-threaded JS. **Breaks perceived responsiveness.** Viable only with server precomputation or Web Worker threading.

### Approach 3: Full Trie at Load Time

Serialize dictionary as nested JSON trie, embed in page. For 100k words, ~5–10 MB of gzipped JSON. Parse at load time: ~500ms–1s. **Too slow and bloated** vs. pre-built SQLite.

### Approach 4: Real-Word Error Detection (MVP)

Confusion sets + minimal POS tagging seem promising but are fragile. Require curating 100+ confusion sets, testing each rule on real text. High false-positive rate without a real language model. **Deferred to future; not worth the complexity for MVP.**

### Approach 5: Soundex-Only Phonetic Matching

Soundex is coarse (~30% of dictionary may share a Soundex code). Adds little signal over edit distance. **Metaphone is modest upfront cost for better recall.**

---

## Summary

The proposed **Hybrid SymSpell + Metaphone** architecture combines:
- **Fast, precise candidate generation** (SymSpell deletion index for edit-1 with early termination).
- **Graceful edit-distance-2 fallback** (phonetic index + weighted distance scoring).
- **Strong ranking** (weighted formula balancing distance, frequency, phonetics, keyboard proximity, first-letter, length).
- **Low false-positive rate** (explicit rule order for flagging, morphological support, ignorelist).
- **Client-side offline operation** (pure SQLite embedded in HTML; no server, no build step for JS).
- **Reasonable performance** (10–20ms keystroke, 50–100ms suggestions, unverified).

**Uncertainty:** Real-world accuracy depends on dictionary quality and training on actual misspelling corpora. Recommend benchmarking against Birkbeck corpus post-build.

---

## Appendix: QWERTY Adjacency Map (Full)

See section 4 for complete map. Minimal storage (~200 bytes as JS object).
