---
description: Generate or refresh a thorough HTML documentation site for Claude skills. Run from a specific skill directory to build that skill's docs/ (an index.html plus one page per command); run from the general skills directory to do this for every skill under it and rebuild a top-level index.html linking them all; run from the commands directory to rebuild an index.html listing every command grouped by skill.
allowed-tools: Bash(ls:*), Bash(find:*), Bash(git:*), Read, Write, Edit, AskUserQuestion
---

Generate or refresh the HTML documentation for one or more Claude
skills, per the `docs` skill. Read `~/.claude/skills/docs/SKILL.md`
first if it isn't already loaded this session — this command runs its
process, it doesn't duplicate the rules here.

## 1. Detect what the current directory is

- **Contains its own `SKILL.md`** → this is one specific skill
  directory. Go to "Single-skill mode" below.
- **Contains more than one subfolder that itself has a `SKILL.md`** →
  this is the general skills directory. Go to "Skills-root mode" below.
- **No `SKILL.md`, full of individual command `.md` files, with a
  sibling directory that qualifies as a skills root** (e.g. `commands/`
  next to `skills/`) → this is the commands directory. Go to
  "Commands-directory mode" below.
- **None of the above** → say so and stop; ask the user to run this
  from one of the three.

## Single-skill mode

1. Read the skill's `SKILL.md` in full.
2. Find every command belonging to it, per the `docs` skill's "Finding
   a skill's commands" — filename-prefixed slash commands, plus
   anything else the `SKILL.md` names by hand, plus (for a skill with no
   slash commands at all) its one phrase trigger, treated exactly like a
   command under a name derived from the phrase (`research-scope`,
   `spike-scope`).
3. If `docs/` doesn't exist yet: create it, write `docs/index.html`
   (a brief overview — never the full content, see the `docs` skill's
   "`index.html` is always brief — no exceptions," even when there's
   only one card to show), and write one full page per
   command-or-trigger covering all five required sections (Purpose, How
   to use it, Examples, Gotchas, Why it's worth using), per the `docs`
   skill.
4. If `docs/` already exists: check it for staleness per the `docs`
   skill's "Checking whether existing docs are stale" — missing pages,
   pages for commands that no longer exist, content that's visibly
   drifted from the command's current behavior, or a `<style>` block
   that no longer matches "Shared template" byte-for-byte (e.g. an older
   page missing the accent-colored headings). Regenerate only what's
   actually stale or missing; leave the rest untouched.
5. Every page uses the shared `<style>` template from the `docs` skill's
   "Shared template" **exactly as written there, byte-for-byte** —
   self-contained, light/dark aware, no external assets, and with
   colored (`accent`) `h1`/`h2`/`h3` headings so the page doesn't read
   as flat text next to the rest of the site. Every `href` on it is a
   relative path, never an absolute filesystem path or `file://` URL,
   per the `docs` skill's "Every link is relative."
6. Report what was created vs. updated vs. left alone, and offer to
   commit and push if this directory is inside a git repository.

## Skills-root mode

1. List every direct subfolder that contains a `SKILL.md` — these are
   the skills to process.
2. For each one **without** a `docs/` folder yet: run the full
   Single-skill mode process against it (steps 1–5 above).
3. For each one **with** an existing `docs/`: run the staleness check
   from Single-skill mode step 4 and regenerate only what needs it.
4. Once every skill's `docs/` is current, **rebuild the top-level
   `index.html`** in the skills root: a short explanation of what this
   directory is (a collection of Claude skills), followed by one card
   per skill linking to that skill's `docs/index.html`, each with a
   brief one- or two-sentence description pulled from its own overview
   — not the full pitch, just enough to know which one to click into.
   Replace this file in full each run; it's a generated index, not
   hand-edited content. Every link relative — verify per the `docs`
   skill's "Every link is relative" (no `href="/..."`, no `file://`,
   and each one actually resolves to a real file relative to this
   page's own location) before moving on. Include the Safari local-file
   note (`docs` skill's "The Safari local-file note," reused verbatim,
   styled as a breakout note per the `docs` skill's "Breakout notes")
   right after the intro paragraph — this is one of the two pages it
   belongs on.
5. If a sibling commands directory exists (per the detection check
   above, from the skills root's own parent), run "Commands-directory
   mode" against it too, as part of this same run — the two indexes
   should stay in sync with each other.
6. Report, per skill: created, updated (and what changed), or left
   alone (already current) — plus confirmation the top-level index (and
   the commands index, if touched) was rebuilt. Offer to commit and push
   once, covering everything this run touched, if the skills root is
   inside a git repository.

## Commands-directory mode

1. List every command `.md` file in this directory.
2. For each, determine which skill it belongs to per the `docs` skill's
   "Finding a skill's commands" — filename prefix match first, then
   check whether any skill's `SKILL.md` names it by hand. Commands
   matching neither go in a final "Other commands" group. Also account
   for any phrase-triggered skill (no `.md` command file of its own) —
   it still gets a heading and one card here, per the same rule.
3. Rebuild `index.html` in full, per the `docs` skill's "The
   commands-directory `index.html`": an intro, one `<h2>` per skill with
   at least one command (same order as the skills-root index) **with the
   heading text itself linking to that skill's `docs/index.html`**, a
   **card grid under each** — same `.card`/`.card-grid` styling as every
   other index page in the site, not a plain bullet list — one card per
   command with its brief description and a link to
   `../skills/<skill>/docs/<command-or-trigger>.html`, then an `## Other
   commands` heading (plain text, not a link — no skill page to point at)
   with its own card grid (no links) for anything unmatched, if any
   exist. Include the Safari local-file note (`docs` skill's "The Safari
   local-file note," reused verbatim, styled as a breakout note per the
   `docs` skill's "Breakout notes") right after the intro paragraph —
   this is the other of the two pages it belongs on.
4. **Verify before reporting done** — this page has the most links of
   anything this skill produces, so check it explicitly rather than
   assuming the writing step got every one right: confirm no `href`
   starts with `/`, `~`, or `file://`, and that each one — resolved from
   this file's own directory — actually points at a file that exists
   (e.g. `../skills/ideas/docs/ideas-problem.html` from
   `commands/index.html` should resolve to a real file at
   `skills/ideas/docs/ideas-problem.html` one level up from `commands/`).
   Fix anything that doesn't check out before moving on.
5. Report what the index now contains, and offer to commit and push if
   this directory is inside a git repository (skip the offer if this run
   was reached from Skills-root mode step 5 — that step's own combined
   offer already covers it).
