#!/usr/bin/env node
/**
 * test_lesson-plan-document.js — Smoke tests (TEST-1, TEST-2, TEST-7)
 *
 * Stdlib only (node:test, node:assert/strict).
 * Three assertions per module: import, happy path, guard (tier emission).
 */

import assert from 'node:assert/strict';
import test from 'node:test';

// ===== FIXTURE DATA =====

function createFixtureLesson(id = 'les-abc123', bigIdeaId = 'bi-xyz789') {
  return {
    id,
    number: 1,
    bigIdeaId,
    nodeIds: ['node-001', 'node-002'],
    keyExample: 'Example text here',
    practiceQuestion: 'Question goes here?',
    assessmentLink: {
      miniAssessmentIds: ['mini-001'],
      majorAssessment: true
    },
    sidebar: 'Optional sidebar notes',
    tiers: {
      pass: {
        material: 'Pass material',
        studentTask: 'Pass task',
        workspaceLines: 3,
        imageRefs: []
      },
      intermediate: {
        material: 'Intermediate material',
        studentTask: 'Intermediate task',
        workspaceLines: 4,
        imageRefs: []
      },
      advanced: {
        material: 'Advanced material',
        studentTask: 'Advanced task',
        workspaceLines: 5,
        imageRefs: []
      }
    }
  };
}

function createFixtureEmptyTiersLesson(id = 'les-empty') {
  return {
    id,
    number: 1,
    bigIdeaId: 'bi-xyz789',
    nodeIds: [],
    keyExample: 'Example',
    practiceQuestion: 'Question?',
    assessmentLink: null,
    sidebar: '',
    tiers: {
      pass: {
        material: '',
        studentTask: '',
        workspaceLines: 0,
        imageRefs: []
      },
      intermediate: {
        material: null,
        studentTask: null,
        workspaceLines: null,
        imageRefs: []
      },
      advanced: {
        material: '',
        studentTask: '',
        workspaceLines: 0,
        imageRefs: []
      }
    }
  };
}

function createFixtureBigIdea(id = 'bi-xyz789', title = 'Test Big Idea', topicId = 'topic-001') {
  return {
    id,
    title,
    text: 'Big idea description',
    parentId: null,
    topicId,
    order: 0,
    coverage: []
  };
}

function createFixtureTopic(id = 'topic-001', title = 'Test Topic') {
  return {
    id,
    title,
    text: 'Topic description',
    order: 0,
    coverage: []
  };
}

// ===== TESTS =====

test('TEST-1: tier-page-emission imports cleanly', async () => {
  const { shouldRenderTierPage } = await import('../app/js/tier-page-emission.js');
  assert(typeof shouldRenderTierPage === 'function', 'shouldRenderTierPage must be a function');
});

test('TEST-1: big-idea-picker imports cleanly', async () => {
  const { openBigIdeaPicker } = await import('../app/js/big-idea-picker.js');
  assert(typeof openBigIdeaPicker === 'function', 'openBigIdeaPicker must be a function');
});

test('TEST-1: lesson-plan-document imports cleanly', async () => {
  const { LessonPlanDocument, renderLessonPlan } = await import('../app/js/lesson-plan-document.js');
  assert(typeof LessonPlanDocument === 'function', 'LessonPlanDocument must be a class');
  assert(typeof renderLessonPlan === 'function', 'renderLessonPlan must be a function');
});

test('TEST-2: shouldRenderTierPage returns true for tier with material', async () => {
  const { shouldRenderTierPage } = await import('../app/js/tier-page-emission.js');
  const tier = { material: 'Content here', studentTask: '', workspaceLines: 0, imageRefs: [] };
  assert.strictEqual(shouldRenderTierPage(tier), true, 'Tier with material should render');
});

test('TEST-2: shouldRenderTierPage returns true for tier with task', async () => {
  const { shouldRenderTierPage } = await import('../app/js/tier-page-emission.js');
  const tier = { material: '', studentTask: 'Task here', workspaceLines: 0, imageRefs: [] };
  assert.strictEqual(shouldRenderTierPage(tier), true, 'Tier with task should render');
});

test('TEST-2: shouldRenderTierPage returns true for tier with workspace lines', async () => {
  const { shouldRenderTierPage } = await import('../app/js/tier-page-emission.js');
  const tier = { material: '', studentTask: '', workspaceLines: 5, imageRefs: [] };
  assert.strictEqual(shouldRenderTierPage(tier), true, 'Tier with lines should render');
});

