// test_curriculum-editor.js — Unit tests for CurriculumEditor (FR-CEB-1 through FR-CEB-10)

import test from 'node:test';
import assert from 'node:assert';
import { CurriculumEditor } from '../app/js/curriculum-editor.js';

// Mock LocalStore for testing
class MockStore {
  constructor() {
    this.unit = {
      schemaVersion: '1.0.0',
      nodes: [],
      curriculum: {},
      lessons: [],
      bigIdeas: [],
      topics: [],
      unitAssessment: { miniAssessments: [] },
    };
  }

  async loadUnit() {
    // Already loaded
  }

  setData(partial) {
    Object.assign(this.unit, partial);
  }
}

test('curriculum-editor: imports successfully', (t) => {
  assert.strictEqual(typeof CurriculumEditor, 'function');
});

test('curriculum-editor: creates editor with mock store', (t) => {
  const store = new MockStore();
  const editor = new CurriculumEditor(store);
  editor.unit = store.unit;

  assert(editor instanceof CurriculumEditor);
  assert.deepEqual(editor.unit.nodes, []);
});

test('curriculum-editor: validates empty tree as valid (OQ-BT-1)', (t) => {
  const store = new MockStore();
  const editor = new CurriculumEditor(store);
  editor.unit = store.unit;

  const result = editor.validateTreeShape([]);
  assert.strictEqual(result.valid, true);
});

test('curriculum-editor: adds root node to empty tree (AC-CEB-1)', (t) => {
  const store = new MockStore();
  const editor = new CurriculumEditor(store);
  editor.unit = store.unit;

  const root = editor.addNode({
    kind: 'strand',
    title: 'Main Strand',
    text: 'Root description',
    parentId: null,
  });

  assert.strictEqual(root.kind, 'strand');
  assert.strictEqual(root.title, 'Main Strand');
  assert.strictEqual(root.edited, false);
  assert.strictEqual(editor.unit.nodes.length, 1);
});

test('curriculum-editor: builds tree from empty nodes[] (AC-CEB-1)', (t) => {
  const store = new MockStore();
  const editor = new CurriculumEditor(store);
  editor.unit = store.unit;

  // Add root
  const root = editor.addNode({
    kind: 'strand',
    title: 'Strand 1',
  });

  // Add two outcomes under root
  const outcome1 = editor.addNode({
    kind: 'outcome',
    title: 'Outcome 1.1',
    parentId: root.id,
  });

  const outcome2 = editor.addNode({
    kind: 'outcome',
    title: 'Outcome 1.2',
    parentId: root.id,
  });

  assert.strictEqual(editor.unit.nodes.length, 3);
  assert.strictEqual(outcome1.parentId, root.id);
  assert.strictEqual(outcome2.parentId, root.id);

  const validation = editor.validateTreeShape(editor.unit.nodes);
  assert.strictEqual(validation.valid, true);
});

test('curriculum-editor: edits node and snapshots original (AC-CEB-2)', (t) => {
  const store = new MockStore();
  const editor = new CurriculumEditor(store);
  editor.unit = store.unit;

  const node = editor.addNode({
    kind: 'strand',
    title: 'Original Title',
    text: 'Original text',
  });

  editor.editNode(node.id, { title: 'New Title' });

  const edited = editor.unit.nodes.find((n) => n.id === node.id);
  assert.strictEqual(edited.title, 'New Title');
  assert.strictEqual(edited.edited, true);
  assert.strictEqual(edited.original.title, 'Original Title');
});

test('curriculum-editor: edit does not overwrite original on second edit (AC-CEB-2)', (t) => {
  const store = new MockStore();
  const editor = new CurriculumEditor(store);
  editor.unit = store.unit;

  const node = editor.addNode({
    kind: 'strand',
    title: 'Original',
  });

  editor.editNode(node.id, { title: 'Edit 1' });
  const originalAfterFirst = editor.unit.nodes.find((n) => n.id === node.id).original.title;

  editor.editNode(node.id, { title: 'Edit 2' });
  const originalAfterSecond = editor.unit.nodes.find((n) => n.id === node.id).original.title;

  assert.strictEqual(originalAfterFirst, 'Original');
  assert.strictEqual(originalAfterSecond, 'Original');
});

test('curriculum-editor: re-parents task successfully (AC-CEB-3)', (t) => {
  const store = new MockStore();
  const editor = new CurriculumEditor(store);
  editor.unit = store.unit;

  const root = editor.addNode({ kind: 'strand', title: 'Strand' });
  const outcome1 = editor.addNode({ kind: 'outcome', title: 'Outcome 1', parentId: root.id });
  const outcome2 = editor.addNode({ kind: 'outcome', title: 'Outcome 2', parentId: root.id });
  const task = editor.addNode({ kind: 'task', title: 'Task', parentId: outcome1.id });

  assert.strictEqual(task.parentId, outcome1.id);

  editor.reparentNode(task.id, outcome2.id);
  const movedTask = editor.unit.nodes.find((n) => n.id === task.id);

  assert.strictEqual(movedTask.parentId, outcome2.id);
});

