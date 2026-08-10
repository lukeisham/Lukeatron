<!--
PERSON TONE TEMPLATE — source of truth for tone.md files in Memory/Long-Term/People/
================================================================================
HOW PERSON TONE FILES ARE STORED
  • One file per person, sitting alongside their record:
    Memory/Long-Term/People/<ID> <Full Name>/tone.md
    e.g.  DH26 David Hann/tone.md
  • Filename is always literally "tone.md" — the ID/name disambiguation already
    lives in the parent folder.
  • Memory/Long-Term/People/_index.yaml carries a `tone_file:` path per person —
    update it whenever you add, rename, or remove a person (kept in step with
    the existing `file:` field).

PURPOSE
  A per-person override of the z-axis tone (Groups/) and baseline agent tone
  (Tone/Lukeatron_Agent_Email_Tone.md) — for when a specific individual needs
  their own tone note rather than inheriting their group's default. Read by the
  !Tone skill, which resolves tone in this order: person tone.md (if filled) →
  person's group page(s) in Memory/Long-Term/Groups/ → baseline agent tone.

  Files start blank apart from the frontmatter identifying fields (person_id,
  title, group — mirrored from the Person record for fast lookup without
  opening it). `register` and `notes` stay empty until there is an actual
  standing tone preference to capture for that person.

AUTHORSHIP (the `authorship` field) — who appears to have WRITTEN the email
  agent-disclosed (default)  Agent writes as itself and closes with the standard
                             footer:  ---- Drafted by Lukeatron on Luke's behalf ----
  luke-voice                 First-person AS Luke. No footer, no disclosure, no
                             assistant sign-off, no other tells.

  Resolves most-specific-first: this file → the person's group page(s) → default
  agent-disclosed. A value here ALWAYS beats their group's — this is how you say
  "everyone in this group is luke-voice EXCEPT this person". Blank ⇒ inherit group.

  ⚠️ luke-voice mail is NEVER auto-sent — always staged in Outbox/ for Luke to send
     himself, whatever the trust tier. Not overridable per-person.
     See CLAUDE.md > Lukeatron Interactions > Authorship.

  The FIELD is the decision (machine-readable, comparable across layers, greppable).
  The BODY is the explanation (the why, plus any formatting detail a human wants).
  Keep both — they are not competing.

USING THE TEMPLATE
  • New person added to People/ → copy this file to their folder as tone.md,
    fill person_id / title / group from their Person record, add the
    tone_file: row to People/_index.yaml.
  • Delete this comment block from the finished file. A minimal tone.md is
    frontmatter only; add body sections when there is something to explain.
================================================================================
-->
---
type: "Tone"
person_id: ""          # matches the Person record's uniqueid — the join key for !Tone
title: ""              # mirrors the Person record's title (full name)
group: ""              # mirrored from the Person record's group: field — one string, or a list
authorship: "agent-disclosed"   # agent-disclosed (default) | luke-voice — see note below. Blank ⇒ inherit group, then default
register: ""           # e.g. formal | conversational | pastoral — left blank until assessed
notes: ""              # standing tone preference specific to this person, overriding the group default
updated: ""
version: "1.0.0"
---
