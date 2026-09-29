# Raven's Progressive Matrices (RPM) — US

**Reference test:** Raven's Progressive Matrices (Standard Progressive Matrices / Advanced Progressive Matrices) — US
**Format:** 60 items (Standard) or 36 items (Advanced), untimed or ~40 minutes. Each item presents a 3×3 matrix of abstract figures with one missing cell. Candidate selects the correct completion from 6–8 options.
**Answer style:** Single correct answer from numbered options. Binary scoring.
**Distinctive feature:** Purely non-verbal, no language. Tests "g" (general intelligence) via pattern induction. Difficulty increases progressively through the test.

**SVG rules:** All visual artefacts follow `Memory/Long-Term/Coding/vibe-coding-rules.md` SVG-1 through SVG-5.

---

## RPM Sample — Matrix: Multi-Attribute Pattern (Medium Difficulty)

### SVG Stimulus

![Raven's-style 3x3 matrix with the bottom-right cell missing. Rows progress from simple to complex shapes; columns introduce colour saturation changes.](rpm-sample-matrix.svg)

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 360">
  <!-- Grid lines -->
  <line x1="0" y1="120" x2="360" y2="120" stroke="#888" stroke-width="1.5" />
  <line x1="0" y1="240" x2="360" y2="240" stroke="#888" stroke-width="1.5" />
  <line x1="120" y1="0" x2="120" y2="360" stroke="#888" stroke-width="1.5" />
  <line x1="240" y1="0" x2="240" y2="360" stroke="#888" stroke-width="1.5" />

  <!-- Row 1: 1 shape → 2 shapes → 3 shapes, all outline -->
  <!-- Cell (1,1): single circle -->
  <circle cx="60" cy="60" r="18" fill="none" stroke="#1a1a1a" stroke-width="2" />
  <!-- Cell (1,2): two circles -->
  <circle cx="155" cy="60" r="14" fill="none" stroke="#1a1a1a" stroke-width="2" />
  <circle cx="185" cy="60" r="14" fill="none" stroke="#1a1a1a" stroke-width="2" />
  <!-- Cell (1,3): three circles -->
  <circle cx="265" cy="60" r="10" fill="none" stroke="#1a1a1a" stroke-width="2" />
  <circle cx="295" cy="60" r="10" fill="none" stroke="#1a1a1a" stroke-width="2" />
  <circle cx="325" cy="60" r="10" fill="none" stroke="#1a1a1a" stroke-width="2" />

  <!-- Row 2: 1 shape → 2 shapes → 3 shapes, grey fill -->
  <!-- Cell (2,1): single square -->
  <rect x="42" y="162" width="36" height="36" fill="#999" stroke="#1a1a1a" stroke-width="2" />
  <!-- Cell (2,2): two squares -->
  <rect x="138" y="162" width="28" height="28" fill="#999" stroke="#1a1a1a" stroke-width="2" />
  <rect x="174" y="162" width="28" height="28" fill="#999" stroke="#1a1a1a" stroke-width="2" />
  <!-- Cell (2,3): three squares -->
  <rect x="248" cy="162" width="22" height="22" fill="#999" stroke="#1a1a1a" stroke-width="2" />
  <rect x="278" y="162" width="22" height="22" fill="#999" stroke="#1a1a1a" stroke-width="2" />
  <rect x="308" y="162" width="22" height="22" fill="#999" stroke="#1a1a1a" stroke-width="2" />

  <!-- Row 3: 1 shape → 2 shapes → ?, black fill -->
  <!-- Cell (3,1): single triangle -->
  <polygon points="60,248 42,292 78,292" fill="#1a1a1a" />
  <!-- Cell (3,2): two triangles -->
  <polygon points="155,248 140,292 170,292" fill="#1a1a1a" />
  <polygon points="185,248 170,292 200,292" fill="#1a1a1a" />

  <!-- Missing cell indicator -->
  <text x="300" y="305" font-family="sans-serif" font-size="22" fill="#888" text-anchor="middle">?</text>
</svg>
```

### Question

Which of the following should replace the missing cell?

### Options

- **1:** Three triangles, black fill, apex-up
- **2:** Three triangles, outline only, apex-up
- **3:** Three squares, black fill
- **4:** Two triangles, black fill, apex-up
- **5:** Three circles, black fill
- **6:** Three triangles, black fill, apex-down

### Correct Answer

**1**

### Rule Spec

| Rule | Attribute | Pattern |
|------|-----------|---------|
| **Columns: Number of shapes** | Count | Col 1 → 1, Col 2 → 2, Col 3 → 3 |
| **Rows: Shape type** | Geometry | Row 1 = circles, Row 2 = squares, Row 3 = triangles |
| **Rows: Fill/colour** | Shading | Row 1 = outline only, Row 2 = grey fill, Row 3 = black fill |
| **Orientation** | Rotation | Triangles maintain apex-up throughout |

### Clue

The matrix has three independent rules operating simultaneously: one governs what happens across columns, one governs what defines each row, and one governs fill. Look at each dimension separately.

### Explainer

Option 1 satisfies all three rules simultaneously. The missing cell is in Row 3 (triangles, black fill), Column 3 (three shapes). Option 2 violates the fill rule. Option 3 uses the wrong shape. Option 4 has the wrong count. Option 5 uses the wrong shape. Option 6 has the wrong orientation. Raven's matrices at this difficulty level typically combine 2–3 rules, requiring the solver to hold multiple attributes in mind simultaneously — a hallmark of fluid intelligence (Gf).

---

*Sample adapted for RPM format. 3×3 matrix with multi-attribute pattern (count, shape, fill). 6 response options as per Standard RPM. SVG rendering per project conventions. All content is original creation.*
