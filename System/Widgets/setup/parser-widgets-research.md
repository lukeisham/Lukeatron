# Parser Widgets — Research Compilation (temporary)

Compiled 2026-08-09 by 13 Haiku research subagents (one per parser), coordinated by Fable.
Purpose: raw research underlying the Parser Widgets review report. Luke will review and delegate follow-up work from here.

Parsers covered: Grammar (chassis original) · Teaching: Style, Rhetoric, Logic, Interpretation, Story-tension, Tropes & symbols, Fact-checking · Church: Systematic Theology, Biblical Theology, Greek and Hebrew, Biblical symbols and cross-references, Biblical Commentary.

---

## Style

**Purpose**
Prose-style pattern matching tool — input one paragraph (cap 1000 words), Tier A fuzzy-logic rules matching to a style schema. Shared parser architecture with Grammar and seven other teaching aides.

**Reasoning tiers**
Tier A (hardcoded JS). Patterns, rules, and fuzzy matches baked into the HTML at build time. No API backend; no live knowledge. Works offline.

**Output/UI**
Shared parser UI per Parser_guide.md §3:
- Layer 1: inline colour highlighting of style patterns, colour key
- Layer 2: icons + in-text expanders for detailed explanation
- Layer 3 (hover): tokenized spans + hover pop-ups
- Export: PDF (with/without UI), Markdown, plain text
- Spell checker with red fuzzy underline
Explainer format **undefined** (Parser_guide.md §2.4 notes this as open).

**Work done**
- Content source file drafted: `Style_content.md` seeded with 14 rules across 5 categories (Clarity, Brevity, Coherence, Voice, Diction). Rules drawn from Strunk & White (public domain, quoted directly), Joseph Williams' *Style: Lessons in Clarity and Grace* (paraphrased, source named), George Orwell's *"Politics and the English Language"* (paraphrased, source named). Each rule includes before/after example pair (original compositions). Provenance table with licence status included. Status: marked DRAFT pending Luke review. TE-05 task #2 marked ☑ Done.
- Chassis cloned from Grammar build folder 2026-07-06.

**Work remaining to be functional**
1. **TE-05 task #1 (⚪ undefined)**: Confirm correct chassis is in place — README.md still describes Grammar verbatim; build_parser.py and build_lexicon.py reference Grammar_parser.html and Grammar_lexicon.db; template.html is Grammar-branded (title "Grammar Parser", "G" icon in header/favicon, all CONFIG/comments/footer refer to Grammar). These three files need their filenames, comments, and references adapted to Style. Note: build_lexicon.py may be unnecessary if Style doesn't need a word lexicon (unlike Grammar's 20k-word POS database).
2. **TE-05 task #3 (⚪ undefined)**: Finish build app — write the fuzzy-logic engine rules (the `ENGINE.rules` cartridge block), wiring up the 14 rules from Style_content.md to colour/icon assignments; decide Explainer format (currently undefined per Parser_guide.md §2.4).

**Files**

| Path | State |
|------|-------|
| `Memory/Long-Term/Style/_index.yaml` | Empty YAML index |
| `Memory/Long-Term/Style/build/README.md` | Adaptation banner + verbatim Grammar recipe; needs task #1 edits |
| `Memory/Long-Term/Style/build/Style_content.md` | Seeded content source; draft status, real material (14 rules + examples + provenance) |
| `Memory/Long-Term/Style/build/build_parser.py` | Verbatim Grammar clone; references `../Grammar_parser.html`, `../Grammar_lexicon.db` |
| `Memory/Long-Term/Style/build/build_lexicon.py` | Verbatim Grammar clone; builds POS lexicon (may be unnecessary for Style) |
| `Memory/Long-Term/Style/build/template.html` | Verbatim Grammar clone; title "Grammar Parser", "G" logo, references Grammar_contents.md |
| `Memory/Medium-Term/Projects/TE-05-writing-style-app/registry.md` | 3-task status: #1 ☐ Open, #2 ☑ Done, #3 ☐ Open |

---

## Story-tension

**Purpose**

The Story-tension parser is one of eight Teaching-aide parsers (Parser_guide.md §2.1). It analyzes a single scene (up to 5000 words) to identify and display five structural elements of Freytag's Pyramid: exposition (context), rising action (inciting incident + complication), climax (structural apex), falling action (transition), and resolution (resolution + unresolved matters). Output includes a plot summary, ASCII-rendered tension curve, trope-detection badge, and optional PDF export. Shares the chassis (UI, HARNESS, colour/focus system) with Grammar parser; swaps only CONFIG, CONTENT, ENGINE.rules, and EXPLAINER.render per Parser_guide.md §5b.

**Reasoning tiers**

