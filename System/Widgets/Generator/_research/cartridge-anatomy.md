# Cartridge Anatomy — Parser Shell Architecture
**Research document**: Complete technical specification for building a parser cartridge for the shared shell.

---

## 1. Cartridge Folder Structure & Minimum Viable Cartridge

### Complete Folder Anatomy

```
<CartridgeName>/
├── README.md                          (editable reference; ~2–3 paragraphs)
├── cartridge/
│   └── build/
│       ├── config.yaml                (REQUIRED — manifest, see §2)
│       ├── <engine>.js                (REQUIRED — path from files.engine)
│       ├── <explainer>.js             (REQUIRED — path from files.explainer)
│       ├── <content>.json             (optional — path from files.content; .md compiles to JSON)
│       ├── <content>.md               (optional — if .json doesn't exist, this compiles)
│       ├── <styles>.css               (optional — path from files.styles)
│       ├── <lexicon>.db               (optional — path from lexicon.dbFile, if lexicon.enabled:true)
│       └── <build_script>.py          (optional — rebuilds .db; never shipped in HTML)
├── <Content>_content.md               (editable source file; Grammar example: Grammar_contents.md)
├── Specs/
│   └── Done/
│       └── <Cartridge>Parser.spec.md  (technical spec; cites _shell/Specs/ParserShell.spec.md)
└── <Cartridge>_parser.html            (SHIPPED OUTPUT — one self-contained offline widget)
```

The shipped `.html` file is the **only** deliverable; all source files (`*.md`, `*.db`, build scripts) stay in the repo for maintenance but are not distributed to users.

### Minimum Viable Cartridge

Absolute minimum required to assemble:

1. **`build/config.yaml`** — valid manifest with all required fields (§2)
2. **`build/<engine>.js`** — exports `{ parse, tokenize, CLOSED }`
3. **`build/<explainer>.js`** — exports nine functions: `tables`, `rules`, `toMarkdown`, `toText`, `funcOf`, `phraseOf`, `clauseOf`, `posShort`, `needSpace`
4. **No grammar-specific code in the shell** (`_shell/src/`) — the shell is never modified per cartridge

**Grammar cartridge minimum example:**
- `build/config.yaml` ✓
- `build/grammar_engine.js` ✓
- `build/grammar_explainer.js` ✓
- `build/grammar_content.json` (pre-compiled from Grammar_contents.md) ✓
- `build/Grammar_lexicon.db` (optional; Grammar has one) ✓
- **Total shipped size:** 4.18 MB (with 93,456-word spelling dictionary embedded)

**Style cartridge minimum example (reference slice):**
- `build/config.yaml` ✓
- `build/style_engine.js` ✓
- `build/style_explainer.js` ✓
- `build/style_content.json` (pre-compiled from `Genres/*.md` + `Registers/*.md`) ✓
- **No lexicon** — Style's rules are pattern/phrase-level, not word-lookup (faster)
- **Total shipped size:** TBD (estimated 1.2–1.5 MB with spelling)

---

## 2. config.yaml — Annotated Key-by-Key Reference

### Grammar Cartridge (Real Values)

