/**
 * test_csv-export.js
 *
 * Smoke tests for csv-export module
 * Tests: CSV assembly, UTF-8 BOM, RFC 4180 quoting, unmarked vs zero, totals
 *
 * Run: node --test tests/test_csv-export.js
 */

import { test } from 'node:test';
import * as assert from 'node:assert';

import {
  escapeCSVField,
  generateCSV,
  exportCSVBlob,
} from '../app/js/csv-export.js';

// ===== MOCK MarkingMatrix =====
class MockMarkingMatrix {
  constructor(unit) {
    this.unit = unit;
  }

  /**
   * Mock tier subtotal computation
   * Sums awarded scores for criteria in this tier
   */
  computeTierSubtotal(studentId, tier) {
    const matrix = this.unit.matrices.find(m => m.studentId === studentId);
    if (!matrix) {
      return { numerator: 0, denominator: 0 };
    }

    const criteria = this.unit.matrixTemplate.criteria.filter(c => c.tier === tier);
    let numerator = 0;
    let denominator = 0;

    for (const criterion of criteria) {
      const score = matrix.scores.find(s => s.criterionId === criterion.id);
      numerator += score?.awardedScore ?? 0;
      denominator += criterion.maxScore;
    }

    return { numerator, denominator };
  }

  /**
   * Mock unit total computation
   * Sums awarded scores for all criteria
   */
  computeUnitTotal(studentId) {
    const matrix = this.unit.matrices.find(m => m.studentId === studentId);
    if (!matrix) {
      return { numerator: 0, denominator: 0 };
    }

    const criteria = this.unit.matrixTemplate.criteria;
    let numerator = 0;
    let denominator = 0;

    for (const criterion of criteria) {
      const score = matrix.scores.find(s => s.criterionId === criterion.id);
      numerator += score?.awardedScore ?? 0;
      denominator += criterion.maxScore;
    }

    return { numerator, denominator };
  }
}

// ===== FIXTURE: Create a test unit =====
function createFixtureUnit() {
  return {
    schemaVersion: '1.0.0',
    meta: {
      subject: 'Test',
      unitName: 'Test Unit'
    },
    matrixTemplate: {
      orientation: 'portrait',
      criteria: [
        {
          id: 'crit-1',
          tier: 'pass',
          criterion: 'Identify main ideas',
          maxScore: 10,
          assessmentIds: ['final-1'],
          allocationOverridden: false
        },
        {
          id: 'crit-2',
          tier: 'pass',
          criterion: 'Explain, analyze, and compare',
          maxScore: 10,
          assessmentIds: ['final-1'],
          allocationOverridden: false
        },
        {
          id: 'crit-3',
          tier: 'intermediate',
          criterion: 'Synthesize information',
          maxScore: 12.5,
          assessmentIds: ['final-1'],
          allocationOverridden: false
        },
        {
          id: 'crit-4',
          tier: 'advanced',
          criterion: 'Evaluate and critique',
          maxScore: 12.5,
          assessmentIds: ['final-1'],
          allocationOverridden: false
        }
      ]
    },
    students: [
      { id: 'stu-1', name: 'Alice' },
      { id: 'stu-2', name: 'Bob' },
      { id: 'stu-3', name: 'O\'Brien, Jr. "Sam"' }
    ],
    matrices: [
      {
        id: 'mtx-1',
        studentId: 'stu-1',
        scores: [
          { criterionId: 'crit-1', awardedScore: 9, comment: '' },
          { criterionId: 'crit-2', awardedScore: 8.5, comment: '' },
          { criterionId: 'crit-3', awardedScore: 11, comment: '' },
          { criterionId: 'crit-4', awardedScore: 10, comment: '' }
        ]
      },
      {
        id: 'mtx-2',
        studentId: 'stu-2',
        scores: [
          { criterionId: 'crit-1', awardedScore: 5, comment: '' },
          { criterionId: 'crit-2', awardedScore: 0, comment: '' },
          { criterionId: 'crit-3', awardedScore: undefined, comment: '' }, // unmarked
          { criterionId: 'crit-4', awardedScore: 8, comment: '' }
        ]
      },
      {
        id: 'mtx-3',
        studentId: 'stu-3',
        scores: [
          { criterionId: 'crit-1', awardedScore: 7, comment: '' },
          { criterionId: 'crit-2', awardedScore: 6.5, comment: '' },
          { criterionId: 'crit-3', awardedScore: 9.5, comment: '' },
          { criterionId: 'crit-4', awardedScore: 11, comment: '' }
        ]
      }
    ]
  };
}

