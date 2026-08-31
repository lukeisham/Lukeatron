# Build-run brief — read this first

Repo root: `/Users/lukeishammacbookair/Library/CloudStorage/Dropbox/_Lukeatron`
Widget: `System/Widgets/CurriculumPreparation`
Target code tree: `System/Widgets/CurriculumPreparation/_template/` (AD-18's bundle skeleton)

## Authorities, in order
1. The build's own `_Builds/<name>.build.spec.md` — the contract. Implement it, all of it, nothing beyond it.
2. `_research/arch-digest.md` · `_research/datamodel-digest.md` · `_research/style-digest.md` ·
   `_research/conventions-digest.md` — pre-digested project research. Read the ones your build touches
   instead of re-reading the 14k lines of source spec.
3. `Memory/Long-Term/Coding/vibe-coding-rules.md` — binding on every file (AD-13a). No dependency,
   no framework, no build step, no `!important`, Python stdlib only, vanilla ES modules only.
4. Source specs (`_Spikes/CurriculumPreparation/*.spec.md`) — consult only where a digest is silent.

## Boss decisions (Opus) — binding, settle spec gaps the specs left open
- **AD-BOSS-1 · IDs.** `<prefix>-<8 lowercase hex>`, generated once, persisted, never regenerated.
  Prefixes: `node- topic- bi- les- ua- mini- crib- res- ri- crit- mtx- stu-`. One shared function
  `newId(prefix)` in `app/js/ids.js`, using `crypto.getRandomValues`. Images keep the datamodel
  spec's own 32-hex `Image.id` and `img-NNNN.ext` filename.
- **AD-BOSS-2 · Dates.** `meta.dateCreated` / `meta.dateModified` are ISO-8601 UTC
  (`new Date().toISOString()`), written by `local-store` on every save. Teacher-typed dates are
  plain `YYYY-MM-DD` strings stored verbatim.
- **AD-BOSS-3 · Image deletion.** Deleting an image still referenced by any `ImageRef` is REFUSED,
  never cascaded; the UI names the parts holding the reference. Fails closed.

## Scope of this run
20 of 21 subtasks. **`curriculum-ingest` is NOT built** — gate G-9 is open pending Q-1, which needs
real curriculum text Luke has not supplied. Any build that names it as a prereq proceeds as if
G-9 dropped it (nodes are entered by hand via `curriculum-editor`).

## Non-negotiables every build is checked against
- No stub or placeholder file for anything another build owns (AD-BT-1).
- No curriculum-specific name in any field, enum, filename or rendered string (INV-DM-10) —
  `vcaaCode` is a bug.
- Forward-reference fields are stored from the start, even before the build that reads them exists.
- Python owns all filesystem I/O; the browser reaches the disk only through `bundle-server` (AD-13).
- Tier constants and print `@page` CSS live in `document-shell` alone; CSS tokens in `style-guide`
  alone. Nobody hardcodes what a token holds (CSS-2).
- `innerHTML` is never used with store text (JS-6). Escape everything interpolated (HTML-6).
- Tests: stdlib only (`unittest`, `node:test`), smoke-level, in `tests/` mirroring the source tree.

## AD-BOSS-4 · CSV export leaves by browser download, not a server write
`csv-export`'s FR-CSV-8 asks for a coordinated `bundle-server` endpoint. Building one forces a
new top-level `exports/` folder into AD-18's frozen tree (FR-BT-8 forbids that without amending
`bundle-template`'s spec). Decision: the browser builds the CSV text from marking-matrix's
already-computed scores and hands it to the user as a Blob download. **No new endpoint, no new
folder, no bundle file written** — so AD-13's tier boundary is untouched (nothing is written
inside the bundle; the browser is not reaching the filesystem). `bundle-server` adds nothing.
This is a deliberate deviation from FR-CSV-8 as written and is raised in the closeout for Luke
to confirm or overturn.
