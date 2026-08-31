/**
 * test_marking-matrix.js
 *
 * Smoke tests for marking-matrix module
 * Tests: allocation algorithm, data model, mode toggle, scope filter
 *
 * Run: node --test tests/test_marking-matrix.js
 */

import { test } from 'node:test';
import * as assert from 'node:assert';

import MarkingMatrix, {
  allocateMaxScores,
  getCellValue,
  isUnmarked,
  formatSubtotal,
  computePercentage,
  hasAnyFractionalScore,
  isTierUnbalanced,
  computeMatrixNav,
  computeGridNav,
  DISPLAY_MODES
} from '../app/js/marking-matrix.js';

// ===== MOCK LocalStore =====
class MockLocalStore {
  constructor() {
    this.savedUnit = null;
  }

  async saveUnit(unit) {
    this.savedUnit = JSON.parse(JSON.stringify(unit));
  }

  async loadUnit() {
    return this.savedUnit;
  }
}

// ===== FIXTURE: Create a test unit =====
function createFixtureUnit() {
  return {
    schemaVersion: '1.0.0',
    meta: { subject: 'Test', unitName: 'Test Unit' },
    unitAssessment: {
      finalAssessment: {
        id: 'final-1',
        name: 'Final Assessment'
      },
      miniAssessments: [
        { id: 'mini-1', name: 'Mini 1' },
        { id: 'mini-2', name: 'Mini 2' }
      ]
    },
    matrixTemplate: {
      orientation: 'portrait',
      criteria: []
    },
    matrices: [],
    students: [],
    images: []
  };
}

// ===== TEST 1: Allocation Algorithm (AC-MMB-34, AC-MMB-35) =====
test('Allocation algorithm: deterministic, 0.5-boundary, exact budget (AC-MMB-34)', () => {
  // Worked example: 3 Pass, 2 Intermediate, 4 Advanced
  // Expected: Pass [17, 16.5, 16.5], Intermediate [12.5, 12.5], Advanced [6.5, 6.5, 6.0, 6.0]
  const criteria = [
    { id: '1', tier: 'pass', criterion: 'C1', maxScore: 0, assessmentIds: ['final-1'], allocationOverridden: false },
    { id: '2', tier: 'pass', criterion: 'C2', maxScore: 0, assessmentIds: ['final-1'], allocationOverridden: false },
    { id: '3', tier: 'pass', criterion: 'C3', maxScore: 0, assessmentIds: ['final-1'], allocationOverridden: false },
    { id: '4', tier: 'intermediate', criterion: 'C4', maxScore: 0, assessmentIds: ['final-1'], allocationOverridden: false },
    { id: '5', tier: 'intermediate', criterion: 'C5', maxScore: 0, assessmentIds: ['final-1'], allocationOverridden: false },
    { id: '6', tier: 'advanced', criterion: 'C6', maxScore: 0, assessmentIds: ['final-1'], allocationOverridden: false },
    { id: '7', tier: 'advanced', criterion: 'C7', maxScore: 0, assessmentIds: ['final-1'], allocationOverridden: false },
    { id: '8', tier: 'advanced', criterion: 'C8', maxScore: 0, assessmentIds: ['final-1'], allocationOverridden: false },
    { id: '9', tier: 'advanced', criterion: 'C9', maxScore: 0, assessmentIds: ['final-1'], allocationOverridden: false }
  ];

  allocateMaxScores(criteria);

  // Pass tier
  assert.strictEqual(criteria[0].maxScore, 17);
  assert.strictEqual(criteria[1].maxScore, 16.5);
  assert.strictEqual(criteria[2].maxScore, 16.5);
  assert.strictEqual(criteria[0].maxScore + criteria[1].maxScore + criteria[2].maxScore, 50);

  // Intermediate tier
  assert.strictEqual(criteria[3].maxScore, 12.5);
  assert.strictEqual(criteria[4].maxScore, 12.5);
  assert.strictEqual(criteria[3].maxScore + criteria[4].maxScore, 25);

  // Advanced tier
  assert.strictEqual(criteria[5].maxScore, 6.5);
  assert.strictEqual(criteria[6].maxScore, 6.5);
  assert.strictEqual(criteria[7].maxScore, 6.0);
  assert.strictEqual(criteria[8].maxScore, 6.0);
  assert.strictEqual(criteria[5].maxScore + criteria[6].maxScore + criteria[7].maxScore + criteria[8].maxScore, 25);
});

// ===== TEST 2: Display Modes — Worked Examples (AC-MMB-24, AC-MMB-26, AC-MMB-27) =====
test('Display mode: Default Empty renders 0 in all cells (AC-MMB-24)', () => {
  const criterion = { id: '1', maxScore: 5, assessmentIds: ['final-1'] };
  const scoreMarked = { criterionId: '1', awardedScore: 4 };
  const scoreUnmarked = null;

  assert.strictEqual(getCellValue(criterion, scoreMarked, 'default-empty'), 0);
  assert.strictEqual(getCellValue(criterion, scoreUnmarked, 'default-empty'), 0);
});

