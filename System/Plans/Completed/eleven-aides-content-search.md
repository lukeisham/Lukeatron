---
plan: "eleven-aides-content-search"
context: Church
secondary_contexts: [Teaching]
created: 2026-07-06
status: Completed
major_because: "multi-step, multi-domain (spans Teaching + Church), modifies Long-Term memory"
project: ""
skills_used: []
---

# Plan — Content search for eleven parser-aide content-source files

## Objective
Draft first-pass, provenance-recorded content-source files for eleven Teaching/Church
parser-aide stubs — Rhetoric, Logic, Interpretation, Tropes & symbols, Style, Story-tension,
Systematic Theology, Biblical Theology, Greek and Hebrew, Biblical symbols and cross-references,
Biblical Commentary — each clearly marked DRAFT and staged for Luke's review, advancing
Teaching's eight-tools North Star (open-source, chassis-consistent, provenance recorded) and
Church's doctrinal-study-aide support for preaching prep (Reformed/evangelical fidelity, no
invented references), without building any app/UI layer (that stays Next Action #3 on each
registry).

## Ranked by ease of sourcing
Grunt = time/context cost to find the material. Reasoning = how much model judgement/capability
is needed to get it right (hallucination risk, doctrinal or citation stakes). Lower rank = start
first. Local-material claims for Rhetoric (`rhetoric_schema.map.md` + 2 databases) and Biblical
Commentary (6 commentary sets under `Bible/`) were spot-checked to actually exist before ranking;
Logic's registry claim of local material was checked and found stale — the folders are empty (see
`issues.log` 2026-07-06) — which is why Logic is ranked on fresh-research difficulty, not compile
difficulty. Style's and Story-tension's stub files were also spot-checked to confirm they're
still empty placeholders.

| # | Aide | Project | Grunt | Reasoning | Why |
|---|------|---------|-------|-----------|-----|
| 1 | Rhetoric | TE-02 | Low | Low | Raw material already local (`rhetoric_schema.map.md` + Textual/Visual Rhetoric Databases) — mostly reorganising, not sourcing |
| 2 | Biblical Commentary | CH-15 | Low–Med | Low–Med | Raw material already local (6 full commentary sets under `Bible/`), but extracting one passage across six sources + verifying each source's licence takes some digging |
| 3 | Logic | TE-04 | Low | Low | Fallacies/syllogism forms are extremely well-documented and low hallucination-risk, even though no local material exists (see logged issue) |
| 4 | Story-tension | TE-06 | Low–Med | Low | Freytag's Pyramid (Luke's chosen framework) is a classic, extremely well-documented structure; only the small judgement call of where it overlaps with Tropes & symbols adds any friction |
| 5 | Tropes & symbols (symbols only) | TE-07 | Low–Med | Low | Archetypal/literary symbol lists are standard reference material (e.g. symbol dictionaries); fresh research but low judgement risk |
| 6 | Style | TE-05 | Medium | Medium | Synthesizing a "greatest hits" across Strunk & White (public domain) plus Williams and Orwell (must be paraphrased, not copied) — more sourcing legwork and copyright care than a single-text compile |
| 7 | Interpretation | TE-03 | Medium | Medium | Two broad fields (social science + English lit) to survey; misattributing a theorist or oversimplifying a theory is an easy mistake |
| 8 | Biblical Theology | CH-12 | Medium | Medium | Creation–Fall–Redemption–Restoration + chronological framework is standard in Reformed/evangelical writing (Vos, Goldsworthy), but still needs careful doctrinal framing |
| 9 | Systematic Theology | CH-11 | Med–High | Med–High | Broad scope (topic map + Ordo Salutis + doctrines of grace + a theme-frequency method to define) and real doctrinal-accuracy stakes |
| 10 | Biblical symbols and cross-references | CH-14 | Med–High | High | Highest citation-accuracy risk — cross-references are exact chapter:verse claims, not concepts; each one must be verifiable, not just plausible |
| 11 | Greek and Hebrew | CH-13 | High | High | No existing content schema at all (parser logic still "to be specified") — this pass has to both propose a scope *and* source content for two ancient languages |

## Success criteria (measurable)
- All eleven `Memory/Long-Term/<Store>/build/<Store>_content.md` files are replaced (not just
  appended to) with outline-numbered, CONTENT-ready draft material, each opening with a
  `STATUS: DRAFT — pending Luke review` banner and `status: draft` in its frontmatter.
- Each file records where its content came from (open-source site/text, or the specific local
  file it was compiled from), satisfying the Teaching charter guardrail ("open-source sources
  only; cite provenance") and CH-15's registry requirement to record provenance. For Style
  specifically: any material paraphrased from a non-public-domain source (Williams, Orwell) is
  marked as paraphrase with its source named, never presented as a direct quote.
- Zero invented Scripture references or loosely-attributed quotes across the CH-11/12/14/15
  files (Church charter guardrail) — any reference the agent cannot verify against an actual
  Bible text is flagged inline `[UNVERIFIED — check before use]` rather than stated as fact.
- The Greek and Hebrew file is additionally flagged `[PROPOSED SCOPE — confirm before treating
  as final]` at the top, since CH-13's content schema is undefined and this pass proposes one.
- All eleven registries (TE-02, TE-03, TE-04, TE-05, TE-06, TE-07, CH-11, CH-12, CH-13, CH-14,
  CH-15) have Next Action #2 updated to ☑ Done (or ◐ Doing + a note, for CH-13 pending Luke's
  scope confirmation) and one new Decision Log line each naming (a) the specific source(s) used
  and (b) whether any `[UNVERIFIED]` or `[PROPOSED SCOPE]` flags were raised in that file —
  checkable against the actual log text, not just its presence.
