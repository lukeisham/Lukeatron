# Example 5: Pattern Completion

**Format:** Jigsaw-style — "Complete the larger design"

**Question:** A repeating pattern has a missing piece. Which tile completes the design?

<svg viewBox="0 0 380 380" xmlns="http://www.w3.org/2000/svg">
  <rect width="380" height="380" fill="#ffffff"/>

  <defs>
    <!-- The repeating tile: a circle containing a diagonal cross -->
    <g id="tile">
      <rect x="0" y="0" width="80" height="80" fill="#fff" stroke="#ddd" stroke-width="1"/>
      <!-- Diagonal cross -->
      <line x1="12" y1="12" x2="68" y2="68" stroke="#333" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="68" y1="12" x2="12" y2="68" stroke="#333" stroke-width="2.5" stroke-linecap="round"/>
      <!-- Circle -->
      <circle cx="40" cy="40" r="22" fill="none" stroke="#333" stroke-width="2.5"/>
      <!-- Center dot -->
      <circle cx="40" cy="40" r="4" fill="#333"/>
    </g>
  </defs>

  <!-- 4×4 grid of tiles -->
  <!-- Row 1 -->
  <g transform="translate(10, 10)"><use href="#tile"/></g>
  <g transform="translate(100, 10)"><use href="#tile"/></g>
  <g transform="translate(190, 10)"><use href="#tile"/></g>
  <g transform="translate(280, 10)"><use href="#tile"/></g>

  <!-- Row 2 — tile at (col 3, row 2) is MISSING -->
  <g transform="translate(10, 100)"><use href="#tile"/></g>
  <g transform="translate(100, 100)"><use href="#tile"/></g>
  <g transform="translate(190, 100)">
    <rect x="0" y="0" width="80" height="80" fill="#f7f7f7" stroke="#aaa" stroke-width="1.5" stroke-dasharray="5,3"/>
    <text x="40" y="43" text-anchor="middle" font-size="24" font-family="Arial, sans-serif" font-weight="bold" fill="#999">?</text>
  </g>
  <g transform="translate(280, 100)"><use href="#tile"/></g>

  <!-- Row 3 -->
  <g transform="translate(10, 190)"><use href="#tile"/></g>
  <g transform="translate(100, 190)"><use href="#tile"/></g>
  <g transform="translate(190, 190)"><use href="#tile"/></g>
  <g transform="translate(280, 190)"><use href="#tile"/></g>

  <!-- Row 4 -->
  <g transform="translate(10, 280)"><use href="#tile"/></g>
  <g transform="translate(100, 280)"><use href="#tile"/></g>
  <g transform="translate(190, 280)"><use href="#tile"/></g>
  <g transform="translate(280, 280)"><use href="#tile"/></g>
</svg>

---

**Rule:** All tiles in the 4×4 grid are identical — a circle with a diagonal cross and a central dot. The missing piece must be the same tile.

**Answer:** The matching tile (a circle with a diagonal cross and a central dot)