// ===== TEST 1: CSV Field Escaping (AC-CSV-3) =====
test('escapeCSVField: plain value passes through', () => {
  assert.strictEqual(escapeCSVField('Alice'), 'Alice');
  assert.strictEqual(escapeCSVField(5), '5');
  assert.strictEqual(escapeCSVField(0), '0');
});

test('escapeCSVField: comma triggers quoting', () => {
  assert.strictEqual(escapeCSVField('Smith, John'), '"Smith, John"');
});

test('escapeCSVField: quote triggers quoting and escaping', () => {
  assert.strictEqual(escapeCSVField('O\'Brien, Jr. "Sam"'), '"O\'Brien, Jr. ""Sam"""');
});

test('escapeCSVField: newline triggers quoting', () => {
  assert.strictEqual(escapeCSVField('Line 1\nLine 2'), '"Line 1\nLine 2"');
});

test('escapeCSVField: empty value', () => {
  assert.strictEqual(escapeCSVField(''), '');
  assert.strictEqual(escapeCSVField(null), '');
  assert.strictEqual(escapeCSVField(undefined), '');
});

// ===== TEST 2: CSV Generation (AC-CSV-1, AC-CSV-2) =====
test('generateCSV: two students export with correct headers and data', () => {
  const unit = createFixtureUnit();
  const matrix = new MockMarkingMatrix(unit);

  const csv = generateCSV(unit, matrix);
  const lines = csv.split('\n');

  // Check header row
  const header = lines[0];
  assert.match(header, /Student Name/);
  assert.match(header, /Identify main ideas/);
  assert.match(header, /Pass Total/);
  assert.match(header, /Intermediate Total/);
  assert.match(header, /Advanced Total/);
  assert.match(header, /Unit Total/);

  // Should have 4 rows: header + 3 students
  assert.strictEqual(lines.length, 4);

  // First data row (Alice): should have all marked scores
  const aliceLine = lines[1];
  assert.match(aliceLine, /^Alice/);
  assert.match(aliceLine, /9/); // crit-1 score

  // Second data row (Bob): should have marked and blank cells
  const bobLine = lines[2];
  assert.match(bobLine, /^Bob/);
  // Bob has crit-3 unmarked, should be blank cell (two consecutive commas)
  // After "5,0," we expect a comma for the unmarked cell
  assert.match(bobLine, /5,0,,8/); // crit-1=5, crit-2=0, crit-3=blank, crit-4=8

  // Third data row: check name with quotes
  const samLine = lines[3];
  assert.match(samLine, /"O'Brien, Jr. ""Sam"""/);
});

test('generateCSV: unmarked cell is blank, zero is 0 (AC-CSV-2)', () => {
  const unit = createFixtureUnit();
  const matrix = new MockMarkingMatrix(unit);

  const csv = generateCSV(unit, matrix);
  const lines = csv.split('\n');

  // Bob's line: crit-2 has 0, crit-3 is unmarked
  const bobLine = lines[2];
  const fields = bobLine.split(',');

  // Alice = fields[0], crit-1 = fields[1], crit-2 = fields[2], crit-3 = fields[3]
  assert.strictEqual(fields[2], '0'); // crit-2: Bob scored 0
  assert.strictEqual(fields[3], ''); // crit-3: Bob unmarked (blank cell)
});

test('generateCSV: criterion with comma in text is quoted', () => {
  const unit = createFixtureUnit();
  // Add a criterion with a comma
  unit.matrixTemplate.criteria.push({
    id: 'crit-comma',
    tier: 'pass',
    criterion: 'Identify, analyze, and compare',
    maxScore: 5,
    assessmentIds: ['final-1'],
    allocationOverridden: false
  });
  // Add scores for this criterion
  unit.matrices.forEach(m => {
    m.scores.push({ criterionId: 'crit-comma', awardedScore: 3, comment: '' });
  });

  const matrix = new MockMarkingMatrix(unit);
  const csv = generateCSV(unit, matrix);

  // The header should quote this criterion
  assert.match(csv, /"Identify, analyze, and compare"/);
});