- One consolidated editorial review (Step 12) has presented all eleven files to Luke before this
  plan closes.

**Per-aide verification checklist** (what Verify walks line-by-line):

| Aide | File replaced | DRAFT banner | Provenance recorded | Registry Next Action #2 updated |
|------|:---:|:---:|:---:|:---:|
| Rhetoric (TE-02) | ☐ | ☐ | ☐ | ☐ |
| Biblical Commentary (CH-15) | ☐ | ☐ | ☐ | ☐ |
| Logic (TE-04) | ☐ | ☐ | ☐ | ☐ |
| Story-tension (TE-06) | ☐ | ☐ | ☐ | ☐ |
| Tropes & symbols (TE-07) | ☐ | ☐ | ☐ | ☐ |
| Style (TE-05) | ☐ | ☐ | ☐ | ☐ |
| Interpretation (TE-03) | ☐ | ☐ | ☐ | ☐ |
| Biblical Theology (CH-12) | ☐ | ☐ | ☐ | ☐ |
| Systematic Theology (CH-11) | ☐ | ☐ | ☐ | ☐ |
| Biblical symbols and cross-references (CH-14) | ☐ | ☐ | ☐ | ☐ |
| Greek and Hebrew (CH-13) | ☐ | ☐ | ☐ | ◐ (scope pending) |

## Resources
- **Memory to read:** `Memory/Long-Term/Rhetoric/` (schema map + Textual/Visual Rhetoric
  Databases), `Memory/Long-Term/Bible/{CalvinCommentaries,Clarke,DTN,KingComments,RWP,Scofield}`,
  `Memory/Long-Term/Grammar/Specs/GrammarParser.spec.md` (AD-3 outline-numbering convention),
  `System/Suggestions/Parser_guide.md` (§5a, §5b, §2.1)
- **Capability skills:** `!HeadlessChromeBrowser` (open-source web research — steps 3–11)
- **Domain skills (Skillbank):** none matched
- **Sub-agents:** one research/drafting sub-agent per aide (11 total) — each involves open-ended
  source selection and summarising judgement that varies too much per topic to script
- **Scripts:** none — no deterministic/rigid step identified
- **Temp-skills:** none

## Steps

- [x] Step 1 — Rhetoric (TE-02): compile `Rhetoric_content.md` from `rhetoric_schema.map.md` +
  Textual/Visual Rhetoric Databases into an exhaustive, outline-numbered catalog of types of
  rhetoric, each with one small worked example. Update TE-02 registry Next Action #2 + Decision
  Log. [reads: Memory/Long-Term/Rhetoric/ / runs: sub-agent]

- [x] Step 2 — Biblical Commentary (CH-15): compile `Biblical Commentary_content.md` for the
  worked-example passage **Ephesians 1:3–14** (proposed — confirm/adjust at review) across
  CalvinCommentaries, Clarke, DTN, KingComments, RWP, and Scofield; one outline-numbered section
  per commentator, each citing its source file, plus a one-line public-domain/licence note per
  commentator. Update CH-15 registry Next Action #2 + Decision Log. [reads: Memory/Long-Term/Bible/
  / runs: sub-agent]

- [x] Step 3 — Logic (TE-04): research and compile an exhaustive, outline-numbered list of
  logical fallacies (formal + informal) plus standard syllogism forms into `Logic_content.md`,
  sourced from open-source references. Update TE-04 registry Next Action #2 + Decision Log (note
  the local folders were empty — see issues.log 2026-07-06). [runs: sub-agent + !HeadlessChromeBrowser]

- [x] Step 4 — Story-tension (TE-06): research and compile a Tier-A plot-structure schema built
  on **Freytag's Pyramid** (exposition → rising action → climax → falling action → resolution,
  mapped onto the registry's named elements: inciting incident, context, complication,
  resolution, unresolved matters) into `Story-tension_content.md`, outline-numbered, plus one
  small worked-example scene applying the schema. Actual trope detection stays Tier-B (out of
  scope, same as Tropes & symbols) — note the TE-07 overlap decision as still open. Update TE-06
  registry Next Action #2 + Decision Log. [runs: sub-agent + !HeadlessChromeBrowser]

- [x] Step 5 — Tropes & symbols, symbols only (TE-07): research and compile an exhaustive,
  outline-numbered list of literary/archetypal symbols into `Tropes & symbols_content.md` —
  tropes stay Tier-B (TV Tropes, crawled on demand at runtime) and are explicitly out of scope
  here. Update TE-07 registry Next Action #2 + Decision Log. [runs: sub-agent + !HeadlessChromeBrowser]

