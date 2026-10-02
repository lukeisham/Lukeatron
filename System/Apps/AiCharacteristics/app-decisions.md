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
| 2026-10-02 | The page carries **no** authorship disclaimer, and no caveat line under the results. This reverses the old app's "AI characteristics observed — not an authorship verdict" stance; do not restore it. The Scrape button appears only on the "The criteria, explained" tab | mockup v2 |
| 2026-10-02 | The **Retired criteria** category is locked in: a criterion that leaves the article is kept under "No longer in the article" on the criteria tab, is not used for checking, and is never deleted. Do not remove the category | mockup v2 feedback |
| 2026-10-02 | **Criteria scope:** only signs visible in the words and punctuation of a pasted text — content framing, wording and grammar, punctuation and emoji (em dashes, emoji, curly quotes), and chat-style leftovers. **Always excluded:** layout (headings, bold, lists, tables) and anything related to Wikipedia itself (notability, policies, editing, drafts, markup, citations). About 16 criteria from the current article | Luke, 2026-10-02 |
| 2026-10-02 | **The Scrape is a Skillbank skill**, `!ScrapeAiCharacteristics`, and uses a **DeepSeek** key (`deepseek-key`), not Haiku. The app's Scrape button still exists and runs the skill's code through Home. Check (JEV) is unchanged: it calls Haiku with `anthropic-key`, a choice still open for Luke (DeepSeek would send pasted text to DeepSeek) | Luke, 2026-10-02 |
| 2026-10-02 | `AI-writing-characteristics-reference.md` deleted (git history keeps it) | Luke, 2026-10-02 |
| 2026-10-02 | `!HouseStyle` register row 15 (the new page, UNCLASSIFIED) signed off | Luke, 2026-10-02 |
| 2026-10-02 | **Both buttons run Skillbank skills through headless Claude Code** (`claude -p` on Luke's own sign-in): **Scrape** → `!ScrapeAiCharacteristics`, **Check** → `!CheckAiCharacteristics`. No API key, no DeepSeek, no Haiku, no Python scrape. This **reverses** the DeepSeek/Haiku rows above; do not restore them. Scrape updates the criteria by reading the one Wikipedia article | Luke, 2026-10-02 |

## Rule exceptions

Deliberate breaks from `Memory/Long-Term/Coding/vibe-coding-rules.md`, each granted by Luke after
being asked with the rule ID and a reason. Code that matches a row here is intentional — do not
"fix" it.

| Rule ID | Where it applies | Reason | Granted |
|---|---|---|---|
| SR-5 | *(Moot, 2026-10-02: no API key file is used any more.)* | Both buttons use Claude Code's own sign-in, so nothing is stored in `System/Credentials/Home/` for this app | 2026-10-02 |
| API-5 / PY-12 | Home's `POST /api/aichar/scrape` runs a Claude Code session that writes this app's `data/` folder (the route is in Home; Home's `app-decisions.md` holds the same row) | The Scrape button must refresh `criteria.json`; signed-in, origin-checked, one at a time, and the run is allowed to write only `data/**` | 2026-10-02 |
