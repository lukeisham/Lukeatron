---
name: "!DesignEverydayThings"
description: "Apply foundational design principles — affordances, signifiers, constraints, feedback, mappings, conceptual models — to explain why something is confusing and fix it. Use when Luke says 'why is this confusing', 'people can't figure out how to use it', 'users keep making mistakes', 'this is unintuitive', or asks about discoverability, mental models, or error prevention. Also fires when reducing feature creep or complexity. Covers the gulfs of execution and evaluation and Norman's human-error taxonomy. For usability scoring, see !UXHeuristics. For visual polish, see !RefactoringUI."
type: Skill
status: Active
core_function: Synthesize
intent: "Diagnose confusion and error at the design-theory level — the gap between what a user wants to do and what the product lets them do or understand — before reaching for a visual or usability fix."
version: 1.0.0
source: "Adapted from wondelai/skills (MIT license), skill 'design-everyday-things', based on Don Norman's 'The Design of Everyday Things' — github.com/wondelai/skills. Surfaced via !Magpie 2026-09-02."
calibration:
  context: [PersonalResearch]
  level: Extended
  scope: Global
memory_footprint:
  read: []
  write: [System/Sandbox]
---

## ⚡ TRIGGER
"why is this confusing", "affordance", "error prevention", "discoverability", "mental model",
"mapping", "users keep making mistakes", "this is unintuitive", "people can't figure out how to
use it".
Also fires as a consult step inside `!AppDevelopment` — Phase 1 (PRD complexity check), Phase 2
(spec/mockup review), and Phase 4 (refactor) — whenever a control or flow is reported confusing.

## 🛠️ LOGIC

// EXECUTION_START

**Core Principle**
Good design is invisible; when something fails, the user blames themselves, but the fault is
almost always the design. Bridge the two gulfs: **Execution** ("how do I do what I want?") and
**Evaluation** ("what happened, did it work?"). Norman's key insight: there is no such thing as
"human error" — only bad design. When someone errs, find the design flaw, not the person's flaw.

**STEP 1 — Walk the seven principles**
  1. **Discoverability** — put a new user in front of it; if they can't figure out what to do in
     10 seconds, it's broken. "The manual explains it" is an admission of failure, not a defense.
  2. **Affordances** — what an object's properties let a user do. What matters is *perceived*
     affordance, not real capability. Flat design erasing perceived affordance (button or label?)
     is the most common digital failure.
  3. **Signifiers** — signals showing *where* and *how* to act (affordances say what you CAN do,
     signifiers say WHERE). Rule: when in doubt, add a signifier — over-communicate rather than
     leave users guessing.
  4. **Mappings** — the relationship between a control and its effect. Natural mapping = spatial
     layout of controls matches the layout of what they control (proximity, cultural convention,
     sequential order).
  5. **Constraints** — limit possible actions to prevent errors: disabled states until valid,
     forced sequence + undo, input validation over free text. Every constraint added is one less
     error the user can make.
  6. **Feedback** — communicate the result of an action back, immediately (0.1s feels
     instantaneous, 1s is a noticeable delay, 10s loses attention). No feedback = "did my click
     register?"
  7. **Conceptual models** — the user's mental model must match the design model; the system
     image (what the product actually communicates) is the only bridge between them. Mismatches
     breed confusion, self-blame, and support calls.

**STEP 2 — Classify any error found**
  **Slips** (right intention, wrong action): action slip, memory lapse, mode error, capture
  error — fixed by separating destructive actions, reminders, visible mode state.
  **Mistakes** (wrong intention, executed correctly): rule-based, knowledge-based, memory lapse
  — fixed by better context, confirmation, and conceptual models.
  Error message checklist: says what went wrong in human language · says how to fix it · doesn't
  blame the user · preserves the user's work · offers an alternative path.

**STEP 3 — Score it**
  2 points per satisfied Quick Diagnostic row (5 rows: discoverability, evaluation, error
  recovery, mapping, constraints).
  Bands: **9-10** = users act without instructions, understand every outcome, recover from any
  error · **5-6** = one gulf or error path is broken · **<=3** = users must consult a manual or
  routinely blame themselves.

**STEP 4 — Run the Quick Diagnostic**
| Question | If No | Action |
|---|---|---|
| Can users figure out what to do? | Poor discoverability | Add signifiers, improve affordances |
| Do users understand what happened? | Gulf of evaluation too wide | Add feedback, show system state |
| Can users recover from errors? | No error tolerance | Add undo, confirmation, clear messages |
| Does the control layout match the output? | Poor mapping | Reorganize controls to match spatial layout |
| Are impossible/irrelevant options hidden? | Missing constraints | Disable, hide, or remove invalid options |

**STEP 5 — Report**
State the score, name which gulf or principle is broken, and give the specific fix — don't
describe the confusion, name its design cause.

// EXECUTION_END

## ✅ OUTPUT
A score out of 10, the design principle actually at fault (not a symptom description), and the
specific fix.

**Common Mistakes**
| Mistake | Why It Fails | Fix |
|---|---|---|
| No signifiers | Users can't find features | Add visual cues for every interactive element |
| No feedback | Users don't know if an action worked | Respond to every action within 0.1s |
| Blaming users | Ignores the design flaw | Look for the design cause of every "user error" |
| Feature creep | Complexity overwhelms | Apply constraints, progressive disclosure |
| Inconsistency | Breaks the conceptual model | Same action = same result everywhere |

**Human-Centered Design loop:** Observation (watch for workarounds, don't ask what people want —
they don't know) → Idea Generation → Prototyping → Testing (5 real users reveal ~85% of
problems) → iterate.

**Validation Check (Self-Test)**
```
VERIFY the fault was named as a specific design principle (affordance/signifier/mapping/
  constraint/feedback/conceptual model), not just "confusing"
VERIFY a numeric score out of 10 was stated with its failing rows named
ELSE ➔ redo STEP 1 before reporting
```

**Further reading:** *The Design of Everyday Things* (Revised & Expanded, 2013) and *Emotional
Design*, both by Don Norman.
