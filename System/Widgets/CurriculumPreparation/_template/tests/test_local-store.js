// test_local-store.js — Smoke tests for local-store.js validation and data layer
// Test: validateUnit, schema versioning, unsaved changes, server errors, round-trip
// Uses node:test + node:assert/strict

import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { validateUnit, LocalStore, ServerClient } from '../app/js/local-store.js';

// TEST-4: tests must never reach the real bundle-server or the real unit.json.
// LocalStore defaults to a ServerClient on port 8800 (bundle-server's real port),
// so any test constructing `new LocalStore()` with no client — and then calling
// setData(), which schedules a debounced autosave — will fire a real network
// save against whatever is listening on 8800 (e.g. a dev serve.py instance),
// silently writing this fixture data into the real _template/unit.json. This
// fake client keeps every such test fully in-memory and inert.
function createFakeServerClient() {
  return {
    saved: [],
    async load() {
      return null;
    },
    async save(unit) {
      this.saved.push(JSON.parse(JSON.stringify(unit)));
      return { status: 'ok' };
    },
  };
}

// Helper: create a minimal valid unit for testing
function createValidUnit() {
  return {
    schemaVersion: '1.0.0',
    generatedFrom: '',
    meta: {
      subject: 'Test Subject',
      level: 'Test Level',
      unitName: 'Test Unit',
      teacher: 'Test Teacher',
      dateCreated: new Date().toISOString(),
      dateModified: new Date().toISOString(),
    },
    curriculum: {
      profileId: 'generic',
      name: 'Generic Curriculum',
      jurisdiction: 'Generic',
      version: '1.0',
      sourceRef: '',
      licence: 'MIT',
      attribution: 'Test',
      labels: {
        strand: 'Strand',
        outcome: 'Outcome',
        task: 'Task',
      },
      ingestedAt: new Date().toISOString(),
    },
    nodes: [
      {
        id: 'node-root',
        code: 'C1',
        title: 'Curriculum Root',
        text: 'The root curriculum node',
        kind: 'strand',
        parentId: null,
        confidence: 'high',
        edited: false,
        domain: 'skill',
      },
      {
        id: 'node-child',
        code: 'C1.1',
        title: 'Child Node',
        text: 'A child of root',
        kind: 'outcome',
        parentId: 'node-root',
        confidence: 'high',
        edited: false,
      },
    ],
    topics: [
      {
        id: 'topic-1',
        title: 'Topic 1',
        text: 'A topic',
        order: 1,
        coverage: [{ nodeId: 'node-root', coverage: 'full', note: null }],
      },
    ],
    bigIdeas: [
      {
        id: 'idea-1',
        title: 'Big Idea 1',
        text: 'A big idea',
        parentId: null,
        order: 1,
        topicId: 'topic-1',
        coverage: [{ nodeId: 'node-child', coverage: 'partial', note: 'Partially covered' }],
      },
    ],
    lessons: [
      {
        id: 'lesson-1',
        number: 1,
        nodeIds: ['node-child'],
        bigIdeaId: 'idea-1',
        bigIdeaNote: null,
        keyExample: 'Example here',
        practiceQuestion: 'Question here',
        assessmentLink: {
          miniAssessmentIds: [],
          finalAssessment: false,
          note: null,
        },
        tiers: {
          pass: { tier: 'pass', material: null, studentTask: null, workspaceLines: null, imageRefs: [] },
          intermediate: { tier: 'intermediate', material: null, studentTask: null, workspaceLines: null, imageRefs: [] },
          advanced: { tier: 'advanced', material: null, studentTask: null, workspaceLines: null, imageRefs: [] },
        },
        imageRefs: [],
        sidebar: null,
        completed: false,
        date: null,
        lessonPeriod: null,
        provenance: 'manual',
      },
    ],
    cribSheet: {
      id: 'crib-1',
      title: 'Crib Sheet',
      orientation: 'portrait',
      sections: [
        {
          bigIdeaId: 'idea-1',
          half: 'upper',
          text: 'Upper half content',
          imageRefs: [],
          size: 'medium',
        },
      ],
      pageCount: 1,
      provenance: 'manual',
    },
    resourcesPage: {
      id: 'resources-1',
      items: [
        {
          id: 'resource-1',
          kind: 'text',
          order: 1,
          url: null,
          label: null,
          imageId: null,
          text: 'A resource',
          note: null,
        },
      ],
    },
    unitAssessment: {
      id: 'ua-1',
      title: 'Unit Assessment',
      bigIdeaId: 'idea-1',
      coverage: [{ nodeId: 'node-root', coverage: 'full', note: null }],
      finalAssessment: {
        pass: { tier: 'pass', material: null, studentTask: null, workspaceLines: null, imageRefs: [] },
        intermediate: { tier: 'intermediate', material: null, studentTask: null, workspaceLines: null, imageRefs: [] },
        advanced: { tier: 'advanced', material: null, studentTask: null, workspaceLines: null, imageRefs: [] },
      },
      finalAssessmentCompleted: false,
      finalAssessmentDate: null,
      finalAssessmentPeriod: null,
      miniAssessments: [],
    },
    matrixTemplate: {
      orientation: 'portrait',
      criteria: [
        {
          id: 'crit-pass',
          tier: 'pass',
          criterion: 'Pass criterion',
          draftScore: 0,
          maxScore: 50,
          assessmentIds: [],
          allocationOverridden: false,
        },
        {
          id: 'crit-inter',
          tier: 'intermediate',
          criterion: 'Intermediate criterion',
          draftScore: 0,
          maxScore: 25,
          assessmentIds: [],
          allocationOverridden: false,
        },
        {
          id: 'crit-adv',
          tier: 'advanced',
          criterion: 'Advanced criterion',
          draftScore: 0,
          maxScore: 25,
          assessmentIds: [],
          allocationOverridden: false,
        },
      ],
    },
    matrices: [],
    students: [],
    images: [],
  };
}

