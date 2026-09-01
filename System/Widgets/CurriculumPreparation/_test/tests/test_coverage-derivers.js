// test_coverage-derivers.js — Unit tests for coverage derivation (FR-ATB-4/7/8/9)

import test from 'node:test';
import assert from 'node:assert';
import {
  deriveLessonCoverage,
  deriveAssessmentCoverage,
  deriveTopicCoverage,
  deriveBigIdeaCoverage,
  hasCoverageType,
  getCoverageByType
} from '../app/js/coverage-derivers.js';

test('coverage-derivers: imports successfully', (t) => {
  assert.strictEqual(typeof deriveLessonCoverage, 'function');
  assert.strictEqual(typeof deriveAssessmentCoverage, 'function');
  assert.strictEqual(typeof deriveTopicCoverage, 'function');
  assert.strictEqual(typeof deriveBigIdeaCoverage, 'function');
});

test('coverage-derivers: deriveLessonCoverage marks covered nodes', (t) => {
  const nodes = [
    { id: 'node1' },
    { id: 'node2' },
    { id: 'node3' }
  ];
  const lessons = [
    { id: 'lesson1', nodeIds: ['node1', 'node2'] }
  ];

  const coverage = deriveLessonCoverage(nodes, lessons);
  assert.strictEqual(coverage.get('node1'), true);
  assert.strictEqual(coverage.get('node2'), true);
  assert.strictEqual(coverage.get('node3'), false);
});

test('coverage-derivers: deriveLessonCoverage handles empty lessons', (t) => {
  const nodes = [
    { id: 'node1' }
  ];
  const lessons = [];

  const coverage = deriveLessonCoverage(nodes, lessons);
  assert.strictEqual(coverage.get('node1'), false);
});

test('coverage-derivers: deriveLessonCoverage handles no lessons', (t) => {
  const nodes = [
    { id: 'node1' }
  ];

  const coverage = deriveLessonCoverage(nodes, undefined);
  assert.strictEqual(coverage.get('node1'), false);
});

test('coverage-derivers: deriveAssessmentCoverage includes major + mini assessments', (t) => {
  const nodes = [
    { id: 'node1' },
    { id: 'node2' }
  ];
  const unitAssessment = {
    majorAssessment: {
      id: 'major1',
      title: 'Major Test',
      coverage: [
        { nodeId: 'node1', coverage: 'full' }
      ]
    },
    miniAssessments: [
      {
        id: 'mini1',
        title: 'Mini Quiz',
        coverage: [
          { nodeId: 'node2', coverage: 'partial' }
        ]
      }
    ]
  };

  const coverage = deriveAssessmentCoverage(nodes, unitAssessment);
  assert.strictEqual(coverage.get('node1').length, 1);
  assert.strictEqual(coverage.get('node1')[0].coverage, 'full');
  assert.strictEqual(coverage.get('node2').length, 1);
  assert.strictEqual(coverage.get('node2')[0].coverage, 'partial');
});

test('coverage-derivers: deriveAssessmentCoverage handles missing assessments', (t) => {
  const nodes = [
    { id: 'node1' }
  ];
  const unitAssessment = {};

  const coverage = deriveAssessmentCoverage(nodes, unitAssessment);
  assert.strictEqual(coverage.get('node1').length, 0);
});

test('coverage-derivers: deriveTopicCoverage indexes by node', (t) => {
  const nodes = [
    { id: 'node1' },
    { id: 'node2' }
  ];
  const topics = [
    {
      id: 'topic1',
      title: 'Reading Comprehension',
      coverage: [
        { nodeId: 'node1', coverage: 'full' },
        { nodeId: 'node2', coverage: 'partial' }
      ]
    }
  ];

  const coverage = deriveTopicCoverage(nodes, topics);
  assert.strictEqual(coverage.get('node1').length, 1);
  assert.strictEqual(coverage.get('node1')[0].name, 'Reading Comprehension');
  assert.strictEqual(coverage.get('node2').length, 1);
  assert.strictEqual(coverage.get('node2')[0].coverage, 'partial');
});

test('coverage-derivers: deriveTopicCoverage handles no topics', (t) => {
  const nodes = [
    { id: 'node1' }
  ];

  const coverage = deriveTopicCoverage(nodes, []);
  assert.strictEqual(coverage.get('node1').length, 0);
});

test('coverage-derivers: deriveBigIdeaCoverage indexes by node', (t) => {
  const nodes = [
    { id: 'node1' },
    { id: 'node2' }
  ];
  const bigIdeas = [
    {
      id: 'bi1',
      title: 'Character Analysis',
      coverage: [
        { nodeId: 'node1', coverage: 'full' }
      ]
    },
    {
      id: 'bi2',
      title: 'Plot Structure',
      coverage: [
        { nodeId: 'node2', coverage: 'partial' }
      ]
    }
  ];

  const coverage = deriveBigIdeaCoverage(nodes, bigIdeas);
  assert.strictEqual(coverage.get('node1').length, 1);
  assert.strictEqual(coverage.get('node1')[0].name, 'Character Analysis');
  assert.strictEqual(coverage.get('node2').length, 1);
  assert.strictEqual(coverage.get('node2')[0].coverage, 'partial');
});