- **Tier A (hardcoded JS):** Structural parsing — tokenization, scene segmentation, Freytag-stage identification via fuzzy pattern matching (keywords, phrase boundaries, narrative markers). Rules baked into ENGINE.rules at build time.
- **Tier B (API/agent call — declared but not implemented):** Trope detection and TV Tropes lookup. Story-tension_content.md §4.1 names this as out-of-scope for the Tier-A pass but notes it as a Tier-B extension. Parser_guide.md §2.1 explicitly lists Story-tension as "B"; TE-07 decision on structural/trope overlap remains open. Tier-B button currently disabled in template; must degrade gracefully when offline.

**Output/UI**

- **Input:** One scene, plain text, hard cap 5000 words. Over-cap → warning, no truncation.
- **Layer 1:** Inline colour highlighting for five Freytag stages (each stage gets a distinct hue; tension rises visually through stage sequence).
- **Layer 2:** In-text icons (stage markers, confidence badges); icon bar above text.
- **Layer 3 (hover):** Tokenized phrases for structural elements; hover pop-ups with definitions.
- **Explainer:** ASCII line-art tension curve + plot summary table (5 rows: context, inciting incident, complication, resolution, unresolved matters) + optional PDF with richer graph rendering.
- **Export:** PDF (with/without UI), Markdown, plain text. Spell-check toggle.

**Work done**

- 2026-07-06: Chassis cloned from Grammar (`build/` folder structure, template.html skeleton, build_parser.py / build_lexicon.py scripts).
- 2026-07-06: README.md copied verbatim from Grammar; adaptation banner added (lines 1–5) flagging all items for Story-tension customization but marked as pending.
- 2026-07-09: Content source drafted — Story-tension_content.md (169 lines, marked DRAFT pending Luke review). Contains Freytag's Pyramid definition (§1, §1.1–1.5), worked example ("The Last Letter"), registry element mapping table, and open-items log (TE-07, TE-08, TE-09).
- build_parser.py: Copied verbatim from Grammar (46 lines). Accepts `sql-wasm.js`, `sql-wasm.wasm`, `<lexicon>.db`, template.html, and output file path. Embeds WASM + lexicon via base64; replaces build-date placeholder.
- build_lexicon.py: Copied verbatim from Grammar (204 lines). No invocation yet; Story-tension's need for a lexicon is uncertain.
- template.html: Skeleton copied from Grammar (1341 lines). Cartridge blocks identified in comments; CONFIG, CONTENT, ENGINE.rules, EXPLAINER.render marked for replacement. Tier-B button present but disabled.

**Work remaining to be functional**

1. **Confirm/adapt build recipe** (Registry action 1, ⚪ undefined). README.md must drop the lexicon step if Story-tension doesn't need one; point step 3 at Story-tension's content file and output path.
2. **Finalize content data** (Registry action 2, ☑ marked Done but pending Luke review of draft). Review Story-tension_content.md for correctness; resolve TE-07 (structural/trope boundary with Tropes & symbols aide); decide whether Tier-B trope check is MVP or post-launch.
3. **Write Engine.rules** (Registry action 3, ⚪ undefined). Three-pass fuzzy-logic engine (pass 1 lexical/morphological, pass 2 syntactic/scene segmentation, pass 3 conventions/stage detection). No code written; depends on Engine.rules design (TE-08 — tension-line ASCII algorithm, not started).
4. **Write EXPLAINER.render** (Registry action 3, ⚪ undefined). Format is named in Parser_guide.md §2.3 but algorithm not drafted.
5. **API-key handling for Tier B** (Parser_guide.md §2.4 open). Not relevant until Tier-B trope check is wired; then decide settings field vs localStorage.
6. **Write short spec** (Registry §4.2 future action). After content is approved, draft a spec citing Grammar spec as prerequisite per Parser_guide.md §5b.

**Files**

- `Memory/Long-Term/Story-tension/_index.yaml` — empty.
- `Memory/Long-Term/Story-tension/build/README.md` — build recipe (adapted banner; body copied from Grammar).
- `Memory/Long-Term/Story-tension/build/Story-tension_content.md` — content source (169 lines; DRAFT; Freytag schema + worked example + open items).
- `Memory/Long-Term/Story-tension/build/build_parser.py` — assembly script (verbatim Grammar clone).
- `Memory/Long-Term/Story-tension/build/build_lexicon.py` — lexicon build script (verbatim Grammar clone; no call yet).
- `Memory/Long-Term/Story-tension/build/template.html` — parser skeleton (1341 lines; cartridge blocks marked for replacement; Tier-B slot disabled).
- `Memory/Medium-Term/Projects/TE-06-story-tension-app/registry.md` — active; 3 next actions (confirm chassis, build content [done], finish app); no spec yet.
- `Memory/Medium-Term/Projects/TE-06-story-tension-app/notes.md` — agent guidance: don't rewrite UI/HARNESS; Tier-B must degrade gracefully.
- `Memory/Medium-Term/Projects/TE-06-story-tension-app/documents/` — empty.

---

## Grammar (chassis original)

**Purpose**
A single-file browser tool that parses one sentence at a time (cap 100 words) and displays its grammatical anatomy across seven levels: sentential, clausal, phrasal, lexical, conventions, punctuation, and common errors. Built as the reference chassis for nine planned teaching-aide parsers.

