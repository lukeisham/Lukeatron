# Browser-Based Asset Guide

*How to ask Claude to generate browser-based tools (parsers, displays, teaching aides) — a reusable prompting playbook. Part 2 applies the playbook to the nine teaching-aide parsers as a worked example.*

---

# Part 1 — The Playbook

## 1. What counts as a "browser asset"

A self-contained interactive tool that runs in a browser tab. The default shape is a **single-file HTML asset**:

- One `.html` file, double-clickable, no install, no build step.
- All CSS and JavaScript inline; no external dependencies (no CDN links unless explicitly agreed — they break offline).
- **Fully centralised under `System/Widgets/Parser/<Store>/`** (2026-08-09) — the shipped
  widget (`<Store>_parser.html`), its editable source (`build/template.html`, build scripts,
  `<Aide>_content.md`), and any raw research material that feeds the content file all live
  together there; `build_parser.py` derives the output path automatically. The matching
  `Memory/Long-Term/<Store>/` entry is a pointer only — reserved for future non-parser
  content for that domain. Versioned by copying the file.
- Works offline for everything except declared API-backed functions (see §4).

Only escalate to a served app (a folder + `python3 serve.py`, like the Project Dashboard) when the asset needs to *read live files from disk* or persist data between sessions. Say so explicitly in the prompt if that's the case.

## 2. The anatomy of a good asset request

Every request to Claude should specify these seven blocks. Missing blocks are where builds go wrong — Claude guesses, and the guess compounds.

| Block | What to state | Example |
| :--- | :--- | :--- |
| **Purpose** | One sentence: who uses it, for what | "A grammar parser to check one sentence at a time while marking essays" |
| **Input contract** | What goes in: format, size cap, what happens over cap | "One sentence, hard cap 100 words; over-cap → warn, don't truncate silently" |
| **Workflow** | The pipeline, as arrows | Input → Parser → Output (→ optional Explainer) |
| **Logic engine** | Which tier each function uses (§4) | "Highlighting = JS rules; fact-checking = API call" |
| **Display layers** | Which UI patterns from the vocabulary (§3), in which layer | "Layer 1 colour spans, Layer 2 hover explanations" |
| **Content source** | Where the asset's knowledge lives (§5a) | "Rules and lexicon in `grammar-content.md` beside the asset; tropes consult TV Tropes" |
| **Export** | How results leave the tool | "Print to PDF (with/without UI), copy as Markdown or plain text" |

A request that fills all seven blocks can usually be built in one pass. A request that fills three will need two or three feedback rounds — budget for that.

## 3. The display-layer vocabulary

Name these patterns in your prompt instead of describing them from scratch each time. They stack — an asset declares which layers it uses.

**Input area (all assets)**
- Clean text input field accepting semi-plain text (italics, bold, dot points). Supports cut-and-paste, basic editing, and spell-checking *before* analysis.
- A **Parse** button, a **Display All** button (shows Layers 1 and 2 together), and a spell-check toggle.

**Layer 1 — always shown after parsing**
- **Inline colour highlighting** — spans of shaded colour over the text for longer-span concepts; shade intensity can carry a second dimension (e.g. confidence or degree). A legend/colour key sits above the text showing what each colour and/or shade means.

**Layer 2 — shown on cursor / click**
- **In-text expander** — click an element to unfold detailed context in place.
- **In-text icons** — small glyphs marking at-a-glance patterns, with an icon key bar above the text.

