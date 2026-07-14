# Lukeatron — System Guide (Visual Map)

> **This is the map, not the territory.** `_Lukeatron/.claude/CLAUDE.md` is the single
> source of truth for how Lukeatron works. This guide only *visualises* it — diagrams of
> how information flows and how the skills fit together, for orientation at a glance.
> Where a diagram and CLAUDE.md ever disagree, **CLAUDE.md wins.**
>
> **How to read:** every box is a stage, store, or skill; every arrow is a hand-off.
> `!Name` is a skill. Each section ends with a `→ CLAUDE.md §…` pointer to the
> authoritative prose. Best viewed in a monospaced window (the box-drawing only lines
> up in fixed-width text).

---

## Contents

1. [System at a Glance](#1--system-at-a-glance)
2. [The Main Loop](#2--the-main-loop)
3. [Information Flow](#3--information-flow)
4. [Intake Fan-Out](#4--intake-fan-out)
5. [The Interactions Model (x · y · z)](#5--the-interactions-model-x--y--z)
6. [Memory Architecture](#6--memory-architecture)
7. [The Two Sweep Engines](#7--the-two-sweep-engines)
8. [Skill Map](#8--skill-map)

---

## 1 · System at a Glance

The whole system is one repeating loop: information enters, gets understood, gets placed,
work is done — and **nothing leaves or changes without a safety gate.**

```
        ┌───────────────────────────────────────────────────────┐
        │                   THE LUKEATRON LOOP                   │
        └───────────────────────────────────────────────────────┘

              new info ──▶ understand ──▶ place ──▶ work
                                                      │
                              ┌───────────────────────┘
                              ▼
                       safety gate ──▶ done

        ─────────────────────────────────────────────────────────

        WHERE INFORMATION LIVES AS IT MOVES:

              ┌──────────┐
              │  Inbox/  │   new material arrives, waits to be routed
              └────┬─────┘
                   ▼
              ┌──────────┐
              │ Sandbox/ │   drafts & experiments — work happens here
              └────┬─────┘
                   ▼
              ┌──────────┐
              │ Memory/  │   keepers are kept (Long-Term / Medium-Term)
              └────┬─────┘
                   ▼
              ┌──────────┐
              │ Outbox/  │   finished content staged to leave the system
              └──────────┘
```

*→ CLAUDE.md § Workflow at a Glance, § Information Flow*

---

## 2 · The Main Loop

Eight stages. Each one names the skill that runs it and the question it answers.

```
        ┌────────────────────────────────────────┐
        │ 1 · TRIGGER                             │
        │     a prompt, or new material in        │
        │     Inbox/ · AgentMail · WhatsApp       │
        └───────────────────┬────────────────────┘
                            │  what is this about?
                            ▼
        ┌────────────────────────────────────────┐
        │ 2 · CONTEXT          !DetermineContext  │
        │     pick 1 of 4 contexts, load its      │
        │     readme + relevant Memory/           │
        └───────────────────┬────────────────────┘
                            │  where does it go?
                            ▼
        ┌────────────────────────────────────────┐
        │ 3 · ROUTE            !Intake            │
        │     fan out to ① ② ③ ④  or discard ∅   │
        └───────────────────┬────────────────────┘
                            │  is there a specialist for this?
                            ▼
        ┌────────────────────────────────────────┐
        │ 4 · SKILL            Skillbank catalog  │
        │     match a trigger, load the body      │
        └───────────────────┬────────────────────┘
                            │  big enough to need a plan?
                            ▼
        ┌────────────────────────────────────────┐
        │ 5 · SIZE                                │
        │     minor  → just do it                 │
        │     Major  → !CreatePlan → !ReviewPlan  │
        └───────────────────┬────────────────────┘
                            │
                            ▼
        ┌────────────────────────────────────────┐
        │ 6 · EXECUTE                             │
        │     the work happens; drafts &          │
        │     intermediates live in Sandbox/      │
        └───────────────────┬────────────────────┘
                            │  before ANYTHING leaves or changes…
                            ▼
        ┌────────────────────────────────────────┐
        │ 7 · CHECKPOINT       (fails closed)     │
        │     safe to send / store?               │
        │     → !OutgoingContentCheck             │
        │     → !ArchiveMemory                     │
        └───────────────────┬────────────────────┘
                            │  yes
                            ▼
        ┌────────────────────────────────────────┐
        │ 8 · CLOSE                               │
        │     plan → System/Plans/Completed/      │
        │     reusable step? → !Suggest           │
        │     output → Outbox/                     │
        └────────────────────────────────────────┘
```

**Three invariants hold at every stage:** never stall silently · never bypass a safety
checkpoint · never let the two memory stores duplicate.

*→ CLAUDE.md § Workflow at a Glance, § Operating system workflow*

---

## 3 · Information Flow

The four working areas, and what crosses each boundary.

```
        ┌────────────────────────────────────────┐
        │  Inbox/                                 │
        │  new external info lands & waits        │
        │  (AgentMail · web captures · manual)    │
        └───────────────────┬────────────────────┘
                            │  routed by !Intake
                            ▼
        ┌────────────────────────────────────────┐
        │  Sandbox/                               │
        │  scratch space — drafts, experiments,   │
        │  intermediates; kept OUT of Memory/     │
        └───────────────────┬────────────────────┘
                            │
              ┌─────────────┴──────────────┐
              │  keep                       │  the rest
              ▼                             ▼
        ┌──────────────────────┐     ┌──────────────┐
        │  Memory/             │     │  ✗ cleared    │
        │  Long-Term /         │     │  / discarded  │
        │  Medium-Term         │     └──────────────┘
        │  (promoted only past │
        │   !Checkpoint Gate C)│
        └──────────┬───────────┘
                   │  finished content to send
                   ▼
        ┌────────────────────────────────────────┐
        │  Outbox/                                │
        │  staged to leave — only after          │
        │  !OutgoingContentCheck                  │
        └────────────────────────────────────────┘
```

`temp-skills/` sits beside this flow: prototype skills incubate there, then graduate to
`System/.claude/skills/` or expire under Medium-Term pruning.

*→ CLAUDE.md § Information Flow*

---

## 4 · Intake Fan-Out

`!Intake` runs right after the context is set. One arriving item can fire **0 to 4**
outcomes (they are compoundable) — or none, in which case it is discarded.

```
                  ┌──────────────────────────────┐
                  │  new item  (after            │
                  │  !DetermineContext sets       │
                  │  the context)                 │
                  └───────────────┬──────────────┘
                                  ▼
                            ┌───────────┐
                            │  !Intake  │
                            └─────┬─────┘
            ┌──────────┬─────────┼─────────┬──────────┐
            ▼          ▼         ▼         ▼          ▼
      ┌─────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌─────────┐
      │① PROJECT│ │② STORE │ │③ THINK │ │④ ACT   │ │∅ DISCARD│
      ├─────────┤ ├────────┤ ├────────┤ ├────────┤ ├─────────┤
      │ tracked │ │ durable│ │ read / │ │ do it, │ │ handled │
      │ work-   │ │ fact   │ │ watch /│ │ or make│ │ or noise│
      │ strand  │ │ to keep│ │ write  │ │ a plan │ │         │
      └────┬────┘ └───┬────┘ └───┬────┘ └───┬────┘ └────┬────┘
           ▼          ▼          ▼          ▼           ▼
      registry +  Long-Term  LukeatronWiki  one-off /   delete or
      _tracking   subject     !IdeaWiki     !CreatePlan  → Archive/
      (gated)     store                     (→!Checkpoint
                  (gated)                    for outgoing)
```

A self-contained one-off that belongs to no project goes to `!MinorTask`. An item that
won't classify becomes an `Intake:ambiguous` queue row (Impact High, 🟠) for Luke to
decide — never a guess.

*→ CLAUDE.md § Inbox Disposition*

---

## 5 · The Interactions Model (x · y · z)

Every outgoing message to a person resolves through three axes, in order:
**x gates → y filters content → z shapes tone & action.**

```
                       ┌──────────────────┐
                       │  recipient        │
                       └─────────┬────────┘
                                 ▼
        ┌────────────────────────────────────────────────────────┐
        │  x — TRUST     (look up in People/)                     │
        │                                                         │
        │     gold ───────────────▶  proceed, no gate            │
        │     white ──────────────▶  !OutgoingContentCheck        │
        │     non-listed ─────────▶  !OutgoingContentCheck        │
        │     black ──────────────▶  HARD STOP (named override     │
        │                            only)                         │
        └───────────────────────┬────────────────────────────────┘
                                ▼
        ┌────────────────────────────────────────────────────────┐
        │  y — DOMAIN    (active context + Preferences/ /         │
        │                 Style Guide/)                           │
        │                                                         │
        │     → constrains WHAT is communicated (subject-matter)  │
        └───────────────────────┬────────────────────────────────┘
                                ▼
        ┌────────────────────────────────────────────────────────┐
        │  z — GROUP     (person's group(s) → Groups/ pages)      │
        │                                                         │
        │     → shapes HOW it is communicated + the nature of     │
        │       the action (tone, manner)                         │
        └───────────────────────┬────────────────────────────────┘
                                ▼
                          send / stage
```

**Key distinction:** y = *what* is said (content); z = *how* it is said (tone & manner).
Two different filters, not two flavours of tone.

*→ CLAUDE.md § Lukeatron Interactions*

---

## 6 · Memory Architecture

Two memory stores that must **never duplicate** each other. One test decides which.

```
        ┌────────────────────────────────────────────────────────┐
        │  THE TEST: is this about…                              │
        │                                                         │
        │     "how we WORK together"?  ──▶  Claude native memory  │
        │                                   .claude/memory.md     │
        │                                   (working style only)  │
        │                                                         │
        │     "Luke's WORLD & output"? ──▶  Lukeatron Memory/     │
        │                                   (everything else)     │
        └────────────────────────────────────────────────────────┘

        Lukeatron  Memory/
        ┌──────────────────────────┐    ┌──────────────────────────┐
        │  Long-Term/              │    │  Medium-Term/            │
        │  kept until deleted      │    │  pruned on demand        │
        │                          │    │                          │
        │  Purpose · Preferences   │    │  Projects/               │
        │  Tone · Style Guide      │    │    └▶ !ProjectSweep      │
        │  People · Groups         │    │  MinorTasks/             │
        │  subject stores (Bible,  │    │    └▶ !Initiative        │
        │   Theology, Coding …)    │    │  Contacts/               │
        │  LukeatronWiki           │    │  temp-skills/            │
        │                          │    │                          │
        │  prune gate:             │    │  prune gate:             │
        │  └▶ !ArchiveMemory       │    │  └▶ !PruneMemory         │
        │     (gated, reviewed)    │    │     (on demand)          │
        └──────────────────────────┘    └──────────────────────────┘
```

Nothing in `Long-Term/` is ever deleted automatically — only via `!ArchiveMemory`,
gated and user-reviewed.

*→ CLAUDE.md § Memory, § Memory Governance, § Memory Structure*

---

## 7 · The Two Sweep Engines

Two engines, two **disjoint** data stores. Neither ever touches the other's store.
Each sends its own digest; `!Review` covers Projects/ only.

```
        ┌──────────────────────────┐    ┌──────────────────────────┐
        │  !ProjectSweep           │    │  !Initiative             │
        │  generative              │    │  generative              │
        │                          │    │                          │
        │  owns ▶ Projects/        │    │  owns ▶ MinorTasks/      │
        │                          │    │                          │
        │  triage each project:    │    │  Low-impact rows:        │
        │   🔴 urgent              │    │    auto-action unattended│
        │   🟠 your move           │    │  High-impact rows:       │
        │   🔵 waiting             │    │    propose sketch to     │
        │   🟢 on track            │    │    Sandbox/ (never run)  │
        │   ⚪ undefined           │    │                          │
        │                          │    │  NEVER reads/writes      │
        │  maintains _tracking.yaml│    │  Projects/ or registries │
        └────────────┬─────────────┘    └────────────┬─────────────┘
                     ▼                                ▼
          ┌─────────────────────┐       ┌─────────────────────────┐
          │  !Review            │       │  !Initiative digest      │
          │  distils Projects/  │       │  distils MinorTasks/     │
          │  only → emails Luke │       │  only → emails Luke      │
          │  (advances nothing) │       │  (separate email)        │
          └─────────────────────┘       └─────────────────────────┘

        feeder:  !MinorTask ──appends rows──▶ MinorTasks/ ──▶ !Initiative
```

*→ CLAUDE.md § Key Skills (`!ProjectSweep`, `!Initiative`, `!Review`, `!MinorTask`)*

---

## 8 · Skill Map

The canonical skills grouped by what they do. Gloss = one line; the authoritative
description of each lives in CLAUDE.md § Key Skills, Checkpoints and Templates.

```
        ┌─ FRONT DOOR ─────────────────────────────────────────┐
        │  !DetermineContext   pick 1 of 4 contexts            │
        │  !Intake             route an item to ①②③④ / ∅      │
        │  !MinorTask          log a small self-contained task  │
        └──────────────────────────────────────────────────────┘

        ┌─ PLANNING ───────────────────────────────────────────┐
        │  !CreatePlan         break a Major task into steps    │
        │  !ReviewPlan         sanity-check a plan before run    │
        │  !Suggest            capture a repeatable step as skill│
        └──────────────────────────────────────────────────────┘

        ┌─ CAPABILITY PIPES ───────────────────────────────────┐
        │  !AgentMail          send / receive email             │
        │  !Calendar           manage calendar events           │
        │  !HeadlessChrome…    live web research & actions       │
        │  !GenerateWiki       build a standalone article        │
        └──────────────────────────────────────────────────────┘

        ┌─ SWEEP ENGINES (disjoint stores) ────────────────────┐
        │  !ProjectSweep   advance ▶ Projects/   (weekly Mon)   │
        │  !Initiative     work    ▶ MinorTasks/ (daily)        │
        │  !Review         distil  ▶ Projects/ → digest (2×/wk)│
        │                  (reads Projects/ only; !Initiative   │
        │                   sends its own MinorTasks digest)    │
        └──────────────────────────────────────────────────────┘

        ┌─ GATES (fail closed) ────────────────────────────────┐
        │  !Checkpoint             decides which gate(s) fire   │
        │  !OutgoingContentCheck   approve before anything sends │
        │  !ArchiveMemory          gated Long-Term prune         │
        └──────────────────────────────────────────────────────┘

        ┌─ SKILLBANK (on-demand; load on trigger, not at boot) ┐
        │  !IdeaWiki       tend the LukeatronWiki graph         │
        │  !PruneMemory    on-demand Medium-Term maintenance     │
        │  !Dashboard      live project urgency widget          │
        │  !WhatsApp       read-only WhatsApp portal            │
        │  !ThinPortal     build pattern for new portal skills  │
        └──────────────────────────────────────────────────────┘

        who-calls-whom (the load-bearing edges):

          !Intake ───▶ !MinorTask ───▶ (MinorTasks queue) ───▶ !Initiative
          !Intake ───▶ !CreatePlan ──▶ !ReviewPlan
          !Checkpoint ─┬─▶ !OutgoingContentCheck
                       └─▶ !ArchiveMemory
```

*→ CLAUDE.md § Key Skills, Checkpoints and Templates*

---

*Companion document to `_Lukeatron/.claude/CLAUDE.md`. Keep in sync — when CLAUDE.md's
workflow, skills, memory model, or interactions change, update the matching diagram here.*
