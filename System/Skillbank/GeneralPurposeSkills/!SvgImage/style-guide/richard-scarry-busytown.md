# Richard Scarry Busytown-style illustration
**Tags:** illustrative | comic
**Anti-patterns / Avoid:** silent empty background areas, realistic modelling/chiaroscuro or harsh high-contrast value structure, naturalistic animal anatomy, scale-based narrative hierarchy (small figures de-emphasised), or reproducing a specific published character.
**Visual DNA:** A dense, borderless, Bruegel-derived crowded-scene composition — one continuous bustling town rendered as many small vignettes separated by ground lines and depth layering rather than panels — where nearly every object is labelled directly beside itself, functioning as a picture-dictionary.
**Typical subject / composition:** Original anthropomorphic-animal townsfolk going about everyday occupations — bakery, fire station, garage, market street, building site — spread across one wide town scene with foreground/middle/background depth; best for busy, exploratory, vocabulary-rich tableaux rather than single-subject portraits.
**Standard layers (z-order, bottom → top):**
- `<g id="scene-backdrop">` — warm cream sky and warm beige/ochre/tan ground, flat fill, no gradients
- `<g id="town-layout">` — streets/paths and ground lines organising vignettes by depth (background 0–360px, midground 360–720px, foreground 720–1080px on a 1080-wide canvas), establishing left-to-right and front-to-back reading order without borders
- `<g id="vignette-clusters">` — one sub-group per self-contained mini-scene (e.g. `vignette-bakery`, `vignette-fire-truck`), each roughly 200–400px wide on a 1080-wide canvas and independently legible at that size
- `<g id="buildings-cutaway">` — front-wall-removed buildings showing every floor as a horizontal band, orthographic, no forced perspective
- `<g id="vehicles-props">` — side-profile vehicles and props built from geometric primitives, some with cutaway sides
- `<g id="characters">` — figures within each vignette, head-to-body ratio roughly 1:4 to 1:5
- `<g id="direct-labels">` — text set within 8–16px of the item it names on a 1080-wide canvas, connector lines only when proximity alone cannot reach (over ~20px gap)
- `<g id="hidden-detail">` — one tiny recurring generic character tucked into a different vignette per scene, an easter egg to hunt for
**Distinctive SVG techniques:**
- Borderless multi-vignette density: 6–10 vignette groups spaced across a 1080-wide canvas, separated by ground-line depth layering (not strokes or panel frames) so the page reads as one continuous scene rather than a grid.
- Cutaway buildings (signature device): remove the front wall of a building group so every floor is a visible horizontal band with interior furniture and figures, drawn orthographically at consistent scale — no perspective foreshortening.
- Direct labelling as picture-dictionary: every nameable object/character gets a text label placed at 8–16px proximity, font-size 22–32px on a 1080-wide canvas, always subordinate in visual weight to the illustration it names.
- Thick friendly outline: `stroke-width` 3–3.5px on a 1080-wide canvas, black (not brown), rounded `stroke-linecap`/`stroke-linejoin`, consistent weight throughout — no expressive thick/thin variation.
- Flat-fill depth with minimal shading: at most one shadow tone, `#00000015`–`#00000025` (10–15% opacity black), used only as a small ellipse under grounded objects — depth otherwise comes entirely from ground-line layering and overlap, never chiaroscuro.
- Hidden recurring figure: place one small generic character (a distinct silhouette/colour, invented — never a named published character) inside exactly one vignette per composition as a find-it detail.
**Palette:** red `#E8483B`–`#D32F2F`, pink `#F8A5C0`–`#E75480`, ginger-brown `#8B6F47`–`#A0826D`, yellow `#F4C542`, blue `#4A90D9`, green `#5C9E4A`, warm cream sky `#FFF6E5`, warm beige/ochre ground `#D9B877`; black `#111111` reserved for outlines and labels, not fills.
**Typography:** rounded, friendly sans-serif print-style lettering (e.g. a rounded geometric sans stack), 22–32px on a 1080-wide canvas, always placed at direct 8–16px proximity to its labelled item.
