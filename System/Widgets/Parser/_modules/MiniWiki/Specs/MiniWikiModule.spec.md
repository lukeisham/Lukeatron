# MiniWiki Module — Technical Spec

| Field | Value |
|---|---|
| **Type** | Build |
| **Date** | 2026-08-10 |
| **One-liner** | A self-contained concept-map/knowledge-browser peer module — `System/Widgets/Parser/_modules/MiniWiki/` — mirroring `_modules/Spelling/`'s factory-export/bundler/DEFAULT-OFF pattern, turning any cartridge's `*_content.md` into a browsable, cross-linked, offline mini-wiki panel. |
| **Status** | Draft |

## 1. Motivation

The approved mockup (`mockup/miniwiki-mockup.html`, `mockup/NOTES.md`) proved the UX; the
stress test (`mockup/CONTENT-FIT-REPORT.md`) proved the mockup's naive data model does not
survive contact with the real content (653 articles across 11 cartridges, up to 155 in one
file, Logic's `2.1.0` category-description pattern, ~60% of articles with no discrete
"characteristics" field). This spec is the module that closes that gap: a build-time
extractor (never a runtime parser, decision 5), a small runtime module that renders it, and
the shell wiring that lets a cartridge opt in without touching any other cartridge.

## 2. Scope

**In scope:** the article record shape and its `role` classification (decision 2); the
build-time extractor (`build/extract_articles.py`); the runtime module's public API
(`createMiniWikiModule`, mirroring `createSpellingModule`); tree virtualisation (decision 3);
auto-linking with the exclusion blocklist and collision rule (decision 4); the Home/All/
Surprise-me/category side menu (requirement 7); MLA references (requirement 8); the key
search-terms box (requirement 9); the shell's `miniwiki.enabled` opt-in wiring
(`_shell/build/assemble.py`), DEFAULT OFF.

