# MiniWiki module

A self-contained, offline concept-map/knowledge-browser peer module for the Parser widget
family, mirroring `_modules/Spelling/`'s pattern: `createMiniWikiModule(options)` factory,
ES-module source bundled by a stdlib-only Python script, DEFAULT-OFF shell opt-in. Built
against `Specs/MiniWikiModule.spec.md`, from the approved mockup (`mockup/miniwiki-mockup.html`,
`mockup/NOTES.md`) and its stress test (`mockup/CONTENT-FIT-REPORT.md`).

## What it is

- A build-time extractor (`build/extract_articles.py`, stdlib only) that turns a cartridge's
  `*_content.md` outline-numbered source into a JSON array of article records — never
  hardcoded in JS.
- A runtime module (`src/*.js`) that renders: a Home page (generated category overview), a
  side menu (Home / All / Surprise me / categories / lazy-expansion tree), article pages with
  auto-linked prose, MLA references, and a "key search terms" copy-to-clipboard box.
- Role-aware rendering: `role:"section"` nodes (category headers, Logic's `2.1.0`
  category-description pattern) render as landing pages listing their children, never as
  stub articles.

## Public API

```javascript
import { createMiniWikiModule } from "./src/index.js";

const wiki = createMiniWikiModule({
  articles,        // Article[] — from a build/*.miniwiki.json, default []
  cartridgeId,     // default "default"
  cartridgeName,   // default "Mini-Wiki"
  document,        // for rendering; default globalThis.document
});

wiki.getArticle(id)          // -> Article | null
wiki.getTopLevel()           // -> Article[]
wiki.getAncestors(id)        // -> Article[] root-first
wiki.getChildren(id)         // -> Article[]
wiki.flatIndex()             // -> Article[] id-sorted (backs the "All" page)
wiki.search(query)           // -> Article[] title/lead substring match
wiki.randomArticleId()       // -> string | null
wiki.searchTerms(id)         // -> string[] deterministic key terms
wiki.references(id)          // -> string[] MLA-formatted, [] if nothing sourceable
wiki.copyToClipboard(text)   // -> Promise<boolean>
wiki.renderView(view, id, container, onNavigate)  // view: "home"|"all"|"article"
wiki.mount(navContainer, articleContainer, {onNavigate})  // wires the side menu + hash routing
```

## Rebuilding a cartridge's articles JSON

```
python3 build/extract_articles.py <Cartridge>/<Cartridge>_content.md --out <Cartridge>.miniwiki.json
```

Handles both real content dialects (Markdown-heading and bare flush-left outline lines,
sometimes mixed in one file — Logic does both). Folds Logic's `2.1.0`-style category
descriptions into their parent section. Stdlib only (PY-1/SR-2).

## Rebuilding the bundle (for shell integration)

```
python3 build/bundle_miniwiki.py    # writes dist/miniwiki.bundle.js
```

Mirrors `_modules/Spelling/build/bundle_spelling.py` exactly: concatenates `src/*.js` in
dependency order, strips `import`/`export`, wraps in an IIFE exposing
`window.createMiniWikiModule`. Run after any `src/*.js` edit and before
`_shell/build/assemble.py` on a cartridge with `miniwiki.enabled: true`.

## Wired into the shell (opt-in, DEFAULT OFF)

A cartridge's `config.yaml`:
```yaml
miniwiki:
  enabled: true
  articlesFile: "MyCartridge.miniwiki.json"   # relative to build/
  cartridgeName: "My Cartridge"                # optional; defaults to cartridge.name
```
`_shell/build/assemble.py` then embeds the bundle + the articles JSON (re-serialised as a
JSON array) and shows the `#miniwiki` panel. Absent or `false`: the panel stays
`display:none`, `MINIWIKI_ARTICLES` is `[]`, and the build is otherwise untouched — **verified
byte-identical** against Grammar's existing build with this change present in the shell but
`miniwiki` absent from Grammar's own `config.yaml` (md5 match, two consecutive `assemble.py`
runs).

## Decisions carried over from CONTENT-FIT-REPORT.md

1. **Free-form `body_html`, `characteristics`/`worked_example` optional** — ~60% of real
   articles have no discrete characteristics field; the extractor never assumes one.
