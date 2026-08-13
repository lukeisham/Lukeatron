# MiniWiki module

A shared, offline concept-map / reference-wiki module for the Parser
widget family. Any cartridge can opt in via `miniwiki.enabled: true` in
its `config.yaml`; Grammar and every cartridge that omits the block is
byte-for-byte unaffected. Built against `Specs/MiniWikiModule.spec.md`
and the approved mockup at `mockup/miniwiki-mockup.html` /
`mockup/NOTES.md`; the field-shape decisions it required are recorded in
`mockup/CONTENT-FIT-REPORT.md`.

## What it is

- A build-time extractor (`build/extract_articles.py`, stdlib-only) that
  turns a cartridge's outline-numbered `*_content.md` source into an
  ARTICLES JSON — never hardcoded article data in JS.
- A runtime module (`src/index.js`'s `createMiniWikiModule(options)`)
  that renders a home page, a lazily-expanding tree + flat index + random
  article, article pages with auto-linked prose, MLA-style references,
  and a deterministic "key search terms" copy box.
- **Opens as a separate browser tab, not an in-page panel** (see
  *Open mode*, below) — the parser page carries one launch button.

## Public API

```javascript
import { createMiniWikiModule } from "./src/index.js";

const wiki = createMiniWikiModule({
  articles,        // Article[] — build/extract_articles.py's output, as an array
  cartridgeId,      // string, default "default"
  cartridgeName,    // string, default "Mini-Wiki"
  document,         // for DOM functions only; default globalThis.document
});

wiki.getArticle(id)          // -> Article | null
wiki.getTopLevel()           // -> Article[] (top-level nodes)
wiki.getAncestors(id)        // -> Article[] root-first
wiki.getChildren(id)         // -> Article[]
wiki.flatIndex()             // -> Article[] id-sorted (the "All" page)
wiki.search(query)           // -> Article[] title/lead substring match
wiki.randomArticleId()       // -> string | null ("Surprise me")
wiki.searchTerms(id)         // -> string[] (requirement 9)
wiki.references(id)          // -> string[] MLA-formatted (requirement 8)
wiki.copyToClipboard(text)   // -> Promise<boolean>

wiki.renderView(view, id, container, onNavigate)  // view: "home"|"all"|"article"
wiki.mount(navContainer, articleContainer, opts)  // wires side menu + hash routing
```

`Article` shape (per the fit report, model decisions 1/2/5):
```
{ id, title, level, role: "section"|"article", lead, body_html,
  characteristics?, examples?, worked_example?, parent, children,
  siblings, references? }
```

## Open mode: a new browser tab, not a panel

Luke's explicit correction during build: the wiki is **not** an in-page
panel. The parser page shows one toolbar button ("Mini-Wiki"); clicking
it builds the wiki as a complete, self-contained HTML document at
runtime and opens it in a new tab via `Blob` + `URL.createObjectURL` +
`window.open`, falling back to `window.open("") + document.write()` if
the Blob path throws. If the browser blocks the pop-up (`window.open`
returns `null` either way), the parser page shows an inline "allow
pop-ups" message rather than failing silently — it never assumes the
tab opened. The new tab keeps its own hash routing (`#/1.1.1`) and
history, independent of the parser tab.

This is why the module's compiled JS is embedded into a cartridge build
**twice over**, conceptually: once as the bundle that would define
`window.createMiniWikiModule` if executed directly, and — because
`window.open()` creates a separate JS realm that cannot share a closure
with the opener — as a **string constant** (`MINIWIKI_BUNDLE_SRC`, set by
`_shell/build/assemble.py`) that `_shell/src/miniwiki-seam.js` re-injects,
verbatim, into the new tab's own `<script>` tag when it builds that tab's
document. Everything still lives in the one on-disk cartridge HTML file
— nothing is written to a second file, and the whole flow works from
`file://` (Blob URLs are a pure Streams/File-API construct, not gated by
origin).

## Build-time extractor

```bash
python3 build/extract_articles.py <Cartridge>_content.md --out <cartridge>.miniwiki.json --cartridge-id <id>
```

Reads either content-source dialect the eleven Parser cartridges actually
use (see `mockup/CONTENT-FIT-REPORT.md` §1/§6): a flat outline line
(`1.1 Title` flush-left + indented body + optional `Example:` line — Logic,
Grammar, Interpretation, …) or a real Markdown heading dialect
(`### 1.1 Title` + `**Key characteristics:**` / `**Worked example:**`
marker paragraphs + `- ` bullet examples — Rhetoric, …); both can occur in
one file. YAML frontmatter's `title`/`description`/`provenance` fields
become the article's MLA reference (requirement 8) — omitted, never
fabricated, when a file has none. Logic's `2.1.0`-style category
description entries (fit report CRITICAL fix #1) are folded into their
parent section's own body rather than kept as a sibling node.

Verified against the real content — article counts:

| Cartridge | Articles |
|---|---:|
| Logic | 91 |
| Rhetoric | 57 |
| Interpretation | 54 |
| Greek and Hebrew | 73 |
| Style | 24 |
| Story-tension | 23 |
| Biblical Commentary | 24 |
| Biblical Theology | 29 |
| Systematic Theology | 36 |
| Tropes & symbols | 139 |
| Biblical symbols and cross-references | 155 |
| Grammar (`Grammar_contents.md`) | 78 |

## The five model decisions (all implemented)

1. **Free-form body, optional characteristics/worked-example.** `body_html`
   is always present (possibly empty for a pure category node);
   `characteristics`/`worked_example`/`examples` are only set when the
   source actually has them — absent in roughly 60% of real articles, per
   the fit report.
2. **`role: "section"|"article"`.** A node with children and an empty
   body renders as a landing page listing its children
   (`ui.js`'s `renderSectionPage`), never a stub with empty sections.
   Logic's `2.1.0` pattern is handled at extraction time (folded into its
   parent), so the UI never has to special-case it.
3. **Lazy-expansion tree, no eager full render.** `tree.js`'s
   `visibleNodes`/`getChildren` + `ui.js`'s `renderTree` render only
   top-level nodes at rest; expanding one reveals just its direct
   children. Verified: at 155 articles (Biblical symbols and
   cross-references), the tree renders **7 DOM nodes at rest**.
4. **Auto-link exclusion list + collision rule.** `autolink.js`'s
   `EXCLUDED_TITLES` is the fit report §4 list verbatim (Style, Example(s),
   One–Twelve, Forty, One Thousand) plus a generic "single word, ≤4 chars"
   heuristic; `buildLinkCatalogue` drops BOTH sides of any title collision
   entirely rather than risk linking to the wrong article.
5. **Articles come from the build-time JSON only.** Nothing in `src/`
   hardcodes an article; `_shell/build/assemble.py`'s
   `embed_miniwiki_articles()` reads a cartridge's pre-built
   `*.miniwiki.json` and serialises it as the `MINIWIKI_ARTICLES` array
   the module is constructed with.

## Luke's additional requirements (all implemented)

6. **Generated home/landing page** (`ui.js`'s `renderHome`) — top-level
   categories + their lead sentences, computed from `tree.js`'s
   `getTopLevel`, never hand-written.
7. **Side menu**: Home, All, Surprise me, then top-level category links,
   with the lazy tree beneath (`ui.js`'s `renderSideMenu`).
8. **MLA-style references**, sourced only from the content file's
   frontmatter (`references.js`'s `formatReferences`/`formatMlaReference`),
   omitted entirely — never fabricated — when nothing is sourceable.
9. **Key search terms box**, visually distinct, at the foot of every
   article page (`search-terms.js`'s `generateSearchTerms` — a
   deterministic weighted-term scorer, title > ancestor titles >
   capitalised/technical body words, minus a stopword list; NO LLM at
   runtime, same output for the same input every time). Each term is
   one-click copy (`clipboard.js`, `navigator.clipboard` with a
   `document.execCommand` fallback, offline from `file://`), plus a
   "copy all" affordance.

## Non-Latin script

The Greek and Hebrew cartridge's font fallback lives in `src/styles.js`'s
`MINIWIKI_CSS`, scoped to `[data-mw-cartridge="Greek and Hebrew"]`:
`"Noto Serif Greek", "SBL BibLit", "Noto Sans Hebrew", "Times New Roman", serif`.

## Rebuilding the bundle

```bash
python3 build/bundle_miniwiki.py     # writes dist/miniwiki.bundle.js
```

Mirrors `_modules/Spelling/build/bundle_spelling.py` exactly (SR-4/SR-6):
concatenates `src/*.js` in dependency order, strips `import`/`export`,
wraps in an IIFE assigning `window.createMiniWikiModule`. Run after any
`src/*.js` edit, before `_shell/build/assemble.py` on a cartridge with
`miniwiki.enabled: true`.

## Cartridge manifest fields

```yaml
miniwiki:
  enabled: true                          # default OFF
  articlesFile: "logic.miniwiki.json"    # path relative to build/, extract_articles.py's output
  cartridgeName: "Logic Mini-Wiki"       # optional, default cartridge.name
```

## Tests

`node --test tests/*.mjs` — 23/23 passing (Node v26.0.0, `node:test` +
`node:assert/strict` only, TEST-1). No jsdom: `tests/test-ui.mjs` and
`tests/test-index.mjs` reuse the shared hand-built fake DOM at
`_shell/tests/js/fake-dom.mjs` (TEST-8, SR-4 — extended, not forked, to
add class-selector support and a `doc.head`, for this module's genuine
new need over Spelling's original consumer). `tests/test_extract_articles.py`
(stdlib `unittest`, TEST-1) covers the Python extractor: article shape,
the `2.1.0`-folding rule, section-vs-article role classification, both
content dialects, and reference sourcing/omission.

```
tests/
  test-tree.mjs             — src/tree.js
  test-autolink.mjs         — src/autolink.js (exclusion list + collision rule)
  test-search-terms.mjs     — src/search-terms.js (determinism)
  test-references.mjs       — src/references.js (MLA formatting, never fabricates)
  test-clipboard.mjs        — src/clipboard.js (clipboard API + execCommand fallback)
  test-ui.mjs               — src/ui.js (fake DOM)
  test-index.mjs            — src/index.js (mount/routing)
  test_extract_articles.py  — build/extract_articles.py
```

## Known limitations

- The extractor treats Rhetoric's inline Markdown tables (fit report §10,
  MEDIUM severity) as plain body prose rather than parsing them into
  `<table>` markup — noted, not fixed, in the interest of the CRITICAL/HIGH
  fixes the fit report actually gated integration on.
- `copyToClipboard`'s `navigator.clipboard` and `document.execCommand`
  fallback can both be denied by a sandboxed/headless browser's permission
  policy (observed during verification); the UI reports "Copy failed"
  rather than throwing in that case — this is the intended graceful
  degradation, not a bug, and it succeeds under normal user-permission
  browsing.
