# document-shell — Plan

| Field | Value |
|---|---|
| **Date** | 2026-08-17 |
| **Spec** | [document-shell.build.spec.md](document-shell.build.spec.md) |
| **Wave** | 1 |

## Prerequisites

- Spike Q-2 returned a measured A4 print pass.
- Spike Q-2b returned a measured verdict on mixed-orientation printing.
- Project-file schema settled (shared with `local-store` — do not evolve it here).
- Gate G-2 closed: one artefact vs three on a shared shell.

## Steps

1. **Fix the page geometry — twice.** A4 portrait (210 × 297 mm) and A4
   landscape (297 × 210 mm) as two named geometries, each with its own margins,
   safe area and coordinate system. Not a rotation of the other. Write both
   down as constants before anything renders. *(FR-DS-1, FR-DS-1a, AD-DS-1)*
2. **Define the tier constants module** — three keys, three colours, one file,
   exported. Nothing else in the project may define them. *(FR-DS-6)*
3. **Build the page renderer:** data object → N sibling `<svg>` elements, one
   per page, at the document's declared orientation, named groups, readable
   ids. *(FR-DS-1, FR-DS-1a, FR-DS-7, AD-DS-2)*
4. **Build the control layer:** HTML form controls bound to the same data
   object, re-rendering on change. No SVG-side editing. *(FR-DS-2)*
5. **Write the print path:** `@page { size: A4 portrait|landscape }`, per-page
   break rules, forced colour-adjust, edit-view-only chrome hidden. Orientation is
   fixed per document (AD-DS-4). *(FR-DS-3, FR-DS-5, OQ-DS-2)*
6. **Strip the network:** inline all CSS and JS, system fonts only, verify zero
   requests. *(FR-DS-4, AD-DS-3)*
7. **Build two demo documents** using fixture content only — a 4-page portrait
   and a 1-page landscape. The print test subjects, and the proof the shell is
   content-blind. *(FR-DS-8)*
8. **Measure printed sheets in both orientations** — page count, page box in
   mm, margins, colour swatches against edit view. Record the numbers below.
   *(FR-DS-3, FR-DS-1a)*
9. **Demonstrate G-2's chosen packaging** — one document carrying both
   orientations, or two single-orientation documents. *(FR-DS-1a, AC-DS-7)*
10. **Add the image primitive** — draw a blob at x/y/w/h, plus the
    missing-source placeholder. Content-blind: no manifest, no file access.
    *(FR-DS-9)*
11. **Run the content-blindness grep** over the shell source, including
    curriculum vocabulary, and confirm zero third-party dependencies.
    *(FR-DS-8, FR-DS-10, INV-DM-10)*

## Verification

- [ ] **AC-DS-1** — portrait demo prints to 4 A4 pages, page box 210 × 297 mm *(step 8)*
- [ ] **AC-DS-1a** — landscape demo prints at page box 297 × 210 mm, same margin behaviour *(step 8)*
- [ ] **AC-DS-2** — control edit re-renders SVG with no reload *(step 4)*
- [ ] **AC-DS-3** — opens and renders identically with network disabled, cache cleared *(step 6)*
- [ ] **AC-DS-4** — print view tier colours match edit view swatches, both orientations *(step 8)*
- [ ] **AC-DS-5** — rendered SVG source is readable and structured *(step 3)*
- [ ] **AC-DS-6** — grep for `lesson` / `student` / `curriculum` / `outcome` / `vcaa` / `victoria` finds nothing outside comments and fixtures *(step 11)*
- [ ] **AC-DS-7** — G-2's chosen packaging demonstrated *(step 9)*
- [ ] **AC-DS-8** — image renders in edit view and in print view; missing source shows a placeholder *(step 10)*
- [ ] **AC-DS-9** — zero third-party dependencies *(step 11)*
- [ ] Tier constants defined in exactly one file *(step 2)*
- [ ] Print measurements recorded below, both orientations

## Measurements

> *Filled at step 8. Empty until the build runs.*

| What | Expected (portrait) | Measured | Expected (landscape) | Measured |
|---|---|---|---|---|
| Page count | 4 | — | 1 | — |
| Page box | 210 × 297 mm | — | 297 × 210 mm | — |
| Top/bottom margin | *(per step 1)* | — | *(per step 1)* | — |
| Left/right margin | *(per step 1)* | — | *(per step 1)* | — |
| Green swatch | *(per step 2)* | — | *(per step 2)* | — |
| Blue swatch | *(per step 2)* | — | *(per step 2)* | — |
| Orange swatch | *(per step 2)* | — | *(per step 2)* | — |
