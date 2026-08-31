// topic-status-computer.js — Compute topic completion status from all items under it
// Pure function: never stored on topic (FR-TOP-11)
// Grouping-independent: same result whether Topic or Date mode is active (AD-LTB-4)

import { resolveTopic } from './bigidea-list.js';

/**
 * Compute a topic's status from all lessons and assessments bound to it.
 * Returns: "not started" | "in progress" | "complete"
 *
 * Algorithm (AD-LTB-4):
 * 1. Collect every lesson + mini + final assessment bound to this topic (via FR-BIB-17 resolution)
 * 2. If none: return "not started" (optional topics are OK)
 * 3. If all completed: return "complete"
 * 4. If some completed: return "in progress"
 * 5. If none completed: return "not started"
 *
 * Computed on every render, never stored.
 *
 * @param {string} topicId - The topic.id
 * @param {Array} allLessons - unit.lessons[]
 * @param {Array} allMiniAssessments - unit.miniAssessments[] (may be undefined)
 * @param {Object|undefined} finalAssessment - unit.unitAssessment (may be undefined)
 * @param {Array} allBigIdeas - unit.bigIdeas[]
 * @returns {string} "not started" | "in progress" | "complete"
 */
export function computeTopicStatus(topicId, allLessons, allMiniAssessments, finalAssessment, allBigIdeas) {
  if (!topicId || typeof topicId !== 'string') {
    return 'not started';
  }

  const items = [];

  // Collect all lessons bound to this topic
  if (allLessons && Array.isArray(allLessons)) {
    for (const lesson of allLessons) {
      if (resolveTopic(lesson.id, allLessons, allBigIdeas) === topicId) {
        items.push({ completed: lesson.completed || false });
      }
    }
  }

  // Collect all mini assessments bound to this topic
  if (allMiniAssessments && Array.isArray(allMiniAssessments)) {
    for (const mini of allMiniAssessments) {
      if (resolveTopic(mini.id, allMiniAssessments, allBigIdeas) === topicId) {
        items.push({ completed: mini.completed || false });
      }
    }
  }

  // Collect final assessment if bound to this topic
  if (finalAssessment && finalAssessment.id) {
    if (resolveTopic(finalAssessment.id, [finalAssessment], allBigIdeas) === topicId) {
      items.push({ completed: finalAssessment.finalAssessmentCompleted || false });
    }
  }

  // If no items, topic is not started
  if (items.length === 0) {
    return 'not started';
  }

  // Count completed items
  const completedCount = items.filter(item => item.completed).length;

  if (completedCount === items.length) {
    return 'complete';
  } else if (completedCount > 0) {
    return 'in progress';
  } else {
    return 'not started';
  }
}
