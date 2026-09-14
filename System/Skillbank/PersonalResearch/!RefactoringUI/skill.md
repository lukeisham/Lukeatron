---
name: "!RefactoringUI"
description: "Audit and fix visual hierarchy, spacing, color, typography, depth, and layout in a web UI. Use when Luke says a UI looks amateur/unprofessional/flat, asks to fix the visual design, pick a color palette, build a design system or spacing scale, polish component styling, add a dark theme, or improve data-visualization clarity. Systemizes taste into constrained scales (spacing, type, color, shadow) rather than freehand judgment. For usability/audit issues (not visual polish), see !UXHeuristics. For interaction-detail polish (loading states, toggles, feedback timing), see !Microinteractions. For foundational affordance/mental-model issues, see !DesignEverydayThings."
type: Skill
status: Active
core_function: Synthesize
intent: "Turn a vague 'make this look better' into a scored, reproducible checklist so visual-design quality is checkable the same way twice."
version: 1.0.0
source: "Adapted from wondelai/skills (MIT license), skill 'refactoring-ui', by Adam Wathan & Steve Schoger — github.com/wondelai/skills. Surfaced via !Magpie 2026-09-02."
calibration:
  context: [PersonalResearch]
  level: Extended
  scope: Global
memory_footprint:
  read: []
  write: [System/Sandbox]
---

## ⚡ TRIGGER
"my UI looks off/amateur", "fix the design", "Tailwind styling", "color palette", "visual
hierarchy", "design system", "spacing scale", "component styling", "dark mode theme", "polish the
UI before launch", "does this look right".
Also fires as a consult step inside `!AppDevelopment` — Phase 2 (mockup design), Phase 3
(build), and Phase 4 (refactor) — whenever visual polish of an app or widget is in scope.

## 🛠️ LOGIC

// EXECUTION_START

**Core Principle**
Design in grayscale first, add color last — this forces hierarchy through spacing, contrast, and
typography before color becomes a crutch. Great UI is not talent, it is constrained systems:
fixed scales for spacing, type, color, and shadow produce consistent results without a designer.
Start with too much white space and remove; leave icons/shadows/micro-detail until layout works.

**STEP 1 — Walk the seven levers**
  1. **Hierarchy** — not everything can be important. Combine size/weight/color, don't multiply
     (primary = large OR bold OR dark, not all three). De-emphasize labels vs. values.
  2. **Spacing & sizing** — use the scale `4/8/16/24/32/48/64px` only, never arbitrary values.
     Spacing between groups must exceed spacing within groups. Constrain widths: text 45-75
     characters (`max-w-prose`), forms 300-500px.
  3. **Typography** — modular scale `12/14/16/18/20/24/30/36px`. Tight line-height on headings
     (1.0-1.25), relaxed on body (1.5-1.75). Two font families max.
  4. **Color** — 5-9 shades per color (50-900), darkest never pure black (`#111827` not
     `#000000`). Tint grays instead of using pure gray. Contrast minimums: 4.5:1 body text, 3:1
     large text (18px+); use `gray-700`+ on white.
  5. **Depth & shadows** — small shadow = raised slightly (buttons/cards), large shadow =
     floating (modals/dropdowns). Two-part shadows (tight dark + soft large) read as crisper.
     Don't overuse — if everything floats, nothing has depth.
  6. **Images & icons** — size icons deliberately, consistent stroke width. Never stretch —
     `object-fit: cover` with fixed aspect ratio. Text over images needs a gradient overlay.
     Empty states get an illustration + CTA, not just text.
  7. **Layout & composition** — left-align by default; center only short headlines, heroes,
     single-action CTAs, and empty states. A consistent left edge costs less to scan.

**STEP 2 — Score it**
  `score = round(satisfied / 8 × 10)` over the Quick Diagnostic's 8 rows.
  Bands: **10** = all 8 pass · **9** = exactly 1 gap (usually weak hierarchy or thin white space)
  · **6-8** = 2-3 gaps · **<=5** = 4+ gaps (arbitrary spacing, color doing hierarchy's job, or
  failing contrast).

**STEP 3 — Run the Quick Diagnostic**
| Question | If No | Action |
|---|---|---|
| Does hierarchy read when squinting (blur test)? | Elements competing | Increase primary/secondary contrast |
| Does it work in grayscale? | Color is a crutch | Strengthen size/weight/spacing hierarchy |
| Is there enough white space? | Probably not | Increase spacing, especially between groups |
| Are labels de-emphasized vs. values? | Labels compete with data | Smaller, lighter, or uppercase-small labels |
| Does spacing follow a consistent scale? | Arbitrary spacing = visual noise | Use 4/8/16/24/32/48/64 only |
| Is text width constrained? | Long lines fatigue readers | Apply `max-w-prose` (~65ch) |
| Do colors have sufficient contrast? | Accessibility failure | WCAG-check; use gray-700+ on white |
| Are shadows appropriate for elevation? | Elements float at wrong level | Match shadow scale to element purpose |

**STEP 4 — Report**
State the score, name every failing row from STEP 3, and give the one-line fix for each —
never a paragraph of general impressions.

// EXECUTION_END

## ✅ OUTPUT
A score out of 10, the specific diagnostic rows failing, and a concrete CSS-level fix for each —
not prose feedback.

**Common Mistakes**
| Mistake | Why It Fails | Fix |
|---|---|---|
| "Looks amateur" | Insufficient white space, unconstrained widths | More white space, constrain content widths |
| "Feels flat" | No depth differentiation | Subtle shadows, border-bottom on sections |
| "Everything looks the same" | No visual hierarchy | Vary size/weight/color between primary and secondary |
| "Colors clash" | Random choices, no system | Reduce saturation, more grays, limit to palette |
| Arbitrary values | px values like 13, 17, 23 breed inconsistency | Stick to the spacing and type scales |

**Ethical boundary:** never use hierarchy tricks to hide pricing, terms, or cancellation options.

**Validation Check (Self-Test)**
```
VERIFY a numeric score out of 10 was stated
VERIFY every failing diagnostic row was named with its specific fix
ELSE ➔ redo STEP 3 before reporting
```

**Further reading:** *Refactoring UI* by Adam Wathan & Steve Schoger; *The Design of Everyday
Things* by Don Norman; *Don't Make Me Think* by Steve Krug.
