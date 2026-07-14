---
name: "!SkillDocs"
description: >
  Generate and maintain a thorough HTML documentation site for Claude skills — a docs/index.html
  overview per skill plus one HTML page per command, a top-level index.html linking every skill's
  docs, and a commands-directory index listing every command grouped by skill. Use when asked to
  document a skill, generate a docs site, write up a command's usage, or refresh docs after a
  skill's commands changed. Renamed from Keith's "docs" skill for clarity (distinct from
  !GenerateWiki, which produces MLA-cited knowledge articles on a topic, not skill documentation).
  Part of the Wayfinder suite.
type: Skill
status: Active
domain: "GeneralPurpose — Wayfinder suite (housed under PersonalResearch/Wayfinder alongside its siblings)"
intent: "Give every skill a browsable, self-contained HTML reference — deep per-command pages, not just a short README."
version: 1.0.0
dependencies: []
calibration:
  context: ["Personal Research", "Any"]
  level: Extended
  scope: Global
memory_footprint:
  read: []
  write: []
---


# Docs

Generates and maintains a **thorough, browsable HTML documentation
site** for Claude skills — distinct from the `readme` skill, which
keeps one short Markdown file per skill. Where a skill's `README.md`
(see the `readme` skill) is a quick, plain-language overview, this
skill's output is the deep reference: one full page per command,
written to actually teach a non-technical reader how and why to use it,
not just what it's called.

The two are complementary, not competing — a skill can (and typically
should) have both: `README.md` for someone skimming, `docs/` for someone
about to actually use the thing and wanting the full picture, including
the parts that are easy to get wrong.

## What this skill produces

For **one skill directory** (any folder containing a `SKILL.md`):

```
<skill>/
  SKILL.md
  README.md              (if the `readme` skill has been run here)
  docs/
    index.html            overview: what the skill does, cards linking to each command's page
    <command-name>.html    one per command: purpose, how to use, examples, gotchas, benefits
```

For the **general skills directory** (the folder containing multiple
skill directories as direct subfolders, e.g. `~/.claude/skills/`):

```
<skills root>/
  index.html              overview of every skill, linking to each one's docs/index.html
  <skill-1>/docs/...
  <skill-2>/docs/...
  ...
```

For the **commands directory** (the folder containing every slash
command's own `.md` definition, sibling to the skills root, e.g.
`~/.claude/commands/`):

```
<commands dir>/
  index.html              every command, grouped under a heading per skill it belongs to,
                            each linking out to its page in that skill's own docs/ folder
  <command-1>.md
  <command-2>.md
  ...
```

This third index doesn't duplicate any content — it's a directory of
links into the per-skill pages described above, organized by skill so
someone can find a command either by browsing the commands folder
directly or by browsing the skill it belongs to.

Every page is a **single, self-contained HTML file** — no external
stylesheets, scripts, fonts, or build step. They work by opening the
file directly in a browser, moved individually if needed, indefinitely
into the future without a server or an internet connection. All pages
share one embedded `<style>` block (see "Shared template" below) so the
whole site looks and feels consistent.

## `/docs-init`

The one command in this skill. It detects which of **three** situations
it's in from the current directory, and does the right thing — see the
command file for the exact mechanics. In short:

- **Run from a specific skill directory** → generate (or refresh)
  that one skill's `docs/`.
- **Run from the general skills directory** → generate docs for every
  skill under it that doesn't have any yet, refresh any that look
  stale, and rebuild the top-level `index.html` that links them all
  together.
- **Run from the commands directory** → rebuild its `index.html`: every
  command, grouped under a heading per skill, linking to that command's
  page in the skill's own `docs/` folder.

Detecting "the general skills directory" isn't about a fixed path —
check structurally: does the current directory contain **more than
one** subfolder that itself has a `SKILL.md`? If so, treat it as the
skills root. A single skill directory has its own `SKILL.md` directly
inside it, not scattered across several subfolders.

Detecting "the commands directory" is also structural, not a fixed
path: the current directory has **no** `SKILL.md` of its own, is full of
individual command `.md` files (each with a `description:` in its
frontmatter, no `name:` skill field), and has a sibling directory that
*is* a skills root per the check above (e.g. `commands/` next to
`skills/`, both under the same parent). If a folder full of command
files doesn't have that sibling skills root, there's nothing to link
into — say so rather than generating a broken index.

