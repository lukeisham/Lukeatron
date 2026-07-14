<!--
WIKI / KNOWLEDGE PAGE TEMPLATE — source of truth for !GenerateWiki output
================================================================================
WHAT THIS IS
  • The shape of a knowledge page produced by !GenerateWiki: a Wikipedia-STYLE
    article on a topic — neutral, structured, encyclopedic — synthesised from
    Luke's knowledge base (+ validated web sources).
  • "Wiki-STYLE" is a FORMAT, not a source. Wikipedia is NOT a load-bearing
    source (Personal Research guardrail). Cite primary / peer-reviewed sources,
    MLA-formatted (System/Templates/Template_MLA_Reference.md). Nothing uncited.

REGISTER (set in frontmatter `register`)
  • encyclopedic (default) — neutral third-person, the Wikipedia register
  • academic   — formal, argument-aware, heavier citation
  • popular    — accessible, plain-language, still cited
  • news       — inverted-pyramid, recency-led, still cited
  The four Archive/Results/thejesuswebsite_* variants are this field in action.

OUTPUT FORMATS
  • This template is the MARKDOWN master. On request (`formats: [..., mediawiki]`)
    !GenerateWiki also emits a MediaWiki-markup version (== Heading ==, [[links]],
    <ref></ref>) — the "wiki format" the Personal Research charter asks for
    alongside Markdown.

WHERE IT GOES
  • Draft → System/Sandbox/<slug>/ (one file per format).
  • Keeper → matching Memory/Long-Term/<subject> store (via !Checkpoint).
  • Leaving the system (print/share) → Outbox/ (via !OutgoingContentCheck).

  Delete this comment block from the finished page.
================================================================================
-->
---
slug: "<topic-slug>"                 # kebab-case; filename + link target
title: "<Page Title>"
description: "<one-sentence OKF summary of the page's topic>"
type: knowledge-page
register: encyclopedic               # encyclopedic | academic | popular | news
status: Draft                        # Draft → Final
created: <YYYY-MM-DD>
updated: <YYYY-MM-DD>
sources: []                          # the works cited (MLA), mirrored in References
categories: []                       # topic categories / tags
related: []                          # slugs of sibling knowledge / Ideas-wiki pages
formats: [markdown]                  # markdown | mediawiki
version: "1.0.0"
---

# <Title>

**<Term>** is <neutral one-to-three-sentence definition — what the topic is, the
 lead a reader sees first. Every factual claim carries an MLA inline citation
 (Author Page) per Template_MLA_Reference.md>.

<!-- Infobox — include only for entity-like topics (person, place, work, org). Omit otherwise.
| | |
|---|---|
| **<field>** | <value> |
-->

## <First Section>
<Body. Logically ordered sections. Encyclopedic neutrality by default; shift tone
 to match `register`. Inline-cite everything (Author Page). Link sibling pages
 with [[slug]].>

## <Further Sections>
<...>

## Illustrations
<!-- OPEN-SOURCE images only, with attribution + licence. Omit the section if none. -->
- <image / caption — source, licence>

## See Also
- [[<related-slug>]] — <one line on the connection>

## References
<!-- MLA, per System/Templates/Template_MLA_Reference.md. Every source in `sources`
     appears here; every inline citation resolves to an entry here. Nothing uncited.
     NO Wikipedia as a load-bearing source. -->
1. <Author Last, First. "Title." Publication, Year. URL.>

## Categories
<!-- For navigation / the destination store's _index.yaml. -->
- <Category>
