# Project Dashboard

A live-and-offline view of every tracked project — what needs Luke, what he's waiting on,
what's due this week — read from `Memory/Medium-Term/Projects/` and drawn as one packed
isometric mass, quartered by context. It replaces `System/Tools/project-dashboard/`, which
stays in place (and is not to be deleted) until every acceptance test here passes and its
retirement goes through `!Checkpoint`.

**It has a companion.** `app/STYLE.md` is the visual source of truth — what each mark means
and what colour it is. Nothing visual is described here; this file says how the app is put
together and why.

**About the FR-, AC- and AD- numbers in the code.** They cite the design specs, which were
retired when this app moved here — a spec is a rebuild instruction, and a thing that is built
and runs describes itself. The numbers are kept because they are stable names for particular
decisions, and because the code's own comments already argue in them; **the specs they point at
no longer exist**, so do not go looking. Every decision that still matters is in section 1
below, or in `app/STYLE.md` if it is visual. If you find a comment citing a number whose reason
is recorded in neither place, that is a gap in this file — write the reason down here.

## 1. Key decisions

**Whose move is it.** Every task carries a *kind* (1 waiting, 2 unshaped, 3 mine, 4
hand-over, 5 incoming), and only kinds 3 and 4 demand Luke — this is the one rule everything
else in the app reads off. Kind answers a different question from `state` (which is
temperature — waiting, urgent, undefined — not grammar), so the two are never conflated: the
crown, the outlines, *This week* and Unblock all gate on kind, never on state. A kind 5 is a
wrapper over a future kind 3 or 1, not a state of its own — nothing about it demands anything
until its date arrives, at which point it becomes a 3 if it's Luke's or a 1 if it's someone
else's.

**The crown is a project-level fact, not a per-cube one.** A stack's topmost cube is the only
upward face that survives being packed — every cube below it is capped from above. Drawing
each cube's own kind on its own top face would therefore report the *highest kind number
present*, not whose move it is — it looks right and is wrong. So the crown is computed once
per project in `model.py` (`_crown`, sole-blocker / shared / none) and the renderer never
reads a task's kind to decide it. The rule is deliberately narrow: **sole-blocker requires an
open kind 3 or 4 *and no open kind 1*.** The wide version (any open 3 or 4) lit 35 of 40
projects and separated nothing; the narrow one means a lit crown is actionable — waiting on
Luke alone, nobody else to chase.

**A mind project is a stack of height zero, computed, never declared.** `_is_mind_project`
returns true when every open task is kind 2 or 5 — vacuously true, on purpose, for a project
with no open tasks at all, since the glossary calls that same case a "plate" and the crown has
no fourth slot for it. This was questioned during the build and confirmed against the PRD and
the glossary before being kept. A computed flag can't go stale the way a declared
`mind_project: true` (or the `parked` tier it replaced) can.

**Fluorescent marking is reserved for due dates on open kinds 3 and 4 — never for a wake or an
incoming, however far past either is.** A wake and an incoming are dates, not demands; marking
them urgent would collapse the kind grammar above. The week view's rail gets this right by
construction — `model`'s week-set already pulls anything overdue into a separate cap before
the rail ever sees a day — but it is recorded as a decision because the first drawing of it
got this wrong in the natural direction, ringing every past-dated entry and reading three
times more urgent than the board actually was.

**The completion log feeds nothing today, and that's fine.** `writes.py` appends one row per
completed action, in the same call as the completion itself, and nothing currently reads it
back. Its failure mode is being deleted as unused by an agent who greps for a reader and finds
none — it exists so Luke's capacity matrix (below) has real history to be fitted against
later, and a log can't be back-filled once the gap exists.

**The occlusion lane is 1.6× the cube's *half*-width, not the full width.** Using the full
width doubles the lane and made the hit-test report 22 of 40 stacks hidden from all four
rotations against a measured 4 — falsely condemning the exact rotation the whole board rests
on. `app/monitor/occlusion.js` has a regression test pinned to this; don't "simplify" the
constant back to the full width.

