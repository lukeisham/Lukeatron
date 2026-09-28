# markup.md — the hooks both guides must carry

Loaded at STEP 6 and STEP 7. `validate.py` reads the rendered guides through these hooks and
nothing else, so a guide that skips one cannot be checked, and a check that cannot run FAILS. The
hooks are structure only: they fix class names and attributes, never how anything looks. The look
belongs to `!HouseStyle` and GROUP D.

Both guides carry the same hooks, with three exceptions: `.gf-glyph` (Theatre only, D6),
`.gf-vcaa` (Technical only, D16), and the wording inside dressed elements.

## Page level

| Hook | Where | Criterion |
| :--- | :--- | :--- |
| `.gf-principle` | exactly once, before the first heading. Its text in Technical is the epigraph verbatim | A6 |
| `.gf-foundations` holding one `a[href="#<rule-id>"]` per broad rule, highest reach first | after `.gf-principle`, before the first heading | D14 |
| `.gf-index` holding `.gf-index-q[data-kind]` entries, each an `a[href="#<heading-slug>"]` with the question text | the last block in `main`; `data-kind` is `diagnostic`, `breadth` or `reach` | D8, A4 |

## Headings

```html
<section class="gf-heading gf-breadth-{leaf|narrow|wide}" id="{slug}"
         data-source-hash="{12 hex}" data-tags="Syntax;Clause"
         data-breadth="{E7 count}" data-breadth-tier="{leaf|narrow|wide}"
         data-breadth-label="Contains 6 — 4 kinds, 2 parts"   <!-- hidden agent label; omit on a leaf -->
         data-axis="{form-function|purpose|order|…|none}" data-axis-from="{slug}"
         data-axis-by="{notes|Luke}"
         data-flags="{plain text; omit when empty}">
  <h2><span class="gf-glyph">🎭</span> Heading text
      <span class="gf-chip">Syntax</span><span class="gf-chip">Clause</span></h2>
  <nav class="gf-contains"> <a data-kind="kind|part" href="#…">…</a> … </nav>   <!-- wide only -->
  …
</section>
```

- A nested heading is a `section.gf-heading` inside its parent's (A1 nesting).
- A main heading (no parent) carries `gf-hue-1` … `gf-hue-5` beside its `gf-breadth-*` class (D18); nested headings inherit the hue through CSS and carry no hue class.
- `data-source-hash` comes from `validate.py hashes`, never computed by hand (A13).
- `.gf-glyph` and `.gf-chip` are left out when heading text is compared (A1). The breadth count line is the hidden `data-breadth-label`, never heading text (D11, D17).
- **Axis (E1 Q0).** `data-axis-from` is the slug of the heading that chose the axis: the nearest
  ancestor that chose one, or the heading itself if none did. An inheriting heading copies the chooser's
  `data-axis` and `data-axis-by`. `none` means nothing was chosen, so a heading below it may choose.
- **Sections.** Only a heading whose `data-axis` is `form-function` may hold a `.gf-section` or the
  `h4.gf-subhead` "Form & Function". When E1 splits a heading, each half is `section.gf-section` with
  `id="{slug}-form"` or `"{slug}-function"`. When E1 omits the split, there is no `.gf-section`
  and the heading itself is the section.
- **Sub-subsections** are `section.gf-subsection` with `id="{parent id}-{kebab name}"` (A2).
  Their titles are `h5` (`h6` one level down, for a sub-subsection inside a sub-subsection); the draft names each in `subsections: [{id, title}]`. A heading with **two or more** sub-subsections carries, under its own title and after its `Governed by:` stub line(s) (LOCKED — Luke, 2026-09-26; changed only with his accept), `ul.gf-outline[data-label="Sub-subsection list"]` linking each one (nested `ul.gf-outline` for the next level). Luke's redo of To be verb, 2026-09-26.

## Inside a section

