# MiniWiki Module — Complete Technical Dissection

**Source:** `/System/Widgets/Parser/_modules/MiniWiki/`  
**Date:** 2026-08-11

---

## 1. File-by-File Responsibilities

### Build Pipeline

#### `build/extract_articles.py`
- **Entry point:** `python3 extract_articles.py <content.md> --out <articles.json> --cartridge-id <id>`
- **Stdlib only** (PY-1/SR-2)
- **Parses two source dialects** in a single pass:
  - **Flat dialect** (Logic, Interpretation): outline line flush-left (e.g. `1.1 Title`), followed by indented body + optional `Example: "..."` line
  - **Heading dialect** (Rhetoric): ATX Markdown heading (e.g. `### 1.1 Title`) with `**Key characteristics:**` / `**Worked example:**` marker paragraphs and `- ` bullet example lists
  - Both can coexist in one file
- **Extracts YAML frontmatter** (`title`, `description`, `provenance`) from the head of the content file for MLA reference sourcing
- **Handles Logic's `2.1.0` pattern** (CRITICAL fix #1): category-description nodes (ids ending in `.0`) are folded into their parent section's body rather than kept as siblings
- **Outputs:** a JSON object keyed by article id (normalized dotted ids like `"1.1"`, `"2.1.3"`), where each article is `{id, title, level, role, lead, body_html, characteristics?, examples?, worked_example?, parent, children, siblings, references?}`

#### `build/bundle_miniwiki.py`
- **Entry point:** `python3 build/bundle_miniwiki.py [--out dist/miniwiki.bundle.js]`
- **Concatenates 15 source files** in dependency order (specified in `ORDER` list, lines 36–52)
- **Process:**
  1. Strips all `import {...} from "./x.js"` and `export {...}` lines using regex (JS module syntax removal)
  2. Collects `import` aliases (e.g. `import { foo as bar }`) and emits them as top-level `var bar = foo;` statements at the end
  3. Wraps entire concatenation in an IIFE: `(function(global) { ... global.createMiniWikiModule = createMiniWikiModule; })(window || globalThis)`
