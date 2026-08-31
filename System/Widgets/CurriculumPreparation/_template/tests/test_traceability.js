// test_traceability.js — Unit tests for reverse-link index and code rendering
// Smoke tests: module imports, reverse index rebuilt fresh, code clicks navigate, no writes to unit.json

import test from 'node:test';
import assert from 'node:assert';
import {
  buildReverseIndex,
  renderCode,
  canDeleteAssessment,
  findUnreferencedAssessments,
  NavigationTracker
} from '../app/js/traceability.js';

// ===== TEST 1: Module Imports =====
test('traceability: imports successfully', (t) => {
  assert.strictEqual(typeof buildReverseIndex, 'function');
  assert.strictEqual(typeof renderCode, 'function');
  assert.strictEqual(typeof canDeleteAssessment, 'function');
  assert.strictEqual(typeof findUnreferencedAssessments, 'function');
  assert.strictEqual(typeof NavigationTracker, 'function');
});

// ===== TEST 2: Reverse Index — Basic Node-to-Lessons =====
test('traceability: buildReverseIndex maps nodeIds to lessons', (t) => {
  const unit = {
    nodes: [
      { id: 'node-abc', kind: 'outcome', title: 'Node A' },
      { id: 'node-def', kind: 'outcome', title: 'Node B' }
    ],
    lessons: [
      { id: 'les-1', number: 1, nodeIds: ['node-abc'], bigIdeaId: 'bi-1', assessmentLink: {} },
      { id: 'les-2', number: 2, nodeIds: ['node-abc', 'node-def'], bigIdeaId: 'bi-1', assessmentLink: {} }
    ],
    bigIdeas: [
      { id: 'bi-1', title: 'Big Idea 1', topicId: 'topic-1', parentId: null }
    ],
    topics: [
      { id: 'topic-1', title: 'Topic 1' }
    ]
  };

  const index = buildReverseIndex(unit);

  // node-abc should map to lessons 1 and 2
  assert.deepStrictEqual(index.nodeToLessons.get('node-abc'), ['les-1', 'les-2']);
  // node-def should map to lesson 2 only
  assert.deepStrictEqual(index.nodeToLessons.get('node-def'), ['les-2']);
});

// ===== TEST 3: Reverse Index — BigIdea to Lessons =====
test('traceability: buildReverseIndex maps bigIdeaIds to lessons', (t) => {
  const unit = {
    nodes: [],
    lessons: [
      { id: 'les-1', number: 1, nodeIds: [], bigIdeaId: 'bi-1', assessmentLink: {} },
      { id: 'les-2', number: 2, nodeIds: [], bigIdeaId: 'bi-2', assessmentLink: {} },
      { id: 'les-3', number: 3, nodeIds: [], bigIdeaId: 'bi-1', assessmentLink: {} }
    ],
    bigIdeas: [
      { id: 'bi-1', title: 'BI 1', topicId: 'topic-1', parentId: null },
      { id: 'bi-2', title: 'BI 2', topicId: 'topic-1', parentId: null }
    ],
    topics: [
      { id: 'topic-1', title: 'Topic 1' }
    ]
  };

  const index = buildReverseIndex(unit);

  // bi-1 should map to lessons 1 and 3
  assert.deepStrictEqual(index.bigIdeaToLessons.get('bi-1'), ['les-1', 'les-3']);
  // bi-2 should map to lesson 2
  assert.deepStrictEqual(index.bigIdeaToLessons.get('bi-2'), ['les-2']);
});

// ===== TEST 4: Reverse Index — Topic to BigIdeas =====
test('traceability: buildReverseIndex maps topicIds to bigIdeas', (t) => {
  const unit = {
    nodes: [],
    lessons: [],
    bigIdeas: [
      { id: 'bi-1', title: 'BI 1', topicId: 'topic-1', parentId: null },
      { id: 'bi-2', title: 'BI 2', topicId: 'topic-1', parentId: null },
      { id: 'bi-3', title: 'BI 3', topicId: 'topic-2', parentId: null }
    ],
    topics: [
      { id: 'topic-1', title: 'Topic 1' },
      { id: 'topic-2', title: 'Topic 2' }
    ]
  };

  const index = buildReverseIndex(unit);

  // topic-1 should map to bi-1 and bi-2
  assert.deepStrictEqual(index.topicToBigIdeas.get('topic-1'), ['bi-1', 'bi-2']);
  // topic-2 should map to bi-3
  assert.deepStrictEqual(index.topicToBigIdeas.get('topic-2'), ['bi-3']);
});

