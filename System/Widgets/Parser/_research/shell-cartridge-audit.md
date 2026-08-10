# Shell/Cartridge Audit: Grammar Parser Monolith
**Date:** 2026-08-09  
**Status:** Complete audit with seam specification and migration plan  
**Scope:** Extract the shared chassis from Grammar's monolith into a reusable shell; define the cartridge contract; design a unified build system for all 13 parsers.

---

## 1. Line-Range Inventory of template.html (1340 lines)

| Lines | Component | What it does | Current classification | Verdict | Notes |
|---|---|---|---|---|---|
| 1–7 | DOCTYPE, meta, favicon | Page setup | SHELL | ✓ SHELL | Cartridge-specific favicon SVG only; rest is generic |
| 8–9 | CSS var root | CSS custom properties (colours, sizes, fonts) | SHELL | **⚠ CONTESTED** | Contains grammar-specific colour names (`--acc`, `--red`); should be generic |
| 10–81 | CSS body | Reset, grid, card, button, input, bar styling | SHELL | ✓ SHELL | Generic layout; but CLAUSAL/PHRASAL/LEXICAL view styles at lines 40–50 are grammar-specific |
| 83–91 | HTML header | Logo + brand name + metadata line | SHELL | ✓ SHELL | Text pulled from CONFIG.name; metadata ("Tier A · offline") is generic |
| 92–116 | HTML input area | Input field + Parse/Explain buttons, spell-check toggle, word count | SHELL | ✓ SHELL | Generic; populated via CONFIG |
| 104–110 | Focus-level buttons | "Sentential · Clausal · Phrasal · Lexical" selector | SHELL | ✓ SHELL | Levels from CONFIG.levels |
| 111–124 | HTML middle section | Key, iconbar, stage (output), explainer placeholder | SHELL | ✓ SHELL | Generic containers; populated by JS |
| 125–133 | HTML footer + floating tooltips | Export buttons, version/source info, tip/ctx/sugg pop-ups | SHELL | ✓ SHELL | Version/built-from pulled from CONFIG |
| 139–251 | Script section (CONFIG, CONTENT, SQLJS block) | Inline script tags | CARTRIDGE | **CONTESTED** | CONFIG + CONTENT are clearly cartridge; the `__SQLJS__` / `__WASM_B64__` / `__DB_B64__` placeholders are injection points (shell concern, not cartridge) |
| 144–158 | CONFIG object | Cartridge settings (name, cap, levels, colours, tierB) | CARTRIDGE | ✓ CARTRIDGE | Per-parser; example: grammar's `tentativeThreshold: 0.7` is cartridge-specific heuristic |
| 161–244 | CONTENT object | Compiled taxonomy (IDs 1–7 from Grammar_contents.md) | CARTRIDGE | ✓ CARTRIDGE | Entirely per-parser; different content = different parser |
| 247–251 | SQLJS placeholders | Base64-encoded sql.js WASM + lexicon DB markers | SHELL | **✓ SHELL** | Infrastructure for lexicon embedding; injected by build_parser.py (see FR-21, AD-1a) |
| 252–254 | SQLJS script injection | `__SQLJS__` inline script tag | SHELL | ✓ SHELL | Injected at build time; harness only, not cartridge logic |
| 256–283 | LEX module | SQLite lexicon portal: init, query, caching | SHELL | ✓ SHELL | Generic lexicon infrastructure; Parser-agnostic ("query a word, get POS + features"). Individual lexicons are cartridge, but the query interface is shared |
| 285–291 | ENGINE section header | Banner comment | SHELL | ✓ SHELL | Header only |
| 292–928 | ENGINE.rules (passes 1–3) | Tokenizer, pass1 (lexical), pass2 (syntactic/semantic), pass3 (conventions/errors), parse() entry point | CARTRIDGE | **✓ CARTRIDGE (mostly)** | Grammar-specific rules throughout: CLOSED class lists (determiners, prepositions, auxiliaries), morphological heuristics, clause/phrase templates, tense detection (4.3.1–4.3.12), agreement checking (5.1.1), comma-splice detection (7.4), etc. — all keyed to Grammar's content taxonomy |
| 305–309 | CLOSED object | Grammar's closed-class word lists (det, pron, prep, coord, subord, aux, modal, neg, etc.) | CARTRIDGE | ✓ CARTRIDGE | Different parser = different closed-class sets |
| 356–445 | pass1() | Lexical tagging + context-driven POS disambiguation | CARTRIDGE | ✓ CARTRIDGE | Grammar-specific heuristics; other parsers won't tokenize the same way |
| 452–733 | pass2() | Phrase templates (NP, VP, PP, AdjP, AdvP, gerund, infinitive), clause detection, sentence classification (1.1–1.6), purpose (1.7) | CARTRIDGE | ✓ CARTRIDGE | Entirely Grammar: "independent clause", "noun phrase", tense groups — other parsers have different structures |
| 735–877 | pass3() | Conventions/error detection: subject–verb agreement (5.1.1), comma splice (7.4), fragment (7.5), parallelism (7.6), pronoun case (7.9), apostrophe/homophone (7.10), double negation (5.6.2), capitalisation (6.4), etc. | CARTRIDGE | ✓ CARTRIDGE | Grammar's rule set; each parser defines its own pass3 |
| 904–926 | Helper functions (posId, posLabel, phraseLabel) | Map Grammar's internal tags to CONTENT IDs and readable labels | CARTRIDGE | ✓ CARTRIDGE | Grammar-specific mappings (e.g. `noun → 4.1n`); different parser = different enum |
| 930–932 | EXPLAINER section header | Banner comment | SHELL | ✓ SHELL | Header only |
| 933–1055 | EXPLAINER.render | Two-part explainer: four-row word-column table (funcOf, phraseOf, clauseOf) + rules extracted from findings | CARTRIDGE | **✓ CARTRIDGE (mostly)** | Four-row table is Grammar-specific; the extraction logic at lines 1003–1031 is generic and could be shared, but funcOf() at 937–950 is Grammar-specific (maps roles → functions) |
| 937–950 | funcOf(R, ti) | Maps a token to its clause role: subject, object, complement, adverbial, etc. | CARTRIDGE | ✓ CARTRIDGE | Relies on Grammar's clause-element model (2.6 Clause elements); Style parser won't have the same roles |
| 951–974 | Helper functions (isHead, posShort, shortPhrase) | Grammar-specific term shortening | CARTRIDGE | ✓ CARTRIDGE | e.g. `posShort()` maps "noun" → "noun", "verb" → "verb", but with Grammar-specific fallbacks |
| 975–1002 | tables(R) | Renders the four-row word-column table for the Explainer | CARTRIDGE | ✓ CARTRIDGE | Grammar-specific format; although the structure (row 1 word, row 2 phrase, row 3 clause, row 4 function) could become a template |
| 1003–1031 | collectIds, rules(R), toMarkdown, toText | Extract unique content IDs from the result, group them by category (Sentence, Clauses, Phrases, Lexical, Conventions, Errors), render as dot-point rules | SHELL-like | **✓ CONTESTED** | The extraction and grouping logic is generic; the category list ("Sentence", "Clauses", …) and the category-detection regex (e.g., `id.indexOf("1.")===0`) are Grammar-specific. Style parser will have different top-level categories |
| 1057–1060 | CHASSIS UI header | Banner comment | SHELL | ✓ SHELL | Header only |
| 1061–1117 | UI.render (top half) | Display setup: render() main entry point, updateCount(), spellCheck() (lines 1074–1117) | **CONTESTED** | **Split needed** | render() and updateCount() are SHELL; spellCheck() at lines 1074–1117 should be extracted to a shared spelling module (see §2 issue noted in task) |
| 1072–1156 | Spell checker module | Word tokenization, morphological suffix-matching, dictionary lookup, red wavy underline rendering, suggestion generation via edit-distance-1, one-click replace/ignore UI | CHASSIS | **❌ WRONG BANNER** | This 85-line module belongs in a shared `_modules/Spelling/` folder, not inside `CHASSIS · UI + HARNESS`. The spec task already notes this is being extracted; it should be a separate shared component imported by the shell. No other parser's spell-check will be identical, but the infrastructure (UI, suggestion generation, ignore list) is reusable |
| 1118–1156 | suggestions() and spell-check event handlers | Generate replacement suggestions via edit-distance-1; manage spell-check toggle + replace/ignore clicks | CHASSIS | **❌ WRONG** | Part of the spelling module; should be extracted |
| 1157–1207 | render() continued | Render the parsed result to the stage (output area): clause/phrase spans, word tokens, confidence shading | CHASSIS | **⚠ CONTESTED** | The span-rendering loop at 1171–1203 is generic (iterates `clauses`, `phrases`, `tokens`); but the inline styles using `CONFIG.clausePalette` are populated by CONFIG, and the CSS classes (`.cl`, `.ph`, `.w`, `.pos`) hook into grammar-specific display rules. Lines 1195–1199 call `shortPos()` and `needSpace()` which are grammar-specific |
| 1208–1220 | needSpace(a, b) and shortPos(t) | Decide spacing between tokens; map POS tag to short label | CHASSIS | **❌ GRAMMAR-SPECIFIC** | needSpace() at 1208 has hardcoded punctuation rules specific to English grammar; shortPos() maps Grammar's internal `.final.pos` to display labels ("noun" → "noun", "verb" → "verb", "adjective" → "adj", plus aux/modal special cases). These belong in the cartridge, not the shell, or need to be delegated to cartridge functions |
| 1221–1254 | renderKey(), renderIcons(), setView() | Update the colour key display per focus level; render the icon bar for findings; switch focus level and trigger display updates | SHELL | ✓ SHELL | Generic UI plumbing; renderKey() text at lines 1223–1232 is grammar-specific but could be parameterized via CONFIG |
| 1255–1327 | Event handlers (hover, context menu, button clicks) | Mousemove for hover pop-ups, contextmenu for right-click token labels, Parse/Explain/Export button handlers, focus-level selector, spell-check toggle, input event, print/copy handlers | SHELL | ✓ SHELL (mostly) | Generic event plumbing; the hover/context-menu text generation at 1262–1278 queries Grammar-specific data (clause type, phrase type, lexical class) but does so via EXPLAINER helper functions (clauseOf, phraseOf, posShort) which are cartridge-supplied. The formatting of the pop-up text is Grammar-specific but could be delegated to the cartridge |
| 1296–1331 | UI module init, and main body entry point | parseNow(), explain() entry points; init() wires all event listeners; LEX.init() callback runs UI.init() at page load | SHELL | ✓ SHELL | Generic harness |

