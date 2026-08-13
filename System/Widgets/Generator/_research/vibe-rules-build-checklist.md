---
title: "Generator Build Checklist — Vibe-Coding Rules Binding"
description: "Vibe-coding rules that bind when writing Generator code, per category; Parser violations to avoid; Shell design tokens and components."
date: 2026-08-11
---

# Generator Build Checklist — Vibe-Coding Rules

**Scope:** Every binding vibe-coding rule for Generator project files:
- (a) stdlib-only Python build scripts
- (b) vanilla-ES-module JS engines/explainers (no bundler, no frameworks)
- (c) single-file HTML widgets
- (d) CSS using shell design tokens
- (e) node:test / unittest smoke tests

**Source:** `Memory/Long-Term/Coding/vibe-coding-rules.md` (canonical) + `System/Widgets/Parser/_shell/StyleGuide/` (all five docs) + `System/Widgets/Parser/_modules/MiniWiki/REVIEW-vibe-rules.md` (violations to avoid).

---

## Part 1: Setup Rules (All Code)

Rules SR-1 through SR-6 apply to every Generator file, regardless of language.

| Rule ID | Restatement | What This Means for a Generator File |
|---------|-------------|--------------------------------------|
| **SR-1** | One file, one job | Combine functions in one file only when they form a single linear sequence or are tightly bound by type and purpose. A build script does one thing, named by its filename (e.g. `bundle.py`, not `build-and-optimize.py`). |
| **SR-2** | Dependencies are case-by-case, never default | **Baseline: stdlib only.** Python: no `pip install`, no venv, no `requirements.txt`. JS: no npm packages, no bundler, no framework. If a task genuinely needs an external dep, that is a conversation with Luke, not a commit. Approved by default: nothing. |
| **SR-3** | Performance first | Loading speed is non-negotiable. Ship no blocking script, no unused CSS, no unbounded query, no whole-file read where a streaming read or targeted read would do. A change that adds bytes or seconds must justify them. This is load-bearing for viewers and build scripts Luke waits on. |
| **SR-4** | Share, don't copy-paste | Before adding logic to one script, grep its siblings for it. If it exists, extract to a shared importable module beside them. Fixing a bug in one copy means grepping the rest for the same pattern before closing it. **Parser violation: tree.js and ui.js duplicate tree-expansion logic; one copy (tree.js's `visibleNodes`) is dead** — see Part 4. |
| **SR-5** | Secrets never enter the repo | Credentials, tokens, API keys live in `.env` and are read at runtime. Never hardcoded, never in a fixture, never in a comment, never in a committed log. Confirm `.gitignore` covers a new secret file *before* writing to it. This repo lives in Dropbox and is a git repo: a secret here is synced to the cloud and committed to history. |
| **SR-6** | Match the neighbours before inventing | Read the closest existing sibling script before writing a new one and absorb its conventions — naming, argument handling, logging format, house idiom. A new file that looks nothing like the file next to it is a defect even if it runs. **Reference:** `Parser/_shell/build/assemble.py` (Python) and `Parser/_shell/src/ui.js` (JS) for Generator's closest neighbours. |

---

## Part 2: Python Rules (Build Scripts)

These bind for any `build/*.py` or `*build*.py` in Generator.

| Rule ID | Restatement | What This Means for a Generator File |
|---------|-------------|--------------------------------------|
| **PY-1** | Standard library only | `pathlib`, `json`, `csv`, `sqlite3`, `argparse`, `http.server`, `urllib` — no third-party packages. If a script genuinely needs one, that is a Luke conversation. |
| **PY-2** | One script, one job | A script does one thing. Shared logic goes in a plain importable module beside it — never copy-pasted between scripts (enforced by SR-4). |
| **PY-3** | Import is free | Real work lives in named functions behind `if __name__ == "__main__":`. Importing a build script must never read files, write, hit a database, start a server, or take measurable time — that is a contract for testability and re-usability. |
| **PY-4** | Typed signatures | Annotate every parameter and return with modern generics: `list[str]`, `dict[str, int]`, `str | None` — never `typing.List` or `Optional`. |
| **PY-5** | `pathlib`, never string paths | Join paths with `Path` and `/`. Never `os.path.join` or manual separators. Anchor project paths to `Path(__file__).resolve().parents[n]`, never the working directory — cron wrappers and `.command` launchers start in unpredictable places. |
| **PY-6** | Explicit exceptions, non-zero exit | Catch the specific exception you expect. Never a bare `except:` or silent `except Exception:`. Raise with context and exit non-zero so callers, cron wrappers, and `Logs/skills.log` see the failure. This is the code-level form of "never stall silently." |
| **PY-7** | Context managers for every resource | Open files, connections, sockets, subprocesses with `with`. Never leave a `close` or `commit` to the garbage collector. |
| **PY-8** | `sqlite3` rules (if used) | Use `?` placeholders, never f-strings or `%` interpolation: `cursor.execute(sql, (value,))`. Readers open read-only: `sqlite3.connect("file:...?mode=ro", uri=True)`. If you write, wrap bulk in one transaction: `executemany`, never a loop of single `execute` + `commit`. |
| **PY-9** | Stream and batch, don't load everything | Iterate the cursor or file handle; avoid `.fetchall()` and `.read()` on unbounded data. Wrap bulk writes in one transaction, never a loop. |
| **PY-10** | PEP 8 by hand | `snake_case`, `UPPER_SNAKE` constants, 4-space indent. No Black, Ruff, or linter config in the repo (enforced by SR-2). |
| **PY-11** | Self-documenting names over comments | Intention-revealing names for everything; small, focused functions; early returns. Write code readable without commentary. Comments say **why**, never **what** — and delete outdated comments immediately. Docstrings for public functions and genuinely complex logic only. |
| **PY-12** | Viewers never write | If a build script produces a viewer (e.g., a localhost page), that viewer is read-only over `Memory/`. A viewer that gains a write path stops being a viewer and becomes a Long-Term memory mutation — `!Checkpoint` territory, not a code change made in passing. |

