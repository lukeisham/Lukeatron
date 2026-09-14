---
name: "!PastoralNote"
description: >
  Capture a dated pastoral note to the single BPC pastoral log
  (Memory/Long-Term/BalaclavaPC/Pastoral_Notes.table.md) — the one canonical record of Luke's
  pastoral contact as minister of Balaclava Presbyterian Church. Resolves each named person to
  their People/ record (or asks Luke before creating one), inserts the row at the top of the log
  as a targeted single-line insert, and routes any follow-up action out to a project (offered to
  Luke) so the log records what happened while the project tracks what is owed. Enforces the pastoral seal: nothing
  from this log is ever reproduced outward. Triggers: "pastoral note", "log a pastoral note",
  "note this for the pastoral log", "record this visit/call", "I visited", "I called <person>",
  "spoke with <congregant>", or any account of pastoral contact Luke relays for the record.
type: Skill
status: Active
core_function: Receive
intent: "Give every pastoral contact one canonical, correctly-linked, sealed home, captured the same way every time."
version: 1.2.0
dependencies: []
calibration:
  context: Church
  level: Brief
  scope: Local
memory_footprint:
  read: [Memory/Long-Term/BalaclavaPC, Memory/Long-Term/People, Memory/Medium-Term/Contacts, Memory/Medium-Term/Projects]
  write: [Memory/Long-Term/BalaclavaPC, Memory/Long-Term/Logs]
---

## ⚡ TRIGGER
Primary: `!PastoralNote`
Secondary: Luke relays pastoral contact in any form — "log a pastoral note", "record this visit",
  "note this for the pastoral log", "I called/visited/met with <person>", "spoke with <congregant>",
  or an account of church-pastoral contact plainly given for the record.
Also: invoked by `!Intake` when arriving material is pastoral contact rather than a task or a fact.

LOG is the only mode. Reading the log back is an ordinary read — this skill does not summarise
outward, and never renders the log to any surface (see the SEAL below).