## Finding a skill's commands

Same method the `readme` skill uses for its own command-aware sections
— don't re-derive this differently:
- Slash commands whose filename is prefixed with the skill's name
  (`ideas-*.md` for `ideas`).
- Any other command the skill's own `SKILL.md` names by hand in its
  prose (e.g. `specs` naming `/synergy-init`, which isn't
  `specs`-prefixed).
- A skill with **no** slash commands at all (triggered by a phrase
  instead, e.g. `research`'s `research-scope` or `spike`'s
  `spike-scope`) is **not** a special case for page structure — it gets
  exactly one "command-equivalent" entry, named after its trigger phrase
  (`research-scope`, `spike-scope`), treated identically to a slash
  command everywhere in this skill: one card on `docs/index.html`, one
  full page (`research-scope.html`, `spike-scope.html`) covering all
  five sections from "What each command page covers" below, and one
  entry on the commands-directory index under that skill's heading. The
  only difference from a real slash command is cosmetic — the page's
  `<h1>` and card title read `research-scope` instead of
  `/research-scope`, since it isn't typed with a leading slash.

Some command files won't match any skill by either rule (e.g. a
standalone command with no `<skill>-` prefix and no skill naming it by
hand). These still belong in the commands-directory index — group them
under a final **"Other commands"** heading there, with just their
description from their own frontmatter and no link (there's no skill
`docs/` page for them to point at). Don't silently drop them from the
index just because they don't fit the skill grouping.

## `index.html` is always brief — no exceptions

Every `docs/index.html` (and the two top-level indexes) is a **short
overview plus cards that link out** — one or two paragraphs of what the
skill is for, then a card per command-equivalent. It never contains the
full Purpose/How to use it/Examples/Gotchas/Why-it's-worth-using content
directly, no matter how few commands a skill has. A skill with only one
command, or a phrase-triggered skill with no slash commands at all,
**still** gets the full content on its own separate page — the index
just has one card. Don't collapse "there's only one thing to link to"
into "so I'll just put the content here instead"; the whole site stays
predictable specifically because every index behaves the same way.

## Writing for a non-technical reader

Same discipline as the `readme` skill's skill-README guidance —
translate internal vocabulary rather than using it: "commit and push"
becomes "save your work and back it up online," "symlink" becomes "a
pointer to the one real copy," and things like frontmatter, subagents,
or which model is used never appear at all. If a command's mechanics
genuinely need explaining for the reader to use it correctly (a real
gotcha, not internal trivia), explain it in plain terms in that page's
**Gotchas** section — don't omit real, useful warnings just because
they're inconvenient to phrase simply.

## What each command page covers

This applies equally to a real slash command's page and a phrase-trigger
skill's single page (`research-scope.html`, `spike-scope.html`, etc.) —
see "Finding a skill's commands" above. Every command page is a
complete, standalone teaching page — thorough enough that someone who
has never used Claude Code could read it and know exactly what to
expect. Cover all five, in this order, and don't skip any of them for
the sake of brevity — that's the difference between this skill's output
and the `readme` skill's brief overview:

1. **Purpose** — what problem this command solves and when you'd reach
   for it, in plain terms, before any mechanics.
2. **How to use it** — the exact command, what (if anything) you type
   after it, and a plain-language walk-through of what happens step by
   step, including what it will ask you and when.
3. **Examples** — two or three concrete, realistic examples aimed at a
   non-technical reader: a short scenario, what you'd type, and roughly
   what you'd get back. Not abstract syntax — a story.
4. **Gotchas** — the things that trip people up: easy-to-miss
   preconditions, what happens if you run it at the wrong time or in
   the wrong place, anything it deliberately *won't* do that someone
   might expect it to. Be honest here; a gotcha section that only says
   nice things isn't doing its job.
5. **Why it's worth using** — the benefit, stated plainly and a little
   persuasively (this section can "sell" the command a bit) — what
   you'd have to do by hand without it, and why this is better.

## The commands-directory `index.html`

Unlike a skill's `docs/index.html`, this page describes nothing on its
own — it's purely a directory. Structure:

1. A short intro: what this folder is (every command available,
   including phrase-triggered ones), and that it's organized by which
   skill each belongs to.
