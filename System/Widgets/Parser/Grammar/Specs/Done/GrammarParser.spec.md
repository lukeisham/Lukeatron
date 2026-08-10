# Grammar Parser — Technical Spec

| Field | Value |
|---|---|
| **Type** | Build |
| **Date** | 2026-07-05 |
| **Status** | Done (2026-07-05) — built, verified, and accepted by Luke |
| **One-liner** | A single-file browser Grammar Parser (one sentence in → three-pass Tier-A analysis, backed by a 20,000-word embedded SQLite lexicon → layered display + four-row Explainer), architected as five swappable modules so it becomes the reference chassis for all nine teaching-aide parsers. |

## 1. Motivation

Luke marks essays and teaches grammar; he needs a double-clickable tool that parses one sentence at a time and shows its grammatical anatomy at every level — sentential, clausal, phrasal, lexical, conventions, punctuation, and common errors — using the taxonomy he has already curated in `System/Suggestions/Grammar_contents.md`.

This is deliberately the **first of nine** teaching-aide parsers (Parser_guide.md Part 2). The deeper motivation is architectural: build the parser as a **chassis + cartridge** system, where the chassis (UI layers, engine harness, result schema, explainer slot, export bar) is generic, and everything grammar-specific arrives as data (the compiled content) plus two small pluggable modules (fuzzy rules, explainer renderer). Future parsers (Style, Rhetoric, Logic, …) are then built by swapping cartridges, not rewriting apps.

## 2. Scope

**In scope:**
- One self-contained `Grammar_parser.html` (no build step, no CDN, works offline). *Amended 2026-08-09: built widgets are now centralised in `System/Widgets/Parser/`; this store keeps only the editable source (`build/`), the content file and the lexicon.*
- The five-module internal architecture (§5 AD-1) and the `ParseResult` JSON contract between engine and display.
- Compilation of `Grammar_contents.md` (all seven top-level sections, IDs 1–7) into the file's `CONTENT` object, preserving the file's numbering as the ID space.
- A ~20,000-word POS-tagged lexicon, sourced from an existing open word list, built as a real SQLite `.db` and embedded into the shipped HTML via sql.js/WASM (FR-19–21, AD-1a).
- Three-pass Tier-A engine: pass 1 bottom-up lexical, pass 2 top-down syntactic + semantic, pass 3 conventions/errors.
- Full §3 display-layer stack from Parser_guide.md: input area, Layer 1 colour spans + key, Layer 2 expanders + icons, Layer 3 tokens + hover pop-ups, spell checker, export bar.
- Explainer: the four-row word-column table (row 1 sentence, rows 2–3 syntax, row 4 semantics).
- A `CONFIG` manifest making cap, input unit, colours, icon set, and layer mapping declarative.
- Updating `Parser_guide.md` afterwards to point future builds at this chassis.

**Out of scope:**
- Any Tier-B (API/agent) function — Grammar is 100% Tier A per the guide. The chassis reserves a Tier-B slot but this build wires nothing to it.
- The other eight parsers (they get their own specs, each citing this one as prerequisite).
- A served app / live file reading — single-file HTML only; content changes require a rebuild from the `.md` (guide §5a).
- Editing or extending the linguistic content itself — `Grammar_contents.md` is compiled as-is; content corrections are a separate content-file edit + rebuild.
- Multi-sentence / paragraph parsing, batch mode, saving history between sessions.
- Full NLP correctness. This is a fuzzy rule-based teaching aid, not a research-grade parser (see §6 risk R-1).

## 3. Requirements

**Chassis (generic — every future parser inherits these):**