**Beyond those six, the decisions worth knowing:**

- *One renderer serves both live and offline faces* (`server.py` serves JSON; the same
  `app/monitor` ES modules run on `localhost` and get inlined into the snapshot). The
  alternative — building HTML as Python strings, as `System/Tools/`'s sibling viewers do —
  means writing the renderer twice, which is exactly the drift this app can't afford between
  its live and frozen views. This needed a rule exception; see §4.
- *`monitor` never imports the write client*, at all — enforced by what's imported, not a
  runtime flag. The one thing that crosses from `monitor` into `unblock` is a DOM
  `CustomEvent` (`projectdashboard:open-unblock`), so "no acting while monitoring" can't be
  defeated by one careless edit.
- *`model.py` touches no file, no clock, no network* — `today` is always passed in
  (`build_board(sources, *, today, ...)`). Every burnout rule the app has — what counts as a
  demand, what lights a crown, what reaches *This week* — is unit-testable without a
  filesystem because of this, and that testability is the app's actual reason to exist.
- *Concurrency is a 409, not a lock.* `writes.py` guards every edit with the file's mtime as
  last read (`StaleMtimeError`); a stale write is refused rather than merged, and the file
  stays byte-unchanged. A single-user local tool must never leave a lock behind after a crash.
- *Effort belongs to the action, capacity to the worker.* "How much effort is this project?"
  has no answer; "how much effort is *this next action*?" does. Effort is declared on the
  next-action row (falling back to the project, else derived); leverage is `1 / effort` — see
  Importance below.
- *Importance is cut* — not stored, not derived, not shown, not ranked by. No `_tracking.yaml`
  row, registry frontmatter field, or Next Actions column carries anything importance could be
  read from; deriving one would be inventing a number wearing a rule's clothes. Unblock ranks
  cheapest-first instead. Don't add a derived importance because a ranking looks like it wants
  one.
- *Two things are built ahead of being needed, deliberately, and both currently return a
  placeholder marked as such:* agent capacity is one `token_budget` field with a named
  provider (Luke states it today; a future agent runtime reports it later, and nothing
  downstream has to change when it does), and Luke's own capacity (`LukesCapacity`) is all
  four real inputs — complexity, open count, days to Sunday, recent completions — computed
  now and returned with `fitted: false`, so the completion log above accumulates against the
  right fields instead of the matrix being invented from an armchair later. Don't collapse the
  provider indirection or delete the "unused" matrix inputs; that's the whole value of having
  built them early.
- *Any derived value renders as guessed, not stated* (`Guessable(value, guessed)` throughout
  `model.py`). A confident wrong height is worse than an obviously uncertain one, and this is
  what stops a `fitted: false` capacity figure from being mistaken for a measured one.
- *The app lives in `System/Apps/`, not `System/Tools/`.* `System/Tools/` viewers are
  read-only over `Memory/` by house rule (PY-12); this app writes, so it belongs outside that
  folder rather than needing an exception to the rule.
- *The brief is words in Dropbox, not a responsive layout.* Away from his desk Luke asks an
  agent rather than opening a dashboard, so there are no mobile breakpoints anywhere in
  `app/` — a deliberate scope decision, not an oversight.

## 2. Cross-boundary behaviour

