# "Abstract / Diagrammatic / Fluid Reasoning" 

Also commonly called **Inductive Reasoning**, **Non-verbal Reasoning**, **Diagrammatic Reasoning**, or **Figural Reasoning**. These questions test **fluid intelligence** — the ability to spot rules and patterns in novel visual information without relying on language, numbers, or prior knowledge.

## Common Subtypes / Formats

- **Odd one out (classification):** Identify which figure does not belong because it breaks the shared rule. Sometimes presented as set membership (A/B sets or “neither”).
- **Sequence / series completion (“next in the series”):** A row of shapes follows a rule; choose what comes next (or occasionally the missing middle item).
- **Matrix completion:** A 2×2 or (most often) 3×3 grid of figures with one cell missing; select the figure that completes the pattern across rows *and* columns (classic Raven’s Progressive Matrices style).
- **Figural analogies:** “A is to B as C is to ?” (apply the same transformation).
- **Pattern / figure completion:** A larger design with a missing piece (jigsaw-style).
- **Additional variants:** Middle-of-sequence ordering; process/flowchart diagrammatic items (more rule-application than pure pattern spotting).

## Key Visual Attributes That Can Vary

Any generator should treat these as controllable parameters (often several change at once):

- Shape type (circle, square, triangle, polygon, arrow, custom)
- Number of elements / sides / enclosed regions / lines / dots
- Size (small/medium/large or continuous scaling)
- Orientation / rotation angle
- Position / location within the cell (corners, edges, centre; relative positions)
- Shading / fill / colour (empty, solid, striped, dotted, black/white, multi-colour)
- Symmetry or handedness
- Overlap / layering / nesting
- Line style, thickness, or presence of marks

## Common Rule / Pattern Families (Transformations)

Almost every item is built from one or more of these (harder items combine 2–3):

1. **Rotation** — Fixed angle (commonly 45°, 90°, 180°, 270°) clockwise or anticlockwise; whole figure or individual elements; consistent or alternating direction.
2. **Reflection / mirroring** — Horizontal, vertical, or diagonal flip; handedness reverses.
3. **Translation / movement / position change** — Element shifts left/right/up/down/diagonally, often cycling through corners or positions.
4. **Size progression** — Systematic increase/decrease or cycling through sizes.
5. **Count / number change** — Number of shapes, sides, dots, lines, or regions increases/decreases by a constant, alternates, or follows a simple sequence (including odd/even or totals across a row/column).
6. **Shading / colour / fill cycling** — Empty → striped → solid; black ↔ white; colour cycles; or conditional shading (e.g., odd-sided shapes are shaded).
7. **Addition / subtraction / overlay** — Elements appear or disappear; logical operations such as union, intersection, XOR (elements present in one but not both), or replacement of one shape by another.
8. **Distribution / permutation** — Each row/column contains exactly one of each value for an attribute (Latin-square style); or constant attribute across a row while another varies.
9. **Shape morphing / replacement** — One shape systematically turns into another.
10. **Combinations & interactions** — Multiple independent or dependent rules operating simultaneously (e.g., rotation + count increase + shading cycle). Rules can apply across rows, columns, diagonals, or the whole matrix.

**Progression vs constant vs distribution** styles are especially common in matrices.

## Difficulty Levers (for generation)

- Number of simultaneous rules (1 → 2 → 3+)
- Whether rules are independent or interacting
- Visual complexity / number of elements
- Subtlety (e.g., small positional shifts vs obvious rotation)
- Distractor quality (plausible near-misses that follow only some of the rules)
- Matrix vs linear sequence (matrices generally harder because rules must hold in two dimensions)

## Generation Notes for an App

- Parameterise attributes and apply one or more rule families systematically.
- Always verify the rule holds across the entire visible set before generating the answer.
- Create distractors by applying incorrect angles, opposite directions, partial rules, or swapping attributes.
- Support progressive difficulty and clear feedback that names the rule(s) used.
- For matrices, ensure consistency in both rows and columns (and sometimes diagonals).
- Edge cases: pure continuous “jigsaw” patterns, multi-element independent rotations, conditional rules (“if X then Y”).

## Solving Strategy Outline (useful for explanations/feedback)

Check in roughly this order (cheapest first): counting → position/movement → rotation/reflection → size → shading/colour → addition/subtraction/overlay → multi-rule combinations. Track one distinctive feature at a time. Confirm the candidate rule on at least two transitions or across both dimensions of a matrix.

## Where They Appear — Tests by Country

These formats dominate tests measuring fluid intelligence in education, employment, military, and clinical settings.

### International / Widely Used
- **Raven’s Progressive Matrices** (Standard, Advanced, Coloured) — the classic matrix format; used in research, education, and some employment/clinical contexts worldwide.
- **Cattell Culture Fair Intelligence Test (CFIT)** — series, classification, matrices.
- Provider batteries used globally: **SHL** (Inductive / Diagrammatic), **Cubiks Logiks / Talogy**, **Talent Q / Korn Ferry Aspects Logical**, **Saville Assessment**, **Aon/cut-e**, **Test Partnership**, **Sova**.

### United States
- **WAIS** (Wechsler Adult Intelligence Scale) — Matrix Reasoning subtest (Perceptual Reasoning / Fluid Reasoning index).
- **PI Cognitive Assessment** (Predictive Index) — significant figural/abstract component (sequences and matrices).
- **Naglieri Nonverbal Ability Test (NNAT)** — education/gifted identification.
- **Raven’s Progressive Matrices** (research, clinical, some employment).
- Employment aptitude tests from SHL, Criteria, Wonderlic-related batteries, and others used by US companies (tech, consulting, finance, etc.).
- Military/selection contexts often include related non-verbal pattern items.

### England / United Kingdom
- **SHL Inductive Reasoning** (and older Diagrammatic Reasoning) — extremely common in graduate schemes (Big Four, banks, consulting, Civil Service, NHS, etc.).
- **Cubiks Logiks / Talogy**, **Talent Q**, **Saville Assessment** (Abstract/Diagrammatic), **Aon/cut-e**.
- **UCAT** (University Clinical Aptitude Test) — previously included a dedicated Abstract Reasoning section (removed in the 2026 cycle due to high coachability).
- Military: Army Cognitive Test and related RAF/Royal Navy assessments include abstract/inductive components.
- Broad use across graduate and professional recruitment in finance, professional services, engineering, and the public sector.

### Australia
- **HAST** (Higher Ability Selection Test, ACER) — dedicated Abstract Reasoning section (pattern sequences, matrices, visual relationships); used by many independent/selective schools.
- **ACER** products: AGAT (General Ability Test), APTS Abstract Reasoning (also used in apprenticeship/recruitment), and various scholarship/selective papers.
- **NSW Selective High School Placement Test** and **Opportunity Class (OC) Test** — Thinking Skills component includes abstract/non-verbal pattern items.
- **WA ASET** (Academic Selective Entrance Test / GATE) — dedicated Abstract Reasoning section.
- **EduTest**, AAS, and other scholarship/gifted programs frequently include abstract reasoning.
- **UCAT ANZ** — previously included Abstract Reasoning (removed in line with the international change).
- Employment: Revelian Cognitive Test; widespread use of SHL, Cubiks/Talogy, and ACER abstract reasoning for graduate, professional, and trade/apprenticeship selection.
- Defence Force selection testing includes general ability components with abstract elements.

These are the core of the “Abstract / Diagrammatic / Fluid Reasoning” category used in aptitude, educational selection, clinical, and research settings across the three countries.
