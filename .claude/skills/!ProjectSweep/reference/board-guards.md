# !ProjectSweep — board-first guards for the all-projects sweep (STEP 2)

> Reference file for `!ProjectSweep`. Moved verbatim out of the skill file on 2026-10-09 (progressive disclosure). The skill file says WHEN to read it. Nothing here overrides a rule in the skill file.

```
  For the ALL-projects sweep (no --project, no named single-project request), reading all 29+
  registries in full every run is the sweep's biggest cost; most are stable greens the sweep then
  leaves untouched. So decide per project, from its prior _tracking.yaml row (state, waiting_on, wake,
  updated), whether to OPEN the full registry.md this run. OPEN it when ANY of these holds — otherwise
  CARRY FORWARD the board's existing state without reading the file:
    • state is not 🟢 Delegate — 🔴/🟠/🔵/⚪ all need advancing or re-checking. ALWAYS open.
    • NO wake condition on the row — a green with no wake can't be trusted. Open and re-triage.
    • wake is DUE or NEAR — wake date ≤ today + 3 days — it may have fired. Open and re-triage.
    • STALE — `updated` is absent or > 21 days ago. Re-verify from source.
    • the registry file's OR the project's notes.md's mtime is NEWER than the row's `updated`
      (best-effort: `ls -la`/`stat`) — it was edited out-of-band since the last sweep (e.g. Luke
      added a 🧭 Agent guidance note via the board). Open and re-triage.
    • the project is a member in _links.yaml (owns a linked action) — open so STEP 2.5 can sync it.
  A 🟢 project that passes ALL guards is CONFIRMED GREEN from the board: keep its state/waiting_on/wake
  as-is, do NOT open the file, and list it in the 🟢 digest section as "Delegate — wakes <wake>".
  This is the token-saving path; the guards are what keep it safe — WHEN IN DOUBT, OPEN.
```
