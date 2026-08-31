#!/usr/bin/env node
/**
 * test_lesson-plan-generator.js — Smoke tests (TEST-1, TEST-2, TEST-7)
 *
 * Stdlib only (node:test, node:assert/strict).
 * Three core tests: import, happy-path generate, regenerate guard.
 *
 * Run: node --test tests/test_lesson-plan-generator.js
 */

import assert from 'node:assert/strict';
import test from 'node:test';

// Import the core generator (the only module testable in Node without DOM)
import {
  generateLesson,
  regenerateLesson
} from '../app/js/lesson-generator-core.js';

// ===== FIXTURE DATA =====

/**
 * Create a minimal fixture node.
 */
function createFixtureNode(id, kind = 'outcome', text = 'Sample node text') {
  return {
    id,
    kind,
    code: `CODE${id.slice(-3)}`,
    title: `Node ${id}`,
    text: text,
    parentId: null
  };
}

/**
 * Create a minimal fixture big idea.
 */
function createFixtureBigIdea(id, topicId = 'topic-1') {
  return {
    id,
    title: `Big Idea ${id}`,
    parentId: null,
    topicId: topicId,
    coverage: []
  };
}

/**
 * Create a minimal fixture lesson.
 */
function createFixtureLesson(id, number = 1) {
  return {
    id,
    number,
    nodeIds: [],
    bigIdeaId: null,
    keyExample: '',
    practiceQuestion: '',
    provenance: 'manual',
    tiers: {},
    sidebar: null,
    assessmentLink: { miniAssessmentIds: [], finalAssessment: false, note: null },
    imageRefs: []
  };
}

// ============================================================================
// TEST 1: Module Import
// ============================================================================

test('TEST-1: Module imports successfully', async (t) => {
  assert.ok(
    typeof generateLesson === 'function',
    'generateLesson exported'
  );
  assert.ok(
    typeof regenerateLesson === 'function',
    'regenerateLesson exported'
  );
});

// ============================================================================
// TEST 2: Happy Path — Generate Lesson from Single Node
// ============================================================================

test('TEST-2a: Generate single lesson with one node + one big idea', async (t) => {
  const fixture = {
    nodes: [createFixtureNode('node-001', 'outcome', 'Example text')],
    bigIdeas: [createFixtureBigIdea('bi-001')],
    allLessons: []
  };

  const lesson = generateLesson(
    ['node-001'],
    'bi-001',
    fixture.allLessons,
    fixture.nodes,
    fixture.bigIdeas
  );

  // Verify structure
  assert.ok(lesson.id, 'lesson has id');
  assert.strictEqual(lesson.number, 1, 'first lesson gets number 1');
  assert.deepStrictEqual(lesson.nodeIds, ['node-001'], 'nodeIds set correctly');
  assert.strictEqual(lesson.bigIdeaId, 'bi-001', 'bigIdeaId set correctly');
  assert.ok(lesson.keyExample.length > 0, 'keyExample non-blank');
  assert.ok(lesson.practiceQuestion.length > 0, 'practiceQuestion non-blank');
  assert.strictEqual(
    lesson.provenance,
    'generated',
    'provenance is "generated"'
  );
  assert.deepStrictEqual(lesson.tiers.pass.material, '', 'pass tier empty');
  assert.deepStrictEqual(
    lesson.tiers.intermediate.material,
    '',
    'intermediate tier empty'
  );
  assert.deepStrictEqual(
    lesson.tiers.advanced.material,
    '',
    'advanced tier empty'
  );
  assert.strictEqual(lesson.sidebar, null, 'sidebar null');
  assert.deepStrictEqual(lesson.imageRefs, [], 'imageRefs empty');
});

// ============================================================================
// TEST 2b: Generate Multiple Lessons (Contiguous Numbering, INV-DM-32)
// ============================================================================

test('TEST-2b: Two successive generates have contiguous numbers', async (t) => {
  const nodes = [
    createFixtureNode('node-001', 'outcome', 'First'),
    createFixtureNode('node-002', 'task', 'Second')
  ];
  const bigIdeas = [createFixtureBigIdea('bi-001')];
  const allLessons = [];

  // First lesson
  const lesson1 = generateLesson(
    ['node-001'],
    'bi-001',
    allLessons,
    nodes,
    bigIdeas
  );
  allLessons.push(lesson1);

  // Second lesson
  const lesson2 = generateLesson(
    ['node-002'],
    'bi-001',
    allLessons,
    nodes,
    bigIdeas
  );

  assert.strictEqual(lesson1.number, 1, 'first lesson: number 1');
  assert.strictEqual(lesson2.number, 2, 'second lesson: number 2');
});

// ============================================================================
// TEST 2c: Multi-Node Composition (FR-LPG-11)
// ============================================================================

test('TEST-2c: Generate from multiple nodes concatenates text with node codes', async (t) => {
  const nodes = [
    createFixtureNode('node-001', 'outcome', 'First text'),
    createFixtureNode('node-002', 'task', 'Second text')
  ];
  const bigIdeas = [createFixtureBigIdea('bi-001')];

  const lesson = generateLesson(
    ['node-001', 'node-002'],
    'bi-001',
    [],
    nodes,
    bigIdeas
  );

  // Both texts should appear, separated by node codes
  assert.ok(
    lesson.keyExample.includes('First text'),
    'keyExample includes first text'
  );
  assert.ok(
    lesson.keyExample.includes('Second text'),
    'keyExample includes second text'
  );
  assert.ok(
    lesson.keyExample.includes('CODE001') || lesson.keyExample.includes('CODE002'),
    'keyExample includes node codes for multi-node'
  );
});

