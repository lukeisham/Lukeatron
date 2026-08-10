---
type: Skill
status: Active
domain: Orchestration
intent: "Point content generation to the correct tone source, and resolve who appears to have authored it — never governs tone itself. Internal content resolves to its active context's Tone/ folder; content directed at a specific person additionally layers that person's tone.md, then their group page, on top of the same context baseline, and resolves the `authorship` field (agent-disclosed | luke-voice) down the same ladder."
dependencies:
  - "Memory/Long-Term/Tone/_index.yaml"
  - "Memory/Long-Term/People/<ID>/tone.md (per-person, on demand)"
  - "Memory/Long-Term/Groups/ (per-group, on demand)"
version: 1.1.0
---

## ⚡ TRIGGER
Primary: !Tone
Secondary: Fires whenever a task is about to GENERATE content — internal (sermon draft, wiki article, notes, teaching material) or directed at a specific person (email, letter, message). Called during Execute (minor/major tasks) and by any content-producing skill (`!AgentMail`, `!GenerateWiki`, `!IdeaWiki`, ad hoc drafting) before drafting begins.
Shell: /tone
Not a checkpoint: !Tone runs BEFORE drafting to point at sources — it approves nothing (that's `!Checkpoint` / `!OutgoingContentCheck`) and writes nothing. It DOES report the `luke-voice` staging requirement, but reporting is not gating: `!Checkpoint` still owns the send decision.

## 🛠️ LOGIC
ASSERT the active context is already set (`!DetermineContext` has run) ELSE run it first — context decides which `Tone/` folder applies.

STEP 1 — MAP context → `Tone/` domain folder:
  Church                  ➔ `Memory/Long-Term/Tone/Church/`
  Teaching                ➔ `Memory/Long-Term/Tone/Teaching/`
  Personal Productivity   ➔ `Memory/Long-Term/Tone/Personal/`
  Personal Research       ➔ `Memory/Long-Term/Tone/Personal/` (no dedicated folder yet — nearest fit)

STEP 2 — CLASSIFY the content's addressing:
  MATCH content
    CASE directed at a specific named person (email, letter, personal message)
      THEN mark PERSON-DIRECTED, recipient = that person
    DEFAULT mark INTERNAL (sermon draft, wiki article, notes, teaching material — no single named recipient)

STEP 3 — RESOLVE, most specific wins, falling through each unfilled/missing layer:
  IF PERSON-DIRECTED:
    a. READ `Memory/Long-Term/People/<ID>/tone.md` (path via that person's `People/_index.yaml` → `tone_file`).
       IF `register` or `notes` is non-blank ➔ USE it, STOP.
    b. ELSE READ the person's `group(s)` page(s) → `Memory/Long-Term/Groups/<group>.md`.
       IF a group page exists ➔ USE it, STOP.
    c. ELSE fall through to the context folder below — person-directed content ALWAYS also carries
       the context baseline underneath whichever person/group layer matched.
  READ the STEP 1 context folder's `index.md` (or list the folder).
    IF it has content ➔ USE it, STOP.
  ELSE (folder empty, or the channel is email specifically) ➔ USE
    `Memory/Long-Term/Tone/Lukeatron_Agent_Email_Tone.md` as the baseline.
  IF nothing in the chain resolves ➔ report the gap, proceed on `Style Guide/` / `Preferences/` alone
    (per Failure Handling: degrade gracefully, never invent tone content).

STEP 3b — RESOLVE `authorship` (PERSON-DIRECTED only — who appears to have WRITTEN it).
  Walk the SAME ladder as STEP 3, independently of which layer won there. A blank or absent
  `authorship` is NOT an answer — it means "inherit", so keep falling through:
    a. `People/<ID>/tone.md` → `authorship:`   IF non-blank ➔ USE it, STOP.
    b. ELSE each `group(s)` page → `authorship:`  IF non-blank ➔ USE it, STOP.
       IF the person is in SEVERAL groups and they disagree ➔ do NOT guess. Take the most
       restrictive (`agent-disclosed`) and flag the conflict to Luke in the reply.
    c. ELSE default ➔ `agent-disclosed`.
  INTERNAL content has no authorship — skip this step.

  The two resolved values are INDEPENDENT: a person may take tone from their group page but
  authorship from their own tone.md, or vice versa. Resolve each on its own merits.

STEP 4 — RETURN to the calling task:
  • the resolved tone source path(s) + which layer(s) matched
  • the resolved `authorship` value + which layer set it
  • IF authorship = `luke-voice` ➔ RETURN the staging requirement with it (see OUTPUT).
  !Tone does not draft, edit, or judge content; it only names where tone comes from and what
  authorship applies. The calling skill reads the named file(s) itself and applies them.

## ✅ OUTPUT
State: One or more tone sources named, in resolution order (person `tone.md` > group page > context
  `Tone/` folder > email baseline), PLUS the resolved `authorship` value and the layer that set it.
  The calling skill applies them; !Tone itself changes nothing.

Authorship contract returned to the caller:
  `agent-disclosed`  ➔ agent writes as itself; MUST close with the standard footer, verbatim:
                           ---- Drafted by Lukeatron on Luke's behalf ----
                       No prose disclosure sentence and no assistant sign-off block in addition —
                       the footer is the whole disclosure.
  `luke-voice`       ➔ first-person AS Luke; NO footer, NO disclosure, NO assistant sign-off,
                       no other tells. Draw voice from `Preferences/` / `Style Guide/`.
                       ⚠️ ALWAYS staged in `Outbox/` — NEVER auto-sent, whatever the trust tier.
                       This floor is not overridable per-person and !Tone must always report it.

Log: "[AGENT: !Tone] [SUCCESS] mode=<internal|person> resolved=<path(s)> authorship=<value>@<layer> | tokens≈[N]" → Logs/skills.log
Error: A resource in the chain is missing ➔ fall through to the next layer, flag the gap in the reply,
  never invent tone content. If `authorship` cannot be resolved for ANY reason ➔ return
  `agent-disclosed` (the safe default — never default to impersonating Luke).
