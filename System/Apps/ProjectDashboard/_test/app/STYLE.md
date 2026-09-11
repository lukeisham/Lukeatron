# Project Dashboard — Style Guide

This is the app's single visual source of truth: what a mark means, and what colour it is.
Its companion, `README.md`, says how the app is put together and why — nothing visual lives
there. Every value named below is a custom property in `shared/tokens.css`; nothing here is
decorative, and nothing in `tokens.css` is unexplained here (checked both directions).

## The governing principle

Every visual decision in this app answers to one rule, stated by Luke on 2026-09-06:

> As much information as possible should be conveyed with as few words and symbols as
> possible, but never at the cost of clarity.

This is Luke's own statement of the Tufte principle — Edward Tufte's argument, across
*The Visual Display of Quantitative Information* and *Envisioning Information*, that a
graphic's worth is the information it carries per mark, and that ink spent on anything but
data is ink wasted. Tufte's own terms for the two halves are *data-ink ratio* and *graphical
excellence*; Luke's wording above is what binds here.

**The rule has two halves, and the second is not decoration.** *Fewest marks* on its own
produces a board nobody can read; *never at the cost of clarity* is the stop. Where the two
conflict, **clarity wins and the mark count goes up** — a channel added because the reading
genuinely requires it is the rule being obeyed, not broken.

**Before adding any mark, ask in order:**

```
 1  Is this information, or is it furniture?      furniture  ➔ delete it
 2  Is it already carried by a mark on screen?     yes        ➔ delete it, use the one there
 3  Can a mark already present carry it too?       yes        ➔ load that mark instead
 4  Does the reading fail without it?              yes        ➔ ADD IT — clarity winning
                                                    no         ➔ delete it
```

Steps 1–3 are *fewest marks*. Step 4 is *never at the cost of clarity*, and it is the only
legitimate way a mark gets added.

**Where the app already obeys this** — so the rule is recognisable, not abstract: the crown
puts the project-level demand answer on a surface a stack already shows, adding no element;
kind carries in stack position, a channel already there; the week rail's marks carry their
source in shape and their kind in fill, two facts on one dot; face shading is one fill and
two filters — five palette values per cube, not fifteen. Each of these is step 3, not step 4.

**And where it currently fails — kept as a worked example, because the principle is easy to
agree with and hard to apply.** The opened stack draws project CH-06 as twelve slices, of
which eight read *"Find the contact person / procedure to change the church's name with
___"* and differ only in the final word — exactly where the line truncates. Twelve rows,
roughly eleven words each, carrying twelve words of actual information. The fix is to factor
the common stem into a heading and list only what differs:

```
 BEFORE (12 rows × ~11 words)          AFTER (1 stem + 8 differences)
 Find the contact person /             Find the contact person / procedure to change
   …name with Xero                     the church's name with:
 Find the contact person /               Xero · City of Port Phillip · the council ·
   …name with City of Por…               Glen Eira C… · ATO · ABN · electricity · FES
 Find the contact person /
   …name with the council             Change Gmail labels and separate out email
 …                                      accounts (personal and work)
```

Same information, no truncation, and the one genuinely different task stops hiding among
eight near-duplicates. A truncation that cuts at the point where the difference lives is the
failure this rule exists to catch — maximum marks for minimum information, the rule inverted.

**Grouping is the standard answer to repetition.** Where three or more sibling rows share a
leading stem, lift the stem to a heading and let the rows carry only their differences. This
applies to the opened stack's slices, the list view, the print sheet and the brief. It is a
rendering rule, not a data rule: no store is rewritten, and the full text stays available on
hover and in the copy target.

## Screen text vs. code comment

Text that helps Luke navigate belongs on screen. Text that explains the build belongs in a
code comment. This runs in both directions — the failure is as often a missing label as an
escaped comment.

**On screen**, because the person using the app needs it:
- what a control does, in the control's own label — `↺ ↻ rotate`, `⧉ copy`, `take this to Unblock`
- what a state means and what happens next — *waiting on someone*, *nothing needs you this
  week*, *at rest — fewer than 8 jobs*
- the legend: what a lit crown, a fluorescent outline, a dot's shape and a lane's direction mean
- the current rule in force, where a toggle changes it — `colour = project`, `front = due soonest`
- an error after an action failed, saying what happened and what to do
- the *guessed, not stated* treatment — a fact about the data Luke must be able to see

