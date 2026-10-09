---
name: GrammarFrame
description: "Turn Luke's raw grammar notes, pasted into Memory/Long-Term/Grammar/Original_Content.md, into two offline HTML guides with one shared heading skeleton: Technical_Outline.html (a detailed technical reference, authoritative on fact) and Theatre.html (Luke's own theatre metaphor, kept in a saved mapping table and extended only with his approval). Checks facts and quotes on its own; asks Luke before adding a heading, correcting his grammar, restructuring, adding anything significant, or adding a new mapping. Diagnostic questions are the spine of both guides. Every concept is placed by its BREADTH (vertical: its kinds and parts) and its REACH (sideways: what depends on it elsewhere), and shown with matching weight. Governed by one canonical criteria set in reference/criteria.md."
type: Skill
status: Registered
core_function: [Categorise, Research, Synthesize, Generate]
intent: "Given grammar notes in Original_Content.md: tidy them (zero new content), research and fact-check against five named sources without interrupting Luke, bring every proposed heading, correction, restructure, significant addition and new theatre mapping to one gate, then render Technical_Outline.html and Theatre.html from a locked shared skeleton. Original_Content.md is permanent and ever-growing, so each run researches and gates only new or changed headings; settled headings are carried forward from the prior guides."
version: 3.24.0
domain: Teaching
changelog: "3.24.0 (2026-09-26, Luke) — durable build source: render.py, drafts/, dressing.json and reach.json moved from _run/ to Memory/Long-Term/Grammar/_build/, which is never cleared (🔐 SPECIAL PERMISSION, 👁️ LIVE RENDER). Also recorded: LOCKED — Verbs keeps THREE kinds (to-be verb, main verb, auxiliary verbs), though BE can be either a main verb or an auxiliary; not to be restated as two kinds (breadth-and-reach.md, Rejected_Proposals); an Exception long enough for C39 becomes a sub-subsection with its own rule, diagnostic and plain example (To be verb: subjunctive *were*); D1 covers pronouns named as subjects; D4 for headings with sub-subsections. 3.23.0 (2026-09-26, Luke) — LOCKED: a heading with two or more sub-subsections lists them as a short bullet list under its title, AFTER its \"Governed by:\" line (markup.md); sub-subsection titles are h5/h6 and named in the draft's `subsections`; new D18 section hue (five hues on main headings, filtered down the branch, titles only; criteria.md D18, D11 wording). Changed only with Luke's accept. 3.22.0 (2026-09-26, Luke) — LOCKED: the definition of *Exception* (the rule as stated does not hold here) and the exceptions guardrail C39 (exhaustive; complex or long ⇒ own sub-section); changed only with Luke's accept (criteria.md D13, C39). 3.21.0 (2026-09-26, Luke) — LOCKED definition of *Narrow case*: the rule still holds, but in a restricted use or sense that the general statement doesn't spell out; BE meaning \"exist\" is the only one so far. One meaning across the label (D13), E2 and E7; changed only with Luke's accept (criteria.md, breadth-and-reach.md). 3.20.0 (2026-09-26, Luke) — Exceptions must be exhaustive (new C39): an Exception states every case, condition and form it covers and its ordinary contrast, leaves no known case to a pending tag, and a complex or long one becomes a sub-subsection of its own (E2); *Exception* and *Narrow case* are visible labels read by both Luke and the agent, like NOTE (D13, D17). 3.19.0 (2026-09-26, Luke) — reach stubs simplified: a stub is only \"Governed by: <heading>\", set like the Contains line; the \"here it …\" wording lives in the interaction table alone; D15 restated, validate.py D15/A14 read the new form (criteria.md, markup.md, render.py, validate.py). 3.18.0 (2026-09-26, Luke) — diagnostic questions need a CLEAR ANSWER, not necessarily yes or no: a \"which word / which form / which class\" question is allowed when its answer is one named item two readers would agree on; C10 and C11 restated for both forms, and the checker's answers field takes either (criteria.md, fleet.md). 3.17.0 (2026-09-26, Luke) — the \"Contains N — k kinds, p parts\" count line is hidden: a `data-breadth-label` attribute on the heading, no longer visible text; the `Contains:` link line and the shading stay (D11, D17; markup.md, render.py, validate.py). 3.16.0 (2026-09-26, Luke) — NOTE keeps its visible `NOTE —` label (the one label both Luke and the agent read; reverses that part of 3.15.0); Verbs key summary punctuated \"What the verb names, sets what must follow\" (D17, C37; render.py, validate.py). 3.15.0 (2026-09-26, Luke) — hidden agent labels: the names Definition, Key summary, Diagnostic question(s), Reach question(s), Examples and NOTE are `data-label` attributes only, never shown; Luke reads the kinds by their marks (`*`, `>`, the box). The visible DIAGNOSTICS block heading and the `NOTE —` prefix are gone; new D17, checked by validate.py (criteria.md D3, C37, D17; markup.md; render.py). 3.14.0 (2026-09-26, Luke) — examples must match their claim: new C38 requires every example in a rule definition, call-out, niche point, table cell or gloss to show exactly what its sentence says (the Verbs call-out claimed \"what must follow\" but led with *she slept*, which has nothing following); checked at STEP 5C beside C17 (criteria.md, fleet.md). 3.13.0 (2026-09-26, Luke) — category words italic: a word named as a member of a category (BE's forms, the auxiliaries, the modals) is a specimen and renders italic everywhere, glossary glosses included (D1); render.py brought back in line with the guides (glossary appendix and links, no Breadth block, verbatim NOTEs) and made the only way the guides change (👁️ LIVE RENDER). 3.12.0 (2026-09-26, Luke) — example typography: each example and its worked example share ONE box (example on top, worked version beneath); the worked example is italic with its [bracket] notes upright; every example is italic wherever it stands, table cells included (D1, D4, markup.md, render.py). 3.11.0 (2026-09-26, Luke) — one axis per branch: the Form/Function choice is made at the heading where Luke's notes choose how a branch is organised (form-function, purpose, order, …) and inherited below it; a heading chooses only if no ancestor did; where the notes are silent a grid test proposes at the gate. Verbs = purpose, so no Form/Function anywhere under it; To be verb, Auxiliary verbs and Verb phrase redone (E1 Q0, C5, A2, markup.md data-axis hooks, fleet.md, render.py, validate.py). 3.10.0 (2026-09-26, Luke) — NOTEs are Luke's verbatim words only, nothing added (no caveat, label or joiner); new C37 checks each note line against Original_Content.md (E3, criteria.md, markup.md, fleet.md, render.py, validate.py). 3.9.0 (2026-09-26, Luke) — diagnostics move after the rules: each section's Diagnostics block follows its last rule (after the `*` key summary), not before it (D3, markup.md, render.py, validate.py order check). 3.8.0 (2026-09-26, Luke) — 🔐 working-area permission: the skill works entirely inside Memory/Long-Term/Grammar/; the run folder (drafts, checks, prior snapshot, paste, render.py, preview.py) moved from System/Sandbox/GrammarFrame-run/ to Memory/Long-Term/Grammar/_run/, rollbacks to _run/rollback/. 3.7.0 (2026-09-26, Luke) — Breadth questions retired: no Breadth block on the page or in the index; the Contains overview carries breadth alone; the kind/part tests stay as the unrendered E7 procedure (D3, D8, C34, breadth-and-reach.md, markup.md, validate.py). 3.6.0 (2026-09-26, Luke) — glossary appendix: term definitions move out of the headings into one alphabetical Glossary appendix per guide, before the index; prose uses link to their entry; the VCAA label sits in the entry (D2, D16, markup.md, validate.py). 3.5.0 (2026-09-26, Luke) — fleet framework: role/model table with one merged 5B+5C CHECKER (reference/fleet.md), fixed JSON returns, a markup contract (reference/markup.md) and validate.py ruling the mechanical criteria at STEP 1 and STEP 8. FLEET MODE is now the default. 3.4.0 (2026-09-26, Luke) — sources: a fifth grammar source (UCL Internet Grammar of English); quotation finders and Quote Investigator named; the VCAA term shown beside each glossed term in Technical_Outline.html (D16; A8 and A13 clarified); an unreachable source is named once, not flagged per heading (reference/sources.md). 3.3.0 (2026-09-26, Luke) — revision mode: a Luke-named unit is marked REDO and re-worked though its source is unchanged; smallest unit regenerated, unit + twin + reach set re-verified, reason kept in Revisions.table.md (🔁 REVISION MODE, A13, B9). 3.2.0 (2026-09-26, Luke) — batches: a pending set larger than one batch is worked and reported batch by batch until complete (🧱 BATCHES, STEP 1, STEP 8B, STEP 9). 3.1.0 (2026-09-26, Luke) — breadth and reach: E6/E7 measures, Breadth and Reach question bank, interaction tables, reach strip, stubs, Foundations list, Contains overviews, neutral/accent shading (reference/breadth-and-reach.md; A14, B8, C34–C36, D11–D15)"
supersedes: "v2.3.0 (grammar-content.json sidecar and reference/schema.md retired 2026-09-24; schema archived to Archive/GrammarFrame-schema-2026-09-24/)"
dependencies:
  - "reference/criteria.md (the standard — always loaded)"
  - "reference/meaning-first.md (the governing frame — always loaded)"
  - "reference/sources.md (the closed research set — always loaded)"
  - "reference/breadth-and-reach.md (the breadth/reach distinction, measures and question bank — always loaded)"
  - "reference/markup.md (the hooks both guides carry — loaded at STEP 6/7; validate.py reads through them)"
  - "reference/fleet.md (roles, models, return formats — loaded for FLEET MODE, the default)"
  - "validate.py (hashes at STEP 1, row counts, the mechanical ruling at STEP 8; tests in tests/)"
  - "System/Skillbank/GeneralPurposeSkills/!SimpleEnglish/SKILL.md (register, pragmatic mode)"
  - "System/Skillbank/GeneralPurposeSkills/!ConceptFidelity/SKILL.md (C33, STEP 7B — metaphor lane every run)"
  - "System/Skillbank/GeneralPurposeSkills/!Comprehension/SKILL.md (C32, STEP 7B — full review only)"
  - "!HouseStyle (core, always on — rendered surfaces; both guides registered SUBORDINATE, row 13 of its reference/sources.md)"