---

## Part 3: JavaScript Rules (Vanilla ES Modules, No Bundler)

These bind for any `.js` in Generator that runs in a browser or Node, without a bundler.

| Rule ID | Restatement | What This Means for a Generator File |
|---------|-------------|--------------------------------------|
| **JS-1** | Self-documenting > comments | Clear, intention-revealing names for everything. Code readable without comments. |
| **JS-2** | Robust and predictable > clever | Validate inputs, handle errors explicitly, prefer early returns. Never fail silently: a guard against a "shouldn't happen" state must `console.warn` with enough context to locate the call site. Only genuinely optional absences may return quietly. **Parser precedent:** every module logs guards (see `_modules/MiniWiki/src/index.js`). |
| **JS-3** | Modern and simple > over-engineered | Current JS features (async/await, optional chaining, nullish coalescing), small focused functions. Avoid unnecessary classes, abstractions, or indirection layers. |
| **JS-4** | Comments: "why", not "what" | JSDoc for public APIs and complex logic. Comments minimal, truthful, current. Delete outdated comments immediately. **Parser precedent:** `_modules/MiniWiki/src/autolink.js:90-119` escapes with inline comment explaining *why* it's safe, not restating the code. |
| **JS-5** | `async`/`await` by default | Use `async`/`await` with `try`/`catch` for all async code. Show a loading state before a fetch and an error state on failure. Centralize raw `fetch()` calls in one `api.js` rather than scattering them. |
| **JS-6** | Safe DOM handling | Event delegation for dynamic elements. Remove listeners when elements are removed. Never `innerHTML` with user data or with content read from `Memory/` — store text is Luke-authored but still untrusted input to a renderer. Cache repeated DOM queries. **Parser precedent:** escaping happens before `innerHTML` write in three separate places (extract_articles.py, autolink.js, popover.js), each with a guard comment. |
| **JS-7** | No build step, no framework, no bundler | Vanilla ES modules served directly. A framework is a dependency decision requiring Luke sign-off, not a default. Mirrors SR-2 and how Python viewers already work. Generator files run either in a modern browser (ES2020+) or Node 18+. |

---

## Part 4: HTML Rules (Single-File Widgets)

These bind for any `.html` file in Generator.

| Rule ID | Restatement | What This Means for a Generator File |
|---------|-------------|--------------------------------------|
| **HTML-1** | Semantic first | Use `<nav>`, `<main>`, `<article>`, `<section>`, `<header>`, `<footer>`. `<div>` only as a pure styling hook. Exactly one `<main>` per page. |
| **HTML-2** | Images have alt text | Every `<img>` has an `alt`. Descriptive for informative images, empty `alt=""` for decorative. |
| **HTML-3** | Proper heading hierarchy | Exactly one `<h1>` per page. Never skip levels. Headings describe structure, not visual size. |
| **HTML-4** | Asset loading order | CSS in `<head>`. Scripts at the bottom or with `defer`. Inline critical CSS only when above-the-fold performance demands it (SR-3). For Generator, CSS is inlined at build time (per Parser precedent), so no external stylesheet links. |
| **HTML-5** | Accessible forms | Every control has a real `<label>`. `aria-describedby` for error messages. Placeholders are hints only, never labels. |
| **HTML-6** | Escape everything interpolated | Markdown, titles, and store text rendered into a page are escaped before insertion. This applies equally to HTML built as Python strings inside build scripts, which is where Lukeatron's HTML actually lives. **Parser precedent:** `_shell/build/assemble.py` and `_modules/MiniWiki/build/extract_articles.py` both escape content before template substitution. |

---

## Part 5: CSS Rules (Using Shell Design Tokens)

These bind for any `.css` in Generator that targets shell architecture or inherits its tokens.

