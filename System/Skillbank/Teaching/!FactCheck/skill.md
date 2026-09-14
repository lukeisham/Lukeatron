---
name: "!FactCheck"
description: "Agent-run claim/source verification over a pasted paragraph (≤1000w) — tokenises in ≤250-word batches, discovers and codifies claims, searches whitelist-first with a Wayback fallback, double-checks every source before citing it, and labels each claim against the five-category provenance taxonomy, failing closed to 'unverified' rather than fabricating."
type: Skill
status: Active
core_function: Verify
intent: "Run FactCheckingParser.spec.md's Stage 1–4 pipeline directly, using this session's own WebSearch/WebFetch tools instead of the browser widget's copy-paste-to-Claude handoff (spec §8's 'companion Skillbank skill', now built)."
version: 1.0.0
dependencies: ["System/Widgets/Parser/Fact-checking/Specs/FactCheckingParser.spec.md"]
calibration:
  context: [Teaching]
  level: Extended
  scope: Local
memory_footprint:
  read: ["System/Widgets/Parser/Fact-checking/Specs/FactCheckingParser.spec.md"]
  write: []
---

## ⚡ TRIGGER
Primary: `!FactCheck`
Fires when: Luke pastes a paragraph and asks to "fact-check this", "verify these claims", "check the sources on this", or similar — or another skill/plan hands off a paragraph for claim/source verification.
Scope: One paragraph at a time, hard cap **1000 words** (Parser_guide.md §2.1). Over cap → warn and stop, do not silently truncate (mirrors the browser widget's shell cap, FR-8 of `ParserShell.spec.md`).

This is the agent-run half of TE-08's Tier B pipeline (`FactCheckingParser.spec.md` §8's
"companion Skillbank skill", now in scope). It reuses that spec's chunk contract, five-category
taxonomy, whitelist, and fail-closed rules verbatim — this skill only supplies HOW an agent session
executes them, not a new design. The browser widget (unbuilt as of this skill's authoring) remains
a secondary, offline tagging/viewer surface with its own copy-paste fallback — not required for
this skill to run.

## 🛠️ LOGIC

**STEP 0 — Cap check.**
IF the pasted paragraph exceeds 1000 words ➔ STOP, tell Luke the word count and ask him to trim it
  (no silent truncation, no partial run).
ELSE ➔ continue.

**STEP 1 — Batch into ≤250-word chunks (low-token pass sizing).**
Split the paragraph into sequential batches of ≤250 words, breaking on sentence boundaries (never
mid-sentence). A ≤250w input is one batch. This bounds each verification round's token cost instead
of sending the whole 1000w cap in one pass (spec AD-FC6 revised — batched by size, not by
claim-count or by whole-input).

**STEP 2 — Per batch, discover claims (Tier A, spec FR-FC3/FR-FC4).**
For each batch, in order:
- Any span Luke explicitly marked as a claim (e.g. quoted, bracketed, or named as "check this") is
  **authoritative** — always checked, never dropped or downgraded (spec AD-FC4).
- Otherwise scan for cue signals from the spec's §4-cue-phrases table (quotation marks; nearby
  attribution with no quotation marks; proper nouns/numbers/titles/names; free-standing descriptive
  language; declarative language tied to a named source; "for example"/"such as" framing). A
  sentence with at least one signal becomes a claim; a sentence with none is a minor/opinion claim,
  skipped silently (mirrors "Broad" mode, spec FR-FC4 — granular per-proper-noun chunking is not
  run by default here; only chunk further per STEP 3 when a claim genuinely bundles more than one
  checkable proposition).