test('validateUnit: valid unit passes', () => {
  const unit = createValidUnit();
  const result = validateUnit(unit);
  assert.equal(result.valid, true, 'Valid unit should pass validation');
  assert.equal(result.errors.length, 0, 'Valid unit should have no errors');
});

test('validateUnit: dangling lesson.nodeIds reference is rejected with message naming the id', () => {
  const unit = createValidUnit();
  unit.lessons[0].nodeIds = ['node-nonexistent'];

  const result = validateUnit(unit);
  assert.equal(result.valid, false, 'Should reject dangling nodeId reference');
  assert.ok(result.errors.some((e) => e.includes('node-nonexistent')), 'Error should name the bad nodeId');
});

test('validateUnit: criterion.nodeId is optional — a criterion without one still validates (INV-DM-35)', () => {
  const unit = createValidUnit();
  // Existing fixture criteria carry no nodeId at all.
  const result = validateUnit(unit);
  assert.equal(result.valid, true, `Criteria without nodeId should validate; got errors: ${JSON.stringify(result.errors)}`);
});

test('validateUnit: criterion.nodeId resolving to an outcome node validates (INV-DM-35)', () => {
  const unit = createValidUnit();
  unit.matrixTemplate.criteria[0].nodeId = 'node-child'; // kind: 'outcome'
  const result = validateUnit(unit);
  assert.equal(result.valid, true, `Criterion linked to an outcome node should validate; got errors: ${JSON.stringify(result.errors)}`);
});

test('validateUnit: dangling criterion.nodeId is rejected, naming the criterion and nodeId (INV-DM-35)', () => {
  const unit = createValidUnit();
  unit.matrixTemplate.criteria[0].nodeId = 'node-nonexistent';
  const result = validateUnit(unit);
  assert.equal(result.valid, false, 'Should reject dangling criterion.nodeId');
  assert.ok(result.errors.some((e) => e.includes('INV-DM-35') && e.includes('crit-pass') && e.includes('node-nonexistent')));
});

