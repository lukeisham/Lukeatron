---
name: "!SvgImage"
description: "Generate an image as hand-written SVG markup (not a raster model) — for icons, diagrams, posters, banners, illustrations, patterns, and any graphic Luke will export himself as JPEG or PDF. Always asks canvas size, then style — rendered as a clickable grid of tiny thumbnail previews (one per style-guide/_index.md row — seeded, and growing whenever Luke names a new one) via show_widget, researching and saving a new style-guide/<slug>.md file + index row if Luke names one that isn't shown. STEP 2 reads only the lightweight index to build the grid; once a style is picked, only that ONE style's file is read — never the whole library. Then asks a short series of brief questions (subject, pose, composition, required text, distinguishing details) and turns the answers into a short précis Luke confirms or edits before anything is built. Always wraps content in semantically named <g id> groups for future editing, always paints an opaque background (Luke exports to JPEG, which has no alpha channel). Saves the .svg to System/Sandbox/ and hands Luke the file path — he opens it in a Chrome tab himself and saves as JPEG/PDF from there."
type: Skill
status: Active
domain: GeneralPurpose
core_function: Generate
intent: "Give Luke a fast, editable path to vector graphics across any context — SVG markup he can iterate on with Claude and export to JPEG/PDF himself, instead of a one-shot raster image with no editable structure. The style guide is split one-file-per-style plus a lightweight index (same pattern as the Skillbank catalog itself) so both generation AND later modification stay easy — a consistent per-style layer/id vocabulary means a follow-up request can target one group instead of triggering a full rebuild, and resolving a style never costs more than reading one small file. The thumbnail grid exists so picking a style is visual/instant instead of matching a name against a text list from memory."
version: 1.7.0
dependencies:
  - "style-guide/_index.md"
  - "style-guide/*.md"
calibration:
  context: [Any]
  level: Brief
  scope: Global
memory_footprint:
  read: [System/Skillbank/GeneralPurposeSkills/!SvgImage/style-guide/_index.md, System/Skillbank/GeneralPurposeSkills/!SvgImage/style-guide/<slug>.md]
  write: [System/Sandbox, System/Skillbank/GeneralPurposeSkills/!SvgImage/style-guide/_index.md, System/Skillbank/GeneralPurposeSkills/!SvgImage/style-guide/<new-slug>.md]
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
    • A4 / Print — 2480×3508 (300 DPI)
    • Icon — 24 / 32 / 48 / 64 (square — tell me which)
  IF Luke names a platform/format instead of picking from the list (e.g. "an Instagram story") ➔ match
  it to the corresponding row above rather than re-asking.
  IF Luke says "you choose" or doesn't answer ➔ pick the closest match to the stated purpose and STATE
  which size you picked and why, in one line, before building.

STEP 2 — ASK STYLE (never skip, never silently assume). Render as a clickable thumbnail grid, not text.
  READ ONLY this skill's `style-guide/_index.md` — never open the individual `style-guide/<slug>.md`
  files at this point, the index alone carries everything the grid needs (name + Thumbnail SVG per
  row). This is the whole point of the split: building the grid must never cost reading all 24+ full
  style bodies.
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
    CASE [names a style already in the index] ➔
      READ ONLY that one style's `style-guide/<slug>.md` (the `File:` path on its index row) — not the
      index again, not any other style's file. This becomes the base structure for STEP 4.
    CASE [names a style NOT in the index] ➔
      RESEARCH the style (web search — its defining visual traits, typical compositional layers,
      distinctive techniques an SVG can actually produce, characteristic palette, typography/lettering)
      until there's enough to write it up properly.
      DRAFT a new file `style-guide/<new-slug>.md` in the *exact* individual-file format documented at
      the top of `style-guide/_index.md` (Visual DNA / Standard layers / Distinctive SVG techniques /
      Palette / Typography — no Thumbnail field, that lives only in the index). Describe the visual
      idiom itself — never instruct reproducing a specific copyrighted character or franchise artwork;
      style is fair game, a named character's exact design is not.
      APPEND a matching row to `style-guide/_index.md` (name, File path, Tags, one-line Visual DNA
      teaser, and a hand-built Thumbnail — the Thumbnail is not optional, it's what makes this style
      selectable from the grid next time) and tell Luke in one line that the guide now carries it for
      reuse. Both files are written together, every time.
      USE the freshly drafted file as the base structure for STEP 4.
    CASE ["no particular style" / declines] ➔ proceed to STEP 3 with only the generic rules below —
      no style-guide layers/techniques layered on top.
  STATE the confirmed (or newly researched) style back to Luke in one line before building.

