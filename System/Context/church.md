# ⛪ Context · Church

> Balaclava Presbyterian Church — preaching preparation (sermon series & passage) and the wider work of running Sunday services and church administration.

```
CONTEXT      Church
TRIGGERS     sermon prep · preaching passage · church admin · Balaclava PC · rosters · slides · congregational prayer
LOADS WITH   !DetermineContext  →  /context
TONE         to-the-point, pastoral, faithful to the text — Luke's own voice
```

---

## 📅 Annual Leave

- **Mon 6 July – Mon 20 July 2026** — Luke is on annual leave. No commitments or planning-day events during this window.

---

## ✍️ Luke's To-Dos — *Church*

<!-- Scratchpad: jot quick to-dos for this domain. Tick [x] when done; clear out the dead ones whenever. -->

- [ ]
- [ ]

---

## 🎯 What this context is for

The preaching and service-running work of Balaclava Presbyterian Church:

- **📖 Sermon series prep** — planning and shaping a series (`SermonSeriesPrep.md` *(planned — not yet on disk)*)
- **🕊️ Individual sermon prep** — working a single preaching passage (`Template_SermonPrep.md`)
- **🙏 Congregational prayers** — drafting prayers for the service (`CongregationalPrayer.md` *(planned — not yet on disk)*)
- **🖼️ Slide shows** — building the Sunday service slides
- **📣 Promotional material** — church promo and communications, both internal and external:
  - **Internal promotions** — congregation-facing notices: service slides, bulletins/newsletters, pulpit and email announcements, noticeboard items
  - **External promotions** — outward-facing promo drafts to reach beyond the congregation: Google ads copy, YouTube reels scripts, Instagram/Facebook post drafts. No automated social-posting portal exists (email is the only send-capable channel), so drafts are staged in `Outbox/` for Luke to post manually
- **🗓️ Rosters & admin** — service rosters and the general administration of church life
- **🧰 Exegetical & doctrinal study tools** — parser apps (Grammar chassis pattern, see Teaching context) for Systematic Theology, Biblical Theology, Greek and Hebrew, Biblical symbols and cross-references, and Biblical Commentary — study aids that support sermon prep

If the primary goal serves Balaclava PC's preaching or Sunday gatherings, this is the context.

---

## 📐 Project Charter — Church

> Every project in this context inherits the following. A project's `purpose:` **specialises** the North Star; its **Definition of Done** is the baseline acceptance test (a project may add to it, never drop below it). `!CreatePlan` derives the Objective + Success criteria from here; `!ReviewPlan` checks the plan against it.

**North Star** — Serve Balaclava PC's preaching and Sunday gathering: faithful to the text, ready in time, in Luke's pastoral voice.

**Definition of Done**
- Faithful to the passage and to Reformed / Presbyterian doctrine.
- Pitched to the congregation and fits the service slot it's for.
- Congregation-facing output (slides, promo, prayers, emails) has cleared `!OutgoingContentCheck`.

**Guardrails**
- Never invent Scripture references or attribute quotes loosely.
- Sermon work uses the `Template_SermonPrep.md` template (single passage); `SermonSeriesPrep.md` and `CongregationalPrayer.md` are *(planned — not yet on disk)*.

---

## 📌 Current Focus

> No dominant project active in this context right now. Route by the task in front of you.

---

## 🧰 Capability skills on call

| Need | Skill | Shell |
| :--- | :--- | :--- |
| Prepare a sermon | Major task using `Template_SermonPrep.md` (via `!CreatePlan`) | — |
| Web research (commentaries, sources) | `!HeadlessChromeBrowser` | — |
| Build a knowledge page | `!GenerateWiki` | — |
| Send / receive church email | `!AgentMail` | — |
| Manage service & roster dates | `!Calendar` | — |
| Plan a major task | `!CreatePlan` → `!ReviewPlan` | — |

Templates this context leans on: `Template_SermonPrep.md` (single-passage prep, on disk); `SermonSeriesPrep.md` and `CongregationalPrayer.md` are *(planned — not yet on disk)*.

(Capability skills load on demand — only when the task reaches for them.)

---

## 🗃️ Memory this context leans on

- `Memory/Long-Term/BalaclavaPC/` — the church itself (people, rhythms, specifics)
- `Memory/Long-Term/Preaching/` — preaching method & notes
- `Memory/Long-Term/Bible/` — passages, references
- `Memory/Long-Term/Theology/` — doctrinal grounding
- `Memory/Long-Term/Church/` — broader church material

> **Parser build material centralised 2026-08-09.** The five study-tool builds below now live under `System/Widgets/Parser/<Store>/` (build source, content draft, raw research) — not the Long-Term store, which currently holds only a pointer `_index.yaml` and stays reserved for any future non-parser domain content.

- `System/Widgets/Parser/Systematic Theology/` — Systematics, Ordo Salutis, doctrine-frequency, doctrines of grace (parser-tool build)
- `System/Widgets/Parser/Biblical Theology/` — biblical theology reference (parser-tool build)
- `System/Widgets/Parser/Greek and Hebrew/` — biblical-language reference (parser-tool build)
- `System/Widgets/Parser/Biblical symbols and cross-references/` — symbol/cross-reference reference (parser-tool build)
- `System/Widgets/Parser/Biblical Commentary/` — commentary reference (parser-tool build; raw material — `CalvinCommentaries`, `Clarke`, `DTN`, `KingComments`, `RWP`, `Scofield` — moved here from `Bible/` on 2026-08-09)
- `Memory/Long-Term/Boilerplate/recurring.md` — recurring service/roster elements

> Native memory (`.Claude/memory.md`) carries *working-style* preferences only — not domain facts.

---

## 🧭 Domain specifics

**🗓️ Service vitals** — use these wherever promo, invites, or slides need the when/where:

- **Where** — 106 Hotham St, Balaclava
- **When** — 10:30am, Sunday

**📖 Bible translation** — preference order for quoting Scripture in sermons, prayers, slides and promo:

- **NIV** — preferred / default
- **ESV** — when accuracy or close wording matters
- **NLT** or **The Message** — when expressiveness or accessibility matters

<!-- TODO (Luke): more domain detail still to capture over time — theological tradition,
     commentary preferences, sermon length, congregation profile, service structure, etc.
     Push durable facts into Memory/Long-Term/BalaclavaPC/ and Preaching/ and point here. -->

---

## 🔁 How a task flows here

```
prompt / Inbox item
      │
      ▼
 !DetermineContext ──► Church
      │
      ▼
 minor?  ── execute directly ──► !Checkpoint
      │
 major?  ── !CreatePlan ► !ReviewPlan ► execute ► !Suggest ► !Checkpoint
```

*Checkpoint before anything leaves the system or changes Long-Term memory.*

---

*Outgoing church material (promo, emails, slides shared beyond drafting) passes `!OutgoingContentCheck` before it leaves.*
