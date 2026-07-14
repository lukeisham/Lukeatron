<!--
PERSON TEMPLATE — source of truth for records in Memory/Long-Term/People/
================================================================================
HOW PEOPLE ARE STORED
  • One folder per person:  Memory/Long-Term/People/<ID> <Full Name>/
  • One file inside it, same name:        <ID> <Full Name>.md
    e.g.  DH26 David Hann/DH26 David Hann.md
  • The folder name and file name must match exactly (ID + space + display name).
  • Memory/Long-Term/People/_index.yaml catalogues every record — update it when
    you add, rename, or remove a person.

UNIQUE ID  (the <ID> above, also the frontmatter `uniqueid`)
  • Format: <first-initial><surname-initial><number>  →  David Hann = DH26, Amy Isham = AI79.
  • The number disambiguates people who share initials; it is part of the key, not meaningful data.
  • On a collision (same initials + number already taken) append a lowercase letter:
    ML26  Mikey Lynch   vs   ML26b  Mook Lee.
  • The ID never changes once assigned — other records (_index.yaml, links) point to it.

LAYOUT
  • Single-# headings, each carrying its emoji, in the order below.
  • Every record keeps the 🎯 Notes section (it is the catch-all and is always present).
  • 🎁 Gift Ideas is optional — keep it for people you buy for, delete it otherwise.
  • Leave the `[ ... ]` prompt in place for any section you have no data for yet —
    empty prompts are expected and show what to gather. Replace a prompt with real
    content as you learn it; keep the heading.
  • Delete this comment block from the finished record.
================================================================================
-->
---
type: Person
title: ""                    # full name, Title Case — mirrors first_name + surname
description: ""              # one-sentence OKF summary of who this person is / their relation to Luke
uniqueid: ""                 # <first-initial><surname-initial><number>, e.g. "DH26" — must match folder/file name
first_name: ""
surname: ""
nickname: ""
mobile: ""
email: ""
handle: ""                   # social / messaging handle
address: ""
group: ""                    # one group as a string ("Canterbury PC"), or several as a list (["Family", "Beloved"])
interaction_tier: ""         # gold (auto, no checkpoint) | white (light confirm) | black (do-not-contact, hard-stop); absent ⇒ non-listed
topic: People
version: "1.0.0"
---

# 🤝 First Contact
[ Date, location, and the "Origin Story" (how you met). ]

# 💬 Last Interaction
[ A brief summary of the most recent sync. ]

# 🧭 Connection Path
[ Who introduced you, or what community connects you? ]

# 🎨 Interests & Obsessions
[ Hobbies that aren't work-related (e.g., "Ultrarunning," "Mechanical Keyboards"). ]

# 🧠 Values & Philosophy
[ Their "operating system" (e.g., "Moves fast and breaks things" vs. "Methodical and slow"). ]

# 🗣️ Communication Style
[ How they like to communicate and be communicated to (e.g., "Direct/No fluff," "Likes storytelling," "Visual thinker"). ]

# 🎂 Personal Milestones
[ Birthday (no year needed), work anniversaries, or major life events. ]

# 🛠️ Shared Projects or Activities
[ Descriptions of shared projects or activities (work or personal). ]

# 👥 Group Behaviour
[ Information related to why they are a part of a particular group. ]

# 🎁 Gift Ideas
[ Running list of gift ideas. Delete this section if it doesn't apply. ]

# 🎯 Notes
[ Anything else worth remembering. ]

# 📌 Extra Information
[ Miscellaneous helpful data that does not fit a category above — e.g. role, organisation, service times, standing facts. ]
