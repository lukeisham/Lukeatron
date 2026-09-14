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
| 5 | `Apps/ProjectKanban/_template/app/tokens.css` | SUBORDINATE | Spine only. No exception: Luke resolved the five-lane-hues question on 2026-09-12 in favour of the house two-accent cap — all five `--l-*` tokens resolve to `--ink-muted` by default |
| 5b | ~~`Apps/ProjectDashboard/.../shared/tokens.css`~~ | RETIRED | Retired 2026-09-12, replaced by #5 (`Apps/ProjectKanban/`). Archived to `Archive/ProjectDashboard-app-2026-09-12/` — kept here only as a historical register entry |
| 6 | `Widgets/CurriculumPreparation/refactor-registry.md` | SUBORDINATE | HTML edit surface governed; the pure-SVG print plane keeps geometry. **This widget has no README** — the registry is the anchor |
| 7 | `!Dashboard` | UNCLASSIFIED | Renders via `show_widget`; no contract of its own |
| 8 | `!GenerateWiki` | **EXEMPT** | Defers wholly to `wiki-page.css`, whose provenance inks encode whose words these are — a semantic no other surface has |
| 9 | `!IdeaWiki` | UNCLASSIFIED | Node rendering; no contract of its own |
| 9b | ~~`Tools/project-dashboard/serve.py`~~ | RETIRED | Retired 2026-09-09, replaced by #5 (`Apps/ProjectDashboard/`). Archived to `Archive/ProjectDashboard-tool-2026-09/` — kept here only as a historical register entry |
| 9c | ~~`Tools/lukeatronwiki-viewer/serve.py`~~ | RETIRED | Retired 2026-09-12, replaced by #9d (`Apps/LukeatronWiki/`). Archived to `Archive/lukeatronwiki-viewer-tool-2026-09/` — kept here only as a historical register entry |
| 9d | `Apps/LukeatronWiki/static/app.css` | SUBORDINATE | Chassis keeps layout; house style takes tokens, motion, glyphs. Standard mechanism (`:root` light default, `prefers-color-scheme`/`data-theme` dark override) — the 9c migration note is resolved. Ink-legend swatches reuse `wiki-page.css`'s own `.key-swatch` classes rather than redefining the ink tokens |
| 10 | `!SkillDocs` | UNCLASSIFIED | Generates an HTML doc site per skill |
| 11 | `!teach` | UNCLASSIFIED | Self-contained HTML lessons from `./assets/` |
| 12 | `!BookCover` | UNCLASSIFIED | Renders cover imagery into wiki nodes |
| — | `!SvgImage` | **EXEMPT** | A 24-style illustration library. This skill governs UI marks, not illustration |
| — | Any outgoing person-directed content | **OUT OF SCOPE** | `!Tone` governs the z-axis |

Fourteen caller surfaces, plus two standing exemptions and the `!Tone` floor.
