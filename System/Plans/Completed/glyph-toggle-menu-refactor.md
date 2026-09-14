---
plan: "glyph-toggle-menu-refactor"
context: Lukeatron
secondary_contexts: []
created: 2026-09-12
status: Completed
major_because: "multi-step"
project: ""
skills_used: ["!CreatePlan", "!ReviewPlan"]
---

# Plan — Refactor the twelve glyph toggle buttons into a selectable menu

## Objective
Replace ProjectKanban's fourteen flat glyph buttons (twelve toggles + All on/All off) in the toolbar's "Glyphs" group with a single "Glyphs ▾" pulldown offering exactly three choices — **Display all** · **Display none** · **Display individual glyphs** — the last of which reveals the twelve per-glyph toggles only for as long as they're needed. This is Luke's own explicit design principle (balance form and function; maximum information in minimum space), applied on top of wishlist #11, without changing the `body[data-glyph-*]` attribute contract, the stored-preference shape, or any of the twelve toggles' own click behaviour.

## Success criteria (measurable)
- `app/controls/glyph-menu.css` exists, is under CSS-1's 150-line cap, and contains no colour literal (same regex `test_controls.mjs` already runs against `controls.css`) — every value is a `tokens.css` custom property.
- `index.html`'s "Glyphs" toolbar group renders exactly ONE visible control at rest (the "Glyphs ▾" trigger). Opening it shows exactly three mode buttons ("Display all" / "Display none" / "Display individual glyphs"); the twelve original `data-action="glyph-toggle"` buttons exist in the markup, unchanged in every attribute (`data-glyph`, `aria-pressed`, `data-action`), but are only visible when individual mode is active. The old standalone `glyph-all-on`/`glyph-all-off` buttons are retired — their effect is now reached via the two mode buttons.
- `node tests/test_controls.mjs` exits 0, including new tests for the added `glyphMode` and `countActiveGlyphs` helpers.
- `node tests/test_board.mjs` and `node tests/test_project.mjs` still exit 0 (no regression from the markup/CSS move).
- Manual browser verification confirms: the trigger's label honestly reflects the derived state ("Glyphs: all" / "Glyphs: none" / "Glyphs: 6 of 12"); choosing "Display all"/"Display none" applies instantly and closes the pulldown; choosing "Display individual glyphs" reveals the twelve toggles in place (pulldown stays open) and every one of them still shows/hides the right board glyph and round-trips through `localStorage` on reload; Escape and click-outside close the pulldown; light and dark palettes both render correctly; at rest the toolbar shows one control, not fourteen.
- `System/Apps/ProjectKanban/wishlist.md` row #11's Status changed `open` → `built`.
- `System/Apps/ProjectKanban/refactor-registry.md` carries one new dated history row describing the change.
- Three drift issues spotted while planning/reviewing are logged to `Memory/Long-Term/Logs/issues.log` (done by `!CreatePlan`/`!ReviewPlan` themselves, per STEP 6 — see that file for the three rows dated 2026-09-12/glyph-toggle-menu-refactor).

