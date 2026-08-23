---
name: "!SvgImage"
description: "Generate an image as hand-written SVG markup (not a raster model) — for icons, diagrams, posters, banners, illustrations, patterns, and any graphic Luke will export himself as JPEG or PDF. Always asks canvas size, then style — rendered as a clickable grid of tiny thumbnail previews (one per style-guide.md entry, 19 seeded) via show_widget, researching and saving a new entry+thumbnail if Luke names one that isn't shown. Always wraps content in semantically named <g id> groups for future editing, always paints an opaque background (Luke exports to JPEG, which has no alpha channel). Saves the .svg to System/Sandbox/ and hands Luke the file path — he opens it in a Chrome tab himself and saves as JPEG/PDF from there."
type: Skill
status: Active
domain: GeneralPurpose
core_function: Generate
intent: "Give Luke a fast, editable path to vector graphics across any context — SVG markup he can iterate on with Claude and export to JPEG/PDF himself, instead of a one-shot raster image with no editable structure. The style guide exists so both generation AND later modification stay easy — a consistent per-style layer/id vocabulary means a follow-up request can target one group instead of triggering a full rebuild. The thumbnail grid exists so picking a style is visual/instant instead of matching a name against a text list from memory."
version: 1.4.0
dependencies:
  - "style-guide.md"
calibration:
  context: [Any]
  level: Brief
  scope: Global
memory_footprint:
  read: [System/Skillbank/GeneralPurposeSkills/!SvgImage/style-guide.md]
  write: [System/Sandbox, System/Skillbank/GeneralPurposeSkills/!SvgImage/style-guide.md]
---

## ⚡ TRIGGER
Primary: `!SvgImage`
Fires when: "generate an image", "make me a graphic", "create an SVG", "draw this as SVG", "make an icon",
"design a poster", "make a banner", "vector illustration of", "diagram this as an image", "svg export",
or any request for a generated image where a raster model isn't specifically named.

## 🛠️ LOGIC

