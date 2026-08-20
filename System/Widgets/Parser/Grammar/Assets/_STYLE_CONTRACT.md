# A4 Grammar Sheet — Shared Style Contract

Three sheets are being built in parallel by three agents. They must look like one set.
Obey this contract exactly. Do not invent variants.

## Canvas
```
<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 210 297">
<style>text { font-family: Inter, "Helvetica Neue", Arial, sans-serif; }</style>
<rect x="0" y="0" width="210" height="297" fill="#FFFFFF"/>
```
All units are millimetres. Page margins: 12mm left/right (content spans x=12 to x=198,
i.e. 186mm wide). Top margin 12mm. Bottom margin 12mm — nothing below y=285.
Footer sits at y=289.

## Palette — no other colours
| Token | Hex | Use |
|---|---|---|
| navy | `#1B4B82` | masthead tab, block-heading text, level-1 element tabs |
| midblue | `#5FA8D3` | masthead title bar |
| teal | `#1E9AA8` | section tabs, level-2 element tabs, accent rules |
| tint | `#EAF4FA` | pale wash behind blocks |
| tint2 | `#D9EAF5` | contrasting "payload" column inside tables |
| ink | `#1A1A1A` | body text |
| grey | `#8A8F94` | hairlines, captions, italic glosses |
| white | `#FFFFFF` | page, inset boxes |

Hairlines: `stroke="#8A8F94" stroke-width="0.2"` (boxes) or `0.25` (connectors).

## Masthead — identical on all three sheets except the words
```
<rect x="12" y="12" width="17" height="17" fill="#1B4B82"/>
<text x="20.5" y="23.9" font-size="10.5" font-weight="700" text-anchor="middle" fill="#FFFFFF">N</text>
<rect x="29" y="12" width="169" height="17" fill="#5FA8D3"/>
<text x="34" y="19.2" font-size="6.2" font-weight="700" fill="#FFFFFF">ENGLISH GRAMMAR</text>
<text x="34" y="25.6" font-size="3.1" fill="#FFFFFF">SUBTITLE HERE</text>
<text x="195" y="25.6" font-size="3.0" font-weight="700" text-anchor="end" fill="#FFFFFF">SHEET n OF 3 · §refs</text>
```
Per sheet: tab glyph = `1`, `2`, `3`. Subtitle and §refs per the sheet's own brief.
Body content starts at y=33.

## Section blocks
A block = a tint rect, a teal square tab with a white numeral, a bold navy heading,
optional grey italic caption right-aligned.
```
<rect x="12" y="Y" width="186" height="H" fill="#EAF4FA"/>
<rect x="14" y="Y+2" width="5" height="5" fill="#1E9AA8"/>
<text x="16.5" y="Y+5.585" font-size="3.1" font-weight="700" text-anchor="middle" fill="#FFFFFF">1</text>
<text x="21" y="Y+5.6" font-size="3.3" font-weight="700" fill="#1B4B82">BLOCK HEADING</text>
<text x="195" y="Y+5.6" font-size="2.1" font-style="italic" text-anchor="end" fill="#8A8F94">caption</text>
```
Number the tabs `1,2,3,4…` down each sheet, restarting at 1 on every sheet.
Leave 3mm of vertical air between blocks. Leave 2mm padding inside a block's edges.

## Type scale
| Role | size | weight |
|---|---|---|
| masthead title | 6.2 | 700 |
| masthead subtitle | 3.1 | 400 |
| block heading | 3.3 | 700 |
| sub-heading inside block | 2.4 | 700 |
| body / list entry | 2.2 | 400 |
| example sentence | 2.5 | 400 |
| table cell | 2.1 | 400 |
| italic gloss / caption | 1.9 | italic, fill grey |
| smallest permitted | 1.8 | — never go below this |

## The bold convention — the most important rule
**Bold is reserved exclusively for the target grammatical item inside an example
sentence.** Never bold for general emphasis inside running text. A reader scanning only
the bold fragments down the page must be able to read the grammar.
```
<text x="X" y="Y" font-size="2.5">She <tspan font-weight="700">has been</tspan> waiting.</text>
```

## Examples
Hollow-circle bullet `○` at the left, text hanging-indented so wrapped lines align under
the first word, not under the bullet.
```
<text x="16" y="Y" font-size="2.2" fill="#8A8F94">○</text>
<text x="19" y="Y" font-size="2.2" fill="#1A1A1A">example text here</text>
```

## Tables
A white inset box on the tint, thin grey rules, header row in bold navy, and the
"payload" column filled `#D9EAF5` so it reads as separate.

## Cross-references
Every entry carries its section number from `Grammar_contents.md`, set in grey at
`font-size="1.9"`, e.g. `(3.1)` or `§4.3`. This is what indexes the sheet back into the
catalogue — do not omit it.

## Footer — identical on all three
```
<line x1="12" y1="285" x2="198" y2="285" stroke="#8A8F94" stroke-width="0.2"/>
<text x="12" y="289" font-size="1.9" font-style="italic" fill="#8A8F94">Source: Grammar_contents.md (Lukeatron Grammar parser aide). Section numbers (§) refer to that catalogue.</text>
<text x="198" y="289" font-size="1.9" font-style="italic" text-anchor="end" fill="#8A8F94">Sheet n of 3</text>
```

## Hard technical constraints
- Self-contained: no external fonts, images, scripts or CSS links.
- No `<foreignObject>` — it breaks PDF conversion. Use `<text>`/`<tspan>` only.
- SVG does **not** wrap text. Break every line manually and check the arithmetic.
  Budget ≈0.45mm per character at font-size 2.2, ≈0.51mm at 2.5.
- Nothing may overflow its block or the page. Nothing below y=285 except the footer.
- Print-safe: black on white/tint, never colour alone to carry meaning.

## Forbidden
Cartoons, speech bubbles, photographs, exercise numbering, blank practice space,
drop caps, decorative type, gradients, drop shadows, rounded corners.