- **FR-1** — The asset is one `.html` file: all CSS/JS/WASM/data embedded inline (base64 where binary), zero external network requests at runtime, double-clickable, fully functional offline.
- **FR-2** — Internal code is organised as five named modules with fixed interfaces (§5 AD-1): `CONFIG`, `CONTENT`, `ENGINE`, `EXPLAINER`, `UI`. A future parser is produced by replacing `CONTENT` wholesale, rewriting `ENGINE.rules` and `EXPLAINER.render`, and editing `CONFIG` — with **no changes** to the `UI` module or the harness.
- **FR-3** — The engine's only output is a `ParseResult` JSON object (in memory) conforming to the schema in §5 AD-2. All display layers, the Explainer, and all export formats read exclusively from `ParseResult` — never from the DOM or from each other.
- **FR-4** — Input area: semi-plain-text field (italics, bold, dot points survive paste), **Parse** button, **Display All** button (Layers 1+2 together), spell-check toggle.
- **FR-5** — Display layers per the guide's §3 vocabulary: Layer 1 inline colour spans + colour key above the text; Layer 2 click expanders + in-text icons with icon bar; Layer 3 right-click tokenized labels (custom context menu suppressing the browser default inside the text area) + hover pop-ups.
- **FR-5a** — **Focus-level selector** (chassis): a control offering the asset's structural levels (from `CONFIG`; for Grammar: Sentential · Clausal · Phrasal · Lexical). The selected level renders at full intensity; **enclosing levels remain visible but faded** (reduced opacity/desaturation), so structural context is never lost — e.g. at Lexical focus, word colours are full-strength while clause boundaries and shading sit faded behind them. **Display All** shows all levels at full intensity together.
- **FR-6** — Spell checker: red fuzzy (wavy) underline on suspect words in the input area, with a one-click **replace** (top suggestion) and one-click **ignore** per word; runs before analysis; toggleable.
- **FR-7** — Export bar: print to PDF (with or without UI chrome), copy as Markdown, copy as plain text. **Exports contain the Explainer content only** — the tabled sentence plus the relevant-rules extract — rendered from `ParseResult` + `CONTENT`; the coloured interactive sentence view is screen-only and never exported.
- **FR-8** — Input cap enforced from `CONFIG` (Grammar: 100 words). Over cap → visible warning, parsing blocked, text never silently truncated.
- **FR-9** — Explainer is a separate module invoked on request (an **Explain** button), rendering only from `ParseResult` + `CONTENT` explanation text; the parser is fully usable without ever opening it.
- **FR-10** — A footer shows asset name, version, build date, and the content file it was compiled from. The asset carries a **custom app glyph**: an inline SVG mark (a stylised parse-tree/monogram in the app's accent colour) rendered beside the heading **and** embedded as a data-URI favicon in the page `<head>`, so the browser tab shows it too — no external image file.
- **FR-11** — Fuzzy matching throughout the engine: stems, common inflections, near-miss tolerance, weighted confidence scores (0–1) rather than boolean matches. Confidence drives Layer-1 shade intensity.
- **FR-12** — The chassis exposes a no-op Tier-B slot (`ENGINE.tierB`, disabled with a greyed-out UI note) so future Tier-B parsers plug in without structural change.

**Grammar cartridge (this asset's specifics):**

- **FR-13** — `CONTENT` is compiled from `Grammar_contents.md` preserving its outline numbering as stable IDs (e.g. `1.3` Complex Sentence, `3.6` Participial Phrase, `5.3.1` Parallelism, `7.4` Comma Splice), each node carrying: id, name, level, definition, example(s), and (for §5–§7 items) the "primarily affects" scope.
- **FR-14** — Pass 1 (bottom-up lexical): tokenize; tag each word's class (§4.1), inflection features (§4.2), tense/aspect for verb groups (§4.3), determiner/quantifier type (§4.4) by querying the embedded lexicon (FR-19) first, falling back to morphological rules (suffix/inflection patterns) for any word not found. **No token may end pass 1 untagged** — every token, including coordinating conjunctions between clauses, punctuation, and interjections, receives at least one tag (however low-confidence); a token with no tag is a defect, rendered as a visible "untagged" flag, never skipped silently.
- **FR-19** — A **~20,000-word POS-tagged lexicon** is built as a real SQLite database (`Grammar_lexicon.db`) using dev-side tooling, then **embedded inside the single HTML file** via [sql.js](https://sql.js.org/) (SQLite compiled to WASM): the WASM binary and the compiled `.db` are both base64-encoded and inlined at build time, so the shipped asset stays one file with zero runtime network requests (FR-1). The `.db` itself is a real, independently-queryable SQLite file during development/maintenance (openable in any SQLite browser); only the *shipped copy* is baked into the HTML.
- **FR-20** — The lexicon's source data is an **existing open POS-tagged English word-frequency list** (not hand-authored line by line at this scale) — schema: `word, pos_primary, pos_alternates, features (tense/countability/irregular-form flags), frequency_rank`. The specific source list, its licence, and the retrieval date are recorded in a provenance note in the build script and in this spec's §5 decisions once chosen.
- **FR-21** — A **build script** (Python, dev-side only — not shipped in the HTML) performs: fetch/prepare the source word list → tag/normalise into the lexicon schema → write `Grammar_lexicon.db` → base64-encode the `.db` and the sql.js WASM binary → inject both into `Grammar_parser.html`'s template. Rebuilding the asset after a lexicon correction means re-running this script, not hand-editing the HTML.
- **FR-15** — Pass 2 (top-down syntactic + semantic): identify clauses (§2: independent, dependent; noun/adverbial/relative), phrases (§3: NP, VP, PP, AdjP, AdvP, participial, infinitive, gerund, absolute, appositive), and classify the whole sentence by structure (§1.1–1.6) and purpose (§1.7).
- **FR-16** — Pass 3 (conventions): check governing conventions (§5: agreement, order, parallelism, ellipsis, consistency, voice, modality, negation, advanced constructions), punctuation patterns (§6), and flag common error patterns (§7) — each finding cites its content ID.
- **FR-17** — Layer mapping for grammar, per focus level (FR-5a), using a **structural-kinship colour model**: colour families inherit down the parse tree — each clause is assigned a distinct hue; its phrases render as shades of that hue; each word renders in a tint of its parent phrase/clause family. "Related" = belongs to the same structural unit, and a word's colour stays consistent across focus levels.
  - **Sentential focus:** whole-sentence classification (structure 1.1–1.6 + purpose 1.7) as a labelled summary line; clause divisions marked boldly; everything below faded.
  - **Clausal focus:** clause hues at full intensity with clause-type labels (§2); phrase/word detail faded.
  - **Phrasal focus:** phrase shades at full intensity with phrase-type labels (§3); clause hues faded behind them.
  - **Lexical focus:** per-word colour tints at full intensity with word-class tags (§4); clause and phrase structure visible but faded behind the words.
  - Across all levels: Layer 2 icons = conventions + error flags (§§5–7) — **error icons appear only when an error is actually flagged; no "0 errors" / "none" placeholder is shown** in the icon bar or the Explainer's rules extract. Layer 3 tokens = word-class labels (§4) on right-click. The colour key above the text updates to the active focus level.
  - **Hover pop-ups are focus-sensitive:** the hover text for any element describes it at the currently selected focus level — Sentential focus: which sentence part / clause of the classified sentence you are over; Clausal: the clause's type and role (with `CONTENT` definition); Phrasal: the phrase's type; Lexical: the word's class and features. Convention/error icons' hover additionally explains **how the check was computed** (e.g. agreement: "subject 'he' is 3rd-person singular; verb 'was' is the 3rd-person singular past form of 'be' — number and person match"), not just what the rule means.
- **FR-18** — Explainer has **two parts**, in order:
  1. **The tabled sentence** — one column per word; row 1 the sentence's words; row 2 phrase membership; row 3 clause membership + sentence-level role; row 4 functional note citing the clause-element roles defined in `CONTENT` §2.6 (subject, direct/indirect object, subject/object complement, adverbial — per OQ-3, no thematic roles). Long sentences wrap into stacked column groups for print.
  2. **Relevant rules, extracted** — below the table, every distinct `CONTENT` node actually hit by this sentence's findings (clause/phrase types used, conventions checked, errors flagged — one entry per unique id, not per occurrence) rendered as **dot points grouped under sub-headings by category** (e.g. "Clauses", "Phrases", "Conventions", "Errors flagged"), each dot point giving the rule's name, its definition, and its `CONTENT` example — pulling directly from the content file so the Explainer never invents wording. This is a curated excerpt of the taxonomy, not the full content file.

**Acceptance criteria** (observable, testable — worked example per guide checklist item 7):

- **AC-1** — Parsing "He was an old man who fished alone in a skiff in the Gulf Stream and he had gone eighty-four days now without taking a fish." yields: sentence type **compound-complex (1.4)**, declarative (1.7); two independent clauses; "who fished … Stream" as a relative clause (2.5); "in a skiff" and "in the Gulf Stream" as prepositional phrases (3.3); "had gone" tagged past perfect (4.3.7); "taking a fish" as a gerund phrase (3.8). Layer 1 shows clause/phrase spans with a key; the Explainer renders the four-row table for all words.
- **AC-2** — Parsing "It was raining heavily, we decided to stay inside." flags a **comma splice (7.4)** as a Layer-2 icon whose expander cites the correction options from `CONTENT`.
- **AC-3** — Parsing "She enjoys reading, swimming, and to ride her bike." flags **faulty parallelism (7.6)** and the expander cross-references rule 5.3.1.
- **AC-4** — Parsing "Call me Ishmael." identifies an imperative (1.7 / 5.7.6) with an implied "you" subject (5.3.2) — demonstrating fuzzy/structural inference, not just surface matching.
- **AC-5** — A 101-word input shows the over-cap warning and refuses to parse; nothing is truncated.
- **AC-6** — With the file opened from disk with networking disabled, every feature works **including embedded-lexicon lookups** (e.g. correctly tagging the irregular verb "fished"/"had gone" and the noun/verb-ambiguous "fish" in AC-1's sentence via the SQLite lexicon, not just morphology fallback); the Tier-B slot shows as disabled.
- **AC-9** — Querying the shipped asset's embedded lexicon for a sample of ~20 known-tricky words (irregular verbs, noun/verb ambiguous words, common closed-class words) returns correct POS tags, confirming the sql.js/WASM embedding round-trips the SQLite data faithfully from the standalone `Grammar_lexicon.db` used to build it.
- **AC-11** — Opening the Explainer for AC-1's sentence shows the four-row word table first, then below it sub-headed dot-point groups ("Clauses", "Phrases", "Conventions/Errors") listing each distinct rule actually hit — e.g. Relative Clause (2.5), Prepositional Phrase (3.3), Past Perfect (4.3.7), Gerund Phrase (3.8) — each with its `CONTENT` definition and example, appearing **once** even though some (e.g. Prepositional Phrase) occur twice in the sentence.
- **AC-10** — On AC-1's sentence, switching focus to **Lexical** shows every word tinted in its clause family's colour (all words of the relative clause share that clause's hue family) with word-class tags at full intensity, while the clause boundaries and shading remain visible behind them at reduced opacity; switching back to **Clausal** restores full-intensity clause hues. The colour key updates with each switch.
- **AC-7** — All three exports (PDF via print dialog, Markdown, plain text) contain **the Explainer content only** — the tabled sentence and the relevant-rules extract for AC-1's sentence — generated from `ParseResult`; the coloured sentence view does not appear in any export.
- **AC-12** — Hovering the word "man" in AC-1's sentence yields different pop-up text per focus level: at Sentential, its sentence part ("in independent clause 1 of a compound-complex sentence"); at Clausal, the clause type; at Phrasal, "noun phrase (3.1)"; at Lexical, "noun — head of the noun phrase". Hovering the agreement convention icon explains the computation ("subject and verb match in number and person: 'he' 3sg ↔ 'was' 3sg past"), and no "0 errors" indicator appears anywhere when nothing is flagged.
- **AC-8** — Chassis-reuse proof: the file contains a `CONFIG`/`CONTENT`/`ENGINE.rules`/`EXPLAINER.render` boundary such that a reviewer can identify, by section comments alone, exactly and only the blocks a Style-parser build would replace (verified by inspection against AD-1's module map).

## 4. Prerequisites & dependencies

- **Required first (build order):** `Grammar_contents.md` exists and is approved as the content source (✅ reviewed 2026-07-05). All open questions resolved (✅ OQ-1–OQ-4, 2026-07-05). This spec approved by Luke.
- **Choose-one (decision gates — decide before coding):** None — all resolved.
- **Coordinate-with:** `Parser_guide.md` — updated after the build (not concurrently) so the guide documents what was actually built; the other eight parser specs must cite this spec as their prerequisite, including the embedded-SQLite pattern (AD-1a) for any future parser that also needs a large lexicon.

**Gate:** work may start when Luke sets this spec's Status to Approved.

## 5. Decisions

- **AD-1** — *Decision:* **Five-module chassis/cartridge architecture inside one HTML file**, delimited by banner comments:
  ```
  ┌─ CHASSIS (never edited when cloning a new parser) ─────────────┐
  │ UI        — input area, layers 1–3 renderers, spell check,     │
  │             export bar, custom context menu, footer            │
  │ HARNESS   — wires Parse → ENGINE → ParseResult → UI/EXPLAINER; │
  │             enforces CONFIG caps; hosts the disabled Tier-B slot│
  ├─ CARTRIDGE (replaced per parser) ──────────────────────────────┤
  │ CONFIG    — name, version, input unit, word cap, colour map,   │
  │             icon set, layer→finding-kind mapping, tierB: off   │
  │ CONTENT   — compiled data from <Asset>_content.md (IDs, defs,  │
  │             examples, rule parameters) + an optional embedded  │
  │             SQLite lexicon (FR-19–21) for parsers needing one  │
  │ ENGINE.rules    — the fuzzy passes producing ParseResult       │
  │ EXPLAINER.render — findings → this asset's explainer format    │
  └────────────────────────────────────────────────────────────────┘
  ```
  *Rationale:* the guide's §5 architecture already separates result from display; hardening that into named modules with a declared "what you swap" boundary is what makes the remaining eight parsers cheap and keeps chassis fixes (e.g. a better export bar) copy-forwardable. *Rejected alternatives:* (a) multi-file app with a shared JS library — breaks the double-clickable single-file rule and Dropbox versioning-by-copy; (b) one generic shell that loads content at runtime — requires a served app or file-picker friction; (c) fully bespoke per-parser code — the status quo the nine-parser plan exists to avoid.

- **AD-1a** — *Decision:* **large lexicons stay single-file via embedded SQLite (sql.js/WASM), not a served app.** Considered against the guide's §1 escalation clause (serve a folder when an asset needs to read live files from disk): Luke asked for a real `.db` file (20,000 words), but chose to keep the double-click/no-server chassis rather than move to a served folder. Resolution: the `.db` is real SQLite during development (queryable/maintainable with normal tools) and dev-tooling (FR-21) bakes a base64 copy of the compiled `.db` **and** the sql.js WASM binary into the shipped HTML — so there is no separate file to keep alongside the asset in `Memory/Long-Term/Grammar/`, and no server is required. *Rationale:* preserves the single-file/double-click chassis for all nine future parsers (a served-folder model would be a permanent chassis change, not a Grammar-only one); sql.js reads the embedded bytes as an in-memory ArrayBuffer, so there's no `fetch()` of a local file to trip the `file://` CORS restriction that blocks that approach. *Rejected alternatives:* (a) served folder (`python3 serve.py`, per §1's own exception) — rejected because it breaks double-click for every future parser, not just this one; (b) plain JS object lexicon instead of SQLite — rejected because Luke specifically wants a real, independently queryable `.db` for maintenance, and SQLite's indexing handles 20k-row lookups faster than linear JS object scans anyway.

- **AD-2** — *Decision:* **`ParseResult` schema** (the FR-3 contract), identical across all nine parsers:
  ```json
  {
    "meta":    { "asset": "Grammar", "version": "", "cap": 100, "wordCount": 0, "overCap": false },
    "tokens":  [ { "i": 0, "text": "", "start": 0, "end": 0, "tags": [ {"id": "4.1", "label": "", "confidence": 0.0} ] } ],
    "spans":   [ { "start": 0, "end": 0, "id": "2.5", "label": "", "kind": "clause|phrase|…", "confidence": 0.0, "children": [] } ],
    "findings":[ { "id": "7.4", "label": "", "severity": "info|note|flag", "spanRef": 0, "explain": "", "confidence": 0.0 } ],
    "summary": { "classifications": [ {"id": "1.4", "label": ""} ], "counts": {} }
  }
  ```
  `tokens` feed Layer 3, `spans` feed Layer 1, `findings` feed Layer 2, `summary` feeds the header line and exports; the Explainer reads all four. *Rationale:* one schema means the UI/export/explainer chassis code never changes per parser; `id` always points into `CONTENT`, so every visual element can surface its definition + literary example for free. *Rejected alternatives:* per-parser ad-hoc result shapes (kills the chassis); rendering HTML directly from the engine (kills cheap exports and the optional Explainer).

- **AD-3** — *Decision:* **content numbering = ID space.** `Grammar_contents.md`'s outline numbers (1–7 with decimal children) are used verbatim as stable IDs in `CONTENT`, `ParseResult`, colour keys, and Explainer cross-references. *Rationale:* the taxonomy is already carefully numbered with internal cross-references ("See also 5.7.6", "Matches rule 5.3.1"); reusing it makes engine findings traceable to the reviewable source file, and content edits keep their identity across rebuilds. *Rejected alternatives:* generated slugs or sequential integers — both orphan the content file's own cross-references.

- **AD-4** — *Decision:* **the engine is deliberately fuzzy and confidence-weighted, and says so.** Pass 1–2 use a closed-class lexicon + morphological heuristics + phrase-structure templates, not a formal grammar; every tag/span carries a confidence score; low-confidence findings render at reduced shade with a "tentative" mark rather than being hidden. *Rationale:* a rule-based single-file parser will misread genuinely hard sentences; for a teaching aid, showing calibrated uncertainty is pedagogically better (and more honest) than false authority. *Rejected alternatives:* shipping a bundled ML tagger (file bloat, opacity, still imperfect); suppressing anything under a confidence threshold (hides exactly the interesting boundary cases).

- **AD-5** — *Decision:* **spell check is chassis, not cartridge**, implemented as a compact common-English word list + edit-distance-1 suggestion against it and the asset's own lexicon, kept intentionally modest. *Rationale:* every one of the nine parsers needs it (guide §3 utilities), so it belongs in the never-rewritten layer; a modest list with fuzzy matching serves the "catch typos before analysis" purpose without megabytes of dictionary. *Rejected alternatives:* full dictionary (file size), browser-native spellcheck attribute (no one-click replace, inconsistent across browsers).

- **AD-6** — *Decision:* **Explainer opens as a panel below the parsed text** (same page, printable), not a separate window, and is structured in **two stacked parts** (FR-18): the tabled sentence first, then a **rules-extracted** section below it — findings deduplicated to one entry per unique `CONTENT` id and grouped under category sub-headings as dot points (name + definition + example, quoted from `CONTENT` verbatim). *Rationale:* keeps single-file simplicity and prints naturally with the with/without-chrome export options; splitting "what happened in this sentence" (the table) from "why, per the rulebook" (the extracted rules) mirrors how Luke actually teaches — show the parse, then cite the relevant rule with its example — and deduplication keeps the extract short even on sentences with many repeated phrase types. *Rejected alternatives:* popup window (blocked-popup friction, breaks offline-file quirks in some browsers); one merged table with rule text inlined per cell (too cramped to hold a definition + example, and repeats the same rule text across every word sharing it).

- **AD-7** — *Decision:* **focus-level view model with structural-kinship colour inheritance** (FR-5a/FR-17), added 2026-07-05 at Luke's direction. The visual encodings are kept on separate channels so they never collide: **hue** = clause family; **shade within the hue** = phrase within that clause; **tint** = individual word's family membership at lexical focus; **opacity/desaturation** = focus fading of non-selected levels; **confidence** (OQ-1) = rendered as a dashed "tentative" underline + slightly reduced saturation, rather than by shade — because shade now carries structural meaning. Confidence is **per-tag, not per-word**: a word can be certain at one level and tentative at another (e.g. "days" is confidently a noun, but "eighty-four days" is only tentatively an *adverbial* noun phrase rather than an object), so the tentative marker appears **only at the focus level whose tag is uncertain** — that example shows dashed at Phrasal focus and clean at Lexical focus. *Rationale:* one consistent colour story from sentence to word ("this word is amber because it's in the amber relative clause") is pedagogically stronger than per-level unrelated palettes, and the fade keeps orientation when zoomed into words. *Rejected alternatives:* word-class colouring (all nouns one colour — colours would contradict the clause palette above them); grammatical-link colouring (agreement/antecedent pairs — sparser; kept as a possible future Layer-2 feature); encoding confidence by shade (shade now carries structural meaning, so confidence moved to the tentative-underline channel).

**Open questions** (with the default that applies if unanswered):

- **OQ-1** — Layer-1 shade intensity: should it encode **confidence** (how sure the engine is) or **nesting depth** (clause > phrase)? *Resolved 2026-07-05:* confidence — later refined by AD-7: shade now carries structural family meaning, so confidence renders as a dashed "tentative" underline + reduced saturation instead.
- **OQ-2** — *Resolved 2026-07-05, superseded by AD-1a/FR-19–21:* lexicon is a ~20,000-word SQLite database embedded via sql.js/WASM, sourced from an existing open POS-tagged word list rather than hand-authored.
- **OQ-3** — *Resolved 2026-07-05:* purely functional labels (subject/object/modifier) — no thematic-role (agent/patient) assignment.
- **OQ-4** — *Resolved 2026-07-05:* default accepted — FR-20's source list is whichever permissively-licensed, frequency-ranked open POS-tagged word list the build script selects; its licence + retrieval date must still be recorded in the script's header comment before the build runs.

## 6. Risks

> Optional for a Build, included because this file is the template for eight more.

| Risk | Consequence | Mitigation | Proving test |
|---|---|---|---|
| Fuzzy engine mislabels hard sentences | Luke teaches from a wrong parse | AD-4 confidence display; feedback cycle (guide §7) routes corrections into content/rules and rebuilds | AC-1–AC-4 worked examples pass; counter-examples logged in Grammar_contents.md on each tuning round |
| Chassis and cartridge blur during build (grammar logic leaks into UI) | Parser #2 becomes a rewrite, not a swap | Banner-comment module boundaries (AD-1) + FR-3's "read only from ParseResult" rule enforced at review | AC-8 inspection: a reviewer can list the swap-blocks without reading the code bodies |
| Single-file size balloons (20k-word SQLite + sql.js WASM + content + code) | Slower load, unwieldy Dropbox diffs | Base64 embedding is compact for binary data; target < ~4 MB total (WASM ~600KB–1MB + indexed `.db` for 20k rows + content); revisit tier/size only if load time becomes noticeable | File size measured at freeze; cold open-from-disk still loads in a few seconds on a normal laptop |
| Embedded SQLite fails to initialise offline (WASM instantiation, browser quirks) | Whole engine breaks, not just the lexicon lookup | sql.js is a pure client-side WASM library (no network fetch once embedded); a fallback path degrades to morphology-only tagging if `sql.js` init throws, rather than crashing the app | AC-6 (offline load) explicitly exercises the embedded lexicon path, not just the rest of the UI |
| Source word list has bad/missing licence, or its POS tags are noisy/wrong for teaching use | Legal exposure, or the tool teaches wrong tags with false confidence | OQ-4 requires a recorded licence before build; spot-check sample of tagged entries against AC sentences and known-tricky words (fish, run, well) before freeze | Provenance note present in build script; spot-check log shows no unresolved tagging errors in the sample |
| Custom right-click menu fights the browser | Layer 3 unusable, or default menu lost everywhere | Context-menu override scoped strictly to the parsed-text container (guide §3 note) | Right-click outside the text area shows the normal browser menu; inside shows tokens |

## 7. Plan

1. **Compile the content.** Parse `Grammar_contents.md` → `CONTENT` object: taxonomy nodes with IDs/definitions/examples (FR-13, AD-3), plus the derived rule parameters (tense templates from §4.3, convention checks from §5–§7). *(FR-13 groundwork)*
1a. **Source and build the lexicon.** Choose the source word list per OQ-4, record its licence/retrieval date; build the tagging/normalisation script; write `Grammar_lexicon.db` (~20,000 rows: word, pos_primary, pos_alternates, features, frequency_rank); spot-check a tricky-word sample before it feeds the build. *(FR-19, FR-20)*
1b. **Write the build script.** Python script that takes `Grammar_lexicon.db` + the sql.js WASM binary, base64-encodes both, and injects them into the `Grammar_parser.html` template alongside the compiled `CONTENT`. This script is dev-side only and is saved beside the asset for future rebuilds. *(FR-21)*
2. **Build the chassis.** Static skeleton: input area + buttons (FR-4), layer renderers keyed to `ParseResult` (FR-5), spell checker (FR-6, AD-5), export bar (FR-7), cap enforcement from `CONFIG` (FR-8), footer (FR-10), disabled Tier-B slot (FR-12), module banners (FR-2, AD-1), sql.js initialisation with the offline fallback path (risk table). 
3. **Engine pass 1** — tokenizer + lexical tagging: query the embedded lexicon first, fall back to morphology rules; confidence scores throughout. *(FR-14, FR-19, FR-11)*
4. **Engine pass 2** — phrase templates, clause detection, sentence classification. *(FR-15, FR-11)*
5. **Engine pass 3** — conventions, punctuation, error patterns citing content IDs. *(FR-16)*
6. **Wire the grammar layer mapping** in `CONFIG` (colours for clauses/phrases, icons for conventions/errors, tokens for word classes). *(FR-17)*
7. **Explainer module** — four-row word-column table with print-friendly wrapping. *(FR-18, FR-9)*
8. **Self-test against the worked examples** (AC-1–AC-5, AC-9), fix, then verify offline + exports (AC-6, AC-7) and the module-boundary inspection (AC-8).
9. **Save** `Grammar_parser.html`, the content file, `Grammar_lexicon.db` (kept as the maintainable source, not shipped separately), and the build script in `Memory/Long-Term/Grammar/`; register the asset in the store's `_index.yaml`. *(FR-1, FR-21)*
10. **Update `Parser_guide.md`**: add the chassis/cartridge pattern, the `ParseResult` schema, and "clone from Grammar_parser.html" instructions for the remaining eight parsers; mark Grammar's row as built. *(coordination item, §4)*

## 8. Verification — definition of done

- [x] All acceptance criteria (AC-1 – AC-12) demonstrated — self-verified in-browser 2026-07-05 (AC-1 full parse incl. tentative adverbial NP at Phrasal only; AC-2 splice; AC-3 parallelism; AC-4 imperative + implied you + dO/oC; AC-5 over-cap; AC-6 zero network requests, all bytes embedded; AC-7 exports = explainer only; AC-8 six module banners in shipped file; AC-9 lexicon round-trip on 16 tricky words; AC-10 focus fade + key updates; AC-11 two-part explainer, PP deduped; AC-12 four distinct hover texts + agreement computation hover, no zero-error placeholder)
- [x] Lexicon provenance note (source, licence, retrieval date) present in the build scripts (build_lexicon.py + build_parser.py headers, and in the db's meta table)
- [x] Every FR traceable to a plan step and demonstrably implemented
- [x] Opened cold from Dropbox by double-click with Wi-Fi off — confirmed by Luke on his machine
- [x] Feedback round completed with Luke (guide §7: wrong / ugly / missing) — accepted with no changes requested this round; future corrections land in `Grammar_contents.md` first, then rebuild
- [x] `Parser_guide.md` updated (plan step 10) and no longer lists Grammar's content file or chassis as an open item
- [x] Version number + build date in the footer set (v1.0.0 · 2026-07-05)

**On completion:** set Status to Done, move this spec to `Specs/Done/`, and re-check the (future) specs of the other eight parsers, which gate on this one.
