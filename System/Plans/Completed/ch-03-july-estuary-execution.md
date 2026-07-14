---
plan: "ch-03-july-estuary-execution"
context: Church
secondary_contexts: []
created: 2026-07-01
status: Completed
major_because: "multi-step; touches Outbox/external party (event announcement); may add keeper assets to Long-Term/Church on closeout"
project: "CH-03"
skills_used: ["!HeadlessChromeBrowser", "!Checkpoint", "!OutgoingContentCheck"]
---

# Plan — Execute remaining CH-03 (July Estuary) Next Actions

## Objective
Complete and announce the July Estuary "Discussion Without Compromise" night — every draft callout backed by a sourced clip or quote, cover image and social promo ready, the event announced, and Luke's final go-ahead — ready in time for 18 July, in Luke's voice, and completed before Luke's 6–20 July annual leave begins.

## Success criteria (measurable)
- `documents/discussion-questions-draft.md` has all 7 YouTube clip callouts filled with a real clip, each recorded as **name → link → timestamp(s) if required** (per `notes.md` Agent guidance).
- The "Internet of Beefs" quote for the warmup opener is sourced, attributed, and inserted at its callout.
- A cover image file exists in `documents/`.
- A social media promo (paragraph + dotpoints) exists in `documents/`, in Luke's voice (checked against Tone/Preferences/Style Guide, not vibes).
- The event announcement has cleared `!OutgoingContentCheck` and is either sent or staged in `Outbox/` for Luke to post — approval sought before 2026-07-06, ahead of Luke's leave.
- Luke has been asked, and has answered, whether to schedule the `july-estuary-promote-reminder` cron (beginning-of-August promote nudge) — closing the project's DoD line on the promote reminder, not just the confirmation line.
- `registry.md` Next Actions #3–#9 marked ☑ Done; #10 (Luke confirms ready) left for Luke, with a Decision Log line recording that it was surfaced to him.
- Guardrails held: no invented or loosely-attributed quotes; every clip link is real and checked.

## Resources
- **Memory to read:** `Memory/Medium-Term/Projects/CH-03-july-estuary/registry.md`, `notes.md`, `documents/discussion-questions-draft.md`; `Memory/Long-Term/BalaclavaPC/` (service vitals for promo); `Memory/Long-Term/Church/` (broader church material); `Memory/Long-Term/Tone/` and `Preferences/` / `Style Guide/` (Luke's voice, for Step 5)
- **Capability skills:** `!HeadlessChromeBrowser` (source clips, quote, cover image), `!AgentMail` (if announcement goes out by email)
- **Domain skills (Skillbank):** none match
- **Sub-agents:** one per dynamic research task — clip sourcing (7 callouts), Internet of Beefs quote sourcing, cover image sourcing, social promo drafting
- **Scripts:** none
- **Temp-skills:** none

## Steps

- [x] Step 0 — Timeline check: passed (today 2026-07-01, 5 days runway). **Mid-execution discovery superseded this step's premise**: the draft doc's "15 August" heading conflicted with the registry's "18 July" — Luke confirmed 15 August is the real date, calendar event + registry corrected. The leave-window conflict this step worried about is now moot (Aug 15 is a month past leave). [runs: direct check]
- [x] Step 1 — Sourced all 7 YouTube clips via 3 parallel sub-agents using `!HeadlessChromeBrowser`. All verified live (Pope Francis pluralism clip, LearnFree echo-chamber, Ray Comfort mind-change, Simpsons strawman, Dawkins/Rowan Williams, Columbo, Haidt) — 2 flagged for Luke's preview (Pope clip theologically sensitive; Ray Comfort short cut is an unofficial re-upload).
- [x] Step 2 — Sourced the Internet of Beefs quote — live Ribbonfarm site + search engines blocked bots, verified instead via Wayback Machine snapshot. Exact quote + source recorded.
- [x] Step 3 — All 7 clips + quote inserted into `discussion-questions-draft.md` at their callout points, each as name → link → timestamp, per notes.md convention.
- [x] Step 4 — Sourced 2 cover image candidates (Wikimedia Commons — Unsplash/Pexels/Pixabay blocked bots), downloaded and verified as valid JPEGs into `documents/`. Luke chose to keep both, decide later.
- [x] Step 5 — Drafted social media promo (Facebook + Instagram) per `Tone/Church/Marketing.md` + `Language_Style.md`; asked Luke for missing specifics (start time 2pm, RSVP via Meetup link) rather than inventing them.
- [x] Step 6 — Assembled and reviewed: draft doc, both images, and promo all complete and consistent.
  - [x] Test in Sandbox — N/A, no new script/temp-skill produced this plan
- [x] Step 7 — Announced: ran `!Checkpoint` (Gate A fired) → `!OutgoingContentCheck` (general-public post, no specific-person tier; Luke approved) → promo staged in `Outbox/estuary-august-social-media-promo.md`, ready for Luke to post (no automated social-posting connector exists — logged to issues.log).
  - [x] !Checkpoint — cleared, see above
- [x] Step 8 — Surfaced action #10 to Luke (still open, his to close) and asked about the promote-reminder cron; Luke declined it (cloud routine system had no confirmed file/email access to safely replicate it) — recorded in registry.md Decision Log.
- [x] Verify — all Success Criteria met: 7 clips + quote inserted; cover images in `documents/`; promo drafted in Luke's voice per Tone/Marketing guidance; announcement cleared `!OutgoingContentCheck` and staged in Outbox/; promote-reminder question asked and answered; registry #3–#9 marked Done, #10 left open with Decision Log line; no invented facts (date conflict was caught and resolved with Luke, not guessed). PASS.

## Final step — Logging (always present)
- [x] Appended one line per skill in `skills_used` to `Memory/Long-Term/Logs/skills.log`.

## Final step — Close out (always present)
- [x] `status: Completed` set above; file moved to `System/Plans/Completed/`.