**STEP 3 — Codify + chunk (Tier A, spec FR-FC5).**
For each discovered/tagged claim:
- Reduce it to a canonical `statement` (attribution stripped, e.g. "According to a 2024 WHO report,
  X" → codified claim `X`, with the report tracked as the source hint, not the claim itself).
- Mark it **non-checkable** (`checkable: false`) if it is opinion, prediction, prescription, or a
  bare definition — render its Source cell `not checkable — <type>` later, never send it to STEP 4.
- Only split a claim into multiple chunks when it bundles more than one independently-verifiable
  proposition (a compound claim, or a claim mixing a quote with a separate number/date). A simple
  claim stays one chunk — no gratuitous splitting (spec AD-FC11).
- Assign each chunk a **candidate category** from the five-category taxonomy, per its cue signal:
  quotation marks around the chunk → `direct-quote` (always-fire); nearby attribution with no
  quotation marks → `paraphrase`; a bare proper noun/number/title/flatly-stated common-knowledge
  phrasing → `exists`; free-standing descriptive/evidentiary language with no named source →
  `observed`; declarative language tied to a named person/book/website/organisation → `claimed`
  (spec §4-cue-phrases, AD-FC13). This is a search hint for STEP 4, never a final answer.

**STEP 4 — Search + double-check (Tier B, spec FR-FC6/FR-FC7, run with this session's own tools).**
For each checkable chunk, in candidate-category order (cheapest/most-specific signal first):
1. Check the spec's §4 whitelist (17 rows) for a row matching the chunk's topic — search that
   source **first** via WebFetch/WebSearch. No matching row, or the row doesn't cover the claim →
   fall back to open web search.
2. If the best candidate page is dead, retry via the Wayback Machine
   (`https://web.archive.org/web/2/<url>`) as a universal fallback for any dead source, whitelisted
   or open-web.
3. **Found-source double-check (spec AD-FC12) — do not skip this.** Before a source may be cited it
   must (a) actually resolve (fetch it, don't assume from a search snippet) and (b) its fetched
   content must say what it's being cited for — for a `direct-quote` chunk, the exact quoted text
   must appear verbatim on the page; for every other category, the page's content must support the
   chunk's substance. A candidate failing either check is dropped, not cited.
4. Confirm or correct the candidate category against what the source actually shows (spec
   AD-FC13/AD-FC17) — Stage 4's finding always overrides Stage 3's guess in the output.
5. **No source clears both checks ➔ fail closed.** Do not lower the bar, do not cite a source "close
   enough," do not assert without evidence (Lukeatron purpose.md's "never fabricate to fill a gap").
   Render that chunk's Source cell exactly: `unverified — unable to find a reliable source`.

**STEP 5 — Assemble the table (spec FR-FC10, §6).**
Render one **Claim | Chunk | Source | Category** table, one row per chunk (an unchunked claim's
single chunk still gets a row; Chunk cell blank on it):
- **Claim** — the codified statement (repeated across a chunked claim's rows).
- **Chunk** — the specific text searched, when the claim was split into >1 chunk; blank otherwise.
- **Source** — `name — url` for every source that passed STEP 4's double-check (archived URL
  appended when found via Wayback), or the exact failure string from STEP 4.5 / the non-checkable
  annotation from STEP 3.
- **Category** — the confirmed category from STEP 4 when a source was found and checked; otherwise
  Stage 3's candidate category suffixed `(unconfirmed)`. Never present a guess as a finding.
No verdict column, no true/false/misleading grading anywhere (spec FR-FC7) — this table answers
"what kind of evidence exists for this," never "is this claim true."

**STEP 6 — Report.**
Show the assembled table(s) (concatenated across all STEP 1 batches, in original order) plus a
one-line summary: total claims found, how many were checkable, how many resolved to a confirmed
category vs. fail-closed `unverified`.

## ✅ OUTPUT
**Expected State:**
- A `Claim | Chunk | Source | Category` table covering every batch of the input, in original order.
- Every cited source was fetched and double-checked in this run — no source appears from a search
  snippet alone.
- Every chunk with no confirmed source shows the fail-closed string, never an empty cell and never
  a fabricated one.
- No claim is graded true/false/misleading anywhere in the output.

**Validation Check (Self-Test):**
- VERIFY word count was checked before any processing (STEP 0).
- VERIFY batches are ≤250 words each and split on sentence boundaries.
- VERIFY every Source-cell citation corresponds to an actual fetch performed in this run.
- VERIFY at least one deliberately-unverifiable claim in a test run renders the fail-closed string,
  not a guessed source.
- VERIFY a claim with an exact quoted span renders `direct-quote` only when the fetched source's
  text contains that exact quote.

**Error Paths:**
- CATCH (input > 1000 words) ➔ report the count, ask Luke to trim, do not process.
- CATCH (a fetch fails or times out) ➔ treat as "no source found" for that candidate, try the next
  candidate or Wayback fallback; never crash the whole run over one dead link.
- CATCH (a whole batch yields zero claims) ➔ report "no checkable claims found in this section," 
  move to the next batch — not an error.
- CATCH (WebSearch/WebFetch tools unavailable in this session) ➔ tell Luke Tier B cannot run here;
  offer to run Stages 1–3 only (claims discovered + codified, Source column all "not run — no
  search tool this session") rather than silently failing.
