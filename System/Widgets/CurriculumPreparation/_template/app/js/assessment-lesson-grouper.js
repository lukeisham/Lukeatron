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
 * @param {Object|undefined} finalAssessment - unit.unitAssessment (may be undefined)
 * @param {Array} allBigIdeas - unit.bigIdeas[]
 * @returns {Object} { topicId: [item, item, ...], ... }
 *   Each item has { id, type: "lesson"|"mini"|"final", completed, ... }
 */
export function groupItemsByTopic(allLessons, allMiniAssessments, finalAssessment, allBigIdeas) {
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

  // Add final assessment
  if (finalAssessment && finalAssessment.id) {
    const topicId = resolveTopic(finalAssessment.id, [finalAssessment], allBigIdeas);
    if (topicId) {
      if (!topicMap[topicId]) {
        topicMap[topicId] = [];
      }
      topicMap[topicId].push({
        id: finalAssessment.id,
        type: 'final',
        name: finalAssessment.name || 'Final Assessment',
        completed: finalAssessment.finalAssessmentCompleted || false,
        date: finalAssessment.finalAssessmentDate || null,
        lessonPeriod: finalAssessment.finalAssessmentPeriod || null,
        bigIdeaId: finalAssessment.bigIdeaId,
      });
    }
  }

  return topicMap;
}
