# The house aesthetic — mild-baroque-Tufte

## The name, unpacked

**Tufte** is the floor: maximum information, minimum ink. Every pixel that is not carrying
information is a candidate for deletion. Data-ink ratio, high density, no chartjunk, no decoration
that survives the question "what does this tell me?"

**Mild baroque** is the deliberate exception to that floor — and it is *mild* because the floor
still holds everywhere else. Pure Tufte is austere to the point of coldness; a tool used daily
should reward being used. So the house style spends a small, bounded amount of ornament — a
shading, a glyph, a 90ms echo on a press — **and spends it only where it does work**.

The two words are in tension on purpose. Tufte is the rule; mild baroque is the licensed
exception. When they conflict, **Tufte wins** — the flourish is what gets cut.

## The attention test

Every flourish faces one question:

> **Does this point at the item's purpose, or at itself?**

A hover lift that says *this row is clickable* points at purpose. A hover lift on a static
heading points at itself. A 90ms colour echo confirming a press points at purpose. A shimmer on
a card border points at itself.

Second question, for animation specifically:

> **If I remove it, is information lost?**

If yes, the animation was carrying information it should not have been — make it a static signal
instead. If no, it is decorative, and decorative motion must obey the reduced-motion floor.
Both answers lead somewhere; neither leads to keeping an animation that carries meaning.

## The flourish budget

Restraint fails one reasonable decision at a time. Each addition is defensible alone; the sum is
noise. So the budget is **counted, not judged**. Per view — a screen, a page, a widget panel:

| Dimension | Cap | Failure mode it prevents |
|---|---|---|
| Simultaneously animating elements | **2** | A page that shimmers. Two things moving at once is already at the edge of what the eye tracks |
| Elevation levels | **3** | Ground, raised, floating. A fourth means nothing reads as raised |
| Accent hues beyond the ink set | **2** | One accent + one semantic (danger). A third accent means no accent |
| Glyph weights | **2** | One default, one emphasis. Three weights read as three icon sets |
| Distinct motion durations | **3** | `--m-fast` / `--m-base` / `--m-slow`. A fourth is a tell that something is moving which should not |
| Typeface families | **2** | Prose serif + UI sans. Mono is a third only where code demands it |

**Exceeding any count is an audit failure, not a judgement call.** The number is the argument.

A surface that genuinely needs more declares the excess locally, names it, and says why —
ProjectDashboard's urgency channels are the standing example of a justified local excess.

## What earns a flourish

Ranked. Spend the budget from the top.

1. **State that would otherwise be invisible** — focus, pressed, loading, disabled, selected.
   This is not ornament; it is the interface telling the truth about itself.
2. **Affordance** — the hover lift that says *clickable*, the cursor change, the 1px inset that
   says *this is a field, type here*.
3. **Continuity** — a popover growing from the control that opened it, so the eye does not have
   to re-find its place. Motion as a wayfinding aid.
4. **Density relief** — a hairline, a wash, a quiet band that lets a dense table be scanned.
   Tufte's own move: the rule you barely notice is doing the most work.
5. **Small pleasure, last and least** — the 90ms ease on a checkbox. Only after 1-4 are satisfied,
   and only within budget.

## What never earns one

- Motion on page load that delays reading. The content is the point.
- Anything that moves while the user is reading, unless the user caused it.
- Decoration on a heading, a rule, or a container. Structure is not an occasion for ornament.
- A gradient, shadow, or animation applied uniformly. If everything floats, nothing does.
- Motion carrying information (see the attention test's second question).
- A second accent colour to "add interest". Interest comes from hierarchy, not hue.

## The quiet violation

The most common way this token layer gets broken is not a designer picking a wrong colour. It is
**browser default margins**: `p`, `h1`-`h4`, `ul` and `figure` all ship with `em`-based margins,
so a 17px body gives a 17px gap — off the 4/8/16/24/32/48/64 scale, on a page where every
deliberate value is on it. Nothing looks wrong; every measurement is.

Reset UA margins to zero before spacing anything. The same trap catches `code`, which defaults to
the UA `monospace` stack rather than `--font-mono`, quietly adding a fourth typeface.

## The ground contract

**`:root` is light. Dark is the override**, declared both ways: `@media prefers-color-scheme` +
`[data-theme]`.

Not arbitrary, and not the majority convention in this repo — three of the five existing layers
use a dark base. Light wins anyway because **paper is always light**. A light `:root` makes the
print path the *base* path: no inversion, no ink substitution, nothing to undo at print time. A
dark base means every print run fights the stylesheet. Print is first-class in this house style,
so print casts the deciding vote.

Second reason: it matches `wiki-page.css`, the Key Template this skill may not edit. Matching it
costs nothing; diverging creates permanent drift.

A dark-only surface does not need a light theme. It declares `[data-theme="dark"]` on its root
and stops — one line, not a re-theme.

## The three-state contract rule

Most Lukeatron surfaces already have a style contract. `!HouseStyle` does **not** override them
wholesale. Classify first, then act:

| State | When | What `!HouseStyle` governs |
|---|---|---|
| **EXEMPT** | The existing contract is deliberately different, and that difference carries meaning | Nothing. Silent. |
| **SUBORDINATE** | The surface has a working chassis, but no considered position on tokens, motion or glyphs | **Colour, type, motion, glyph and focus** tokens. **The chassis keeps layout and structure — including SPACING.** |
| **UNCLASSIFIED** | New surface, or one with no contract of its own | Everything. |

**Spacing is layout, not colour.** On a SUBORDINATE surface, off-scale spacing is **reported, not
silently changed** — changing it moves the layout, which is exactly what SUBORDINATE promises not to
do. (Found the hard way on ProjectDashboard, whose `--space-3: 12px` and `--space-5: 20px` sit off
the house scale. The right output was a finding, not a patch.)

**SUBORDINATE is the common case** — most surfaces here have a chassis and no considered position
on motion. Reaching for EXEMPT because a surface "already has CSS" is the failure mode that makes
the default a default for nothing. EXEMPT requires the difference to be *meaningful*, not merely
*existing*.

Standing exemptions: `wiki-page.css` (its provenance inks encode whose words these are — a
semantic no other surface has); `!SvgImage` (a 24-style illustration library; a different job
entirely — this skill governs UI marks, not illustration).

## Scope floor

**Person-directed outgoing content is out of scope.** `!Tone` governs presentation on the z-axis.
`!HouseStyle` never fires on an outgoing email, whatever its markup. If a human other than Luke is
the addressee, this skill is silent.

## Print, in one line

Electronic-primary, print-aware: the screen design is the design, and print is a **documented
degradation** of it, never a second design. Full rules in `print.md`.