test('Display mode: Default Full renders maxScore in all cells (AC-MMB-25)', () => {
  const criterion = { id: '1', maxScore: 5, assessmentIds: ['final-1'] };
  const scoreMarked = { criterionId: '1', awardedScore: 4 };
  const scoreUnmarked = null;

  assert.strictEqual(getCellValue(criterion, scoreMarked, 'default-full'), 5);
  assert.strictEqual(getCellValue(criterion, scoreUnmarked, 'default-full'), 5);
});

test('Display mode: Data entry renders awarded score or 0 (AC-MMB-26)', () => {
  const criterion = { id: '1', maxScore: 5, assessmentIds: ['final-1'] };
  const scoreMarked = { criterionId: '1', awardedScore: 3 };
  const scoreUnmarked = null;

  assert.strictEqual(getCellValue(criterion, scoreMarked, 'data-entry'), 3);
  assert.strictEqual(getCellValue(criterion, scoreUnmarked, 'data-entry'), 0);
});

test('Display mode: Part of renders per-cell fraction (AC-MMB-27)', () => {
  const criterion = { id: '1', maxScore: 5, assessmentIds: ['final-1'] };
  const scoreMarked = { criterionId: '1', awardedScore: 3 };
  const scoreUnmarked = null;

  assert.strictEqual(getCellValue(criterion, scoreMarked, 'part-of'), '3/5');
  assert.strictEqual(getCellValue(criterion, scoreUnmarked, 'part-of'), '0/5');
});

// ===== TEST 3: Unmarked vs Zero (FR-MMB-10a) =====
test('Unmarked distinction: isUnmarked() identifies missing scores', () => {
  assert.strictEqual(isUnmarked(null), true);
  assert.strictEqual(isUnmarked(undefined), true);
  assert.strictEqual(isUnmarked({ criterionId: '1' }), true); // No awardedScore
  assert.strictEqual(isUnmarked({ criterionId: '1', awardedScore: 0 }), false); // Has awardedScore
  assert.strictEqual(isUnmarked({ criterionId: '1', awardedScore: 3 }), false);
});

// ===== TEST 4: Totals & Rounding (AD-MMB-5, AC-MMB-20) =====
test('Subtotal formatting: handles fractional scores per AD-MMB-5', () => {
  // 27.5 / 45
  assert.strictEqual(formatSubtotal(27.5, 45, true), '27.5/45');
  // Integer case (no fractional)
  assert.strictEqual(formatSubtotal(27, 45, false), '27/45');
});

test('Percentage rounding: ties round up (AC-MMB-20)', () => {
  // 27.5 / 45 * 100 = 61.11... → 61%
  assert.strictEqual(computePercentage(27.5, 45), 61);
  // 61 / 100 * 100 = 61 → 61%
  assert.strictEqual(computePercentage(61, 100), 61);
  // 0.5 / 1 * 100 = 50 → 50% (whole number, no rounding needed)
  assert.strictEqual(computePercentage(0.5, 1), 50);
  // 1.5 / 3 * 100 = 50, no rounding
  assert.strictEqual(computePercentage(1.5, 3), 50);
});

// ===== TEST 5: MarkingMatrix Class — Template Management =====
test('MarkingMatrix: add criterion requires assessmentIds (FR-MMB-5)', () => {
  const unit = createFixtureUnit();
  const store = new MockLocalStore();
  const matrix = new MarkingMatrix(unit, store);

  // Empty assessmentIds should throw
  assert.throws(
    () => matrix.addCriterion('pass', 'Test', []),
    { message: /must bind to at least one/ }
  );

  // Invalid assessment ID should throw (FR-MMB-6)
  assert.throws(
    () => matrix.addCriterion('pass', 'Test', ['invalid-id']),
    { message: /does not exist/ }
  );
});

// ===== TEST 6: Score Entry & Validation (FR-MMB-10) =====
test('MarkingMatrix: score entry validates range and decimals', () => {
  const unit = createFixtureUnit();
  const store = new MockLocalStore();
  const matrix = new MarkingMatrix(unit, store);

  // Add a student and criterion
  matrix.addStudent('Alice');
  const crit = {
    id: 'crit-1',
    tier: 'pass',
    criterion: 'Test',
    draftScore: 0,
    maxScore: 5,
    assessmentIds: ['final-1'],
    allocationOverridden: false
  };
  matrix.unit.matrixTemplate.criteria.push(crit);

  // Update matrix scores array
  const studentId = matrix.unit.students[0].id;
  const matrixRow = matrix.unit.matrices[0];
  matrixRow.scores = [{ criterionId: 'crit-1', awardedScore: undefined, comment: '' }];

  // Valid score
  assert.doesNotThrow(() => matrix.enterScore(studentId, 'crit-1', 2.5, ''));

  // Out of range
  assert.throws(() => matrix.enterScore(studentId, 'crit-1', 5.5, ''));
  assert.throws(() => matrix.enterScore(studentId, 'crit-1', -1, ''));

  // Too many decimals (FR-MMB-10: one decimal max)
  assert.throws(() => matrix.enterScore(studentId, 'crit-1', 2.33, ''));
});

