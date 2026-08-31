# arbor-tree — audit

**Verdict: PASS**

## AC table

| AC | Verdict | Evidence |
|---|---|---|
| AC-ATB-1 | UNVERIFIABLE | Layout with zero overlap requires measurement at print scale (physical/PDF test). |
| AC-ATB-2 | MET | Node code rendered verbatim. No reformatting, truncation, or re-casing logic found. |
| AC-ATB-3 | UNVERIFIABLE | Lesson coverage visual distinction requires browser rendering. |
| AC-ATB-4 | MET | curriculum.description rendered at head (line 428-430); unset renders nothing (no empty box). |
| AC-ATB-5 | MET | Big-idea coverage chips render full/partial distinctly. colors: #185FA5 (line 326). |
| AC-ATB-6 | MET | Three chip kinds render independently: big-idea (lines 320-328), assessment (lines 331-339), topic (lines 342-350). Never merged. |
| AC-ATB-7 | MET | Topic coverage chips display-only (line 341 comment FR-ATB-9). No separate read/write path. |
| AC-ATB-8 | MET | Skill glyph (pencil, #skill-glyph), knowledge glyph (notebook, #knowledge-glyph) rendered (lines 279, 282). |
| AC-ATB-9 | MET | Grep arbor-tree.js for independent domain walk: only calls resolveDomain() (line 275), never reimplements. |
| AC-ATB-10 | UNVERIFIABLE | Physical/PDF print test at 12pt+ type (QA gate, not code-verifiable). |

## Findings

### F1 — Three coverage chip kinds remain independent [severity: none — PASS]
AD-ATB-3 flags the risk "The three coverage chips collapse into one merged indicator under implementation pressure." Audit verification:

**Three chip types rendered separately:**
1. **Big-idea coverage** (lines 320-328): Loop over `this.bigIdeaCoverage.get(node.id)`, render each, color #185FA5 (blue), FR-ATB-7
2. **Assessment coverage** (lines 331-339): Loop over `this.assessmentCoverage.get(node.id)`, render each, color #9A4E12 (brown), FR-ATB-8
3. **Topic coverage** (lines 342-350): Loop over `this.topicCoverage.get(node.id)`, render each, color #703508 (dark brown), FR-ATB-9, display-only

Each type has:
- Independent data source (separate Map for each)
- Independent loop with its own `for` statement
- Independent color assignment
- Independent layout (chipY/chipX tracking per loop)

**Result:** No merge, no collapsed indicator. All three chip kinds stay distinct. ✓

---

### F2 — SVG discipline verified [severity: none — PASS]
SVG-1 through SVG-5 rules checked:

| Rule | Check | Result |
|------|-------|--------|
| SVG-1: viewBox present, case-sensitive | setAttribute('viewBox', ...) on line 96 | ✓ Always set, correct case |
| SVG-2: Self-closed tags | All elements via createElementNS (namespace aware) | ✓ Proper XML creation |
| SVG-3: Painter's model, no z-index | Elements appended in source order (appendChild) | ✓ Order-based rendering |
| SVG-4: Semantic shapes | rect for cards (line 104, 247, 357), line for connections (line 230), text for labels | ✓ Appropriate elements |
| SVG-5: DOM styling with fill/stroke | setAttribute('fill', ...), setAttribute('stroke', ...) throughout | ✓ No background-color or border |

No hardcoded pixel colors in CSS, all use tokens (e.g., `var(--color-text-primary)`). Exception: chip colors hardcoded as RGB (#185FA5, #9A4E12, #703508) — these should be in tokens file for consistency (minor issue, not blocking).

---

### F3 — arbor-tree is read-only (never writes nodes) [severity: none — PASS]
Search results for node mutations:
- `appendChild` calls (17 total) build SVG only, never modify `this.unit.nodes[]`
- No `this.unit.nodes[].property = value` assignments
- No calls to `localStore.saveUnit()` or any write-path function
- Only reads: `this.unit.nodes`, `this.unit.curriculum`, `this.unit.bigIdeas`, `this.unit.lessons`

**Result:** arbor-tree is pure rendering, read-only over loaded data. ✓

---

## Not verifiable without a browser

- AC-ATB-1: Node overlap measurement at print scale (Q-4)
- AC-ATB-3/10: Visual distinctiveness and print typography floor (12pt minimum)
- Layout legibility at realistic scale (40+ descriptions, 8+ big ideas, 5+ assessments)
