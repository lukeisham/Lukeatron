// text-prompt.js — Single-field text modal, shared by any caller that needs
// one line of free text from the teacher (JS-6: no innerHTML with store
// text). window.prompt() is unusable here — it blocks the tab entirely,
// which any UI-driving test harness (and some browser automation) can't
// dismiss. Built on the same overlay/content classes as node-picker.js so
// it needs no CSS of its own.
// Extracted out of app.js so marking-matrix.js can reuse it too, without
// app.js and marking-matrix.js importing each other (app.js already imports
// MarkingMatrix from marking-matrix.js).

/**
 * @param {string} labelText
 * @returns {Promise<string|null>} Trimmed input on confirm, null on cancel
 */
export function openTextPrompt(labelText) {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'node-picker-modal';
    modal.setAttribute('role', 'dialog');

    const content = document.createElement('div');
    content.className = 'node-picker-content';

    const label = document.createElement('label');
    label.className = 'generator-label';
    label.textContent = labelText;
    content.appendChild(label);

    const input = document.createElement('input');
    input.type = 'text';
    content.appendChild(input);

    const actions = document.createElement('div');
    actions.className = 'node-picker-actions';

    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.className = 'btn-primary';
    confirmBtn.textContent = 'Add';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn-secondary';
    cancelBtn.textContent = 'Cancel';

    actions.appendChild(confirmBtn);
    actions.appendChild(cancelBtn);
    content.appendChild(actions);
    modal.appendChild(content);
    document.body.appendChild(modal);

    const cleanup = () => modal.remove();

    confirmBtn.addEventListener('click', () => {
      const value = input.value.trim();
      cleanup();
      resolve(value || null);
    });
    cancelBtn.addEventListener('click', () => {
      cleanup();
      resolve(null);
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') confirmBtn.click();
      if (e.key === 'Escape') cancelBtn.click();
    });

    input.focus();
  });
}
