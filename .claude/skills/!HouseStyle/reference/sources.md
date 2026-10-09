# Sources and surface register

## Part 1 — the consult set

Fourteen sites, approved by Luke 2026-09-07, recorded in
`Memory/Long-Term/Essential/Useful_Websites.table.md`. Each answers **one** question. Fetch via
`!HeadlessChromeBrowser` when that question is live — never browse the set generally.

| Site | The one question it answers |
|---|---|
| Tufte CSS | How do sidenotes, margin figures and measure actually get implemented? |
| Practical Typography | What is correct typographically — on screen **and** on paper? |
| GOV.UK Design System | What does ruthless functional restraint look like when it has been user-tested? |
| Laws of UX | What is the named principle behind this instinct? |
| Nielsen Norman Group | Is there evidence for this, or am I asserting taste? |
| ARIA Authoring Practices | What keyboard and state behaviour does this component owe the user? |
| WCAG 2.2 Quick Reference | What is the hard accessibility limit here — contrast, motion? |
| Inclusive Components | How is this component built so it works for everyone? |
| Motion (docs) | What duration and easing does this kind of movement want? |
| Easings Reference | Which curve is this, exactly? |
| Lucide Icons | What is the consistent-stroke glyph for this concept? |
| Phosphor Icons | How do I shift a glyph's emphasis without changing its shape? |
| Paged.js Documentation | How do page boxes, running heads and break control actually work? |
| MDN CSS Reference | What does this property really do before I invent around it? |

## Part 2 — the surface register

Every rendering surface in Lukeatron, classified per the three-state rule in `aesthetic.md`.
**This register is the authority** — a surface not listed here has not been classified, and an
unclassified surface defaults to UNCLASSIFIED (the house style governs whole).

| # | Surface | Verdict | Reason |
|---|---|---|---|
| 1 | `!AppDevelopment` | SUBORDINATE | Consult in Phases 2-4, **ahead of** the four audit skills |
| 2 | `!BuildParserCartridge` | SUBORDINATE | Builds onto the Parser chassis; inherits its verdict |
| 3 | `Parser/_shell/src/shell.css` + `StyleGuide/` | SUBORDINATE | Chassis keeps layout; house style takes tokens, motion, glyphs |
| 4 | `Generator/_shell/src/shell.css` + `StyleGuide/` | SUBORDINATE | **Byte-identical to 3 — synchronised, not free to diverge.** Any token change lands on both in the same pass |
| 5 | `Apps/ProjectDashboard/app/tokens.css` — the **Project Dashboard** app | SUBORDINATE | Spine only. No exception: Luke resolved the five-lane-hues question on 2026-09-12 in favour of the house two-accent cap — all five `--l-*` tokens resolve to `--ink-muted` by default |
| 5b | ~~earlier Project Dashboard app's `shared/tokens.css`~~ | RETIRED | Retired 2026-09-12, replaced by #5 (`Apps/ProjectDashboard/`). Archived to `Archive/ProjectDashboard-app-2026-09-12/` — kept here only as a historical register entry |
| 6 | `Widgets/CurriculumPreparation/refactor-registry.md` | SUBORDINATE | HTML edit surface governed; the pure-SVG print plane keeps geometry. **This widget has no README** — the registry is the anchor |
| 7 | ~~`!Dashboard`~~ | RETIRED | Retired 2026-09-14 — superseded by #5 (the live Project Dashboard board); its name collided with the "Dashboard" nomenclature Luke fixed on the app itself that day. Archived to `Archive/Dashboard-skill-2026-09-14/` — kept here only as a historical register entry |
| 8 | `!GenerateWiki` | **EXEMPT** | Defers wholly to `wiki-page.css`, whose provenance inks encode whose words these are — a semantic no other surface has |
| 9 | `!IdeaWiki` | UNCLASSIFIED | Node rendering; no contract of its own |
| 9b | ~~`Tools/project-dashboard/serve.py`~~ | RETIRED | Retired 2026-09-09, replaced by #5 (`Apps/ProjectDashboard/`). Archived to `Archive/ProjectDashboard-tool-2026-09/` — kept here only as a historical register entry |
| 9c | ~~`Tools/lukeatronwiki-viewer/serve.py`~~ | RETIRED | Retired 2026-09-12, replaced by #9d (`Apps/LukeatronWiki/`). Archived to `Archive/lukeatronwiki-viewer-tool-2026-09/` — kept here only as a historical register entry |
| 9d | `Apps/LukeatronWiki/static/app.css` | SUBORDINATE | Chassis keeps layout; house style takes tokens, motion, glyphs. Standard mechanism (`:root` light default, `prefers-color-scheme`/`data-theme` dark override) — the 9c migration note is resolved. Ink-legend swatches reuse `wiki-page.css`'s own `.key-swatch` classes rather than redefining the ink tokens |
| 10 | `!SkillDocs` | UNCLASSIFIED | Generates an HTML doc site per skill |
| 11 | `!teach` | UNCLASSIFIED | Self-contained HTML lessons from `./assets/` |
| 12 | `!BookCover` | UNCLASSIFIED | Renders cover imagery into wiki nodes |
| 13 | `!GrammarFrame` — `Memory/Long-Term/Grammar/Technical_Outline.html` + `Theatre.html` | SUBORDINATE | Registered 2026-09-26 (Luke). The skill's own contract keeps LAYOUT and STRUCTURE — shared skeleton, diagnostic blocks, box diagrams, interaction tables, reach strip (its `criteria.md` GROUPS A and D). House style takes colour, type, glyphs, focus and print. Offline single files (its A8): tokens are **inlined** from `tokens.css`, never linked. Colour contract: breadth shades in the NEUTRAL ground ladder, reach in the ONE accent, `--danger` for flags only — within the two-accent cap, no local excess. Theatre.html's theatre glyphs (its D6) sit within the two-glyph-weight budget |
| 14 | `Apps/Storytelling/app/css/variables.css` | **EXEMPT (palette only)** | Registered 2026-09-29 (Luke). Colours are sampled from the source poster (*The Periodic Table of Storytelling*, chart by ComputerSherpa via TV Tropes) rather than the house palette — a scoped exception Luke granted (PRD v0.7), so the app looks like the poster came alive. Spacing (4px grid), radii, the three-duration/three-easing motion budget, three elevation levels, and the reduced-motion floor all still follow the house default in full — see the app's own `StyleGuide.md` |
| 15 | `Apps/AiCharacteristics/web/` — `page.css`, `check.css`, `criteria.css`, `print.css` | UNCLASSIFIED | Registered 2026-10-02 (Luke). Left the Generator chassis (row 4) when rebuilt as a plain page, so no chassis keeps layout and the house style governs whole. Tokens are linked from Home's `/static/tokens.css`, not inlined, because Home serves the page. No local excess: one accent plus `--danger`, two elevation levels, no looping animation. Print degradation lives in `print.css` |
| — | `!SvgImage` | **EXEMPT** | A 24-style illustration library. This skill governs UI marks, not illustration |
| — | Any outgoing person-directed content | **OUT OF SCOPE** | `!Tone` governs the z-axis |

Seventeen caller surfaces, plus two standing exemptions and the `!Tone` floor.
