---
name: "!Readme"
description: >
  Keep a product's root README.md current — a brief intro plus a map of what each top-level space
  (folder) is for. Use when a space is added, removed, or repurposed; when asked to "update the
  README," "explain the folder structure," or when a new product repo's README needs its first
  draft. Also writes a distinct plain-language README for a skill directory itself (for someone
  deciding whether to use it — no technical vocabulary). Part of the Wayfinder suite (from Keith).
type: Skill
status: Active
domain: "PersonalResearch (coding / amateur builds) — Wayfinder suite"
intent: "Keep a product's folder-structure map honest as spaces are added or repurposed, without technical jargon leaking into a skill's own README."
version: 1.0.0
dependencies: []
calibration:
  context: ["Personal Research"]
  level: Extended
  scope: Global
memory_footprint:
  read: []
  write: []
---


# Readme

One of the applications built on **MarkAs** conventions (files, folders,
and naming, per "convention over configuration") as part of **Synergy**.
Maintains one document: the product root `README.md`. It stays brief on
purpose — a map, not documentation. Detail belongs inside each space, not
duplicated here. Run `/readme-update` from the product root to apply this
skill's workflow end to end.

## What the README contains

1. **Intro** — a short paragraph on what the product is. Hand-written or
   refined over time; don't regenerate it wholesale once it exists unless
   asked to.
2. **Folder Structure** — a `## Folder Structure` section: one sub-heading per
   top-level folder (space) in the repo, not one combined table. Each
   sub-heading carries a short purpose line (and the owning skill/method,
   if any). Under a sub-heading, if that space has recognized
   sub-structure (`Ideation/` and `Specification/`'s known collections,
   per the `ideas` and `specs` skills) or user-made custom folders, add a
   small table scoped to just that space — see "Same-typed collections
   vs. custom folders" below. A space with no further structure gets only
   the sub-heading and purpose line, no table. Custom top-level folders
   (ones outside the standard Utopia set) get the exact same treatment as
   `Ideation/`, `Specification/`, `Projects/`, etc. — a sub-heading, and
   their own table if they have sub-structure worth showing. No table
   ever repeats a row per item inside a collection.

## Same-typed collections vs. custom folders

A **same-typed collection** is a folder whose children are all instances
of one thing, produced by the normal, routine use of a skill's workflow:
`Ideation/Ideas/` (raw notes), `Ideation/Solutions/` (candidate
solutions), `Ideation/Features/` (feature ideas), `Ideation/Issues/`
(integrity issues), `Specification/_Spikes/`, `Specification/_Builds/`,
`Specification/_Refactors/`, `Specification/_Changes/` (subtasks, plus
their `_Done/` — always skipped), and the Utopia activity folders
`Projects/`, `Evolutions/`, `Recursions/` (one subfolder per sub-project,
evolution, or recursion). This list isn't closed — the same shape (a
folder that accumulates one-per-item output from routine work) can show
up anywhere a skill defines a typed, repeatable file or folder pattern.

**A collection gets exactly one row**, in its top-level space's table,
describing what it's for (and optionally how many items it holds, e.g.
"7 feature ideas") — never a row per feature idea, per build spec, per
spike project, per sub-project folder. Every item inside was still
"purposefully created" in the everyday sense of using the product, but
that's routine use, not an organizational decision worth surfacing in a
map document.

**A custom folder gets its own row** in its enclosing space's table — or,
if it *is* a top-level folder itself (a folder at the repo root outside
the standard Utopia set), its own heading and table, exactly like
`Ideation/` or `Specification/` get. It's custom when it does more than
add one more instance of the collection's item shape — it introduces an
extra layer of organization the user chose:
- A grouping folder inside a collection that buckets a subset of the
  collection's items under a name the user picked — e.g.
  `Ideation/Features/Auth/` bucketing several related feature ideas, or
  `Specification/_Builds/Payments/` grouping a subset of build specs by
  subsystem. This is the "custom folder organising sets of features or
  ideas" case.
