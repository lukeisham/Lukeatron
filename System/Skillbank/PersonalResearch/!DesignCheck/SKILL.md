---
name: "!DesignCheck"
description: "Downstream check of a rendered surface against the !HouseStyle default, through one of four lenses: visual (hierarchy, spacing, colour, type), usability (Krug and Nielsen heuristics), theory (Norman's affordances and mappings, the why behind confusion) or interaction (Saffer's microinteraction structure). Never an alternative to !HouseStyle."
type: Skill
status: Active
core_function: Synthesize
intent: "Score a UI against !HouseStyle through one lens at a time, so design quality is checkable the same way twice."
version: 1.0.0
source: "Lenses adapted from wondelai/skills (MIT license) — github.com/wondelai/skills; each lens file names its own source."
calibration:
  context: [PersonalResearch]
  level: Extended
  scope: Global
memory_footprint:
  read: []
  write: [System/Sandbox]
---

## ⚡ TRIGGER
Any design-quality question about a rendered surface: "my UI looks off", "fix the design",
"is this easy to use", "why is this confusing", "the interface feels dead", "polish the UI".
Also a consult step inside `!AppDevelopment` Phases 1-4 and at `!HouseStyle` STEP 8 on a
substantial surface.

## 🛠️ LOGIC

// EXECUTION_START

**STEP 0 — !HouseStyle first.** This skill checks a surface against the house default; it never
replaces it. If `!HouseStyle` has not classified the surface (EXEMPT / SUBORDINATE / UNCLASSIFIED),
run its tests first. An EXEMPT surface gets no design check.

**STEP 1 — Pick the lens.** Read only the lens file the question needs.

| Question | Lens | File | Scope | Score |
|---|---|---|---|---|
| Does it *look* right? Hierarchy, spacing, colour, type, depth, layout | visual | `reference/visual.md` | a screen or component | 8-row diagnostic, round(satisfied/8 × 10) |
| Can people *use* it? Navigation, forms, findability, dark patterns | usability | `reference/usability.md` | a real, working interface (never a token sheet) | each issue 0-4; whole review /10 |
| *Why* do people get it wrong? Affordance, signifier, mapping, feedback, slips vs mistakes | theory | `reference/theory.md` | a confusing control or flow | diagnosis, no score |
| Does one control *feel* alive? Trigger, rules, feedback, loops and modes | interaction | `reference/interaction.md` | one contained interaction | /10 |

  IF the question spans two lenses ➔ run them one after the other, visual before usability,
  theory before interaction. Never load all four at once.
  IF unsure ➔ ask Luke which question he is asking; do not guess a lens.

**STEP 2 — Run the lens** exactly as its file says, and report in that lens's output format.

**STEP 3 — Fixes.** A fix must use `!HouseStyle` tokens and its flourish budget; a fix that would
break the house default is reported as a conflict for Luke, not applied.

// EXECUTION_END

## ✅ OUTPUT
The chosen lens (or lenses), its score or diagnosis, and fixes expressed in house tokens.
Log: `python3 System/Tools/skilllog/skilllog.py write '!DesignCheck' SUCCESS "lens=<visual|usability|theory|interaction> score=<n/10|diagnosis> surface=<path>"`