test('validateUnit: criterion.nodeId pointing at a non-outcome node is rejected (INV-DM-35)', () => {
  const unit = createValidUnit();
  unit.matrixTemplate.criteria[0].nodeId = 'node-root'; // kind: 'strand'
  const result = validateUnit(unit);
  assert.equal(result.valid, false, 'Should reject a criterion.nodeId that resolves to a non-outcome node');
  assert.ok(result.errors.some((e) => e.includes('INV-DM-35') && e.includes('node-root')));
});

test('validateUnit: two matrices for one student is rejected', () => {
  const unit = createValidUnit();
  unit.matrices = [
    { id: 'matrix-1', studentId: 'stu-1', orientation: null, scores: [] },
    { id: 'matrix-2', studentId: 'stu-1', orientation: null, scores: [] },
  ];
  unit.students = [{ id: 'stu-1', name: 'Student 1' }];

  const result = validateUnit(unit);
  assert.equal(result.valid, false, 'Should reject duplicate student matrix');
  assert.ok(result.errors.some((e) => e.includes('duplicate matrix')), 'Error should mention duplicate');
});

test('validateUnit: lesson without bigIdeaId is rejected, naming the lesson', () => {
  const unit = createValidUnit();
  unit.lessons[0].bigIdeaId = null;

  const result = validateUnit(unit);
  assert.equal(result.valid, false, 'Should reject lesson without bigIdeaId');
  assert.ok(result.errors.some((e) => e.includes('lesson-1')), 'Error should name the lesson id');
});

test('validateUnit: three-level big-idea nesting is rejected', () => {
  const unit = createValidUnit();
  // Add a three-level hierarchy
  unit.bigIdeas.push(
    {
      id: 'idea-level2',
      title: 'Level 2 Idea',
      text: '',
      parentId: 'idea-1', // Parent of idea-1 (level 1)
      order: 2,
      topicId: null,
      coverage: [],
    },
    {
      id: 'idea-level3',
      title: 'Level 3 Idea',
      text: '',
      parentId: 'idea-level2', // Parent is itself a sub-idea
      order: 3,
      topicId: null,
      coverage: [],
    }
  );

  const result = validateUnit(unit);
  assert.equal(result.valid, false, 'Should reject three-level nesting');
  assert.ok(result.errors.some((e) => e.includes('level 3')), 'Error should mention level 3');
});

test('validateUnit: reverse link stored in node is rejected', () => {
  const unit = createValidUnit();
  // Artificially add a reverse link (should never be stored)
  unit.nodes[0].lessonIds = ['lesson-1'];

  const result = validateUnit(unit);
  assert.equal(result.valid, false, 'Should reject stored reverse link');
  assert.ok(result.errors.some((e) => e.includes('reverse link')), 'Error should mention reverse link');
});

test('validateUnit: node with edited:true but no original object is rejected', () => {
  const unit = createValidUnit();
  unit.nodes[1].edited = true;
  delete unit.nodes[1].original;

  const result = validateUnit(unit);
  assert.equal(result.valid, false, 'Should reject edited node without original');
  assert.ok(result.errors.some((e) => e.includes('INV-DM-2')), 'Error should cite INV-DM-2');
});

test('validateUnit: schema version higher than supported is refused', () => {
  const unit = createValidUnit();
  unit.schemaVersion = '2.0.0';

  const result = validateUnit(unit);
  assert.equal(result.valid, false, 'Should refuse higher schema version');
  assert.ok(result.errors[0].includes('newer than supported'), 'Error should mention version mismatch');
});

test('validateUnit: invalid resourceItem.kind is rejected', () => {
  const unit = createValidUnit();
  unit.resourcesPage.items[0].kind = 'invalid-kind';

  const result = validateUnit(unit);
  assert.equal(result.valid, false, 'Should reject invalid kind');
  assert.ok(result.errors.some((e) => e.includes('invalid kind')), 'Error should mention invalid kind');
});

test('validateUnit: cribSheet section with invalid half is rejected', () => {
  const unit = createValidUnit();
  unit.cribSheet.sections[0].half = 'center';

  const result = validateUnit(unit);
  assert.equal(result.valid, false, 'Should reject invalid half');
  assert.ok(result.errors.some((e) => e.includes('half')), 'Error should mention half');
});

