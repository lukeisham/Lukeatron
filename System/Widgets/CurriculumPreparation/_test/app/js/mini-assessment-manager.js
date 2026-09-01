/**
 * mini-assessment-manager.js — UI for CRUD on mini assessments (FR-UAB-3)
 *
 * Manages create, edit, reorder, and delete of mini assessments.
 * Enforces guards: no deletes if lessons reference it (FR-UAB-16).
 */

import { newId } from './ids.js';
import { findReferencingLessons } from './assessment-lesson-links.js';
import { openBigIdeaPicker } from './big-idea-picker.js';

/**
 * Data-layer delete guard (FR-UAB-16). The major assessment can never be
 * deleted or duplicated — this holds regardless of whether the call comes
 * from a UI control or a programmatic caller.
 *
 * @param {Object} unitAssessment - { majorAssessment, miniAssessments[] }
 * @param {string} kind - "major" | "mini"
 * @param {string} [id] - mini assessment id (ignored for kind="major")
 * @returns {{ ok: boolean, reason?: string }}
 */
export function deleteAssessment(unitAssessment, kind, id) {
  if (kind === 'major') {
    return { ok: false, reason: 'The major assessment cannot be deleted.' };
  }
  const idx = (unitAssessment.miniAssessments || []).findIndex(m => m.id === id);
  if (idx < 0) {
    return { ok: false, reason: 'Mini assessment not found.' };
  }
  unitAssessment.miniAssessments.splice(idx, 1);
  return { ok: true };
}

/**
 * Render a mini-assessment manager UI.
 *
 * @param {Object} unitAssessment - { majorAssessment, miniAssessments[] }
 * @param {Array} allLessons - All lessons (for refcount checks)
 * @param {Array} allBigIdeas - All big ideas (for picker)
 * @param {Function} onUpdate - Callback(updatedUnitAssessment) after any change
 * @returns {HTMLElement} Container
 */
export function renderMiniAssessmentManager(
  unitAssessment,
  allLessons = [],
  allBigIdeas = [],
  onUpdate = () => {}
) {
  const container = document.createElement('div');
  container.className = 'mini-assessment-manager';

  // Title
  const title = document.createElement('h2');
  title.textContent = 'Mini Assessments';
  container.appendChild(title);

  // List of mini assessments
  const list = document.createElement('div');
  list.className = 'mini-assessment-list';

  if (!unitAssessment.miniAssessments) {
    unitAssessment.miniAssessments = [];
  }

  // Sort by order field
  const sorted = [...unitAssessment.miniAssessments].sort((a, b) => (a.order || 0) - (b.order || 0));

  for (let i = 0; i < sorted.length; i++) {
    const mini = sorted[i];
    const miniEl = renderMiniAssessmentRow(mini, unitAssessment, allLessons, allBigIdeas, onUpdate);
    list.appendChild(miniEl);
  }

  container.appendChild(list);

  // Create button
  const createBtn = document.createElement('button');
  createBtn.type = 'button';
  createBtn.className = 'btn-create-mini';
  createBtn.textContent = '+ Create Mini Assessment';
  createBtn.addEventListener('click', e => {
    e.preventDefault();
    openCreateMiniForm(unitAssessment, allBigIdeas, onUpdate);
  });
  container.appendChild(createBtn);

  return container;
}

/**
 * Render a single mini assessment row with edit/reorder/delete controls.
 */
