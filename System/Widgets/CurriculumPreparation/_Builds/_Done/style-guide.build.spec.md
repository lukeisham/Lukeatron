# style-guide — Build Spec

| Field | Value |
|---|---|
| **Type** | Build |
| **Date** | 2026-08-20 |
| **Status** | Draft — awaiting Luke's review |
| **Wave** | 1 (foundation) |
| **One-liner** | Transcribes the settled design tokens (AD-13c) into every bundle's own `variables.css`, plus a static reference page that renders every token as a visible swatch, checkable against the AD-13c table without opening devtools. |

---

## 1. Motivation

`FR-BND-9` has required a bundle to carry its own StyleGuide and
`variables.css` since wave 1, but the build that produces them has been
"spec pending" the whole time — every colour, radius and border value a
bundle's CSS needs has instead lived only in the twelve `_Mockups/`
artboards, re-derivable but never actually transcribed anywhere real. AD-13c
(rev 12) closed the re-derivation problem at the *design* level — one table,
every value, settled — but nothing yet turns that table into the file a
generated bundle actually ships. This build is that transcription, and
nothing more: **the design decisions are already made** (AD-13c); this build
does not make new ones about colour, spacing, or type.

## 2. Scope

**In scope**
- `variables.css` — every token in AD-13c's table (colours, radius, border
  style, font stack, the three tier colour sets, coverage-cell states,
  completion states) as CSS custom properties on `:root`.
- A static, standalone **StyleGuide page** (`styleguide.html`) rendering
  every token visually — colour swatches, a rendered radius/border sample,
  the font stack in use, the three tier bands, the three coverage-cell
  states, and the three completion states (complete, not yet, row tint) —
  so each one can be checked by eye against AD-13c's table, the same
  purpose `README.md` (FR-BND-8) serves for architecture.
- `variables.css` and `styleguide.html` are both part of `bundle-template`
  — copied into every bundle `!NewUnit` creates, never generated per-unit
  from a script that re-reads the mockups.
- Every other CSS file in the bundle (lesson plan, matrix, crib sheet, etc.)
  referencing these tokens via `var(--x)`, never a hardcoded literal.

**Out of scope**
- Any new design decision — colour, radius, spacing, or type choice. If a
  value isn't already in AD-13c's table, it doesn't belong in this build;
  amend AD-13c first.
- A theme switcher, dark mode, or any per-unit override of a token — AD-13c's
  values are fixed **project-wide** (explicitly, for the tier colours), not a
  per-bundle preference.
- An interactive token editor. The StyleGuide page is a reference, not a
  tool — Luke isn't tweaking colours here, he's checking what's already
  decided.
- Regenerating `variables.css` at runtime from the mockups or any other
  source — this build ships a static, transcribed file, not a build step
  that reads `.dc.html` artboards (AD-13c's own Rejected section already
  ruled that out for the same reason CSS-2 exists).

## 3. Requirements

- **FR-SG-1** — `variables.css` defines every token in AD-13c's table as a
  CSS custom property on `:root`, with the exact values that table states —
  no rounding, no "close enough," no value invented to fill a gap the table
  doesn't cover. *(FR-BND-9, FR-BND-11, AD-13c)*
- **FR-SG-2** — `variables.css` is the **only** place these values are
  defined. Every other stylesheet in the bundle references a token by
  `var(--name)`; none repeats a literal hex, px, or font-family value the
  token file already carries. *(CSS-1, CSS-2, AC-BND-7)*
- **FR-SG-3** — The bundle carries a static **`styleguide.html`** rendering
  every token from `variables.css` visually: a labelled swatch per colour,
  including all nine values of the three tier sets (line, tint, and ink for
  each of Pass, Intermediate, and Advanced); a rendered sample of the radius
  and border style — drawn on the page, not only named in text; the font
  stack applied to sample text; the three coverage-cell states
  (full/partial/none); and the three completion states (complete, not yet,
  and the row tint) — exactly as they render on the real screens. It opens
  directly as a file, with no server and no dependency beyond the token file
  it reads.
