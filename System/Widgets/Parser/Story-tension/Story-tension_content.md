---
type: content-source
title: "Story-tension — Content Source (draft)"
description: "Tier-A plot-structure schema built on Freytag's Pyramid for the Story-tension parser aide. Maps five canonical stages onto the registry's named elements: inciting incident, context, complication, resolution, unresolved matters."
status: draft
---

> **STATUS: DRAFT — pending Luke review**

# Story-tension — Content Source

*Sourced from standard literary theory reference works on Freytag's Pyramid (public domain / open-source knowledge). Trope detection is Tier-B, crawled from TV Tropes on demand at runtime, and explicitly out of scope for this pass.*

---

## 1. Freytag's Pyramid — Five-Stage Architecture

Gustav Freytag's *Technik des Dramas* (1863) formalised the dramatic arc as a five-stage pyramid. This schema serves as the Tier-A structural skeleton onto which Tier-B trope recognition — and the separate Tropes & symbols aide — can later hang scene-level detail.

### 1.1 Exposition (Stage I)

- **Function:** Establishes the story-world, principal characters, and the status quo ante. Provides the baseline of normalcy against which all subsequent disruption is measured.
- **Reader expectation:** Orientation; the contract of genre, tone, and setting.
- **Registry mapping:** → **context**
  - The exposition IS the context element. It supplies the setting, character relationships, and background conditions that render the inciting incident intelligible.
- **Tension profile:** Low / baseline. Any tension present is ambient rather than narrative.

### 1.2 Rising Action (Stage II)

- **Function:** Escalation of conflict through a sequence of complications. The protagonist encounters obstacles, stakes rise, and forward momentum builds. This is typically the longest stage.
- **Reader expectation:** Engagement; suspense; investment in outcome.
- **Registry mapping:** → **inciting incident** (entry point) + **complication** (the rising sequence)
  - The **inciting incident** is the threshold event that closes the Exposition and ignites the Rising Action. It is the *first* destabilisation — the event without which the story does not happen.
  - **Complication** covers the cascading obstacles, reversals, and deepening stakes that constitute the remainder of the Rising Action. Each complication tightens the dramatic knot.
- **Tension profile:** Ascending. The tension line climbs with each successive complication.

#### 1.2.1 The Inciting Incident — Gateway Event

- **Definition:** A discrete event that disrupts the status quo and propels the protagonist into the story's central conflict. Without it, the Exposition would persist indefinitely.
- **Position:** Fires at or near the boundary between Exposition and Rising Action.
- **Required properties for parser identification:**
  1. **Disruptive:** It alters the protagonist's world in a way that demands response.
  2. **Irreversible:** The protagonist cannot simply return to the prior state.
  3. **Stake-establishing:** It signals what is at risk and why it matters.

#### 1.2.2 Complication — The Escalating Knot

- **Definition:** Each distinct obstacle, reversal, or heightening of stakes that occurs between the inciting incident and the climax.
- **Parser treatment:** Multiple complication events may be present in a single scene; the aide should tag each and order them chronologically. The aggregate effect is the Rising Action's tension curve.

### 1.3 Climax (Stage III)

- **Function:** The turning point of maximum tension. The central conflict reaches its decisive moment — the outcome hangs in the balance and is resolved one way or the other. This is structurally the narrowest stage.
- **Reader expectation:** Peak emotional and narrative intensity; the moment everything has been building toward.
- **Registry mapping:** → *(structural apex; no single registry element maps one-to-one; it is the hinge between **complication** and **resolution**)*
- **Tension profile:** Maximum. The tension line peaks here and begins its descent.

#### 1.3.1 Identification Criteria for the Parser

1. **Irreversibility of outcome:** After the climax, the story cannot return to its prior state.
2. **Decision or revelation:** A character decision, a decisive confrontation, or a withheld truth breaking surface.
3. **Structural singularity:** A well-formed narrative has exactly one climax (subplots may have secondary turning points, but the primary arc has one apex).

### 1.4 Falling Action (Stage IV)

- **Function:** The consequences of the climax unfold. Loose threads begin to gather; the fallout of the decisive moment plays out across characters and circumstances.
- **Reader expectation:** Catharsis; the emotional release following peak tension.
- **Registry mapping:** → *(transitional; no single registry element maps one-to-one)*
- **Tension profile:** Descending. The tension line falls steadily.

### 1.5 Resolution / Denouement (Stage V)

- **Function:** The story-world settles into a new equilibrium. The knot is untied. Remaining questions are answered — or deliberately left open.
- **Reader expectation:** Closure, or deliberate, meaningful openness.
- **Registry mapping:** → **resolution** + **unresolved matters**
  - **Resolution** captures what is settled: the new status quo, the fate of characters, the outcome of the central conflict.
  - **Unresolved matters** captures what is deliberately left open: unanswered questions, lingering ambiguities, sequel hooks, thematic tensions the author declines to resolve.
- **Tension profile:** Returns to baseline (or a new, post-story equilibrium).

---

## 2. Registry Element Mapping — Summary Table

