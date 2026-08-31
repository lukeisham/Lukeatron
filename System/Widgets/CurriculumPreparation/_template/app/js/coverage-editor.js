/**
 * coverage-editor.js — UI for editing assessment coverage links (FR-UAB-7)
 *
 * Allows adding, editing, and removing coverage-qualified curriculum links
 * in the form {nodeId, coverage: "full"|"partial", note}.
 * Prevents duplicate nodeIds within one assessment.
 */

/**
 * Render a coverage editor UI for an assessment.
 *
 * @param {Object} assessment - The assessment being edited (has coverage[] array)
 * @param {Array} allNodes - All curriculum nodes (for node picker)
 * @param {Function} onUpdate - Callback(updatedAssessment) when coverage changes
 * @returns {HTMLElement} Container element
 */
export function renderCoverageEditor(assessment, allNodes = [], onUpdate = () => {}) {
  const container = document.createElement('div');
  container.className = 'coverage-editor';

  // Title
  const title = document.createElement('h3');
  title.textContent = 'Curriculum Coverage';
  title.className = 'coverage-title';
  container.appendChild(title);

  // Coverage links list
  const listContainer = document.createElement('div');
  listContainer.className = 'coverage-links-list';

  if (!assessment.coverage) {
    assessment.coverage = [];
  }

  for (const link of assessment.coverage) {
    const linkEl = renderCoverageLink(link, assessment, onUpdate);
    listContainer.appendChild(linkEl);
  }

  container.appendChild(listContainer);

  // Add button
  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'btn-add-coverage';
  addBtn.textContent = '+ Add Coverage Link';
  addBtn.addEventListener('click', e => {
    e.preventDefault();
    openNodePicker(allNodes, assessment, (nodeId, node) => {
      // Check for duplicate
      if (assessment.coverage.some(c => c.nodeId === nodeId)) {
        alert('Already linked');
        return;
      }

      // Add coverage entry
      assessment.coverage.push({
        nodeId,
        coverage: 'full',
        note: ''
      });

      // Re-render
      container.innerHTML = '';
      const updated = renderCoverageEditor(assessment, allNodes, onUpdate);
      container.parentNode.replaceChild(updated, container);
      onUpdate(assessment);
    });
  });

  container.appendChild(addBtn);

  return container;
}

/**
 * Render a single coverage link entry with edit/delete controls.
 */
function renderCoverageLink(link, assessment, onUpdate) {
  const entry = document.createElement('div');
  entry.className = 'coverage-link-entry';

  // Node reference (read-only)
  const nodeRef = document.createElement('span');
  nodeRef.className = 'coverage-node-ref';
  nodeRef.textContent = link.nodeId || '(unknown)';
  entry.appendChild(nodeRef);

  // Coverage toggle (full ↔ partial)
  const coverageLabel = document.createElement('label');
  coverageLabel.className = 'coverage-toggle-label';
  const coverageSelect = document.createElement('select');
  coverageSelect.className = 'coverage-select';
  coverageSelect.innerHTML = `
    <option value="full" ${link.coverage === 'full' ? 'selected' : ''}>Full</option>
    <option value="partial" ${link.coverage === 'partial' ? 'selected' : ''}>Partial</option>
  `;
  coverageSelect.addEventListener('change', e => {
    link.coverage = e.target.value;
    onUpdate(assessment);
  });
  coverageLabel.appendChild(coverageSelect);
  entry.appendChild(coverageLabel);

  // Note field (editable)
  const noteInput = document.createElement('input');
  noteInput.type = 'text';
  noteInput.className = 'coverage-note';
  noteInput.placeholder = 'Add a note (optional)';
  noteInput.value = link.note || '';
  noteInput.addEventListener('change', e => {
    link.note = e.target.value;
    onUpdate(assessment);
  });
  entry.appendChild(noteInput);

  // Delete button
  const delBtn = document.createElement('button');
  delBtn.type = 'button';
  delBtn.className = 'btn-delete-coverage';
  delBtn.textContent = '×';
  delBtn.addEventListener('click', e => {
    e.preventDefault();
    const idx = assessment.coverage.indexOf(link);
    if (idx >= 0) {
      assessment.coverage.splice(idx, 1);
      entry.remove();
      onUpdate(assessment);
    }
  });
  entry.appendChild(delBtn);

  return entry;
}

/**
 * Open a modal to pick a curriculum node.
 *
 * @param {Array} allNodes - Curriculum nodes to choose from
 * @param {Object} assessment - Current assessment (for context)
 * @param {Function} onSelect - Callback(nodeId, nodeObj) when node is selected
 */
function openNodePicker(allNodes, assessment, onSelect) {
  // Simple modal picker
  // For now, a basic alert-style prompt with node IDs
  // In production, this would be a full hierarchical picker UI

  const nodeList = (allNodes || [])
    .filter(n => n.kind === 'outcome' || n.kind === 'task')
    .map(n => `${n.code || n.id}: ${n.title || '(untitled)'}`)
    .join('\n');

  const selected = prompt(`Select a node (by code):\n\n${nodeList}`);
  if (!selected) return;

  // Find matching node
  const node = (allNodes || []).find(
    n => n.code === selected || n.id === selected
  );
  if (node) {
    onSelect(node.id, node);
  }
}
