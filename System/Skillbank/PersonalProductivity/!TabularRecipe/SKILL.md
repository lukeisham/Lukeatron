---
name: "!TabularRecipe"
description: >
  Turn any recipe (pasted, linked, or a dish name to research) into a Cooking-for-Engineers
  style tabular recipe: ingredients as rows in order of first use, steps as columns, cells
  merged where ingredients combine, last cell spanning everything as the finished dish.
  Rendered as an HTML page: SVG table + ingredient list with a copy button (default, since 2026-09-29); box-drawn ASCII only if Luke asks. Triggers: "tabular recipe", "recipe table",
  "cooking for engineers style", "put this recipe in a table", "!TabularRecipe". Assumes a Thermomix;
  "without a Thermomix" / "stovetop" switches to conventional equipment.
type: Skill
status: Active
core_function: Generate
intent: "Make a whole recipe legible in one look — what stays separate, what joins, and what can run in parallel."
version: 1.5.0
dependencies: [reference/find_recipe.py, reference/example_svg_table.py, reference/ingredient_list.html]
calibration:
  context: [Personal]
  level: Brief
  scope: Local
memory_footprint:
  read: [Memory/Long-Term/Recipes]
  write: [Memory/Long-Term/Recipes]
---

## ⚡ TRIGGER
`!TabularRecipe`, or any request to show a recipe as a table / in Michael Chu's (Cooking for Engineers) format. Input is a recipe (text or URL) or a dish name.

**End result:** a recipe Luke can cook from — either one that already exists (suggested), an existing one adapted (a saved
or found recipe used as the starting point, wholly or in part), or a new one. Saved recipes always come first.

## 🛠️ LOGIC