test('validateUnit: missing singular objects is rejected', () => {
  const unit = createValidUnit();
  delete unit.cribSheet;

  const result = validateUnit(unit);
  assert.equal(result.valid, false, 'Should reject missing cribSheet');
  assert.ok(result.errors.some((e) => e.includes('cribSheet')), 'Error should mention cribSheet');
});

test('validateUnit: cribSheet pageCount not 1 or 2 is rejected', () => {
  const unit = createValidUnit();
  unit.cribSheet.pageCount = 3;

  const result = validateUnit(unit);
  assert.equal(result.valid, false, 'Should reject invalid pageCount');
  assert.ok(result.errors.some((e) => e.includes('pageCount')), 'Error should mention pageCount');
});

test('validateUnit: coverage with invalid value is rejected', () => {
  const unit = createValidUnit();
  unit.bigIdeas[0].coverage[0].coverage = 'maybe';

  const result = validateUnit(unit);
  assert.equal(result.valid, false, 'Should reject invalid coverage value');
  assert.ok(result.errors.some((e) => e.includes('INV-DM-22')), 'Error should cite INV-DM-22');
});

test('validateUnit: missing matrix tier is rejected', () => {
  const unit = createValidUnit();
  // Remove the intermediate tier from matrixTemplate
  const pass = unit.matrixTemplate.criteria.shift(); // Remove first (pass)
  unit.matrixTemplate.criteria = [pass]; // Only pass tier

  const result = validateUnit(unit);
  assert.equal(result.valid, false, 'Should reject incomplete tier coverage');
  assert.ok(result.errors.some((e) => e.includes('INV-DM-7')), 'Error should cite INV-DM-7');
});

test('LocalStore: hasUnsavedChanges returns false after load', () => {
  const store = new LocalStore(createFakeServerClient());
  store.unit = createValidUnit();
  store.lastSaved = JSON.stringify(store.unit);

  assert.equal(store.hasUnsavedChanges(), false, 'Should have no unsaved changes after load');
});

test('LocalStore: hasUnsavedChanges returns true after setData', () => {
  const store = new LocalStore(createFakeServerClient());
  store.unit = createValidUnit();
  store.lastSaved = JSON.stringify(store.unit);

  store.setData({ meta: { ...store.unit.meta, unitName: 'Modified' } });

  assert.equal(store.hasUnsavedChanges(), true, 'Should have unsaved changes after setData');
});

test('LocalStore: setData updates dateModified to current time', () => {
  const store = new LocalStore(createFakeServerClient());
  const unit = createValidUnit();
  store.unit = unit;
  store.lastSaved = JSON.stringify(store.unit);

  const beforeUpdate = new Date().toISOString();
  store.setData({ meta: { ...store.unit.meta, unitName: 'New Name' } });
  const afterUpdate = new Date().toISOString();

  const dateModified = store.unit.meta.dateModified;
  assert.ok(dateModified >= beforeUpdate && dateModified <= afterUpdate, 'dateModified should be current time');
});

test('LocalStore: onBeforeUnload warns when unsaved changes', () => {
  const store = new LocalStore(createFakeServerClient());
  store.unit = createValidUnit();
  store.lastSaved = JSON.stringify(store.unit);

  store.setData({ meta: { ...store.unit.meta, unitName: 'Modified' } });

  const event = { preventDefault: () => {}, returnValue: null };
  store.onBeforeUnload(event);

  assert.equal(event.returnValue, '', 'Should set returnValue to empty string (warning) when unsaved');
});

test('LocalStore: onBeforeUnload does not warn when no unsaved changes', () => {
  const store = new LocalStore(createFakeServerClient());
  store.unit = createValidUnit();
  store.lastSaved = JSON.stringify(store.unit);

  const event = { preventDefault: () => {}, returnValue: 'original' };
  store.onBeforeUnload(event);

  assert.equal(event.returnValue, 'original', 'Should not modify returnValue when no unsaved changes');
});

