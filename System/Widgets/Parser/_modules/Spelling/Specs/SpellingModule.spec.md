# Spelling Module — Technical Spec

| Field | Value |
|---|---|
| **Type** | Build |
| **Date** | 2026-08-09 |
| **One-liner** | A self-contained, dictionary-backed English spell checker — `System/Widgets/Parser/_modules/Spelling/` — a peer module any of the 13 parser widgets (or anything else) can consume, replacing the shell's ad-hoc edit-distance-1 spell checker. |
| **Status** | Draft |

## 1. Motivation

Today's spell checker (`Grammar/build/template.html:1074–1156`) is ~85 lines buried inside
what the source itself banners as "CHASSIS · UI + HARNESS": brute-force edit-distance-1 over
Grammar's own POS lexicon, no distance-2 fallback, no phonetic matching, session-only ignore
with no persistent learn, `innerHTML` rewrite + TreeWalker caret restoration that the
research confirms breaks under IME composition and destroys undo history, and it calls
`ENGINE.tokenize()` — cartridge code — making the "chassis" spell checker already reach into
per-parser internals (audit §2a.1, confirmed in code at `template.html:1078`).

Luke's instruction of 2026-08-09 — "a large central English spelling module that all the
other widgets use" — supersedes `GrammarParser.spec.md` AD-5, which rejected a full
dictionary for file-size reasons (plan D-0). This spec is that module's contract: its own
public API, its self-contained tokenizer (plan D-5, cutting the one dependency between this
module and the shell), and the interface any host (the shell, or a future non-parser
consumer) uses to wire it in.

## 2. Scope

**In scope:**
- Public API: dictionary lookup, misspelled-or-not pass, suggestion generation, custom
  dictionary (ignore/learn/unlearn/export/import).
- The injectable backend seam so tests never touch a real `.db` (TEST-4).
- The module's own tokenizer (D-5) — contraction, curly-apostrophe, hyphenated-compound,
  URL/email, number, ALL-CAPS, and CamelCase handling.
- The misspelled-or-not rule order, adopted (with amendment) from `fuzzy-matching.md`.
- The suggestion-ranking formula, as a tunable starting point.
- The custom-dictionary JSON schema and persistence design, honest about `file://` limits.
- The replacement UI: marking misspellings without `innerHTML` rewrite + TreeWalker caret
  restoration; the popover's keyboard accessibility and ARIA roles.
- Test requirements (TEST-1–TEST-9), the TEST-7 gate tests, and the TEST-8 fake DOM.
- The word-list attribution placeholder.

**Out of scope:**
- The dictionary source itself, its build script, and its exact licence — a separate agent
  is finalising the source; this spec states the requirement (§5-AD-6) and leaves the value
  a placeholder, per the task brief.
- How the shell wires the module in (that lives in `ParserShell.spec.md` FR-11) — this spec
  defines what the shell (or any host) calls, not how the shell calls it.
- Real-word/homophone detection (their/there/they're) — the fuzzy-matching research
  recommends deferring this; adopted here as out of scope for v1 (§5-AD-4).
- Phonetic-algorithm implementation detail beyond stating which one is used and why — the
  exact Metaphone rule table is a build-time concern, not a contract concern.

## 3. Requirements

**Public API**

- **FR-1** — The module exports a single factory, no globals leaked beyond what the host
  explicitly binds:
  ```javascript
  function createSpellingModule(options) → SpellingModule
  ```
  `options` (all optional, all injectable — TEST-4/TEST-8):
  ```typescript
  {
    backend?: DictionaryBackend,      // §3-FR-2; default: the module's own embedded SQLite
    customDict?: Record<string, CustomEntry>,  // seed state; default {}
    ignoreSession?: Record<string, true>,       // seed state; default {}
    persist?: (dict: Record<string, CustomEntry>) => void,  // called on learn/unlearn/import
    document?: Document,              // for UI functions only; default globalThis.document
    variant?: "en-AU" | "en-GB" | "en-US" | "auto",  // default "en-AU" (plan D-2)
  }
  ```
- **FR-2 — Dictionary lookup.**
  ```javascript
  SpellingModule.lookup(word: string) → { known: boolean, pos?: string, rank?: number, variant?: "AU"|"GB"|"US" } | null
  ```
  Case-insensitive by default; consults the backend (`DictionaryBackend.query`, §3-FR-3),
  then the custom dictionary, then the session ignore list, in that order.
- **FR-3 — The injectable backend seam.**
  ```typescript
  interface DictionaryBackend {
    query(word: string): { pos: string, rank: number, variant: "AU"|"GB"|"US" } | null;
    has(word: string): boolean;
  }
  ```
  The module's default backend wraps the embedded SQLite `.db` (via sql.js, mirroring the
  shell's `LEX` pattern in `ParserShell.spec.md` FR-7, but the Spelling module's backend is
  its own — it does **not** call the shell's `LEX` or any cartridge's `ENGINE`, per D-5).
  Tests substitute a hand-built in-memory object satisfying this interface (TEST-4) — never
  a real `.db`, never sql.js in the test path.