**Reasoning tiers**

All logic is **Tier A** (hardcoded JS, offline-only):
- **Pass 1 (lexical):** Tokenize → query the embedded 20,000-word SQLite lexicon → fall back to morphological rules (suffix/inflection patterns) → confidence scores; no token left untagged (FR-14)
- **Pass 2 (syntactic/semantic):** Identify phrases (NP, VP, PP, AdjP, AdvP, participial, infinitive, gerund, absolute, appositive) and clauses (independent, dependent: noun/adverbial/relative) → classify sentence structure and purpose
- **Pass 3 (conventions/errors):** Check agreement, order, parallelism, ellipsis, consistency, voice, modality, negation; flag error patterns (comma splice, fragment, faulty parallelism, pronoun case, apostrophe/homophone, double comparative)

**Tier B** (API/agent calls) is **disabled** — a UI button labeled "Tier B check — off" reserves the slot per FR-12, but no API wiring exists in this build.

**Output/UI**

- **Layer 1:** Inline colour spans (structural-kinship model: each clause a distinct hue; phrases as shades; words tinted by clause family). Colour key above the text, updated per focus level.
- **Layer 2:** Click expanders + in-text icons for conventions and error flags; icon bar above the text; no "0 errors" placeholder (AC-12).
- **Layer 3:** Right-click custom context menu shows tokenized word-class labels; hover pop-ups with focus-sensitive explanations (e.g. agreement computation on hover).
- **Focus-level selector:** Sentential / Clausal / Phrasal / Lexical buttons; selected level full intensity, enclosing levels faded; Display All shows everything. Tentative tags (confidence < 0.7) render dashed underline + reduced saturation at the uncertain level only.
- **Export bar:** PDF (with/without UI chrome), Markdown, plain text — exports contain only the Explainer content, never the coloured interactive view (AC-7).
- **Explainer:** Two-part — four-row word-column table (words · phrase membership · clause membership · functional note/semantic role) + rules extract of every distinct CONTENT node hit, deduplicated, grouped under category sub-headings.

**Work done**

- **Shipped asset:** `Grammar_parser.html` (2.1 MB, built 2026-07-05) — double-clickable single file, all CSS/JS/WASM/data embedded, zero external network requests, fully functional offline. Version 1.0.0.
- Five-module architecture (AD-1): CHASSIS (UI + HARNESS) vs CARTRIDGE (CONFIG, CONTENT, ENGINE.rules, EXPLAINER.render) delimited by template banners — future parsers swap cartridges without touching chassis code.
- Embedded SQLite lexicon: `Grammar_lexicon.db` (~20,000 rows) built from Moby POS (public domain) + FrequencyWords en_50k (CC-BY-SA 4.0), base64-embedded via sql.js 1.13.0 WASM; morphology-only fallback if WASM fails.
- Content compilation: `Grammar_contents.md` (7 sections, 113+ rule nodes) parsed into the CONTENT object with outline numbers as stable IDs.
- Three-pass confidence-weighted engine; structural-kinship colour scheme (six-colour palette); built-in spell checker (edit-distance-1); 100-word hard cap with visible warning; custom SVG glyph + data-URI favicon.
- **All acceptance criteria AC-1–AC-12 passed**, demonstrated in-browser 2026-07-05 and accepted by Luke.

**Work remaining to be functional**

None. Spec status: "Done (2026-07-05) — built, verified, and accepted by Luke." Future content corrections land in `Grammar_contents.md` first, then rebuild.

**Files**

- `Memory/Long-Term/Grammar/Grammar_parser.html` (2.1 MB) — shipped asset, v1.0.0.
- `Memory/Long-Term/Grammar/Grammar_contents.md` (33.5 KB) — content source of truth.
- `Memory/Long-Term/Grammar/Grammar_lexicon.db` (836 KB) — SQLite lexicon.
- `Memory/Long-Term/Grammar/build/template.html` — editable source, five-module architecture.
- `Memory/Long-Term/Grammar/build/build_parser.py` — assembles the shipped HTML.
- `Memory/Long-Term/Grammar/build/build_lexicon.py` — builds the 20k-row lexicon.
- `Memory/Long-Term/Grammar/build/README.md` — three-step rebuild recipe.
- `Memory/Long-Term/Grammar/Specs/Done/GrammarParser.spec.md` — spec, status Done (FR-1–21, AD-1–7, AC-1–12).

---

## Logic

**Purpose**

Build an online Logic parser tool for analyzing reasoning, argument structure, and fallacies. Part of the eight Teaching aides; shares the Grammar reference chassis. Input unit: one paragraph, hard cap 1000 words. Project TE-04.

**Reasoning tiers**

Tier A only (hardcoded JS). Per Parser_guide.md §2.1: "terms (clear/unclear), judgements (contradictory?), arguments (valid/invalid)" — all pattern-matching and structural analysis, no API call. Tier-B slot disabled (chassis pattern).