| Hook | Holds | Criterion |
| :--- | :--- | :--- |
| `.gf-rule#<rule-id>` with `class="gf-reach-{local\|spanning\|broad}"`, `data-reach="{count} {unit-id} {unit-id}…"`, `data-reach-tier`, optional `data-home-ruled` | one rule: definition, `*` call-out, and (spanning/broad) `.gf-reach-label`, `table.gf-interactions`, `.gf-strip` | D12, A14 |
| `.gf-niche` | an Exception / Narrow case; always a CHILD of the `.gf-rule` it qualifies | D13 |
| `.gf-note` | a NOTE: the visible `NOTE —` label (the one label both Luke and the agent read; no `data-label`), then Luke's verbatim words, one source line per line (`<br>` between lines). Anything inside it never counts toward C16 | C16, C37, D17 |
| `.gf-diagnostics` | the `>` block (`data-label="Diagnostic questions"`; each `.gf-q` carries `data-label="Diagnostic question"`), placed after the section's last `.gf-rule` (D3). Each `.gf-q[data-tests="Tag;Tag"]` holds `.gf-q-text` (the question) and `.gf-q-applied` (the 5B positive span shown applied) | D3, A4, C16 |
| `.gf-reach-qs` | the Reach question block (`data-label="Reach questions"`; each `.gf-q` `Reach question`), with the same `.gf-q` > `.gf-q-text` inside. There is no Breadth block | C34, D3, A4 |
| `.gf-example`, `.gf-quote` | specimens: example text and quotations, wherever they stand (prose, tables, questions). Exempt from the vocabulary checks (C25, C26) | D1, D4 |
| `.gf-examples` > `.gf-exbox` > (specimen, `.gf-attr`?, `.gf-tagged`) | one box per example: the example, then its worked version in the same box. Inside a sub-subsection the boxes follow its `.gf-diagnostics` (D4); the draft names them in `section_examples`. Inside `.gf-tagged` the specimen words are `i.gf-example` and each `[bracket]` / `{brace}` note is `span.gf-ann` | D1, D4 |
| `.gf-box` (nested for nesting), `.gf-box-label` for a corner label | box diagrams. Only labels may differ between the guides | A7 |
| `a.gf-xref[href="#<slug>"]` | an E5 cross-reference | D10 |

**Reach marks.**

```html
<table class="gf-interactions" data-rule="{rule-id}">
  <tr data-unit="{unit-id}"><td><a href="#{unit-id}">…</a></td><td class="gf-does">…</td><td>…</td></tr>
</table>
<div class="gf-strip" data-rule="{rule-id}">
  <a class="gf-strip-mark gf-on" href="#{heading-slug}"></a>   <!-- one per heading, in order -->
</div>
<!-- inside the reached unit: -->
<p class="gf-stub" data-rule="{rule-id} {rule-id}…">Governed by: <a href="#{home-heading-slug}">…</a></p>
```

A stub is one plain line, like the Contains line: `Governed by:` and a link to the governing heading.
`data-rule` lists every rule of that heading that reaches the unit. The words for what each rule does
there live in the interaction table only (D15). A stub sits inside the element whose id is the unit.

## Terms (D2, D16)

```html
<!-- after the last heading, before nav.gf-index: -->
<section class="gf-glossary" id="glossary">
  <h2>Glossary</h2>
  <p class="gf-termrow"><b class="gf-term" id="term-{kebab}" data-term="{kebab}">noun phrase</b>
    <span class="gf-gloss">a group of words built around a noun</span>
    <span class="gf-vcaa-label">(VCAA: <a class="gf-vcaa" href="{landing page}">noun group</a>)</span></p>  <!-- Technical only -->
  …one p.gf-termrow per term, alphabetical by term…
</section>
<!-- in the prose: -->
<a class="gf-term-ref" data-term="{kebab}" href="#term-{kebab}">noun phrase</a>
```

One `section.gf-glossary#glossary` per file, outside every heading. One `b.gf-term` per term per
file, inside it, in alphabetical order; the gloss follows it directly. Every `gf-term-ref` points to
a `term-{kebab}` in it (first use per prose paragraph only), and none sits in a heading, chip, diagnostic, specimen or the index. The
landing page is the one in `reference/sources.md`.

## Script coverage

`validate.py check` rules on these, in whole or in the part named. It is the STEP 8 ruling for them.
Every other criterion is a judgement and stays with the models.

| Criterion | Part checked by script |
| :--- | :--- |
| A1, A2, A3, A4, A6, A7, A8, A13, A14 | whole |
| E1 | the axis hooks: `data-axis-from` is the heading or its nearest choosing ancestor, the values match it, and no Form/Function section or sub-heading appears outside a form-function axis. Whether the notes really set that axis is judgement |
| B3, B9 | row counts (with `--rows-before` / `--expect`) |
| C16 | whole (tags through `data-tests`) |
| C25, C26 | whole (specimens exempt) |
| C28 | whole (with `--paste`) |
| C37 | whole (every NOTE line found in `Original_Content.md`) |
| D17 | whole (every hook carries its hidden `data-label`; no visible block label; every NOTE keeps its visible `NOTE —`) |
| D2, D6, D7, D8, D10, D11, D13, D14, D15 | whole |
| D3 | no Breadth question block or Breadth index entry |
| D12 | tier class, label, rows equal the reached set, strip mark count |
| D16 | placement and address (the term itself is C17) |