- **FR-4 — Misspelled-or-not pass.**
  ```javascript
  SpellingModule.check(text: string) → MisspelledToken[]
  // MisspelledToken = { word: string, start: number, end: number }
  ```
  Runs the module's own tokenizer (FR-8) then the rule order (§4) per token; returns only
  tokens that fail every rule.
- **FR-5 — Suggestion generation.**
  ```javascript
  SpellingModule.suggest(word: string, limit?: number = 3) → string[]
  ```
  Ranked by §6's scoring formula, returned as plain corrected words (not scored objects) so
  the UI layer stays simple; `limit` caps the returned list.
- **FR-6 — Custom dictionary.**
  ```javascript
  SpellingModule.ignore(word: string) → void            // session-only (§7)
  SpellingModule.isIgnored(word: string) → boolean
  SpellingModule.learn(word: string, caseSensitive?: boolean = false) → void   // persistent (§7)
  SpellingModule.unlearn(word: string) → void
  SpellingModule.isLearned(word: string) → boolean
  SpellingModule.exportDictionary() → string             // JSON, schema §7
  SpellingModule.importDictionary(json: string) → { ok: boolean, added: number, error?: string }
  ```
  `learn`/`unlearn`/`importDictionary` each call the injected `persist` callback with the
  full updated custom-dict object; `ignore` never does (session-only, no persistence call).
- **FR-7 — Combined validity check** (what the UI actually calls per word):
  ```javascript
  SpellingModule.isValid(word: string) → boolean
  // true if: lookup().known, OR isIgnored(word), OR isLearned(word), OR passes any §4 rule
  ```

**Tokenizer (D-5 — self-contained, no external dependency)**