// ============================================================================
// TEST 3: Guard Path — No Nodes Selected
// ============================================================================

test('TEST-3a: Guard — Generate with no nodes throws', async (t) => {
  assert.throws(
    () => {
      generateLesson([], 'bi-001', [], [], []);
    },
    /At least one curriculum node/,
    'empty nodeIds throws'
  );
});

// ============================================================================
// TEST 4: Guard Path — No Big Idea Selected
// ============================================================================

test('TEST-4a: Guard — Generate with no big idea throws', async (t) => {
  assert.throws(
    () => {
      generateLesson(['node-001'], null, [], [], []);
    },
    /A big idea must be selected/,
    'null bigIdeaId throws'
  );
});

// ============================================================================
// TEST 5: Regenerate Guard — Provenance Must Be "generated"
// ============================================================================

test('TEST-5a: Guard — Regenerate "edited" lesson throws', async (t) => {
  const lesson = createFixtureLesson('les-001');
  lesson.provenance = 'edited';

  assert.throws(
    () => {
      regenerateLesson(
        'les-001',
        ['node-002'],
        'bi-002',
        [lesson],
        [createFixtureNode('node-002')],
        [createFixtureBigIdea('bi-002')]
      );
    },
    /Cannot regenerate lesson with provenance="edited"/,
    'provenance="edited" throws'
  );
});

test('TEST-5b: Guard — Regenerate "manual" lesson throws', async (t) => {
  const lesson = createFixtureLesson('les-001');
  lesson.provenance = 'manual';

  assert.throws(
    () => {
      regenerateLesson(
        'les-001',
        ['node-002'],
        'bi-002',
        [lesson],
        [createFixtureNode('node-002')],
        [createFixtureBigIdea('bi-002')]
      );
    },
    /Cannot regenerate lesson with provenance="manual"/,
    'provenance="manual" throws'
  );
});

// ============================================================================
// TEST 6: Regenerate Happy Path
// ============================================================================

test('TEST-6a: Regenerate "generated" lesson updates specified fields only', async (t) => {
  const originalLesson = {
    id: 'les-001',
    number: 5,
    nodeIds: ['node-001'],
    bigIdeaId: 'bi-001',
    keyExample: 'Old example',
    practiceQuestion: 'Old question?',
    provenance: 'generated',
    sidebar: 'Keep this',
    assessmentLink: { miniAssessmentIds: ['mini-001'], finalAssessment: true },
    imageRefs: ['img-001'],
    tiers: { pass: { material: 'Keep' } }
  };

  const nodes = [createFixtureNode('node-002', 'outcome', 'New text')];
  const bigIdeas = [createFixtureBigIdea('bi-002')];

  const updated = regenerateLesson(
    'les-001',
    ['node-002'],
    'bi-002',
    [originalLesson],
    nodes,
    bigIdeas
  );

  // Changed fields
  assert.deepStrictEqual(updated.nodeIds, ['node-002'], 'nodeIds updated');
  assert.strictEqual(updated.bigIdeaId, 'bi-002', 'bigIdeaId updated');
  assert.notStrictEqual(updated.keyExample, originalLesson.keyExample, 'keyExample updated');
  assert.notStrictEqual(
    updated.practiceQuestion,
    originalLesson.practiceQuestion,
    'practiceQuestion updated'
  );

  // Unchanged fields
  assert.strictEqual(updated.number, 5, 'number unchanged');
  assert.strictEqual(
    updated.provenance,
    'generated',
    'provenance stays "generated"'
  );
  assert.strictEqual(updated.sidebar, 'Keep this', 'sidebar unchanged');
  assert.deepStrictEqual(updated.imageRefs, ['img-001'], 'imageRefs unchanged');
});

// ============================================================================
// TEST 7: Text Composition with Fallback
// ============================================================================

test('TEST-7a: Text composition falls back to node.title if text is blank', async (t) => {
  const nodes = [
    createFixtureNode('node-001', 'outcome', ''), // blank text
    createFixtureNode('node-002', 'task', '') // blank text
  ];
  const bigIdeas = [createFixtureBigIdea('bi-001')];

  const lesson = generateLesson(
    ['node-001', 'node-002'],
    'bi-001',
    [],
    nodes,
    bigIdeas
  );

  // Should contain node titles as fallback
  assert.ok(
    lesson.keyExample.includes('Node node-001') ||
      lesson.keyExample.includes('Node node-002'),
    'keyExample contains fallback node titles'
  );
});

// ============================================================================
// TEST 8: Lesson Not Found on Regenerate
// ============================================================================

test('TEST-8a: Guard — Regenerate nonexistent lesson throws', async (t) => {
  assert.throws(
    () => {
      regenerateLesson('les-999', ['node-001'], 'bi-001', [], [], []);
    },
    /not found/,
    'nonexistent lesson throws'
  );
});