test('TEST-2: shouldRenderTierPage returns true for tier with images', async () => {
  const { shouldRenderTierPage } = await import('../app/js/tier-page-emission.js');
  const tier = { material: '', studentTask: '', workspaceLines: 0, imageRefs: [{ imageId: 'img-001' }] };
  assert.strictEqual(shouldRenderTierPage(tier), true, 'Tier with images should render');
});

test('TEST-7: LessonPlanDocument with all tiers empty emits only front page', async () => {
  const { LessonPlanDocument, renderLessonPlan } = await import('../app/js/lesson-plan-document.js');
  const lesson = createFixtureEmptyTiersLesson();
  const bigIdea = createFixtureBigIdea();
  const topic = createFixtureTopic();

  const result = renderLessonPlan(lesson, [lesson], [bigIdea], [topic], [], null);
  assert.strictEqual(result.pages.length, 1, 'Empty lesson should emit only front page (1 page total)');
  assert.strictEqual(result.pages[0].type, 'front', 'First page must be front page');
});

test('TEST-7: LessonPlanDocument with one tier populated emits front + one tier page', async () => {
  const { LessonPlanDocument, renderLessonPlan } = await import('../app/js/lesson-plan-document.js');
  const lesson = createFixtureLesson();
  lesson.tiers.intermediate.material = '';
  lesson.tiers.intermediate.studentTask = '';
  lesson.tiers.intermediate.workspaceLines = 0;
  lesson.tiers.advanced.material = '';
  lesson.tiers.advanced.studentTask = '';
  lesson.tiers.advanced.workspaceLines = 0;

  const bigIdea = createFixtureBigIdea();
  const topic = createFixtureTopic();

  const result = renderLessonPlan(lesson, [lesson], [bigIdea], [topic], [], null);
  assert.strictEqual(result.pages.length, 2, 'One-tier lesson should emit 2 pages (front + pass)');
  assert.strictEqual(result.pages[0].type, 'front', 'First page must be front');
  assert.strictEqual(result.pages[1].type, 'tier', 'Second page must be tier');
  assert.strictEqual(result.pages[1].tierName, 'pass', 'Populated tier must be pass');
});

test('TEST-7: LessonPlanDocument with all three tiers populated emits 4 pages', async () => {
  const { LessonPlanDocument, renderLessonPlan } = await import('../app/js/lesson-plan-document.js');
  const lesson = createFixtureLesson();
  const bigIdea = createFixtureBigIdea();
  const topic = createFixtureTopic();

  const result = renderLessonPlan(lesson, [lesson], [bigIdea], [topic], [], null);
  assert.strictEqual(result.pages.length, 4, 'Three-tier lesson should emit 4 pages (front + 3 tiers)');
  assert.strictEqual(result.pages[0].type, 'front', 'Page 1 must be front');
  assert.strictEqual(result.pages[1].type, 'tier', 'Page 2 must be tier');
  assert.strictEqual(result.pages[1].tierName, 'pass', 'Page 2 must be pass');
  assert.strictEqual(result.pages[2].type, 'tier', 'Page 3 must be tier');
  assert.strictEqual(result.pages[2].tierName, 'intermediate', 'Page 3 must be intermediate');
  assert.strictEqual(result.pages[3].type, 'tier', 'Page 4 must be tier');
  assert.strictEqual(result.pages[3].tierName, 'advanced', 'Page 4 must be advanced');
});

// ============================================================================
// FR-LPB-13: provenance "generated" -> "edited" transition (Repair BLOCKER 1)
// ============================================================================

test('FR-LPB-13: first manual edit flips provenance from generated to edited', async () => {
  const { LessonPlanDocument } = await import('../app/js/lesson-plan-document.js');
  const lesson = createFixtureLesson();
  lesson.provenance = 'generated';
  const bigIdea = createFixtureBigIdea();
  const topic = createFixtureTopic();

  const doc = new LessonPlanDocument(lesson, [lesson], [bigIdea], [topic], [], null);
  const changed = doc.markEdited();

  assert.strictEqual(changed, true, 'markEdited reports the transition happened');
  assert.strictEqual(doc.lesson.provenance, 'edited', 'provenance flips to edited on first manual edit');
});

test('FR-LPB-13: a field edit via applyFieldEdit also flips generated -> edited', async () => {
  const { LessonPlanDocument } = await import('../app/js/lesson-plan-document.js');
  const lesson = createFixtureLesson();
  lesson.provenance = 'generated';
  const bigIdea = createFixtureBigIdea();
  const topic = createFixtureTopic();

  const doc = new LessonPlanDocument(lesson, [lesson], [bigIdea], [topic], [], null);
  doc.applyFieldEdit('sidebar', 'A hand-written note');

  assert.strictEqual(doc.lesson.sidebar, 'A hand-written note', 'field value is updated');
  assert.strictEqual(doc.lesson.provenance, 'edited', 'edit transitions provenance to edited');
});

