---
type: content-source
title: "Style — Content Source"
description: "Greatest-hits prose-style schema synthesised from Strunk & White, Williams, and Orwell, plus two independent register sweeps (Academic English, Simple/Descriptive English). Index to the per-genre rule files (Genres/), their antithesis sweeps, the register sweeps (Registers/), the sweep model for the future engine build, and the provenance and licence statement. Draft content source for the Style parser aide; pending Luke review."
status: draft
---

> **STATUS: DRAFT — pending Luke review.** The mechanism this content feeds is no longer
> hypothetical: the full 7-sweep cartridge (all five genres + antitheses, both registers) is built and
> browser-verified against exactly this content — `Style/Specs/Done/StyleParser.spec.md`,
> `Style/cartridge/Style_parser.html` (reference slice 2026-08-12; remaining sweeps 2026-08-13). That
> proves the pipeline works end-to-end for every sweep; it is not the same thing as Luke having reviewed
> the rules' actual wording, which is still open.

# Style — Content Source

Per `System/Suggestions/Parser_guide.md` §5a — schemas, rules, and explanation text for the Style parser
(input unit: one paragraph; cap 1000 words; Tier A pattern matching to a style schema).

This index collates a "greatest hits" prose-style schema drawn from three canonical sources, plus two
independent register sweeps. Every rule family lives in its own file, one file per sweep, following the
project's outline-numbered content-source dialect (`System/Widgets/Parser/_modules/MiniWiki/build/extract_articles.py`)
so each rule compiles cleanly into `CONTENT` and browses cleanly in MiniWiki. Provenance marks distinguish
direct quotation (Strunk, public domain) from paraphrase (Williams, Orwell, ASD); a full provenance and
licence statement appears at the end of this file (§8).

## Sweep model (for the future engine build)

Seven sweeps exist across this content set, in two categories, declared per-file in frontmatter:

| Field | Values | Meaning |
|---|---|---|
| `sweep_category` | `genre` \| `register` | `genre` = one of the five toggleable rule-families (Clarity, Brevity, Coherence, Voice, Diction); `register` = an independent search sweep (Academic English, Simple/Descriptive English) |
| `sweep_id` | kebab-case slug | the detector's own identifier |
| `opposite_sweep_id` | kebab-case slug, genre files only | the antithesis detector's identifier (e.g. `clarity` → `obscurity`) |
| `opposite_section` | outline number, genre files only | the antithesis section's top-level id, in the same physical file as its genre |

**Selection.** All seven sweeps are independently selectable, in any combination — none is bundled with
another by default. A run can be "Clarity only," "Academic English only," "Clarity + Brevity + Simple/
Descriptive English," and so on.

**The opposite toggle.** Only the five genre sweeps carry it. Switching it swaps which outline section
the engine reads for that genre — its own top-level section for the affirmative rules, or its paired
antithesis section for the antithesis rules — same file, same `CONTENT` compilation unit, different id
range. The two register sweeps have no opposite mode: each always checks for its one named register.

