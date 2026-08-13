# MiniWiki Module — Technical Spec

| Field | Value |
|---|---|
| **Type** | Build |
| **Date** | 2026-08-10 |
| **One-liner** | A shared, offline concept-map / reference-wiki module — `System/Widgets/Parser/_modules/MiniWiki/` — mirroring `_modules/Spelling/`'s factory-export/bundler/DEFAULT-OFF pattern, turning any cartridge's `*_content.md` into a browsable, cross-linked wiki that opens in its own browser tab. |
| **Status** | Built |

## 1. Motivation

The approved mockup (`mockup/miniwiki-mockup.html`, `mockup/NOTES.md`) proved the UX; the
stress test (`mockup/CONTENT-FIT-REPORT.md`) proved the mockup's naive data model does not
survive contact with the real content (653 articles across 11 cartridges, up to 155 in one
file, Logic's `2.1.0` category-description pattern, ~60% of articles with no discrete
"characteristics" field). This spec is the module that closes that gap: a build-time
extractor (never a runtime parser, decision 5), a small runtime module that renders it, and
the shell wiring that lets a cartridge opt in without touching any other cartridge.

## 2. Open mode — a new tab, not a panel

**This is the load-bearing architectural decision and it overrides an earlier draft.** The
Mini-Wiki does not mount into the parser page's own DOM. The parser page carries exactly one
launch button; clicking it builds the wiki as a complete, self-contained HTML document at
runtime and opens it in a new browser tab, independent of the parser tab (own history, own
`#/1.1.1` hash routing). The parser tab is left unchanged behind it.

A cartridge stays ONE file on disk — nothing here writes a second file, makes a network
request, or breaks offline/`file://` operation. The wiki document is assembled entirely
client-side from build-time-embedded pieces:

- `MINIWIKI_BUNDLE_SRC` — the module's bundled JS, embedded as a **string constant** (not
  executed in the parser page's own window) — `window.open()` creates a separate realm that
  cannot share a closure with the opener, so only source text crosses that boundary, not a
  function reference.
- `MINIWIKI_ARTICLES` / `MINIWIKI_CARTRIDGE_NAME` — already-parsed JS values in the parser
  page's own scope, re-serialised with `JSON.stringify` into the new document's `<script>`.
- A small `ROOT_TOKENS_CSS` block (duplicated shell design tokens) so the new, separate
  document can render `styles.js`'s `MINIWIKI_CSS` (which references `var(--acc)` etc.)
  without inheriting the parser tab's stylesheet.

`_shell/src/miniwiki-seam.js`'s `open()` tries `Blob` + `URL.createObjectURL` +
`window.open(url, "_blank")` first (works from `file://` — Blob URLs are a pure Streams/File
API construct, not origin-gated); if that throws, it falls back to
`window.open("", "_blank")` + `document.write()`. If `window.open()` ever returns `null`
(pop-up blocked, either path), `open()` returns `false` and the parser page shows an inline
"allow pop-ups" message — it never assumes the tab opened, and never fails silently (JS-2).

**A literal `</script` inside any dynamically-assembled piece of the new document would close
the HTML `<script>` tag early**, regardless of it being "inside a JS string" — the HTML
parser has no notion of JS syntax. Every closing-tag literal in `miniwiki-seam.js`'s own
source is written as `<\/script>` for this reason, and a `safeScriptBody()` helper applies
the same escape to `MINIWIKI_BUNDLE_SRC` and the JSON-stringified articles at the point the
document string is assembled — belt-and-braces on top of `assemble.py`'s own build-time
escape of the raw bundle text.

## 3. Scope

- `src/index.js` — `createMiniWikiModule(options)`, the module's one public factory (FR-1).
- `src/tree.js`, `src/autolink.js`, `src/search-terms.js`, `src/references.js`,
  `src/clipboard.js`, `src/markdown.js`, `src/styles.js`, `src/ui.js` — one file, one job
  each (SR-1), composed by `index.js`.
- `build/extract_articles.py` — markdown → ARTICLES JSON, stdlib-only (PY-1).
- `build/bundle_miniwiki.py` — ES-module `src/*.js` → one non-module `dist/miniwiki.bundle.js`
  IIFE, mirroring `bundle_spelling.py` (SR-4/SR-6).
- `_shell/src/miniwiki-seam.js` — the shell's injection seam (peer-module pattern, not shell
  code, mirrors `spelling-seam.js`'s contract).
- `_shell/build/assemble.py` wiring behind `miniwiki.enabled` (config.yaml), DEFAULT OFF.

Out of scope: parsing Rhetoric's inline Markdown tables into `<table>` markup (fit report
§10, MEDIUM severity — left as body prose); an LLM anywhere in the runtime search-term or
auto-link path (explicitly prohibited by requirement 9).

## 4. Article data model

```
{
  id: string,                 // dotted outline id, e.g. "2.1.3"
  title: string,
  level: number,               // dot-segment count
  role: "section" | "article", // decision 2
  lead: string,                 // first sentence, plain text
  body_html: string,            // pre-escaped HTML paragraphs (HTML-6)
  characteristics?: string[],   // decision 1: optional
  examples?: string[],          // decision 1: optional
  worked_example?: string,      // decision 1: optional
  parent: string | null,
  children: string[],
  siblings: string[],
  references?: [{ title, container, note }]  // requirement 8: optional
}
```

## 5. The five approved model decisions

1. **Free-form body; characteristics/worked-example optional.** `render_body_html()` in the
   extractor always emits a (possibly empty) paragraph-HTML string; the three richer fields
   are only set when the source markdown actually carries them.