| From | To | What crosses | What breaks if it changes |
|---|---|---|---|
| `stores` | `model` | plain records, each field carrying whether the source file stated it or it was absent | `model` can no longer tell a fact from a guess; the *guessed, not stated* treatment silently becomes a lie |
| `model` | `server` / `snapshot` / `brief` | one `Board` object — projects with crown, outline, uncapped task list, both orderings, the depot, horizon, *This week*, the week's dated items, leverage order, capacity | every face reads this exact shape; a field renamed here breaks all three at once, which is the point |
| `server` | live front end | `GET /api/board.json` — the `Board`, JSON-shaped, verbatim | the one contract `app/shared/board-client.js` and the snapshot's inlined data both depend on |
| `app/unblock` | `server` → `writes` | an edit intent: project id, row, column, new value, and the cell's file's mtime as read | drop the mtime and two tabs silently overwrite each other; the 409 *is* the concurrency design |
| `writes` | `Projects/` | one cell or one appended line, plus `pending_sweep: true` on that project's `_tracking.yaml` row | `!ProjectSweep` loses its signal that the board moved outside the skill layer |
| `writes` | `Logs/edits.log` | one line per mutation | agents lose the record of what changed outside the skill layer |
| `writes` | `Memory/Medium-Term/completions.log` | one appended row per completed action | nothing today, on purpose — see §1; losing it means the capacity matrix can never be fitted from real data |
| app | `Projects/_requests.yaml` | appended request rows (source, what's wanted, timestamp) | `!Initiative` / `!ProjectSweep` lose the hand-off queue; *ask an agent* and depot *dispatch* become no-ops |
| `snapshot.py` | Dropbox | one self-contained `.html`: inlined `Board` + inlined `app/monitor` + an "as at" stamp | the offline face; any external reference introduced anywhere in `app/monitor` breaks it |
| `brief.py` | Dropbox | one plain-text `.md`: the same `Board`, in the glossary's words | an agent asked from a phone stops speaking the board's language and starts re-deriving its own opinion from raw files |
| `build_faces.py` | `snapshot.py` + `brief.py` | one clock reading and one `stores → model` pass, shared | without this, each face reads its own `datetime.now()` and re-runs its own model pass — the two frozen faces drift to different ages of the same board |
| `app/shared/tokens.css` | every rendering module | the palette, as CSS custom properties | one token changes the live app and the snapshot together, which is the point; a colour literal written anywhere else means a channel means two things |
| app | LukeatronWiki viewer `:8787` | a hyperlink, nothing else | nothing — it's a door. The app never reads `LukeatronWiki/` |

**The one-way rule.** `stores` and `model` never import `writes`. `monitor` never imports the
write client. Both are enforced by what's imported, not a runtime flag — see §1.

**Three faces, one model.** `server.py` (live), `snapshot.py` (frozen visual) and `brief.py`
(frozen words) each run their own `stores → model` pass and render only what `model` handed
them. A face that derived a fact of its own would disagree with the other two within a week —
derive in `model` or not at all.

## 3. Navigation map

```
_template/
├── README.md          this file
├── paths.py            finds the _Lukeatron root by walking up to known markers, not by
│                        counting directory levels — this app is a template meant to be
│                        cloned at a different depth (_test/ already is one)
├── server.py            entry point AND thin HTTP router (API-1): binds 127.0.0.1, serves
│                        app/ statically, GET /api/board.json, POST /api/edit + /api/request
├── stores.py            files → records. Interprets nothing; every field says stated-or-not
├── model.py             records → the Board. Pure — no file, clock or network access
├── writes.py            the ONLY module that mutates. mtime guard, edit log, request rows
├── snapshot.py          builds the offline single-file face from stores + model + app/monitor
├── brief.py             builds the agent's plain-text face from stores + model
├── build_faces.py       one clock read, one model pass, both frozen faces — keeps them
│                        from drifting to different ages of the same board
├── check_contrast.py    WCAG contrast check over app/shared/tokens.css's text/ground pairs
├── app/
│   ├── index.html       host shell only — mounts monitor.js and unblock.js, decides nothing
│   ├── STYLE.md          the visual source of truth (this app's companion doc)
│   ├── monitor/         every read-only view: the mass, list, week rail, depot ticker,
│   │   └── tests/        altitudes, rotation, both toggles. Never imports the write client
│   ├── unblock/         capacity, leverage, the write controls, depot dispatch — the only
│   │                     place a write reaches the server
│   └── shared/          the Board's client fetch, DOM helpers, formatting, tokens.css
│       └── tests/
└── tests/               Python module tests + fixtures, mirroring the top-level modules;
                          test_unblock.mjs (JS) also lives here rather than under app/unblock/
```

Why the split falls here: `stores → model → writes` is where data changes hands, and reading,
deciding and mutating have three different failure modes. `monitor` / `unblock` is the
never-share-a-screen rule made structural. `snapshot` and `brief` are separate output faces
and must stay swappable — neither reaches past `model` into the stores for something it wants.

## 4. Granted rule exceptions

| Rule | Where | Reason | Granted |
|---|---|---|---|
| SR-6 (match the neighbours) | Render architecture, whole app. `server.py` serves JSON and vanilla ES modules in `app/monitor` render every view, unlike `System/Tools/`'s sibling viewers, which build HTML as Python strings. | A live face and an offline snapshot must show the identical Monitor view. One JS renderer fed by data makes them identical by construction; the neighbours' pattern would mean writing the renderer twice. **Scoped to this project only** — not a general licence to diverge from the sibling viewers. | 2026-09-04 |

## 5. Glossary

One vocabulary for the whole app — code, UI copy, the brief's output, and any agent speaking
about the board. Use these words exactly, including when talking to Luke; the retired list
exists so a meaning doesn't quietly split into two words.

**The unit of work**

| Term | Means |
|---|---|
| task | A todo or action — the unit the board counts. Every task is exactly one kind. |
| next action | The very next task in sequence for a project. One per project. |

**The board and its shapes**

| Term | Means |
|---|---|
| the board | (1) the whole picture of the projects, in any face or view; (2) Monitor's landing view — the packed isometric mass — as against `☰ list` and `🗓 week`. |
| the mass | The packed isometric surface: one square lattice, quartered by context, projects shoulder to shoulder with no gap, plot line, panel or border between them. |
| quadrant | One context (Personal Productivity · Church · Teaching · Personal Research). Also the middle altitude: one quadrant alone, drawn larger. |
| the ring | The fixed arrangement of the four quadrants. Never re-sorted; only *turned*. |
| stack | A project drawn as a column of its own task cubes — one storey per open task, uncapped. The unit the board is read in at every altitude. |
| storey | One cube of a stack: one open task. |
| slice | One storey, named as such once the stack is opened. A slice is a task. |
| opening a stack | Clicking a stack so it breaks into its slices. The third altitude, read-only. |
| the crown | The top face of a stack's topmost cube. Project-level state: **lit** (sole-blocker), **plain** (shared), **absent** (a mind project's plate). See §1. |
| the outline | A fluorescent stroke round a stack's whole silhouette: one colour for an open kind 3/4 due within seven days, another for overdue, none otherwise. |
| plate | A project with nothing open, drawn flat — a mind project. A stack of height zero. |
| bare tile | An unused slot in a quadrant's lattice. Not a project. |
| rotation | Turning the mass through four square-on views, 90° apart. Turns the view, never the data. Resets to 0° on any change of altitude. |
| the colour toggle | `colour = project` (hue by quadrant, lightness by project) or `colour = kind`. |
| the front toggle | `front = due soonest` or `front = shortest` — which of `model`'s two orderings is placed. |
| reachability | Every project reachable within two clicks and no searching, by rotation, the quadrant altitude, the list, or hover. Occlusion at the board altitude is accepted; an *unreachable* project is the failure. |
| the occlusion residue | How many stacks are hidden at this angle, and how many from all four views. Printed on every load as diagnostics that gate nothing. |
| the depot | Minor tasks as one permanent fixture along the board's base — never a stack, outline, crown, or *This week* entry. Drawn as the ticker. |
| the ticker | The depot's drawing: two lanes of job chips, split into *an agent can take* (kind 4) and *yours* (kind 3), each with its count anchored at the left end. The only moving element in the app, and read-only. |
| a lane at rest | A ticker lane holding fewer than eight jobs — sits still, scrolls by hand. The normal state at the real queue depth. |
| the rail | The week view: one rounded row of seven days, Monday leftmost, Sunday rightmost, on every reading date. |
| the reading strip | The panel beneath the rail naming whichever day is hovered (today, if none is). Lets the rail keep a fixed height. |
| the overdue cap | The count off the rail's left end, before Monday, holding everything already overdue. |
| the horizon | Collective term for the mind projects among the built work. Exempt from every demand mechanism. |

