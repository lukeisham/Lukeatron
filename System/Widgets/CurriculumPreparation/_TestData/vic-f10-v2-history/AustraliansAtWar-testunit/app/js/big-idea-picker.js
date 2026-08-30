/**
 * big-idea-picker.js — Shared big-idea binding picker (FR-LPB-1, AD-LPB-2)
 *
 * Modal dialog for selecting one big idea or sub-big idea.
 * Shared between lesson-plan-document, unit-assessment-document, and lesson-plan-generator.
 * Single source of truth; imported by all three builds.
 *
 * Usage:
 *   const selectedId = await openBigIdeaPicker(allBigIdeas, currentBigIdeaId);
 *   if (selectedId) {
 *     lesson.bigIdeaId = selectedId;
 *     // save and re-render
 *   }
 */

/**
 * Open a modal big-idea picker dialog.
 *
 * Renders all top-level big ideas and their sub-big ideas in a hierarchical list.
 * Single-select radio pattern (one idea at a time).
 *
 * @param {BigIdea[]} allBigIdeas - Full bigIdeas array from unit.json
 * @param {string|null} currentBigIdeaId - Currently selected idea ID (may be null)
 * @returns {Promise<string|null>} Selected big idea ID on confirm, null on cancel
 */
export async function openBigIdeaPicker(allBigIdeas, currentBigIdeaId = null) {
  return new Promise(resolve => {
    // Build a map of big ideas by ID for fast lookup
    const bigIdeaMap = {};
    for (const bi of (allBigIdeas || [])) {
      bigIdeaMap[bi.id] = bi;
    }

    // Separate top-level from sub-big ideas
    const topLevel = [];
    const subBigIdeas = {};

    for (const bi of (allBigIdeas || [])) {
      if (!bi.parentId) {
        topLevel.push(bi);
        subBigIdeas[bi.id] = [];
      }
    }

    for (const bi of (allBigIdeas || [])) {
      if (bi.parentId && subBigIdeas[bi.parentId]) {
        subBigIdeas[bi.parentId].push(bi);
      }
    }

    // Create modal container
    const modal = document.createElement('div');
    modal.className = 'big-idea-picker-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-labelledby', 'picker-title');

    // Build picker HTML
    let html = `
      <div class="big-idea-picker-content">
        <h2 id="picker-title">Select a Big Idea</h2>
        <form id="picker-form">
          <div class="big-idea-picker-list">
    `;

    for (const topBI of topLevel) {
      const topId = topBI.id;
      const topTitle = (topBI.title || '(untitled)').replace(/"/g, '&quot;');
      const isSelected = topId === currentBigIdeaId;

      html += `
        <div class="big-idea-group">
          <label class="big-idea-item big-idea-top-level">
            <input type="radio" name="bigIdea" value="${topId}"
              ${isSelected ? 'checked' : ''}
              data-is-top="true" />
            <span class="big-idea-label">${topTitle}</span>
          </label>
      `;

      // Add sub-big ideas if any
      if (subBigIdeas[topId] && subBigIdeas[topId].length > 0) {
        for (const subBI of subBigIdeas[topId]) {
          const subId = subBI.id;
          const subTitle = (subBI.title || '(untitled)').replace(/"/g, '&quot;');
          const subIsSelected = subId === currentBigIdeaId;

          html += `
            <label class="big-idea-item big-idea-sub-level">
              <input type="radio" name="bigIdea" value="${subId}"
                ${subIsSelected ? 'checked' : ''}
                data-is-top="false" />
              <span class="big-idea-label">${subTitle}</span>
            </label>
          `;
        }
      }

      html += `</div>`;
    }

    html += `
          </div>
          <div class="big-idea-picker-actions">
            <button type="button" class="btn-cancel">Cancel</button>
            <button type="submit" class="btn-confirm">Select</button>
          </div>
        </form>
      </div>
    `;

    modal.innerHTML = html;
    document.body.appendChild(modal);

    // Wire up event handlers
    const form = modal.querySelector('#picker-form');
    const cancelBtn = modal.querySelector('.btn-cancel');
    const confirmBtn = modal.querySelector('.btn-confirm');

    function cleanup() {
      modal.remove();
    }

    cancelBtn.addEventListener('click', e => {
      e.preventDefault();
      cleanup();
      resolve(null);
    });

    confirmBtn.addEventListener('click', e => {
      e.preventDefault();
      const selected = form.querySelector('input[name="bigIdea"]:checked');
      const selectedId = selected ? selected.value : null;
      cleanup();
      resolve(selectedId);
    });

    // Close on Escape
    const handleEscape = e => {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', handleEscape);
        cleanup();
        resolve(null);
      }
    };
    document.addEventListener('keydown', handleEscape);
  });
}