| Rule ID | Restatement | What This Means for a Generator File |
|---------|-------------|--------------------------------------|
| **CSS-1** | One file, one job | Each file styles exactly one component, layout, or page. Under 150 lines; split when it grows. No unrelated styles in one file. **Parser note:** `_shell/StyleGuide/css/patterns.css` is 315 lines and violates this, but is pre-existing StyleGuide documentation, not a MiniWiki component. |
| **CSS-2** | Custom properties only | Reference `--color-*`, `--space-*`, `--font-*` from the shell tokens (see Part 6 below). Never hardcode a value that belongs in a variable. **Parser violation:** warning banner uses hardcoded colours (`#FCEBEB`, `#791F1F`, `#F7C1C1`) instead of tokens — do not copy this pattern; use tokens instead. |
| **CSS-3** | Mobile inside component files | `@media (max-width)` rules live in the same file as the component, using breakpoints from shell (e.g., `719px` for MiniWiki drawer). No separate mobile files. |
| **CSS-4** | Semantic class names | Names describe what a thing *is* (`.card-grid`, `.project-board`), never how it looks. kebab-case, consistent with filenames. |
| **CSS-5** | Low specificity | Prefer single classes. Avoid IDs and nested selectors. Never `!important`. Focus ring and intent-revealing states use `:focus`, `:hover`, and single-class toggles, not high-specificity chains. |
| **CSS-6** | Sparse, structural comments | Large clear section headings; comments useful, not decorative. Use them to explain *why* a rule exists, not to restate what it does. |

### SVG Rules (if Generator produces SVG)

| Rule ID | Restatement | What This Means for a Generator File |
|---------|-------------|--------------------------------------|
| **SVG-1** | Coordinate system and `viewBox` | Origin `(0,0)` top-left; x→right, y→down. Always define `viewBox` — it sets the internal coordinate space and aspect ratio for resolution-independent scaling. Case-sensitive: `viewBox`, never `viewbox`. |
| **SVG-2** | Strict XML syntax | Self-close empty tags (`<circle />`). Tag and attribute names are case-sensitive. Always quote attribute values. |
| **SVG-3** | Painter's model, no `z-index` | Elements render in source order: earlier is painted beneath, later paints on top. There is no stacking context to appeal to. |
| **SVG-4** | Semantic shapes, then `<path>` | Use `<rect>`, `<circle>`, `<ellipse>`, `<line>`, `<polygon>` for simple geometry. `<path d>` for complex shapes — `M` move, `L` line, `C` cubic bezier. |
| **SVG-5** | DOM styling: `fill` and `stroke` | SVG elements live in the DOM; target them with classes and IDs. Use `fill` for colour (not `background-color`) and `stroke` for outlines (not `border`). |

---

## Part 6: Test Rules (node:test / unittest)

These bind for any test file in Generator.

| Rule ID | Restatement | What This Means for a Generator File |
|---------|-------------|--------------------------------------|
| **TEST-1** | Stdlib runners only | Python: `unittest` from the standard library. JavaScript: `node:test` + `node:assert/strict`. No pytest, Jest, Mocha, Vitest, mocking libraries, or jsdom (enforced by SR-2). Hand-build fakes if needed. |
| **TEST-2** | Smoke, not exhaustive | Assert three things per module: it imports cleanly, the happy path produces the right output, one guard or failure path behaves. Stop there. Full branch coverage belongs to a project with CI, which Generator is not. |
| **TEST-3** | File naming and location | One test file per source module, named after the module (e.g. `test_bundle.py`, `test-ui.mjs`). Place it in a `tests/` folder beside the source, mirroring the source tree. |
| **TEST-4** | Isolated, in-memory, no network | Database tests build a fresh in-memory SQLite (`sqlite3.connect(":memory:")`) — never touch real stores. No real network requests; no writes anywhere under `Memory/`. Reset shared module state between tests. |
| **TEST-5** | Deterministic, no sleeps | Await the real operation — a return, a response, a write — never a guessed `sleep` delay. A slow test is usually doing more than a smoke test needs. |
| **TEST-6** | Assert on behaviour, not absence of throw | "It didn't crash" is not coverage. Assert the actual output, return value, status, or state change. **Parser precedent:** `test-index.mjs` asserts "unknown id warns and renders not-found instead of throwing" — behaviour, not absence. |
| **TEST-7** | Anything with a gate gets a gate test | Where code enforces a permission, a read-only mode, or a `!Checkpoint`-equivalent boundary, it needs two tests: the blocked path is genuinely blocked, and the permitted path passes through. The code is not done until both exist. |
| **TEST-8** | DOM modules use fake DOM, not jsdom | Run the real source against a small hand-built fake exposing only what the module uses. No jsdom or similar (enforced by SR-2). **Parser precedent:** `_shell/tests/js/fake-dom.mjs` is 251 lines, hand-built, covers two modules' worth of real DOM usage. |
| **TEST-9** | Mirror the logic, don't duplicate the bug | Import the real module wherever possible. If a test must recreate source logic, comment which file and function it mirrors — a passing test against a stale copy proves nothing. **Parser violation:** `test-ui.mjs` imports `buildLinkCatalogue` from `ui.js` instead of its real home `autolink.js`, creating a re-export seam that hides what `ui.js` actually owns — see Part 4. |

---

## Part 6: Shell Design-Token Vocabulary

**Source of truth:** `System/Widgets/Parser/_shell/StyleGuide/css/tokens.css` (readable reference) and `_shell/src/shell.css` (canonical).