**Whose move is it**

| Term | Means |
|---|---|
| kind | Which of five states a task is in — independent of height and footprint. |
| 1 waiting | Already asked; someone else's move. Does not need Luke. |
| 2 unshaped | An idea or aspect that may or may not become work. Not a move yet. |
| 3 mine | Luke's to do. Needs him. |
| 4 hand-over | Ready to delegate but not yet asked. Needs him — one email converts it to a 1. |
| 5 incoming | Relevance begins at a future date — a date itself, or a task not yet live. Demands nothing now; becomes a 3 if it's his or a 1 if it's someone else's once the date arrives. |
| the demand rule | Kinds 3 and 4 demand Luke; 1, 2 and 5 do not. Every other rule reads off this one. |
| mind project | A project whose open tasks are only kinds 2 and 5 — computed, never declared. The only "not now" marker; `parked` is cut. |
| rotting | A kind 4 left un-handed-over for more than a fortnight. |

**Judgement and reference**

| Term | Means |
|---|---|
| importance | Cut — not stored, not derived, not displayed, not ranked by. |
| effort | ⚡ minutes / 🔨 an hour / 🏔️ a session. A property of the *action*, declared on the next-action row, falling back to the project's key, else derived. |
| capacity | A property of the *worker*: how much this worker has got. Two implementations, one per worker. |
| the fit test | Does this action's effort fit inside this worker's remaining capacity? |
| token budget | Agent capacity. One field with a named provider — Luke states it today, the agent runtime reports it once that exists. A thin budget shortens the list rather than emptying it. |
| the capacity matrix | Luke's capacity: complexity, open count, days to Sunday, recent completions — all computed and returned, combined by placeholder coefficients. Carries `fitted: false`. |
| fitted | Whether a capacity figure rests on coefficients fitted against real data. `false` today; renders *guessed, not stated* while it is. |
| the completion log | One appended row per completed action. Read by nothing today — see §1. |
| leverage | `1 / effort` (importance is cut). Unblock's ranking — most state-change per unit of effort. |
| stated vs guessed | A value the file set, vs one the app derived. Guessed renders visibly distinct. |
| footings | The few facts a project's urgency or effort rest on. Capped at three, drill-down only. |
| reference | Everything else worth remembering. Lives in the registry; never on the board. |
| This week | Exactly three projects named; every other visibly labelled *not this week*. |
| nothing needs you | A real, reachable state: zero open kind 3/4 tasks due. |