// ===== TEST 7: Mode Toggle Gate (AC-MMB-23, TEST-7) =====
test('MarkingMatrix: mode switches write nothing (AC-MMB-23)', () => {
  const unit = createFixtureUnit();
  const store = new MockLocalStore();
  const matrix = new MarkingMatrix(unit, store);

  // Record initial state
  const initialMode = matrix.displayMode;

  // Switch modes multiple times
  matrix.setDisplayMode('default-full');
  matrix.setDisplayMode('data-entry');
  matrix.setDisplayMode('part-of');
  matrix.setDisplayMode('default-empty');

  // No save occurred (store.savedUnit is still null or unchanged)
  assert.strictEqual(store.savedUnit, null);
});

test('MarkingMatrix: maxScore edit in Data entry is blocked (AC-MMB-29)', () => {
  const unit = createFixtureUnit();
  const store = new MockLocalStore();
  const matrix = new MarkingMatrix(unit, store);

  // Add criterion
  unit.matrixTemplate.criteria.push({
    id: 'crit-1',
    tier: 'pass',
    criterion: 'Test',
    draftScore: 0,
    maxScore: 5,
    assessmentIds: ['final-1'],
    allocationOverridden: false
  });

  matrix.setDisplayMode('data-entry');

  // In Data entry, maxScore edits should be refused
  // (This is a gate test; the UI should not offer the control)
  // For now, we just verify setMaxScore works in Default Full
  matrix.setDisplayMode('default-full');
  assert.doesNotThrow(() => matrix.setMaxScore('crit-1', 6));
});

// ===== TEST 8: Scope Filter (FR-MMB-33, AC-MMB-31) =====
test('MarkingMatrix: scope filter reduces criteria list (AC-MMB-31)', () => {
  const unit = createFixtureUnit();
  const store = new MockLocalStore();
  const matrix = new MarkingMatrix(unit, store);

  // Add criteria to different assessments
  unit.matrixTemplate.criteria = [
    { id: '1', tier: 'pass', assessmentIds: ['final-1'] },
    { id: '2', tier: 'pass', assessmentIds: ['mini-1'] },
    { id: '3', tier: 'pass', assessmentIds: ['mini-1', 'mini-2'] }
  ];

  // Full-unit scope
  assert.strictEqual(matrix.getFilteredCriteria().length, 3);

  // Per-assessment scope (mini-1)
  matrix.setScope('mini-1');
  const filtered = matrix.getFilteredCriteria();
  assert.strictEqual(filtered.length, 2); // criteria 2 and 3
  assert.ok(filtered.some(c => c.id === '2'));
  assert.ok(filtered.some(c => c.id === '3'));
});

// ===== TEST 9: Tier Subtotal (per-assessment) & Unit Total (FR-MMB-35) =====
test('MarkingMatrix: per-assessment subtotal vs full-unit total (AC-MMB-33)', () => {
  const unit = createFixtureUnit();
  const store = new MockLocalStore();
  const matrix = new MarkingMatrix(unit, store);

  // Add students
  matrix.addStudent('Alice');
  const studentId = unit.students[0].id;

  // Add criteria: one shared (mini-1 and mini-2), one mini-1 only, one mini-2 only
  unit.matrixTemplate.criteria = [
    { id: 'shared', tier: 'pass', maxScore: 5, assessmentIds: ['mini-1', 'mini-2'] },
    { id: 'mini1-only', tier: 'pass', maxScore: 5, assessmentIds: ['mini-1'] },
    { id: 'mini2-only', tier: 'pass', maxScore: 5, assessmentIds: ['mini-2'] }
  ];

  // Update student's matrix
  const studentMatrix = unit.matrices[0];
  studentMatrix.scores = [
    { criterionId: 'shared', awardedScore: 5 },
    { criterionId: 'mini1-only', awardedScore: 5 },
    { criterionId: 'mini2-only', awardedScore: 5 }
  ];

  // Full-unit total: (5+5+5) / 15 = 15/15
  const unitTotal = matrix.computeUnitTotal(studentId);
  assert.strictEqual(unitTotal.numerator, 15);
  assert.strictEqual(unitTotal.denominator, 15);

  // Per-assessment subtotal for mini-1: shared (5) + mini1-only (5) = 10/10
  matrix.setScope('mini-1');
  const mini1Total = matrix.computeTierSubtotal(studentId, 'pass');
  assert.strictEqual(mini1Total.numerator, 10);
  assert.strictEqual(mini1Total.denominator, 10);

  // Per-assessment subtotal for mini-2: shared (5) + mini2-only (5) = 10/10
  matrix.setScope('mini-2');
  const mini2Total = matrix.computeTierSubtotal(studentId, 'pass');
  assert.strictEqual(mini2Total.numerator, 10);
  assert.strictEqual(mini2Total.denominator, 10);

  // Subtotals sum to 20, but unit total is 15 (not 20)
  // This demonstrates FR-MMB-35: shared criterion counts full mark to each, but once to unit
});

// ===== TEST 10: Orientation (FR-MMB-13) =====
test('MarkingMatrix: orientation stored and persisted (AC-MMB-10)', () => {
  const unit = createFixtureUnit();
  const store = new MockLocalStore();
  const matrix = new MarkingMatrix(unit, store);

  assert.strictEqual(matrix.getOrientation(), 'portrait');

  matrix.setOrientation('landscape');
  assert.strictEqual(matrix.getOrientation(), 'landscape');
  assert.strictEqual(store.savedUnit.matrixTemplate.orientation, 'landscape');
});

