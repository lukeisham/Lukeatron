# Build-run preparation archive — 2026-08-29

Working documents from the multi-agent build of the CurriculumPreparation widget. Archived on
completion; kept because they record HOW decisions were reached, not just what was decided.

| Folder / file | What it is |
|---|---|
| `research/` | Pre-build digests the agents worked from — data model (44 INV-DM-* invariants), architecture (51 AD-*), style/mockup geometry, and the house-rules checklist. `_INTERFACES.md` records the AS-BUILT export signatures, which diverged from the plans in one place (`computeGlyphSet`). `_BRIEF.md` / `_BUILDER.md` / `_AUDIT.md` / `_REPAIR.md` are the standing instructions each fleet was given. |
| `audit/` | The 20 per-build spec-vs-code audits. Note two known blind spots, both documented in the closeout: `arbor-tree` was marked "PASS (clean)" while its tests could not fail, and no audit swept the tree as a whole (three `!important` breaches sat across three builds, each invisible to a single-build audit). |
| `REVIEW-A.md` | Independent closeout review — does the widget deliver the six promised parts? Found the app did not run at all. |
| `REVIEW-B.md` | Independent closeout review — code soundness and house-standard compliance. Found the polluted `unit.json` skeleton and the sham `arbor-tree` tests. |

**Both reviews predate the final repair pass**; their headline findings were fixed afterwards. For the
current position see [`../../_closeout/CLOSEOUT.md`](../../_closeout/CLOSEOUT.md), which is the
authoritative record.