calibration:
  context: Teaching
  level: Extended
  scope: Local
impact: Low
memory_footprint:
  read:
    - "Memory/Long-Term/Grammar/Original_Content.md"
    - "Memory/Long-Term/Grammar/Technical_Outline.html + Theatre.html (prior run's state, via A13)"
    - "Memory/Long-Term/Grammar/Theatre_Mappings.table.md (the saved metaphor)"
    - "Memory/Long-Term/Grammar/Rejected_Proposals.table.md (never re-propose a declined item)"
    - "Memory/Long-Term/Grammar/Revisions.table.md (standing redo reasons — never regress one)"
  write:
    - "Memory/Long-Term/Grammar/_run/ (the run working area — see 🔐 SPECIAL PERMISSION)"
    - "Memory/Long-Term/Grammar/_build/ (render.py, drafts/, dressing.json, reach.json — the durable build source; never cleared)"
    - "Memory/Long-Term/Grammar/Original_Content.md"
    - "Memory/Long-Term/Grammar/Technical_Outline.html"
    - "Memory/Long-Term/Grammar/Theatre.html"
    - "Memory/Long-Term/Grammar/Theatre_Mappings.table.md (gated rows only)"
    - "Memory/Long-Term/Grammar/Rejected_Proposals.table.md (append-only)"
    - "Memory/Long-Term/Grammar/Revisions.table.md (append-only; created on first redo)"