test('curriculum-editor: refuses cycle on re-parent (AC-CEB-4)', (t) => {
  const store = new MockStore();
  const editor = new CurriculumEditor(store);
  editor.unit = store.unit;

  const strand = editor.addNode({ kind: 'strand', title: 'Strand' });
  const outcome = editor.addNode({ kind: 'outcome', title: 'Outcome', parentId: strand.id });

  assert.throws(
    () => editor.reparentNode(strand.id, outcome.id),
    /cycle/i
  );
});

test('curriculum-editor: clears confidence on edit (AC-CEB-5)', (t) => {
  const store = new MockStore();
  const editor = new CurriculumEditor(store);
  editor.unit = store.unit;

  const node = editor.addNode({
    kind: 'strand',
    title: 'Node',
  });

  editor.unit.nodes[0].confidence = 'low';

  editor.editNode(node.id, { text: 'Updated text' });
  const edited = editor.unit.nodes.find((n) => n.id === node.id);

  assert.strictEqual(edited.confidence, undefined);
});

test('curriculum-editor: edits strand domain (AC-CEB-6)', (t) => {
  const store = new MockStore();
  const editor = new CurriculumEditor(store);
  editor.unit = store.unit;

  const strand = editor.addNode({ kind: 'strand', title: 'Strand' });

  editor.editStrandDomain(strand.id, 'skill');
  const updated = editor.unit.nodes.find((n) => n.id === strand.id);

  assert.strictEqual(updated.domain, 'skill');
});

test('curriculum-editor: checks node references (AC-CEB-10)', (t) => {
  const store = new MockStore();
  const editor = new CurriculumEditor(store);
  editor.unit = store.unit;

  const node = editor.addNode({ kind: 'strand', title: 'Node' });

  // Add a lesson referencing this node
  editor.unit.lessons.push({
    id: 'lesson-1',
    number: 1,
    nodeIds: [node.id],
  });

  const references = editor.checkNodeReferences(node.id, editor.unit);
  assert.strictEqual(references.length, 1);
  assert(references[0].includes('Lesson'));
});

test('curriculum-editor: refuses delete of referenced node (AC-CEB-10)', (t) => {
  const store = new MockStore();
  const editor = new CurriculumEditor(store);
  editor.unit = store.unit;

  const node = editor.addNode({ kind: 'strand', title: 'Node' });
  editor.unit.lessons.push({
    id: 'lesson-1',
    number: 1,
    nodeIds: [node.id],
  });

  const result = editor.deleteNode(node.id);
  assert.strictEqual(result.success, false);
  assert(result.message.includes('referenced'));
});

test('curriculum-editor: deletes unreferenced childless node immediately (AC-CEB-11)', (t) => {
  const store = new MockStore();
  const editor = new CurriculumEditor(store);
  editor.unit = store.unit;

  const root = editor.addNode({ kind: 'strand', title: 'Root' });
  const task = editor.addNode({ kind: 'task', title: 'Task', parentId: root.id });

  const result = editor.deleteNode(task.id);
  assert.strictEqual(result.success, true);
  assert.strictEqual(editor.unit.nodes.length, 1); // Only root remains
});

test('curriculum-editor: requires cascade confirmation for node with descendants (AC-CEB-11)', (t) => {
  const store = new MockStore();
  const editor = new CurriculumEditor(store);
  editor.unit = store.unit;

  const root = editor.addNode({ kind: 'strand', title: 'Root' });
  const outcome = editor.addNode({ kind: 'outcome', title: 'Outcome', parentId: root.id });

  const result = editor.deleteNode(root.id, false);
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.requiresConfirmation, true);
});

test('curriculum-editor: deletes node and descendants with confirmation', (t) => {
  const store = new MockStore();
  const editor = new CurriculumEditor(store);
  editor.unit = store.unit;

  const root = editor.addNode({ kind: 'strand', title: 'Root' });
  const outcome = editor.addNode({ kind: 'outcome', title: 'Outcome', parentId: root.id });

  const result = editor.deleteNode(root.id, true);
  assert.strictEqual(result.success, true);
  assert.strictEqual(editor.unit.nodes.length, 0);
});

test('curriculum-editor: edits curriculum description', (t) => {
  const store = new MockStore();
  const editor = new CurriculumEditor(store);
  editor.unit = store.unit;

  editor.editCurriculumDescription('Test description');
  assert.strictEqual(editor.unit.curriculum.description, 'Test description');

  editor.editCurriculumDescription(null);
  assert.strictEqual(editor.unit.curriculum.description, null);
});

test('curriculum-editor: edits curriculum labels regardless of profile', (t) => {
  const store = new MockStore();
  const editor = new CurriculumEditor(store);
  editor.unit = store.unit;
  editor.unit.curriculum.profileId = 'generic';

  editor.editCurriculumLabels({ strand: 'Domain', outcome: 'Concept', task: 'Activity' });

  assert.strictEqual(editor.unit.curriculum.labels.strand, 'Domain');
  assert.strictEqual(editor.unit.curriculum.labels.outcome, 'Concept');
  assert.strictEqual(editor.unit.curriculum.labels.task, 'Activity');
});