**Layer 3 — shown on request (hover / right-click)**
- **Tokenized text/phrases** — short-span concept labels on words or phrases: select and right-click a word/phrase for its label, or highlight a longer span and right-click for the larger concept. *(Note: right-click means overriding the browser's context menu inside the text area — fine for a dedicated tool, just declare it in the prompt so Claude builds a custom menu rather than fighting the default.)*
- **Hover pop-up** — detailed explanation text on mouseover.

**Utilities**
- **Spell checker** — red fuzzy underline on errors, one-click replace.
- **Export bar** — print to PDF (with or without the UI chrome), copy to Markdown, copy to plain text.

## 4. Logic engine tiers (the hybrid model)

Every analytical function in an asset is declared as one of two tiers. State the tier per function in your prompt — this is the single most important thing to get explicit, because it determines what the file can do offline.

| Tier | How it works | Good for | Limits |
| :--- | :--- | :--- | :--- |
| **A — Hardcoded JS** | Fuzzy-logic rules, pattern lists, and lexicons baked into the file at build time | Pattern matching, tokenizing, schema matching, structural analysis, spell-check | Only as smart as the rules Claude writes on build day; no live knowledge |
| **B — API / agent call** | The file sends text to the Claude API (or hands off to a Lukeatron agent) for judgment | Fact-checking, trope detection, tension analysis — anything needing world knowledge or holistic reading | Needs a key + internet; costs per use; slower |

Rules of thumb:
- Default every function to Tier A; promote to Tier B only when the function genuinely needs knowledge or judgment that can't be enumerated as rules.
- A Tier-B function must **degrade gracefully**: if offline or no key, the button greys out with a note — the Tier-A parts of the asset keep working.
- The prompt must say where the API key lives (pasted into a settings field, stored in `localStorage`, never hardcoded in the file).

## 5. The parser pattern (the common architecture)

Most Lukeatron assets are parsers. The shared architecture to name in prompts:

```
Input → Tokenize → Fuzzy-logic rules → Match against content schema → Structured result
                                                                          ├→ Display layers (§3)
                                                                          └→ Explainer lookup
```

- **Fuzzy logic** means tolerant matching: stems, synonyms, near-misses, weighted scores — not exact string equality. Say "fuzzy" and give one example of a near-miss you expect it to catch.
- **Structured result** — the parser's output is data (JSON in memory), not HTML. The display layers and the Explainer both read from it. This separation is what makes the Explainer optional and the export formats cheap.
- **Explainer** — a second-stage lookup keyed by the parser's findings, shown only on request. Explainers are usually tables or simple diagrams (see the worked examples in Part 2).

## 5a. Content source files

Most of an asset's knowledge — grammar rules, style schemas, rhetoric catalogues, methodology tables, lexicons — does **not** live loose in the prompt or buried in the JavaScript. It lives in a **content source file**: a companion Markdown file saved beside the asset (e.g. `Grammar_parser.html` + `Grammar_content.md`).

How it works:

- The `.md` file is the **editable source of truth** for the asset's schemas, rule lists, and explanation text — human-readable, so you can review and correct it directly.
- Because the asset itself is single-file HTML (§1), the content is **baked into the HTML at build time**: Claude reads the `.md` and compiles it into the file's data structures. Editing the `.md` alone doesn't change the asset — ask Claude to **rebuild from the content file** after edits.
- For some assets the content file also lists **external websites the logic should consult** — e.g. TV Tropes for trope detection, or approved fact-checking sources. These are Tier-B territory (§4): the file names the site(s), and the API/agent call is what actually reaches them.
- When requesting a new asset, either point Claude at an existing content file, or ask Claude to **draft the content file first** as its own reviewable step — approving the knowledge before it gets compiled into the tool is much cheaper than debugging the tool.

## 5b. The shell/cartridge pattern (spec-first builds)

As of 2026-07-05, parser builds are **spec-first**: before any code, the build gets a `!TechSpec` spec (one reviewable `.spec.md` in the asset's `Specs/` folder) that pins the requirements, decisions, and worked-example acceptance criteria. The reference spec is **`System/Widgets/Parser/Grammar/Specs/Done/GrammarParser.spec.md`** — read it before building any parser; it defines the shared architecture in full.

**As of 2026-08-10** the chassis/cartridge split described by that spec is no longer baked into a per-widget `template.html` clone — it lives as a real shared module, **`System/Widgets/Parser/_shell/`**, that every cartridge is assembled against. Full contract and layout: `_shell/README.md` and `_shell/Specs/ParserShell.spec.md`. In brief, every parser is one shipped HTML file split into two zones:

- **Shell (`_shell/`, never rewritten per parser):** the `UI` module (input area, display layers 1–3, a **focus-level selector** that renders the chosen structural level at full intensity with enclosing levels faded behind it, export bar, custom context menu, footer) and the `HARNESS` (wires Parse → engine → result → display, enforces caps, hosts a disabled Tier-B slot). Colours follow **structural kinship**: each top unit gets a hue, sub-units get shades of it, words get tints — see the Grammar spec's AD-7. Spell-check is also shell-consumed infrastructure, but lives in its own peer module, `_modules/Spelling/` (see its README), not inside `_shell/` itself.
- **Cartridge (`<Store>/cartridge/`, what each parser provides):** `config.yaml` (name, cap, colour/icon maps, layer mapping), a compiled `<store>_content.json` (from the asset's `<Store>_contents.md`), `<store>_engine.js` (the fuzzy passes), and `<store>_explainer.js` (that aide's explainer format).

The two zones communicate only through the shared **`ParseResult`** JSON contract (tokens → Layer 3, spans → Layer 1, findings → Layer 2, summary → header/exports); the schema is specified in the Grammar spec's AD-2. Content-file outline numbers are used verbatim as IDs end-to-end (AD-3), so every highlight can surface its definition and example.

**Large lexicons stay single-file too.** If a parser needs a big tagged word list (Grammar's needs ~20,000 POS-tagged words), the pattern is: build it as a real, independently-maintainable SQLite `.db` during development, then embed it into the shipped HTML via [sql.js](https://sql.js.org/) (SQLite-as-WASM), base64-encoded alongside the WASM binary — see the Grammar spec's AD-1a and FR-19–21. This keeps the double-click/no-server chassis intact instead of escalating to a served folder (§1's exception clause), and avoids the `file://` CORS restriction that blocks fetching a local `.db` file directly. A dev-side build script (`build_lexicon.py`, kept beside the cartridge) does the sourcing/tagging/embedding for future rebuilds.

**To build parser #2 onward:** follow `_shell/README.md`'s "Cloning a new parser" section — copy `Grammar/cartridge/` as a starting skeleton, replace `build/config.yaml`, the engine, the explainer, and the content file with the new subject's own (nothing in `_shell/` changes), then run `python3 _shell/build/assemble.py <NewCartridge>/cartridge`. Draft that aide's `<Aide>_content.md` first as its own reviewable step, and write a short spec citing the Grammar spec as its prerequisite — mostly just the aide's FR-13..18 equivalents (content mapping, engine passes, layer mapping, explainer format) and its worked-example ACs.

## 6. Asking well — the request checklist

Before sending a build request to Claude, check:

1. ☐ All seven anatomy blocks (§2) filled in.
2. ☐ Every analytical function assigned a tier (§4).
3. ☐ Input caps stated, with over-cap behaviour.
4. ☐ Display layers named from the vocabulary (§3), not re-described.
5. ☐ Content source file named (§5a) — existing file to compile from, or "draft it first"; any external sites (e.g. TV Tropes) listed in it.
6. ☐ Explainer format sketched (table columns, diagram shape) — even roughly.
7. ☐ One example input and the expected highlights/labels for it. *A single worked example is worth a page of description — it lets Claude test its own build.*
8. ☐ Where the asset and its content file should be saved.

## 7. The feedback cycle

Expect iteration; structure it:

1. **First build** — Claude delivers the file; open it, try your example input.
2. **Feedback round** — report in three buckets: *wrong* (parser missed/mislabeled), *ugly* (display issues), *missing* (features not built). Fix wrong first.
3. **Rule tuning** — for Tier-A functions, give counter-examples ("it flagged X, it shouldn't"). The fix lands in the **content source file** first (§5a), then Claude rebuilds the asset from it — so the correction survives future rebuilds.
4. **Freeze** — when satisfied, ask Claude to bump the version number in the file's footer and note the date.

---

# Part 2 — Worked Example: The Nine Teaching-Aide Parsers

An on-call asset-generator display in a browser tab: **nine teaching aides sharing one design** (the §3 layer stack and §5 parser architecture), each with its own content, rules, and Explainer.

## 2.1 The nine aides at a glance

| Aide | Input unit | Cap | Parser logic | Tier |
| :--- | :--- | :--- | :--- | :--- |
| Style | one paragraph | 1000 w | pattern matching to a style schema — 7 independently-selectable sweeps (5 genres + antitheses, 2 registers) | A |
| | | | *↑ **BUILT — all 7 sweeps** (`System/Widgets/Parser/Style/cartridge/Style_parser.html`, v1.0.0; reference slice — Clarity+Obscurity, Academic English — built 2026-08-12, extended to Brevity/Coherence/Voice/Diction + antitheses and Simple/Descriptive English 2026-08-13). Spec: `System/Widgets/Parser/Style/Specs/Done/StyleParser.spec.md`; editable source: `System/Widgets/Parser/Style/cartridge/`. First cartridge to use the shell's sweep-selector extension (`_shell/Specs/ParserShell.spec.md` FR-19–23)* | |
| Fact-checking | one paragraph | 1000 w | first pass: split claim/source; second pass: search both | **B** |
| Rhetoric | one paragraph | 1000 w | pattern match types of speech, then effect | A |
| Grammar | one sentence | **100 w** | pass 1 bottom-up lexical; pass 2 top-down syntactic + semantic; pass 3 conventions | A |
| | | | *↑ reference build — **BUILT 2026-07-05, rebuilt from the shell 2026-08-10** (`System/Widgets/Parser/Grammar/Grammar_parser.html`, v1.0.0, 4.18 MB single file, embedded 20k-word SQLite lexicon + central spelling dictionary). Spec: `System/Widgets/Parser/Grammar/Specs/Done/GrammarParser.spec.md`; editable source: `System/Widgets/Parser/Grammar/cartridge/` (see its README); rebuild recipe: `System/Widgets/Parser/_shell/README.md`. All other parsers are cartridges assembled against the same shell (§5b) — Style has a full 7-sweep cartridge built (below); the other eleven are not yet built* | |
| Interpretation | one page | 1000 w | match named entities/phrases to methodology schema | A |
| Story-tension | one scene | **5000 w** | trope check, plot summary, inciting incident, context, complication, resolution, unresolved matters | **B** |
| Logic | one paragraph | 1000 w | terms (clear/unclear), judgements (contradictory?), arguments (valid/invalid) | A |
| Greek & Hebrew | one paragraph | 1000 w | *(to be specified)* | — |
| Tropes & symbols | one page | 1000 w | *(to be specified — trope detection likely Tier B)* | B? |

**Content source files (§5a):** each aide has a companion Markdown file holding its schemas, rule lists, and explanation text — e.g. `Style_content.md`, `Grammar_content.md` — compiled into the asset at build time. For Tropes & symbols and Story-tension, the content file also names **TV Tropes** as an external site for the Tier-B trope check; Fact-checking's file lists its approved search sources.

## 2.2 Shared UI (the §3 stack, in full)

1. Clean text input (semi-plain text: italics, bold, dot points), Parse button, Display All button, spell-check toggle.
2. **Layer 1:** inline colour highlighting for longer-span concepts, colour key above the text.
3. **Layer 2:** in-text expanders for detailed context; in-text icons for at-a-glance patterns (icon bar above the text).
4. **Layer 3 (hover):** tokenized text/phrases for shorter concepts; hover pop-up for detailed explanations.
5. Spell checker: red fuzzy underline, one-click replace.
6. Export bar: print to PDF (with or without UI), copy to Markdown, copy to plain text.

## 2.3 Explainer formats

| Aide | Explainer |
| :--- | :--- |
| Style | Genre sweeps (Clarity/Brevity/Coherence/Voice/Diction + antitheses): Grammar-style two-part Explainer — findings table + deduplicated rules-extracted list — colour-coded per genre, drilled into via click (no focus-level zoom; Style has no structural nesting to zoom through). Register sweeps (Academic English, Simple/Descriptive English): a traffic-light scorecard (🟢🟡🔴⚪ per rule) with inline highlighting on 🔴/🟡 spans and click-to-expand suggestions. Full design: `System/Widgets/Parser/Style/Style_content.md`'s "Explainer format" section. |
| Fact-checking | *(to be specified)* |
| Rhetoric | table: types of speech × their effects |
| Grammar | four-row table, one column per word — row 1 the sentence, rows 2–3 syntax, row 4 semantic meaning |
| Interpretation | methodology table: Method · representative proponent · quote snippet · elements of the method matching the content |
| Story-tension | trope + plot summary; inciting incident, context, complication, resolution, unresolved matters — ASCII squares interposed with graph-style tension lines, + PDF version |
| Logic | terms/judgements/arguments explanation + relevant fallacies + syllogism(s) — ASCII circles, + PDF circles |
| Greek & Hebrew | *(to be specified)* |
| Tropes & symbols | *(to be specified)* |

## 2.4 Open items

- Greek & Hebrew: parser logic and Explainer undefined.
- Tropes & symbols: parser logic and Explainer undefined (likely overlaps Story-tension's trope check — decide whether they share a rule set).
- Style: **all 7 sweeps built and browser-verified** (`Style/Specs/Done/StyleParser.spec.md`, AC-S1–AC-S12 all passing) — OQ-S1/OQ-S2 resolved (AD-S1/AD-S2); AD-S4 (the shared shell's hue-by-clause-index limitation) resolved 2026-08-13 via an additive `hueIndex` lookup in `_shell/src/ui.js`, proven not to affect Grammar. Known minor gaps (logged, not blocking): register findings' Layer-1 `--tl-red`/`--tl-amber` span highlighting was never wired up; a few Simple/Descriptive English rules compile to an empty definition string (cosmetic). Fact-checking: Explainer format still undefined.
- API-key handling for the Tier-B aides (settings field vs `localStorage`).
- Content source files: **Grammar's is drafted** (`System/Widgets/Parser/Grammar/Grammar_contents.md`) and its spec written (§5b), and its cartridge is built. The other twelve `<Store>_content.md` files are also drafted (each lives at its widget's root, e.g. `System/Widgets/Parser/Logic/Logic_content.md`) — Fact-checking's is a short stub, the rest are substantial. None of the twelve has a `cartridge/` yet; building one per aide (per §5b, against `_shell/`) is the natural next move, followed by a short spec citing the Grammar spec.
- Fact-checking: approved source list for its content file undefined.
