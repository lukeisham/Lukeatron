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

OUTPUT FORMATS
  • This template is the MARKDOWN master. Provenance is carried in the master as
    inline <span class="..."> / <blockquote class="..."> — Markdown passes HTML
    through, so the master is both readable as text and renderable as-is.
  • The rendered page is HTML linking System/Templates/wiki-page.css. A page
    NEVER inlines its own CSS and NEVER adds rules of its own.
  • On request (`formats: [..., mediawiki]`) also emit MediaWiki markup.

WHERE IT GOES
  • Draft → System/Sandbox/<slug>/ (one file per format).
  • Keeper → matching Memory/Long-Term/<subject> store (via !Checkpoint).
  • Leaving the system (print/share) → Outbox/ (via !OutgoingContentCheck).

  Delete this comment block from the finished page.
================================================================================
-->

<!--
════════════════════════════════════════════════════════════════════════════════
PROVENANCE CONTRACT — AGENT INSTRUCTIONS. Never rendered, never shown to Luke.
════════════════════════════════════════════════════════════════════════════════

PROVENANCE MARKUP IS MANDATORY. Every run of text on the page carries exactly
one of four classes. Unclassed prose is a defect; repair before shipping.

  .p-luke    VERBATIM · LUKE
             Luke's own words, word-for-word: notes, decisions, positions,
             sermon fragments — anything in his stores authored by him.
             Marker: ochre FILL (inline wash / left rule on a blockquote).

  .p-source  VERBATIM · ANOTHER HUMAN
             Anyone else's words, word-for-word: Scripture, cited authors,
             correspondence, transcripts, bibliographic strings.
             Marker: mulberry BOX (inline underline / bordered quote box).
             A quoted PASSAGE goes in <blockquote class="p-source"> — the box
             is the signal that the voice is neither Luke's nor yours.

  .p-gen     GENERATED
             Anything you wrote: summaries, synthesis, connective prose,
             captions, glosses. The default class for body text.
             A standalone synthesis block uses <div class="gen-block"> with a
             <span class="gen-tag"> naming what it is.

  .p-seam    SEAM
             Structure you supplied to hold the page together: headings, link
             labels, See Also, section and category names. Seam is never a
             claim, so seam is never cited.

THE TWO VERBATIM LAYERS SHARE AN INK, NOT A MARKER.
  Both are near-black — untouched text reads at full weight, always. They
  separate by marker only:  Luke = FILL.  Source = BOX.
  Fill means "his". Box means "someone else's". Never swap them; never give a
  Luke passage a box; never give a source passage a fill.

HARD RULES
  • NEVER paraphrase inside .p-luke or .p-source.
  • NEVER extend a verbatim run with your own words — close the span, open a
    .p-gen one.
  • An ellipsis or bracketed insertion inside a quotation is YOUR text: mark
    the insertion .p-gen.
  • Every blockquote carries a <footer> naming speaker and source. A .p-source
    quote without an attributed footer is a defect.
  • CITATION: .p-luke, .p-source and .p-gen all carry MLA inline citations
    (a .p-luke run cites its store and note date). .p-seam never does.
  • If provenance is genuinely uncertain, the text is .p-gen. Never guess a
    passage into a verbatim layer — a wrong .p-luke is the worst failure
    this page can produce.

SPARKBAR
  Each h2 carries a .mix bar whose FOUR segment widths are that section's real
  proportions of luke / source / gen / seam by word count, rounded to 5%, with
  a title= giving the numbers. Recompute on every edit. It is data, not
  decoration — never fake it, never omit it.

DESIGN CONTRACT (the modified Tufte principles — full statement in the skill)
  1. Every visual difference encodes a real one.
  2. Minimum effective difference — one channel per distinction, never two.
  3. Untouched text reads at full weight.
  4. Evidence sits beside the claim — margin, not foot.
  5. Flourishes focus, never fill.
  6. The page must read with the ink off (test `body.plain`).

  Add no colour, weight, rule, box or shadow beyond wiki-page.css. If a page
  needs a treatment the stylesheet lacks, the SYSTEM is missing it — raise it
  with Luke, don't patch it locally.

  Delete this comment block from the finished page.
════════════════════════════════════════════════════════════════════════════════
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
formats: [markdown, html]            # markdown | html | mediawiki
provenance: true                     # four-layer ink on. false only if Luke asks.
provenance_mix:                      # whole-page word-count proportions, %
  luke: 0
  source: 0
  generated: 0
  seam: 0