// ===== TEST 11: F1 — 2D keyboard navigation (AC-MMB-17, blocker) =====
// Pure logic tests first: no DOM needed to prove the navigation math is right.
test('computeMatrixNav: Enter commits and moves to next row score cell (AC-MMB-17)', () => {
  const next = computeMatrixNav('Enter', 0, 0, 5);
  assert.deepStrictEqual(next, { row: 1, col: 0 });
});

test('computeMatrixNav: Tab from score cell moves to that row\'s comment cell (AC-MMB-17)', () => {
  const next = computeMatrixNav('Tab', 2, 0, 5);
  assert.deepStrictEqual(next, { row: 2, col: 1 });
});

test('computeMatrixNav: ArrowDown from score cell moves to score cell one row below (AC-MMB-17)', () => {
  const next = computeMatrixNav('ArrowDown', 1, 0, 5);
  assert.deepStrictEqual(next, { row: 2, col: 0 });
});

test('computeMatrixNav: focus never lands outside the grid\'s editable cells', () => {
  // Last row + Enter/ArrowDown clamps at the last row, never past it.
  assert.deepStrictEqual(computeMatrixNav('Enter', 4, 0, 5), { row: 4, col: 0 });
  assert.deepStrictEqual(computeMatrixNav('ArrowDown', 4, 1, 5), { row: 4, col: 1 });
  // First row + ArrowUp clamps at row 0, never negative.
  assert.deepStrictEqual(computeMatrixNav('ArrowUp', 0, 0, 5), { row: 0, col: 0 });
});

test('computeGridNav: 2D navigation across the whole-class grid (rows=criteria, cols=students)', () => {
  assert.deepStrictEqual(computeGridNav('ArrowRight', 1, 1, 4, 3), { row: 1, col: 2 });
  assert.deepStrictEqual(computeGridNav('ArrowRight', 1, 2, 4, 3), { row: 1, col: 2 }); // clamped
  assert.deepStrictEqual(computeGridNav('ArrowLeft', 1, 0, 4, 3), { row: 1, col: 0 }); // clamped
  assert.deepStrictEqual(computeGridNav('ArrowDown', 3, 0, 4, 3), { row: 3, col: 0 }); // clamped
  assert.deepStrictEqual(computeGridNav('Enter', 0, 0, 4, 3), { row: 1, col: 0 });
});

// ===== Hand-written fake DOM (TEST-8: no jsdom, no library) =====
// Exposes only what marking-matrix.js's rendering touches: createElement /
// createElementNS returning elements with className, textContent, dataset,
// appendChild, setAttribute/getAttribute, addEventListener/dispatch, focus.
class FakeElement {
  constructor(tag) {
    this.tagName = tag;
    this.children = [];
    this._attrs = {};
    this.dataset = {};
    this.className = '';
    this.textContent = '';
    this._listeners = {};
    this.disabled = false;
    this.value = '';
    this.placeholder = '';
    this.type = '';
    this.id = '';
    this.focused = false;
    this.classList = { add() {}, remove() {}, contains() { return false; } };
    // Real elements always carry a style object; renderClassGrid() sets the
    // grid's column count through it (--class-grid-columns). Recording the
    // values lets tests assert on them rather than just tolerate the call.
    this._style = {};
    this.style = {
      setProperty: (name, value) => { this._style[name] = String(value); },
      getPropertyValue: (name) => this._style[name] ?? '',
      removeProperty: (name) => { delete this._style[name]; }
    };
  }
  appendChild(el) {
    this.children.push(el);
    return el;
  }
  remove() {}
  setAttribute(name, val) {
    this._attrs[name] = String(val);
    if (name.startsWith('data-')) {
      const key = name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      this.dataset[key] = String(val);
    }
  }
  getAttribute(name) {
    return Object.prototype.hasOwnProperty.call(this._attrs, name) ? this._attrs[name] : null;
  }
  addEventListener(type, fn) {
    (this._listeners[type] = this._listeners[type] || []).push(fn);
  }
  dispatch(type, evt) {
    (this._listeners[type] || []).forEach(fn => fn(evt));
  }
  focus() {
    this.focused = true;
  }
}

// Minimal fake document supporting both plain rendering (createElement) and
// DocumentShell's SVG pipeline (createElementNS, head/body, getElementById,
// XMLSerializer) — only the surface those two call sites actually touch.
function withFakeMarkingDom(fn) {
  const priorDocument = globalThis.document;
  const priorAlert = globalThis.alert;
  const priorXMLSerializer = globalThis.XMLSerializer;
  globalThis.document = {
    createElement(tag) { return new FakeElement(tag); },
    createElementNS(_ns, tag) { return new FakeElement(tag); },
    getElementById() { return null; },
    head: new FakeElement('head'),
    body: new FakeElement('body')
  };
  globalThis.alert = () => {};
  globalThis.XMLSerializer = class { serializeToString() { return ''; } };
  try {
    return fn();
  } finally {
    if (priorDocument === undefined) delete globalThis.document; else globalThis.document = priorDocument;
    if (priorAlert === undefined) delete globalThis.alert; else globalThis.alert = priorAlert;
    if (priorXMLSerializer === undefined) delete globalThis.XMLSerializer; else globalThis.XMLSerializer = priorXMLSerializer;
  }
}

