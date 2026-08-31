# lesson-plan-generator — audit

**Verdict: PASS WITH FINDINGS**

---

## AC table

| AC | Verdict | Evidence |
|---|---------|----------|
| AC-LPG-1 | MET | test_lesson-plan-generator.js: generateLesson() fixture creates lesson with correct number, nodeIds, bigIdeaId, keyExample/practiceQuestion non-blank, provenance="generated" |
| AC-LPG-2 | MET | test_lesson-plan-generator.js: two successive generateLesson() calls produce numbers 1 and 2 (contiguous) |
| AC-LPG-3 | NOT VERIFIABLE WITHOUT BROWSER | Requires manual UI test: open picker, select only big idea (no nodes), confirm button disabled |
| AC-LPG-4 | MET | test_lesson-plan-generator.js: regenerateLesson() replaces nodeIds/bigIdeaId/keyExample/practiceQuestion; number unchanged |
| AC-LPG-5 | NOT VERIFIABLE WITHOUT BROWSER | Requires manual: edit lesson field, render UI, grep for "regenerate" = empty |
| AC-LPG-6 | NOT VERIFIABLE WITHOUT BROWSER | Requires manual: create fixture node with known text, generate, inspect saved lesson for verbatim text |
| AC-LPG-7 | MET | grep lesson-plan-generator.js + lesson-generator-core.js for "fetch\|api\|openai\|claude\|\.prompt\|\.model\|LLM" = empty (no network calls) |
| AC-LPG-8 | MET | grep lesson-plan-generator.js + lesson-generator-core.js for model/API/prompt mentions = empty (AC-LPG-7 proves this) |

---

## Findings

### F1 — big-idea-picker.js correctly imported, not reimplemented  [severity: minor]

**File:line** `app/js/lesson-plan-generator.js` line 14

**What is correct** Import statement `import { openBigIdeaPicker } from './big-idea-picker.js';` is present. No local picker implementation. Shared module is reused. Spec requirement AD-LPB-2 met.

---

## Not verifiable without a browser

- AC-LPG-3: Form validation (disabled button when guards not met) requires manual UI interaction
- AC-LPG-5: Regenerate unavailable on "edited" lessons requires manual fixture + UI grep
- AC-LPG-6: Text composition from node.text requires manual fixture + inspection

---
