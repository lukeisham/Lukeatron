---
description: Update the README.md in the current directory. If the current directory is a skill directory (has a SKILL.md), writes a plain-language, non-technical README covering all of that skill's commands instead. Otherwise updates the product-space README per the readme skill's per-top-level-folder Folder Structure section.
allowed-tools: Bash(ls:*), Bash(find:*), Read, Write, Edit, AskUserQuestion
---

Update `README.md` in the current directory per the `readme` skill. Read
`~/.claude/skills/readme/SKILL.md` first if it isn't already loaded this
session — this command just runs its workflow end to end, it doesn't
duplicate the rules here.

## 0. Detect a skill directory first

Check whether the current directory contains a `SKILL.md`. If it does,
this is a **skill directory**, not a product root — follow the skill's
"Skill directories: a different kind of README" section instead of
everything below:
1. Find every command belonging to it (filename-prefixed slash commands,
   plus anything else the `SKILL.md` names by hand).
2. Write `README.md` in this same directory using the skill's template —
   plain language throughout, one heading per command in natural usage
   order, no internal/technical vocabulary (translate it, per the
   skill's guidance on writing for a non-technical reader).
3. Report which commands were covered and confirm the file was written.

Stop after that — don't fall through to the product-space workflow
below. If the user asked this command to process *every* skill directory
under a given folder (e.g. "generate a README for each skill in
`~/.claude/skills/`"), repeat steps 1–2 for each one found there, one
`README.md` per skill directory, and give one combined report at the end.

## 1. Product-space workflow

Only reached when step 0 didn't apply. Treat the current directory as
the product root unless `README.md` (or the product's other
Utopia/Synergy structure) clearly lives elsewhere — if genuinely
unclear, ask rather than guessing (skill step 1).

Run the skill's full workflow:
1. Read the existing `README.md` if present; preserve its intro as
   written unless it's missing, asked to be rewritten, or the product's
   scope has visibly changed.
2. Enumerate spaces in passes — top-level folders, then known
   `Ideation/`/`Specification/` sub-structure, then custom folders —
   applying the same-typed-collection-vs-custom-folder distinction
   throughout (skill step 3). Ask the user for a one-line description
   anywhere a folder's purpose can't be inferred.
3. Link named technologies in the prose to their canonical docs (skill
   step 4).
4. Regenerate the `## Folder Structure` section in full — one sub-heading
   per top-level folder (standard Utopia spaces and custom top-level
   folders alike), each with a scoped `Space | Purpose` table underneath
   *only* when that space has recognized sub-structure or custom folders
   to show (paths relative to that space, not the repo root); a space
   with no further structure gets just its sub-heading and purpose line,
   no table. Never a row per same-typed collection item, and no single
   combined table across spaces (skill step 5).
5. Write the file.
6. Report what changed: spaces, collections, and custom folders added,
   removed, or redescribed.

If no spaces exist yet, write the intro plus a `## Folder Structure`
heading with just a "no spaces exist yet" line under it — no
sub-headings, no tables (skill fallback).