```yaml
---
# Cartridge manifest — ParserShell.spec.md §8.
# Grammar is a cartridge, full stop (plan D-3): nothing in this folder is
# importable by another parser, and nothing generic lives here.

cartridge:
  name: "Grammar parser"                    # Display name in the app header
  id: "Grammar"                             # Stable slug: used in output filename (Grammar_parser.html)
  version: "1.0.0"                          # Semantic version
  builtFrom: "Grammar_contents.md"          # Source file identifier (for footer + exports)
  icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30"><rect width="30" height="30" rx="7" fill="%2326215C"/><text x="15" y="17.5" text-anchor="middle" font-family="Georgia,serif" font-size="17" font-weight="bold" fill="%23EEEDFE">G</text><rect x="6" y="22.5" width="6" height="2.6" rx="1.3" fill="%235DCAA5"/><rect x="13" y="22.5" width="5" height="2.6" rx="1.3" fill="%23FAC775"/><rect x="19" y="22.5" width="5.5" height="2.6" rx="1.3" fill="%23AFA9EC"/></svg>'
                                            # Data-URI SVG icon (rendered in browser tab + header)

parser:
  inputUnit: "one sentence"                 # What the widget parses at once (Grammar: sentence; Style: paragraph)
  cap: 100                                  # Hard word limit; over cap blocks parsing with warning
  levels:                                   # Focus levels (Grammar has 4; Style has 1)
    - sentential
    - clausal
    - phrasal
    - lexical
  tentativeThreshold: 0.7                   # Confidence ≤ this → render with dashed "tentative" marker
  focusLabels:                              # Optional per-level UI labels
    sentential: "Sentence focus"
    clausal: "Clause focus"
    phrasal: "Phrase focus"
    lexical: "Word focus"

tierB:
  enabled: false                            # Always false (FR-2: enforced by assembler)
  note: "Tier B (API/agent) slot present but disabled in this build."

lexicon:
  enabled: true                             # True if embedded SQLite .db is shipped
  dbFile: "Grammar_lexicon.db"              # Path from build/ (embedded at assemble time)
  schema: "word,pos,alt,feat,rank"          # CSV header; validated by assembler
  # [label](url) markdown-link syntax — ui.js's renderAttribution()
  # turns each into a real target=_blank anchor. Visible text is unchanged.
  attribution: "[Moby](https://www.gutenberg.org/ebooks/3203) [PD](https://en.wikipedia.org/wiki/Public_domain) + [FrequencyWords](https://github.com/hermitdave/FrequencyWords) [CC-BY-SA](https://creativecommons.org/licenses/by-sa/4.0/)"

spelling:
  enabled: true                             # If true, assembler embeds the central spelling module

colours:
  palette:
    - name: teal                            # Name must match sweep hue references (if sweeps enabled)
      h50: "#E1F5EE"                        # Lightest tint (background)
      h100: "#9FE1CB"                       # Light shade
      h600: "#0F6E56"                       # Dark shade
      h800: "#085041"                       # Darkest shade
      hf: "rgba(29,158,117,.12)"            # Focus-state highlight (12% opacity)
    - name: amber
      h50: "#FAEEDA"
      h100: "#FAC775"
      h600: "#854F0B"
      h800: "#633806"
      hf: "rgba(239,159,39,.12)"
    - name: purple
      h50: "#EEEDFE"
      h100: "#CECBF6"
      h600: "#534AB7"
      h800: "#3C3489"
      hf: "rgba(127,119,221,.12)"
    # ... (Grammar has 6 total: teal, amber, purple, pink, coral, blue)

# Optional: sweep-selector UI (opt-in, default-off; Grammar omits this block)
# Uncomment for Style / future cartridges:
#
# sweeps:
#   enabled: true
#   items:
#     - id: clarity
#       label: "Clarity"
#       category: genre          # 'genre' | 'register'
#       hue: teal                # Must match colours.palette[].name
#       section: "1"             # CONTENT id prefix (e.g., "1.*", "8.*")
#       oppositeId: obscurity    # genre only
#       oppositeLabel: "Obscurity"
#       oppositeSection: "8"
#     - id: academic-english
#       label: "Academic English"
#       category: register
#       hue: blue
#       section: "6"

# Optional: MiniWiki glossary integration (opt-in, default-off)
# Uncomment if this cartridge has a glossary:
#
# miniwiki:
#   enabled: true
#   articlesFile: "grammar.miniwiki.json"   # Produced by _modules/MiniWiki/build/extract_articles.py
#   cartridgeName: "Grammar parser"         # Display name in wiki window

files:
  engine: "grammar_engine.js"               # Path from build/; must export ENGINE = { parse, tokenize, CLOSED }
  explainer: "grammar_explainer.js"         # Path from build/; must export EXPLAINER with 9 required functions
  content: "grammar_content.json"           # Path from build/; either .json or .md (compiles to JSON)
  # Optional:
  # styles: "cartridge.css"                 # Path from build/ (merged with shell.css)
```

### Key Validation Rules (enforced by `assemble.py`)

- **All top-level blocks required:** `cartridge`, `parser`, `colours`
- **All cartridge fields required:** `name`, `id`, `version`, `builtFrom`
- **All parser fields required:** `inputUnit`, `cap` (positive int), `levels` (non-empty list), `tentativeThreshold` (0–1)
- **Colours palette required:** each hue must have `name`, `h50`, `h100`, `h600`, `h800`, `hf`
- **Sweep validation:** if `sweeps.enabled: true`, then `sweeps.items` must be non-empty; all sweep items must reference palette names from `colours.palette`
- **No surviving `__PLACEHOLDER__`** in any assembled output (build exits non-zero if found)

---

## 3. Tokenizer, Engine Passes & Explainer Exports

### Grammar Engine Pipeline

The `grammar_engine.js` **three-pass engine** tokenizes input and produces a `ParseResult` object:

#### Pass 1: Lexical Tagging (Bottom-up)

**Input:** raw text  
**Process:**

1. **Tokenize:** regex split into words, punctuation, numbers
   - Regex: `/[A-Za-zÀ-ɏ]+(?:[''][A-Za-z]+)*(?:-[A-Za-zÀ-ɏ]+(?:[''][A-Za-z]+)*)*|\d+(?:[.,]\d+)*|[.,;:!?…—–\-()"'""'']/g`
   - Each token gets `{i, text, start, end, isWord, tags: [], final: null}`

2. **Closed-class lookup:** check `CLOSED` object (determiners, pronouns, prepositions, conjunctions, modals, auxiliaries, etc.)
   - ~16 closed classes stored as `{class: {word: 1 || value, ...}}`
   - Example: `CLOSED.det = {a, an, the, this, that, ...}`
   - Example: `CLOSED.pron = {i: "1sg", he: "3sg", they: "3pl", ...}` (stores person/number)

3. **Lexicon query:** if word found in embedded SQLite:
   - Returns: `{pos, conf, feat: [...]}`
   - Stores up to 4 alternate POS tags

4. **Morphological fallback** (for unknown words):
   - `-ly` suffix → adverb (conf 0.8)
   - `-ing` suffix → verb (conf 0.6–0.85, if base is in lexicon)
   - `-ed` suffix → verb, past participle (conf 0.6–0.85)
   - `-s` suffix → noun plural or 3sg verb (conf 0.55–0.75)
   - `-er/-est` suffix → adjective comparative/superlative (conf 0.7)
   - Nominalization suffixes `-tion`, `-ment`, `-ness`, etc. → noun (conf 0.75)
   - Adjectival suffixes `-ous`, `-ful`, `-less`, `-able`, etc. → adjective (conf 0.65)

