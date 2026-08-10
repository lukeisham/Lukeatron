<!--
GROUP TEMPLATE — source of truth for pages in Memory/Long-Term/Groups/
================================================================================
HOW GROUPS ARE STORED
  • One file per group in Memory/Long-Term/Groups/<slug>.md
  • The slug is a lowercase-hyphenated version of the group name as it appears in
    Person records' group: field (e.g. "The Hearth" → the-hearth.md).
  • Memory/Long-Term/Groups/_index.yaml catalogues every page — update it when
    you add, rename, or remove a group.

PURPOSE
  Groups are the z-axis of the Lukeatron Interactions model:
    z = tone & action filter — the *how* (manner) + *what-you-do* (nature of the interaction).
  When composing outgoing content for a person, load their group page(s) to calibrate:
    • the register and warmth of the language
    • the type of action appropriate for this relationship
    • any standing norms or cautions

  Distinct from y (domain / content filter), which constrains *what* is communicated.

AUTHORSHIP (the `authorship` field) — who appears to have WRITTEN the email
  agent-disclosed (default)  Agent writes as itself and closes with the standard
                             footer:  ---- Drafted by Lukeatron on Luke's behalf ----
  luke-voice                 First-person AS Luke. No footer, no disclosure, no tells.

  Set here, it applies to EVERY member of the group. An individual member's
  People/<ID>/tone.md `authorship` always beats this value, so a group set to
  luke-voice can still carry per-person exceptions.

  ⚠️ luke-voice mail is NEVER auto-sent — always staged in Outbox/ for Luke to send
     himself, whatever the member's trust tier. Not overridable.
     See CLAUDE.md > Lukeatron Interactions > Authorship.

  Delete this comment block from the finished page.
================================================================================
-->
---
type: Group
name: ""          # group name exactly as it appears in Person records' group: field
title: ""         # mirrors name — the OKF reserved field
description: ""   # one-sentence OKF summary of who this group is / its role
context: []       # which Lukeatron contexts this group most commonly appears in
authorship: "agent-disclosed"   # agent-disclosed (default) | luke-voice — applies to every member
                                # unless their own tone.md overrides it. See note above.
updated: ""
---

# 🎯 Purpose & Identity
[ What this group is and why it exists in the system — who belongs to it, what it represents. ]

# 🗣️ Tone
[ How to speak TO members of this group — register, warmth, formality, directness. This is the z-axis tone modulator. ]

# ⚡ Action & Nature
[ What kinds of actions are appropriate for this group — what the interaction typically looks like (e.g. coordination, pastoral care, professional correspondence, personal sharing). This is the z-axis action modulator. ]

# 🚦 Interaction Notes
[ Standing rules, cautions, or norms for this group — e.g. "always cc Luke", "don't assume familiarity", tier notes for key members. ]

# 👥 Members
[ List of people in this group (name + uniqueid) or "see People/_index.yaml for full list". ]
