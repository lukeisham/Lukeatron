/**
 * marking-matrix.js — Matrix template editor and per-student marking sheet
 *
 * Exports:
 * - MarkingMatrix class: manages template, students, display mode, orientation, scope
 * - allocateMaxScores: deterministic tier-budget allocation algorithm (FR-MMB-37)
 * - Helper utilities for rendering and computation
 *
 * Imports: TIERS/DocumentShell from document-shell, LocalStore from local-store
 * No framework, vanilla ES modules only (FR-MMB-17)
 */

import { TIERS, DocumentShell, pxToUserUnits } from './document-shell.js';
import { newId } from './ids.js';
import { deriveAssessmentCoverage } from './coverage-derivers.js';
import { renderCode } from './traceability.js';

// ===== Tier Budget Constants (FR-MMB-37, Change U) =====
const TIER_BUDGETS = {
  pass: 50,
  intermediate: 25,
  advanced: 25
};

// ===== Display Modes (FR-MMB-26) =====
export const DISPLAY_MODES = {
  DEFAULT_EMPTY: 'default-empty',
  DEFAULT_FULL: 'default-full',
  DATA_ENTRY: 'data-entry',
  PART_OF: 'part-of'
};

// ===== Visual Distinction: Unmarked vs Zero (FR-MMB-10a) =====
const UNMARKED_VISUAL = '—';
const ZERO_VISUAL = '0';

/**
 * Allocation Algorithm (FR-MMB-37, AD-40)
 *
 * For each tier with N non-overridden criteria and a fixed budget:
 * 1. Compute rawShare = budget ÷ N
 * 2. Floor each criterion's share to nearest 0.5
 * 3. Distribute remainder (0.5 increments) to first N criteria in stable order
 * Result: deterministic, exact-budget allocation
 *
 * @param {Array} criteria - array of criterion objects { id, tier, maxScore, allocationOverridden }
 * @returns {Array} - updated criteria with new maxScore values
 */
export function allocateMaxScores(criteria) {
  if (!criteria || criteria.length === 0) {
    return criteria;
  }

  // Group criteria by tier
  const byTier = {
    pass: criteria.filter(c => c.tier === 'pass'),
    intermediate: criteria.filter(c => c.tier === 'intermediate'),
    advanced: criteria.filter(c => c.tier === 'advanced')
  };

  // Allocate each tier independently
  for (const [tier, tierCriteria] of Object.entries(byTier)) {
    allocateTier(tierCriteria, TIER_BUDGETS[tier]);
  }

  return criteria;
}

/**
 * Allocate a single tier's budget across its criteria
 * @param {Array} tierCriteria - criteria in this tier (not overridden first, then overridden)
 * @param {number} budget - tier budget (50, 25, or 25)
 */
function allocateTier(tierCriteria, budget) {
  if (tierCriteria.length === 0) {
    return;
  }

  // Separate non-overridden and overridden criteria
  const nonOverridden = tierCriteria.filter(c => !c.allocationOverridden);
  const overridden = tierCriteria.filter(c => c.allocationOverridden);

  if (nonOverridden.length === 0) {
    // All overridden; leave them as-is
    return;
  }

  // Compute remaining budget after overridden criteria
  const overriddenSum = overridden.reduce((sum, c) => sum + (c.maxScore || 0), 0);
  const remainingBudget = budget - overriddenSum;

  if (remainingBudget <= 0) {
    // No budget left for non-overridden; leave them at zero or current
    return;
  }

  // Allocate remaining budget across non-overridden criteria
  const rawShare = remainingBudget / nonOverridden.length;
  const floored = Math.floor(rawShare * 2) / 2; // Floor to nearest 0.5
  const remainder = remainingBudget - (floored * nonOverridden.length);
  const remainderSteps = Math.round(remainder / 0.5); // How many 0.5 increments to distribute

  // Distribute: each gets floored amount, first remainderSteps get +0.5
  nonOverridden.forEach((c, i) => {
    c.maxScore = floored + (i < remainderSteps ? 0.5 : 0);
  });
}

/**
 * Get the cell display value for a criterion in a given display mode
 * @param {Object} criterion - { maxScore, ... }
 * @param {Object} score - { awardedScore, ... } or null
 * @param {string} mode - display mode constant
 * @returns {string|number} - value to render in cell
 */
export function getCellValue(criterion, score, mode) {
  if (mode === DISPLAY_MODES.DEFAULT_EMPTY) {
    return 0;
  }
  if (mode === DISPLAY_MODES.DEFAULT_FULL) {
    return criterion.maxScore;
  }
  if (mode === DISPLAY_MODES.DATA_ENTRY) {
    return score?.awardedScore ?? 0;
  }
  if (mode === DISPLAY_MODES.PART_OF) {
    const awarded = score?.awardedScore ?? 0;
    return `${awarded}/${criterion.maxScore}`;
  }
  return 0;
}

/**
 * Check if a cell is unmarked (no score entered)
 * @param {Object} score - student score record { awardedScore, ... } or null
 * @returns {boolean}
 */
export function isUnmarked(score) {
  return score === null || score === undefined || score.awardedScore === undefined;
}

/**
 * Format a subtotal for display
 * @param {number} numerator - sum of awarded scores
 * @param {number} denominator - sum of max scores
 * @param {boolean} hasDecimal - true if any score is fractional
 * @returns {string} - formatted subtotal, e.g. "7/25" or "27.5/45"
 */
export function formatSubtotal(numerator, denominator, hasDecimal) {
  const num = hasDecimal ? numerator.toFixed(1) : Math.round(numerator);
  return `${num}/${denominator}`;
}

/**
 * Compute percentage, rounding per AD-MMB-5
 * (ties round up: 0.5 → 1)
 * @param {number} numerator
 * @param {number} denominator
 * @returns {number} - rounded percentage
 */
export function computePercentage(numerator, denominator) {
  if (denominator === 0) return 0;
  const raw = (numerator / denominator) * 100;
  // Ties round up: Math.round(61.5) = 62
  return Math.round(raw);
}

/**
 * Check if a tier is "unbalanced": its overridden criteria alone already
 * exceed the tier's fixed budget (FR-MMB-39). Never blocked, only flagged.
 * @param {Array} criteria - criteria already filtered to one tier
 * @param {number} budget - the tier's fixed budget
 * @returns {boolean}
 */
export function isTierUnbalanced(criteria, budget) {
  const overriddenSum = (criteria || [])
    .filter(c => c.allocationOverridden)
    .reduce((sum, c) => sum + (c.maxScore || 0), 0);
  return overriddenSum > budget;
}

/**
 * Pure 2D navigation helper for the per-student criteria table
 * (AC-MMB-17): column 0 = score cell, column 1 = comment cell.
 * Never returns a position outside [0, rowCount-1] x [0, 1].
 * @param {string} key - the pressed key (e.g. 'Enter', 'Tab', 'ArrowDown')
 * @param {number} row - current row index
 * @param {number} col - current column index (0 = score, 1 = comment)
 * @param {number} rowCount - total number of rows in the table
 * @returns {{row:number, col:number}|null} - null if the key isn't handled
 */
export function computeMatrixNav(key, row, col, rowCount) {
  if (rowCount <= 0) return null;
  let nextRow = row;
  let nextCol = col;
  switch (key) {
    case 'Enter':
      nextRow = Math.min(row + 1, rowCount - 1);
      nextCol = 0;
      break;
    case 'Tab':
      // Only score -> comment is handled explicitly; comment -> next row's
      // score is left to native tab order (AC-MMB-17 only specifies the
      // score-cell case).
      if (col === 0) nextCol = 1;
      else return null;
      break;
    case 'ArrowDown':
      nextRow = Math.min(row + 1, rowCount - 1);
      break;
    case 'ArrowUp':
      nextRow = Math.max(row - 1, 0);
      break;
    case 'ArrowLeft':
      nextCol = 0;
      break;
    case 'ArrowRight':
      nextCol = 1;
      break;
    default:
      return null;
  }
  return { row: nextRow, col: nextCol };
}