**In a code comment**, because only a maintainer needs it:
- requirement, decision and acceptance-criterion numbers
- why a value is what it is — contrast ratios, measured thresholds, colour collisions
- invariants, guarantees, "this is derived, not stored" notes
- anything phrased as a rule the app enforces rather than a thing the reader can do

**The line:** *"Overdue is drawn thicker"* beside the legend is UI — it tells Luke how to
read the board. *"Overdue is drawn thicker because two colours collide in greyscale"* is a
comment — it tells a maintainer why, and Luke can do nothing with it. Both are true; only one
belongs on the glass. This document is the comment side of that line — it carries the
measured reasons on purpose, because a maintainer reading it is exactly its audience.

## Navigation is instructed, not discovered

Every altitude change, every toggle and every drill-down carries a visible label or
affordance saying what it will do. Nothing depends on Luke remembering a gesture or finding a
hidden target. The breadcrumb is present at every altitude in the same place, and the way
back is visible before the way down is taken. A discoverable-only interaction is a missing
label, not a clean design — step 4 above covers it: the reading fails without it, so it gets
added.

---

## The palette — Dusk

A dark ground with warm tops, for three reasons, in order:

1. **Fluorescent needs a dark ground to be fluorescent.** On white, "fluorescent" is merely
   bright. Against this ground: this-week cyan measures 12.06:1, overdue magenta 5.21:1.
2. **Its kind-3 amber is the strongest thing on the board**, at 11.80:1 — and kind 3 is
   *yours to do*, the colour that must be found first.
3. It is what the design mockups were drawn and measured against, so the geometry never
   needed re-proving.

**The cost, stated plainly:** the board is not a thing to print as a picture. If a light
palette is ever wanted, it lives in `tokens.css` beside this one, not as a rewrite.

### Ground and ink

| Token | Value | Role |
|---|---|---|
| `--bg` | `#11131a` | the ground |
| `--ink` | `#e6e6ee` | body text · 14.95:1 |
| `--ink-guessed` | `#e6e6ee8c` | the guessed-vs-stated underline — `--ink` at 55% |
| `--panel` | `#1b2030` | controls, cards, the depot |
| `--line` | `#ffffff10` | hairlines and borders |
| `--bare` | `#1b2030` | an unused lattice slot |
| `--mind` | `#2a3040` | a mind project's plate |
| `--edge` | `#00000055` | the stroke between cube faces |

### Kind — whose move it is

| Token | Value | Kind |
|---|---|---|
| `--k1` | `#7f93b8` | 1 — waiting |
| `--k2` | `#8e8b84` | 2 — unshaped |
| `--k3` | `#ffc46b` | 3 — mine |
| `--k4` | `#7fd6a2` | 4 — hand-over |
| `--k5` | `#b79be8` | 5 — incoming |

A stack's kind carries in **position** (kind-ascending) as well as fill — the accessibility
floor's second cue for this channel (below). No state in this app is signalled by hue alone.

### Fluorescent — reserved, and only for two things

| Token | Value | Marking |
|---|---|---|
| `--fluoro-week` | `#00e5ff` | due within seven days |
| `--fluoro-over` | `#ff2d78` | overdue |

Fluorescent means urgency, twice, and nothing else. Both are **stack-outline** markings only
— a third use anywhere in the app is not a small liberty; it is what stops the first two
working. The reservation is what makes them work at all: a fluorescent in three places is
decoration, and the eye stops going to it.

### Project colour — generated, not listed

A project's fill is `hsl(hue ± 13°, sat ± 8%, lo→hi)`, its hue and lightness stepped by the
golden angle across that quadrant's projects, so neighbours differ and no list needs
maintaining as projects come and go. The tokens supply every constant the generator needs —
no module invents one of its own:

| Token | Value | Role |
|---|---|---|
| `--hue-CH` | `212` | Church |
| `--hue-PP` | `34` | Personal Productivity |
| `--hue-TE` | `148` | Teaching |
| `--hue-PR` | `280` | Personal Research |
| `--sat` | `42%` | base saturation |
| `--light-lo` / `--light-hi` | `34%` / `70%` | the lightness ramp |
| `--hue-variance` | `13deg` | hue spread, per project |
| `--sat-variance` | `8%` | saturation spread, per project |
| `--hue-step` | `137.508deg` | the golden angle — the per-project stepping constant |

The generator itself — the loop that walks a quadrant's projects and assigns each its step —
is a rendering computation and lives in `monitor`, not here; this file supplies every value
it needs so nothing gets hardcoded a second time.

### Mind plate vs. bare tile

