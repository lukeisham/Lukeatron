# British government official announcement style
**Tags:** poster | typographic notice
**Anti-patterns / Avoid:** any pictorial or illustrated imagery, ragged/asymmetric alignment, hairline or ultra-light weights, polychrome or novelty inks, or dropped caps/flourons/ornamental flourishes.
**Visual DNA:** A purely typographic government notice — centred vertical axis, stacked type sizes carrying the entire hierarchy, thin rules framing each section, and a generic crown/crest device at the head signalling authority. Distinguishing note: this style carries NO illustration of any kind — where the Soviet and WWII/EMB styles both build a picture, this one declares through type and rule lines alone.
**Signature tells (must be visibly present):** 1) zero pictorial illustration — the entire notice is type, rules, and at most one abstract heraldic device 2) a strictly centred vertical axis with every block symmetrical on the midline 3) thin horizontal double-rules (never a single bold rule) dividing headline/body/signature.
**Craft-rule carve-outs:** The thin double-rule structure (two identical 2px hairlines) and the single-family type system are the defining tells of this style and override the generic edge-variation rule — uniformity of rule weight and letterform is what reads as "official," not variation. This style also takes no global light direction or contact shadows — it is flat type on flat paper.
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
- Generic heraldic emblem: build the crown/crest as an original abstract device on a 1080-wide canvas, 120-160px tall and roughly 100-130px wide. Base structure: two vertical arches meeting at a shared centre point, each arch a simple Bézier curve with a 60° apex angle; a horizontal band (the "band" of the crown) 15-20px tall sits beneath the arches, spanning the full width. Along the top of the band, alternate 5-7 points evenly spaced 12-15px apart, alternating cross-pattée (a small flared cross, arms widening toward their ends) and fleur-de-lis silhouettes — never a reproduction of an actual royal or national coat of arms, and never more than two point-shapes in the alternation. It may be omitted entirely on purely functional notices (rations, blackout rules) and is always present on formal proclamations.
- Paper grain: a single `<feTurbulence type="fractalNoise" baseFrequency="0.9">` piped through `<feColorMatrix>` to near-transparent, opacity 0.03-0.06, applied once as a full-canvas overlay — never stacked with any other texture.
**Palette:** HMSO blue `#012169`, pillar-box red `#C8102E`, cream/buff ground `#F5F5DC` to `#FFFDD0`. Two-colour printing is the norm; a third hue (blue + red together) is the maximum, never polychrome.
**Typography:** slab stack `"Clarendon", "IBM Plex Serif", Georgia, serif` OR humanist sans stack `"Gill Sans Nova", "Gill Sans", "Segoe UI", "Trebuchet MS", sans-serif` — pick one per notice per the decision rule above. Display lines tracked 0.05-0.15em; small caps (used for "BY ORDER", dates, ministry names) tracked 0.10-0.20em; running body text at normal tracking. Period note: Caslon Egyptian (1816) is the correct historical reference for early slab display work, not Gill Sans, which only dominates from the 1930s.

**Choosing this over its neighbours:** against `soviet-propaganda-poster.md` and `wwii-emb-poster.md` — both neighbours build an illustrated scene to persuade or agitate; this style illustrates nothing and declares instead, through centred type, rule lines, and at most one abstract heraldic device. If the brief calls for any pictorial imagery at all — a heroic figure, a landscape, a scene — it is not this style.

*Note: the numeric conventions above are researcher-compiled working conventions for this style, not measurements cited to a specific published source — treat them as well-grounded defaults, not verified citations.*