**Output/UI**

Shared four-layer parser architecture (colour highlighting + key; icons + expanders; hover/right-click tokens; spell checker; export bar; focus-level selector). Explainer format: terms/judgements/arguments explanation + relevant fallacies + syllogism(s) — ASCII circles + PDF circles (Parser_guide.md §2.3).

**Work done**

- Project created 2026-06-22; chassis cloned from Grammar 2026-07-05.
- Content drafted 2026-07-09 as `Logic_content.md` (390 lines, DRAFT): 8 formal fallacies, 42 informal fallacies across 4 categories (relevance, ambiguity, presumption, generalisation), 24 syllogism forms — synthesised from standard public-domain logic references. Local folders (Fallacies/, Syllogisms and Fallacies Database/, Ways of Thinking/) confirmed empty, so synthesis proceeded from standard references.

**Work remaining to be functional**

1. Confirm/adapt chassis: README.md, build_parser.py, build_lexicon.py are verbatim Grammar clones; decide whether Logic needs the lexicon step.
2. Adapt template.html (verbatim Grammar clone) — replace the four cartridge blocks: CONFIG, CONTENT (compiled from Logic_content.md), ENGINE.rules (term clarity, judgement contradiction, argument validity, fallacy/syllogism detection), EXPLAINER.render (ASCII-circle/Venn format).
3. Write short spec citing Grammar spec; pin Logic's FR-13..18 equivalents + worked-example ACs.
4. Luke review of Logic_content.md (DRAFT).
5. Author fuzzy-logic rules against the 50-fallacy taxonomy and 24 syllogism forms — no rule set exists yet.
6. Implement ASCII-circle Explainer (Venn diagrams for syllogisms).
7. Assemble shipped asset: `python3 build_parser.py` → `../Logic_parser.html`.

**Files**

- `Memory/Long-Term/Logic/_index.yaml` (empty); `index.md` (auto-generated); `Fallacies/`, `Syllogisms and Fallacies Database/`, `Ways of Thinking/` (all empty folders).
- `Memory/Long-Term/Logic/build/Logic_content.md` (390 lines, DRAFT).
- `Memory/Long-Term/Logic/build/README.md`, `build_lexicon.py`, `build_parser.py`, `template.html` — all verbatim Grammar clones.
- `Memory/Medium-Term/Projects/TE-04-logic-app/registry.md` (created 2026-06-22, updated 2026-07-14).

---

## Interpretation

**Purpose**

Browser-based parser tool for reading and interpreting texts by matching them against interpretive methodologies across social science and English literature. One of eight Teaching aides; cloned from the Grammar chassis 2026-07-05. Project TE-03.

**Reasoning tiers**

**Tier A (hardcoded JS, fully offline):** fuzzy-logic matching of named entities/phrases against the 27-methodology schema, baked in at build time from `Interpretation_content.md`. **Tier B:** not declared or wired.

**Output/UI**

Standard chassis layers: Layer 1 colour highlighting (hue per top-level methodology, shades per sub-category) + key; Layer 2 icons + expanders; Layer 3 hover tokens/pop-ups (proponent names, method summaries). Explainer: methodology table — Method · representative proponent(s) · quote snippet · matching elements. Export: PDF / Markdown / plain text. Input cap 1000 words.

**Work done**

