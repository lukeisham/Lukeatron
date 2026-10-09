# !Review — promoting a to-do into a new project (STEP 2)

> Reference file for `!Review`. Moved verbatim out of the skill file on 2026-10-09 (progressive disclosure). The skill file says WHEN to read it. Nothing here overrides a rule in the skill file.

```
  CREATE-A-PROJECT sub-procedure (mirrors the manual flow — Template_ProjectRegistry + _tracking.yaml):
    1. ID  — next free <PREFIX>-<NN> for that context, read from _tracking.yaml (max existing + 1).
    2. Slug — kebab-case the to-do text (trim filler like "project"/"app" only if it reads cleanly).
    3. Folder — create Memory/Medium-Term/Projects/<ID>-<slug>/ with registry.md + notes.md + empty documents/.
       registry.md from System/Templates/Template_ProjectRegistry.md: fill id, project(slug), title,
       context, created/updated = today, status Active; purpose SPECIALISES that context's Charter
       North Star; Definition of Done INHERITS the Charter baseline. Leave <placeholder>s where the
       one-line to-do gives no detail — do not invent scope. notes.md from Template_ProjectNotes.md
       (mandatory scratchpad — created alongside every registry, never one without the other).
    4. Index — append a row to _tracking.yaml (id, project, title, context, status Active, created,
       updated, path). Keep contexts grouped as the file already does.
```
