---
name: "!GenerateWiki"
description: >
  Build a knowledge page on a topic — a Wikipedia-STYLE article synthesised from Luke's
  knowledge base and validated web sources. "Wiki-style" is the FORMAT (neutral, structured,
  encyclopedic), NOT the source: Wikipedia is never load-bearing; every claim is MLA-cited
  from approved, primarily peer-reviewed/primary sources. Renders in a chosen register
  (encyclopedic | academic | popular | news) and format (markdown + mediawiki on request).
  Triggers: "build a wiki page", "make a knowledge page", "write up <topic> as a wiki",
  "generate an article on", "encyclopedic page on", or any task reaching for a structured
  knowledge page. The Personal Research charter's "output in both Markdown and wiki formats".
type: Skill
status: Active
core_function: Generate
domain: Research (capability skill — on call during execution)
intent: "Turn what the system knows (plus vetted live sources) into a clean, fully-cited, wiki-format knowledge page — encyclopedic by default, never sourced from Wikipedia, never uncited."
dependencies:
  - "System/Templates/Template_WikiPage.md"
  - "System/Templates/wiki-page.css   (the house style — linked, never inlined)"
  - "System/Templates/Template_MLA_Reference.md"
  - "Memory/Long-Term/Preferences/  (approved-domain list for source validation)"
  - ".claude/skills/!HeadlessChromeBrowser  (live web sourcing)"
  - ".claude/skills/!Checkpoint · !OutgoingContentCheck"
  - "Memory/Long-Term/LukeatronWiki/  (optional source cluster, via !IdeaWiki)"
version: 1.1.0
calibration:
  context: Any                                  # research-led, but usable in any context
  level: Extended
  scope: Global
memory_footprint:
  read: [Memory/Long-Term, System/Templates]
  write: [System/Sandbox, Memory/Long-Term, Outbox]
---

## ⚡ TRIGGER
Primary: `!GenerateWiki`
Secondary: "build a wiki page", "make a knowledge page", "write up <topic> as a wiki/article", "generate an article on", "encyclopedic page on <topic>"
Internal: any skill/sub-agent needing a structured knowledge page calls this with a topic.
Params (all optional — default if unspecified, ask only when genuinely ambiguous):
  register = encyclopedic(default) | academic | popular | news     // the Archive/Results/*_{register} variants
  depth    = brief | standard(default) | deep
  formats  = [markdown, html](default) (+ mediawiki on request)
  sourcing = web-augmented(default) | knowledge-base-only
  provenance = on(default) | off      // off only if Luke asks; the ink is the point

## 🧭 WHAT THIS IS
A generator, not a portal. It SYNTHESISES — it owns the page's structure, neutrality, and
citations. It DELEGATES web fetching to `!HeadlessChromeBrowser` and citation format to
`Template_MLA_Reference.md`. Distinct from `!IdeaWiki`: that TENDS Luke's private idea-graph
(read+write, interconnected, for thinking); this PRODUCES a standalone public-style article
(one-shot output). They compose — !GenerateWiki may read an Ideas-wiki cluster as a source.

## 🎨 DESIGN CONTRACT — modified Tufte
Form and function are balanced: the page is austere, and the few flourishes it permits exist to
direct attention. Six rules govern every page. They are not advisory.

```
1. EVERY VISUAL DIFFERENCE ENCODES A REAL ONE.
   Colour, weight, rule and tint are spent on provenance and structure. Nothing is
   styled because it looked bare.

2. MINIMUM EFFECTIVE DIFFERENCE.
   The smallest shift that does the job. Four layers must separate at a glance and
   never shout. One channel per distinction — if a difference is already carried,
   do not double it with a second.

3. UNTOUCHED TEXT READS AT FULL WEIGHT.
   Both verbatim layers share one ink and differ only by marker. Whose words it is
   never costs the words their darkness.

4. EVIDENCE SITS BESIDE THE CLAIM.
   Citations, glosses and caveats go in the margin (<aside class="sidenote">), not
   at the foot. The reader never leaves the sentence to check it.

5. FLOURISHES FOCUS, NEVER FILL.
   The three permitted flourishes are the section sparkbar, the quote box, and the
   margin note. Each earns its place by making one area easier to read. A fourth
   requires Luke's approval.

6. THE PAGE MUST READ WITH THE INK OFF.
   Provenance is a layer over a page that already works in one colour. Test
   `body.plain` before shipping.
```

**Where the styling lives.** All of it is in `System/Templates/wiki-page.css`. A page LINKS that
file; it never inlines a copy and never adds rules of its own. A treatment the stylesheet lacks is
a gap in the SYSTEM — raise it with Luke, do not patch it locally.

**Design skills.** Before rendering, consult the `artifact-design` skill for typography, theme and
layout fundamentals, and `artifact-diagramming` if the page needs a figure. Those skills set the
craft floor; this contract overrides them wherever the two differ — provenance and restraint win.

## 🖋️ THE FOUR PROVENANCE LAYERS
Every run of text carries exactly one class. **Unclassed prose is a defect.**