2. One `<h2>` heading per skill that has at least one command, in the
   same order the top-level skills index lists them. **The heading text
   itself is a link** to that skill's `docs/index.html` (e.g.
   `<h2><a href="../skills/ideas/docs/index.html">Ideas</a></h2>`) — a
   reader who wants the skill overview rather than a specific command
   shouldn't have to leave this page and hunt for it separately. Under
   each heading, a **card grid — same `.card`/`.card-grid` markup as
   every other index page in this site**, one card per command: its name
   (with the leading `/`, or bare for a phrase trigger per "Finding a
   skill's commands" above), the same brief description used on that
   skill's own `docs/index.html` card, and a link to that command's full
   page — `../skills/<skill>/docs/<command-or-trigger>.html` relative to
   the commands directory (adjust the relative path if the two
   directories' actual relationship differs from that). Don't fall back
   to a plain bullet list here — the card style is what makes this page
   visually read as part of the same site as everything it links to.
3. A final `## Other commands` heading (**not** a link — there's no
   associated skill page to point at) for commands
   that didn't match a skill, per "Finding a skill's commands" above —
   still a card each, name and description, just with no link (there's
   no page to point at).

Regenerate this file in full each run, same as the top-level skills
index — it's a generated directory, not hand-edited content.

## The skill's own `docs/index.html`

One page, no separate command pages needed *unless* the skill has
commands (which it does here — `/docs-init`). Same overview shape as
every other skill's `docs/index.html`: what the skill is for, then a
card linking to `docs-init.html`.

## Checking whether existing docs are stale

When `docs/` already exists for a skill, don't regenerate it blindly —
check first:
- Does every command found (per "Finding a skill's commands" above)
  have a page? Missing pages are the clearest staleness signal.
- Does every existing command page correspond to a command that still
  exists? A page for a deleted or renamed command is stale and should
  be removed (and the index updated to stop linking to it).
- Spot-check a page or two against its command's current `.md` file
  for describable drift (a changed argument, a renamed flag, a
  materially different workflow) — a full byte-for-byte diff isn't
  necessary, but don't skip this check just because pages already
  exist.
- **Style drift**: does the page's embedded `<style>` block match "Shared
  template" below, byte-for-byte? A page written before a template
  refinement (e.g. before headings picked up the accent color) is stale
  even if its written content is still perfectly accurate — refresh the
  `<style>` block in place. This check is cheap (compare the block, not
  the whole file) and worth doing on every visit, not just when content
  seems off.

Regenerate only what's actually stale or missing; leave accurate,
current pages untouched rather than rewriting everything on every run.

## Every link is relative — no exceptions

Every `href` in every page this skill writes is a **relative path** —
`index.html`, `ideas-problem.html`, `../../index.html`,
`../skills/ideas/docs/ideas-problem.html`, and so on. Never an absolute
filesystem path (`/Users/.../skills/...`), never a `file://` URL. This
is what lets the whole site be moved, copied, or opened straight from
disk on a different machine and keep working without edits — a relative
`href` resolves against the *linking page's own location*, exactly like
on the web, so it doesn't matter where the site as a whole sits on disk.
When writing or checking a page, work out the relative path from that
page's own location to the target — breadcrumbs go up (`../../index.html`
from a command page two levels below the skills root), a sibling
command page is bare (`other-command.html`), a different skill's page
goes up and back down (`../../other-skill/docs/index.html`).

**Verify, don't just assert.** After writing or regenerating any page
with links (an index or a commands-directory index especially), check
every `href` on it two ways before calling the work done:
1. It doesn't start with `/`, `~`, or `file://` — a plain `grep -n
   'href="/\|href="file://\|href="~'` over the file should return
   nothing.
2. Each one actually resolves: from the linking file's own directory,
   join it with the `href` and confirm a real file exists there (e.g.
   `os.path.normpath(os.path.join(os.path.dirname(page), href))` in a
   quick script, or the equivalent by hand for a small number of links).
   A link that's syntactically relative but points at nothing is just as
   broken as an absolute one.

## Breakout notes (`.sidenote`)

A **breakout note** is a standing, site-level aside that isn't about any
one command — practical, "here's something worth knowing before you
proceed" information, aimed at the same non-technical reader as
everything else. This is a third callout category alongside `.gotcha`
(amber, a specific command's own pitfalls) and `.benefit` (green, why a
specific command is worth using) — visually its own thing, not a
variant of either:

- **A pale, pastel red background** (`--note-bg`), rounded corners
  (`14px`) — softer and more rounded than `.gotcha`/`.benefit`'s
  sharp-edged left-border style, since this reads as "heads up," not
  "warning" or "sales pitch."
- **A bold, centered title on its own line at the top**, in dark
  magenta (`--note-heading`) — a color chosen to complement the pastel
  red background, not clash with it. Use an `<h4>` for this (the site
  doesn't use `<h4>` anywhere else, so `.sidenote h4` styles it without
  touching the global `h1`/`h2`/`h3` accent-blue rule).
- Body text below the title, left-aligned, normal weight — plain
  paragraph(s), not centered.

```css
.sidenote{background:var(--note-bg);border-radius:14px;padding:16px 20px;margin:1.2em 0}
.sidenote h4{margin:0 0 8px;text-align:center;font-size:1.05rem;color:var(--note-heading)}
```

And the two new shared-template variables this depends on (add these to
`:root` and its dark-mode override alongside the existing ones — see
"Shared template" below for exactly where):

```css
--note-bg:#fdeef1;--note-heading:#8f1452
```
```css
--note-bg:#3a232a;--note-heading:#ff8fc4
```

Markup shape for any breakout note:

```html
<div class="sidenote">
<h4>Short, direct question or statement as the title</h4>
<p>The explanation, in plain language.</p>
</div>
```

**Use this style for any future breakout note of this kind** — not just
the Safari one below. If another site-wide caveat turns up later (a
different browser quirk, a note about how to actually open the site the
first time, whatever it turns out to be), give it this same treatment
rather than inventing a fourth visual language.

## The Safari local-file note

Relative links are correct (see above) and work fine in every browser
when this site is served over `http://`. But when someone opens a page
straight from disk (`file://`), **Safari specifically** refuses to
follow any link that climbs to a parent directory — which is most links
here, since the whole site is organized in nested folders — and shows
"Safari Can't Open the Page." This isn't a bug in the links; it's a
Safari-only local-file sandbox. The fix is a one-time Safari setting,
and it's fiddly enough (a menu, then a dialog, then a checkbox, then a
gotcha about refreshing not being enough) that it's worth getting the
exact sequence right rather than a vague paraphrase:

1. Turn on Safari's developer tools: **Settings → Advanced → "Show
   features for web developers."**
2. Open the new **Develop** menu → **Developer Settings…** — this opens
   a dialog, it isn't a menu item that does anything by itself.
3. In that dialog, check **"Disable Local File Restrictions."**
4. A plain refresh of the already-open page **won't** pick this up —
   close that tab or window, then open the link again fresh.

Because a first-time reader will hit this before they know to fix it,
**both top-level entry pages carry a standing note about it**, right
after their intro paragraph, as a breakout note per "Breakout notes"
above: `~/.claude/skills/index.html` and the commands-directory
`index.html`. Reuse this markup verbatim — it's aimed at a non-technical
reader, so don't tighten it into something more jargon-heavy when
regenerating these two pages, and don't let the four numbered steps
above drift back into a looser paraphrase:

```html
<div class="sidenote">
<h4>Browsing this in Safari?</h4>
<p>Turn on Safari's developer tools first — <strong>Settings → Advanced →
"Show features for web developers."</strong> Then open the new
<strong>Develop</strong> menu, choose <strong>Developer Settings…</strong>,
and check <strong>"Disable Local File Restrictions"</strong> in the
dialog that appears. One catch: a plain refresh won't apply it — close
the tab or window this page is open in, then click the link again to
open it fresh.</p>
</div>
```

This note belongs only on those two entry pages, not on every
individual skill or command page — anyone deep in the site already
either fixed it or arrived via a working link.

## Shared template

Every page embeds the same `<style>` block for a consistent, clean,
self-contained look — light/dark aware (`prefers-color-scheme`), no
external fonts or assets, readable at any width, **with real color, not
just a monochrome layout**: headings (`h1`/`h2`/`h3`) render in the
accent blue, so a command page's own section headings (Purpose, How to
use it, ...) carry the same accent color as card titles on an index
page — the two page kinds are meant to look like one consistent site,
not a colorful index bolted onto plain-text command pages. This is the
canonical block — reuse it **verbatim** on every command-or-trigger page
and every skill's `docs/index.html`:

