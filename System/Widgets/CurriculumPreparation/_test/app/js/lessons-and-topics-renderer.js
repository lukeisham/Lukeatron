// lessons-and-topics-renderer.js — Render both Topic and Date grouping modes
// Handles completion dots, status badges, date/period pills, domain glyphs

import { computeTopicStatus } from './topic-status-computer.js';
import { groupItemsByTopic } from './assessment-lesson-grouper.js';
import { renderDomainGlyphs, escapeHtml } from './domain-glyph-renderer.js';
import { resolveTopic } from './bigidea-list.js';

/**
 * Render the full view in Topic mode.
 * Each topic is a heading with its lessons and assessments listed beneath.
 *
 * @param {Object} allData - { lessons, miniAssessments, unitAssessment, bigIdeas, topics, nodes }
 * @param {Object} callbacks - { onToggleGrouping, onMarkComplete, onSetDate, onSetPeriod }
 * @returns {HTMLElement}
 */
export function renderTopicMode(allData, callbacks) {
  const container = document.createElement('div');
  container.className = 'lessons-and-topics-view topic-mode';

  const { lessons = [], miniAssessments = [], unitAssessment, bigIdeas = [], topics = [], nodes = [] } = allData;

  // Group items by topic
  const itemsByTopic = groupItemsByTopic(lessons, miniAssessments, unitAssessment, bigIdeas);

  // Render each topic in order
  for (const topic of topics) {
    if (!topic.id) continue;

    const topicCard = document.createElement('div');
    topicCard.className = 'topic-card';

    // Topic heading with status
    const status = computeTopicStatus(topic.id, lessons, miniAssessments, unitAssessment, bigIdeas);
    const statusClass = `status-${status}`.replace(/\s+/g, '-');

    const heading = document.createElement('div');
    heading.className = 'topic-heading';
    heading.innerHTML = `<h3>${escapeHtml(topic.title)}</h3><span class="status-badge ${statusClass}">${status}</span>`;

    topicCard.appendChild(heading);

    // Items under this topic
    const items = itemsByTopic[topic.id] || [];
    for (const item of items) {
      const row = renderItemRow(item, callbacks, bigIdeas, nodes);
      topicCard.appendChild(row);
    }

    container.appendChild(topicCard);
  }

  return container;
}

/**
 * Render the full view in Date mode.
 * Items grouped by date, with in-row topic labels.
 *
 * @param {Object} allData - { lessons, miniAssessments, unitAssessment, bigIdeas, topics, nodes }
 * @param {Object} callbacks - { onToggleGrouping, onMarkComplete, onSetDate, onSetPeriod }
 * @returns {HTMLElement}
 */
export function renderDateMode(allData, callbacks) {
  const container = document.createElement('div');
  container.className = 'lessons-and-topics-view date-mode';

  const { lessons = [], miniAssessments = [], unitAssessment, bigIdeas = [], topics = [], nodes = [] } = allData;

  // Collect all items with their topics
  const allItems = [];

  // Add lessons
  for (const lesson of lessons) {
    const topicId = resolveTopic(lesson.id, lessons, bigIdeas);
    const topic = topics.find(t => t.id === topicId);
    allItems.push({
      ...lesson,
      type: 'lesson',
      topicId,
      topicTitle: topic?.title || 'Unassigned',
      date: lesson.date || null,
    });
  }

  // Add mini assessments
  for (const mini of miniAssessments) {
    const topicId = resolveTopic(mini.id, miniAssessments, bigIdeas);
    const topic = topics.find(t => t.id === topicId);
    allItems.push({
      ...mini,
      type: 'mini',
      topicId,
      topicTitle: topic?.title || 'Unassigned',
      date: mini.date || null,
    });
  }

  // Add major assessment
  if (unitAssessment && unitAssessment.id) {
    const topicId = resolveTopic(unitAssessment.id, [unitAssessment], bigIdeas);
    const topic = topics.find(t => t.id === topicId);
    allItems.push({
      ...unitAssessment,
      type: 'major',
      topicId,
      topicTitle: topic?.title || 'Unassigned',
      date: unitAssessment.majorAssessmentDate || null,
    });
  }

  // Group by date
  const dateGroups = {};
  const unscheduled = [];

  for (const item of allItems) {
    if (item.date) {
      if (!dateGroups[item.date]) {
        dateGroups[item.date] = [];
      }
      dateGroups[item.date].push(item);
    } else {
      unscheduled.push(item);
    }
  }

  // Sort date groups by date
  const sortedDates = Object.keys(dateGroups).sort();

  // Render date groups
  for (const date of sortedDates) {
    const dateHeading = document.createElement('div');
    dateHeading.className = 'date-heading';
    dateHeading.setAttribute('data-date', date);
    dateHeading.innerHTML = `<h3>${escapeHtml(date)}</h3>`;

    container.appendChild(dateHeading);

    for (const item of dateGroups[date]) {
      const row = renderItemRowWithTopic(item, callbacks, bigIdeas, nodes);
      container.appendChild(row);
    }
  }

  // Render unscheduled
  if (unscheduled.length > 0) {
    const unscheduledHeading = document.createElement('div');
    unscheduledHeading.className = 'unscheduled-heading';
    unscheduledHeading.setAttribute('data-unscheduled', 'true');
    unscheduledHeading.innerHTML = '<h3>Unscheduled</h3>';

    container.appendChild(unscheduledHeading);

    for (const item of unscheduled) {
      const row = renderItemRowWithTopic(item, callbacks, bigIdeas, nodes);
      container.appendChild(row);
    }
  }

  return container;
}