test('FR-LPB-13: provenance never flips back once edited', async () => {
  const { LessonPlanDocument } = await import('../app/js/lesson-plan-document.js');
  const lesson = createFixtureLesson();
  lesson.provenance = 'generated';
  const bigIdea = createFixtureBigIdea();
  const topic = createFixtureTopic();

  const doc = new LessonPlanDocument(lesson, [lesson], [bigIdea], [topic], [], null);
  doc.markEdited();
  assert.strictEqual(doc.lesson.provenance, 'edited');

  const secondCall = doc.markEdited();
  assert.strictEqual(secondCall, false, 'second markEdited call is a no-op');
  assert.strictEqual(doc.lesson.provenance, 'edited', 'provenance stays edited, never reverts');
});

test('FR-LPB-13: lessons already "manual" or "edited" are left untouched', async () => {
  const { LessonPlanDocument } = await import('../app/js/lesson-plan-document.js');
  const bigIdea = createFixtureBigIdea();
  const topic = createFixtureTopic();

  const manualLesson = createFixtureLesson('les-manual');
  manualLesson.provenance = 'manual';
  const manualDoc = new LessonPlanDocument(manualLesson, [manualLesson], [bigIdea], [topic], [], null);
  const manualChanged = manualDoc.markEdited();
  assert.strictEqual(manualChanged, false, 'manual lessons are not touched by markEdited');
  assert.strictEqual(manualDoc.lesson.provenance, 'manual', 'manual provenance is preserved');

  const editedLesson = createFixtureLesson('les-edited');
  editedLesson.provenance = 'edited';
  const editedDoc = new LessonPlanDocument(editedLesson, [editedLesson], [bigIdea], [topic], [], null);
  const editedChanged = editedDoc.markEdited();
  assert.strictEqual(editedChanged, false, 'already-edited lessons are not re-flagged');
  assert.strictEqual(editedDoc.lesson.provenance, 'edited', 'edited provenance is preserved');
});

// Minimal hand-written fake DOM (TEST-8: no jsdom, no library). Exposes only what
// lesson-plan-generator.js's createRegenerateControl() touches when it builds a
// button element: document.createElement() returning an object with the handful
// of properties/methods it sets (type, className, textContent, addEventListener).
function withFakeDocument(fn) {
  const priorDocument = globalThis.document;
  globalThis.document = {
    createElement() {
      return {
        type: null,
        className: null,
        textContent: null,
        addEventListener() {}
      };
    }
  };
  try {
    return fn();
  } finally {
    if (priorDocument === undefined) {
      delete globalThis.document;
    } else {
      globalThis.document = priorDocument;
    }
  }
}

test('FR-LPB-13 / FR-LPG-7: regenerate guard now genuinely fires after a manual edit', async () => {
  const { LessonPlanDocument } = await import('../app/js/lesson-plan-document.js');
  const { createRegenerateControl } = await import('../app/js/lesson-plan-generator.js');

  const lesson = createFixtureLesson();
  lesson.provenance = 'generated';
  const bigIdea = createFixtureBigIdea();
  const topic = createFixtureTopic();

  // Before any edit: regenerate control is available on a "generated" lesson.
  // createRegenerateControl only reaches the DOM once the provenance guard passes,
  // so a fake document is needed here (but not below, where the guard short-circuits).
  const beforeEdit = withFakeDocument(() =>
    createRegenerateControl(lesson, [lesson], [], [bigIdea])
  );
  assert.notStrictEqual(beforeEdit, null, 'regenerate control shows on a generated lesson');

  // Manual edit via this build's owned transition.
  const doc = new LessonPlanDocument(lesson, [lesson], [bigIdea], [topic], [], null);
  doc.applyFieldEdit('keyExample', 'Teacher-written example');

  // After the edit: lesson-plan-generator's own guard (FR-LPG-7) now refuses regenerate,
  // returning null before any DOM access happens — this proves the data-loss bug (a
  // manually-edited lesson silently being overwritten by regenerate) is fixed.
  const afterEdit = createRegenerateControl(doc.lesson, [doc.lesson], [], [bigIdea]);
  assert.strictEqual(afterEdit, null, 'regenerate guard now fires once provenance is edited');
});