**Modes, altitudes, faces**

| Term | Means |
|---|---|
| Monitor | The front door. Eight seconds, no decisions, changes no project data. |
| Unblock | A deliberate second click. One project, full attention. The only place writes happen. |
| altitude | How far in the reader is: board → quadrant → opened stack. Rotation resets to 0° on every change. |
| the door (to Unblock) | The single control that crosses from monitoring into acting. |
| the wiki door | The `:8787` link. A door, not a panel. |
| face | One of three readers of the same model: LIVE · SNAPSHOT · BRIEF. |
| LIVE | localhost, desktop browser, every view, writes on. |
| SNAPSHOT | One self-contained `.html` in Dropbox. Monitor frozen, offline, read-only, "as at" stamped. |
| BRIEF | The same board in words, in Dropbox, for an agent. |

**Writing and hand-off**

| Term | Means |
|---|---|
| narrow write | One cell or one append. Never a whole-file rewrite. Live face only. |
| mtime guard / 409 | A page that's gone stale gets refused, not merged. The file stays byte-unchanged. |
| hand over | Flips a kind 4 to a kind 1 and records who it went to. |
| dispatch | The depot's version of hand-over — a Low-impact job becomes a request row and moves to kind 1. |
| ask an agent | Appends one row to `Projects/_requests.yaml`. The app asks; it never runs the work. |
| pending_sweep | Stamped on any browser edit. `!ProjectSweep` still owns `state` and `wake`. |