```
// EXECUTION_START
SET mode = THERMOMIX (default)
  IF Luke says "without a Thermomix" / "no Thermomix" / "stovetop" / "conventional" THEN mode = CONVENTIONAL
  IF mode unclear from a pasted recipe (no TM settings, no bowl/MC/reverse wording) THEN keep THERMOMIX, flag it in footer

0. CHECK SAVED FIRST  read Memory/Long-Term/Recipes/recipes.md (+ frontmatter of candidate <slug>.md files)
     MATCH request AGAINST saved recipes BY dish name, key ingredients, method
       CASE same dish       THEN show it; ask: cook as is / modify it / find a different version
       CASE similar dish    THEN say what overlaps (e.g. "your Curry stock base has the same base"); ask:
                              use as-is · use PART (name which steps/rows) · use as STARTING POINT and change X
       CASE none            THEN go to the Source ladder
     STARTING POINT / PART ➔ copy the saved recipe into a working draft; apply Luke's changes (add/remove/swap ingredients or
       steps, scale, Thermomix ⇄ conventional); the saved original is NEVER edited. Record lineage: `based_on: <slug>` in frontmatter
       and "Based on <Dish>" in the notes. A modified recipe is saved as a NEW entry (step 7), never over the original
       unless Luke says "overwrite".
     IF Luke gave a pasted recipe / URL THEN skip the similarity search and go to PARSE (still offer a saved match if obvious)

ASSERT recipe source exists
  ELSE dish name only → FIND per "Source ladder" below, cite the source URL
  ELSE nothing usable → ask Luke; never invent quantities

1. PARSE  recipe ➔ ingredients (qty, unit, name) + ordered steps
     each step records: inputs (ingredients or earlier step outputs), verb, time, heat/equipment
     THERMOMIX: keep settings verbatim as "time/temp/speed" (e.g. "5 sec / speed 6", "7 min / 100°C / speed 1"),
       plus REVERSE / MC OUT / Varoma / butterfly where stated; equipment = Thermomix (+ model if the source names one)
     CONVERSION (mode = CONVENTIONAL, or a source that has no TM settings): see "Without a Thermomix" below
2. BUILD graph  step nodes ➔ edges from inputs
     leaf steps act on ONE ingredient (dice, measure, preheat)
     merge steps act on many; final step = the dish
3. ORDER rows by first use (NOT recipe-list order)
     rows that merge in a step MUST be adjacent → reorder to make every merge contiguous
       IF two merges force a non-contiguous span THEN split the step or repeat the shared item
         and note it under the table
4. LAYOUT columns = step depth (longest path from a leaf)
     a step's cell spans exactly the rows it acts on
     a row with no step at a depth stays blank until its merge (line continues)
     merged cells stay merged in every column to the right until they join something else
     last column = one cell spanning all rows = finished dish
5. RENDER an HTML page (DEFAULT) = the SVG table inline + the ingredient list with a one-click copy button.
     Write it to System/Sandbox/<slug>.html and show it with SendUserFile (display: render). Also write <slug>.svg (the save step embeds it).
     Ingredient list: reference/ingredient_list.html (paste under the SVG; one <li> per ingredient, "qty unit name" exactly as
       in the table's ingredient cells, no prep words). The button copies the list as plain text, one line each; it falls back to
       select-and-copy if the clipboard is blocked, and its label says so. Reuse the page's colour tokens.
     IF Luke asks for ASCII THEN box-drawing table (┌ ┬ ┐ ├ ┼ ┤ └ ┴ ┘ │ ─) in a code block instead
     SVG spec: one rect per cell, merged cells = one tall rect spanning its rows (no lines inside a span);
       ingredient cells tinted, prep cells plain, step cells green-tint, last cell dish-tint and heavier border;
       text centred in its cell, ≤ 4 words per line, ingredient names bold; caption + footer facts under the table
       colours as CSS variables on :root with a prefers-color-scheme:dark override; bg rect explicit; no external assets
       worked example: reference/example_svg_table.py (curry stock base) — copy and edit rows/spans
     ingredient cell: "qty unit name" — prep goes in column 1, not the name
     step cell: verb + time/heat, ≤ 4 words per line; wrap, never truncate
     caption under table: "= <dish name>"
6. FOOTER (plain text, 3 lines max)
     Total time (critical path) · Hands-on time · Equipment · Source (URL, if any)
     Parallel note: which rows can be prepped in any order
7. SAVE  (Long-Term write → !Checkpoint applies)
     AWAIT Luke's yes to "Save to Recipes?"  — never save unasked; fail closed (no save) if unanswered
     slug = kebab-case dish name; READ Memory/Long-Term/Recipes/recipes.md first
     IF slug already listed THEN ask: overwrite / save as "<slug>-2" / skip
     WRITE Memory/Long-Term/Recipes/<slug>.svg (the table) and <slug>.md (template below, embedding the SVG)
       — in ASCII mode, the table goes verbatim into the .md instead and no .svg is written
     INSERT one line at top of the list in recipes.md: "- [<Dish>](<slug>.md) — <serves/time> · <source or 'own'> · saved <YYYY-MM-DD>"
       (targeted single-line insert; never rewrite the file)
     Recipes/_index.yaml is NOT touched — it describes the store's pattern, not each recipe; recipes.md is the one list
// EXECUTION_END
```

**Saved-recipe file template** (`Recipes/<slug>.md`)
```
---
type: reference
title: "<Dish>"
source: "<URL | 'own' | book/person>"
based_on: "<slug of the saved recipe this was adapted from | omit>"
serves: "<n>"
time_total: "<mins>"
time_hands_on: "<mins>"
equipment: [<Thermomix (model) | conventional items>]
mode: <thermomix | conventional>
saved: <YYYY-MM-DD>
---
# <Dish>
![<Dish>, tabular recipe](<slug>.svg)   <!-- ASCII mode: table code block verbatim instead -->
**Ingredients (scaled as saved):** <one line per ingredient, exact qty>
**Notes:** <tweaks / what worked — blank until Luke adds>
```