---

## 🔐 SPECIAL PERMISSION — the Grammar store is the whole workspace

Luke's standing exception (2026-09-26): **!GrammarFrame works entirely inside
`Memory/Long-Term/Grammar/`. It never uses `System/Sandbox/`.** This overrides the system default
(CLAUDE.md *Information Flow*) that drafts and intermediates live in the Sandbox.

- **Build source (durable):** `Memory/Long-Term/Grammar/_build/` holds what makes the guides —
  `render.py`, `drafts/`, `dressing.json` and `reach.json`. **It is never cleared**: the format of the
  guides lives in `render.py`, and the wording in the drafts (moved out of `_run/`, 2026-09-26).
- **Working area:** `Memory/Long-Term/Grammar/_run/` holds the records of a run — `checks/`, `prior/`
  (STEP 0 snapshot), `paste.md`, `rows.json`, batch briefs and rulings, `preview/`, and one-off
  scripts.
- **Rollbacks:** a pre-change snapshot of the guides goes to `_run/rollback/<date>-<reason>/`.
- **Scope of the permission:** writes to `_run/` and to the files listed under `memory_footprint`
  need no `!Checkpoint` and do not make a run Major on their own. `_run/` is working state, not
  durable memory: it may be cleared between runs without `!ArchiveMemory`. `_build/` is durable
  and is cleared or changed only by a redo, never wholesale. Everything else about
  the Long-Term files is unchanged — deleting or archiving `Original_Content.md`, the two guides or
  the tables still goes through `!ArchiveMemory`, and gated rows still need Luke's accept.
- **Nothing outside the store.** If a step would write anywhere else (Sandbox included), stop and
  ask Luke.

## ⚡ TRIGGER

Luke pastes or edits content in `Memory/Long-Term/Grammar/Original_Content.md` and asks for the
framework to run — "run the grammar framework", "process this grammar content", "regenerate the
theatre/technical guides", "build the grammar guide", "!GrammarFrame". Also fires when he asks for a
grammar topic to be worked up with the paste still to come.

**Revision.** "Redo / rework / regenerate / fix <a concept, section, rule, diagnostic, example,
table, diagram, the theatre dressing of X, a mapping>" — or any request to change something already
rendered — runs 🔁 REVISION MODE.

**Full review.** "Full review", "run the full transmission review" or "check how the guides read"
switches STEP 7B from its light default to the full review (C32 + all of C33).

## 👤 THE READER — an audience of one

Both guides are written for **Luke and nobody else** — a reader who already knows grammar and wants
it laid out. Neither is a teaching document; they are one person's reference in two idioms (C23).

| | `Theatre.html` | `Technical_Outline.html` |
| :--- | :--- | :--- |
| What it is | **Luke's own theatre metaphor, filled out** | **A detailed technical reference** |
| Whose frame | HIS — the saved mapping table, extended only with his accept | conventional grammatical description |
| Finished when | the metaphor reaches every heading and holds together (C29, C30) | every heading is technically complete |
| Authority | takes its FACTS from the technical file | authoritative on fact, and only on fact (C22) |

Theatre.html may go lighter on technical granularity; it may never go lighter on the metaphor (C31).

## 🚦 THE TWO LANES — the governing distinction

```
  AUTONOMOUS — never ask, just do          │  GATED — always ask, never do alone
  ─────────────────────────────────────────┼──────────────────────────────────────────
  Verifying a quotation's wording and      │  Adding a section, heading or sub-heading
    attribution; replacing a bad one       │  Correcting Luke's grammar or stated rule
  Fact-checking every grammar claim        │  Restructuring — reorder, split, merge,
  Resolving source disagreements by        │    re-nest what he wrote
    reference/sources.md precedence        │  Any SIGNIFICANT addition
  Filling a format slot inside a heading   │  Any NEW theatre mapping, including one
    he already gave (diagnostic, example,  │    he states in a new paste
    table, gloss, a rule's own why)        │
  Mechanical cleanup of the paste          │
  Rewording heading text for house style   │
  Running the GROUP E decision tests       │
  Correcting MY OWN drafts (C17)           │
```

**Where the lanes meet:** fact-checking is autonomous; *acting on what it finds about Luke's own
content* is not. A finding that his rule is wrong is carried to the gate, never applied.

**Significant vs routine.** Routine completes a slot the format requires, inside a heading Luke gave,
without changing what it claims. Significant introduces a rule, exception, distinction or category he
did not state. **Close calls are gated** (B6).

## 📐 THE FRAME

`reference/meaning-first.md` governs every word this skill writes: **grammar is the shape meaning
takes when it has to come out one word at a time**, so no rule is rendered as arbitrary convention.
The five sources supply **what** English does; the frame supplies **why**. A source's contrary
reasoning is discarded (the rule kept); a rule the frame cannot explain is flagged, never given an
invented reason (C27).

Meaning does two jobs, never confused: the standing PRINCIPLE (verbatim, once per guide — A6) answers
"why grammar at all"; each rule's own A2 answers "why THIS rule" (C4).

## 🎛️ FORM FOLLOWS CONCEPT

