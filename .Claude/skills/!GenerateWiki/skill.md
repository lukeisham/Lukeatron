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
  - "System/Templates/Template_MLA_Reference.md"
  - "Memory/Long-Term/Preferences/  (approved-domain list for source validation)"
  - ".claude/skills/!HeadlessChromeBrowser  (live web sourcing)"
  - ".claude/skills/!Checkpoint · !OutgoingContentCheck"
  - "Memory/Long-Term/LukeatronWiki/  (optional source cluster, via !IdeaWiki)"
version: 1.0.0
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
  formats  = [markdown(default)] (+ mediawiki on request)
  sourcing = web-augmented(default) | knowledge-base-only

## 🧭 WHAT THIS IS
A generator, not a portal. It SYNTHESISES — it owns the page's structure, neutrality, and
citations. It DELEGATES web fetching to `!HeadlessChromeBrowser` and citation format to
`Template_MLA_Reference.md`. Distinct from `!IdeaWiki`: that TENDS Luke's private idea-graph
(read+write, interconnected, for thinking); this PRODUCES a standalone public-style article
(one-shot output). They compose — !GenerateWiki may read an Ideas-wiki cluster as a source.

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

3. SYNTHESISE into System/Templates/Template_WikiPage.md, shaped by `register`:
   - Lead: neutral, term in **bold**, what it is in 1–3 cited sentences
   - Sections (==): logically ordered; encyclopedic neutrality (shift tone to register)
   - Infobox: only for entity-like topics
   - Illustrations: OPEN-SOURCE only, with attribution + licence (omit if none)
   - See Also: link sibling knowledge pages / Ideas-wiki pages [[slug]]
   - References: MLA per Template_MLA_Reference.md — EVERY claim cited, nothing uncited
   - Categories: for the destination store's _index.yaml
   FILL frontmatter: sources[], categories[], related[], register, formats

4. RENDER
   Markdown master ALWAYS.
   IF formats includes mediawiki THEN also emit MediaWiki markup (== H ==, [[links]], <ref></ref>)

5. PLACE (draft)
   WRITE System/Sandbox/<slug>/<slug>.md  (+ <slug>.wiki if mediawiki)

6. CHECKPOINT → DELEGATE to !Checkpoint:
     keeper           ➔ matching Memory/Long-Term/<subject> store (+ add row to its _index.yaml)
     leaving system   ➔ Outbox/ via !OutgoingContentCheck (print / share)
// EXECUTION_END
```

## ✅ OUTPUT
A wiki-format knowledge page on the topic: chosen register, Markdown (+ MediaWiki on request),
every factual claim MLA-cited from approved non-Wikipedia sources, drafted in `System/Sandbox/`
and routed to its home by `!Checkpoint`. Reports the page path(s) + the source list.

**Validation Check (Self-Test)**
```
VERIFY (every factual claim resolves to an MLA entry in References) == true ELSE flag uncited claims, do not ship
VERIFY (no source domain ∈ wikipedia.* is load-bearing) == true ELSE replace with the primary source
VERIFY (all sources ∈ Preferences/ approved-domain list) == true ELSE drop / flag the source
VERIFY (page validates against Template_WikiPage.md structure) == true ELSE repair
```

**Error Path**
```
CATCH evidence-too-thin ➔ STOP. Report the gap to Luke and name what's missing; never fabricate
                          or pad with speculation (Failure Handling: degrade gracefully, don't invent).
CATCH [*]               ➔ leave the draft in System/Sandbox/, report what failed and where it stopped.
```