/**
 * Render a single item row (lesson or assessment).
 *
 * @param {Object} item - { id, type, number, name, completed, date, lessonPeriod, bigIdeaId }
 * @param {Object} callbacks - { onMarkComplete, onSetDate, onSetPeriod }
 * @param {Array} bigIdeas - unit.bigIdeas[]
 * @param {Array} nodes - unit.nodes[]
 * @returns {HTMLElement}
 */
function renderItemRow(item, callbacks, bigIdeas, nodes) {
  const row = document.createElement('div');
  row.className = `item-row ${item.completed ? 'completed' : 'not-completed'}`;
  row.setAttribute('data-lesson-id', item.id);
  if (item.completed) {
    row.style.backgroundColor = 'var(--color-row-tint-completion, #F4FAF6)';
  }

  // Completion dot (clickable)
  const dot = document.createElement('div');
  dot.className = `completion-dot ${item.completed ? 'filled' : 'hollow'}`;
  dot.style.cursor = 'pointer';
  dot.title = 'Click to toggle completion';
  dot.addEventListener('click', (e) => {
    e.stopPropagation();
    if (callbacks.onMarkComplete) {
      callbacks.onMarkComplete(item.id, !item.completed);
    }
  });

  // Tag (L1, MINI, MAJOR, etc.)
  const tag = document.createElement('span');
  tag.className = 'item-tag';
  if (item.type === 'lesson') {
    tag.textContent = `L${item.number || '?'}`;
  } else if (item.type === 'mini') {
    tag.textContent = 'MINI';
  } else if (item.type === 'major') {
    tag.textContent = 'MAJOR';
  }

  // Label with domain glyphs
  const label = document.createElement('span');
  label.className = 'item-label';
  if (item.type === 'lesson' && item.bigIdeaId) {
    const glyphs = renderDomainGlyphs(item.bigIdeaId, bigIdeas, nodes);
    const bigIdea = bigIdeas.find(bi => bi.id === item.bigIdeaId);
    label.innerHTML = `${glyphs} ${escapeHtml(bigIdea?.title || 'Big Idea')}`;
  } else {
    label.textContent = item.name || 'Assessment';
  }

  // Date pill (if set)
  const pills = document.createElement('div');
  pills.className = 'pills-group';
  if (item.date) {
    const datePill = document.createElement('span');
    datePill.className = 'date-pill';
    datePill.textContent = escapeHtml(item.date);
    pills.appendChild(datePill);
  }

  // Period pill (if set)
  if (item.lessonPeriod) {
    const periodPill = document.createElement('span');
    periodPill.className = 'period-pill';
    periodPill.textContent = escapeHtml(item.lessonPeriod);
    pills.appendChild(periodPill);
  }

  row.appendChild(dot);
  row.appendChild(tag);
  row.appendChild(label);
  row.appendChild(pills);

  return row;
}

/**
 * Render an item row with in-row topic label (for Date mode).
 */
function renderItemRowWithTopic(item, callbacks, bigIdeas, nodes) {
  const row = renderItemRow(item, callbacks, bigIdeas, nodes);

  // Add topic label after the main label
  const topicLabel = document.createElement('span');
  topicLabel.className = 'topic-label';
  topicLabel.textContent = `[${escapeHtml(item.topicTitle)}]`;

  // Insert after the item-label
  const labelNode = row.querySelector('.item-label');
  if (labelNode) {
    labelNode.parentNode.insertBefore(topicLabel, labelNode.nextSibling);
  }

  return row;
}
