/**
 * lesson-plan-generator.js — Lesson generation UI
 *
 * Implements: FR-LPG-1, FR-LPG-9, FR-LPG-7
 * - Modal picker: select one+ nodes and exactly one big idea
 * - Generate button (enabled only if both selections valid per AC-LPG-3)
 * - Regenerate control (appears only on provenance="generated" lessons per FR-LPG-7)
 * - Persistence via local-store only (no direct filesystem access per AD-13)
 *
 * No model calls, no API calls (AC-LPG-7, AC-LPG-8).
 */

import { openNodePicker } from './node-picker.js';
import { openBigIdeaPicker } from './big-idea-picker.js';
import { generateLesson, regenerateLesson } from './lesson-generator-core.js';

/**
 * Open the lesson generator picker (generate or regenerate mode).
 *
 * @param {LocalStore} store - The caller's already-loaded LocalStore. Persisting
 *   through this instance (instead of constructing a new one) matters: a bare
 *   `new LocalStore()` defaults to port 8800 regardless of which port the
 *   bundle is actually served on (serve.py picks the first free port from
 *   8800-8899), so it silently talks to the wrong server whenever that isn't
 *   8800 — the fetch fails, and the caller's alert() on that failure was, in
 *   practice, indistinguishable from the picker hanging.
 * @param {Object[]} allLessons - All existing lessons (for numbering)
 * @param {Object[]} allNodes - All curriculum nodes
 * @param {Object[]} allBigIdeas - All big ideas
 * @param {string|null} lessonIdToRegenerate - If regenerating, the lesson ID; otherwise null
 * @param {Function} onConfirm - Callback(newOrUpdatedLesson) after save succeeds
 * @returns {Promise<void>} Resolves when user confirms or cancels
 */