Every formatting decision answers one question — **what does THIS concept need to be shown
correctly?** — never a uniform template. Each is a GROUP E test in `reference/criteria.md`:

| Question | Test | Cadence |
| :--- | :--- | :--- |
| Which axis organises the branch, then Form/Function sub-headings or not? | E1 | axis once per branch (inherited below); layout once per heading |
| Sub-subsections, or not? | E2 | once per section, after E1 |
| RULE or NOTE? | E3 | once per approved point |
| One box diagram or several? | E4 | once per Syntax + Clause/Sentence/Phrase heading |
| Cross-reference link, or none? | E5 | once per heading |
| Table or paragraph? | D9 | once per heading |
| How much does it contain? (breadth) | E7 | once per heading, re-scored guide-wide every run |
| What else does it shape? (reach) | E6 | once per rule, re-scored guide-wide every run |

These decide HOW approved content is shaped, never WHETHER content is added.

## 📏 BREADTH AND REACH — its place in the whole guide

A concept's weight on the page comes from its place in the WHOLE technical guide, never from how
interesting it is, and never from where its heading happens to sit. Two measures, never confused:

> **BREADTH = vertical.** Its sub-concepts are KINDS or PARTS of it. *What does it contain?*
> **REACH = sideways.** Other concepts DEPEND ON it, in branches of the outline it isn't in. *What
> else does it shape?*

The outline already shows breadth, so breadth gets only neutral shading and a Contains overview.
Nothing in an outline shows reach, so reach gets the heavier marks: the accent, a "Governs…" label,
an interaction table, a reach strip, stubs in every unit it reaches, and — at 3+ headings — a place
in the Foundations list. Niche points and exceptions hang quietly under the rule they qualify. A rule
with wide reach stays where it naturally belongs; moving it is gated, once (B8).

Both measures are counted on `Technical_Outline.html` and carried into `Theatre.html` unchanged
(A14), and re-scored guide-wide every run because the guide only grows. The Reach questions
on the page are the same procedures the skill measured with, so Luke can repeat the measurement;
breadth shows only as the Contains overview (D3). Measures, bank and tiers: `reference/breadth-and-reach.md`. Shading: D11–D15.

## 🔍 DIAGNOSTICS — the spine

Everything else in a heading describes; a diagnostic *decides*. Each is a single-test
question with a clear answer (yes or no, or a named answer such as which word, which form or which class) that Luke can apply by eye and that is operational enough for a parser (C10). Every diagnostic is
written twice: drafted at STEP 5, then tested against a positive span and its nearest miss at STEP 5B,
because a question drafted while explaining a rule tends to restate the rule instead of testing for
it. Criteria: C10–C16, A4, D3, D8.

## 🧱 BATCHES — work and report in batches until complete

When the pending set is bigger than one batch — always on the first build, and on any large later
paste — the skill does not take it all in one pass. It works through it **batch by batch**, running
STEP 1–8 on each batch and reporting at the end of each (STEP 8B), until every heading in
`Original_Content.md` is rendered. The reason: STEP 3's gate is the real bottleneck. One gate over
the whole paste is too long to rule on carefully. A gate over one batch is short enough.

- **Pending** = headings in `Original_Content.md` with no rendered counterpart yet (NEW), plus any
  CHANGED ones.
- **Batch size:** about 3–6 headings on ONE coherent topic. Never split a heading across batches.
- **Batch order:** foundations first — the headings most other material will depend on (word
  classes, the basic clause), judged by likely reach (E6). Within that, `Original_Content.md` order.
  Building foundations first means later batches build on settled rules, so fewer B8 home moves
  surface late.
- **The batch plan** (which headings, in what order) is shown at the FIRST batch's gate for Luke to
  see and reorder. It is an order of WORK, not of the page: the rendered skeleton always follows
  `Original_Content.md` order (A1, STEP 4). Reordering the plan is not a restructure.
- **Pending headings are not rendered.** Until its batch runs, a heading appears in neither guide.
  An E5 link or reach stub pointing at one is held back and added when that batch renders it.
  Reach (STEP 5D) is scored over the rendered guide only, so a settled heading's tier can rise in a
  later batch. That is an A13 allowance, and the batch report names it.
- **Each batch is a complete run.** It has its own gate, its own render and its own STEP 8. The guides
  on disk are valid and finished after every batch, only shorter. Stopping mid-build loses nothing:
  the next session carries on from the pending set (A13 tells what is already done).
- **Carry straight on.** After a batch's report, start the next batch at once (STEP 1–2) and show
  its gate in the same message as the report. Stop only when the pending set is empty, or when Luke
  says stop.
- **A small paste** (one batch or less) runs as a single pass. There is no batch plan and no batch
  numbering, but the STEP 8B report still runs.

## 👁️ LIVE RENDER — Luke watches the guides as they are written

Luke's standing exception (2026-09-26): he views `Technical_Outline.html` and `Theatre.html`
themselves as content is generated — two separate files, formatted HTML, in the permanent store —
even though it means re-syncing them after every stage.

- **Every subagent return is saved at once** to `Memory/Long-Term/Grammar/_build/drafts/<slug>.json`
  (authors) or `checks/<slug>.json` (checkers). Nothing lives only in the conversation.
- **After every stage the boss re-renders both guides** from those files (`_build/render.py`), plus the
  Theatre dressing (`_build/dressing.json`) and the STEP 5D reach scores (`_build/reach.json`).
- **Until STEP 8 passes** each guide shows a DRAFT banner, reloads itself every 10 s, and marks every
  open gate item, unchecked heading and unsourced line in yellow (B1). STEP 8's final render drops
  the banner and the reload.