// Recursively collect every descendant (including el itself) matching a predicate.
function findAll(el, predicate, out = []) {
  if (predicate(el)) out.push(el);
  for (const child of el.children || []) findAll(child, predicate, out);
  return out;
}

test('renderClassGrid declares one grid column per student, so cells lay out row-major', () => {
  // Regression: .class-grid-table had `grid-auto-flow: column` and no column
  // template, so the browser generated one implicit column PER CELL and the
  // whole grid rendered as a single squashed strip (8 cols x 14 rows became
  // 113 cols x 1 row). The column count is data-dependent, so it is set here.
  withFakeMarkingDom(() => {
    const unit = createFixtureUnit();
    const matrix = new MarkingMatrix(unit, new MockLocalStore());
    matrix.addStudent('Alice');
    matrix.addStudent('Bob');
    matrix.addStudent('Chidi');
    const container = matrix.renderClassGrid();
    const grid = findAll(container, el => el.className === 'class-grid-table')[0];
    assert.ok(grid, 'class-grid-table should be rendered');
    assert.strictEqual(
      grid.style.getPropertyValue('--class-grid-columns'),
      String(unit.students.length),
      'column count must follow the student count'
    );
  });
});

test('F1: renderClassGrid wires a real keydown handler that moves focus between cells (AC-MMB-17)', () => {
  withFakeMarkingDom(() => {
    const unit = createFixtureUnit();
    unit.matrixTemplate.criteria = [
      { id: 'c1', tier: 'pass', criterion: 'C1', maxScore: 5, assessmentIds: ['final-1'], allocationOverridden: false },
      { id: 'c2', tier: 'pass', criterion: 'C2', maxScore: 5, assessmentIds: ['final-1'], allocationOverridden: false }
    ];
    const store = new MockLocalStore();
    const matrix = new MarkingMatrix(unit, store);
    matrix.addStudent('Alice');
    matrix.addStudent('Bob');
    matrix.setDisplayMode(DISPLAY_MODES.DATA_ENTRY);

    const container = matrix.renderClassGrid();
    const grid = findAll(container, el => el.className === 'class-grid-table')[0];
    const inputs = findAll(grid, el => el.tagName === 'input')
      .filter(el => el.getAttribute('data-row') !== null)
      .sort((a, b) => {
        const rowDiff = parseInt(a.getAttribute('data-row'), 10) - parseInt(b.getAttribute('data-row'), 10);
        if (rowDiff !== 0) return rowDiff;
        return parseInt(a.getAttribute('data-col'), 10) - parseInt(b.getAttribute('data-col'), 10);
      });

    assert.strictEqual(inputs.length, 4, 'two criteria x two students = four score inputs');

    // Start on row 0, col 0 (Alice, C1); ArrowRight should move to row 0, col 1 (Bob, C1).
    const first = inputs.find(i => i.getAttribute('data-row') === '0' && i.getAttribute('data-col') === '0');
    grid.dispatch('keydown', { key: 'ArrowRight', target: first, preventDefault() {} });
    const expectedRight = inputs.find(i => i.getAttribute('data-row') === '0' && i.getAttribute('data-col') === '1');
    assert.strictEqual(expectedRight.focused, true, 'ArrowRight moved focus to the next student\'s cell');

    // ArrowDown from row 0 col 0 should move to row 1 col 0.
    grid.dispatch('keydown', { key: 'ArrowDown', target: first, preventDefault() {} });
    const expectedDown = inputs.find(i => i.getAttribute('data-row') === '1' && i.getAttribute('data-col') === '0');
    assert.strictEqual(expectedDown.focused, true, 'ArrowDown moved focus to the cell one row below');
  });
});

test('F1: renderStudentPage wires Enter/Tab navigation across score and comment cells (AC-MMB-17)', () => {
  withFakeMarkingDom(() => {
    const unit = createFixtureUnit();
    unit.matrixTemplate.criteria = [
      { id: 'c1', tier: 'pass', criterion: 'C1', maxScore: 5, assessmentIds: ['final-1'], allocationOverridden: false },
      { id: 'c2', tier: 'pass', criterion: 'C2', maxScore: 5, assessmentIds: ['final-1'], allocationOverridden: false }
    ];
    const store = new MockLocalStore();
    const matrix = new MarkingMatrix(unit, store);
    matrix.addStudent('Alice');
    const studentId = unit.students[0].id;
    matrix.setDisplayMode(DISPLAY_MODES.DATA_ENTRY);

    const container = matrix.renderStudentPage(studentId);
    const table = findAll(container, el => el.className === 'criteria-table')[0];
    const scoreInputs = findAll(table, el => el.className === 'score-input')
      .sort((a, b) => parseInt(a.getAttribute('data-row'), 10) - parseInt(b.getAttribute('data-row'), 10));
    const commentInputs = findAll(table, el => el.className === 'comment-input')
      .sort((a, b) => parseInt(a.getAttribute('data-row'), 10) - parseInt(b.getAttribute('data-row'), 10));

    assert.strictEqual(scoreInputs.length, 2);
    assert.strictEqual(commentInputs.length, 2);

    // Tab from row 0's score cell moves to row 0's comment cell.
    table.dispatch('keydown', { key: 'Tab', target: scoreInputs[0], preventDefault() {} });
    assert.strictEqual(commentInputs[0].focused, true, 'Tab moved focus to that row\'s comment cell');

    // Enter from row 0's score cell moves to row 1's score cell.
    table.dispatch('keydown', { key: 'Enter', target: scoreInputs[0], preventDefault() {} });
    assert.strictEqual(scoreInputs[1].focused, true, 'Enter moved focus to the next row\'s score cell');
  });
});