version: "1.0.0"
---

# <Title>

<p class="standfirst"><!-- one line, generated: what the page is about --></p>

<!-- USER-FACING INSTRUCTION — the ONLY instruction Luke sees. Four phrases and
     a button. Everything else about the ink is inferred from the ink itself.
     Reproduce verbatim; do not expand it, do not explain it further. -->
<div class="key">
  <span class="key-lead">How to read the ink</span>
  <span class="key-item"><span class="key-swatch kl"></span><span><b>Tinted</b> — your words, exactly</span></span>
  <span class="key-item"><span class="key-swatch ks"></span><span><b>Boxed</b> — someone else's words, exactly</span></span>
  <span class="key-item"><span class="key-swatch kg"></span><span><b>Grey</b> — written by Lukeatron</span></span>
  <span class="key-item"><span class="key-swatch ke"></span><span><b>Green</b> — headings and links</span></span>
  <button class="key-toggle" id="toggle" aria-pressed="false">Hide ink</button>
</div>

<span class="p-source">**<Term>**</span> <span class="p-gen">is <neutral one-to-three-sentence
definition — what the topic is, the lead a reader sees first. Every factual claim carries an
MLA inline citation (Author Page) per Template_MLA_Reference.md.></span>

<!-- Infobox — include only for entity-like topics (person, place, work, org). Omit otherwise.
| | |
|---|---|
| **<field>** | <value> |
-->

## <First Section> <span class="mix" title="Luke <n>%, sources <n>%, Lukeatron <n>%, seam <n>%"><i class="m-luke" style="width:<n>%"></i><i class="m-source" style="width:<n>%"></i><i class="m-gen" style="width:<n>%"></i><i class="m-seam" style="width:<n>%"></i></span>

<span class="p-gen"><Body. Logically ordered sections. Encyclopedic neutrality by default;
shift tone to match `register`. Inline-cite everything. Link siblings with [[slug]].></span>

<aside class="sidenote"><!-- Evidence beside the claim: the gloss, caveat or citation note
that would otherwise be a footnote. Generated; no class needed — the sidenote is its own ink. --></aside>

<!-- A quoted passage from another human — the BOX -->
<blockquote class="p-source">
  <p><exact words, unaltered></p>
  <footer><Speaker · Work, page · quoted verbatim></footer>
</blockquote>

<!-- A passage in Luke's own words — the FILL -->
<blockquote class="p-luke">
  <p><exact words, unaltered></p>
  <footer>Luke · <Store> store · note of <YYYY-MM-DD></footer>
</blockquote>

<!-- A standalone synthesis, plainly labelled as yours -->
<div class="gen-block">
  <span class="gen-tag">Lukeatron summary</span>
  <p><the synthesis></p>
</div>

## <Further Sections> <span class="mix" title="..."><i class="m-luke" style="width:0%"></i><i class="m-source" style="width:0%"></i><i class="m-gen" style="width:0%"></i><i class="m-seam" style="width:0%"></i></span>

<...>

## Illustrations
<!-- OPEN-SOURCE images only, with attribution + licence. Omit the section if none. -->
- <image / caption — source, licence>

## See Also
<ul class="seealso">
  <li><a href="<related-slug>">[[<related-slug>]]</a><span class="why"><one line on the connection></span></li>
</ul>

## References
<!-- MLA, per System/Templates/Template_MLA_Reference.md. Every source in `sources`
     appears here; every inline citation resolves to an entry here. Nothing uncited.
     NO Wikipedia as a load-bearing source.
     Each entry is another human's words transcribed → .p-source (inline, not boxed;
     the box is for quoted PROSE, not for bibliographic strings). -->
<ol class="refs">
  <li><span class="p-source"><Author Last, First. "Title." Publication, Year. URL.></span></li>
</ol>

## Categories
<!-- For navigation / the destination store's _index.yaml. Seam — never cited. -->
- <span class="p-seam"><Category></span>

<script>
  // The ink toggle. Nothing else on the page is interactive.
  const btn = document.getElementById('toggle');
  btn.addEventListener('click', () => {
    const on = document.body.classList.toggle('plain');
    btn.textContent = on ? 'Show ink' : 'Hide ink';
    btn.setAttribute('aria-pressed', String(on));
  });
</script>