- **FR-SG-4** — Both files ship as part of `bundle-template` (FR-BND-1) and
  are copied verbatim into every bundle `!NewUnit` creates — self-contained
  per bundle (FR-BND-2), never a symlink or a reference outside the bundle
  folder.
- **FR-SG-5** — **Vanilla only** — no framework, no bundler, no third-party
  library, no build tool. `styleguide.html` is plain HTML/CSS with no more
  than 40 lines of inline vanilla JS, in a single inline `<script>` block,
  to read and lay out the tokens. *(FR-SYS-8, AD-13a, mirrors FR-RESB-15)*
- **FR-SG-6** — A value added to or changed in AD-13c's table is transcribed
  into `variables.css` and `styleguide.html` in the **same revision** that
  changes AD-13c — the same currency discipline FR-GUIDE-4 states for the
  widget guide, applied to this file specifically, since `variables.css` is
  the one place a token's **definition** goes stale; every other stylesheet
  only references it by name via `var(--x)`, so it inherits whatever
  `variables.css` currently says.
- **FR-SG-7** — `styleguide.html` is **screen-only** — it carries no print
  stylesheet; the six real parts already carry the project's print
  discipline (resolves `OQ-SG-1`).
- **FR-SG-8** — `styleguide.html` is a **build-time reference**, opened
  directly from the bundle folder — no link to it exists anywhere in a
  running bundle's app shell (resolves `OQ-SG-2`).

**Acceptance criteria**

- **AC-SG-1** — Every colour, radius, border, and font-stack value in
  `variables.css` matches AD-13c's table exactly, checked entry by entry.
  *(FR-SG-1, mirrors AC-BND-7 — this build is what makes AC-BND-7 pass.)*
- **AC-SG-2** — Grepping every CSS file in a generated bundle for a raw hex
  colour (`#[0-9a-fA-F]{3,6}`) outside `variables.css` returns nothing.
  *(FR-SG-2)*
