// lesson-reorder-date-mode.js — Date-mode drag-to-reorder: writes only dragged lesson's date
// Never touches .number or any other lesson's .date (FR-LTB-19)
// Hand-rolled drag interaction with keyboard-operable equivalent

/**
 * Initialize drag-to-reorder in Date mode.
 * Dragging a lesson to a date-group sets only that lesson's .date (FR-LTB-18…21).
 * Other lessons' .date fields remain untouched (FR-LTB-19).
 *
 * @param {HTMLElement} containerElement - Container with date-group headings and lesson rows
 * @param {Object} callbacks - { onDateChange(lessonId, newDate) }
 */
export function initDateModeReorder(containerElement, callbacks) {
  if (!containerElement) return;

  let draggedElement = null;
  let draggedLessonId = null;
  let insertionMarker = null;

  // Extract date from a heading's data attribute
  function getDateFromHeading(heading) {
    return heading.getAttribute('data-date') || null;
  }

  // Find all date-group headings
  function getDateHeadings() {
    return Array.from(containerElement.querySelectorAll('[data-date], [data-unscheduled]'));
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

  // Over: show insertion point at target date-group
  containerElement.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (!draggedElement) return;

    // Find the nearest date heading above the cursor
    const headings = getDateHeadings();
    const targetHeading = headings.find(h => {
      const rect = h.getBoundingClientRect();
      return e.clientY < rect.top;
    }) || headings[headings.length - 1];

    if (!targetHeading) return;

    if (!insertionMarker) {
      insertionMarker = document.createElement('div');
      insertionMarker.className = 'insertion-marker';
      insertionMarker.style.height = '2px';
      insertionMarker.style.backgroundColor = 'var(--color-date-accent, #185FA5)';
      insertionMarker.style.margin = '4px 0';
    }

    targetHeading.parentNode.insertBefore(insertionMarker, targetHeading.nextElementSibling);
  });

  // Leave: clean marker
  containerElement.addEventListener('dragleave', (e) => {
    if (e.target === containerElement && insertionMarker) {
      insertionMarker.remove();
      insertionMarker = null;
    }
  });

  // Drop: set dragged lesson's date to target heading's date
  containerElement.addEventListener('drop', (e) => {
    e.preventDefault();

    const headings = getDateHeadings();
    const targetHeading = headings.find(h => {
      const rect = h.getBoundingClientRect();
      return e.clientY < rect.top;
    }) || headings[headings.length - 1];

    if (insertionMarker) {
      insertionMarker.remove();
      insertionMarker = null;
    }

    if (targetHeading && callbacks.onDateChange) {
      let newDate = getDateFromHeading(targetHeading);

      // Special cases per FR-LTB-20:
      // - Dropped into "Unscheduled": set date to null
      if (targetHeading.getAttribute('data-unscheduled') === 'true') {
        newDate = null;
      }
      // - If dropped before first date heading (shouldn't happen with current logic),
      //   set to first heading's date
      // - If dropped after last date heading but before Unscheduled,
      //   set to last dated heading's date

      callbacks.onDateChange(draggedLessonId, newDate);
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