**Directive:** Reference these tokens from shell in any Generator CSS. Never hardcode a value that exists as a token. If a new token is needed, that is a Luke conversation (would require a shell change).

### Colour Tokens

#### Neutrals (structural, semantic-agnostic)

| Token | Value | Used for |
|-------|-------|----------|
| `--bg` | `#faf9f5` | Page background — warm off-white, not pure white. All backgrounds fall back to this if not themed. |
| `--card` | `#fff` | The single content card sitting on `--bg`. Text inputs, button backgrounds, floating overlays (`#tip`, `#ctx`, `#spelling-suggestions`). |
| `--ink` | `#1a1a17` | Primary text colour. Header badge fill. Primary button (`.primary`) fill and text. Body text. |
| `--ink2` | `#5f5e5a` | Secondary text — meta labels, table headers, muted captions, footer attribution spans. |
| `--ink3` | `#9a9891` | Tertiary/faint text — placeholders, footer, word counts, tree collapse glyphs. |
| `--line` | `#e3e1d9` | Default 1px borders and dividers. Explainer table cells. Context menu header borders. |
| `--line2` | `#c9c7bd` | Slightly stronger 1px borders — inputs, buttons, popovers, spelling-suggestion container. Focus ring inner border. |

#### Interactive (accents and feedback)

| Token | Value | Role |
|-------|-------|------|
| `--acc` | `#185FA5` | The **one** accent colour — focus ring, active focus-level toggle button, selected chips, hover states on links. **Not coincidence:** identical to Grammar's blue hue's `h600`. Used *only* for interactive affordance and selection, never as a structural colour. |
| `--accbg` | `#E6F1FB` | Accent tint — focus-ring 3px glow, selected suggestion background, "See also" section background, key search-terms box background. |

#### Semantic (error and other)

| Token | Value | Role |
|-------|-------|------|
| `--red` | `#E24B4A` | Spelling-error underline **only**. Do not reuse for parse errors, warnings, or other semantic states — those have their own hardcoded colours in the shell (a known gap). Never introduce a new semantic colour without a Luke conversation. |

### Shape Tokens

| Token | Value | Used for |
|-------|-------|----------|
| `--radius` | `8px` | Default corner radius: buttons, inputs, popovers (`#key`, `#tip`, `#ctx`, `#spelling-suggestions`), explainer table cells' container, MiniWiki home cards, MiniWiki section blocks. |

### Additional Radius Values (not token-named, but consistent)

- `12px` — outer `.card` only (slightly more generous than interior chrome, matches its role as the outermost frame).
- `4px` — small inline pieces: `.chip`, focus-level colour rules (`.cl`, `.lbl`, `.ph`), outline tree toggles, MiniWiki tree items.
- `999px` (fully round) — **only in MiniWiki term chips** (`.mw-term-chip`). Deliberately a departure from the standard 8px/4px system, marking search terms as visually distinct. Do not copy to other contexts without Luke approval.

### Typography (Implicit Tokens)

No explicit font-family token; all browsers use the system font stack:

```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
```

No `rem` units in the shell. Root `font-size: 16px`; everything else is sized in `px` off that. No explicit font-size token for every semantic use, but **common sizes** from `shell.css`:

- 17.5px — `#stage` (parsed text); line-height 2.4 to leave room for inline labels/underlines.
- 17px — `header .brand` (widget name).
- 15px — `#input` (raw text-entry area) and `.mw-lead` (wiki lead sentence).
- 14px — `button`, `.mw-page` body.
- 13.5px — `#rules ul` (explainer rule lists), `.mw-body p` (wiki body paragraphs).
- 13px — `#sline` (one-line summary), `#ctx` (context menu), `#spelling-suggestions`.
- 12.5px — `#iconbar`, `.xt th/td` (explainer tables), `.mw-reference-list` (MLA refs).
- 12px — `.muted`, `#key`, `footer`, `.tt` (tooltips).
- 11px — `#stage .lbl` (clause label), `#stage .pos` (word-class label), `.mw-menu-heading` (section label).

**Line-height:** body `1.55`; `#stage` overrides to `2.4` for the same reason — inline word-level chrome needs vertical room.

### Spacing (Common Values, No Token Names)

Reuse one of these rather than inventing a new number:

| Context | Padding/Gap |
|---------|------------|
| Page margin | 24px 20px 40px |
| Card interior | 20px |
| Button | 6px 14px |
| Input area | 12px 14px |
| Warning banner | 8px 12px |
| Colour key / tooltip | 6px 10px to 8px 11px |
| Chip | 1px 7px |
| Toolbar row gap (`.bar`) | 8px |
| Page-level margins (top/bottom) | 8px–16px |
| Section gaps | 10px–20px |

### MiniWiki Module — Token Reuse (Not a New Palette)

The MiniWiki module (`_modules/MiniWiki/src/styles.js`) uses **only** the shell's ten tokens:
- `--bg`, `--card`, `--ink`, `--ink2`, `--ink3`, `--line`, `--line2`, `--acc`, `--accbg`, `--radius`

