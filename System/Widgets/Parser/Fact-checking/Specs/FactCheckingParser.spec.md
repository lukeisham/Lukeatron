# Fact-checking Parser — Technical Spec

| Field | Value |
|---|---|
| **Type** | Build |
| **Date** | 2026-08-13 |
| **Status** | Draft, no gating blocker. **2026-09-13 — the companion Skillbank skill (§8) is now built and Sandbox-tested**: `System/Skillbank/Teaching/!FactCheck/skill.md` runs this spec's Stage 1–4 pipeline directly with an agent session's own WebSearch/WebFetch, per Luke's explicit architecture decision that the skill is the primary, agent-run Tier B path (see AD-FC6, §8). **The browser widget/cartridge itself remains unbuilt** — this rebuild deliberately shipped the skill first; the widget stays tracked as TE-08's next action (`Memory/Medium-Term/Projects/TE-08-fact-checking-app/registry.md`), not silently dropped. `Fact-checking_content.md`'s wording (the EVAL system prompt) still needs drafting for the eventual widget build, but per FR-FC11 that's regular deferred content work, same as the codification-patterns document — it doesn't block widget code from starting whenever that's next. Everything architectural is closed (§5 Decisions, §11 Open questions). |
| **One-liner** | The Fact-checking cartridge's deltas from the shared shell contract — the first Tier-B build, and a pure HTML/JS/CSS shell with **no backend and no API key anywhere**. Two explicit controls drive four stages, **two fuzzy logics**: **Tag claims** (this cartridge's label for Parse) runs fuzzy logic A — claim-finding (Tier A, offline): user-tagged claims/chunks (with an optional category hint) → granular-or-broad discovery → codification + granular-only chunking → format-validation gate — populating the Explainer with tagged claims and no Source data. **Check claims** then renders a copy-pasteable verification request for fuzzy logic B — verification (Tier B): a strict, fail-closed **provenance** EVAL against five categories — **Exists / Direct-quote / Paraphrase / Claimed / Observed** — confirming or correcting Tier A's candidate category, with no truth verdict, a whitelist-first source search (Wayback Machine fallback), and a found-source double-check before anything is cited. The user runs that request in a separate Claude conversation (or a companion Claude Code skill) and pastes the JSON answer back — the browser itself never makes a network request. Output is a **Claim | Chunk | Source | Category** Explainer table plus claim/chunk shading on the text with an interactive chunk reveal. |

Cites `System/Widgets/Parser/_shell/Specs/ParserShell.spec.md` (and, for inherited precedent,
`Grammar/Specs/Done/GrammarParser.spec.md`, `Style/Specs/Done/StyleParser.spec.md`) as prerequisites, per
`Parser_guide.md` §5b — this records only Fact-checking's deltas, never restates the shared contract.
Continues project TE-08 (`Memory/Medium-Term/Projects/TE-08-fact-checking-app/`, per
`teaching-church-parser-chassis-rollout.md` step B2) and the work-remaining list in
`System/Widgets/setup/parser-widgets-research.md` §Fact-checking.

## 1. Motivation

`Parser_guide.md` §2.1 assigns Fact-checking the only primarily-Tier-B slot among the nine teaching
aides: input one paragraph, cap 1000w. Every other built cartridge is 100% Tier A; the shell's `tierB`
manifest slot exists but is disabled (`ParserShell.spec.md` FR-2, §2). This spec pins the seam for the
first build that turns it on.

| Stage | Tier | Trigger | What happens |
|---|---|---|---|
| 1 — User tag (optional) | A, offline | **Tag claims** | User-tagged claims (and, granular-only, chunks) are authoritative. Either tag may optionally carry a category hint (Exists/Direct-quote/Paraphrase/Claimed/Observed) for Tier A. An untagged paragraph skips straight to Stage 2. |
| 2 — Discovery | A, offline | **Tag claims** | Granular/Broad toggle. Broad: obvious claims only (cue phrases, proper nouns, numbers), minor claims skipped, never chunks. Granular: every claim attempted, plus every proper noun/number becomes its own candidate chunk. |
| 3 — Codification + chunking | A, offline | **Tag claims** | Each claim is codified to a canonical statement; granular mode decides whether it needs chunking and, if so, splits it into individually-verifiable chunks. Each chunk gets a candidate provenance category (from a cue signal or a user tag). A format-validation gate excludes malformed chunks before handoff. The Explainer shows the tagged Claim/Chunk/Category columns; Source stays empty. |
| 4 — EVAL | B, copy-paste to Claude | **Check claims** | Fires only on this click, never on Tag claims. Renders one batched verification request — covering every checkable chunk against the five categories, whitelist-first then open web, Wayback Machine as a universal dead-link fallback — for the user to run in a separate Claude conversation and paste the JSON answer back. Returns the confirmed category and only double-checked sources; no source found → an error message, not an empty assertion. No verdict — the Explainer table is the entire output. |

The two fuzzy logics: **A — claim-finding** (Stages 1–3, offline, deterministic) finds and chunks
claims and proposes a candidate category; **B — verification** (Stage 4, run by Claude in a separate
conversation) confirms or corrects that category against real evidence. They meet only at the chunk
contract (FR-FC5 → FR-FC6); the widget itself never touches the network.

## 2. Scope

**In scope** (mechanisms detailed in §3; this is the coverage list):
- The four-stage engine as two fuzzy logics — Tier A discovery/codification/chunking/validation
  (FR-FC2–FR-FC5, FR-FC13); Tier B provenance EVAL via a copy-paste handoff to Claude, no network call
  in the browser (FR-FC6–FR-FC7).
- The fail-closed no-verdict model (FR-FC7, AD-FC5), the found-source double-check (FR-FC6, AD-FC12),
  and the Tier A format-validation gate (FR-FC5, AD-FC14).
- The five-category provenance taxonomy and user category tagging (FR-FC5, FR-FC6, FR-FC13, AD-FC13,
  AD-FC16, AD-FC17, §6).