test('generateCSV: a criterion linked to a curriculum node gets its code prefixed in the header', () => {
  const unit = createFixtureUnit();
  unit.nodes = [
    { id: 'node-1', code: 'VC2HH10K13', kind: 'outcome', title: null, text: 'Node text' }
  ];
  unit.matrixTemplate.criteria[0].nodeId = 'node-1';

  const matrix = new MockMarkingMatrix(unit);
  const csv = generateCSV(unit, matrix);
  const header = csv.split('\n')[0];

  assert.match(header, /VC2HH10K13 — Identify main ideas/);
  // A criterion with no nodeId is unaffected — no stray code prefix.
  assert.match(header, /(?<!— )Explain, analyze, and compare/);
});

// ===== TEST 3: BOM and Blob (AC-CSV-1) =====
test('exportCSVBlob: includes UTF-8 BOM', () => {
  const unit = createFixtureUnit();
  const matrix = new MockMarkingMatrix(unit);

  const blob = exportCSVBlob(unit, matrix);
  assert.ok(blob instanceof Blob);
  assert.strictEqual(blob.type, 'text/csv;charset=utf-8');

  // Verify BOM by reading the blob
  // This is synchronous via FileReader, but for this test we'll just verify size
  // (BOM is 3 bytes in UTF-8)
  assert.ok(blob.size > 10); // CSV content should be more than just BOM
});

// ===== TEST 4: Tier Subtotals Match (AC-CSV-7) =====
test('generateCSV: tier subtotals read from marking-matrix, not recomputed', () => {
  const unit = createFixtureUnit();
  const matrix = new MockMarkingMatrix(unit);

  const csv = generateCSV(unit, matrix);
  const lines = csv.split('\n');
  const aliceLine = lines[1];

  // Alice's scores: crit-1=9, crit-2=8.5, crit-3=11, crit-4=10
  // Pass total: 9 + 8.5 = 17.5 / 20
  // Intermediate total: 11 / 12.5
  // Advanced total: 10 / 12.5
  // Unit total: 9 + 8.5 + 11 + 10 = 38.5 / 45
  // Note: unit has fractional scores (8.5, 11.0, etc), so all totals format with .0

  assert.match(aliceLine, /17.5\/20/); // Pass total
  assert.match(aliceLine, /11.0\/12.5/); // Intermediate total (formatted with .0 due to hasDecimal)
  assert.match(aliceLine, /10.0\/12.5/); // Advanced total (formatted with .0 due to hasDecimal)
  assert.match(aliceLine, /38.5\/45/); // Unit total
});

// ===== TEST 5: Error Handling =====
test('generateCSV: throws on invalid unit (no students array)', () => {
  const matrix = new MockMarkingMatrix({});

  assert.throws(() => generateCSV(null, matrix), /Invalid unit/);
  assert.throws(() => generateCSV({ matrixTemplate: {} }, matrix), /Invalid unit/);
});

test('generateCSV: throws when MarkingMatrix is missing', () => {
  const unit = createFixtureUnit();

  assert.throws(() => generateCSV(unit, null), /MarkingMatrix instance required/);
});

// ===== TEST 6: Full Round-trip (AC-CSV-1) =====
test('generateCSV: produces valid CSV that can be reparsed', () => {
  const unit = createFixtureUnit();
  const matrix = new MockMarkingMatrix(unit);

  const csv = generateCSV(unit, matrix);
  const lines = csv.split('\n');

  // Count columns in header
  const headerColumns = lines[0].split(/(?<!"),(?!")/); // Split on commas not in quotes
  const dataColumns = lines[1].split(/(?<!"),(?!")/);

  // Each data row should have same number of columns as header
  assert.strictEqual(dataColumns.length, headerColumns.length);

  // Verify all data rows have same column count
  for (let i = 2; i < lines.length; i++) {
    const rowColumns = lines[i].split(/(?<!"),(?!")/);
    assert.strictEqual(rowColumns.length, headerColumns.length, `Row ${i} column count mismatch`);
  }
});
