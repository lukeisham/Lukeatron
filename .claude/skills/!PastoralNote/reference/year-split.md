# !PastoralNote — new-year split of the pastoral log (step 1b)

> Reference file for `!PastoralNote`. Moved verbatim out of the skill file on 2026-10-09 (progressive disclosure). The skill file says WHEN to read it. Nothing here overrides a rule in the skill file.

```
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
  LOG → python3 System/Tools/skilllog/skilllog.py write '!PastoralNote' SUCCESS "split {OLDYEAR}→{YEAR} rows:{n} verified"
  RETURN NEWFILE
```