// ===== TEST 5: Reverse Index — Assessment Links =====
test('traceability: buildReverseIndex maps assessmentIds to lessons', (t) => {
  const unit = {
    nodes: [],
    lessons: [
      {
        id: 'les-1',
        number: 1,
        nodeIds: [],
        bigIdeaId: 'bi-1',
        assessmentLink: {
          finalAssessment: true,
          miniAssessmentIds: ['mini-1']
        }
      },
      {
        id: 'les-2',
        number: 2,
        nodeIds: [],
        bigIdeaId: 'bi-1',
        assessmentLink: {
          finalAssessment: false,
          miniAssessmentIds: ['mini-1', 'mini-2']
        }
      }
    ],
    bigIdeas: [
      { id: 'bi-1', title: 'BI 1', topicId: 'topic-1', parentId: null }
    ],
    topics: [
      { id: 'topic-1', title: 'Topic 1' }
    ],
    unitAssessment: {
      id: 'ua-1',
      finalAssessment: {},
      miniAssessments: [
        { id: 'mini-1', name: 'Mini 1', bigIdeaId: 'bi-1' },
        { id: 'mini-2', name: 'Mini 2', bigIdeaId: 'bi-1' }
      ]
    }
  };

  const index = buildReverseIndex(unit);

  // ua-1 (final) should map to lesson 1 only
  assert.deepStrictEqual(index.unitAssessmentToLessons.get('ua-1'), ['les-1']);
  // mini-1 should map to lessons 1 and 2
  assert.deepStrictEqual(index.unitAssessmentToLessons.get('mini-1'), ['les-1', 'les-2']);
  // mini-2 should map to lesson 2 only
  assert.deepStrictEqual(index.unitAssessmentToLessons.get('mini-2'), ['les-2']);
});

// ===== TEST 6: Dangling Reference Detection =====
test('traceability: buildReverseIndex throws on dangling nodeId reference', (t) => {
  const unit = {
    nodes: [
      { id: 'node-abc', kind: 'outcome', title: 'Node A' }
    ],
    lessons: [
      { id: 'les-1', number: 1, nodeIds: ['node-missing'], bigIdeaId: 'bi-1', assessmentLink: {} }
    ],
    bigIdeas: [
      { id: 'bi-1', title: 'BI 1', topicId: 'topic-1', parentId: null }
    ],
    topics: [
      { id: 'topic-1', title: 'Topic 1' }
    ]
  };

  assert.throws(
    () => buildReverseIndex(unit),
    /Dangling reference.*node-missing/
  );
});

// ===== TEST 7: Dangling Assessment Reference =====
test('traceability: buildReverseIndex throws on dangling assessment reference', (t) => {
  const unit = {
    nodes: [],
    lessons: [
      {
        id: 'les-1',
        number: 1,
        nodeIds: [],
        bigIdeaId: 'bi-1',
        assessmentLink: {
          miniAssessmentIds: ['mini-missing']
        }
      }
    ],
    bigIdeas: [
      { id: 'bi-1', title: 'BI 1', topicId: 'topic-1', parentId: null }
    ],
    topics: [
      { id: 'topic-1', title: 'Topic 1' }
    ],
    unitAssessment: {
      id: 'ua-1',
      miniAssessments: [
        { id: 'mini-1', name: 'Mini 1', bigIdeaId: 'bi-1' }
      ]
    }
  };

  assert.throws(
    () => buildReverseIndex(unit),
    /Dangling reference.*mini-missing/
  );
});

// ===== TEST 8: NavigationTracker — Save and Retrieve =====
test('traceability: NavigationTracker saves and retrieves position', (t) => {
  const tracker = new NavigationTracker();

  // Initially no history
  assert.strictEqual(tracker.getBackPosition(), null);

  // Save a position
  tracker.savePosition('lesson-plan', 100, 200);
  const pos = tracker.getBackPosition();

  assert.deepStrictEqual(pos, { documentId: 'lesson-plan', scrollX: 100, scrollY: 200 });

  // After retrieval, history is cleared (single-step back)
  assert.strictEqual(tracker.getBackPosition(), null);
});

// ===== TEST 9: NavigationTracker — Invalid Input =====
test('traceability: NavigationTracker throws on invalid input', (t) => {
  const tracker = new NavigationTracker();

  assert.throws(
    () => tracker.savePosition('', 0, 0),
    /documentId must be a non-empty string/
  );

  assert.throws(
    () => tracker.savePosition('doc', 'not-a-number', 0),
    /must be numbers/
  );
});

// ===== TEST 10: renderCode — Print View (not clickable) =====
test('traceability: renderCode returns plain text in print view', (t) => {
  const result = renderCode('NODE-123', false);

  // In print view, should return a string
  assert.strictEqual(result, 'NODE-123');
});

// ===== TEST 11: renderCode — Edit View (clickable) =====
test('traceability: renderCode in edit view throws without DOM (Node.js)', (t) => {
  // Note: Can't fully test DOM elements in Node.js without a DOM implementation.
  // In a real browser environment, this would create an HTMLElement.
  // In Node.js, document is undefined, so it throws.
  // This is expected behavior for a browser-only function tested in Node.js.
  assert.throws(
    () => renderCode('NODE-123', true),
    /document is not defined/
  );
});