- **FR-8** — `SpellingModule.tokenize(text: string) → SpellToken[]`, where `SpellToken =
  {text, start, end, isWord}`, character-offset accurate against the input string. Rules,
  in order:
  1. **Curly-apostrophe normalisation** — `’`/`‘` normalised to `'` before word-boundary
     detection (not a separate token class; a normalisation pass).
  2. **URLs** — `https?://\S+` or `www\.\S+` → one non-word token (never spell-checked).
  3. **Emails** — `[\w.+-]+@[\w-]+\.[\w.-]+` → one non-word token.
  4. **Numbers** — a token starting with a digit (`\d`), including decimals and thousands
     separators (`3.14`, `1,000`) → non-word, never checked (mirrors `fuzzy-matching.md`
     rule 2, folded into tokenization rather than left to the flagging pass, so downstream
     rule order in §4 doesn't need to special-case digit-leading tokens).
  5. **Contractions** — a `'` or normalised `'` inside a run of letters (`don't`, `it's`,
     `y'all`) stays **one token**; the tokenizer does not split it. Downstream, rule-order
     step 10 (§4) decides validity by checking both the contraction as a whole (against a
     small built-in contraction whitelist) and its expansion.
  6. **Hyphenated compounds** — a run of letters joined by `-` (`self-aware`, `well-known`)
     stays **one token**, character span covering the whole compound; rule-order step 11
     (§4) splits it for validity checking, but `check()`'s returned span (if flagged) covers
     the whole compound, not a sub-part — so the UI never underlines half a hyphenated word.
  7. **ALL-CAPS** — any run of 2+ uppercase letters (optionally with trailing digits, e.g.
     `NASA2`) is one token, tagged `isWord: true`; rule-order step 6 (§4) exempts it.
  8. **CamelCase** — a run matching `[A-Z][a-z]+[A-Z]` internal-boundary pattern (`iPhone`,
     `getElementById`) is one token; rule-order step 7 (§4) exempts it.
  9. **Plain words** — `[A-Za-z']+` runs not matched by 1–8 → `isWord: true`.
  10. **Everything else** (whitespace, punctuation, symbols) → `isWord: false`, one token per
      contiguous run of the same class.

**Misspelled-or-not rule order (§4) and scoring (§6)** — see below, own sections per the
task brief's emphasis on these being load-bearing and separately reviewable.

**Replacement UI**

- **FR-9** — Misspelled words are marked using the **CSS Custom Highlight API**
  (`CSS.highlights`), never `innerHTML` rewrite of the editable content. `SpellingModule`
  exposes:
  ```javascript
  SpellingModule.renderHighlights(inputEl: Element, tokens: MisspelledToken[]) → void
  SpellingModule.supportsHighlightAPI() → boolean
  ```
  When `supportsHighlightAPI()` is `false` (older Safari), the module falls back to a
  **non-mutating overlay** (absolutely-positioned marks measured via `getBoundingClientRect`
  per misspelled word), never to the `innerHTML`+`<span class="miss">`+TreeWalker approach —
  the research confirmed that approach breaks under IME composition and destroys undo
  history in both Chrome and Firefox, so it is excluded outright, not offered as a fallback
  tier.
- **FR-10** — The suggestion popover:
  ```javascript
  SpellingModule.showSuggestions(word: string, anchorEl: Element, actions: {onReplace, onIgnore, onLearn}) → void
  ```
  Rendered as `<div role="listbox" aria-label="Spelling suggestions">` containing
  `role="option"` entries (suggestions first, then Ignore / Ignore all / Add to dictionary),
  each `tabindex="0"`. Keyboard: `ArrowDown`/`ArrowUp` move `aria-selected` and focus,
  `Enter` activates, `Escape` closes. Viewport-bounds-checked positioning (flip above the
  anchor if it would overflow the bottom; clamp horizontally) — per the research's
  `positionPopover()` design. Word text in suggestion entries is set via `textContent`, never
  `innerHTML` (JS-6).
- **FR-11** — Replacement never touches `innerHTML` with unescaped content; a replacement
  swaps the misspelled range's text content directly (Range API `deleteContents` +
  `insertNode(document.createTextNode(...))`, or the equivalent Highlight-API-safe
  operation) so caret and undo history are preserved — no TreeWalker caret-restoration hack.

## 4. The misspelled-or-not rule order

Adopted from `fuzzy-matching.md` §6/§9 with one amendment: rules 1–3 (length filter,
digit-leading, URL/email) move into the tokenizer (FR-8) rather than staying in the flagging
pass, since the module owns its own tokenizer and there is no reason to re-detect what
tokenization already resolved. The remaining ten rules keep the research's order, run in
sequence, first match wins (**accept** = not misspelled):

1. **Straight dictionary lookup** — `backend.has(word.toLowerCase())` → accept.
2. **Ignore/learned list** — `isIgnored(word)` or `isLearned(word)` → accept.
3. **ALL-CAPS** — 2+ consecutive uppercase letters (FR-8 rule 7 token) → accept.
4. **CamelCase** — FR-8 rule 8 token, 4+ chars → accept.
5. **Sentence-initial capital** — first letter uppercase, rest lowercase, token is the first
   word-token of the input (or immediately follows `. ! ? \n`) → accept **provisionally**;
   rule 6 still runs against the lowercased form before final acceptance (a capitalised
   misspelling like "Teh" at a sentence start must still flag).