function renderMiniAssessmentRow(mini, unitAssessment, allLessons, allBigIdeas, onUpdate) {
  const row = document.createElement('div');
  row.className = 'mini-assessment-row';
  row.setAttribute('data-mini-id', mini.id);

  // Name (editable in-place)
  const nameSpan = document.createElement('span');
  nameSpan.className = 'mini-name';
  nameSpan.textContent = mini.name || '(untitled)';
  nameSpan.addEventListener('dblclick', e => {
    e.preventDefault();
    const input = document.createElement('input');
    input.type = 'text';
    input.value = mini.name || '';
    input.className = 'mini-name-input';
    input.addEventListener('blur', () => {
      mini.name = input.value || '(untitled)';
      onUpdate(unitAssessment);
      row.replaceChild(nameSpan, input);
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') input.blur();
      if (e.key === 'Escape') row.replaceChild(nameSpan, input);
    });
    row.replaceChild(input, nameSpan);
    input.focus();
  });
  row.appendChild(nameSpan);

  // Edit button (full form)
  const editBtn = document.createElement('button');
  editBtn.type = 'button';
  editBtn.className = 'btn-edit-mini';
  editBtn.textContent = 'Edit';
  editBtn.addEventListener('click', e => {
    e.preventDefault();
    openEditMiniForm(mini, unitAssessment, allBigIdeas, onUpdate);
  });
  row.appendChild(editBtn);

  // Reorder buttons
  const reorderContainer = document.createElement('div');
  reorderContainer.className = 'mini-reorder-controls';

  const upBtn = document.createElement('button');
  upBtn.type = 'button';
  upBtn.className = 'btn-up';
  upBtn.textContent = '↑';
  upBtn.addEventListener('click', e => {
    e.preventDefault();
    const idx = unitAssessment.miniAssessments.indexOf(mini);
    if (idx > 0) {
      // Swap order values
      const prev = unitAssessment.miniAssessments[idx - 1];
      [mini.order, prev.order] = [prev.order || 0, mini.order || 0];
      onUpdate(unitAssessment);
    }
  });
  reorderContainer.appendChild(upBtn);

  const downBtn = document.createElement('button');
  downBtn.type = 'button';
  downBtn.className = 'btn-down';
  downBtn.textContent = '↓';
  downBtn.addEventListener('click', e => {
    e.preventDefault();
    const idx = unitAssessment.miniAssessments.indexOf(mini);
    if (idx < unitAssessment.miniAssessments.length - 1) {
      const next = unitAssessment.miniAssessments[idx + 1];
      [mini.order, next.order] = [next.order || 0, mini.order || 0];
      onUpdate(unitAssessment);
    }
  });
  reorderContainer.appendChild(downBtn);

  row.appendChild(reorderContainer);

  // Delete button (with guard)
  const delBtn = document.createElement('button');
  delBtn.type = 'button';
  delBtn.className = 'btn-delete-mini';
  delBtn.textContent = '×';
  delBtn.addEventListener('click', e => {
    e.preventDefault();

    // Check for references
    const refs = findReferencingLessons(mini.id, 'mini', allLessons);
    if (refs.length > 0) {
      const lessonList = refs.map(l => `Lesson ${l.number}`).join(', ');
      alert(`Cannot delete: referenced by ${lessonList}`);
      return;
    }

    // Confirm and delete
    if (confirm(`Delete "${mini.name}"?`)) {
      const result = deleteAssessment(unitAssessment, 'mini', mini.id);
      if (!result.ok) {
        alert(result.reason);
        return;
      }
      onUpdate(unitAssessment);
    }
  });
  row.appendChild(delBtn);

  return row;
}

/**
 * Open a form to create a new mini assessment.
 */
