---
name: "!UXHeuristics"
description: "Evaluate and improve interface usability using heuristic analysis. Use when Luke says a usability audit is needed, users are/would be confused, form or navigation is a problem, mentions Nielsen's heuristics or a cognitive walkthrough, or asks 'is this easy to use'. Also fires when reviewing a design for usability before it ships, improving form-completion, or checking information architecture. Covers Krug's laws, Nielsen's 10 heuristics, severity ratings, and dark-pattern recognition. For visual polish (not usability), see !RefactoringUI. For foundational affordance theory, see !DesignEverydayThings."
type: Skill
status: Active
core_function: Synthesize
intent: "Turn a usability review into a severity-rated, reproducible audit instead of a vibe check."
version: 1.0.0
source: "Adapted from wondelai/skills (MIT license), skill 'ux-heuristics', based on Steve Krug and Jakob Nielsen's published work — github.com/wondelai/skills. Surfaced via !Magpie 2026-09-02."
calibration:
  context: [PersonalResearch]
  level: Extended
  scope: Global
memory_footprint:
  read: []
  write: [System/Sandbox]
---

## ⚡ TRIGGER
"usability audit", "users are confused", "form usability", "navigation problems", "Nielsen
heuristics", "cognitive walkthrough", "is this easy to use".
Also fires as a consult step inside `!AppDevelopment` — Phase 2 (spec/mockup review), Phase 3
(pre-build check), and Phase 4 (refactor) — whenever usability, not visual polish, is in question.

## 🛠️ LOGIC

// EXECUTION_START

**Core Principle**
"Don't Make Me Think" — every screen should be self-evident. Users scan, they don't read; they
satisfice, they don't optimize; they muddle through, they don't figure out how things work.
Design for that behavior, not for an ideal careful user.

**STEP 1 — Apply Krug's laws**
  1. **Don't make me think** — every question mark in a user's head is friction. Clear names beat
     clever names. "Sign in" not "Access your account portal."
  2. **Clicks don't matter, confidence does** — three painless clicks beat one that requires
     deliberation. Shallow nav with clear labels beats deep nav with vague ones.
  3. **Get rid of half the words, then half again** — cut happy-talk, unread instructions, and
     polite filler ("Please kindly note..."). Brevity makes what's left prominent.
  4. **The Trunk Test** — drop a user on any page; they should instantly answer: what site/page is
     this, what are my options, where am I, where's search. A "you are here" indicator is
     mandatory in nav and breadcrumbs.

**STEP 2 — Check against Nielsen's 10 heuristics**
  Visibility of system status · match between system and real world · user control and freedom
  (undo beats "are you sure?") · consistency and standards (one term per concept everywhere) ·
  error prevention (constrain inputs before validating) · recognition rather than recall (don't
  make users memorize) · flexibility for novices and experts · aesthetic/minimalist design (every
  element earns its place) · help users recognize/diagnose/recover from errors (what happened,
  why, how to fix — plain language, never blame the user) · help and documentation (searchable,
  task-focused, contextual).

**STEP 3 — Rate every issue found**
| Severity | Description | Priority |
|---|---|---|
| 0 — Not a problem | Disagreement, not a usability issue | Ignore |
| 1 — Cosmetic | Minor annoyance | Fix if time |
| 2 — Minor | Causes delay or frustration | Schedule fix |
| 3 — Major | Significant task failure | Fix soon |
| 4 — Catastrophic | Prevents task completion | Fix immediately |
  Weigh frequency, impact, and persistence together, not severity alone.

**STEP 4 — Score it**
  Start at 10, subtract per failed Quick Diagnostic row, weighted by the worst severity it
  triggers (major/catastrophic rows cost ~2, minor/cosmetic ~1).
  Bands: **9-10** = no severity-3+ issue and <=1 failed row · **6-8** = some major issues or
  several failed rows · **3-5** = a catastrophic issue or many failed rows · **<=2** = core tasks
  blocked.

**STEP 5 — Run the Quick Diagnostic**
| Question | If No | Action |
|---|---|---|
| Can I tell what site/page this is immediately? | Users are lost | Clear logo, page title, breadcrumbs |
| Is the main action obvious? | Users don't know what to do | Visual hierarchy, single primary CTA |
| Is the navigation clear? | Users can't find their way | Apply the Trunk Test, "you are here" indicators |
| Can I find search? | Goal-driven users are blocked | Visible search box in header |
| Does the system show what's happening? | Users lose trust, re-click | Loading states, confirmations, progress |
| Are error messages helpful? | Users get stuck | Plain language with a specific fix |
| Can users undo or go back? | Users are afraid to act | Undo, cancel, and back everywhere |
| Does it work without hover? | Mobile/keyboard users excluded | Visible alternatives to hover |
| Are all interactive elements labeled? | Users guess at icons | Text labels or descriptive tooltips |
| Does anything make me stop and think "huh?" | Cognitive load too high | Simplify — if it needs explanation, redesign it |

**STEP 6 — Report**
State the score, the highest-severity issues found, and the specific fix needed for each to
reach 10/10.

// EXECUTION_END

## ✅ OUTPUT
A severity-rated issue list, a score out of 10, and the specific fix for each issue found —
never an unranked list of impressions.

**Common Mistakes**
| Mistake | Why It Fails | Fix |
|---|---|---|
| Mystery meat navigation | Icons without labels force guessing | Add text labels alongside icons |
| No "you are here" indicator | Users feel lost in the hierarchy | Highlight current section in nav and breadcrumbs |
| No inline validation | Submit → error → scroll cycle frustrates | Validate on blur with specific messages |
| Tiny tap targets | Mobile users misclick constantly | Minimum 44x44px touch targets |
| No undo | Users afraid to take any action | Provide undo for all non-destructive actions |
| Poor error messages | "Invalid input" tells users nothing | Explain what's wrong and how to fix it |

**Dark patterns to flag, never build:** forced continuity (hard to cancel), roach motel (easy in,
hard out), confirmshaming, hidden costs revealed only at checkout.

**Ethical boundary:** clarity and brevity must never be used to bury cancellation flows, hide
unfavorable terms, or omit a disclosure the user has a right to see.

**Validation Check (Self-Test)**
```
VERIFY every issue found carries a severity rating (0-4)
VERIFY a numeric score out of 10 was stated with its failing rows named
ELSE ➔ redo STEP 5 before reporting
```

**Further reading:** *Don't Make Me Think, Revisited* by Steve Krug; "10 Usability Heuristics for
User Interface Design" by Jakob Nielsen (Nielsen Norman Group).
