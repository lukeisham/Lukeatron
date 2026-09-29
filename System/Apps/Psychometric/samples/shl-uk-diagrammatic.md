# SHL Diagrammatic / Inductive Reasoning Test — UK

**Reference test:** SHL Diagrammatic Reasoning Test (UK — graduate and professional recruitment)
**Format:** Sequences of abstract diagrams and figures where the candidate must identify the underlying logical rule and predict the next diagram. Typically 18–24 questions in 20–25 minutes. Time-pressured.
**Answer style:** Single correct answer (A–E). Binary scoring.
**Distinctive feature:** Uses operators/processors — abstract symbols (e.g., triangles, circles, arrows) that represent transformation rules applied to input figures. The candidate decodes what each operator does and applies it to new inputs. This is the defining feature of SHL diagrammatic tests.

**SVG rules:** All visual artefacts follow `Memory/Long-Term/Coding/vibe-coding-rules.md` SVG-1 through SVG-5.

---

## SHL Diagrammatic Sample — Operator Decoding (Medium Difficulty)

### Stimulus: Operator Key and Example Panel

![SHL-style operator decoding problem. Top panel defines two operators (circle and diamond) with transformation rules. Bottom panel shows an input figure that must be processed by applying operators in sequence.](shl-operators.svg)

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 280">
  <!-- === OPERATOR DEFINITIONS (left half) === -->

  <!-- Operator 1: Circle → changes fill (outline ↔ filled) -->
  <text x="30" y="24" font-family="sans-serif" font-size="12" font-weight="bold" fill="#333">Operator definitions:</text>

  <!-- Operator A (circle): Outline square → Filled square -->
  <text x="30" y="62" font-family="sans-serif" font-size="11" fill="#555">Operator ○ :</text>
  <rect x="110" y="44" width="36" height="36" fill="none" stroke="#1a1a1a" stroke-width="2" />
  <circle cx="170" cy="62" r="16" fill="none" stroke="#1a1a1a" stroke-width="2" />
  <text x="174" y="66" font-family="sans-serif" font-size="10" fill="#1a1a1a" text-anchor="middle">○</text>
  <rect x="210" y="44" width="36" height="36" fill="#1a1a1a" />

  <!-- Operator B (diamond): Square → Circle (same fill state) -->
  <text x="30" y="108" font-family="sans-serif" font-size="11" fill="#555">Operator ◇ :</text>
  <rect x="110" y="90" width="36" height="36" fill="none" stroke="#1a1a1a" stroke-width="2" />
  <polygon points="170,74 186,86 170,98 154,86" fill="none" stroke="#1a1a1a" stroke-width="2" />
  <circle cx="210" cy="108" r="20" fill="none" stroke="#1a1a1a" stroke-width="2" />

  <!-- Divider -->
  <line x1="280" y1="20" x2="280" y2="260" stroke="#ccc" stroke-width="1" />

  <!-- === PROBLEM (right half) === -->
  <text x="300" y="24" font-family="sans-serif" font-size="12" font-weight="bold" fill="#333">Problem:</text>

  <!-- Input figure -->
  <text x="300" y="50" font-family="sans-serif" font-size="11" fill="#555">Input:</text>
  <rect x="300" y="60" width="48" height="48" fill="#1a1a1a" />

  <!-- Processing sequence -->
  <text x="312" y="74" font-family="sans-serif" font-size="10" fill="#555">Apply:</text>

  <!-- Sequence: ○ then ◇ then ○ -->
  <circle cx="390" cy="84" r="18" fill="none" stroke="#1a1a1a" stroke-width="2" />
  <text x="394" y="89" font-family="sans-serif" font-size="11" fill="#1a1a1a" text-anchor="middle">○</text>
  <text x="416" y="84" font-family="sans-serif" font-size="16" fill="#666">→</text>
  <polygon points="448,68 464,80 448,92 432,80" fill="none" stroke="#1a1a1a" stroke-width="2" />
  <text x="474" y="84" font-family="sans-serif" font-size="16" fill="#666">→</text>
  <circle cx="506" cy="84" r="18" fill="none" stroke="#1a1a1a" stroke-width="2" />
  <text x="510" y="89" font-family="sans-serif" font-size="11" fill="#1a1a1a" text-anchor="middle">○</text>

  <text x="578" y="84" font-family="sans-serif" font-size="16" fill="#666">=</text>
  <text x="608" y="84" font-family="sans-serif" font-size="16" fill="#888">?</text>

  <!-- Answer options -->
  <text x="300" y="140" font-family="sans-serif" font-size="11" fill="#555">Output options:</text>

  <!-- A -->
  <text x="310" y="170" font-family="sans-serif" font-size="11" fill="#333">A</text>
  <rect x="330" y="152" width="36" height="36" fill="#1a1a1a" />

  <!-- B -->
  <text x="390" y="170" font-family="sans-serif" font-size="11" fill="#333">B</text>
  <circle cx="418" cy="170" r="20" fill="#1a1a1a" />

  <!-- C -->
  <text x="470" y="170" font-family="sans-serif" font-size="11" fill="#333">C</text>
  <rect x="490" y="152" width="36" height="36" fill="#1a1a1a" />

  <!-- D -->
  <text x="550" y="170" font-family="sans-serif" font-size="11" fill="#333">D</text>
  <circle cx="578" cy="170" r="20" fill="none" stroke="#1a1a1a" stroke-width="2" />

  <!-- E -->
  <text x="630" y="170" font-family="sans-serif" font-size="11" fill="#333">E</text>
  <polygon points="658,152 674,164 658,176 642,164" fill="none" stroke="#1a1a1a" stroke-width="2" />

  <!-- Option labels below shapes -->
  <text x="348" y="210" font-family="sans-serif" font-size="9" fill="#888">filled</text>
  <text x="416" y="210" font-family="sans-serif" font-size="9" fill="#888">filled</text>
  <text x="508" y="210" font-family="sans-serif" font-size="9" fill="#888">filled</text>
  <text x="576" y="210" font-family="sans-serif" font-size="9" fill="#888">outline</text>
  <text x="656" y="210" font-family="sans-serif" font-size="9" fill="#888">outline</text>