- The **Claim | Chunk | Source | Category** Explainer and the two UI surfaces (FR-FC12, §6).
- The chunk-tagging affordance (Granular only, FR-FC8.7, AD-FC4) and the two explicit stage
  controls — **Tag claims** (this cartridge's label for Parse, Stages 1–3) and **Check claims**
  (Stage 4 only) (FR-FC8.8, FR-FC8.10, AD-FC15).
- The whitelist, all 17 rows binding (§4), and the shell deltas needed for Tier B, tagging, and the
  granular/broad toggle (FR-FC8).
- Content-compilation for the four source documents (FR-FC11); the whitelist and cue-phrase documents
  are seeded with real content in this build, not left as stubs.
- Worked-example ACs covering tagging, discovery, chunking, whitelist routing, Wayback fallback, and
  the paste-back path (valid and malformed).

**Out of scope:**
- The wording of the codification-patterns and EVAL-prompt source documents (this spec defines their
  shape and IDs only) — `Fact-checking_codification_patterns.md`, `Fact-checking_content.md` (FR-FC11).
- A lexicon: no word-class lookups are needed; `build_lexicon.py` is dropped (AD-FC1).
- Batch/queue modes, cross-session history, multi-paragraph input (cap: one paragraph, 1000w, shell
  FR-8).
- Letting the EVAL rewrite claim spans, or re-grading discovery beyond fuzzy Tier-A heuristics
  (one-way boundary, AD-FC8).
- **Any AI-key / automated network-call mode.** Tier B is copy-paste-to-Claude only — no key input, no
  model input, no `fetch`, no TIERB portal seam. The widget is purely an HTML/JS/CSS shell around the
  handoff (AD-FC9).

## 3. Requirements

**Cartridge manifest**

- **FR-FC1** — `config.yaml` declares: `name: "Fact-checking parser"`, `version: 1.0.0`,
  `inputUnit: "one paragraph"`, `cap: 1000`, `levels: ["paragraph"]`, a minimal single-hue
  `clausePalette` (shell requires ≥1 entry; no result colours exist — FR-FC7, AD-FC7),
  `claimTagging: {enabled: true}`, `granularity: {enabled: true, default: "broad"}`,
  `labels: {parse: "Tag claims"}` (FR-FC8.8), and `tierB: {enabled: true, note: "..."}` (no
  `endpoint`/`model`/`timeoutMs` — there's no network call to configure; the manifest field just
  gates the handoff UI, FR-FC8). No `lexicon.enabled` key; `build_lexicon.py` is not copied into the
  cartridge.

**Engine — two fuzzy logics**

Fuzzy logic A: FR-FC3–FR-FC5, FR-FC13. Fuzzy logic B: FR-FC6–FR-FC7. See §1 for the narrative summary.

- **FR-FC2** — `factcheck_engine.js` exports `{ parse, tokenize, CLOSED }` (`ParserShell.spec.md`
  FR-4). `tokenize` is a plain sentence/word splitter (regex-based, no lexicon). `CLOSED` carries the
  closed-class marker lists the shell reads for word-count bookkeeping only.
- **FR-FC3** — **Stage 1, user-tagged claims and chunks (Tier A, offline, optional):** the
  claim-tagging affordance (FR-FC8.1) marks spans as `kind: "claim"` with `x.userTagged: true`. This
  stage only produces output if the user has tagged something; Stage 2 runs regardless. User tags are
  **authoritative**: no later stage removes, splits, or downgrades one (AD-FC4). A user-tagged claim
  that codification judges non-checkable still renders its Explainer row, Source cell annotated
  `not checkable — <type>` (FR-FC9) — never silently dropped. In **granular mode only**, the
  chunk-tagging affordance (FR-FC8.7) marks a sub-span as `kind: "chunk"` with `x.userTagged: true`,
  equally authoritative; if it falls outside any existing claim span, the engine synthesizes a minimal
  enclosing claim (`statement` = the chunk's own text, `checkable: true`) so the Explainer row still
  has content (AD-FC4). Either tagging action may optionally carry a **category tag** (FR-FC13,
  FR-FC8.9) — one of the five categories, written to `x.userCategory`; Stage 3 takes it verbatim as
  that chunk's `candidateCategory`, skipping its own cue-based guess for that span (FR-FC5).
- **FR-FC4** — **Stage 2, automatic claim discovery (Tier A, offline, mode-dependent):** the
  granularity toggle (FR-FC8.5) selects `selection.granularity` (`"granular" | "broad"`, default
  `"broad"`):
  - **Broad** — sentences the user did not tag are scanned for signals from `CONTENT["2.*"]`
    (`Fact-checking_cue_phrases.md`, §4-cue-phrases, FR-FC11): claim language (cue phrases), proper
    nouns, numbers. A sentence with at least one signal becomes a `kind: "claim"` span
    (`x.userTagged: false`); a sentence with none is a minor claim, skipped silently. Broad never
    chunks — each claim stays one row (FR-FC5).
  - **Granular** — everything Broad finds, plus every proper noun and number in the paragraph becomes
    a claim-candidate chunk of type `proper-noun`/`number` (FR-FC5), independent of any cue phrase or
    tag. Chunking applies when a claim needs it (FR-FC5, AD-FC11). User tags remain authoritative in
    both modes (AD-FC4).
- **FR-FC5** — **Stage 3, claim codification + fuzzy chunking (Tier A, offline):** each claim span
  (tagged or discovered) is codified using `CONTENT["1.*"]` (`Fact-checking_codification_patterns.md`,
  FR-FC11). In granular mode, fuzzy logic A decides whether the claim needs chunking (AD-FC11): if so,
  it's broken into verifiable chunks (propositions, proper nouns, numbers, split on conjunctions,
  attribution, compound subjects/predicates); if not, it stays one chunk. Broad mode never chunks.
  Each chunk also gets a best-effort **candidate provenance category** (`candidateCategory`,
  AD-FC13/AD-FC16) — from `x.userCategory` verbatim when the user category-tagged the span (FR-FC13),
  otherwise from its cue signal (§4-cue-phrases): quotation marks around the chunk hint
  `direct-quote` (an always-fire signal); a nearby book/article/website/person attribution with no
  quotation marks hints `paraphrase`; folk-knowledge cues, or declarative-or-descriptive language tied
  to a named person/book/website/article/organisation, hint `claimed`; evidentiary framing or
  free-standing descriptive language hints `observed`; a bare proper-noun/number chunk with no such
  cue defaults to `exists`. This is a hint for Stage 4, not a final answer:
  ```json
  { "claimIndex": 0, "raw": "string", "statement": "attribution stripped, canonical form",
    "topic": "best-effort topic key from CONTENT['3.*']", "checkable": true,
    "chunks": [ { "chunkId": "0.1", "text": "string", "type": "proposition | proper-noun | number",
                   "candidateCategory": "exists | direct-quote | paraphrase | claimed | observed" } ] }
  ```
  **Format-validation gate:** before Stage 4 sees any of it, every checkable chunk is validated
  against this exact shape (`chunkId`, `text`, `type`, `candidateCategory` present and well-typed); a
  chunk that fails is excluded from the batch, never sent, and its row annotated
  `unverified — internal format error` (FR-FC9) — never a crash (JS-2, AD-FC14).

  A simple claim stays exactly one `proposition` chunk — no gratuitous splitting. Non-checkable claims
  (opinion, prediction, prescription, definition, per `CONTENT["1.*"]`'s marker lists) get
  `checkable: false`, are excluded from the EVAL batch, and render Source cell
  `not checkable — <type>` — except granular-mode `proper-noun`/`number` chunks inside them are still
  chunked and verified individually (FR-FC4). Each chunk is also emitted as a child span under its
  claim span (`kind: "chunk"`, token `start`/`end`) so the tag surface can delineate it (FR-FC12).
  Codified records live in the claim span's `x` namespace (the shell never reads into it,
  `ParserShell.spec.md` §6).
- **FR-FC13** — **User category tagging (Tier A, offline, optional):** when the user tags a claim
  (FR-FC8.1) or, granular-only, a chunk (FR-FC8.7), the tagging control (FR-FC8.9) additionally offers
  five category options — **Exists / Direct-quote / Paraphrase / Claimed / Observed** — optional, not
  required to complete the tag. When picked, the choice is written to `x.userCategory` and Stage 3
  takes it verbatim as `candidateCategory` (FR-FC5), bypassing its own cue-based guess for that span
  only; every other chunk in the same claim still gets Stage 3's ordinary guess. This is a hint to
  Tier A, not a verdict: Stage 4 still confirms or corrects it exactly like a cue-derived guess
  (AD-FC13, AD-FC17) — it does not skip verification, and a user-supplied value still has to pass the
  format-validation gate.
- **FR-FC6** — **Stage 4, strict provenance EVAL (Tier B, Claude-direct handoff only):** the shell
  renders one batched, copy-pasteable verification request block (FR-FC8.4) carrying every checkable
  chunk that passed Stage 3's format-validation gate, keyed by `chunkId` + `claimIndex`, plus its
  `candidateCategory` hint. The user runs it in a separate Claude conversation (or the companion
  Skillbank skill, §8) and pastes the JSON answer back; the shell validates the paste against the
  response contract below and hands it to the engine. No API key, no `fetch`, no network request from
  the browser at any point (AD-FC9). The EVAL answers one question, provenance only, against the five
  categories (AD-FC13, AD-FC16) — not whether the claim is wrong, exaggerated, or misleading. The
  system prompt (`CONTENT["5.*"]`) embeds:
  - the **provenance rule**: search for evidence fitting one of the five categories, starting from
    Stage 3's hint but confirming or correcting it; return the confirmed `category` and only the
    sources actually found — no source found → empty `sources`, error message shown instead (FR-FC9).
    No truth judgment, no verdict, no fabricated sources (AD-FC5, FR-FC7);
  - the **source priority order**: the whitelist row for the claim's topic first (`CONTENT["3.*"]`,
    §4, FR-FC11) — check-first, not a separate tier — falling back to open web search when the topic
    has no row or the row doesn't cover the claim. The Wayback Machine is a universal fallback for any
    dead source, whitelisted or open-web;
  - the **found-source double-check**: before a source may appear in `sources` it must **exist** (its
    `url` resolves, live or archived) and **say what it is recorded as saying** (the page's content
    supports the chunk and the recorded `quote` appears there). A candidate failing either check is
    dropped, not cited — if every candidate fails, `sources` is empty and the Source cell shows the
    strict-default error (AD-FC5, FR-FC9). Handled entirely within the one request/paste-back round
    (AD-FC6); the response contract is unchanged — a passing source returns as-is, a failing one is
    simply absent.
  Response contract:
  ```json
  { "chunks": [ { "claimIndex": 0, "chunkId": "0.1", "category": "exists | direct-quote | paraphrase | claimed | observed",
                   "sources": [
                    {"name": "Britannica", "url": "https://…", "archivedUrl": "… (optional)", "quote": "… (optional)"} ],
                  "note": "… (optional)" } ] }
  ```
  The engine writes each chunk's `category` and `sources` back into `x.chunks[i]`; `findings` stays
  empty (FR-FC7). A missing `category` falls back to Stage 3's `candidateCategory`, marked unconfirmed
  (§6). Malformed or missing entries → empty sources with the FR-FC9 failure note — never a crash
  (JS-2).