5. **Contextual disambiguation** (heuristics apply within clauses):
   - After determiner/numeral: prefer adjective or noun
   - After auxiliary: prefer verb
   - "to" before verb → infinitive marker
   - "that" context varies (relative pronoun, determiner, subordinating conjunction)
   - Proper nouns inferred from capitalization (if not in lowercase lexicon)

**Output:** every token has `final = {pos, conf, sub, feat}` + `tags[]` (ranked by confidence)

**Guarantee:** no token is left untagged (worst case: noun at 0.45 confidence)

#### Pass 2: Syntactic & Semantic (Top-down)

**Input:** tokens with `final` POS tags  
**Process:**

1. **Verb group identification:**
   - Scan for consecutive verbs + negation + adverbs
   - Classify tense: simple present/past/future, perfect, progressive, perfect progressive, passive
   - Examples: `has been reading` → present perfect progressive; `was taken` → past passive

2. **Phrase chunking:**
   - **NP (noun phrase):** determiner/numeral + adjectives + noun(s)
   - **VP (verb phrase):** verb group (entire tense structure)
   - **PP (prepositional phrase):** preposition + determiner/adj + noun/pronoun
   - **AdjP (adjective phrase):** adjectives
   - **AdvP (adverb phrase):** adverbs
   - **InfP (infinitive phrase):** infinitive marker + verbs + objects
   - **GerundP (gerund phrase):** gerund (verb-ing) + objects

3. **Clause segmentation:**
   - Identify clause boundaries: coordinating conjunctions (and, but, or), relative pronouns (who, which), subordinating conjunctions (because, although), commas between subject-verb pairs
   - Classify each segment:
     - **Independent clause (2.1):** has finite verb, no dependent marker
     - **Dependent clause (2.2):** has dependent marker but no finite verb (partial)
     - **Adverbial clause (2.4):** subordinated by conjunction
     - **Relative clause (2.5):** subordinated by relative pronoun

4. **Sentence structure classification:**
   - Count independent and dependent clauses
   - **Simple (1.1):** 1 independent, 0 dependent
   - **Compound (1.2):** 2+ independent, 0 dependent
   - **Complex (1.3):** 1 independent, 1+ dependent
   - **Compound-complex (1.4):** 2+ independent, 1+ dependent

5. **Sentence purpose classification:**
   - **Declarative (1.7d):** ends with period
   - **Interrogative (1.7i):** ends with question mark
   - **Exclamatory (1.7e):** ends with exclamation point
   - **Imperative (1.7m):** begins with base-form verb, implied "you" subject
   - **Tag question (1.7t):** "..., isn't it?" pattern

**Output:** `spans[]` array with clause/phrase boundary markers + `findings[]` about tense/voice

#### Pass 3: Conventions & Errors (Rule-based)

**Input:** parsed clauses, phrases, tokens  
**Process:** checks 30+ rules:

1. **Subject-verb agreement (5.1.1):** person & number match (singular verb with singular subject, etc.)
   - Inspects clause's subject noun phrase against finite verb form
   - Confidence: 0.85 if match, 0.8 if mismatch

2. **Comma splice (7.4):** two independent clauses joined by comma only
   - Also detects fused sentences (no punctuation between clauses)

3. **Sentence fragment (7.5):** no independent clause with finite verb

4. **Parallel structure (7.6):** lists should use same form (all gerunds, all infinitives)
   - Flags mixing "reading, swimming, and to ride"

5. **Case errors (7.9):** "between you and I" → should be "me"

6. **Tense/number ambiguities:** "more + comparative adjective" double-marking

7. **Capitalization (6.4):** lowercase first letter, lowercase pronoun "i"

8. **Negation (5.6):** double-negative check

**Output:** `findings[]` with `{id, label, severity, start, end, explain, confidence}`
- `severity`: `'info'` (FYI), `'check'` (worth checking), `'flag'` (error)

### ParseResult Contract (Canonical Schema)

Every engine produces this shape, identical across all parsers:

```javascript
{
  meta: {
    asset: "Grammar",           // from config.cartridge.name
    version: "1.0.0",           // from config.cartridge.version
    cap: 100,                   // from config.parser.cap
    wordCount: 25,              // actual count
    overCap: false,             // true blocks parsing
    lexiconMode: "embedded SQLite" // "morphology-only" if db load failed
  },
  tokens: [                     // One per word/punctuation; Layer 3 input
    {
      i: 0,
      text: "He",
      start: 0,
      end: 2,
      isWord: true,
      tags: [                   // Ranked by confidence
        { id: "4.1pron", label: "pronoun · 3rd-person singular", confidence: 0.96, sub: null, feat: ["3sg"] }
      ]
    },
    // ... per token
  ],
  spans: [                      // Clause/phrase boundary markers; Layer 1 input
    {
      start: 0,
      end: 24,
      id: "2.1",                // References CONTENT id
      label: "Independent clause",
      kind: "clause",           // 'clause' | 'phrase' | 'phrase-inner'
      confidence: 0.85,
      clauseIdx: 0,             // Clause's index in summary
      imperative: false         // Only for imperative clauses
    },
    {
      start: 0,
      end: 1,
      id: "3.1",
      label: "Noun phrase (3.1)",
      kind: "phrase",
      confidence: 0.9
    },
    // ... per phrase/clause boundary
  ],
  findings: [                   // Checkmarks & errors; Layer 2 input
    {
      id: "4.3.7",              // CONTENT id (rule reference)
      label: "Past perfect",
      severity: "info",         // 'check'|'info'|'flag'|'na'
      start: 4,                 // Token index (not char offset)
      end: 7,
      explain: ""had gone": "had" (auxiliary, past) + past participle...",
      confidence: 0.85
    },
    // ... per finding
  ],
  summary: {
    classifications: [          // Top-level sentence structure + purpose
      { id: "1.4", label: "Compound-complex" },
      { id: "1.7d", label: "Declarative" }
    ],
    counts: {
      words: 25,
      clauses: 3,
      independent: 2,
      dependent: 1,
      phrases: 8
    }
  },
  // Internal (not exported):
  _clauses: [...],              // Full clause objects (used by Explainer)
  _phrases: [...],              // Full phrase objects
  _toks: [...]                  // Token array (used by Explainer)
}
```