function openCreateMiniForm(unitAssessment, allBigIdeas, onUpdate) {
  const form = document.createElement('div');
  form.className = 'mini-form-modal';
  form.setAttribute('role', 'dialog');

  const html = `
    <div class="mini-form-content">
      <h3>Create Mini Assessment</h3>
      <label>
        Name:
        <input type="text" id="mini-name" placeholder="Mini Assessment 1" />
      </label>
      <label>
        Big Idea:
        <button type="button" id="pick-big-idea" class="btn-pick-big-idea">Choose...</button>
        <span id="selected-big-idea">(none selected)</span>
        <input type="hidden" id="mini-big-idea-id" />
      </label>
      <label>
        Weighting (optional):
        <input type="number" id="mini-weighting" placeholder="e.g. 20" />
      </label>
      <div class="mini-form-actions">
        <button type="button" class="btn-cancel">Cancel</button>
        <button type="button" class="btn-confirm">Create</button>
      </div>
    </div>
  `;

  form.innerHTML = html;
  document.body.appendChild(form);

  const nameInput = form.querySelector('#mini-name');
  const bigIdeaBtn = form.querySelector('#pick-big-idea');
  const bigIdeaDisplay = form.querySelector('#selected-big-idea');
  const bigIdeaId = form.querySelector('#mini-big-idea-id');
  const weightingInput = form.querySelector('#mini-weighting');
  const cancelBtn = form.querySelector('.btn-cancel');
  const confirmBtn = form.querySelector('.btn-confirm');

  // Pick big idea
  bigIdeaBtn.addEventListener('click', async e => {
    e.preventDefault();
    const selected = await openBigIdeaPicker(allBigIdeas, bigIdeaId.value || null);
    if (selected) {
      bigIdeaId.value = selected;
      const idea = allBigIdeas.find(bi => bi.id === selected);
      bigIdeaDisplay.textContent = idea ? idea.title : '(unknown)';
    }
  });

  cancelBtn.addEventListener('click', e => {
    e.preventDefault();
    form.remove();
  });

  confirmBtn.addEventListener('click', e => {
    e.preventDefault();

    const name = nameInput.value || 'Mini Assessment';
    const selectedBigIdeaId = bigIdeaId.value;
    const weighting = weightingInput.value ? parseInt(weightingInput.value) : undefined;

    if (!selectedBigIdeaId) {
      alert('Please select a big idea');
      return;
    }

    // Create mini assessment
    const newMini = {
      id: newId('mini'),
      name,
      bigIdeaId: selectedBigIdeaId,
      coverage: [],
      tiers: {
        pass: { material: '', studentTask: '', workspaceLines: 0, imageRefs: [] },
        intermediate: { material: '', studentTask: '', workspaceLines: 0, imageRefs: [] },
        advanced: { material: '', studentTask: '', workspaceLines: 0, imageRefs: [] }
      },
      order: (unitAssessment.miniAssessments || []).length
    };

    if (weighting !== undefined) {
      newMini.weighting = weighting;
    }

    unitAssessment.miniAssessments.push(newMini);
    form.remove();
    onUpdate(unitAssessment);
  });
}

/**
 * Open a form to edit an existing mini assessment.
 */
function openEditMiniForm(mini, unitAssessment, allBigIdeas, onUpdate) {
  const form = document.createElement('div');
  form.className = 'mini-form-modal';
  form.setAttribute('role', 'dialog');

  const bigIdea = allBigIdeas.find(bi => bi.id === mini.bigIdeaId);
  const bigIdeaDisplay = bigIdea ? bigIdea.title : '(unknown)';

  const html = `
    <div class="mini-form-content">
      <h3>Edit Mini Assessment</h3>
      <label>
        Name:
        <input type="text" id="mini-name" value="${mini.name || ''}" />
      </label>
      <label>
        Big Idea:
        <button type="button" id="pick-big-idea" class="btn-pick-big-idea">Choose...</button>
        <span id="selected-big-idea">${bigIdeaDisplay}</span>
        <input type="hidden" id="mini-big-idea-id" value="${mini.bigIdeaId || ''}" />
      </label>
      <label>
        Weighting (optional):
        <input type="number" id="mini-weighting" value="${mini.weighting || ''}" />
      </label>
      <div class="mini-form-actions">
        <button type="button" class="btn-cancel">Cancel</button>
        <button type="button" class="btn-confirm">Save</button>
      </div>
    </div>
  `;

  form.innerHTML = html;
  document.body.appendChild(form);

  const nameInput = form.querySelector('#mini-name');
  const bigIdeaBtn = form.querySelector('#pick-big-idea');
  const bigIdeaId = form.querySelector('#mini-big-idea-id');
  const weightingInput = form.querySelector('#mini-weighting');
  const cancelBtn = form.querySelector('.btn-cancel');
  const confirmBtn = form.querySelector('.btn-confirm');
  const bigIdeaDisplay2 = form.querySelector('#selected-big-idea');

  bigIdeaBtn.addEventListener('click', async e => {
    e.preventDefault();
    const selected = await openBigIdeaPicker(allBigIdeas, bigIdeaId.value || null);
    if (selected) {
      bigIdeaId.value = selected;
      const idea = allBigIdeas.find(bi => bi.id === selected);
      bigIdeaDisplay2.textContent = idea ? idea.title : '(unknown)';
    }
  });

  cancelBtn.addEventListener('click', e => {
    e.preventDefault();
    form.remove();
  });

  confirmBtn.addEventListener('click', e => {
    e.preventDefault();

    mini.name = nameInput.value || 'Mini Assessment';
    mini.bigIdeaId = bigIdeaId.value;
    if (weightingInput.value) {
      mini.weighting = parseInt(weightingInput.value);
    } else {
      delete mini.weighting;
    }

    form.remove();
    onUpdate(unitAssessment);
  });
}
