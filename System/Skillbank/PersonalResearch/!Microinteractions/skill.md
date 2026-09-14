---
name: "!Microinteractions"
description: "Design the small details — triggers, rules, feedback, loops and modes — that separate a functional interface from a polished one. Use when Luke mentions a microinteraction, button feedback, loading state, toggle design, animation detail, state transitions, input feedback, 'the interface feels dead', 'make the UI feel responsive', or adding polish before launch. Also fires for form-validation responses, progress indicators, and confirmation dialogs. For overall UI polish, see !RefactoringUI. For affordance design, see !DesignEverydayThings."
type: Skill
status: Active
core_function: Synthesize
intent: "Audit a single contained interaction (a toggle, a save, a loading spinner) against the four-part trigger/rules/feedback/loops structure so 'polish' becomes a checklist, not a mood."
version: 1.0.0
source: "Adapted from wondelai/skills (MIT license), skill 'microinteractions', based on Dan Saffer's 'Microinteractions: Designing with Details' — github.com/wondelai/skills. Surfaced via !Magpie 2026-09-02."
calibration:
  context: [PersonalResearch]
  level: Extended
  scope: Global
memory_footprint:
  read: []
  write: [System/Sandbox]
---

## ⚡ TRIGGER
"microinteraction", "button feedback", "loading state", "toggle design", "animation detail",
"state transitions", "input feedback", "the interface feels dead", "make the UI feel responsive",
"add polish to interactions".
Also fires as a consult step inside `!AppDevelopment` — Phase 3 (build) and Phase 4 (refactor) —
whenever a specific control (not the whole screen) needs a responsiveness/polish pass.

## 🛠️ LOGIC

// EXECUTION_START

**Core Principle**
The difference between a product you tolerate and one you love is almost always in the
microinteractions — the tiny contained moments (a toggle, a password field, pull-to-refresh) users
rarely notice consciously but feel. Every one follows the same four-part structure: a **Trigger**
initiates it, **Rules** determine what happens, **Feedback** shows what is happening, **Loops &
Modes** define its long-term behavior.

**STEP 1 — Walk the four-part structure, plus two cross-cutting concerns**
  1. **Trigger** — manual (tap/click/swipe) or system-initiated (time/location/error). Must
     communicate three things: that it exists, what it does, what state it's in. Pair invisible
     triggers (gestures) with a visible fallback.
  2. **Rules** — the sequence once triggered. Users never see rules directly but feel when they're
     wrong (a toggle that doesn't toggle). Constrain inputs to prevent errors; handle edge cases
     explicitly (zero, max, repeated trigger, interruption).
  3. **Feedback** — communicates the rules. Must be immediate (<100ms for direct manipulation),
     minimal, and scaled to event significance — small action = small feedback, big result = big
     feedback. Visual is primary; audio/haptic are supplementary, never the only channel.
  4. **Loops & Modes** — loops are the meta-rule over time (does it change after the 100th use?);
     open loops repeat until stopped, closed loops run once. Modes fork the same control's
     behavior (edit vs. view) — dangerous, minimize them, make the current mode highly visible.
  5. **Signature moments** (optional, not every interaction needs one) — a microinteraction
     distinctive enough to become part of the product's identity. Functional first, delightful
     second. Removal test: if users wouldn't miss it, it's decoration, not signature.
  6. **Reduce and simplify** — the best microinteraction is barely noticed because it's fast and
     simple. If it needs instructions, it's too complex. Smart defaults over configuration.

**STEP 2 — Score it**
  `score = round(passed / 8 × 10)` over the Quick Diagnostic's 8 rows.
  Bands: **9-10** = deliberate discoverable trigger, visible states, predictable rules, sub-100ms
  scaled feedback, evolves over time, mode-free or mode-visible, learnable without help ·
  **5-6** = works but generic — feedback exists but is uniform, or the trigger lacks distinct
  states · **<=3** = missing feedback, invisible triggers, or hidden modes that break trust.

**STEP 3 — Run the Quick Diagnostic**
| Question | If No | Action |
|---|---|---|
| Is there a clear, discoverable trigger? | Users cannot initiate the interaction | Add a visible control or affordance |
| Does the trigger show its current state? | Users can't tell if it's on, off, or loading | Add distinct visual states for every trigger state |
| Are the rules simple and predictable? | Users are confused by what happened | Simplify rules; match platform conventions |
| Is there immediate feedback? | Users question whether their action worked | Add visual response within 100ms |
| Does feedback match the event's significance? | Small actions feel dramatic, or big results feel trivial | Scale feedback to event importance |
| Does the interaction evolve over time? | Power users still see beginner hints | Add progressive reduction through long loops |
| Is the interaction free of unnecessary modes? | Users perform the wrong action in the wrong mode | Remove modes or make the current mode highly visible |
| Could a first-time user figure it out without help? | Interaction needs explanation | Simplify or add a one-time hint |

**STEP 4 — Report**
State the score, name which of the four parts (trigger/rules/feedback/loops) is failing, and
give the specific fix.

// EXECUTION_END

## ✅ OUTPUT
A score out of 10, which of the four structural parts is weak, and the specific fix — scoped to
one contained interaction, not a whole screen.

**Common Mistakes**
| Mistake | Why It Fails | Fix |
|---|---|---|
| No feedback on action | Users can't tell if their tap registered | Add immediate visual state change to every interactive element |
| Overdesigning simple moments | Complex animations slow frequent actions | Reserve rich animation for infrequent, high-impact moments |
| Ignoring edge cases | Interaction breaks at zero, max, or double-tap | Map every state: empty, loading, partial, full, error, disabled |
| Mode errors | Same action gives different results based on hidden state | Make current mode visible; minimize modes |
| Fake progress indicators | Users feel deceived when they discover the bar is fake | Use honest, deterministic progress; indeterminate spinner when unknown |

**Ethical boundary:** feedback must stay honest — no fake progress bars, manipulative countdowns,
or deceptive completion percentages; loops must benefit the user, never ramp up notifications or
make opt-outs progressively harder.

**Validation Check (Self-Test)**
```
VERIFY a numeric score out of 10 was stated
VERIFY the weak structural part (trigger/rules/feedback/loops) was named, not just "needs polish"
ELSE ➔ redo STEP 3 before reporting
```

**Further reading:** *Microinteractions: Designing with Details* by Dan Saffer.
