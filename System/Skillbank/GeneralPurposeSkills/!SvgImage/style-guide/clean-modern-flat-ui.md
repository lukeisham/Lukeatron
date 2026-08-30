# Clean modern flat / UI style
**Tags:** UI | icon
**Anti-patterns / Avoid:** No gradients, drop shadows beyond the two defined elevation tokens, skeuomorphic texture, more than one accent hue, or decorative fonts.
**Visual DNA:** Contemporary product/UI idiom — crisp geometric shapes on a neutral ground, small consistent corner radii, thin uniform strokes, one accent colour used sparingly, generous whitespace; screens, panels, and icons that read as "designed," not illustrated.
**Signature tells (must be visibly present):** 1) uniform 1-1.5px strokes and consistent corner radii drawn from the fixed scale, never a varied or hand-drawn line 2) exactly one accent hue covering at most 10% of the visible area, everything else neutral grey/white 3) flat surfaces with at most a two-level soft `feDropShadow` elevation system — never a gradient or texture.
**Craft-rule carve-outs:** Uniform stroke-width and flat, unshaded surfaces are this style's defining tells and override the generic edge-variation and one-global-light rules — there is no depth-based line weighting, no gradient shading, and no contact shadow beyond the two defined elevation tokens. This is also a deliberately sparse style: an icon or single control may legitimately sit at or below the detail-budget floor (state so in one line) since restraint, not density, is the point.
**Typical subject / composition:** App screens, dashboards, settings panels, cards, buttons and form controls, and icon sets — any multi-element UI/product surface built on a shared spacing and component system. Not for standalone identity marks (see `minimal-geometric-logo.md` for single-mark logo design).
**Standard layers (z-order, bottom → top):**
- `<g id="background-plain">` — flat neutral ground (white / near-white / light grey)
- `<g id="surface-cards">` — sub-group per panel/card, with a 1px border and elevation token applied
- `<g id="icon-set">` — sub-group per icon, drawn on the shared 24px icon grid
- `<g id="accent-details">` — the single accent colour, reserved for the primary CTA/focus element
- `<g id="typography">` — labels and text, set per the type scale below

**Distinctive SVG techniques:**
- Spacing scale: all layout distances (padding, gaps, margins) are drawn from the fixed scale — 4, 8, 12, 16, 24, 32, 48, 64 (CSS px). 8px is the base module; 4px is a permitted half-step reserved for small internal padding and icon-detail spacing only. State this once; do not restate the grid rule elsewhere.
- Corner-radius scale: `rx="4"` for small controls (chips, inputs, buttons under 40px tall), `rx="8"` for cards and panels, `rx="16"` for large containers/modals. Pick radius by component size, not by feel.
- Elevation as `feDropShadow`, capped at two levels — Level 1 (resting card): `dx="0" dy="1" stdDeviation="2"` at 8% black opacity. Level 2 (raised/modal): `dx="0" dy="4" stdDeviation="8"` at 12% black opacity. No other shadow values are permitted.
- Type scale (size / line-height / weight, in CSS px on a 1080-wide canvas frame): Display 32/40/700, Heading 24/32/600, Subheading 18/28/600, Body 14/20/400, Caption 12/16/400.
- Icon construction: `viewBox="0 0 24 24"`, `stroke-width="1.5"`, `stroke-linecap="round"`, `stroke-linejoin="round"`, no fill unless the icon is a solid glyph; keep a 2px live-area padding inside the 24px box so strokes never touch the edge; hold consistent optical weight (stroke width and corner treatment) across every icon in the set.
- Accent coverage limit: the accent colour may cover at most 10% of any given screen's visible area, reserved for the single most important actionable element (primary button, active nav item, focus ring). Every other coloured element is neutral grey.
- Minimum touch/hit target: 44x44 CSS px for any interactive control, even where the visible glyph is smaller (pad the hit area, not the artwork).
- Accessibility: body text and UI icons must clear WCAG AA — 4.5:1 contrast against their surface for normal text, 3:1 for large text (24px+/19px+bold) and for UI component boundaries (borders, icon strokes).

**Palette:** Surfaces `#ffffff` / `#f7f7f8`; borders `#e5e7eb`; neutral text ramp `#111827` (primary text), `#4b5563` (secondary text), `#9ca3af` (disabled/placeholder); one accent `#2563eb` with hover `#1d4ed8` and active `#1e40af`. No other hues.

**Typography:** `system-ui, "Segoe UI", Inter, -apple-system, Roboto, Helvetica, Arial, sans-serif` — sentence case, generous letter-spacing on headings, weights and sizes per the type scale above only.

**Choosing this over its neighbours:** against `minimal-geometric-logo.md` — a logo is a single reductionist mark meant to scale losslessly from favicon to billboard, with no UI chrome, spacing scale, or type system at all; this style is a multi-element screen/panel/icon-set built on a shared spacing grid, elevation tokens, and type scale. If the brief is "one mark that represents a brand," use the logo style instead.
