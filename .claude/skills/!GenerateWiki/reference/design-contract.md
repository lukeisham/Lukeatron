# !GenerateWiki — design contract, audiences and house-style exemption (read at SYNTHESISE and RENDER)

> Reference file for `!GenerateWiki`. Moved verbatim out of the skill file on 2026-10-09 (progressive disclosure). The skill file says WHEN to read it. Nothing here overrides a rule in the skill file.

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

---

## 🗣️ INSTRUCTIONS — TWO AUDIENCES, TWO PLACES
```
FOR THE AGENT  ➔ stays in the source as an HTML comment block, never rendered.
                 Rules, edge cases, repair paths, the full contract above.
FOR LUKE       ➔ the .key block only: four phrases and a Hide-ink button.
                 Reproduce it verbatim from the template. Do NOT expand it, do NOT
                 add a legend, a caption, or an explanatory paragraph. The ink
                 explains itself; the key is the whole of the visible instruction.

---

## 🎨 House style — EXEMPT

`!HouseStyle` is the always-on default for rendered surfaces (`.claude/skills/!HouseStyle/`), and
this skill is one of its two standing **exemptions**. Wiki pages defer wholly to
`System/Templates/wiki-page.css`, whose four provenance inks encode *whose words these are* — a
semantic no other Lukeatron surface has and none should inherit. That contract is deliberately
different, which is what earns exemption; merely *having* a stylesheet does not.

`wiki-page.css` remains the sole authority for these pages. `!HouseStyle` is silent here, and its
token layer deliberately inherits that file's type-scale values so the two can never drift.
