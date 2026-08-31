/**
 * coverage-grid.js — Interactive grid mapping big ideas and assessments to content descriptions
 *
 * Renders a two-axis grid: content descriptions (rows) × big ideas (columns) + assessments (columns).
 * Cells show coverage state (empty, full, partial) and can be cycled, cleared, and notated.
 * Supports reordering big ideas and reparenting sub-ideas within the two-level cap.
 * Derives gap classification (taught-but-not-assessed, assessed-but-not-taught, neither) per row.
 *
 * FR-CG-1 through FR-CG-19; AC-CG-1 through AC-CG-17
 */

import { setCoverageEntry } from './bigidea-list.js';
import { resolveDomain } from './domain-resolver.js';
import { renderCode } from './traceability.js';
import { getKindLabelPlural } from './curriculum-editor.js';

/**
 * Gap classification: exactly one per content description
 * "covered" = taught AND assessed (no indicator)
 * "taught-not-assessed" = taught, zero assessment coverage
 * "assessed-not-taught" = assessed, zero big-idea coverage
 * "neither" = zero coverage from both
 */
const GAP_KINDS = {
  COVERED: 'covered',
  TAUGHT_NOT_ASSESSED: 'taught-not-assessed',
  ASSESSED_NOT_TAUGHT: 'assessed-not-taught',
  NEITHER: 'neither'
};

/**
 * Pure 2D navigation helper for the grid's keyboard pass (AC-CG-9): rows are
 * outcome rows, columns are the combined big-idea + assessment cells in one
 * row, in the order they were built. Never returns a position outside
 * [0, rowCount-1] x [0, colCount-1].
 * @param {string} key
 * @param {number} row
 * @param {number} col
 * @param {number} rowCount
 * @param {number} colCount
 * @returns {{row:number, col:number}|null} - null if the key isn't handled
 */
