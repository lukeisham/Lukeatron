# !ProjectSweep — linked-action reconciliation (STEP 2.5)

> Reference file for `!ProjectSweep`. Moved verbatim out of the skill file on 2026-10-09 (progressive disclosure). The skill file says WHEN to read it. Nothing here overrides a rule in the skill file.

```
  Linked actions are the SAME task living in two or more projects, sharing a `link key` so their
  Status AND State stay in sync. This is a GLOBAL pass — it needs every project's harvested actions at
  once. Read Memory/Medium-Term/Projects/_links.yaml (the canonical ledger). If unreachable, skip THIS
  step only, note "link sync skipped — ledger unreachable" in the digest, and continue the sweep.

  a. AUTO-LINK (fuzzy, STRICT). Across all harvested open actions, find pairs/groups that are the SAME
     task and SAME object — tolerating ONLY spelling, grammar, punctuation, casing and word-order
     differences ("file the Q1 BAS" ≡ "lodge Q1 BAS return"). A different object or scope does NOT link
     ("file Q1 BAS" ≠ "file Q2 BAS"; "email Robert re insurance" ≠ "email Robert re laundry"). WHEN IN
     DOUBT, DO NOT LINK — over-linking silently couples unrelated work. For each genuine group with no
     shared key yet, mint a kebab `link key`, write it into the 🔗 Link cell of every copy's registry,
     and add a `links:` entry to _links.yaml (members = each {project, action, text}).
  b. SYNC. For every link key (newly minted or pre-existing), reconcile Status and State across its
     members on a LAST-EDIT-WINS basis: take the most-recently-changed copy's Status/State as canonical
     (use each registry's `updated` / Decision Log to judge recency; if indistinguishable, the
     highest-precedence State 🔴→🟠→🔵→🟢→⚪ and the most-advanced Status win). Write the canonical
     Status/State into EVERY member row, set `canonical` + `updated: today` in _links.yaml.
  c. PRUNE. Drop any link key now down to <2 live members (action deleted, done-and-cleared, or unlinked
     by hand); clear the orphaned 🔗 Link cell back to `—`.

  Because State syncs, a linked action forced (say) 🔴 in one project can be the highest-precedence State
  in another — so AFTER this step, RE-DERIVE the whole-project roll-up State (STEP 2 precedence) for any
  project whose actions changed here, before writing the board. ON --dry: compute and report the links
  and syncs as "would link / would sync", mutate nothing.
```

```
  VERIFY every linked action's Status AND State is identical across its members and matches _links.yaml ELSE re-sync.
  VERIFY every 🔗 Link cell points to a key with ≥2 live members ELSE prune it (clear cell to —, drop the key).
```