- **AC-SG-3** — `styleguide.html` opens directly from the filesystem (no
  server) and renders all tokens with no console error and no missing
  swatch — every token in `variables.css`, including the completion row
  tint (`#F4FAF6` in AD-13c's table), has a corresponding entry on the
  page.
- **AC-SG-4** — A unit created via `!NewUnit` carries its own
  `variables.css` and `styleguide.html`, byte-identical to
  `bundle-template`'s copies at generation time.
- **AC-SG-5** — `styleguide.html` contains zero `<script src=` tags pointing
  outside the bundle and zero references to a CDN or package manager.
  *(FR-SG-5)*

## 4. Prerequisites & dependencies

- **Required first:** AD-13c's token table (already settled, rev 12) —
  this build transcribes it, it does not derive it. `bundle-template` — this
  build's two files are part of that template, not a standalone artefact.
- **Choose-one:** none.
- **Coordinate-with:** any build that ships its own CSS (every part) —
  confirm at that build's start that it references `var(--x)` from this
  file rather than a literal value, per FR-SG-2. Also `WidgetGuide.md`
  (FR-GUIDE-3, point 3) — the guide's visual-vocabulary section and this
  build's `styleguide.html` describe the same table from two different
  angles (narrative vs. rendered); a change to one that isn't reflected in
  the other is exactly the drift both FR-GUIDE-4 and FR-SG-6 exist to catch.

**Gate:** work may start immediately — AD-13c is already settled and
`bundle-template`'s shape is already frozen by earlier waves.

## 5. Decisions

- **AD-SG-1** — *Decision:* `variables.css` is a **static transcription**
  of AD-13c's table, written once and updated by hand when the table
  changes — never a build step or script that re-derives values from the
  mockups at generation time. *Rationale:* AD-13c's own Rejected section
  already ruled out exactly this ("reading twelve HTML files to extract a
  palette is exactly the kind of implicit, undocumented dependency SR-7
  exists to avoid"); a codegen step here would quietly reintroduce it one
  layer down. *Rejected:* a script that parses `_Mockups/*.dc.html` for
  `style="..."` values and emits `variables.css` — fragile (breaks the
  moment a mockup's inline style format changes) and reintroduces the exact
  dependency AD-13c closed.
- **AD-SG-2** — *Decision:* the StyleGuide is a **static reference page**,
  not an interactive token editor. *Rationale:* the values are already
  decided (AD-13c) and fixed project-wide; an editor would imply they're
  still open, and would need its own save/persist path this build has no
  reason to build. *Rejected:* a live token editor with colour pickers —
  solves a problem ("what if I want to tweak a colour") this project hasn't
  had since AD-13c settled the palette.
- **AD-SG-3** — *Decision:* tokens are **fixed project-wide**, not
  per-bundle. Every generated unit's `styleguide.html` and `variables.css`
  render identically. *Rationale:* AD-13c states the palette applies across
  the whole widget, not per subject or per teacher preference; a per-bundle
  override would fork the visual language the moment two units disagree.
  *Rejected:* a per-unit theme override field in `unit.json` — no request
  for this exists, and it would undermine AD-13c's "one settled record"
  premise the moment it's used once.

**Open questions**

- **OQ-SG-1** — ✅ **RESOLVED (2026-08-29).** Does `styleguide.html` need a
  print stylesheet, or is it screen-only (a devtools-adjacent reference,
  never handed to anyone)? *Resolved:* **screen-only** — nothing in
  FR-BND-9 or AD-13c asks for a printed style guide, and the six real
  parts already carry the project's print discipline; adding a print path
  here would be scope this build doesn't need. Spec'd as new **FR-SG-7**.
- **OQ-SG-2** — ✅ **RESOLVED (2026-08-29).** Should `styleguide.html` be
  reachable from inside a running bundle (a link from the app shell), or
  only opened directly from the bundle folder? *Resolved:* **directly from
  the folder** — it's a build-time reference, not a feature a teacher
  using the tool needs to find; revisit only if that assumption turns out
  wrong once units are in daily use. Spec'd as new **FR-SG-8**.

## 6. Risks

| Risk | Consequence | Mitigation | Proving test |
|---|---|---|---|
| A part's CSS hardcodes a hex colour instead of referencing the token | The one settled palette (AD-13c) drifts silently, part by part | FR-SG-2; grep check across the bundle | AC-SG-2 |
| AD-13c changes but `variables.css`/`styleguide.html` aren't updated | A generated bundle ships stale colours no one notices until printed | FR-SG-6 — same-revision currency rule | AC-SG-1 |
| `styleguide.html` grows a dependency "just for nicer swatches" | Breaks FR-BND-2's self-contained-bundle guarantee | FR-SG-5 — vanilla-only, no CDN/package manager | AC-SG-5 |
| `WidgetGuide.md`'s visual-vocabulary section and `styleguide.html` disagree | Two "canonical" descriptions of the same tokens, no way to tell which is current | Cross-referenced explicitly (§4 coordinate-with); both carry the same currency rule | AC-SG-1, AC-GUIDE-2 |

## 7. Plan

Not yet written — `style-guide.plan.md` is the next step once this spec is
reviewed, following the same spec-then-plan discipline as every other build
in this project.

## 8. Verification — definition of done

- [ ] All acceptance criteria AC-SG-1…5 demonstrated
- [ ] Every AD-13c token present in `variables.css`, entry by entry
- [ ] `styleguide.html` opens with no server and no console error
- [ ] Grep for a raw hex colour outside `variables.css` returns nothing
- [ ] Zero third-party dependencies; vanilla only (FR-SYS-8)
- [ ] A fresh `!NewUnit` bundle carries both files, matching the template

**On completion:** set Status to Done, `git mv` this spec and its plan to
[`_Done/`](_Done/), update [`_PLAN.md`](_PLAN.md), and re-check
[the project prerequisites gate](../_Spikes/CurriculumPreparation/CurriculumPreparation.prerequisites.spec.md).
