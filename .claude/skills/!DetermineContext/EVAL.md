---
type: Eval
status: Active
domain: Orchestration
intent: "Ensure !DetermineContext selects exactly one primary context from the Quick Decision Guide, loads that context (unless --dry), names secondaries, and never halts a direct prompt on low confidence."
---

## 🎯 OBJECTIVE
Each invocation selects exactly one PRIMARY context drawn from the five canonical contexts, loads its readme + relevant Memory (unless --dry), names any SECONDARY contexts without loading them, and records a confidence. Low-confidence direct prompts proceed as a flagged best-guess; only unclassifiable Inbox/ material is left in place.

## 📏 STANDARDS
* **Standard 1:** Output names exactly one PRIMARY ∈ {Church, Teaching, Personal Research, Lukeatron, Personal Productivity}.
* **Standard 2:** The selection traces to the Quick Decision Guide on the PRIMARY goal, not an incidental mention.
* **Standard 3:** Unless --dry, the matching System/Context/<context>.md is loaded; secondary-context readmes are NOT loaded, only named.
* **Standard 4:** Confidence is recorded as high or low; a low-confidence direct prompt PROCEEDS with a redirect invitation (never halts).
* **Standard 5:** Inbox/ material that won't classify is left in Inbox/ and flagged — not force-guessed.
* **Standard 6:** A missing context readme degrades to the Quick Decision Guide with the gap flagged; the readme's content is never invented.
* **Standard 7:** Coding / amateur builds route to Personal Research; work on Lukeatron itself routes to Lukeatron (CLAUDE.md Quick Decision Guide).
* **Standard L:** A low-confidence, degraded, or left-in-Inbox call writes one line to Memory/Long-Term/Logs/skills.log; a routine high-confidence call writes nothing.

## 🔎 VERIFICATION LOGIC
0. **SCENARIOS:** Run the cases in `evals/evals.json` (skill-creator schema) with `--dry`.
1. **LOOK:** For a noteworthy call, run `python3 System/Tools/skilllog/skilllog.py recent --skill '!DetermineContext'`.
2. **MATCH:** `primary=<one of the five contexts>`; `secondary=[…]` lists only named (unloaded) contexts.
3. **ASSERT:** when not --dry, the chosen readme was read; secondary readmes were not.
4. **ASSERT:** `confidence` ∈ {high, low}; if low and the source was a direct prompt, the task proceeded.

## ❌ FAILURE PROTOCOL
- **Immediate:** Trigger `!Diagnose`.
- **System:** Write to `Emergency.log`.
- **User:** "Report MULTI_PRIMARY, SILENT_HALT, or INVENTED_CONTEXT to Luke."
