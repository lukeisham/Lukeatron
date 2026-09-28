---
title: "!StoryRibbon — skill outline (drive the Storytelling app's agent levers)"
type: suggestion
status: proposed — not built (the app does not exist yet)
date: 2026-09-21
context: Teaching
related: [TE-12, System/Sandbox/Storytelling/_specs/agent-api.spec.md, "!AppDevelopment"]
build_when: Phase 4 of the Storytelling build, once the app is at System/Apps/Storytelling/ and its levers pass agent-api AC-A1–A6
placement: System/Skillbank/Teaching/!StoryRibbon/skill.md (+ a one-line entry in System/Skillbank/_index.yaml)
---

# !StoryRibbon — outline

## Verdict (the prime gate)
**Skill — for the procedure only.** Reaching the app, finding the levers, opening a session safely, checking, saving and
reporting is the same every time (deterministic, repeated). *Which elements tell a given story* is judgement and stays with
the agent; the skill does not script it. The skill's body says so, so it never turns into a template of "right" answers.

**Placement: Skillbank (Teaching).** It is tied to one Teaching tool. If it is ever wanted across contexts, promote it.

## ⚡ TRIGGER
Primary: `!StoryRibbon`
Secondary: "use the Story app to build a ribbon of …", "make a story map of …", "build a ribbon for <work or theme>",
"put <film/book> into the Storytelling app".

## 🛠️ LOGIC
```
0  GATE      app built? (System/Apps/Storytelling/ exists)  no → stop, say it is still in Sandbox
             app running? no → run Start Storytelling.command (fixed port), wait for it
1  BROWSER   open http://127.0.0.1:<port> in the built-in browser (default) or Claude in Chrome if Luke asks
             NOTE: saves land in that browser's own storage, not necessarily Luke's usual one → say which in the report
2  DISCOVER  call storytellingAgent.help(); if absent → stop and report (app version too old)
3  ASK       only what the request lacks: the subject; lead work; size (default 4–10 beads); tandem/rogue allowed?
4  READ      categories(); elements({query}) for each beat; libraryEntry() of the closest narrative type as a reference
5  SESSION   begin()   → map-not-empty ⇒ ASK Luke; never force:true without his explicit yes
6  PLAN      (judgement) beats → element ids; verify each with element(id); rogue ONLY where nothing fits;
             tandem ONLY for two elements used together; one note per bead (≤80 chars, a fact about the work, no plot summary)
7  BUILD     add / branch / insert / link / pair / addRogue / setNote via the levers; story() after every few steps
8  CHECK     check() → fix each warning or report it; screenshot the surface to confirm it looks right
9  SAVE      setName; save({name: "<subject> (agent)"}) ; end()
10 REPORT    !PlainEnglish four-part shape: story text (text()), the non-obvious choices and why, any rogue used and why,
             warnings left, which browser it was saved in
```
**Guards:** never invent an element id; never `force` a session; never try to replace a story an agent did not make; on the
same lever error twice → stop and report; do not print (a person's gesture); stay within what Luke asked.

## ✅ OUTPUT
State: a story saved with `agent: true`, `check()` clean or its warnings reported, the story text and reasoning returned.
Validation: `storytellingAgent.story()` bead count matches the report; `save` returned `ok`.
Log: `[AGENT: !StoryRibbon] [SUCCESS] beads=<n> rogue=<n> tandem=<n> saved=<yes|no>` → Logs/skills.log

## Open points for Luke (defaults in brackets)
- Which browser saves to: the built-in pane, or Claude in Chrome so the story appears in his own saved list? [built-in; say so in the report]
- Subject-specific tone or teaching level for notes? [plain, factual, as the library notes]
- Should the skill also write the story's text to a Lukeatron file (e.g. Scratch/) so it survives a browser clear? [no]

## Test
The same manual trial as `agent-api.spec` AC-A7: "build a ribbon of a mystery story with a tandem and a rogue element"
must succeed on the first attempt using only this skill and the page.