No new colours are introduced. If a Generator module needs to style content that appears in a separate tab (like MiniWiki does), apply the same constraint: reuse the ten tokens in your CSS. **Exception:** `#fff` (literal white) is used *only* as text colour **on** accent-filled surfaces (`.mw-copy-all` button, `.mw-term-chip:hover`), mirroring `button.primary`'s `color:#fff` on `background:var(--ink)`. Never as a new background colour of its own.

---

## Part 7: Reusable Component Patterns

**Source:** `System/Widgets/Parser/_shell/StyleGuide/03-components.md` (canonical) and `css/patterns.css` (readable CSS reference).

Generator may inherit or adapt these. They are pre-built, pre-tested patterns that solve common needs:

### Shell Chassis Components (Every Parser Widget)

- **Header** — brand badge (hardcoded `P` glyph, 30×30px) + widget name (`#hdrname`), meta line right-aligned (`#hdrmeta`). Flex space-between layout.
- **Buttons** — three states: default (white bg, `--line2` border), `.primary` (one per screen, `--ink` bg), `:disabled` (45% opacity, no-click cursor). Focus-level toggles (`.fv.on`) have thicker accent border with tighter padding to stay the same size.
- **Input area** (`#input`) — contenteditable (not `<textarea>`), supports semi-plain formatting (italics/bold/dot-points). `:focus` has `--acc` border + 3px `--accbg` glow ring. **Known gap:** placeholder attribute is inert (no visual placeholder when empty).
- **Over-cap warning banner** (`.warn`) — hidden by default, shown when word count exceeds `CONFIG.cap`. Hardcoded colours; do not copy as-is (use tokens for new warnings).
- **Toolbar** (`.bar`) — `display:flex; gap:8px; flex-wrap:wrap`. Container for buttons, labels, and muted text spans. Used for both action buttons and focus-level toggles.
- **Colour key** (`#key`) + **Chips** (`.chip`) — key is a 12px label on `#f4f3ee` bg (not a token — known gap). Chips are unstyled for colour; `ui.js` sets `background`/`color` inline per clause from the hue's `h50`/`h800`. Class provides shape only; never give `.chip` a fixed background in CSS.
- **Icon bar** (`#iconbar`) — 12.5px muted-text row with help-cursor items (`.ic`), each with a pure-CSS hover tooltip (`.tt` positioned absolutely, visibility toggled on `:hover`). No JS needed for the tooltip. Box-shadow for hover elevation.
- **Summary line** (`#sline`) — 13px `--ink3` text. The classification summary shown above the parsed text.
- **Stage** (`#stage`) — 17.5px parsed text with 2.4 line-height. Contains `.cl` (clause), `.ph` (phrase), `.w` (word) spans. Colours come from generated `.v-<level>` rules + inline custom properties per clause (see Part 9). `.lbl`, `.pos` labels start `display:none`, revealed by focus CSS. `.noclause` tokens (punctuation, glue) render in `--ink2`.
- **Hover pop-up** (`#tip`) — JS-positioned card near a hovered word. Absolute position, `display:none` by default, positioned inline by `ui.js`. `pointer-events:none` so it never intercepts the mouse. Contains a small uppercase eyebrow label (`<b>`) + explanation. Box-shadow for elevation.
- **Context menu** (`#ctx`) — replaces browser's native context menu inside `#stage`. Absolute position, JS-positioned. Header row (`.h`) shows the hovered word + short POS; plain `div`s below are menu items.
- **Spelling suggestion popover** (`#spelling-suggestions`) — **id is load-bearing** — Spelling module looks it up by exact id. Absolute position, `display:none` by default. First suggestion is visually promoted (accent bg). Keyboard-selected option gets accent outline. Action items (ignore/learn) get plain bordered variant.
- **Explainer panel** (`#explainer`) — hidden until "Explain" button is clicked. Contains `.xt` tables (explainer-table class, 12.5px cells, centre-aligned with left-aligned headers) and `#rules` lists (section labels `.cat` in small uppercase, rule `<li>` lists, inline worked examples `.ex` in italic muted).
- **Footer** — 12px muted text, flex with `gap:8px`. Export buttons left, version/attribution right (via `margin-left:auto`). Attribution links use dotted `--ink3` underline at rest, switch to solid `--acc` on hover/focus + focus ring.

### MiniWiki Module Components (Separate Tab, Optional)

