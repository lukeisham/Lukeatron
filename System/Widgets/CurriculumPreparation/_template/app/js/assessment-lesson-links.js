/**
 * assessment-lesson-links.js — Derived lesson-linking logic (INV-DM-12)
 *
 * Computes which lessons reference a given assessment.
 * Never stored as a reverse field; always computed on load by scanning lessons.
 * Used by unit-assessment-document to display "Lessons using this assessment".
 */

/**
 * Find all lessons that reference a given assessment.
 *
 * Per INV-DM-12: lesson-to-assessment links are stored on the lesson,
 * not on the assessment. This function scans all lessons to find references.
 *
 * @param {string} assessmentId - The assessment ID to search for
 * @param {string} assessmentKind - "major" | "mini"
 * @param {Array} allLessons - All lesson objects from unit.lessons[]
 * @returns {Array} Array of lessons that reference this assessment
 */
export function findReferencingLessons(assessmentId, assessmentKind, allLessons = []) {
  const referencing = [];

  for (const lesson of allLessons) {
    if (!lesson.assessmentLink) continue;

    const link = lesson.assessmentLink;

    // Check for major assessment reference
    if (assessmentKind === 'major' && link.majorAssessment === true) {
      referencing.push(lesson);
    }

    // Check for mini assessment reference
    if (assessmentKind === 'mini' && Array.isArray(link.miniAssessmentIds)) {
      if (link.miniAssessmentIds.includes(assessmentId)) {
        referencing.push(lesson);
      }
    }
  }

  return referencing;
}

/**
 * Format a lesson reference for display in citations.
 *
 * @param {Object} lesson - Lesson object
 * @returns {string} Human-readable citation (e.g., "Lesson 3: Photosynthesis")
 */
export function formatLessonCitation(lesson) {
  const number = lesson.number || '?';
  const name = lesson.name || '(untitled)';
  return `Lesson ${number}: ${name}`;
}

/**
 * Get a list of lesson numbers for a given assessment kind.
 * Useful for quick "Lessons 1, 3, 5" style summaries.
 *
 * @param {string} assessmentId - The assessment ID
 * @param {string} assessmentKind - "major" | "mini"
 * @param {Array} allLessons - All lessons
 * @returns {Array} Array of lesson numbers
 */
export function getReferencingLessonNumbers(assessmentId, assessmentKind, allLessons = []) {
  return findReferencingLessons(assessmentId, assessmentKind, allLessons)
    .map(lesson => lesson.number)
    .filter(Boolean)
    .sort((a, b) => a - b);
}