// ===== TEST 12: canDeleteAssessment — Can Delete (no references) =====
test('traceability: canDeleteAssessment allows delete when unreferenced', (t) => {
  const unit = {
    nodes: [],
    lessons: [
      { id: 'les-1', number: 1, nodeIds: [], bigIdeaId: 'bi-1', assessmentLink: {} }
    ],
    bigIdeas: [
      { id: 'bi-1', title: 'BI 1', topicId: 'topic-1', parentId: null }
    ],
    topics: [
      { id: 'topic-1', title: 'Topic 1' }
    ],
    unitAssessment: {
      id: 'ua-1',
      finalAssessment: {},
      miniAssessments: [
        { id: 'mini-unreferenced', name: 'Mini', bigIdeaId: 'bi-1' }
      ]
    }
  };

  const result = canDeleteAssessment('mini-unreferenced', unit);

  assert.strictEqual(result.canDelete, true);
  assert.deepStrictEqual(result.blockingLessonIds, []);
});

// ===== TEST 13: canDeleteAssessment — Cannot Delete (has references) =====
test('traceability: canDeleteAssessment refuses delete when referenced', (t) => {
  const unit = {
    nodes: [],
    lessons: [
      {
        id: 'les-1',
        number: 1,
        nodeIds: [],
        bigIdeaId: 'bi-1',
        assessmentLink: {
          miniAssessmentIds: ['mini-1']
        }
      }
    ],
    bigIdeas: [
      { id: 'bi-1', title: 'BI 1', topicId: 'topic-1', parentId: null }
    ],
    topics: [
      { id: 'topic-1', title: 'Topic 1' }
    ],
    unitAssessment: {
      id: 'ua-1',
      finalAssessment: {},
      miniAssessments: [
        { id: 'mini-1', name: 'Mini 1', bigIdeaId: 'bi-1' }
      ]
    }
  };

  const result = canDeleteAssessment('mini-1', unit);

  assert.strictEqual(result.canDelete, false);
  assert.deepStrictEqual(result.blockingLessonIds, ['les-1']);
  assert.match(result.message, /Cannot delete/);
});

// ===== TEST 14: findUnreferencedAssessments — Empty Unit =====
test('traceability: findUnreferencedAssessments returns empty array for fully referenced unit', (t) => {
  const unit = {
    nodes: [],
    lessons: [
      {
        id: 'les-1',
        number: 1,
        nodeIds: [],
        bigIdeaId: 'bi-1',
        assessmentLink: {
          finalAssessment: true,
          miniAssessmentIds: ['mini-1']
        }
      }
    ],
    bigIdeas: [
      { id: 'bi-1', title: 'BI 1', topicId: 'topic-1', parentId: null }
    ],
    topics: [
      { id: 'topic-1', title: 'Topic 1' }
    ],
    unitAssessment: {
      id: 'ua-1',
      finalAssessment: {},
      miniAssessments: [
        { id: 'mini-1', name: 'Mini 1', bigIdeaId: 'bi-1' }
      ]
    }
  };

  const unreferenced = findUnreferencedAssessments(unit);
  assert.deepStrictEqual(unreferenced, []);
});

// ===== TEST 15: findUnreferencedAssessments — Finds Unreferenced =====
test('traceability: findUnreferencedAssessments finds unreferenced assessments', (t) => {
  const unit = {
    nodes: [],
    lessons: [
      {
        id: 'les-1',
        number: 1,
        nodeIds: [],
        bigIdeaId: 'bi-1',
        assessmentLink: {}
      }
    ],
    bigIdeas: [
      { id: 'bi-1', title: 'BI 1', topicId: 'topic-1', parentId: null }
    ],
    topics: [
      { id: 'topic-1', title: 'Topic 1' }
    ],
    unitAssessment: {
      id: 'ua-1',
      finalAssessment: {},
      miniAssessments: [
        { id: 'mini-1', name: 'Mini 1', bigIdeaId: 'bi-1' },
        { id: 'mini-2', name: 'Mini 2', bigIdeaId: 'bi-1' }
      ]
    }
  };

  const unreferenced = findUnreferencedAssessments(unit);
  // Final and both minis are unreferenced
  assert.strictEqual(unreferenced.includes('ua-1'), true);
  assert.strictEqual(unreferenced.includes('mini-1'), true);
  assert.strictEqual(unreferenced.includes('mini-2'), true);
});

// ===== TEST 16: No Writes to Unit (INV-DM-12) =====
test('traceability: buildReverseIndex does not modify unit.json (INV-DM-12)', (t) => {
  const unit = {
    nodes: [
      { id: 'node-abc', kind: 'outcome', title: 'Node A' }
    ],
    lessons: [
      { id: 'les-1', number: 1, nodeIds: ['node-abc'], bigIdeaId: 'bi-1', assessmentLink: {} }
    ],
    bigIdeas: [
      { id: 'bi-1', title: 'BI 1', topicId: 'topic-1', parentId: null }
    ],
    topics: [
      { id: 'topic-1', title: 'Topic 1' }
    ]
  };

  // Deep clone to detect changes
  const unitBefore = JSON.parse(JSON.stringify(unit));

  // Build index (should not modify unit)
  buildReverseIndex(unit);

  // Verify no changes
  assert.deepStrictEqual(unit, unitBefore);
});
