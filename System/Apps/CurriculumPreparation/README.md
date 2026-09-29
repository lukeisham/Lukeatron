# CurriculumPreparation

Promoted from `System/Widgets/CurriculumPreparation/` to a standalone app on 2026-09-29.

A unit-preparation tool for teaching: one self-contained, portable bundle per unit holding a
curriculum tree, big ideas, topics, lessons, a crib sheet, a resources page, a unit assessment and
a marking matrix — editable in the browser, printable to A4. It runs on a local Python server
inside its own folder, with no dependencies and no build step.

## Layout

- `_template/` — the current, editable bundle: run `python3 serve.py` inside it (or double-click
  `Start Unit.command`) to open it in a browser.
- `_test/` — a working copy used to try out in-progress refactor items before they land in
  `_template/`.
- `_TestData/` — seed scripts (`seed-testunit.py`, `seed-test-fake.py`) for populating a bundle
  with sample data, plus a real worked example (`vic-f10-v2-history`).
- `refactor-registry.md` — the running record of what has changed and what's in progress (R-#
  rows); read this before making further changes.
- `wishlist.md` — outstanding ideas not yet started.

This document only covers what moved and where; `refactor-registry.md` remains the authoritative
history of the widget's own build decisions predating this promotion.