---

## 2. Places Where Self-Declared Banners Are Wrong

### 2a. Grammar-specific code inside CHASSIS blocks:

1. **Spell checker (lines 1072–1156 inside "CHASSIS · UI + HARNESS")** — as noted in the task brief, this 85-line module should be extracted to a shared `_modules/Spelling/` folder. It's generic infrastructure (edit-distance suggestions, HTML rendering, event handling) applied to a Grammar-specific lexicon lookup, but the core algorithm is reusable by other parsers.

2. **needSpace() function (lines 1208–1211 inside UI.render)** — this function encodes English grammar punctuation rules:
   ```javascript
   if(!b.isWord&&".,;:!?…".indexOf(b.text)>=0)return false;
   if(!a.isWord&&"("'".indexOf(a.text)>=0)return false;
   ```
   These rules assume English typographic conventions. A Logic parser or Rhetoric parser might have different spacing rules. This should be delegated to the cartridge as `EXPLAINER.needSpace(a, b)` or similar, allowing parsers to override.

3. **shortPos() function (lines 1213–1220 inside UI.render)** — maps Grammar's internal POS tags to display labels:
   ```javascript
   var m={noun:"noun",verb:"verb",adjective:"adj",adverb:"adv",...};
   ```
   This is a Grammar-specific lookup. Other parsers will have different POS categories entirely (e.g., Style might have "formal/informal/colloquial", not noun/verb/adj). This should move to the cartridge as `EXPLAINER.shortPos(t)` — which the file already defines at lines 956–968 but doesn't use in the UI. **The UI is calling the wrong function** — it should call `EXPLAINER.shortPos()`, not redefine it locally.