test('coverage-derivers: deriveBigIdeaCoverage handles no ideas', (t) => {
  const nodes = [
    { id: 'node1' }
  ];

  const coverage = deriveBigIdeaCoverage(nodes, []);
  assert.strictEqual(coverage.get('node1').length, 0);
});

test('coverage-derivers: hasCoverageType finds full coverage', (t) => {
  const coverage = [
    { coverage: 'full', name: 'Big Idea 1' }
  ];

  assert.strictEqual(hasCoverageType(coverage, 'full'), true);
  assert.strictEqual(hasCoverageType(coverage, 'partial'), false);
});

test('coverage-derivers: hasCoverageType finds partial coverage', (t) => {
  const coverage = [
    { coverage: 'partial', name: 'Big Idea 1' }
  ];

  assert.strictEqual(hasCoverageType(coverage, 'partial'), true);
  assert.strictEqual(hasCoverageType(coverage, 'full'), false);
});

test('coverage-derivers: hasCoverageType handles empty array', (t) => {
  const coverage = [];

  assert.strictEqual(hasCoverageType(coverage, 'full'), false);
});

test('coverage-derivers: getCoverageByType filters by type', (t) => {
  const coverage = [
    { coverage: 'full', name: 'Big Idea 1' },
    { coverage: 'partial', name: 'Big Idea 2' },
    { coverage: 'full', name: 'Big Idea 3' }
  ];

  const fullOnly = getCoverageByType(coverage, 'full');
  assert.strictEqual(fullOnly.length, 2);
  assert.strictEqual(fullOnly[0].name, 'Big Idea 1');
  assert.strictEqual(fullOnly[1].name, 'Big Idea 3');
});

test('coverage-derivers: getCoverageByType handles empty array', (t) => {
  const coverage = [];
  const result = getCoverageByType(coverage, 'full');
  assert.deepStrictEqual(result, []);
});

test('coverage-derivers: three independent chip types on one node', (t) => {
  // Test AC-ATB-6: node taught but unassessed shows taught chip; assessed but untaught shows assessed chip
  const nodes = [
    { id: 'node1' },
    { id: 'node2' },
    { id: 'node3' }
  ];

  // Node1: taught (lesson) but not assessed
  const lessonCov = deriveLessonCoverage(nodes, [
    { id: 'lesson1', nodeIds: ['node1'] }
  ]);

  // Node2: assessed but not taught
  const assessCov = deriveAssessmentCoverage(nodes, {
    majorAssessment: {
      id: 'major1',
      coverage: [
        { nodeId: 'node2', coverage: 'full' }
      ]
    }
  });

  // Node3: both taught and assessed
  const node3Lesson = deriveLessonCoverage(nodes, [
    { id: 'lesson1', nodeIds: ['node3'] }
  ]);
  const node3Assess = deriveAssessmentCoverage(nodes, {
    majorAssessment: {
      id: 'major1',
      coverage: [
        { nodeId: 'node3', coverage: 'full' }
      ]
    }
  });

  // Verify independence
  assert.strictEqual(lessonCov.get('node1'), true); // Has lesson coverage
  assert.strictEqual(assessCov.get('node1').length, 0); // No assessment coverage

  assert.strictEqual(lessonCov.get('node2'), false); // No lesson coverage
  assert.strictEqual(assessCov.get('node2').length, 1); // Has assessment coverage

  assert.strictEqual(node3Lesson.get('node3'), true); // Has lesson coverage
  assert.strictEqual(node3Assess.get('node3').length, 1); // Has assessment coverage
});

test('coverage-derivers: topic-only chip (AC-ATB-7)', (t) => {
  // Node with topic coverage but no big-idea or assessment coverage
  const nodes = [
    { id: 'node1' }
  ];

  const topicCov = deriveTopicCoverage(nodes, [
    {
      id: 'topic1',
      title: 'Reading',
      coverage: [
        { nodeId: 'node1', coverage: 'full' }
      ]
    }
  ]);

  const biCov = deriveBigIdeaCoverage(nodes, []);
  const assessCov = deriveAssessmentCoverage(nodes, {});

  // Verify only topic chip should appear
  assert.strictEqual(topicCov.get('node1').length, 1);
  assert.strictEqual(biCov.get('node1').length, 0);
  assert.strictEqual(assessCov.get('node1').length, 0);
});