- The prior guides are still snapshotted to `prior/` at STEP 0, so any batch can be rolled back.
- **The guides are only ever what `render.py` makes from the run files.** A format change goes into
  `render.py` (and the drafts, if the content changes), then re-renders; it is never patched into
  the HTML alone. Before a change is done, a fresh render must equal the guides on disk apart from
  that change. (2026-09-26: five one-off HTML edits had left `render.py` behind, so a re-render
  silently undid the glossary, NOTE and Breadth rulings; it was brought back in line.)

## 🔁 REVISION MODE — redoing something already rendered

The skill has two lives: the **first build** (batches, above) and a much longer **revision** life,
where Luke asks for particular things to be regenerated and re-verified. A redo is not a CHANGE: its
source in `Original_Content.md` is untouched, so its hash still matches and A13 would carry it
forward unchanged. Revision mode is the route that lets it be worked anyway.

**First, which route?** If what Luke wants is a change to HIS content (his wording, his rule, his
example), the right place is `Original_Content.md`. Offer to make the edit (it is his text, so it is
a gated correction). Once edited, the heading is CHANGED and takes the normal path. Everything else
(how the skill rendered it, filled it, dressed it or tested it) is a REDO.

**The rule: regenerate the smallest unit; re-verify the unit, its theatre twin, and its reach set.**
Reach is what makes a redo safe. A rule reached from elsewhere is described in stubs and interaction
rows in other units, so changing it without refreshing those leaves the guide contradicting itself.

| Unit Luke names | Regenerate | Re-verify | Knock-on refreshed |
| :--- | :--- | :--- | :--- |
| Concept (heading) | STEP 2, 5–7 for it | 5B, 5C, 7B, 8 | reach set (stubs, interaction rows), Theatre twin |
| Section / sub-subsection | STEP 5 for it (E1/E2 re-run) | 5B for its diagnostics, 5C | Theatre twin section |
| Diagnostic question | draft + STEP 5B | 5B, A4, D8 | both guides and both indexes |
| Rule definition / call-out | STEP 5 for the rule | 5C, E6 re-score | its stubs and interaction rows elsewhere |
| Example (plain or memorable) | that element | 5C; B5 quote verification for a memorable one | Theatre twin |
| Table / box diagram | that element (D9 / E4) | 5C, A7 | Theatre twin (nesting and words identical) |
| Theatre dressing only | STEP 7 for that heading | 7B metaphor lane | none in Technical_Outline.html |
| A mapping row | a gated row amendment (E class) | 7B on every heading using the row | every Theatre heading using that row |
| The frame / meaning principle | a skill change, not a redo | — | everything: treat as a rebuild, run in 🧱 BATCHES |

**Discipline**

- **Resolve the target first.** Name the exact unit (slug + element) back to Luke before working. A
  vague target ("the verb stuff") is resolved by asking, never by guessing wide.
- **Get the reason.** If Luke did not say what was wrong, ask. A bare redo tends to reproduce the
  same thing. The reason is saved in `Revisions.table.md` (B9) and is binding on every later run.
- **His instruction is the accept, and only for itself.** Whatever he asked for is applied without
  re-gating. Anything the redo turns up beyond that (a new rule, a correction to his text, a
  restructure, a new mapping) goes to the gate as usual (B2), and B4 still suppresses rejected
  items.
- **Nothing else moves.** Units outside the unit + twin + reach set are carried forward under A13.
- **Show before and after.** The STEP 8B report shows the unit as it was and as it now is, and lists
  every knock-on unit refreshed.
- **Several redos at once** are grouped, and batched if they are many (🧱 BATCHES). Redos that share
  a reach set run in the same batch so the set is refreshed once.

```
REVISION PATH  (replaces STEP 1–3 for a redo; STEP 4 onward as normal, scoped to the unit)
  R1  RESOLVE the unit (slug + element); confirm it with Luke if at all unclear
  R2  ROUTE: his content ⇒ offer the Original_Content.md edit (gated) → CHANGED path; else REDO
  R3  REASON: ask if not given; APPEND to Revisions.table.md —
        date · slug · element · what Luke asked · why · ruled by
  R4  MARK the unit REDO for this run (A13); DERIVE its twin and reach set from data-reach
  R5  REGENERATE per the table, honouring every Revisions.table.md row for that slug (B9)
  R6  anything beyond his instruction ⇒ STEP 3 gate (B2)
  →   STEP 5B/5C/5D/6/7/7B/8 scoped to unit + twin + reach set; STEP 8B with before/after
```

---

## 🛠️ VERB