**What "opposite" means here** (Luke's decision, 2026-08-10): an antithesis section is *not* a
violation-detector mirroring its genre's corrective Before/After pattern. It recognises the antithetical
technique as a legitimate register in its own right — e.g. Diction's antithesis, Ornament, still requires
fresh figuration; it is not "clichés are fine now." Each antithesis rule therefore carries a single
demonstrative `Example:` rather than a Before/After pair.

## Genre files (§1–§5, each paired with its antithesis)

| File | Rule sweep | Antithesis sweep | Sources |
|---|---|---|---|
| [Genres/Clarity.md](Genres/Clarity.md) | §1.1–1.5 Clarity — active voice, positive form, concrete language, characters as subjects, actions as verbs | §8 Obscurity | Strunk & White (quoted); Williams (paraphrased); Orwell (paraphrased, §8) |
| [Genres/Brevity.md](Genres/Brevity.md) | §2.1–2.3 Brevity — omit needless words, cut where possible, prefer short words | §9 Verbosity | Strunk & White (quoted); Orwell (paraphrased) |
| [Genres/Coherence.md](Genres/Coherence.md) | §3.1–3.4 Coherence — old-to-new flow, cohesive paragraphs, related words together, parallelism | §10 Incoherence | Williams (paraphrased); Strunk & White (quoted) |
| [Genres/Voice.md](Genres/Voice.md) | §4.1–4.3 Voice — active over passive, write naturally, do not overwrite | §11 Affectation | Orwell (paraphrased); Strunk & White (quoted) |
| [Genres/Diction.md](Genres/Diction.md) | §5.1–5.3 Diction — no dead metaphors, standard over offbeat, sparing figures of speech | §12 Ornament | Orwell (paraphrased); Strunk & White (quoted) |

## Register files (§6–§7, independent sweeps, no opposite toggle)

| File | Rules | Source |
|---|---|---|
| [Registers/Academic_english.md](Registers/Academic_english.md) | §6.1–6.10 Academic English — tense precision, quantification over qualification, non-evaluative data reporting, epistemic hedging for interpretation | Editorial synthesis (no single named source) |
| [Registers/Simple-descriptive_english.md](Registers/Simple-descriptive_english.md) | §7.1–7.20 Simple, Descriptive English — controlled vocabulary, restricted verb forms, one instruction per sentence, 20-word sentence cap | ASD-STE100, Simplified Technical English (paraphrased) |

## Explainer format (Luke's direction, 2026-08-10)

Two distinct Explainer designs, one per sweep category — genre sweeps behave like Grammar's cartridge
Explainer (`Grammar/Specs/Done/GrammarParser.spec.md` AD-6/FR-18); register sweeps introduce a new
pattern this shell hasn't shipped yet. Both stay within the shared `ParseResult` contract
(`_shell/Specs/ParserShell.spec.md` §6) except where noted.

### Genre sweeps — coloured, drill-down (Clarity/Brevity/Coherence/Voice/Diction, incl. antitheses)

**Colour model — categorical, not structural-kinship.** Each active genre gets its own hue from the
cartridge's `colours.palette` (see `_shell/StyleGuide/02-colour-model.md`), meaning "this span is a
Clarity hit" — not Grammar's AD-7 model, where hue means "same clause" and shade/tint carry nested
phrase/word membership. Style's findings are flat spans over one paragraph with no clause-phrase-word
containment to inherit down, so there is nothing for a shade/tint pair to carry — one hue, one
intensity, per genre is enough. Toggling a genre to its antithesis (§8–§12) keeps the *same* hue: a
genre and its antithesis are one detector in two mutually exclusive modes, never rendered at once, so
there's no colour collision to resolve.

**No focus-level zoom.** Grammar's FR-5a focus-level selector (Sentential → Clausal → Phrasal →
Lexical) has no Style equivalent — a paragraph has no comparable nested structural granularity to zoom
through. **OQ-S1 (open, carried to the eventual cartridge spec):** propose `CONFIG.levels: ["paragraph"]`
— a single trivial level, so the shell's generic focus-level CSS template (`ParserShell.spec.md` AD-2)
still satisfies the required-field contract at `n=1` without ever functioning as a real zoom control.
Revisit only if a future build finds real value in a coarser/finer split (e.g. sentence-pass vs.
paragraph-pass).

**"Deeper layers on click" — Style's version of it.** Where Grammar zooms structurally, Style drills
into explanation depth, reusing the same Layer 1→2→3 vocabulary (`Parser_guide.md` §3):
- **Layer 1** (always shown after Parse) — the flagged span tinted/underlined in its genre's hue.
- **Layer 2** (click) — an in-text expander unfolds, in place: which rule fired (id + short label) and
  its confidence.