4. **renderKey() (lines 1221–1234)** — this function generates the colour key text for each focus level. Lines 1228–1232 embed Grammar-specific text:
   ```javascript
   k.innerHTML=(view==="sentential"?'<strong>Sentence focus</strong> · ...
                              ||view==="phrasal"?'<strong>Phrase focus</strong> · ...'
   ```
   The keys themselves are generic (render a mapping), but the text describing Sentential/Clausal/Phrasal/Lexical levels is Grammar-specific. **Verdict:** parameterize via `CONFIG.focusLabels` or similar, or move to cartridge as `EXPLAINER.renderKey(view)`.

5. **renderIcons() (lines 1235–1248)** — this function renders the icon bar from `R.findings`, grouping by `f.id + f.severity`. The mapping of severity → icon ✓/◦/⚠ is generic, but the logic depends on Grammar's finding structure (id, severity as "info"/"check"/"flag"). Other parsers might classify findings differently. **Verdict:** mostly OK, but ensure cartridge findings follow the ParseResult schema strictly (spec AD-2).

6. **Hover pop-up text generation (lines 1262–1278)** — depends on Grammar's structure:
   ```javascript
   if(view==="sentential"){
     txt="In "+(cl?cl.label.toLowerCase():"the sentence")+" of a "
         +R.summary.classifications[0].label.toLowerCase()+"...";
   }
   ```
   Each view mode asks Grammar-specific questions (clause type at Clausal focus, phrase type at Phrasal focus). This is mostly OK because it queries via EXPLAINER helpers, but the text-generation templates are Grammar-specific. **Verdict:** could move the template to the cartridge as `EXPLAINER.hoverText(focus, token, clause, phrase)`.

### 2b. Cartridge code inside SHELL blocks:

None identified. The banner placement is correct for ENGINE/EXPLAINER/CONFIG/CONTENT; they are properly marked as cartridge.

### 2c. CSS conflicts:

**Lines 40–50 inside the CSS (marked CHASSIS):**
```css
#stage.v-clausal .cl{background:var(--h50);color:var(--h800);}
#stage.v-clausal .lbl{display:inline-block;background:var(--h100);color:var(--h800);}
#stage.v-sentential .cl{background:var(--hf);border-left:3px solid var(--h600);...}
#stage.v-phrasal .cl{background:var(--hf);}
#stage.v-phrasal .ph{background:var(--h100);color:var(--h800);...}
#stage.v-lexical .cl{background:var(--hf);}
#stage.v-lexical .w{display:inline-block;background:var(--h100);color:var(--h800);...}
#stage.v-lexical .pos{display:block;font-size:11px;color:var(--h600);...}
```

These rules style the four Grammar focus levels (Sentential/Clausal/Phrasal/Lexical). The CSS custom property names (`--h50`, `--h100`, `--h600`, `--h800`, `--hf`) are injected by the inline styles at line 1182 (from `CONFIG.clausePalette`), so **the mechanism is generic**. However, the list of focus levels and the class names (`.v-clausal`, `.v-phrasal`, etc.) are hardcoded to Grammar's four levels. A Style parser might have only two levels: Pragmatic/Lexical. A Logic parser might have Argument/Term/Fallacy.

**Verdict:** The focus-level CSS should be **parameterized by CONFIG** — either the cartridge defines a parallel CSS block in its own template, or the shell emits CSS rules based on `CONFIG.levels`. Currently, parsers with different focus levels will have orphaned CSS rules and need custom CSS (breaking the single-file rule).

---

## 3. THE CONTRACT

What every parser must provide to the shell, and what the shell provides to every cartridge.

### 3a. Parser cartridge input (what a parser provides):

```javascript
CONFIG = {
  // Metadata
  name:              "Grammar parser",           // display name
  version:           "1.0.0",                    // semantic version
  builtFrom:         "Grammar_contents.md",      // source file name (for footer)
  
  // Input constraints
  inputUnit:         "one sentence",             // what it parses (display label)
  cap:               100,                        // word cap
  
  // Structural levels (focus selector)
  levels:            ["sentential","clausal","phrasal","lexical"], // level names
  
  // Visual mapping
  clausePalette:     [{h50, h100, h600, h800, hf, name}, ...],  // 1+ hues for clause families
  tentativeThreshold: 0.7,                       // confidence ≥ this → full intensity; < this → dashed
  
  // API slot (currently disabled for Grammar)
  tierB:             {enabled: false, note: "..."}
};

CONTENT = {
  "ID": {n: "Name", l: "level", d: "definition", e: "example", ...},
  "1.1": {n: "Simple sentence", l: "sentential", d: "Contains exactly one independent clause.", e: "..."},
  "4.1n": {n: "Noun", l: "lexical", d: "Names a person..."},
  ...
};

ENGINE = {
  parse: (text: string) → ParseResult,
  tokenize: (text: string) → Token[],           // may be reused by spell-checker
  CLOSED: {det: {...}, pron: {...}, ...}        // closed-class word lists for pass1
};

EXPLAINER = {
  tables(R: ParseResult) → html,                 // render the tabled sentence
  rules(R: ParseResult) → html,                  // render the rules-extracted section
  toMarkdown(R: ParseResult) → markdown,         // convert result to Markdown
  toText(R: ParseResult) → plaintext,            // convert result to plain text
  
  // Helpers for the UI (for hover/context-menu text, focus-level labels, etc.)
  funcOf(R, tokenIndex) → string,                // what role does this token play? "subject", "verb", "object", etc.
  phraseOf(R, tokenIndex) → Span | null,         // which phrase contains this token?
  clauseOf(R, tokenIndex) → Span | null,         // which clause contains this token?
  posShort(token) → string,                      // short label for a token's POS ("noun", "verb", "aux", etc.)
  
  // [Suggested additions for complete cartridge]
  hoverText?(focus, token, clause, phrase) → string,  // template for hover pop-ups per focus level
  needSpace?(a, b) → boolean,                         // spacing rules between tokens
};
```

### 3b. Shell (chassis) provides to every cartridge:

**ParseResult schema** (spec AD-2, verified against the code):

```json
{
  "meta": {
    "asset": "Grammar",               // CONFIG.name
    "version": "1.0.0",               // CONFIG.version
    "cap": 100,                       // CONFIG.cap
    "wordCount": 42,
    "overCap": false,
    "lexiconMode": "embedded SQLite"  // or "morphology-only (embedded db failed to load)"
  },
  
  "tokens": [
    {
      "i": 0,                         // token index
      "text": "The",
      "start": 0, "end": 3,           // character offsets in input
      "isWord": true,                 // (not in the spec but exists in code)
      "tags": [
        {
          "id": "4.1det",             // CONTENT ID (Grammar: 4.1 = Determiner)
          "label": "determiner",      // readable label (from posLabel() in code)
          "confidence": 0.95,         // 0–1 score
          "sub": "det",               // optional subtype (not in spec but in code)
          "feat": ["det"]             // optional features (in code)
        }
      ]
    },
    ...
  ],
  
  "spans": [
    {
      "start": 0, "end": 5,           // token indices forming this span
      "id": "3.1",                    // CONTENT ID (Grammar: Noun Phrase)
      "label": "Noun phrase (3.1)",   // readable label
      "kind": "phrase",               // "clause" | "phrase" | "phrase-inner"
      "confidence": 0.9,
      "tent": false,                  // tentative (shown with dashed underline)?
      "children": []                  // nested spans (e.g. gerund inside a PP)
      // [Grammar-specific extras in code but not in spec:]
      "note": "containing a gerund phrase (3.8)",
      "adverbialNP": true             // for tentative adverbial noun phrases
    },
    ...
  ],
  
  "findings": [
    {
      "id": "5.1.1",                  // CONTENT ID (Grammar: Subject-verb agreement)
      "label": "Subject–verb agreement",
      "severity": "check",            // "check" (passed) | "info" | "flag" (error)
      "spanRef": 0,                   // (not in spec; in code but unused)
      "explain": "subject 'he' is 3rd-person singular; verb 'was' is 3sg past — number and person match.",
      "confidence": 0.85,
      "start": 0, "end": 5            // (not in spec; in code: token indices)
    },
    ...
  ],
  
  "summary": {
    "classifications": [
      {"id": "1.4", "label": "Compound-complex sentence"},
      {"id": "1.7d", "label": "Declarative"}
    ],
    "counts": {
      "words": 42,
      "clauses": 3,
      "independent": 2,
      "dependent": 1,
      "phrases": 8
    }
  },
  
  // [Internal use by EXPLAINER; not part of the public schema]
  "_clauses": [...],
  "_phrases": [...],
  "_toks": [...]
}
```

**Drift from spec AD-2:** The code adds fields not mentioned in the spec:
- `tokens[].isWord`, `tags[].sub`, `tags[].feat` — needed for internal processing; OK to keep
- `spans.note`, `spans.adverbialNP` — Grammar-specific; should be in EXPLAINER context or a cartridge extension field
- `findings.start`, `findings.end` — should use `spanRef` per spec; currently both coexist (confusing)
- `meta.lexiconMode` — added by this build for transparency; not in spec but useful

**Recommendation:** Codify these extensions in the spec's next draft (AD-2 v2), or add a `_cartridgeExtensions` field for parser-specific metadata.

---

## 4. THE CSS PROBLEM

**Current state:** Lines 8–81 mix generic shell CSS with Grammar-specific display rules.

**Generic shell CSS (reusable as-is):**
- Lines 9–21: color variables, reset, body, button, input, label, bar styling
- Lines 23–38 (most): card styling, input field, key display, tooltip positioning
- Lines 61–73: footer, explainer panel toggle, print rules

