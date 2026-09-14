# Target types — locate, tone, adjacent assets

Gate 1 and Gate 2 lookup. Find the row for the target's kind; every column is a required action,
not a suggestion. No row matches ⇒ ask Luke rather than improvising a row.

## Locate + discover

| Target kind | Locate test (Gate 1 — must pass) | Boundary = what counts as "the target" | Tone source (in order) | Adjacent assets to load (Gate 2) | Voice evidence lives in |
|---|---|---|---|---|---|
| Repo / codebase | Path resolves; `git rev-parse` succeeds; HEAD branch named | The tree at HEAD, minus vendored/`node_modules` | README voice → CONTRIBUTING → commit-message style | README, CLAUDE.md, docs/, ADRs, `_index.yaml`, tests | README + docs prose, not code comments |
| Single file / module | Path exists; read in full | That file + its direct importers | Sibling files in the same folder | Folder README, registry.md, notes.md, its test file | Its own docstrings/comments/prose |
| Widget / app (Lukeatron) | Folder under `System/Widgets/` resolves; registry.md read | `_template/` + registry + specs | `!HouseStyle` → the widget's own StyleGuide | registry.md, refactor-registry.md, wishlist.md, PRD/specs, `!AppDevelopment` | Spec prose + existing UI copy |
| Report / document | File read in full; its thesis stated back in one line | The document + anything it cites | The document's own register | Its sources, prior versions, the brief that produced it | The document itself |
| Email / thread | Message(s) retrieved via `!AgentMail`; recipient resolved in `People/` | The thread, not one message | `!Tone`: person `tone.md` → `Groups/` → context `Tone/` | Person record, group page, prior thread messages, `interaction_tier` | Luke's + the correspondent's prior messages |
| Project (Medium-Term) | `Projects/<slug>/registry.md` exists; `_tracking.yaml` row read | Registry + notes + artefacts listed there | The project's own documents | registry.md, notes.md, `_tracking.yaml`, linked People/Contacts | Registry + notes prose |
| Wiki / knowledge page | Page file resolves; provenance layer identified | The page + its Works Cited | `Template_WikiPage.md` + `wiki-page.css`; `!GenerateWiki` contract | Works Cited, the Long-Term store behind it, sibling pages | The page's own encyclopedic register |
| Sermon / preaching passage | Passage reference confirmed; prep file located | The prep doc + the passage | Church context `Tone/`; `Template_SermonPrep.md` | Exegesis notes, `Bible/`, `Theology/`, `Preaching/` stores, prior sermons in the series | Prior sermons in the same series |
| Argument / position | The claim written out verbatim and confirmed with Luke | The claim + its stated grounds | Where the claim was made (doc/email/store) | The store holding it, counter-positions already recorded | The original statement of it |
| Web page / external artefact | URL fetched via `!HeadlessChromeBrowser`; retrieved, not recalled | The page as retrieved, date-stamped | The page's own register | Linked pages it depends on, the author's other pages | The retrieved page text |

## Supportive modes

| Mode | Does | Never does | Fails when |
|---|---|---|---|
| **emphasise** | Restates the target's strongest existing point with more force / better placement | Adds a new point | The emphasis rests on a claim the target never made |
| **support** | Adds evidence, citation, data, worked precedent for an existing claim | Invents or approximates evidence | Any supporting item is UNCONFIRMED (Gate 4) |
| **illustrate** | Makes an abstract claim concrete — example, diagram, scenario, walkthrough | Changes the claim to fit a neater example | The illustration is generic enough to fit any claim |
| **defend** | Answers a *specific, real* objection to the target | Invents a strawman objection to knock down | The objection was not actually raised by anyone |

## Scope boundary

| Situation | Verdict |
|---|---|
| Target has no prose of its own (< ~200 words) | ABSTAIN — no voice to match |
| Target's claim is itself unverified | ABSTAIN — supporting a false claim is worse than silence |
| Request is really "write me a new X" | Wrong skill — `!GenerateWiki` / `!AppDevelopment` / plain drafting |
| Request is really "write as Luke" | Wrong scope — plain drafting in Luke's own voice via `!Tone`'s `authorship: luke-voice` resolution (never auto-sends) |
| Supportive content would leave the system | `!Checkpoint` before release; `Outbox/` if not whitelisted |
