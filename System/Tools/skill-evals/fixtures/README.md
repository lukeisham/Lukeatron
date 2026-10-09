# skill-evals fixtures

A tiny FICTIONAL People / Groups / pastoral store used by the core-skill evals
(`.claude/skills/<skill>/evals/evals.json`). Every address ends in `.test`, a domain that can never
resolve, so a misbehaving eval cannot email a real person. Never copy anything here into
`Memory/Long-Term/`.

| ID   | Name          | interaction_tier | groups        | tone.md authorship |
|------|---------------|------------------|---------------|--------------------|
| GG01 | Gina Gold     | gold             | test-friends  | (blank)            |
| WW01 | Walt White    | white            | test-friends  | (blank)            |
| BB01 | Bea Black     | black            | —             | (blank)            |
| NN01 | Nora Nolist   | (absent)         | —             | (no tone.md)       |
| LV01 | Lena Voice    | gold             | test-friends  | luke-voice         |
| GV01 | Gus Varga     | white            | test-lukevoice| agent-disclosed    |
| MM01 | Max Mixed     | white            | test-lukevoice, test-friends | (blank) |

Group pages: `test-friends` → authorship agent-disclosed, warm/informal tone.
`test-lukevoice` → authorship luke-voice, formal tone.
`Pastoral/Pastoral_Notes.table.md` is a fake pastoral log for the seal evals.
