# breadth-and-reach.md — where a concept sits in the whole guide

Always loaded with `SKILL.md`. Holds the distinction, how each side is measured, and the bank of
Breadth (measuring only) and Reach questions. The criteria that enforce it (E6, E7, A14, B8, C34–C36, D11–D15) live
in `criteria.md`; this file holds the content they point at.

## The distinction — Luke's, 2026-09-26

> **BREADTH = vertical.** Its sub-concepts are KINDS or PARTS of it.
> **REACH = sideways.** Other concepts DEPEND ON it, in branches of the outline it isn't in.

```
  BREADTH (vertical)                     REACH (sideways)
  "what does it contain?"                "what else does it shape?"

        Clause                           Countability ──▶ Determiners (a / much / many)
       /   |   \                                     ──▶ Agreement (is / are)
   Main  Relative  Adverbial                          ──▶ Plurals
                                                      ──▶ Quantifiers
  Its sub-concepts are KINDS or          Other concepts DEPEND ON it, in branches
  PARTS of it                            of the outline it isn't in
```

The two vary independently. That is the whole point of keeping them apart:

| | **Low reach** | **High reach** |
| :--- | :--- | :--- |
| **High breadth** | *Interjections* — a whole word class, little depends on it | *The clause, finiteness* — foundational both ways |
| **Low breadth** | *oxen, data is/are* — niche, slotted in quietly | ***Countability, animacy, agreement*** — small headings that quietly govern a lot |

The bottom-right cell is the one most at risk of being buried, and the reason this file exists. The
top-left is the opposite risk: a heading that looks important only because of where it sits.

**The outline already shows breadth** — heading level and nesting carry it. **Nothing in an outline
shows reach.** So reach gets the heavier machinery (interaction table, strip, stubs, Reach questions,
the Foundations list); breadth gets shading and a Contains overview, and nothing else. (Luke,
2026-09-26: the Contains line is the most effective way to show what a concept holds; Breadth
questions on the page were not helpful and are retired.)

## Terms (working vocabulary — never printed, C25)

| Term | Meaning |
| :--- | :--- |
| **unit** | A heading, or a sub-subsection (E2), of `Technical_Outline.html` |
| **branch** | A heading plus everything nested beneath it |
| **home** | The heading a rule or concept sits under — where Luke wrote it, unless a move was accepted (B8) |
| **kind** | A sub-concept that IS a [parent]: *a relative clause is a clause* |
| **part** | A sub-concept found INSIDE a [parent]: *a relative pronoun is part of a relative clause* |

**Form and Function sections are never kinds or parts.** They are two views of ONE concept (E1), not
sub-concepts of it, so they never count toward breadth.

## Standing ruling — the three kinds of verb (LOCKED, Luke, 2026-09-26)

Verbs has **three kinds**: the **to-be verb**, the **main verb** and the **auxiliary verbs**. This is
Luke's classification and it stays. The two sources that classify verbs (the Internet Grammar of
English, the British Council) use only *main* and *auxiliary*, and BE can work as either: as the
linking main verb (*God is love*) or as an auxiliary (*is running*, *was seen*). The to-be verb is
kept as its own kind because BE overlaps the other two and has forms no other verb has (am, is, are,
was, were). So the kinds are **not exclusive**, and that is intended: never restate the sentence as
"two kinds", never propose folding To be verb into Main verb and Auxiliary verbs, and never count the
overlap as a defect in E7 or C17. Changed only with Luke's accept. (Logged in
`Rejected_Proposals.table.md` and `Revisions.table.md`.)

## Measuring BREADTH (E7)

1. For each unit nested under the heading, apply the KIND test and the PART test (bank below).
2. A unit that passes neither is not a sub-concept — it is a narrow case or an aspect. It does not
   count, and if it cannot be placed that way either, FLAG it.
3. **Breadth = the number of kinds and parts nested under the heading, at every depth.**

| Breadth | Count | Rendered as (D11) |
| :--- | :--- | :--- |
| leaf | 0 | no shading |
| narrow | 1–2 | light neutral band |
| wide | 3+ | deeper neutral band + Contains overview |

## Measuring REACH (E6)

