# MiniWiki Review vs. `vibe-coding-rules.md`

Reviewer: Claude (direct review, no sub-agents). Date: 2026-08-10.
Scope: `_modules/MiniWiki/` (src, build, tests, docs) + its shell integration
(`_shell/src/miniwiki-seam.js`, `_shell/build/assemble.py` miniwiki paths,
`_shell/StyleGuide/*` MiniWiki sections).

## Verdict

The module is broadly sound: escaping discipline is correct everywhere content
crosses into `innerHTML` (markdown.js, autolink.js, popover.js, extract_articles.py,
miniwiki-seam.js's script-tag guard), token discipline is clean, tests are real
(behavioural, not smoke-only-in-name), and all four suites pass. The confirmed
problems are concentrated in one place: leftover seams from concurrent-agent
edits — a genuinely duplicated/dead tree-expansion implementation, two pointless
re-exports that exist only to serve a test import, and an unreachable "not found"
code path — plus the already-known deep-link auto-expand gap, which turns out to
be honestly documented as "by design" rather than covered up. Nothing here is an
XSS hole or a broken gate; the findings are hygiene and one real UX/robustness gap.

## Test tallies (verbatim from actual runs)

```
_modules/MiniWiki  (node --test):       tests 43, pass 43, fail 0
_modules/MiniWiki/tests (python3 -m unittest test_extract_articles): Ran 6 tests — OK
_modules/Spelling  (node --test):       tests 42, pass 42, fail 0
_shell              (node --test):      tests 14, pass 14, fail 0
_shell (python3 -m unittest discover -s tests): Ran 18 tests — OK
```
The three `console.warn`/stack-trace-looking lines during the `_shell` JS run are
`MiniWikiSeam.open`'s own JS-2 guard logging (Blob unavailable under Node,
expected in that test), not failures — confirmed by the trailing `pass 14 / fail 0`.

---

## CONFIRMED findings

### High — duplicated tree-expansion logic, one copy dead (SR-4, concurrent-write damage, concern #2)
`_modules/MiniWiki/src/tree.js:56-68` implements `visibleNodes(articlesById, expandedIds)`
— a full lazy-expansion tree walker, exported and covered by its own test
(`tests/test-tree.mjs:27-33`). `_modules/MiniWiki/src/ui.js:75-116`
(`renderTree`/`renderTreeLevel`) independently re-implements the same
walk-and-expand logic against the DOM. `visibleNodes` is never called from any
production file — grep confirms its only caller is its own test. This is SR-4
("grep siblings before adding logic... extract to a shared module") violated in
the direction of *already having* a shared function and not using it, almost
certainly because one agent built `visibleNodes()` as the tree contract and a
later agent (or the same one, later) wrote `renderTreeLevel` against the DOM
directly without noticing. Fix shape: either delete `visibleNodes` + its test
(it earns nothing extra), or refactor `renderTreeLevel` to consume it and drop
the duplicate branch/expand logic from ui.js. Given `renderTreeLevel` also does
DOM-only work (toggle buttons, `aria-label`), the cleaner fix is deleting
`visibleNodes` — it is unused, untested-by-production-code, and TEST-9 warns
against a test mirroring logic that isn't the real path.

