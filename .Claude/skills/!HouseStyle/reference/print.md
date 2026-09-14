# Print — the documented degradation

Electronic-primary, print-aware. The screen design **is** the design; print is a degradation of
it with stated rules, never a second design maintained in parallel. Two designs drift; one design
plus a degradation cannot.

## Why the ground contract makes this cheap

`:root` is light, so **print inherits the base path**. No inversion, no ink swap, no undo. A dark
surface prints by declaring `[data-theme="light"]` inside `@media print` — one line.

## What must survive paper

| Survives | Because |
|---|---|
| Hierarchy | Carried by size, weight and space, none of which need a screen |
| The rule system | `--print-rule` at 1px; hairlines below 0.5pt vanish on a laser printer |
| Measure | `--print-measure: 32rem` — narrower than screen; paper has no scrollbar to excuse a long line |
| Every glyph | Vector, so they print sharper than on screen. Keep them |
| Tables, in full | Never truncate for print. Reflow or rotate instead |

## What degrades, and to what

| Screen | Paper |
|---|---|
| `--shade-raised` / `--shade-float` | `--print-shade` flat fill, or a 1px rule. **Shadow never prints** — it renders as grey mud on most printers |
| `--acc` accent colour | Retained if colour, but **must not be the only channel** — pair with weight or a rule, since the page may be photocopied in mono |
| `--acc-wash` backgrounds | Dropped entirely. Large light fills waste toner and print as banding |
| Hover, focus, transitions | Dropped. Nothing on paper has state |
| Anything animated | Dropped, and the resting state must be the meaningful one |
| Interactive affordance (buttons, fields) | Rendered as a labelled rule or box; never as a live-looking control on a dead page |

## The @page rules

```css
@page {
  size: A4;                /* --print-page. Letter is the documented alternative */
  margin: 18mm;            /* --print-margin */
}
@media print {
  :root { color-scheme: light; }      /* a dark surface: add [data-theme="light"] here */
  body  { background: #fff; color: var(--print-ink); }

  /* Never break these apart */
  h1, h2, h3          { break-after: avoid; }
  figure, table, .card { break-inside: avoid; }
  tr, li               { break-inside: avoid; }

  /* Orphans and widows — Butterick's floor */
  p { orphans: 3; widows: 3; }

  /* Kill what cannot mean anything on paper */
  nav, .no-print, button:not(.print-as-label) { display: none; }
  * { box-shadow: none !important; text-shadow: none !important; }

  /* A link the reader cannot click should say where it went */
  a[href^="http"]::after { content: " (" attr(href) ")"; font-size: var(--t-micro); }
}
```

## Both page sizes, always

A4 (210×297mm) and Letter (216×279mm) differ by 6mm wider and 18mm shorter. **Letter is the
short one** — a layout that fits A4's height can overflow Letter by a line. Test both; the
18mm margin absorbs the width difference, nothing absorbs the height.

## The hard case — CurriculumPreparation

`System/Widgets/CurriculumPreparation/` is the strictest print surface in the system: a **pure-SVG
print plane** with HTML editing surfaces beside it, deliberately chosen so geometry and print
fidelity are exact (`Memory/Long-Term/Coding/curriculum-preparation-design-notes.md`, §1).

`!HouseStyle` is **SUBORDINATE** here in a specific way:

- The SVG plane owns geometry, coordinates, page breaks and layout. Do not touch it.
- The house style governs the **HTML edit surface** beside it, and supplies the SVG plane's *ink
  and type values only* — so the two modes look like one product.
- SVG text does not inherit CSS custom properties through `<use>` in every renderer. Resolve token
  values at build time for the SVG plane rather than relying on `var()` at render time.
- Never introduce a shadow, transition or wash into the SVG plane. It is a print surface that
  happens to be shown on screen, not a screen surface that happens to print.