### Explainer Module — Nine Required Exports

**File:** `grammar_explainer.js`  
**Pattern:** IIFE returning object with exactly these 9 keys (enforced by `assemble.py`):

```javascript
var EXPLAINER = (function(){
  // ... helper functions ...
  
  return {
    tables: function(ParseResult) { ... },        // HTML table of words + syntax
    rules: function(ParseResult) { ... },         // HTML extract of relevant rules
    toMarkdown: function(ParseResult) { ... },    // Markdown export
    toText: function(ParseResult) { ... },        // Plain text export
    funcOf: function(ParseResult, tokenIdx) { ... }, // Word's grammatical function
    phraseOf: function(ParseResult, tokenIdx) { ... }, // Phrase containing this token
    clauseOf: function(ParseResult, tokenIdx) { ... }, // Clause containing this token
    posShort: function(token) { ... },            // Short POS label ("verb", "noun", etc.)
    needSpace: function(tokenA, tokenB) { ... }   // Should space between two tokens? (typographic rules)
  };
})();
```

#### Grammar's Explainer Structure

**`tables(R):`** renders the four-row sentence table per Grammar's AD-6 design:
- **Row 1:** words in the sentence
- **Row 2:** phrase membership (NP, VP, PP, etc.)
- **Row 3:** clause membership + sentence-role label
- **Row 4:** grammatical function (subject, verb, direct object, etc.)

Groups by clause, coloured per clause's hue from `CONFIG.clausePalette`. Example output:

```html
<table class="xt">
  <tr><th>Word</th><td>He</td><td>fished</td><td>alone</td><td>...</td></tr>
  <tr><th>Phrase</th><td colspan="2" style="background:#...">VP</td><td>AdvP</td><td>...</td></tr>
  <tr><th>Clause · role</th><td colspan="8" style="background:#...">Independent clause (2.1)</td></tr>
  <tr><th>Function</th><td>subject</td><td>verb</td><td>adverbial</td><td>...</td></tr>
</table>
```

**`rules(R):`** extracts unique CONTENT ids hit by this sentence, grouped by category:
- Collects all ids from `R.summary.classifications`, `R.spans[].id`, `R.findings[].id`
- Deduplicated (each id appears once, even if phrase occurs twice)
- Grouped: "Sentence", "Clauses", "Phrases", "Conventions", "Errors flagged"
- Each entry: rule name + definition + example from CONTENT verbatim

**`toMarkdown(R):`** returns markdown:
```markdown
# Grammar parser — explainer

**Sentence:** He fished alone in the Gulf Stream...

**Classification:** Compound-complex (1.4) · Declarative (1.7d)

## The tabled sentence

| Word | He | fished | ... |
|---|---|---|---|
| Phrase | NP | VP | ... |
| Clause | Independent (2.1) | Independent (2.1) | ... |
| Function | subject | verb | ... |

## Relevant rules

- **Past perfect (4.3.7)** — ... definition from CONTENT ...
- **Prepositional phrase (3.3)** — ... definition from CONTENT ...
```

**`toText(R):`** plain text (strips markdown syntax, preserves structure)

**`funcOf(R, tokenIdx):`** returns the grammatical function of the token at this index:
- Checks which clause the token is in
- Checks which element role within that clause (subject, verb, object, etc.)
- Returns role name if found, else POS short form

**`phraseOf(R, tokenIdx):`** returns the phrase object (if any) containing this token; used for colouring and layer 2 expanders

**`clauseOf(R, tokenIdx):`** returns the clause object containing this token

**`posShort(token):`** returns human-friendly POS label:
- `"noun"`, `"verb"`, `"verb, past"`, `"verb, -ing form"`, `"adjective"`, `"adverb"`, `"pronoun"`, `"relative pronoun"`, `"modal verb"`, `"auxiliary verb"`, `"preposition"`, `"conjunction"`, `"determiner"`, `"numeral (quantifier)"`, `"particle"`, `"interjection"`, `"proper noun"`

**`needSpace(tokenA, tokenB):`** returns true if a space should appear between two tokens (typographic rules):
```javascript
function needSpace(a, b){
  if(!b.isWord && ".,;:!?…".indexOf(b.text) >= 0) return false;  // No space before punctuation
  if(!a.isWord && "("'".indexOf(a.text) >= 0) return false;      // No space after opening paren/quote
  return true;
}
```

---

## 4. Content Compilation: .md → .json Format

### Markdown Dialect & Conventions

**Grammar uses** pre-compiled JSON, but the assembler supports compiling `.md` files via `assemble.py`'s `compile_content_markdown()` function.

