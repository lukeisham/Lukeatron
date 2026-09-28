# COLD-READER PROTOCOL — preparing, questioning and scoring a blind reader

Loaded on every run by `!Comprehension` and by `!ConceptFidelity`. It is the ONE copy of the reader
rules both skills share, so the two cannot drift. Each skill runs **SEPARATELY** (its own stages only)
or **JOINTLY** (one reader set serves both) — §5.

**The governing claim of this file:** *a blind reader is not an ignorant reader.* A clean-context
subagent has no conversation, no brief and no spec — but it has read most of the written world. Ask it
what a grammar page says and it can answer from what it already knows, not from the page. Every rule
below exists to make the answer come from the ARTEFACT, or to label it when it did not.

---

## 1 · The reader package — what the reader is actually given

| Medium | The reader receives | Never |
| :--- | :--- | :--- |
| **prose-only** | the text, as the real reader meets it | — |
| **rendered** (HTML, guide, dashboard) | a **full-page screenshot set** of the rendered page, plus its visible text (`document.body.innerText`) as a reading aid | the **HTML source** |
| **print-aware** | the above, **plus** the print rendering (PDF) | — |
| **Markdown** | rendered, if its reader meets it rendered; raw, if raw | — |

**Why never the source.** A reader given HTML sees tags, not the page. Bold, size, colour, boxes and
position all live in CSS the reader never renders, so the FORMAT surface is simply not visible to it.
Worse, the source **leaks intent**: `class="diagnostic"` tells the reader what a block is meant to be,
which is exactly the proposition under test. A read made from source is **VOID**.

**Capture** (via `!HeadlessChromeBrowser`, paths relative to `_Lukeatron/`):

```
browser.py open --url file:///<abs path to artefact>
browser.py --raw "screenshot --full <out>.png"     # full page; if the backend has no full-page
                                                   # flag, scroll and capture each viewport in order
browser.py eval --js "document.body.innerText"     # the reading-aid text layer
browser.py pdf --out <out>.pdf                     # print-aware artefacts only
```

Captures go in `System/Sandbox/` beside the report and are cleared with it.

---

## 2 · The greeked rendering — layout with the words taken away