## 🛠️ LOGIC
```
// EXECUTION_START

STORE  = Memory/Long-Term/BalaclavaPC
ROUTER = {STORE}/Pastoral_Notes.table.md      // stable path — every existing pointer lands here
YEARDIR = {STORE}/Pastoral_Notes              // year files live here once the first split has run
YEAR   = the entry's year (from DATE, step 1)
TARGET = RESOLVE_YEAR_FILE(YEAR)              // see step 1b — this is where the row actually goes

// 0. THE SEAL — asserted before anything else, on every single invocation
ASSERT (destination == TARGET) ELSE HALT
  // Pastoral content is written to the resolved year file and NOWHERE else. It is never copied into
  // an email, a document, a wiki node, a !Review / !ProjectSweep digest, a Sandbox draft,
  // an Outbox item, a project registry, or a People/ record. Not summarised outward,
  // not paraphrased outward. Summaries TO LUKE are fine; anything leaving is a hard hold
  // for !Checkpoint, liftable only by Luke, per item, out loud.
  // This assertion is not overridable and is never relaxed for convenience.

ASSERT (ROUTER or YEARDIR readable) ELSE:
  REPORT "Pastoral log unreadable — nothing captured." ; FAIL CLOSED ; RETURN
  // Never write a pastoral note to a substitute location, and never hold it only in chat.

// 1. CAPTURE THE NOTE
DATE  = (date Luke states) OR today, format YYYY-MM-DD
NOTE  = the event, in Luke's own framing
  // Write it AS HE STATES IT. Do not editorialise, diagnose, moralise, soften, or infer motive.
  // Order of events, who said what, and what was decided are all load-bearing — keep them.
  // Where he gives sequence ("this was after visiting X"), keep the sequence.

// 1b. RESOLVE THE YEAR FILE — auto-split at each new year
//     Layout: before the first split there is ONE file at ROUTER holding every entry.
//     After the first split, ROUTER becomes a small router page (pointers + per-year row
//     counts) and every entry lives in {YEARDIR}/{YYYY}.table.md. ROUTER's PATH NEVER CHANGES,
//     so every pointer written elsewhere — People/ records, _index.yaml, CLAUDE.md — keeps
//     resolving after a split. That is the whole reason the router exists; do not remove it.

FUNCTION RESOLVE_YEAR_FILE(YEAR):

  IF EXISTS {YEARDIR}/{YEAR}.table.md:
    RETURN it                                   // ordinary case: this year's file already exists

  IF NOT EXISTS YEARDIR:                        // ---- FIRST-EVER SPLIT ----
    OLDYEAR = the newest year present in ROUTER's Log table
    IF YEAR == OLDYEAR: RETURN ROUTER           // still the same year — no split, nothing to do
    SPLIT_FROM = ROUTER
  ELSE:                                         // ---- SUBSEQUENT NEW YEAR ----
    SPLIT_FROM = the newest {YEARDIR}/{YYYY}.table.md
    IF YEAR == that file's year: RETURN it

  // ---- PERFORM THE SPLIT (never on a partially-written state; nothing else runs meanwhile) ----
  SNAPSHOT = byte-for-byte copy of SPLIT_FROM held in memory, plus its SHA-256 and row count
  HEADER   = everything in SNAPSHOT from the first line UP TO AND INCLUDING the Log table
             separator line "| :--- | :--- | :--- |"
             // i.e. frontmatter + title + the whole AI Instructions table + "## Log" +
             // the "*(most recent first)*" line + column header + separator. Taken VERBATIM,
             // as bytes. NEVER retyped, re-worded, re-wrapped, regenerated from memory, or
             // "improved" — copied. Retyping the instruction block is how the seal gets lost.
  ROWS     = every line in SNAPSHOT after that separator

  CREATE YEARDIR if absent

  IF SPLIT_FROM == ROUTER:                      // first split: move the existing year into YEARDIR
    WRITE {YEARDIR}/{OLDYEAR}.table.md = SNAPSHOT, byte-for-byte unchanged
  // (subsequent splits: the old year file is already in place — leave it completely untouched)

  NEWFILE = {YEARDIR}/{YEAR}.table.md
  WRITE NEWFILE = HEADER, with EXACTLY these edits and no others:
      - frontmatter title:     "Pastoral Notes {YEAR}"
      - frontmatter timestamp: DATE
      - frontmatter year:      {YEAR}            (added if absent)
      - frontmatter description: unchanged except the year named in it
      // confidentiality, capture_skill, topic, type: UNCHANGED. The AI Instructions table:
      // UNCHANGED, every row, in order. The Log table header + separator: UNCHANGED.
      // The new file starts with an empty Log table — no rows carried over.

  REWRITE ROUTER as the router page:
      - frontmatter: the SAME seal keys as the year files (confidentiality: pastoral-confidential,
        capture_skill, topic, type), title "Pastoral Notes — Index"
      - the FULL AI Instructions table, VERBATIM from HEADER — so the seal and the format rules
        are stated on the page every pointer lands on, not only in the year files
      - a "## Years" table: one row per year file — year, relative path, row count, date range
      - a line naming the current year's file as the live one

  // ---- THE DOUBLE-CHECK — split integrity. ALL of it must pass. ----
  VERIFY sha256({YEARDIR}/{OLDYEAR}.table.md) == sha256(SNAPSHOT)      // old year: byte-identical
  VERIFY row count of the old year file == SNAPSHOT row count          // no entry lost
  VERIFY every row string in SNAPSHOT present in the old year file     // no entry altered
  VERIFY NEWFILE's AI Instructions table == SNAPSHOT's, byte-for-byte  // instructions undamaged
  VERIFY NEWFILE frontmatter has confidentiality == "pastoral-confidential"
  VERIFY NEWFILE frontmatter has capture_skill == "!PastoralNote"
  VERIFY NEWFILE frontmatter parses as valid YAML and closes with "---"
  VERIFY NEWFILE contains "| Date | Note | Person / Place / File |" followed by
         "| :--- | :--- | :--- |"                                      // table shape intact
  VERIFY NEWFILE has ZERO data rows                                    // clean start, nothing bled
  VERIFY ROUTER's AI Instructions table == SNAPSHOT's, byte-for-byte   // seal restated intact
  VERIFY ROUTER lists every file present in YEARDIR                    // no year orphaned
  VERIFY sum(rows across all year files) == SNAPSHOT rows              // nothing lost in total

  IF ANY verification fails:
    ROLL BACK COMPLETELY — restore SPLIT_FROM from SNAPSHOT, delete anything this split created
    REPORT to Luke: which check failed, and that NO note was captured
    FAIL CLOSED ; RETURN                        // never limp on with a damaged log
    // The note is not written anywhere on a failed split. Losing one entry to a clean
    // rollback is recoverable; a silently damaged log is not.

  REPORT to Luke: "Pastoral log split for {YEAR}. {OLDYEAR} → {path} ({n} entries, verified
                   byte-identical). New year file created, instructions verified intact."
  LOG → skills.log: "[AGENT: !PastoralNote] [SPLIT] {OLDYEAR}→{YEAR} | rows:{n} | verified"
  RETURN NEWFILE

// 2. RESOLVE EVERY NAMED PERSON  → the Person / Place / File column
NAMES = every person named in NOTE
FOR EACH name IN NAMES:
  SEARCH Memory/Long-Term/People/ (folder names + frontmatter first_name/surname/nickname)
  IF found:
    EMIT "{Display Name} — [{ID} {Name}.md](../People/{ID}%20{Name}/{ID}%20{Name}.md)"
    // URL-encode spaces as %20. The ID (e.g. WD26) MUST appear in the cell — it is the
    // grep key that makes this log searchable per-person. Never a bare name where an ID exists.
  ELSE:
    SEARCH Memory/Medium-Term/Contacts/_index.yaml
    IF found: EMIT "{Name} — Contacts/{TC-ID} {Name}"
    ELSE:
      EMIT "{Name} — no file on record, not yet created (per instructions above)"
      ASK Luke, ONCE, at the end of the capture (not mid-flow, and never blocking the write):
        "{Name} now appears in N pastoral entries. Create a record? Permanent
         (Memory/Long-Term/People/) or temporary (Memory/Medium-Term/Contacts/)?"
      // NEVER assume which store, and NEVER create either one unasked. The note is
      // written either way — an unresolved name never blocks capture.
PLACES/FILES = named institutions (Bupa Windsor, Alfred Cancer), projects (CH-01), or documents
  APPEND to the same cell, semicolon-separated, linked where a record exists

// 3. INSERT — targeted, single-line, top of the log
ROW = "| {DATE} | {NOTE} | {PERSON_PLACE_FILE} |"
LOCATE the Log table header separator line ("| :--- | :--- | :--- |")
INSERT ROW as ONE new line immediately BELOW that separator
  // Most recent first. A targeted line-insert ONLY — never rewrite, re-emit, reflow or
  // re-sort the file. Each year file is append-only; the whole file is not rewritten to add
  // one row, and existing entries are never touched. (The ONE exception is the split in step 1b,
  // which is a verified, all-or-nothing operation — not an edit.)
  // Backdated entry (DATE older than the top row)? Still insert in date order, by locating
  // the correct line. Order is chronological; the insert stays surgical either way.

// 4. NEVER OVERWRITE
ASSERT (no existing row modified OR deleted) ELSE ROLL BACK, report, FAIL CLOSED
  // Durable record. A correction is a NEW dated entry that names what it corrects —
  // never an edit to the original. Removal is !ArchiveMemory's call, gated, never routine.

// 5. FOLLOW-UPS LEAVE THE LOG
IF NOTE implies an action still owed (an overdue appointment, a call to return, a form to file,
   a referral to chase, a person to contact):
  SEARCH Memory/Medium-Term/Projects/ for the Active project that fits the action (e.g. a
    person-specific project like CH-01, else the closest Church project)
  REPORT the action to Luke IN CHAT as owed, naming that project (or "no project fits") and
    offering to add it there as a Next Action
    // This skill proposes, it does not write registries. (The MinorTasks queue it once
    // delegated to was retired 2026-09-14.)
    // Offer the ACTION ONLY — the minimum needed to do the thing. Never carry pastoral,
    // medical, or safeguarding detail into a registry. Registries are not sealed.
  APPEND to the log cell: " Follow-up owed → {project ID or 'reported to Luke'}."

// 6. SAFEGUARDING FLAG
IF NOTE concerns a minor's safety, an allegation, abuse, or a disclosure:
  CAPTURE it in full, verbatim, exactly as above — the record matters most here
  FLAG to Luke in the reply: "This entry is safeguarding-sensitive."
  DO NOT generate any outward action, advice, notification or draft off the back of it
  // Luke decides every outward step in a safeguarding matter, from his own instruction, always.

LOG one line → Memory/Long-Term/Logs/skills.log:
  "[AGENT: !PastoralNote] [SUCCESS] Logged {DATE} | refs:{IDs} | followup:{project ID, reported, or none}"
  // The log line carries IDs and the date ONLY — never the note text. skills.log is not sealed.

// EXECUTION_END
```

