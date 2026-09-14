<!--
TEMP CONTACT TEMPLATE — source of truth for records in Memory/Medium-Term/Contacts/
================================================================================
HOW TEMP CONTACTS ARE STORED
  • One folder per contact:  Memory/Medium-Term/Contacts/<ID> <Name>/
  • One file inside it, same name:        <ID> <Name>.md
    e.g.  TC-01 Jane Doe/TC-01 Jane Doe.md
  • The folder name and file name must match exactly (ID + space + display name),
    mirroring Memory/Long-Term/People/'s convention.
  • Memory/Medium-Term/Contacts/_index.yaml catalogues every record — update it
    whenever you add, rename, or remove a temp contact.

UNIQUE ID  (the <ID> above, also the frontmatter `id`)
  • Format: TC-NN, zero-padded, assigned by !Intake on first mention.
  • The ID never changes once assigned — _index.yaml and any Linked-to references point to it.

NON-LISTED SAFETY RULE (invariant — never override without explicit Luke authorisation)
  A recipient resolved ONLY from this store is ALWAYS treated as non-listed.
  → !OutgoingContentCheck four-way approval fires. NEVER auto-send. NEVER skip the gate.
  Trust is anchored in Memory/Long-Term/People/ — this store holds identity/contact details only.

PROMOTION
  When a temp contact becomes significant, !ProjectSweep may SUGGEST promoting
  them to a full People/ record. That is a Long-Term write — routes through !Checkpoint. Never automatic.

USING THE TEMPLATE
  • Copy to <ID> <Name>/<ID> <Name>.md, fill the frontmatter, add a row to _index.yaml.
  • Delete this comment block from the finished record.
================================================================================
-->
---
type: Contact
id: ""                       # TC-NN, must match folder/file name
name: ""
role_context: ""             # role or context in which this person is relevant
email: ""
phone: ""
linked_to: ""                # Project ID (e.g. PR-07)
source: ""                   # Intake:AgentMail | Intake:Inbox | Intake:WhatsApp | Luke | ProjectSweep
interaction_tier: "non-listed"   # ALWAYS non-listed — never override without explicit Luke authorisation
version: "1.0.0"
---

# 📌 Notes
[ Trust note (always non-listed), promotion candidate flag, other context worth remembering. ]