```
// EXECUTION_START

STEP 0 — LOAD
  READ reference/criteria.md, reference/meaning-first.md, reference/sources.md,
       reference/breadth-and-reach.md
  READ Theatre_Mappings.table.md, Rejected_Proposals.table.md, Revisions.table.md (if present)
  READ the prior Technical_Outline.html's per-heading data-source-hash, data-flags,
       data-breadth, data-reach and data-home-ruled                                       // A13
  LOAD !SimpleEnglish (pragmatic mode), !HouseStyle; reference/fleet.md unless running single-agent
  SNAPSHOT for STEP 8, into Memory/Long-Term/Grammar/_run/:
      prior/ ← both current guides (A13 carry-forward diff)
      rows   ← `python3 validate.py rows` (B3, B9 counts before the run)
  HOLD the TWO LANES test in view for every act from here on

STEP 1 — INGEST & FORMAT Original_Content.md            // C28
  SET raw = the FULL current content — permanent and ever-growing; a new paste is new heading(s)
    alongside everything already approved
  IF raw is empty THEN stop and ask Luke to paste — render nothing
  CLEAN mechanical artifacts; APPLY the style markers to what is already there:
      **bold** key terms on first use · leading `*` on a line that reads as a rule ·
      leading `>` on a line that reads as a diagnostic · a quote-block around a full example
    genuinely unsure whether a line qualifies ⇒ ASK
  SAVE Luke's raw paste to Memory/Long-Term/Grammar/_run/paste.md BEFORE formatting (C28)
  HASH each heading's source block with `python3 validate.py hashes` — never by hand (A13) —
    and compare with the prior guide:
      NEW        — no heading with this slug
      CHANGED    — slug present, hash differs
      UNCHANGED  — hash matches
    SET new_or_changed = NEW ∪ CHANGED ∪ REDO; everything else is carried forward
      (REDO = units Luke named for rework — 🔁 REVISION MODE; only the unit, its twin and its
       reach set are reworked, not the whole heading unless the heading is the unit)
  IF new_or_changed is bigger than one batch THEN                          // 🧱 BATCHES
    BUILD (first batch) or RELOAD (later batch) the batch plan
    NARROW new_or_changed to the CURRENT batch; the rest stay pending, unrendered
    Style-marker ASKs cover the current batch only
  EXTRACT any theatre mapping Luke states in new_or_changed text that is not already a row  // C21

STEP 2 — RESEARCH, VERIFY, AND BUILD THE PROPOSAL SET      (autonomous; new_or_changed only)
  DERIVE draft_skeleton WITH EXACT heading text — one heading = one topic; a paste bundling
    several structures ⇒ PROPOSE the split, never split alone
  FOR EACH heading IN new_or_changed:
    RESEARCH and FACT-CHECK against reference/sources.md, in its precedence
    FIND and VERIFY candidate quotations, per sources.md                                          // B5
    LOOK UP each term this heading adds to the Glossary appendix (D2) in the VCAA glossary;
      record its term where it defines the same concept or Luke has ruled a near match equal,
      nothing where it does not — a label
      only, never a fact or a reason                                       // D16, sources.md
    CHECK the mapping table reaches it; if not, draft the extension a proposal would need  // C29
    SETTLE its axis (E1 Q0): inherit an ancestor's choice, else read its own notes; neither ⇒
      the grid test drafts a class C proposal. Never re-test an inherited axis             // E1
  PRE-SCORE breadth and reach (E7, E6) across the WHOLE guide with the new material in draft —
    new headings can raise the reach of settled rules. FOR EACH rule truly about a shared parent,
    and not already ruled on this reach set (data-home-ruled), draft a move              // B8
  CHECK every candidate against Rejected_Proposals.table.md               // B4
  BUILD proposal_set, each item numbered and separately rulable:
      (A) NEW HEADINGS · (B) CORRECTIONS (his text, the fix, the source) · (C) RESTRUCTURES
          (including B8 home moves, each with its reach set, and E1 axis proposals) ·
      (D) SIGNIFICANT ADDS · (E) NEW MAPPINGS (stated by Luke in the paste, or proposed extensions)
  ASSERT nothing in proposal_set is applied; routine fills are NOT in it

STEP 3 — GATE                                                         ⛔ HARD STOP
  SHOW Luke in one pass: the formatted Original_Content.md (new/changed part marked), proposal_set
    grouped A–E, and what autonomous verification found
  AWAIT his confirmation of the formatting AND a ruling on every item; revise and re-show on request
  ON accept ⇒ apply at STEP 4/5; an accepted (E) item is appended to Theatre_Mappings.table.md;
    an accepted or rejected B8 move is recorded in data-home-ruled with its reach set; an axis
    ruling is recorded as data-axis-by="Luke" and passes down its branch (E1 Q0)
  ON reject ⇒ B3, then drop. A rejected correction leaves his wording standing, unremarked
  ASSERT B1

STEP 4 — LOCK THE SKELETON
  SET skeleton = carried-forward headings + approved new_or_changed headings, in
    Original_Content.md's current order                                    // A1, A2
  DERIVE tags for new_or_changed (open vocabulary: Syntax/Morphology, Clause/Phrase, word class);
    carry the rest forward                                                 // A3

STEP 5 — FILL, THROUGH THE FRAME        (new_or_changed only; routine fills only)
  FOR EACH heading:
    RUN E1 (Q1–Q2 only where the axis is form-function); FOR EACH section RUN E2
      WRITE THE DIAGNOSTICS FIRST                                          // C10, C12–C14, C16
      ENSURE the section has 1+ rule; at heading level a plain example, a memorable example,
        and a table if D9 warrants
      FILL gaps from STEP 2 research — IF a fill would add a rule/exception/distinction he did
        not state THEN STOP and return to STEP 3 (B2)
      RUN E3 per approved point
      FOR EACH RULE: DEFINITION (C1–C6, C27), then KEY CALL-OUT (C7–C9)
    memorable example = a quotation verified at STEP 2 only
    RUN E4 where the tags call for it (C20); RUN E5 against the locked skeleton
    RUN E7 on the heading and E6 on each rule, using the question bank; FOR EACH reached unit
      keep the concrete phrase and the direction (C35, C36)
    WRITE the Reach questions that apply, instantiated from the bank (C34); no Breadth questions (D3)

STEP 5B — DISCRIMINATION TEST        (every new diagnostic, once over the finished set)
  FOR EACH: name the feature; BUILD positive and nearest miss (C13); ANSWER each using only what
    the question literally asks, in whatever form of answer it calls for; RULE ON C10–C12
  Failed twice after rewriting ⇒ FLAG and log (B3)
  KEEP the positive span — it is rendered beside the question

STEP 5C — ACCURACY REVIEW              (every new_or_changed heading)
  RULE ON C17 (and C8, C19, C20, C35, C38, C39 within it); ROUTE each finding per C17
  ASSERT every heading cleared ELSE do not render

STEP 5D — GUIDE-WIDE RE-SCORE          (the WHOLE guide, every run)
  RE-RUN E7 and E6 over every heading and rule, settled ones included, against the finished content
  SET each unit's breadth and reach tier; BUILD the Foundations list, Contains overviews,
    interaction tables, strips and stubs (D11–D15)
  IF a move not ruled on this reach set surfaces here THEN return to STEP 3 (B2, B8) — never move
    alone
  A tier change on an UNCHANGED heading is an A13 allowance, not a CHANGE

STEP 6 — RENDER Technical_Outline.html
  COPY each UNCHANGED heading's block from the prior file (A13)
  RENDER the MEANING PRINCIPLE once, near the top (A6), then the Foundations list (D14)
  APPLY STEP 5D's breadth/reach marks to EVERY heading, carried-forward ones included (A13)
  FOR EACH new_or_changed heading (anchor = slug; data-source-hash; data-flags if any;
    data-breadth; data-axis, data-axis-from, data-axis-by; data-reach on each rule):
    tag chips (D7) + Contains label and breadth shading (D11) → Contains overview if wide
    (D14) → per section: sub-heading if E1 ≠ omitted → general rules/notes, then
    sub-subsections → each rule as one definition paragraph, then its `*` call-out, its reach
    highlight and label (D12), and for spanning/broad its interaction table, strip and Reach block
    (D12, C34) → niche points indented beneath the rule they qualify (D13) → stubs for rules homed
    elsewhere (D15) → NOTEs →
    the `>` diagnostics block with the 5B positive span shown applied (D3, C15) → worked
    examples, each example and its worked version in one box (D4, D1) → box diagram(s) (E4) → table (D9) → E5 link at its dependency point
  RENDER the Glossary appendix (D2) for the WHOLE file, alphabetical, each entry followed by its
    VCAA term where STEP 2 found one (D16); LINK the first use of each glossed term per prose paragraph to its entry;
    RENDER the diagnostic index, with its Reach group (D8)
  FORMAT: one self-contained HTML file, !HouseStyle tokens inlined, neutral for breadth and the one
    accent for reach (D11–D15), print-aware (A8)
  EMIT every hook in reference/markup.md — a missing hook is a failed check, not a style choice

STEP 7 — RENDER Theatre.html
  COPY each UNCHANGED heading's block from the prior file (A13)
  FOR EACH new_or_changed heading, identical skeleton, anchors, tags, sections, diagnostics word
    for word, examples, notes, diagram nesting and link targets (GROUP A):
    DRESS the prose using Theatre_Mappings.table.md rows only (C21, C30) — the metaphor WRAPS
      the technical description; it never replaces, omits or renames a technical term
    re-phrase each call-out through the metaphor, same claim (C8); glyphs per D6
  EMIT the same markup.md hooks (glyphs are Theatre's only; no VCAA)
  CARRY every breadth/reach measure and mark across unchanged (A14); dress only the "what it does
    there" wording and stub wording, same claim
  RENDER the dressed MEANING PRINCIPLE (A6), the same Foundations list (D14), Glossary appendix for this
    file with its prose links (D2; no VCAA terms — D16), the same index (D8)

STEP 7B — TRANSMISSION REVIEW
  DEFAULT (every run) — C33 metaphor lane:
    FOR EACH new_or_changed heading IN Theatre.html:
      CALL !ConceptFidelity, METAPHOR LANE ONLY, N = 1 blind reader
        ground = the same heading in Technical_Outline.html + reference/meaning-first.md
      a LEAK (true of the theatre, false of the grammar) ⇒ block it in the prose or drop the
        mapping use; a leak inherent in a table row ⇒ propose amending the row at the gate
  FULL REVIEW (only when Luke asks):
    FOR EACH new_or_changed heading IN BOTH guides:
      BUILD the spec from sources, frame and skeleton — never from the rendered heading
      CALL !Comprehension (C32) and !ConceptFidelity all modes (C33) IN JOINT MODE — one reader
        set serves both, per GeneralPurposeSkills/!Comprehension/reference/cold-reader-protocol.md
        §5: freeze the spec and the ground first, then take each reader through the stages in order
  READER DISCIPLINE: a clean-context subagent that did no STEP 2/5 work on that heading, sees
    one artefact and nothing else
  ROUTE findings per C17. A heading failing the same finding twice is FLAGGED, not re-cycled

STEP 8 — VALIDATE
  RUN `python3 validate.py check --prior Memory/Long-Term/Grammar/_run/prior
        --paste Memory/Long-Term/Grammar/_run/paste.md --redo <REDO slugs>
        --rows-before <STEP 0 rows> --expect rej=<rejections this run>,rev=<redos this run>`
    Its verdict IS the ruling on the criteria in markup.md's "Script coverage"; exit 1 = STOP,
    exit 2 = fix and re-run. Its open flags and pending list feed STEP 8B
  RULE BY JUDGEMENT on every other criterion in GROUPS A–D (reference/criteria.md)
  SCOPE:
    WHOLE FILE, every run — GROUP A and B entire; C25, C26, C28, C29, C30, C35, C36; D2, D6, D8,
      D10, D11–D16 (a new heading can break these retroactively)
    NEW/CHANGED only — every other GROUP C and D criterion (A13 shows the rest still hold)
  A GROUP A or B failure STOPS the run. A GROUP C or D failure is fixed and re-ruled.
  REPORT every open flag (all data-flags, old and new) to Luke — never bury them

STEP 8B — BATCH REPORT                                  (every run; !PlainEnglish four-part shape)
  REPORT to Luke:
    Next Action — open flags needing his ruling; the next batch's gate (shown in the same message)
    Explanation — what this batch rendered; proposals accepted / rejected by class A–E; what the
      transmission review (7B) caught; any settled heading whose breadth/reach tier changed, and why
    Context — progress table: batch N of M, headings done / pending, the remaining batch plan
  ASSERT the report is sent before the next batch's STEP 1 output is shown

STEP 9 — REGENERATION
  Pending set not empty ⇒ carry straight on: the next batch, STEP 1–8B (🧱 BATCHES).
  New or edited paste ⇒ REPEAT STEP 1–8B, batched if the pending set is bigger than one batch.
  Both guides are regenerated as whole files; only new or changed headings are re-researched and
  re-gated.
// EXECUTION_END
```

