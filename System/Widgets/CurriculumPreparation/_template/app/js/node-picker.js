/**
 * node-picker.js — Curriculum node multi-select helper
 *
 * Renders a checkbox list over curriculum tree, allowing selection of
 * one or more outcome/task nodes (not strands per FR-LPG-1).
 *
 * Returns Promise<string[]> of selected nodeIds on confirm, empty array on cancel.
 */

/**
 * Open a modal node picker for multi-select.
 *
 * Renders only nodes with kind === "outcome" or kind === "task"
 * (filtering out strands per FR-LPG-1).
 * Displays them with tree indentation based on depth.
 *
 * @param {Object[]} allNodes - Full curriculum nodes array
 * @param {string[]} currentNodeIds - Currently selected node IDs (pre-fill)
 * @param {string[]} [allowedKinds=['outcome','task']] - node kinds selectable;
 *   defaults to the FR-LPG-1 outcome/task set. Callers that only want, e.g.,
 *   coded outcome criteria (never strands or tasks) pass ['outcome'].
 * @returns {Promise<string[]>} Selected node IDs on confirm, [] on cancel
 */
export async function openNodePicker(allNodes, currentNodeIds = [], allowedKinds = ['outcome', 'task']) {
  return new Promise((resolve) => {
    // Filter to selectable nodes (outcome/task only, per FR-LPG-1 — narrower
    // when the caller passes a more specific allowedKinds)
    const selectableNodes = (allNodes || []).filter(
      (n) => allowedKinds.includes(n.kind)
    );

    // Create a set for quick lookup
    const currentSet = new Set(currentNodeIds);

    // Build a nodeMap for parent lookup
    const nodeMap = {};
    for (const node of allNodes || []) {
      if (node.id) {
        nodeMap[node.id] = node;
      }
    }

    // Compute depth for each selectable node
    const nodeDepths = {};
    for (const node of selectableNodes) {
      nodeDepths[node.id] = _getDepth(node, nodeMap);
    }

    // Sort by depth, then by order in original array (maintains tree structure)
    const sortedNodes = [...selectableNodes].sort((a, b) => {
      const depthDiff = nodeDepths[a.id] - nodeDepths[b.id];
      if (depthDiff !== 0) return depthDiff;
      return (allNodes || []).indexOf(a) - (allNodes || []).indexOf(b);
    });

    // Create modal
    const modal = document.createElement('div');
    modal.className = 'node-picker-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-labelledby', 'node-picker-title');

    // Build HTML
    let html = `
      <div class="node-picker-content">
        <h2 id="node-picker-title">Select Curriculum Node(s)</h2>
        <p class="node-picker-description">Choose one or more nodes to bind to this lesson.</p>
        <form id="node-picker-form">
          <div class="node-picker-list">
    `;

    for (const node of sortedNodes) {
      const depth = nodeDepths[node.id];
      const isChecked = currentSet.has(node.id);
      const label = `${node.code || '—'} ${node.title || '(untitled)'}`.trim();
      const nodeHTML = `
        <label class="node-picker-item" style="margin-left: ${depth * 20}px;">
          <input type="checkbox" name="node" value="${_escapeAttr(node.id)}"
            ${isChecked ? 'checked' : ''} />
          <span class="node-picker-label">${_escapeHtml(label)}</span>
        </label>
      `;
      html += nodeHTML;
    }

    html += `
          </div>
          <div class="node-picker-actions">
            <button type="button" class="btn-primary" id="node-picker-confirm">Confirm</button>
            <button type="button" class="btn-secondary" id="node-picker-cancel">Cancel</button>
          </div>
        </form>
      </div>
    `;

    modal.innerHTML = html;
    document.body.appendChild(modal);

    // Bind events
    const confirmBtn = modal.querySelector('#node-picker-confirm');
    const cancelBtn = modal.querySelector('#node-picker-cancel');
    const form = modal.querySelector('#node-picker-form');

    const cleanup = () => {
      modal.remove();
    };

    confirmBtn.addEventListener('click', () => {
      const formData = new FormData(form);
      const selected = formData.getAll('node');
      cleanup();
      resolve(selected);
    });

    cancelBtn.addEventListener('click', () => {
      cleanup();
      resolve([]);
    });

    // Also allow Escape to cancel
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', handleEscape);
        cleanup();
        resolve([]);
      }
    };
    document.addEventListener('keydown', handleEscape);
  });
}

/**
 * Get the depth of a node in the tree (distance from root).
 * @private
 * @param {Object} node - The node to measure
 * @param {Object} nodeMap - Map of all nodes by ID
 * @returns {number} Depth (0 for root)
 */
function _getDepth(node, nodeMap) {
  let depth = 0;
  let current = node;
  while (current.parentId) {
    current = nodeMap[current.parentId];
    if (!current) break;
    depth++;
  }
  return depth;
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

/**
 * Escape attribute value.
 * @private
 */
function _escapeAttr(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