`--mind` and `--bare` sit close in lightness — a mind project's plate and an unused lattice
tile could otherwise be mistaken for each other. The second cue is the border: a mind plate's
is dashed, a bare tile's is solid.

| Token | Value |
|---|---|
| `--dash-mind` | `3 2` |
| `--dash-bare` | `none` (solid) |

---

## Cube shading — one fill, two filters

A cube is defined once and instanced everywhere it appears; the top face takes the inherited
project fill unmodified, the right face is dimmed, the left face dimmed further. No module
computes a face colour of its own — five palette values produce every cube on the board, not
fifteen.

| Token | Value | Face |
|---|---|---|
| `--face-shade-mid` | `0.78` | right |
| `--face-shade-dark` | `0.56` | left |

## The crown

The crown is the top face of a stack's topmost cube — the one upward surface a stack always
shows. It carries a *project-level* state, not the topmost task's own kind: lit when the
project has an open kind 3 or 4 with Luke the sole blocker, dimmed when everything open is
someone else's move, absent on a mind project's plate.

| Crown state | Treatment |
|---|---|
| needs Luke | the face's full-strength fill — the brightest surface on the board |
| waiting on someone | the same fill through `--face-shade-mid` (`0.78`) |
| no open tasks | no crown; the plate takes `--mind` |

The crown is a **brightness step**, not a new colour — fluorescent is already spoken for, and
a third hue system would be a fourth channel on a board whose own rule is that another
channel is a design failure. It costs no palette value, works identically under both colour
modes, and survives greyscale as a clear lightness step.

## The two fluorescent outlines

A stack's whole silhouette carries one of two urgency markings, sized to be legible in
greyscale and under a colour-vision deficiency — **stroke weight is the guaranteed channel,
colour is the pleasant one**, because the two fluorescents collide in greyscale with the cube
colours they sit against.

| Marking | Colour | Stroke | Glow |
|---|---|---|---|
| due this week | `--fluoro-week` | `--stroke-week` (`2.4px`) | soft, `--glow-blur` |
| overdue | `--fluoro-over` | `--stroke-over` (`3.1px`) | soft, `--glow-blur` |

Overdue is always the thicker of the two. The glow is a soft blur behind the stroke and
**never animation** — nothing in this pairing pulses, blinks or breathes.

### The small-mark halo

On a mark too small for a visible stroke — the week rail's 11px dots — the same two urgency
states are drawn as a two-ring halo instead: an inner ring in `--bg` at a fixed gap, then a
coloured outer ring.

| Marking | Inner ring (`--bg`) | Outer ring |
|---|---|---|
| due this week | `--halo-inner` (`2.4px`) | `--halo-outer-week` (`4.6px`) |
| overdue | `--halo-inner` (`2.4px`) | `--halo-outer-over` (`5.5px`) |

Overdue's outer ring is the wider of the two, so the "overdue is always thicker" rule holds
at this scale too — by the halo rather than by the stack outline's stroke-weight table above.

### The week rail's marks

A due is a **circle**, a wake a **square**, an incoming a **diamond** (a square turned 45°),
all `--mark-size` (`11px`), filled with their kind's colour. Shape carries the source, fill
carries the kind, and neither may be replaced by a colour — that is what keeps the rail
readable in greyscale.

---

## The one moving element — the depot ticker

Nothing in this app pulses, blinks, changes colour or counts down. Exactly one exception is
granted, fenced by its own tokens so no call site chooses its own rate or easing:

| Token | Value | Role |
|---|---|---|
| `--tick-rate` | `10.5s` per job | a lane's cycle time is this × its job count |
| `--tick-ease` | `linear` | the only permitted timing function anywhere in the app |
| `--tick-rest-below` | `8` | a lane holding fewer jobs than this does not roll — it sits still |

`--tick-ease: linear` is the enforcement point: any easing function appearing anywhere else in
the stylesheet is a second animation by definition. Under `prefers-reduced-motion: reduce` the
ticker freezes entirely and becomes hand-scrollable — defined in `tokens.css` itself, against
a `ticker-lane` class every lane element must carry, so the freeze cannot be left out by a
module that forgets it.

A lane at rest (fewer than 8 jobs) is the normal state at the real queue depth, not a degraded
one — it sits still and scrolls by hand.

---

## Type and spacing

One system stack, no web font — the offline snapshot fetches nothing.

| Token | Value |
|---|---|
| `--font-body` | system sans stack |
| `--font-mono` | system monospace stack |
| `--font-size-body` | `13px` |
| `--line-height-body` | `1.45` |

