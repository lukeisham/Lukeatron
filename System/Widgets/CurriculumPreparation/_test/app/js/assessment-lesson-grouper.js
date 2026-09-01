// assessment-lesson-grouper.js — Helper to place assessments under their topics via FR-BIB-17
// Maps topicId → [lessons + assessments under that topic]
// Assessments are placed independently per their own bigIdeaId (AD-37)

import { resolveTopic } from './bigidea-list.js';

/**
 * Create a map of topicId → [all lessons and assessments under that topic]
 * Uses FR-BIB-17's shared resolveTopic() to resolve each item's topic.
 *
 * @param {Array} allLessons - unit.lessons[]
 * @param {Array} allMiniAssessments - unit.miniAssessments[] (may be undefined/empty)
 * @param {Object|undefined} majorAssessment - unit.unitAssessment (may be undefined)
 * @param {Array} allBigIdeas - unit.bigIdeas[]
 * @returns {Object} { topicId: [item, item, ...], ... }
 *   Each item has { id, type: "lesson"|"mini"|"major", completed, ... }
 */
export function groupItemsByTopic(allLessons, allMiniAssessments, majorAssessment, allBigIdeas) {
  const topicMap = {};

  // Add all lessons
  if (allLessons && Array.isArray(allLessons)) {
    for (const lesson of allLessons) {
      const topicId = resolveTopic(lesson.id, allLessons, allBigIdeas);
      if (topicId) {
        if (!topicMap[topicId]) {
          topicMap[topicId] = [];
        }
        topicMap[topicId].push({
          id: lesson.id,
          type: 'lesson',
          number: lesson.number,
          completed: lesson.completed || false,
          date: lesson.date || null,
          lessonPeriod: lesson.lessonPeriod || null,
          bigIdeaId: lesson.bigIdeaId,
        });
      }
    }
  }

  // Add all mini assessments
  if (allMiniAssessments && Array.isArray(allMiniAssessments)) {
    for (const mini of allMiniAssessments) {
      const topicId = resolveTopic(mini.id, allMiniAssessments, allBigIdeas);
      if (topicId) {
        if (!topicMap[topicId]) {
          topicMap[topicId] = [];
        }
        topicMap[topicId].push({
          id: mini.id,
          type: 'mini',
          name: mini.name || 'Mini Assessment',
          completed: mini.completed || false,
          date: mini.date || null,
          lessonPeriod: mini.lessonPeriod || null,
          bigIdeaId: mini.bigIdeaId,
          order: mini.order || 0,
        });
      }
    }
  }

  // Add major assessment
  if (majorAssessment && majorAssessment.id) {
    const topicId = resolveTopic(majorAssessment.id, [majorAssessment], allBigIdeas);
    if (topicId) {
      if (!topicMap[topicId]) {
        topicMap[topicId] = [];
      }
      topicMap[topicId].push({
        id: majorAssessment.id,
        type: 'major',
        name: majorAssessment.name || 'Major Assessment',
        completed: majorAssessment.majorAssessmentCompleted || false,
        date: majorAssessment.majorAssessmentDate || null,
        lessonPeriod: majorAssessment.majorAssessmentPeriod || null,
        bigIdeaId: majorAssessment.bigIdeaId,
      });
    }
  }

  return topicMap;
}