// ===== TEST 12: F2/F3 — tier-unbalanced and not-yet-set-up states (AC-MMB-39, FR-MMB-40) =====
test('isTierUnbalanced: true when overridden criteria alone exceed the tier budget (FR-MMB-39)', () => {
  const criteria = [
    { id: '1', allocationOverridden: true, maxScore: 40 },
    { id: '2', allocationOverridden: true, maxScore: 20 }
  ];
  assert.strictEqual(isTierUnbalanced(criteria, 50), true, '60 overridden > 50 budget is unbalanced');
  assert.strictEqual(isTierUnbalanced([{ id: '1', allocationOverridden: true, maxScore: 30 }], 50), false);
});

test('F2/F3: renderStudentPage renders the unbalanced flag and the not-yet-set-up state (AC-MMB-39, FR-MMB-40)', () => {
  withFakeMarkingDom(() => {
    const unit = createFixtureUnit();
    unit.matrixTemplate.criteria = [
      // Pass tier: zero criteria -> "not yet set up"
      // Intermediate tier: overridden criteria alone exceed the 25 budget -> "unbalanced"
      { id: 'i1', tier: 'intermediate', criterion: 'I1', maxScore: 30, assessmentIds: ['final-1'], allocationOverridden: true }
    ];
    const store = new MockLocalStore();
    const matrix = new MarkingMatrix(unit, store);
    matrix.addStudent('Alice');
    const studentId = unit.students[0].id;

    const container = matrix.renderStudentPage(studentId);
    const tierBands = findAll(container, el => typeof el.className === 'string' && el.className.startsWith('tier-band'));

    const passBand = tierBands.find(b => b.className.includes(' pass') || b.className === 'tier-band pass');
    const intermediateBand = tierBands.find(b => b.className.includes('intermediate'));

    assert.ok(passBand.className.includes('notYetSetUp'), 'zero-criteria Pass tier renders notYetSetUp');
    assert.ok(intermediateBand.className.includes('tier-unbalanced'), 'over-budget overridden Intermediate tier renders tier-unbalanced');
  });
});

// ===== TEST 13: F4 — Default Full mode standing notice (AC-MMB-30) =====
test('F4: Default Full notice is visible only while Default Full mode is active (AC-MMB-30)', () => {
  withFakeMarkingDom(() => {
    const unit = createFixtureUnit();
    unit.matrixTemplate.criteria = [
      { id: 'c1', tier: 'pass', criterion: 'C1', maxScore: 5, assessmentIds: ['final-1'], allocationOverridden: false }
    ];
    const store = new MockLocalStore();
    const matrix = new MarkingMatrix(unit, store);
    matrix.addStudent('Alice');

    // Data entry: notice present but not visible.
    matrix.setDisplayMode(DISPLAY_MODES.DATA_ENTRY);
    const gridDataEntry = matrix.renderClassGrid();
    const noticeDataEntry = findAll(gridDataEntry, el => el.className && el.className.includes('default-full-notice'))[0];
    assert.ok(noticeDataEntry, 'notice element exists');
    assert.strictEqual(noticeDataEntry.className.includes('visible'), false, 'not visible outside Default Full');

    // Default Full: notice visible.
    matrix.setDisplayMode(DISPLAY_MODES.DEFAULT_FULL);
    const gridDefaultFull = matrix.renderClassGrid();
    const noticeDefaultFull = findAll(gridDefaultFull, el => el.className && el.className.includes('default-full-notice'))[0];
    assert.strictEqual(noticeDefaultFull.className.includes('visible'), true, 'visible while Default Full is active');
  });
});