### Medium — dead pass-through re-exports that exist only to serve one test (SR-1, TEST-9)
`_modules/MiniWiki/src/ui.js:13-14` imports `byIdNumeric` (from `tree.js`) and
`buildLinkCatalogue` (from `autolink.js`) and re-exports both at
`ui.js:321-322`, but neither is called anywhere inside `ui.js`'s own body —
confirmed by grep, the only uses are `tree.js`'s and `autolink.js`'s own
internals. The sole consumer of `ui.js`'s re-export is
`_modules/MiniWiki/tests/test-ui.mjs:6,55`, which imports `buildLinkCatalogue`
*from ui.js* instead of from its real home, `autolink.js`. This is exactly the
seam TEST-9 warns about ("mirror the logic... a passing test against a stale
copy proves nothing") in miniature — not a stale copy here, but an indirection
that makes ui.js's public surface lie about what it owns. Fix shape: change
`test-ui.mjs`'s import to `../src/autolink.js`, then delete the two re-exports
(and the now-unneeded `byIdNumeric`/`buildLinkCatalogue` imports) from `ui.js`.

### Medium — unreachable "not found" render path (concern #5, dead code)
`_modules/MiniWiki/src/index.js:83-88` (`renderView`) has a real not-found
branch: unknown id → a `.mw-not-found` page + `console.warn`. But the only
router that decides *whether* to call `renderView` with an unknown id is
`routeFromHash()` at `index.js:204-220`, whose `else` branch (216-219) redirects
straight to `home` on any hash that doesn't match a known article — it never
calls `renderView("article", hash, ...)` with the bad id, so the not-found
branch it would trigger is dead in normal use. The only way to reach it is a
host calling `renderView("article", <bad id>, ...)` directly, which nothing in
this codebase does (wikilink hrefs are always drawn from `linkCatalogue`,
which only contains valid ids). So concern #5's "silent fallback to home" is
confirmed, and it isn't a coherent design choice so much as two different
half-finished answers to the same question left in the file at once. Fix
shape (pick one, don't leave both): either make `routeFromHash`'s else branch
call `renderView("article", hash, articleContainer, navigate)` so the
not-found page it already builds actually shows, or delete the dead
not-found branch from `renderView` and keep the home-redirect as the one
documented behaviour. The former is more honest to the user; the latter is
less code. Given HTML-6/JS-2's "never fail silently" spirit and the fact the
not-found UI is already built and tested (`guard path: renderView() on an
unknown id warns and renders a not-found page instead of throwing`, index.js's
own test asserts exactly the code path the router never takes), I'd wire it up
rather than delete it.

### Confirmed as described — deep-link tree doesn't auto-expand ancestors (concern #4)
`_modules/MiniWiki/src/index.js:41` creates one module-level `expandedIds = new
Set()` that nothing ever seeds with an article's ancestor chain.
`nav-active.js:28-34`'s own doc comment states the contract explicitly:
"Silently no-ops when nothing matches (e.g. the current article sits inside a
still-collapsed branch of the lazy tree) rather than forcing an expand." This
is genuinely a UX gap, but it is **not hidden** — `_shell/StyleGuide/03-components.md:329`
documents it plainly ("the lazy tree has no link to mark, by design (the tree
never auto-expands...)"), and `04-states-and-interaction.md:94` matches. So this
is a real, disclosed limitation, not a docs-vs-code mismatch. Severity: Medium
(a real first-visit-via-deep-link disorientation, not a correctness bug — active
highlighting and hashchange routing both work correctly once the tree is
expanded by hand). Fix shape: in `mount()`'s initial `routeFromHash()` and in
`navigate()`, call `getAncestors(articlesById, id)` and add each ancestor's id
to `expandedIds` before re-rendering the side menu (currently the side menu is
built once at `mount()`-time and never rebuilt on navigate — auto-expand would
also require re-calling `renderSideMenu`, which is a slightly bigger change
than it first looks, since right now navigation only touches the article pane
and `.mw-active`, never the nav pane's DOM).

### Low — bundler can silently drop an unlisted `src/*.js` file (concern #3, robustness)
`_modules/MiniWiki/build/bundle_miniwiki.py:93-95` only checks the
*forward* direction — every name in `ORDER` must exist as a file — and raises
`BundleError` if not. It never checks the *reverse*: a `src/*.js` file that
exists but isn't in `ORDER` is simply never read, never bundled, and the build
succeeds silently. This is exactly the failure mode the reported "late-found
ORDER bug" was. Right now `ORDER` (bundle_miniwiki.py:36-52) does list all 15
current `src/*.js` files — verified by diff against `ls src/` — so there is no
live bug today. But the guard against a *future* recurrence doesn't exist. This
is not a MiniWiki-specific gap: `_modules/Spelling/build/bundle_spelling.py`
has the exact same one-directional check (its own `ORDER`/`missing` logic is
structurally identical), so MiniWiki correctly followed the house precedent
(SR-6) — the precedent itself is what's incomplete. Fix shape (apply to both
bundlers, since SR-4 forbids fixing one copy and not the other): add
`extra = sorted(f.name for f in SRC_DIR.glob("*.js") if f.name not in ORDER)`
alongside the existing `missing` check and raise the same `BundleError` class
if `extra` is non-empty — turns "silently vanishes from the build" into "build
fails loudly, naming the orphaned file," which is exactly PY-6's intent.

### Nit — `ui.js` is 323 lines with no split needed; `patterns.css` predates and exceeds CSS-1's limit
No JS file size rule exists in vibe-coding-rules.md (SR-1 is about
single-responsibility, not a line count) — `ui.js` at 323 lines is one
cohesive concern (page rendering) with no natural seam to split along; it does
not need dividing. `patterns.css` (`_shell/StyleGuide/css/patterns.css`, 315
lines) does violate CSS-1's explicit "under 150 lines; split when it grows"
—but this predates the MiniWiki work (confirmed: not touched by MiniWiki's own
diff — `git status` shows it modified in the current working tree, but its
size problem was flagged as pre-existing in the task brief, and its content is
StyleGuide preview markup, not MiniWiki component styles). Not a MiniWiki
defect; flagging only because the task asked for a size audit. Actual MiniWiki
CSS lives in `styles.js`/`styles-interactive.js` (89 + 91 lines, both fine).

---

## GOOD — worth stating plainly

- **Escaping discipline is correct end-to-end.** `body_html` is escaped once at
  build time (`extract_articles.py:239-247`'s `render_body_html`/`escape_html`),
  `autolink.js:90-119` only rewrites text runs *between* existing tags (never
  reintroduces raw text outside a tag), and `popover.js:39-50` escapes title/lead
  independently before its own `innerHTML` write — three separate call sites, all
  correct, each with a comment explaining *why* it's safe (JS-4's "why not what").
  `miniwiki-seam.js:87-99`'s `safeScriptBody()` additionally guards against the
  HTML-parser-level `</script` closing-tag quirk when the bundle+articles are
  spliced into the new tab's document string — a subtlety most modules miss.
- **Popover timer hygiene is correct.** `createHoverHandlers` (popover.js:91-135)
  calls `cancelShow()` before every new `setTimeout` and on every hide path — no
  leaked timers, confirmed by reading, not just by the passing test.
- **Token discipline holds.** Grepped every `--[a-z-]+` custom property referenced
  in `styles.js`/`styles-interactive.js`: exactly the ten allowed shell tokens
  (`--bg --card --ink --ink2 --ink3 --line --line2 --acc --accbg --radius`), no
  rogue palette.
- **The shared `fake-dom.mjs` change is legitimate, not a one-module hack.**
  Diffing `_shell/tests/js/fake-dom.mjs` shows additive, generic capability —
  class-selector matching, a text-node-safe `walk()`, `innerHTML`-clears-children,
  `replaceWith`/`parentElement`, `doc.head` — none of it MiniWiki-specific, all of
  it plausible for any future DOM-touching module. Both `_modules/Spelling/tests/test-ui.mjs`
  and every MiniWiki DOM test import it from the same shared path
  (`../../../_shell/tests/js/fake-dom.mjs`), which is exactly SR-4's intent: one
  fake DOM, extended in place, not copy-pasted or forked per module. TEST-8 asks
  for "a small hand-built fake exposing only what the module uses" — at 251 lines
  covering two modules' worth of real DOM usage it's still small and still
  hand-built; no jsdom, no library.
- **The extractor is genuinely dialect-aware and tested for it.** Six unit tests
  cover the documented shape, both content dialects, category-description
  folding, missing-references-never-fabricated, and a zero-articles guard
  (`ExtractError`) — this is TEST-2's "smoke, not exhaustive" done right: one
  happy path per real concern, one guard, no padding.
- **Typed signatures, `pathlib`, stdlib-only all hold** in both `extract_articles.py`
  and `bundle_miniwiki.py` (PY-1/PY-4/PY-5) — confirmed by reading every `def`.
- **The bundler ORDER list is currently complete** — all 15 `src/*.js` files are
  listed, verified against `ls src/`; the concern in this brief was about a past
  incident and future robustness (addressed above as a Low finding), not a
  present bug.
- **Test quality is real, not trivia.** Assertions check actual output shape
  (e.g. `test-autolink.mjs`'s whole-word + collision-exclusion cases,
  `test-index.mjs`'s "unknown id warns and renders not-found instead of
  throwing"), not just "didn't throw" — TEST-6 is honoured throughout the
  suite I read.
- **The module contract matches Spelling's precedent.** `createMiniWikiModule(options)`
  mirrors `createSpellingModule(options)`'s shape exactly (one factory, document
  injected for testability, no global leakage beyond the one `window.createMiniWikiModule`
  the bundler assigns) — `index.js`'s own header comment states this explicitly
  and it checks out against `_modules/Spelling/src/index.js`.

## SPECULATIVE / lower-confidence observations (not verified as defects)

- **No focus trap or focus return in the mobile drawer** (`drawer.js`). Opening
  the drawer doesn't move focus into it, closing it doesn't return focus to the
  toggle button, and the toggle has no `aria-expanded`. Vibe-coding-rules.md has
  no explicit drawer/focus-trap rule (HTML-5 covers forms only), so this isn't a
  rule violation, but it's a real accessibility gap worth a follow-up if MiniWiki
  is meant to be used by keyboard/screen-reader users on mobile widths.
- **`routeFromHash`'s home-fallback vs. `renderView`'s not-found page** is flagged
  above as CONFIRMED dead code; whether the *product* should show "not found" vs.
  silently redirecting is a judgment call I'm not resolving for Luke — flagging
  both options in the fix shape above rather than picking one.