## 🐝 FLEET MODE — a boss agent and a fleet of subagents (the default)

Changes WHO does each step, never WHAT it requires. Roles, models, dispatch and the exact JSON each
subagent returns: `reference/fleet.md`.

```
  BOSS (session model, Opus) ── batch plan · gate · skeleton · reconcile · 5D · render · every write
    per heading:
     RESEARCHER (sonnet) ── STEP 2 ──▶ proposal slice, verified quotes        ⛔ gate
     AUTHOR     (opus)   ── STEP 5 ──▶ filled heading + candidate reach units
     CHECKER    (opus)   ── 5B + 5C ─▶ discrimination + accuracy; never the author
     READER     (sonnet) ── 7B ─────▶ one artefact, clean context; never author or checker
    SCRIPT (validate.py) ── hashes at STEP 1 · mechanical ruling at STEP 8
```

- **Boss only:** STEP 0, 1, 3 (the gate — the boss is the only voice Luke hears), 4, 5D, 6, 7, 8,
  8B, 9, the batch plan, revision R1–R4, and every file write (B7).
- **Checker at least as strong as the author.** A weaker checker passes what it cannot see.
- **AUTHOR ⇄ CHECKER twice at most**, then FLAG the heading and report it.
- **Single-agent fallback** (no subagents available): the boss plays every role, and every heading
  it both wrote and checked is FLAGGED "self-checked" in `data-flags` and named at STEP 8B.