**Grammar-specific CSS (must be replaced per parser):**
- Lines 40–50: view-level styling (`.v-clausal`, `.v-phrasal`, `.v-lexical`, `.v-sentential`)
- Line 38: `.pos` (word-class label) — Grammar-specific (only shown at Lexical focus)
- Lines 40–51: all clause/phrase colour application (depends on Grammar's four levels and `CONFIG.clausePalette`)

**The structural-kinship colour model (AD-7):**
- Each top unit (clause, sentence part) → distinct hue
- Sub-units (phrases within clause) → shades of the hue
- Words → tints of parent unit's hue
- Opacity/desaturation → indicate focus-fading for non-selected levels

**Question: Is level-styling generic-with-names or genuinely per-cartridge?**

**Answer:** Generic with cartridge naming. The mechanism is:
1. Shell defines generic CSS for focus levels: `.v-{levelName} .cl { ... }`, `.v-{levelName} .ph { ... }`, `.v-{levelName} .w { ... }`
2. Cartridge (CONFIG) declares level names: `["sentential", "clausal", "phrasal", "lexical"]`
3. Cartridge declares unit types per level: what renders at each level (the "kinds" in spans)
4. Shell CSS uses CSS variables (injected by inline styles) for colours

**Issue:** The current CSS hardcodes Grammar's four levels. A Style parser with only "Paragraph / Sentence / Clause / Word" levels, or a Logic parser with "Argument / Term / Fallacy / Definition", will have unused CSS rules or unmatched view classes.

**Recommended split:**

**Shell CSS (never rewritten):**
```css
:root { --bg: #faf9f5; --card: #fff; --ink: #1a1a17; ... }
body { margin: 0; background: var(--bg); ... }
.card { background: var(--card); border: 1px solid var(--line); ... }
input { border: 1px solid var(--line2); ... }
[data-focus-level] { /* generic focus-level rule applies inline styles */ }
```

**Cartridge CSS (compiled into each built parser):**

Each cartridge's build step should inject a style block with rules for its specific focus levels. Example for Grammar:
```css
#stage.v-sentential .cl { background: var(--hf); /* background behind */ }
#stage.v-sentential .ph { display: none; /* or faded */ }
#stage.v-sentential .w { display: none; /* or faded */ }
#stage.v-clausal .cl { background: var(--h50); color: var(--h800); }
/* etc. */
```

**Implementation:** The shared build_parser.py reads a `cartridge-styles.css` from each cartridge folder and injects it into the output HTML inside a `<style>` tag after the shell CSS. This way, the shell CSS is truly parser-agnostic.

---

## 5. THE SHARED ASSEMBLER

**Goal:** Replace the 13 identical `build_parser.py` files with one shared module.

### 5a. Design

**File structure after refactor:**

```
System/Widgets/Parser/
├── _shared/
│   ├── build_parser.py              # main assembler (NEW SHARED)
│   ├── shell.html                   # the generic chassis (NEW SHARED)
│   ├── shell.js                     # UI harness + rendering (OPTIONAL: if separated)
│   └── shell.css                    # generic styles (OPTIONAL: if separated)
├── Grammar/
│   ├── build/
│   │   ├── config.yaml              # cartridge manifest (NEW)
│   │   ├── grammar_engine.js        # ENGINE.rules + ENGINE.CLOSED
│   │   ├── grammar_explainer.js     # EXPLAINER.render + helpers
│   │   ├── Grammar_lexicon.db       # (unchanged)
│   │   ├── build_lexicon.py         # (unchanged, but lives here not at root)
│   │   └── Makefile                 # (optional: build Grammar_parser.html)
│   ├── Grammar_contents.md          # (unchanged: content source)
│   ├── Grammar_parser.html          # (output: shipped widget)
│   ├── Specs/
│   │   └── Done/
│   │       └── GrammarParser.spec.md # (unchanged)
│   └── [existing assets]
├── [Style/]
│   ├── build/
│   │   ├── config.yaml
│   │   ├── style_engine.js
│   │   ├── style_explainer.js
│   │   ├── build_lexicon.py (if needed)
│   │   └── Makefile
│   ├── Style_contents.md
│   ├── Style_parser.html            # (to be built)
│   └── Specs/Done/StyleParser.spec.md
└── [remaining 11 parsers...]
```

### 5b. Cartridge manifest (config.yaml)

Each cartridge folder `<Store>/build/config.yaml`:

```yaml
---
cartridge:
  name: "Grammar parser"
  id: "Grammar"
  version: "1.0.0"
  builtFrom: "Grammar_contents.md"
  
parser:
  inputUnit: "one sentence"
  cap: 100
  levels: ["sentential", "clausal", "phrasal", "lexical"]
  tentativeThreshold: 0.7
  
lexicon:
  enabled: true
  dbFile: "Grammar_lexicon.db"          # optional: relative to build/ folder
  schema: "word, pos, alt, feat, rank"  # documented schema (for validation)
  
colours:
  palette:
    - name: teal
      h50:  "#E1F5EE"
      h100: "#9FE1CB"
      h600: "#0F6E56"
      h800: "#085041"
      hf:   "rgba(29,158,117,.12)"
    # ... 5 more hues for Grammar (6 total)
  
files:
  engine:     "grammar_engine.js"        # relative to build/ folder
  explainer:  "grammar_explainer.js"
  styles:     "grammar_styles.css"       # optional; injected after shell CSS
  content:    "../Grammar_contents.md"   # relative to build/ folder; compiled into CONTENT object
```

### 5c. Shared build_parser.py

**Signature:**

```bash
python3 _shared/build_parser.py <cartridge-folder> [output.html]
```

**Example usage:**

```bash
cd System/Widgets/Parser
python3 _shared/build_parser.py Grammar/
# Output: Grammar/Grammar_parser.html

python3 _shared/build_parser.py Style/ Style/Style_parser.html
```

**Logic:**

```python
#!/usr/bin/env python3
"""Shared parser assembler. Builds one parser from a cartridge folder.

Usage:
  python3 build_parser.py <cartridge_dir> [output.html]

A cartridge is a folder containing:
  - build/config.yaml                    # manifest
  - build/<engine>.js                    # ENGINE module
  - build/<explainer>.js                 # EXPLAINER module
  - build/<styles>.css                   # (optional) focus-level styles
  - <Content>_contents.md                # (optional) compiles to CONTENT
  - build/<Lexicon>.db                   # (optional) embedded lexicon

The assembler:
  1. Reads config.yaml and validates it
  2. Reads and concatenates shell JS + cartridge JS modules
  3. Compiles the content .md file (if present) to a CONTENT JS object
  4. Embeds the lexicon DB if present (base64 + sql.js WASM injection)
  5. Injects cartridge CSS after shell CSS
  6. Outputs one self-contained .html file
"""

import sys, pathlib, json, yaml, base64, datetime, re, sqlite3

def main():
    cartridge_dir = pathlib.Path(sys.argv[1]).resolve()
    build_dir = cartridge_dir / "build"
    config_path = build_dir / "config.yaml"
    
    # Validate the cartridge
    if not config_path.exists():
        sys.exit(f"config.yaml not found in {build_dir}")
    
    with open(config_path) as f:
        config = yaml.safe_load(f)
    
    # Derive output path
    cartridge_name = config["cartridge"]["id"]
    out_path = sys.argv[2] if len(sys.argv) > 2 else cartridge_dir / f"{cartridge_name}_parser.html"
    
    # Load shell
    shell_html = (pathlib.Path(__file__).parent / "shell.html").read_text()
    
    # Validate that CONFIG and CONTENT slots exist
    if "var CONFIG = " not in shell_html or "var CONTENT = " not in shell_html:
        sys.exit("shell.html is missing CONFIG or CONTENT slots")
    
    # Build CONFIG object
    config_js = build_config(config)
    
    # Build CONTENT object (compile from .md if present)
    content_path = next(cartridge_dir.glob("*_contents.md"), None)
    if content_path:
        content_js = compile_content_markdown(content_path)
    else:
        content_js = "{}"  # empty CONTENT
    
    # Load cartridge JS (ENGINE + EXPLAINER)
    engine_path = build_dir / config["files"]["engine"]
    explainer_path = build_dir / config["files"]["explainer"]
    
    if not engine_path.exists():
        sys.exit(f"ENGINE file not found: {engine_path}")
    if not explainer_path.exists():
        sys.exit(f"EXPLAINER file not found: {explainer_path}")
    
    engine_js = engine_path.read_text()
    explainer_js = explainer_path.read_text()
    
    # Embed lexicon if present
    lexicon_js = ""
    if config.get("lexicon", {}).get("enabled"):
        db_file = config["lexicon"].get("dbFile")
        if db_file:
            db_path = build_dir / db_file
            if not db_path.exists():
                sys.exit(f"Lexicon DB not found: {db_path}")
            
            sqljs_path = _find_sqljs()  # or accept as arg
            wasm_path = _find_wasm_binary()
            lexicon_js = _embed_lexicon(db_path, sqljs_path, wasm_path)
    
    # Build cartridge CSS (optional)
    cartridge_css = ""
    css_file = build_dir / config["files"].get("styles", "")
    if css_file.exists():
        cartridge_css = f"<style>\n{css_file.read_text()}\n</style>"
    
    # Assemble: inject into shell
    out_html = shell_html
    out_html = out_html.replace("var CONFIG = {};", f"var CONFIG = {config_js};")
    out_html = out_html.replace("var CONTENT = {};", f"var CONTENT = {content_js};")
    out_html = out_html.replace("__ENGINE_RULES__", engine_js)
    out_html = out_html.replace("__EXPLAINER_RENDER__", explainer_js)
    out_html = out_html.replace("__CARTRIDGE_CSS__", cartridge_css)
    out_html = out_html.replace("__LEXICON_INJECTION__", lexicon_js)
    out_html = out_html.replace("__BUILD_DATE__", datetime.date.today().isoformat())
    
    # Validate all placeholders were replaced
    if "__" in out_html:
        unreplaced = re.findall(r"__[A-Z_]+__", out_html)
        sys.exit(f"Unreplaced placeholders: {unreplaced}")
    
    # Write output
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(out_html)
    size_mb = out_path.stat().st_size / 1048576
    print(f"Built {out_path}: {size_mb:.2f} MB")

def build_config(config: dict) -> str:
    """Build JavaScript CONFIG object from YAML."""
    js = "{\n"
    c = config["cartridge"]
    js += f'  name: "{c["name"]}",\n'
    js += f'  version: "{c["version"]}",\n'
    js += f'  builtFrom: "{c["builtFrom"]}",\n'
    
    p = config["parser"]
    js += f'  inputUnit: "{p["inputUnit"]}",\n'
    js += f'  cap: {p["cap"]},\n'
    js += f'  levels: {json.dumps(p["levels"])},\n'
    js += f'  tentativeThreshold: {p["tentativeThreshold"]},\n'
    
    js += "  clausePalette: [\n"
    for hue in config["colours"]["palette"]:
        js += f'    {{h50:"{hue["h50"]}",h100:"{hue["h100"]}",h600:"{hue["h600"]}",h800:"{hue["h800"]}",hf:"{hue["hf"]}",name:"{hue["name"]}"}},\n'
    js += "  ],\n"
    
    js += '  tierB: { enabled: false, note: "Tier B slot present but disabled." }\n'
    js += "}"
    return js

def compile_content_markdown(md_path: pathlib.Path) -> str:
    """Compile a _contents.md file to a JavaScript CONTENT object.
    
    Expected format: outline-numbered entries with IDs as keys.
    (Grammar example: # 1. Sentence · ## 1.1 Simple sentence · ...)
    Returns a JSON string ready for JS.
    """
    # Stub: real implementation parses Markdown outline, extracts IDs, names, defs, examples.
    # For now, call an external parser or import from the grammar build_parser.
    raise NotImplementedError("call grammar's content parser or write generic one")

def _find_sqljs() -> pathlib.Path:
    """Locate sql.js library."""
    # Check in _shared/, or accept via env var
    raise NotImplementedError()

def _find_wasm_binary() -> pathlib.Path:
    """Locate sql-wasm.wasm."""
    raise NotImplementedError()

def _embed_lexicon(db_path, sqljs_path, wasm_path) -> str:
    """Base64-encode the .db and WASM binary and return JS code to inject."""
    db_b64 = base64.b64encode(db_path.read_bytes()).decode('ascii')
    wasm_b64 = base64.b64encode(wasm_path.read_bytes()).decode('ascii')
    
    sqljs_code = sqljs_path.read_text()
    if "</script" in sqljs_code.lower():
        sqljs_code = sqljs_code.replace("</script", "<\\/script")
    
    js = f"""
var SQLJS_WASM_B64 = "{wasm_b64}";
var LEXDB_B64 = "{db_b64}";
{sqljs_code}
"""
    return js

if __name__ == "__main__":
    main()
```

### 5d. Contract for cartridge files

**build/<engine>.js** — must export ENGINE object:
```javascript
var ENGINE = (function() {
  function parse(text) { ... }
  function tokenize(text) { ... }
  var CLOSED = { det: {...}, ... };
  return { parse, tokenize, CLOSED };
})();
```

**build/<explainer>.js** — must export EXPLAINER object:
```javascript
var EXPLAINER = (function() {
  function tables(R) { ... }
  function rules(R) { ... }
  // ... other methods
  return { tables, rules, toMarkdown, toText, funcOf, phraseOf, clauseOf, posShort };
})();
```

**build/<styles>.css** — optional cartridge styles (injected after shell CSS):
```css
#stage.v-{level1} .cl { ... }
#stage.v-{level2} .ph { ... }
/* etc. */
```

**<Cartridge>_contents.md** — Markdown outline; compiler extracts ID→name→def→example. (Grammar example: `Grammar_contents.md`.)

### 5e. Validation

The assembler must check:
1. config.yaml is valid YAML + has required fields (cartridge.name/id/version, parser.cap, parser.levels, parser.inputUnit)
2. ENGINE file defines ENGINE object
3. EXPLAINER file defines EXPLAINER object
4. All methods of EXPLAINER exist (tables, rules, toMarkdown, toText, funcOf, phraseOf, clauseOf, posShort)
5. Content .md (if present) compiles without error
6. Lexicon .db (if present) is readable SQLite + has the declared schema
7. Output .html contains no unreplaced placeholders (`__*__`)

---

## 6. RECOMMENDED DIRECTORY LAYOUT

After refactoring, the entire `System/Widgets/Parser/` folder:

```
System/Widgets/Parser/
├── _shared/
│   ├── build_parser.py                    # main assembler (Python stdlib only)
│   ├── shell.html                         # generic chassis (universal)
│   ├── shell_sql.js                       # LEX module + sql.js init (universal)
│   ├── shell_ui.js                        # UI + harness (universal)
│   ├── shell.css                          # generic styles (universal)
│   ├── spelling_module.js                 # shared spell-checker (TEST-3 TODO)
│   └── README.md                          # "how to build a new parser"
│
├── _modules/
│   └── Spelling/                          # shared spell-check (extracted from Grammar, reused by all)
│       ├── spelling.js                    # spell-check algorithm
│       └── README.md
│
├── Grammar/
│   ├── build/
│   │   ├── config.yaml                    # cartridge manifest
│   │   ├── grammar_engine.js              # ENGINE.rules + ENGINE.CLOSED
│   │   ├── grammar_explainer.js           # EXPLAINER.render + helpers
│   │   ├── grammar_styles.css             # focus-level rules (v-sentential, v-clausal, v-phrasal, v-lexical)
│   │   ├── Grammar_lexicon.db             # SQLite lexicon
│   │   ├── build_lexicon.py               # (kept for future lexicon edits)
│   │   └── Makefile                       # build Grammar_parser.html
│   ├── Grammar_contents.md                # source content (outline numbers = IDs)
│   ├── Grammar_parser.html                # shipped output
│   ├── Specs/
│   │   ├── Done/
│   │   │   └── GrammarParser.spec.md      # (unchanged: reference spec)
│   │   └── _research/
│   │       └── (notes, alternatives, etc.)
│   └── tests/                             # (future: grammar_engine_test.py, etc.)
│
├── Style/
│   ├── build/
│   │   ├── config.yaml
│   │   ├── style_engine.js
│   │   ├── style_explainer.js
│   │   ├── style_styles.css
│   │   └── Makefile
│   ├── Style_contents.md
│   ├── Style_parser.html                  # (to be built from config.yaml)
│   ├── Specs/Done/StyleParser.spec.md
│   └── tests/
│
├── Rhetoric/
│   ├── build/
│   │   ├── config.yaml
│   │   ├── rhetoric_engine.js
│   │   ├── rhetoric_explainer.js
│   │   ├── rhetoric_styles.css
│   │   └── Makefile
│   ├── Rhetoric_contents.md
│   ├── Rhetoric_parser.html
│   ├── Specs/Done/RhetoricParser.spec.md
│   └── tests/
│
├── [remaining 10 parsers: Fact-checking, Interpretation, Story-tension, Logic, Greek/Hebrew, Tropes/Symbols, ...]
│
├── _research/                             # shared audit & design docs
│   ├── shell-cartridge-audit.md          # this document
│   ├── migration-risks.md                # (post-refactor: what to verify)
│   └── ...
│
└── README.md                              # overview: "13 parsers, one chassis"
```

**Key points:**

- `_shared/` contains the shell HTML + JS + CSS (never edited per-parser) and the shared build_parser.py.
- Each parser's `build/` folder contains its cartridge (ENGINE, EXPLAINER, CONFIG, optional CONTENT, optional lexicon).
- Content source files (`<Parser>_contents.md`) live at the parser root, not in `build/`, so they remain human-editable.
- `Makefile` in each `build/` folder provides a convenient `make` or `make clean` target (optional sugar):
  ```makefile
  .PHONY: build clean
  build:
    python3 ../../_shared/build_parser.py ..
  clean:
    rm ../<Parser>_parser.html
  ```
- Tests live in `tests/` per TEST-3.
- Specs live in `Specs/Done/` (after approval).

---

## 7. MIGRATION RISK ASSESSMENT

### 7a. What could break:

| Risk | Impact | Mitigation | Testing |
|---|---|---|---|
| **Cartridge manifest (config.yaml) is misformatted or missing fields** | Build fails silently or with cryptic error | Assembler validates schema before reading; clear error messages naming missing fields | Unit test: feed a malformed YAML, confirm error message names the problem |
| **ENGINE or EXPLAINER module not exported (missing `var ENGINE = `/ `var EXPLAINER = `)** | Syntax error at runtime; parser crashes on first input | Assembler checks for "var ENGINE = " in the file; rejects if missing | Unit test: bad ENGINE module, confirm rejection |
| **CONTENT object missing a required method (e.g., no posShort)** | Hover/context-menu fails; "EXPLAINER.posShort is not a function" | Assembler checks that all required EXPLAINER methods exist (funcOf, phraseOf, clauseOf, posShort, tables, rules, toMarkdown, toText) | Acceptance test: verify all eight methods are callable |
| **Lexicon DB file corrupted or wrong schema** | Embedded lexicon fails to init; morphology-fallback mode activated | Build step opens the .db and runs a test query; rejects if schema doesn't match declared schema in config.yaml | Unit test: corrupt .db file, confirm fallback message in footer |
| **CSS custom-property names (--h50, --h100, etc.) don't match what CONFIG.clausePalette declares** | Colours don't render; user sees unstyled text | Assembler generates CSS variable declarations from CONFIG at the top of the cartridge CSS block | Automatic: generated CSS vars always match CONFIG |
| **Placeholder substitution fails (unreplaced `__SQLJS__`, etc.)** | Output .html is broken (code contains placeholder strings) | Assembler scans output for remaining `__*__` patterns and errors out if found | Unit test: build with incomplete shell, confirm rejection |
| **Parser-specific functions called from shell UI** | Need to extract needSpace(), shortPos(), renderKey() templates to cartridge | These are already defined in EXPLAINER; shell UI should call them (but currently re-implements them locally). Refactor UI.render() to call cartridge functions | Inspection: grep the shell.js for direct calls to grammar-specific logic; verify they're all delegated |
| **Content .md compiler (compile_content_markdown) doesn't parse correctly** | CONTENT object is empty or malformed; all findings reference invalid IDs | Reuse Grammar's existing parser (or write generic one); test against all 13 content files before rollout | Acceptance test: compile each <Parser>_contents.md; verify CONTENT is non-empty and IDs match the source outline |
| **Spelling module extracted but not imported by shell** | Spell-check doesn't work | Spelling module must be imported at the top of shell_ui.js as a named function/object | Acceptance test: spell-check one typo in Grammar and verify suggestion appears |
| **Focus-level CSS is hardcoded to Grammar's four levels; Style parser has only two** | Style parser renders with unused CSS and broken view toggles | Generate CSS rules per CONFIG.levels at build time; validate that each level name in the shell matches the CSS rules generated | Acceptance test: build Grammar (4 levels), verify 4 view buttons work; build Style (2 levels), verify 2 buttons work |
| **Shell template references CONFIG field that doesn't exist** | Runtime error at parse time | Spec the CONFIG schema completely; schema-validate against each cartridge's config.yaml | Unit test: missing field in config.yaml, confirm validator rejects it |
| **Different parser needs a different ParseResult schema** | Shell UI / EXPLAINER breaks | ParseResult schema is universal (spec AD-2); never add parser-specific fields to the core schema; use cartridge extensions if needed | Inspection: verify that all 13 parsers' findings/spans/tokens conform to AD-2 schema in their specs |

### 7b. What must be verified after the refactor:

1. **Rebuilt Grammar_parser.html is byte-for-byte identical to current Grammar_parser.html** — or at least functionally identical (same AC-1–AC-12 acceptance criteria).
2. **All 13 cartridges are present and their config.yaml files are valid** — or confirm which ones still need content files.
3. **Spell-check works in the rebuilt Grammar** — both suggestions and ignore-list persist.
4. **Focus levels toggle and fade correctly** — all four levels render at full intensity when selected; other levels fade.
5. **Explainer table (four-row word-column format) matches current Grammar** — no cell alignment or grouping changes.
6. **Exports (PDF, Markdown, plain text) produce identical output** — byte-compare against current Grammar exports.
7. **All cartridge-provided methods are called correctly by the shell UI** — no orphaned local re-implementations.
8. **Lexicon embedding round-trips correctly** — sample word lookups in rebuilt Grammar match original.
9. **No unreplaced placeholders in the output HTML** — inspect output for `__*__` strings.
10. **File size is not larger** — single-file rule still holds; size should be ≤ 4 MB for Grammar.

### 7c. Minimal acceptance test (proves rebuilt Grammar is functionally identical)

```
Cartridge: Grammar
Input: "He was an old man who fished alone in a skiff in the Gulf Stream and he had gone eighty-four days now without taking a fish." (Hemingway, AC-1 from spec)

Expected:
✓ Sentence classification: compound-complex + declarative
✓ Clauses: 2 independent (main + coordinated), 1 dependent (relative "who fished…")
✓ Phrases: 3+ prepositional, 1 gerund
✓ Tense: past perfect for "had gone"
✓ Findings: zero errors/flags, several conventions flagged (not as errors)
✓ Explainer table: 26 columns (one per word), 4 rows (word, phrase, clause, function)
✓ Rules extract: lists Relative Clause (2.5), Prepositional Phrase (3.3) once each (deduplicated), Past Perfect (4.3.7), Gerund Phrase (3.8)
✓ Focus levels: all 4 buttons present and clickable; Clausal active by default
✓ Spell-check: no red underlines (all words known)
✓ Lexicon footer: shows 20,000+ words (not "morphology fallback")

Acceptance: all 10 checks pass
```

---

## Summary

### The Seam

**Shell/Cartridge boundary:**
- **SHELL** (never rewritten): UI harness, display layers, focus-level selector, colour rendering engine, spell-check UI, export bar, LEX portal (lexicon query interface), input enforcement
- **CARTRIDGE** (replaced per parser): CONFIG (metadata, cap, levels, colour palette), CONTENT (compiled taxonomy), ENGINE.rules (parser passes), EXPLAINER.render (result formatting), cartridge styles (view-level CSS)
- **CONTESTED/NEEDS SPLITTING**: spell-check algorithm (belongs in shared `_modules/Spelling/`, not in UI); needSpace() and shortPos() (should be cartridge-supplied EXPLAINER methods, not hardcoded in shell); renderKey() text (should be parameterized via CONFIG or cartridge).

### The Contract

**Cartridge provides:**
1. `CONFIG`: object with name, version, cap, inputUnit, levels, clausePalette, tentativeThreshold, tierB
2. `CONTENT`: object keyed by ID, each entry has name, level, definition, example
3. `ENGINE`: object with parse(text) → ParseResult, tokenize(text), CLOSED (closed-class word lists)
4. `EXPLAINER`: object with tables(R), rules(R), toMarkdown(R), toText(R), funcOf(R,i), phraseOf(R,i), clauseOf(R,i), posShort(t)

**Shell provides:**
1. ParseResult JSON schema (AD-2, verified against code)
2. UI containers, button event handlers, focus-level selector, colour key, icon bar, hover/context-menu rendering, export bar
3. LEX portal for embedded lexicon queries (uses sql.js/WASM)

### Top 3 Migration Risks

1. **Placeholder injection fails silently**: If build_parser.py misses a `__*__` placeholder or the cartridge files don't export ENGINE/EXPLAINER correctly, the output HTML is broken but the build completes without error. **Mitigation:** Assembler validates placeholders and required exports; errors out with clear messages.

2. **Focus-level CSS hardcoded to Grammar's four levels**: Any parser with 2 or 5+ levels will have mismatched CSS rules. **Mitigation:** Generate focus-level CSS rules per CONFIG.levels at build time (not hardcoded in shell.css).

3. **ParseResult schema drift**: If a cartridge adds fields not in AD-2, or if the shell UI makes assumptions about the shape of findings/spans/tokens that don't hold for all parsers, the system breaks asymmetrically (works for Grammar, fails for others). **Mitigation:** Strict schema validation at build time; no parser-specific fields in the core ParseResult; use optional `_cartridgeExtensions` or reserved cartridge-namespace fields if needed.

---

**Report complete. Delivered to:** `/Users/lukeishammacbookair/Library/CloudStorage/Dropbox/_Lukeatron/System/Widgets/Parser/_research/shell-cartridge-audit.md`