Layout-only questions (`!Comprehension` STEP 3(c), `!ConceptFidelity` STEP 6's taxonomy read-back)
cannot be asked of a page the reader can read. "Treat the prose as unreadable" is an instruction no
reader can obey — it cannot un-read words it has seen. So the words are removed **mechanically**
before the capture, keeping every letter's width, case shape and position:

```js
(() => {
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = w.nextNode()); ) {
    if (/^(SCRIPT|STYLE)$/.test(n.parentElement?.tagName)) continue;
    n.nodeValue = n.nodeValue
      .replace(/\p{Lu}/gu, 'X').replace(/\p{Ll}/gu, 'x').replace(/\p{N}/gu, '0');
  }
  document.title = 'x';
})()
```

Run it with `browser.py eval --js "<the snippet>"` **after** `open` and **before** the greeked
`screenshot` (and greeked `pdf`, when print-aware). Punctuation, glyphs, icons, rules, boxes, colour
and weight all survive — they are the devices under test. CSS-generated text (`::before` content)
survives too; note it as a LIMIT if it carries words.

**Order is the blinding.** The greeked capture is shown **before** the legible one, in a stage of its
own (§5). A reader who has already seen the legible page is not layout-blind, whatever you greek
afterwards.

---

## 3 · The evidence rule — every answer names its span   (the prior-knowledge fix)

Every reader prompt carries this instruction, verbatim:

> *Answer ONLY from what this page shows. For every claim you make, quote or point to the exact part
> of the page it comes from. If the page does not say something, write "not stated" — even if you
> know the answer yourself.*

Scoring:

- A correct answer whose cited span **supports it** → scored normally (RECOVERED, picked (1), etc.).
- A correct answer with **no span**, or a span that does **not** support it → **UNSOURCED**. The reader
  knew it; the page did not tell them. For every verdict it counts as **not transmitted** —
  `!Comprehension` treats it as MISSING, `!ConceptFidelity` as CANNOT TELL — and it is reported under
  its own label, because "a knowledgeable reader could fill this gap" is itself worth knowing.
- A **wrong** answer is scored as wrong whether or not it cites a span. The span, when given, is the
  location of the defect.

The span check is the scorer's job, done against the artefact — never the reader's own say-so.

---

## 4 · Multiple-choice controls   (the discriminative test, `!ConceptFidelity` STEP 4)

| Control | Rule |
| :--- | :--- |
| **Shuffle** | a fresh random order for EACH reader; never the construction order (1)-(4) |
| **Neutral labels** | A–D, mapped privately; the key is recorded in the report, never shown |
| **Escape hatch** | a fifth option, **E — "can't tell from this description"**, always present |
| **Matched form** | all four options the same length (±20%), register and sentence shape — a longer, more careful option telegraphs the true one |
| **Span** | the reader names the span of the description that decided the pick (§3); an unsourced pick scores as E |

**Threshold** — with N readers, the **majority pick** is the result:

```
   majority picked (1)              ➔ passes (necessary, not sufficient)
   majority picked (2), (3) or (4)  ➔ REJECT — and which one names the drift
   majority picked E                ➔ UNDERDETERMINED ➔ REPAIR
   no majority (a split)            ➔ UNDERDETERMINED ➔ REPAIR; report every pick
```

With N = 1 that one reader is the majority. The same majority rule governs every other
reader-level "most readers" judgement in both skills.

---

## 5 · Stages, and the JOINT read

A reader is one clean-context subagent, taken through the stages **in order, one stage per turn**:
spawn it with its first stage, record the answer, then continue the **same** reader with `SendMessage`
for the next. Stages run from **least revealing to most revealing**, so nothing a later stage shows can
leak into an earlier answer.

| # | Stage | Shown to the reader | Asks | Serves |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **Layout** | the greeked capture only | the five structural questions + "state the classification: what is a kind of what, what is part of what" | CO 3(c) · CF 6 taxonomy read-back |
| 2 | **Restate** | the legible package | restatement, guess log, referent list | CO 3(a)(d)(e) |
| 3 | **Act** | the spec's ACTION task | perform it | CO 3(b) |
| 4 | **Metaphor** | nothing new | "What else must be true of the thing being described?" | CF 7 |
| 5 | **Apply** | the novel cases, shuffled | classify each, with span | CF 5 |
| 6 | **Discriminate** | the four options + E, per §4 | which is being described, with span | CF 4 |

*(CO = `!Comprehension`, CF = `!ConceptFidelity`.)* Stages that do not apply are skipped, never faked:
stage 1 on prose-only artefacts, stage 3 in REDUCED mode, stage 4 with no metaphor. Stage 6 is last on
purpose: it shows the true concept outright, so nothing may follow it.

**SEPARATE** — a skill running alone takes its readers through **its own stages only**, in this order.
`!Comprehension`: 1, 2, 3. `!ConceptFidelity`: 1, then shows the legible package, then 4, 5, 6.

**JOINT** — when both skills run on the same artefact in the same run (a caller such as `!GrammarFrame`
STEP 7B, or Luke asking for both), **one reader set takes all six stages**:

```
   CO builds its SPEC ─┐                       ┌─► CO scores stages 1·2·3 against its spec
                       ├─► N readers × stages ─┤
   CF builds its GROUND┘       1 → 6           └─► CF scores stages 1·4·5·6 against its ground
```

- **Pre-registration stays separate.** Each skill builds and freezes its own spec or ground BEFORE the
  first reader is spawned. Joint reading shares the readers, never the standards.
- **Stage 1 is asked once** and scored by both — the layout read-back and the taxonomy read-back were
  the same question asked twice.
- **Verdicts stay separate.** Each skill rules on its own axis; the cross-tab is filled from both.
- **Cost:** N readers per artefact (3 by default), against roughly three times that run separately.

**Voiding.** A reader contaminated at stage *k* (shown a spec, a ground, the source HTML, another
reader's answer, or a later stage's material early) is void **from stage *k* on**; its earlier stages
stand. Replace it with a fresh reader starting at stage 1 — earlier stages must be re-answered to reach
stage *k* honestly.

**No continuation available** (`SendMessage` cannot reach the reader) ➔ run each stage as a **fresh**
reader, given only that stage's material plus the legible package where the stage needs it. This costs
the separate-run price; never collapse stages into one prompt to save it — one prompt shows every
stage at once, which is the leak the order exists to prevent.