STEP 3 — ASK THE BRIEF, THEN CONFIRM A SUMMARY (never skip, never silently assume).
  ASK Luke a short series of targeted questions to fill out the brief — group them compactly in one
  message rather than one-per-turn where possible:
    • Subject — what/who the image is of
    • Pose — stance, angle, action, expression (skip this question outright, don't ask it, for image
      types with no figure to pose — icons, patterns, abstract diagrams, flat logos)
    • Composition — layout/framing, focal point, what sits foreground vs background
    • Required text — any words/labels that must appear on the image verbatim, or "none"
    • Distinguishing details — anything else specific to include or avoid (colours, objects, mood,
      era, props, setting, etc.)
  SKIP any question Luke's original request already answered, or that plainly doesn't apply to this
  image type — don't re-ask what's already known, and don't force "pose" on a non-figurative subject.
  ONCE answered, WRITE a short, precise text summary (2–4 sentences) of the whole brief — size, style,
  subject, pose (if applicable), composition, required text, and distinguishing details.
  SHOW that summary to Luke and ASK him to confirm it or edit it.
  IF Luke edits it ➔ fold the edit in and re-show the updated summary until he confirms.
  This confirmed summary is the authoritative brief STEP 4 builds from — don't build off the raw
  original request once a summary has been confirmed.

STEP 4 — BUILD THE SVG.
  `<svg width="W" height="H" viewBox="0 0 W H" xmlns="http://www.w3.org/2000/svg" role="img"
  aria-labelledby="title desc">` using the confirmed canvas size.
  ALWAYS make the SVG accessible — mandatory, not optional. Put these as the first children of the
  `<svg>`, before the background rect:
    `<title id="title">…</title>` — a short human-readable name for the image.
    `<desc id="desc">…</desc>` — one line saying what the image shows / is for.
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
    Every style file states its stroke-widths, gaps, and other absolute figures "on a 1080-wide
    canvas" — treat that as the reference scale and multiply every such figure by (confirmed
    canvas width ÷ 1080) before drawing, so a 24px icon or a 2480px-wide A4 canvas keeps the same
    proportions the style file describes rather than using its numbers literally.
  ELSE (no style / plain illustrative) ➔ follow only the generic rule below.
  PREFER what SVG is actually good at: flat/geometric shapes, gradients, patterns, `<filter>` textures
  (`feTurbulence`, `feGaussianBlur`), line art, icons, charts, diagrams. Do not attempt photorealism —
  lean into an illustrative/vector style instead.
  Fonts: use web-safe `font-family` stacks only (system-ui, Georgia, Helvetica, etc.) — no external
  `@import`/`<link>` font loading.
  SELF-CONTAINED, no exceptions: no external fonts, no external images, no `<script>`, no
  `<foreignObject>` — everything inline in the one .svg, so it renders correctly opened standalone from
  disk. (Reusable gradients/patterns/filters go in a single `<defs>` block, referenced by id.)
  Optimisation & hygiene (apply on every build):
    - Round all coordinates/numbers to 1–2 decimal places — no `17.349182` junk.
    - Prefer presentational attributes (`fill`, `stroke`, `stroke-width`) over inline `style="…"`.
    - Keep `<defs>` minimal and ordered — gradients first, then patterns, then filters/markers.
    - No external resources, no scripts, no `<foreignObject>` unless Luke explicitly requests them.