/**
 * Pure 2D navigation helper for the whole-class entry grid: rows are
 * flattened criteria, columns are students.
 * @param {string} key
 * @param {number} row
 * @param {number} col
 * @param {number} rowCount
 * @param {number} colCount
 * @returns {{row:number, col:number}|null}
 */
export function computeGridNav(key, row, col, rowCount, colCount) {
  if (rowCount <= 0 || colCount <= 0) return null;
  let nextRow = row;
  let nextCol = col;
  switch (key) {
    case 'Enter':
    case 'ArrowDown':
      nextRow = Math.min(row + 1, rowCount - 1);
      break;
    case 'ArrowUp':
      nextRow = Math.max(row - 1, 0);
      break;
    case 'ArrowLeft':
      nextCol = Math.max(col - 1, 0);
      break;
    case 'ArrowRight':
      nextCol = Math.min(col + 1, colCount - 1);
      break;
    default:
      return null;
  }
  return { row: nextRow, col: nextCol };
}

/**
 * Check if any score in the unit is fractional
 * @param {Array} matrices - array of student matrices
 * @returns {boolean}
 */
export function hasAnyFractionalScore(matrices) {
  for (const matrix of matrices) {
    for (const score of (matrix.scores || [])) {
      if (score.awardedScore !== undefined && score.awardedScore % 1 !== 0) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Main MarkingMatrix class
 * Manages one unit's matrix: template, students, display mode, orientation, scope
 */
export class MarkingMatrix {
  /**
   * @param {Object} unit - loaded unit from local-store
   * @param {Object} localStore - LocalStore instance for persistence
   */
  constructor(unit, localStore) {
    this.unit = unit;
    this.localStore = localStore;

    // Current display mode and scope (view preferences)
    this.displayMode = DISPLAY_MODES.DEFAULT_EMPTY;
    this.scope = null; // null = full-unit, otherwise assessmentId

    // Ensure matrixTemplate exists
    if (!this.unit.matrixTemplate) {
      this.unit.matrixTemplate = {
        orientation: 'portrait',
        criteria: []
      };
    }

    // Ensure matrices array exists
    if (!this.unit.matrices) {
      this.unit.matrices = [];
    }

    // Ensure students array exists
    if (!this.unit.students) {
      this.unit.students = [];
    }
  }

  // ===== TEMPLATE MANAGEMENT =====

  /**
   * Add a new criterion to the template
   * @param {string} tier - 'pass', 'intermediate', or 'advanced'
   * @param {string} criterionText - criterion description
   * @param {Array} assessmentIds - IDs of assessments this criterion marks
   * @returns {Object} - { warning, onConfirm } for FR-MMB-25
   */
  addCriterion(tier, criterionText, assessmentIds) {
    // Validate assessmentIds (FR-MMB-5)
    if (!assessmentIds || assessmentIds.length === 0) {
      throw new Error(`Criterion must bind to at least one assessment`);
    }

    // Validate assessment IDs resolve (FR-MMB-6)
    const assessments = this._getAssessmentsList();
    for (const id of assessmentIds) {
      if (!assessments.find(a => a.id === id)) {
        throw new Error(`Assessment ID ${id} does not exist`);
      }
    }

    // Check if any student has scores (for FR-MMB-25 warning)
    const hasScored = this.unit.matrices.some(m => m.scores && m.scores.length > 0);

    const warning = hasScored
      ? `Adding a marking criterion adds an unmarked row to every student, lowering their totals until marked.`
      : null;

    const onConfirm = () => {
      const criterion = {
        id: newId('crit-'),
        tier,
        criterion: criterionText,
        draftScore: 0,
        maxScore: 0,
        assessmentIds,
        allocationOverridden: false
      };

      this.unit.matrixTemplate.criteria.push(criterion);

      // Re-allocate this tier (FR-MMB-38)
      const tierCriteria = this.unit.matrixTemplate.criteria.filter(c => c.tier === tier);
      allocateTier(tierCriteria, TIER_BUDGETS[tier]);

      // Add empty score entry to every student's matrix
      for (const matrix of this.unit.matrices) {
        if (!matrix.scores) {
          matrix.scores = [];
        }
        matrix.scores.push({
          criterionId: criterion.id,
          awardedScore: undefined,
          comment: ''
        });
      }

      this.localStore.saveUnit(this.unit);
    };

    return { warning, onConfirm };
  }

  /**
   * Remove a criterion from the template
   * Cascades: deletes all scores referencing it (FR-MMB-8)
   * @param {string} criterionId
   * @returns {Object} - { count: N affected students, onConfirm }
   */
  removeCriterion(criterionId) {
    // Count how many students have scores for this criterion
    let count = 0;
    for (const matrix of this.unit.matrices) {
      if ((matrix.scores || []).some(s => s.criterionId === criterionId)) {
        count++;
      }
    }

    const onConfirm = () => {
      // Remove criterion from template
      const idx = this.unit.matrixTemplate.criteria.findIndex(c => c.id === criterionId);
      if (idx >= 0) {
        const criterion = this.unit.matrixTemplate.criteria[idx];
        this.unit.matrixTemplate.criteria.splice(idx, 1);

        // Remove scores from all student matrices
        for (const matrix of this.unit.matrices) {
          if (matrix.scores) {
            matrix.scores = matrix.scores.filter(s => s.criterionId !== criterionId);
          }
        }

        // Re-allocate the tier (FR-MMB-38)
        const tierCriteria = this.unit.matrixTemplate.criteria.filter(c => c.tier === criterion.tier);
        allocateTier(tierCriteria, TIER_BUDGETS[criterion.tier]);

        this.localStore.saveUnit(this.unit);
      }
    };

    return { count, onConfirm };
  }

  /**
   * Edit a criterion in the template
   * @param {string} criterionId
   * @param {Object} updates - { criterion, assessmentIds, ... }
   * @returns {Object} - { reallocationWarning, onCommit }
   */
  editCriterion(criterionId, updates) {
    const criterion = this.unit.matrixTemplate.criteria.find(c => c.id === criterionId);
    if (!criterion) {
      throw new Error(`Criterion ${criterionId} not found`);
    }

    // Validate assessment IDs if changed (FR-MMB-6)
    if (updates.assessmentIds !== undefined) {
      if (updates.assessmentIds.length === 0) {
        throw new Error(`Criterion must bind to at least one assessment`);
      }
      const assessments = this._getAssessmentsList();
      for (const id of updates.assessmentIds) {
        if (!assessments.find(a => a.id === id)) {
          throw new Error(`Assessment ID ${id} does not exist`);
        }
      }
    }

    let reallocationWarning = null;
    if (updates.tier !== undefined && updates.tier !== criterion.tier) {
      // Moving to a different tier triggers re-allocation (FR-MMB-38)
      reallocationWarning = `Changing this marking criterion's tier may re-allocate marks for every student in both tiers.`;
    }

    const onCommit = () => {
      // Update criterion fields
      if (updates.criterion !== undefined) criterion.criterion = updates.criterion;
      if (updates.assessmentIds !== undefined) criterion.assessmentIds = updates.assessmentIds;
      if (updates.draftScore !== undefined) criterion.draftScore = updates.draftScore;
      // Note: maxScore edits go through in-grid edit only (FR-MMB-28), handled separately
      if (updates.tier !== undefined && updates.tier !== criterion.tier) {
        // Move to new tier
        const oldTier = criterion.tier;
        criterion.tier = updates.tier;

        // Re-allocate both tiers
        const oldTierCriteria = this.unit.matrixTemplate.criteria.filter(c => c.tier === oldTier);
        const newTierCriteria = this.unit.matrixTemplate.criteria.filter(c => c.tier === updates.tier);
        allocateTier(oldTierCriteria, TIER_BUDGETS[oldTier]);
        allocateTier(newTierCriteria, TIER_BUDGETS[updates.tier]);
      }

      this.localStore.saveUnit(this.unit);
    };

    return { reallocationWarning, onCommit };
  }

  /**
   * Edit a criterion's maxScore (in-grid, FR-MMB-28)
   * Sets allocationOverridden flag and writes to template immediately
   * @param {string} criterionId
   * @param {number} newMaxScore
   */
  setMaxScore(criterionId, newMaxScore) {
    const criterion = this.unit.matrixTemplate.criteria.find(c => c.id === criterionId);
    if (!criterion) {
      throw new Error(`Criterion ${criterionId} not found`);
    }

    criterion.maxScore = newMaxScore;
    criterion.allocationOverridden = true;

    // Do NOT re-allocate this tier; overridden criteria are excluded (AD-MMB-18)
    this.localStore.saveUnit(this.unit);
  }

  // ===== POPULATE FROM CURRICULUM =====

  /**
   * Curriculum nodes eligible to become rubric rows: coded outcomes only
   * (never strands or tasks — a marking criterion traces to an assessed
   * outcome, per FR-CRB conventions elsewhere in the app).
   * @returns {Array} - unit.nodes[] entries with kind 'outcome'
   */
  getOutcomeNodes() {
    return (this.unit.nodes || []).filter((n) => n.kind === 'outcome');
  }

  /**
   * Curriculum nodeIds already linked to a rubric row. Used so
   * "populate from curriculum" adds rows without ever duplicating a link.
   * @returns {Set<string>}
   */
  getLinkedNodeIds() {
    return new Set(
      (this.unit.matrixTemplate.criteria || [])
        .filter((c) => c.nodeId)
        .map((c) => c.nodeId)
    );
  }

  /**
   * Assessment coverage, keyed by nodeId, normalized so both the canonical
   * shape (unitAssessment.finalAssessment.coverage[]) and the shape actually
   * produced by this app's seed data (coverage[] living directly on
   * unitAssessment, with finalAssessment only carrying the fixed tier pages)
   * resolve to the same map. assessmentId on each entry is the id
   * _getAssessmentsList() itself uses, so it lines up with addCriterion's
   * validation and with matrixTemplate.criteria[].assessmentIds.
   * @returns {Map<string, Array>} nodeId -> [{ coverage, assessmentId, name }]
   */
  _deriveAssessmentCoverageMap() {
    const ua = this.unit.unitAssessment;
    if (!ua) return new Map();

    const assessments = this._getAssessmentsList();
    const finalEntry = assessments.find((a) => a.name === 'Final Assessment');

    const normalizedUA = {
      finalAssessment: ua.finalAssessment
        ? {
            id: finalEntry ? finalEntry.id : ua.finalAssessment.id,
            title: ua.title,
            coverage: Array.isArray(ua.finalAssessment.coverage)
              ? ua.finalAssessment.coverage
              : (ua.coverage || [])
          }
        : undefined,
      miniAssessments: ua.miniAssessments
    };

    return deriveAssessmentCoverage(this.unit.nodes || [], normalizedUA);
  }

  /**
   * Assessment id(s) that actually assess a given node, per the coverage
   * index above. Used to bind an auto-populated criterion to the
   * assessment(s) it belongs to, rather than guessing.
   * @param {string} nodeId
   * @returns {string[]}
   */
  _getCoveringAssessmentIds(nodeId) {
    const entries = this._deriveAssessmentCoverageMap().get(nodeId) || [];
    return [...new Set(entries.map((e) => e.assessmentId).filter(Boolean))];
  }

  /**
   * Default node selection for "populate from curriculum": outcome nodes
   * this unit already assesses — restricted to the assessment in scope when
   * one is set, otherwise any assessment (full-unit view). Never invents a
   * selection when there's no coverage yet; the full outcome list stays
   * available in the picker either way.
   * @returns {string[]}
   */
  getDefaultCurriculumNodeIds() {
    const coverageMap = this._deriveAssessmentCoverageMap();
    const outcomeIds = new Set(this.getOutcomeNodes().map((n) => n.id));
    const defaults = [];

    for (const [nodeId, entries] of coverageMap.entries()) {
      if (!outcomeIds.has(nodeId) || !entries || entries.length === 0) continue;
      if (this.scope) {
        if (entries.some((e) => e.assessmentId === this.scope)) defaults.push(nodeId);
      } else {
        defaults.push(nodeId);
      }
    }

    return defaults;
  }

  /**
   * Bulk-add rubric rows from selected curriculum outcome nodes
   * ("populate from curriculum"). ADDS rows; existing hand-authored criteria
   * are never touched or removed. A node already linked to a row (per
   * getLinkedNodeIds) is skipped rather than duplicated, and reported back
   * in `alreadyLinked` so the caller can surface it.
   *
   * Each generated row pre-fills `criterion` from the node's title and sets
   * `nodeId`; `maxScore` is left to the same auto-allocation addCriterion
   * already uses (never a fabricated number), and `tier` is whatever the
   * teacher chose for this batch — never invented per-node.
   *
   * @param {string[]} nodeIds - outcome node ids chosen in the picker
   * @param {string} tier - 'pass' | 'intermediate' | 'advanced'
   * @returns {Object} - { toAdd, alreadyLinked, noAssessment, warning, onConfirm }
   */
  addCriteriaFromNodes(nodeIds, tier) {
    if (!['pass', 'intermediate', 'advanced'].includes(tier)) {
      throw new Error(`Invalid tier: ${tier}`);
    }

    const linked = this.getLinkedNodeIds();
    const nodeMap = {};
    for (const node of this.unit.nodes || []) nodeMap[node.id] = node;

    const allAssessmentIds = this._getAssessmentsList().map((a) => a.id);

    const toAdd = [];
    const alreadyLinked = [];
    const noAssessment = [];

    for (const nodeId of nodeIds || []) {
      const node = nodeMap[nodeId];
      if (!node || node.kind !== 'outcome') continue;

      if (linked.has(nodeId)) {
        alreadyLinked.push(node);
        continue;
      }

      const covering = this._getCoveringAssessmentIds(nodeId);
      const assessmentIds = covering.length > 0 ? covering : allAssessmentIds;
      if (assessmentIds.length === 0) {
        // No assessment exists yet to bind this criterion to (FR-MMB-5
        // requires at least one) — surface rather than silently drop.
        noAssessment.push(node);
        continue;
      }

      toAdd.push({ node, assessmentIds });
    }

    const hasScored = this.unit.matrices.some((m) => m.scores && m.scores.length > 0);
    const warning = (toAdd.length > 0 && hasScored)
      ? `Adding ${toAdd.length} marking ${toAdd.length === 1 ? 'criterion' : 'criteria'} adds an unmarked row to every student, lowering their totals until marked.`
      : null;

    const onConfirm = () => {
      for (const { node, assessmentIds } of toAdd) {
        const criterion = {
          id: newId('crit-'),
          tier,
          // node.title is the intended source, but this app's curriculum
          // data commonly leaves title unset and carries the description in
          // node.text instead (coverage-grid.js's row label has the same
          // `node.title || ''` gap) — fall back rather than create a blank
          // rubric row.
          criterion: node.title || node.text || '',
          nodeId: node.id,
          draftScore: 0,
          maxScore: 0,
          assessmentIds,
          allocationOverridden: false
        };

        this.unit.matrixTemplate.criteria.push(criterion);

        for (const matrix of this.unit.matrices) {
          if (!matrix.scores) matrix.scores = [];
          matrix.scores.push({
            criterionId: criterion.id,
            awardedScore: undefined,
            comment: ''
          });
        }
      }

      // Re-allocate the target tier once, after every new row is in (FR-MMB-38)
      const tierCriteria = this.unit.matrixTemplate.criteria.filter((c) => c.tier === tier);
      allocateTier(tierCriteria, TIER_BUDGETS[tier]);

      this.localStore.saveUnit(this.unit);
    };

    return {
      toAdd: toAdd.map((t) => t.node),
      alreadyLinked,
      noAssessment,
      warning,
      onConfirm
    };
  }

  // ===== STUDENT MANAGEMENT =====

  /**
   * Add a new student to the roster
   * Creates empty matrix with blank scores
   * @param {string} name
   * @returns {Object} - { id, name }
   */
  addStudent(name) {
    const student = {
      id: newId('stu-'),
      name
    };

    this.unit.students.push(student);

    // Create corresponding matrix with empty scores
    const matrix = {
      id: newId('mtx-'),
      studentId: student.id,
      scores: this.unit.matrixTemplate.criteria.map(c => ({
        criterionId: c.id,
        awardedScore: undefined,
        comment: ''
      }))
    };

    this.unit.matrices.push(matrix);

    this.localStore.saveUnit(this.unit);

    return student;
  }

  /**
   * Remove a student from the roster
   * Cascades: deletes their matrix and all scores (FR-MMB-7)
   * @param {string} studentId
   * @returns {Object} - { count: N scores deleted, onConfirm }
   */
  removeStudent(studentId) {
    const student = this.unit.students.find(s => s.id === studentId);
    if (!student) {
      throw new Error(`Student ${studentId} not found`);
    }

    const matrix = this.unit.matrices.find(m => m.studentId === studentId);
    const count = matrix ? (matrix.scores ? matrix.scores.length : 0) : 0;

    const onConfirm = () => {
      // Remove student
      this.unit.students = this.unit.students.filter(s => s.id !== studentId);
      // Remove matrix
      this.unit.matrices = this.unit.matrices.filter(m => m.studentId !== studentId);

      this.localStore.saveUnit(this.unit);
    };

    return { count, onConfirm };
  }

  // ===== SCORE ENTRY =====

  /**
   * Enter or update a score for a student/criterion pair
   * Auto-saves immediately (FR-MMB-29)
   * @param {string} studentId
   * @param {string} criterionId
   * @param {number} awardedScore - or undefined for unmarked
   * @param {string} comment
   */
  enterScore(studentId, criterionId, awardedScore, comment) {
    const matrix = this.unit.matrices.find(m => m.studentId === studentId);
    if (!matrix) {
      throw new Error(`Matrix for student ${studentId} not found`);
    }

    const criterion = this.unit.matrixTemplate.criteria.find(c => c.id === criterionId);
    if (!criterion) {
      throw new Error(`Criterion ${criterionId} not found`);
    }

    // Validate score range (FR-MMB-10)
    if (awardedScore !== undefined) {
      if (awardedScore < 0 || awardedScore > criterion.maxScore) {
        throw new Error(
          `Score ${awardedScore} out of range [0, ${criterion.maxScore}] for criterion ${criterionId}`
        );
      }
      // Check decimal places (one decimal max)
      const decimalPlaces = (awardedScore.toString().split('.')[1] || '').length;
      if (decimalPlaces > 1) {
        throw new Error(`Score must have at most one decimal place`);
      }
    }

    if (!matrix.scores) {
      matrix.scores = [];
    }

    let score = matrix.scores.find(s => s.criterionId === criterionId);
    if (!score) {
      score = { criterionId, awardedScore: undefined, comment: '' };
      matrix.scores.push(score);
    }

    score.awardedScore = awardedScore;
    score.comment = comment || '';

    this.localStore.saveUnit(this.unit);
  }

  // ===== DISPLAY MODE & SCOPE =====

  /**
   * Set the display mode
   * No write occurs on mode switch itself (FR-MMB-31)
   * @param {string} mode - DISPLAY_MODES constant
   */
  setDisplayMode(mode) {
    if (!Object.values(DISPLAY_MODES).includes(mode)) {
      throw new Error(`Invalid display mode: ${mode}`);
    }
    this.displayMode = mode;
    // No save (FR-MMB-31: switching modes writes nothing)
  }

  /**
   * Get current display mode
   * @returns {string}
   */
  getDisplayMode() {
    return this.displayMode;
  }

  /**
   * Set the scope (full-unit or per-assessment)
   * No write occurs on scope switch (FR-MMB-36)
   * @param {string|null} assessmentId - null for full-unit, otherwise assessment ID
   */
  setScope(assessmentId) {
    this.scope = assessmentId;
    // No save (FR-MMB-36: switching scope writes nothing)
  }

  /**
   * Get current scope
   * @returns {string|null}
   */
  getScope() {
    return this.scope;
  }

  /**
   * Set orientation (portrait or landscape)
   * Stored on matrix, immutable per document (FR-MMB-13)
   * @param {string} orientation - 'portrait' or 'landscape'
   */
  setOrientation(orientation) {
    if (!['portrait', 'landscape'].includes(orientation)) {
      throw new Error(`Invalid orientation: ${orientation}`);
    }
    this.unit.matrixTemplate.orientation = orientation;
    this.localStore.saveUnit(this.unit);
  }

  /**
   * Get current orientation
   * @returns {string}
   */
  getOrientation() {
    return this.unit.matrixTemplate.orientation || 'portrait';
  }

  // ===== FILTERING & COMPUTATION =====

  /**
   * Get criteria to display (filtered by scope if set)
   * @returns {Array} - array of criteria
   */
  getFilteredCriteria() {
    let criteria = this.unit.matrixTemplate.criteria;

    if (this.scope) {
      // Filter to criteria bound to this assessment (FR-MMB-33)
      criteria = criteria.filter(c => (c.assessmentIds || []).includes(this.scope));
    }

    return criteria;
  }

  /**
   * Compute tier subtotal for a student
   * @param {string} studentId
   * @param {string} tier - 'pass', 'intermediate', 'advanced'
   * @returns {Object} - { numerator, denominator, percentage, display }
   */
  computeTierSubtotal(studentId, tier) {
    const matrix = this.unit.matrices.find(m => m.studentId === studentId);
    if (!matrix) {
      return { numerator: 0, denominator: 0, percentage: 0, display: '0/0' };
    }

    const criteria = this.getFilteredCriteria().filter(c => c.tier === tier);
    if (criteria.length === 0) {
      return { numerator: 0, denominator: 0, percentage: 0, display: '0/0', unsetup: true };
    }

    let numerator = 0;
    let denominator = 0;

    for (const criterion of criteria) {
      const score = matrix.scores.find(s => s.criterionId === criterion.id);
      // Data entry / Part of formula: unmarked counts as 0 numerator (AD-MMB-5)
      numerator += score?.awardedScore ?? 0;
      denominator += criterion.maxScore;
    }

    const percentage = computePercentage(numerator, denominator);
    const hasFractional = hasAnyFractionalScore([matrix]);
    const display = formatSubtotal(numerator, denominator, hasFractional);

    return { numerator, denominator, percentage, display, unsetup: false };
  }

  /**
   * Compute unit total for a student
   * @param {string} studentId
   * @returns {Object} - { numerator, denominator, percentage, display }
   */
  computeUnitTotal(studentId) {
    const matrix = this.unit.matrices.find(m => m.studentId === studentId);
    if (!matrix) {
      return { numerator: 0, denominator: 0, percentage: 0, display: '0/0' };
    }

    // Always compute full-unit, never summed from per-assessment (FR-MMB-35)
    const criteria = this.unit.matrixTemplate.criteria;

    let numerator = 0;
    let denominator = 0;

    for (const criterion of criteria) {
      const score = matrix.scores.find(s => s.criterionId === criterion.id);
      numerator += score?.awardedScore ?? 0;
      denominator += criterion.maxScore;
    }

    const percentage = computePercentage(numerator, denominator);
    const hasFractional = hasAnyFractionalScore([matrix]);
    const display = formatSubtotal(numerator, denominator, hasFractional);

    return { numerator, denominator, percentage, display };
  }

  /**
   * Compute a single assessment's own subtotal for a student (FR-MMB-45).
   * Restricted to criteria whose assessmentIds[] includes this assessment;
   * never derived from / summed into the unit total.
   * @param {string} studentId
   * @param {string} assessmentId
   * @returns {Object} - { numerator, denominator, percentage, display, hasScored }
   */
  computeAssessmentSubtotal(studentId, assessmentId) {
    const matrix = this.unit.matrices.find(m => m.studentId === studentId);
    const criteria = this.unit.matrixTemplate.criteria.filter(c =>
      (c.assessmentIds || []).includes(assessmentId)
    );

    if (!matrix || criteria.length === 0) {
      return { numerator: 0, denominator: 0, percentage: 0, display: '—', hasScored: false };
    }

    let numerator = 0;
    let denominator = 0;
    let hasScored = false;

    for (const criterion of criteria) {
      const score = matrix.scores.find(s => s.criterionId === criterion.id);
      if (!isUnmarked(score)) hasScored = true;
      numerator += score?.awardedScore ?? 0;
      denominator += criterion.maxScore;
    }

    const percentage = computePercentage(numerator, denominator);
    const hasFractional = hasAnyFractionalScore([matrix]);
    // An assessment with no scored criteria renders the same dash as an
    // unmarked cell (FR-MMB-10a), never a fabricated 0 (AC-MMB-44).
    const display = hasScored ? formatSubtotal(numerator, denominator, hasFractional) : `— / ${denominator}`;

    return { numerator, denominator, percentage, display, hasScored };
  }

  /**
   * Get list of all assessments (final + minis)
   * @returns {Array} - array of assessment objects with id, name
   */
  _getAssessmentsList() {
    const assessments = [];

    const ua = this.unit.unitAssessment;
    if (ua) {
      if (ua.finalAssessment) {
        assessments.push({
          id: ua.finalAssessment.id || 'final',
          name: 'Final Assessment'
        });
      }
      if (ua.miniAssessments && Array.isArray(ua.miniAssessments)) {
        ua.miniAssessments.forEach((mini, idx) => {
          assessments.push({
            id: mini.id,
            name: mini.name || `Mini Assessment ${idx + 1}`
          });
        });
      }
    }

    return assessments;
  }

  // ===== RENDERING =====

  /**
   * Render per-student marking page as SVG
   * One page per student, grouped by tier
   * @param {string} studentId
   * @returns {SVGElement}
   */
  renderStudentPage(studentId) {
    const student = this.unit.students.find(s => s.id === studentId);
    if (!student) {
      throw new Error(`Student ${studentId} not found`);
    }

    // Create container
    const container = document.createElement('div');
    container.className = 'marking-matrix-page';

    // Header
    const header = document.createElement('div');
    header.className = 'matrix-header';
    const h1 = document.createElement('h1');
    h1.textContent = `Marking Matrix — ${this.unit.meta?.unitName || 'Unit'}`;
    const p = document.createElement('p');
    p.textContent = `${student.name} • ${this.unit.meta?.subject || 'Class'}`;
    header.appendChild(h1);
    header.appendChild(p);
    container.appendChild(header);

    // Student band
    const studentBand = document.createElement('div');
    studentBand.className = 'student-band';
    const nameEl = document.createElement('div');
    nameEl.className = 'student-name';
    nameEl.textContent = student.name;
    const totalEl = document.createElement('div');
    totalEl.className = 'student-total';
    const unitTotal = this.computeUnitTotal(studentId);
    const totalValue = document.createElement('div');
    totalValue.className = 'student-total-value';
    totalValue.textContent = `${unitTotal.numerator} / ${unitTotal.denominator}`;
    const totalLabel = document.createElement('div');
    totalLabel.className = 'student-total-label';
    totalLabel.textContent = `${unitTotal.percentage}%`;
    totalEl.appendChild(totalValue);
    totalEl.appendChild(totalLabel);
    studentBand.appendChild(nameEl);
    studentBand.appendChild(totalEl);
    container.appendChild(studentBand);

    // Default Full mode standing notice (FR-MMB-28, AC-MMB-30)
    container.appendChild(this._renderDefaultFullNotice());

    // Criteria table
    const table = document.createElement('div');
    table.className = 'criteria-table';

    // Flattened row registry for keyboard navigation (AC-MMB-17, AD-MMB-9):
    // one shared delegated keydown handler, no per-cell listener duplication.
    const navCells = []; // [{ scoreInput, commentInput }]

    // Group criteria by tier (FR-MMB-19: tier-grouped rows)
    for (const tier of ['pass', 'intermediate', 'advanced']) {
      const criteria = this.getFilteredCriteria().filter(c => c.tier === tier);
      const matrix = this.unit.matrices.find(m => m.studentId === studentId);

      // Tier band (FR-MMB-39 unbalanced flag, FR-MMB-40 not-yet-set-up state)
      const unbalanced = isTierUnbalanced(criteria, TIER_BUDGETS[tier]);
      const notYetSetUp = criteria.length === 0;
      const tierBand = document.createElement('div');
      tierBand.className = `tier-band ${tier}${unbalanced ? ' tier-unbalanced' : ''}${notYetSetUp ? ' notYetSetUp' : ''}`;
      const tierLabel = document.createElement('strong');
      tierLabel.textContent = `${tier.charAt(0).toUpperCase() + tier.slice(1)} Tier`;
      tierBand.appendChild(tierLabel);
      if (notYetSetUp) {
        const badge = document.createElement('span');
        badge.className = 'tier-flag-badge';
        badge.textContent = 'Not yet set up';
        tierBand.appendChild(badge);
      } else if (unbalanced) {
        const badge = document.createElement('span');
        badge.className = 'tier-flag-badge';
        badge.textContent = 'Unbalanced';
        tierBand.appendChild(badge);
      }
      table.appendChild(tierBand);

      for (const criterion of criteria) {
        const row = document.createElement('div');
        row.className = 'criterion-row';

        const text = document.createElement('div');
        text.className = 'criterion-text';
        text.appendChild(this._renderCriterionLabel(criterion));

        const maxEl = document.createElement('div');
        maxEl.className = 'criterion-max';
        maxEl.textContent = criterion.maxScore.toString();

        const score = matrix?.scores?.find(s => s.criterionId === criterion.id);

        // Score cell: editable input (FR-MMB-20 keyboard-first entry)
        const scoreCell = document.createElement('div');
        scoreCell.className = `criterion-score ${isUnmarked(score) ? 'unmarked' : ''}`;
        const scoreInput = document.createElement('input');
        scoreInput.type = 'text';
        scoreInput.className = 'score-input';
        scoreInput.value = score?.awardedScore ?? '';
        scoreInput.placeholder = '—';
        scoreInput.disabled = this.displayMode === DISPLAY_MODES.DEFAULT_FULL || this.displayMode === DISPLAY_MODES.DEFAULT_EMPTY;
        const rowIndex = navCells.length;
        scoreInput.setAttribute('data-row', rowIndex.toString());
        scoreInput.setAttribute('data-col', '0');
        scoreInput.addEventListener('change', () => {
          try {
            const value = scoreInput.value ? parseFloat(scoreInput.value) : undefined;
            this.enterScore(studentId, criterion.id, value, commentInput.value);
          } catch (e) {
            scoreInput.value = score?.awardedScore ?? '';
            alert(`Invalid score: ${e.message}`);
          }
        });
        scoreCell.appendChild(scoreInput);

        const contrib = document.createElement('div');
        contrib.className = 'criterion-contribution';
        contrib.textContent = score?.awardedScore
          ? `${score.awardedScore} / ${criterion.maxScore}`
          : `— / ${criterion.maxScore}`;

        // Comment cell: editable input (Tab target, AC-MMB-17)
        const commentCell = document.createElement('div');
        commentCell.className = 'criterion-comment';
        const commentInput = document.createElement('input');
        commentInput.type = 'text';
        commentInput.className = 'comment-input';
        commentInput.value = score?.comment ?? '';
        commentInput.placeholder = 'Comment';
        commentInput.disabled = this.displayMode === DISPLAY_MODES.DEFAULT_FULL || this.displayMode === DISPLAY_MODES.DEFAULT_EMPTY;
        commentInput.setAttribute('data-row', rowIndex.toString());
        commentInput.setAttribute('data-col', '1');
        commentInput.addEventListener('change', () => {
          try {
            const value = scoreInput.value ? parseFloat(scoreInput.value) : undefined;
            this.enterScore(studentId, criterion.id, value, commentInput.value);
          } catch (e) {
            alert(`Invalid score: ${e.message}`);
          }
        });
        commentCell.appendChild(commentInput);

        row.appendChild(text);
        row.appendChild(maxEl);
        row.appendChild(scoreCell);
        row.appendChild(contrib);
        row.appendChild(commentCell);
        table.appendChild(row);

        navCells.push({ scoreInput, commentInput });
      }

      // Tier subtotal
      const subtotal = this.computeTierSubtotal(studentId, tier);
      const subtotalRow = document.createElement('div');
      subtotalRow.className = 'subtotal-row';
      const label = document.createElement('div');
      label.className = 'subtotal-label';
      label.textContent = `${tier.charAt(0).toUpperCase() + tier.slice(1)} Subtotal`;
      const value = document.createElement('div');
      value.className = 'subtotal-value';
      value.textContent = subtotal.display;
      const pct = document.createElement('div');
      pct.className = 'subtotal-percentage';
      pct.textContent = `${subtotal.percentage}%`;
      subtotalRow.appendChild(label);
      subtotalRow.appendChild(document.createElement('div')); // spacer
      subtotalRow.appendChild(value);
      subtotalRow.appendChild(pct);
      subtotalRow.appendChild(document.createElement('div')); // spacer (comment column)
      table.appendChild(subtotalRow);
    }

    // Single delegated keydown handler for the whole table (AD-MMB-9):
    // Enter/Tab/Arrow navigation across the flattened row registry.
    table.addEventListener('keydown', (e) => {
      const target = e.target;
      if (!target || (target.dataset && target.dataset.row === undefined)) return;
      const row = parseInt(target.getAttribute('data-row'), 10);
      const col = parseInt(target.getAttribute('data-col'), 10);
      if (Number.isNaN(row) || Number.isNaN(col)) return;

      const next = computeMatrixNav(e.key, row, col, navCells.length);
      if (!next) return;

      e.preventDefault();
      const targetCell = navCells[next.row];
      if (!targetCell) return;
      const nextInput = next.col === 0 ? targetCell.scoreInput : targetCell.commentInput;
      if (nextInput && typeof nextInput.focus === 'function') {
        nextInput.focus();
      }
    });

    container.appendChild(table);

    return container;
  }

  /**
   * Render a criterion's label into `container`: its free-text criterion,
   * plus — when linked to a curriculum outcome via nodeId — a compact
   * curriculum code so a teacher can see which criterion a mark relates to
   * (traceability.js's shared code component, non-clickable: there's no
   * node-detail view in this app to navigate to).
   *
   * Appends directly to `container` rather than returning a
   * DocumentFragment, since the two render targets (a plain HTML div, a
   * sticky grid-row-header div) already exist — no wrapper node needed.
   * @param {Object} criterion - matrixTemplate.criteria[] entry
   * @returns {DocumentFragment}
   */
  _renderCriterionLabel(criterion) {
    const frag = document.createElement('span');

    if (criterion.nodeId) {
      const node = (this.unit.nodes || []).find((n) => n.id === criterion.nodeId);
      if (node && node.code) {
        const codeEl = document.createElement('span');
        codeEl.className = 'criterion-code';
        codeEl.textContent = renderCode(node.code, false);
        frag.appendChild(codeEl);
      }
    }

    const textEl = document.createElement('span');
    textEl.textContent = criterion.criterion;
    frag.appendChild(textEl);

    return frag;
  }

  /**
   * Build the Default Full mode standing notice element (FR-MMB-28,
   * AC-MMB-30). Present and visible only while Default Full is active.
   * @returns {HTMLElement}
   */
  _renderDefaultFullNotice() {
    const notice = document.createElement('div');
    const isActive = this.displayMode === DISPLAY_MODES.DEFAULT_FULL;
    notice.className = `default-full-notice${isActive ? ' visible' : ''}`;
    const icon = document.createElement('span');
    icon.className = 'default-full-notice-icon';
    icon.textContent = '⚠';
    const text = document.createElement('span');
    text.textContent = 'Editing here changes every student\'s mark ceiling.';
    notice.appendChild(icon);
    notice.appendChild(text);
    return notice;
  }

  /**
   * Render whole-class entry grid (students × criteria)
   * @returns {HTMLElement}
   */
  renderClassGrid() {
    const container = document.createElement('div');
    container.className = 'marking-matrix-grid-container';

    const header = document.createElement('div');
    header.className = 'class-grid-header';
    const h2 = document.createElement('h2');
    h2.textContent = `Class Marking Grid — ${this.unit.meta?.unitName || 'Unit'}`;
    header.appendChild(h2);
    container.appendChild(header);

    // Default Full mode standing notice (FR-MMB-28, AC-MMB-30)
    container.appendChild(this._renderDefaultFullNotice());

    // Build grid
    const grid = document.createElement('div');
    grid.className = 'class-grid-table';
    // One column per student, after the leading criterion-label column. The
    // grid is a CSS grid filled row-major, so it needs an explicit column
    // count or every cell lands in its own column (see marking-matrix-grid.css).
    grid.style.setProperty('--class-grid-columns', String(this.unit.students.length));

    // Flattened row registry for keyboard navigation (AC-MMB-17, AD-MMB-9)
    const navRows = []; // [ [input, input, ...] ] one array of inputs per criterion row

    // Header row: student names
    const headerCell = document.createElement('div');
    headerCell.className = 'grid-header-cell';
    headerCell.textContent = 'Marking Criteria';
    grid.appendChild(headerCell);

    for (const student of this.unit.students) {
      const cell = document.createElement('div');
      cell.className = 'grid-header-cell';
      cell.textContent = student.name;
      grid.appendChild(cell);
    }

    // Criteria rows
    for (const tier of ['pass', 'intermediate', 'advanced']) {
      // Criteria in this tier (needed before the band, to detect state)
      const criteria = this.getFilteredCriteria().filter(c => c.tier === tier);

      // Tier band row (FR-MMB-39 unbalanced flag, FR-MMB-40 not-yet-set-up state)
      const unbalanced = isTierUnbalanced(criteria, TIER_BUDGETS[tier]);
      const notYetSetUp = criteria.length === 0;
      const tierHeader = document.createElement('div');
      tierHeader.className = `grid-row-header tier-band ${tier}${unbalanced ? ' tier-unbalanced' : ''}${notYetSetUp ? ' notYetSetUp' : ''}`;
      tierHeader.textContent = `${tier.charAt(0).toUpperCase() + tier.slice(1)} Tier${notYetSetUp ? ' — Not yet set up' : unbalanced ? ' — Unbalanced' : ''}`;
      grid.appendChild(tierHeader);

      for (let i = 0; i < this.unit.students.length; i++) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        grid.appendChild(cell);
      }

      for (const criterion of criteria) {
        const rowHeader = document.createElement('div');
        rowHeader.className = 'grid-row-header';
        rowHeader.appendChild(this._renderCriterionLabel(criterion));
        grid.appendChild(rowHeader);

        const rowInputs = [];
        const rowIndex = navRows.length;

        for (let studentIndex = 0; studentIndex < this.unit.students.length; studentIndex++) {
          const student = this.unit.students[studentIndex];
          const matrix = this.unit.matrices.find(m => m.studentId === student.id);
          const score = matrix?.scores?.find(s => s.criterionId === criterion.id);

          const cell = document.createElement('div');
          cell.className = `grid-cell ${isUnmarked(score) ? 'unmarked' : ''}`;
          cell.setAttribute('data-student', student.id);
          cell.setAttribute('data-criterion', criterion.id);

          const input = document.createElement('input');
          input.type = 'text';
          input.value = score?.awardedScore ?? '';
          input.placeholder = '—';
          input.disabled = this.displayMode === DISPLAY_MODES.DEFAULT_FULL || this.displayMode === DISPLAY_MODES.DEFAULT_EMPTY;
          input.setAttribute('data-row', rowIndex.toString());
          input.setAttribute('data-col', studentIndex.toString());

          // On change: save score (FR-MMB-29: auto-save)
          input.addEventListener('change', () => {
            try {
              const value = input.value ? parseFloat(input.value) : undefined;
              this.enterScore(student.id, criterion.id, value, '');
            } catch (e) {
              input.value = score?.awardedScore ?? '';
              alert(`Invalid score: ${e.message}`);
            }
          });

          cell.appendChild(input);
          grid.appendChild(cell);
          rowInputs.push(input);
        }

        navRows.push(rowInputs);
      }

      // Tier subtotal row
      const subtotalHeader = document.createElement('div');
      subtotalHeader.className = 'grid-row-header';
      subtotalHeader.textContent = `${tier.charAt(0).toUpperCase() + tier.slice(1)} Total`;
      grid.appendChild(subtotalHeader);

      for (const student of this.unit.students) {
        const subtotal = this.computeTierSubtotal(student.id, tier);
        const cell = document.createElement('div');
        cell.className = 'grid-subtotal-cell';
        cell.textContent = subtotal.display;
        grid.appendChild(cell);
      }
    }

    // Single delegated keydown handler for 2D navigation (AC-MMB-17,
    // AD-MMB-9): rows = criteria, columns = students.
    grid.addEventListener('keydown', (e) => {
      const target = e.target;
      if (!target || target.getAttribute('data-row') === null) return;
      const row = parseInt(target.getAttribute('data-row'), 10);
      const col = parseInt(target.getAttribute('data-col'), 10);
      if (Number.isNaN(row) || Number.isNaN(col)) return;

      const next = computeGridNav(e.key, row, col, navRows.length, this.unit.students.length);
      if (!next) return;

      e.preventDefault();
      const nextInput = navRows[next.row]?.[next.col];
      if (nextInput && typeof nextInput.focus === 'function') {
        nextInput.focus();
      }
    });

    container.appendChild(grid);

    return container;
  }

  /**
   * Render Student-data print sheet (per-student A4 page)
   * Uses Data entry mode arithmetic regardless of current mode (FR-MMB-32)
   * @param {string} studentId
   * @returns {DocumentShell}
   */
  renderStudentDataPrint(studentId) {
    const student = this.unit.students.find(s => s.id === studentId);
    if (!student) {
      throw new Error(`Student ${studentId} not found`);
    }

    const orientation = this.getOrientation();
    const matrix = this.unit.matrices.find(m => m.studentId === studentId);

    const renderFn = (pageData, svgElement) => {
      const tiers = ['pass', 'intermediate', 'advanced'];
      let yPos = 20;

      // Header
      const headerGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');

      const studentName = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      studentName.setAttribute('x', '20');
      studentName.setAttribute('y', yPos);
      studentName.setAttribute('font-size', String(pxToUserUnits(14)));
      studentName.setAttribute('font-weight', 'bold');
      studentName.textContent = student.name;
      headerGroup.appendChild(studentName);

      const unitLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      unitLabel.setAttribute('x', '20');
      unitLabel.setAttribute('y', yPos + 12);
      unitLabel.setAttribute('font-size', String(pxToUserUnits(10)));
      unitLabel.setAttribute('fill', '#666');
      unitLabel.textContent = `${this.unit.meta?.subject || 'Class'} • ${this.unit.meta?.unitName || 'Unit'}`;
      headerGroup.appendChild(unitLabel);

      svgElement.appendChild(headerGroup);
      yPos += 40;

      // Criteria table
      for (const tier of tiers) {
        const tierCriteria = this.unit.matrixTemplate.criteria.filter(c => c.tier === tier);

        // Tier header
        const tierGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        tierGroup.setAttribute('fill', TIERS[tier].tint);

        const tierRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        tierRect.setAttribute('x', '15');
        tierRect.setAttribute('y', yPos);
        tierRect.setAttribute('width', '180');
        tierRect.setAttribute('height', '8');
        tierGroup.appendChild(tierRect);

        const tierText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        tierText.setAttribute('x', '20');
        tierText.setAttribute('y', yPos + 6);
        tierText.setAttribute('font-size', String(pxToUserUnits(10)));
        tierText.setAttribute('font-weight', 'bold');
        tierText.setAttribute('fill', TIERS[tier].ink);
        tierText.textContent = tier.charAt(0).toUpperCase() + tier.slice(1);
        tierGroup.appendChild(tierText);

        svgElement.appendChild(tierGroup);
        yPos += 12;

        // Criteria rows
        for (const criterion of tierCriteria) {
          const score = matrix?.scores?.find(s => s.criterionId === criterion.id);
          const displayScore = score?.awardedScore ?? 0;

          const row = document.createElementNS('http://www.w3.org/2000/svg', 'g');

          // Criterion text
          const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          text.setAttribute('x', '20');
          text.setAttribute('y', yPos + 6);
          text.setAttribute('font-size', String(pxToUserUnits(10)));
          text.textContent = criterion.criterion.substring(0, 40);
          row.appendChild(text);

          // Score (Data entry format: raw value, unmarked as distinct dash)
          const scoreText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          scoreText.setAttribute('x', '160');
          scoreText.setAttribute('y', yPos + 6);
          scoreText.setAttribute('font-size', String(pxToUserUnits(10)));
          scoreText.setAttribute('font-weight', 'bold');
          scoreText.setAttribute('text-anchor', 'end');
          scoreText.textContent = isUnmarked(score) ? '—' : displayScore.toString();
          row.appendChild(scoreText);

          // Max score
          const maxText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          maxText.setAttribute('x', '175');
          maxText.setAttribute('y', yPos + 6);
          maxText.setAttribute('font-size', String(pxToUserUnits(10)));
          maxText.setAttribute('fill', '#666');
          maxText.textContent = `/ ${criterion.maxScore}`;
          row.appendChild(maxText);

          // Divider
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('x1', '15');
          line.setAttribute('x2', '190');
          line.setAttribute('y1', yPos + 10);
          line.setAttribute('y2', yPos + 10);
          line.setAttribute('stroke', '#ccc');
          line.setAttribute('stroke-width', '0.5');
          row.appendChild(line);

          svgElement.appendChild(row);
          yPos += 12;
        }

        // Tier subtotal
        const subtotal = this.computeTierSubtotal(studentId, tier);
        const subtotalText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        subtotalText.setAttribute('x', '160');
        subtotalText.setAttribute('y', yPos + 6);
        subtotalText.setAttribute('font-size', String(pxToUserUnits(10)));
        subtotalText.setAttribute('font-weight', 'bold');
        subtotalText.textContent = `${subtotal.display} (${subtotal.percentage}%)`;
        svgElement.appendChild(subtotalText);
        yPos += 14;
      }

      // Unit-progress block (FR-MMB-45, AC-MMB-44/45): Student-data print
      // only — never on the Setup blank sheet.
      this._renderUnitProgressBlock(svgElement, studentId, yPos);
    };

    const data = { pages: [{ orientation, studentId }] };
    return new DocumentShell(data, renderFn, orientation);
  }

  /**
   * Render the unit-progress block onto a Student-data print page
   * (FR-MMB-45). Lists every unit assessment's own per-assessment
   * subtotal for this student, then the unit total in its own bordered
   * panel, visually separated by a rule/gap (SR-9, AC-MMB-45) — never
   * derived by summing the rows above it (AC-MMB-44).
   * @param {SVGElement} svgElement
   * @param {string} studentId
   * @param {number} yPos - starting y position
   * @returns {number} - the y position after the block
   */
  _renderUnitProgressBlock(svgElement, studentId, yPos) {
    const assessments = this._getAssessmentsList();
    if (assessments.length === 0) return yPos;

    const NS = 'http://www.w3.org/2000/svg';
    let y = yPos + 10;

    const heading = document.createElementNS(NS, 'text');
    heading.setAttribute('x', '20');
    heading.setAttribute('y', y);
    heading.setAttribute('font-size', String(pxToUserUnits(10)));
    heading.setAttribute('font-weight', 'bold');
    heading.textContent = 'Unit progress';
    svgElement.appendChild(heading);
    y += 8;

    // Bordered panel around the per-assessment rows (SR-9 visual separation).
    // Border is appended first (two-pass) so it sits behind the row text
    // without requiring insertBefore/z-ordering support from the DOM.
    const rowsStartY = y;
    const rowsHeight = assessments.length * 10;

    const rowsBorder = document.createElementNS(NS, 'rect');
    rowsBorder.setAttribute('x', '15');
    rowsBorder.setAttribute('y', rowsStartY - 4);
    rowsBorder.setAttribute('width', '175');
    rowsBorder.setAttribute('height', rowsHeight + 4);
    rowsBorder.setAttribute('fill', 'none');
    rowsBorder.setAttribute('stroke', '#ccc');
    rowsBorder.setAttribute('stroke-width', '0.5');
    svgElement.appendChild(rowsBorder);

    for (const assessment of assessments) {
      const subtotal = this.computeAssessmentSubtotal(studentId, assessment.id);

      const nameText = document.createElementNS(NS, 'text');
      nameText.setAttribute('x', '20');
      nameText.setAttribute('y', y + 6);
      nameText.setAttribute('font-size', String(pxToUserUnits(9)));
      nameText.textContent = assessment.name;
      svgElement.appendChild(nameText);

      const valueText = document.createElementNS(NS, 'text');
      valueText.setAttribute('x', '175');
      valueText.setAttribute('y', y + 6);
      valueText.setAttribute('font-size', String(pxToUserUnits(9)));
      valueText.setAttribute('text-anchor', 'end');
      valueText.textContent = subtotal.display;
      svgElement.appendChild(valueText);

      y += 10;
    }

    // Visible gap + rule separating the rows from the unit-total panel
    y += 6;
    const rule = document.createElementNS(NS, 'line');
    rule.setAttribute('x1', '15');
    rule.setAttribute('x2', '190');
    rule.setAttribute('y1', y);
    rule.setAttribute('y2', y);
    rule.setAttribute('stroke', '#666');
    rule.setAttribute('stroke-width', '1');
    svgElement.appendChild(rule);
    y += 8;

    // Unit total: its own bordered panel, own label, read from the
    // existing tiered-ceiling computation — never re-derived (AC-MMB-44).
    const unitTotal = this.computeUnitTotal(studentId);
    const panelTop = y - 6;
    const panel = document.createElementNS(NS, 'rect');
    panel.setAttribute('x', '15');
    panel.setAttribute('y', panelTop);
    panel.setAttribute('width', '175');
    panel.setAttribute('height', '16');
    panel.setAttribute('fill', 'none');
    panel.setAttribute('stroke', '#333');
    panel.setAttribute('stroke-width', '0.75');
    svgElement.appendChild(panel);

    const label = document.createElementNS(NS, 'text');
    label.setAttribute('x', '20');
    label.setAttribute('y', y + 4);
    label.setAttribute('font-size', String(pxToUserUnits(10)));
    label.setAttribute('font-weight', 'bold');
    label.textContent = 'Unit total';
    svgElement.appendChild(label);

    const value = document.createElementNS(NS, 'text');
    value.setAttribute('x', '175');
    value.setAttribute('y', y + 4);
    value.setAttribute('font-size', String(pxToUserUnits(10)));
    value.setAttribute('font-weight', 'bold');
    value.setAttribute('text-anchor', 'end');
    value.textContent = `${unitTotal.display} (${unitTotal.percentage}%)`;
    svgElement.appendChild(value);

    return panelTop + 16;
  }

  /**
   * Render Setup blank marking sheet (empty cells for handwriting)
   * No student data; used for printing templates (FR-MMB-43)
   * @returns {DocumentShell}
   */
  renderSetupPrint() {
    const orientation = this.getOrientation();

    const renderFn = (pageData, svgElement) => {
      let yPos = 20;

      // Header
      const header = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      header.setAttribute('x', '20');
      header.setAttribute('y', yPos);
      header.setAttribute('font-size', String(pxToUserUnits(14)));
      header.setAttribute('font-weight', 'bold');
      header.textContent = 'Blank Marking Sheet';
      svgElement.appendChild(header);
      yPos += 20;

      // Student name line
      const nameLine = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      nameLine.setAttribute('x', '20');
      nameLine.setAttribute('y', yPos + 6);
      nameLine.setAttribute('font-size', String(pxToUserUnits(10)));
      nameLine.textContent = 'Student: ___________________________';
      svgElement.appendChild(nameLine);

      const totalLine = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      totalLine.setAttribute('x', '140');
      totalLine.setAttribute('y', yPos + 6);
      totalLine.setAttribute('font-size', String(pxToUserUnits(10)));
      totalLine.textContent = 'Total: ____ / 100';
      svgElement.appendChild(totalLine);
      yPos += 20;

      // Criteria table
      for (const tier of ['pass', 'intermediate', 'advanced']) {
        const tierCriteria = this.unit.matrixTemplate.criteria.filter(c => c.tier === tier);

        // Tier header
        const tierGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        tierGroup.setAttribute('fill', TIERS[tier].tint);

        const tierRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        tierRect.setAttribute('x', '15');
        tierRect.setAttribute('y', yPos);
        tierRect.setAttribute('width', '180');
        tierRect.setAttribute('height', '8');
        tierGroup.appendChild(tierRect);

        const tierText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        tierText.setAttribute('x', '20');
        tierText.setAttribute('y', yPos + 6);
        tierText.setAttribute('font-size', String(pxToUserUnits(10)));
        tierText.setAttribute('font-weight', 'bold');
        tierText.setAttribute('fill', TIERS[tier].ink);
        tierText.textContent = `${tier.charAt(0).toUpperCase() + tier.slice(1)} (Budget: ${TIER_BUDGETS[tier]})`;
        tierGroup.appendChild(tierText);

        svgElement.appendChild(tierGroup);
        yPos += 12;

        // Criteria rows
        for (const criterion of tierCriteria) {
          const row = document.createElementNS('http://www.w3.org/2000/svg', 'g');

          // Criterion text
          const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          text.setAttribute('x', '20');
          text.setAttribute('y', yPos + 6);
          text.setAttribute('font-size', String(pxToUserUnits(10)));
          text.textContent = criterion.criterion.substring(0, 40);
          row.appendChild(text);

          // Empty box for handwritten score
          const box = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          box.setAttribute('x', '155');
          box.setAttribute('y', yPos - 2);
          box.setAttribute('width', '20');
          box.setAttribute('height', '10');
          box.setAttribute('fill', '#fafaf9');
          box.setAttribute('stroke', '#ccc');
          box.setAttribute('stroke-width', '0.5');
          row.appendChild(box);

          // Max score label
          const maxText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          maxText.setAttribute('x', '180');
          maxText.setAttribute('y', yPos + 6);
          maxText.setAttribute('font-size', String(pxToUserUnits(9)));
          maxText.setAttribute('fill', '#666');
          maxText.textContent = `/ ${criterion.maxScore}`;
          row.appendChild(maxText);

          // Divider
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('x1', '15');
          line.setAttribute('x2', '190');
          line.setAttribute('y1', yPos + 10);
          line.setAttribute('y2', yPos + 10);
          line.setAttribute('stroke', '#ccc');
          line.setAttribute('stroke-width', '0.5');
          row.appendChild(line);

          svgElement.appendChild(row);
          yPos += 12;
        }

        // Tier total
        const totalText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        totalText.setAttribute('x', '155');
        totalText.setAttribute('y', yPos + 6);
        totalText.setAttribute('font-size', String(pxToUserUnits(10)));
        totalText.setAttribute('font-weight', 'bold');
        totalText.textContent = `____ / ${TIER_BUDGETS[tier]}`;
        svgElement.appendChild(totalText);
        yPos += 14;
      }
    };

    const data = { pages: [{ orientation }] };
    return new DocumentShell(data, renderFn, orientation);
  }
}

export default MarkingMatrix;
