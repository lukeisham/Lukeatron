---
type: reference
title: "Psychometric Test Formats — Categories, Real-World Tests, and Item Conventions"
description: "The five psychometric reasoning categories and the authentic test formats behind them (UCAT, LSAT, GRE, Watson-Glaser, Raven's, SHL, ACER, GAMSAT, MCAT, TSA, LNAT, GMAT, STAT, Casper), with item formats, answer conventions, and abstract-reasoning rule families. Formats and sources only — no commercial test items reproduced."
---

# Psychometric Test Formats — Categories, Real-World Tests, and Item Conventions

> **Target store:** `Logic` — this is a reference on formal and applied reasoning-test structure,
> which sits with Logic's remit (syllogisms, deduction, argument evaluation) more naturally than any
> other store.

## Why this is here

Sourced from the Phase 1 research for the Psychometric Generator widget
(`System/Widgets/Generator/Psychometric/`): the seed research
(`_research/seed/psychometrics.md`) and the 23-file `samples/` reference set built against real
test formats (`System/Widgets/Generator/Psychometric/samples/`). This keeper preserves the durable
knowledge — the five-category taxonomy, the authentic formats and conventions, and the
abstract-reasoning rule-family analysis — independent of the widget's build artefacts.

## Copyright discipline — read this first