1. For each rule, list every unit **outside its home's branch** where the rule is at work — where
   that unit's own rules, diagnostics or examples would be wrong or incomplete without it.
2. Each listed unit must show a **concrete phrase** from that unit with the rule at work. No phrase ⇒
   off the list. Shared keywords are not dependence.
3. A rule that applies to its own branch's kinds and parts is **inherited, not reach**. That is
   breadth, and the outline already shows it.
4. **Reach = the units on the list, and the number of distinct headings they sit under.**
5. Record the **direction**: one-way (changing this forces a change there) or mutual (each forces
   the other — tense and aspect).

| Reach tier | Test | Rendered as (D12, D13) |
| :--- | :--- | :--- |
| **niche** | Applies to only PART of one unit — an *Exception* to another rule, or a *Narrow case* of it (locked definition in criteria.md, D13) | Indented under the rule it qualifies, lighter type, labelled *Exception* or *Narrow case* |
| **local** | Nothing outside its home's branch | As normal |
| **spanning** | Units under 1–2 other headings | Accent wash, reach label, interaction table, strip, stubs |
| **broad** | Units under **3+** other headings | Spanning treatment + accent rule + Foundations list entry |

**Home.** A rule stays where it naturally belongs, however wide its reach. It moves up to a shared
parent heading only when it is truly ABOUT that parent — every sibling in that parent is governed by
it, so it was stated too low. That move is a restructure, gated once (B8).

**Reach is re-scored across the whole guide every run.** The guide only grows, so a rule's reach
can rise under a heading whose own text never changed.

## The question bank

Two families. Each question is a PROCEDURE carried out against the outline or a real phrase —
never a request for an opinion (C34). The skill uses both families to MEASURE (E6, E7). Only the
Reach family renders: the page shows the Reach questions that were used, instantiated with this
concept and a real neighbour from the guide. The Breadth family is the skill's own working and
never renders (D3).

### BREADTH — *what does it contain?* (measuring only, never rendered)

| id | Question (template) | The procedure |
| :--- | :--- | :--- |
| **B-kind** | Is *[X]* a kind of *[this]*? | Say "*a [X] is a [this]*". Still true? ⇒ kind |
| **B-part** | Is *[X]* a part of *[this]*? | Take [X] out of a real [this]. Is what's left an incomplete [this]? ⇒ part |
| **B-kind-or-part** | Is *[X]* a *[this]*, or found inside one? | Run B-kind, then B-part. The first that passes names the relation |
| **B-inherit** | Does what holds of *[this]* hold of each of its kinds? | Apply this heading's own diagnostic to an example of each kind. Each passes ⇒ the rule is inherited, not reach |
| **B-remove** | Remove *[this]* from the outline — which headings lose their parent? | Those headings are its breadth |

### REACH — *what else does it shape?*

| id | Question (template) | The procedure |
| :--- | :--- | :--- |
| **R-change** | Change *[this]* in a phrase — what else must change? | Alter the feature (*singular → plural*, *count → mass*, *who → which*). Every other word forced to change to stay grammatical is reach |
| **R-depend** | Does *[Y]* depend on *[this]*? | Hide this rule. Does [Y]'s own rule still decide its example correctly? No ⇒ [Y] depends on it |
| **R-outside** | Is *[Y]* outside *[this]*'s family? | Is [Y] under this heading in the outline? Yes ⇒ breadth, not reach. No ⇒ reach |
| **R-direction** | Which way does it run? | Change this — does [Y] change? Change [Y] — does this change? Both ⇒ mutual. One ⇒ one-way |
| **R-where** | Where else does *[this]* show up? | Read the interaction table; every row names a unit and a phrase |

**R-outside is the hinge between the families.** It is the one question that tells a sub-concept
from a dependant, and it is asked before any unit counts toward reach.

### Which questions render where

| Unit | Renders |
| :--- | :--- |
| A rule with reach **spanning** or **broad** | A **Reach** block: R-change (always, where a phrase can show it) plus R-outside or R-direction, instantiated with a real neighbour |
| any breadth; a local or niche rule | No block — breadth shows only as the Contains overview and shading |

Instantiated means filled in: not *"Is [X] a kind of [this]?"* but *"Is a relative clause a kind of
clause?"*. The templates never render bare.
