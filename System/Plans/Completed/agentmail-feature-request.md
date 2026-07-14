---
plan: "agentmail-feature-request"
context: Personal Productivity
secondary_contexts: []
created: 2026-06-22
status: New
major_because: "multi-step, touches Outbox/ and an external party"
project: ""
skills_used: [!HeadlessChromeBrowser, lukeatron-skills:16, !Checkpoint]
---

# Plan — AgentMail Feature Request: Mark-as-Read API Endpoint

## Objective
Contact the AgentMail developers at the best available email address with a well-crafted
feature request for a mark-as-read / label-update API endpoint, with a draft email saved
to Outbox/ and approved by Luke before anything is sent — advancing Lukeatron's practical
email plumbing in line with the Personal Productivity North Star.

## Success criteria (measurable)
- [ ] Best contact email for AgentMail developers identified and noted in the plan.
- [ ] Draft email file exists at `Outbox/agentmail-feature-request.md`.
- [ ] Draft is in Luke's voice (lukeatron-skills:16 applied).
- [ ] Draft has cleared `!Checkpoint` / `!OutgoingContentCheck` before sending.
- [ ] Anything that leaves the system has Luke's explicit approval.

## Resources
- **Memory to read:** none
- **Capability skills:** `!HeadlessChromeBrowser` (find contact), `!Checkpoint` (before Outbox)
- **Domain skills (Skillbank):** `lukeatron-skills:16` (voice protocol for outgoing email)
- **Sub-agents:** none
- **Scripts:** none
- **Temp-skills:** none

## Steps

- [ ] Step 1 — Research agentmail.to for the best developer contact email: check the website
  (contact page, footer, docs), GitHub (agentmail-to org, README, issues), and any social
  presence (Twitter/X, Discord). [runs: !HeadlessChromeBrowser]

- [ ] Step 2 — Select the single best contact email from Step 1 findings; note it here for
  Luke's awareness. [inline judgment]

- [ ] Step 3 — Draft the feature request email in Luke's voice: explain the mark-as-read gap,
  the current delete-message workaround, and why a label-update or mark-read endpoint would
  improve the API. Keep it clear, collegial, and concise. [runs: lukeatron-skills:16]
    - [ ] !Checkpoint — outgoing content (draft email) about to be saved to Outbox/; run
      `!OutgoingContentCheck` to get Luke's approval before any send action.

- [ ] Step 4 — Save approved draft text to `Outbox/agentmail-feature-request.md`. [file write]

- [ ] Verify — draft file exists in Outbox/, contact email is identified, voice protocol applied,
  Checkpoint cleared. [pass/fail]

## Final step — Logging (always present)
- [ ] Append one line per skill in `skills_used` to `Memory/Long-Term/Logs/skills.log`, format:
  `[AGENT: !<SkillName>] [<SUCCESS|FAIL>] <one-line outcome> | tokens≈[N]`
