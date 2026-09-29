// lesson-reorder-topic-mode.js — Topic-mode drag-to-reorder: writes Lesson.number
// Renumbers all affected lessons to maintain contiguity from 1 (INV-DM-32)
// Hand-rolled drag interaction with keyboard-operable equivalent

/**
 * Initialize drag-to-reorder in Topic mode.
 * Maintains lesson.number contiguity from 1 (INV-DM-32).
 *
 * @param {HTMLElement} containerElement - Container with lesson rows (data-lesson-id)
 * @param {Object} callbacks - { onReorder(lessonId, newPosition) }
 */
export function initTopicModeReorder(containerElement, callbacks) {
  if (!containerElement) return;

  let draggedElement = null;
  let draggedLessonId = null;
  let insertionMarker = null;

  // Find all lesson rows in the container
  function getLessonRows() {
    return Array.from(containerElement.querySelectorAll('[data-lesson-id]'));
  }

  // Start drag
  containerElement.addEventListener('dragstart', (e) => {
    const row = e.target.closest('[data-lesson-id]');
    if (!row) return;

    draggedElement = row;
    draggedLessonId = row.getAttribute('data-lesson-id');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', row.innerHTML);
    row.classList.add('drag-source');
  });

  // Over: show insertion point
  containerElement.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (!draggedElement) return;

    const rows = getLessonRows();
    const afterElement = rows.find(row => {
      const rect = row.getBoundingClientRect();
      return e.clientY < rect.top + rect.height / 2;
    });

    if (afterElement === draggedElement) {
      // Hide marker if we're back over the source
      if (insertionMarker) insertionMarker.remove();
      insertionMarker = null;
    } else {
      if (!insertionMarker) {
        insertionMarker = document.createElement('div');
        insertionMarker.className = 'insertion-marker';
        insertionMarker.style.height = '2px';
        insertionMarker.style.backgroundColor = 'var(--color-pass-line, #1F6B41)';
        insertionMarker.style.margin = '4px 0';
      }

      if (afterElement) {
        afterElement.parentNode.insertBefore(insertionMarker, afterElement);
      } else {
        containerElement.appendChild(insertionMarker);
      }
    }
  });

  // Leave: clean marker
  containerElement.addEventListener('dragleave', (e) => {
    if (e.target === containerElement && insertionMarker) {
      insertionMarker.remove();
      insertionMarker = null;
    }
  });

  // Drop: reorder
  containerElement.addEventListener('drop', (e) => {
    e.preventDefault();

    const rows = getLessonRows();
    const targetIndex = rows.indexOf(
      rows.find(row => {
        const rect = row.getBoundingClientRect();
        return e.clientY < rect.top + rect.height / 2;
      })
    );

    if (insertionMarker) {
      insertionMarker.remove();
      insertionMarker = null;
    }

    const newPosition = targetIndex >= 0 ? targetIndex : rows.length - 1;

    if (callbacks.onReorder) {
      callbacks.onReorder(draggedLessonId, newPosition);
    }

    draggedElement.classList.remove('drag-source');
    draggedElement = null;
    draggedLessonId = null;
  });

  // End: cleanup
  containerElement.addEventListener('dragend', (e) => {
    if (draggedElement) {
      draggedElement.classList.remove('drag-source');
    }
    if (insertionMarker) {
      insertionMarker.remove();
      insertionMarker = null;
    }
    draggedElement = null;
    draggedLessonId = null;
  });
}

/**
 * Renumber lessons contiguously from 1, preserving order.
 * Called after a drop in Topic mode to ensure INV-DM-32 holds.
 *
 * @param {Array} allLessons - unit.lessons[]
 * @param {number} draggedIndex - 0-based index of dragged lesson in display order
 * @param {number} targetIndex - 0-based target position
 * @returns {Array} Lessons with updated .number fields, in their original array order
 */
export function renumberLessonsAfterReorder(allLessons, draggedIndex, targetIndex) {
  if (!allLessons || allLessons.length === 0) return allLessons;

  // Create a working copy
  const lessons = allLessons.map(l => ({ ...l }));

  // Sort by current number to get display order
  const displayOrder = lessons.slice().sort((a, b) => (a.number || 0) - (b.number || 0));

  // Move the dragged lesson to its new position
  const dragged = displayOrder[draggedIndex];
  if (!dragged) return allLessons;

  displayOrder.splice(draggedIndex, 1);
  displayOrder.splice(targetIndex, 0, dragged);

  // Renumber 1..N
  displayOrder.forEach((lesson, index) => {
    lesson.number = index + 1;
  });

  // Map back to original array positions
  const result = allLessons.map(orig => {
    const updated = displayOrder.find(l => l.id === orig.id);
    return updated || orig;
  });

  return result;
}
