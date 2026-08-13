# Example 1: Matrix Completion

**Format:** 3×3 Matrix (Raven's Progressive Matrices style)

**Question:** Which figure should replace the question mark to complete the grid?

<svg viewBox="0 0 350 350" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="hatch" width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="0" y2="6" stroke="#333" stroke-width="1.2"/>
    </pattern>
  </defs>
  <rect width="350" height="350" fill="#ffffff"/>

  <!-- Row 1: Circles (empty → hatched → solid) -->
  <g transform="translate(15, 15)">
    <rect x="0" y="0" width="90" height="90" fill="none" stroke="#ccc" stroke-width="1.5"/>
    <circle cx="45" cy="45" r="28" fill="#fff" stroke="#333" stroke-width="2.5"/>
  </g>
  <g transform="translate(125, 15)">
    <rect x="0" y="0" width="90" height="90" fill="none" stroke="#ccc" stroke-width="1.5"/>
    <circle cx="45" cy="45" r="28" fill="url(#hatch)" stroke="#333" stroke-width="2.5"/>
  </g>
  <g transform="translate(235, 15)">
    <rect x="0" y="0" width="90" height="90" fill="none" stroke="#ccc" stroke-width="1.5"/>
    <circle cx="45" cy="45" r="28" fill="#333" stroke="#333" stroke-width="2.5"/>
  </g>

  <!-- Row 2: Squares (empty → hatched → solid) -->
  <g transform="translate(15, 125)">
    <rect x="0" y="0" width="90" height="90" fill="none" stroke="#ccc" stroke-width="1.5"/>
    <rect x="19" y="19" width="52" height="52" fill="#fff" stroke="#333" stroke-width="2.5"/>
  </g>
  <g transform="translate(125, 125)">
    <rect x="0" y="0" width="90" height="90" fill="none" stroke="#ccc" stroke-width="1.5"/>
    <rect x="19" y="19" width="52" height="52" fill="url(#hatch)" stroke="#333" stroke-width="2.5"/>
  </g>
  <g transform="translate(235, 125)">
    <rect x="0" y="0" width="90" height="90" fill="none" stroke="#ccc" stroke-width="1.5"/>
    <rect x="19" y="19" width="52" height="52" fill="#333" stroke="#333" stroke-width="2.5"/>
  </g>

  <!-- Row 3: Triangles (empty → hatched → ?) -->
  <g transform="translate(15, 235)">
    <rect x="0" y="0" width="90" height="90" fill="none" stroke="#ccc" stroke-width="1.5"/>
    <polygon points="45,17 73,73 17,73" fill="#fff" stroke="#333" stroke-width="2.5"/>
  </g>
  <g transform="translate(125, 235)">
    <rect x="0" y="0" width="90" height="90" fill="none" stroke="#ccc" stroke-width="1.5"/>
    <polygon points="45,17 73,73 17,73" fill="url(#hatch)" stroke="#333" stroke-width="2.5"/>
  </g>
  <g transform="translate(235, 235)">
    <rect x="0" y="0" width="90" height="90" fill="#f7f7f7" stroke="#aaa" stroke-width="1.5" stroke-dasharray="5,3"/>
    <text x="45" y="48" text-anchor="middle" font-size="28" font-family="Arial, sans-serif" font-weight="bold" fill="#999">?</text>
  </g>
</svg>

---

**Rule:** Each row shares the same shape type (circles → squares → triangles). Each column follows a shading progression: empty → hatched → solid.

**Answer:** Solid triangle (▲)
