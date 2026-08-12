# ACER Vocational/Selection Aptitude Tests — Abstract Reasoning — AU

**Reference test:** ACER Vocational Selection Test / ACER General Ability Test — Abstract Reasoning components (Australia)
**Format:** Multiple item types: (1) Complete the series — a sequence of abstract figures where the candidate selects the next; (2) Complete the pattern — 3×3 or 4×4 matrix missing one cell; (3) Odd one out — identify which figure does not belong; (4) Analogies — "A is to B as C is to ?"
**Answer style:** Single correct answer (A–E). Binary scoring.
**Distinctive feature:** Compared to Raven's, ACER abstract reasoning often includes more varied item types and may incorporate spatial rotation and reflection more prominently.

**SVG rules:** All visual artefacts follow `Memory/Long-Term/Coding/vibe-coding-rules.md` SVG-1 through SVG-5.

---

## ACER Abstract Sample — Figure Series: Rotation + Pattern Fill (Medium Difficulty)

### SVG Stimulus

![ACER-style figure series: 4 items shown, 5th item to be determined. Each figure is a hexagon with a pattern fill that rotates and changes pattern density.](acer-figure-series.svg)

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 660 140">
  <!-- Figure 1: Hexagon, stripes horizontal, light -->
  <g transform="translate(60, 70)">
    <polygon points="0,-40 35,-20 35,20 0,40 -35,20 -35,-20" fill="none" stroke="#1a1a1a" stroke-width="2" />
    <line x1="-30" y1="-15" x2="30" y2="-15" stroke="#ccc" stroke-width="1.5" />
    <line x1="-30" y1="0" x2="30" y2="0" stroke="#ccc" stroke-width="1.5" />
    <line x1="-30" y1="15" x2="30" y2="15" stroke="#ccc" stroke-width="1.5" />
  </g>

  <!-- Figure 2: Hexagon, stripes diagonal /, medium -->
  <g transform="translate(190, 70)">
    <polygon points="0,-40 35,-20 35,20 0,40 -35,20 -35,-20" fill="none" stroke="#1a1a1a" stroke-width="2" />
    <line x1="-20" y1="-20" x2="20" y2="20" stroke="#999" stroke-width="1.5" />
    <line x1="-10" y1="-20" x2="30" y2="20" stroke="#999" stroke-width="1.5" />
    <line x1="-30" y1="-20" x2="10" y2="20" stroke="#999" stroke-width="1.5" />
  </g>

  <!-- Figure 3: Hexagon, stripes vertical, dark -->
  <g transform="translate(320, 70)">
    <polygon points="0,-40 35,-20 35,20 0,40 -35,20 -35,-20" fill="none" stroke="#1a1a1a" stroke-width="2" />
    <line x1="-15" y1="-30" x2="-15" y2="30" stroke="#666" stroke-width="2" />
    <line x1="0" y1="-30" x2="0" y2="30" stroke="#666" stroke-width="2" />
    <line x1="15" y1="-30" x2="15" y2="30" stroke="#666" stroke-width="2" />
  </g>

  <!-- Figure 4: Hexagon, stripes diagonal \, darkest -->
  <g transform="translate(450, 70)">
    <polygon points="0,-40 35,-20 35,20 0,40 -35,20 -35,-20" fill="none" stroke="#1a1a1a" stroke-width="2" />
    <line x1="-20" y1="20" x2="20" y2="-20" stroke="#333" stroke-width="2.5" />
    <line x1="-30" y1="20" x2="10" y2="-20" stroke="#333" stroke-width="2.5" />
    <line x1="-10" y1="20" x2="30" y2="-20" stroke="#333" stroke-width="2.5" />
  </g>

  <!-- Figure 5: missing -->
  <rect x="560" y="30" width="80" height="80" fill="none" stroke="#bbb" stroke-width="1.5" stroke-dasharray="5,5" rx="4" />
  <text x="600" y="75" font-family="sans-serif" font-size="18" fill="#888" text-anchor="middle">?</text>

  <!-- Labels -->
  <text x="60" y="130" font-family="sans-serif" font-size="11" fill="#666" text-anchor="middle">1</text>
  <text x="190" y="130" font-family="sans-serif" font-size="11" fill="#666" text-anchor="middle">2</text>
  <text x="320" y="130" font-family="sans-serif" font-size="11" fill="#666" text-anchor="middle">3</text>
  <text x="450" y="130" font-family="sans-serif" font-size="11" fill="#666" text-anchor="middle">4</text>
  <text x="600" y="130" font-family="sans-serif" font-size="11" fill="#888" text-anchor="middle">?</text>
</svg>
```

### Question

What should come next in the series?

### Options

- **A:** Hexagon with horizontal stripes, very dark (stroke-width: 3)
- **B:** Hexagon with vertical stripes, light (thin, grey lines)
- **C:** Hexagon with diagonal stripes (top-left to bottom-right), light
- **D:** Hexagon with no stripes (empty)
- **E:** Hexagon with diagonal stripes (top-right to bottom-left), very dark — but the rotation cycle has already visited this orientation

### Correct Answer

**A**

### Rule Spec

| Attribute | Pattern | Cycle |
|-----------|---------|-------|
| **Stripe orientation** | Rotates clockwise: horizontal → diagonal / → vertical → diagonal \ → **horizontal** | 4-step cycle |
| **Stripe weight/darkness** | Increases each step: light → medium → dark → darkest → **light** | 4-step cycle |
| **Shape** | Hexagon constant throughout | — |
| **Outline** | Constant thin black stroke | — |

### Clue

Two attributes are changing simultaneously but on different cycles. The stripe orientation rotates 45° clockwise each step. The line weight cycles every 4 steps.

### Explainer

The correct answer has horizontal stripes (orientation has completed its 4-step cycle and returned to horizontal) with light weight (the darkness cycle has also completed its 4-step cycle). Option A satisfies both rules. B has the wrong orientation. C has the wrong darkness. D drops both attributes. E has the correct orientation for step 4 but the incorrect darkness for step 5, and also would represent a reversal in the rotation pattern.

This question type is characteristic of ACER abstract reasoning tests, which often combine spatial rotation patterns with changing visual properties (colour, shading, line weight). Unlike Raven's, which uses 3×3 matrices, ACER frequently uses linear series that require the candidate to extrapolate the next item from a sequence of transformations.

---

*Sample adapted for ACER Abstract Reasoning format. Linear figure series combining rotation and pattern density, two common ACER transformation types. SVG per project conventions. All content is original creation.*