test('ServerClient: shows loading and error states on fetch failure', async () => {
  let loadingShown = false;
  let errorShown = false;
  let errorMessage = '';

  const client = new ServerClient(9999, {
    onLoading: () => {
      loadingShown = true;
    },
    onError: (msg) => {
      errorShown = true;
      errorMessage = msg;
    },
  });

  try {
    await client.load(); // Will fail because port 9999 is likely unreachable
  } catch {
    // Expected
  }

  assert.ok(loadingShown, 'Loading state should be shown');
  assert.ok(errorShown, 'Error state should be shown');
  assert.ok(errorMessage.length > 0, 'Error message should be provided');
});

test('LocalStore: round-trip save/load preserves data', async () => {
  const originalUnit = createValidUnit();
  const originalJson = JSON.stringify(originalUnit);

  // Mock the ServerClient to simulate save/load
  const mockClient = {
    savedUnit: null,
    async load() {
      return JSON.parse(JSON.stringify(this.savedUnit));
    },
    async save(unit) {
      this.savedUnit = JSON.parse(JSON.stringify(unit));
      return { status: 'ok' };
    },
  };

  const store = new LocalStore(mockClient);
  store.unit = originalUnit;

  // Save
  await store.saveUnit();

  // Create new store and load
  const store2 = new LocalStore(mockClient);
  await store2.loadUnit();

  // saveUnit() stamps meta.dateModified with the current time (AD-BOSS-2).
  // That stamp is expected to differ from the pre-save unit's timestamp, and
  // it can even differ from itself across a millisecond boundary if this
  // test happens to run right on one — so it is deliberately excluded from
  // the round-trip comparison. Everything else must be byte-identical.
  const originalForCompare = JSON.parse(originalJson);
  const loadedForCompare = JSON.parse(JSON.stringify(store2.unit));
  delete originalForCompare.meta.dateModified;
  delete loadedForCompare.meta.dateModified;

  assert.deepStrictEqual(
    loadedForCompare,
    originalForCompare,
    'Round-trip should preserve data exactly (excluding the save-time dateModified stamp)'
  );
  assert.equal(
    typeof store2.unit.meta.dateModified,
    'string',
    'Round-trip should still produce a dateModified stamp'
  );
});

test('validateUnit: node cycle is detected', () => {
  const unit = createValidUnit();
  // Create a cycle: node-child → node-root → node-child (artificially)
  unit.nodes[0].parentId = 'node-child';

  const result = validateUnit(unit);
  assert.equal(result.valid, false, 'Should reject cycle in tree');
  assert.ok(result.errors.some((e) => e.includes('cycle')), 'Error should mention cycle');
});

test('validateUnit: dangling bigIdea reference in lesson is rejected', () => {
  const unit = createValidUnit();
  unit.lessons[0].bigIdeaId = 'idea-nonexistent';

  const result = validateUnit(unit);
  assert.equal(result.valid, false, 'Should reject dangling bigIdeaId');
  assert.ok(result.errors.some((e) => e.includes('idea-nonexistent')), 'Error should name the bad id');
});

test('validateUnit: dangling topicId in bigIdea is rejected', () => {
  const unit = createValidUnit();
  unit.bigIdeas[0].topicId = 'topic-nonexistent';

  const result = validateUnit(unit);
  assert.equal(result.valid, false, 'Should reject dangling topicId');
  assert.ok(result.errors.some((e) => e.includes('topic-nonexistent')), 'Error should name the bad id');
});