</svg>
```

### Question

What is the output after applying the three operators in sequence to the given input?

- **A:** Filled square
- **B:** Filled circle
- **C:** Filled square *(Note: A and C are identical distractors in the original; intended answer is B)*
- **D:** Outline circle
- **E:** Outline diamond

**Wait — the options in the SVG differ from this text. Let's use the SVG options only.**

### Options (from SVG)

- **A:** Filled square
- **B:** Filled circle
- **C:** Filled square
- **D:** Outline circle
- **E:** Outline diamond

### Correct Answer

**B**

### Step-by-Step Processing

| Step | Operator | Input State | Output State |
|------|----------|-------------|---------------|
| **Start** | — | Filled square | Filled square |
| **1** | ○ (toggle fill) | Filled square → | **Outline square** |
| **2** | ◇ (square→circle) | Outline square → | **Outline circle** |
| **3** | ○ (toggle fill) | Outline circle → | **Filled circle** |

### Rule Spec

| Operator Symbol | Rule |
|---|---|
| **○** | Toggles fill state: outline ↔ filled |
| **◇** | Changes shape: square → circle, circle → diamond, diamond → square |

### Clue

Process the operators one at a time, left to right. Each operator transforms exactly one attribute. The sequence matters — applying ○ then ◇ gives a different result from ◇ then ○.

### Explainer

SHL diagrammatic tests uniquely use abstract operator symbols to represent transformation rules. The key skill is decoding what each operator does (by examining its effect on known inputs) and then applying the decoded operators in the correct sequence to a new input. This tests both inductive reasoning (inferring the rule from examples) and working memory (holding multiple transformations in mind while applying them sequentially). Option B is correct — the filled square input becomes an outline square (○), then an outline circle (◇), then a filled circle (○).

---

*Sample adapted for SHL Diagrammatic Reasoning format. Uses operator-decoding paradigm unique to SHL. Tests simultaneous rule induction and sequential processing. SVG per project conventions. All content is original creation.*