STEP 1 — ASK CANVAS SIZE (never skip, never silently assume).
  ASK Luke to pick from this fixed menu (present it as a list every time, don't paraphrase it away):
    • Custom — Luke gives exact width×height
    • Instagram Square Post — 1080×1080
    • Instagram Portrait Post — 1080×1350
    • Instagram Story / Reel — 1080×1920
    • Facebook Post — 1200×630
    • Facebook Cover — 820×312
    • X (Twitter) Post — 1600×900
    • LinkedIn Post — 1200×627
    • YouTube Thumbnail — 1280×720
    • Pinterest Pin — 1000×1500
  IF Luke names a platform/format instead of picking from the list (e.g. "an Instagram story") ➔ match
  it to the corresponding row above rather than re-asking.
  IF Luke says "you choose" or doesn't answer ➔ pick the closest match to the stated purpose and STATE
  which size you picked and why, in one line, before building.

STEP 2 — ASK STYLE (never skip, never silently assume). Render as a clickable thumbnail grid, not text.
  READ this skill's `style-guide.md` in full and pull each entry's name + `Thumbnail (SVG)` snippet.
  CALL show_widget with an HTML grid (CSS grid, `repeat(auto-fit, minmax(90px, 1fr))`, ~12px gap):
    one tile per style — the raw Thumbnail SVG (rendered ~64-72px) above a small sentence-case label —
    plus one extra tile at the end: "No particular style" (plain dashed border, no thumbnail image).
    Each tile is a clickable button-like element; its click handler calls
    `sendPrompt('Use the <Style Name> style')` (or, for the extra tile, `sendPrompt('No particular style')`).
    Follow the visualize/interactive design rules (flat surfaces, CDS tokens, no gradients/shadows on
    the grid chrome itself — the thumbnails' own artwork is exempt, they're previewing real style
    output). No prose inside the widget — say in the chat response, outside the tool call, that Luke
    can also just type a style that isn't shown and it'll be researched and added.
  ASK (in chat, outside the widget): Luke picks a tile, or types a style name that isn't shown.
  MATCH Luke's answer:
    CASE [names a style already in style-guide.md] ➔
      READ that entry in full (Visual DNA, Standard layers, Distinctive SVG techniques, Palette,
      Typography). This becomes the base structure for STEP 3.
    CASE [names a style NOT in style-guide.md] ➔
      RESEARCH the style (web search — its defining visual traits, typical compositional layers,
      distinctive techniques an SVG can actually produce, characteristic palette, typography/lettering)
      until there's enough to write it up properly.
      DRAFT a new entry in the *exact* format already used in style-guide.md (see that file's header
      for the template: Visual DNA / Standard layers / Distinctive SVG techniques / Palette /
      Typography / Thumbnail (SVG)) — the Thumbnail is not optional, it's what makes this style
      selectable from the grid next time. Describe the visual idiom itself — never instruct
      reproducing a specific copyrighted character or franchise artwork; style is fair game, a named
      character's exact design is not.
      APPEND the new entry to style-guide.md (end of the file, same structure as its neighbours) and
      tell Luke in one line that the guide now carries it for reuse next time.
      USE the freshly drafted entry as the base structure for STEP 3.
    CASE ["no particular style" / declines] ➔ proceed to STEP 3 with only the generic rules below —
      no style-guide layers/techniques layered on top.
  STATE the confirmed (or newly researched) style back to Luke in one line before building.

STEP 3 — BUILD THE SVG.
  `<svg width="W" height="H" viewBox="0 0 W H" xmlns="http://www.w3.org/2000/svg">` using the confirmed
  canvas size.
  ALWAYS paint a full-canvas opaque background `<rect>` first — never leave the canvas transparent.
  Luke exports to JPEG (no alpha channel); a transparent background silently becomes black or white
  on export.
  ALWAYS wrap every distinct visual layer in a semantically named group, id = content role, not style:
    `<g id="background">`, `<g id="subject">`, `<g id="text-layer">`, `<g id="foreground-details">`,
    `<g id="icon-set">`, etc. — whatever names the actual content. Nest sub-groups the same way for
    compound subjects (e.g. `<g id="subject"><g id="subject-head">…</g><g id="subject-body">…</g></g>`).
    This is non-negotiable even for simple images — the id is what makes a later "move the text" or
    "recolour the background" a targeted edit instead of a full rewrite.
  IF a style entry was resolved in STEP 2 ➔ its layers take priority over the generic ones above:
    build the `<g id>` structure from that entry's "Standard layers" list (in its stated z-order),
    apply its "Distinctive SVG techniques" (filters/patterns/stroke rules), and use its Palette and
    Typography unless Luke has specified colours/lettering of his own that should override them.
  ELSE (no style / plain illustrative) ➔ follow only the generic rule below.
  PREFER what SVG is actually good at: flat/geometric shapes, gradients, patterns, `<filter>` textures
  (`feTurbulence`, `feGaussianBlur`), line art, icons, charts, diagrams. Do not attempt photorealism —
  lean into an illustrative/vector style instead.
  Fonts: use web-safe `font-family` stacks only (system-ui, Georgia, Helvetica, etc.) — no external
  `@import`/`<link>` font loading, since the file must render correctly opened standalone from disk.

STEP 4 — SAVE.
  WRITE the file to `System/Sandbox/<kebab-case-slug>.svg`.
  REPORT the absolute file path back to Luke plainly (he opens it himself in Chrome — do not attempt to
  automate that hand-off).

STEP 5 — ITERATE IN PLACE.
  On feedback, EDIT the same file, targeting the named `<g id>` groups Luke references ("move the
  text-layer down", "recolour the background") rather than regenerating the whole document. Keep the
  style entry's layer vocabulary intact across edits — a style-aware group name is what makes this
  step fast.

## ✅ OUTPUT
State: one `.svg` file in `System/Sandbox/`, sized to the confirmed canvas, built in the confirmed
  style (or plainly, if none chosen), opaque background, every layer inside a semantically named
  `<g id>` group — plus the file path, ready for Luke to open in a Chrome tab and save as JPEG or PDF
  from there. If a new style was researched, style-guide.md now carries a permanent entry for it.
Validation (self-test before returning):
  VERIFY canvas size was confirmed with Luke (asked, or an assumption stated) ELSE go back to STEP 1.
  VERIFY a style was confirmed with Luke (asked, or an assumption stated) ELSE go back to STEP 2.
  VERIFY a full-canvas opaque background rect exists ELSE add one before returning.
  VERIFY every top-level visual element sits inside a named `<g id>` ELSE group it before returning.
  IF a style was resolved ➔ VERIFY its Standard layers are represented and its Distinctive SVG
    techniques were actually used, not just read ELSE fold them in before returning.
Error:
  CATCH [Luke wants photoreal/painterly detail SVG can't deliver] ➔ say so plainly and suggest a raster
  approach instead of forcing SVG to do something it's bad at.
  CATCH [research on a named style comes back too thin to write a real entry] ➔ say so plainly, ask
  Luke for a reference image/description instead of guessing, and don't append a low-confidence entry.
Log: "[SKILL: !SvgImage] [SUCCESS] file=[path] size=[WxH] style=[name|none] groups=[N]" →
  Logs/skills.log