**Retired terms.** Must not appear in code, comments, UI copy, the brief, or an agent's reply.

| Retired | Now |
|---|---|
| skyline | the board |
| district | quadrant |
| building | cube · storey · stack |
| landscape toggle | `▦ board \| ☰ list \| 🗓 week` |
| depot *tiles* / capacity bar *on the board* | the ticker's two lanes and their count anchors; the capacity bar is Unblock's |
| grid | the board — the surface is a packed mass, not a grid of plots |
| cell | stack (a project) · bare tile (an empty slot) |
| yard | nothing — every project occupies one identical footprint |
| podium | nothing — importance is not drawn on the board |
| region | quadrant |
| the plane | the mass — it is packed, not a ground others stand on |
| task cube | storey (in a stack) · slice (in an opened stack) |
| depth band · front/middle/back | a continuous ordering, chosen by the front toggle |
| weather · storm · overcast · clear | the outline |
| parked | mind project |

## 6. For the agent picking this up

- **One module mutates.** `writes.py`, reached only through a POST route, only from the live
  face. If a change needs a second module to write, that's a design change and needs asking,
  not coding.
- **`monitor` must never import the write client.** No-acting-while-monitoring is enforced by
  imports, so an accidental write control is impossible rather than merely discouraged.
- **`model.py` touches no file, no clock and no network.** `today` is always injected. This is
  what keeps the demand rules testable, and they're the app's whole reason to exist.
- **Two stores are owned elsewhere.** `MinorTasks/queue.md` belongs to `!Initiative`; `state`
  and `wake` in `_tracking.yaml` belong to `!ProjectSweep`. This app asks by appending to
  `Projects/_requests.yaml` and stamping `pending_sweep: true`; it never writes either owner's
  field.
- **The three faces read one model.** Adding a derivation inside `snapshot.py` or `brief.py`
  is how they begin to disagree with the live board. Derive in `model.py` or not at all.
- **The crown is a project-level state and comes from `model.py`.** If you find yourself
  reading a topmost task's kind in the renderer to decide it, stop — see §1.
- **`model.py` returns orderings, never coordinates.** Slot geometry belongs to `app/monitor`;
  keeping it there is what lets the snapshot and the brief consume the same output.
- **A hidden project is fine; an unreachable one is a bug.** The hit-test in
  `app/monitor/occlusion.js` still runs and prints its residue every load, but it gates
  nothing — don't reintroduce it as a threshold.
- **The token-budget provider and the capacity matrix are both built ahead of being needed, on
  purpose.** Don't "simplify" either by collapsing the provider indirection or deleting the
  matrix's currently-unused inputs — see §1.
- **Colours live in exactly one file:** `app/shared/tokens.css`. If you need a colour, add a
  token; don't write a hex value in a module, however local it looks — see `app/STYLE.md`.
- **Fluorescent means urgency, twice, and never anything else.** A third use isn't a small
  liberty; it's what stops the first two working.
- **Importance does not exist here, and that's a decision, not an oversight** — see §1. Don't
  add a derived one because a ranking looks like it wants one; Unblock ranks cheapest first on
  purpose.
- **A placeholder must look like one.** Any capacity figure with `fitted: false` renders in
  the *guessed, not stated* treatment. The app never shows a fitted-looking number it hasn't
  fitted.
- **The SR-6 exception is scoped to this project** (§4) and buys exactly one thing: one
  renderer serving both visual faces. It isn't a general licence to diverge from the sibling
  viewers.
- **Nothing is deleted until its replacement is verified.** `System/Tools/project-dashboard/`
  stays until every acceptance test in the PRD passes, and its retirement is a `!Checkpoint`
  call.