## 🔎 Source ladder (dish name or "find me a recipe for X")
```
1. Luke's own Memory/Long-Term/Recipes/recipes.md   ← step 0 above: exact match suggested, similar one offered as a starting point
2. mode = THERMOMIX:  thermo.kitchen  (~280 recipes; no login; robots.txt allows it)
     python3 reference/find_recipe.py search "<dish>" → get <url>
     = sitemap title match + schema.org Recipe JSON-LD → ingredients, steps with TM settings, times, yield
     IF no match THEN fall to step 3 and convert-to-Thermomix is NOT attempted — say "no Thermomix version found"
3. mode = CONVENTIONAL (or no Thermomix match):  WebSearch with allowed_domains
     PRIMARY  recipetineats.com   (Australian; reliable JSON-LD; fetched cleanly 2026-09-29)
     BACKUP   bbcgoodfood.com     (JSON-LD; fetched cleanly)
     then     python3 reference/find_recipe.py get <url>   (works on any page carrying schema.org Recipe data)
     Sites that block plain fetches (taste.com.au 403, seriouseats 402, realestate-style bot walls) are skipped, never bypassed.
4. Nothing found → say so; offer Luke a paste-in. Never invent.
Never access Cookidoo (subscription + login). Fetch ≤1 request/sec.
Show Luke the top 1-3 candidates (name · source · time) and let him pick unless one is an obvious match.
The table restates the method in Luke's own terms; cite the URL, don't paste the source's prose.
Cooking for Engineers is the origin of the TABLE FORMAT only — it is not a source (its site was down 2026-09-29).
```

## 🔁 Without a Thermomix (mode = CONVENTIONAL)
```
Rules: keep the recipe's logic and ingredient quantities; change only equipment and settings.
MAP each Thermomix operation TO a conventional one, marked ≈ (approximate, untested):
  chop / blend  N sec, speed s   → knife or food processor / stick blender; pulse until the same texture
  sauté / cook  N min, 100-120°C, speed 1 → saucepan, medium heat, stir often, same time (+~20% if pan is wide)
  simmer 100°C, speed 1-2        → gentle simmer, lid ajar, stir occasionally
  steam / Varoma                 → steamer basket over simmering water, same time
  knead (dough mode)             → stand mixer hook or by hand, same time ~ (hand: +5 min)
  weigh into bowl                → kitchen scale — keep the gram weights
  reverse / MC out               → drop (stir gently / lid ajar)
  whip cream, mill, emulsify     → whisk, or blender / jug
Footer must say: "Converted from Thermomix — times and textures ≈; check as you go." Equipment lists the real tools.
Save: source stays the original URL; add `converted_from: thermomix` to the frontmatter.
```

## ✅ OUTPUT
One HTML page (SVG table + ingredient list with copy button, shown via SendUserFile) + footer in chat, then the save question. After a save: one line naming the file written.

```
VERIFY every ingredient appears exactly once as a row ELSE fix
VERIFY every merged cell spans contiguous rows ELSE reorder (step 3)
VERIFY quantities match the source (scaled only if Luke asked) ELSE correct
VERIFY last cell spans all rows ELSE fix
VERIFY saved .md (and .svg) exist AND recipes.md row present ELSE report the partial write to Luke
CATCH [*] ➔ fall back to a numbered list, say why the table failed, ask Luke
```

ASCII reference shape (only used when Luke asks for ASCII; salsa cruda; a merge on rows 1–4, then a full-height join):

```
│ 4 tomatoes  │ Dice   │            │              │           │
│ ½ onion     │ Mince  │ Combine    │              │           │
│ 1 jalapeño  │ Mince  │ in a bowl  │ Add lime,    │ Rest 15   │
│ ¼ c cilantro│ Chop   │            │ salt, stir   │ min       │
│ 2 tbsp lime │ Measure├────────────┘              │           │
│ ½ tsp salt  │ Measure│                           │           │
```
