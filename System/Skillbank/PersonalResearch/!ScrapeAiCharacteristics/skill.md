---
name: "!ScrapeAiCharacteristics"
description: "Refresh the AiCharacteristics app's criteria from the Wikipedia article on signs of AI writing. Fetches the article, has a cheap DeepSeek model extract the signs that show in a text's words and punctuation (never layout, never anything about Wikipedia itself), merges them into the saved criteria with stable ids, writes a Simple English explanation for each new or changed one, and saves data/criteria.json atomically. Run by the app's Scrape button (through Home) or from the command line. Never edits a locked criterion; criteria that leave the article are retired, never deleted."
type: Skill
status: Active
core_function: Generate
intent: "Keep the AiCharacteristics criteria current with the article, changing as little as possible, so the app's explainer and its JEV check never drift from their source."
version: 1.0.0
dependencies:
  - run.py
  - aichar_scrape/
  - ../../../Apps/AiCharacteristics/criteria/
calibration:
  context: [PersonalResearch]
  level: Brief
  scope: Local
memory_footprint:
  read: [System/Apps/AiCharacteristics/data, System/Credentials/Home]
  write: [System/Apps/AiCharacteristics/data]
---

## ⚡ TRIGGER
Primary: `!ScrapeAiCharacteristics`
Fires when: Luke asks to "scrape the AI characteristics", "refresh the AI writing criteria", "update the
AiCharacteristics criteria from Wikipedia", or presses **Scrape** on the app's "The criteria, explained" tab
(Home's `POST /api/aichar/scrape` runs this same code).
Not this skill: checking a text against the criteria — that is the app's JEV judge, a separate call.

## 🛠️ LOGIC

// EXECUTION_START

**STEP 0 — Preconditions**
  ASSERT `System/Credentials/Home/deepseek-key` exists and is non-empty ELSE stop and tell Luke it is missing
    (he places it himself; the agent never sees or writes a key).
  ASSERT Luke has asked for a live run. The Scrape fetches Wikipedia and calls DeepSeek, so it never runs
    unattended.

**STEP 1 — Run**
  RUN `python3 System/Skillbank/PersonalResearch/!ScrapeAiCharacteristics/run.py`
  The code does, in order, and changes nothing unless all of it succeeds:
    fetch the article as plain text → extract proposed criteria (DeepSeek) → drop any that name Wikipedia →
    merge into the saved list by id → explain only the new or changed ones in Simple English (DeepSeek) →
    write `criteria.previous.json`, `source/article.txt`, then `criteria.json`.

**STEP 2 — Scope (enforced in `aichar_scrape/extract.py`, restated here so a change is deliberate)**
  KEEP signs visible in the words and punctuation of a pasted passage of plain prose: how the subject is
    framed, wording, grammar, sentence patterns, punctuation, emoji, chat-style leftovers.
  ALWAYS EXCLUDE layout (headings, bold, lists, tables), markup, citations, links, edit history, and anything
    about Wikipedia itself. EXCLUDE the article's "ineffective", "human writing" and "historical" sections.
  Changing this scope is Luke's decision, recorded in the app's `app-decisions.md`.

**STEP 3 — Report**
  REPORT the summary in plain words: how many criteria, what is new, reworded, retired. READ `criteria.json`
    and name each new or reworded criterion so Luke can judge it.
  IF any criterion's explanation was flagged too hard to read ➔ name it.
  NEVER edit a `locked` criterion, delete a retired one, or hand-edit `criteria.json` to "fix" a result;
    re-run, or ask Luke.

**STEP 4 — Failure**
  IF the run exits non-zero ➔ relay the stderr message. Nothing was changed. Do not retry in a loop.

// EXECUTION_END

## ✅ OUTPUT
`System/Apps/AiCharacteristics/data/criteria.json` refreshed (or untouched, with the reason), plus the plain-
words summary above.

**Validation Check (Self-Test)**
```
VERIFY criteria.json parses and every criterion has id, title, description, question, plain, status, locked
VERIFY no criterion or description mentions Wikipedia, and none is about layout
VERIFY a second run on an unchanged article reports no new, changed or retired criteria
ELSE ➔ report the gap to Luke; do not edit the file by hand
```

**Error Path**
```
CATCH key-missing       ➔ tell Luke which file to create; stop.
CATCH fetch-or-model    ➔ relay the message; saved files are untouched.
CATCH empty-extraction  ➔ refused by design (it would retire everything); report and stop.
CATCH [*]               ➔ report, hold.
```
