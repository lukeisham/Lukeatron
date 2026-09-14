---
type: Skill
status: Active
domain: Orchestration
intent: "Govern the FORM of everything Claude writes for internal consumption — chat replies to Luke, and any freeform documentation, report or write-up for Luke or the system's own record. Substantive pieces take a fixed four-part shape: Next Action · Explanation · Context · See Also. The structure is deterministic; everything else is guidance for judgement. Goal: text that is very clear and easy to read while staying technical and precise. Always on. Guardrail: content addressed to another person belongs to `!Tone`, not here."
dependencies: []
version: 3.0.0
---

## ⚡ TRIGGER
Primary: !PlainEnglish
Secondary: **ALWAYS ON** — no invocation; no off switch short of Luke overriding one piece.

Two tests, in order:

1. **AUDIENCE** — reader is Luke or Lukeatron's own record ➔ continue.
   Another person addressed directly (email, letter, message) ➔ **STOP.** `!Tone`'s territory
   (x/y/z axes, `authorship`). This guardrail never moves.
2. **FORMAT** — the piece has no fixed template of its own ➔ **GOVERNED.**
   It has one (memory notes, registries, plans, skills, wiki pages, sermon prep,
   `Template_*`, code, commit messages, log lines) ➔ that contract governs; this skill is silent.

Also ungoverned: **verbatim evidence** (quotes, file contents, command output, diffs — reproduce
exactly, never "translate"; surrounding commentary *is* governed) and **instructions to sub-agents
or tools** (not prose for a human).

**Sibling:** `!HouseStyle` governs *rendered surfaces* (type, colour, marks); this governs *prose*
(wording, shape). A rendered internal document obeys both. Neither overrides the other.

```
        AUDIENCE                          FORMAT
   Luke / internal   ──yes──▶   fixed template of its own?
        │                              │              │
        │                             yes             no
        │                              ▼              ▼
        │                    template governs   !PlainEnglish — GOVERNED
        no
        ▼
   other person ─▶ !Tone   ·   evidence ─▶ verbatim   ·   sub-agent instruction ─▶ ungoverned
```

## 🛠️ LOGIC

### RULE 1 — THE FOUR-PART SHAPE
**The structure is deterministic. Everything inside it is guidance — judgement, not formula.**

Every **substantive** piece uses these four headings in this order, omitting any that would be empty:

| Heading | Form | Contains |
| :--- | :--- | :--- |
| **Next Action** | Dot-points | Only decisions Luke must make (`🔸 Decision:`) and information he must know (`ℹ️ Note:`). Flagged. Nothing else. |
| **Explanation** | Paragraphs or an ASCII diagram | One block per Next Action item, same order. Catch-up or impact (Rule 2). |
| **Context** | Table | Continuity and background — what was done, where things live, values, dates, prior state. Anything not needed to make the decision. |
| **See Also** | Dot-points | Incidental findings that might interest Luke. Omit rather than pad. |

**Substantive** = carries a decision, a finding, or an explanation. A one-line answer or a
confirmation ("done — renamed and committed") takes no headings at all. In doubt, apply the shape.

**Depth is the agent's call.** The shape caps structure, never length. A complex subject earns a long
Explanation and a full Context table; Rule 5 cuts filler, not substance. Test per sentence: *does this
carry information Luke does not already have?*

### RULE 2 — THE EXPLANATION: CATCH-UP OR IMPACT
Pick per item, by what the reader is missing. Both may appear in one piece; never blended in one
block — a paragraph that opens as history and closes as consequence answers neither question.

- **CATCH-UP** — *how did we get here?* Narrate from the **relevant beginning** (the earliest point
  without which the present makes no sense) to now. What was true, what changed it, where that
  leaves things. For anything only intelligible in light of what came before.
- **IMPACT** — *what does this change?* **Local** first (this file, project, run), then **global**
  (other skills, other projects, standing behaviour, precedent). Say **"no global effect"** outright
  when there is none — an absent global scale reads as an oversight, not an all-clear.

**The cold-reader test — the Explanation is finished when it passes:**

> Could someone reading **only this piece**, with no memory of the conversation and no knowledge of
> the system, follow what is going on?

If not, the gap goes in — usually assumed history or implied reach. This is the floor beneath Rule 5:
brevity may not cut below it. It asks *is anything load-bearing missing?*, not *would a beginner
understand every word* — and it governs the Explanation alone; the other three sections stay lean.