- **Boss reconciles before rendering:** D2 glossary completeness (every term used is in the appendix), tag near-synonyms (A3),
  proposed mappings that collide with each other or with the table (C30), and the STEP 5D re-score —
  reach crosses headings, so no single subagent can measure it. Subagents return each rule's
  candidate reached units with phrases; the boss merges and tiers them.
- **Model tier:** per `reference/fleet.md`. `mechanical` criteria are the script's where it covers
  them (`reference/markup.md`), never a model's.

## ✅ OUTPUT

In `Memory/Long-Term/Grammar/`: `Original_Content.md` (formatted, nothing more),
`Technical_Outline.html` and `Theatre.html`. Each is finished when STEP 8 passes.

Also maintained: `Theatre_Mappings.table.md` (the saved metaphor, gated rows only) and
`Rejected_Proposals.table.md` (append-only, B3/B4).

## ⚠️ ERROR PATHS

*Outside failures only. A criterion's own failure is handled by its `→` test and STEP 8.*

```
CATCH [Original_Content.md empty]              ➔ ask Luke to paste; render nothing
CATCH [content too sparse for a heading]       ➔ flag it, ask Luke, never invent filler
CATCH [no web access for research]             ➔ fill from existing knowledge, flag every
                                                  unresearched heading, tell Luke
CATCH [one source unreachable]                 ➔ per sources.md: try the other read route (browser, or curl for archive.org), then carry
                                                  on without it; name it ONCE in the run summary,
                                                  never flag every heading
CATCH [VCAA glossary unreadable]               ➔ show no VCAA terms this run and say so in the run
                                                  summary; never guess a term
CATCH [mapping table empty and the paste       ➔ ask Luke for the metaphor's core mappings at
       states no metaphor]                        the gate; render Technical_Outline.html only
                                                  and leave Theatre.html untouched until he does
CATCH [prior guide missing or a heading lacks  ➔ treat that heading (or all) as NEW; say so at
       data-source-hash]                          the gate, since it re-gates settled content
CATCH [validate.py missing or errors]          ➔ fail closed: rule the script's criteria by hand,
                                                  flag the run "unscripted", tell Luke
CATCH [a subagent return does not parse]       ➔ re-request once, then flag that heading
CATCH [no clean-context subagent for STEP 7B]  ➔ 7B cannot run: flag every heading unreviewed,
                                                  tell Luke; never self-read in its place
CATCH [Luke does not rule at the gate]         ➔ fail closed (B1): render nothing, keep the
                                                  proposal set for the next session
CATCH [redo target ambiguous]                  ➔ ask Luke which unit; never widen the redo
                                                  on a guess
CATCH [Revisions.table.md missing on a redo]   ➔ create it with its header row, then append
CATCH [a redo would contradict a prior        ➔ show both to Luke at the gate; the newer
       Revisions.table.md row]                    ruling needs his explicit accept (B9)
CATCH [session ends mid-build, batches left]   ➔ nothing lost: every finished batch is on disk;
                                                  the next run rebuilds the pending set from A13
                                                  and resumes the batch plan
CATCH [a sub-concept passes neither B-kind nor ➔ leave it uncounted, flag it (data-flags), take
       B-part, and is no clear narrow case]       it to the gate if it looks misplaced (B6)
```