- **Layout root** (`.mw-root`) — two-column flex row: 260px fixed side menu + flexible article pane. Below 719px, becomes stacked with off-canvas drawer.
- **Side menu** (`.mw-side-menu`) — search box (`.mw-search-box`, live-filtering on keystroke), three fixed links (Home/All/Surprise me), category heading + category list (`.mw-menu-categories`), second heading + outline tree.
- **Outline tree** (`.mw-tree` + nested `.mw-tree-children`) — renders **lazily**. Toggle button (`.mw-tree-toggle`, ▶/▼ glyph) on click; leaf nodes get a dot (`.mw-tree-leaf`). Only direct children in DOM when expanded. Keeps DOM bounded.
- **One link family** — `.mw-menu-link`, `.mw-tree-link`, `.mw-all-link`, `.mw-breadcrumb-link`, `.mw-home-card-title` all share `color:var(--ink)`, `padding:3px 6px`, `border-radius:4px`, `var(--accbg)`/`var(--acc)` on hover. `.mw-active` adds bold + accent tint for current page.
- **Breadcrumb** (`.mw-breadcrumb`) — 12px, `--ink2`, root-first ancestor titles (each followed by " › ") ending in plain-text current title. Omitted for top-level articles.
- **Article page** — `.mw-title` (22px/600) → `.mw-lead` (15px medium, optional) → `.mw-body` (13.5px paragraphs, 1.6 line-height, auto-linked) → zero or more `.mw-section-block`s (heading + list/worked-example) → MLA references block (optional) → "See also" (optional) → prev/next nav (optional) → key-search-terms box (always last).
- **Section / landing page** (`.mw-page.mw-section`) — breadcrumb, title, optional lead, then grid of `.mw-home-card`s (border + padding, title + lead) — reused from home page template.
- **Home page** (`.mw-page.mw-home`) — cartridge name as title, generated lead, then `display:grid` of `.mw-home-card`s, one per top-level category. Entirely computed at render time.
- **Inline auto-links** (`.wikilink`) — `color:var(--acc)`, no underline at rest, underline on `:hover`. Click navigates via `autolink.js`. Hover preview popover (`popover.js`, appears ~150ms after `mouseover`, flips below viewport if no room above).
- **"See also"** (`.mw-see-also`) — tinted `var(--accbg)` block. `.mw-see-also-title` ("See also") + flex-wrap row of `.mw-see-also-link` chips (bordered, `var(--card)` bg, `var(--accbg)` on hover). Current article's siblings (not itself), capped at 8. Omitted if no siblings.
- **Prev/next sibling nav** (`.mw-article-nav`) — flex row, `.mw-nav-prev` left, `.mw-nav-next` right (via `margin-left:auto`). Wraps at ends. Omitted if no siblings.
- **MLA references block** (`.mw-reference-list`) — ordered list, 12.5px, `--ink2`, hanging indent. Omitted entirely if source content has no frontmatter — never render empty.
- **Key search-terms box** (`.mw-search-terms-box`) — **the one deliberately tinted section** — full 1px `--line2` border + `var(--accbg)` background (vs. every other section's plain bg). `.mw-section-heading` recoloured `var(--acc)`. Contains `.mw-term-list` (flex-wrap row of `.mw-term-chip`s, `border-radius:999px` — the *one* pill shape in the whole system) + `.mw-copy-all` button. Each chip and button have copy affordance.
- **Mobile drawer** — below 719px, `.mw-side-menu` becomes fixed-position off-canvas (`transform:translateX(-100%)` → `translateX(0)`). `.mw-nav-toggle` button (☰, fixed top-left) opens. `.mw-nav-scrim` overlay (closes on click), Escape key, or article selection all close.

---

## Part 8: Parser Violations to Avoid

These are confirmed patterns from `System/Widgets/Parser/_modules/MiniWiki/REVIEW-vibe-rules.md` that Generator should **not** copy.

### HIGH SEVERITY — Structure and Ownership

**Violation: SR-4 (Duplicated Tree Logic)**

- **Location:** `_modules/MiniWiki/src/tree.js:56-68` implements `visibleNodes()` (a lazy-expansion tree walker). `_modules/MiniWiki/src/ui.js:75-116` independently re-implements the same logic in `renderTreeLevel()`.
- **Problem:** `visibleNodes()` is never called from production code — only its own test. `renderTreeLevel()` duplicates the branch/expand logic against the DOM directly.
- **Why Generator should avoid this:** Before writing a tree walker or DOM renderer, grep your siblings. If the logic exists, import and reuse it. Never maintain two copies.
- **Fix for Parser (not Generator's job):** Either delete `visibleNodes()` + its test (it adds nothing), or refactor `renderTreeLevel()` to consume it and remove the duplicate branch logic from ui.js.

**Violation: SR-1 / TEST-9 (Dead Re-Exports for Tests)**

- **Location:** `_modules/MiniWiki/src/ui.js:13-14` imports `byIdNumeric` and `buildLinkCatalogue` and re-exports them at lines 321-322. Neither is called in `ui.js` itself.
- **Problem:** The only consumer is `test-ui.mjs:6,55`, which imports `buildLinkCatalogue` *from ui.js* instead of from its real home `autolink.js`. This hides what `ui.js` actually owns.
- **Why Generator should avoid this:** Never import a function just to re-export it for a test. Import the real module in your test instead. TEST-9: "Mirror the logic, don't duplicate the bug" — don't create an indirection that makes the test seam lie about module ownership.
- **Fix for Parser:** Change `test-ui.mjs`'s import to `../src/autolink.js`, then delete the re-exports from `ui.js`.

### MEDIUM SEVERITY — Dead and Unreachable Code

**Violation: Dead Code Path (Unreachable "Not Found")**

- **Location:** `_modules/MiniWiki/src/index.js:83-88` has a not-found branch in `renderView()` — unknown id → a `.mw-not-found` page + `console.warn`. But the router (`routeFromHash()`, lines 204-220) never calls `renderView()` with a bad id; it redirects to `home` instead.
- **Problem:** The not-found UI is built and tested but unreachable in normal use. Only direct calls to `renderView("article", <bad id>, ...)` trigger it, which nothing does.
- **Why Generator should avoid this:** JS-2 says "Never fail silently." If you build an error UI, wire it up so it actually runs. Don't leave two half-finished answers to the same question (fallback-to-home vs. show-error) both in the code.
- **Fix for Parser:** Either make `routeFromHash()`'s else branch call `renderView()` with the bad id so the not-found page shows, or delete the dead not-found branch and keep home-redirect as the one documented behaviour. (The former is more user-honest.)

### LOW SEVERITY — Robustness

**Violation: Bundler Gap (Silently Drops Orphaned Files)**

- **Location:** `_modules/MiniWiki/build/bundle_miniwiki.py:93-95` checks that every name in `ORDER` exists as a file, but never checks the reverse — a `src/*.js` file that exists but isn't in `ORDER` is silently skipped.
- **Problem:** If a developer adds a new `src/` file and forgets to add it to `ORDER`, the build succeeds silently without bundling it. This is exactly the failure mode reported in a prior incident.
- **Why Generator should avoid this:** Every build script needs PY-6 (explicit exceptions, non-zero exit). Add a "reverse" check: after validating that `ORDER` files exist, check that `src/` has no extra files not in `ORDER`. Raise non-zero if found.
- **Fix for Parser (and Spelling, which has the same gap):** Add `extra = sorted(f.name for f in SRC_DIR.glob("*.js") if f.name not in ORDER)` alongside the existing `missing` check. Raise `BundleError` if `extra` is non-empty.

### NITS — Documentation Accuracy

**Pre-existing gap: CSS-1 violation**

- `_shell/StyleGuide/css/patterns.css` is 315 lines; CSS-1 says "under 150 lines; split when it grows."
- **Context:** This is the **StyleGuide documentation file** (not a component stylesheet), predates MiniWiki, and was already flagged as pre-existing. Not a MiniWiki defect, but worth noting: don't copy its size as a precedent. Actual component CSS files (`_modules/MiniWiki/src/styles.js`, 89 lines; `styles-interactive.js`, 91 lines) are fine.

### Known Documented Limitations (Not Violations)

These are real gaps, but they are **honestly documented** in the StyleGuide — treat them as known limitations, not bugs to hide:

- **Deep-link tree doesn't auto-expand ancestors** (`nav-active.js:28-34` comment: "Silently no-ops when nothing matches"). Documented in `03-components.md:329` and `04-states-and-interaction.md:94`. Real UX gap on first deep-link visit, but not a hidden bug.
- **No mobile responsiveness in shell** (`04-states-and-interaction.md:50-62`). Shell is desktop/tablet-first; below ~500–600px the toolbar wraps but nothing else adapts. Documented explicitly.
- **Input placeholder is inert** (`#input` has `data-placeholder` attribute but no CSS rule consumes it). Documented in `03-components.md:68-74` as a known gap.
- **Spelling underline fallback has invalid `wavy` border** (`01-foundations.md:135-139`). Invalid `border-style:wavy` invalidates the whole declaration, so fallback renders **no underline at all**. Documented as confirmed.

---

## Part 9: Design Rules — Structural-Kinship Colour Model

**Only if Generator uses the Parser's colour palette model.** This section is *reference only*; Generator may have its own colour logic.

See `System/Widgets/Parser/_shell/StyleGuide/02-colour-model.md` for the full specification. Summary:

**Core idea:** Colour means **"this belongs to the same structural unit,"** not "this is a noun." Each clause gets its own hue; everything inside (phrases, words) renders in shades/tints of the *same* hue.

**Palette shape:** Every hue is five values:
- `h50` — lightest tint
- `h100` — full-intensity background
- `h600` — mid-tone (labels, tentative-underline colour, key chip text)
- `h800` — darkest (text on `h50`/`h100` backgrounds, must stay legible)
- `hf` — translucent fade (unfocused version, usually `rgba(..., .12)`)

**Grammar's six hues (reference):** teal, amber, purple, pink, coral, blue. Blue's `h600` (`#185FA5`) is identical to `--acc` — not coincidence, but deliberate consistency.

**Hue assignment:** Cyclic by clause index, modulo palette length (`pal[cx % pal.length]`). No semantic assignment (not "conditionals are always purple"). First six clauses get different hues; the 7th repeats the first.

**Focus-level CSS generation:** The assembler reads `parser.levels` and assigns each render-kind a home index where it renders at full intensity:
- **Clause home** = index 1 (or 0 if only one level)
- **Phrase home** = index 2 (only if 3+ levels exist)
- **Word home** = last index (`n − 1`)

Then for each level, the generated CSS handles the visibility and styling based on whether it is the home, level 0, or neither.

**Token discipline for structural colour:** No new colours are introduced. All clause hues come from `config.yaml`'s `colours.palette`. All backgrounds and text colours reference either the clause-injected custom properties (`--h50`, `--h100`, `--h600`, `--h800`, `--hf`) or the shared shell tokens.

---

## Part 10: Checklist Before Shipping

Use this before marking any Generator code as ready:

### Python Scripts
- [ ] No `import` statement opens a file or runs side effects. Real work is behind `if __name__ == "__main__":`.
- [ ] Every parameter and return type is annotated (PY-4).
- [ ] Paths use `Path(__file__).resolve().parents[n]` and `/` (PY-5), never `os.path.join`.
- [ ] Exceptions are explicit and non-zero exit is called (PY-6).
- [ ] All file/db opens use `with` (PY-7).
- [ ] Compared to `Parser/_shell/build/assemble.py` — naming, arg handling, logging format match (SR-6).
- [ ] Grepped for duplicated logic against sibling scripts (SR-4).
- [ ] No `pip install`, `venv`, or `requirements.txt` (PY-1, SR-2).

### JavaScript (ES Modules)
- [ ] No `import` opens files or starts servers. All side effects are in event handlers or top-level `main()` equivalents.
- [ ] Error guards use `console.warn` with context (JS-2).
- [ ] `innerHTML` never contains user data without escaping (JS-6).
- [ ] No framework, no bundler, no npm dependencies (JS-7, SR-2).
- [ ] Compared to `Parser/_shell/src/ui.js` — naming, error handling match (SR-6).
- [ ] Grepped for duplicated logic against sibling modules (SR-4).

### HTML
- [ ] Exactly one `<h1>` per page; proper heading hierarchy (HTML-3).
- [ ] Every `<img>` has `alt` (HTML-2).
- [ ] Every form control has a real `<label>` (HTML-5).
- [ ] Interpolated content (titles, text from stores) is escaped before `innerHTML` (HTML-6).
- [ ] Semantic elements (`<nav>`, `<main>`, `<article>`, `<section>`, `<header>`, `<footer>`) used, `<div>` only for styling (HTML-1).
- [ ] No external stylesheets or webfonts; CSS inlined or linked from tokens (HTML-4, SR-2).

### CSS
- [ ] Every colour is a shell token (`--bg`, `--card`, `--ink`, `--ink2`, `--ink3`, `--line`, `--line2`, `--acc`, `--accbg`, `--red`, `--radius`). No hardcoded hex values except the one exception (white text on accent, matching shell precedent) (CSS-2).
- [ ] File is under 150 lines; split if it exceeds (CSS-1).
- [ ] Class names describe what a thing *is*, not how it looks; kebab-case, consistent with filenames (CSS-4).
- [ ] Specificity is low — single classes, no IDs, no nested selectors (CSS-5).
- [ ] Mobile rules are in the same file as the component using `@media (max-width)` (CSS-3).
- [ ] Comments explain *why*, not *what* (CSS-6).
- [ ] If SVG is used, `viewBox` is defined, tags are self-closed, attribute values are quoted (SVG-1, SVG-2).

### Tests
- [ ] One test file per module, in `tests/` folder, named after the module (TEST-3).
- [ ] Uses stdlib only: `unittest` (Python) or `node:test` + `node:assert/strict` (JS) (TEST-1).
- [ ] Three things per module: imports cleanly, happy path works, one guard/failure path (TEST-2).
- [ ] No in-memory DBs touch real stores. No real network. No writes under `Memory/` (TEST-4).
- [ ] No `sleep` delays; await real operations (TEST-5).
- [ ] Assertions check actual output, not just "didn't throw" (TEST-6).
- [ ] Any guarded code path has two tests: blocked and permitted (TEST-7).
- [ ] If DOM is touched, uses hand-built fake, not jsdom (TEST-8).
- [ ] Tests import the real module, not stale copies (TEST-9).

### Cross-Cutting
- [ ] Grepped for copy-pasted logic against siblings; extracted to shared modules if found (SR-4).
- [ ] No secrets in code, fixtures, comments, logs (SR-5).
- [ ] Compared to closest Parser neighbour script for naming, arg handling, logging — matches (SR-6).
- [ ] Performance is measured; no blocking calls or unbounded reads (SR-3).
- [ ] Failures print to stderr and exit non-zero; no silent failures (PY-6, JS-2).

---

## References

- **Canonical vibe-coding rules:** `Memory/Long-Term/Coding/vibe-coding-rules.md`
- **Parser shell design system:** `System/Widgets/Parser/_shell/StyleGuide/` (index.md, 01–05, css/)
- **Parser violations audit:** `System/Widgets/Parser/_modules/MiniWiki/REVIEW-vibe-rules.md`
- **Parser's closest neighbours (reference for SR-6):**
  - Python: `System/Widgets/Parser/_shell/build/assemble.py`
  - JavaScript: `System/Widgets/Parser/_shell/src/ui.js`, `System/Widgets/Parser/_modules/MiniWiki/src/index.js`