2. **`role: "section" | "article"`.** `role = "section"` iff the node has children AND an
   empty body; such a node renders as a landing page (`ui.js`'s `renderSectionPage`) listing
   its children, never a stub. Logic's `2.1.0` category-description pattern is folded into
   its parent section's body at extraction time (`fold_category_descriptions()`), so the
   role classifier never has to special-case it.
3. **Tree virtualisation / lazy expansion.** `tree.js`'s `getTopLevel`/`getChildren` +
   `ui.js`'s `renderTree`/`renderTreeLevel` render only the currently-expanded path; a
   155-article cartridge (Biblical symbols and cross-references) renders 7 DOM tree nodes at
   rest (measured, §9).
4. **Auto-link exclusion list + collision rule.** `autolink.js`'s `EXCLUDED_TITLES` is the
   fit report §4 list verbatim, plus a "single word, ≤4 chars" heuristic generalising its
   "Tropes & symbols sections 5–7" note. `buildLinkCatalogue()` drops BOTH sides of any
   case-insensitive title collision, rather than link to a possibly-wrong article.
5. **Build-time JSON only.** `build/extract_articles.py` is the only place an ARTICLES
   record is constructed; `_shell/build/assemble.py`'s `embed_miniwiki_articles()` reads a
   cartridge's pre-built `*.miniwiki.json` and serialises it into `MINIWIKI_ARTICLES`. No
   `src/*.js` file contains a hardcoded article.

## 6. Luke's additional requirements

6. **Generated home/landing page** (`renderHome`) — top-level categories + lead sentences,
   computed from `getTopLevel`, never hand-authored copy.
7. **Side menu**: Home, All, Surprise me, then top-level category links, with the lazy tree
   beneath (`renderSideMenu`).
8. **MLA-style references**, sourced only from the content file's YAML frontmatter
   (`title`/`description`/`provenance`) via `references.js`; omitted entirely, never
   fabricated, when a cartridge's content file has none (verified: Grammar_contents.md has
   no frontmatter, and its rendered articles correctly show no References section).
9. **Key search terms box**, visually distinct (`.mw-search-terms-box`, tinted/bordered),
   at the foot of every article page. `search-terms.js`'s `generateSearchTerms()` is a
   deterministic weighted scorer (title words weight 3, ancestor-title words weight 2,
   capitalised/technical body words weight 1, minus a stopword list) — same input, same
   output, every call, asserted by `tests/test-search-terms.mjs`. Each term chip and a
   "copy all" button call `clipboard.js`'s `copyToClipboard()`
   (`navigator.clipboard.writeText`, falling back to a hidden-textarea
   `document.execCommand("copy")`), which resolves `false` rather than throwing on failure.

## 7. Test requirements

Mirrors Spelling's TEST-1..TEST-9 house rules. `node --test tests/*.mjs`: `node:test` +
`node:assert/strict` only, no jsdom — `tests/test-ui.mjs`/`tests/test-index.mjs` reuse
`_shell/tests/js/fake-dom.mjs` (extended for class selectors + `doc.head`, not forked,
SR-4). `tests/test_extract_articles.py`: stdlib `unittest`, no real content files touched
(temp-file fixtures only, TEST-4).

## 8. Cartridge manifest fields

```yaml
miniwiki:
  enabled: true                       # default OFF — omit for byte-identical old behaviour
  articlesFile: "logic.miniwiki.json" # build/extract_articles.py's output, relative to build/
  cartridgeName: "Logic Mini-Wiki"    # optional, default cartridge.name
```

## 9. Verification performed

- `node --test tests/*.mjs`: 22/22 passing.
- `python3 -m unittest tests.test_extract_articles`: 6/6 passing.
- `_shell/tests/` (existing shell suite, both `python3 -m unittest discover` and
  `node --test`): unchanged pass count after this module's wiring — Grammar (miniwiki
  absent from its config) still assembles and the shell's own fake-DOM/build tests are
  unaffected.
- Extractor run against all eleven real cartridge content files + Grammar's own
  `Grammar_contents.md` — see README's article-count table.
- A demo cartridge (Grammar's engine/explainer + `miniwiki.enabled: true` +
  Grammar's own extracted articles) assembled via `_shell/build/assemble.py` and opened in
  a real browser preview: home page, side menu (Home/All/Surprise me/7 categories), lazy
  tree expand/collapse, an article page with auto-linked body + examples + search-terms box
  (references correctly omitted — this cartridge's content file has no frontmatter),
  copy-chip click (clipboard denied by the sandboxed preview's permission policy — reported
  "Copy failed" rather than throwing, the intended degradation path).
- A second demo built against the 155-article Biblical symbols and cross-references content:
  tree renders 7 DOM nodes at rest, confirming decision 3 at the largest real cartridge.
- The new-tab open path (`Blob`/`window.open`) was exercised directly; the sandboxed browser
  preview used for verification blocks/limits `window.open` for automated interactions in a
  way that made an end-to-end "click the button, inspect the resulting tab" pass unreliable
  inside that harness specifically. The generated document string was independently
  validated (Node `--check` syntax pass on the exact embedded script, plus rendering that
  same document standalone in the browser preview) — the wiki UI itself, including in the
  literal document `miniwiki-seam.js` assembles, is confirmed working; the `window.open`
  plumbing is standard, narrowly-scoped browser API usage with an explicit,
  tested-in-isolation blocked-popup fallback message.