**Out of scope:** a general markdown engine (the extractor's `render_body_html()` handles
only what the 11 real content files actually use — bold/italic, bullets, sentence-splitting);
runtime content editing (MiniWiki is read-only, matching the viewer precedent in
`vibe-coding-rules.md` PY-12's spirit); full-text search ranking beyond substring match on
title/lead (the mockup's own open question, left as a future refinement).

## 3. Requirements

**Article record shape** (decision 5 — build-time JSON only, never hardcoded in JS):
```typescript
{
  id: string,            // dotted outline id, e.g. "2.1.1"
  title: string,
  level: number,          // id.split(".").length
  role: "section" | "article",
  lead: string,            // first sentence, "" if none
  body_html: string,       // pre-escaped prose paragraphs, "" if none
  characteristics?: string[],
  examples?: string[],
  worked_example?: string,
  parent: string | null,
  children: string[],
  siblings: string[],
  references?: [{title, container, note}],
}
```

**FR-1 — Public factory.** `createMiniWikiModule(options) -> MiniWikiModule`, mirroring
`createSpellingModule`'s shape exactly:
```javascript
{
  articles?: Article[],     // default []
  cartridgeId?: string,     // default "default"
  cartridgeName?: string,   // default "Mini-Wiki"
  document?: Document,      // default globalThis.document
}
```
Returns `{getArticle, getTopLevel, getAncestors, getChildren, flatIndex, search,
randomArticleId, renderView, mount, searchTerms, references, copyToClipboard, cartridgeId,
cartridgeName}`.

**FR-2 — Role classification (decision 2).** A node is `role: "section"` when it has children
and no body text (`body_html` empty) — it renders as a landing page listing its children
(`renderSectionPage`), never a stub article with empty "Key characteristics"/"Examples"
sections. Logic's `2.1.0`-style category-description entries (id ending in a literal `.0`
segment, `*italicised*` title) are folded into their parent's own body at extraction time —
there is no independent UI slot for a description-only node.

**FR-3 — Tree virtualisation (decision 3).** The side-menu tree renders only top-level nodes
at rest; expanding a node reveals only its direct children. Verified against the 155-article
Biblical symbols and cross-references cartridge and at a 375px mobile viewport width (CSS
media query in `src/styles.js`).

**FR-4 — Auto-linking (decision 4).** `buildLinkCatalogue(articlesById)` builds a
longest-title-first catalogue, excluding: (a) any title in the verbatim
CONTENT-FIT-REPORT.md §4 blocklist (`Style`, `Example(s)`, `One`–`Twelve`, `Forty`,
`One Thousand`) and (b) generically, any bare single word ≤4 characters with no whitespace.
**Collision rule:** if two different article ids share the same case-insensitive title, the
first one encountered wins the catalogue slot and *every* later duplicate is dropped from the
catalogue entirely — a mention of that title is never auto-linked to either article, rather
than risk silently sending the reader to the wrong one. `autolinkHtml()` only rewrites text
runs between existing HTML tags (never inside them), so it cannot corrupt markup.

**FR-5 — Side menu (requirement 7).** In order: Home, All, Surprise me, then a link per
top-level category, then the tree. `randomArticleId()` samples from `role:"article"` nodes
only (never lands the user on an empty section landing page) unless none exist.

**FR-6 — Home page (requirement 6).** `renderHome()` lists every top-level category with its
own `lead` sentence, generated entirely from the extracted articles — never hand-authored per
cartridge.

**FR-7 — References (requirement 8).** `formatReferences(article)` maps `article.references`
(sourced only from the content file's YAML frontmatter `title:`/`description:`/`provenance:`
via `build_reference()`) through `formatMlaReference()`, MLA-style, per
`Template_MLA_Reference.md`. An article with no `references` renders no section at all — never
a fabricated citation.

**FR-8 — Key search terms (requirement 9).** `generateSearchTerms(article, ancestors, limit)`
is a deterministic, weighted term extractor (title words weight 3, ancestor-title words
weight 2, capitalised/technical body words weight 1), stopworded, sorted by weight then
alphabetically — same input always produces the same output (asserted by
`tests/test-search-terms.mjs`). Rendered by `renderSearchTermsBox()` as a visually distinct
box (`.mw-search-terms-box`, tinted with `--accbg`) at the foot of every article page; each
term is a one-click copy button plus a "Copy all" affordance, via `copyToClipboard()`
(`navigator.clipboard.writeText` first, `document.execCommand("copy")` fallback — works
offline from `file://`, same approach as Spelling's own persistence research).

**FR-9 — Non-Latin font fallback.** `src/styles.js`'s `[data-mw-cartridge="Greek and
Hebrew"]` rule sets `font-family: "Noto Serif Greek", "SBL BibLit", "Noto Sans Hebrew",
"Times New Roman", serif` on title/lead/body/characteristics/examples.

**FR-10 — Shell wiring, DEFAULT OFF.** `_shell/build/assemble.py` embeds
`_modules/MiniWiki/dist/miniwiki.bundle.js` + a cartridge's pre-built `*.miniwiki.json` (re-
serialised as a JSON array, decision 5) only when `miniwiki.enabled: true` and
`miniwiki.articlesFile` are both set in `config.yaml`. Absent or `false`: the mount panel
(`#miniwiki`, `display:none`) stays hidden, `MINIWIKI_ARTICLES` is `"[]"`,
`MiniWikiSeam.isAvailable()` is `false` — Grammar's build is confirmed byte-identical with and
without this change present in the shell (§ Verification).

## 4. Decisions

- **AD-1 — Build-time extraction only (decision 5).** Never a runtime markdown parser: the
  extractor runs once per cartridge build, producing a JSON array the shell embeds verbatim.
  *Rejected:* parsing markdown in the browser at load time — rejected for the same reason
  Spelling rejected a runtime dictionary build: unnecessary load-time cost for content that
  never changes after a build.
- **AD-2 — Two content dialects, one extractor.** The 11 real cartridges use either a
  Markdown-heading dialect (`### 1.1 Title`) or a bare flush-left dialect (`1.1 Title`);
  `extract_articles.py` recognises both without configuration, since several files (Logic)
  mix them.
- **AD-3 — Collision rule drops both, never guesses.** See FR-4. *Rejected:* picking the
  "first" cartridge's article by arbitrary iteration order and silently linking there anyway
  — rejected because a wrong link is worse than no link, and Object key iteration order is an
  implementation detail, not a designed priority.
- **AD-4 — No new colours; shell tokens only.** `src/styles.js` uses exclusively
  `--bg/--card/--ink/--ink2/--ink3/--line/--line2/--acc/--accbg/--radius`, per the approved
  mockup's own "no new colours invented" rule (NOTES.md).

## 5. Test requirements

Mirrors Spelling's TEST-1–TEST-9. `node --test` from `_modules/MiniWiki/` (TEST-1/TEST-3);
`python3 -m unittest test_extract_articles` from `_modules/MiniWiki/build/` for the Python
extractor (PY-6/TEST-1's stdlib-`unittest` rule for Python). The shared
`_shell/tests/js/fake-dom.mjs` (TEST-8, SR-4 — not forked) gained three additive fixes during
this build: class-selector support in `matchesSelector` (`.mw-title` etc.), `walk()` skipping
non-element nodes (`createTextNode()`'s `{nodeType:3}` shape has no `.children`), and
`innerHTML = value` now clearing `.children` (mirrors real-DOM "clear and replace" behaviour)
— all verified not to regress Spelling's own 42/42 or the shell's own 5/5 suites.

## 6. Verification — definition of done

- [x] `node --test` passes clean over `_modules/MiniWiki/tests/` (22/22)
- [x] `python3 -m unittest test_extract_articles` passes clean (9/9)
- [x] Spelling's own suite (42/42) and the shell's own suite (5/5) unaffected
- [x] Extractor run against Grammar, Logic, Rhetoric, Greek and Hebrew (and all 11
      cartridges) with real article counts recorded (README.md)
- [x] Grammar assembles byte-identical with `miniwiki.enabled` absent (md5 match)
- [x] A demo cartridge (Grammar content + `miniwiki.enabled: true`) assembles, embeds 78
      articles, and structural/script-syntax checks pass — no live-browser verification was
      possible in this build environment (no browser tool access); this is stated plainly,
      not glossed over.