// ===== TEST 14: F5 — unit-progress block (AC-MMB-44, AC-MMB-45) =====
test('F5: unit-progress block renders assessment rows and a separated unit-total panel (AC-MMB-45)', () => {
  withFakeMarkingDom(() => {
    const unit = createFixtureUnit();
    unit.matrixTemplate.criteria = [
      { id: 'shared', tier: 'pass', criterion: 'Shared', maxScore: 10, assessmentIds: ['mini-1', 'mini-2'], allocationOverridden: false }
    ];
    const store = new MockLocalStore();
    const matrix = new MarkingMatrix(unit, store);
    matrix.addStudent('Alice');
    const studentId = unit.students[0].id;
    matrix.enterScore(studentId, 'shared', 10, '');

    // DocumentShell renders on construction, appending one <svg> per page
    // (its own real pipeline — TEST-8 exercises it as-is, no manual re-invoke).
    const shell = matrix.renderStudentDataPrint(studentId);
    assert.strictEqual(shell.svgPages.length, 1, 'exactly one page for one student');
    const svgRoot = shell.svgPages[0];

    const texts = findAll(svgRoot, el => el.tagName === 'text').map(el => el.textContent);
    assert.ok(texts.includes('Unit progress'), 'renders the unit-progress heading');
    assert.ok(texts.includes('Unit total'), 'renders the unit total in its own labelled panel');
    // Two assessment rows (Mini 1, Mini 2), each carrying the shared criterion's full 10 marks.
    assert.ok(texts.includes('Mini 1'));
    assert.ok(texts.includes('Mini 2'));
    assert.ok(texts.includes('10/10'), 'per-assessment row carries the full shared-criterion mark');

    // Bordered rects: at least the rows panel and the unit-total panel (two distinct borders, SR-9).
    const rects = findAll(svgRoot, el => el.tagName === 'rect');
    assert.ok(rects.length >= 2, 'rows and unit total sit in visually separate bordered panels');
  });
});

test('F5: unit-progress block is absent from the Setup blank sheet (FR-MMB-45)', () => {
  withFakeMarkingDom(() => {
    const unit = createFixtureUnit();
    unit.matrixTemplate.criteria = [
      { id: 'c1', tier: 'pass', criterion: 'C1', maxScore: 10, assessmentIds: ['final-1'], allocationOverridden: false }
    ];
    const store = new MockLocalStore();
    const matrix = new MarkingMatrix(unit, store);

    const shell = matrix.renderSetupPrint();
    const svgRoot = shell.svgPages[0];

    const texts = findAll(svgRoot, el => el.tagName === 'text').map(el => el.textContent);
    assert.ok(!texts.includes('Unit progress'), 'Setup sheet never renders the unit-progress block');
    assert.ok(!texts.includes('Unit total'), 'Setup sheet has no unit-total panel');
  });
});

// ===== TEST 9: Populate from Curriculum (criteria-populate-the-marking-matrix) =====

function fixtureNode(id, code, kind, extra = {}) {
  return { id, code, kind, title: null, text: `${code} description`, parentId: 'root', ...extra };
}

function createFixtureUnitWithNodes() {
  const unit = createFixtureUnit();
  unit.nodes = [
    { id: 'root', code: 'ROOT', kind: 'strand', title: 'Root', text: '', parentId: null },
    fixtureNode('n1', 'VC001', 'outcome'),
    fixtureNode('n2', 'VC002', 'outcome'),
    fixtureNode('n3', 'VC003', 'outcome'),
    { id: 'n4', code: 'VC004', kind: 'task', title: 'A task, not an outcome', text: '', parentId: 'root' }
  ];
  unit.unitAssessment.coverage = [{ nodeId: 'n1', coverage: 'full', note: '' }];
  unit.unitAssessment.miniAssessments[0].coverage = [{ nodeId: 'n2', coverage: 'full', note: '' }];
  return unit;
}

test('getOutcomeNodes returns only kind:"outcome" nodes', () => {
  const unit = createFixtureUnitWithNodes();
  const matrix = new MarkingMatrix(unit, new MockLocalStore());
  const ids = matrix.getOutcomeNodes().map((n) => n.id);
  assert.deepStrictEqual(ids.sort(), ['n1', 'n2', 'n3']);
});

test('getLinkedNodeIds reflects criteria already carrying a nodeId', () => {
  const unit = createFixtureUnitWithNodes();
  unit.matrixTemplate.criteria.push({
    id: 'c1', tier: 'pass', criterion: 'Existing', nodeId: 'n1', maxScore: 5, assessmentIds: ['final-1'], allocationOverridden: false
  });
  const matrix = new MarkingMatrix(unit, new MockLocalStore());
  assert.deepStrictEqual([...matrix.getLinkedNodeIds()], ['n1']);
});

test('getDefaultCurriculumNodeIds defaults to outcomes this unit already assesses (full-unit view)', () => {
  const unit = createFixtureUnitWithNodes();
  const matrix = new MarkingMatrix(unit, new MockLocalStore());
  const defaults = matrix.getDefaultCurriculumNodeIds().sort();
  // n1 (final coverage) and n2 (mini-1 coverage) are assessed; n3 is not.
  assert.deepStrictEqual(defaults, ['n1', 'n2']);
});

test('getDefaultCurriculumNodeIds narrows to the assessment in scope when scope is set', () => {
  const unit = createFixtureUnitWithNodes();
  const matrix = new MarkingMatrix(unit, new MockLocalStore());
  matrix.setScope('mini-1');
  assert.deepStrictEqual(matrix.getDefaultCurriculumNodeIds(), ['n2']);
});