export function computeNextCellPosition(key, row, col, rowCount, colCount) {
  if (rowCount <= 0 || colCount <= 0) return null;
  let nextRow = row;
  let nextCol = col;
  switch (key) {
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
 * CoverageGrid — main controller for the grid view
 */
export class CoverageGrid {
  constructor(unit, localStore) {
    this.unit = unit;
    this.localStore = localStore;
    this.selectedBigIdeaId = null; // Track selected big idea for reorder/reparent
    this.collapsedGroups = new Set(); // Track collapsed column groups
    this.selectedCell = null; // Track selected cell for keyboard nav
    this._cellMatrix = []; // [rowIndex][colIndex] -> cell element, rebuilt each render (AC-CG-9)
  }

  /**
   * Derive gap classification for a single content description
   * Aggregates coverage across all big ideas and all assessments
   */
  classifyGap(nodeId) {
    const bigIdeasCovering = this.unit.bigIdeas.some(bi =>
      bi.coverage && bi.coverage.some(cov => cov.nodeId === nodeId)
    );

    const assessmentsCovering = this.getAssessmentsCoveringNode(nodeId);

    if (bigIdeasCovering && assessmentsCovering) {
      return GAP_KINDS.COVERED;
    } else if (bigIdeasCovering && !assessmentsCovering) {
      return GAP_KINDS.TAUGHT_NOT_ASSESSED;
    } else if (!bigIdeasCovering && assessmentsCovering) {
      return GAP_KINDS.ASSESSED_NOT_TAUGHT;
    } else {
      return GAP_KINDS.NEITHER;
    }
  }

  /**
   * Check if any assessment covers a given node
   */
  getAssessmentsCoveringNode(nodeId) {
    if (this.unit.unitAssessment) {
      // Check majorAssessment
      if (this.unit.unitAssessment.coverage &&
          this.unit.unitAssessment.coverage.some(cov => cov.nodeId === nodeId)) {
        return true;
      }

      // Check miniAssessments
      if (this.unit.unitAssessment.miniAssessments) {
        for (const mini of this.unit.unitAssessment.miniAssessments) {
          if (mini.coverage && mini.coverage.some(cov => cov.nodeId === nodeId)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Get outcome-kind nodes grouped by their parent strand
   * Returns array of { strand, outcomes: [...] }
   */
  getStrandGroups() {
    const strands = [];
    const strandMap = {};

    // Collect all strands and outcomes
    for (const node of this.unit.nodes) {
      if (node.kind === 'strand') {
        strandMap[node.id] = {
          strand: node,
          outcomes: []
        };
        strands.push(strandMap[node.id]);
      } else if (node.kind === 'outcome') {
        if (strandMap[node.parentId]) {
          strandMap[node.parentId].outcomes.push(node);
        }
      }
    }

    return strands;
  }

  /**
   * Get big ideas grouped by top-level (parentId === null)
   * Returns array of { topLevel, subIdeas: [...] }
   */
  getBigIdeasGrouped() {
    const topLevel = [];
    const map = {};

    for (const bi of this.unit.bigIdeas) {
      if (!bi.parentId) {
        const group = { topLevel: bi, subIdeas: [] };
        map[bi.id] = group;
        topLevel.push(group);
      }
    }

    for (const bi of this.unit.bigIdeas) {
      if (bi.parentId && map[bi.parentId]) {
        map[bi.parentId].subIdeas.push(bi);
      }
    }

    return topLevel;
  }

  /**
   * Get assessments (majorAssessment first, then miniAssessments[])
   * Wraps assessment objects with consistent interface
   */
  getAssessments() {
    const assessments = [];

    // Major assessment: the unitAssessment itself has a coverage[] array (FR-CG-15/16)
    if (this.unit.unitAssessment) {
      const majorAssessment = this.unit.unitAssessment;
      assessments.push({
        id: majorAssessment.id || 'major-assessment',
        name: majorAssessment.title || 'Major Assessment',
        coverage: majorAssessment.coverage || [],
        isMajor: true,
        __ref: majorAssessment  // Back-reference to mutate in place
      });
    }

    // Mini assessments
    if (this.unit.unitAssessment && Array.isArray(this.unit.unitAssessment.miniAssessments)) {
      for (const mini of this.unit.unitAssessment.miniAssessments) {
        assessments.push({
          id: mini.id,
          name: mini.name || mini.title || 'Mini Assessment',
          coverage: mini.coverage || [],
          isMajor: false,
          __ref: mini  // Back-reference to mutate in place
        });
      }
    }

    return assessments;
  }

  /**
   * Get coverage state for a big-idea cell
   * Returns 'empty', 'full', 'partial'
   */
  getBigIdeaCellState(bigIdeaId, nodeId) {
    const bigIdea = this.unit.bigIdeas.find(bi => bi.id === bigIdeaId);
    if (!bigIdea || !bigIdea.coverage) return 'empty';

    const cov = bigIdea.coverage.find(c => c.nodeId === nodeId);
    if (!cov) return 'empty';

    return cov.coverage || 'empty';
  }

  /**
   * Get coverage state for an assessment cell
   * Returns 'empty', 'full', 'partial'
   */
  getAssessmentCellState(assessmentId, nodeId) {
    const assessment = this.getAssessmentById(assessmentId);
    if (!assessment) return 'empty';

    const cov = assessment.coverage.find(c => c.nodeId === nodeId);
    if (!cov) return 'empty';

    return cov.coverage || 'empty';
  }

  /**
   * Find an assessment by id (returns the wrapper, __ref points to actual object)
   */
  getAssessmentById(assessmentId) {
    const assessments = this.getAssessments();
    const wrapper = assessments.find(a => a.id === assessmentId);
    // Return the actual assessment object, not the wrapper, so mutations apply to unit
    return wrapper ? wrapper.__ref : null;
  }

  /**
   * Cycle cell state: empty → full → partial → empty
   */
  cycleCellState(bigIdeaId, nodeId) {
    const currentState = this.getBigIdeaCellState(bigIdeaId, nodeId);
    let newState = 'full';

    if (currentState === 'full') {
      newState = 'partial';
    } else if (currentState === 'partial') {
      newState = null; // Remove entry
    }

    if (newState) {
      setCoverageEntry(bigIdeaId, nodeId, newState, null);
    } else {
      setCoverageEntry(bigIdeaId, nodeId, null);
    }

    return newState || 'empty';
  }

  /**
   * Cycle assessment cell state
   * Writes directly to the assessment's coverage[] via local-store (INV-DM-12, FR-CG-17)
   */
  cycleAssessmentCellState(assessmentId, nodeId) {
    const currentState = this.getAssessmentCellState(assessmentId, nodeId);
    let newState = 'full';

    if (currentState === 'full') {
      newState = 'partial';
    } else if (currentState === 'partial') {
      newState = null;
    }

    this.setAssessmentCoverageEntry(assessmentId, nodeId, newState, null);
    return newState || 'empty';
  }

  /**
   * Clear cell (one-step removal from any state)
   */
  clearCell(bigIdeaId, nodeId) {
    setCoverageEntry(bigIdeaId, nodeId, null);
  }

  /**
   * Clear assessment cell
   */
  clearAssessmentCell(assessmentId, nodeId) {
    this.setAssessmentCoverageEntry(assessmentId, nodeId, null);
  }

  /**
   * Internal method to write to assessment's coverage[] via local-store (INV-DM-12, FR-CG-17)
   * Handles both majorAssessment and miniAssessments
   * Never writes to node or big idea (forward-only pattern)
   */
  setAssessmentCoverageEntry(assessmentId, nodeId, coverage, note = null) {
    const assessment = this.getAssessmentById(assessmentId);
    if (!assessment) {
      throw new Error(`Assessment ${assessmentId} not found`);
    }

    if (!Array.isArray(assessment.coverage)) {
      assessment.coverage = [];
    }

    // Remove if coverage is null
    if (coverage === null) {
      assessment.coverage = assessment.coverage.filter(c => c.nodeId !== nodeId);
    } else {
      // Update or add entry
      const existing = assessment.coverage.find(c => c.nodeId === nodeId);
      if (existing) {
        existing.coverage = coverage;
        existing.note = note || null;
      } else {
        assessment.coverage.push({ nodeId, coverage, note: note || null });
      }
    }

    // Persist via local-store (FR-CG-12, AD-13, AD-CG-4 optimistic write)
    this.localStore.setData({ unitAssessment: this.unit.unitAssessment });
  }

  /**
   * Update cell note
   */
  setCellNote(bigIdeaId, nodeId, note) {
    const currentState = this.getBigIdeaCellState(bigIdeaId, nodeId);
    if (currentState !== 'empty') {
      setCoverageEntry(bigIdeaId, nodeId, currentState, note);
    }
  }

  /**
   * Update assessment cell note
   */
  setAssessmentCellNote(assessmentId, nodeId, note) {
    const currentState = this.getAssessmentCellState(assessmentId, nodeId);
    if (currentState !== 'empty') {
      this.setAssessmentCoverageEntry(assessmentId, nodeId, currentState, note);
    }
  }

  /**
   * Get gap counts for summary line
   */
  getGapCounts() {
    let taught = 0;
    let assessed = 0;
    let neither = 0;

    for (const node of this.unit.nodes) {
      if (node.kind === 'outcome') {
        const gap = this.classifyGap(node.id);
        if (gap === GAP_KINDS.TAUGHT_NOT_ASSESSED) taught++;
        else if (gap === GAP_KINDS.ASSESSED_NOT_TAUGHT) assessed++;
        else if (gap === GAP_KINDS.NEITHER) neither++;
      }
    }

    return { taught, assessed, neither };
  }

  /**
   * Toggle column group collapse state
   */
  toggleCollapseGroup(groupName) {
    if (this.collapsedGroups.has(groupName)) {
      this.collapsedGroups.delete(groupName);
    } else {
      this.collapsedGroups.add(groupName);
    }
  }

  /**
   * Reorder big ideas: move source to target position
   * Top-level reorder carries sub-ideas as a block
   */
  reorderBigIdea(sourceBigIdeaId, targetPosition) {
    // Find source big idea
    const sourceIdx = this.unit.bigIdeas.findIndex(bi => bi.id === sourceBigIdeaId);
    if (sourceIdx === -1) throw new Error(`Big idea ${sourceBigIdeaId} not found`);

    const sourceBi = this.unit.bigIdeas[sourceIdx];

    // Get all IDs to move (source + sub-ideas if source is top-level)
    const idsToMove = [sourceBigIdeaId];
    if (!sourceBi.parentId) {
      // Add sub-ideas
      for (const bi of this.unit.bigIdeas) {
        if (bi.parentId === sourceBigIdeaId) {
          idsToMove.push(bi.id);
        }
      }
    }

    // Extract all IDs to move
    const movingBis = this.unit.bigIdeas.filter(bi => idsToMove.includes(bi.id));
    const remainingBis = this.unit.bigIdeas.filter(bi => !idsToMove.includes(bi.id));

    // Insert at target position
    const newBigIdeas = [];
    let inserted = false;

    for (let i = 0; i < remainingBis.length; i++) {
      if (i === targetPosition && !inserted) {
        newBigIdeas.push(...movingBis);
        inserted = true;
      }
      newBigIdeas.push(remainingBis[i]);
    }

    if (!inserted) {
      newBigIdeas.push(...movingBis);
    }

    // Update order field
    for (let i = 0; i < newBigIdeas.length; i++) {
      newBigIdeas[i].order = i;
    }

    this.unit.bigIdeas = newBigIdeas;
    this.localStore.setData({ bigIdeas: this.unit.bigIdeas });
  }

  /**
   * Reparent a sub-big-idea to a different top-level big idea
   * Refuse if target is a sub-idea (INV-DM-14)
   */
  reparentBigIdea(subBigIdeaId, newParentId) {
    const subBi = this.unit.bigIdeas.find(bi => bi.id === subBigIdeaId);
    if (!subBi) throw new Error(`Big idea ${subBigIdeaId} not found`);

    if (!subBi.parentId) {
      throw new Error('Can only reparent sub-ideas, not top-level big ideas');
    }

    const newParent = this.unit.bigIdeas.find(bi => bi.id === newParentId);
    if (!newParent) throw new Error(`Big idea ${newParentId} not found`);

    // Enforce two-level cap: refuse if target is a sub-idea
    if (newParent.parentId !== null) {
      throw new Error(
        `Cannot reparent under sub-idea "${newParent.title}". ` +
        `Sub-ideas can only be reparented to top-level big ideas. ` +
        `Did you mean to reparent under "${
          this.unit.bigIdeas.find(bi => bi.id === newParent.parentId)?.title || 'its parent'
        }"?`
      );
    }

    subBi.parentId = newParentId;
    this.localStore.setData({ bigIdeas: this.unit.bigIdeas });
  }

  /**
   * Initialize grid rendering and event listeners
   */
  render() {
    const container = document.getElementById('coverage-grid-container');
    if (!container) {
      throw new Error('coverage-grid-container element not found');
    }

    container.innerHTML = '';
    container.appendChild(this.buildGrid());
  }

  /**
   * Build the grid DOM
   */
  buildGrid() {
    const gridContainer = document.createElement('div');
    gridContainer.className = 'coverage-grid';

    // Summary line
    const summary = this.buildSummaryLine();
    gridContainer.appendChild(summary);

    // Main grid
    const mainGrid = document.createElement('div');
    mainGrid.className = 'coverage-grid-main';

    const strandGroups = this.getStrandGroups();
    const bigIdeasGrouped = this.getBigIdeasGrouped();
    const assessments = this.getAssessments();

    // Reset the keyboard-nav cell matrix for this render pass (AC-CG-9)
    this._cellMatrix = [];

    // Grid headers (includes collapse/expand controls, FR-CG-19/AC-CG-17)
    const headerRow = this.buildHeaderRow(bigIdeasGrouped, assessments);
    mainGrid.appendChild(headerRow);

    // Content rows
    for (const strandGroup of strandGroups) {
      const strandSection = this.buildStrandSection(
        strandGroup,
        bigIdeasGrouped,
        assessments
      );
      mainGrid.appendChild(strandSection);
    }

    // Single delegated keydown handler for the whole grid (AC-CG-9): Tab/
    // arrow focus, Enter or Space to cycle, Delete/Backspace to clear.
    mainGrid.addEventListener('keydown', (e) => this._handleGridKeydown(e));

    gridContainer.appendChild(mainGrid);
    return gridContainer;
  }

  /**
   * Delegated keydown handler shared by every cell (AC-CG-9). Reads the
   * target cell's row/col from its dataset, then either moves focus
   * (arrows), cycles state (Enter/Space — same end state as a click), or
   * clears the cell (Delete/Backspace — same end state as a right-click).
   * @param {KeyboardEvent} e
   */
  _handleGridKeydown(e) {
    const target = e.target;
    if (!target || !target.dataset || target.dataset.row === undefined) return;
    const row = parseInt(target.dataset.row, 10);
    const col = parseInt(target.dataset.col, 10);
    if (Number.isNaN(row) || Number.isNaN(col)) return;

    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      this._activateCell(target);
      return;
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      this._clearCellElement(target);
      return;
    }

    const rowCount = this._cellMatrix.length;
    const colCount = rowCount > 0 ? this._cellMatrix[0].length : 0;
    const next = computeNextCellPosition(e.key, row, col, rowCount, colCount);
    if (!next) return;

    e.preventDefault();
    const nextCell = this._cellMatrix[next.row]?.[next.col];
    if (nextCell && typeof nextCell.focus === 'function') {
      nextCell.focus();
    }
  }

  /**
   * Cycle the state of a cell element (shared by click and Enter/Space —
   * AC-CG-9 must reach the same end state as the mouse pass).
   * @param {HTMLElement} cell
   */
  _activateCell(cell) {
    if (cell.dataset.assessmentId) {
      const newState = this.cycleAssessmentCellState(cell.dataset.assessmentId, cell.dataset.nodeId);
      this._updateCellVisual(cell, newState);
    } else if (cell.dataset.bigIdeaId) {
      const newState = this.cycleCellState(cell.dataset.bigIdeaId, cell.dataset.nodeId);
      this._updateCellVisual(cell, newState);
    }
    this.updateSummary();
  }

  /**
   * Clear a cell element (shared by right-click and Delete/Backspace).
   * @param {HTMLElement} cell
   */
  _clearCellElement(cell) {
    if (cell.dataset.assessmentId) {
      this.clearAssessmentCell(cell.dataset.assessmentId, cell.dataset.nodeId);
    } else if (cell.dataset.bigIdeaId) {
      this.clearCell(cell.dataset.bigIdeaId, cell.dataset.nodeId);
    }
    this._updateCellVisual(cell, 'empty');
    this.updateSummary();
  }

  /**
   * Update a cell's className/textContent to reflect a new state, without
   * rebuilding the DOM (used by both mouse and keyboard paths).
   * @param {HTMLElement} cell
   * @param {string} newState
   */
  _updateCellVisual(cell, newState) {
    const kind = cell.dataset.assessmentId ? 'assessment-cell' : 'big-idea-cell';
    const subIdea = cell.className.includes('sub-idea') ? ' sub-idea' : '';
    cell.className = `coverage-cell ${kind} state-${newState}${subIdea}`;
    cell.textContent = newState === 'full' ? '✓' : newState === 'partial' ? '◐' : '';
  }

  /**
   * Build summary line
   */
  buildSummaryLine() {
    const summary = document.createElement('div');
    summary.className = 'coverage-grid-summary';

    const counts = this.getGapCounts();

    summary.innerHTML = `
      <div class="summary-content">
        <span class="gap-count">
          <span class="gap-kind taught-not-assessed"></span>
          ${counts.taught} taught but not assessed
        </span>
        <span class="gap-count">
          <span class="gap-kind assessed-not-taught"></span>
          ${counts.assessed} assessed but not taught
        </span>
        <span class="gap-count">
          <span class="gap-kind neither"></span>
          ${counts.neither} neither
        </span>
      </div>
    `;

    return summary;
  }

  /**
   * Build header row showing big ideas and assessments
   */
  buildHeaderRow(bigIdeasGrouped, assessments) {
    const headerRow = document.createElement('div');
    headerRow.className = 'coverage-grid-header-row';

    // Row label cell
    const rowLabelCell = document.createElement('div');
    rowLabelCell.className = 'row-label-cell header';
    // Plural of the "outcome" kind label — routed through getKindLabelPlural()
    // so curriculum.labels.outcome (unit.json) stays the single source of
    // truth, and irregular plurals ("Criterion" -> "Criteria") stay correct.
    rowLabelCell.textContent = getKindLabelPlural(this.unit, 'outcome');
    headerRow.appendChild(rowLabelCell);

    // Gap indicator column
    const gapCell = document.createElement('div');
    gapCell.className = 'gap-indicator-cell header';
    gapCell.textContent = 'Gap';
    headerRow.appendChild(gapCell);

    // Big ideas header, with independent collapse/expand control (FR-CG-19, AD-CG-6)
    const biCollapsed = this.collapsedGroups.has('big-ideas');
    const biHeaderContainer = document.createElement('div');
    biHeaderContainer.className = `coverage-header big-ideas-header${biCollapsed ? ' collapsed' : ''}`;
    biHeaderContainer.appendChild(this._buildCollapseToggle('big-ideas', biCollapsed));
    if (!biCollapsed) {
      const biLabel = document.createElement('span');
      biLabel.textContent = 'Big Ideas';
      biHeaderContainer.appendChild(biLabel);
    }
    headerRow.appendChild(biHeaderContainer);

    // Assessment header, with its own independent collapse/expand control
    if (assessments.length > 0) {
      const assCollapsed = this.collapsedGroups.has('assessments');
      const assHeaderContainer = document.createElement('div');
      assHeaderContainer.className = `coverage-header assessments-header${assCollapsed ? ' collapsed' : ''}`;
      assHeaderContainer.appendChild(this._buildCollapseToggle('assessments', assCollapsed));
      if (!assCollapsed) {
        const assLabel = document.createElement('span');
        assLabel.textContent = 'Assessments';
        assHeaderContainer.appendChild(assLabel);
      }
      headerRow.appendChild(assHeaderContainer);
    }

    return headerRow;
  }

  /**
   * Build a collapse/expand toggle button for one column group (FR-CG-19,
   * AC-CG-17). Re-renders the whole grid on click/activation — the
   * collapsedGroups state itself persists on the instance, so this is a
   * cheap reflow, not a reload.
   * @param {string} groupName - 'big-ideas' or 'assessments'
   * @param {boolean} collapsed - current collapsed state
   * @returns {HTMLElement}
   */
  _buildCollapseToggle(groupName, collapsed) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'collapse-toggle';
    button.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    button.title = collapsed ? `Expand ${groupName.replace('-', ' ')}` : `Collapse ${groupName.replace('-', ' ')}`;
    button.textContent = collapsed ? '»' : '«';
    button.addEventListener('click', (e) => {
      e.preventDefault();
      this.toggleCollapseGroup(groupName);
      this.render();
    });
    return button;
  }

  /**
   * Build a strand section with its outcome rows
   */
  buildStrandSection(strandGroup, bigIdeasGrouped, assessments) {
    const section = document.createElement('div');
    section.className = 'strand-section';

    // Strand header
    const strandHeader = document.createElement('div');
    strandHeader.className = 'strand-header';
    strandHeader.textContent = strandGroup.strand.title;
    section.appendChild(strandHeader);

    // Outcome rows
    for (const outcome of strandGroup.outcomes) {
      const row = this.buildOutcomeRow(outcome, bigIdeasGrouped, assessments);
      section.appendChild(row);
    }

    return section;
  }

  /**
   * Build a single outcome row with big-idea and assessment cells
   */
  buildOutcomeRow(node, bigIdeasGrouped, assessments) {
    const row = document.createElement('div');
    row.className = 'coverage-grid-row';

    // Row label
    const label = document.createElement('div');
    label.className = 'row-label';

    // Code (clickable, using shared component)
    const codeElem = renderCode(node.code, true);
    if (typeof codeElem === 'string') {
      const codeSpan = document.createElement('span');
      codeSpan.className = 'code';
      codeSpan.textContent = codeElem;
      label.appendChild(codeSpan);
    } else {
      codeElem.className = 'code';
      label.appendChild(codeElem);
    }

    // Title
    const titleSpan = document.createElement('span');
    titleSpan.className = 'title';
    titleSpan.textContent = node.title || '';
    label.appendChild(titleSpan);

    row.appendChild(label);

    // Gap indicator — stays visible regardless of either group's collapsed
    // state (FR-CG-19)
    const gap = this.classifyGap(node.id);
    const gapCell = document.createElement('div');
    gapCell.className = `gap-indicator gap-${gap}`;
    row.appendChild(gapCell);

    // This row's slot in the keyboard-nav cell matrix (AC-CG-9)
    const rowIndex = this._cellMatrix.length;
    const rowCells = [];

    // Big idea cells (collapsed groups render as an empty labelled strip —
    // no cells, nothing to focus — FR-CG-19, AC-CG-17)
    const biCollapsed = this.collapsedGroups.has('big-ideas');
    const biCellsContainer = document.createElement('div');
    biCellsContainer.className = `big-idea-cells${biCollapsed ? ' collapsed' : ''}`;

    if (!biCollapsed) {
      for (const biGroup of bigIdeasGrouped) {
        // Top-level big idea cell
        const topLevelCell = this.buildBigIdeaCell(biGroup.topLevel, node.id, false, rowIndex, rowCells.length);
        biCellsContainer.appendChild(topLevelCell);
        rowCells.push(topLevelCell);

        // Sub-idea cells (indented)
        for (const subIdea of biGroup.subIdeas) {
          const subCell = this.buildBigIdeaCell(subIdea, node.id, true, rowIndex, rowCells.length);
          biCellsContainer.appendChild(subCell);
          rowCells.push(subCell);
        }
      }
    }

    row.appendChild(biCellsContainer);

    // Assessment cells (same collapse treatment as the big-idea group)
    if (assessments.length > 0) {
      const assCollapsed = this.collapsedGroups.has('assessments');
      const assContainer = document.createElement('div');
      assContainer.className = `assessment-cells${assCollapsed ? ' collapsed' : ''}`;

      if (!assCollapsed) {
        for (const assessment of assessments) {
          const cell = this.buildAssessmentCell(assessment, node.id, rowIndex, rowCells.length);
          assContainer.appendChild(cell);
          rowCells.push(cell);
        }
      }

      row.appendChild(assContainer);
    }

    this._cellMatrix.push(rowCells);

    return row;
  }

  /**
   * Build a big-idea cell
   */
  buildBigIdeaCell(bigIdea, nodeId, isSubIdea = false, rowIndex = 0, colIndex = 0) {
    const cell = document.createElement('div');
    const state = this.getBigIdeaCellState(bigIdea.id, nodeId);
    cell.className = `coverage-cell big-idea-cell state-${state}${isSubIdea ? ' sub-idea' : ''}`;
    cell.dataset.bigIdeaId = bigIdea.id;
    cell.dataset.nodeId = nodeId;
    cell.dataset.row = rowIndex.toString();
    cell.dataset.col = colIndex.toString();
    cell.tabIndex = 0;
    cell.title = `${bigIdea.title}: ${state}`;

    const stateIcon = state === 'full' ? '✓' : state === 'partial' ? '◐' : '';
    cell.textContent = stateIcon;

    // Click to cycle state (same end state as Enter/Space, AC-CG-9)
    cell.addEventListener('click', (e) => {
      e.preventDefault();
      this._activateCell(cell);
    });

    // Right-click to clear (same end state as Delete/Backspace, AC-CG-9)
    cell.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this._clearCellElement(cell);
    });

    return cell;
  }

  /**
   * Build an assessment cell
   */
  buildAssessmentCell(assessment, nodeId, rowIndex = 0, colIndex = 0) {
    const cell = document.createElement('div');
    const state = this.getAssessmentCellState(assessment.id, nodeId);
    cell.className = `coverage-cell assessment-cell state-${state}`;
    cell.dataset.assessmentId = assessment.id;
    cell.dataset.nodeId = nodeId;
    cell.dataset.row = rowIndex.toString();
    cell.dataset.col = colIndex.toString();
    cell.tabIndex = 0;
    cell.title = `${assessment.name}: ${state}`;

    const stateIcon = state === 'full' ? '✓' : state === 'partial' ? '◐' : '';
    cell.textContent = stateIcon;

    // Click to cycle state (same end state as Enter/Space, AC-CG-9)
    cell.addEventListener('click', (e) => {
      e.preventDefault();
      this._activateCell(cell);
    });

    // Right-click to clear (same end state as Delete/Backspace, AC-CG-9)
    cell.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this._clearCellElement(cell);
    });

    return cell;
  }

  /**
   * Update summary line after an edit
   */
  updateSummary() {
    const container = document.querySelector('.coverage-grid-summary');
    if (container) {
      const newSummary = this.buildSummaryLine();
      container.replaceWith(newSummary);
    }
  }

  /**
   * Escape HTML to prevent XSS (JS-6)
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

export default CoverageGrid;
