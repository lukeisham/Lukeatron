# British government official announcement style
**Tags:** poster | typographic notice
**Anti-patterns / Avoid:** any pictorial or illustrated imagery, ragged/asymmetric alignment, hairline or ultra-light weights, polychrome or novelty inks, or dropped caps/flourons/ornamental flourishes.
**Visual DNA:** A purely typographic government notice — centred vertical axis, stacked type sizes carrying the entire hierarchy, thin rules framing each section, and a generic crown/crest device at the head signalling authority. Distinguishing note: this style carries NO illustration of any kind — where the Soviet and WWII/EMB styles both build a picture, this one declares through type and rule lines alone.
**Typical subject / composition:** rationing notices, civil-defence instructions, ministry proclamations, "By Order of" announcements — anything the state declares rather than persuades or agitates for.
**Standard layers (z-order, bottom → top):**
- `<g id="background-plain">` — flat cream/buff ground filling the full canvas, with at most a faint paper-grain texture (see technique below)
- `<g id="border-frame">` — a restrained rule-line border, if used, sitting beneath the emblem
- `<g id="crest-emblem">` — a generic crown/shield-silhouette device centred at the head, drawn above the border frame so it is never clipped by it
- `<g id="rule-lines">` — thin horizontal double-rules separating headline, body, and signature sections
- `<g id="headline-text">` — centred, largest size in the hierarchy
- `<g id="body-text">` — centred axis, narrower measure than the canvas width
- `<g id="official-stamp-seal">` — a circular stamp/seal motif, if the notice calls for one
- `<g id="signature-block">` — "By Order of [Department]" plus date, centred, below a double rule
**Distinctive SVG techniques:**
- Format: Double Crown 20 x 30in (2:3 portrait) — on a 1080-wide canvas this is 1080 x 1620.
- Centred vertical axis: every text block and rule centred on the canvas midline; margins of at least 80px on a 1080-wide canvas; substantial vertical whitespace (at least 40px) between each stacked block — this spacing is what reads as a government notice rather than commercial advertising.
- Thin double-rule dividers: two hairlines 2px stroke width, 6-10px apart, spanning the text measure — never a single bold rule — between headline/body and body/signature.
- Type-family decision rule: pick ONE family for the whole notice — either the slab stack or the sans stack below — and use it for both display lines and body copy; never mix a sans headline with a serif body.
- Generic heraldic emblem: build the crown/crest as an original abstract device — a simplified two-arch outline with alternating cross-pattée/fleur-de-lis points, roughly 120-160px tall on a 1080-wide canvas — never a reproduction of an actual royal or national coat of arms. It may be omitted entirely on purely functional notices (rations, blackout rules) and is always present on formal proclamations.
- Paper grain: a single `<feTurbulence type="fractalNoise" baseFrequency="0.9">` piped through `<feColorMatrix>` to near-transparent, opacity 0.03-0.06, applied once as a full-canvas overlay — never stacked with any other texture.
**Palette:** HMSO blue `#012169`, pillar-box red `#C8102E`, cream/buff ground `#F5F5DC` to `#FFFDD0`. Two-colour printing is the norm; a third hue (blue + red together) is the maximum, never polychrome.
**Typography:** slab stack `"Clarendon", "IBM Plex Serif", Georgia, serif` OR humanist sans stack `"Gill Sans Nova", "Gill Sans", "Segoe UI", "Trebuchet MS", sans-serif` — pick one per notice per the decision rule above. Display lines tracked 0.05-0.15em; small caps (used for "BY ORDER", dates, ministry names) tracked 0.10-0.20em; running body text at normal tracking. Period note: Caslon Egyptian (1816) is the correct historical reference for early slab display work, not Gill Sans, which only dominates from the 1930s.
