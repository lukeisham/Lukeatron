---
plan: "lukeatron-interactions-xyz-model"
context: Personal Productivity
secondary_contexts: []
created: 2026-06-24
status: New
major_because: "modifies a key checkpoint skill (!OutgoingContentCheck) + a key template (Template_Person) + the CLAUDE.md operating manual + adds a Long-Term Groups store"
project: ""
skills_used: [!CreatePlan, !ReviewPlan]
---

# Plan — Lukeatron Interactions (x/y/z human-interaction model)

## Objective
Give Lukeatron one precise, documented model for how it interacts with any human — resolved along three axes (x = trust tier / safety gate, y = domain / content filter, z = group / tone & action filter) — wired into CLAUDE.md, the checkpoint skills, the Person template, and a new Groups store, with email as the sole current channel.

## Success criteria (measurable)
- A `## Lukeatron Interactions` section exists in `.claude/CLAUDE.md` stating the x/y/z model, the four x-tiers, the y vs z distinction, and "email only for now".
- `Template_Person.md` carries an `interaction_tier:` field (gold/white/black; absent ⇒ non-listed) with a one-line explainer.
- A `Memory/Long-Term/Groups/` store exists (`_index.yaml` + `Template_Group.md` + seed pages for groups already in use), each group page carrying **tone** + **action/nature** notes.
- `!OutgoingContentCheck` resolves x from the People store: **gold** proceeds silently · **white/non-listed** prompt for approval · **black** is hard-blocked and proceeds only on an explicit override.
- The 3 existing `whitelist.yaml` recipients (Amy, PCV address, Keith) are recorded as **gold** and still auto-send (no behaviour regression).
- The new CLAUDE.md section and the rewritten `!OutgoingContentCheck` match existing house style (manual/section style; skill frontmatter → `⚡TRIGGER / 🛠️LOGIC / ✅OUTPUT`).
- Everything that changes Long-Term memory or a key skill/template has cleared `!Checkpoint` with Luke's sign-off.

## Locked model (decisions confirmed by Luke, 2026-06-24)

Every human interaction resolves as a function of **(x, y, z)**. Resolution order: **x gates → y filters content → z shapes tone & action.**

| Axis | Governs | Resolved from | Values / behaviour |
|---|---|---|---|
| **x — Trust tier** | the **safety gate** | person's `interaction_tier` (People store); absent ⇒ non-listed | **gold** — proceeds automatically, NO `!Checkpoint`/`!OutgoingContentCheck` · **white** — known/approved, light "confirm send" approval · **non-listed** — unknown, default four-way approval, no group/tone profile assumed · **black** — do-not-contact; **HARD STOP**, blocked by default, proceeds ONLY on an explicit deliberate Luke override naming the person + reason |
| **y — Domain** | a **content filter** (the *what* — subject-matter / substance in scope) | active context (`!DetermineContext`), finer if the material calls for it; context readme + `Preferences/` / `Style Guide/` | the domain of the interaction → constrains the content, **not** the manner. **No new store** — reuses the existing context / `Preferences` / `Style Guide` definitions |
| **z — Group** | a **tone & action filter** (the *how* + *what-you-do* — manner and nature of the interaction) | person's `group(s)` (People `group:`) → notes page in the new `Groups/` store | per-group tone + interaction/action norms |

> **The subtle difference (Luke):** y = **content** (what is communicated), z = **tone & action** (how it's communicated + what is done). They are distinct filters, not two flavours of "tone".

**Channel:** email only for now; the model is written to extend to other channels (WhatsApp, web) later.

## Resources
- **Memory to read:** `Long-Term/Tone/`, `Long-Term/Style Guide/`, `Long-Term/Preferences/`, `Long-Term/People/_index.yaml`
- **Capability skills:** none
- **Domain skills (Skillbank):** none
- **Sub-agents:** none (each step is a discrete authored edit)
- **Scripts / Temp-skills:** none — changes are hand-authored edits to manual + skills + templates
- **Key items touched (need Luke's explicit sign-off):** `CLAUDE.md`, `!OutgoingContentCheck`, `!Checkpoint`, `Template_Person.md`

## Steps
Bite-sized and ordered. Each box is one action. Mark `[x]` when complete.

- [x] 1 — Lock the three open decisions [done 2026-06-24: black = hard-stop/override · tier per-Person · y = content filter, z = tone & action filter]
- [x] 2 — Draft the `## Lukeatron Interactions` section for `.claude/CLAUDE.md` (model table + resolution order + y/z distinction + email-only note) — draft in `System/Sandbox/interactions-section-draft.md` [authored edit]
  - [x] !Checkpoint — Luke sign-off granted via "implement plan" instruction (2026-06-24)
- [x] 3 — Added `interaction_tier:` to `Template_Person.md` frontmatter (gold/white/black; absent ⇒ non-listed) with a one-line explainer [authored edit]
  - [x] !Checkpoint — Luke sign-off granted via "implement plan" instruction (2026-06-24)
- [x] 4 — Created `Memory/Long-Term/Groups/` store — `_index.yaml` + `System/Templates/Template_Group.md` + 5 seed pages (family, the-hearth, church, network, afia) [authored edit]
  - [x] !Checkpoint — Long-Term write, proceeds as addition (not gated per !Checkpoint Gate B)
- [x] 5 — Rewrote `!OutgoingContentCheck` (v2.0.0) — tier-aware, resolves x from People store; gold auto, white/non-listed four-way prompt, black hard-block; whitelist.yaml superseded [authored edit]
  - [x] Test in Sandbox — System/Sandbox/interactions-outgoingcontentcheck-dryrun.md — PASS (all 4 tiers)
  - [x] !Checkpoint — Luke sign-off granted via "implement plan" instruction (2026-06-24)
- [x] 6 — Updated `!Checkpoint` Gate A to reference the tier model [authored edit]
  - [x] !Checkpoint — Luke sign-off granted via "implement plan" instruction (2026-06-24)
- [x] 7 — Migrated 3 whitelist.yaml entries → gold: AI79 Amy (+ email added), KF19 Keith, LI78 Luke (+ email added); whitelist.yaml annotated as superseded [authored edit]
  - [x] !Checkpoint — Long-Term write (addition), proceeds directly
- [x] 8 — Updated CLAUDE.md: Groups/ in Core Memory Structure + Folder Reference; Template_Group.md in Templates table [authored edit]
- [x] 9 — Sandbox dry-run complete — System/Sandbox/interactions-outgoingcontentcheck-dryrun.md — PASS all 4 tiers [Sandbox test — Gate C ✅]
- [x] Verify — all Success criteria met (see below). [PASS]

## Final step — Logging (always present)
- [x] Appended skill log lines to `Memory/Long-Term/Logs/skills.log`