- **Explainer** (on request), two parts, mirroring Grammar's AD-6:
  1. **Findings table** — one row per flagged span, not per word (Style has no per-word density to
     tabulate the way Grammar's four-row table does): *Excerpt · Genre (colour chip) · Rule id/name ·
     Confidence · Suggested revision.* The suggestion is the content file's Before/After pair adapted to
     the actual excerpt where the engine can manage it, falling back to the rule's own worked example
     otherwise — an engine-tier decision, not an Explainer-format one, deferred to that spec.
  2. **Rules extracted** — below the table, every distinct rule id actually hit, deduplicated, grouped
     under genre sub-headings (colour-tagged, mirroring Grammar's category sub-headings), each a dot
     point with the rule's definition and example pulled verbatim from `CONTENT` — identical mechanics
     to Grammar's AD-6 part 2.

### Register sweeps — traffic light (Academic English, Simple/Descriptive English)

A pattern Grammar doesn't have — a register checks conformity across a whole rule-set, not structural
findings, so its Explainer is a scorecard, not a parse tree.

**The scorecard.** One row per rule in the sweep (§6.1–6.10 or §7.1–7.20), each carrying a light:

| Light | Meaning |
|---|---|
| 🟢 Conforms | the rule's target pattern is present / no violation found |
| 🟡 Partial | a borderline or partially-met case (engine confidence in the amber band, or a soft violation) |
| 🔴 Violates | a clear violation |
| ⚪ N/A | the rule doesn't apply to this input (e.g. §7.9 "vertical lists" has nothing to evaluate in a paragraph with no complex instruction) |

This reuses the existing Layer-2 "icon bar" pattern from `Parser_guide.md` §3 (in-text icons + an icon
key bar above the text) rather than inventing a new chassis primitive — the scorecard *is* an icon bar,
indexed by rule id instead of by token.

**Inline highlighting stays for 🔴/🟡.** Those rows also get a Layer-1 span highlight in the paragraph
itself, so "which sentence broke §6.1 Tense precision" is visible at a glance, not just listed in the
scorecard. 🟢/⚪ rows have nothing in the text to highlight.

**Suggestions.** Clicking a 🔴/🟡 row (Layer 2, the same click-to-expand mechanic as the genre sweeps)
reveals the specific excerpt plus a suggested rewrite toward conformity. Where the fix is a fixed,
mechanical transformation (e.g. §7.4 "use the active voice," §6.6 "agentless framing" — both word-order
rewrites), that's Tier A, in keeping with Style's overall Tier-A declaration (`Parser_guide.md` §4).
**OQ-S2 (open):** a few Academic English rules (§6.7 epistemic hedging, §6.9 boundary/scope framing) ask
for genuine paraphrase, not a mechanical swap — whether those specific sub-rules stay Tier A with a
fixed hedge-phrase template, or get promoted to Tier B per `Parser_guide.md` §4's own rule of thumb
("promote to Tier B only when the function genuinely needs knowledge or judgment that can't be
enumerated as rules"), is deferred to the engine spec — flagged here so it isn't silently decided either
way.

**Schema note — affects the shared shell, not just Style.** The traffic light reuses
`ParseResult.findings[].severity` (`ParserShell.spec.md` §6) rather than inventing a new top-level
field: `flag` = 🔴, `info` = 🟡, `check` = 🟢. There is no existing value for ⚪ N/A. **Proposed addition:**
extend the enum to `'check' | 'info' | 'flag' | 'na'` — a one-line change to the shared schema, not a
Style-only hack; needs sign-off before `_shell/Specs/ParserShell.spec.md` is amended. Unlike Grammar's
own convention (FR-17: "no '0 errors' placeholder... shown"), a register sweep deliberately renders
*every* rule's light, including green — the whole feature is the full scorecard, not a decluttered flag
list. This is a genre-vs-register Explainer difference worth stating plainly, not an accidental
inconsistency with Grammar's house style.

**On completion of a real build:** these two designs, plus the Sweep model above, consolidate into a
proper `Style/Specs/Done/StyleParser.spec.md` per `Parser_guide.md` §5b (citing the Grammar spec as
prerequisite) once content mapping and engine passes are also decided — this section is the reviewable
draft that spec will absorb, not a substitute for it.

---

## 8. Provenance

### Sources, editions, and licence status

| Source | Edition / Date | Author | Licence / Status | Usage |
|---|---|---|---|---|
| *The Elements of Style* | Original 1918 edition (Strunk) and later Strunk & White editions | William Strunk Jr. and E.B. White | **Public domain** (1918 original); later editions may carry renewed copyrights on White's contributions only — all quoted matter herein is drawn from material that is in the public domain | Direct quotation throughout — Genres/Clarity.md (§1.1–1.3, §8.2), Genres/Brevity.md (§2.1), Genres/Coherence.md (§3.3–3.4), Genres/Voice.md (§4.2–4.3, §11.2), Genres/Diction.md (§5.2–5.3) |
| *Style: Lessons in Clarity and Grace* | Multiple editions (first published 1981) | Joseph M. Williams | **Copyright** — Pearson Education. Used here in **paraphrase only**; no direct quotation | Paraphrased principles — Genres/Clarity.md (§1.4–1.5), Genres/Coherence.md (§3.1–3.2, §10.1–10.2) |
| "Politics and the English Language" | 1946 (essay, originally published in *Horizon*) | George Orwell | **Copyright** — the Orwell estate. Used here in **paraphrase only**; no direct quotation | Paraphrased rules — Genres/Brevity.md (§2.2–2.3, §9.1–9.2), Genres/Voice.md (§4.1), Genres/Diction.md (§5.1, §12.1), Genres/Clarity.md (§8.1) |
| ASD-STE100 (Simplified Technical English) | Current issue | ASD (AeroSpace and Defence Industries Association of Europe) | **Copyright ASD.** Used here as a **paraphrased summary of the rule categories only**; no verbatim text from the standard's dictionary or writing rules is reproduced | Paraphrased rule categories — Registers/Simple-descriptive_english.md (§7.1–7.20) |
| — | — | — | No single source; editorial synthesis of standard academic-writing convention | Registers/Academic_english.md (§6.1–6.10) |

### Additional notes

- All "Before/After" example pairs in the genre files (§1–§5) are **original compositions written for this
  content source**. They are not drawn from any source. The antithesis sections' (§8–§12) single
  demonstrative examples are likewise original compositions.
- The categorisation into five genres (Clarity, Brevity, Coherence, Voice, Diction), their five paired
  antitheses (Obscurity, Verbosity, Incoherence, Affectation, Ornament), and the two register sweeps
  (Academic English, Simple/Descriptive English) is this content source's own editorial structuring and
  does not appear in any source.
- Where a principle appears in more than one source (e.g., active voice in both Strunk & White and
  Orwell), both sources are acknowledged; the principal citation is attached to the section where the
  canonically "strongest" articulation appears. Antithesis sections that mirror an affirmative rule cite
  the same source, explicitly marked "read here as the register it warns against" rather than presented
  as new source material.
- The paraphrase rules for Williams, Orwell, and ASD material follow the project's provenance policy: the
  source is named at each occurrence, the paraphrase marker is explicit, and no words, phrases, or
  sentence structures are reproduced from the original texts.
