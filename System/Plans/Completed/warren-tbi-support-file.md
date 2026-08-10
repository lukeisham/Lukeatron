---
plan: "warren-tbi-support-file"
context: Church
secondary_contexts: []
created: 2026-08-04
status: Completed
major_because: "multi-step; modifies Long-Term memory"
project: ""
skills_used: ["WebSearch", "!Checkpoint"]
---

# Plan — Build Warren Ditterich's TBI reference file

## Objective
Process `Inbox/Warren notes.md` into a structured, six-section reference file in Warren
Ditterich's People record covering his TBI symptoms, a plain description of what's
happening, how to get a professional (public-system) neuropsychological diagnosis, a
Melbourne support option, an incident log, and simple talking points — so Luke and Noella
can understand and support Warren. Specialises the Church charter's pastoral-care admin
remit (same footing as CH-01's "pastoral care of Balaclava PC people, faithfully and in
good time").

## Success criteria (measurable)
- `Memory/Long-Term/People/WD26 Warren Ditterich/TBI-notes.md` exists with frontmatter
  (including a short outline of all 6 sections + their purpose) followed by: 1) Symptoms,
  2) Possible description, 3) Finding a professional diagnosis (public-system
  neuropsychologist), 4) Support (Melbourne group), 5) Simple summary / talking points,
  6) Incident log. ✅ Done.
- Section 3 names a real, current Victorian public-system referral pathway to
  neuropsychological assessment (source cited). ✅ Alfred Health / Caulfield Hospital ABI
  Community Rehabilitation Service + ABI Rehab Clinic.
- Section 4 names a real, current Melbourne-based TBI/ABI support service for
  family/carers (source cited). ✅ BrainLink (primary) + Brain Injury Matters (secondary).
- `Inbox/Warren notes.md` cleared — moved to `Archive/` once its content is captured. ✅
  Archived to `Archive/Inbox-processed/2026-08-04_Warren-TBI-notes/`.
- Main record `WD26 Warren Ditterich.md` cross-links to the new file. ✅ Done.

## Resources
- **Memory to read:** `Memory/Long-Term/People/WD26 Warren Ditterich/`,
  `Memory/Medium-Term/Projects/CH-01-housing-warren-noella/registry.md` (background only)
- **Capability skills:** WebSearch (read-only research; equivalent free-tier use to
  `!HeadlessChromeBrowser` — no state-changing web action, so no `!OutgoingContentCheck` needed)
- **Domain skills (Skillbank):** none
- **Sub-agents:** none — single-writer document, no divergent judgement calls per branch
- **Scripts:** none
- **Temp-skills:** none

## Steps
- [x] Step 1 — Read `Inbox/Warren notes.md` and extract symptom/description material [reads: Inbox/Warren notes.md]
- [x] Step 2 — Research the Victorian public-system pathway to a neuropsychologist diagnosis for an acquired/traumatic brain injury (GP referral → public neuropsychology / hospital ABI service / NDIS-adjacent options) [WebSearch]
- [x] Step 3 — Research a Melbourne-based TBI/ABI support service for family and carers (e.g. Brain Injury Matters, Synapse, BrainLink) [WebSearch]
- [x] Step 4 — Draft and write `Memory/Long-Term/People/WD26 Warren Ditterich/TBI-notes.md`: frontmatter (with section outline) + 6 sections [writes: Long-Term/People/WD26]
  - [x] Test in Sandbox — N/A, reason: plain markdown reference note, not a script/temp-skill
  - [x] !Checkpoint — Gate B (Long-Term memory changes). This is an ADDITION, not archive/delete, so per !Checkpoint Gate B it proceeds directly, no approval needed. Cleared.
- [x] Step 5 — Add a one-line cross-link to the new file under WD26's main record (🎯 Notes or 📌 Extra Information) [writes: Long-Term/People/WD26]
- [x] Step 6 — Move `Inbox/Warren notes.md` to `Archive/` now its content is captured [file move] — archived (not deleted) with `_disposition.md` back-pointer, per Intake convention.
- [x] Verify — outputs meet every line in **Success criteria**, and the result matches the **Objective**? [pass]

## Final step — Logging (always present)
- [x] Append one line per skill in `skills_used` to `Memory/Long-Term/Logs/skills.log`.

## Final step — Close out (always present)
- [x] Update `status: Completed` in this plan's frontmatter.
- [x] Append one entry to `Memory/Long-Term/Logs/completed-plans.log`.
- [x] Move the file from `System/Plans/New/` to `System/Plans/Completed/`.
