# AiCharacteristics — Decisions

## Approvals

What Luke has signed off. A draft and an approved document look identical on disk — this table is
the only difference. A decision that deliberately reverses an earlier one also goes here, so a
later agent does not "restore" the old behaviour.

| Date | Approved | Version / scope |
|---|---|---|
| 2026-09-29 | Promoted from `System/Widgets/Generator/AiCharacteristics/` to a standalone app, per Luke's direction in chat | — |
| 2026-10-02 | Refactor approved per `System/Plans/New/aicharacteristics-criteria-judge.md`: old 8 detectors retired; Wikipedia article → criteria → Simple English explainer → JEV check. **JEV** = a very cheap LLM-based judge (Haiku) that outputs only yes/no plus a confidence per criterion. The Scrape button re-scrapes on click; otherwise the data is static | — |
| 2026-10-02 | Three plan defaults approved: API key server-side only, outside the repo; verdict-only results with no span highlighting; leave the Generator shell and build a plain standalone page (this reverses the 2026-09-29 shell-cartridge design — do not restore it) | plan steps 3, 8, 10 |
| 2026-10-02 | **Special exception** to the Personal Research guardrail "no Wikipedia as a load-bearing source": this app scrapes the Wikipedia article on AI writing characteristics and builds its criteria from it. Scoped to this app only — it does not carry to other projects | plan step 2 |

## Rule exceptions

Deliberate breaks from `Memory/Long-Term/Coding/vibe-coding-rules.md`, each granted by Luke after
being asked with the rule ID and a reason. Code that matches a row here is intentional — do not
"fix" it.

| Rule ID | Where it applies | Reason | Granted |
|---|---|---|---|
| SR-5 | The Haiku API key used by the Scrape and Check routes | Stored as `System/Credentials/Home/anthropic-key`, read through Home's `CredStore`, not in a `.env`: it follows Home's existing git-ignored, owner-only secret pattern and, unlike a shell env var or `.env`, survives a launchd restart on both Macs with no new loader code. It is never in the repo or the browser | 2026-10-02 |
| API-5 / PY-12 | Home's `POST /api/aichar/scrape` writes this app's `data/` folder (the route is in Home; Home's `app-decisions.md` holds the same row) | The Scrape button must refresh `criteria.json`; signed-in, origin-checked, atomic, one at a time | 2026-10-02 |
