/**
 * test_unit-assessment-document.js — Smoke tests for assessment document
 *
 * Uses node:test (stdlib), no external dependencies.
 * Tests: import, happy-path create final/mini, guards (delete refusal, missing-big-idea).
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { UnitAssessmentDocument } from '../app/js/unit-assessment-document.js';
import { newId } from '../app/js/ids.js';
import { findReferencingLessons } from '../app/js/assessment-lesson-links.js';
import { deleteAssessment } from '../app/js/mini-assessment-manager.js';
import { LocalStore } from '../app/js/local-store.js';

// ===== Mock DOM Environment =====
class MockSVGElement {
  constructor(tag) {
    this.tag = tag;
    this.attributes = {};
    this.children = [];
    this.classList = new Set();
    this.textContent = '';
    this.innerHTML = '';
    this.outerHTML = `<${tag}></${tag}>`;
  }

  setAttribute(name, value) {
    this.attributes[name] = value;
  }

  getAttribute(name) {
    return this.attributes[name];
  }

  setAttributeNS(ns, name, value) {
    this.attributes[`${ns}:${name}`] = value;
  }

  getAttributeNS(ns, name) {
    return this.attributes[`${ns}:${name}`];
  }

  appendChild(child) {
    if (child) this.children.push(child);
  }

  remove() {}
  replaceChild() {}
}

global.document = {
  createElementNS: (ns, tag) => new MockSVGElement(tag),
};

// Real DOM .textContent is recursive (includes descendant text, e.g. <tspan>
// children used for manual SVG word-wrap); this mock's is a flat property,
// so tests that need to see wrapped text walk the tree themselves.
function textOf(el) {
  let out = el.textContent || '';
  for (const child of el.children || []) {
    out += textOf(child);
  }
  return out;
}

// ===== Fixture Data =====
const FIXTURE_BIG_IDEAS = [
  { id: 'bi-test001', title: 'Photosynthesis', parentId: null, order: 0, coverage: [] },
  { id: 'bi-test002', title: 'Energy', parentId: 'bi-test001', order: 0, coverage: [] },
];

const FIXTURE_NODES = [
  { id: 'node-test001', code: 'BIO-1', title: 'Cellular respiration', kind: 'outcome' },
  { id: 'node-test002', code: 'BIO-2', title: 'Photosynthesis process', kind: 'task' },
];

const FIXTURE_LESSONS = [
  {
    id: 'les-test001',
    number: 1,
    name: 'Intro to Energy',
    assessmentLink: {
      finalAssessment: true,
      miniAssessmentIds: ['mini-test001'],
      note: '',
    },
  },
  {
    id: 'les-test002',
    number: 2,
    name: 'Energy Transfer',
    assessmentLink: {
      finalAssessment: false,
      miniAssessmentIds: [],
      note: '',
    },
  },
];

const FIXTURE_FINAL_ASSESSMENT = {
  bigIdeaId: 'bi-test001',
  coverage: [
    { nodeId: 'node-test001', coverage: 'full', note: 'Core concept' },
  ],
  tiers: {
    pass: { material: 'Describe the process', studentTask: 'Draw a diagram', workspaceLines: 5, imageRefs: [] },
    intermediate: { material: '', studentTask: '', workspaceLines: 0, imageRefs: [] },
    advanced: { material: '', studentTask: '', workspaceLines: 0, imageRefs: [] },
  },
};

const FIXTURE_MINI_ASSESSMENTS = [
  {
    id: 'mini-test001',
    name: 'Mini 1: Early Concepts',
    bigIdeaId: 'bi-test002',
    coverage: [],
    order: 0,
    tiers: {
      pass: { material: '', studentTask: '', workspaceLines: 0, imageRefs: [] },
      intermediate: { material: '', studentTask: '', workspaceLines: 0, imageRefs: [] },
      advanced: { material: '', studentTask: '', workspaceLines: 0, imageRefs: [] },
    },
  },
];

// ===== Tests =====
test('UnitAssessmentDocument imports cleanly', () => {
  assert.ok(UnitAssessmentDocument, 'class should be defined');
  assert.equal(typeof UnitAssessmentDocument, 'function', 'should be a constructor');
});

test('UnitAssessmentDocument: happy-path final assessment render', () => {
  const unitAssessment = {
    finalAssessment: FIXTURE_FINAL_ASSESSMENT,
    miniAssessments: FIXTURE_MINI_ASSESSMENTS,
  };

  const doc = new UnitAssessmentDocument(
    unitAssessment,
    FIXTURE_LESSONS,
    FIXTURE_BIG_IDEAS,
    FIXTURE_NODES,
    'final',
    0
  );

  assert.ok(doc, 'document should construct');
  assert.equal(doc.getAssessmentKind(), 'final', 'kind should be final');
  assert.equal(doc.getAssessment(), FIXTURE_FINAL_ASSESSMENT, 'should return final assessment');

  // Render into mock SVG
  const svg = new MockSVGElement('svg');
  doc.render(svg);

  assert.ok(svg.children.length > 0, 'should render content');
  assert.ok(
    svg.children.some(el => el.textContent && el.textContent.includes('Final Assessment')),
    'should render title'
  );
});

test('UnitAssessmentDocument: mini assessment render', () => {
  const unitAssessment = {
    finalAssessment: FIXTURE_FINAL_ASSESSMENT,
    miniAssessments: FIXTURE_MINI_ASSESSMENTS,
  };

  const doc = new UnitAssessmentDocument(
    unitAssessment,
    FIXTURE_LESSONS,
    FIXTURE_BIG_IDEAS,
    FIXTURE_NODES,
    'mini',
    0
  );

  assert.equal(doc.getAssessmentKind(), 'mini', 'kind should be mini');
  assert.equal(doc.getAssessment(), FIXTURE_MINI_ASSESSMENTS[0], 'should return first mini');
});

test('UnitAssessmentDocument: guard - missing big idea', () => {
  const assessmentNoBigIdea = {
    ...FIXTURE_FINAL_ASSESSMENT,
    bigIdeaId: null,
  };

  const unitAssessment = {
    finalAssessment: assessmentNoBigIdea,
    miniAssessments: [],
  };

  // In a real save scenario, validation would refuse this
  // For now, just test that the renderer handles null gracefully
  const doc = new UnitAssessmentDocument(
    unitAssessment,
    [],
    [],
    [],
    'final'
  );

  const svg = new MockSVGElement('svg');
  assert.doesNotThrow(() => {
    doc.render(svg);
  }, 'should not crash on missing big idea');
});

test('assessment-lesson-links: findReferencingLessons for final', () => {
  const refs = findReferencingLessons('final', 'final', FIXTURE_LESSONS);
  assert.equal(refs.length, 1, 'should find 1 lesson referencing final assessment');
  assert.equal(refs[0].number, 1, 'should be lesson 1');
});

test('assessment-lesson-links: findReferencingLessons for mini', () => {
  const refs = findReferencingLessons('mini-test001', 'mini', FIXTURE_LESSONS);
  assert.equal(refs.length, 1, 'should find 1 lesson referencing mini');
  assert.equal(refs[0].number, 1, 'should be lesson 1');
});

test('assessment-lesson-links: no references returns empty array', () => {
  const refs = findReferencingLessons('mini-nonexistent', 'mini', FIXTURE_LESSONS);
  assert.equal(refs.length, 0, 'should return empty array');
});

test('UnitAssessmentDocument: exportSVG generates valid SVG markup', () => {
  const unitAssessment = {
    finalAssessment: FIXTURE_FINAL_ASSESSMENT,
    miniAssessments: [],
  };

  const doc = new UnitAssessmentDocument(
    unitAssessment,
    FIXTURE_LESSONS,
    FIXTURE_BIG_IDEAS,
    FIXTURE_NODES,
    'final'
  );

  const svgMarkup = doc.exportSVG();
  assert.ok(typeof svgMarkup === 'string', 'exportSVG should return string');
  assert.ok(svgMarkup.includes('<svg'), 'should include svg tag');
});

test('UnitAssessmentDocument: setData updates internal state', () => {
  const unitAssessment = {
    finalAssessment: FIXTURE_FINAL_ASSESSMENT,
    miniAssessments: [],
  };

  const doc = new UnitAssessmentDocument(unitAssessment);
  const newAssessment = { ...FIXTURE_FINAL_ASSESSMENT, tiers: {} };
  const newUnit = { finalAssessment: newAssessment, miniAssessments: [] };

  doc.setData(newUnit);
  assert.equal(doc.unitAssessment, newUnit, 'should update internal state');
});

// ===== ID Generation Guard =====
test('newId generates unique IDs with correct prefix', () => {
  const id1 = newId('mini');
  const id2 = newId('mini');

  assert.ok(id1.startsWith('mini-'), 'should have correct prefix');
  assert.ok(id2.startsWith('mini-'), 'should have correct prefix');
  assert.notEqual(id1, id2, 'should be unique');
});

// ===== Coverage Structure Guard =====
test('assessment coverage array structure is correct', () => {
  const assessment = FIXTURE_FINAL_ASSESSMENT;
  assert.ok(Array.isArray(assessment.coverage), 'coverage should be array');

  for (const link of assessment.coverage) {
    assert.ok(link.nodeId, 'each link should have nodeId');
    assert.ok(['full', 'partial'].includes(link.coverage), 'coverage should be full or partial');
    assert.equal(typeof link.note, 'string', 'note should be string');
  }
});

// ===== Tier Structure Guard =====
test('assessment tiers have required structure', () => {
  const assessment = FIXTURE_FINAL_ASSESSMENT;
  const tiers = ['pass', 'intermediate', 'advanced'];

  for (const tierKey of tiers) {
    const tier = assessment.tiers[tierKey];
    assert.ok(tier, `${tierKey} tier should exist`);
    assert.equal(typeof tier.material, 'string', 'material should be string');
    assert.equal(typeof tier.studentTask, 'string', 'studentTask should be string');
    assert.equal(typeof tier.workspaceLines, 'number', 'workspaceLines should be number');
    assert.ok(Array.isArray(tier.imageRefs), 'imageRefs should be array');
  }
});

// ===== No Reverse Edge Test (INV-DM-12) =====
test('assessment should not store lessonIds reverse field', () => {
  const assessment = FIXTURE_FINAL_ASSESSMENT;
  assert.ok(!('lessonIds' in assessment), 'assessment should not have lessonIds field');
});

// ===== Mini Assessment Order Guard =====
test('mini assessment order is explicit, not array position', () => {
  const minis = FIXTURE_MINI_ASSESSMENTS;
  for (const mini of minis) {
    assert.equal(typeof mini.order, 'number', 'order should be explicit number, not array position');
  }
});

// ===== D1: material/studentTask save/load round-trip (blocker fix) =====
// Builds a minimal valid unit matching the schema in unit.json / datamodel spec:
// unitAssessment.finalAssessment IS the tier map (pass/intermediate/advanced
// directly, no .tiers wrapper); each miniAssessment carries an explicit .tiers.
function createValidUnitForAssessment() {
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
      labels: { strand: 'Strand', outcome: 'Outcome', task: 'Task' },
      ingestedAt: new Date().toISOString(),
    },
    nodes: [
      { id: 'node-root', code: 'C1', title: 'Root', text: 'Root node', kind: 'strand', parentId: null, confidence: 'high', edited: false, domain: 'skill' },
    ],
    topics: [],
    bigIdeas: [
      { id: 'idea-1', title: 'Big Idea 1', text: '', parentId: null, order: 1, topicId: null, coverage: [] },
    ],
    lessons: [],
    cribSheet: { id: 'crib-1', title: 'Crib Sheet', orientation: 'portrait', sections: [], pageCount: 1, provenance: 'manual' },
    resourcesPage: { id: 'resources-1', items: [] },
    unitAssessment: {
      id: 'ua-1',
      title: 'Unit Assessment',
      bigIdeaId: 'idea-1',
      coverage: [],
      finalAssessment: {
        pass: { tier: 'pass', material: 'Read the source excerpt', studentTask: 'Answer the three questions', workspaceLines: 5, imageRefs: [] },
        intermediate: { tier: 'intermediate', material: null, studentTask: null, workspaceLines: null, imageRefs: [] },
        advanced: { tier: 'advanced', material: null, studentTask: null, workspaceLines: null, imageRefs: [] },
      },
      finalAssessmentCompleted: false,
      finalAssessmentDate: null,
      finalAssessmentPeriod: null,
      miniAssessments: [
        {
          id: 'mini-1',
          name: 'Mini 1',
          weighting: null,
          bigIdeaId: 'idea-1',
          coverage: [],
          tiers: {
            pass: { tier: 'pass', material: 'Mini material text', studentTask: 'Mini student task text', workspaceLines: 3, imageRefs: [] },
            intermediate: { tier: 'intermediate', material: null, studentTask: null, workspaceLines: null, imageRefs: [] },
            advanced: { tier: 'advanced', material: null, studentTask: null, workspaceLines: null, imageRefs: [] },
          },
          order: 0,
        },
      ],
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

test('D1: assessment material/studentTask survive a save -> load round-trip through local-store', async () => {
  const originalUnit = createValidUnitForAssessment();

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
  await store.saveUnit();

  const store2 = new LocalStore(mockClient);
  await store2.loadUnit();

  const loadedFinalPass = store2.unit.unitAssessment.finalAssessment.pass;
  assert.equal(loadedFinalPass.material, 'Read the source excerpt', 'final assessment material should survive round-trip');
  assert.equal(loadedFinalPass.studentTask, 'Answer the three questions', 'final assessment studentTask should survive round-trip');
  assert.equal(loadedFinalPass.prompt, undefined, 'no stray .prompt field should exist after round-trip');
  assert.equal(loadedFinalPass.task, undefined, 'no stray .task field should exist after round-trip');

  const loadedMiniPass = store2.unit.unitAssessment.miniAssessments[0].tiers.pass;
  assert.equal(loadedMiniPass.material, 'Mini material text', 'mini assessment material should survive round-trip');
  assert.equal(loadedMiniPass.studentTask, 'Mini student task text', 'mini assessment studentTask should survive round-trip');

  // Confirm the renderer actually reads material/studentTask off the loaded, real-schema data.
  const doc = new UnitAssessmentDocument(store2.unit.unitAssessment, [], store2.unit.bigIdeas, store2.unit.nodes, 'final');
  const svg = new MockSVGElement('svg');
  doc.render(svg);
  assert.ok(
    svg.children.some(el => textOf(el).includes('Read the source excerpt')),
    'renderer should draw the round-tripped material text'
  );
  assert.ok(
    svg.children.some(el => textOf(el).includes('Answer the three questions')),
    'renderer should draw the round-tripped studentTask text'
  );
});

// ===== MINOR: final-assessment delete guard is data-layer, not UI-only =====
test('deleteAssessment: refuses to delete the final assessment', () => {
  const unitAssessment = {
    finalAssessment: { pass: {}, intermediate: {}, advanced: {} },
    miniAssessments: [{ id: 'mini-1', name: 'Mini 1' }],
  };

  const result = deleteAssessment(unitAssessment, 'final');
  assert.equal(result.ok, false, 'deleting the final assessment should be refused');
  assert.ok(result.reason && result.reason.length > 0, 'refusal should include a reason');
  assert.ok(unitAssessment.finalAssessment, 'finalAssessment should be untouched');
});

test('deleteAssessment: permits deleting a mini assessment', () => {
  const unitAssessment = {
    finalAssessment: { pass: {}, intermediate: {}, advanced: {} },
    miniAssessments: [{ id: 'mini-1', name: 'Mini 1' }, { id: 'mini-2', name: 'Mini 2' }],
  };

  const result = deleteAssessment(unitAssessment, 'mini', 'mini-1');
  assert.equal(result.ok, true, 'deleting a mini assessment should be permitted');
  assert.equal(unitAssessment.miniAssessments.length, 1, 'the mini assessment should be removed');
  assert.equal(unitAssessment.miniAssessments[0].id, 'mini-2', 'the remaining mini should be the other one');
});