STEP 5 — SAVE.
  WRITE the file to `System/Sandbox/<kebab-case-slug>.svg`.
  IF the write fails ➔ say so plainly: report the exact error and the path you attempted, and do not
  proceed or claim the file exists.
  REPORT back in this exact format, on its own line:
    `Saved: <absolute path> — <W>×<H>, <Style Name> style (or "no style"), opaque background, N groups.`
  Optionally add the one-line browser note: "Open it in a Chrome tab (file:///…) and save as JPEG/PDF
  from there." — a reminder only; never attempt to automate the browser hand-off.
  CLOSE with a one-line iteration hint so Luke knows the semantic ids are live edit targets, e.g.
    "Say 'edit the text layer' or 'recolour the background' to change just that group."

STEP 6 — ITERATE IN PLACE (edit path, not just generation).
  IF Luke refers to "the previous SVG", "edit that", "that file", or passes a `System/Sandbox/…` path ➔
  this is an EDIT, not a new generation: load that file, re-use its existing layer structure, and apply
  changes ONLY to the named `<g id>` groups — never regenerate the whole document for a targeted change.
  On feedback, EDIT the same file, targeting the named `<g id>` groups Luke references ("move the
  text-layer down", "recolour the background") rather than regenerating the whole document. Keep the
  style entry's layer vocabulary intact across edits — a style-aware group name is what makes this
  step fast.

## ✅ OUTPUT
State: one `.svg` file in `System/Sandbox/`, sized to the confirmed canvas, built in the confirmed
  style (or plainly, if none chosen), opaque background, every layer inside a semantically named
  `<g id>` group — plus the file path, ready for Luke to open in a Chrome tab and save as JPEG or PDF
  from there. If a new style was researched, style-guide/ now carries a permanent file + index row for it.
Validation (self-test before returning):
  VERIFY canvas size was confirmed with Luke (asked, or an assumption stated) ELSE go back to STEP 1.
  VERIFY a style was confirmed with Luke (asked, or an assumption stated) ELSE go back to STEP 2.
  VERIFY the subject/pose/composition/text/details brief was gathered and Luke confirmed the summary
    (or explicitly edited and re-confirmed it) ELSE go back to STEP 3.
  VERIFY a full-canvas opaque background rect exists ELSE add one before returning.
  VERIFY every top-level visual element sits inside a named `<g id>` ELSE group it before returning.
  VERIFY the `<svg>` carries `role="img"` plus a `<title>` and `<desc>` ELSE add them before returning.
  VERIFY the file is self-contained — no external fonts/images/scripts/`<foreignObject>` ELSE fix.
  IF a style was resolved ➔ VERIFY its Standard layers are represented and its Distinctive SVG
    techniques were actually used, not just read ELSE fold them in before returning.
Error:
  CATCH [Luke wants photoreal/painterly detail SVG can't deliver] ➔ say so plainly and suggest a raster
  approach instead of forcing SVG to do something it's bad at.
  CATCH [research on a named style comes back too thin to write a real entry] ➔ say so plainly, ask
  Luke for a reference image/description instead of guessing, and don't append a low-confidence entry.
  CATCH [Luke answers the STEP 3 questions vaguely — "make something cool", no specifics] ➔ don't guess
  or draft a summary from a vague answer; ask a narrower follow-up on the specific missing point(s)
  before drafting the summary.
  CATCH [very large canvas or dense diagram] ➔ warn that the file may get large and suggest simplifying
  (fewer elements, simpler shapes, less detail) before proceeding.
  CATCH [the style-picker widget fails to render] ➔ fall back gracefully to a numbered text list built
  from `style-guide/_index.md`'s row names only (still just the index, not the individual files), one
  per line, and proceed exactly the same way.
Log: "[SKILL: !SvgImage] [SUCCESS] file=[path] size=[WxH] style=[name|none] groups=[N]" →
  Logs/skills.log