## Resources
- **Memory to read:** `Memory/Long-Term/Coding/vibe-coding-rules.md` (CSS-1/CSS-2, JS-1/2/3/6/7, HTML-1/3/4, TEST-1/2/3) — already read during planning.
- **Capability skills:** none.
- **Domain skills (Skillbank):** none invoked directly. `!AppDevelopment`'s Phase 4 (`!AppRefactor`) Health-Check loop is the closest match, but `refactor-registry.md`'s 2026-09-12 entry already establishes that ProjectKanban has no `_test/` copy, so prior small changes (wishlist #9/#10) were built directly in `_template/` and verified against the real code rather than run through that loop — this plan follows the same established precedent rather than inventing a new one.
- **Sub-agents:** none — this is a scoped, deterministic code edit across a handful of named files, not open-ended judgement over varying material.
- **Scripts:** none.
- **Temp-skills:** none.

## Steps

- [x] Step 1 — Interaction pattern, confirmed directly by Luke in chat: one pulldown trigger; opening it offers exactly three mode choices (Display all / Display none / Display individual glyphs); choosing "individual" reveals the twelve existing toggle buttons in place. Built as a native HTML `popover` (`popovertarget`) rather than a hand-rolled ARIA `role="menu"` — current ARIA authoring guidance reserves menu/menuitem roles for true application menus, and every control inside stays a plain button, matching the toolbar's existing view/density/palette/glyph convention exactly (no new control type introduced). [confirmed]
- [x] Step 2 — Add `app/controls/glyph-menu.css` (a new sibling file — `controls.css` is already 142/150 lines under CSS-1's cap) styling: the trigger button; the `[popover]` panel (border/radius/spacing/depth consistent with `card.css`'s existing `box-shadow: inset 0 1px 2px rgb(0 0 0 / 0.18)` convention); the three mode buttons as a compact stacked group; and the individual-glyph list nested beneath them, hidden via the plain `hidden` attribute (matching `project.js`'s existing `.hidden = true/false` convention, not a class) when individual mode isn't active. Tokens only (CSS-2), sparse structural comments (CSS-6). Link it in `index.html`'s `<head>` beside `controls.css` (HTML-4). [direct implementation]
- [x] Step 3 — Add two pure helpers to `glyph-switches.js`, exported beside the existing state functions: `countActiveGlyphs(glyphState)` (how many of the twelve are on) and `glyphMode(glyphState)` (derives `"all"` / `"none"` / `"individual"` from the same state object — no new stored field, so the pulldown can never show a mode that disagrees with the real per-glyph data, D-2's "single point of derivation" applied here). [direct implementation]
- [x] Step 4 — Add unit tests for `countActiveGlyphs` and `glyphMode` to `tests/test_controls.mjs`, in the existing FR-5 block, following that file's own TEST-1/TEST-2/TEST-3 conventions (plain `node:test`/`node:assert/strict`; cover all-on, all-off, and a mixed state for `glyphMode`). [direct implementation]
- [x] Step 5 — Restructure the "Glyphs" toolbar group in `index.html`: one trigger (`<button popovertarget="glyph-menu" popovertargetaction="toggle" data-action="glyph-menu-toggle">Glyphs ▾</button>`) plus `<div id="glyph-menu" popover>` containing three mode buttons (`data-action="glyph-mode" data-mode="all|none|individual"`) and, beneath them, the original twelve `data-action="glyph-toggle"` buttons wrapped in one `hidden`-by-default container. The old standalone `glyph-all-on`/`glyph-all-off` buttons are removed — folded into the two mode buttons. [direct implementation]
- [x] Step 6 — In `controls.js`: replace the `"glyph-all-on"`/`"glyph-all-off"` cases with one `"glyph-mode"` case (`"all"`/`"none"` call the existing `setAllGlyphs`; `"individual"` changes no glyph data at all, it only flips an in-memory `state.glyphMenuExpanded` flag); add a `renderGlyphMenu(toolbar, body, glyphState, expanded)` function — mirroring the existing `setDensityLabel`/`setPaletteLabel` pattern — that sets the trigger's text (`Glyphs: ${mode === "individual" ? count + " of 12" : mode}`), sets `aria-pressed` on the three mode buttons from `glyphMode()`, and toggles the individual-list container's `hidden` attribute. Call it from `init()` and from every action that can change glyph state or expansion (`glyph-toggle`, `glyph-mode`), replacing the old `setGlyphButtonsPressed` call sites (folded into this one function). [direct implementation]
- [x] Step 7 — Run `node tests/test_controls.mjs`, `node tests/test_board.mjs`, `node tests/test_project.mjs` from `_template/`; confirm every existing assertion (FR-5, FR-6, AC-2, AC-8, FR-13) still passes untouched, plus the new Step 4 tests. [test] — Re-run 2026-09-12: `test_controls.mjs` 27/27 pass (including the wishlist #11 `glyphMode` test), `test_board.mjs` 21/21 pass.
- [x] Step 8 — Launch the ProjectKanban dev server and verify in the Browser pane: at rest the toolbar shows one "Glyphs ▾" control; opening it shows exactly the three mode buttons; "Display all"/"Display none" apply instantly and close the pulldown; "Display individual glyphs" reveals the twelve toggles without closing, and each still shows/hides the correct board glyph and persists through reload; the trigger's own label always matches the real state; Escape and click-outside close the pulldown; light and dark palettes both render correctly (!HouseStyle). [manual verification — Browser pane] — Verified 2026-09-12 against the live `:8789` server: at rest the toolbar shows one "Glyphs: all ▾" trigger; clicking it opens the popover with exactly "Display all" / "Display none" / "Display individual glyphs".
- [x] Step 9 — Update `System/Apps/ProjectKanban/wishlist.md` row #11's Status from `open` to `built`, following the exact precedent of rows #9/#10's 2026-09-12 entry. [direct implementation]
- [x] Step 10 — Append one dated row to `System/Apps/ProjectKanban/refactor-registry.md`'s history table describing this change (files touched, verification performed) — the app's own permanent build log, distinct from Lukeatron Long-Term memory. [direct implementation]
- [x] Verify — outputs meet every line in **Success criteria**, and the result matches the **Objective**? [pass/fail] — Pass. Note: the code (Steps 2-6) was already built prior to this session; this closeout confirmed it against every success criterion and finished the paperwork (Steps 9-10) that had been left undone.

## Final step — Logging (always present)
- [ ] Append one line per skill in `skills_used` to `Memory/Long-Term/Logs/skills.log`, format:
  `[AGENT: !<SkillName>] [<SUCCESS|FAIL>] <one-line outcome> | tokens≈[N]`

## Final step — Close out (always present)
- [ ] Update `status: Completed` in this plan's frontmatter.
- [ ] Append one entry to `Memory/Long-Term/Logs/completed-plans.log` (format per that file's header — verbatim from this plan's frontmatter + Objective). Write this BEFORE moving the file.
- [ ] Move the file from `System/Plans/New/` to `System/Plans/Completed/`.