| Registry Element     | Freytag Stage(s)                          | Notes                                                      |
|----------------------|-------------------------------------------|------------------------------------------------------------|
| **context**          | Exposition (I)                            | Baseline world-state prior to disruption.                  |
| **inciting incident**| Boundary of Exposition → Rising Action    | The first, irreversible disruption.                        |
| **complication**     | Rising Action (II)                        | The escalating sequence of obstacles post-inciting-event.  |
| *(apex)*             | Climax (III)                              | No dedicated registry element; hinge between complications and resolution. |
| *(transition)*       | Falling Action (IV)                       | No dedicated registry element; fallout of the climax.      |
| **resolution**       | Resolution / Denouement (V)               | What is settled; the new equilibrium.                      |
| **unresolved matters**| Resolution / Denouement (V)              | What is deliberately left open.                            |

---

## 3. Worked Example — "The Last Letter"

Below is a brief original scene analysed through the schema, demonstrating how the five stages map onto a single narrative unit.

### 3.1 Scene Summary

Mara receives a letter from her estranged brother Leo, whom she has not seen in seven years. The letter requests she travel to their childhood home to settle their late mother's estate — a place Mara swore she would never return to.

### 3.2 Stage-by-Stage Breakdown

#### 3.2.1 Exposition [context]
Mara is at her kitchen table in a small city apartment. Morning light; coffee going cold. The apartment is tidy, self-contained, quiet — a life she has carefully arranged to avoid entanglement. Seven years of silence with Leo are established through a framed photograph she keeps face-down on a bookshelf.

#### 3.2.2 Inciting Incident [inciting incident]
The letter arrives. Mara reads it. The specific phrase — *"There are things in the house you need to see before the lawyers get here"* — is the disruptive trigger. It cannot be un-read.

#### 3.2.3 Rising Action / Complication [complication]
- **Complication 1:** Mara's immediate refusal — she bins the letter — but retrieves it an hour later.
- **Complication 2:** A phone call from the family solicitor confirming that Leo has already signed paperwork; her presence is required for the estate to proceed.
- **Complication 3:** Mara discovers the photograph she kept face-down is missing from the bookshelf (implication: Leo or someone connected to him has been in her apartment).

#### 3.2.4 Climax [apex — no dedicated registry element]
Mara opens the letter a second time and finds, folded inside, a second slip of paper in her mother's handwriting — a single sentence: *"I told him."* The tension peaks here: the central question shifts from "will she go?" to "what did their mother tell Leo, and what does it mean for what Mara has been hiding?"

#### 3.2.5 Resolution / Denouement [resolution + unresolved matters]
- **Resolution:** Mara books a train ticket for the following morning. She has chosen to confront the past.
- **Unresolved matters:** What their mother told Leo is not revealed. The nature of the childhood trauma that caused the seven-year estrangement is withheld. The question of whether Leo can be trusted remains open.

---

## 4. Parser Design Notes

### 4.1 Tier Boundary

- **Tier A (this file):** Freytag-based structural parsing. Scene input → identification of the five stages → tagging against the five named registry elements (context, inciting incident, complication, resolution, unresolved matters).
- **Tier B (out of scope, as with Tropes & symbols):** Trope recognition, motif identification, archetypal pattern matching. TV Tropes lookups and symbolic interpretation live in the Tropes & symbols aide and are deferred to runtime Tier-B calls.
- **Overlap decision TE-07:** The boundary between Tier-A structural parsing and Tier-B trope detection remains open. Specifically: some structural patterns (e.g., "the reveal," "the reversal") straddle both tiers — they are simultaneously plot-structure elements and recognisable tropes. The resolution of TE-07 will determine whether such elements are tagged once at Tier A and enriched at Tier B, or handled entirely within Tier-B trope detection.

### 4.2 Input Constraints

Per `Parser_guide.md` §5a:
- **Input unit:** One scene.
- **Word cap:** 5,000 words.
- **Output:** Plot summary (ASCII text) plus tension graph (ASCII line-art or squares) plus, optionally, a PDF rendering.

### 4.3 Tension-Line Visualisation

Each stage maps to a vertical position on the pyramid. The parser output should include a rough ASCII representation of the tension curve:

```
              /\
             /  \   ← Climax (III)
            /    \
           /      \   ← Falling Action (IV)
          /        \
         /          \
        /            \   ← Resolution (V)
       /              \
______/                \______
  ↑                        ↑
Exposition (I)        New Equilibrium (V)
  Rising Action (II) →
```

---

## 5. Open Items

| ID     | Description                                                                               | Status |
|--------|-------------------------------------------------------------------------------------------|--------|
| TE-07  | Determine whether structural/trope overlap elements (reveal, reversal, etc.) are Tier A, Tier B, or dual-tagged. | Open   |
| TE-08  | Draft the tension-line ASCII output algorithm (pixel-to-character mapping for the graph).  | Not started |
| TE-09  | Liaise with Tropes & symbols aide on shared TV Tropes lookup interface at Tier B.          | Not started |