## ✅ OUTPUT
One new row at the top of the Log table in the entry's **year file** — `Pastoral_Notes.table.md`
until the first split, `Pastoral_Notes/{YYYY}.table.md` after it — dated, with every resolvable
person carrying their `People/` ID and link. On the first entry of a new year, the split runs
first: the closing year is moved into `Pastoral_Notes/`, a new year file is created carrying the
frontmatter seal and the AI Instructions block verbatim, and `Pastoral_Notes.table.md` becomes a
router page listing every year — so every pointer written elsewhere still resolves. Any action owed is
reported to Luke as owed, offered to its best-fit project, and named in the row. A short
confirmation to Luke: the date, who it was linked to, any follow-up reported and where it was offered, and a single
question about any unrecorded person. No other file is written, and nothing leaves the system.

**Validation Check (Self-Test)**
```
VERIFY (year-file row count == prior count + 1)          ELSE report failure, do not claim success
VERIFY (row landed in the file matching the entry's year) ELSE move it before confirming
VERIFY (if a split ran, every split check in 1b passed)   ELSE ROLL BACK, capture nothing
VERIFY (no pre-existing row changed or removed)          ELSE ROLL BACK, FAIL CLOSED
VERIFY (DATE matches YYYY-MM-DD)                         ELSE re-ask Luke, do not guess
VERIFY (every person in People/ appears with their ID)   ELSE re-resolve before writing
VERIFY (no pastoral content written outside TARGET)      ELSE HALT and report the breach
VERIFY (nothing staged to Outbox/, Sandbox/ or a digest) ELSE HALT and report the breach
```

**Error Path**
```
CATCH log file missing/unreadable  → report; capture NOTHING elsewhere; FAIL CLOSED
CATCH split verification failure   → ROLL BACK to the snapshot; capture NOTHING; FAIL CLOSED;
                                     name the failed check to Luke — never retry blind
CATCH YEARDIR not creatable        → do NOT fall back to appending a new year into the old
                                     year's file; report and FAIL CLOSED
CATCH People/ unreadable           → write the row with plain names; flag that links are unresolved
CATCH Projects/ unreadable         → write the row; report the follow-up to Luke IN CHAT as owed;
                                     never drop it silently, never leave it only in the log
CATCH ambiguous name (two matches) → ask Luke which person; do not guess an ID
CATCH [*]                          → report what failed; do NOT silently continue
                                     LOG "[AGENT: !PastoralNote] [FAIL] {error}" to skills.log
```