- Chassis cloned 2026-07-05.
- `Interpretation_content.md` drafted 2026-07-09: 27 methodology entries — Part A Social Science (13, Schleiermacher → Peirce/Eco semiotics), Part B English Literature (14, Richards's practical criticism → disability studies). Each entry has proponent(s) + theory summary. DRAFT pending Luke review. Sources: SEP, IEP, Oxford Bibliographies, primary texts.
- Project TE-03 registry established.

**Work remaining to be functional**

- Adapt README/build scripts (rename Grammar outputs → Interpretation); decide lexicon question.
- Customize the four template.html cartridge blocks.
- Write the three-pass fuzzy engine (entity match, phrase-pattern match, token/span construction).
- Populate deferred content columns: quote snippets + matching-elements descriptors (both deferred; currently only name/proponents/summary).
- Write short spec citing Grammar spec.
- Build, test against sample passages, freeze version.

**Files**

- `Memory/Long-Term/Interpretation/build/Interpretation_content.md` — seeded, 27 methodologies, two columns deferred.
- `Memory/Long-Term/Interpretation/build/README.md`, `build_parser.py`, `build_lexicon.py`, `template.html` — verbatim Grammar clones.
- `Memory/Long-Term/Interpretation/_index.yaml` — empty.
- `Memory/Medium-Term/Projects/TE-03-interpretation-app/registry.md` — Next Actions: confirm chassis · build content data (done) · finish build app; `notes.md` empty.

---

## Tropes & symbols

**Purpose**

Detect literary tropes and symbols (logic to be specified, likely Tier B for tropes). One of eight Teaching aides; chassis-cloned from Grammar 2026-07-06. Project TE-07.

**Reasoning tiers**

- **Symbols (Tier A):** hardcoded fuzzy rules + fixed symbol/archetype taxonomy (natural, colour, animal, object, number symbolism; journey/quest and character archetypes).
- **Tropes (Tier B, deferred):** TV Tropes lookup on demand at runtime; must degrade gracefully offline.
- **Open decision (Parser_guide.md §2.4):** whether Tropes & symbols shares a trope rule set with Story-tension — unresolved.

**Output/UI**

Standard chassis layers (colour highlighting + key; icons; hover tokens/pop-ups; spell checker; export bar). Input cap 1000 words. **Explainer format: undefined** (open item in Parser_guide.md §2.3).

**Work done**

- Chassis cloned 2026-07-06; README banner added; build scripts and template.html remain verbatim Grammar clones.
- `Tropes & symbols_content.md`: 546 lines, DRAFT. Natural symbols elaborated (celestial/terrestrial/seasonal); colour/animal/object/number symbolism sketched as outlines only; Hero's Journey outlined; 15 character archetypes fully elaborated with meanings and examples. Provenance from public-domain reference works; no [UNVERIFIED] flags. Tropes explicitly deferred to Tier B.

**Work remaining to be functional**

1. Confirm/adapt chassis (README, build scripts, output paths); decide lexicon question.
2. Finish build app: adapt the four cartridge blocks; compile symbol taxonomy into CONTENT JSON; implement ENGINE.rules fuzzy passes; define EXPLAINER.render (undefined); wire or disable Tier-B trope check with graceful degradation; run build_parser.py.
3. Elaborate the sketched content sections (colour/animal/object/number symbolism currently outline-only).
4. Resolve open decisions: Explainer format; Story-tension trope-rule overlap; lexicon usage.
5. Luke review of DRAFT content.

**Files**

- `Memory/Long-Term/Tropes & symbols/_index.yaml` (empty); `build/README.md`, `build_parser.py`, `build_lexicon.py`, `template.html` (verbatim Grammar clones); `build/Tropes & symbols_content.md` (546 lines, DRAFT).
- `Memory/Medium-Term/Projects/TE-07-tropes-symbols-app/registry.md` + `notes.md`.

---

## Rhetoric

**Purpose**
Online Rhetoric parser for analyzing persuasion and composition — one of eight Teaching aides. Cloned from Grammar chassis 2026-07-06; adapted to rhetorical analysis (speeches, written persuasion, visual rhetoric). Project TE-02.

**Reasoning tiers**
Tier A (hardcoded JS): pattern-match against the five canons (inventio, dispositio, elocutio, memoria, pronuntiatio), three appeals (ethos, pathos, logos), rhetorical tropes, and fallacies. No Tier B planned.

**Output/UI**
Shared stack: Layer 1 colour highlighting + key; Layer 2 expanders/icons; Layer 3 hover tokens/pop-ups; spell checker; export bar. Explainer: table — types of speech (canons × appeals × tropes) by their effects. Input cap 1000 words.

**Work done**
- Project created 2026-06-22; chassis cloned 2026-07-06.
- `Rhetoric_content.md` (568 lines, outline-numbered, DRAFT) compiled 2026-07-09 from three local Lukeatron-authored sources: `rhetoric_schema.map.md` (392 lines), `textual_rhetoric_database.json`, `visual_rhetoric_database.json`. No external sources.
- Prior art: archived skills `!TextualRhetoricParser` and `!VisualRhetoricParser` document the schema-analysis pipeline (canons → appeals → tropes → fallacies).
- Registry: confirm chassis ✓ done · content data ✓ done (draft) · finish build app ⏳ open. (Note: this parser is the only clone whose "confirm chassis" task is marked done.)

**Work remaining to be functional**
1. Repoint README/build scripts from Grammar to Rhetoric.
2. Adapt CONFIG (name, icon G→R, cap 100→1000 w, levels → canons/appeals/tropes/fallacies, colour palette).
3. Compile Rhetoric_content.md into the CONTENT object; decide category hierarchy.
4. Write ENGINE.rules three-pass fuzzy logic (canon sketch → appeal patterns → trope/fallacy detection).
5. Write EXPLAINER.render table (Concept · Example · Category · Effect on audience).
6. Decide lexicon step (probably unneeded).
7. Write short spec; test on a persuasive passage.

**Files**
- `Memory/Long-Term/Rhetoric/build/` — README.md, build_parser.py, build_lexicon.py, template.html (Grammar clones; CARTRIDGE markers at lines ~141/161/286/931), `Rhetoric_content.md` (568 lines, DRAFT).
- `Memory/Long-Term/Rhetoric/rhetoric_schema.map.md` + two JSON databases — raw sources.
- `Archive/Skills/Rhetoric_system/` — prior-art skills.
- `Memory/Medium-Term/Projects/TE-02-rhetoric-composition-app/registry.md` — active.

---

## Fact-checking

**Purpose**
Fact-checking parser teaching aide — splits claim/source (first pass) then searches both (second pass). Project TE-08.

**Reasoning tiers**
**Tier B** (the only primarily Tier-B parser): logic depends on world knowledge and live judgment. Two-pass: (1) tokenize, split claim/source spans (Tier A), (2) API call verifies both. Must degrade gracefully offline/no key.

**Output/UI**
Shared chassis layers; input cap 1000 words. **Explainer format undefined** (Parser_guide.md §2.3).

**Work done**
- 2026-07-06: project created; chassis cloned; registry + notes created.
- Content file is a **TODO stub only** — no raw material. The least-developed parser of the twelve clones.

**Work remaining to be functional**
1. Adapt README/build scripts (lexicon likely unneeded — drop build_lexicon.py).
2. Adapt template.html cartridge blocks; ENGINE.rules = claim/source split + API-call harness.
3. Draft `Fact-checking_content.md` — claim/source-splitting rules and the **approved source list (undefined per §2.4 — requires Luke input)**.
4. Define Explainer format; decide API-key storage (settings field vs localStorage).
5. Write spec; compile and test.

**Files**
- `Memory/Long-Term/Fact-checking/build/` — README.md, build_parser.py, build_lexicon.py, template.html (all verbatim Grammar clones), `Fact-checking_content.md` (TODO stub).
- `Memory/Medium-Term/Projects/TE-08-fact-checking-app/` — registry.md, notes.md.

---

## Greek and Hebrew

**Purpose**
Biblical-language study aide for Church sermon-prep. Project CH-13 (reassigned Teaching → Church), created 2026-07-06.

**Reasoning tiers**
- **Tier A (proposed):** language identification; top-frequency vocabulary lookup; basic morphological parse (Greek: person/number/tense/voice/mood, gender/number/case; Hebrew: binyan, conjugation, person/gender/number, state); gloss + parse to Explainer.
- **Tier B (proposed):** rare/irregular forms, syntax, discourse analysis, theological semantic depth — would require an LLM call.

**Output/UI**
Input cap 1000 words. Proposed two-panel Explainer: per-token table (Token · Language · Lexical Form · Gloss · Morphological Parse) + summary prose (language, token coverage %, vocabulary-range assessment). Shares chassis layers/export.

**Work done**
- Chassis cloned 2026-07-06 (all four files verbatim Grammar clones).
- `Greek and Hebrew_content.md` drafted 2026-07-09 (43 KB, status **[PROPOSED SCOPE — confirm before treating as final]**): Koine Greek alphabet/breathing/accents/diphthongs, ~50 top-frequency NT vocab, three declensions + verb paradigms (λύω, εἰμί), parsing codes; Biblical Hebrew alphabet + Tiberian vowel pointing, ~50 top-frequency vocab, noun patterns, seven binyanim with paradigms, parsing codes. Clear in/out-of-scope notes (no full lexicon, no LXX, no Aramaic).
- Registry: ◐ Doing (content), ☐ Open (build & app).

**Work remaining to be functional**
1. **Scope sign-off by Luke** ([PROPOSED SCOPE] flag).
2. Tier-A tokenization + morphological lookup rules for Greek (diacritics, inflected-form matching) and Hebrew (vowel-pointed matching, binyan recognition).
3. Build Greek/Hebrew gloss+parse lexicon tables (SQLite schema analogous to Grammar's) — this parser genuinely needs a lexicon, unlike most clones.
4. Cartridge swap (CONFIG, CONTENT, ENGINE.rules, EXPLAINER two-panel renderer).
5. Adapt both build scripts + README.
6. Test with e.g. John 1:1 and Genesis 1:1.

**Files**
- `Memory/Long-Term/Greek and Hebrew/build/` — README.md, build_parser.py, build_lexicon.py, template.html (verbatim clones), `Greek and Hebrew_content.md` (43 KB draft).
- `Memory/Medium-Term/Projects/CH-13-greek-and-hebrew-app/` — registry.md, notes.md (constraint: never invent Scripture).

---

## Systematic Theology

**Purpose**
Systematic Theology parser for Church sermon/doctrinal prep: eight major loci, nine-stage Ordo Salutis, TULIP doctrines of grace, and a theme-frequency scoring methodology for doctrinal weight analysis. Project CH-11.

**Reasoning tiers**
Tier A only (100% offline): taxonomy matching, theme-frequency scoring, Ordo Salutis stage detection, TULIP framework matching. Disabled Tier-B placeholder inherited from chassis.

**Output/UI**
Chassis stack; focus levels TBD (likely Locus / Ordo Salutis / TULIP / theme-frequency). Explainer TBD — likely tabular: matched doctrines + stages + theme-frequency scores.

**Work done**
- Chassis cloned 2026-07-06 (all files verbatim Grammar).
- `Systematic_Theology_content.md` (58 KB, 640 lines, DRAFT 2026-07-09): PART A 8-locus topic map; PART B 9-stage Ordo Salutis; PART C TULIP; PART D seven-step theme-frequency scoring algorithm with worked example. Sourced from Berkhof, Grudem, Frame, Bavinck, Calvin, Westminster Standards. **Four Scripture references flagged [UNVERIFIED]** (delectatio victrix, Dan 12:3, Hos 6:7, Rom 2:6–11 integration).
- Registry CH-11: chassis ☐ · content ☑ done (draft) · build app ☐.

**Work remaining to be functional**
1. Adapt README/build scripts; decide lexicon (probably unneeded — content-only build).
2. CONFIG: rename, glyph G→S, define focus levels + colour palette per locus.
3. Rewrite ENGINE.rules: Pass 2 map text to loci/Ordo/TULIP; Pass 3 doctrinal-consistency checks against Reformed standards.
4. Define EXPLAINER.render.
5. Luke review of DRAFT content + the four [UNVERIFIED] references.
6. Build, offline-test with a sermon passage, then spec.

**Files**
- `Memory/Long-Term/Systematic Theology/build/` — README.md (2.1 KB), template.html (87 KB), build_parser.py, build_lexicon.py (all Grammar clones), `Systematic_Theology_content.md` (58 KB DRAFT).
- `Memory/Medium-Term/Projects/CH-11-systematic-theology-app/` — registry.md, notes.md.

---

## Biblical Theology

**Purpose**
Redemptive-historical, whole-Bible study aide for Church sermon/doctrinal prep — distinct from Systematic Theology's topic-organised doctrine. Project CH-12.

**Reasoning tiers**
Tier A only. Fuzzy-rule pattern/schema matching against the content data.

**Output/UI**
Chassis stack. Explainer: four-row table per matched concept — concept name, place in the two-layer framework (act/epoch + canonical theme), scriptural exemplars, pastoral/preaching application.

**Work done**
- Chassis cloned 2026-07-06 (verbatim).
- `Biblical Theology_content.md` (262 lines, DRAFT): Four-Act Redemptive Structure; Thirteen-Epoch Chronological Narrative; Six Canon-Tracing Themes (Covenant, Kingdom, Temple/Presence, Sacrifice/Atonement, Exile/Return, Promise/Fulfilment); Hermeneutical Commitments (law-gospel, typology, already–not yet); parser-scope integration notes. Sourced from Vos/Goldsworthy consensus; no [UNVERIFIED] flags.
- Registry CH-12 active: chassis ☐ open · content ☑ done.

**Work remaining to be functional**
1. Adapt README/build scripts; decide lexicon question.
2. Cartridge swap: CONFIG, CONTENT compile, ENGINE.rules three passes (concept keywords → chronological/theme placement → church-context guardrails incl. law-gospel and Christological fulfilment), EXPLAINER.render.
3. Write spec; Luke review of draft; test with sermon texts; freeze version.

**Files**
- `Memory/Long-Term/Biblical Theology/build/` — README.md, build_parser.py, build_lexicon.py, template.html (Grammar clones), `Biblical Theology_content.md` (262 lines DRAFT).
- `Memory/Medium-Term/Projects/CH-12-biblical-theology-app/` — registry.md, notes.md.

---

## Biblical symbols and cross-references

**Purpose**
Study aide identifying biblical symbolic language in a passage and surfacing related canonical texts, for Church sermon/doctrinal prep. Project CH-14.

**Reasoning tiers**
- **Tier A:** symbol detection, keyword/synonym matching against the taxonomy, cross-reference lookup, typological-chain filtering.
- **Tier B (not wired):** would handle interpretive disputes flagged in content §6.4 (Song of Songs Christology, petros/petra, literal-vs-metaphorical readings). Disabled slot.

**Output/UI**
Layer 1 colour by symbol category (water=teal, light=amber, sacrifice=coral…); Layer 2 hover canon coordinates; Layer 3 on-click full symbol entry (definition, typological trajectory, cross-references). Focus selector: major symbol → secondary → colour symbolism. Export bar.

**Work done**
- Chassis cloned 2026-07-06; README banner in place.
- Content seeded: `Biblical symbols and cross-references_content.md` (**1083 lines**, DRAFT — the largest content draft): 13 major symbols with cross-references, secondary symbols, 5 colour symbols, parser notes (§6: granularity, typological chains, inverted symbols), canonical index of all 34 symbols. **Six entries flagged [UNVERIFIED]**.

**Work remaining to be functional**
1. README adaptation; drop lexicon step (no POS tagging needed).
2. CONFIG: rename, input unit "one passage" (cap ~1000 w), 6-hue symbol palette, disable Tier B.
3. CONTENT: compile outline IDs into JS data structure.
4. ENGINE.rules: tokenize → stem/synonym match against symbol keywords → weight by hierarchy and [UNVERIFIED] flags → typological-chain hints.
5. EXPLAINER.render: detected-symbols table + optional typological-chain diagram (ASCII/SVG OT→NT progression).
6. Rename title/footer; assemble (no lexicon embed); Luke review of DRAFT.

**Files**
- `Memory/Long-Term/Biblical symbols and cross-references/build/` — README.md, template.html (1900+ lines), build_parser.py, build_lexicon.py (Grammar clones), content file (1083 lines DRAFT).
- `Memory/Medium-Term/Projects/CH-14-biblical-symbols-cross-references-app/registry.md` — active; content ✓, chassis + build app ☐.

---

## Biblical Commentary

**Purpose**
Passage-level commentary lookup and synthesis across six SWORD-format commentary databases (Calvin, Clarke, DTN, KingComments, RWP, Scofield) for Church sermon prep. Project CH-15.

**Reasoning tiers**
- **Tier A (declared, not implemented):** pattern matching, tokenization, rule-based commentary lookup against compiled content schemas.
- **Tier B:** declared not wired; disabled button.

**Output/UI**
Chassis stack (single-file HTML, offline for Tier A). Explainer format undefined — likely table or side-by-side per commentator.

**Work done**
- Chassis cloned 2026-07-06 (all files verbatim Grammar).
- `Biblical Commentary_content.md` drafted 2026-07-09 (232 lines): worked example for **Ephesians 1:3–14** across the six commentaries. **Marked DRAFT and UNVERIFIED throughout** — the six SWORD modules are ZIP-compressed OSIS XML that could not be parsed in the draft pass, so the text is a paraphrase of each commentator's known approach, not actual module text. Licences: Calvin confirmed Public Domain; the other five [UNVERIFIED]. Module identities DTN and KingComments uncertain.
- Registry CH-15: chassis confirmed in place; content ☑ done (draft); actions 1 & 3 open.

**Work remaining to be functional**
1. Adapt README/build scripts (rename outputs; clarify lexicon question).
2. Cartridge swap: CONFIG (colour/icon maps for traditions), CONTENT (six commentaries × sections per passage), ENGINE.rules (passage matching, tradition recognition, relevance ranking), EXPLAINER.render (format TBD).
3. **Parse the SWORD modules** — decompress the ZIP OSIS XML and replace drafted paraphrases with actual quoted text (Church charter: faithful to text, no loose quotes).
4. Verify licences + module identities from `.conf` files.
5. Write spec; implement engine; build and test.

**Files**
- `Memory/Long-Term/Biblical Commentary/build/` — README.md, build_parser.py, build_lexicon.py, template.html (Grammar clones), `Biblical Commentary_content.md` (232 lines, DRAFT · UNVERIFIED).
- `Memory/Long-Term/Bible/` — six SWORD commentary modules (raw material, unparsed).
- `Memory/Medium-Term/Projects/CH-15-biblical-commentary-app/` — registry.md, notes.md.

---

# Cross-cutting summary (boss-agent synthesis)

- **Grammar is the only finished parser** — shipped, verified (AC-1–12), accepted 2026-07-05. It is the chassis all 12 clones inherit.
- **All 12 clones are at the same structural stage:** chassis files cloned verbatim (still Grammar-branded — title, "G" glyph, output paths, README recipe), content file drafted 2026-07-09 (except Fact-checking, still a TODO stub), and no ENGINE.rules / EXPLAINER.render / CONFIG adaptation done anywhere.
- **The universal remaining pipeline per clone:** ① adapt README + build scripts (rename, decide lexicon) → ② swap the four cartridge blocks (CONFIG, CONTENT compile, ENGINE.rules, EXPLAINER.render) → ③ write short spec citing Grammar spec → ④ build via build_parser.py → ⑤ test and freeze.
- **Content maturity varies widely:** Biblical symbols 1083 lines · Systematic Theology 640 · Rhetoric 568 (from real local databases) · Tropes 546 (partly outline-only) · Logic 390 · Biblical Theology 262 · Biblical Commentary 232 (all paraphrase, UNVERIFIED) · Story-tension 169 · Interpretation 27 entries (two columns deferred) · Style 14 rules · Greek and Hebrew 43 KB ([PROPOSED SCOPE]) · Fact-checking stub.
- **Every content draft awaits Luke's review** (DRAFT status); Greek and Hebrew additionally needs scope sign-off; Systematic Theology and Biblical symbols carry [UNVERIFIED] Scripture references; Biblical Commentary is entirely unverified pending SWORD-module parsing.
- **Tier profile:** most clones are Tier-A-only. Tier B is core for Fact-checking (essential), planned for Tropes (TV Tropes) and Story-tension (trope check, overlap decision open), and proposed for Greek and Hebrew (advanced analysis) and Biblical symbols (interpretive disputes).
- **Open decisions needing Luke:** Explainer formats (Style, Tropes, Fact-checking, Biblical Commentary, Systematic Theology undefined); Story-tension ↔ Tropes trope-rule overlap; Fact-checking approved source list; lexicon keep/drop per clone (only Greek and Hebrew clearly needs one); Greek and Hebrew scope.
