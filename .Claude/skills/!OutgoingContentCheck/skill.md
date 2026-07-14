---
type: Checkpoint
status: Active
domain: Orchestration
intent: "Resolve the x-axis trust tier for each outgoing target from the People store, then gate: gold proceeds automatically, white/non-listed require Luke's approval (four-way prompt), black is hard-blocked — proceeds only on an explicit named Luke override naming the person and reason. Fail closed."
dependencies:
  - "Memory/Long-Term/People/"
  - "System/Sandbox/"
  - "Outbox/"
  - "whitelist.yaml"
version: 2.0.0
---

## ⚡ TRIGGER
Primary: !OutgoingContentCheck
Secondary: Fires from !Checkpoint Gate A whenever a pending action would push content out of the system — specifically:
  • an email/message addressed to anyone OTHER than Luke's own addresses (luke.isham@gmail.com, luke.isham@pcv.org.au — sending to these never triggers this checkpoint), or
  • content generated, posted, submitted, or otherwise published on the internet (web form, comment, profile, upload, API write, social post).
Not triggered by: drafting into Sandbox/, or read-only web research (browsing, nothing leaves).
Shell: /outgoingcontentcheck
Overriding rule: **Fail closed.** If this gate cannot run, or Luke is unreachable for an approval it needs, HOLD the action — content waits in Outbox/, unsent; web actions are not performed. Never publish or send on an unresolved checkpoint.

## 🛠️ LOGIC
Resolve the x-axis trust tier for each target from the People store, then gate accordingly.

STEP 1 — IDENTIFY THE TARGET(S).
  • Email   → every recipient address that is not one of Luke's own (luke.isham@gmail.com, luke.isham@pcv.org.au).
  • Website → the destination domain.
  • Action  → a stable id for the external operation (e.g. "post-balaclava-roster").
  Also classify the action TYPE (send, reply, post, submit, upload, login, …).

STEP 2 — RESOLVE TIER (x-axis) FROM PEOPLE STORE.
  For each non-Luke target:
  a. Look up the target in Memory/Long-Term/People/_index.yaml by email address to find the person's record.
  b. Open their Person record and read the `interaction_tier` field.
  c. If no Person record exists for this target ➔ tier = NON-LISTED.
  Result: each target carries one of: GOLD · WHITE · NON-LISTED · BLACK.
  LEGACY FALLBACK: whitelist.yaml may be consulted only if the People lookup fails entirely (file unreadable).
    The tier model supersedes whitelist.yaml — do not add new entries to whitelist.yaml.

STEP 3 — GATE BY TIER.
  Evaluate ALL targets together — the strictest tier governs the whole action:

  CASE ALL GOLD:
    Proceed silently. Log and done — no prompt, no Outbox hold.

  CASE ANY BLACK:
    HARD BLOCK. Do not proceed. Do not send. Do not stage in Outbox.
    Report to Luke: name the black-tier person, state what was attempted, explain the block.
    UNBLOCK ONLY IF Luke issues an explicit override in this session, naming the person and giving a reason.
    If override given ➔ carry out the action THIS ONCE. Never auto-whitelist or change the person's tier on an override alone.

  CASE ANY WHITE or NON-LISTED (no BLACK):
    Proceed to STEP 4. In the prompt, flag any NON-LISTED recipient (no Person record found).

STEP 4 — REFER TO LUKE (four-way prompt). [white / non-listed path only]
  Present the content/recipient/destination plus a one-line summary of what will happen, and ask Luke to choose:
    1. Send / Generate              → carry out this action now, this once.
    2. Send / Generate + set tier   → carry it out AND update the person's `interaction_tier` on their Person
                                      record. Confirm the tier to set:
                                        – gold (auto-sends going forward, no further prompts)
                                        – white (light confirm going forward)
                                      If no Person record exists, create a minimal one first.
                                      Never set black via this path — black is set by Luke directly.
    3. Hold in Outbox               → stage the content in Outbox/ unsent for later review. Do not send.
    4. Abandon                      → discard the pending content; nothing is sent or saved.
  Use AskUserQuestion (or the shell prompt) so the choice is explicit. Default on no answer = HOLD (fail closed).

STEP 5 — EXECUTE THE CHOICE.
  1 ➔ perform the send/generation once.
  2 ➔ update `interaction_tier` on the Person record (or create a minimal record), THEN perform the action.
  3 ➔ write/leave the content in Outbox/, mark it "held — awaiting Luke", take no external action.
  4 ➔ delete the pending content; confirm nothing left the system.

## ✅ OUTPUT
State: Every external target was resolved to a tier (GOLD / WHITE / NON-LISTED / BLACK). Gold proceeded silently. Black was hard-blocked (or unblocked only on an explicit named Luke override, carried out once only). White/non-listed received Luke's four-way choice, which was carried out. No content left the system without clearance.
Log: "[AGENT: !OutgoingContentCheck] [SUCCESS] targets=[N] gold=[N] white=[N] non-listed=[N] black=[N] choice=<auto|send|send+tier|hold|abandon|blocked> | tokens≈[N]" → Logs/skills.log
Error: Gate can't run or Luke unreachable for a needed approval ➔ FAIL CLOSED — hold content in Outbox/ unsent, perform no web action, report the blocker. Never bypass this checkpoint.
