---
name: "!HouseStyle"
description: "ALWAYS ON for anything rendered. The default visual design standard for every Lukeatron surface — apps, widgets, artefacts, viewers, wiki pages, specimen and doc pages. Mild-baroque-Tufte: maximum information, minimum flourish, with small purposeful animation, shading and glyphs that focus attention rather than decorate. Electronic-primary, print-aware. Never fires on person-directed outgoing content (that is !Tone's z-axis). Governs UI marks, not illustration (that is !SvgImage)."
type: Skill
status: Active
core_function: Generate
intent: "Make every rendered Lukeatron surface look like one product, by supplying the tokens, motion and glyph rules by default rather than leaving each build to re-decide taste."
version: 1.0.0
dependencies: [reference/aesthetic.md, reference/tokens.css, reference/print.md, reference/sources.md, reference/check-specimen.py]
calibration:
  context: [Any]
  level: Extended
  scope: Global
memory_footprint:
  read: [Memory/Long-Term/Essential, Memory/Long-Term/Coding]
  write: [System/Sandbox]
---

## ⚡ TRIGGER

**Always on.** Not invoked — in force. Like `!PlainEnglish`, which governs the FORM of internal
*writing*, this governs the FORM of anything *rendered*. Same audience test, different medium.

Applies whenever markup, styling or visual structure is produced: an app, a widget, an artefact,
a `show_widget` view, a viewer page, a specimen, a doc site, an HTML file written anywhere.

## 🛠️ LOGIC

// EXECUTION_START

**STEP 1 — THE MEDIUM TEST.** Is this *rendered*?
  Rendered = HTML/CSS/SVG a human will look at. Prose, code, commit messages, plans, memory
  files, registries → NOT rendered. `!PlainEnglish` governs those.
  NOT rendered ➔ **STOP. Silent.**

**STEP 2 — THE AUDIENCE FLOOR.** Is the addressee a person other than Luke?
  Outgoing email, or anything person-directed ➔ **STOP. Silent.** `!Tone` governs the z-axis.
  This floor is absolute and precedes every other consideration.

**STEP 3 — THE CONTRACT TEST.** Classify the surface against `reference/sources.md`'s register:

```
  Listed EXEMPT       ➔ STOP. Silent. (wiki-page.css · !SvgImage)
  Listed SUBORDINATE  ➔ the chassis keeps LAYOUT, STRUCTURE and SPACING.
                        Govern colour, type, motion, glyphs, focus. Report
                        off-scale spacing; never silently restyle it. Go to STEP 4.
  Listed UNCLASSIFIED ➔ govern whole. Go to STEP 4.
  NOT LISTED          ➔ treat as UNCLASSIFIED, and add a row to the register.
```

  SUBORDINATE is the common case. Do NOT reach for EXEMPT because a surface "already has CSS" —
  exemption requires the difference to be *meaningful*, not merely *existing*.

**STEP 4 — APPLY THE TOKENS.** Use `reference/tokens.css`. Never a literal.
  - `:root` is LIGHT; dark is the override via `@media prefers-color-scheme` + `[data-theme]`.
    Never a `:root.light` override class — that inverts the base and breaks print.
  - Spacing only from `--s-1..--s-7`. An arbitrary value is an audit failure.
  - **Reset UA default margins FIRST.** Browsers set `p`/`h*`/`ul` margins in `em`, which lands
    off the scale (11px, 13px, 17px…). This is the most common way a token layer is quietly
    violated — the page looks fine and every measurement is wrong. Zero them, then space
    deliberately. Same for `code`, which defaults to UA `monospace` rather than `--font-mono`.
  - Space BETWEEN groups exceeds space WITHIN groups.
  - Two font families. One accent + one semantic red.
  - Design in grayscale first; add colour last. Colour is never what carries hierarchy.

**STEP 5 — SPEND THE FLOURISH BUDGET.** `reference/aesthetic.md` holds the table. Per view:
  **2** animating elements · **3** elevation levels · **2** accent hues · **2** glyph weights ·
  **3** motion durations · **2** typeface families.
  Exceeding any count is a **failure, not a judgement**. Every flourish passes the attention test:
  *does it point at the item's purpose, or at itself?*
  Spend from the top of the earns-a-flourish ranking: invisible state → affordance → continuity →
  density relief → small pleasure.

**STEP 5.5 — THE TWO THINGS THAT ARE ALWAYS BROKEN.** Check both on every surface:
  - **Does anything paint the page ground?** `html`/`body` must carry `--bg`. A wrapper painting
    the ground is not enough — scroll past it and browser white floods a dark app.
  - **Is focus visible on EVERY control, and does it collide?** Count focusable elements against
    `:focus-visible` rules. Focus uses `--focus`, never `--acc`, and never the channel an existing
    "active"/"selected" state already uses — or "where am I" and "what is on" become one signal.
  Both were live defects on ProjectDashboard: 121 focusables with one focus rule, and no ground.

**STEP 6 — PRINT.** Consult `reference/print.md` whenever the surface may be printed.
  Print is a documented degradation of the screen design, never a second design. Shadow never
  prints. Test A4 **and** Letter — Letter is 18mm shorter, so height overflows there first.

**STEP 7 — RESEARCH, only on a live question.** `reference/sources.md` maps each of the fourteen
  approved sites to the ONE question it answers. Fetch via `!HeadlessChromeBrowser` when that
  question is actually open. Never browse the set generally.

**STEP 8 — VERIFY before claiming done.**
  - `python3 reference/check-specimen.py <tokens.css> <page.html>` → zero unexercised tokens.
  - Render in light, dark, print preview, and `prefers-reduced-motion`.
  - For a substantial surface, hand to `!RefactoringUI` (visual, ≥9/10 = 7 of 8 rows) and
    `!UXHeuristics` (usability, needs a real interface — never a token sheet).
  The four audit skills are **downstream checks against this default**, not alternatives to it.

// EXECUTION_END

## ✅ OUTPUT

**State:** A rendered surface using only house tokens, within the flourish budget, correct in both
grounds, degrading correctly to paper, and passing the reduced-motion floor. For a SUBORDINATE
surface: tokens/motion/glyphs changed, layout and structure untouched.

**Register:** Any newly encountered surface is added to `reference/sources.md` with its verdict.

**Log:** `[AGENT: !HouseStyle] [SUCCESS] surface=<name> verdict=<exempt|subordinate|unclassified> budget=<pass|breach> | tokens≈[N]` → `Memory/Long-Term/Logs/skills.log`

**Error:** `tokens.css` unreachable → say so and stop; never invent a palette. A flourish-budget
breach that the surface genuinely needs → declare it locally, name it, say why (ProjectDashboard's
urgency channels are the standing precedent). Silent on anything failing STEP 1, 2 or 3.