- **Output:** a single non-module script (`dist/miniwiki.bundle.js`), ~23KB unminified, ready to be embedded verbatim
- **No forward-only validation:** the bundler checks that every name in `ORDER` exists but does NOT check whether a `src/*.js` file exists and is NOT in `ORDER` — an orphaned file silently vanishes from the build (flagged as Low in REVIEW-vibe-rules.md concern #3)

### Source Files (src/)

#### `index.js` — Factory and Public API
- **Exports:** `createMiniWikiModule(options = {})` — the one public function
- **Options:**
  - `articles`: Article[] (build/extract_articles.py's output, as an array)
  - `cartridgeId`: string, default `"default"`
  - `cartridgeName`: string, default `"Mini-Wiki"`
  - `document`: DOM document for tests; default globalThis.document
- **Initializes:**
  - `articlesById`: id -> Article map (for O(1) lookup)
  - `linkCatalogue`: autolink.js's output (titles eligible for auto-linking)
  - `expandedIds`: Set, initially empty (tracks which tree nodes are expanded for lazy rendering)
- **Public API (returned object):**
  - `getArticle(id)` → Article | null
  - `getTopLevel()` → Article[] (root-level nodes)
  - `getAncestors(id)` → Article[] root-first, excluding id itself
  - `getChildren(id)` → Article[]
  - `flatIndex()` → Article[] id-sorted (backs "All" page)
  - `search(query)` → Article[] (title/lead substring match, case-insensitive)
  - `randomArticleId()` → string | null
  - `renderView(view, id, container, onNavigate)` → renders home|all|article to a DOM element
  - `mount(navContainer, articleContainer, opts)` → wires side menu + hash routing; returns `{navigate, showHome, showAll, showSurprise}`
  - `searchTerms(id)` → string[] (requirement 9)
  - `references(id)` → string[] MLA-formatted (requirement 8)
  - `copyToClipboard(text)` → Promise<boolean>
  - `cartridgeId`, `cartridgeName`: for data attributes
- **Key behaviors:**
  - `mount()` injects styles once via `<style data-miniwiki>`
  - `mount()` creates a shared popover element (audit gap #2) and delegates hover/focus handlers to the article container
  - `mount()` creates a mobile drawer toggle + scrim (audit gap #5) when navContainer has a parent
  - `routeFromHash()` silently redirects unknown ids to home (not yet calling the not-found renderer — dead code per REVIEW-vibe-rules.md concern #5)

#### `tree.js` — Tree Navigation (No DOM)
- **Exports:** `byIdNumeric`, `getAncestors`, `getTopLevel`, `flatIndex`, `getChildren`, `visibleNodes`
- **`byIdNumeric(a, b)`:** sort comparator for numeric dotted ids (e.g. 1.1 < 1.10 < 2.1)
- **`getAncestors(articlesById, id)`** → Article[] root-first, excluding id itself; walks up `parent` chain
- **`getTopLevel(articlesById)`** → Article[] with no parent, sorted by id
- **`flatIndex(articlesById)`** → every Article, id-sorted (backs "All" page, 155 articles on Biblical symbols)
- **`getChildren(articlesById, id)`** → direct children only, sorted by id (used by tree rendering and section page)
- **`visibleNodes(articlesById, expandedIds)`** → Article[] with depth tagging; implements lazy-expansion window (only top-level + children of expanded ids). **UNUSED** — ui.js re-implements this logic in `renderTreeLevel` instead (dead-code finding in REVIEW-vibe-rules.md concern #2)

#### `autolink.js` — Auto-linking with Exclusions and Collision Rule
- **Exports:** `EXCLUDED_TITLES`, `isExcludedTitle`, `buildLinkCatalogue`, `autolinkHtml`
- **`EXCLUDED_TITLES`:** hardcoded Set of titles never to auto-link (model decision #4, fit report §4): `["style", "example", "examples", "one"–"twelve", "forty", "one thousand"]`, all lowercased
- **`isExcludedTitle(title)`** → true if title must never be linked, including the generic heuristic: single word ≤4 chars (e.g. "If", "then")
- **`buildLinkCatalogue(articlesById)`** → `[{id, title}]` sorted longest-title-first
  - **Collision rule:** if two different ids have the same (case-insensitive) title, BOTH are excluded from the catalogue entirely — a mention is never auto-linked to either article, preventing silent wrong links
  - This allows merging multiple cartridges into a single wiki instance
  - Returns empty list if no linkable titles exist
- **`autolinkHtml(html, catalogue, selfId)`** → html with auto-linked titles
  - **Safety:** operates on already-escaped HTML (from extract_articles.py's `escape_html`)
  - Only rewrites text runs **between** existing tags, never introduces raw text outside a tag (JS-4 escaping discipline)
  - Each title is matched only once per text run (via `linked` Set to avoid duplicate links)
  - Uses whole-word matching: `\b...\b` with case-insensitive flag
  - Wraps matched text in `<a class="wikilink" href="#/<id>" data-article-id="<id>">...</a>`

#### `ui.js` — Page Rendering (323 lines, no split)
- **Single responsibility:** renders all MiniWiki pages (home, all, article, section) and the side menu
- **Helper:** `el(doc, tag, className, text)` — creates a single element
- **Side menu** (`renderSideMenu`):
  - Top: Home, All, Surprise me links (requirement 7)
  - Categories section: top-level articles (from `getTopLevel`)
  - Browse section: lazy tree (from `renderTree` / `renderTreeLevel`)
  - Live search box at top (audit gap #1) — calls `opts.search(query)` and hides/shows menuBody
- **Lazy tree** (`renderTree` / `renderTreeLevel`):
  - `expandedIds` Set tracks which nodes are expanded
  - Only top-level + children of expanded nodes are rendered (decision 3)
  - 155-article cartridge renders ~7 DOM tree nodes at rest
  - Toggle button changes expanded state + re-renders just that branch (not entire tree)
  - Each link has `data-nav-id="<id>"` attribute for nav-active.js
- **Home page** (`renderHome`):
  - Generated from `getTopLevel` — never hand-written (requirement 6)
  - Heading + lead paragraph
  - Category cards in a grid (each shows title + lead sentence)
- **"All" page** (`renderAllIndex`):
  - Flat list of all articles, id-sorted
  - Links show `<id> — <title>`
- **Section page** (`renderSectionPage`):
  - A role:"section" node (has children, empty body) renders as a landing page
  - Shows breadcrumb, title, lead, then children as cards (same as home)
  - Never renders as a stub article with empty sections (decision 2)
- **Article page** (`renderArticlePage`):
  - Breadcrumb, title, lead
  - Body HTML (auto-linked by autolinkHtml, via `wireWikilinks` to add click handlers)
  - Key characteristics (if present) — optional unordered list
  - Worked example (if present) — styled box
  - Examples (if present) — optional unordered list with scrolling cap
  - References section (requirement 8) — only rendered if articles has `references` field (never fabricated)
  - "See also" chips (audit gap #3) — omitted if no siblings
  - Prev/next sibling nav (audit gap #4) — omitted if only child or top-level
  - Key search terms box (requirement 9, audit gap #3) — always present
- **Search terms box** (`renderSearchTermsBox`):
  - Distinct, visually separated (tinted background, border, distinct class)
  - Each term is a clickable chip calling `copyToClipboard(term)`
  - "Copy all" button copies all terms joined by commas
  - Flash feedback: "Copied!" for 1.2s, then restore original text
- **Link handling:**
  - `linkItem` creates a link with `data-nav-id` attribute + preventDefault click handler
  - `wireWikilinks` finds all `.wikilink` anchors and adds onNavigate handlers
  - Breadcrumb links also prevent default and call navigate

#### `search-terms.js` — Deterministic Key Search Term Scoring
- **Exports:** `STOPWORDS`, `tokenizeWords`, `generateSearchTerms`
- **Requirement 9:** deterministic, reproducible, NO LLM at runtime
- **STOPWORDS:** ~80 common English words (a, the, of, and, or, but, for, to, if, then, is, are, etc.)
- **`tokenizeWords(text)`** → string[]; extracts word tokens via `/[A-Za-z][A-Za-z'-]*/g`
- **`isCapitalisedTechnical(word)`** → true if starts with capital and length > 1
- **`midSentenceCapitals(text)`** → Set<string> (lowercase keys)
  - Only capitals that appear AFTER a sentence-opening position are trusted as terms
  - Avoids false positives like "Contains" (sentence-initial)
  - A capital appearing both at sentence start and mid-sentence still counts
- **`generateSearchTerms(article, ancestors = [], limit = 10)`** → string[]
  - **Weighted scoring:**
    - Title words: weight 3
    - Ancestor title words: weight 2
    - Capitalized/technical words from lead + characteristics: weight 1
  - **Examples are deliberately EXCLUDED** — they are quotations whose proper nouns describe the source, not the topic
  - **Stopword filter:** words < 3 chars or in STOPWORDS are dropped
  - **Deduplication:** highest weight wins; display form is the first occurrence
  - **Sort:** by weight descending, then alphabetically for stable order
  - **Limit:** default 10 terms, returns fewer if fewer terms score
  - **Deterministic:** same input → same output, every time (test asserts this)

#### `references.js` — MLA-Style Reference Formatting
- **Exports:** `formatMlaReference`, `formatReferences`
- **Requirement 8:** sources ONLY from article's `references` field (from extract_articles.py's frontmatter)
- **Never fabricates** citations — if `references` field is absent or empty, returns `[]`
- **Reference shape:** `{title, container, note}` (from build_reference() in extract_articles.py)
- **`formatMlaReference(ref)`** → string
  - Sentence case each part (trim + ensure trailing period)
  - Concatenates: title + container + note, space-separated
  - Returns empty string if title is missing
- **`formatReferences(article)`** → string[] (never throws on missing field)
  - Returns [] if no references
  - Maps and filters empty strings

#### `clipboard.js` — Copy-to-Clipboard with Fallback
- **Exports:** `copyToClipboard`, `legacyCopy`
- **Requirement 9:** every search term is one-click copyable
- **Offline-first** (file:// support):
  1. Try `navigator.clipboard.writeText(text)` (modern API)
  2. Fall back to hidden textarea + `document.execCommand("copy")` (older Safari, limited file:// contexts)
  3. Never throws — returns `Promise<boolean>`: `true` on success, `false` on failure
- **`legacyCopy(text, doc)`** → boolean
  - Creates hidden off-screen textarea, selects it, runs execCommand("copy")
  - Catches exceptions (sandboxed/headless browser denial)
  - Removes textarea before returning
- **`copyToClipboard(text, doc?)`** → Promise<boolean>
  - Tries clipboard API with rejection handler falling back to legacyCopy
  - If navigator.clipboard unavailable, directly uses legacyCopy
  - UI (`ui.js`) calls it and flashes "Copied!" or "Copy failed"

#### `markdown.js` — Minimal Markdown Rendering
- **Exports:** `escapeHtml`, `renderInline`, `renderParagraphs`
- **One job:** escape untrusted text, apply inline markers
- **Note:** build-time extractor already renders paragraphs to `body_html`; this file exists for escape-hatch use if a host passes raw markdown directly (not normally used)
- **`escapeHtml(text)`** → escaped HTML (& < > " ')
- **`renderInline(text)`** → `**bold**` → `<strong>` and `*italic*` → `<em>`
- **`renderParagraphs(text)`** → splits on blank lines, wraps each in `<p>`, applies renderInline

#### `styles.js` — Base CSS
- **Exports:** `MINIWIKI_CSS` (string, ~280 lines)
- **Injected once per mount** via `<style data-miniwiki>`
- **Design tokens only** (no inventing colors) — uses 10 shell tokens: `--bg`, `--card`, `--ink`, `--ink2`, `--ink3`, `--line`, `--line2`, `--acc`, `--accbg`, `--radius`
- **Covers:**
  - Layout: 3-column root (nav 260px flex, article flex:1) with mobile media query
  - Links: all `.mw-*-link` variants (color, hover state, active state)
  - Tree: toggle buttons, leaf placeholders, expand/collapse arrows
  - Home/category cards: grid, border, lead text
  - Article body: paragraphs, sections, characteristics/examples scrolling (320px cap), worked example box
  - Breadcrumb: trail with › separator
  - Search terms box (requirement 9): distinct background, tinted, bordered (requirement 9)
  - Greek/Hebrew: font fallback stack for non-Latin cartridges (`data-mw-cartridge="Greek and Hebrew"`)

#### `styles-interactive.js` — Interactive Feature CSS
- **Exports:** `MINIWIKI_INTERACTIVE_CSS` (string, ~85 lines)
- **Injected once per mount** alongside styles.js
- **Covers the five "audit gaps":**
  1. **Search box** (audit gap #1): input styling, results dropdown, result items, empty state
  2. **Hover popover** (audit gap #2): absolute positioning, max-width, shadow
  3. **"See also" chips** (audit gap #3): distinct from search terms box, background-tinted
  4. **Prev/next nav** (audit gap #4): flex row with space-between, border-top separator
  5. **Mobile drawer** (audit gap #5): toggle button (fixed top-left on mobile), nav pane (fixed off-canvas, slide-in animation), scrim (fixed overlay)
- **Mobile breakpoint:** 720px width threshold
  - Below: nav is fixed off-canvas, toggle visible
  - Above: nav is inline, toggle hidden

#### `article-nav.js` — See-Also and Prev/Next Navigation
- **Exports:** `getSiblings`, `getPrevNextSibling`, `getSeeAlso`, `renderSeeAlso`, `renderPrevNextNav`
- **Scope:** siblings only (same parent) — the only relationship in the article data model; no curated "related articles" field
- **`getSiblings(articlesById, article)`** → Article[] including self, id-sorted
  - Empty if article has no parent (top-level)
- **`getPrevNextSibling(articlesById, article)`** → `{prev, next}` Article | null
  - Wraps at ends of sibling list
  - Both null if ≤1 sibling → rendered section omitted entirely (never a dead-end)
- **`getSeeAlso(articlesById, article, limit=8)`** → Article[]
  - Siblings excluding self, capped at limit
  - Empty → section omitted
- **`renderSeeAlso(...)`** → Element | null
  - Chips in a flex row with `.mw-see-also-link` styling
  - Each chip is a link with data-article-id + onNavigate handler
  - Returns null (not empty element) when no siblings
- **`renderPrevNextNav(...)`** → Element | null
  - Flex row with optional prev link (left) + optional next link (right)
  - Returns null when both prev and next are null
  - Only rendered at foot of article page

#### `search-ui.js` — Live Search Box UI
- **Exports:** `snippet`, `applySearchQuery`, `renderSearchBox`
- **Audit gap #1:** a live-filtered search box in the side menu
- **`snippet(text, len=80)`** → string; truncates text + adds ellipsis if over limit
- **`renderResultItem(doc, article, onSelect)`** → Element
  - Role="button", tabIndex=0 for keyboard navigation
  - Shows title (bold) + lead snippet
  - Click or Enter/Space key calls onSelect(id)
- **`applySearchQuery(doc, query, resultsEl, menuBody, search, onNavigate)`**
  - Called directly on every input event (also callable by tests for deterministic checking)
  - Empty/whitespace query: shows menuBody (normal menu), clears results
  - Non-empty query: hides menuBody, renders result list or "No matches."
- **`renderSearchBox(doc, opts)`** → Element
  - Text input with aria-label
  - Results div below (initially empty/hidden)
  - Wires input event to applySearchQuery

#### `popover.js` — Hover/Focus Preview Popover
- **Exports:** `createPreviewPopover`, `createHoverHandlers`, plus helpers
- **Audit gap #2:** hover/focus preview for wikilinks (`.wikilink`) and "see also" chips (`.mw-see-also-link`)
- **`createPreviewPopover(doc)`** → Element
  - A detached, hidden div with class `mw-preview-popover`
  - mount() appends it to the article pane's parent for positioning context
- **`createHoverHandlers(popover, getArticle)`** → `{onMouseOver, onMouseOut, onFocusIn, onFocusOut}`
  - Return plain functions taking `{target}` synthetic event (testable without real DOM dispatch)
  - Wire with `.addEventListener("mouseover", handlers.onMouseOver)` etc.
  - **Hover:** 150ms delay before show (SHOW_DELAY_MS), hide on mouseout, cancelShow clears timer before every new timeout
  - **Focus:** instant show on focusin, hide on focusout
  - **Timer hygiene:** cancelShow() called before every new setTimeout and on every hide path — no leaked timers
- **`formatPreviewHtml(article)`** → string
  - Escapes title (via escapeHtml, independently)
  - Includes title + truncated lead (100 chars, escapeHtml'd, with "…" if cut)
  - Returns HTML string for innerHTML assignment
- **`computePosition(rect, popoverHeight, viewportHeight)`** → `{top, left}`
  - Prefers above the link (top = link.top - height - 8px)
  - Flips below if that would go off top of viewport
  - No bottom-overflow flip (symmetrical, not needed at these sizes)
- **No `.closest()`:** the fake DOM doesn't implement it; walks `parentNode` by hand instead (TEST-8)

#### `nav-active.js` — Active Link Styling
- **Exports:** `setActiveNavLink`
- **Audit bug closure:** styles.js has always had `.mw-active` styling, but nothing ever applied it until now
- **`setActiveNavLink(navContainer, key)`** → void
  - `key` is `"home"`, `"all"`, or an article id
  - Clears `.mw-active` class from all menu/tree links
  - Applies `.mw-active` to the link with `data-nav-id="<key>"`
  - Silently no-ops if nothing matches (e.g. clicked article is in a still-collapsed tree branch) — respects lazy-tree contract, doesn't force expand
  - Matches on class names `.mw-menu-link` and `.mw-tree-link` via querySelectorAll

#### `drawer.js` — Mobile Off-Canvas Navigation Drawer
- **Exports:** `createDrawerController`
- **Audit gap #5:** mobile drawer hidden until 2026-08-10 build
- **`createDrawerController(doc, toggle, navPane, scrim)`** → controller
  - `navPane` element gets `.mw-drawer-open` class toggled
  - `scrim` element gets `.mw-scrim-active` class toggled
  - Returns `{open, close, toggle, isOpen, closeOnNavigate, onKeydown}`
- **Behaviors:**
  - Toggle button (☰) wired to `toggle()` — opens/closes drawer
  - Scrim (overlay) wired to `close()` — clicking scrim closes drawer
  - Doc keydown wired to `onKeydown` — Escape key closes drawer
  - `closeOnNavigate()` called by index.js's navigate() to close drawer on article select
  - Standalone `onKeydown(e)` function (not only addEventListener) for testability (fake DOM has no dispatch)
- **Class logic:** simple `setClass(el, className, on)` helper — splits classes, filters out className, re-adds if `on=true`

### Shell Integration

#### `_shell/src/miniwiki-seam.js` — Injection Seam for New-Tab Opening
- **Scope:** peer-module, not shell code (mirrors spelling-seam.js)
- **Three build-time constants injected by assemble.py:**
  1. `MINIWIKI_BUNDLE_SRC` — the entire dist/miniwiki.bundle.js as a string
  2. `MINIWIKI_ARTICLES` — the Article[] from embed_miniwiki_articles (convert dict to array)
  3. `MINIWIKI_CARTRIDGE_NAME` — the cartridge's name (or "Mini-Wiki" default)
- **`MiniWikiSeam.isAvailable()`** → boolean
  - True only if all three constants are defined, BUNDLE_SRC is non-empty, and ARTICLES is a non-empty array
  - If miniwiki.enabled is false in config, all three stay undefined and isAvailable() returns false
- **`MiniWikiSeam.open()`** → boolean
  - Builds the wiki document as an HTML string via `buildDocument()`
  - Tries Blob URL path:
    1. `new Blob([html], {type: "text/html"})`
    2. `URL.createObjectURL(blob)`
    3. `window.open(url, "_blank")`
    4. On success, defers revoking the blob URL until the new window loads (races otherwise)
  - Falls back to `window.open("") + document.write()` if Blob path throws
  - Returns `false` (never throws) if window.open returns null/undefined (pop-up blocked) — lets caller show "allow pop-ups" message
- **Document assembly** (`buildDocument()`):
  - HTML doctype + viewport meta + charset meta
  - Single `<style>` block with ROOT_TOKENS_CSS (duplicated shell design tokens: --bg/--card/--ink/--ink2/--ink3/--line/--line2/--acc/--accbg/--radius/--radius)
  - Wrapper divs: `.mw-page-wrap` (max-width 1100px) + `.mw-page-header` (title + "Offline" note) + `.mw-root` (flex row for nav + article pane)
  - Two `<script>` tags:
    1. The bundled module JS (safeScriptBody'd to escape `</script` sequences)
    2. Initialization: `MINIWIKI_ARTICLES = [...]`, `MINIWIKI_CARTRIDGE_NAME = "..."`, then `createMiniWikiModule({...}).mount(...)`
- **Script injection safety** (JS-2):
  - A literal `</script>` anywhere in dynamic content closes the surrounding tag early (HTML parser ignores JS string context)
  - Every `</script` in miniwiki-seam.js itself is written as `<\/script>` (backslash is no-op to JS)
  - `safeScriptBody(text)` escapes `</script` → `<\/script` at runtime when splicing BUNDLE_SRC and articles JSON
  - assemble.py already escapes the bundle at build time; this is belt-and-braces

#### `_shell/build/assemble.py` — Cart ridge Assembly
- **Miniwiki setup section** (around line 170–194):
  - Checks if miniwiki.enabled in cartridge config
  - Reads pre-built `dist/miniwiki.bundle.js` (raises error if missing — tells user to run bundle_miniwiki.py)
  - Calls `embed_miniwiki_articles(build_dir, miniwiki_cfg)` to read and re-serialize the articles JSON
  - Assembles `MINIWIKI_BUNDLE_SRC`, `MINIWIKI_CARTRIDGE_NAME` JS variables
  - Prepends miniwiki-seam.js to the vars
- **`embed_miniwiki_articles(build_dir, miniwiki_cfg)`** (line 498–520):
  - Reads the `.miniwiki.json` file path from config's `miniwiki.articlesFile`
  - Loads and parses JSON (raises error if invalid or file missing)
  - Converts dict to array (via `list(data.values())` if dict, else assumes array)
  - Returns JSON-stringified array (ensure_ascii=False for non-Latin scripts)
- **Template placeholders** in shell.html:
  - `__MINIWIKI_JS__`: the miniwiki-seam.js + variables
  - `__MINIWIKI_ARTICLES__`: not used (articles embedded in the JS variable)
  - `__MINIWIKI_CARTRIDGE_NAME__`: not used (embedded in the JS variable)

#### Cartridge Manifest (config.yaml)
```yaml
miniwiki:
  enabled: true                       # default OFF — omit for byte-identical old behaviour
  articlesFile: "logic.miniwiki.json" # build/extract_articles.py's output, relative to build/
  cartridgeName: "Logic Mini-Wiki"    # optional, default cartridge.name
```

---

## 2. ARTICLES JSON Shape (Exact)

### Extract Output Format
`build/extract_articles.py` produces a JSON object keyed by article id:
```json
{
  "1.1": {
    "id": "1.1",
    "title": "Affirming the Consequent",
    "level": 2,
    "role": "article",
    "lead": "A logical fallacy in which the consequent of a conditional statement is affirmed.",
    "body_html": "<p>Escapes...</p>",
    "parent": "1",
    "children": [],
    "siblings": ["1.2", "1.3"],
    "characteristics": ["Logical fallacy", "Invalid inference"],
    "examples": ["If it rains, the ground is wet. The ground is wet. Therefore, it rained."],
    "worked_example": "Consider: If P then Q. Q is true. Conclude P.",
    "references": [{"title": "...", "container": "...", "note": "..."}]
  },
  ...
}
```

### Mount Input Format
`embed_miniwiki_articles()` converts the dict to an array and passes to `createMiniWikiModule({articles: [...]})`:
```javascript
[
  {
    "id": "1.1",
    "title": "Affirming the Consequent",
    // ... same fields
  },
  {
    "id": "1.2",
    // ...
  },
  ...
]
```

### Article Record Shape (Definitive)
Per Specs/MiniWikiModule.spec.md §4 and model decision 1/2/5:

**Required fields:**
- `id`: string (dotted outline id, e.g. "2.1.3")
- `title`: string
- `level`: number (dot-segment count; top-level = 1)
- `role`: "section" | "article"
  - "section": has children AND empty body → rendered as landing page listing children
  - "article": everything else → rendered as full article
- `lead`: string (first sentence, plain text; may be empty for role="section")
- `body_html`: string (pre-escaped HTML paragraphs; may be empty for role="section")
- `parent`: string | null (parent article id, or null for top-level)
- `children`: string[] (array of child article ids; may be empty)
- `siblings`: string[] (array of sibling ids, excluding self; may be empty)

**Optional fields (only set when source actually has them, ~60% of articles lack these):**
- `characteristics`: string[] (key characteristics; omitted entirely if empty)
- `examples`: string[] (example items; omitted entirely if empty)
- `worked_example`: string (single worked example; omitted entirely if empty)
- `references`: [{title, container, note}] (MLA reference; omitted entirely if none)

### How extract_articles.py Produces It

**Process:**
1. **Parse frontmatter:** extract `title`, `description`, `provenance` fields (for MLA references)
2. **First pass — scan_nodes():** reads both flat/heading dialects, accumulates lead lines + characteristics + examples + worked_example per id
3. **Fold category descriptions:** Logic's `2.1.0` pattern ids are merged into their parent's lead_lines
4. **Second pass — build_tree():** walks dotted ids to determine parent/children/siblings
5. **Render body_html:** concatenate lead_lines, escape, wrap in `<p>` tags
6. **Set role:** "section" if children AND empty body, else "article"
7. **Extract lead:** first sentence of lead_lines (max 240 chars), not exceeding sentence boundary
8. **Build reference:** from frontmatter fields (omitted entirely if none)
9. **Filter optional fields:** characteristics/examples/worked_example/references only included if non-empty

**Special handling:**
- **Two source dialects:**
  - **Flat:** flush-left outline line `1.1 Title`, indented body, optional `Example: "..."` line
  - **Heading:** `### 1.1 Title`, `**Key characteristics:** ...`, `**Worked example:** ...`, `- ` bullets
- **Characteristic parsing:** comma-separated on the same line or split via regex
- **Example parsing:** either `Example:` line or `- ` bullet list (bullets can wrap with indented continuation)
- **Emphasis stripping:** `**bold**` and `*italic*` are removed before storing (not rendered)

---

## 3. Bundler: src/ → dist/miniwiki.bundle.js

### Mechanism
`python3 build/bundle_miniwiki.py` concatenates 15 source files in dependency order (lines 36–52 of bundle_miniwiki.py):

**ORDER list:**
```python
[
    "tree.js",                    # lowest-level helpers (no imports)
    "autolink.js",                # imports from tree.js
    "search-terms.js",            # standalone
    "references.js",              # standalone
    "clipboard.js",               # standalone
    "markdown.js",                # standalone
    "styles.js",                  # standalone
    "styles-interactive.js",      # standalone
    "article-nav.js",             # imports from tree.js + ui.js (but ui.js not yet loaded)
    "search-ui.js",               # imports from ui.js (defined later)
    "popover.js",                 # imports from ui.js (defined later)
    "nav-active.js",              # standalone
    "drawer.js",                  # standalone
    "ui.js",                      # imports from tree.js, autolink.js, etc. (all loaded)
    "index.js",                   # imports from all above (final)
]
```

### Process
1. **For each file in ORDER:**
   - Read file text
   - Collect any `import {...} as ...` aliases
   - Strip all `import {...} from "..."` lines via regex
   - Strip all `export {...}` lines via regex
   - Append stripped text to concatenation
2. **Emit alias declarations** at the end (top-level `var alias = original;` statements)
3. **Wrap in IIFE:**
   ```javascript
   (function (global) {
     "use strict";
     /* content */
     global.createMiniWikiModule = createMiniWikiModule;
   })(typeof window !== 'undefined' ? window : globalThis);
   ```
4. **Validate:**
   - Every name in ORDER must exist as a file (raises BundleError if not)
   - Every import/export pattern must match the bundler's regex (raises BundleError if not)
   - ⚠️ Does NOT check: whether a file exists that is NOT in ORDER (orphaned file silently omitted — Low finding in REVIEW-vibe-rules.md)

### Output
- ~23KB unminified, non-module JavaScript
- Single global: `window.createMiniWikiModule`
- Runs in any JS context (browser, Node test harness, Blob URL tab)
- Ready to be embedded verbatim in HTML `<script>` tags

---

## 4. New-Tab Opening: miniwiki-seam.js + Three Build-Time Constants

### Three Constants (Set by assemble.py)

1. **`MINIWIKI_BUNDLE_SRC`** (string)
   - Entire contents of `dist/miniwiki.bundle.js` (the IIFE that assigns window.createMiniWikiModule)
   - Embedded as a string constant (not executed in the parser tab's window)
   - Reason: window.open() creates a separate JS realm with no shared closure; only source text crosses the boundary

2. **`MINIWIKI_ARTICLES`** (Article[])
   - The articles array (converted from extract_articles.py's JSON object dict by embed_miniwiki_articles)
   - Passed to createMiniWikiModule({articles: MINIWIKI_ARTICLES, ...})
   - Embedded as a JSON-stringified array

3. **`MINIWIKI_CARTRIDGE_NAME`** (string)
   - Cartridge's display name (from config.yaml's miniwiki.cartridgeName, or cartridge.name default, or "Mini-Wiki")
   - Passed to createMiniWikiModule({cartridgeName: MINIWIKI_CARTRIDGE_NAME})
   - Used in the wiki tab's title and header

### MiniWikiSeam.open() Logic

**Check availability:**
```javascript
if (!MINIWIKI_BUNDLE_SRC || !MINIWIKI_ARTICLES || !MINIWIKI_CARTRIDGE_NAME) {
  return false; // silently unavailable (miniwiki.enabled: false)
}
```

**Build wiki document:**
```javascript
var html = buildDocument();
// Returns complete HTML string with <script> tags containing:
// - The bundled module JS
// - Initialization code: createMiniWikiModule({...}).mount(...)
```

**Try Blob URL path** (preferred, works from file://):
```javascript
var blob = new Blob([html], { type: "text/html" });
var url = URL.createObjectURL(blob);
var win = window.open(url, "_blank");
if (!win) return false; // pop-up blocked
// Defer revoking URL until new window loads
win.addEventListener("load", function() {
  setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
});
return true;
```

**Fall back to document.write** (if Blob throws):
```javascript
var win2 = window.open("", "_blank");
if (!win2) return false; // pop-up blocked
win2.document.open();
win2.document.write(html);
win2.document.close();
return true;
```

**Never throws, returns boolean:**
- `true` → wiki tab opened successfully
- `false` → pop-up blocked or browser feature unavailable (caller shows "allow pop-ups" message)

### Document Assembly (buildDocument())

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Logic Mini-Wiki — Mini-Wiki</title>
  <style>
    :root { --bg: #faf9f5; /* ... 10 tokens ... */ }
    /* ... base reset ... */
  </style>
</head>
<body>
  <div class="mw-page-wrap">
    <div class="mw-page-header">
      <span>Logic Mini-Wiki</span>
      <span style="...">Offline · no network requests</span>
    </div>
    <div class="mw-root">
      <div id="miniwiki-nav"></div>
      <div id="miniwiki-article" class="mw-article-pane"></div>
    </div>
  </div>
  <script>
    /* The entire dist/miniwiki.bundle.js (safeScriptBody'd) */
  </script>
  <script>
    var MINIWIKI_ARTICLES = [/* escaped JSON */];
    var MINIWIKI_CARTRIDGE_NAME = "Logic Mini-Wiki";
    var wiki = window.createMiniWikiModule({
      document: document,
      articles: MINIWIKI_ARTICLES,
      cartridgeName: MINIWIKI_CARTRIDGE_NAME
    });
    wiki.mount(
      document.getElementById("miniwiki-nav"),
      document.getElementById("miniwiki-article")
    );
  </script>
</body>
</html>
```

### Script Injection Safety
- **Problem:** a literal `</script>` anywhere in dynamic content closes the surrounding tag early (HTML parser doesn't understand JS strings)
- **Solution:** `safeScriptBody(text)` replaces `</script` → `<\/script` at runtime
- **Applied to:**
  - `MINIWIKI_BUNDLE_SRC` (the module JS)
  - `JSON.stringify(MINIWIKI_ARTICLES)` (the articles array)
- **Double belt-and-braces:** assemble.py already escapes at build time; miniwiki-seam.js adds runtime escape

---

## 5. Feature Behaviours

### Search (index.js + search-ui.js)

- **Input:** `search(query)` method on the module
- **Matching:** title or lead text, case-insensitive substring match
- **UI:** live search box at top of side menu (audit gap #1)
- **Interaction:**
  - Type in box → calls `applySearchQuery(query)`
  - Non-empty query: hide normal menu (Home/All/Surprise/Categories/Browse), show results list
  - Empty query: restore normal menu, clear results
  - Click result item → call `onNavigate(id)` → navigate to article
  - Keyboard: Enter/Space on result item also navigates
- **Result display:** title (bold) + lead snippet (80 chars, ellipsised if longer)
- **No matches state:** show "No matches." message (not an empty list)

### Auto-linking (autolink.js + ui.js)

- **When:** every time a body_html or characteristics/examples string is rendered on an article page
- **How:** `autolinkHtml(body_html, catalogue, selfId)` wraps matching titles in wikilink anchors
- **Exclusion rule:** titles in EXCLUDED_TITLES (fit report §4: "style", "example(s)", numbers 1–12, 40, 1000) never linked
- **Collision rule:** if two articles have the same title (case-insensitive), BOTH are excluded entirely (no wrong links)
- **Generic heuristic:** single-word titles ≤4 chars are never linked (too generic)
- **Matching:** first whole-word case-insensitive occurrence per text run (via `linked` Set to avoid duplicates in one block)
- **Escaping:** operates only on text runs **between** HTML tags — never reintroduces raw text outside a tag
- **Result:** `<a class="wikilink" href="#/<id>" data-article-id="<id>">matched text</a>`
- **Interaction:** click → `wireWikilinks` adds onNavigate handler → navigate to article

### Tree Navigation (tree.js + ui.js)

- **Model decision #3:** lazy-expansion tree — only top-level nodes + children of expanded nodes rendered
- **Performance:** 155-article cartridge renders ~7 DOM nodes at rest (verified)
- **Interaction:**
  - Expand/collapse toggle button: toggles `expandedIds.has(id)`, re-renders just that branch
  - Link click: calls `onNavigate(id)` → navigate to article
  - Each link has `data-nav-id` attribute for active highlighting
- **No auto-expand on deep-link:** if you link to an article inside a collapsed branch, the tree stays collapsed (disclosed gap, documented in StyleGuide §3 line 329)
- **Section landing pages:** role:"section" nodes with children render as category landing pages (children as cards), never as stubs with empty sections

### Side Menu Navigation (ui.js + nav-active.js)

- **Structure:**
  - Home, All, Surprise me (top links)
  - Categories heading + list of top-level articles
  - Browse heading + lazy tree of all articles
- **Active highlighting:** `.mw-active` class on the current article's side-menu entry
  - Applied by `setActiveNavLink()` after every navigation
  - Matches on `data-nav-id` attribute
  - Silently no-ops if article is in a collapsed tree branch (doesn't force expand)
- **Search box:** at the very top, above all menu items
- **Mobile:** on narrow screens (< 720px), nav becomes off-canvas drawer with toggle button

### Popover Hover Preview (popover.js + ui.js)

- **Audit gap #2:** hovering over a wikilink or "see also" chip shows an inline preview
- **Trigger:** `.wikilink` or `.mw-see-also-link` hover/focus
- **Delay:** 150ms on hover (SHOW_DELAY_MS) to avoid flashing on fast mouse-over
- **Content:** article title (bold) + truncated lead (100 chars max, with ellipsis)
- **Positioning:** prefers above the link, flips below if would go off top of viewport
- **Hide:** mouseout or focusout immediately hides (cancel any pending show timer)
- **Single popover:** mounted once at mount() time, delegated to article container (prevents multiple popover elements)

### Drawer Mobile Navigation (drawer.js + ui.js + styles-interactive.js)

- **Audit gap #5:** on mobile (<720px width), nav drawer slides in from left
- **Toggle button:** ☰ (hamburger icon), fixed top-left, 36×36px
- **Scrim:** semi-transparent overlay (rgba(0,0,0,0.3)), closes drawer on click
- **Animation:** CSS `transform: translateX()` with 0.25s ease transition
- **Close triggers:**
  - Toggle button click (toggles open/closed)
  - Scrim click
  - Escape key
  - Article selection (`closeOnNavigate()`)
- **No focus management:** toggle button has no `aria-expanded` (accessibility gap noted in REVIEW-vibe-rules.md)

### Clipboard Copy (clipboard.js + ui.js)

- **Requirement 9:** each search term and "copy all" button is one-click copyable
- **Path 1 — Modern:** `navigator.clipboard.writeText()`
- **Path 2 — Fallback:** hidden textarea + `document.execCommand("copy")`
- **Offline:** both paths work from file:// (no network required)
- **Failure handling:** returns `Promise<boolean>`, never throws; UI shows "Copy failed" on rejection
- **Feedback:** on success, button flashes "Copied!" for 1.2s then restores

---

## 6. Making a FLAT LIST-STYLE Wiki (Riddles / Folk Tales / Items with Attribution)

### Use Case
Instead of Grammar's hierarchical article tree (1 → 1.1 → 1.1.1), create a flat catalogue where each item is a top-level entry with no nesting, and each has a source attribution in brackets (e.g. "[source: Grimm]").

### Required Changes

#### 1. **JSON Structure: Flatten the Hierarchy**

**Current (hierarchical):**
```json
{
  "1": {"id": "1", "title": "Category", "children": ["1.1", "1.2"], ...},
  "1.1": {"id": "1.1", "title": "Article", "parent": "1", ...}
}
```

**Flat list version:**
```json
{
  "1": {"id": "1", "title": "Riddle One", "parent": null, "children": [], ...},
  "2": {"id": "2", "title": "Riddle Two", "parent": null, "children": [], ...},
  "3": {"id": "3", "title": "Folk Tale Three", "parent": null, "children": [], ...}
}
```

**Changes:**
- Every article has `parent: null` (no parent)
- Every article has `children: []` (empty)
- Every article is role:"article" (never role:"section")
- Level = 1 for all articles

#### 2. **Extractor Modification (extract_articles.py)**

If using the extractor, modify the source `.md` to use flat outline:
```markdown
1 Riddle One
Body text here.
[source: Grimm]

2 Riddle Two
...

3 Folk Tale Three
...
```

**Or hand-craft the JSON to the shape above** (no extractor changes needed if you build the JSON directly).

#### 3. **Side Menu: Remove Tree, Show Flat List**

**Current:** lazy tree with expand/collapse  
**Flat:** just an `<ul>` of all articles, link per article

**Modify ui.js's `renderSideMenu()`:**
```javascript
// Replace:
// menuBody.appendChild(el(doc, "div", "mw-menu-heading", "Browse"));
// menuBody.appendChild(renderTree(...));

// With:
const allList = el(doc, "ul", "mw-menu-categories"); // reuse same class
for (const article of flatIndex(articlesById)) {
  allList.appendChild(
    linkItem(doc, article.title, () => opts.onNavigate(article.id), "mw-menu-link", article.id)
  );
}
menuBody.appendChild(el(doc, "div", "mw-menu-heading", "All items"));
menuBody.appendChild(allList);
```

**Result:** one long flat list of all items, no nesting, no toggle buttons.

#### 4. **Home Page: Show All Items as a Flat Grid**

**Current:** home page shows only top-level categories  
**Flat:** home page shows all articles as cards in a grid

**Modify ui.js's `renderHome()`:**
```javascript
function renderHome(doc, articlesById, cartridgeName, onNavigate) {
  const main = el(doc, "div", "mw-page mw-home");
  main.appendChild(el(doc, "h1", "mw-title", cartridgeName || "Mini-Wiki"));
  main.appendChild(el(doc, "p", "mw-lead", "A complete catalogue..."));
  
  const list = el(doc, "div", "mw-home-categories");
  for (const article of flatIndex(articlesById)) {  // ALL articles
    list.appendChild(categoryCard(doc, article, onNavigate));
  }
  main.appendChild(list);
  return main;
}
```

**Result:** home page lists every item in the catalogue (not just top-level categories).

#### 5. **Article Lead: Include Attribution**

**Approach 1: In the source MD**

In extract_articles.py, add an attribution parser. Store `[source: ...]` in characteristics or a new field.

**Approach 2: Store in body_html**

Include attribution as the last line of body prose (already escaped/HTML'd):
```html
<p>Once upon a time...</p>
<p><em>[source: Grimm]</em></p>
```

**Approach 3: Store in a new `attribution` field**

Add to extract_articles.py:
```python
article["attribution"] = "[source: Grimm]"
```

Then render in ui.js's `renderArticlePage()`:
```javascript
if (article.attribution) {
  main.appendChild(el(doc, "p", "mw-attribution", article.attribution));
}
```

#### 6. **"See Also" (Siblings): Disable It**

**Current:** shows sibling articles at the footer  
**Flat:** all articles are "siblings", so this would show every other article (noisy)

**In ui.js's `renderArticlePage()`:**
```javascript
// const seeAlso = renderSeeAlso(doc, articlesById, article, onNavigate);
// if (seeAlso) main.appendChild(seeAlso);
// → DELETE or comment out, or modify to show random N articles instead
```

**Alternative:** show N random articles instead of siblings:
```javascript
function renderRandomSuggestions(doc, articlesById, article, onNavigate, limit=5) {
  const all = flatIndex(articlesById).filter(a => a.id !== article.id);
  const shuffled = all.sort(() => Math.random() - 0.5).slice(0, limit);
  if (!shuffled.length) return null;
  // ... render as chips ...
}
```

#### 7. **"Prev/Next" Navigation: Disable It**

**Current:** prev/next siblings at footer  
**Flat:** with no hierarchy, prev/next would be the previous/next item in id-sort order (confusing)

**In ui.js's `renderArticlePage()`:**
```javascript
// const prevNext = renderPrevNextNav(doc, articlesById, article, onNavigate);
// if (prevNext) main.appendChild(prevNext);
// → DELETE or comment out
```

#### 8. **CSS: Simplify Tree and Menu**

**In styles.js, delete or hide:**
- `.mw-tree-toggle` (no expand/collapse buttons)
- `.mw-tree-children` (no indented children)
- `.mw-tree-leaf` (no leaf placeholders)

Or set them to `display: none` for safety:
```css
.mw-tree-toggle, .mw-tree-leaf, .mw-tree-children { display: none !important; }
.mw-tree { list-style: none; margin: 0; padding: 0; }
.mw-tree li { margin: 2px 0; }
.mw-tree-link { display: block; }
```

#### 9. **Search: Still Works**

No changes needed — `search(query)` already searches all articles by title/lead, flat or hierarchical.

#### 10. **Test: Verify No Dead Code**

- `visibleNodes()` in tree.js is now actually unused (it was already unused; flat layout doesn't change this)
- `getChildren()` now returns [] for all articles (no errors, just no children to render)
- `renderTree()` still renders but shows a flat list (via changes in step 3)

### Summary of Changes

| Component | Current | Flat List | Change |
|-----------|---------|-----------|--------|
| **JSON** | Hierarchical (parent/children) | All top-level (parent: null, children: []) | Hand-craft or modify extractor |
| **Side menu** | Lazy tree with toggle buttons | Flat `<ul>` of all articles | Modify `renderSideMenu()` in ui.js |
| **Home page** | Top-level categories only | All articles as grid | Modify `renderHome()` in ui.js |
| **Article page** | Full article + see-also + prev/next | Full article + optional attribution | Optional: add attribution field; delete see-also/prev-next sections |
| **CSS** | Tree styling (toggles, indents) | Flat list (no toggles) | Hide tree-specific classes |
| **Search** | Works on all articles | Works unchanged | No change |
| **Popover** | Hover preview on wikilinks | Works unchanged | No change |
| **Clipboard** | Copy search terms | Works unchanged | No change |

### Example Flat List: Riddle Catalogue

**Input JSON:**
```json
{
  "1": {
    "id": "1",
    "title": "The Sphinx's Riddle",
    "level": 1,
    "role": "article",
    "lead": "What goes on four legs in the morning, two in the afternoon, and three in the evening?",
    "body_html": "<p>This is the famous riddle of the Sphinx, posed to those seeking entry to Thebes...</p>",
    "parent": null,
    "children": [],
    "siblings": ["2", "3"],
    "references": [{"title": "Greek Mythology", "container": "Encyclopaedia Britannica", "note": ""}]
  },
  "2": {
    "id": "2",
    "title": "The Hobbit's Riddles",
    "lead": "What has roots as nobody sees, is taller than trees, up, up it goes, and yet it never grows?",
    "body_html": "<p>From Tolkien's The Hobbit...</p>",
    "parent": null,
    "children": [],
    "siblings": ["1", "3"]
  },
  ...
}
```

**Expected UI:**
- Home page: grid of 3 riddle cards
- Side menu: flat list of all 3 riddle titles
- Article page (click riddle 1): full riddle text, no tree navigation, no prev/next links
- Search box: live-filters riddles by title/lead

---

## Appendix: Known Gaps and Limitations

### Confirmed Issues (REVIEW-vibe-rules.md)

1. **High:** Duplicated tree-expansion logic, one copy dead (concern #2)
   - `visibleNodes()` in tree.js never called (only test calls it)
   - `renderTreeLevel` in ui.js re-implements the same walk independently
   - Fix: delete `visibleNodes()` and its test, keep DOM-rendering version in ui.js

2. **Medium:** Re-exports in ui.js exist only to serve test import (concern #1)
   - `ui.js` re-exports `byIdNumeric` and `buildLinkCatalogue` that it never uses
   - Only test-ui.mjs imports these from ui.js (wrong import path)
   - Fix: change test to import from actual modules (tree.js / autolink.js)

3. **Medium:** Unreachable "not found" render path (concern #5)
   - `renderView("article", unknownId, ...)` builds a not-found page
   - But `routeFromHash()` never calls it with an unknown id; it redirects to home instead
   - Fix: either wire routeFromHash to call renderView with bad id (show not-found), or delete the dead not-found branch

4. **Medium:** Deep-link tree doesn't auto-expand (concern #4, disclosed)
   - If you link to an article inside a collapsed tree branch, the tree stays collapsed
   - Documented plainly in StyleGuide §3 line 329 — not hidden
   - Fix: call `getAncestors()` and add each ancestor to `expandedIds` before rendering (bigger change: side menu never re-rendered on navigate currently)

5. **Low:** Bundler can silently drop an unlisted src/*.js file (concern #3)
   - `bundle_miniwiki.py` checks forward (every name in ORDER must exist) but not reverse
   - Orphaned file (exists but not in ORDER) silently omitted from build
   - Fix: add check for `extra = files not in ORDER` and raise error (same fix applies to both bundlers)

### Limitations (Design Decisions, Not Bugs)

- **Rhetoric's inline Markdown tables:** treated as prose, not parsed into `<table>` markup (fit report §10, MEDIUM severity, not gated integration)
- **No focus trap in mobile drawer:** no `aria-expanded` on toggle, focus not managed on open/close (accessibility gap worth follow-up)
- **One popover element per mount:** shared across all wikilinks via delegated handlers (correct design, not a limitation)

---

## References

- **README.md:** overview, public API, build instructions, known limitations
- **Specs/MiniWikiModule.spec.md:** formal requirements, model decisions, verification performed
- **REVIEW-vibe-rules.md:** code review findings, confirmed issues (duplicated logic, dead code, accessibility)
- **bundle_miniwiki.py:** bundler source, ORDER list, IIFE wrapping
- **extract_articles.py:** extractor source, both source dialects, tree building, reference extraction
- **miniwiki-seam.js:** new-tab opening, three build-time constants, Blob URL + fallback logic
- **assemble.py:** shell integration, `embed_miniwiki_articles()`, template injection
