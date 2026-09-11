---
description: Generate <Product>.brief.md at the repo root — a thorough, external-consumer-facing summary of this product's capabilities/services and known limitations, synthesized from its Ideation description, PRD, and selected features. This is the only information other products get about this one when pulled in as a dependency via /specs-depend. Reviews with the user before offering to commit and push.
allowed-tools: Bash(ls:*), Bash(find:*), Bash(git:*), Read, Write, Edit, AskUserQuestion, Agent
---

Generate `<Product>.brief.md` at **this repo's root** — deliberately
outside every PDLC folder, even though this repo may use Utopia
internally, per the `utopia` skill's root-level exception for briefs
(this is the file `/specs-depend`, in the `specs` skill, pulls into
other products as a dependency). Read `~/.claude/skills/utopia/SKILL.md`
first if it isn't already loaded this session.

**Write for the intended reader**: a software designer on a *different*
product, deciding whether and how to build on top of this one, who will
have **no other information about this product** than what's in this
file. Thorough on capabilities, honest about limitations — this is the
whole picture they get.

## 1. Gather source material

Read whatever of the following exists — note plainly what's missing,
since the brief's thoroughness depends on what's available:

- `Ideation/<product>.<kind>.description.md` (the `ideas` skill's
  `/ideas-describe` output) — the comprehensive informal narrative.
- `Specification/<name>-PRD.spec.md` (or `<name>-PRD.spec.md` at the
  repo root — the `specs` skill's `/specs-prd` output) — requirements,
  goals, non-goals.
- Every `Ideation/Features/*.feature.idea.md` **with `inclusion:
  selected`** — per the `ideas` skill's "Feature idea frontmatter":
  those are the committed capabilities. Feature ideas still `proposed`,
  or explicitly `deferred`/`dropped`, are not things this product
  offers — don't describe them as capabilities, but do note deferred or
  dropped ones under limitations if they name something a consumer might
  reasonably expect and not find.
- `<name>.arch.spec.md`'s Gap Register, if that file exists (the `specs`
  skill's `/specs-architecture` output) — any `GAP-n` entry still open
  is a genuine known unknown worth surfacing as a limitation, not just
  an internal planning artifact.
- `<Product>.brief.md` itself, if it already exists at the repo root —
  this may be a refresh, not a first draft; treat existing content as a
  starting point to update, not something to blindly overwrite.

If none of the above exists, stop and say so — point at `/ideas-describe`,
`/specs-prd`, or `/ideas-feature` as what to run first, rather than
writing a brief with nothing behind it.

## 2. Draft with a Fable-backed subagent

Don't draft this yourself in the top-level session — **delegate it to a
subagent**, via the `Agent` tool, with `model: "fable"` and
`subagent_type: "Plan"` (run it in the foreground, i.e.
`run_in_background: false`, since step 3 needs its output). Synthesizing
a thorough, externally-honest capability summary from several internal
documents — deciding what's a capability worth telling an outsider
about, what's a limitation worth flagging, and reframing internal
language for a reader with zero other context — is exactly the kind of
judgment work this project's ideation→spec model policy reserves for
Fable.

Give the subagent everything gathered in step 1 and ask for two
sections:

- **Capabilities and services** — thorough, from the perspective of a
  software designer deciding whether to build on top of this product:
  what it does, what it exposes or offers, and enough concrete detail
  (not just feature names restated) that a real design decision could be
  made from it. Draw from the selected features, the PRD's requirements,
  and the description's narrative shape.
- **Known limitations** — drawn from the PRD's non-goals/out-of-scope,
  deferred/dropped features a consumer might otherwise assume exist, and
  any open Gap Register entries. State each plainly, not defensively —
  the point is to save the reader from finding out the hard way.

## 3. Review with the user

Present the draft before writing it — this file becomes another
product's entire understanding of this one, so it's worth a real look,
not a rubber stamp. If refreshing an existing brief, call out what
changed. Revise per feedback; this can iterate more than once.

## 4. Write the file

Write `<Product>.brief.md` at the repo root — never inside `Ideation/`,
`Specification/`, or any other PDLC folder, regardless of whether this
repo uses Utopia. `<Product>` matches the same name used elsewhere in
this repo (e.g. `Ideation/<product>.problem.md`'s product, or the repo
folder name).

## 5. Offer to commit and push

Offer — don't commit automatically, even in a Utopia repo where other
root-level changes might otherwise qualify for auto-commit (this is one
of that convention's named exceptions). This file's accuracy matters
beyond this repo, so it gets an explicit look before it lands.

## 6. Recommend refreshing dependents — don't attempt it

If this was a refresh of an existing brief (content actually changed,
not just a first draft), **tell the user to manually run `/specs-depend`
in each product that depends on this one**, so their copy of this brief
picks up the update. Don't try to do this yourself: this session is
scoped to this one product's directory and has no reliable visibility
into sibling product folders or which of them actually depend on this
product — that information lives in *their* `Ideation/<product>.dependencies.md`
files, not here. Write out the recommendation in plain terms; don't
enumerate specific dependent repos by name unless the user already told
you which ones they are, and never invoke `/specs-depend` yourself from
this command.

## Report

Summarize: which source material was found vs. missing, whether this was
a first draft or a refresh (and what changed), the review/commit
outcome, and whether a dependents-refresh recommendation was given.