- A collection item that has outgrown the collection's normal flat shape
  by growing its own internal structure — most often a `Projects/<Name>/`,
  `Evolutions/<Name>/`, or `Recursions/<Name>/` that has become a nested
  product with its own PDLC folders. Give it one row noting it's a nested
  product; point to its own `README.md` (scaffold one with this skill if
  it doesn't have one yet) rather than inlining its internal map here —
  same brevity principle as the root document.
- Any other folder anywhere in the tree — inside `Implementation/`, at
  the repo root, inside a collection, inside another custom folder — that
  doesn't match a known collection's per-item pattern at all. Treat it
  like today's fallback: peek at a few files to infer its purpose, or ask
  the user for a one-line description rather than guessing. A named
  subsystem folder (`Implementation/CosmicApp/`,
  `Implementation/Packages/CosmicKit/`) is the common case here — each is
  distinct enough in kind and name to be worth its own row, unlike
  routine per-item files.

This distinction is recursive, not just top-level: apply it inside any
custom folder you find (it may itself contain further custom
sub-groupings), and stop descending once you're back to ordinary,
same-typed leaf items.

## Skill directories: a different kind of README

Everything above is for a **product** root. A **skill directory** — any
folder containing a `SKILL.md` file, whether under `~/.claude/skills/`,
a plugin's skill folder, or a project-local one — gets a completely
different README, because it has a completely different reader.
`SKILL.md` is written for Claude: instructions, file conventions, model
policy, internal machinery. The skill's `README.md` is written for the
**person** deciding whether and how to use the skill — someone who may
have no technical background at all. Never generate a skill's `README.md`
by summarizing or trimming its `SKILL.md`; write it fresh, for that
reader.

**Detection**: before running the product-space workflow below, check
whether the target directory itself contains a `SKILL.md`. If it does,
this is a skill directory — use this section instead of "Find the
product root" onward. (A product repo can of course *contain* skill
directories somewhere inside it, e.g. a project-local `.claude/skills/`
— those get the same skill-README treatment individually; it doesn't
turn the whole repo into a skill directory.)

**Find every command that belongs to it.** A skill's commands aren't
always declared anywhere machine-readable — collect them from:
- Slash commands under `~/.claude/commands/` (or the project's own
  `.claude/commands/`) whose filename is prefixed with the skill's name
  (`ideas-*.md` for the `ideas` skill) — the reliable, mechanical signal.
- Any other command `SKILL.md` explicitly names in its own prose (e.g.
  `specs` naming `/synergy-init`, which isn't `specs-`-prefixed but is
  still one of its commands) — read the skill file, don't rely on
  filename matching alone.
