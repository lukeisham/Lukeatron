# _samples — style reference sheet

**One subject, every style.** Each `.svg` here is the *same lion* drawn in one of the
24 styles in `../style-guide/`. Holding the subject constant is the point: every
visible difference between two files is the style doing the work, nothing else.

These are **reference material, not shipped output and not picker artwork.** The
picker's thumbnails live in `../style-guide/_index.md`; these samples are for
eyeballing what a style actually produces, and for checking that a style file's
stated Signature tells are really visible when drawn.

## Contents

| File | What it is |
|---|---|
| `<slug>.svg` | The lion in that style. `<slug>` matches the style's file in `../style-guide/<slug>.md`. |
| `contact-sheet.html` | All 24 side by side. Open it in a browser — it references the `.svg` files, so keep them together. |

Each `.svg` is standalone, self-contained (no external fonts, images or scripts),
100×100, opaque-background, and carries a `<title>`/`<desc>` — the same rules
`!SvgImage` applies to its own output.

## What these are good for

- **Picking a style** — see the real thing instead of matching a name from memory.
- **Testing a style file** — if a file's Signature tells aren't visible in its
  sample, either the drawing missed them or the tells are too vague. Both are
  worth fixing.
- **Checking neighbours** — the confusable pairs (Far Side / Punch, Ghibli /
  Miyazaki, the two Tuftes, the three posters) should be obviously distinct here.
  If two samples look alike, their tells are not discriminating.

## Known limits

Three styles cannot render a recognisable lion without breaking their own rules,
and their samples show that honestly rather than cheating:

- **Minimal logo** — the 2–5 primitive cap leaves a mark that reads as a lion only
  with a wordmark or a far cleverer device.
- **Isotype** — the pictogram is legible and countable but reads as a generic
  quadruped; a mane does not survive reduction to a repeated tiny silhouette.
- **Saul Steinberg** — one uniform contour on a mostly bare page carries the idea,
  not the species.

This is a real trade-off between subject recognisability and style fidelity, not a
defect in those three files. Treat it as a signal when choosing a style for a
subject that must be identifiable.

## Regenerating

These were hand-authored, not generated from the style files — there is no script
to re-run. To revise one, edit its `.svg` directly; to add a style, add a matching
`<slug>.svg` and a tile in `contact-sheet.html`.