Monospace is used only for the diagnostic strip and reference numbers, where character
alignment carries meaning.

Spacing is a 4px scale:

| Token | Value | Token | Value |
|---|---|---|---|
| `--space-1` | `4px` | `--space-5` | `20px` |
| `--space-2` | `8px` | `--space-6` | `24px` |
| `--space-3` | `12px` | `--space-8` | `32px` |
| `--space-4` | `16px` | | |

Three radii, no more:

| Token | Value | Use |
|---|---|---|
| `--r-swatch` | `2px` | small swatches |
| `--r-panel` | `8px` | panels, cards |
| `--r-rail` | `26px` | the week rail |

A fourth radius would be a drift, not a decision — if one is ever needed, it is named here
first.

---

## Guessed, not stated

One treatment, used everywhere a derived value appears: a dashed 1px underline in
`--ink-guessed`, plus a title naming what was guessed. It is the same mark for a guessed
effort, a guessed kind, a guessed token cost, and an unfitted capacity figure, because they
are one idea — the app worked this out; the file did not say it.

---

## Print

`@media print` drops the whole Dusk ground to ink on white and drops both fluorescents —
overridden directly in `tokens.css`, so nothing else needs to know it is printing. The
printed sheet is a list, not a picture: it names each kind in words rather than leaning on its
colour, and no board furniture (the mass, the ticker, the rail) prints at all.

---

## The accessibility floor

Text measures at least 4.5:1 against its ground everywhere in the app. Every meaning-bearing
colour carries a second, non-colour cue as well, so no state is signalled by hue alone:

| Channel | Colour cue | Second cue |
|---|---|---|
| kind | fill (`--k1`…`--k5`) | stack position — always kind-ascending |
| urgency | fluorescent outline | stroke weight (stack) / halo width (rail) — overdue always thicker |
| crown | full fill vs. dimmed fill | the brightness step itself is the cue |
| guessed vs. stated | `--ink-guessed` | dashed underline |
| mind plate vs. bare tile | `--mind` vs. `--bare` | dashed border vs. solid |

---

## Swatch strip

Generated from the token values above — colours only, in the order listed in `tokens.css`.
If a token's value changes, regenerate this strip so it cannot drift out of step.

<svg viewBox="0 0 720 100" xmlns="http://www.w3.org/2000/svg" width="720" height="100" role="img" aria-label="Dusk palette swatch strip">
  <rect x="0" y="0" width="720" height="100" fill="#11131a" />
  <g font-family="ui-monospace, monospace" font-size="9" fill="#e6e6ee">
    <rect x="8" y="8" width="48" height="32" rx="2" fill="#11131a" stroke="#ffffff10" />
    <text x="12" y="52">bg</text>
    <rect x="64" y="8" width="48" height="32" rx="2" fill="#1b2030" />
    <text x="68" y="52">panel</text>
    <rect x="120" y="8" width="48" height="32" rx="2" fill="#e6e6ee" />
    <text x="124" y="52">ink</text>
    <rect x="176" y="8" width="48" height="32" rx="2" fill="#2a3040" stroke-dasharray="3 2" stroke="#e6e6ee" />
    <text x="180" y="52">mind</text>
    <rect x="232" y="8" width="48" height="32" rx="2" fill="#7f93b8" />
    <text x="236" y="52">k1</text>
    <rect x="288" y="8" width="48" height="32" rx="2" fill="#8e8b84" />
    <text x="292" y="52">k2</text>
    <rect x="344" y="8" width="48" height="32" rx="2" fill="#ffc46b" />
    <text x="348" y="52">k3</text>
    <rect x="400" y="8" width="48" height="32" rx="2" fill="#7fd6a2" />
    <text x="404" y="52">k4</text>
    <rect x="456" y="8" width="48" height="32" rx="2" fill="#b79be8" />
    <text x="460" y="52">k5</text>
    <rect x="512" y="8" width="48" height="32" rx="2" fill="none" stroke="#00e5ff" stroke-width="2.4" />
    <text x="516" y="52">week</text>
    <rect x="568" y="8" width="48" height="32" rx="2" fill="none" stroke="#ff2d78" stroke-width="3.1" />
    <text x="572" y="52">over</text>
  </g>
</svg>

---

## Words this document does not use

skyline · district · building · landscape toggle · depot tiles · grid · cell · yard · podium
· region · the plane · task cube · depth band · front/middle/back · weather · storm ·
overcast · clear · parked. Every one of these was replaced by a term in the app's glossary
(`the documentation spec` §5); reaching for one here is a defect, not a style choice.