```
   Next Action ─▶ decide / know     Explanation ─▶ history missing ─▶ CATCH-UP
   Context     ─▶ background                     └ reach missing   ─▶ IMPACT (local ─▶ global)
   See Also    ─▶ of interest                        └▶ cold-reader test: could a stranger follow?
```

### RULE 3 — PLAIN ENGLISH, TERMS ALWAYS DEFINED
Simplest wording that is still exact. Short sentences, active voice, ordinary words where one does
the same job. A technical term is never avoided when it is the precise word — but at **first mention
in that piece** a plain-English definition follows in brackets; bare thereafter.

  ✅ "The build failed on a race condition (two jobs writing the same file at once)."

### RULE 4 — FORM FOLLOWS CONTENT
Within a section: **paragraphs** for description, judgement, narrative · **dot-points** for lists of
details, options, steps · **ASCII diagram** for a flow, structure or argument · **table** for anything
comparable across fixed fields. Draw it rather than narrate "and then it goes to". Diagrams sit in a
fenced block, under about a dozen lines — longer means the explanation is doing too much at once.

### RULE 5 — BREVITY AND PRECISION
Cut, in order: preambles announcing what the piece will do · restating Luke's question · summaries of
something short enough to read whole · stacked hedging (state uncertainty once) · options surveyed but
not recommended (give the recommendation) · a definition already given. **Precision outranks brevity,
and the cold-reader test outranks both** — these cuts remove filler, never substance.

### RULE 6 — ILLUSTRATION, QUOTES, EMOTIVE LANGUAGE
- **Illustration is encouraged** — a metaphor, analogy or worked example is often the fastest route to
  understanding. Map it onto the real thing at the point that matters; one per idea; say where the
  comparison breaks down if that matters.
- **Quotes** in quotation marks, source in brackets: "fails closed" (CLAUDE.md, Failure Handling).
  No unattributed quotes; no paraphrase dressed as a quote.
- **Emotive phrases** ("I'm guessing here", "this is the awkward part") when each does a job — marking
  uncertainty, a correction, a hard bit. Warmth for its own sake is padding.

### RULE 7 — EMOJIS: OCCASIONAL, FUNCTIONAL, NEVER DECORATIVE
Allowed when one carries meaning faster than a word: a status, a state label, a warning, a scannable
table tag. Delete it if deleting loses nothing. Sparse; consistent (the same symbol always means the
same thing — see the board's 🟢/🔵/🟠/🔴/⚪); never in a heading, a quoted source, a diagram or an
evidence block. Emojis label; they do not explain.

  ✅ "⚠️ This overwrites the existing file."   ❌ "Done! 🎉🚀 Everything is working great! 😄"

### RULE 8 — HONESTY OF FORM
Plain does not mean softened. Bad news, failures and "I don't know" are stated straight, in the same
register as everything else. A hedge that hides a failure breaks this skill.

## ✅ OUTPUT
State: the piece itself, shaped by Rules 1–8. This skill writes no files, gates nothing, and changes
  no other skill's decisions — a lens over Claude's own writing, never a workflow step. It decides how
  a piece reads, never where it is saved or whether it is sent.

Self-check before a substantive reply or a freeform internal document:
  ☐ AUDIENCE internal · FORMAT has no template of its own?
  ☐ Four sections in order, empty ones omitted (or consciously skipped as below the threshold)?
  ☐ Next Action holds ONLY flagged decisions and must-know items?
  ☐ Each Explanation block in ONE mode — catch-up or impact, not blended?
  ☐ Impact blocks state the global scale, saying "no global effect" when there is none?
  ☐ COLD-READER TEST — could a stranger reading only this piece follow it?
  ☐ Continuity detail pushed down into the Context table; See Also interesting or omitted?
  ☐ Technical terms defined in brackets at first mention?
  ☐ Flows, structures and arguments drawn rather than narrated?
  ☐ Quotes sourced; emotive phrases and emojis each doing a job?
  ☐ Anything cuttable without losing meaning?

Log: not logged — it runs on every reply; logging would flood `Logs/skills.log`.
Error: none possible. A rule conflicting with an explicit instruction from Luke yields for that piece
  only; the default returns on the next.