**Recognized format:**
```
<id> <Name>
  Definition/body text (indented; multiple lines joined with spaces).
  Can span multiple lines.
  Example: "quoted example text"

<id2> <Another name>
  More body...
  Example: "..."
```

**Regex match:** `^(\d+(?:\.\d+)*[a-z]?)\s+(.+)$`

**Parsing rules:**
- Line starting with outline number + space + name → new entry
- All indented lines after → body (stripped, joined with spaces)
- `Example: "..."` line → extracted as `e` field
- No `Example` line → `e` is empty string

**Example (Grammar_contents.md excerpt):**
```markdown
1.1 Simple sentence
  A sentence that contains one independent clause and no dependent clauses.
  Example: "The man fished."

1.2 Compound sentence
  Two or more independent clauses joined by a coordinating conjunction (and, but, or, nor, yet, so) or semicolon.
  Example: "He fished, and she swam."

2.1 Independent clause
  A clause containing a subject and a finite verb that can stand alone as a complete sentence.
  Example: "The man fished."
```

**Compiled to JSON** (`grammar_content.json`):
```json
{
  "1.1": {
    "n": "Simple sentence",
    "l": "sentential",
    "d": "A sentence that contains one independent clause and no dependent clauses.",
    "e": "The man fished."
  },
  "1.2": {
    "n": "Compound sentence",
    "l": "sentential",
    "d": "Two or more independent clauses joined by a coordinating conjunction (and, but, or, nor, yet, so) or semicolon.",
    "e": "He fished, and she swam."
  },
  "2.1": {
    "n": "Independent clause",
    "l": "clausal",
    "d": "A clause containing a subject and a finite verb that can stand alone as a complete sentence.",
    "e": "The man fished."
  }
}
```

### Grammar's Content.json Structure

**Key structure** (common across all parsers):
```javascript
CONTENT = {
  "<id>": {
    "n": "rule name",
    "l": "level name",  // 'sentential'|'clausal'|'phrasal'|'lexical' for Grammar
    "d": "full definition",
    "e": "example text"
  },
  // ... hundreds of entries
}
```

- **`n`** (name): display label used in Layer 1 key, Explainer tables, hover tooltips
- **`l`** (level): structural level this rule belongs to; used for focus-level filtering
- **`d`** (definition): full explanatory text displayed in Explainer's rules extract
- **`e`** (example): quoted example (often multiple sentences); shown in Explainer

### Style's Content Compilation (Multi-File)

Style's approach: **pre-compiled JSON from multiple `.md` files** (Genres/ + Registers/)

**Why not assemble.py's markdown compiler?**
- Style uses ATX headings (`### 1.1 Title`) instead of inline outline numbers
- The inline regex `^(\d+...` doesn't match ATX headings
- **Solution:** `compile_style_content.py` uses `_modules/MiniWiki/build/extract_articles.py`'s `parse_frontmatter()`, `scan_nodes()`, and `fold_category_descriptions()` functions (avoiding SR-4 duplication)

**Style's content files:**
```
Genres/
  ├── Clarity.md        (§1: Clarity + §8: Obscurity antithesis)
  ├── Brevity.md        (§2: Brevity + §9: Verbosity antithesis)
  ├── Coherence.md      (§3 + §10)
  ├── Voice.md          (§4 + §11)
  ├── Diction.md        (§5 + §12)
Registers/
  ├── Academic_english.md    (§6)
  └── Simple-descriptive_english.md (§7)
```

**Each file frontmatter:**
```yaml
---
sweep_id: clarity
sweep_category: genre
opposite_sweep_id: obscurity
opposite_section: "8"
---
```

**Compiled JSON shape** (same as Grammar but `l` is `sweep_id`, not a structural level):
```json
{
  "1.1": {
    "n": "Active voice",
    "l": "clarity",              // sweep_id, not 'sentential'
    "d": "Prefer active voice...",
    "e": "Before → After example"
  },
  "8.1": {
    "n": "Passive voice",
    "l": "obscurity",            // opposite sweep_id
    "d": "Passive voice as a technique...",
    "e": "Example of effective passive"
  },
  "6.1": {
    "n": "Tense precision",
    "l": "academic-english",
    "d": "Use tenses precisely...",
    "e": "Academic English example"
  }
}
```

---

## 5. Colour Palette Model

### h50/h100/h600/h800/hf Model

**Five slots per hue family:**

| Slot | Purpose | Use Case |
|---|---|---|
| `h50` | Lightest background | Span background, faded context |
| `h100` | Light shade | Hover state, secondary text |
| `h600` | Dark shade | Main text, strong foreground |
| `h800` | Darkest shade | Maximum contrast, bold emphasis |
| `hf` | Focus highlight (rgba) | Hover glow, focus-state border |

