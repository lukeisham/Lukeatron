---
type: Eval
status: Active
domain: Orchestration
intent: "Ensure !DetermineContext selects exactly one primary context from the Quick Decision Guide, loads that context (unless --dry), names secondaries, and never halts a direct prompt on low confidence."
---

## 🎯 OBJECTIVE
Each invocation selects exactly one PRIMARY context drawn from the four canonical contexts, loads its readme + relevant Memory (unless --dry), names any SECONDARY contexts without loading them, and records a confidence. Low-confidence direct prompts proceed as a flagged best-guess; only unclassifiable Inbox/ material is left in place.

## 📏 STANDARDS
* **Standard 1:** Output names exactly one PRIMARY ∈ {Church, Teaching, Personal Research, Personal Productivity}.
* **Standard 2:** The selection traces to the Quick Decision Guide on the PRIMARY goal, not an incidental mention.
* **Standard 3:** Unless --dry, the matching System/Context/<context>.md is loaded; secondary-context readmes are NOT loaded, only named.
* **Standard 4:** Confidence is recorded as high or low; a low-confidence direct prompt PROCEEDS with a redirect invitation (never halts).
* **Standard 5:** Inbox/ material that won't classify is left in Inbox/ and flagged — not force-guessed.
* **Standard 6:** A missing context readme degrades to the Quick Decision Guide with the gap flagged; the readme's content is never invented.
* **Standard L:** A SUCCESS breadcrumb is written to Logs/skills.log on PASS.
* **Standard T:** The breadcrumb includes a `tokens≈N` field.

## 🔎 VERIFICATION LOGIC
1. **LOOK:** Open Logs/skills.log; read the last !DetermineContext line.
2. **MATCH:** `primary=<one of the four contexts>`; `secondary=[…]` lists only named (unloaded) contexts.
3. **ASSERT:** when not --dry, the chosen readme was read; secondary readmes were not.
4. **ASSERT:** `confidence` ∈ {high, low}; if low and the source was a direct prompt, the task proceeded.
5. **ASSERT:** breadcrumb contains `tokens≈`.

## ❌ FAILURE PROTOCOL
- **Immediate:** Trigger `!Diagnose`.
- **System:** Write to `Emergency.log`.
- **User:** "Report MULTI_PRIMARY, SILENT_HALT, or INVENTED_CONTEXT to Luke."