- If the skill has no slash commands at all (it triggers on a phrase or
  natural-language request instead — e.g. "research-scope" text, or "spike
  this"), there's no Commands section; describe how to start it in plain
  language instead (see template below).

**Template** — adapt section-by-section, but keep every command under
its own heading, in the order someone would naturally reach for them
(the skill's own described workflow order, not alphabetical):

```markdown
# <Skill's plain-language name>

<One or two sentences: what problem this solves for the reader, and
when they'd reach for it. No jargon — say what happens for them, not
how it works internally.>

## What it does

<A few sentences of plain-language detail — expand on the intro, still
no implementation talk (no file formats, no internal step numbers, no
mention of subagents/models/delegation — none of that is the reader's
concern).>

## Getting started

<Only if the skill needs one-time setup before its main commands make
sense (e.g. a scaffolding step). Omit this section entirely if there
isn't one — don't manufacture a setup step that doesn't exist.>

## Commands

### /command-one

<What it does, in plain language. When you'd use it. What it will ask
you, if anything. What you'll have afterward.>

### /command-two

<Same shape, one heading per command, in the order they're normally
used.>

## A typical walkthrough

<Optional: a short, concrete, narrative example — "Say you want to...
you'd run X, then it asks you Y, then...". Skip if the Commands section
already makes the order obvious on its own.>

## What it creates

<Only if relevant: in plain language, what files or folders show up as
a result of using this skill, and roughly what's in them — not their
exact internal format, just enough that the reader recognizes them
later and knows they're safe to open and read.>
```

For a skill with no slash commands (triggered by a phrase instead),
replace "## Commands" with something like "## How to start it," plainly
stating the trigger phrase and what happens next — still no jargon about
*why* it's built that way.

**Writing for a non-technical reader** means translating, not just
omitting, internal vocabulary: "commit and push" becomes "save your
work and back it up to your online copy"; "symlink" becomes "a pointer
file, so there's only ever one real copy"; "frontmatter" or "YAML"
shouldn't appear at all — describe what the setting *does*, not how
it's stored. If a concept genuinely has no plain-language equivalent and
the reader needs to know it to use the skill, explain it in a sentence
the first time it comes up rather than assuming it.

**Where it goes**: `README.md` inside the skill's own directory,
alongside its `SKILL.md` — never mixed into `SKILL.md` itself, and never
written to the product root (that's the product README's job, covered
above).

## Workflow

1. **Find the product root** — the directory `README.md` belongs in. If
   unclear, ask.

2. **Read the existing `README.md`** if one exists. Preserve the intro
   paragraph(s) as written unless the user asks for a rewrite or the
   product's scope has visibly changed since it was last touched.

3. **Enumerate spaces**, in passes. Skip hidden/system folders (`.git`,
   `node_modules`, etc.) and anything under `_Done/` throughout.

   a. **Top-level folders**, as before — every folder at the repo root,
      standard Utopia ones and custom ones alike. For each, determine its
      purpose: if it matches a known method's space (`Ideation/` →
      `ideas`, `Specification/` or `_Spikes/`/`_Builds/`/`_Refactors/`/
      `_Changes/` → `specs`), use that method's own description — don't
      re-derive it. Otherwise peek at a few files to infer purpose, or ask.

   b. **Known sub-structure**, one level into `Ideation/` and
      `Specification/` (or wherever their skills' folders live): add one
      row per collection found (`Ideation/Ideas/`, `.../Solutions/`,
      `.../Features/`, `.../Issues/`; `Specification/_Spikes/`, `.../
      _Builds/`, `.../_Refactors/`, `.../_Changes/`), per the
      one-row-per-collection rule above. For `Projects/`, `Evolutions/`,
      `Recursions/`, add one summary row for the activity folder itself;
      don't add a row per sub-project unless it qualifies as a custom
      folder (nested product or user-made grouping) per the section above.

   c. **Custom folders**, wherever the collection/custom-folder
      distinction above finds one — inside any collection, inside
      `Implementation/` or other unowned top-level folders, inside
      another custom folder. Add one row each; recurse as needed.

4. **Link technology references.** When the intro (or any other prose in
   the README) names a specific language, format, framework, or tool —
   e.g. Markdown, YAML, TOML, React — turn that name into a link to an
   introductory page on its canonical site (official homepage or
   getting-started/docs page, not a deep API reference). Leave links that
   already exist untouched, and don't link generic terms that aren't a
   named technology.

5. **Write/update the `## Folder Structure` section.** One sub-heading per
   top-level folder found in step 3a, in this order: Utopia PDLC/activity
   folders in their canonical order (Ideation, Specification,
   Implementation, Marketing, Delivery, Production, Retirement, Projects,
   Evolutions, Recursions) if the repo follows Utopia, then any custom
   top-level folders. Each sub-heading states the space's purpose and
   owning skill/method (if any) — state the owner once here, not per row.
   Immediately under a sub-heading, add a table — columns `Space |
   Purpose` — only when step 3b or 3c found recognized sub-structure or
   custom folders for that space; use paths relative to that space as row
   names (e.g. `Features/`, `Features/Auth/`), not full repo-relative
   paths, since the table is already scoped by its sub-heading. Omit the
   table entirely for a space with no further structure — just the
   sub-heading and purpose line. Never a row per same-typed collection
   item. Replace the whole `## Folder Structure` section on each run — it's
   a generated index, not hand-edited content.

6. **Report what changed** — which spaces, collections, and custom
   folders were added, removed, or had their description updated.

## When there are no spaces yet

Write the intro plus a `## Folder Structure` heading with a single "no
spaces exist yet" line under it — no sub-headings, no tables. See the
pattern in a freshly-initialized repo (`/synergy-init` creates this
skeleton).