6. **Morphological variants** — strip common suffixes (`-ing -ed -s -es -ly -er -est -tion
   -ness -ment -ity -ful -less -ize -ise`), doubled-consonant undo, `y→ies`, `e`-drop; if any
   stripped form is in the dictionary → accept.
7. **Contractions** — token contains an apostrophe (FR-8 rule 5): check the whole contraction
   against a small built-in whitelist (`don't, isn't, it's, I'm, we're, ...`) OR check its
   naive split (`it's` → `it` + `'s`); if either resolves → accept.
8. **Hyphenated compounds** — token contains `-` (FR-8 rule 6): split on `-`, every component
   passes rule 1 or rule 6 individually → accept.
9. **Repeated-word** — token text equals the immediately preceding word-token (case-
   insensitive) → **flag both**, but as a distinct `kind: "repeat"` marker, not merged into
   the plain misspelling list (this is a style/typo signal, not a dictionary miss — kept
   distinct so a host UI can label it differently if it chooses; `check()`'s default return
   still includes it, tagged, per FR-4).
10. **No rule matched** → **flag as misspelled.**

**False-positive budget (acceptance criterion, AC-6):** on the Birkbeck aspell.dat sample
(531 misspellings) plus a held-out set of 200 known-good proper nouns/jargon/brand names
compiled during the build, the false-positive rate (correct words flagged as misspelled)
must not exceed **2%**. This is the primary quality bar — the research is explicit that a
spell checker crying wolf gets switched off, so precision on *accepting* correct words is
weighted above suggestion recall. The 2% figure is a starting target, to be revisited once a
real benchmark run exists (see §9-AC-6); it is not derived from a published study and must
be treated as provisional until measured.

## 5. Decisions

- **AD-1 — Australian English is the default dictionary variant (plan D-2, inherited).**
  *Decision:* `variant: "en-AU"` by default; en-GB and en-US spellings are recognised, not
  flagged, unless `variant` is pinned to one specific form, in which case a recognised
  cross-variant spelling triggers a soft "US spelling — AU form is …" suggestion rather than
  a hard misspelling flag. *Rationale:* inherited from the governing plan; Luke is
  Melbourne-based. *Rejected alternatives:* en-US default (rejected — wrong default for the
  primary user); no variant awareness at all (rejected — loses a genuinely useful signal the
  dictionary source likely already carries per-word).

- **AD-2 — CSS Custom Highlight API is the primary rendering strategy; a non-mutating
  overlay is the only fallback.** *Decision:* per FR-9. *Rationale:* the persistence/UI
  research is explicit that the current TreeWalker approach is "not production-ready for
  shared widget" — it fails under IME composition, kills undo history in both tested
  engines, and has no word-boundary awareness on restoration. The Highlight API is confirmed
  to work on `file://` (not origin-gated) and has full support in current Chrome/Firefox,
  partial in Safari 17+. *Rejected alternatives:* keep `innerHTML`+TreeWalker as a fallback
  tier for old Safari — rejected because the research found it fragile even on its home
  turf (Chrome/Firefox), so it is not a safe fallback anywhere, only a worse primary; ship
  Highlight-API-only with no fallback — rejected because it would silently disable spell
  check on any Safari below 17, which fails the "cries wolf" concern in the opposite
  direction (silently does nothing, no visible degradation notice) — FR-9's overlay fallback
  at minimum keeps the feature present.

- **AD-3 — Export/import is PRIMARY persistence, not a fallback.** *Decision:* per §7. The
  learned-word store always round-trips through `exportDictionary()`/`importDictionary()`;
  `persist` (localStorage/IndexedDB, host-supplied) is an *additional* convenience layer the
  host may wire in, never assumed to sync across the 13 widget files. *Rationale:* the
  persistence research verified, browser-by-browser, that **no storage API works across all
  three browsers on `file://`** — Chrome isolates IndexedDB per-file with no localStorage at
  all, Safari blocks every storage API by default on `file://`, and only Firefox shares
  storage across files in the same folder. Given that reality, treating export/import as a
  fallback (implying automatic sync is the norm and manual is the exception) would misstate
  what the module can promise. This spec is deliberately honest: **cross-widget sync is a
  manual, user-initiated action in Chrome and Safari; it is automatic only in Firefox.**
  *Rejected alternatives:* build against localStorage as primary and document export/import
  as a "backup" — rejected because for 2 of 3 target browsers that framing is backwards, and
  would mislead Luke about what actually happens when he switches from Firefox to Safari
  mid-session.

