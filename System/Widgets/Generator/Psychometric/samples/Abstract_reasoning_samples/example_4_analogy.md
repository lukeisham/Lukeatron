# Example 4: Figural Analogy

**Format:** "A is to B as C is to ?"

**Question:** The first pair of figures are related by a rule. Apply the same rule to find the missing figure in the second pair.

<svg viewBox="0 0 480 420" xmlns="http://www.w3.org/2000/svg">
  <rect width="480" height="420" fill="#ffffff"/>

  <!-- Labels -->
  <text x="130" y="25" text-anchor="middle" font-size="16" font-family="Arial, sans-serif" font-weight="bold" fill="#555">A</text>
  <text x="350" y="25" text-anchor="middle" font-size="16" font-family="Arial, sans-serif" font-weight="bold" fill="#555">B</text>
  <text x="130" y="240" text-anchor="middle" font-size="16" font-family="Arial, sans-serif" font-weight="bold" fill="#555">C</text>
  <text x="350" y="240" text-anchor="middle" font-size="16" font-family="Arial, sans-serif" font-weight="bold" fill="#555">?</text>

  <!-- Arrows -->
  <line x1="170" y1="95" x2="300" y2="95" stroke="#999" stroke-width="1.5" marker-end="url(#arrowhead)"/>
  <line x1="170" y1="310" x2="300" y2="310" stroke="#999" stroke-width="1.5" marker-end="url(#arrowhead)"/>
  <line x1="130" y1="135" x2="130" y2="265" stroke="#999" stroke-width="1.5" marker-end="url(#arrowhead)"/>
  <line x1="350" y1="135" x2="350" y2="265" stroke="#999" stroke-width="1.5" marker-end="url(#arrowhead)"/>

  <defs>
    <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
      <polygon points="0 0, 8 3, 0 6" fill="#999"/>
    </marker>
    <pattern id="hatchV" width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="0" y2="6" stroke="#333" stroke-width="1"/>
    </pattern>
  </defs>

  <!-- A: Empty circle -->
  <g transform="translate(85, 40)">
    <rect x="0" y="0" width="90" height="90" fill="none" stroke="#ddd" stroke-width="1.5" rx="4"/>
    <circle cx="45" cy="45" r="30" fill="#fff" stroke="#333" stroke-width="2.5"/>
  </g>

  <!-- B: Circle with horizontal stripe added -->
  <g transform="translate(305, 40)">
    <rect x="0" y="0" width="90" height="90" fill="none" stroke="#ddd" stroke-width="1.5" rx="4"/>
    <circle cx="45" cy="45" r="30" fill="url(#hatchV)" stroke="#333" stroke-width="2.5"/>
  </g>

  <!-- C: Empty square -->
  <g transform="translate(85, 255)">
    <rect x="0" y="0" width="90" height="90" fill="none" stroke="#ddd" stroke-width="1.5" rx="4"/>
    <rect x="16" y="16" width="58" height="58" fill="#fff" stroke="#333" stroke-width="2.5"/>
  </g>

  <!-- ?: Missing -->
  <g transform="translate(305, 255)">
    <rect x="0" y="0" width="90" height="90" fill="#f7f7f7" stroke="#aaa" stroke-width="1.5" stroke-dasharray="5,3" rx="4"/>
    <text x="45" y="48" text-anchor="middle" font-size="28" font-family="Arial, sans-serif" font-weight="bold" fill="#999">?</text>
  </g>
</svg>

---

**Rule:** The first pair transforms an **empty** figure into a **hatched/striped** version of the same shape. Apply the same fill rule to the square.

**Answer:** Hatched/striped square (☐ with diagonal lines)