| Class | What it is | Marker |
|---|---|---|
| `.p-luke`   | Verbatim — Luke's own words, word-for-word | ochre **FILL** (inline wash · left rule on a blockquote) |
| `.p-source` | Verbatim — another human's words, word-for-word | mulberry **BOX** (inline underline · bordered quote box) |
| `.p-gen`    | Written by Lukeatron — summaries, synthesis, connective prose | cool slate ink (default for body text) |
| `.p-seam`   | Structure supplied by Lukeatron — headings, links, See Also, categories | verdigris ink |

**The two verbatim layers share an ink, not a marker.** Both sit at near-black.
`FILL = his. BOX = someone else's.` Never swap them.

```
HARD RULES
  NEVER paraphrase inside .p-luke or .p-source.
  NEVER extend a verbatim run with your own words — close the span, open a .p-gen one.
  An ellipsis or bracketed insertion inside a quotation is YOUR text → mark it .p-gen.
  A quoted PASSAGE from another human goes in <blockquote class="p-source"> with a
    <footer> naming speaker + source. No attributed footer = defect.
  CITATION: .p-luke / .p-source / .p-gen all carry MLA inline citations (a .p-luke run
    cites its store + note date). .p-seam never does — seam is not a claim.
  UNCERTAIN provenance ⇒ .p-gen. Never guess text into a verbatim layer; a wrong
    .p-luke is the worst failure this skill can produce.

SPARKBAR
  Each h2 carries a .mix bar — four segments, the section's REAL proportions of
  luke/source/gen/seam by word count, rounded to 5%, with title= giving the numbers.
  Recompute on every edit. It is data, not decoration.

  COUNT CLASSED CONTAINERS, NOT JUST SPANS. A reproduced table or drawn diagram is
  usually Luke's verbatim material: class it (<tbody class="p-luke">, <pre>...) or the
  word count silently books his work as yours and the whole mix reads wrong. Unclassed
  table cells are unclassed prose — the same defect, in a different tag.

  ALSO COMPUTE provenance_mix_body — the same four proportions over the article body
  only, excluding Illustrations / See Also / References / Categories. That is the figure
  the generated-share cap tests; the whole-page mix stays in frontmatter for the reader.
```

## 🗣️ INSTRUCTIONS — TWO AUDIENCES, TWO PLACES
```
FOR THE AGENT  ➔ stays in the source as an HTML comment block, never rendered.
                 Rules, edge cases, repair paths, the full contract above.
FOR LUKE       ➔ the .key block only: four phrases and a Hide-ink button.
                 Reproduce it verbatim from the template. Do NOT expand it, do NOT
                 add a legend, a caption, or an explanatory paragraph. The ink
                 explains itself; the key is the whole of the visible instruction.
```

## 🛠️ LOGIC
```
// EXECUTION_START
INPUT topic (required) + params

1. SCOPE
   PARSE topic + register/depth/formats/sourcing
   IF register OR depth genuinely ambiguous AND it changes the page THEN ASK Luke ELSE default

2. GATHER → into evidence[]
   a. READ matching Memory/Long-Term subject stores (topic → stores); pull the Ideas-wiki
      cluster too if relevant (via !IdeaWiki EXPLORE)
   b. IF sourcing == web-augmented THEN
        DELEGATE to !HeadlessChromeBrowser: find primary / peer-reviewed sources for gaps
   c. VALIDATE every source against the approved-domain list in Memory/Long-Term/Preferences/
        DROP unapproved sources
        ASSERT no Wikipedia source is load-bearing  // Wikipedia may only POINT to primary sources, never be cited as the fact
   ASSERT evidence is sufficient to write WITHOUT speculation ELSE → Error Path
   TAG each piece of evidence at capture time with its layer:
     luke | source | (anything you will write is gen)
   // Tag on the way IN. Reconstructing provenance after drafting is how a wrong
   // .p-luke happens. If an item's origin is unclear at capture, it is NOT verbatim.

3. SYNTHESISE into System/Templates/Template_WikiPage.md, shaped by `register`:
   - Lead: neutral, term in **bold**, what it is in 1–3 cited sentences
   - Sections (==): logically ordered; encyclopedic neutrality (shift tone to register)
   - Infobox: only for entity-like topics
   - Illustrations: OPEN-SOURCE only, with attribution + licence (omit if none)
   - See Also: link sibling knowledge pages / Ideas-wiki pages [[slug]]
   - References: MLA per Template_MLA_Reference.md — EVERY claim cited, nothing uncited
   - Categories: for the destination store's _index.yaml
   MARK every run with its provenance class (see THE FOUR PROVENANCE LAYERS above)
   MOVE each citation, gloss and caveat into <aside class="sidenote">  // contract rule 4
   FILL frontmatter: sources[], categories[], related[], register, formats, provenance

3b. SPARKBARS
   COUNT words per layer per section — including classed tables and <pre> diagrams
   WRITE the four .mix widths + title= on each h2
   COMPUTE the whole-page totals into frontmatter provenance_mix
   COMPUTE the article-body-only totals into frontmatter provenance_mix_body
     // apparatus sections excluded; this is what the generated-share cap tests

4. RENDER
   Markdown master ALWAYS — provenance spans pass through Markdown unchanged.
   HTML render links System/Templates/wiki-page.css.  NEVER inline the CSS.
                                                       NEVER add page-local rules.
   IF formats includes mediawiki THEN also emit MediaWiki markup (== H ==, [[links]], <ref></ref>)
     // MediaWiki cannot carry the ink. Degrade to plain quotes + attribution and
     // SAY SO in the report — do not pretend the provenance survived.
   STRIP the template's two agent comment blocks from the finished page.
   KEEP the .key block exactly as written; add nothing to it.

5. PLACE (draft)
   WRITE System/Sandbox/<slug>/<slug>.md  (+ <slug>.html, + <slug>.wiki if mediawiki)

6. CHECKPOINT → DELEGATE to !Checkpoint:
     keeper           ➔ matching Memory/Long-Term/<subject> store (+ add row to its _index.yaml)
     leaving system   ➔ Outbox/ via !OutgoingContentCheck (print / share)
// EXECUTION_END
```