```css
:root{color-scheme:light dark;--bg:#fff;--fg:#1a1a1a;--muted:#5f6368;--accent:#2d5be3;--card-bg:#f6f7f9;--border:#e2e4e8;--code-bg:#f0f1f4;--gotcha:#e0a000;--benefit:#2d9c5a;--note-bg:#fdeef1;--note-heading:#8f1452}
@media(prefers-color-scheme:dark){:root{--bg:#14161a;--fg:#e8e9ec;--muted:#9aa0a8;--accent:#7aa2ff;--card-bg:#1c1f24;--border:#2a2d33;--code-bg:#20232a;--gotcha:#e0a000;--benefit:#3ecb7e;--note-bg:#3a232a;--note-heading:#ff8fc4}}
*{box-sizing:border-box}
body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;background:var(--bg);color:var(--fg);line-height:1.65}
.wrap{max-width:760px;margin:0 auto;padding:48px 24px 96px}
h1{font-size:2rem;margin:0 0 0.2em;color:var(--accent)}
h2{font-size:1.35rem;margin-top:2.2em;color:var(--accent);border-bottom:1px solid var(--border);padding-bottom:0.3em}
h3{font-size:1.05rem;margin-top:1.6em;color:var(--accent)}
p{margin:1em 0}
.tagline{color:var(--muted);font-size:1.15rem;margin-top:0.3em}
a{color:var(--accent);text-decoration:none}
a:hover{text-decoration:underline}
.crumbs{font-size:0.88rem;color:var(--muted);margin-bottom:2em}
.crumbs a{color:var(--muted)}
.card-grid{display:grid;gap:14px;margin:1.5em 0}
.card{display:block;padding:16px 18px;border:1px solid var(--border);border-radius:10px;background:var(--card-bg)}
.card h3{margin:0 0 6px;font-size:1.05rem}
.card p{margin:0;color:var(--muted);font-size:0.95rem}
code,pre{background:var(--code-bg);border-radius:6px}
code{padding:0.15em 0.4em;font-size:0.9em}
pre{padding:14px 16px;overflow-x:auto}
pre code{padding:0;background:none}
.gotcha{border-left:3px solid var(--gotcha);padding:2px 16px;background:var(--card-bg);border-radius:0 8px 8px 0;margin:1em 0}
.benefit{border-left:3px solid var(--benefit);padding:2px 16px;background:var(--card-bg);border-radius:0 8px 8px 0;margin:1em 0}
.sidenote{background:var(--note-bg);border-radius:14px;padding:16px 20px;margin:1.2em 0}
.sidenote h4{margin:0 0 8px;text-align:center;font-size:1.05rem;color:var(--note-heading)}
.example{border:1px solid var(--border);border-radius:8px;padding:14px 18px;margin:1em 0;background:var(--card-bg)}
footer{margin-top:4em;padding-top:1.5em;border-top:1px solid var(--border);color:var(--muted);font-size:0.85rem}
```

The top-level skills `index.html` and the commands-directory `index.html`
use the identical block **except** `h1{font-size:2.1rem;...}` and
`h2{font-size:1.3rem;...}` (both still `color:var(--accent)`) — very
slightly larger, since those two pages are the entry points to the
whole site. Every other rule, including the color additions, is
byte-for-byte the same. Don't introduce a third variant; if the sizing
ever needs to change, change it here first, then apply it to both of
those two files specifically and nowhere else.

Keep this file (`~/.claude/skills/docs/SKILL.md`) as the single source
of truth for this template. If it's refined further, update the block
above first, then apply the change to every existing page site-wide —
don't let any page drift from what's recorded here.

## Committing

Once a skill's `docs/`, the top-level skills `index.html`, or the
commands-directory `index.html` has been created or updated, offer to
commit and push if the enclosing directory is a git repository — don't
do it silently, and don't assume one exists if it doesn't. When a single
`/docs-init` run in skills-root mode touches several of these at once,
one combined offer at the end is enough — don't ask separately for each
file.
