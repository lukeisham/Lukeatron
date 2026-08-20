# Spike Projects

Date: 2026-08-17 (rev 3)
Status: 1 spike defined (active), 3 candidates held.

Candidate spike projects — research tasks that answer a technical question
(feasibility, ergonomics, performance). The answer is the deliverable; the
code may be discarded. Score by novelty and risk; timebox every spike.

| # | Spike | Question it answers | Risk (1–5) | Novelty (1–5) | Score |
|---|---|---|---|---|---|
| 1 | [CurriculumPreparation](CurriculumPreparation/) | Can a personal, offline, SVG-first toolkit carry all four parts — curriculum map with big-idea list, lesson plans, marking matrices, crib sheet — ingested from plain text, cross-linked, image-capable, printable to A4 in the right orientation, built from nothing but Python and JS? | 4 | 5 | **23** |
| 2 | *(held)* CurriculumFeeds | Are there stable machine-readable curriculum feeds worth polling, rather than plain-text pastes? **Largely superseded** — Luke settled the ingest mechanism, so this is now an optimisation, not a question | 2 | 3 | 13 |
| 3 | *(held)* MultiStudentScale | Does the unit-folder design hold up at whole-class scale (30 students × a unit of lessons × pasted images) in a single browser profile? | 3 | 2 | 12 |
| 4 | *(held)* ProfileLibrary | Once two or three bespoke curriculum profiles exist, is the declarative mapping expressive enough — or do real curricula need executable adapters after all? | 3 | 3 | 15 |

Scoring: priority = 3 × novelty + 2 × risk. One folder per spike under
`_Spikes/<Name>/` (project spec, prerequisites spec, arch decisions,
supporting specs, `_PLAN.md`). Completed spikes move to `_Done/`.

**Candidates 2, 3 and 4 are deliberately held.** All are only worth running if
spike 1 returns go.

- **#2 dropped in priority at rev 3.** Luke closing gate G-1 (plain text →
  Python digest) turned "is there a machine-readable feed?" from a blocker into
  a nice-to-have. It stays on the list only because a real feed would raise
  ingest accuracy for free.
- **#3 rose slightly**, because rev 3 added image files to the unit folder —
  a class's worth of pasted screenshots is a different scale question than a
  class's worth of JSON rows.
- **#4** cannot be answered until bespoke profiles beyond the first exist, so
  it belongs after wave 2, not before.
