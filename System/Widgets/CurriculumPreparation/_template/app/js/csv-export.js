/**
 * csv-export.js — CSV export for marking matrix
 *
 * Exports marking matrix full-unit scores as UTF-8 with BOM, RFC 4180 CSV
 * Reads: matrixTemplate.criteria[], students[], matrices[].scores[]
 * Never recomputes totals — reads computed values from marking-matrix
 * No dependencies beyond vanilla JS (no LocalStore needed — expects unit data passed in)
 *
 * Exports:
 * - exportCSVBlob(unit, markingMatrix) → Blob with CSV data, ready for browser download
 * - downloadCSV(unit, markingMatrix, filename) → triggers browser download
 * - escapeCSVField(value) → escapes per RFC 4180
 */

/**
 * Escape a CSV field per RFC 4180
 * If field contains comma, quote, or newline, wrap in quotes and escape internal quotes
 * @param {string|number} value - field value
 * @returns {string} - escaped field
 */
export function escapeCSVField(value) {
  // Convert to string
  const str = String(value ?? '');

  // If field contains comma, quote, or newline, quote and escape
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Compute unit name slug for filename (lowercase, spaces to hyphens)
 * @param {string} unitName - original unit name
 * @returns {string} - slug
 */
function computeUnitSlug(unitName) {
  if (!unitName) {
    return 'unit-matrix';
  }
  return unitName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '');
}

/**
 * Check if any score in the unit is fractional
 * @param {Array} matrices - array of student matrices
 * @returns {boolean}
 */
function hasAnyFractionalScore(matrices) {
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
 * Format a subtotal value for CSV (numerator/denominator or just numerator)
 * @param {number} numerator - sum of awarded scores
 * @param {number} denominator - sum of max scores
 * @param {boolean} hasDecimal - true if any score is fractional
 * @returns {string} - formatted, e.g. "27.5/50"
 */
function formatCsvSubtotal(numerator, denominator, hasDecimal) {
  const num = hasDecimal ? numerator.toFixed(1) : Math.round(numerator);
  return `${num}/${denominator}`;
}

/**
 * Generate CSV content from unit data
 * Uses marking-matrix's already-computed totals (never recomputes)
 * @param {Object} unit - loaded unit from local-store
 * @param {Object} markingMatrix - MarkingMatrix instance (for tier subtotal computation)
 * @returns {string} - CSV text (without BOM)
 */
export function generateCSV(unit, markingMatrix) {
  if (!unit || !unit.students || !unit.matrixTemplate) {
    throw new Error('Invalid unit data');
  }

  if (!markingMatrix) {
    throw new Error('MarkingMatrix instance required for total computation');
  }

  const criteria = unit.matrixTemplate.criteria || [];
  const students = unit.students || [];
  const matrices = unit.matrices || [];
  const hasDecimal = hasAnyFractionalScore(matrices);

  // Build header row. A criterion linked to a curriculum outcome (nodeId)
  // gets its code prefixed so the exported sheet keeps the same
  // traceability the on-screen matrix shows (e.g. "VC2HH10K13 — Identifies
  // relevant sources").
  const nodeMap = {};
  for (const node of unit.nodes || []) nodeMap[node.id] = node;
  const headerRow = ['Student Name'];
  headerRow.push(...criteria.map(c => {
    const node = c.nodeId ? nodeMap[c.nodeId] : null;
    return node && node.code ? `${node.code} — ${c.criterion || ''}` : (c.criterion || '');
  }));
  headerRow.push('Pass Total', 'Intermediate Total', 'Advanced Total', 'Unit Total');

  const rows = [headerRow.map(escapeCSVField).join(',')];

  // Build data rows
  for (const student of students) {
    const row = [student.name];

    // Get student's matrix
    const matrix = matrices.find(m => m.studentId === student.id);
    if (!matrix) {
      continue; // Skip students with no matrix (shouldn't happen, but be safe)
    }

    // Add criterion scores
    for (const criterion of criteria) {
      const score = matrix.scores.find(s => s.criterionId === criterion.id);
      // Blank cell for unmarked, otherwise the numeric score
      if (score && score.awardedScore !== undefined) {
        row.push(String(score.awardedScore));
      } else {
        row.push('');
      }
    }

    // Add tier subtotals (read from markingMatrix, never recomputed)
    const passTotal = markingMatrix.computeTierSubtotal(student.id, 'pass');
    row.push(formatCsvSubtotal(passTotal.numerator, passTotal.denominator, hasDecimal));

    const intermediateTotal = markingMatrix.computeTierSubtotal(student.id, 'intermediate');
    row.push(formatCsvSubtotal(intermediateTotal.numerator, intermediateTotal.denominator, hasDecimal));

    const advancedTotal = markingMatrix.computeTierSubtotal(student.id, 'advanced');
    row.push(formatCsvSubtotal(advancedTotal.numerator, advancedTotal.denominator, hasDecimal));

    // Add unit total (read from markingMatrix, never recomputed)
    const unitTotal = markingMatrix.computeUnitTotal(student.id);
    row.push(formatCsvSubtotal(unitTotal.numerator, unitTotal.denominator, hasDecimal));

    rows.push(row.map(escapeCSVField).join(','));
  }

  return rows.join('\n');
}

/**
 * Create a CSV blob with UTF-8 BOM
 * @param {Object} unit - loaded unit from local-store
 * @param {Object} markingMatrix - MarkingMatrix instance
 * @returns {Blob} - CSV data with UTF-8 BOM
 */
export function exportCSVBlob(unit, markingMatrix) {
  const csvText = generateCSV(unit, markingMatrix);

  // Add UTF-8 BOM
  const bom = '﻿';
  const csvWithBom = bom + csvText;

  // Create blob
  const blob = new Blob([csvWithBom], { type: 'text/csv;charset=utf-8' });
  return blob;
}

/**
 * Trigger a browser download of the CSV
 * @param {Object} unit - loaded unit from local-store
 * @param {Object} markingMatrix - MarkingMatrix instance
 * @param {string} filename - optional filename (defaults to <unit-slug>-matrix.csv)
 */
export function downloadCSV(unit, markingMatrix, filename) {
  const blob = exportCSVBlob(unit, markingMatrix);

  // Default filename
  if (!filename) {
    const slug = computeUnitSlug(unit.meta?.unitName || 'unit');
    filename = `${slug}-matrix.csv`;
  }

  // Create object URL and trigger download
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