- **AD-4 — Real-word/homophone detection (their/there/they're) is out of scope for v1.**
  *Decision:* `SpellingModule` does not attempt confusion-set detection. *Rationale:* the
  fuzzy-matching research's own cost-benefit is unambiguous: confusion sets number 100+,
  minimal-context POS rules are fragile without a real tagger, and the false-positive cost
  (trust loss) is exactly the failure mode this spec's §4 false-positive budget is guarding
  against. *Rejected alternatives:* ship a small naive confusion-set rule for the two or
  three highest-frequency cases (its/it's, their/there) — rejected because the research's
  own worked example shows even the narrowest naive rule ("their" followed by "is/are/was")
  produces obvious false positives ("There is a their?"), and partial coverage of a known-
  fragile feature is worse than no coverage (users can't predict when it will misfire).

- **AD-5 — Hybrid SymSpell (edit-distance) + Metaphone (phonetic) candidate generation,
  QWERTY-adjacency-weighted scoring.** *Decision:* per §6. *Rationale:* the fuzzy-matching
  research's own recommendation, chosen over brute-force edit-1 (current implementation,
  insufficient recall per the research's own critique of it), BK-trees (unacceptable
  load-time tree construction, 1–2s for 100k words), and full-trie embedding (5–10MB
  gzipped, too slow to parse at load). *Marked explicitly as build-time-unverified*: the
  research flags its own SQLite-backend timing numbers (~5–20ms edit-1 query, ~10–15MB index
  size) as "(unverified)" — estimated from SymSpell's general documentation, not benchmarked
  against this module's actual sql.js backend. This spec adopts the architecture, not the
  numbers; §9-OQ-1 tracks the unverified figures for build-time confirmation. *Rejected
  alternatives:* see `fuzzy-matching.md` §"Rejected and Why" (edit-distance-2 brute force,
  BK-trees as primary index, full trie at load time) — all rejected for the reasons that
  research gives, adopted here without re-litigating.

- **AD-6 — Licence attribution is a placeholder pending the dictionary-source decision.**
  *Decision:* the widget footer carries a licence/attribution line for the word list,
  structurally identical to the current shipped placeholder pattern already present in
  `template.html:131` (`"lexicon <span id="lexn">…</span> words (Moby PD + FrequencyWords
  CC-BY-SA)"`), but the **specific source and licence string for the spelling module's
  dictionary is TBD** — a separate agent is finalising the dictionary source per the plan's
  research step 3a. *Rationale:* the task brief is explicit that this must not be guessed.
  *Rejected alternatives:* none — a placeholder is the only honest option until 3a's source
  decision lands.
  **OQ-3 — Which dictionary source, and under what licence, ships in the module?**
  *Default if unresolved at build time:* build blocks on this decision; the module cannot
  ship without a recorded provenance note (source, licence, retrieval date), mirroring the
  original Grammar lexicon's own requirement (`GrammarParser.spec.md` FR-20/OQ-4). If the
  research (`shell-cartridge-audit.md`'s sibling, dictionary-sources research, referenced by
  the plan as step 3a but not read by this spec per its own scope) recommends Birkbeck-
  adjacent or a frequency-word-list source under CC-BY-SA or similar copyleft/share-alike
  terms, the footer attribution line must name it exactly and the licence text must be
  reachable from the widget (footer link or `/LICENSE` note beside the shipped `.db`).

## 6. Suggestion ranking formula (starting point — tune against benchmark)

```javascript
function score(misspelled, candidate) {
  const editDist = weightedOSADistance(misspelled, candidate); // OSA Damerau-Levenshtein, QWERTY-adjacency-weighted substitution cost
  const phonMatch = metaphoneOverlap(misspelled, candidate) ? 1 : 0;
  const freqScore = 1 / (1 + Math.log(candidate.rank + 1));    // rank: 1 = most frequent
  const firstLetterMatch = misspelled[0] === candidate[0] ? 1 : 0;
  const lenDiff = Math.abs(misspelled.length - candidate.length);

  return (10 - editDist * 3.5)      // primary signal
       + phonMatch * 2.0            // catches irregular spellings (e.g. "necessery"→"necessary")
       + freqScore * 3.0            // users expect common words
       + firstLetterMatch * 1.5     // ~95% of typos preserve the first letter (research citation)
       - (lenDiff * lenDiff) * 0.5; // weak tie-breaker
}
```

**These weights are a starting point, not a tuned result.** `fuzzy-matching.md` §8 specifies
the benchmark protocol (Birkbeck corpus, MRR@3 as primary metric, precision@1/@3, recall,
broken down by edit distance) this formula must be run against once built, with before/after
numbers recorded per the plan's Goal 2 success criterion ("Fuzzy suggestion quality beats
the current implementation on a fixed misspelling corpus — measured"). Do not treat the
weights above as final until that benchmark exists.

## 7. Custom dictionary — schema and persistence

**JSON schema** (adopted from `persistence-ui-testing.md` §"Custom Dictionary Schema",
unchanged):
```json
{
  "version": "1.0",
  "exportedAt": "2026-08-09T14:30:00Z",
  "words": {
    "lukeatron": { "addedAt": "2026-08-09T14:00:00Z", "caseSensitive": false, "source": "manual" },
    "Copilot":   { "addedAt": "2026-08-09T14:05:00Z", "caseSensitive": true,  "source": "manual" }
  }
}
```
- `version` — schema version, for future migration.
- `exportedAt` — ISO-8601 timestamp; `importDictionary` uses it only to detect a stale
  import in a future UI affordance ("this export is 6 months old") — it is not used to
  reject an import today.
- `words[word].caseSensitive` — whether "Word" and "word" are tracked as distinct entries.
- `words[word].source` — `"manual"` (user-added) always for v1; reserved for `"learned"`
  (algorithmic) if the module ever gains that.

**IGNORE vs LEARN vs UNLEARN:**
- **Ignore** (`ignore(word)`) — session-`Map` only, never calls `persist`, cleared on reload.
- **Learn** (`learn(word, caseSensitive)`) — writes to the in-memory custom-dict object and
  calls `persist(customDict)` if the host supplied one; the word survives `exportDictionary`.
- **Unlearn** (`unlearn(word)`) — removes from the custom-dict object, calls `persist` again.

**Persistence reality (stated plainly, per AD-3):**

| Browser | What actually happens |
|---|---|
| Firefox | `persist` callback (if host wires it to localStorage/IndexedDB) round-trips automatically across every widget file in the same folder. Automatic cross-widget sync works. |
| Chrome/Edge/Brave | `persist` (if wired to IndexedDB) round-trips only within the *same* widget file across reloads. Each of the 13 widgets has its own isolated store. Cross-widget sync requires manual export from one, import into the others. |
| Safari | No storage API is reliably available on `file://`. `persist` should be treated as a no-op by the host on Safari (or attempt it and accept it may silently fail); export/import is the *only* working persistence path. |

Export/import is therefore the interface every host must offer a visible UI affordance for
(a button, not a hidden feature), regardless of which browser Luke happens to be using —
this is what AD-3 means by "primary, not fallback."

## 8. Test requirements (TEST-1 through TEST-9)

- **TEST-1** — `node:test` + `node:assert/strict` only. No jsdom, no mocking library.
- **TEST-2** — Three tests per module minimum: import cleanly, happy path, one guard/failure
  path.
- **TEST-3** — `_modules/Spelling/tests/` mirrors `_modules/Spelling/src/`, one test file per
  source module (`test-tokenizer.mjs`, `test-dictionary.mjs`, `test-suggestions.mjs`,
  `test-custom-dict.mjs`, `test-ui.mjs`).
- **TEST-4** — Dictionary/backend tests build a fresh in-memory SQLite
  (`sqlite3.connect(":memory:")`-equivalent via sql.js in Node, or a hand-built fake
  satisfying `DictionaryBackend`, §3-FR-3) — never touch a real `.db`.
- **TEST-5** — No sleeps; await real operations (e.g. `initSqlJs()` if the test path uses it).
- **TEST-6** — Assert actual return values (`isValid("test") === true`), not "didn't throw."
- **TEST-7 — gate tests, named explicitly:**
  - `test-custom-dict.mjs`: **"learn() writes are blocked without a persist callback and the
    in-memory state still updates"** — proves `learn()` never throws when `persist` is
    omitted, and `isLearned()` reflects the write regardless.
  - `test-custom-dict.mjs`: **"learn() writes flow through when a persist callback is
    supplied"** — proves the callback receives the full updated dict object, not a partial
    diff.
  - `test-custom-dict.mjs`: **"importDictionary() rejects a malformed payload without
    mutating existing state"** — the blocked path: invalid JSON, or valid JSON missing
    `words`, leaves the custom dict unchanged and returns `{ok: false, error}`.
  - `test-custom-dict.mjs`: **"importDictionary() merges a valid payload and calls persist
    once"** — the permitted path.
- **TEST-8** — `test-ui.mjs` runs `renderHighlights`/`showSuggestions` against a hand-built
  fake DOM (per `persistence-ui-testing.md`'s `createFakeDOM()` pattern: fake
  `getElementById`, `querySelector`, `createRange`, `getSelection`, no-op
  `addEventListener`) — not jsdom, not any DOM library.
- **TEST-9** — Every test imports the real `SpellingModule` factory (or the real per-file
  export it targets); a test that must recreate source logic (rare — e.g. a hand-built fake
  backend) comments which real function it stands in for.

## 9. Risks

| Risk | Consequence | Mitigation | Proving test |
|---|---|---|---|
| False-positive rate exceeds budget on real text (proper nouns, jargon) | Luke disables spell check entirely (research's own stated failure mode) | §4's rule order (ALL-CAPS/CamelCase exemptions, morphology, ignore/learn) + explicit 2% budget as an acceptance criterion, not a hope | AC-6 benchmark run against Birkbeck + proper-noun holdout |
| SymSpell index size/query-time estimates are unverified against a real sql.js backend (AD-5) | Suggestion latency (§6) misses the "click suggestion, ~100ms tolerance" target from the research's stated constraint | Flagged as OQ-1; benchmark before freezing the index design, not after | OQ-1 resolution recorded with real numbers before Step 6 (test/refine) closes |
| Persistence design (AD-3) is misunderstood by a future host as "it just syncs" | A widget silently fails to share learned words across files in Chrome/Safari, user confusion | §7's per-browser table ships in the module's own README, not buried; export/import UI is mandatory, not optional, in any host wiring | Manual inspection: every host integration exposes an export/import control |
| Highlight API fallback (AD-2) degrades silently on old Safari | User sees no spell-check marks and doesn't know why | `supportsHighlightAPI()` is exposed so a host can surface a visible "using compatibility mode" note if it chooses; the overlay fallback still renders marks either way | Manual test in Safari < 17 confirms overlay marks appear |
| Dictionary source/licence unresolved at build start (OQ-3, AD-6) | Build blocked, or ships with unclear attribution | Explicit build gate — no ship without a provenance note (mirrors FR-20/OQ-4 precedent) | Provenance note present in `_modules/Spelling/build/build_spelling_db.py` header before first ship |

**OQ-1** — SymSpell index size (~10–15MB unverified) and per-word query time (~5–20ms
unverified) against the real sql.js backend this module ships. *Default if unresolved before
Step 6:* proceed with the architecture (AD-5) but do not commit to specific size/latency
numbers in any user-facing documentation until measured; if the real numbers blow the SR-3
"justify the bytes" bar badly, the fallback is capping the dictionary by frequency rank
(same reversibility clause the plan already states for D-0's file-size acceptance).

## 10. Acceptance criteria

- **AC-1** — `tokenize()` correctly spans `"don't"`, `"self-aware"`, `"iPhone"`, `"NASA2"`,
  `"user@example.com"`, `"https://example.com/x"`, `"3.14"`, and `"it's"` as single tokens
  with the flags described in §3-FR-8, verified against a fixed test-string fixture.
- **AC-2** — `check()` on a 200-word paragraph containing 10 deliberately introduced typos
  (mix of edit-1 and edit-2) flags all 10 and flags **zero** of the paragraph's proper nouns,
  hyphenated compounds, and ALL-CAPS acronyms (the false-positive holdout set from §4).
- **AC-3** — `suggest("necesary")` returns `"necessary"` ranked #1 within the top-3; `
  suggest("teh")` returns `"the"` ranked #1.
- **AC-4** — `learn("lukeatron")` then `isValid("lukeatron")` returns `true`; `unlearn`
  reverses it; `exportDictionary()` output re-imported into a fresh module instance
  reproduces the same `isLearned` results.
- **AC-5** — `renderHighlights` on a fake DOM without `CSS.highlights` defined falls back to
  the overlay path without throwing (TEST-8).
- **AC-6** — Benchmarked against the Birkbeck aspell.dat sample (531 misspellings) plus the
  200-item proper-noun/jargon holdout: false-positive rate ≤ 2% (§4's budget), and MRR@3 on
  the Birkbeck sample is recorded and compared against the current edit-distance-1-only
  implementation's MRR@3 on the same sample — the plan's Goal 2 "measured, with before/after
  numbers recorded" requirement.
- **AC-7** — All nine `TEST-1`–`TEST-9` requirements demonstrated, including the four named
  TEST-7 gate tests in §8, running clean under `node --test`.
- **AC-8** — The widget footer (in any host that wires this module in) shows a non-empty
  licence/attribution string sourced from the module's own metadata, not hardcoded per host.

## 11. Plan

1. Build the tokenizer (`src/tokenizer.js`) against FR-8; test against AC-1's fixture. *(FR-8)*
2. Build the injectable backend interface + default sql.js-backed implementation
   (`src/backend.js`), with a hand-built in-memory fake for tests. *(FR-2, FR-3, TEST-4)*
3. Build the misspelled-or-not pass (`src/rules.js`) against §4's rule order; benchmark
   false-positive rate against the holdout set. *(FR-4, FR-7, AC-2, AC-6)*
4. Build SymSpell deletion-index + Metaphone candidate generation and the §6 scoring
   formula (`src/suggest.js`); benchmark MRR@3 against Birkbeck. *(FR-5, AD-5, AC-3, AC-6)*
5. Build the custom-dictionary module (`src/custom-dict.js`) — ignore/learn/unlearn/
   export/import against §7's schema; write the four TEST-7 gate tests. *(FR-6, AC-4, TEST-7)*
6. Build the UI layer (`src/ui.js`) — Highlight API + overlay fallback, accessible popover.
   *(FR-9, FR-10, FR-11, AC-5)*
7. Write `_modules/Spelling/build/build_spelling_db.py` once the dictionary source (OQ-3) is
   confirmed; record provenance note. *(AD-6, OQ-3)*
8. Run the full benchmark (AC-6) and record before/after numbers per the plan's success
   criterion; tune §6's weights if the benchmark demands it.
9. Wire into the shell per `ParserShell.spec.md` FR-11 (Step 7 of the governing plan,
   meeting point with the shell track).

## 12. Verification — definition of done

- [ ] All acceptance criteria (AC-1–AC-8) demonstrated
- [ ] `node --test` passes clean over `_modules/Spelling/tests/`
- [ ] Benchmark before/after numbers recorded (plan Goal 2 success criterion)
- [ ] Provenance note present (OQ-3 resolved, not deferred silently)
- [ ] AD-3's per-browser persistence table verified against real Chrome/Firefox/Safari
      behaviour, not left as research-stage claims only

**On completion:** set Status to Done, move this spec to `Specs/Done/`, and confirm
`ParserShell.spec.md`'s FR-11 wiring against the finalised public API surface.
