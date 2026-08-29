# CurriculumPreparation — Architecture Decisions

| Field | Value |
|---|---|
| **Type** | Architecture decisions |
| **Date** | 2026-08-22 (rev 17 — Change AJ) |
| **Status** | Draft — every decision here is reversible until code exists |
| **Parent** | [CurriculumPreparation.project.spec.md](CurriculumPreparation.project.spec.md) |

Each decision below was made on Luke's behalf while extrapolating the brief.
Overturn any of them freely at review — nothing has been built.

---

### AD-1 — The repo root sits under `System/Widgets/`

**Decision:** the spec repo and, later, the code live at
`System/Widgets/CurriculumPreparation/`, a peer of `Parser/`, `Generator/`
and `Dashboard/`.
**Rationale:** the product is exactly what `System/Widgets/` already holds —
offline, browser-viewable, single-file artefacts. Keeping it a peer means the
existing viewer/launch conventions apply unchanged.
**Rejected:** a folder under `Memory/Medium-Term/Projects/TE-10-…/` (memory is
for project *control*, not code); a separate repo outside `_Lukeatron/`
(would put the work outside the system's own tooling and raise the Impact gate
on every edit).

---

### AD-2 — Curriculum ingest is import-once, not live-fetch

**Decision:** the tool never calls a curriculum authority at runtime. The user
obtains an extract by hand as **plain text**, drops it into `_Ingest/`, and a
**Python script** digests it into the
[data model](CurriculumPreparation-datamodel.spec.md). *(Mechanism settled by
Luke in rev 3 — gate G-1 closed. See AD-16 for what "digest" means.)*
**Rationale:** FR-SYS-1 requires full offline operation, and a scraper against
a site we don't control is a permanent maintenance tax — multiplied by every
curriculum we support (AD-10). Import-once also makes the unit file
reproducible: the same input always yields the same tree.
**Rejected:** live API polling (fails FR-SYS-1; and whether a stable feed even
exists is [Q-1](CurriculumPreparation.project.spec.md#2-questions-this-spike-must-answer),
held as spike candidate #2); bundling a curriculum snapshot into the tool
(see AD-8 on copyright).

---

### AD-3 — SVG renders, HTML edits

**Decision:** each part is an inline `<svg>` render driven by a plain
JavaScript data object; all editing happens in HTML form controls beside or
over the SVG, which re-render it. No direct manipulation of the SVG canvas.
**Rationale:** satisfies FR-SYS-2 (SVG) and FR-SYS-3 (entry via HTML) at once,
and keeps "easily edited" true in both senses — the *document* is edited
through forms, and the *SVG source* stays clean, hand-readable markup that
Luke can open in a text editor or Illustrator later.
**Rejected:** `contenteditable` inside SVG (poor, uneven browser support for
text flow and printing); a canvas/WebGL renderer (unprintable at vector
quality, unreadable as source).

---

### AD-4 — PDF comes from browser print, not a bundled library

**Decision:** PDF output is the browser's own Print → Save as PDF, driven by
`@page { size: A4; margin: … }` and per-page break rules. No PDF library ships
with the tool.
**Rationale:** zero dependency, zero bytes, native vector fidelity, and it
keeps FR-SYS-1 honest. Print-to-PDF is universal on macOS.
**Rejected:** jsPDF / pdf-lib (adds a large embedded dependency, rasterises or
re-lays-out SVG, and duplicates a capability the OS already has);
headless-Chrome rendering (needs a process — fails "offline in a browser").
**Risk accepted:** print fidelity across browsers is
[Q-2](CurriculumPreparation.project.spec.md#2-questions-this-spike-must-answer)
and is the single most likely cause of a re-cut. Mitigation: the spike
measures a real printed sheet before any build starts.

---

### AD-5 — Persistence is a tiny local Python server inside each bundle

> **Revised twice.** Rev 1: a single downloaded JSON file. Rev 3: a unit folder
> via the File System Access API. **Rev 4: a local `serve.py` inside the
> bundle** — Luke's call, once the bundle became self-contained (AD-18).
> Each revision was forced by a fact that arrived later, and each was free
> because no code exists. This is the third and simplest answer.

**Decision:** every unit bundle contains its own `serve.py`. The browser page
talks to it over `localhost` to read and write `unit.json` and to store pasted
images in `images/`. No File System Access API, no directory handles, no
download blobs.
**Rationale:** it removes an entire class of problem rather than managing it.
The FSA route carried a permission lifecycle, stale handles, re-prompts on
session restart, and a crash-mat working copy in browser storage to compensate
— *all of which existed only because the browser couldn't be trusted with the
folder*. A local server can: it writes immediately, atomically, with no
permission model, and image paste becomes an ordinary POST. It also matches
the house pattern exactly — `System/Tools/project-dashboard/` and
`lukeatronwiki-viewer/` are already `python3 serve.py` + a `.command`
launcher (SR-6).
**Cost, stated plainly:** FR-SYS-1's "no server" is **gone**. The bundle is
still fully **offline** — no network request ever leaves the machine — but it
is no longer a file you double-click into a browser. It is a thing you start.
The `.command` launcher makes that one double-click, which is the same gesture,
but the distinction is real and shouldn't be glossed.
**Rejected:** File System Access API (the complexity above, for no gain now
that a server is acceptable); single file with base64 images (unreadable JSON);
download-blob per image (lands in Downloads, not the unit folder).
**Consequence:** Q-3 is answered and struck from the spike. `local-store`
shrinks to a thin client-side data layer, and a new `bundle-server` build owns
the Python side (AD-13's tier boundary).

---

### AD-6 — The spreadsheet export is CSV

**Decision:** "saved as a basic spreadsheet" (FR-MM-6) means UTF-8 CSV with a
BOM, one file per export.
**Rationale:** Luke said *basic*. CSV needs no library, is diffable, opens in
Excel, Numbers and Sheets, and cannot carry a macro. The BOM is what stops
Excel mangling non-ASCII on macOS.
**Rejected:** XLSX (needs an embedded writer library — a real dependency for
formatting nobody asked for); ODS (worse Excel support). XLSX stays on the
boundary list in the [project spec](CurriculumPreparation.project.spec.md#4-scope)
if formatting is later wanted.

---

### AD-7 — The three tiers are hard-coded, not configured

**Decision:** Pass/Intermediate/Advanced and Green/Blue/Orange are constants
in the code, enforced by INV-DM-1. There is no settings screen for them.
**Rationale:** the tiers are the product's spine — lesson pages 2–4 and matrix
bands are the *same three tiers*, and that identity is what makes the marking
matrix meaningful. Making them configurable would let the two halves drift.
**Rejected:** user-configurable tier count/labels (invites drift, triples the
layout cases, and pays for flexibility Luke has not asked for).

---

### AD-8 — Imported curriculum content stays local and attributed

**Decision:** curriculum text is treated as third-party content whatever its
source: stored verbatim (INV-DM-2), attributed from `unit.curriculum`
(`licence`, `attribution`), kept inside Luke's own project files, and **never**
bundled into the distributed tool or published from it. Each profile carries
its own attribution line, printed on that curriculum's outputs.
**Rationale:** curricula are published under their own copyright and licence
terms — VCAA's differ from another jurisdiction's. Making attribution a
*profile* field means supporting a new curriculum surfaces the question rather
than burying it.
**Rejected:** shipping a curriculum snapshot inside the tool; a single
hard-coded attribution string (wrong the moment a second curriculum arrives).

> **Downgraded in rev 3.** Rev 1 flagged this as "⚠️ verify before build" and
> made it a blocking task. That was the right call for a tool that might be
> shared; it is the wrong call for a **personal tool on Luke's own computer
> that publishes nothing to anyone**. A teacher reading a curriculum they are
> teaching, in a file on their own machine, is not a copyright question. The
> attribution field stays because it costs nothing and is simply correct — but
> it is no longer a gate, and the registry action drops from blocking to a
> note. *If this ever becomes a tool shared with other teachers, this decision
> reverts and the verification becomes mandatory again.*

---

### AD-9 — Lesson-plan generation is template-driven, not AI-driven

**Decision:** the in-browser generator composes a draft from the selected
curriculum node plus templates and Luke's own reusable fragments. It makes no
model call.
**Rationale:** FR-SYS-1 (offline) forbids a runtime call, and FR-LP-9 only
asks for a *draft to modify*. Richer AI-assisted drafting belongs upstream —
in a Lukeatron skill that writes into the project file — not inside the widget.
**Rejected:** an embedded model call (breaks offline); no generator at all
(FR-LP-9 asks for one — though whether it earns its keep is
[Q-5](CurriculumPreparation.project.spec.md#2-questions-this-spike-must-answer)).

---

---

### AD-10 — The core is curriculum-agnostic; curricula are profiles

**Decision:** the canonical node model knows nothing about any particular
curriculum. Each supported curriculum is a **profile** — a declarative adapter
carrying a field mapping, a label map for node kinds, and its own
licence/attribution. A **generic profile** (paste, then structure by hand) is
always available, so an unsupported curriculum can still be dumped in.
Victorian is profile #1, not the reference implementation everything else is
bent to fit.
**Rationale:** Luke wants to dump in other kinds of curriculum. The cheapest
way to be wrong here is to build for Victorian and generalise later — by then
Victorian assumptions are load-bearing in the importer, the renderer and the
lesson plan's citation format. Making the model agnostic *first* costs almost
nothing now; retrofitting it costs a refactor of every part. The generic
profile is what turns "supports many curricula" from a promise into a floor:
worst case, the tool degrades to structured hand entry rather than refusing.
**Rejected:** hard-coding Victorian and adding an abstraction layer later
(the retrofit tax above); a plugin system with executable adapters (a code
plugin is a security and maintenance surface a declarative mapping doesn't
have); supporting only curricula with machine-readable exports (would exclude
most of them — see Q-1).
**Consequence:** `unit.curriculum` becomes a first-class entity (INV-DM-10,
INV-DM-11), and Q-1b is added to the spike — two other curricula must be
mapped onto the model on paper before wave 2, because a model that only fits
Victorian is the wrong model and we should learn that cheaply.

---

### AD-11 — Orientation is a property of the part, not a user setting

**Decision:** the curriculum map is always A4 **landscape**, the lesson plan
always A4 **portrait**; only the marking matrix is user-selectable, and its
choice is stored on the matrix (INV-DM-13). *(Extended by Change E: the Unit
Assessment inherits the lesson plan's fixed portrait — it is a document of the
same kind, a written multi-tier artefact that needs height, not width. See
AD-23. The crib sheet stays user-selectable, unaffected.)*
**Rationale:** orientation here is driven by content, not taste. A horizontal
family tree needs width; a 4-page written document needs height. Fixing them
removes a setting nobody benefits from getting wrong, and lets each renderer
assume its own page geometry. The matrix genuinely varies — a narrow grid
suits portrait, a wide one landscape — so that one is a real choice.
**Rejected:** a global orientation setting (would force the tree and the
lesson plan to share, which is exactly what Luke asked against); storing
orientation on every document (invites a lesson plan that contradicts its own
part — forbidden by INV-DM-13).
**Consequence — this is the important one:** mixed-orientation printing in a
single browser print job is unreliable. That makes
[Q-2b](CurriculumPreparation.project.spec.md#2-questions-this-spike-must-answer)
the decider for gate G-2: if one print job can't carry both orientations,
"one artefact for all six parts" is **dead**, and separate documents on a
shared shell is forced rather than merely preferred. Do not let this be
discovered during wave 1. *(Updated to "six parts" — Change E/G/H; the
arithmetic this consequence rests on is unaffected, since the Unit Assessment
adds no new orientation value, only a second part sharing the lesson plan's
existing portrait one.)*

---

### AD-12 — Cross-links are derived on screen and printed as citations

**Decision:** forward references are stored (`lesson.nodeIds`,
`lesson.assessmentLink`); reverse edges — node → covering lessons, unit
assessment → its referencing lessons — are **derived by an index rebuilt on
load**, never stored (INV-DM-12). On screen they are navigable both ways;
**in print they render as human-readable citations** (codes, titles, lesson
numbers, student names) because paper cannot be clicked (FR-TR-6). *(Example
updated — Change F: `matrix.lessonId` no longer exists; the marking
matrix's relationship to the Unit Assessment is structural, not a stored
forward reference — see AD-24.)*
**Rationale:** storing both directions creates two sources of truth that drift
the first time something is deleted, and INV-DM-4 already forbids a dangling
forward reference — so the reverse index is free and always correct. The
print half matters more than it looks: a lesson plan taken into a classroom is
paper, and a link that only exists as a click is no link at all there.
**Rejected:** storing bidirectional edges (drift); links as screen-only
navigation (fails FR-TR-6 — the printed artefacts are the actual deliverable);
a separate "traceability report" document (a sixth artefact to maintain, when
the information belongs on the five that already exist). *(Count updated from
"four"/"three" across revisions as parts were added — Change E brings the
total to five.)*
**Consequence:** gaps must be *shown*, not hidden (FR-TR-8) — an outcome no
lesson covers, a lesson with no grid. A unit that looks complete but isn't is
the failure mode this whole decision exists to prevent.

---

### AD-13 — Two tiers: Python serves and ingests, the browser renders and edits

> **Revised in rev 4.** Rev 3 said "Python is strictly a *preprocessing* step;
> the browser never depends on it at runtime," on the grounds that needing a
> running process would cost the double-click property. AD-5 traded that away
> deliberately, and the `.command` launcher buys the gesture back. The tier
> *boundary* survives unchanged; only its shape moved.

**Decision:** the system is **Python + vanilla JS, and nothing else** — no
framework, no package manager, no build chain, no dependency beyond the Python
standard library (SR-2, PY-1, JS-7). The tiers are:

| Tier | Owns | Never does |
|---|---|---|
| **Python** (`serve.py`, `ingest.py`) | serving the app, all filesystem I/O, the plain-text ingest | rendering, layout, document logic |
| **Browser** (vanilla ES modules) | rendering, editing, layout, print | touching the filesystem directly |

All file access goes through the server. The browser never reads or writes a
file itself, and the server never renders a document.
**Rationale:** Luke's constraint, and a good one. A personal tool that outlives
its dependencies is worth more than one that was pleasant to write once — every
package added is a thing that breaks in two years when Luke opens this again.
The tier split keeps each side testable alone: the server can be exercised with
`unittest` and no browser, the renderer with a fake DOM and no server (TEST-8).
**Rejected:** any JS framework (four documents and a tree layout — vanilla is
genuinely sufficient, and JS-7 forbids it by default); a bundler (nothing to
bundle); doing the ingest in JS (text-wrangling is Python's job, and it runs
once per unit); letting the browser hold filesystem state alongside the server
(two writers, one folder — the drift bug this project can least afford).

---

### AD-13a — The whole build follows the Vibe Coding Rules

**Decision:** `Memory/Long-Term/Coding/vibe-coding-rules.md` is binding on every
file in this project. The rules that bite hardest here, named so they are not
rediscovered mid-build:

| Rule | What it forces on this project |
|---|---|
| **SR-2 / PY-1** | Python **standard library only**. `http.server`, `json`, `pathlib`. No pip, no venv, no `requirements.txt`. |
| **JS-7** | No build step, no framework, no bundler. Vanilla ES modules served directly. |
| **SR-6** | Match the neighbours: `System/Tools/project-dashboard/serve.py` and `lukeatronwiki-viewer/serve.py` are the reference for `serve.py`, the `.command` launcher and the `README.md`. Read them before writing ours. |
| **SR-1 / PY-2 / CSS-1** | One file, one job. CSS files under 150 lines, split when they grow. |
| **CSS-2** | Custom properties from a single `variables.css`. No hardcoded value that belongs in a token. |
| **SR-7** | The bundle's docs carry **architecture only** — decisions, navigation, cross-module behaviour, ASCII life-cycle and layout diagrams. Never a walkthrough of function bodies. |
| **SR-8** | Comments explain *why* and *how this connects*, never history. No "changed in rev 3" comments in code. |
| **SVG-1…5** | `viewBox` always; painter's-model ordering, no `z-index`; `fill`/`stroke`, not `background-color`/`border`. |
| **HTML-6 / JS-6** | Escape everything interpolated. Never `innerHTML` with unit content — it is Luke-authored but still untrusted input to a renderer. |
| **TEST-1…9** | `unittest` for Python, `node:test` if JS tests appear. Smoke tests, three assertions per module, `tests/` beside the source. Hand-built fakes, no jsdom. |

**Consequence:** the bundle needs **its own style guide and token set**, mirroring
`System/Widgets/Parser/_shell/StyleGuide/` (SR-6, CSS-2). That is a build, not
an afterthought — filed as `style-guide` in wave 1.

---

### AD-13b — The bundle server writes, and is scoped so that it may

> **This is a deliberate, narrow departure from a house rule. Read it before
> assuming the rule was forgotten.**

**The rule:** PY-12 says "viewers never write" and API-5 states the stronger
Lukeatron form — "localhost tools do not write at all." Both were written for
`System/Tools/` viewers, whose data is `Memory/`, and whose write path would be
a Long-Term memory mutation — `!Checkpoint` territory.

**Why this is different:** a unit bundle is **not a viewer over `Memory/`**. It
is a self-contained application whose data is its own folder, which may live
anywhere on disk — outside `_Lukeatron/` entirely (AD-18). It never reads or
writes `Memory/`, so the mutation PY-12 exists to prevent cannot occur.

**Decision:** `serve.py` may write, and is **hard-scoped to its own bundle
root**:

- binds **`127.0.0.1` only** — never `0.0.0.0`;
- resolves every requested path and **refuses anything that escapes the bundle
  root** after resolution (the path-traversal guard);
- writes only `unit.json` and files under `images/`;
- refuses to start if its root doesn't look like a unit bundle.

**Rationale:** the intent of PY-12 is preserved and made enforceable rather than
merely conventional. A scope check the code performs beats a rule the code
merely obeys.
**Rejected:** keeping the tool read-only (it has to save Luke's work — that is
the product); a write path with no root check ("it's localhost" is how path
traversal gets shipped); writing anywhere under `_Lukeatron/` (bundles are meant
to be portable and independent).
**Not done until TEST-7's two tests exist:** a path outside the bundle root is
**refused**, and a path inside it **passes**. Same for the bind address.

---

### AD-13c — The mockups' colour and layout choices are the style guide's source values (New — Change X)

**Decision:** the `style-guide` build (wave 1, still *spec pending* — AD-13a) does not
invent its palette, radii or type scale. It transcribes the values already decided,
screen by screen, across `_Mockups/` during rev 1–11. Those values are canonical from
this point forward; a future `style-guide.build.spec.md` **must** derive `variables.css`
from the table below, not from a fresh design pass.

| Token | Value | Established in |
|---|---|---|
| `--bg` | `#faf9f5` | every artboard's root background |
| `--card` | `#fff` | card/sheet surfaces |
| `--ink` | `#1a1a17` | primary text |
| `--ink2` | `#5f5e5a` | secondary text |
| `--ink3` | `#9a9891` | tertiary / muted text |
| `--line` | `#e3e1d9` | hairline borders |
| `--line2` | `#c9c7bd` | stronger borders, dashed "none" state |
| `--acc` | `#185FA5` | links, the Intermediate tier, the coverage grid's accent |
| `--accbg` | `#E6F1FB` | accent tint background |
| `--radius` | `8px` | cards, buttons, sheets |
| Font stack | `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif` | every artboard's `body` rule |
| Border style | flat, `1px solid`, **no shadows** except floating overlays (pickers, menus) | house rule, unbroken across 12 artboards |
| Tier — Pass | line `#1F6B41` · tint `#E4F4E9` · ink `#14502F` | `MatrixGrid.dc.html`, `LessonPlan.dc.html` |
| Tier — Intermediate | line `#185FA5` · tint `#E6F1FB` · ink `#0C447C` | same |
| Tier — Advanced | line `#9A4E12` · tint `#FCEEE2` · ink `#703508` | same |
| Coverage cell — full | solid `#185FA5`, border `#0C447C` | `Main.dc.html` |
| Coverage cell — partial | `#185FA5` border, `linear-gradient(135deg,#B5D4F4 0 50%,#fff 50% 100%)` fill | same |
| Coverage cell — none | `1px dashed #c9c7bd`, `#fff` fill | same |
| Completion — complete | solid `#0F7B6C` *(Change AG — was `#1F6B41`, the Pass tier's own green)* | `LessonsAndTopics.dc.html`, `LessonsAndTopicsPrint.dc.html` |
| Completion — not yet | white fill, `#c9c7bd` outline | same |
| Completion — row tint | `#E0F3EF` *(Change AG — was `#F4FAF6`)* | same |
| Category accent — Teal | line `#0F7B6C` · tint `#E0F3EF` · ink `#0B5245` *(New — Change AG)* | `LessonsAndTopics(Print).dc.html` (Complete status), `CribSheet.dc.html`, `CribSheetScreens.dc.html` (upper/Skills half), `Resources.dc.html` (`text` item kind) |
| Category accent — Violet | line `#6E4FA3` · tint `#EEE8F8` · ink `#4A3172` *(New — Change AG)* | `LessonsAndTopics(Print).dc.html` (In progress status, assessment kind tag), `Resources.dc.html` (`link` item kind) |
| Category accent — Rose | line `#B23A6B` · tint `#FBE7EF` · ink `#7A2249` *(New — Change AG)* | `CribSheet.dc.html`, `CribSheetScreens.dc.html` (lower/Knowledge half), `Resources.dc.html` (`image` item kind) |

**Open, recorded here rather than silently resolved:** the Big idea box on the lesson
plan (rev 11 mockup change, Luke's request) was recoloured to the **Pass** tier's exact
values — `#1F6B41`/`#E4F4E9`/`#14502F` — reusing an existing tier token rather than a new
one. It sits roughly 300px from the Pass tier's own tiered-work card on the same page. Two
readings are both defensible: (a) reuse is correct — the Big idea box was never meant to
carry tier meaning, so borrowing an existing token is exactly what CSS-2 wants, and the
distance and different framing (box vs. card) make confusion unlikely; or (b) the box needs
its own token, distinct from any tier, precisely because sharing Pass's exact values risks
being read as "this idea is Pass-tier." Not resolved here — Luke's call whichever way it
is spec'd.
**✅ RESOLVED (rev 13) — reading (a).** Luke: "they are related in a vague [way], so leave it
as is." The Big idea box keeps the Pass tier's exact token values; no new token is introduced.

**Also recorded, not resolved:** the print artboards' body type (`MarkingMatrix.dc.html`,
`MatrixSetupPrint.dc.html`, `CribSheet.dc.html`, `LessonsAndTopicsPrint.dc.html`) runs
11–13.5px throughout, below the print-craft floor of 12pt (≈16px at 96dpi) the `design`
skill's own print guidance states. The choice was SR-6 — matching the print set's existing
sibling density — over the stated floor. If `style-guide` inherits a `--font-size-print-*`
token from these values as-is, it inherits the breach; whether to bump the print scale
before it becomes canonical is Luke's call, not something to default silently one way.
**✅ RESOLVED (rev 13) — bump to the floor.** Luke: "that's weird, log a task to fix that."
The print set's body type must be brought up to the 12pt (≈16px@96dpi) floor before
`style-guide` transcribes a `--font-size-print-*` token from it — logged as MinorTasks
queue row 9, sequenced after the rev-13 matrix mockup work (same files).

**✅ RESOLVED (Change AG, 2026-08-20) — Resources, Lessons & Topics, and the crib
sheet stop reusing the tier palette.** Luke: "Don't use the Green/Blue/Orange colour
coding for the Resources, Lessons and Topics or Crib sheet, use a different colour
scheme for those three." Those three widgets had borrowed the Pass/Intermediate/Advanced
tier's exact line/tint/ink triples (`#1F6B41`/`#185FA5`/`#9A4E12`) for meanings that carry
**no tier semantics at all** — a resource's kind (link/image/text), a topic's completion
state (complete/in progress/not started), and the crib sheet's two content halves
(skills/knowledge). Unlike the Big-idea-box case above (resolved the opposite way, by
Luke's own call), reuse here risked the same "is this Pass-tier?" misreading with no
compensating "they're vaguely related" rationale to justify it. **Decision:** replace
green/blue/orange **positionally** (green → Teal, blue → Violet, orange → Rose) with
three new tokens — see the **Category accent** rows added to the table above — applied
across `Resources.dc.html`, `LessonsAndTopics.dc.html`/`LessonsAndTopicsPrint.dc.html`,
and `CribSheet.dc.html`/`CribSheetScreens.dc.html`. `MatrixGrid.dc.html` and
`LessonPlan.dc.html` are unaffected — they use the tier palette for genuine tier meaning,
which this change does not touch. The universal link-accent rule (`a { color:#185FA5 }`,
same `--acc` token as `Main.dc.html`'s coverage grid) is also unaffected — it renders
ordinary hyperlinks, not a category badge, so it carries no tier-confusion risk.
**Rejected:** a single new "neutral" tag colour for all three widgets' categories (would
erase the categories' own distinctions — Resources still needs three visually distinct
kind badges, Lessons & Topics still needs two distinct non-neutral statuses); reusing the
coverage grid's blue (`--acc`) for one of the three new categories (that value is already
overloaded — links, the Intermediate tier, and the coverage grid accent — adding a fourth
meaning defeats the point of this change).

**Rationale:** CSS-2 already requires every value to come from one token file; this
decision fixes *which* values populate it, so the eventual build transcribes a settled
record instead of re-deciding thirteen colours from scratch, or drifting from what the
mockups Luke has already reviewed and approved actually show.
**Rejected:** letting `style-guide`'s author re-derive tokens from the `.dc.html` files
directly at build time — reading twelve HTML files to extract a palette is exactly the
kind of implicit, undocumented dependency SR-7 exists to avoid; the table is the
architecture-level record SR-7 asks for.

---

### AD-14 — The big-idea list is a second axis, not a branch of the curriculum tree

**Decision:** big ideas live in their own two-level list (`unit.bigIdeas[]`),
parallel to the curriculum node tree — not as nodes inside it. Every lesson
binds to **both**: many curriculum nodes, exactly one big idea.
**Rationale:** they answer different questions and change for different
reasons. The curriculum tree is *what the unit is accountable to* — an external
structure Luke doesn't control and must preserve verbatim (INV-DM-2). The
big-idea list is *how the teaching is organised* — Luke's own, edited freely,
reordered on a whim. Folding ideas into the curriculum tree would mean editing
a structure whose whole point is fidelity to the source, and would make
"re-ingest the curriculum" destroy the teaching design. Two axes keep them
independently editable, and let a big idea span outcomes that sit in different
branches — which is usually what a genuinely big idea does.
**Rejected:** big ideas as a `kind` of curriculum node (couples Luke's design
to the authority's structure, and re-ingest would clobber it); big ideas as
free text on each lesson (rev 2's model — an idea spread over four lessons
becomes four strings that drift apart, and FR-BI-6 "show me every lesson on
this idea" becomes impossible); unlimited nesting (a three-level idea hierarchy
is a syllabus, not a set of big ideas — the two-level cap in INV-DM-14 is the
feature).
**Consequence:** FR-BI-4 makes the binding mandatory, so **the big-idea list
must exist before any lesson can**. `bigidea-list` therefore precedes
`lesson-plan-document` in the waves — a hard edge, not a preference.

---

### AD-15 — Pasted images are files in the unit folder, referenced by id

**Decision:** clipboard paste writes a real file to `<unit>/images/`, records a
manifest entry in `unit.json`, and documents reference it by **id**. Never
base64 inside the JSON.
**Rationale:** Luke asked for images saved in the unit folder, and the reason
that is right goes beyond the ask: `unit.json` is meant to be openable in a
text editor and diffable (AD-LS-1). A handful of pasted screenshots as base64
would be megabytes of unreadable noise and would make every save slow. Files
also mean Luke can look at, replace or back up an image with the Finder.
**Rejected:** base64 data URIs in the JSON (kills readability and diffability,
bloats saves); an image *editor* (FR-IMG-5 caps this at place/size/remove —
Luke has real image editors already).
**Two rules that fall out of it and are easy to get wrong:**
- A **missing file renders a visible placeholder**, never a silent blank
  (FR-IMG-6). The folder can be moved and files can be deleted in Finder; the
  tool must say so rather than quietly showing nothing.
- **Removing an image from a page never deletes its file** (FR-IMG-7).
  Destroying a user's file as a side effect of an edit is the kind of thing a
  personal tool only has to do once to lose trust. Orphan cleanup is a separate,
  explicit action.

---

### AD-16 — Ingest is best-effort heuristics that flag their own guesses

**Decision:** the Python ingest parses plain text with heuristics — indentation,
numbering, code patterns, blank-line grouping, heading shapes — and aims for
*roughly right*. Where it is unsure it sets `confidence: low` on the node
rather than guessing silently. Luke corrects and re-arranges afterwards in the
editor. Ingest **never destroys existing work** (FR-CUR-1f).
**Rationale:** Luke explicitly permits errors and expects to correct them, so
accuracy is a *cost curve*, not a requirement — and a parser that refuses
ambiguous input is worse than useless when the input is a copy-paste from a
PDF. But "errors permitted" is not "errors invisible": the difference between a
90%-accurate ingest and a 90%-accurate ingest *that tells you which 10% to
check* is most of the value. The confidence flag is what turns correction from
proofreading everything into checking the flagged rows.
**Rejected:** strict parsing that rejects malformed input (the input is always
malformed — it's pasted text); silent best-guessing with no confidence signal
(makes Luke re-read every node, which is slower than typing it fresh); an LLM
call to parse it (breaks FR-SYS-1 offline and AD-13's dependency ban — and a
Lukeatron skill can always write into `unit.json` from outside if richer help
is wanted later, exactly as AD-9 has it for lesson content).
**Threshold worth stating:** [Q-1](CurriculumPreparation.project.spec.md#2-questions-this-spike-must-answer)
measures the accuracy. **Below roughly 60%, correcting costs more than typing,
and `curriculum-ingest` should not be built at all** — the editor alone is the
product. That is a legitimate spike outcome, not a failure.

---

### AD-17 — The crib sheet is a generated template with a hard two-page cap

**Decision:** the crib sheet is generated from the big-idea list as a starting
template, then freely edited — the same generate-then-modify pattern as the
lesson plan (AD-9, FR-LP-9). Its page count is **1 or 2, enforced**
(INV-DM-16); content that would spill onto a third page is **flagged**, not
silently truncated or overflowed. *(Extended — Change K: the sheet's interior
is now divided into two halves, AD-29; this cap still governs the sheet as a
whole, not each half separately — see AD-30.)*
**Rationale:** the big-idea list already contains the crib sheet's content, so
typing it again would be transcription. And the cap is the whole point of a
crib sheet: an unbounded one is just the unit notes. Making the tool refuse
page three is the feature — it forces the distillation that makes the artefact
useful.
**Rejected:** unlimited pages (then it isn't a crib sheet); silent truncation
(loses work invisibly — the worst of both); auto-shrinking type to fit (produces
an unreadable sheet and hides the real problem, which is too much content).

> **Amendment — 2026-08-20 (Change AC).** The cap above is **tightened from
> "1 or 2, enforced" to exactly 1 page, always.** Luke: *"Remove fold line
> from crib sheet. Crib sheet mockup also wrongly says page 1 of 2. The crib
> sheet can never be more than 1 page."* The original wording above is left
> untouched as the historical record of the Change K decision; the current
> rule is stated fresh in **AD-46**, which also removes the drawn fold line
> this AD's own two-half extension (Change K note, and AD-30) never fully
> reconciled with a single-page sheet. This strengthens, not weakens, this
> AD's rationale — "page three is the feature" becomes "page two is the
> feature" — the same forced-distillation instinct, applied at a tighter
> threshold. See AD-46 for the full decision, rejected alternatives, and
> every touched ID.

> **Amendment — 2026-08-20 (Change AF).** Luke reviewed Change AC's
> tightening and reversed it: *"I was wrong about the 1 page crib sheet. The
> spec was correct up to 2 pages."* This AD's original rule — **1 or 2,
> enforced (INV-DM-16)** — is therefore back in force exactly as first
> written above; the intervening Change AC amendment (immediately above)
> stands as the historical record of the tightening and its own later
> reversal, not as the current rule. See **AD-48** for the full reversal,
> rationale, and every touched ID.

---

### AD-18 — Each unit is a self-contained bundle, stamped out by a generator skill

**Decision:** the deliverable is not one app that opens unit folders. It is a
**template**, plus a **skill** that copies the template into a new, complete,
independent **unit bundle**:

```
<Unit Name>/                     ← lives anywhere; needs nothing outside itself
├── Start Unit.command           double-click launcher (SR-6: matches the viewers)
├── serve.py                     the bundle's own server (AD-5, AD-13b)
├── ingest.py                    plain-text curriculum digest (AD-16)
├── unit.json                    all the unit's data
├── images/                      pasted images
├── _ingest/                     drop plain text here
├── app/
│   ├── index.html
│   ├── js/                      vanilla ES modules, one file one job
│   └── css/                     variables.css + one file per component
├── StyleGuide/                  this bundle's own tokens and patterns
├── tests/                       unittest, beside the source
└── README.md                    architecture only (SR-7)
```

**Rationale:** the unit is the natural boundary of the work. A teacher prepares
a unit, teaches it, and keeps it — self-contained means Luke can copy a bundle
to a USB stick, email it to himself, archive it at the end of term, or open one
from three years ago without a shared runtime having drifted underneath it.
Nothing outside the folder is needed, so nothing outside the folder can break
it. It also matches the Skillbank's own instinct — a generator skill that
produces a working artefact is exactly what `!BuildParserCartridge` already does
for parser widgets (SR-6).
**Cost, stated plainly:** every bundle carries its own copy of the code, so a
**fix to the template does not reach bundles already generated**. That is the
real price of independence, and it is the right trade here — a unit in use
should not change under Luke mid-term because a template was edited. Bundles are
versioned (`generatedFrom` in `unit.json`) so a stale one can be identified; a
migration path is explicitly *not* in v1.
**Rejected:** one shared installed app that opens unit folders (couples every
past unit to the current code — the exact fragility this avoids); bundles
symlinking a shared `app/` (independence in name only; a moved or deleted
shared folder breaks every unit); a bundle with no generator, copied by hand
(guarantees drift between copies, and nothing fills in the unit's identity).
**The skill:** `!NewUnit`, filed in `System/Skillbank/Teaching/` — the first
Teaching-domain Skillbank entry. It asks for the unit's identity, copies the
template, substitutes the identity, and reports the path. It is authored as part
of wave 1, not now: there is no template to copy yet.

---

### AD-19 — Singular parts are singular in the schema; the matrix is one template with many instances

> **Revised by Change F (rev 5 of the PRD/data model, rev 4 of this spec).**
> This decision originally modelled the marking matrix as **many** artefacts
> ("many, all the same shape" — one per student per lesson). Luke has since
> confirmed there is only **one marking matrix per unit**, paginated by
> student, scored against the Unit Assessment rather than individual lessons.
> The template/instance split this AD introduced **survives unchanged** — it
> is still what makes "every student's page the same shape" true by
> construction — but the *matrix itself* moves from the "many, all the same
> shape" row to a new "exactly one, paginated" row. See AD-24 for the full
> account of what changed and why; this AD's table is corrected below rather
> than left to contradict AD-24.

**Decision:** the bundle's cardinality is fixed in the schema, not left to
convention:

| Artefact | Cardinality | Shape |
|---|---|---|
| Curriculum map | **exactly one** | one `nodes[]` tree |
| Big-idea list | **exactly one** | one `bigIdeas[]` list |
| Crib sheet | **exactly one** | `cribSheet` — a singular object, not an array |
| **Unit Assessment** | **exactly one** *(new — Change E, AD-23)* | `unitAssessment` — one `finalAssessment` + many `miniAssessments[]`, itself a singular object |
| Lesson plan | **many, each different** | `lessons[]` — full independent content each |
| Marking matrix | **exactly one, paginated by student** *(revised — Change F, AD-24)* | one `matrixTemplate` + many thin `matrices[]` pages, one per student — not one matrix per (student, lesson) |

The marking matrix is the interesting one, twice over now. Luke's original
phrasing — *"multiple marking matrices each the same, but obviously containing
different numbers"* — was a statement about structure, so the structure got
modelled: **one editable `matrixTemplate`** holds the criteria, tiers and draft
scores; each **`matrices[]` instance** holds only its student and the numbers
actually entered. Change F narrows what "multiple" meant: multiple **student
pages** within one matrix, not multiple matrices.
**Rationale:** it makes "each the same" true by construction rather than by
discipline. Editing a draft score changes it in one place instead of across
every student page — and for a class of thirty, "every page" is thirty copies,
not three hundred, now that the matrix is not keyed by lesson. It also makes
the difference between the two plural *internal* structures explicit: **lesson
plans are plural at the top level because their content differs; matrix pages
are plural inside one document because their subjects (students) differ.**
Those are not the same kind of plural, and modelling them the same way — as
Change F itself argues against doing for lesson-scoped matrices — would be a
mistake.
**Rejected:** `cribSheets[]` as an array (rev 3's model — invited a second crib
sheet nobody wants, and "the unit's crib sheet" is how Luke talks about it);
fully independent matrix copies (draft-score edits become a chore, and the
copies drift); a single class-wide grid (Luke asked for individual per-student
pages, not one shared grid); *(Change F round)* keeping the matrix
many-per-(student, lesson) as well as adding a unit-level one — explicitly
rejected by Luke, see AD-24.
**Consequence:** *(superseded by Change F)* the "three hundred instances is a
navigation problem" consequence this AD originally drew, and OQ-13 which
recorded it, no longer apply — navigating thirty student pages is not the
same problem as navigating three hundred lesson×student instances. OQ-13 is
marked closed below, superseded by AD-24.

---

### AD-20 — Curriculum categories map onto the existing generic node tree

**Decision:** a curriculum's own categories — e.g. Victorian History's two
content-description strands, "Historical Concepts and Skills" (~8 content
descriptions) and "Historical Knowledge" (~32 content descriptions) — are
represented with the **existing generic node tree** (`kind: strand` \|
`outcome` \| `task`), not a new entity: one `kind: strand` node per category,
one `kind: outcome` node per content description underneath it, with the
profile's `labels` (AD-10) supplying the human names ("Strand", "Content
description"). No curriculum-specific field name or entity is introduced.
**Rationale:** INV-DM-10 already forbids curriculum-specific fields, and the
`kind`/`parentId`/`labels` machinery built for AD-10 exists precisely to
carry this — a strand-with-content-descriptions is structurally identical to
the generic outcome/task tree the model already has. Reaching for a second,
category-specific structure here would be building the same tree twice.
**Rejected:** a bespoke `category` entity parallel to `nodes[]` (duplicates
the tree — parenting, rendering, ingest, coverage and print would all need a
second code path, and INV-DM-10 forbids the curriculum-specific shape this
would become); a flat, unstranded list of content descriptions (loses the
grouping Luke sees on the actual curriculum page, and the arbor tree would
have nothing to fan from).
**Band note:** Victorian History's Levels 9–10 content descriptions are
**banded across two year levels**, not written one-level-at-a-time. The
profile/node model must tolerate a unit whose curriculum content is drawn
from a band (e.g. "9-10") rather than a single level. This needs no schema
change — `unit.meta.level` is already a free-text string (§1 of the [data
model](CurriculumPreparation-datamodel.spec.md)) — but is worth stating
explicitly so a future profile or ingest heuristic doesn't quietly assume
one content description maps to exactly one year level.
**Consequence:** when the Victorian History profile is added (FR-CUR-1c),
its `labels` map and ingest heuristics are tuned to these two real strand
names; no datamodel fields beyond AD-21 below are required for it.

---

### AD-21 — Big-idea coverage is a two-value enum, not a scale

**Decision:** `BigIdea.coverage[].coverage` (replacing rev 4's bare
`nodeIds[]`) is exactly two values: `"full"` or `"partial"`. No third value,
no numeric or percentage scale.
**Rationale:** the printed map needs Luke to glance at a chip and know
whether a big idea *finishes* a curriculum node or merely *touches* it — two
states carry that distinction cleanly. A finer scale (a 1–5 rating, or a
percentage) invites fiddling over exactly how partial something is, without
improving the printed artefact: a chip reading "70%" is not more useful to a
teacher glancing at a tree than one reading "partial", and deciding between
60% and 70% for a one-sentence content description is time spent on a
distinction the page can't show anyway.
**Rejected:** a bare `nodeIds[]` with no qualifier (rev 4's model — the exact
gap this change closes: "wholly satisfies K03, only partly touches K05"
cannot be said); a four-point or numeric scale (invites fiddling per the
rationale above, and the print chip would need a legend instead of reading
at a glance); a separate top-level join/link table (e.g. `coverageLinks[]`
parallel to `bigIdeas[]` and `nodes[]`) — every other cross-part edge in this
schema (datamodel §1b) is a field stored on one side of the relationship,
not a standalone table, and coverage is structurally the same kind of edge;
a third entity for it would be the odd one out for no benefit.
**Consequence:** FR-BI-7 (revised) and FR-BI-9 (PRD) carry this; INV-DM-21
through INV-DM-23 (data model) enforce resolvability, the two-value enum,
and no duplicate `nodeId` per big idea.

---

### AD-22 — Coverage grid edits, arbor-tree chips print

**Decision:** the on-screen editor for `coverage[]` is a **coverage grid** —
big ideas on one axis, curriculum content descriptions on the other, each
cell empty / full / partial — supporting direct attach/detach of a big idea
from a node and reordering/moving big ideas, and remaining legible with
roughly forty content descriptions on one axis. The **print** view instead
renders coverage as **chips attached to their nodes on the existing arbor
tree** (landscape, AD-11), showing full vs partial distinctly and citing
each link in human-readable form (AD-12, FR-TR-6).
**Rationale:** editing and printing want different shapes for the same
many-to-many relationship. A grid is the layout that keeps ~8 big ideas
against ~40 content descriptions scannable and editable — an empty row or
column reads as a gap at a glance, which a tree of forty-plus nodes cannot
show as cleanly once it fans that wide. The arbor tree, conversely, is
already the map's structural spine (FR-CUR-3) and the natural home for
print: on paper, the tree's shape *is* the curriculum's shape, and asking a
reader to cross-reference a separate grid defeats the reason the tree exists.
**Rejected:** a two-column drag board (big ideas in one column, curriculum
nodes in the other, drag to link) — closest to Luke's literal description of
the task, but a many-to-many relationship drawn as crossing lines between two
long columns turns visually noisy well before 8×40 items, exactly the scale
this needs to keep working at; tree-only editing (attach a big idea by
interacting with its node directly on the arbor tree) — best for print,
because it is the same view, but worst for editing, because a many-to-many
web layered over a family tree obscures gaps rather than surfacing them,
which is the one thing the editing surface most needs to do.
**Interaction consequence:** the grid lets Luke act from either
direction — a big idea's row or a node's column — but storage stays
canonical on the big idea (`bigIdea.coverage[]`, AD-21). The grid's
node-column view is generated by walking every big idea's `coverage[]` and
grouping by `nodeId` — the same "index rebuilt on load, never stored"
pattern as every other reverse edge in this project (AD-12, INV-DM-12), not
a second write path.
**Consequence:** FR-BI-10 (grid) and FR-CUR-10 (chips) carry this in the
PRD. OQ-18 below records the keyboard-equivalent default for the grid's
drag-based actions.

---

### AD-23 — The Unit Assessment is a first-class fifth part, placed between the lesson plan and the marking matrix

**Decision:** the Unit Assessment gets its own document (`unitAssessment` in
the data model), not a variant or extension of `Lesson`. It holds exactly one
final assessment (three-tiered) plus many mini assessments (each
three-tiered), absorbs the former thin `Assessment` entity as the shape of a
mini assessment, carries a mandatory big-idea binding and `coverage[]`-shaped
curriculum links (reusing AD-21's shape unchanged), and prints A4 portrait
like the lesson plan (AD-11). Ordinally it becomes **Part 3**, ahead of the
marking matrix and behind the lesson plan: Curriculum map (1), Lesson plan
(2), **Unit Assessment (3)**, Marking matrix (4), Crib sheet (5).
**Rationale — first-class document, not a lesson-plan variant:** the two
differ in exactly the ways that make "just a Lesson field" the wrong shape.
*Cardinality* differs: a lesson is one flat three-tier document; the Unit
Assessment is a *container* — exactly one final assessment plus a variable
many mini assessments, each independently three-tiered — closer in shape to
the big-idea list (AD-14, a second axis with its own cardinality rules) than
to a single lesson. *Links* differ: a lesson names curriculum nodes and one
big idea; the Unit Assessment additionally links outward to lessons (via
their `assessmentLink`) and to the marking matrix that scores it — a hub
role no individual lesson plays. Bolting this onto `Lesson` would mean either
inventing a "this lesson is actually N assessments" escape hatch (wrong
cardinality) or duplicating big-idea/coverage-binding logic a second time
inside the lesson schema instead of once at the document level.
**Rationale — ordinal placement:** Marking matrix now scores against the
Unit Assessment, not individual lessons (Change F, AD-24) — the matrix
literally has nothing to mark until the Unit Assessment exists. That is the
same "hard edge, not a preference" reasoning AD-14 already established for
placing the big-idea list ahead of the lesson plan (FR-BI-4's mandatory
binding). Placing the Unit Assessment last, after the crib sheet, would
misstate this dependency by putting the marking matrix's prerequisite behind
the marking matrix in the printed reading order.
**Rejected:** modelling the Unit Assessment as a variant of the lesson plan
— e.g. a `lesson.kind: "assessment"` flag, or an extra tier-count field on
`Lesson` — the cardinality mismatch above (one final + many minis, in one
document, versus one lesson per document) makes this the wrong shape from the
first field; placing it as Part 5, at the end, after the marking matrix — 
would read naturally to a newcomer skimming top-to-bottom but would silently
misstate the actual build and data dependency the matrix now has on it.
**Consequence:** FR-UA-1…10 (PRD) carry this; INV-DM-24…27 (data model)
enforce the new cardinality and resolution rules; the PRD's "six parts,
three orientation values" arithmetic (FR-SYS-4a) stays correct only because
this AD fixes the Unit Assessment's orientation to portrait rather than
introducing a fourth orientation value.

---

### AD-24 — The marking matrix becomes singular per unit, paginated by student, scored against the Unit Assessment

**Decision:** the marking matrix collapses from many independent artefacts
(one per (student, lesson) pair, per AD-19's original table) into **one
unit-level document**, paginated by student — one page per student, holding
that student's scores against the unit's assessments. `matrix.lessonId` is
removed outright, not merely deprecated. The template/instance split AD-19
introduced survives unchanged: one editable `matrixTemplate` (shared
criteria, tiers, draft scores) plus one thin per-student `matrices[]`
instance (that student's awarded scores and comments only).
**Rationale:** it sits beside the crib sheet's existing singularity (AD-19,
INV-DM-18) — both are unit-level distillations, not per-lesson artefacts —
and matches how marking actually happens: a teacher marks what a student was
*assessed on* (the Unit Assessment's tiers), not a fresh grid for every
lesson delivered along the way. Luke was explicit: *"Assessments link to
Marking Matrix's, there is only one per unit (each student gets their own
page)"* — and confirmed directly that this removes per-lesson marking.
**Rejected:** keeping per-lesson matrices **in addition to** the new
unit-level one — explicitly rejected by Luke; it would mean two competing
scoring surfaces in the same schema, which is exactly the kind of duplication
FR-UA-4's absorption of the old `Assessment` entity was designed to avoid
happening a second time, one layer over.
**Consequence:** INV-DM-6 is rewritten (one instance per student, not per
(student, lesson)); INV-DM-18 and INV-DM-19 are reviewed and extended;
FR-MM-1, 1a, 4, 4a and 8 are rewritten in the PRD; FR-TR-2 and FR-TR-4 are
retargeted from lesson↔matrix to assessment↔matrix; the §1b link-graph table
and entity definitions in the data model are updated to match; AD-19's table
is corrected in place rather than left to contradict this decision. OQ-13
(how to navigate three hundred instances) is closed below — the problem it
named no longer exists in this shape. G-7 (matrix default orientation =
portrait, closed in the prerequisites gate) still reads correctly under this
model: `matrixTemplate.orientation` remains the one place that default lives,
now read as "the one unit-level matrix's default for new student pages"
rather than "one default among many per-lesson templates" — the fact closed
by G-7 is unchanged, only what it is a fact *about* has narrowed from many
templates to one.

### AD-25 — The Resources page is the widget's sixth part

**Decision:** the widget gains a **sixth part**, the Resources page — exactly
one per unit, sitting alongside the curriculum map, lesson plans, Unit
Assessment, marking matrix and crib sheet, and taking the Resources tab in the
top tab bar. It holds a flat, ordered list of items, each one of exactly
three kinds: a **link** (URL + label), an **image**, or a **text** block,
with an optional note on any of them. It prints A4 portrait and flows to as
many pages as the list needs.
**Rationale:** Luke asked for *"a resources page, which is a simple dot point
list of links images or text. That I can add things to."* Every existing part
of this widget is a structured artefact with a fixed shape; there was nowhere
to put the loose material that accumulates around a unit — a link to an
archive record, a note about which drawer the spare booklets are in, a poster
image not yet placed in a lesson. That material was previously homeless, and
homeless material ends up outside the bundle, which breaks AD-18's promise
that the folder is the whole unit.
**Rejected:** a free-text notes field on the crib sheet (conflates a printed
teaching artefact with a scratch surface, and inherits its hard two-page
cap); leaving resources outside the bundle in Luke's own filesystem
(contradicts AD-18 — the bundle stops being self-contained the moment the
unit's material lives somewhere else).
**Consequence:** the widget is now six parts, not five — FR-SYS, the PRD part
headings, the traceability table and the orientation arithmetic are all
renumbered. `resourcesPage` joins `cribSheet`, `matrixTemplate` and
`unitAssessment` as a singular object in INV-DM-18. Orientation is fixed by
the part (portrait), per AD-11, so nothing is stored. The
[`resources-page`](../../_Builds/resources-page.build.spec.md) build is filed
at wave 4.

---

### AD-26 — The Resources page is deliberately unstructured

**Decision:** resource items carry **no tiering, no curriculum binding, no
big-idea binding and no coverage links** — none of the structure every other
part of this widget enforces. An item is a kind, a payload, an optional note,
and a position in the list. Nothing more. The Resources page also carries no
row in the link-graph table: it is deliberately outside the traceability
system.
**Rationale:** the friction of adding something is the whole feature. If
pasting a link demanded a big idea and a curriculum node the way a lesson
plan does (FR-BI-4, INV-DM-15), Luke would not paste the link — he would
leave it in a browser tab, and the bundle would again stop being the whole
unit. This is the one place in the schema where material is allowed to
arrive before it has earned structure. The restraint is the design, not an
omission to be tidied up later.
**Rejected:** binding resources to lessons or big ideas like everything else
(turns a five-second paste into a form-filling chore, and the chore is
exactly what stops the capture happening); a tag or category field as a
lighter-weight middle ground (still a decision at capture time, and it would
grow into the structure this decision exists to refuse — filed as OQ-RES-1
with "no" as the recorded default).
**Consequence:** a future agent tidying the schema for consistency will find
this part conspicuously irregular and be tempted to regularise it. It must
not. INV-DM-12's no-stored-reverse-edges rule is untouched here because there
are no edges at all.

---

### AD-27 — Mini assessments carry qualified coverage, like every other link

**Decision:** a mini assessment's link to curriculum nodes is **upgraded from
a bare `nodeIds[]` list to the qualified `coverage[]` shape**
`{ nodeId, coverage: "full" | "partial", note }` — the same shape
`BigIdea.coverage[]` and `unitAssessment.coverage[]` already use (AD-21).
**Rationale:** two link shapes for the same relationship is one shape too
many. The whole point of AD-21's two-value enum is that partial coverage is a
real thing a teacher means — and it means it just as often about a mini
assessment ("the source drill partly assesses reliability") as about a big
idea. Leaving minis on a bare list would have forced the coverage grid to
render two different vocabularies in adjacent columns and call it one
instrument.
**Rejected:** leaving mini assessments on `nodeIds[]` (cheaper today, but
every consumer — the grid, the gap derivation, the printed citations — would
carry a branch for the two shapes forever); qualifying the link with a
numeric weight instead of the two-value enum (rejected once already at AD-21,
for the same reason: it invites fiddling without improving the artefact).
**Consequence:** INV-DM-26 is rewritten against `coverage[].nodeId`; the §1b
link-graph table gains the `MiniAssessment → Node` row in qualified form; the
data model's forward-reference field list changes
`miniAssessment.nodeIds[]` to `miniAssessment.coverage[].nodeId`. This is a
schema change with no migration cost today because no bundle exists yet —
that window closes the moment the first unit is generated.

---

### AD-28 — Assessment coverage is derived and shown beside taught coverage, splitting one gap into three

**Decision:** the coverage view shows **both** axes against the same list of
content descriptions — *taught* (by a big idea) and *assessed* (by the final
assessment or a mini) — as two column groups in one grid. This splits the
single "gap" concept into **three distinct, separately displayed states**:
*taught but not assessed*, *assessed but not taught*, and *neither*. All of
it is **derived** on load by walking `bigIdea.coverage[]`,
`unitAssessment.coverage[]` and every `miniAssessment.coverage[]`; no reverse
edge is stored, and INV-DM-12 stands unchanged. Editing an assessment cell in
the grid writes **forward onto that assessment's own record**, exactly as a
big-idea cell writes forward onto the big idea.
**Rationale:** Luke: *"The Coverage map also needs to display assessment
coverage for the unit."* Taught-and-not-assessed and assessed-and-not-taught
are different problems with different fixes — one means writing an assessment
item, the other means the assessment is testing something never taught, which
is a fairness problem, not a planning one. Collapsing them into one amber
"gap" flag would hide the distinction that makes the view worth having.
**Rejected:** a separate assessment-coverage screen (the comparison is the
point; two screens make the reader hold one in their head while looking at
the other); a single merged gap flag (loses the distinction above); storing
the derived assessed-coverage index for speed (violates INV-DM-12 and
introduces a second source of truth that can disagree with the assessments).
**Consequence:** FR-BI-11…13 and FR-TR-9 in the PRD; FR-CG-9 revised and
FR-CG-15…19 added to the
[`coverage-grid`](../../_Builds/coverage-grid.build.spec.md) build, including
independently collapsible column groups so the wider grid (~40 descriptions ×
3–8 big ideas × 4–6 assessments) stays legible. Depends on AD-27 — the two
column groups share one cell vocabulary only because mini assessments now
carry the qualified shape.

---

### AD-29 — The crib sheet's two halves are a generic discriminator, labelled by the curriculum profile

**Decision:** the crib sheet is divided into exactly two ordered halves,
`upper` and `lower`. Every `cribSheet.sections[]` entry carries a `half` field
holding one of those two values (INV-DM-31) — plain layout vocabulary, not a
curriculum concept. The **curriculum profile** supplies the human-readable
label printed above each half, via an optional
`curriculum.labels.cribSheetHalves: { upper, lower }` (data model §1) — for
Victorian History v2.0, "Historical Concepts and Skills" over `upper` and
"Historical Knowledge and Understanding" over `lower`. A profile that omits
it gets a generic fallback label. Luke assigns each section's `half` by hand
when authoring or editing it.
**Rationale:** Luke: *"It should be divided in half, top half skills bottom
half knowledge."* For Victorian History that maps directly onto the
curriculum's own two strands — but INV-DM-10 already forbids a
curriculum-specific field name or enum value, and AD-10 already commits the
whole schema to curricula-as-declarative-profiles. A field literally called
`skillsSectionText` / `knowledgeSectionText`, or an enum with values
`"skills"` / `"knowledge"`, would be exactly the mistake AD-10 and AD-20 exist
to prevent — correct for the one curriculum in front of us, wrong the moment
a second curriculum without a skills/knowledge split is imported. Reusing the
existing `labels` mechanism (AD-10, AD-20) to carry the display text keeps the
schema itself silent about what the halves *mean*, while still letting the
printed sheet read "Historical Concepts and Skills" rather than "Upper" for
this curriculum.
**Rejected:** hardcoding the two Victorian strand names into the schema — as a
pair of fixed fields, or as the `half` enum's own values (`"skills"` \|
`"knowledge"`) — the cheapest-looking option, and the one that breaks first:
a Science or English unit whose crib sheet also wants a two-region split has
no natural "skills"/"knowledge" boundary, and the field name would be wrong
for it from the start; **deriving `half` automatically from each big idea's
linked curriculum nodes** (`bigIdea.coverage[]`, walking which strand(s) a
section's big idea covers) — attractive, because it would need no manual
assignment at all, but wrong: FR-BI-9 already establishes that one big idea
can cover **many** curriculum nodes across **different** strands, so a
derivation would have no single answer for a big idea spanning both halves.
Which half a section prints under is a **page-layout choice Luke makes**, not
a fact `coverage[]` determines — the same distinction AD-22 already draws
between what the coverage grid *computes* and what a human *decides*.
**Consequence:** FR-CS-8, FR-CS-9 (PRD); INV-DM-31 (data model); the
`CribSheet.sections[]` shape and the `Curriculum.labels` field (data model
§1) both change.

---

### AD-30 — The crib sheet's page cap governs the whole sheet; the fold between halves is nominal

**Decision:** AD-17's 1-or-2-page cap (INV-DM-16) applies to the crib sheet
**as a single document**, not to each half independently. The two halves
(AD-29) are **ordered regions within one page flow**, not two
independently-capped sub-documents with their own budgets. If content pushes
the whole sheet past the cap, that is flagged exactly as any other crib-sheet
overflow already is (AD-17, FR-CS-5) — regardless of which half the
overflowing sections belong to — and the fold never silently moves to lend
one half the other's space.
**Rationale:** the alternative — capping each half at, say, one page each —
would fail the moment a real unit's teaching content is lopsided (which it
usually is: Victorian History's "Historical Knowledge" strand carries roughly
four times the content descriptions of "Historical Concepts and Skills," per
AD-20's own count). A skills-heavy or knowledge-heavy unit would then be
told its crib sheet doesn't fit, when the actual, single-document constraint
(AD-17's whole point) is still satisfied. Treating the fold as nominal keeps
AD-17's real design intent — *force distillation, don't force an arbitrary
even split* — intact under Change K rather than replaced by a stricter, less
useful rule nobody asked for.
**Rejected:** an independent per-half page cap (the lopsided-content failure
above; also a second cardinality rule competing with AD-17's existing one for
the same artefact); a **moving fold** that reflows overflow from one half
into space borrowed from the other — rejected because it would hide which
half actually grew, defeating the flagging AD-17 already requires, and would
make the printed sheet's layout depend on content order in a way Luke cannot
predict or control from the editor.
**Consequence:** FR-CS-10 (PRD); the `CribSheet.pageCount` field's Notes
column (data model §1) cross-references this decision; AD-17 gains a pointer
here rather than being rewritten.

> **Amendment — 2026-08-20 (Change AC).** "The fold between halves is
> **nominal**" (above) is **superseded**: the fold is now **removed
> entirely** — no drawn divider, no `page-break-after`, nothing between the
> halves but ordering. A "nominal" fold always implied a drawn line that just
> didn't force a hard break; once the whole sheet is capped at exactly 1 page
> (AD-46), a fold that could force a page break is self-contradictory on a
> document that can never have a second page to break onto. The two halves
> themselves, and the rule that the cap governs the sheet as a whole rather
> than per half, are **unchanged** by this amendment — only the drawn line is
> gone. The original text above is left untouched as the historical record;
> see **AD-46** for the full decision.

> **Amendment — 2026-08-20 (Change AF).** AD-17's page-cap tightening (which
> the amendment above tied the fold's removal to) is **reversed** — Luke:
> *"I was wrong about the 1 page crib sheet. The spec was correct up to 2
> pages."* The cap is **1-or-2 again**. This AD's fold decision is **not**
> reopened by that reversal: the fold stays **removed entirely**, exactly as
> the Change AC amendment above states — Change AF only reverses the
> page-count number, not the drawn-fold question, which this project treats
> as Luke's separate, standing instruction (see AD-48). Both amendments
> above are left untouched as the historical record; see **AD-48** for the
> full reversal.

---

### AD-31 — Lesson numbers are contiguous, renumber on reorder, and get their own index view

**Decision:** `Lesson.number` — already in the schema, used in printed
citations since the data model's first revision — gains three things under
Change L: (1) a **list/index view** reached from the Lessons tab, showing
every lesson's number **beside its topic and big idea** *(REWRITTEN — Change
R; was "beside its title")*, ordered by number (FR-LP-14); (2) an explicit
rule that numbers are **unique and contiguous from 1** within a unit
(INV-DM-32); (3) **automatic renumbering** on reorder, so the sequence never
needs a hand fix.
**Rationale:** Luke: *"I want lessons within a unit to be numbered. So that
when clicking on Lessons tab I can see a list of lessons along with their
number."* The field already existed — this is a display and behaviour gap,
not a schema gap, and the spec says so plainly rather than inventing a
duplicate field next to `number`. Contiguity is the substantive call: a unit
whose lessons read 1, 2, 5 is not "sparse by design," it is a bug — probably
a deleted or reordered lesson that never got renumbered — and a teacher
handing out a stack of 1-2-5-numbered lesson plans looks like they lost pages
3 and 4. Making renumbering automatic on reorder is what keeps that rule true
without turning every reorder into a manual clean-up chore.
**Rejected:** leaving numbers non-contiguous by design (permits exactly the
gap-reads-as-missing-pages failure above, for no benefit — nothing in FR-LP
or FR-TR wants a lesson to skip a number); a duplicate display-only "position"
field alongside `number` (two fields for one fact, the drift bug INV-DM-4's
whole surrounding apparatus exists to prevent); manual renumbering left to
Luke after a reorder (cheap to build, guaranteed to drift the first time he
forgets — exactly the kind of chore automatic renumbering exists to remove).
A `Lesson.title` field to show in the index — the original draft of this
decision reached for one without Luke ever asking for it ("I can see a list
of lessons along with their number" names only the number); with Topic and
Big idea now both stored and both already the row's actual content, adding a
third, freeform, overlapping name would be exactly the kind of drift a
teacher would have to keep in sync by hand for no benefit. *(Change R.)*
**Consequence:** FR-LP-14…16 (PRD); INV-DM-32 (data model); no change to the
`Lesson` entity's fields — `number`'s type and role are unchanged, only its
surface (the index view) and its maintenance (renumber-on-reorder) are new.
`Lesson` never gained a `title` field at any point — Change R corrects the
PRD/arch text that assumed one into existing, not the data model, which
never carried it.

---

### AD-32 — Curriculum codes are on-screen navigation controls; print stays plain text (extends AD-12)

**Decision:** wherever a curriculum content-description **code** appears on
screen — lesson plan, Unit Assessment, crib sheet, marking matrix, any
part — it renders as a **clickable control** that navigates to the
curriculum map's coverage view, **scrolled to and highlighting** that
content description's row, with a **back affordance** returning to the
document clicked from. In **print**, the same code renders as **plain
text** — no different from any other citation FR-TR-6/AD-12 already
specify. No new data is stored: the target resolves from the existing node
id the part already carries (`lesson.nodeIds[]`,
`unitAssessment.coverage[].nodeId`, `miniAssessment.coverage[].nodeId`,
`bigIdea.coverage[].nodeId` — [datamodel §1b](CurriculumPreparation-datamodel.spec.md#1b-the-link-graph));
INV-DM-12 (reverse links derived, never stored) is unchanged, and no new
reverse edge is added.
**Rationale:** Luke: *"I want the Curriculum codes to be clickable links, so
clicking on them in one module takes me back to the coverage page."* AD-12
already establishes that cross-links are screen-navigable and print as
citations (FR-TR-6/7) — this is that exact rule applied to one specific kind
of link, a curriculum code, that was previously rendered as inert text
everywhere. It is an **extension** of AD-12, not a departure: the
screen/print split AD-12 draws for links in general is precisely the split
this decision draws for codes. Landing the user on a *focused, highlighted*
row, rather than merely "the coverage view," matters because a code inside
an arbor tree of 40+ nodes (FR-BI-10's own scale note) is useless to arrive
at unfocused — the user would have to re-find the row by eye, defeating the
point of clicking. A back affordance is the second half of the same
argument: a code on a lesson plan is a lookup made mid-task, not a page the
user meant to go read — a click with no way back teaches Luke not to click
the next one.
**Rejected:** making codes clickable in print too — meaningless on paper,
since a printed page cannot navigate anywhere; the PDF is exactly the
artefact FR-TR-6 already covers with plain-text citations, and duplicating
that mechanism for codes specifically would just be AD-12 restated with
extra steps. A separate lookup screen (search the coverage view for a code
by hand) — technically reaches the same row, but costs the user more clicks
for the same answer a direct navigation gives for free; it is the kind of
indirection Luke's request was explicitly asking to remove. Landing on the
coverage view unfocused, with no scroll or highlight — cheaper to build, but
leaves the user to re-locate the row by eye in a tree that can hold 40+
nodes, which is barely better than not linking at all.
**Consequence:** FR-TR-10…12 (PRD) carry this; lands in the
`traceability-links` build, wave 5 — the same build FR-TR's existing
cross-linking already belongs to (PRD Traceability table). Every part
rendering a code depends on **one shared code-rendering component**
(FR-TR-12) rather than reimplementing the click/focus/highlight behaviour
per part — SR-4 ("share, don't copy-paste") applied to a control, not merely
a style.

---

### AD-33 — Lesson-plan tier pages print only when populated; the schema's three tiers stay mandatory

**Decision:** a lesson plan's front page always prints; each of the three
tier pages (Green/Blue/Orange) prints **only if that tier has content** — a
lesson with no tiered work prints 1 page, a lesson with all three prints 4,
anything between prints 2 or 3. The `Lesson.tiers` object in the schema is
**unchanged**: it always carries all three fixed keys, `pass` /
`intermediate` / `advanced` (INV-DM-1, INV-DM-25). Whether a page is
emitted is a **rendering** decision over a tier's *content* (INV-DM-33
defines "empty"), never a schema decision over whether the key exists. Tier
identity and fixed order (INV-DM-5) govern whichever pages are emitted,
unchanged.
**Rationale:** Luke: *"The Lesson plan could be just one page or up to four
pages."* Today's four-fixed-pages behaviour prints blank tier pages for a
lesson that genuinely has no intermediate or advanced work — a common case,
not an edge case, for a straightforward lesson. The correct fix keeps AD-7's
hard-coded three tiers exactly as they are — "the product's spine," in
AD-7's own words — and moves the flexibility into rendering, where it
belongs: a page is a *view* of a tier's content, and an empty view earns no
page. This is the same instinct as AD-17's crib-sheet overflow rule and
AD-30's nominal-fold rule: a layout consequence follows from content, not
the reverse.
**Rejected:** making tiers genuinely optional in the schema (e.g.
`tiers?: { pass?, intermediate?, advanced? }`) — breaks INV-DM-1's "exactly
three tiers, always" and AD-7's hard-coded spine outright, and would let a
lesson exist with, say, only `pass` populated and no record that
`intermediate`/`advanced` were ever considered — a different and worse
problem than an empty page, since the marking matrix and Unit Assessment
both assume the same fixed three-tier shape (FR-MM-1, INV-DM-25) and a
lesson that can silently drop a key breaks that assumption for every
consumer, not just its own print. Always printing four pages with blanks —
the status quo, and exactly what Luke is rejecting; it wastes paper on
every lesson that doesn't use all three tiers, which per Luke's framing is
not rare.
**Consequence:** FR-LP-7, FR-LP-7a, FR-LP-11, FR-LP-17 (PRD, rewritten/new);
INV-DM-33 (data model, new — defines tier emptiness). **This rule also governs
the Unit Assessment** — `finalAssessment` and every `miniAssessment` share the
same three-tier shape and emit pages on the same condition (OQ-19, resolved
2026-08-19 on Luke's "yes"). One rendering rule over one tier shape, in the
shared tier-page path; the two parts do not diverge.

---

### AD-34 — Developer-facing explanation belongs in code comments; screen text serves only the person using the widget

**Decision:** text that exists to inform a developer — a validation rule, an
invariant reference, a spec number, a "this is required because…"
justification — belongs in a **code comment** (SR-8), never on screen. Text
on screen exists **only** to serve the person using the widget: a control's
label, an instruction needed to complete a task, or an error message
explaining why an action was refused. The two are not the same audience and
must not be conflated. This is **not** to be confused with a genuine
user-facing message shown *after* a failed action — e.g. a save refused
because a lesson has no big idea (FR-BI-4/INV-DM-15) legitimately tells the
user why, in the UI, because the user needs to know it to fix it. A
**permanent caption restating the same rule pre-emptively** (e.g. a label
reading "Big idea — required. A lesson cannot be saved without one.",
sitting on the page whether or not a save was ever attempted) is not that —
it is a developer's justification for the rule, wearing the UI as a coat,
and it belongs in the code as a comment beside the validation it explains.
**Rationale:** the case that surfaced this was concrete — a mockup carried
captions reading "Big idea — required" and "a lesson cannot be saved
without one" next to the big-idea field. Both statements are true, and both
are exactly what SR-8 already says a comment is for: "the non-obvious
*why*… what breaks if the connection changes." Printing them on screen
instead does two things wrong at once: it clutters the interface with a
fact the user needs only in the moment a save is refused, not permanently
in their eye-line; and it duplicates the rule's canonical statement
(FR-BI-4, INV-DM-15) into a second place — the interface text — that can
drift from the code the moment either is edited without the other. SR-7 and
SR-8 already draw this line for code and its accompanying docs ("code
should be self-explanatory," "comments explain functions and connections,
never history"); this decision draws the same line again at the UI
boundary, because a caption on screen is exactly as capable of restating
what the code already enforces as a stale comment is.
**Rejected:** leaving developer-justification captions in the UI on the
grounds that "it's true and it's helpful" — true is not the same test as
*who needs it*; a fact being correct does not make the person using the
widget its right audience, and permanent clutter has a cost even when every
word of it is accurate. Treating this as purely a wording/copy problem to
fix once in the mockup — the distinction is structural (developer-facing vs
user-facing), not a matter of trimming the sentence; a shorter version of
the same caption is still in the wrong place.
**Consequence:** applies across every part of this widget wherever a
validation rule, invariant, or spec citation might otherwise be tempted onto
the interface — the coverage grid, the lesson-plan editor, the Unit
Assessment, and any future part. At the time this decision was
recorded it did **not** edit `Memory/Long-Term/Coding/vibe-coding-rules.md` —
SR-7/SR-8 were cross-referenced, not amended — because promoting a UI-side
extension into the house-wide rules was a gated decision for Luke (OQ-20).
*(Superseded the same day: Luke approved the promotion — see below.)*


**Promoted (2026-08-19).** On Luke's approval this decision is now **SR-9** in
`Memory/Long-Term/Coding/vibe-coding-rules.md` and binds every project. SR-9 is
the authority; this AD stands as the record of the case that produced it.
*Still open, deliberately not folded in:* SR-9 governs developer-facing
*explanations*. It does not yet govern internal *vocabulary* leaking into UI
copy — a schema field name used as a label, e.g. "8 workspace lines" for
`workspaceLines`, which is a different failure with the same cause. Extending
SR-9 to cover naming is Luke's call, not assumed here.

---

### AD-35 — Topics sit above the big-idea list as a new, independently-covered organising layer

**Decision:** introduce `Topic` as a new unit-level list (`unit.topics[]`),
**flat** (no nesting), each carrying its own **optional, independently
stored** qualified `coverage[]` to curriculum nodes (reusing AD-21's
full/partial enum unchanged). Every **top-level** `BigIdea` (`parentId:
null`) carries a mandatory `topicId`; a sub-big idea carries none and
inherits its parent's topic. A lesson's topic is **never stored** — it
resolves transitively (`lesson.bigIdeaId` → `BigIdea` [→ its parent, if a
sub-big idea] → `topicId` → `Topic`), the same "derive, don't duplicate"
discipline INV-DM-12 already applies to every reverse edge in this project,
here applied to a forward chain instead.
**Rationale — why an extension of axis 2, not a third axis:** Luke's own
framing — "Topics are the bridge between the various skill and knowledge
requirements and the big ideas of the lesson plans" — describes a third tier
of *Luke's own* teaching structure, not a new independent structure standing
beside the curriculum tree and the big-idea list. AD-14's two-axis argument
(curriculum tree = the authority's structure, preserved verbatim; big-idea
list = Luke's, freely edited) is unaffected by adding a coarser tier on
Luke's side of that split — a topic is edited as freely as a big idea, never
re-ingested, never authoritative. Keeping `topics[]` a **separate flat
list**, rather than a third nesting level inside `bigIdeas[]`, preserves
INV-DM-14's two-level cap on the big-idea list untouched, and keeps the
attach/rename/reorder/delete operations on topics independent of the ones
FR-BI-3 already defines for big ideas — grouping by reference
(`bigIdea.topicId`), not by containment.
**Rationale — why Topic gets its own stored `coverage[]`:** the simpler
alternative — deriving a topic's coverage from the union of its big ideas'
existing links — was this draft's first instinct, and was explicitly
overridden by Luke. Giving `Topic` its own storage lets a topic state
coverage none of its big ideas individually assert yet, which matters while
the teaching structure is still being built out — and it is consistent with
how `BigIdea.coverage[]` and the Unit Assessment's `coverage[]` are already
allowed to diverge from each other (that divergence is the entire premise of
AD-28's three gap states). It reuses AD-21's shape and enum unchanged: a
fourth entity carrying `coverage[]`, not a fourth format.
**Rejected:**
- Topic as a third level nested inside `bigIdeas[]` (loosening INV-DM-14's
  two-level cap to three) — rejected because it couples the topics feature to
  the big-idea list's own editing rules for no benefit, and because `BigIdea`
  already earns its two-level cap on its own terms (AD-14: "a three-level
  idea hierarchy is a syllabus, not a set of big ideas") — a topic is a
  different kind of grouping (coverage-bearing, unit-overview-facing) than a
  sub-big idea is.
- Deriving topic coverage purely from its big ideas' `coverage[]`, storing
  nothing new on `Topic` itself — the zero-new-state option — rejected on
  Luke's explicit instruction that Topic "gets its own coverage links."
- A `lesson.topicId` field, stored directly and redundantly alongside
  `lesson.bigIdeaId` — rejected because it is fully determined by the
  existing forward chain, and storing it a second time creates exactly the
  two-sources-of-truth risk INV-DM-12 exists to prevent. A lesson's topic is
  read, never written.
- Folding topic coverage into the existing three-state gap analysis
  (FR-BI-12/13, "taught / assessed / neither") as a fourth dimension —
  rejected as scope beyond what was asked. Luke's stated purpose for Topic is
  a unit-overview aid for the teacher and student ("so they know what to
  expect"), not a new fairness/planning gap category. Topic coverage is
  editable and printed as its own chip (FR-CUR-12), but does not participate
  in the taught-vs-assessed comparison.
- A new seventh printed **part** of the widget (a "Topics document") —
  rejected: Luke described the topic list as something a student browses to
  see what's in the unit, and described the topic appearing *on* the lesson
  plan — both point to a screen-only navigation view (mirroring FR-LP-14's
  Lessons tab, AD-31) plus a lesson-plan field, not a new A4 printable
  document. FR-SYS-2's "six parts" stays six.
**Consequence:** FR-TOP-1…9 (PRD) carry the entity, binding and view;
FR-CUR-12 adds the third arbor-tree chip type; FR-BI-14 adds the third
coverage-grid column group; FR-LP-1a/12 add the lesson-plan display.
INV-DM-34…36 (data model) enforce the new binding and coverage-resolution
rules. `topics-list` joins the unspecced wave-2 build list, ordered ahead of
`bigidea-list` for the same "hard edge" reason AD-14 places `bigidea-list`
ahead of `lesson-plan-document` — FR-TOP-3 makes the binding mandatory, so a
top-level big idea cannot exist first.

> **Note — 2026-08-22 (`bigidea-list` build spec).** `topics-list` never
> became a separate `_Builds/` subtask — `_Builds/_PLAN.md`'s wave table
> has never carried a row for it. When `bigidea-list.build.spec.md` was
> written, the basic topics list (`FR-TOP-1…7` — add/rename/reorder/delete,
> the mandatory `topicId` binding) was folded into that build instead, since
> nothing else claimed it and INV-DM-34 makes a top-level big idea
> unsatisfiable without a topic to bind to — the same hard-coupling
> reasoning this AD gives for topics preceding big ideas, just resolved as
> "one build, ordered internally" rather than "two builds, ordered against
> each other." `FR-TOP-8` onward — the combined Lessons & Topics view — is
> a separate, larger feature and is specced separately, in
> `lessons-and-topics.build.spec.md`.

---

### AD-36 — The lesson-plan sidebar is a freeform, unstructured, front-page-only region

**Decision:** `Lesson.sidebar` is an optional plain-text field. When
non-empty it prints on the lesson plan's **front page only**, in a dedicated
region; when empty, nothing renders — no heading, no placeholder. It carries
no images, no curriculum/big-idea/topic binding, and no row in the link
graph (data model §1b) — the same deliberate absence of structure AD-26
already gives the Resources page, applied here at single-field scale rather
than a whole part.
**Rationale:** Luke's own description — "miscellaneous notes, catchup work,
tangents or left over work from another lesson" — is explicitly a catch-all,
the same kind of content the Resources page exists to hold without forcing
it into the tiering/binding/coverage system every other part uses
(AD-25/AD-26). Scoping it to plain text only (no images, no links) matches
what was actually asked for, and keeps FR-LP-17's page-count math (front
page plus zero to three tier pages) completely untouched — the sidebar lives
inside the front page's existing bounds and never adds a page of its own.
**Rejected:**
- A sidebar running down **every** page of the lesson plan (front page and
  every tier page) — rejected as unrequested scope. Luke's examples
  ("catchup work… left over work from another lesson") read as a
  lesson-level note authored once, not per-tier content, and a
  whole-document layout region would touch every tier page's print CSS for a
  feature that does not need to.
- A **structured reference to another lesson** (a real `lessonId` link, so
  "leftover from Lesson 3" is a working citation rather than typed text) —
  rejected in favour of plain text, matching Luke's own choice and the
  Resources-page precedent of leaving informal content informal. A
  structured cross-lesson reference can be added later as its own change if
  real use shows it's needed.
- Letting the sidebar carry **pasted images** (FR-IMG), like the lesson
  plan's other regions — rejected for now as more than was asked; nothing
  about "miscellaneous notes" implies images, and the field can be widened
  later without a breaking change.
**Consequence:** FR-LP-18/19 (PRD) carry this. No new data-model invariant is
needed beyond documenting the field — a plain optional string has no
resolvability or cardinality concern the existing invariant set doesn't
already cover generically.

---

### AD-37 — Each mini assessment carries its own big-idea binding, not one shared across the whole Unit Assessment

**Decision:** `MiniAssessment` gains its own mandatory `bigIdeaId`
(INV-DM-37), independent of `UnitAssessment.bigIdeaId` — which is **narrowed**
to bind the final assessment specifically, not the document as a whole
(FR-UA-5, rewritten). Two mini assessments in the same unit may now bind to
two different big ideas, and therefore place under two different topics.
**Rationale:** this was surfaced, not invented, by the combined Lessons &
Topics view (AD-38): asked to show "assessments as a subset" of each topic,
the existing rule — one big idea for the *entire* Unit Assessment document,
final and every mini alike (AD-23's original wording) — meant every mini
assessment in a unit would formally collapse onto whichever single topic that
one shared big idea happened to belong to, regardless of which lessons or
topics actually used it. The unit-assessment mockup already showed different
mini assessments ("Timeline check," "Source drill") cited from lessons under
different topics — the data model just never gave them the independent
binding to make that formally true. Mirroring `Lesson.bigIdeaId`'s pattern
exactly (one binding per document that needs one) is the same shape already
proven at INV-DM-15, not a new kind of rule.
**Rejected:**
- Leaving the shared binding and deriving each mini assessment's topic
  instead from the lessons that reference it (`lesson.assessmentLink`) —
  workable, but adds a genuinely new kind of derived edge (assessment →
  topic via a third entity's forward references) for a fact a direct
  binding states more simply, and leaves an assessment no lesson yet
  references with no topic to place under at all.
- Renaming `UnitAssessment.bigIdeaId` to `finalAssessmentBigIdeaId` for
  clarity — correct in spirit, but a field rename ripples through FR-UA-5…7,
  the link graph, and every cross-reference for a readability gain the
  field's doc-comment already delivers cheaply; declined for now, revisit if
  the old name genuinely confuses a future reader.
**Consequence:** FR-UA-4/5/13 (PRD); INV-DM-37, the `MiniAssessment` entity
table, and a new link-graph row (data model). `AC-UA-4/8` updated
accordingly. No change to `Lesson.assessmentLink` or to how a lesson cites
its assessments (FR-LP-5, FR-UA-8) — this is a binding on the assessment
side only.

---

### AD-38 — Lessons and Topics merge into one combined view; completion is an explicit, manual, per-item flag

**Decision:** the standalone Topics view (FR-TOP-8, original) and the Lessons
tab (FR-LP-14) merge into **one combined Lessons & Topics view**: every topic
as a heading, its lessons and its assessments (via AD-37's independent
bindings) listed beneath it, the whole unit readable top to bottom in one
scroll. A lesson, a mini assessment and the final assessment each gain a
plain boolean `completed` flag, set directly by a person, never derived; a
topic's own completion is derived from whether everything under it is
individually marked complete (three states: not started / in progress /
complete, mirroring FR-BI-12's gap states).
**Rationale:** Luke: *"a combined sequential 'Lessons and Topics' page that
displays topics with lessons ... as a subset, and assessments as a subset ...
at a glance you can see the whole unit laid out ... with the ability for some
sort of colour change when completed."* Two separate screens for what is, in
practice, one mental model (what does this unit contain, and how far along
is it) forced a teacher to cross-reference between them for the same
information Topic already groups; folding them into one outline is a direct
reading of what was asked, not an elaboration on it. The completion flag
being **explicit** rather than derived is the more consequential call: this
document's earlier draft (OQ-DM-15, now superseded) reached for inferring
"complete" from a lesson's `number` against "the highest lesson taught so
far" — but that requires the system to already know what "taught so far"
means, which is circular without something to anchor it, and it silently
breaks the moment a lesson is skipped and returned to later. A person saying
"yes, I taught this" is a fact worth storing on its own, not worth guessing
at from a proxy.
**Rejected:**
- Keeping the two views separate and merely cross-linking them — closer to
  the smallest possible change, but does not deliver "at a glance the whole
  unit," which is the actual ask; a click-through is not a glance.
- Deriving completion from `Lesson.number` and a stored "current lesson"
  pointer (a smaller schema footprint than three new booleans) — rejected
  for the same circularity/skip-fragility reason above, and because it would
  need a *fourth* new field (the pointer) to anchor the other three, no
  cheaper in practice.
- Deriving completion from tier content being non-empty (INV-DM-33's
  existing test) — rejected: a lesson can be fully drafted and never taught,
  or taught with a thin tier page; content completeness and teaching
  completeness are different facts, and conflating them would make the flag
  lie in both directions.
**Consequence:** FR-TOP-8 (rewritten), FR-TOP-10, FR-TOP-11 (PRD); FR-LP-14
retired, its acceptance criteria moved to FR-TOP-8's; `Lesson.completed`,
`MiniAssessment.completed`, `UnitAssessment.finalAssessmentCompleted` (data
model), no new invariant beyond documenting the fields (plain booleans carry
no resolvability concern). OQ-DM-15 is marked superseded rather than deleted,
recording what was tried and why it didn't survive contact with the actual
request.

---

### AD-39 — The marking matrix gains a scope axis: per-assessment and full-unit, orthogonal to display mode

**Decision:** the matrix gains a second, independent axis — **scope** —
alongside the existing display-mode toggle (AD-MMB-11) and orientation
(AD-MMB-7). **Full-unit** scope is today's behaviour unchanged: every
criterion across every tier and assessment, one page per student.
**Per-assessment** scope filters the same template and the same student
instances down to the criteria bound to one selected assessment
(`criterion.assessmentIds[]`, AD-MMB-3). Both scopes are available in both
edit view and print view. Scope is **not** stored duplicate data — it is a
computed filter, the same "view, not a second store" treatment AD-MMB-11
already gives display mode and AD-MMB-4 already gives totals.
**Rationale:** Luke asked for both "a per-assessment matrix (marking one
assessment on its own) and a full-unit matrix (the whole unit aggregated)."
The existing `criterion.assessmentIds[]` binding (AD-MMB-3) already carries
everything needed to answer "which criteria belong to this one assessment" —
scope is a filter over data this build already has, not a new relationship.
**Rejected:** a genuinely separate per-assessment matrix document, with its
own `matrixTemplate`/`matrices[]` pair per assessment — would fork the
"one template, one shape" guarantee INV-DM-19 exists to protect into N
forks, one per assessment, and would require a teacher to enter the same
student's mark twice if a criterion happens to serve two assessments;
per-assessment as a **screen-only** convenience with no print output —
rejected because Luke asked for both scopes in both views, and a teacher
handing back one assessment's marks needs a printable page exactly as much
as a full-report-card teacher needs the full-unit one.
**Consequence:** FR-MM-9/10 (PRD); FR-MMB-33…36 (build); AD-MMB-14/15 (build
decisions) carry the mechanics; INV-DM-40 (data model) states scope stores
nothing new.

---

### AD-40 — Tiered-ceiling mark allocation: budgets divided across criteria at setup, not marks rescaled at grading

**Decision — reverses OQ-MMB-8.** The full-unit marking matrix totals
**exactly 100**, reached through three cumulative tier ceilings: Pass alone
→ 50; Pass + Intermediate → 75; Pass + Intermediate + Advanced → 100.
Mechanically, each tier carries a **fixed mark budget** — Pass 50,
Intermediate 25, Advanced 25 — and at **setup time** (Default Full mode,
the template-editing phase per AD-MMB-13) the tool **allocates** that
budget evenly across every non-overridden criterion currently in the tier:
`rawShare = budget / N`; each criterion's `maxScore` is `rawShare` floored to
the nearest half mark; the exact 0.5-multiple remainder (`budget − N ×
flooredShare`, always itself a multiple of 0.5 because `budget` is an
integer) is redistributed as one extra 0.5 to the first `remainder ÷ 0.5`
criteria, in the tier's existing stable array order. This lands exactly on
the tier's budget with no leftover, for any positive `N` (INV-DM-38).
**Worked example** (3 Pass, 2 Intermediate, 4 Advanced criteria):
- Pass: `50 ÷ 3 = 16.6̄` → floor to `16.5` each → `3 × 16.5 = 49.5` →
  remainder `0.5` → one criterion gets `+0.5` → **`[17, 16.5, 16.5]`**, sum
  **50**.
- Intermediate: `25 ÷ 2 = 12.5` exactly → **`[12.5, 12.5]`**, sum **25**
  (the one case that divides evenly, included deliberately to show the
  remainder step is skipped when it isn't needed).
- Advanced: `25 ÷ 4 = 6.25` → floor to `6.0` each → `4 × 6.0 = 24.0` →
  remainder `1.0` → two criteria get `+0.5` each → **`[6.5, 6.5, 6.0, 6.0]`**,
  sum **25**.

  A student scoring **full marks on the three Pass criteria only** (nothing
  else attempted) totals `17 + 16.5 + 16.5 = 50`, with the five
  Intermediate/Advanced criteria unmarked and therefore contributing `0` to
  the numerator while their `maxScore`s still sit in the denominator
  (AD-MMB-5, unchanged by this decision) — **50 / 100 (50%)**, exactly the
  Pass ceiling. Adding **full marks on the two Intermediate criteria**
  (`12.5 + 12.5 = 25`) brings the running total to `50 + 25 = 75` — **75 /
  100 (75%)**, exactly the Pass+Intermediate ceiling. Adding **full marks on
  the four Advanced criteria** (`6.5 + 6.5 + 6.0 + 6.0 = 25`) brings the
  total to `75 + 25 = 100` — **100 / 100 (100%)**, the full ceiling. This is
  the mandatory worked example referenced by FR-MM-11/12, AC-MM-9 and
  FR-MMB-37/AC-MMB-34/35.
**Half-mark achievability, stated explicitly:** because every tier budget
(50, 25, 25) is an integer and the redistribution step above always
redistributes in exact 0.5 units, the allocation is **guaranteed** to land
every criterion's `maxScore` on a 0.5 boundary, for any criteria count —
there is no case in this scheme where the half-mark requirement cannot be
met.
**Assumption flagged plainly — this is the coordinating agent's reading of
"grading fuzzy logic that spreads the ideal number of grades out across the
descriptions and assessments," not a direct instruction, and is open to
correction:** allocation happens **once per tier**, across *all* of that
tier's criteria regardless of which assessment(s) they are bound to — not
separately per assessment. A per-assessment matrix's own subtotal (AD-39)
is therefore whatever share of the tier ceilings its bound criteria happen
to carry, not a number independently pinned to any round total. If Luke
instead wants each *assessment* to also hit a round sub-ceiling (e.g., "each
assessment should itself total something tidy"), that is a materially
different allocation scheme — assessment-scoped budgets nested inside
tier-scoped ones — and would need to be specced separately; nothing here
assumes it.
**✅ CONFIRMED (rev 13).** Luke, asked directly: "The 100-points are per
unit per student. The marking algorithm or fuzzy logic... keeps adjusting
as new criteria and assessments and 'setup' grades are entered." This is
the per-tier, all-criteria-in-that-tier reading above, not per-assessment
sub-ceilings — the dynamic re-allocation Luke describes is exactly
FR-MMB-38's existing re-allocate-on-add/remove behaviour. The assumption
flag is lifted; this paragraph's reading now governs without qualification.
**Rejected:**
- **Rescaling `awardedScore` at grading time** (e.g., storing a raw mark and
  dividing by whatever the tier's raw total happens to be) — this is
  precisely what OQ-MMB-8 already closed against once ("no normalisation");
  reversing OQ-MMB-8 to mean *this* would simply reopen the same mistake
  under new cover. Allocation acts on `maxScore` at setup; `awardedScore` is
  never touched by it.
- **Allocating per assessment, not per tier** — considered, because Change T
  adds an assessment scope in the same amendment, but rejected as the
  default reading: Luke's own numbers (50/75/100) describe **tier**
  ceilings, not assessment ceilings, and nothing in the request implies each
  assessment must itself sum to a fixed figure. Flagged above as the
  assumption most likely to need correction.
- **Rounding to the nearest whole mark instead of the nearest half** —
  breaks the project's standing half-mark requirement (AD-MMB-8) the moment
  a tier's criteria count doesn't divide its budget evenly, which per the
  worked example is the common case, not the exception.
- **Silently topping up or trimming the last criterion to force the sum**
  (rather than the stable-order remainder distribution) — arithmetically
  equivalent in total but non-deterministic in *which* criterion gets the
  extra half mark unless an order is named; naming the tier's existing
  array order (already used for reordering, FR-MMB-2) avoids inventing a
  second ordering concept.
**Consequence:** FR-MM-11/12 (PRD, new); FR-MMB-37/38 (build, new);
INV-DM-38 (data model, new). OQ-MMB-8 in `marking-matrix.build.spec.md` is
marked **superseded** in place, not deleted or reworded — see that file's
§6.

---

### AD-41 — A manual `maxScore` override opts a criterion out of automatic tier allocation

**Decision:** Default Full mode's existing, already-specced ability to hand-
edit a criterion's `maxScore` (FR-MMB-28) now also sets
`allocationOverridden: true` on that criterion (INV-DM-39). An overridden
criterion is excluded from AD-40's automatic allocation from that point on;
when a sibling criterion is later added or removed and the tier
re-allocates (FR-MMB-38), only the **non-overridden** criteria in the tier
share the tier's *remaining* budget — the tier's fixed budget minus whatever
the overridden criteria already claim. If overrides alone exceed the tier's
budget, the tier is **unbalanced** — shown as a visible flag, not blocked
and not silently corrected.
**Rationale:** this directly answers the interaction the amendment brief
named explicitly: "whether a teacher can override an allocated maximum by
hand, and what that does to the ceilings." Refusing all manual edits once a
tier is auto-allocated would contradict FR-MMB-28's existing, already-
accepted design ("each cell's own maximum, adjustable — the setup mode");
letting an override silently get overwritten the next time the tier
re-allocates would make the override pointless and surprising the first
time it happened. Excluding overridden criteria from the pool, and flagging
rather than blocking an unbalanced result, follows the same "flag, don't
truncate or silently fix" instinct AD-17 already established for the crib
sheet's page cap.
**Rejected:**
- **Refusing manual overrides once a tier is allocated** — contradicts
  FR-MMB-28's already-settled design and removes exactly the "adjustable"
  half of "each cell's own maximum, adjustable."
- **Silently re-normalising every criterion in the tier back to the exact
  budget whenever an override is entered** (so the tier always nets to
  50/25/25 no matter what) — would make a teacher's deliberate override of
  one criterion invisibly ripple into every sibling criterion's ceiling,
  the exact "silent rescale" failure mode AD-MMB-12 already exists to
  prevent, one layer over.
- **Blocking an override that would push the tier over budget** — treats a
  soft design target (the tier "should" sum to its budget) as a hard
  validation rule nobody asked for; a teacher may have a real reason to
  want a tier worth more or less than the nominal ceiling for one unit, and
  the tool's job is to make that visible, not to forbid it.
**Consequence:** FR-MM-12a (PRD, new); FR-MMB-39 (build, new); INV-DM-39
(data model, new); AC-MM-10, AC-MMB-38 exercise this directly.

---

### AD-42 — The combined Lessons & Topics view becomes print-capable, but stays cross-cutting — not a seventh part

**Decision — reverses part of FR-TOP-8's "screen-only, never printed" text.**
The combined Lessons & Topics view (FR-TOP-8, AD-38) now also renders as a
printed A4 portrait document, flowing to as many pages as the unit needs
(FR-TOP-8a). It is **deliberately not counted** among the widget's six parts
(FR-SYS-2, FR-SYS-11, INV-DM-18, AC-SYS-6) — FR-TOP-8b states this plainly in
the PRD.
**Rationale — why "cross-cutting, not a seventh part" rather than the more
literal reading:** every existing "part" in this spec (curriculum map,
lesson plan, Unit Assessment, marking matrix, crib sheet, resources page)
is defined by carrying its own **schema-backed singular object** with its
own cardinality invariant (INV-DM-18) and its own `AC-SYS-6`-style "two of
them is invalid" test. The Lessons & Topics view has never had one and gains
none here — it remains a pure derived render over `lessons[]`, `topics[]`,
`bigIdeas[]` and `unitAssessment`, exactly the category AD-35 already puts
the big-idea list and the Topics list in. Printing it does not change what
it *is*; it changes what it can *do*. Calling it a "part" merely because it
now prints would be naming by output format rather than by the schema
property ("part-ness") the term has consistently meant throughout this spec
— and would trigger cardinality machinery (INV-DM-18, AC-SYS-6) that has
nothing to check, since there is no stored object to duplicate.
**Rejected — the seventh-part reading, considered seriously:** treating this
as FR-SYS-2's seventh part was the literal reading of "it now prints like
the others," and was rejected because of its blast radius versus its actual
payoff. It would require: renumbering FR-SYS-2's "six parts" to seven
everywhere the count is asserted (FR-SYS-11's cardinality clause, the PRD's
Traceability table, AD-23's ordinal "Part 1…Part 6" placement language, and
every "six parts" reference across the registry and notes.md — a change
this amendment is explicitly not scoped to make); inventing a cardinality
invariant for something that is, structurally, still just a view (nothing
to be "singular" about, since nothing is stored); and reopening AC-SYS-6's
"two objects is invalid" test for an object that does not exist. None of
that machinery does any real work here — the view already renders exactly
once per unit because its source data (`topics[]`, `lessons[]`) already is
singular/well-formed, with no new invariant needed to guarantee it. The
literal reading buys nothing but churn.
**Consequence:** FR-TOP-8/8a/8b (PRD); no new data-model entity or field —
print is a rendering path only, the same "derive, don't duplicate" instinct
INV-DM-12 already applies everywhere else. FR-SYS-4a's orientation table
gains a footnoted row for the view, explicitly marked outside the six-part
count, so the arithmetic doesn't silently drift.

---

### AD-43 — Crib-sheet sections are individually resizable and support bounded formatted text

**Decision:** each `CribSheet.sections[]` entry gains a `size` field
(`"small"` \| `"medium"` \| `"large"`, optional, defaults to `"medium"` —
INV-DM-41) controlling its rendered height. Additionally, section `text`
supports **Markdown-style formatting** — `**bold**`, `*italic*`, and `- bullet
items` — rendered correctly in both edit view and print view (FR-CS-11,
FR-CS-6a). Unsupported Markdown syntax (headers, code blocks, links, etc.) is
treated as literal text.

**Rationale — size:** crib sheets need flexibility. A teacher may want to
emphasize one big idea visually (large), compress a minor clarification
(small), or default-size most sections (medium). The three discrete sizes (not
a scale or pixel input) match the project's "simple, thin parts" philosophy
(AD-26, AD-29) and teacher intuition (S/M/L is familiar). Critically, **size
does not trigger auto-shrink or silent truncation** — a resized section that
would push the sheet past the 1-or-2-page cap (FR-CS-5, FR-CS-10, AD-17,
AD-30) is **flagged exactly as any other overflow**, the same "never silently
cut" principle that governs the cap itself. The cap stays the teacher's
responsibility to manage, not the tool's.

**Rationale — text formatting:** plain text alone is limiting for reference
content. Teachers need bold for emphasis, italics for conventions (e.g.,
"*compare with*" or *"after 1990"*), and bullet lists for quick scans. Markdown
is human-readable in the JSON, requires no library, and teachers already know
it. Three formatting features—no more—are all a bounded vocabulary needs.
Unsupported syntax treated as literal text avoids weird rendering surprises and
keeps the parser simple (no library, no escaping).

**Rejected:**
- A per-half page cap (AD-30 already rejected this — a real unit is lopsided,
  and artificial per-half limits fail fast).
- A pixel-input or percentage-scale size field (invites fiddling without
  pedagogical clarity; three named sizes are enough).
- Auto-shrinking content when resize breaks the cap (violates the
  project's "never silently cut" stance; see AD-17, AD-30); deferred until real
  teaching shows a need.
- Full rich-text formatting (exceeds "simple, thin parts"; requires a library
  or a custom editor; Markdown covers 90% of the use case at 10% of the cost).
- Letting Markdown headers, code blocks, and links render as special (the
  formatted subset is bounded **by design** to prevent feature creep).

**Consequence:** FR-CS-11, FR-CS-6a (PRD); AC-CS-7/8/9 (PRD); INV-DM-41 (data
model); `CribSheet.sections[]` adds the `size` field (optional, three-value
enum); section text rendering gains a Markdown parser limited to **bold**,
*italic*, and bullets. No new data-model cardinality invariant beyond
INV-DM-41's three-value discipline. No new cross-reference risk — size is a
layout property only, never stored or referenced elsewhere.

> **Amendment — 2026-08-20 (Change AC).** Every reference above to "the
> 1-or-2-page cap" (FR-CS-5, FR-CS-10, AD-17, AD-30) now means **the 1-page
> cap** — the threshold at which a resized section is flagged **halves**,
> from "would push the sheet past 2 pages" to "would push the sheet past 1
> page." Nothing else about this AD changes: resizing still never
> auto-shrinks or truncates (this AD's own rejected-alternatives list already
> rejected that, and Change AC does not reopen it), and the three discrete
> sizes are unaffected. The original text above is left untouched as the
> historical record; see **AD-46**.

> **Amendment — 2026-08-20 (Change AF).** Every reference above to "the
> 1-page cap" (as halved by the Change AC amendment) reverts to **the
> 1-or-2-page cap** — the threshold at which a resized section is flagged
> returns to "would push the sheet past 2 pages," undoing the Change AC
> halving. Nothing else about this AD changes: resizing still never
> auto-shrinks or truncates, and the three discrete sizes are unaffected.
> Both amendments above are left untouched as the historical record; see
> **AD-48**.

---

### AD-44 — Every shared entity has exactly one editing surface; every other appearance is a read/navigate reflection (New — Change AA)

**Decision:** Big Ideas and Topics each split into two kinds of property,
and each kind has **exactly one** screen that may write it — every other
screen that shows the entity is a display-only reflection of the same
underlying object (never a copy, per the standing "single source of truth"
discipline INV-DM-12/AD-14 already establish), or offers only a *binding*
change (pick a different existing entity), never an *identity* edit.

| Entity | Property | Sole editing surface | Everywhere else it appears |
|---|---|---|---|
| Big idea | Name, hierarchy (add/rename/reorder/reparent/delete — FR-BI-3) | **Lessons & Topics** view | Curriculum Coverage grid: name only, read. Lesson Plan: name only, read (plus the FR-LP-20 lesson-count badge, itself derived, never stored). |
| Big idea | Curriculum-node coverage (`coverage[]`, FR-BI-7/9) | **Curriculum Coverage** grid (FR-BI-10) | Nowhere else — not Lessons & Topics, not Lesson Plan. |
| Topic | Name, hierarchy (add/rename/reorder/delete — FR-TOP-2) | **Lessons & Topics** view | Lesson Plan: name only, read (FR-LP-1a, resolved transitively, never stored on `Lesson`). |
| Topic | Curriculum-node coverage (`coverage[]`, FR-TOP-6) | **Curriculum Coverage** grid (FR-BI-14/FR-CUR-12's third column group) | Nowhere else. |

Luke's own framing, verbatim: *"Editing a big idea in 'lessons and topics'
updates it in the lesson plan and 'Curriculum coverage' BUT big idea
assignment to unit descriptions... takes place in the curriculum coverage."*
Topics follow the identical split, for the identical reason — Topics were
built as an extension of the same axis (AD-35) and already share the
coverage grid's third column group with Big Ideas (FR-BI-14).

**The Lesson Plan's Big Idea box (FR-LP-2, FR-LP-20) is a third thing again,
not a smaller version of either row above:** its picker changes
`lesson.bigIdeaId` — *which* big idea this lesson points to (FR-BI-4's
binding) — never the big idea's own name, hierarchy, or curriculum-node
coverage. Three different actions can look similar in a UI (all are "editing
something about a big idea") but touch three different pieces of state, on
three different screens, and this decision is what keeps a future build from
collapsing them into one control by accident.

**Rationale:** the data model already guarantees *propagation* for free —
every reference is by id, nothing is ever duplicated (INV-DM-12 and its
siblings), so a rename typed in one place is definitionally the same value
everywhere it's read. What the data model does **not** constrain is *where
the write control lives* — FR-BI-3 says the list is "editable," FR-BI-10 says
the grid supports "attaching and detaching," but neither previously said
these were the **only** places, on the same page different mockup authors or
future builds could plausibly add a second rename box on the Lesson Plan
"for convenience," creating two write paths into one field with no
conflict rule between them. This decision closes that gap before any of
those screens are built.

**Rejected:**
- Letting every screen that displays a big idea or topic also edit its name
  — convenient in isolation, but multiplies the number of places a future
  build must wire up validation (FR-BI-8's refuse-if-referenced rule,
  FR-TOP-7's equivalent) and reopens the exact "which one is canonical"
  question INV-DM-12 already closed for storage.
- Deriving the Curriculum Coverage grid's edits back into a "big idea
  identity" change — the grid attaches/detaches *links*, never renames the
  big idea itself; keeping the two fully separate (different screen, different
  field) is what makes FR-BI-10's own "acting from the grid may edit from
  either direction" safe to say without it creeping into identity edits too.

**Consequence:** no new IDs required — FR-BI-3, FR-BI-7, FR-BI-9, FR-BI-10,
FR-TOP-2, FR-TOP-6, FR-LP-2 and FR-LP-20 are unchanged; this decision states
the exclusivity across them that was previously only true by omission. Any
future mockup or build for the Lessons & Topics view, the Curriculum
Coverage grid, or the Lesson Plan is reviewed against this table.

> **Amendment — 2026-08-22 (`bigidea-list` build spec).** This table's
> **big idea Name/hierarchy** row is **superseded**: the sole-editing-surface
> rule for that one property is dropped. **AD-51** (Change AJ) gave the Big
> Idea Tree's markdown outline its own write path onto `title`, `order` and
> `parentId` without amending this AD, and never flagged the collision —
> AD-51's own "Assumption flagged plainly" note explicitly asked for this to
> be corrected before `bigidea-list` was built. Asked directly, Luke chose:
> **both the Big Idea Tree and the (still-unspecced) Lessons & Topics view
> may write big idea name/hierarchy**, against the same underlying
> `BigIdea` records — no exclusivity.
>
> This does not reopen the two-independent-validation-paths risk this AD was
> originally written to prevent: `bigidea-list` (the build owning
> `BigIdeas[]`) exposes **one shared write API** — add / rename / reorder /
> reparent / delete, including FR-BI-8's refuse-if-referenced check and
> INV-DM-14's two-level cap — and **every** editing surface, present or
> future, calls that API rather than validating independently. The Big Idea
> Tree's outline editor is `bigidea-list`'s own first caller of it
> (FR-BI-16…20); the Lessons & Topics view, whenever it is specced and built,
> is required to call the same functions, not reimplement them (mirroring
> `AD-LPB-1`'s tier-emission-logic sharing rule for the lesson plan and Unit
> Assessment). This AD's **other three rows are unaffected** — big idea
> curriculum-node coverage, topic name/hierarchy, and topic curriculum-node
> coverage keep their original sole-editing-surface assignments exactly as
> the table above states; only the one row is reopened, and only to the
> extent Luke's answer above requires.
>
> **Consequence:** the table's first row's "Sole editing surface" column now
> reads "Big Idea Tree **and** Lessons & Topics (shared write API)" rather
> than "Lessons & Topics" alone; `bigidea-list.build.spec.md`'s AD-BI-1
> records the build-level detail of this shared API.

---

### AD-45 — The final widget guide is a standalone reference document, not a build or a seventh part (New — Change AB)

**Decision:** the **final widget guide** is a Markdown reference document —
not code, not a `.dc.html` artboard, not a build spec, not one of the
widget's six parts (FR-SYS-2/FR-SYS-11 unaffected, the same non-collision
reasoning AD-42 already used for the printed Lessons & Topics view). It
lives alongside this project's other narrative documents and explains the
**cross-cutting behaviours** that no single part's own spec states on its
own — the "through-themes," Luke's own term, that only become visible once
several parts are read together. New requirement family **FR-GUIDE** (PRD)
names what it must contain; AC-GUIDE-* checks that content is present and
accurate against the specs it summarises, not that any UI renders it.

**Rationale:** every other document this project produces (PRD, data model,
arch, build specs, mockups) is organised **part-by-part** — FR-BI covers big
ideas, FR-TOP covers topics, FR-LP covers the lesson plan — by design,
because that's the right shape for specifying and building each part in
isolation. That same shape is the wrong shape for the questions Luke is
actually asking day-to-day once the widget exists ("if I rename a big idea
here, does it change there too? where do I actually assign curriculum
coverage?") — those questions cut across FR families, and no single family's
spec is the right place to answer them without every other family
duplicating the answer. A standalone document, read on its own, is exactly
the artefact this project already uses for the same problem at the
meta-level: `registry.md` and `handoff.md` are cross-cutting reference docs
about the *project*; the widget guide is the same idea, one layer down,
about the *widget itself*.

**Rationale — why not an in-app screen:** Luke's own call (confirmed
directly, not defaulted) — this is his own personal tool, not a product with
outside end users; a Markdown doc costs nothing to keep in sync by hand and
needs no build, no artboard, no `document-shell` rendering path, no printing
rule. Revisit only if the widget gains other users who can't be handed a
file.

**Rejected:**
- An in-app help/about screen — a real, plausible alternative (it would sit
  naturally alongside the other screens), but rejected for now on cost:
  it is a new build with its own UI, states, and print behaviour to spec,
  for content whose only reader today is Luke, who already reads Markdown
  specs directly.
- Folding the cross-cutting content into an existing FR family (e.g.
  appending it to FR-TR, which already covers cross-part navigation) —
  rejected because the guide's job is to be **read whole**, not consulted
  one requirement at a time; splitting it across families the way FR-TR/
  FR-BI/FR-TOP are split would recreate the exact fragmentation problem the
  guide exists to solve.
- Treating it as a seventh part with its own printed document — rejected on
  the same grounds AD-42 already gave Topics: it carries no schema-backed
  singular object, so counting it against FR-SYS-2 would be churn with no
  functional payoff.

**Consequence:** new PRD family **FR-GUIDE-1…4** (below); no data-model or
build-spec change; FR-SYS-2's six-part count and FR-SYS-11's cardinality
clause are both unaffected. The guide's own location and filename are set by
FR-GUIDE-2.

**⚠️ AMENDED 2026-08-20 (Change AE) — coverage and navigation only.** Luke's
instruction that the guide "document cross-module behaviour, feature
light-weight navigation and all essential software decisions" exposed two
gaps this decision's original FR-GUIDE-1…4 left implicit rather than
required: the guide named itself navigable (FR-GUIDE-1) without requiring
any concrete navigation aid, and named itself a record of decisions
(AD-45's own rationale) without a testable rule for which ones. New
**FR-GUIDE-5…8** close both gaps: FR-GUIDE-5/6 require a short index and a
change-to-screen map — both plain Markdown inside the same single file,
so AD-45's "costs nothing to keep in sync by hand" reasoning still holds;
FR-GUIDE-7 states this explicitly, so the navigation aids cannot later grow
into a build of their own without a fresh decision; FR-GUIDE-8 states the
inclusion test for "essential" ("a maintainer who doesn't know it will
break something or re-derive it wrong"), because the guide cannot simply
restate all 47 ADs and still be the thing AD-45 rejected an in-app screen
in favour of on cost grounds. This amendment adds a fifth through-theme to
FR-GUIDE-3 — AD-47's non-summing unit-progress block — the one theme
reviewed against this decision's criteria (spans two parts, not
reconstructable from either FR family alone) that qualified; AD-46 (crib
sheet page cap) was reviewed and found to be a single-part change, so it
does not. Nothing else in AD-45 changes: the guide is still not a build,
still not a seventh part, still kept in sync by hand.

**Consequence (amendment):** PRD family widened to **FR-GUIDE-1…8**; new
**AC-GUIDE-5, AC-GUIDE-6**; FR-GUIDE-3 gains a fifth through-theme. Still no
data-model or build-spec change; FR-SYS-2's six-part count unaffected.

---

### AD-46 — The crib sheet's page cap tightens to exactly 1 page; the drawn fold line is removed (New — Change AC)

**Decision:** the crib sheet's page cap **tightens from "1 or 2, enforced"
(AD-17) to exactly 1 page, always.** Content that would spill onto a second
page is flagged — never truncated, never silently spilled — at the same
threshold AD-17 previously reserved for a third page. The crib sheet's
**drawn fold line** — the visual divider between the upper and lower halves,
and any hard page break associated with it — is **removed**. The two-half
structure itself (AD-29, FR-CS-8, FR-CS-9) is **unchanged**: sections still
belong to exactly one half, and the upper half still renders above the lower
half — only the drawn line between them is gone. The `CribSheet.pageCount`
field is **removed** from the data model (data model §1, INV-DM-42
supersedes retired INV-DM-16) — a field with exactly one legal value (`1`)
carries no information, so it is dropped rather than retained pinned to that
value. Orientation (portrait/landscape, FR-SYS-4a) is unaffected — this
decision does not touch orientation.

**Rationale:** Luke, directly: *"Remove fold line from crib sheet. Crib
sheet mockup also wrongly says page 1 of 2. The crib sheet can never be more
than 1 page."* The mockup's "page 1 of 2" was wrong under the **new** rule,
not the old one — but auditing why exposed that the old 1-or-2-page rule
(AD-17) and the "nominal fold" rule (AD-30) were themselves in tension: a
fold described as "nominal, not fixed" (AD-30) still implied a drawn line
that could, on a 2-page sheet, coincide with the page break — a coincidence
that stops being possible, and stops making sense to draw at all, once the
sheet can never exceed 1 page. Tightening the cap **strengthens** AD-17's
original design intent rather than weakening it: AD-17 already argued that
"page three is the feature — it forces the distillation that makes the
artefact useful"; capping at exactly 1 page pushes the same forced-
distillation argument one page further and removes the escape hatch a
2-page allowance quietly offered.

**Rejected:**
- **Keeping the 2-page cap** and only fixing the mockup's wrong "page 1 of 2"
  string — rejected because it treats the mockup as the bug and the cap as
  correct, when Luke's instruction states the cap itself ("can never be more
  than 1 page"), not just its display, as wrong.
- **Allowing 2 pages only in landscape** (more horizontal room per page might
  seem to justify a laxer cap in one orientation) — rejected: Luke's
  instruction draws no orientation distinction, FR-SYS-4a's orientation
  choice is explicitly unaffected, and admitting an orientation-conditional
  cap would reintroduce exactly the "page cap governs the whole sheet, not a
  special case" complexity AD-30 already fought to keep out.
- **Auto-shrinking text to fit one page** rather than flagging overflow —
  rejected because it directly contradicts AD-43's explicit no-auto-shrink
  stance ("violates the project's 'never silently cut' stance") and AD-17's
  original rejection of the same idea ("produces an unreadable sheet and
  hides the real problem, which is too much content"). Flagging, not
  shrinking, remains the sheet's only response to overflow.
- **Retaining `pageCount` pinned to `1`** rather than removing it — considered
  as the more conservative, less-disruptive option, but rejected: a field
  that can only ever hold one value stores no information and exists only as
  a load-bearing lie waiting to happen (e.g., a stale bundle carrying `2`
  being trusted instead of flagged). Removing it is more consistent with
  this project's "derive, don't duplicate" discipline (INV-DM-12) applied to
  a degenerate case.

**Consequence:**
- PRD: **FR-CS-1** (REVISED — "1 or 2 page" → "1 page"), **FR-CS-5** (REVISED
  — cap is exactly 1), **FR-CS-10** (REVISED — fold is removed, not merely
  nominal), **FR-CS-11** (REVISED — overflow threshold halves), new
  **FR-CS-12** (states the reversal explicitly), **AC-CS-1, AC-CS-2, AC-CS-6,
  AC-CS-7** (all REVISED from "2 pages"/"page 3" to "1 page"/"page 2"), new
  **AC-CS-10** (mockup/render must never show a page count other than "page 1
  of 1"; no drawn fold line of any kind). **FR-CS-8, FR-CS-9 are explicitly
  unaffected** — the two-half structure survives. **FR-SYS-4a** (orientation)
  is explicitly unaffected.
- Data model: `CribSheet.pageCount` field **removed** (§1); retired
  **INV-DM-16**; new **INV-DM-42** (states the fixed 1-page constraint,
  enforced rather than stored).
- Arch spec: **AD-17, AD-30, AD-43** amended in place with dated amendment
  blocks (above) — original wording preserved, not rewritten.
- No FR-CSB build-family counterpart was found to exist in this revision (the
  crib sheet's build coverage runs under the single `crib-sheet` build
  entry — see the PRD's Traceability table); no build spec is edited by this
  change, only flagged for the same drift in a separate pass if a build spec
  exists outside the three files in scope here.

> **Amendment — 2026-08-20 (Change AF).** Luke reviewed this decision's
> page-cap tightening and reversed it: *"I was wrong about the 1 page crib
> sheet. The spec was correct up to 2 pages."* **The page-cap decision above
> is reversed** — the cap returns to 1-or-2, enforced (AD-17's original
> rule), `CribSheet.pageCount` is restored to the schema, and INV-DM-16 is
> reinstated in place of INV-DM-42. **This AD's other decision — removing the
> drawn fold line between the two halves — stands, unchanged.** The two-half
> structure (AD-29, FR-CS-8, FR-CS-9) remains unaffected either way. The text
> above is left untouched as the historical record of what Change AC decided;
> see **AD-48** for the full reversal, rationale, and every touched ID.

---

### AD-47 — The marking matrix's Student-data print sheet drops its page counter for a sheet identity, and gains a non-summable unit-progress block (New — Change AD)

**Decision — two parts, both on the Student-data print sheet only.**

**Part A — sheet identity replaces the page counter.** The print header no
longer carries a positional page count (the mockup's "page 6 of 24"). It
instead **identifies the sheet**: the student's name, the class/unit, and
the assessment whose criteria the sheet's rows belong to. Under **full-unit**
scope (FR-MM-9) the assessment element names the **scope itself** — the
sheet covers every assessment in the unit, so it reads as the unit-wide
sheet, not any one assessment's name. Under **per-assessment** scope it
names the **one selected assessment**. The Setup blank sheet (FR-MMB-43) has
no student to name; its header carries the **class/unit and "Setup"** in the
identity element's place — it never prints an empty name field where a name
would otherwise sit, because Setup is a template artefact with no student
attached to it at all (FR-MMB-43 already forbids any student data from
appearing on it).

**Part B — an auto-generated unit-progress block.** The Student-data print
sheet gains a new block listing **every assessment in the unit** — the one
final assessment and all mini assessments — with this student's own
per-assessment subtotal beside each (FR-MM-10's roll-up arithmetic,
restricted to that assessment's bound criteria); an assessment with no
scored criteria for this student shows a dash, the same unmarked convention
FR-MMB-10a already uses per-cell. A **unit total** sits at the bottom of the
block, computed independently as the tiered-ceiling figure out of 100
(AD-40/FR-MM-11) — never as a sum of the rows above it.

**The arithmetic problem, named explicitly.** FR-MM-10 allows a criterion to
bind to more than one assessment. A per-assessment subtotal counts that
criterion's full mark toward **each** assessment it's bound to, while the
full-unit total counts it **once** — so the moment any criterion is shared
across assessments, the progress block's assessment rows **do not sum** to
the unit total beneath them: the rows add to more than 100 while the true
unit total is 100. A block that visually reads as "these numbers, added,
equal this total" and then doesn't is a worse artefact than no block at
all — a student doing that addition by hand gets a wrong answer and has no
way to know why.

**Resolution:** rows show each assessment's **true, unaltered per-assessment
subtotal** (the same figure FR-MM-10 already defines and per-assessment
print already shows, FR-MMB-34/35) — never adjusted, apportioned or
"corrected" to make a column sum work. The unit total shows the
**separately-computed tiered-ceiling total** (AD-40) — never derived from
the rows above it. The two figures are **visually separated so they cannot
read as a column and its sum**: the unit total sits in its own bordered
panel, offset from the assessment-rows list by a visible gap and a rule,
carrying its own "Unit total" label and its own distinct weight/size — the
same separation technique the per-student page already uses between the
criteria table and its totals band (`MarkingMatrix.dc.html`'s existing
header-to-table gap). No caption or note explaining *why* the rows don't sum
appears anywhere on the page — SR-9 forbids a permanent caption restating a
rule to the reader; the separation itself, not a sentence about it, is what
tells a reader the two are not one running total. This is a **layout**
requirement, not a copy requirement (FR-MMB-45).

**Rationale (Part A).** Luke: *"the 'page number of' is odd, pages of what?
Make that a more useful bit of information."* A position-in-a-print-run
number answers a question ("where am I in this stack of paper") that only
matters while physically sorting printed sheets, and even then a name does
the job at least as well while also answering the more useful question —
*whose* sheet is this, and *what* is it marking. Luke's own resolution —
"Student name + class + assessment" over a positional count — is implemented
directly.

**Rationale (Part B).** Luke: *"I want a auto-generated total list of
assessments for the unit and the total score, with the total unit score at
the bottom. So while the page displays marking criteria for that one
specific student for that one specific assessment they can also see at a
glance their overall unit progress."* The block exists precisely so a
student reading one assessment's detailed criteria on the page in front of
them can also see, without requesting a second document, where they stand
across the whole unit — the per-assessment print output (FR-MMB-34) already
narrows the page to one assessment's criteria; this block is what keeps the
bigger picture visible on that same narrowed page.

**Rejected:**
- *(Part A)* Keeping a page count — rejected on Luke's own stated reason,
  above; a count answers a less useful question than an identity does.
- *(Part A)* Showing both identity and a count — rejected as clutter for no
  gain: nothing in Luke's request asks for the count to survive alongside
  the more useful information, and a header carrying both is harder to
  scan than one carrying either.
- *(Part B)* Showing rows as each assessment's **contribution to the unit
  total**, with a shared criterion attributed to only one assessment so the
  rows *would* sum — rejected because it breaks the stronger guarantee: an
  assessment's row would then no longer match the mark the student was
  actually handed back for that assessment (FR-MM-10's own per-assessment
  subtotal, and per-assessment print's FR-MMB-35 figure). A block that sums
  cleanly but lies about any one row is worse than one that is honest and
  doesn't sum.
- *(Part B)* Forbidding criteria from binding to more than one assessment,
  so the double-count problem cannot arise — rejected as a reversal of
  FR-MM-10/AD-39, which deliberately allow a shared criterion; undoing that
  to simplify a print block is solving the wrong problem at the wrong
  layer.
- *(Part B)* Printing an explanatory caption stating why the rows don't sum
  to the total — rejected outright by SR-9: a permanent line of screen text
  whose only job is to explain a rule to the reader is developer-facing
  reasoning in the wrong place. The layout must carry the distinction on
  its own.

**Consequence:**
- PRD: new **FR-MM-14** (Part A, print header identity), new **FR-MM-15**
  (Part B, unit-progress block), new **AC-MM-12, AC-MM-13**.
- Build spec (`marking-matrix.build.spec.md`): new **FR-MMB-44** (Part A,
  extends FR-MMB-14's print citation rule without amending its text), new
  **FR-MMB-45** (Part B, extends FR-MMB-32's Student-data print path
  without amending its text — the block is additional content on the same
  sheet, not a change to FR-MMB-32's raw-value arithmetic rule), new
  **AC-MMB-41…45**, new decision entry **AD-MMB-20** (recorded there per
  SR-4, not re-derived).
- Data model: **no change.** `Matrix.scores[]` already records only entered
  values (`{ criterionId, awardedScore, comment }`, data model §5); a
  criterion with no matching entry is already unmarked by absence, which is
  exactly the dash rule FR-MMB-10a already renders. The unit-progress block
  reads existing fields through existing computed formulas (FR-MM-10,
  AD-40) — it stores nothing new.
- `MiniAssessment.weighting` (data model §, carried over unchanged from the
  former `Assessment` entity) plays **no part** in either part of this
  decision — flagged, not resolved, as a candidate for a future prune if no
  other requirement is found to depend on it.
- FR-MMB-43 (Setup blank sheet) is explicitly **unaffected** by Part B — the
  unit-progress block never appears there; it is a Student-data-only
  addition.

---

### AD-48 — The crib sheet's page cap reverts to 1-or-2, enforced; the drawn fold stays removed (New — Change AF)

**Decision:** the crib sheet's page cap **reverts to "1 or 2, enforced,"
AD-17's original rule.** AD-46's tightening to exactly 1 page (Change AC) is
**reversed** in full: content may again legitimately run to 2 pages, and
overflow is flagged only past a **third** page, exactly as AD-17 originally
specified. `CribSheet.pageCount` (`1` \| `2`) is **restored** to the data
model; **INV-DM-16** is reinstated as the governing cardinality invariant;
**INV-DM-42** (the "always exactly 1 page" invariant Change AC introduced) is
superseded in turn. **AD-46's other decision is unchanged and stays in
effect:** the crib sheet's **drawn fold line** between the upper and lower
halves remains **removed** — no divider, no `page-break-after`, nothing
between the halves but ordering. The two-half structure itself (AD-29,
FR-CS-8, FR-CS-9) was never in question and remains exactly as it has stood
since Change K.

**Rationale:** Luke, directly: *"I was wrong about the 1 page crib sheet.
The spec was correct up to 2 pages."* This is Luke **correcting his own
earlier instruction**, not proposing a new design — the project's role here
is to restore the prior-considered position, not to re-litigate it. AD-17
already argued at length, and AD-30/AD-43 already extended that argument to
the two-half structure and to resizable sections: an unbounded crib sheet is
just the unit notes, and the cap is what forces the distillation that makes
the artefact useful — but that argument was always made **for a 1-or-2-page
cap**, not a 1-page cap. AD-46 (Change AC) tightened it on the reasoning that
"page three is the feature" straightforwardly implies "page two is the
feature, too" — a reasonable extension in the abstract, but not what Luke
actually wants in practice, as this correction now makes explicit. Nothing
about AD-46's **fold-line** reasoning depended on the page-cap number as
such — the fold was removed because a drawn line implying a possible page
break makes little sense once folds and page breaks stop needing to line up
at all under a single-page-only regime; that reasoning weakens with a 2-page
cap restored, but Luke's original, separate instruction — "remove the fold
line" — was never itself under review here and stands on its own terms,
independent of the page-count question. Splitting the two decisions apart
(as AD-46's consequence section already did, listing them as two distinct
effects) is what makes this partial reversal possible without disturbing
settled ground.

**Rejected:**
- **Reverting AD-46 in full**, including the fold-line removal — rejected:
  Luke's correction names only the page-cap ("I was wrong about the 1 page
  crib sheet"); it says nothing about the fold, and the original instruction
  to remove the fold ("Remove fold line from crib sheet") is untouched by
  this correction. Reverting it too would silently undo a decision nobody
  asked to revisit.
- **Leaving `CribSheet.pageCount` removed** and treating "1 or 2" as an
  enforced-but-unstored constraint (mirroring INV-DM-42's now-superseded
  approach at the new cap value) — rejected: AD-46 itself only removed the
  field because a single-legal-value field carries no information; with two
  legal values restored, that justification no longer holds, and the field
  is worth storing again, matching AD-17's original schema.
- **A fresh AD-17-style full rewrite** of the crib sheet's page-cap rules,
  discarding AD-46/AD-30/AD-43's amendment trail — rejected: the project's
  standing rule is that decision history is never rewritten, only amended or
  superseded in place; a fresh rewrite would erase the legible record of
  what Change AC did and why Change AF undoes it.

**Consequence:**
- PRD: **FR-CS-1** (reverted — "1 page" → "1 or 2 page"), **FR-CS-5**
  (reverted — cap is "1 or 2"), **FR-CS-10** (cap wording reverted; fold
  removal unaffected), **FR-CS-11** (overflow threshold reverted to "past 2
  pages"), **FR-CS-12** (marked superseded in place, original text
  preserved), **AC-CS-1, AC-CS-2, AC-CS-6, AC-CS-7** (all reverted to "1 or 2
  pages"/"page 3" language), **AC-CS-10** (revised — page-count string must
  accurately reflect the actual 1-or-2 count; fold-line prohibition
  unaffected), **FR-RES-7** (its cross-reference to the crib sheet's cap
  reverted to "1-or-2-page cap"). **FR-CS-8, FR-CS-9** (two-half structure)
  are explicitly **unaffected**. **FR-SYS-4a** (orientation) is explicitly
  unaffected.
- Data model: `CribSheet.pageCount` field **restored** (§1, `1` \| `2`);
  **INV-DM-16** reinstated (retirement note preserved, reinstatement noted in
  place); **INV-DM-42** marked superseded in place, original text preserved;
  the stale-bundle migration prose in data model §1 corrected — a
  `pageCount: 2` bundle is a legitimate two-page sheet again, not an overflow
  signal.
- Arch spec: **AD-17, AD-30, AD-43, AD-46** each gain one further dated
  amendment block, appended below their existing Change AC amendments —
  original wording of every prior block preserved, not rewritten.
- Mockups: `CribSheet.dc.html` and `CribSheetScreens.dc.html` — `pageCapHeight`
  in `checkOverflow()` restored to `2 * 1123` (2246); overflow tooltip
  reworded to a 2-page-cap message in plain teacher-facing language (SR-9);
  the fold line, "fold" label, and any `page-break-after` remain **absent**
  in both — Change AC's removal of those stands.

---

### AD-49 — Every curriculum node carries a derived Skill/Knowledge glyph; big ideas inherit it from what they cover (New — Change AH)

**Decision:** the Victorian Curriculum (and any curriculum built the same
way) splits its content descriptions across strands — for History,
"Historical Concepts and Skills" and "Historical Knowledge and
Understanding." A new `Node.domain` field (`skill` \| `knowledge` \| unset,
INV-DM-43), set only on `kind: strand` nodes, records which side of that
split a strand is on; an `outcome`/`task` node's effective domain is derived
by walking `parentId` up to its nearest ancestor strand, never stored on the
node itself. Wherever a node's code and description render — arbor tree,
coverage grid, lesson plan, Unit Assessment, marking matrix, crib sheet
(FR-CUR-13) — a small glyph precedes it: a **pencil** for `skill`, a **ruled
notebook** for `knowledge`, in the same Teal/Rose pair AD-13c's Change AG
already established for Skills/Knowledge (`#0F7B6C` / `#B23A6B`). A big
idea's own glyph set (FR-BI-15) is the **union** of the domains among every
node in its `coverage[]` — none, one, or **both** — derived fresh on every
render (INV-DM-12, matching FR-BI-13's discipline), never stored, and shown
before every mention of the big idea's title, not only on the curriculum map.
Luke, directly: *"wherever a description aka criteria (with a code) appears
I want a glyph before it that indicates if its a skill or a knowledge. I
then want big ideas that are associated with that description aka critera to
take on the relevant glyph in front of every mention of it. Big ideas could
have both."* Five candidate glyph pairs were sketched (filled shapes, sharp
geometry, letter badges, dingbat pair, line icons); Luke picked the pencil /
ruled-notebook pair.

**Rationale:** the classification is a **fact already latent in the ingested
curriculum's own strand structure** — ArborTree.dc.html's fixture already
groups its seven leaf nodes under exactly two strand boxes, one per side of
the split, before this decision existed. `domain` just makes that fact
addressable and paints it, rather than leaving it implicit in tree position.
Deriving it (never storing it on outcome/task nodes, and never storing it on
big ideas) keeps one source of truth: correcting a strand's `domain` once
fixes every descendant node and every big idea that covers them, with
nothing else to re-save. Marking it `unset`-able keeps the feature
curriculum-agnostic (INV-DM-10): a curriculum with no such split, or with a
split the heuristic can't read, simply shows no glyphs, rather than forcing
a guess.

**Rejected:**
- **This is the same decision as AD-29** and should reuse the crib sheet's
  `half` field — rejected. AD-29 governs a **page-layout choice** Luke makes
  by hand per crib-sheet section, explicitly *not* derived from coverage data
  ("which half it prints under is a page-layout choice Luke makes, not a
  fact the coverage data determines"). This decision is the opposite: a
  **read-only, always-derived annotation** on a fact the curriculum source
  already states. A big idea can sit in the crib sheet's upper half by
  Luke's layout choice while still showing both glyphs, because it also
  touches a knowledge-domain node elsewhere — the two mechanisms coexist
  without conflict, exactly because neither one governs the other.
- **A manually-tagged `domain` on every outcome node**, set by hand at
  ingest review — rejected as needless repetition: real strand splits are
  few (typically two) while outcome nodes number in the dozens per unit;
  tagging the handful of strands and deriving the rest is the same
  "correct once, fixes everywhere" logic AD-16 already uses for ingest
  guesses generally.
- **Colour-only encoding, no shape** — rejected on the same greyscale-print
  ground `LessonsAndTopicsPrint.dc.html`'s existing legend already states:
  a colour-only signal disappears on a black-and-white printout or for a
  colour-blind reader; pencil vs notebook keeps a distinct silhouette
  independent of colour.
- **Emoji or a coloured icon-font glyph** — rejected: the crib sheet renders
  as SVG and prints to PDF (FR-CS-4); emoji glyph coverage and colour
  rendering are inconsistent across the vanilla, dependency-free stack this
  project requires (AD-13a, FR-SYS-8). A hand-drawn two-tone line icon in
  the existing token colours renders identically everywhere.

**Consequence:**
- PRD: **FR-CUR-13**, **AC-CUR-13** (new — node-level glyph); **FR-BI-15**,
  **AC-BI-10** (new — big-idea glyph union, derived).
- Data model: **`Node.domain`** field added (§1, `Node`); **INV-DM-43**
  (new) states the strand-only-set / derive-by-walking-parentId rule and the
  big-idea union rule.
- Arch spec: this entry.
- Mockups: glyph markup to be added wherever a node code or big-idea title
  renders — `ArborTree.dc.html`, `Main.dc.html`, `UnitAssessment.dc.html`,
  `LessonPlan.dc.html`/`LessonPlanPrint.dc.html`,
  `LessonsAndTopics.dc.html`/`LessonsAndTopicsPrint.dc.html`,
  `CribSheet.dc.html`/`CribSheetScreens.dc.html`. `MarkingMatrix.dc.html` and
  `MatrixSetupPrint.dc.html` carry criteria, not curriculum-node codes
  directly (FR-MM's criteria are matrix-native, not `Node`s) — out of scope
  for this decision unless a future change binds a criterion to a node.

---

### AD-50 — Lessons and Topics gain optional scheduling; grouping by date is a view, not a second store (New — Change AI)

**Decision:** a lesson, a mini assessment, and the final assessment each gain
two optional, independent fields — `date` (ISO `YYYY-MM-DD`, INV-DM-44) and
`lessonPeriod` (freeform text, e.g. `"Mon 3rd-4th P"`) — entered on the
combined Lessons & Topics view's edit mode and printed beside each item
(FR-TOP-12/13/13a). The view also gains a **grouping toggle** — by Topic
(unchanged default) or by Date (FR-TOP-14) — available in both edit and
print. In Date mode, every lesson and assessment sorts into date order under
a heading for its date, undated items collect under one trailing
"Unscheduled" heading, and each row carries its own topic as an in-row label
rather than a section heading (FR-TOP-14a). Luke: an optional way to "insert
dates (e.g. Mon 3 Aug) and/or lesson-period (e.g. Mon 3rd-4th P) ... topics
lessons could be grouped inside the date/lesson-period format."

**Rationale — two fields, not one:** a calendar date and a recurring
timetable slot answer different questions ("which day did/will this happen"
versus "which period does this sit in, this week or every week") and a
teacher may know one before the other, or only ever use one. Forcing them
into a single field would mean parsing a compound string like "Mon 3rd P, 3
Aug" back apart every time it needs to sort or group — fragile, and contrary
to the schema's standing preference for one field per fact (e.g. `date` and
`lessonPeriod` here mirror the same independence `Lesson.completed` and
`Lesson.number` already have from each other). **`date` as ISO, not a stored
display string:** storing `"Mon 3 Aug"` verbatim would make the field
undiffable against a genuine date and, worse, unsortable without re-parsing
prose — exactly the trap AD-2's "reproducible from the same input" concern
and INV-DM-12's "derive, don't duplicate" discipline both warn against.
Deriving the display string from a stored ISO date at render time is the
same move already made for every other computed label in this schema (glyph
sets, gap states, topic status). **`lessonPeriod` as free text, no
structure:** a "period" is entirely a function of one school's timetable —
some run numbered periods, some run named blocks, some run a rotating
letter-day cycle — and inventing a canonical period schema would be
curriculum-agnostic's opposite: a school-timetable-specific field pretending
to be general. `Lesson.sidebar` (AD-36) already established that some
teacher-facing content is legitimately unstructured; a period slot is the
same kind of fact. **Grouping as a view, not stored data:** the same
reasoning AD-39 already gives the marking matrix's scope axis and
AD-MMB-11 gives its display mode — a topic's `coverage[]`, a lesson's
`bigIdeaId`, and now a `date`/`lessonPeriod` pair are already enough to
compute either grouping on demand; storing "which grouping was last viewed"
would be state about the *view*, not the *unit*, and AD-42 already drew that
line for this same view when it stayed cross-cutting rather than becoming a
seventh part with its own schema object.

**Rejected:**
- **A single combined `schedule` string field** — rejected for the
  parsing-fragility reason above; also would not degrade gracefully to
  "date only" or "period only" without inventing a delimiter convention no
  one asked for.
- **Deriving `lessonPeriod` structure (weekday + period number) as sub-fields**
  — rejected: buys sortability the freeform field already forgoes by design
  (a period slot's *day* is frequently redundant with `date`'s own weekday
  when both are set, and meaningless to structure when `date` is absent and
  the slot is a recurring weekly one) at the cost of a school-timetable
  schema this project has no reason to standardise (INV-DM-10's
  curriculum-agnostic instinct, applied one layer over to timetables).
- **Storing the grouping mode on the unit** (a persisted "last viewed as
  Date" preference) — rejected as unnecessary state for a toggle that costs
  nothing to recompute, and because AD-42 already declined to give this view
  any schema-backed object to hang such a preference on; adding one now
  just to remember a toggle would reopen a door that decision deliberately
  closed.
- **Requiring a date before a period can be entered, or vice versa** —
  rejected: Luke's own phrasing ("and/or") states the independence directly,
  and a teacher who only knows the recurring slot but not yet the calendar
  date (or has locked in a date but the period is still being negotiated)
  is a completely ordinary case, not a data-entry error to block.
- **Merging the topic heading and date heading into one two-level grouping**
  (topic, then date within it, or date, then topic within it) — rejected as
  answering a question nobody asked: Luke described two *alternative* whole-
  unit views ("grouped inside the date/lesson-period format," read as
  replacing the topic-first layout, not nesting inside it), not a drill-down
  hierarchy; a two-level grouping would also reintroduce exactly the
  cross-reference friction AD-38 removed by merging Topics and Lessons into
  one flat, scannable outline in the first place.

**Consequence:**
- PRD: **FR-TOP-12/13/13a/14/14a/14b** (new); **AC-TOP-12…15** (new).
- Data model: **`Lesson.date`, `Lesson.lessonPeriod`,
  `MiniAssessment.date`, `MiniAssessment.lessonPeriod`,
  `UnitAssessment.finalAssessmentDate`, `UnitAssessment.finalAssessmentPeriod`**
  fields added (§1); **INV-DM-44** (new) states the ISO-vs-freeform split, the
  independence of the two fields, and that grouping mode is unstored.
- Arch spec: this entry.
- Mockups: `LessonsAndTopics.dc.html` (setup — per-row date/period entry
  affordance, grouping toggle) and `LessonsAndTopicsPrint.dc.html` (print —
  per-row date/period text, Topic-grouped) updated; a new
  `LessonsAndTopicsPrintByDate.dc.html` added to illustrate the Date-grouped
  print layout, since it restructures the page (headings become dates, topic
  drops to an in-row label) rather than merely adding text to the existing
  layout.

---

### AD-51 — The Big Idea Tree: a markdown outline edits the big-idea list, an ASCII connector tree prints it, both one-click copyable (New — Change AJ)

**Decision:** the big-idea list (FR-BI) gains its own cross-cutting screen,
the **Big Idea Tree**. **Setup mode** replaces (or at least supplements) any
form/drag-and-drop editor with a **plain markdown-style outline**: one line
per big idea or sub-big idea, `- Title`, one level of indentation nesting a
sub-big idea under the nearest preceding unindented line. Editing the
outline directly edits `BigIdea.order` (line position) and `BigIdea.parentId`
(indentation) — no new field. **Print mode** renders the same list as an
**ASCII/monospace connector tree** (`├──`, `└──`, `│`), A4 portrait, fixed
like the lesson plan (AD-11). A big idea with no sub-big ideas renders as a
bare line in both modes — no connector — so an unarranged list reads as a
plain list, not a tree of stubs. Both modes carry a **one-click
copy-to-clipboard** button that copies exactly the text on screen. Like the
combined Lessons & Topics view (AD-42), this stays **cross-cutting, not a
seventh part** — no new schema-backed singular object, `bigIdeas[]` already
exists and is already singular (INV-DM-18).
Luke, directly: *"An ASCII tree style family tree (portrait) of all the big
ideas of the unit, with simple markdown assistance to allow me to arrange
them, the default is a list until I put them in sequence. It will need to
have input/setup version and printable version. It will be called the `Big
Idea Tree` it needs to be one-click copyable."*

**Rationale — markdown outline as the editing surface, not a display
format:** every other markdown use in this project so far (crib-sheet
section text, AD-43) is **inline formatting of prose** — bold, italic,
bullets rendered within one field. This decision uses markdown-style syntax
differently: **indentation in the outline directly drives structural data**
(`order`, `parentId`). That is a deliberate departure worth naming, because
it is the fastest editing model for exactly the shape this list already has
— two levels, curated order, frequent re-arranging as a unit takes shape.
Cutting, pasting and re-indenting lines in one text block is mechanically
faster than the form-per-item / explicit reorder-button alternative OQ-18
already accepted as the coverage grid's baseline, for a list this project's
own fixtures show tends to be short (four or five top-level ideas, a
handful of sub-ideas each) — exactly the size where a flat outline stays
legible and a form list does not obviously win. **Rationale — flat list is
the default, not a stub tree:** rendering every big idea as a one-node
"tree" before any nesting exists would be visual noise for the common early
state of a new unit — a handful of working titles, not yet organised.
Showing a bare list until a big idea actually has children matches how
Luke described the state transition himself ("the default is a list until I
put them in sequence") rather than inventing a "still deciding" visual state
nobody asked for. **Rationale — copy on both, not just one:** the setup
outline and the print tree serve different destinations — the raw markdown
pastes cleanly into another markdown document or editor, the connector tree
pastes cleanly into a monospace context (chat, plain-text notes, a fixed-
width email) where box-drawing characters need to render aligned. Luke asked
for "one-click copyable" without naming just one of the two views, and the
two outputs are different enough that offering only one would silently pick
a destination for him.

**Rejected:**
- **A conventional form/drag-and-drop editor**, matching the coverage grid's
  interaction model (FR-BI-10) — considered as the "consistent with the rest
  of the app" default, but rejected because Luke asked specifically for
  markdown-assisted arranging, not for parity with the grid's own editing
  style; the two screens can reasonably use different interaction models
  when the underlying data shapes differ this much (a ~40-row grid versus a
  short two-level outline).
- **Treating the Big Idea Tree as the widget's seventh part** — rejected for
  the exact reason AD-42 already rejected it for the Lessons & Topics view:
  no schema-backed singular object of its own, nothing for `AC-SYS-6`'s
  cardinality test to check, and a renumbering ripple (FR-SYS-2/FR-SYS-11,
  every "six parts" reference) this decision has no reason to trigger.
- **A single combined setup+print screen** (one outline, styled to also look
  like the printed tree) — rejected: the outline needs to stay plainly
  editable text (so cut/paste/reindent works cleanly), while the print
  output needs the polished box-drawing characters and A4 pagination;
  conflating the two would either make the editor look like a locked
  read-only tree or make the printed page look like a raw text file.
- **Copying only the print view's rendered tree** (treating the setup
  outline as "just the editor," not a copy source) — rejected per the
  rationale above: Luke asked for copy on the feature generally, and the raw
  markdown is itself useful to paste elsewhere (e.g. into another outline
  tool) independent of the pretty-printed version.
- **Silently re-indenting or dropping a third-level line** rather than
  refusing it — rejected on the same "flag, don't silently fix" ground
  AD-17 and AD-41 already establish project-wide; INV-DM-14's two-level cap
  is a hard data rule, and an editor that quietly "corrected" a typo-level
  indentation mistake would hide a structural change the person didn't ask
  for.

**Assumption flagged plainly — open to correction:** the outline is read as
editing **title, order and parentId only** — a big idea's optional `text`
elaboration and its `coverage[]`/`topicId` bindings are assumed to stay on
whatever per-item detail surface the eventual `bigidea-list` build gives
them (a click-to-expand panel, most likely), not inline in the outline
itself. Luke's brief said "arrange them," which this reads as structural
arrangement specifically, not full-content editing; if the intent was a
richer per-line format (e.g. trailing text after the title), that changes
the outline's parse rule and should be corrected before `bigidea-list` is
built.

**Technical note:** `navigator.clipboard.writeText()` is a standard Web API
with no server round-trip and no added dependency (FR-SYS-8 stays satisfied)
— it requires a secure context, which `localhost`/`127.0.0.1` (how every
bundle's `serve.py` is reached, FR-BND-4) already satisfies, so this works
identically to every other bundle feature that assumes the local server is
running.

**Consequence:**
- PRD: **FR-BI-16…20** (new); **AC-BI-11…13** (new); FR-SYS-4a's orientation
  table gains a Big Idea Tree row, footnoted the same way the Lessons &
  Topics view's row already is (AD-42).
- Data model: **no new field** — `BigIdea.title`/`order`/`parentId` already
  carry the outline; a documentation note added under `BigIdea` (§1) points
  here rather than duplicating the rule INV-DM-14 already states.
- Arch spec: this entry.
- Mockups: new `BigIdeaTree.dc.html` (setup — markdown outline, copy button)
  and `BigIdeaTreePrint.dc.html` (print — ASCII connector tree, copy button,
  A4 portrait) added. Other mockups' tab bars are **not** updated to add a
  "Big Ideas" tab in this pass — a cosmetic navigation sync, not part of
  this decision's scope, left as a known follow-up.

---

## Open questions

- **OQ-1** — One single-file artefact for all six parts, or separate files
  sharing a chassis? *Default:* **separate documents, one shared shell** — see
  [`document-shell`](../../_Builds/document-shell.build.spec.md). Now largely
  pre-decided by AD-11: with six parts spanning three orientations, mixed
  printing probably forces separate documents. Q-2b settles it. *(Updated to
  "six parts" — Change E/G/H; still three orientation values, since the Unit
  Assessment reuses the lesson plan's portrait.)*
- **OQ-2** — Which subject and level is the first real unit? The spike needs
  one to test against. *Default:* whichever unit Luke is closest to teaching.
- **OQ-3** — Does the tool need to open two units side by side? *Default:* no.
- ~~**OQ-4** — Target browser?~~ **Closed in rev 3: Chrome on macOS only**
  (FR-SYS-9). Personal tool, one machine; AD-5 needs the File System Access API.
- **OQ-5** — Which curricula beyond Victorian get a **bespoke profile** rather
  than the generic fallback? *Default:* none in v1 — Victorian plus generic.
  Profiles are added on demand, each one a small build.
- ~~**OQ-6** — Default orientation for a new marking matrix?~~ **Closed as
  G-7: portrait**, matching the lesson plan. *(Still reads correctly under
  Change F — see AD-24's closing note: the default now belongs to the one
  unit-level `matrixTemplate`, not to one template among many, but the fact
  itself — portrait — is unchanged.)*
- **OQ-7** — Should the print view citations carry a short unit-local reference
  (e.g. "L3 → VC2M8N01") or the full title text? *Default:* both — the code for
  precision, the title so it reads without the other document in hand.
- **OQ-8** — Default crib sheet shape: 1 page or 2, portrait or landscape?
  *Default:* **1 page portrait**, expandable to 2 — start at the tightest thing
  that could work and let Luke loosen it.
- **OQ-9** — Should `_Ingest/` be watched automatically, or digested on an
  explicit run? *Default:* **explicit run** — a watcher is a background process,
  which AD-13's "no running services" instinct argues against, and ingest is a
  once-per-unit act.
- **OQ-10** — When ingest re-runs on a unit that already has nodes, merge in
  place or write to a staging area for review? *Default:* **staging area** —
  FR-CUR-1f's "never destroys existing work" is easier to guarantee than to
  test, and a diff view is more useful than a merge anyway.
- **OQ-11** — Does the crib sheet need its own images, or only the lesson plans?
  *Default:* both (FR-CS-6) — a crib sheet with a diagram is often the whole
  point of a crib sheet.
- **OQ-12** — Should a big idea be able to carry its own tier hints (what
  "pass" looks like for this idea), feeding lesson generation? *Default:* no in
  v1 — tiers are per-lesson. Worth revisiting after real use; it would make the
  generator noticeably smarter.
- ~~**OQ-13** — How does the UI navigate three hundred matrix instances?~~
  **Superseded in rev 4 (Change F, AD-24):** the marking matrix is now one
  unit-level document paginated by student — thirty pages for a class of
  thirty, not three hundred lesson×student instances. There is no longer a
  "which lesson, then which student" question to answer; navigation is
  simply "which student's page."
- **OQ-14** — What port does a bundle's `serve.py` use? *Default:* pick the
  **first free port from a range** and print it, rather than a fixed number —
  two units open at once must not collide. The existing viewers use fixed ports
  (8787, 8788) because they are singletons; bundles are not.
- **OQ-15** — Does `!NewUnit` seed the curriculum by running `ingest.py`, or
  create an empty unit for Luke to ingest into afterwards? *Default:* **empty
  bundle**; ingest is a separate, re-runnable step. One job per tool (SR-1).
- **OQ-16** — Should a bundle record which template version generated it?
  *Default:* **yes** — `generatedFrom` in `unit.json`. Cheap now, and the only
  way to tell later which bundles predate a template fix (AD-18).
- **OQ-17** — Does the template live inside this repo as `_template/`, or as a
  fifth top-level folder alongside `_Builds/`? *Default:* **`_template/`** at
  the repo root — it is the product, not a spec-framework folder, and the
  underscore keeps it sorted with the structural items.
- **OQ-18** — Does the coverage grid's attach/detach and big-idea-reorder
  behaviour (AD-22) need a keyboard-equivalent path, or is drag-and-drop-only
  acceptable for a single-user local tool? *Default:* **yes, a keyboard
  equivalent exists** — every grid cell is a focusable toggle (Enter/Space
  cycles empty → full → partial → empty) and reordering has explicit
  move-up/move-down controls beside any drag gesture; drag-and-drop is a
  convenience layer, not the only path. Luke is the only user, but a
  mouse-only editor over a ~40-column grid is a usability tax on him too, not
  only an accessibility gap for someone else.
- **OQ-19** — ✅ **RESOLVED (2026-08-19).** Luke, asked directly whether the
  Unit Assessment should follow the lesson plan's 1-to-N page rule: **"yes"**.
  AD-33's conditional-page rule therefore governs the Unit Assessment too:
  `finalAssessment` and every `miniAssessment` emit a front page always, plus
  one page per tier that has content — 1 to 4 pages each, over the unchanged
  mandatory three-tier schema (INV-DM-1, INV-DM-25 intact). Implemented in the
  shared tier-page rendering path rather than diverging per part, per the
  recorded default. FR-UA and the `unit-assessment-document` build are updated
  accordingly.

- **OQ-20** — ✅ **RESOLVED (2026-08-19).** Luke: **"yes promote it"**. AD-34
  is now **SR-9** in the house-wide Vibe Coding Rules
  (`Memory/Long-Term/Coding/vibe-coding-rules.md`), binding on every project,
  not just this one. AD-34 remains here as the project-level record of where
  the rule came from; SR-9 is the authority. *(A Long-Term memory write, made
  on Luke's explicit approval.)*
- **OQ-21** — *(New — Change T)* Does `csv-export` (not yet built) export
  the per-assessment scope as its own file, or does the CSV export stay
  full-unit only, with per-assessment scope a screen/print-only affordance?
  *Default:* **full-unit only for now** — `csv-export` is unspecced and this
  amendment does not touch it (FR-MMB-16 already scopes CSV export out of
  `marking-matrix`'s own build). Revisit when `csv-export` is actually
  specced; nothing here blocks adding a per-assessment export later.