- **FR-FC7** — **No verdict.** The EVAL grades nothing: no `verified`/`false`/`misleading`/
  `unable-to-verify` values, no severity mapping, no glyphs, no verdict colours. The Category column's
  five values are not a verdict either — they classify what *kind* of provenance question is being
  asked, not whether it's true. The **Claim | Chunk | Source | Category** table — Chunk cell blank on
  an unchunked row — is the entire result surface. **Strict** means: each Source cell contains only
  what the search found — no source found → an error message instead (FR-FC9). `ParseResult.findings`
  is always empty (`ParserShell.spec.md` §6 requires the array present, not populated); the claim
  state the Explainer needs travels in `spans[].x`. The shell's severity enum and `hueIndex` machinery
  are inherited but unused (AD-FC7).

**Shell deltas (this spec's origin — absorbed into `ParserShell.spec.md` as FR-24+ on build)**

- **FR-FC8** — Eight additive, default-off shell changes, regression-safe for Grammar (proven by
  byte-identical rebuild, AC-FC9). The widget is a pure HTML/JS/CSS shell — no API key, no `fetch`,
  no backend, no run-mode selector; Tier B is always the copy-paste handoff:
  1. **Claim-tagging affordance** (`claimTagging.enabled: true`): a "Tag as claim" control marking the
     current selection as a claim span (shaded background, neutral tag colour, toggle-off on re-tag).
     Omitted → byte-identical assembly (same opt-in pattern as `miniwiki.enabled`/FR-18).
  2. **`tierB.enabled: true` becomes legal** (`ParserShell.spec.md` FR-2 currently requires `false`).
     The manifest's `tierB` block only carries a `note` — there's no `endpoint`/`model`/`timeoutMs` to
     configure, since the cartridge makes no network call at all.
  3. **Granularity toggle** (`granularity.enabled: true`): Granular/Broad above the input area
     (default from `granularity.default`; Fact-checking defaults `"broad"`, not persisted — each
     session resets, OQ-FC4). At Parse time the shell sets `selection.granularity` on the same
     additive second `ENGINE.parse(text, selection)` argument the sweep-selector uses (FR-20); a
     cartridge declaring neither key is unaffected (Grammar declares neither).
  4. **Verification request block + paste-box:** clicking Check claims (item 6) renders a complete,
     copy-pasteable verification request (EVAL system prompt from `CONTENT["5.*"]`, the chunk payload,
     the response contract, FR-FC6) plus a results paste-box, alongside a notice that the paragraph
     leaves the device only when the user copies the block themselves (R-FC1). The user runs the block
     in a separate Claude conversation (or the companion Skillbank skill, §8) and pastes the JSON
     response back; the shell validates it against the response contract and hands it to the engine.
     No API key, no browser network request, ever.
  5. **Chunk-tagging affordance:** a "Tag as chunk" control, rendered only in Granular mode (Broad
     never chunks, AD-FC11). Marks the selection as `kind: "chunk"` with `x.userTagged: true`
     (FR-FC3), shaded distinctly from a claim tag. Toggle-off on re-tag.
  6. **Check claims control:** a button, separate from Tag claims (item 8), that fires Stage 4
     (AD-FC15) by rendering the request block (item 4). Tag claims alone runs Stages 1–3 and renders
     tags with no Source data. Disabled when there are zero checkable chunks (FR-FC6).
  7. **Category-tag control** (FR-FC13): folded into the claim-tagging (item 1) and chunk-tagging
     (item 5) affordances — after marking a claim or chunk, a five-option picker
     (Exists/Direct-quote/Paraphrase/Claimed/Observed) appears alongside the tag, optional and
     dismissible without a choice. Writes `x.userCategory` on the span; re-tagging clears both the tag
     and any category choice together. Omitted when `claimTagging.enabled` is absent/`false`, same
     opt-in pattern as items 1 and 5.
  8. **Custom Parse label** (`labels.parse`, general shell capability, first used here): a cartridge
     may declare `labels: {parse: "..."}` in `config.yaml`; the shell renders that string on the
     generic Parse button instead of "Parse". Fact-checking sets `labels.parse: "Tag claims"` — the
     button still runs the same shared `ENGINE.parse(text, selection)` call every cartridge uses
     (Stages 1–3 here), it just reads correctly for a fact-checking tool instead of the generic
     wording. Omitted → the button reads "Parse" exactly as today (opt-in, byte-identical for
     Grammar/Style, which declare no `labels` key).
- **FR-FC9** — Since the widget makes no network call, the only thing that can fail in the browser is
  the paste-back itself. Every chunk's Source cell carries an annotation from this vocabulary:

  | State | Source-cell text |
  |---|---|
  | Searched, no source found (strict default, AD-FC5) | `unverified — unable to find a reliable source` |
  | Unparseable or malformed pasted response | `unverified — invalid pasted result, re-paste` |
  | Non-checkable claim (opinion/prediction/prescription/definition) | `not checkable — <type>` |
  | Candidate source failed the double-check gate (AD-FC12) | `unverified — unable to find a reliable source` |
  | Malformed chunk payload (format-validation gate, FR-FC5, AD-FC14) | `unverified — internal format error` |

  Strings live in `factcheck_explainer.js` (cartridge-local). Stages 1–3 output is identical in every
  state; nothing is thrown, nothing renders blank (JS-2). The widget never makes a network request, so
  there's no offline/timeout/rate-limit state to define — the only browser-side failure is an
  unparseable paste-back (AC-FC16).

**Explainer**

- **FR-FC10** — `factcheck_explainer.js` exports the nine required names (`ParserShell.spec.md`
  FR-5). `tables(R)` renders the **Claim | Chunk | Source | Category** table (§6) — Category cell
  shows one of the five categories, from `x.chunks[i].category` when Stage 4 confirmed one, else
  `x.chunks[i].candidateCategory` marked unconfirmed. `rules(R)` deduplicates the cue-phrase/
  codification patterns applied; `toMarkdown(R)`/`toText(R)` export the same table shape;
  `funcOf`/`clauseOf` operate on claim spans (`phraseOf` returns `null`, AD-FC2); `posShort` returns
  `""`; `needSpace` uses standard English punctuation-spacing.

**Content compilation**

- **FR-FC11** — Tier-A reference material lives in three separate source documents, compiled once and
  consumed twice — by the engine as `CONTENT`, by the MiniWiki as displayable articles (single source
  of truth: an edit changes both after one rebuild):
  - `Fact-checking_codification_patterns.md` → `CONTENT["1.*"]` (codification/chunking patterns +
    non-checkable markers) — drafted separately, out of scope
  - `Fact-checking_cue_phrases.md` → `CONTENT["2.*"]` (cue phrases, proper-noun/number patterns) —
    seeded in scope for this build (§4-cue-phrases)
  - `Fact-checking_whitelist.md` → `CONTENT["3.*"]` (17 whitelist rows, §4) — seeded in scope
  - `Fact-checking_content.md` → `CONTENT["5.*"]` (strict-EVAL prompt, embedding the five-category
    question; `4.*` is retired — no verdict definitions exist) — drafted separately, out of scope

  `fact-checking/build/compile_fc_content.py` (stdlib-only) compiles all four into the standard
  `CONTENT` shape (`{"<id>": {n, l, d, e}}`, `ParserShell.spec.md` FR-3) — each document owns its
  number space, so the merge cannot collide — reusing `_modules/MiniWiki/build/extract_articles.py`'s
  `parse_frontmatter`/`scan_nodes` functions rather than reimplementing dual-dialect parsing. The same
  compiler emits the MiniWiki article JSON from the three Tier-A documents. `config.yaml`'s
  `files.content` points at the pre-compiled CONTENT JSON, and `miniwiki.enabled: true` +
  `miniwiki.articlesFile` wire the MiniWiki via the shell's existing FR-18 opt-in.

**Two UI surfaces**

- **FR-FC12** — The widget has exactly two UI surfaces:
  1. **Tags — on the text.** User-tagged claims/chunks are shaded in a neutral tag colour (FR-FC8.1,
     FR-FC8.7); AI-discovered claims render a distinct, lighter shade (no new shell colour machinery,
     AD-FC7). A chunked claim's chunks aren't shown by default — clicking the shaded claim reveals its
     chunk shading via the child spans FR-FC5 emits; clicking again collapses it.
  2. **Table — in the Explainer section.** The Claim | Chunk | Source | Category table (FR-FC10, §6)
     is the entire result surface.

## 4. Reference data

### Whitelist ("the-check-first-list-for-a-specific-topic" — CONTENT `3.*`, `Fact-checking_whitelist.md`, FR-FC11)

**All 17 rows, binding:**

| Topic | Check-first source |
|---|---|
| General facts | Encyclopaedia Britannica |
| Philosophy | Internet Encyclopedia of Philosophy |
| Evangelical Christianity | The Gospel Coalition |
| Australian news | ABC |
| Government / official matters | Official government sites (`.gov.au` etc.) |
| Legislation / laws | Legislation sites (AustLII etc.) |
| Technical questions | Official technical manuals / vendor documentation |
| Academic claims | Open-access journals |
| Medical / health (AU) | TGA + Healthdirect |
| Medical / health (international) | WHO |
| Public statistics (AU) | Australian Bureau of Statistics |
| Climate / environment | IPCC; Bureau of Meteorology (AU weather/climate) |
| Legal cases / judgments | AustLII / BAILII / CourtListener |
| Company / market claims | ASX announcements; ASIC registers |
| History | National Archives (AU); Britannica as fallback |
| Bible / theology (non-evangelical) | Official denominational or translation sites |
| Internet rumours / memes | Snopes / AP Fact Check (explicit secondary-source exception) |

### Cue phrases (CONTENT `2.*`, `Fact-checking_cue_phrases.md`, FR-FC11)

Discovery signals for Stage 2 (FR-FC4), grouped by the provenance category they most often hint at
(Stage 3 uses this as its candidate-category signal, AD-FC13/AD-FC16). Proper-noun and number
detection is pattern-level, not phrase matching, and covers the remaining cases (chiefly Exists).

| Signal type → likely category | Cue rule | Example phrases |
|---|---|---|
| Quotation marks → **Direct-quote** | An always-fire signal — the chunk's text is (or sits inside) a quoted span | *"…the report said, 'rates fell by 10 percent.'"* |
| Nearby attribution, no quotation marks → **Paraphrase** | A book, article, website, or person is named near the chunk, with no quotation marks | "according to", "X said", "X reported", "X stated", "per the [website]", "[Author]'s book argues" |
| Proper noun / number / title / name / common-knowledge phrasing → **Exists** | Pattern-level: capitalised proper nouns, numerals, titles, names, flatly-stated common-knowledge phrasing | *"Paris"*, *"World War II"*, *"10%"*, *"the 2024 WHO report"* |
| Free-standing descriptive language → **Observed** | Descriptive language with no person/book/website/article/organisation attached (evidentiary framing counts here too) | "we know that", "the data shows", "studies show", "research indicates", "surveys found" |
| Declarative or descriptive language tied to a source → **Claimed** | Connected to a named person, book, website, article, or organisation — what distinguishes it from bare Observed | "people say", "it is claimed", "it is said", "it is widely believed", "critics claim", "[Organisation] argues that…" |
| Illustrative example → mixed (chunk-dependent) | Introduces an example; category comes from what follows, not the phrase itself | "for example", "for instance", "such as" |

## 5. Decisions

- **AD-FC1 — No lexicon.** No stage depends on word-class lookups (discovery/codification are
  pattern-level, verification is world-knowledge-level), so `build_lexicon.py` is dropped rather than
  cloned "for parity" as dead weight.
- **AD-FC2 — `parser.levels: ["paragraph"]`, a single trivial level** (`StyleParser.spec.md` AD-S1
  precedent). Claim structure is carried by span `kind` + `x`, not focus-level zoom — claims are
  siblings, not a nesting hierarchy. Levels like `["claims","sources"]` would misapply the generic
  template's coarse→fine nesting assumption; the table Explainer serves that distinction better.
- **AD-FC3 — Retired: no API key exists.** *(History: this decision originally covered key/model
  storage under an AI-key run mode. Luke removed AI-key mode entirely — the widget is now a pure
  HTML/JS/CSS shell around the Claude-direct handoff, no key or model input anywhere, AD-FC9. Nothing
  in this spec references AD-FC3 any further; the ID stays retired rather than reused, per this
  document's convention for superseded decisions.)*
- **AD-FC4 — User tags (claim or chunk) are authoritative; discovery only adds; chunking only
  decomposes.** Stage 2 never overrides, splits, or reclassifies a user-tagged claim; Stage 3 may
  classify it checkable/non-checkable and chunk it, but the tag, span, and table row are never removed
  or merged — the same authority extends to user-tagged chunks. If a tagged chunk falls outside any
  existing claim, the engine synthesizes a minimal enclosing claim so it still has a row. Treating tags
  and discoveries as equal-weight candidates was rejected — that's silent tag loss, the fail-open
  behaviour this spec is designed against.
- **AD-FC5 — Strict = fail-closed search: no source found means no sources shown.** The EVAL returns
  only the sources it actually found; when none is found, the Source cell is empty — nothing asserted,
  graded, or fabricated. The widget's job is provenance, not adjudication: Tier B finds evidence the
  chunk was claimed by someone somewhere, not whether it's wrong or misleading. A four-value verdict
  model (`verified`/`false`/`misleading`/`unable-to-verify`) was considered and rejected.
- **AD-FC6 — Batched by ≤250-word input span, not by claim-count or by the whole input at once
  (revised 2026-09-13).** Originally "one batched request per fact-check run" — still true for the
  browser widget's copy-paste handoff, where one round-trip per run is the only cost that matters.
  The agent-run path (`!FactCheck`, §8) batches differently: the input is split into sequential
  ≤250-word spans (sentence-boundary-safe), each verified as its own pass, because an agent session
  pays per-token for its own search/fetch calls rather than for round-trips to a separate
  conversation — bounding each pass's token cost matters more there than minimising round-trip
  count. Cross-claim context within a 250-word span is preserved exactly as before; only spans
  larger than that no longer share one pass. Per-claim calls (one request per claim) remain
  rejected for both paths — still N× cost/latency with no shared context.
- **AD-FC7 — No result colours.** With no verdicts (FR-FC7) there are no verdict hues; the only span
  visuals are the claim/chunk tags (user neutral, AI lighter) plus the interactive chunk-reveal. The
  manifest keeps a minimal single-hue `clausePalette` only because the shell's FR-2 requires ≥1 entry.
- **AD-FC8 — The EVAL boundary is one-way: the backend never re-segments or re-tags.** It may refine a
  codified `statement` for searching (returned in `note`), but never rewrites claim spans, `raw` text,
  or `x.userTagged`. Span geometry must be deterministic offline vs online, and user tags stay
  inviolate (AD-FC4).
- **AD-FC9 — The widget makes zero network requests, ever; all search happens outside it (Luke,
  revised).** There is no AI-key mode, no TIERB portal, no `fetch` anywhere in the cartridge — Tier B
  is exclusively the copy-paste handoff (FR-FC6, FR-FC8.4/.6): the shell renders the request block and
  validates whatever JSON gets pasted back, nothing more. The whitelist/open-web/Wayback search
  happens entirely in the separate Claude conversation (or the companion Skillbank skill, §8) the user
  runs it in. *Rationale:* Luke wanted the widget to be a pure HTML/JS/CSS shell with no key, no
  backend, and no way for it to leak the paragraph anywhere except by the user's own copy-paste action
  — stronger than the AI-key mode this decision originally covered, which still made one automated
  network call. *Rejected alternative:* browser-side `fetch` to a configured AI-key endpoint (this
  spec's earlier design) — works, but keeps a key, a portal seam, and a network-error surface the
  widget no longer needs; browser-side `fetch` straight to search/Wayback APIs was rejected even
  earlier — CORS, key, and rate-limit multiplication per site.
- **AD-FC10 — Two fuzzy logics, one pipeline.** A (offline: discovery, codification, chunking) and B
  (online: provenance search) are architecturally distinct, meeting only at the chunk contract
  (FR-FC5 → FR-FC6). Keeping them separate means A's behaviour is byte-stable offline and B can be
  swapped or disabled without touching A. A single fused engine was rejected — it would couple the
  offline and online halves, so any B failure leaks into A's output.
- **AD-FC11 — Chunk only when needed, and only in Granular mode.** A claim is split only as far as
  necessary for each chunk to be individually verifiable. Broad mode never chunks — its point is speed
  and obvious claims. Every chunk costs one verification unit (AD-FC6, R-FC2); over-splitting yields
  unverifiable fragments ("fell" alone can't be verified — "vaccination rates fell" can), while
  under-splitting lumps several propositions into one chunk that can't be provenanced as a unit.
- **AD-FC12 — Found sources are double-checked before being cited.** Every source the search finds
  must **exist** (its `url` resolves, live or archived) and **say what it is recorded as saying** (the
  page's content supports the chunk and the recorded quote appears there) before appearing in
  `sources`; a source failing either check is dropped, leaving the Source cell empty if all candidates
  fail (AD-FC5). Runs inside the EVAL's single round-trip — the widget still makes exactly one network
  request per Check claims click. Shipping sources unverified (leaving the fabrication risk to
  the user) was rejected, as was a visible `doubleChecked` flag instead of dropping failures.
- **AD-FC13 / AD-FC16 — Five-category provenance taxonomy: Exists / Direct-quote / Paraphrase /
  Claimed / Observed.** One blended provenance question ("was it said, claimed, exists, etc.") is
  replaced with five named categories, each a distinct kind of evidence: **Exists** — the thing itself
  exists or existed; **Direct-quote** — the exact words are attributable to a source verbatim,
  verified by the found-source double-check's quote match (AD-FC12); **Paraphrase** — the substance is
  attributable to a source, but not verbatim; **Claimed** — someone asserted it as fact, without
  necessarily a quote; **Observed** — witnessed, measured, or recorded as data. Stage 3 proposes a
  `candidateCategory` per chunk (from its cue signal or a user tag, FR-FC13) as a search hint; Stage 4
  confirms or corrects it and returns the confirmed `category` (FR-FC5, FR-FC6) — a wrong guess never
  becomes an authoritative answer. A named taxonomy gives Tier B a narrower search target than one
  blended question, and splitting Direct-quote from Paraphrase reflects that they're evidentially
  distinct claims with distinct cue signals (quotation marks vs. nearby attribution without them,
  §4-cue-phrases) that Tier A can detect separately. Rejected: one blended category (no way to show
  what kind of evidence was found); treating Tier A's guess as final (the same fail-open risk AD-FC4
  rejects for claim tagging); a single "Quoted" label (ambiguous between verbatim and gist).
- **AD-FC14 — Tier A validates its own chunk payload before handoff.** Mirroring Tier B's
  found-source double-check (AD-FC12), a format-validation gate on the Tier A side checks every
  checkable chunk against its contract shape (`chunkId`, `text`, `type`, `candidateCategory`) before
  the Stage 4 batch; a failing chunk is excluded and flagged (`unverified — internal format error`,
  FR-FC9), never sent, never crashing. The codification-patterns document is drafted separately and
  could later produce malformed chunks — validating before handoff means a defect surfaces as a
  visible annotation, not a crash or a garbage request to Tier B.
- **AD-FC15 — Stage 4 fires only on an explicit "Check claims" click, never automatically on Tag
  claims.** Tag claims (this cartridge's Parse) runs Stages 1–3 only — free, offline, instant. Stage 4
  is the only costly, privacy-sensitive, latency-heavy part of the pipeline (R-FC1, R-FC2); firing it
  on every keystroke-driven Parse (as Grammar/Style do for their all-offline passes) would silently
  multiply network calls, cost, and exposure with no chance to review Stages 1–3 first. A debounced
  auto-run was rejected too — it still fires without explicit consent. Splitting Tier A's trigger into
  its own labelled **Tag claims** button (rather than leaving it as the shell's generic, unlabelled
  Parse) makes the two-stage pipeline legible on its own — a user sees "tag the claims" and "check the
  claims" as two distinct, self-explanatory actions instead of "Parse" plus an oddly-separate second
  button.
- **AD-FC17 — User category tagging is a hint layered on the claim/chunk tag, not a bypass of Stage
  4.** Unlike the claim/chunk tag itself, a category tag doesn't get AD-FC4's full authority: Stage 4
  still confirms or corrects it exactly like a cue-derived guess. The claim/chunk tag says "this span
  matters, verify it" — a judgment only the user can make; the category tag says "I think this is a
  quote/claim/etc." — a guess about the outside world, the same kind of guess AD-FC13 already
  established Stage 4 must be free to correct. Making the category tag authoritative was rejected — a
  wrong user guess would suppress Stage 4's actual finding, the same fail-open risk AD-FC13 rejects
  for Stage 3's own guesses. Requiring a category on every tag was also rejected — most tags are about
  *what* matters, not *what kind* of provenance it is; making it optional keeps tagging fast for the
  common case.

## 6. Explainer format

**Four columns, `Claim | Chunk | Source | Category`** — the entire output (FR-FC7). One row per chunk
(an unchunked claim's single chunk still gets a row; Chunk cell blank on it). The Claim cell holds the
codified statement, repeated on each of a chunked claim's rows — no glyph, no verdict, no confidence.
The Source cell lists the sources the search found **and double-checked** (FR-FC6) for that chunk:
each as `name — url`, archived URL appended when the evidence came via Wayback
(`name — archived url (original dead)`); when verification produced nothing usable, the cell holds an
error message instead (FR-FC9's vocabulary). The Category cell shows one of the five categories
(AD-FC13, AD-FC16) — Stage 4's confirmed `category` when it ran successfully, otherwise Stage 3's
`candidateCategory` (its own guess, or the user's tag) rendered with an `(unconfirmed)` suffix, so a
guess is never shown as a finding.

Layer 1 colours nothing by result — the only span visuals are the claim/chunk shading (user neutral,
AI lighter), with chunk shading revealed interactively per claim (FR-FC12, AD-FC7). The table is the
second UI surface; the first is the tags on the text. Source-cell links are clickable; clicking one
expands its optional verbatim `quote` when the EVAL returned one. Layer 3 (token zoom) is unused —
single-level (AD-FC2), no POS labels.

`rules(R)` renders "the rules that fired" — cue phrases and codification patterns applied,
deduplicated per unique `CONTENT` id. `toMarkdown`/`toText` export a pipe-delimited table matching the
same four-column shape, so a checked paragraph pastes cleanly into a marked essay.

## 7. Worked-example ACs

- **AC-FC1 — User tag + attribution.** Tagging *"global vaccination rates fell by 10% last year"*
  inside *"According to a 2024 WHO report, global vaccination rates fell by 10% last year"* codifies
  it, chunks it (`10%` → number, `2024 WHO report` → proper-noun), proposes `candidateCategory`
  (`10%` → `observed`; `2024 WHO report` → `exists`); Check claims confirms/corrects each and
  populates Source with the whitelist source(s) found.
- **AC-FC2 — Cue-phrase discovery.** *"People say crime is at an all-time high"* is promoted via the
  "people say" cue, no tag needed. *"I think the new policy is unfair"* has no cue and no tag → not a
  claim, no row (Broad mode; Granular would still check any proper nouns/numbers present).
- **AC-FC3 — Strict = no source found.** A chunk with no source found renders an empty Source cell
  annotated `unverified — unable to find a reliable source` — no grade, no verdict.
- **AC-FC4 — Whitelist routing.** A philosophy claim searches the Internet Encyclopedia of Philosophy
  first; a general-knowledge claim, Britannica; an Australian-law claim, legislation/government sites.
- **AC-FC5 — Wayback fallback.** A dead whitelist page → the EVAL retrieves the archived version; the
  Source cell shows both URLs.
- **AC-FC6 — Zero network requests, always.** Double-clicked from Dropbox with Wi-Fi off, Stages 1–3
  and the Check claims request-block render identically to the online case — the widget makes no
  network call in any state, so there's nothing "offline" behaves differently from. Superseded by
  AC-FC16 as the single Tier B AC.
- **AC-FC7 — Retired: no API key exists.** *(History: covered the "no key set" state under the removed
  AI-key mode. Superseded by AC-FC16 — the only Tier B failure now is an unparseable paste-back.)*
- **AC-FC8 — Over-cap input (1001+ words).** Blocked by the shell's FR-8 warning, no parsing —
  inherited, zero cartridge work.
- **AC-FC9 — Grammar regression.** Rebuilding Grammar through the extended assembler is
  byte-identical to shipped `Grammar_parser.html` (all eight FR-FC8 additions are no-ops for it,
  including the custom Parse label — Grammar's button still reads "Parse") — proven by diff.
- **AC-FC10 — MiniWiki reference.** The wiki tab shows the three Tier-A reference documents as
  browsable articles, derived from the same compiled data the engine uses.
- **AC-FC11 — Granular vs Broad.** Granular checks every proper noun/number even without a cue
  phrase, and chunks when needed; Broad checks only obvious claims and never chunks.
- **AC-FC12 — Chunked table.** A compound claim renders ≥2 rows; an unchunked claim in the same parse
  shows a blank Chunk cell on its single row.
- **AC-FC13 — Provenance, not truth.** The EVAL asks only which category fits and what evidence
  supports it — never true/false/misleading.
- **AC-FC14 — Two UI surfaces.** User-tagged and AI-discovered claims shade distinctly; the Explainer
  shows the four-column table; no other UI exists besides Tag claims, Check claims, the Granular/Broad
  toggle, and the tagging controls.
- **AC-FC15 — Chunk only when needed (Granular).** A short simple claim stays unchunked; a compound
  claim splits only as far as needed. Broad never chunks.
- **AC-FC16 — Claude-direct handoff (the only Tier B path).** Clicking Check claims renders the
  request block with no network request; a valid pasted response populates the table; malformed or
  unparseable JSON shows `unverified — invalid pasted result, re-paste` with empty Source cells
  everywhere, Stages 1–3 output unaffected.
- **AC-FC17 — Found-source double-check.** A candidate whose URL doesn't resolve or whose page lacks
  the recorded quote is dropped; if every candidate fails, the cell shows
  `unverified — unable to find a reliable source`.
- **AC-FC18 — Five-category classification, Tier A hint vs Tier B confirmation.** *"According to
  police, the suspect fled the scene"* (no quotation marks) → Stage 3 proposes `paraphrase`; after a
  Check claims round-trip Stage 4 confirms it, or — before pasting a response back — the cell shows
  `Paraphrase (unconfirmed)`. *"The bridge collapsed in 2019"* → Stage 3 proposes `observed`; Stage 4
  confirms it or corrects it to `claimed` if the source frames it as an unverified allegation — the
  Explainer always shows Stage 4's corrected category, not Stage 3's guess. *'"The suspect fled
  north," police said'* (quotation marks present) → Stage 3 proposes `direct-quote` instead, the
  always-fire quotation cue taking precedence.
- **AC-FC19 — Seeded whitelist and cue-phrase content.** Both ship with real content — not TODO
  stubs — so Stage 2's discovery and Stage 4's whitelist routing work on first build.
- **AC-FC20 — Tier A format-validation gate.** A chunk missing its `text` field (simulated) is caught
  before handoff: excluded from the batch, row shows `unverified — internal format error`, no crash,
  other chunks in the claim unaffected.
- **AC-FC21 — Chunk tagging, granular-only.** In Granular mode, "Tag as chunk" marks the selection
  regardless of Stage 3's own chunking judgment, synthesizing an enclosing claim if needed; in Broad
  mode the control isn't rendered.
- **AC-FC22 — Check claims is decoupled from Tag claims.** Tag claims populates claim/chunk shading
  and the Claim/Chunk/Category columns with no network request; only Check claims populates Source.
- **AC-FC23 — Claim shading with interactive chunk reveal.** A chunked claim shows as one shaded span
  until clicked, then reveals distinguishable chunk shading; clicking again collapses it. An unchunked
  claim has nothing to reveal.
- **AC-FC24 — User category tagging.** Tagging a claim and picking **Claimed** writes
  `candidateCategory: "claimed"` verbatim, shown as `Claimed (unconfirmed)` before Check claims.
  If Stage 4 instead finds a verbatim quote, the cell shows `Direct-quote`, not `Claimed` — the tag
  guided the search without binding the finding. An untagged chunk in the same claim is unaffected.
- **AC-FC25 — Direct-quote vs Paraphrase cue detection.** *'The minister said, "we will not raise
  taxes"'* → quotation marks trigger `direct-quote`. *"The minister's office said taxes would not
  rise"* (no quotation marks, nearby attribution) → `paraphrase`. Both pass validation and are
  searched individually, each keeping its own Category cell.

## 8. Prerequisites & dependencies

- **Required first:** this spec approved. `ParserShell.spec.md`, `GrammarParser.spec.md`,
  `StyleParser.spec.md` read and cited (done, this file). No open question blocks code start (§11).
- **Coordinate-with:** `ParserShell.spec.md` gains FR-FC8's eight additions as FR-24+ (claim-tagging,
  tierB enabling, granularity toggle, verification request block + paste-box, chunk-tagging, Check
  claims control, category-tag control, custom Parse label), annotated as Fact-checking-originated.
- **Content:** `Fact-checking_whitelist.md` and `Fact-checking_cue_phrases.md` are seeded in this
  build (§4). `Fact-checking_content.md` (`5.*`, the strict-EVAL prompt, implementing the double-check
  and the five-category question) and `Fact-checking_codification_patterns.md` (`1.*`) are drafted
  separately, per FR-FC11 — deferred content work, not a code blocker (same treatment both documents
  have always had).
- **Companion Skillbank skill — built 2026-09-13, now the primary Tier B path.** Originally tracked
  here as downstream/out-of-scope future work; per Luke's explicit architecture decision this
  session, `System/Skillbank/Teaching/!FactCheck/skill.md` now runs Stages 1–4 directly inside an
  agent session, using its own WebSearch/WebFetch instead of the copy-paste round trip. It reuses
  this spec's chunk contract, five-category taxonomy, 17-row whitelist, and found-source
  double-check verbatim (own AD-FC6 batching variant, see above) rather than `CONTENT["5.*"]`'s
  system-prompt text, since there is no separate paste-back conversation to prompt — the agent *is*
  the Tier B executor. Sandbox-tested against a live worked example
  (`System/Sandbox/factcheck-skill-test.md`). **The browser widget itself gains no third path from
  this and remains unbuilt** — AD-FC9's zero-network-request design for that surface is unchanged;
  the widget is TE-08's remaining next action, not superseded by the skill.

**Gate:** none. Code can start once this spec is approved; `Fact-checking_content.md` and
`Fact-checking_codification_patterns.md` can be drafted in parallel or after, same as any other
deferred content (FR-FC11).

## 9. Risks

- **R-FC1 — Privacy:** the widget itself never makes a network request; the paragraph leaves the
  device only by the user's own copy-paste into a separate Claude conversation. Mitigation: the
  request block's notice states this plainly (FR-FC8.4); Stages 1–3 are fully local, always.
- **R-FC2 — Copy-paste burden:** more checkable chunks means a bigger block to paste and a longer
  reply for Claude to produce, in whatever conversation the user runs it in — cost/latency there is
  outside the widget's control. Mitigations inside the widget: the explicit Check claims control so a
  block is only generated when asked for, batching everything into one block per run (AD-FC6), chunk-type
  exclusion, and a Broad default (Granular multiplies the batch with every proper noun/number).
- **R-FC3 — Hallucinated sources:** a backend can cite a source that doesn't exist or misattribute a
  quote. Mitigation: the found-source double-check is a hard gate (FR-FC6, AD-FC12); the strict rule
  forbids asserting beyond what was found; each URL is exposed for the user to open.
- **R-FC4 — Whitelist gaps:** a topic with no whitelist row falls to open-web search — still strict,
  weaker than a whitelisted topic. Mitigation: 17 rows cover the common gaps; new rows are a doc edit
  + rebuild, engine untouched.
- **R-FC5 — Discovery/codification/chunking false negatives:** an untagged, cue-less claim is never
  checked (Granular mitigates via proper-noun/number coverage); mis-codification may search the wrong
  chunk. Mitigation: user tagging is authoritative, and the Chunk cell shows the exact text searched.
- **R-FC6 — Wayback coverage:** not every dead page is archived. Mitigation: the empty Source cell
  absorbs the gap honestly.
- **R-FC7 — Category misclassification:** Stage 3's guess can be wrong. Mitigation: it's only ever a
  search hint — Stage 4's confirmed category is always shown when Stage 4 ran; the guess is marked
  `(unconfirmed)` otherwise, never presented as a finding.
- **R-FC8 — Malformed Tier A payload:** a future content-document edit could emit a chunk that doesn't
  match the contract. Mitigation: the format-validation gate excludes and flags it (FR-FC5, AD-FC14)
  instead of sending it or crashing — the same defence-in-depth pattern as AD-FC12, on the Tier A side
  of the boundary.

## 10. Verification — definition of done

- [ ] OQ-FC1/OQ-FC3/OQ-FC4 resolved (§11); OQ-FC2 retired (AI-key mode removed) — no open question
      remains
- [ ] All four source documents in place: whitelist and cue-phrases seeded (§4); content and
      codification-patterns drafted separately — all four compiled by `compile_fc_content.py` into
      `CONTENT` and the MiniWiki article JSON
- [ ] `factcheck_engine.js` / `factcheck_explainer.js` unit-tested (`node --test`); paste-back
      validation tested against the response contract (FR-FC6) and against malformed input (FR-FC9)
- [ ] AC-FC1–AC-FC25 demonstrated (browser-verified); AC-FC7 retired, no longer applicable
- [ ] `ParserShell.spec.md` carries FR-FC8's eight additions as FR-24+, annotated as this spec's origin
- [ ] Grammar's cartridge rebuilds byte-identical post-chassis-change (AC-FC9)
- [ ] `TE-08` registry, `Parser_guide.md` (§2.1 row, §2.3 Explainer, §2.4 open items),
      `parser-widgets-research.md` §Fact-checking, and `Fact-checking_content.md`'s status all updated
      to match reality
- [ ] This spec's Status set to `Done` and moved to `Fact-checking/Specs/Done/FactCheckingParser.spec.md`

## 11. Open questions

- **OQ-FC1 — Whitelist additions — resolved.** All 17 rows approved, binding (§4).
- **OQ-FC2 — Backend remainder — retired (AI-key mode removed, Luke).** Originally tracked which
  AI-key provider/model to call and how the key would be stored. Luke removed AI-key mode from the
  design entirely — the widget is now a pure HTML/JS/CSS shell around the Claude-direct handoff, no
  key or model input anywhere (AD-FC9, FR-FC8). Nothing here still needs a decision: the request
  block's wording is `Fact-checking_content.md`'s content, already tracked as deferred, non-gating
  work under FR-FC11 (same as the codification-patterns document); the paste-back validation rules
  are already fully specified by FR-FC6's response contract. No open question remains.
- **OQ-FC3 — Source-cell annotations — resolved.** Human-readable messages, canonical in FR-FC9.
- **OQ-FC4 — Granularity default + persistence — resolved.** Default `"broad"`; not persisted —
  each session resets to the manifest default.