// TEST-7 — OQ-BT-1 (RESOLVED 2026-08-29): zero nodes / zero criteria is a
// valid pre-ingest state; the tree/tier invariants bind only once nodes or
// criteria actually exist. Fixture matches bundle-template.build.spec.md
// FR-BT-2's skeleton (uses material/studentTask per Luke's D1, never
// prompt/task) — this is the exact shape !NewUnit stamps as a fresh bundle.
function createEmptySkeletonUnit() {
  return {
    schemaVersion: '1.0.0',
    generatedFrom: '',
    meta: {
      subject: '',
      level: '',
      unitName: '',
      teacher: '',
      dateCreated: null,
      dateModified: null,
    },
    curriculum: {
      profileId: '',
      name: '',
      jurisdiction: '',
      version: '',
      sourceRef: '',
      licence: '',
      attribution: '',
      labels: { strand: '', outcome: '', task: '' },
      description: null,
      ingestedAt: null,
    },
    nodes: [],
    topics: [],
    bigIdeas: [],
    lessons: [],
    cribSheet: {
      id: '',
      title: '',
      orientation: 'portrait',
      sections: [],
      pageCount: 1,
      provenance: 'manual',
    },
    resourcesPage: {
      id: '',
      items: [],
    },
    unitAssessment: {
      id: '',
      title: '',
      bigIdeaId: '',
      coverage: [],
      finalAssessment: {
        pass: { tier: 'pass', material: null, studentTask: null, workspaceLines: null, imageRefs: [] },
        intermediate: { tier: 'intermediate', material: null, studentTask: null, workspaceLines: null, imageRefs: [] },
        advanced: { tier: 'advanced', material: null, studentTask: null, workspaceLines: null, imageRefs: [] },
      },
      finalAssessmentCompleted: false,
      finalAssessmentDate: null,
      finalAssessmentPeriod: null,
      miniAssessments: [],
    },
    matrixTemplate: {
      orientation: 'portrait',
      criteria: [],
    },
    matrices: [],
    students: [],
    images: [],
  };
}

test('validateUnit: clean empty skeleton (fresh !NewUnit bundle) validates — OQ-BT-1', () => {
  const unit = createEmptySkeletonUnit();
  const result = validateUnit(unit);
  assert.equal(result.valid, true, `Empty pre-ingest skeleton should validate; got errors: ${JSON.stringify(result.errors)}`);
  assert.equal(result.errors.length, 0, 'Empty skeleton should have no errors');
});

test('validateUnit: populated unit with zero root nodes is still rejected (INV-DM-3 binds once nodes exist)', () => {
  const unit = createValidUnit();
  // Make every node a non-root by pointing node-root at its own child — no
  // node in the array has a null/absent parentId, so roots.length === 0.
  unit.nodes[0].parentId = 'node-child';
  unit.nodes[1].parentId = 'node-child';

  const result = validateUnit(unit);
  assert.equal(result.valid, false, 'A populated tree with zero roots must still be rejected');
  assert.ok(result.errors.some((e) => e.includes('INV-DM-3') && e.includes('found 0')), 'Error should cite INV-DM-3 with 0 roots found');
});

test('validateUnit: populated unit with two root nodes is still rejected (INV-DM-3 binds once nodes exist)', () => {
  const unit = createValidUnit();
  unit.nodes[1].parentId = null; // now both nodes are roots

  const result = validateUnit(unit);
  assert.equal(result.valid, false, 'A populated tree with two roots must still be rejected');
  assert.ok(result.errors.some((e) => e.includes('INV-DM-3') && e.includes('found 2')), 'Error should cite INV-DM-3 with 2 roots found');
});

test('validateUnit: empty matrixTemplate.criteria[] validates (INV-DM-7 pre-ingest reading)', () => {
  const unit = createValidUnit();
  unit.matrixTemplate.criteria = [];

  const result = validateUnit(unit);
  assert.equal(result.valid, true, `Empty matrixTemplate.criteria should validate; got errors: ${JSON.stringify(result.errors)}`);
});

test('validateUnit: populated matrixTemplate missing a tier is still rejected (INV-DM-7 binds once criteria exist)', () => {
  const unit = createValidUnit();
  // Keep only the "pass" criterion — intermediate and advanced are missing.
  unit.matrixTemplate.criteria = [unit.matrixTemplate.criteria[0]];

  const result = validateUnit(unit);
  assert.equal(result.valid, false, 'A populated matrixTemplate missing a tier must still be rejected');
  assert.ok(result.errors.some((e) => e.includes('INV-DM-7')), 'Error should cite INV-DM-7');
});