2. **`role: "section" | "article"`** — category nodes with empty bodies render as landing
   pages; Logic's `2.1.0` category-description entries are folded into their parent, not kept
   as siblings.
3. **Tree virtualisation** — only top-level nodes render at rest; expanding reveals direct
   children only. Verified against the 155-article Biblical symbols and cross-references
   cartridge.
4. **Auto-link exclusion blocklist + collision rule** — the verbatim CONTENT-FIT-REPORT.md §4
   list (Style, Example(s), One–Twelve, Forty, One Thousand) plus a ≤4-char bare-word
   heuristic; a title colliding across two ids is dropped from the link catalogue entirely
   (documented in `src/autolink.js`'s header and `Specs/MiniWikiModule.spec.md` FR-4) —
   neither collided article gets auto-linked, rather than risk a wrong link.
5. **Build-time JSON only** — `MINIWIKI_ARTICLES` is always populated from a pre-built
   `*.miniwiki.json`; nothing is hardcoded in `src/*.js`.

## Luke's new requirements (6–9)

6. **Generated Home page** — `renderHome()` lists every top-level category with its own
   extracted `lead` sentence.
7. **Side menu order** — Home, All, Surprise me, then category links, then the tree.
8. **MLA references** — sourced only from the content file's YAML frontmatter
   (`title:`/`description:`/`provenance:`); omitted entirely when nothing is sourceable.
9. **Key search terms box** — deterministic (not an LLM at runtime), one-click
   copy-to-clipboard per term plus "Copy all", `navigator.clipboard` with an
   `execCommand("copy")` fallback for offline `file://` use.

## Extractor article counts (real content, this build)

| Cartridge | Articles |
|---|---:|
| Grammar | 78 |
| Logic | 91 |
| Rhetoric | 57 |
| Greek and Hebrew | 73 |
| Style | 24 |
| Tropes & symbols | 139 |
| Biblical Commentary | 24 |
| Biblical Theology | 29 |
| Systematic Theology | 36 |
| Interpretation | 54 |
| Story-tension | 23 |
| Biblical symbols and cross-references | 155 |
| Fact-checking | 0 (draft stub, no outline-numbered content — correctly produces zero, not an error) |

## Tests

```
node --test                                   # from _modules/MiniWiki/ — 22/22
python3 -m unittest test_extract_articles     # from _modules/MiniWiki/build/ — 9/9
```

```
tests/
  test-tree.mjs          — src/tree.js (ancestors, top-level, flat index, virtualisation)
  test-autolink.mjs       — src/autolink.js (exclusion list, collision rule)
  test-search-terms.mjs   — src/search-terms.js (determinism, stopwords)
  test-references.mjs     — src/references.js (MLA formatting, omission on empty)
  test-clipboard.mjs      — src/clipboard.js (navigator.clipboard + execCommand fallback)
  test-ui.mjs             — src/ui.js (home/article/section rendering, fake DOM)
  test-index.mjs          — src/index.js (mount/routing/navigation, fake DOM)
build/
  test_extract_articles.py — build/extract_articles.py (Python unittest: shape, role
                              classification, category-description folding, zero-entries guard)
```

The shared fake DOM (`_shell/tests/js/fake-dom.mjs`, SR-4 — not forked) gained three additive
fixes needed by this module's tests (class-selector matching, text-node-safe tree walking,
`innerHTML=` clearing children like a real DOM does) — verified not to regress Spelling's own
42/42 or the shell's own 5/5 suites.

## What was NOT verified

No live browser was available in this build environment (no browser tool access in this
subagent context). Verification instead relied on: the module's and extractor's own automated
tests (31/31 total), a Node-based functional smoke test running the actual bundled
`createMiniWikiModule` against real extracted Logic content through the shared fake DOM
(menu render, navigate, search terms, references, "All" index — all confirmed working), and
structural checks on the assembled demo cartridge HTML (well-formed doctype, all `__X__`
placeholders replaced, all `<script>` blocks parse via Node's `Function` constructor, expected
DOM id/class markers present, embedded article count and shape correct). Interactive
CSS layout (tree collapse animation, mobile drawer, hover states) was not visually confirmed.
