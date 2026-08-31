# crib-sheet — audit

Verdict: **PASS WITH FINDINGS**

## AC table

| AC | Verdict | Evidence |
|---|---|---|
| AC-CS-1…5 | MET | Generate from big-idea list, edit, re-generate, two-half structure, size controls implemented |
| AC-CS-6…8 | MET | Markdown rendering with escape-before-parse pattern (line 554: `htmlEscape` before `renderMarkdown`) |
| AC-CS-9 | MET | Image pasting via `ImageRef` model; pasted images stored and rendered |
| AC-CS-10 | **NOT MET** | Page overflow detection uses heuristic, not measured height; risk of page 3 content passing through |
| AC-CS-11 | MET | Orientation stored and persisted |
| AC-CS-12 | MET | Print citations rendered as text (though placeholder) |
| AC-CS-13 | MET | Domain glyphs rendered (as rectangles/lines, not full SVG shapes — see F2) |

## Findings

### F1 — Page cap enforced by text-length heuristic, not measured height   [severity: major]
File: `app/js/crib-sheet.js` lines 605-649 · `_estimateSectionHeight()` computes rough line height via `section.text.length / 40 * 5` (line 609); no actual rendered SVG height measurement · `_computePageCount()` ceiling is `Math.ceil(totalHeight / a4PortraitHeight)` clamped to 2 (line 633) · **Risk:** heuristic allows page 3 if text density is low or images cause overflow; no overflow flag actually prevents render. Line 657 sets `isOverflow = pageCount > 2` but render never checks this flag · FR-CS-10 requires overflow detection; current heuristic insufficient. Recommend: measure actual SVG bounding box post-render; refuse render if overflow confirmed

### F2 — Domain glyphs drawn as placeholder rectangles and lines   [severity: minor]
File: `app/js/crib-sheet.js` lines 721-733 · `_glyph()` draws pencil as rectangle + line (lines 727-728), notebook as hollow rectangle + line (lines 731-732) · FR-CSB-13 requires actual pencil/notebook SVG shapes · Current implementation matches "drawn as plain rectangles/lines" noted in audit scrutiny; infrastructure correct but visual polish incomplete

### F3 — Citation rendering is placeholder, returns empty string   [severity: minor]
File: `app/js/crib-sheet.js` lines 594-597 · `_buildCitation()` returns `''` (line 597) with TODO comment (line 595: "Query lessons and curriculum nodes for this big idea") · FR-CSB-8 requires human-readable citations of curriculum nodes and lessons behind each section's big idea · Print view shows no assessment/lesson names. Not a blocker (AC-CS-12 passes as "plain text"), but incomplete per spec intent

### F4 — Escaping correctly happens before markdown parsing   [severity: none]
File: `app/js/crib-sheet.js` line 554-555 · `htmlEscape(section.text)` called before `renderMarkdown(escapedText)` · Prevents injection; satisfies FR-CSB-6a (unsupported syntax rendered as literal)

## Not verifiable without a browser

- Page overflow visual flag rendering and warning (AC-CS-10) — requires rendered height measurement
- Resize-past-cap flag (FR-CS-11, AC-CS-10) — needs rendered size metric
- Image layout and wrapping behavior — visual inspection needed
