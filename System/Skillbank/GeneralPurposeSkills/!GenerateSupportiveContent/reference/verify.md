# Verification + slop scan

Gate 4 lookup. Every checkable element in a draft gets a row from table 1 and a verdict. The draft
then passes table 2 whole. Any UNCONFIRMED element is removed; if the piece cannot stand without it,
ABSTAIN.

## Table 1 — element checks

| Element | Check (primary source only) | CONFIRMED means | If UNCONFIRMED |
|---|---|---|---|
| Direct quote | Retrieve the source text; compare character-for-character | Exact string found, in context that preserves the sense | Remove. Never paraphrase-and-keep-the-quote-marks |
| Attribution of a quote | Speaker + work + place located in the source | Named person actually said it in that named place | Remove. "Widely attributed to" is not confirmation |
| Scripture reference | Open the text at the reference; check translation named | Verse content matches the reference and translation | Remove; do not silently correct to a nearby verse |
| Statistic / figure | Original dataset or publishing body, not a citing article | Number, unit, year and population all match | Remove. Never round, estimate, or say "roughly" |
| Date / event | Primary record or two independent reliable sources | Both agree exactly | Remove |
| Person / name / title | `People/`, `Contacts/`, or the person's own published page | Spelling, role and current status all correct | Remove; ask Luke |
| Citation (MLA) | Work exists; author, title, year, page verified | Every field checked, not just the title | Remove the citation and the claim it carries |
| Code / API / command | Run it, or read the actual source/signature in the repo | Executed or read at HEAD today | Remove. A plausible-looking signature is the classic slop |
| Claim about the target | Locate the line/section in the target that says it | The target genuinely makes this claim | Remove — this is the most dangerous failure |
| File path / link | Resolve the path; fetch the URL | Exists now | Remove |
| Objection being defended | Find who raised it, where | A real objection from a real source | Remove — no strawmen |
| Historical/technical background | Two independent sources, neither AI-generated | Both agree | Remove or mark as the target's own framing |

**Not checkable ⇒ not writable.** There is no third verdict. "Probably right", "commonly said",
"from memory", "the model is confident" are all UNCONFIRMED.

## Table 2 — slop scan (any hit = FAIL)

| Tell | Looks like | Fix |
|---|---|---|
| Voice drift | Reads like Claude, not like the target | Rewrite against the target's tells, or abstain |
| Empty intensifier | "truly transformative", "incredibly powerful", "a game-changer" | Delete; state the specific thing |
| Unattributed authority | "studies show", "experts agree", "it is widely known" | Name the study, or delete |
| Hedge stack | "may potentially help to somewhat improve" | One claim, stated plainly, or none |
| Generic illustration | The example would fit any topic unchanged | Replace with one specific to this target, or abstain |
| Triad padding | Three near-synonyms doing one word's work | Keep the best word |
| Restated prompt | Opens by summarising what was asked for | Delete the opening |
| Symmetry filler | Balanced "on one hand / on the other" with nothing on either | Delete |
| Manufactured objection | A weak objection nobody raised, then answered | Find a real one, or drop the defend mode |
| New claim smuggled in | Content asserts something the target never says | Delete — out of scope by definition |
| Ornament | Metaphor, flourish or emoji the target itself never uses | Delete |
| Length padding | Word count grew without new confirmed content | Cut to what is confirmed |
| Closing summary | A paragraph restating the piece just read | Delete |

## Abstention ledger

| Field | Content |
|---|---|
| STOPPED AT | Which gate (locate / discover / generate / verify) |
| MISSING | The specific artefact, source, voice sample or decision that was absent |
| UNBLOCK | The smallest single input from Luke that would let the run proceed |
| PARTIAL | Any element that *was* confirmed, kept for a later run — never delivered as content |

Abstaining is a successful outcome of this skill, reported plainly and without apology.