**This document describes test *formats* — structure, timing, answer conventions, item types — and
cites the organisations and guides that define them. It does not reproduce actual questions from any
commercial test.** The illustrative items referenced from `Psychometric/samples/` (23 files covering
UCAT, LSAT, GRE, Watson-Glaser, Raven's, SHL, GAMSAT, MCAT, TSA, LNAT, GMAT, STAT, and Casper) are
**original compositions Luke's system wrote to match each format** — they are not copied or adapted
from the real, copyrighted test banks, and should never be mistaken for genuine exam content. Any
future use of this reference for building new test-format material must maintain the same
discipline: format and structure may be learned and imitated; actual proprietary items may not be
reproduced.

## The five categories

### 1. Situational Judgement Tests (SJTs)
Workplace or professional scenarios with no single "correct" answer — responses are scored against
organisational values and competencies (integrity, empathy, professionalism, risk prioritisation).

**Format:** Rank a set of responses from most to least appropriate, or rate each on a numeric scale
(commonly 1–5). Scoring is typically **partial credit** — Kendall's-tau-style rank correlation, or
tolerance of ±1 point per rating — because there is no single binary-correct answer.

**Real-world tests:**
- **UCAT** (UK) / **UCAT ANZ** (Australia/NZ) — Situational Judgement Test subtest: 69 scenarios,
  ~26 minutes, 4 response options per scenario, rate-or-rank format, partial-credit scoring. Medical/
  dental/clinical education admissions.
- **Casper** (Acuity Insights, US) — departs from the multiple-choice convention entirely: a text or
  video scenario followed by 3 open-ended, free-text constructed-response questions, scored 1–9 by
  human raters across competencies (professionalism, empathy, communication, ethics, problem-solving).
  Used for medical, dental, and veterinary admissions.

### 2. Verbal Critical Reasoning
Dense argumentative or expository passages followed by questions testing comprehension, inference,
assumption-identification, and detection of logical flaws.

**Format:** Passage + one or more multiple-choice questions (commonly A–D or A–E), or — distinctively
in UCAT-family tests — a True / False / Can't Tell classification of statements against the passage.
Binary scoring, no partial credit; passing thresholds in the ~75% range are typical benchmarks cited
in test-prep guidance.

**Real-world tests:**
- **UCAT (UK) / UCAT ANZ** — Verbal Reasoning subtest: 11 passages (200–400 words), 44 questions,
  21 minutes; True/False/Can't Tell per statement.
- **LSAT** — Logical Reasoning section (US law admissions): two scored sections, ~24–26 questions
  each, 35 minutes/section; short (50–120 word) argumentative stimulus + single multiple-choice
  question. Question types: weaken, strengthen, necessary/sufficient assumption, flaw, method of
  reasoning, main conclusion, parallel reasoning, inference, point at issue, principle, paradox,
  role of statement, evaluate. *Note: the Analytical Reasoning ("Logic Games") section was removed
  from the LSAT in August 2024.*
- **Watson-Glaser Critical Thinking Appraisal** (US — law firms, business, graduate recruitment) —
  five sections: Inference, Recognition of Assumptions, Deduction, Interpretation, Evaluation of
  Arguments; 40 items, ~30 minutes; answer conventions vary by section (True/Probably
  True/Insufficient Data/Probably False/False for Inference; Assumption Made/Not Made; Strong/Weak
  Argument for Evaluation).
- **MCAT — CARS** (Critical Analysis and Reasoning Skills, US medical admissions) — 9 passages
  (500–600 words), 53 questions, 90 minutes; drawn from humanities and social sciences (philosophy,
  ethics, history, political science, literature, art history); single-answer A–D.
- **GAMSAT Section 1** (Reasoning in Humanities and Social Sciences, Australian medical admissions) —
  62 questions, 100 minutes; broader stimulus variety than MCAT CARS, including poetry, cartoons,
  diagrams, and tables alongside prose.
- **LNAT** (National Admissions Test for Law, UK) — Section A: 42 multiple-choice questions across
  12 argumentative passages, 95 minutes; single-answer A–E; question types span comprehension,
  interpretation, analysis (assumptions/flaws/structure), synthesis, and deduction.
- **TSA** (Thinking Skills Assessment, UK — Oxford/Cambridge/UCL admissions) — 50 questions, 90
  minutes, split 25 Problem Solving / 25 Critical Thinking; the Critical Thinking half is logically
  similar to LSAT LR but uses shorter stimuli and is designed to be accessible without formal logic
  training.
- **GMAT Focus Edition — Critical Reasoning** (US business admissions) — embedded in the Verbal
  Reasoning section; ~10–13 CR items per exam, ~100-word arguments, single-answer A–E; skews toward
  business/economics/policy content versus LSAT's more abstract argumentation. Question types:
  weaken, strengthen, assumption, inference, evaluate, explain-the-paradox, boldface, complete-the-
  argument.
- **STAT** (Special Tertiary Admissions Test, Australia — mature-age/alternative entry) — Verbal/
  Critical Reasoning component: 35 standalone questions (no shared passages), single-answer A–D.

### 3. Abstract / Diagrammatic / Fluid Reasoning
Non-verbal pattern recognition — matrix completion, figure series, odd-one-out — testing fluid
intelligence independent of language, numbers, or prior knowledge. Also called Inductive Reasoning,
Non-verbal Reasoning, or Figural Reasoning.

**Common subtypes:** odd-one-out/classification; sequence/series completion; matrix completion
(2×2 or, most often, 3×3 grid with one cell missing — the classic Raven's-style format); figural
analogies ("A is to B as C is to ?"); pattern/figure completion (jigsaw-style); operator/processor
decoding (SHL's distinctive variant — abstract symbols that represent transformation rules applied
in sequence to an input figure).

**Format:** Single correct answer from a fixed option set (commonly A–E, or 6–8 numbered options for
Raven's); binary scoring.

**Real-world tests:**
- **Raven's Progressive Matrices** (international) — the archetype: 60 items (Standard) or 36
  (Advanced); untimed or ~40 minutes; used across research, education, and clinical settings
  worldwide; difficulty increases progressively through the test.
- **SHL Diagrammatic / Inductive Reasoning Test** (UK, widely used internationally) — 18–24
  questions, 20–25 minutes, time-pressured; defining feature is the operator/processor decoding
  mechanic described above.
- **WAIS** (Wechsler Adult Intelligence Scale, US) — Matrix Reasoning subtest within the Perceptual/
  Fluid Reasoning index.
- **ACER** products (Australia) — HAST (Higher Ability Selection Test) dedicated Abstract Reasoning
  section; AGAT; APTS Abstract Reasoning; used across selective-school, scholarship, and
  apprenticeship/recruitment testing.
- Other provider batteries with abstract/inductive sections: Cubiks Logiks/Talogy, Talent Q/Korn
  Ferry Aspects Logical, Saville Assessment, Aon/cut-e, Test Partnership, Sova, PI Cognitive
  Assessment (Predictive Index), NNAT (education/gifted identification), Cattell Culture Fair
  Intelligence Test.
- *Note:* UCAT (UK) and UCAT ANZ both **removed** their dedicated Abstract Reasoning subtests in the
  2026 admissions cycle, citing high coachability — a scope change worth remembering if referencing
  current UCAT structure.

**Abstract-reasoning rule families** (from `samples/abstract-reasoning-rule-families.md`) — the
transformation types nearly every item is built from, harder items combining two or three:
1. **Rotation** — fixed angle (commonly 45°/90°/180°/270°), clockwise or anticlockwise.
2. **Reflection/mirroring** — horizontal, vertical, or diagonal flip.
3. **Translation/position change** — element shifts position, often cycling through corners.
4. **Size progression** — systematic increase/decrease or cycling.
5. **Count/number change** — number of shapes/sides/dots/lines follows a simple sequence.
6. **Shading/colour/fill cycling** — e.g. empty → striped → solid, or conditional shading.
7. **Addition/subtraction/overlay** — elements appear/disappear; union, intersection, XOR operations.
8. **Distribution/permutation** — Latin-square-style: each row/column contains exactly one of each
   attribute value.
9. **Shape morphing/replacement** — one shape systematically becomes another.
10. **Combinations & interactions** — multiple rules operating simultaneously, across rows, columns,
    diagonals, or the whole matrix.

Difficulty is levered by: number of simultaneous rules, whether rules interact, visual complexity,
subtlety of change, distractor quality (plausible near-misses satisfying only some rules), and
matrix (2-D consistency) vs. linear sequence (1-D) format.

### 4. Deductive & Analytical Reasoning
Formal logic: syllogisms, necessary vs. sufficient conditions, constraint-satisfaction, multi-step
chained deduction.

**Format:** Premises + single-answer multiple choice (commonly A–E) on validity or entailed
conclusions; binary scoring, no partial credit.

**Real-world tests:**
- **LSAT — Logical Reasoning** (see Category 2; deduction-type questions overlap this category).
- **GMAT Focus Edition — Critical Reasoning** (see Category 2).
- **UCAT (UK) / UCAT ANZ — Decision Making subtest** — the UCAT-family home for this category
  (distinct from the Verbal Reasoning subtest above).
- **TSA — Critical Thinking** (UK, see Category 2) — includes deduction-adjacent items alongside
  argument evaluation.

### 5. Data Interpretation & Quantitative Reasoning
Extracting patterns, computing relationships, and drawing inferences from tables, charts, and raw
data, typically under time pressure.

**Format:** A data set (table/chart) followed by 1–3 questions; single-answer multiple choice, or
free-form numeric entry with a stated tolerance (commonly ±5% for numeric answers, ±2 percentage
points for percentage answers).

**Real-world tests:**
- **GRE — Quantitative Reasoning** (US graduate admissions) — two scored sections, 27 questions
  total, 47 minutes total; mixes Quantitative Comparison, multiple choice (single/multiple answer),
  and Numeric Entry, with an on-screen calculator. Quantitative Comparison (roughly one-third of the
  section) is GRE-distinctive: candidates judge whether Quantity A is greater, Quantity B is
  greater, they're equal, or the relationship cannot be determined (A/B/C/D) — not a numeric answer.
- **UCAT (UK) / UCAT ANZ — Quantitative Reasoning subtest.**
- **MCAT — Chemical & Physical Foundations / data-based statistical reasoning** (US).
- **GAMSAT Section 3** (Reasoning in Biological and Physical Sciences, Australia).
- **STAT Multiple Choice — Quantitative Reasoning component** (Australia) — 35 standalone questions,
  single-answer A–D.

## Answer-convention summary across categories

| Category | Typical answer format | Scoring |
|---|---|---|
| SJTs | Rank (most→least appropriate) or rate (1–5 scale) | Partial credit — rank correlation or ±1 tolerance |
| Verbal Critical Reasoning | Single-answer MC (A–D/E), or True/False/Can't Tell | Binary |
| Abstract/Diagrammatic/Fluid | Single-answer MC from fixed option set | Binary |
| Deductive & Analytical | Single-answer MC (A–E) | Binary |
| Data Interpretation & Quantitative | Single-answer MC, or numeric entry with tolerance | Binary (MC) / tolerance-banded (numeric) |

## Works Cited

**Verification note (2026-08-13).** The companion AI-characteristics document had five of five arXiv
author attributions proven fabricated, so this list was reviewed too. These sources are different in
kind — they are **institutional and organisational references** (exam boards, test publishers,
government assessment bodies), cited at organisation level rather than by named authors, so they do
not carry the fabricated-attribution risk that sank the arXiv citations. They have **not** been
individually re-fetched. Treat any specific URL below as needing a check before it is quoted onward,
and note that admissions-testing URLs in particular move between cycles.

ACER (Australian Council for Educational Research). *HAST — Higher Ability Selection Test.*
acer.org.

Casper / Acuity Insights. "About Casper." *Acuity Insights*, takealtus.com/casper (Acuity Insights
platform documentation).

Graduate Management Admission Council. "GMAT Focus Edition — Verbal Reasoning." *mba.com*,
mba.com/exams/gmat/gmat-focus-edition.

Law School Admission Council. "About the LSAT — Logical Reasoning." *LSAC*, lsac.org/lsat/taking-lsat/lsat-format/logical-reasoning.

MConsultingPrep. "Deductive Reasoning Tests: The Ultimate Guide." *MConsultingPrep*,
mconsultingprep.com/deductive-reasoning-tests-ultimate-guide.

Educational Testing Service. "About the GRE General Test — Quantitative Reasoning." *ETS*,
ets.org/gre/test-takers/general-test/content/quantitative-reasoning.html.

GraduatesFirst. "Critical Reasoning Tests." *GraduatesFirst*,
graduatesfirst.com/psychometrics/critical-reasoning-tests.

JobTestPrep. "Graphs and Tables: Numerical Reasoning Tests." *JobTestPrep*,
jobtestprep.co.uk/graphs-and-tables.

LNAT Consortium. "About the LNAT." *LNAT*, lnat.ac.uk/taking-the-lnat/about-the-test.

Oxford University. "Thinking Skills Assessment (TSA)." *University of Oxford Admissions Testing*,
admissionstesting.ox.ac.uk (or successor Oxford TSA administration page).

Pearson Assessments / SHL. "Diagrammatic and Inductive Reasoning Tests." *SHL*,
shl.com/solutions/products/assessment-and-development/diagrammatic-and-inductive-reasoning/.

Psychometric Success. "Abstract Reasoning Tests." *Psychometric Success*,
psychometric-success.com/aptitude-tests/test-types/abstract-and-diagrammatic.

Raven, John C., and Jean Raven. *Raven's Progressive Matrices and Vocabulary Scales.* Pearson
Assessment, various editions.

TestGorilla. "Situational Judgement Test Guide." *TestGorilla Support Center*,
support.testgorilla.com/hc/en-us/articles/9028585383707.

United States Office of Personnel Management. "Situational Judgement Tests." *OPM — Assessment and
Selection*, opm.gov/policy-data-oversight/assessment-and-selection/other-assessment-methods/situational-judgement-tests/.

Watson, Goodwin, and Edward M. Glaser. *Watson-Glaser Critical Thinking Appraisal.* Pearson TalentLens,
various editions.

Wechsler, David. *Wechsler Adult Intelligence Scale (WAIS).* Pearson Assessment, various editions.

*(GAMSAT, MCAT, STAT, and UCAT/UCAT ANZ official test-structure references — respectively ACER's
GAMSAT information, AAMC's MCAT information, VTAC's STAT information, and UCAT Consortium/Pearson
VUE's UCAT ANZ specifications — were consulted for format detail during the seed research and should
be added here with full URLs when next revised; the seed file
`System/Widgets/Generator/_research/seed/psychometrics.md` lists the five source links used at the
time.)*