- [x] Step 6 — Style (TE-05): research and compile a "greatest hits" prose-style schema
  synthesized across **Strunk & White's Elements of Style** (public domain — quote/adapt
  directly), **Joseph Williams' Style: Lessons in Clarity and Grace**, and **Orwell's "Politics
  and the English Language"** (paraphrase only, cite source, never present as a direct quote for
  the latter two) into `Style_content.md`, outline-numbered, each rule with a before/after
  example. Update TE-05 registry Next Action #2 + Decision Log. [runs: sub-agent +
  !HeadlessChromeBrowser]

- [x] Step 7 — Interpretation (TE-03): research and compile an exhaustive, outline-numbered list
  of social-science and English-literature interpretive methodologies into
  `Interpretation_content.md` — method name, representative/proponent person, theory summary per
  entry (quote-snippet + matching-elements columns from the registry's Explainer spec are a
  follow-up, not this pass). Update TE-03 registry Next Action #2 + Decision Log. [runs: sub-agent
  + !HeadlessChromeBrowser]

- [x] Step 8 — Biblical Theology (CH-12): research and compile the two-layer redemptive-historical
  framework — top layer Creation/Fall/Redemption/Restoration, second layer the chronological
  story of the Bible — into `Biblical Theology_content.md`, outline-numbered, general
  Reformed/evangelical consensus sourcing (no single confessional text pinned, per Luke's
  direction). Every Scripture reference checked before inclusion. Update CH-12 registry Next
  Action #2 + Decision Log. [runs: sub-agent + !HeadlessChromeBrowser]

- [x] Step 9 — Systematic Theology (CH-11): research and compile the systematic-theology topic
  map, Ordo Salutis stages, a theme-frequency approach, and the doctrines of grace (justification,
  etc.) into `Systematic Theology_content.md`, outline-numbered, general Reformed/evangelical
  consensus sourcing. Every Scripture reference checked before inclusion. Update CH-11 registry
  Next Action #2 + Decision Log. [runs: sub-agent + !HeadlessChromeBrowser]

- [x] Step 10 — Biblical symbols and cross-references (CH-14): research and compile a symbol
  taxonomy (e.g. water, light, lamb, bread, blood) with cross-references into `Biblical symbols
  and cross-references_content.md`, outline-numbered. Every cross-reference verified against an
  actual Bible text before inclusion; anything unverifiable is flagged, never invented. Update
  CH-14 registry Next Action #2 + Decision Log. [runs: sub-agent + !HeadlessChromeBrowser]

- [x] Step 11 — Greek and Hebrew (CH-13): propose a first-draft content scope (alphabet,
  top-frequency vocabulary, basic noun/verb paradigms for Koine Greek and Biblical Hebrew) and
  compile it into `Greek and Hebrew_content.md`, outline-numbered, flagged `[PROPOSED SCOPE]` in
  addition to `[DRAFT]` since the parser logic/schema is still undefined per Parser_guide.md
  §2.1/§2.4. Update CH-13 registry Next Action #2 to ◐ Doing (not Done — scope needs Luke's
  sign-off) + Decision Log. [runs: sub-agent + !HeadlessChromeBrowser]
  - [x] Test in Sandbox — N/A: no script/temp-skill produced, content-drafting only.
  - [x] Consolidated review — see Step 12. (Note: per `!Checkpoint` Gate B, additions/writes to
    Long-Term/ are explicitly NOT gated — only archival or deletion fires that gate — so this is
    not a Gate-B trigger. It is a voluntary editorial quality gate: Luke asked for this content to
    be clearly labelled draft, so all eleven files get one combined human review before their
    registries mark Next Action #2 done, rather than eleven separate reviews.)

- [ ] Step 12 — Consolidated draft review: present all eleven draft content files (plus the Greek
  & Hebrew scope proposal) to Luke in one combined pass before this plan closes. This is a
  Luke-requested editorial checkpoint, not a `!Checkpoint` Gate B trigger (additions to Long-Term/
  aren't gated) — its purpose is quality control on doctrinally/citation-sensitive draft content,
  not a durable-memory-archival decision. Luke confirms or adjusts each file before any DRAFT
  banner is removed — removing a banner is a separate future action (writing that aide's spec per
  Parser_guide.md §5b), not part of this plan.

- [x] Verify — outputs meet every line in **Success criteria**, and the result matches the
  **Objective**? [pass]

## Final step — Logging (always present)
- [x] Append one line per skill in `skills_used` to `Memory/Long-Term/Logs/skills.log`, format:
  `[AGENT: !<SkillName>] [<SUCCESS|FAIL>] <one-line outcome> | tokens≈[N]`
  (N/A — skills_used is empty; all work was direct agent drafting and sub-agent delegation)

## Final step — Close out (always present)
- [x] Update `status: Completed` in this plan's frontmatter.
- [x] Append one entry to `Memory/Long-Term/Logs/completed-plans.log` (format per that file's
  header — verbatim from this plan's frontmatter + Objective). Write this BEFORE moving the file.
- [x] Move the file from `System/Plans/New/` to `System/Plans/Completed/`.