**Example (Grammar's Teal):**
```yaml
name: teal
h50: "#E1F5EE"           # Light mint background
h100: "#9FE1CB"          # Softer teal
h600: "#0F6E56"          # Deep teal text
h800: "#085041"          # Dark teal (max contrast)
hf: "rgba(29,158,117,.12)"  # 12% opacity teal glow
```

### Grammar's 6-Hue Palette

```yaml
teal, amber, purple, pink, coral, blue
```

Each clause gets one hue assigned by index: `clause.idx % palette.length`  
All phrases within that clause render as **shades** of the same hue (h50 background, h600 text)  
All words in that phrase render as **tints** of the hue (at Lexical focus)

### Style's Categorical (Non-Structural) Colouring

Style doesn't inherit hue down clauses; instead:
- Each genre sweep gets its own hue (declared in `config.yaml`'s `sweeps.items[].hue`)
- All findings for that genre share that hue (no phrase/word tint variation)
- Toggling to antithesis keeps the same hue (same detector, two modes)

### Assemble-Time CSS Generation

The assembler (`assemble.py:generate_focus_css()`) generates focus-level CSS variables from `config.yaml`:

```python
def generate_focus_css(levels, palette):
    # For each focus level, generates CSS with:
    # --color-<level>-<hue-name> (base colour for that level/hue)
    # All hues at that level defined in CSS so the page can switch on-demand
```

Output CSS (example, generated at build time):
```css
:root {
  --color-sentential-teal: #0F6E56;
  --color-sentential-amber: #854F0B;
  --color-sentential-purple: #534AB7;
  ...
  --color-lexical-teal: #9FE1CB;
  --color-lexical-amber: #FAC775;
  ...
}
```

No colour values hardcoded in shell; all come from `config.cartridge.colours.palette`.

---

## 6. Step-by-Step Recipe: Authoring a New Cartridge from Scratch

### Phase 1: Planning (Pre-Build)

1. **Define the task:** what does this parser analyse? (sentences, paragraphs, rhetorical features, logic errors?)
   - *Grammar example:* grammatical structure, agreement, sentence types
   - *Style example:* prose style (clarity, brevity, voice, diction)
   - *Rhetoric example:* rhetorical moves, appeals, structure (future)

2. **Outline the content:** what rules/categories does it check?
   - Create outline numbering scheme (e.g., 1.1, 1.2, 2.1, 2.2... up to 5.3)
   - List rules, definitions, examples
   - Identify provenance (sources, licences)

3. **Decide on data structures:**
   - Does it need a lexicon? (Grammar: yes; Style: no)
   - How many focus levels? (Grammar: 4; Style: 1)
   - How many colour hues? (6 is a good baseline)
   - Are there sweeps/toggles? (Grammar: no; Style: yes, 7 sweeps)

4. **Plan the engine passes:** how will you tokenize and find findings?
   - Lexicon lookups vs. pattern matching?
   - Rule-based heuristics or statistical scoring?
   - How many passes (Grammar: 3)?

5. **Write the spec:** `Specs/Done/<Cartridge>Parser.spec.md`
   - Cite `ParserShell.spec.md` as prerequisite
   - State what's in scope and out of scope
   - List functional requirements (FR-*)
   - Include worked-example acceptance criteria (AC-*)

### Phase 2: Content Authoring

1. **Create the source content file(s):**
   - For single source: `<Cartridge>_contents.md` with outline numbering
   - For multi-file: create folder structure (Genres/, Registers/) + compile script

   **Example structure for Grammar:**
   ```
   1 Sentence structure
   1.1 Simple sentence
     Definition...
     Example: "..."
   1.2 Compound sentence
     Definition...
     Example: "..."
   
   2 Clauses
   2.1 Independent clause
     Definition...
     Example: "..."
   ```

2. **Validate the outline numbering:** every rule has a stable, non-duplicated id

3. **Compile to JSON** (if not already done):
   - Single-file: use `assemble.py`'s built-in markdown compiler (or Grammar's pattern: pre-compile)
   - Multi-file: write a custom compiler (or follow Style's pattern: use MiniWiki's extract)
   - **Output path:** `<Cartridge>/cartridge/build/<name>.json` or `<Cartridge>/cartridge/build/<name>.md`

### Phase 3: Engine Implementation

1. **Create** `<Cartridge>/cartridge/build/<name>_engine.js`

   ```javascript
   var ENGINE = (function() {
     var CLOSED = {
       /* closed-class word sets, if any */
     };
     
     function tokenize(text) {
       /* Split text into words/punctuation; return [{i, text, start, end, isWord}, ...] */
       // At minimum: regex split, no POS tagging needed
     }
     
     function parse(text, selection) {
       /* selection parameter optional; if omitted, ignore it (backward-compat).
          selection.sweeps = { sweepId: { on: bool, opposite: bool }, ... }
          Return ParseResult object per schema in §3.
       */
       var toks = tokenize(text);
       var wordCount = toks.filter(function(t) { return t.isWord; }).length;
       
       if (wordCount > CONFIG.cap) {
         return { meta: { ..., overCap: true } };
       }
       
       /* Run your parsing passes */
       var spans = [];  // Boundaries, clause/phrase markers
       var findings = []; // Rules that fired
       var summary = { ... };
       
       return {
         meta: { asset: CONFIG.name, version: CONFIG.version, cap: CONFIG.cap, 
                 wordCount: wordCount, overCap: false },
         tokens: toks,
         spans: spans,
         findings: findings,
         summary: summary,
         _clauses: [],  // Internal (for Explainer)
         _phrases: [],
         _toks: toks
       };
     }
     
     return { parse: parse, tokenize: tokenize, CLOSED: CLOSED };
   })();
   ```

2. **Implement tokenization:**
   - Define a regex or algorithm
   - Preserve text offsets (`start`, `end`), isWord boolean
   - Return simple `{i, text, start, end, isWord}` (POS tagging optional)

3. **Implement each rule pass:**
   - For Grammar: 3 passes (lexical tagging, syntax, conventions)
   - For Style: pattern matching (passive detection, hedge phrases, etc.)
   - For Rhetoric: rhetorical move recognition

4. **Build spans[]:** mark boundaries (clauses, phrases, or domain-specific structures)
   - `{ start: tokenIdx, end: tokenIdx, id: "2.1", label: "...", kind: "...", confidence: 0.85 }`

5. **Build findings[]:** flag rules that fired
   - `{ id: "5.1.1", label: "...", severity: "info"|"flag"|"check"|"na", start, end, explain, confidence }`

6. **Build summary:** top-level classifications and counts
   - `{ classifications: [{id, label}, ...], counts: {...} }`

7. **Test:** write Node.js unit tests
   - `node --test tests/js/test-<engine>.mjs`
   - Mock `CONTENT`, `CONFIG`, `LEX` if used

### Phase 4: Explainer Implementation

1. **Create** `<Cartridge>/cartridge/build/<name>_explainer.js`

   ```javascript
   var EXPLAINER = (function() {
     
     function tables(R) {
       /* Render findings as HTML table(s) for display.
          For Grammar: the four-row sentence table.
          For Style: one row per finding (excerpt, genre, rule, suggestion).
          Consult R._clauses, R._phrases, R._toks, R.summary, R.findings.
       */
     }
     
     function rules(R) {
       /* Extract unique rule ids from R, deduplicate, group by category, 
          render as HTML <ul> with rule names + definitions + examples from CONTENT.
       */
     }
     
     function toMarkdown(R) {
       /* Markdown export of tables() + rules(). */
     }
     
     function toText(R) {
       /* Plain text export. */
     }
     
     function funcOf(R, tokenIdx) {
       /* Return grammatical function of token at tokenIdx, e.g. "subject", "verb", "object" */
     }
     
     function phraseOf(R, tokenIdx) {
       /* Return phrase object containing tokenIdx, or null. */
     }
     
     function clauseOf(R, tokenIdx) {
       /* Return clause object containing tokenIdx, or null. */
     }
     
     function posShort(token) {
       /* Return human-friendly POS label. For Style, can return "" if no POS system. */
     }
     
     function needSpace(a, b) {
       /* Return true if space should appear between token a and token b. */
       return true; // Default; override with punctuation rules for your language.
     }
     
     return {
       tables: tables,
       rules: rules,
       toMarkdown: toMarkdown,
       toText: toText,
       funcOf: funcOf,
       phraseOf: phraseOf,
       clauseOf: clauseOf,
       posShort: posShort,
       needSpace: needSpace
     };
   })();
   ```

2. **Implement `tables(R)`:**
   - Decide: one table per clause (Grammar), or one row per finding (Style)?
   - Use `R._clauses`, `R._phrases`, `R._toks` to reconstruct the structure
   - Colour each row/span per `CONFIG.clausePalette`
   - Explainer appears below the parsed text after user clicks "Explain"

3. **Implement `rules(R)`:**
   - Collect unique `id` from `R.spans[]`, `R.findings[]`, `R.summary.classifications[]`
   - Deduplicate (each id once)
   - Group by prefix: "Sentence" (1.*), "Clauses" (2.*), "Phrases" (3.*), etc.
   - For each id, look up `CONTENT[id]` and render: `<strong>name (id)</strong> — definition [example]`

4. **Implement exports (functions):**
   - `funcOf`, `phraseOf`, `clauseOf`: use internal `_clauses`, `_phrases`, `_toks` to cross-reference
   - `posShort`: if your engine tags POS, return friendly label; else return "word"
   - `needSpace`: default is true; override for punctuation (no space before period, etc.)

5. **Test:** `node --test tests/js/test-<explainer>.mjs`

### Phase 5: Configuration

1. **Create** `<Cartridge>/cartridge/build/config.yaml`

   ```yaml
   ---
   cartridge:
     name: "Name Parser"
     id: "Name"
     version: "1.0.0"
     builtFrom: "<Source>.md"
     icon: 'data:image/svg+xml,<svg>...</svg>'
   
   parser:
     inputUnit: "one X"           # "one sentence", "one paragraph", etc.
     cap: 100                     # Hard word limit
     levels:                       # At least one
       - level1
       - level2
     tentativeThreshold: 0.7
     focusLabels:
       level1: "Label"
       level2: "Label"
   
   colours:
     palette:
       - name: hue1
         h50: "#..."
         h100: "#..."
         h600: "#..."
         h800: "#..."
         hf: "rgba(...)"
       # ... (at least 1 hue)
   
   lexicon:
     enabled: false               # or true + dbFile/schema/attribution
   
   spelling:
     enabled: true                # Embed the central spelling module
   
   files:
     engine: "<engine>.js"
     explainer: "<explainer>.js"
     content: "<name>.json"       # or .md
   ```

2. **Validate:** every required field present, types correct
   - Assembler will reject during `python3 assemble.py ...`

### Phase 6: Build & Test

1. **Assemble the widget:**
   ```bash
   cd /Users/lukeishammacbookair/Library/CloudStorage/Dropbox/_Lukeatron/System/Widgets/Parser
   python3 _shell/build/assemble.py <CartridgeName>/cartridge <CartridgeName>/<CartridgeName>_parser.html
   ```

2. **Check output:**
   - File created at specified path
   - Size printed (e.g., "4.18 MB")
   - No `CartridgeError` (would exit non-zero)

3. **Offline test:**
   - Open the `.html` file in a browser (double-click from Dropbox, Wi-Fi off)
   - Type text into the input area
   - Click **Parse**
   - Verify Layer 1 spans appear with correct colours
   - Click an expander → Layer 2 detail
   - Click **Explain** → Explainer panel with table + rules

4. **Verify each requirement:**
   - Check against your spec's acceptance criteria (AC-*)
   - Verify no `__PLACEHOLDER__` in the output (assembler would have caught this)

### Phase 7: Documentation & Integration

1. **Update** `Parser_guide.md`:
   - Add row to the parser comparison table
   - Update the "Open items" list

2. **Archive the spec:**
   - Move `Specs/Done/<CartridgeName>Parser.spec.md` to reflect final status
   - Cite any decisions made during build

3. **Commit:**
   ```bash
   git add <CartridgeName>/  Parser_guide.md
   git commit -m "Add <CartridgeName> parser cartridge: core engine + <N> rules"
   ```

4. **Optional: Promote to a true skill** (if used repeatedly)
   - Move repeatable build steps to `.Claude/skills/` (e.g., `!BuildParserCartridge`)

---

## 7. Glossary & Key Terms

| Term | Definition |
|---|---|
| **Cartridge** | Folder (`<Name>/cartridge/`) containing a parser's config, engine, explainer, and content (swappable) |
| **Shell** | Shared chassis (`_shell/`) — UI layers, display logic, export bar, spell check — **never** cartridge-specific |
| **CONFIG** | JS object built from `config.yaml` at assemble time; contains name, cap, levels, colours, sweep config |
| **CONTENT** | JS object (pre-compiled JSON) mapping content ids to `{n, l, d, e}` — rules, definitions, examples |
| **ENGINE** | Module exporting `{ parse, tokenize, CLOSED }`; produces `ParseResult` |
| **EXPLAINER** | Module exporting 9 functions; renders findings as tables, rules, markdown, text |
| **ParseResult** | Fixed-schema JSON output from engine; fed to display layers and exports |
| **Pass** | One traversal of tokens to identify a category of structure (Grammar: 3 passes — lexical, syntactic, conventions) |
| **Span** | Boundary marker in `ParseResult.spans[]` — clause, phrase, or domain-specific unit |
| **Finding** | Rule that fired in `ParseResult.findings[]` — has severity, explanation, confidence |
| **Layer** | Visual depth in the display (Layer 1 = colours + key; Layer 2 = expanders + icons; Layer 3 = hover tokens) |
| **Focus level** | Zoom control for Grammar (sentential → clausal → phrasal → lexical); selects what's full-intensity |
| **Hue/Shade/Tint** | Colour model: hue = clause family; shade = phrase within clause; tint = word within phrase |
| **Sweeps** | Optional genre/register toggles (Style has 7; Grammar has none) |
| **Confidence** | 0–1 score on a finding; drives rendering intensity (low → tentative dashed underline) |
| **Tier A** | Rule-based teaching aid (no agent/API); all nine parsers are Tier A |
| **Tier B** | Optional API/agent slot (present in shell but always disabled) |

---

## 8. Key Files & Paths

All paths relative to `/Users/lukeishammacbookair/Library/CloudStorage/Dropbox/_Lukeatron/System/Widgets/Parser/`:

| Path | Purpose |
|---|---|
| `_shell/src/shell.html` | HTML skeleton (placeholders only) |
| `_shell/src/shell.css` | Generic layout/theme CSS |
| `_shell/src/ui.js` | Display harness, layer renderers, export logic |
| `_shell/build/assemble.py` | Assembler (runs build) |
| `_shell/Specs/ParserShell.spec.md` | Shared contract spec |
| `Grammar/cartridge/build/config.yaml` | Example config |
| `Grammar/cartridge/build/grammar_engine.js` | Example engine (3-pass) |
| `Grammar/cartridge/build/grammar_explainer.js` | Example explainer |
| `Grammar/Grammar_contents.md` | Example editable content source |
| `Grammar/Specs/Done/GrammarParser.spec.md` | Example cartridge spec |
| `Style/cartridge/build/compile_style_content.py` | Multi-file content compiler (Style's pattern) |
| `_modules/MiniWiki/build/extract_articles.py` | Article scanner (reused by Style) |
| `_modules/Spelling/` | Central spelling module (embedded by assembler if `spelling.enabled: true`) |
| `Parser_guide.md` | User-facing guide to all nine parsers |

---

## 9. Known Limitations & Future Directions

1. **Single sentence/paragraph:** each parser handles one unit at a time; no batch/history
2. **Tier A only:** no API integration or agent calls (Tier B slot reserved but disabled)
3. **Fuzzy, not formal:** confidence scores reflect heuristic uncertainty, not formal grammar correctness
4. **No live editing:** edits to content require rebuild from `.md`
5. **No custom colours per widget:** palette is baked in at build time (swap-and-rebuild)

**Accepted escalation clause:** if a future parser needs to read large data files live from disk (not embedded), move from double-clickable `.html` to a served-folder model (D-0/AD-1a); this is a one-time shell change, not per-cartridge.

---

**Document revision:** 2026-08-11  
**Built from:** Grammar's shipped cartridge, Style's reference-slice plan, Shell/Specs documentation  
**Cites:** `ParserShell.spec.md` §8, `GrammarParser.spec.md` §5, `StyleParser.spec.md` §§1–4, `_shell/README.md`, `assemble.py`, `Grammar/build/config.yaml`