## ✅ OUTPUT
A wiki-format knowledge page on the topic: chosen register, Markdown master + styled HTML
(+ MediaWiki on request), every run marked with its provenance layer, every factual claim
MLA-cited from approved non-Wikipedia sources, drafted in `System/Sandbox/` and routed to its
home by `!Checkpoint`. Reports the page path(s), the source list, and the page's provenance mix.

**Validation Check (Self-Test)**
```
VERIFY (every factual claim resolves to an MLA entry in References) == true ELSE flag uncited claims, do not ship

-- generated share (the volume gate) --
VERIFY (provenance_mix_body.generated <= 30) == true
  ELSE STOP and flag to Luke: "this page is <n>% Lukeatron — mostly invention wearing citations."
  // Measured over the ARTICLE BODY ONLY. Illustrations / See Also / References / Categories are
  // apparatus: their prose is generated BY DEFINITION (captions, link reasons, bibliography), so
  // counting them inflates the figure and hides the body's real mix.
  // Rationale: a page built from ONE source that is a third the agent's own voice has stopped
  // reporting that source and started expounding it. The cap does not test whether a claim is
  // TRUE — it catches the volume of unverified voice, which is where untrue claims collect.
VERIFY (no source domain ∈ wikipedia.* is load-bearing) == true ELSE replace with the primary source
VERIFY (all sources ∈ Preferences/ approved-domain list) == true ELSE drop / flag the source
VERIFY (page validates against Template_WikiPage.md structure) == true ELSE repair

-- provenance --
VERIFY (no unclassed prose remains) == true ELSE class it, defaulting to .p-gen
VERIFY (every .p-luke run traces to a named Luke store + date) == true ELSE demote to .p-gen
VERIFY (every .p-source run traces to a named human + work) == true ELSE demote to .p-gen
VERIFY (every blockquote has an attributed <footer>) == true ELSE repair
VERIFY (no .p-luke or .p-source run has been paraphrased or extended) == true ELSE split the run
VERIFY (.p-seam carries no citation and makes no claim) == true ELSE it is not seam — reclass
VERIFY (each h2 .mix sums to 100 and matches its section's word counts) == true ELSE recompute

-- design contract --
VERIFY (page adds no CSS of its own; wiki-page.css is linked, not inlined) == true ELSE strip
VERIFY (flourishes ⊆ {sparkbar, quote box, sidenote}) == true ELSE remove the extra
VERIFY (page reads correctly with body.plain applied) == true ELSE fix the underlying layout
VERIFY (agent comment blocks stripped; .key block present and unexpanded) == true ELSE repair
```

**Error Path**
```
CATCH evidence-too-thin ➔ STOP. Report the gap to Luke and name what's missing; never fabricate
                          or pad with speculation (Failure Handling: degrade gracefully, don't invent).
CATCH provenance-unclear ➔ Do NOT guess. Class the run .p-gen, and name the ambiguity in the report.
CATCH style-gap         ➔ A treatment wiki-page.css lacks is a SYSTEM gap. Ship without it and
                          raise it with Luke; never invent a page-local rule.
CATCH [*]               ➔ leave the draft in System/Sandbox/, report what failed and where it stopped.
```

## 🎨 House style — EXEMPT

`!HouseStyle` is the always-on default for rendered surfaces (`.claude/skills/!HouseStyle/`), and
this skill is one of its two standing **exemptions**. Wiki pages defer wholly to
`System/Templates/wiki-page.css`, whose four provenance inks encode *whose words these are* — a
semantic no other Lukeatron surface has and none should inherit. That contract is deliberately
different, which is what earns exemption; merely *having* a stylesheet does not.

`wiki-page.css` remains the sole authority for these pages. `!HouseStyle` is silent here, and its
token layer deliberately inherits that file's type-scale values so the two can never drift.
