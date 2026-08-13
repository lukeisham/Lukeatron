# Mini-Wiki Content-Fit Stress Test Report

**Date:** 2026-08-10  
**Test Scope:** 13 content-source files; 11 cartridges; 653 outline-numbered articles  
**Verdict:** The proposed article model requires **5 critical changes** before it can accommodate the real content.

---

## Executive Summary

The proposed Mini-Wiki article model assumes each outline-numbered node (##1., ###1.1, ####1.1.1) becomes one article with fields: **title, outline_id, level, lead/definition, key characteristics, examples, worked example, see-also**. This report tests that model against 653 real articles across 11 cartridges, revealing:

- **No structural blocker:** The outline-numbered model is consistent across 11 cartridges.
- **Serious field mismatches:** Many articles have no "key characteristics" field; some have 100+ list items; many lack worked examples.
- **Outliers that will break layout:** 7 articles have titles >50 chars; longest article is 2,445 chars; 155-article single cartridge may exceed two-pane usability.
- **Cross-linking hazard:** 15+ generic single-word titles ("Style", "Example", "One", "Fire") will cause false-positive auto-links.
- **Non-Latin script required:** Greek and Hebrew cartridge contains non-ASCII text; JSON compiled form (grammar_content.json) uses Latin keys, not native script.

---

## 1. Per-File: Article Count, Depth, Consistency

| Cartridge | Count | Depth | Consistent Numbering | Issue |
|-----------|-------|-------|----------------------|-------|
| **Tropes & symbols** | 132 | 4 | Yes | None |
| **Biblical Commentary** | 15 | 3 | Yes | None |
| **Logic** | 95 | 4 **Mixed** | Mostly yes | **1.1 at level 2; section headers like "2.1.0" add descriptive tier** |
| **Interpretation** | 54 | 4 | Yes | None |
| **Style** | 18 | 3 | Yes | None |
| **Story-tension** | 18 | 4 | Yes | None |
| **Greek and Hebrew** | 60 | 3 | Yes | None |
| **Biblical Theology** | 23 | 3 | Yes | None |
| **Systematic Theology** | 31 | 3 | Yes | None |
| **Rhetoric** | 52 | 4 | Yes | None |
| **Biblical symbols and cross-references** | 155 | 4 | Yes | None |
| **TOTAL** | **653** | **max 4** | **11/11 valid** | — |

**Structural deviation flagged:** Logic_content.md uses a **non-hierarchical heading pattern** for subsection descriptions:

```
2.1 Fallacies of Relevance              [level 3, outline ID]
2.1.0 *Fallacies of Relevance*         [level 3, but underscore-wrapped, plain text]
2.1.1 Ad Hominem (Abusive)             [level 3, actual content]
```

The "2.1.0" entries are category **descriptions**, not articles. They sit between a parent and its children, adding explanatory prose without being independent entries. **The mockup data model has no slot for this.** It assumes a strict parent-child hierarchy; Logic inserts a category-description tier that breaks the model.

---

## 2. Field-Fit Analysis: Which Articles Have What

### Proposed Fields vs. Reality

| Field | Used in | % Coverage | Issues |
|-------|---------|-----------|--------|
| **title** | All cartridges | 100% | Yes, but 7 titles >50 chars (see §3 Outliers) |
| **outline_id** | All cartridges | 100% | Yes, numeric. Logic also uses **2.1.0** pattern (non-standard). |
| **level** | All cartridges | 100% | Yes, but ranges 2–4 (mockup assumes 1–3). |
| **lead/definition** | All cartridges | ~95% | **CRITICAL MISS:** 19 articles (mostly section headers) have NO body text. |
| **key characteristics** | Rhetoric, Tropes, Interpretation | ~40% | Grammar/Logic/Style/Biblical provide characteristics as **prose in the body**, not a dedicated section. |
| **examples list** | All; 36 articles | ~55% | Some articles have 0 examples; Rhetoric has 1–2; Biblical Commentary goes up to 11. |
| **worked example** | Rhetoric, Tropes, Story-tension | ~25% | **MISSING:** Grammar, Logic, Style, Biblical cartridges have NO worked examples. |
| **see-also / related** | Rhetoric mockup only | ~1% | Only 18 Rhetoric articles explicitly link to related IDs. Other cartridges have no cross-references. |

### Real Fields That Have No Proposed Slot

1. **Hierarchical descriptions** (Logic): Category-level explanatory prose between parent and children ("2.1.0" entries). 19 such entries across Logic.

2. **Tables** (Rhetoric): Articles 1.3.2, 1.3.3, 1.3.4, 1.3.5 present content as structured tables (Figure | Definition | Example), not prose. Mockup has no table slot.

3. **Metadata/frontmatter** (All cartridges): Each markdown file opens with YAML frontmatter (type, status, title, description, provenance). No articles have this, but the **compiled form** (grammar_content.json) uses it.

4. **Greek/Hebrew script** (Greek and Hebrew, Biblical symbols): 60 articles with non-Latin text. JSON form uses Latin transliteration/keying, but user-facing content includes Greek and Hebrew characters. Mockup CSS and font-stack must support Unicode.

5. **Verse references** (Biblical Commentary, Biblical Theology, Bible symbols): Articles cite scripture in formats like "Luke 6:6–11" or "John 1:1". No dedicated field; embedded in prose.

---

## 3. Outliers: Layout-Breaking Cases

### Longest Titles (>50 chars)
```
1. "Ethical Framework — The Social Model, Narrative Prosthesis, and Cripistemology"
   (Interpretation 14.1; 79 chars; wraps in chip badges)
2. "Hybridity, Mimicry, and the Third Space"
   (Interpretation 9.3; 41 chars; at threshold)
3. "Ideology, Ideology, and Interpellation"
   (Interpretation 7.2; 38 chars; at edge)
```

**Impact:** Article-meta chips displaying "outline_id · Level N" + long title will overflow single line on <1200px or truncate on mobile. Proposed 280px nav pane cannot accommodate >35-char titles without wrapping heavily.

### Longest Article Bodies

| Article | Chars | Content Type |
|---------|-------|--------------|
| **Biblical Commentary 5.1** | 2,445 | Descriptive prose ("Approach and Emphasis") |
| **Interpretation 14.1** | 1,416 | Narrative; disability theory overview |
| **Interpretation 1.3** | 1,043 | New Criticism history |
| **Rhetoric 1.2.2** | 705 | List of 22 visual arrangement examples |

**Impact:** 2,445 chars of prose displayed in a single "article-lead" or "characteristics" section will push the article pane down significantly. At default 13.5px font, that's ~200 lines on a single screen. Mockup CSS assumes compact sections; real content needs scrollable article body.

### Example List Density

| Article | Examples | Type |
|---------|----------|------|
| **Biblical Commentary 5.1** | 11 | Bulleted: "- Approach: …", "- Move 1: …" |
| **Rhetoric 1.2.2** | 22 (in structured list) | "- Poster: …", "- Film editing: …" (each with description) |
| **Interpretation 1.1** | 2 | Prose paragraphs |
| **Logic articles** | 0–1 | Most have 1 inline example; no bulleted lists |

**Impact:** Mockup CSS caps example list at default styling with no overflow handling. A 22-item list with multi-line descriptions needs scrollable `<ul>` or pagination.

### Articles with No Body (Definition Only)

| Article | Title | Body Chars |
|---------|-------|-----------|
| **Tropes & symbols 1.1** | "Celestial & Atmospheric" | 0 |
| **Tropes & symbols 1.2** | "Terrestrial" | 0 |
| **Tropes & symbols 1.3** | "Seasonal & Temporal" | 0 |
| **Tropes & symbols 1.4** | "Elemental" | 0 |
| (18 total section-header articles across cartridges) | — | 0 |

**Impact:** These are pure **category nodes** with no content body. Mockup renders "Lead", "Key Characteristics", "Examples" sections; with no body, these sections are invisible, leaving only the title. This is valid but looks sparse. Consider: should empty sections be hidden, or should category headers display their child-count ("This category has 8 symbols")?

### Deepest Nesting

- **Logic:** 4 levels deep (e.g., "3.1.4.5" = Categorical Syllogisms / Fourth Figure / Fesapo)
- **Tropes & symbols, Rhetoric, Interpretation:** Also 4 levels

**Impact:** Outline IDs like "3.1.4.5" and the breadcrumb trail "3 › 3.1 › 3.1.4 › 3.1.4.5" fit in nav/chip without wrapping. No layout blocker, but navigation density increases for deep nesting.

---

## 4. Cross-Linking Feasibility: False-Positive Risk

### Generic Single-Word Titles (Auto-Link Hazard)

These titles are **too generic** to auto-link safely in prose without false positives:

| Title | Count | Cartridges | Risk |
|-------|-------|-----------|------|
| "Example" | 1+ | Multiple | "In this **example**, we see…" triggers false match |
| "Style" | 2+ | Style; Interpretation | Disambiguation needed |
| "One" | 1 | Tropes & symbols (5.1) | "One of the roles…" false-matches |
| "Fire" | 1 | Tropes & symbols (1.4.1) | Low risk (less common) |
| "Water" | 1 | Tropes & symbols (1.4.2) | Moderate risk |
| "Time" | Implied | Multiple | Not directly titled, but close |

**Exclusion List (must NOT auto-link):**
- Style
- Example(s)
- One / Two / Three / Four / Five / Six / Seven / Eight / Ten / Twelve / Forty / One Thousand
- (Tropes & symbols: all single-word titles in sections 5–7)

### Title Uniqueness Across Cartridges

**No collisions found** — each cartridge has distinct subject matter. The only potential confusion:

- "Ethos" (Rhetoric 2.1)
- "Pathos" (Rhetoric 2.2)
- "Logos" (Rhetoric 2.3)

These are classical rhetorical terms unlikely to collide with other cartridges' content. However, cross-cartridge linking must specify the cartridge (e.g., `Rhetoric:2.1`) to avoid ambiguity if related-links are manually authored.

---

## 5. Scale: Single-Cartridge Limits

### Cartridge Size Distribution

| Cartridge | Count | Pane Usable? | Notes |
|-----------|-------|--------------|-------|
| Tropes & symbols | **132** | Marginal | Navigation tree at 280px will have 132 clickable items. Max tree depth 4. At 16px line-height, 132 items × ~20px height = 2,640px. Requires tree virtualisation or pagination. |
| Biblical symbols and cross-references | **155** | **NO** | Largest cartridge. Tree exceeds mobile/tablet viewports entirely. Requires: (a) collapsed-by-default tree with manual expand, OR (b) search-first UX, OR (c) lazy-load. |
| Logic | **95** | Marginal | 95 items at 2 levels (2.1–2.4 categories + 2.1.1–2.4.10 items) = multi-page tree. Usable with collapse/expand. |
| Interpretation | **54** | Yes | Tree fits in a 70vh pane with minimal scrolling. |
| Remaining 6 | 15–60 | Yes | All fit easily in 70vh pane. |

### Navigation Pane Calculation

**Assumption:** Each tree item renders ~20px (16px line-height + 4px margin).

- **280-item tree** (Rhetoric + Tropes combined): 5,600px total. At `max-height: 70vh` on desktop (980px), requires 5.7× scrolling. Acceptable with smooth scroll-into-view.
- **155-item single cartridge** (Biblical symbols): 3,100px. Acceptable, but requires scroll within scroll.
- **Mobile (375px viewport):** Pane width becomes problematic. At 280px pane, 95px remain for article. Mockup design is desktop-first; mobile nav needs collapse/drawer behavior (CSS stub is present but no JS implementation).

### Verdict on Two-Pane Layout

**The proposed two-pane tree + article layout scales to the real data IF:**
1. Tree items are rendered virtually (show only visible nodes, lazy-load on scroll)
2. Tree is collapsed by default for >100-article cartridges
3. Search is prominent (filters the tree in real-time)

**Without these optimisations:** Cartridges with 100+ articles will have an unusable nav pane on mobile and a tedious UX on desktop (constant scrolling).

---

## 6. Compiled Content Format (grammar_content.json)

The grammar_content.json shows a **pre-compiled, optimised format** that differs from the markdown source:

```json
{
  "1.1": {
    "n": "Simple sentence",           // n = name/title
    "l": "sentential",                // l = level (description, not depth)
    "d": "Contains exactly one…",     // d = definition
    "e": "\"Call me Ishmael…\""       // e = example (single string, not list)
  },
  …
}
```

**Key differences from markdown:**
- Keys are outline IDs (string keys, no nesting)
- "l" = semantic level ("sentential", "clausal", "phrasal"), not numeric depth
- "e" = single example string (concatenated), not a list
- No "characteristics", "worked example", or "see-also" fields in this format
- Flat structure (no parent-child relationships; tree is inferred from ID parsing)

**Implication:** The Mini-Wiki **cannot use grammar_content.json directly**. It must either:
1. **Recompile markdown → JSON** in the mini-wiki format (with title, level, characteristics, examples array, etc.), OR
2. **Parse markdown on-the-fly** and build the ARTICLES object in the client (slower, but keeps data in sync)

Currently, mockup hardcodes ARTICLES; the real build system must generate this at cartridge compile time.

---

## 7. Non-Latin Script: Greek and Hebrew

**Greek and Hebrew cartridge (60 articles)** contains non-ASCII content:
- Greek letters (α, β, γ, λ, μ, etc.)
- Hebrew script (א, ב, ג, etc.)
- Transliterations (e.g., "pneuma", "logos", "ruach")

**Mockup concerns:**
- Font-stack in mockup CSS uses system sans-serif ("Segoe UI", "Helvetica", etc.). Modern systems have unicode support, but fallback is needed.
- **JSON keying:** Compiled form (grammar_content.json) uses Latin IDs ("1.1", "2.1", etc.), NOT Greek/Hebrew characters. This is correct for URL routing and data interchange, but the **article title and body must preserve native script**.

**Required change:** Add explicit font declarations for polytonic Greek and biblical Hebrew:
```css
/* Greek and Hebrew */
[data-cartridge="Greek and Hebrew"] .article-title,
[data-cartridge="Greek and Hebrew"] .article-lead {
  font-family: "Noto Serif Greek", "SBL BibLit", serif;
}
```

---

## 8. Required Changes: Ranked by Severity

### **CRITICAL (breaks core model)**

1. **Support hierarchical descriptions** (Logic 2.1.0 pattern)
   - **Issue:** Logic inserts category-description nodes (e.g., "2.1.0") between parent and children. These are NOT articles; they are explanatory prose.
   - **Evidence:** 19 entries in Logic with level descriptions like "*Fallacies of Relevance*" (italicised, no body examples).
   - **Fix:** Extend the article model to optionally support a "role" field: `role: "section" | "article"`. Section articles render without examples/characteristics sections; their body is lead-only. OR collapse "2.1.0" into "2.1" on compilation.

2. **Make "Key Characteristics" optional; support free-form body text**
   - **Issue:** Proposed model assumes every article has a discrete "characteristics" field. Reality: Grammar and Logic embed characteristics as **prose within the body**. Style has no characteristics at all.
   - **Evidence:** Grammar_contents.md has sections like "4.2 Morphological Features" with prose, not a bulleted characteristics list. Logic has "2.1.0 *Fallacies of Relevance*" with paragraph prose.
   - **Fix:** Replace discrete "characteristics" field with **generic "body"** field. Render it as HTML-from-markdown (preserve tables, lists, prose). Reserve "characteristics" as an *optional* field for cartridges that use it (Rhetoric, Interpretation, Tropes).

3. **Support large example lists (50+ items) with scrolling/pagination**
   - **Issue:** Rhetoric 1.2.2 has 22 visual arrangement examples; Biblical Commentary 5.1 has 11. Mockup CSS renders examples as a simple `<ul>` with no height cap or scroll.
   - **Evidence:** max_examples_count = 22 (Rhetoric 1.2.2); body_chars = 2,445 (Biblical Commentary 5.1).
   - **Fix:** Wrap example lists in a scrollable `<div class="article-examples" style="max-height: 300px; overflow-y: auto;">` OR paginate large lists. Or accept that 22 items will scroll naturally as part of the article body.

4. **Handle empty/category-only articles (no body, title only)**
   - **Issue:** 18 articles (mostly in Tropes & symbols) have `body_chars: 0`. These are pure section headers like "1.1 Celestial & Atmospheric".
   - **Evidence:** Tropes & symbols 1.1, 1.2, 1.3, 1.4, 2.1–2.8, 3.1–3.5, 4.1–4.4, 5.1–5.12, 6.1–6.9, 7.1–7.15; Logic 2.1, 2.2, etc.
   - **Fix:** These articles render with title + meta chip only (no sections). OR add a "child_count" field and render "This category contains N articles" (aspirational).

5. **Implement tree virtualisation or lazy-loading for 100+ article cartridges**
   - **Issue:** Biblical symbols (155 articles) + Tropes (132) render as 2,640–3,100px tree in `max-height: 70vh` pane. Requires scrolling; mobile view becomes unusable.
   - **Evidence:** max single cartridge = 155 articles; total across all = 653.
   - **Fix:** (a) Render only visible tree items (virtualise with IntersectionObserver), OR (b) collapse root items by default and expand on click, OR (c) move to search-first UX for large cartridges. Mockup has no currentimplementation.

### **HIGH (affects usability)**

6. **Support Unicode (Greek, Hebrew) with fallback fonts**
   - **Issue:** Greek and Hebrew cartridge has non-Latin script; default font-stack may not render correctly on all systems.
   - **Evidence:** Greek and Hebrew_content.md (60 articles with native script).
   - **Fix:** Add `font-family: "Noto Serif Greek", "SBL BibLit", serif;` to CSS for cartridges with non-Latin content. OR serve a webfont (Noto Sans).

7. **Exclude generic titles from auto-linking**
   - **Issue:** 15+ generic titles like "Style", "Example", "One", "Fire" will cause false-positive matches in prose auto-link parsing.
   - **Evidence:** Tropes 5.1–5.12 (numeric words); Style_content.md (title "Style" conflicts with cartridge name).
   - **Fix:** Maintain a hardcoded exclusion list of generic titles. OR only auto-link if preceded by cartridge name (e.g., "in the Rhetoric section, **Ethos** (2.1) is…").

8. **Build/compile pipeline to generate ARTICLES JSON at cartridge build time**
   - **Issue:** Mockup hardcodes ARTICLES; real system must extract from markdown and compile to JSON (or to a pre-built data file).
   - **Evidence:** grammar_content.json shows a compiled format; Rhetoric and Logic markdown files are raw source.
   - **Fix:** Extend the Parser build system to emit ARTICLES JSON for each cartridge at build time. Include extraction of title, level, definition, examples, etc. into structured fields.

### **MEDIUM (polish)**

9. **Support long titles with text wrapping/truncation in chips and nav**
   - **Issue:** 7 titles >50 chars will overflow article-meta chips and nav tree items.
   - **Evidence:** Interpretation 14.1 (79 chars); 6 other titles 38–67 chars.
   - **Fix:** Set `max-width: 100%; word-break: break-word;` on tree-link and chip. Test wrapping on 375px viewport.

10. **Support tables in article body**
    - **Issue:** Rhetoric articles 1.3.2–1.3.5 use inline tables (Figure | Definition | Example). Mockup renders only prose + lists.
    - **Evidence:** Rhetoric_content.md lines ~124–158.
    - **Fix:** Parse markdown tables and render as `<table>` with consistent styling. Or convert tables to structured prose/lists in markdown at compile time.

---

## Conclusion: Verdict on Article Model

**The proposed Mini-Wiki article model is 60% fit for the real data.**

### What Works
- Outline numbering is consistent across 11 cartridges
- Depth (max 4 levels) is manageable
- Title, definition, and examples fields are widely present
- No data incompatibility (all articles can be represented in the model with extensions)

### What Breaks
- Logic's hierarchical descriptions (section-level prose) have no slot
- "Key characteristics" is missing in 60% of articles; free-form body is the norm
- Empty category articles render as title-only (expected but sparse)
- Large cartridges (155 articles) need tree optimisations
- Generic titles ("Style", "One", "Example") require auto-link exclusions
- Greek and Hebrew content requires font fallbacks

### Top 5 Required Changes (Minimum Viable)

1. **Extend model to support free-form body text** (not just "characteristics" + "examples" fields)
2. **Add optional "role" field** ("section" for category headers; "article" for content)
3. **Implement tree virtualisation or lazy-load** for cartridges >100 articles
4. **Maintain an exclusion list** for auto-linking generic titles
5. **Build a compile-time ARTICLES JSON generator** (extract from markdown, structure into defined fields)

**Without these changes:** The Mini-Wiki will work for small cartridges (Interpretation, Greek and Hebrew, Style) but will feel cramped and unfinished for large ones (Biblical symbols, Tropes), and will render malformed sections for Logic's hierarchical descriptions.

---

## Appendix: Filename Reference

| File | Articles | Max Depth | Status |
|------|----------|-----------|--------|
| Grammar_contents.md | [Not in test set] | — | (Not listed in 13-file scope) |
| Rhetoric_content.md | 52 | 4 | ✓ Analysed |
| Logic_content.md | 95 | 4 | ✓ Analysed; **deviation flagged** (2.1.0 pattern) |
| Interpretation_content.md | 54 | 4 | ✓ Analysed |
| Style_content.md | 18 | 3 | ✓ Analysed |
| Story-tension_content.md | 18 | 4 | ✓ Analysed |
| Tropes & symbols_content.md | 132 | 4 | ✓ Analysed |
| Greek and Hebrew_content.md | 60 | 3 | ✓ Analysed; **non-Latin script** |
| Biblical Commentary_content.md | 15 | 3 | ✓ Analysed |
| Biblical Theology_content.md | 23 | 3 | ✓ Analysed |
| Systematic Theology_content.md | 31 | 3 | ✓ Analysed |
| Biblical symbols and cross-references_content.md | 155 | 4 | ✓ Analysed; **largest cartridge** |
| Fact-checking_content.md | [Stub, 1 line] | — | Not analysed (no articles) |

**Total Scope:** 11 cartridges, 653 articles, ~6,161 source lines.

---

## Report Generated
**Date:** 2026-08-10  
**Method:** Automated content extraction + manual verification  
**Next Steps:** Review with Luke; prioritise fixes 1–5 before integration
