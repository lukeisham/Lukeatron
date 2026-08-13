# Example 3: Odd One Out

**Format:** Classification — "Which figure does not belong?"

**Question:** Four of the five figures follow the same rule. Which one is the odd one out?

<svg viewBox="0 0 650 160" xmlns="http://www.w3.org/2000/svg">
  <rect width="650" height="160" fill="#ffffff"/>

  <!-- Figure A: Circle outside, triangle inside (different) -->
  <g transform="translate(40, 15)">
    <rect x="0" y="0" width="110" height="130" fill="none" stroke="#ccc" stroke-width="1.5" rx="4"/>
    <text x="55" y="18" text-anchor="middle" font-size="14" font-family="Arial, sans-serif" font-weight="bold" fill="#555">A</text>
    <circle cx="55" cy="70" r="32" fill="#fff" stroke="#333" stroke-width="2.5"/>
    <polygon points="55,57 72,88 38,88" fill="#fff" stroke="#333" stroke-width="2" transform="translate(0, 3)"/>
  </g>

  <!-- Figure B: Square outside, circle inside (different) -->
  <g transform="translate(165, 15)">
    <rect x="0" y="0" width="110" height="130" fill="none" stroke="#ccc" stroke-width="1.5" rx="4"/>
    <text x="55" y="18" text-anchor="middle" font-size="14" font-family="Arial, sans-serif" font-weight="bold" fill="#555">B</text>
    <rect x="22" y="37" width="66" height="66" fill="#fff" stroke="#333" stroke-width="2.5"/>
    <circle cx="55" cy="70" r="17" fill="#fff" stroke="#333" stroke-width="2"/>
  </g>

  <!-- Figure C: Triangle outside, diamond inside (different) -->
  <g transform="translate(290, 15)">
    <rect x="0" y="0" width="110" height="130" fill="none" stroke="#ccc" stroke-width="1.5" rx="4"/>
    <text x="55" y="18" text-anchor="middle" font-size="14" font-family="Arial, sans-serif" font-weight="bold" fill="#555">C</text>
    <polygon points="55,35 90,98 20,98" fill="#fff" stroke="#333" stroke-width="2.5"/>
    <rect x="39" y="60" width="32" height="32" fill="#fff" stroke="#333" stroke-width="2" transform="rotate(45, 55, 76)"/>
  </g>

  <!-- Figure D: Square outside, square inside (SAME — ODD ONE OUT) -->
  <g transform="translate(415, 15)">
    <rect x="0" y="0" width="110" height="130" fill="none" stroke="#e74c3c" stroke-width="2.5" rx="4"/>
    <text x="55" y="18" text-anchor="middle" font-size="14" font-family="Arial, sans-serif" font-weight="bold" fill="#e74c3c">D</text>
    <rect x="22" y="37" width="66" height="66" fill="#fff" stroke="#333" stroke-width="2.5"/>
    <rect x="40" y="55" width="30" height="30" fill="#fff" stroke="#333" stroke-width="2"/>
  </g>

  <!-- Figure E: Pentagon outside, circle inside (different) -->
  <g transform="translate(540, 15)">
    <rect x="0" y="0" width="110" height="130" fill="none" stroke="#ccc" stroke-width="1.5" rx="4"/>
    <text x="55" y="18" text-anchor="middle" font-size="14" font-family="Arial, sans-serif" font-weight="bold" fill="#555">E</text>
    <polygon points="55,38 82,60 73,92 37,92 28,60" fill="#fff" stroke="#333" stroke-width="2.5"/>
    <circle cx="55" cy="70" r="16" fill="#fff" stroke="#333" stroke-width="2"/>
  </g>
</svg>

---

**Rule:** In figures A, B, C, and E, the inner shape is different from the outer shape. Figure D is the **odd one out** because the inner and outer shapes are both squares.

**Answer:** D
