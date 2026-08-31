/**
 * marking-matrix-populate.js — "Populate from curriculum" modal
 *
 * Lets a teacher choose curriculum outcome nodes and bring them into the
 * marking matrix as rubric rows (MarkingMatrix#addCriteriaFromNodes does the
 * actual data-model work; this file is UI orchestration only, matching the
 * split already used by lesson-plan-generator.js / node-picker.js).
 *
 * No window.prompt()/alert() — every message is inline in the modal, same
 * convention as the rest of this app's modals.
 */

import { openNodePicker } from './node-picker.js';

const TIER_LABELS = { pass: 'Pass', intermediate: 'Intermediate', advanced: 'Advanced' };

/**
 * Open the "populate from curriculum" modal.
 * @param {MarkingMatrix} matrix - the caller's MarkingMatrix instance (already
 *   bound to the loaded unit + localStore, per lesson-plan-generator's AD-13
 *   convention of reusing the caller's already-loaded store)
 * @returns {Promise<{added:number}|null>} resolves with the count of rows
 *   actually added on confirm, or null on cancel
 */
export async function openPopulateFromCurriculumModal(matrix) {
  return new Promise((resolve) => {
    const outcomeNodes = matrix.getOutcomeNodes();
    const linkedIds = matrix.getLinkedNodeIds();

    let selectedNodeIds = matrix.getDefaultCurriculumNodeIds().filter((id) => !linkedIds.has(id));
    let selectedTier = 'pass';
    let preview = matrix.addCriteriaFromNodes(selectedNodeIds, selectedTier);
    let warningAcknowledged = false;

    const modal = document.createElement('div');
    modal.className = 'lesson-generator-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-labelledby', 'populate-matrix-title');

    const tierOptions = Object.keys(TIER_LABELS)
      .map((t) => `<option value="${t}">${TIER_LABELS[t]}</option>`)
      .join('');

    modal.innerHTML = `
      <div class="lesson-generator-content">
        <h2 id="populate-matrix-title">Populate Rubric from Curriculum</h2>
        <p class="generator-help-text">Add rubric rows generated from curriculum outcomes. This only ADDS rows — hand-authored criteria are never changed or removed, and a curriculum criterion already linked to a row is skipped, not duplicated.</p>

        <div class="generator-section">
          <label class="generator-label" for="populate-tier-select">Tier</label>
          <p class="generator-help-text">New rows are added to this tier.</p>
          <select id="populate-tier-select" class="populate-tier-select">${tierOptions}</select>
        </div>

        <div class="generator-section">
          <label class="generator-label">Curriculum Criteria</label>
          <p class="generator-help-text">Pre-selected: outcomes this unit's assessments already cover. Choose more, or fewer, as needed.</p>
          <button type="button" class="btn-secondary" id="populate-node-picker-btn"></button>
          <p class="populate-summary" id="populate-summary"></p>
        </div>

        <div class="generator-actions">
          <button type="button" class="btn-primary" id="populate-confirm">Add Criteria</button>
          <button type="button" class="btn-secondary" id="populate-cancel">Cancel</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const tierSelect = modal.querySelector('#populate-tier-select');
    tierSelect.value = selectedTier;
    const pickerBtn = modal.querySelector('#populate-node-picker-btn');
    const confirmBtn = modal.querySelector('#populate-confirm');
    const summaryEl = modal.querySelector('#populate-summary');

    const recomputePreview = () => {
      preview = matrix.addCriteriaFromNodes(selectedNodeIds, selectedTier);
      warningAcknowledged = false;
    };

    const updateUI = () => {
      pickerBtn.textContent =
        selectedNodeIds.length > 0
          ? `${selectedNodeIds.length} of ${outcomeNodes.length} outcome(s) selected`
          : `Select outcomes (${outcomeNodes.length} available)`;

      const parts = [];
      if (preview.toAdd.length > 0) {
        parts.push(`${preview.toAdd.length} new row${preview.toAdd.length === 1 ? '' : 's'} will be added.`);
      }
      if (preview.alreadyLinked.length > 0) {
        parts.push(`${preview.alreadyLinked.length} already linked to a rubric row and will be skipped.`);
      }
      if (preview.noAssessment.length > 0) {
        parts.push(`${preview.noAssessment.length} skipped — no assessment exists yet to bind them to.`);
      }
      if (parts.length === 0) {
        parts.push('No outcomes selected yet.');
      }
      summaryEl.textContent = parts.join(' ');

      // Warning (students already scored) shown once, requires a second
      // click to proceed — the non-blocking equivalent of window.confirm().
      let warningEl = modal.querySelector('.populate-warning');
      if (preview.warning && !warningAcknowledged) {
        if (!warningEl) {
          warningEl = document.createElement('p');
          warningEl.className = 'populate-warning validation-message validation-warning';
          modal.querySelector('.generator-actions').before(warningEl);
        }
        warningEl.textContent = preview.warning;
        confirmBtn.textContent = 'Add Anyway';
      } else {
        if (warningEl) warningEl.remove();
        confirmBtn.textContent = 'Add Criteria';
      }

      confirmBtn.disabled = preview.toAdd.length === 0;
    };

    updateUI();

    tierSelect.addEventListener('change', () => {
      selectedTier = tierSelect.value;
      recomputePreview();
      updateUI();
    });

    pickerBtn.addEventListener('click', async () => {
      const result = await openNodePicker(outcomeNodes, selectedNodeIds, ['outcome']);
      // openNodePicker resolves [] both on Cancel and on "Confirm with
      // nothing checked" (see node-picker.js); lesson-plan-generator.js
      // accepts that ambiguity too, always taking the result as the new
      // selection rather than trying to distinguish the two.
      selectedNodeIds = result;
      recomputePreview();
      updateUI();
    });

    const cleanup = () => modal.remove();

    confirmBtn.addEventListener('click', () => {
      if (preview.toAdd.length === 0) return;

      if (preview.warning && !warningAcknowledged) {
        warningAcknowledged = true;
        updateUI();
        return;
      }

      const addedCount = preview.toAdd.length;
      preview.onConfirm();
      cleanup();
      resolve({ added: addedCount });
    });

    modal.querySelector('#populate-cancel').addEventListener('click', () => {
      cleanup();
      resolve(null);
    });

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', handleEscape);
        if (modal.parentNode) cleanup();
        resolve(null);
      }
    };
    document.addEventListener('keydown', handleEscape);
  });
}
