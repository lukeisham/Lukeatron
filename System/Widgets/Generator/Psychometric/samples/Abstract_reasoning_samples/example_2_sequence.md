# Example 2: Sequence Completion

**Format:** Linear Series — "Next in the Series"

**Question:** Which figure comes next in the sequence?

<svg viewBox="0 0 600 120" xmlns="http://www.w3.org/2000/svg">
  <rect width="600" height="120" fill="#ffffff"/>

  <!-- Cell backgrounds -->
  <rect x="10"  y="10" width="100" height="100" fill="none" stroke="#ccc" stroke-width="1.5" rx="4"/>
  <rect x="125" y="10" width="100" height="100" fill="none" stroke="#ccc" stroke-width="1.5" rx="4"/>
  <rect x="240" y="10" width="100" height="100" fill="none" stroke="#ccc" stroke-width="1.5" rx="4"/>
  <rect x="355" y="10" width="100" height="100" fill="none" stroke="#ccc" stroke-width="1.5" rx="4"/>
  <rect x="470" y="10" width="100" height="100" fill="#f7f7f7" stroke="#aaa" stroke-width="1.5" stroke-dasharray="5,3" rx="4"/>

  <!-- Arrow definition -->
  <defs>
    <g id="arrow">
      <line x1="0" y1="22" x2="0" y2="-22" stroke="#333" stroke-width="3" stroke-linecap="round"/>
      <polygon points="0,-32 -9,-18 9,-18" fill="#333"/>
    </g>
  </defs>

  <!-- Position 1: arrow pointing up (0°) -->
  <g transform="translate(60, 60)"><use href="#arrow"/></g>

  <!-- Position 2: arrow right (90° CW) -->
  <g transform="translate(175, 60) rotate(90)"><use href="#arrow"/></g>

  <!-- Position 3: arrow down (180° CW) -->
  <g transform="translate(290, 60) rotate(180)"><use href="#arrow"/></g>

  <!-- Position 4: arrow left (270° CW) -->
  <g transform="translate(405, 60) rotate(270)"><use href="#arrow"/></g>

  <!-- Position 5: ? -->
  <text x="520" y="63" text-anchor="middle" font-size="28" font-family="Arial, sans-serif" font-weight="bold" fill="#999">?</text>
</svg>

---

**Rule:** The arrow rotates 90° clockwise at each step: up → right → down → left → up.

**Answer:** Arrow pointing up (↑)