export async function openLessonGenerator(
  store,
  allLessons,
  allNodes,
  allBigIdeas,
  lessonIdToRegenerate = null,
  onConfirm = null
) {
  return new Promise(async (resolve) => {
    // Determine mode: generate or regenerate
    const isRegenerate = !!lessonIdToRegenerate;
    const existingLesson = isRegenerate
      ? allLessons.find((l) => l.id === lessonIdToRegenerate)
      : null;

    // Pre-fill with current selections if regenerating
    const currentNodeIds = existingLesson?.nodeIds || [];
    const currentBigIdeaId = existingLesson?.bigIdeaId || null;

    // Create modal
    const modal = document.createElement('div');
    modal.className = 'lesson-generator-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-labelledby', 'generator-title');

    // State for selections
    let selectedNodeIds = [...currentNodeIds];
    let selectedBigIdeaId = currentBigIdeaId;

    // Build HTML
    const titleText = isRegenerate ? 'Regenerate Lesson' : 'Generate New Lesson';
    const confirmText = isRegenerate ? 'Update Lesson' : 'Generate Lesson';

    let html = `
      <div class="lesson-generator-content">
        <h2 id="generator-title">${_escapeHtml(titleText)}</h2>

        <div class="generator-section">
          <label class="generator-label">Curriculum Node(s)</label>
          <p class="generator-help-text">Select one or more curriculum nodes to bind to this lesson.</p>
          <button type="button" class="btn-secondary" id="generator-node-picker-btn">
            ${selectedNodeIds.length > 0 ? `${selectedNodeIds.length} node(s) selected` : 'Select Nodes'}
          </button>
          ${selectedNodeIds.length === 0 ? '<p class="validation-message validation-error">At least one node must be selected</p>' : ''}
        </div>

        <div class="generator-section">
          <label class="generator-label">Big Idea</label>
          <p class="generator-help-text">Select a big idea or sub-big idea to bind to this lesson.</p>
          <button type="button" class="btn-secondary" id="generator-bigidea-picker-btn">
            ${selectedBigIdeaId ? 'Big idea selected' : 'Select Big Idea'}
          </button>
          ${!selectedBigIdeaId ? '<p class="validation-message validation-error">A big idea must be selected</p>' : ''}
        </div>

        <div class="generator-actions">
          <button type="button" class="btn-primary" id="generator-confirm" ${_isFormValid(selectedNodeIds, selectedBigIdeaId) ? '' : 'disabled'}>
            ${_escapeHtml(confirmText)}
          </button>
          <button type="button" class="btn-secondary" id="generator-cancel">Cancel</button>
        </div>
      </div>
    `;

    modal.innerHTML = html;
    document.body.appendChild(modal);

    // Update button text and validity on changes
    const updateUI = () => {
      const nodeBtn = modal.querySelector('#generator-node-picker-btn');
      const bigideaBtn = modal.querySelector('#generator-bigidea-picker-btn');
      const confirmBtn = modal.querySelector('#generator-confirm');

      if (nodeBtn) {
        nodeBtn.textContent =
          selectedNodeIds.length > 0
            ? `${selectedNodeIds.length} node(s) selected`
            : 'Select Nodes';
      }

      if (bigideaBtn) {
        bigideaBtn.textContent = selectedBigIdeaId
          ? 'Big idea selected'
          : 'Select Big Idea';
      }

      const isValid = _isFormValid(selectedNodeIds, selectedBigIdeaId);
      if (confirmBtn) {
        if (isValid) {
          confirmBtn.disabled = false;
        } else {
          confirmBtn.disabled = true;
        }
      }

      // Update validation messages
      const nodeError = modal.querySelector('.validation-message');
      if (nodeError) {
        nodeError.style.display = selectedNodeIds.length === 0 ? 'block' : 'none';
      }

      const bigideaError = modal.querySelectorAll('.validation-message')[1];
      if (bigideaError) {
        bigideaError.style.display = !selectedBigIdeaId ? 'block' : 'none';
      }
    };

    // Bind node picker
    const nodePickerBtn = modal.querySelector('#generator-node-picker-btn');
    if (nodePickerBtn) {
      nodePickerBtn.addEventListener('click', async () => {
        const result = await openNodePicker(allNodes, selectedNodeIds);
        selectedNodeIds = result;
        updateUI();
      });
    }

    // Bind big idea picker
    const bigideaPickerBtn = modal.querySelector('#generator-bigidea-picker-btn');
    if (bigideaPickerBtn) {
      bigideaPickerBtn.addEventListener('click', async () => {
        const result = await openBigIdeaPicker(allBigIdeas, selectedBigIdeaId);
        if (result) {
          selectedBigIdeaId = result;
          updateUI();
        }
      });
    }

    // Bind confirm button
    const confirmBtn = modal.querySelector('#generator-confirm');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', async () => {
        try {
          // Generate or regenerate lesson
          let lesson;
          if (isRegenerate) {
            lesson = regenerateLesson(
              lessonIdToRegenerate,
              selectedNodeIds,
              selectedBigIdeaId,
              allLessons,
              allNodes,
              allBigIdeas
            );
          } else {
            lesson = generateLesson(
              selectedNodeIds,
              selectedBigIdeaId,
              allLessons,
              allNodes,
              allBigIdeas
            );
          }

          // Save via the caller's already-loaded local-store (FR-LPG-9, AD-13)
          if (isRegenerate) {
            // Replace existing lesson
            const idx = store.unit.lessons.findIndex(
              (l) => l.id === lessonIdToRegenerate
            );
            if (idx >= 0) {
              store.unit.lessons[idx] = lesson;
            }
          } else {
            // Add new lesson
            if (!store.unit.lessons) {
              store.unit.lessons = [];
            }
            store.unit.lessons.push(lesson);
          }

          store.setData({ lessons: store.unit.lessons });
          await store.saveUnit();

          // Clean up and notify
          modal.remove();
          if (onConfirm) {
            onConfirm(lesson);
          }
          resolve();
        } catch (err) {
          // alert() blocks the tab entirely until dismissed (same problem
          // as window.prompt() elsewhere in this app) — an inline message
          // is the non-blocking equivalent.
          let errorEl = modal.querySelector('.generator-error');
          if (!errorEl) {
            errorEl = document.createElement('p');
            errorEl.className = 'generator-error validation-message validation-error';
            modal.querySelector('.generator-actions').before(errorEl);
          }
          errorEl.textContent = `Error: ${err.message}`;
        }
      });
    }

    // Bind cancel button
    const cancelBtn = modal.querySelector('#generator-cancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        modal.remove();
        resolve();
      });
    }

    // Handle Escape
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', handleEscape);
        if (modal.parentNode) {
          modal.remove();
        }
        resolve();
      }
    };
    document.addEventListener('keydown', handleEscape);
  });
}

/**
 * Show regenerate control on a lesson (if provenance="generated").
 *
 * Called by lesson-plan-document to conditionally render regenerate button.
 * Button only appears if provenance==="generated" (FR-LPG-7, AC-LPG-5).
 *
 * @param {Object} lesson - The lesson record
 * @param {Object[]} allLessons - All lessons
 * @param {Object[]} allNodes - All nodes
 * @param {Object[]} allBigIdeas - All big ideas
 * @param {LocalStore} store - The caller's already-loaded LocalStore (see openLessonGenerator).
 *   Kept trailing/optional so callers that only need the provenance guard
 *   (i.e. never reach the click handler that touches it) don't have to pass one.
 * @param {Function} onConfirm - Callback after successful regenerate
 * @returns {HTMLElement|null} The regenerate button, or null if not available
 */
export function createRegenerateControl(
  lesson,
  allLessons,
  allNodes,
  allBigIdeas,
  store = null,
  onConfirm = null
) {
  // Guard: only show on "generated" lessons (FR-LPG-7, AC-LPG-5)
  if (lesson.provenance !== 'generated') {
    return null;
  }

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn-regenerate';
  btn.textContent = 'Regenerate from Template';

  btn.addEventListener('click', async () => {
    await openLessonGenerator(
      store,
      allLessons,
      allNodes,
      allBigIdeas,
      lesson.id,
      onConfirm
    );
  });

  return btn;
}

/**
 * Check if the form is valid (both selections required).
 * @private
 */
function _isFormValid(selectedNodeIds, selectedBigIdeaId) {
  return selectedNodeIds.length > 0 && !!selectedBigIdeaId;
}

/**
 * Escape HTML special characters.
 * @private
 */
function _escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