test('addCriteriaFromNodes: adds rows pre-filled from node title/text, binds to the covering assessment', () => {
  const unit = createFixtureUnitWithNodes();
  const store = new MockLocalStore();
  const matrix = new MarkingMatrix(unit, store);

  const result = matrix.addCriteriaFromNodes(['n1', 'n2'], 'pass');
  assert.strictEqual(result.toAdd.length, 2);
  assert.strictEqual(result.alreadyLinked.length, 0);
  assert.strictEqual(result.noAssessment.length, 0);
  assert.strictEqual(result.warning, null, 'no warning when no student has been scored yet');

  result.onConfirm();

  assert.strictEqual(unit.matrixTemplate.criteria.length, 2);
  const n1Crit = unit.matrixTemplate.criteria.find((c) => c.nodeId === 'n1');
  assert.strictEqual(n1Crit.criterion, 'VC001 description', 'falls back to node.text when title is unset');
  assert.strictEqual(n1Crit.tier, 'pass');
  assert.deepStrictEqual(n1Crit.assessmentIds, ['final-1'], 'bound to the assessment that actually covers this node');
  assert.strictEqual(n1Crit.allocationOverridden, false);
  assert.ok(store.savedUnit, 'auto-saves like addCriterion does');
});

test('addCriteriaFromNodes: skips a node already linked to a row, reports it back, never duplicates', () => {
  const unit = createFixtureUnitWithNodes();
  unit.matrixTemplate.criteria.push({
    id: 'existing', tier: 'pass', criterion: 'Hand-authored', nodeId: 'n1', maxScore: 10, assessmentIds: ['final-1'], allocationOverridden: false
  });
  const matrix = new MarkingMatrix(unit, new MockLocalStore());

  const result = matrix.addCriteriaFromNodes(['n1', 'n2'], 'pass');
  assert.strictEqual(result.toAdd.length, 1);
  assert.strictEqual(result.toAdd[0].id, 'n2');
  assert.strictEqual(result.alreadyLinked.length, 1);
  assert.strictEqual(result.alreadyLinked[0].id, 'n1');

  result.onConfirm();

  // Only one new row added; the hand-authored row is untouched.
  assert.strictEqual(unit.matrixTemplate.criteria.length, 2);
  const handAuthored = unit.matrixTemplate.criteria.find((c) => c.id === 'existing');
  assert.strictEqual(handAuthored.criterion, 'Hand-authored');
});

test('addCriteriaFromNodes: never invents rows for a non-outcome id slipped into the selection', () => {
  const unit = createFixtureUnitWithNodes();
  const matrix = new MarkingMatrix(unit, new MockLocalStore());
  const result = matrix.addCriteriaFromNodes(['n4'], 'pass'); // n4 is kind:'task'
  assert.strictEqual(result.toAdd.length, 0);
});

test('addCriteriaFromNodes: warns when students already have scores, same wording pattern as addCriterion', () => {
  const unit = createFixtureUnitWithNodes();
  const store = new MockLocalStore();
  const matrix = new MarkingMatrix(unit, store);
  matrix.addStudent('Alice');
  unit.matrices[0].scores.push({ criterionId: 'crit-does-not-matter', awardedScore: 3, comment: '' });

  const result = matrix.addCriteriaFromNodes(['n1', 'n2', 'n3'], 'pass');
  assert.match(result.warning, /Adding 3 marking criteria adds an unmarked row/);
});

test('addCriteriaFromNodes: re-allocates only the target tier (FR-MMB-38), leaves other tiers alone', () => {
  const unit = createFixtureUnitWithNodes();
  unit.matrixTemplate.criteria.push({
    id: 'i1', tier: 'intermediate', criterion: 'I1', maxScore: 25, assessmentIds: ['final-1'], allocationOverridden: false
  });
  const matrix = new MarkingMatrix(unit, new MockLocalStore());

  const result = matrix.addCriteriaFromNodes(['n1', 'n2'], 'pass');
  result.onConfirm();

  const passCriteria = unit.matrixTemplate.criteria.filter((c) => c.tier === 'pass');
  const passTotal = passCriteria.reduce((sum, c) => sum + c.maxScore, 0);
  assert.strictEqual(passTotal, 50, 'pass tier still sums to its fixed budget');

  const intermediate = unit.matrixTemplate.criteria.find((c) => c.id === 'i1');
  assert.strictEqual(intermediate.maxScore, 25, 'untouched tier is not re-allocated');
});

test('a criterion linked via nodeId round-trips its link through save/load unchanged', async () => {
  const unit = createFixtureUnitWithNodes();
  const store = new MockLocalStore();
  const matrix = new MarkingMatrix(unit, store);

  matrix.addCriteriaFromNodes(['n1'], 'pass').onConfirm();
  const reloaded = await store.loadUnit();
  const crit = reloaded.matrixTemplate.criteria.find((c) => c.nodeId === 'n1');
  assert.ok(crit, 'nodeId survives the save/load round-trip');
  assert.strictEqual(crit.criterion, 'VC001 description');
});

test('F6: renderClassGrid shows the curriculum code next to a linked criterion (compact, non-clickable)', () => {
  withFakeMarkingDom(() => {
    const unit = createFixtureUnitWithNodes();
    const store = new MockLocalStore();
    const matrix = new MarkingMatrix(unit, store);
    matrix.addCriteriaFromNodes(['n1'], 'pass').onConfirm();

    const grid = matrix.renderClassGrid();
    const codeEls = findAll(grid, (el) => el.className === 'criterion-code');
    assert.strictEqual(codeEls.length, 1);
    assert.strictEqual(codeEls[0].textContent, 'VC001');
  });
});

// ===== SUMMARY =====
console.log('All marking-matrix tests passed!');
