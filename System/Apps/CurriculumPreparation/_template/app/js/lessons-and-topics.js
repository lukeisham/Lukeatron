// lessons-and-topics.js — Main page model for Topic/Date view
// Manages grouping mode state, reorder/complete/schedule logic, render loop

import { renderTopicMode, renderDateMode } from './lessons-and-topics-renderer.js';
import { initTopicModeReorder, renumberLessonsAfterReorder } from './lesson-reorder-topic-mode.js';
import { initDateModeReorder } from './lesson-reorder-date-mode.js';
import { computeTopicStatus } from './topic-status-computer.js';
import { groupItemsByTopic } from './assessment-lesson-grouper.js';
import { resolveTopic } from './bigidea-list.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const PAGE_VIEWBOX = '0 0 210 297'; // A4 portrait, mm

/**
 * LessonsAndTopicsView — The combined sequential lessons + topics page.
 * Displays all lessons and assessments by topic (or by date), with completion tracking and scheduling.
 *
 * Constructor accepts:
 * - allLessons: unit.lessons[]
 * - allMiniAssessments: unit.miniAssessments[]
 * - majorAssessment: unit.unitAssessment
 * - allBigIdeas: unit.bigIdeas[]
 * - allTopics: unit.topics[]
 * - allNodes: unit.nodes[]
 * - initGroupingMode: "topic" (default) or "date"
 */
export class LessonsAndTopicsView {
  constructor(allLessons, allMiniAssessments, majorAssessment, allBigIdeas, allTopics, allNodes, initGroupingMode = 'topic', localStore = null) {
    this.lessons = allLessons || [];
    this.miniAssessments = allMiniAssessments || [];
    this.unitAssessment = majorAssessment || {};
    this.bigIdeas = allBigIdeas || [];
    this.topics = allTopics || [];
    this.nodes = allNodes || [];
    this.localStore = localStore;

    this.groupingMode = initGroupingMode;
    this.container = null;
    this.reorderInitialized = false;
  }

  /**
   * Render the view into a container element.
   * @param {HTMLElement} containerElement
   */
  render(containerElement) {
    if (!containerElement) return;

    this.container = containerElement;
    containerElement.innerHTML = '';

    // Add mode toggle (header)
    const header = document.createElement('div');
    header.className = 'lessons-and-topics-header';

    const modeToggle = document.createElement('button');
    modeToggle.className = 'mode-toggle';
    modeToggle.textContent = `View by ${this.groupingMode === 'topic' ? 'Date' : 'Topic'}`;
    modeToggle.addEventListener('click', () => this.toggleGroupingMode());

    header.appendChild(modeToggle);
    containerElement.appendChild(header);

    // Render content based on mode
    const allData = {
      lessons: this.lessons,
      miniAssessments: this.miniAssessments,
      unitAssessment: this.unitAssessment,
      bigIdeas: this.bigIdeas,
      topics: this.topics,
      nodes: this.nodes,
    };

    const callbacks = {
      onToggleGrouping: () => this.toggleGroupingMode(),
      onMarkComplete: (id, completed) => this.markItemComplete(id, completed),
      onSetDate: (id, date) => this.setItemDate(id, date),
      onSetPeriod: (id, period) => this.setItemPeriod(id, period),
    };

    let content;
    if (this.groupingMode === 'topic') {
      content = renderTopicMode(allData, callbacks);
    } else {
      content = renderDateMode(allData, callbacks);
    }

    containerElement.appendChild(content);

    // Initialize drag-to-reorder
    if (!this.reorderInitialized) {
      const contentContainer = content;
      if (this.groupingMode === 'topic') {
        initTopicModeReorder(contentContainer, {
          onReorder: (lessonId, newPosition) => this.reorderLessonTopicMode(lessonId, newPosition),
        });
      } else {
        initDateModeReorder(contentContainer, {
          onDateChange: (lessonId, newDate) => this.setItemDate(lessonId, newDate),
        });
      }
      this.reorderInitialized = true;
    }
  }

  /**
   * Toggle between Topic and Date grouping modes.
   */
  toggleGroupingMode() {
    this.groupingMode = this.groupingMode === 'topic' ? 'date' : 'topic';
    this.reorderInitialized = false;
    if (this.container) {
      this.render(this.container);
    }
  }

  /**
   * Mark a lesson or assessment as complete/incomplete.
   * Updates the in-memory model and persists via local-store.
   *
   * @param {string} id - lesson.id, mini.id, or unitAssessment.id
   * @param {boolean} completed
   */
  markItemComplete(id, completed) {
    // Find and update the item
    let found = false;

    for (const lesson of this.lessons) {
      if (lesson.id === id) {
        lesson.completed = completed;
        found = true;
        break;
      }
    }

    if (!found) {
      for (const mini of this.miniAssessments) {
        if (mini.id === id) {
          mini.completed = completed;
          found = true;
          break;
        }
      }
    }

    if (!found && this.unitAssessment && this.unitAssessment.id === id) {
      this.unitAssessment.majorAssessmentCompleted = completed;
      found = true;
    }

    if (found && this.localStore) {
      this.localStore.setData({ lessons: this.lessons, miniAssessments: this.miniAssessments, unitAssessment: this.unitAssessment });
      this.localStore.saveUnit();
    }

    // Re-render to show completion changes
    if (this.container) {
      this.render(this.container);
    }
  }

  /**
   * Set a lesson or assessment's date.
   * @param {string} id
   * @param {string|null} date - ISO YYYY-MM-DD or null
   */
  setItemDate(id, date) {
    let found = false;

    for (const lesson of this.lessons) {
      if (lesson.id === id) {
        lesson.date = date;
        found = true;
        break;
      }
    }

    if (!found) {
      for (const mini of this.miniAssessments) {
        if (mini.id === id) {
          mini.date = date;
          found = true;
          break;
        }
      }
    }

    if (!found && this.unitAssessment && this.unitAssessment.id === id) {
      this.unitAssessment.majorAssessmentDate = date;
      found = true;
    }

    if (found && this.localStore) {
      this.localStore.setData({ lessons: this.lessons, miniAssessments: this.miniAssessments, unitAssessment: this.unitAssessment });
      this.localStore.saveUnit();
    }

    // Re-render to show date changes
    if (this.container) {
      this.render(this.container);
    }
  }

  /**
   * Set a lesson or assessment's period.
   * @param {string} id
   * @param {string|null} period - Freeform text or null
   */
  setItemPeriod(id, period) {
    let found = false;

    for (const lesson of this.lessons) {
      if (lesson.id === id) {
        lesson.lessonPeriod = period;
        found = true;
        break;
      }
    }

    if (!found) {
      for (const mini of this.miniAssessments) {
        if (mini.id === id) {
          mini.lessonPeriod = period;
          found = true;
          break;
        }
      }
    }

    if (!found && this.unitAssessment && this.unitAssessment.id === id) {
      this.unitAssessment.majorAssessmentPeriod = period;
      found = true;
    }

    if (found && this.localStore) {
      this.localStore.setData({ lessons: this.lessons, miniAssessments: this.miniAssessments, unitAssessment: this.unitAssessment });
      this.localStore.saveUnit();
    }

    // Re-render to show period changes
    if (this.container) {
      this.render(this.container);
    }
  }

  /**
   * Reorder lessons in Topic mode: renumber all affected lessons.
   * Implements FR-LTB-5 and INV-DM-32.
   *
   * @param {string} lessonId - The lesson being dragged
   * @param {number} newPosition - 0-based index in the display order
   */
  reorderLessonTopicMode(lessonId, newPosition) {
    // Find current position
    const currentPosition = this.lessons.findIndex(l => l.number && l.id === lessonId);
    if (currentPosition < 0) return;

    // Sort by current number to get display order
    const sorted = this.lessons.slice().sort((a, b) => (a.number || 0) - (b.number || 0));
    const draggedIndex = sorted.findIndex(l => l.id === lessonId);
    if (draggedIndex < 0) return;

    // Renumber
    this.lessons = renumberLessonsAfterReorder(this.lessons, draggedIndex, newPosition);

    // Persist
    if (this.localStore) {
      this.localStore.setData({ lessons: this.lessons, miniAssessments: this.miniAssessments, unitAssessment: this.unitAssessment });
      this.localStore.saveUnit();
    }

    // Re-render
    if (this.container) {
      this.render(this.container);
    }
  }

  /**
   * Update all data references (called when unit data changes externally).
   * @param {Object} updatedData - { lessons, miniAssessments, unitAssessment, ... }
   */
  setData(updatedData) {
    if (updatedData.lessons) this.lessons = updatedData.lessons;
    if (updatedData.miniAssessments) this.miniAssessments = updatedData.miniAssessments;
    if (updatedData.unitAssessment) this.unitAssessment = updatedData.unitAssessment;
    if (updatedData.bigIdeas) this.bigIdeas = updatedData.bigIdeas;
    if (updatedData.topics) this.topics = updatedData.topics;
    if (updatedData.nodes) this.nodes = updatedData.nodes;

    if (this.container) {
      this.render(this.container);
    }
  }

  /**
   * Export Topic-mode view as SVG (for printing). AC-LTB-5.
   *
   * A4 portrait, one page per topic: topic heading (+ status) on a fresh
   * page, its items listed below with the same completion colouring used
   * in the edit view. Multi-page output — pages are joined page-break
   * markup via DocumentShell's A4 conventions.
   *
   * @returns {string} SVG markup (one <svg class="document-page"> per topic)
   */
  exportTopicModeSVG() {
    const itemsByTopic = groupItemsByTopic(this.lessons, this.miniAssessments, this.unitAssessment, this.bigIdeas);
    const pages = [];

    for (const topic of this.topics) {
      if (!topic.id) continue;

      const svg = this._createExportPage();
      const status = computeTopicStatus(topic.id, this.lessons, this.miniAssessments, this.unitAssessment, this.bigIdeas);

      let y = 20;
      this._svgText(svg, 10, y, topic.title || '', 'topic-heading text-lg text-bold');
      this._svgText(svg, 150, y, status, `status-badge status-${status.replace(/\s+/g, '-')}`);
      y += 12;

      const items = itemsByTopic[topic.id] || [];
      for (const item of items) {
        y = this._renderExportItemRow(svg, y, item, false);
      }

      pages.push(svg);
    }

    return this._serializeExportPages(pages);
  }

  /**
   * Export Date-mode view as SVG (for printing). AC-LTB-6.
   *
   * A4 portrait, one page per date group (sorted ascending) plus a
   * trailing "Unscheduled" page, in the same order as the edit view.
   * Each page carries the date heading and its items, each row also
   * showing the item's topic label (as in the edit view's Date mode).
   *
   * @returns {string} SVG markup (one <svg class="document-page"> per date group)
   */
  exportDateModeSVG() {
    const allItems = this._collectDateModeItems();

    const dateGroups = {};
    const unscheduled = [];
    for (const item of allItems) {
      if (item.date) {
        if (!dateGroups[item.date]) dateGroups[item.date] = [];
        dateGroups[item.date].push(item);
      } else {
        unscheduled.push(item);
      }
    }

    const sortedDates = Object.keys(dateGroups).sort();
    const pages = [];

    for (const date of sortedDates) {
      const svg = this._createExportPage();
      let y = 20;
      this._svgText(svg, 10, y, date, 'date-heading text-lg text-bold');
      y += 12;
      for (const item of dateGroups[date]) {
        y = this._renderExportItemRow(svg, y, item, true);
      }
      pages.push(svg);
    }

    if (unscheduled.length > 0) {
      const svg = this._createExportPage();
      let y = 20;
      this._svgText(svg, 10, y, 'Unscheduled', 'unscheduled-heading text-lg text-bold');
      y += 12;
      for (const item of unscheduled) {
        y = this._renderExportItemRow(svg, y, item, true);
      }
      pages.push(svg);
    }

    return this._serializeExportPages(pages);
  }

  /**
   * Build the flat, topic-annotated item list used by Date mode — same
   * shape and resolution rule (FR-BIB-17 via resolveTopic) as
   * lessons-and-topics-renderer.js's renderDateMode, so print and edit
   * views never disagree on grouping.
   */
  _collectDateModeItems() {
    const allItems = [];

    for (const lesson of this.lessons) {
      const topicId = resolveTopic(lesson.id, this.lessons, this.bigIdeas);
      const topic = this.topics.find(t => t.id === topicId);
      allItems.push({
        ...lesson,
        type: 'lesson',
        topicId,
        topicTitle: topic?.title || 'Unassigned',
        date: lesson.date || null,
      });
    }

    for (const mini of this.miniAssessments) {
      const topicId = resolveTopic(mini.id, this.miniAssessments, this.bigIdeas);
      const topic = this.topics.find(t => t.id === topicId);
      allItems.push({
        ...mini,
        type: 'mini',
        topicId,
        topicTitle: topic?.title || 'Unassigned',
        date: mini.date || null,
      });
    }

    if (this.unitAssessment && this.unitAssessment.id) {
      const topicId = resolveTopic(this.unitAssessment.id, [this.unitAssessment], this.bigIdeas);
      const topic = this.topics.find(t => t.id === topicId);
      allItems.push({
        ...this.unitAssessment,
        type: 'major',
        topicId,
        topicTitle: topic?.title || 'Unassigned',
        date: this.unitAssessment.majorAssessmentDate || null,
      });
    }

    return allItems;
  }

  /**
   * Render one item row (tag + label [+ topic label] [+ date/period pills])
   * into a print page, using the same completion tint token as the edit
   * view's row background (`--color-row-tint-completion`).
   *
   * @returns {number} next y position (mm)
   */
  _renderExportItemRow(svg, y, item, withTopicLabel) {
    const completed = item.type === 'major' ? !!item.majorAssessmentCompleted : !!item.completed;

    if (completed) {
      const rect = document.createElementNS(SVG_NS, 'rect');
      rect.setAttribute('x', '10');
      rect.setAttribute('y', String(y - 4));
      rect.setAttribute('width', '190');
      rect.setAttribute('height', '6');
      rect.setAttribute('fill', 'var(--color-row-tint-completion)');
      rect.setAttribute('class', 'row-tint-completion');
      svg.appendChild(rect);
    }

    let tag;
    if (item.type === 'lesson') tag = `L${item.number || '?'}`;
    else if (item.type === 'mini') tag = 'MINI';
    else tag = 'MAJOR';
    this._svgText(svg, 12, y, tag, 'item-tag');

    const bigIdea = item.bigIdeaId ? this.bigIdeas.find(bi => bi.id === item.bigIdeaId) : null;
    const label = item.type === 'lesson' ? (bigIdea?.title || 'Big Idea') : (item.name || 'Assessment');
    this._svgText(svg, 28, y, label, 'item-label');

    let x = 110;
    if (withTopicLabel) {
      this._svgText(svg, x, y, `[${item.topicTitle}]`, 'topic-label text-secondary');
      x += 40;
    }

    const period = item.type === 'major' ? item.majorAssessmentPeriod : item.lessonPeriod;
    const date = item.type === 'major' ? item.majorAssessmentDate : item.date;
    if (!withTopicLabel && date) {
      this._svgText(svg, x, y, date, 'date-pill');
      x += 20;
    }
    if (period) {
      this._svgText(svg, x, y, period, 'period-pill');
    }

    return y + 7;
  }

  /** Create one A4-portrait print page (SVG root), matching document-shell's geometry. */
  _createExportPage() {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', PAGE_VIEWBOX);
    svg.setAttribute('width', '210mm');
    svg.setAttribute('height', '297mm');
    svg.setAttribute('xmlns', SVG_NS);
    svg.setAttribute('class', 'document-page');
    return svg;
  }

  /** Append a <text> node — never innerHTML, textContent only. */
  _svgText(svg, x, y, text, className) {
    const t = document.createElementNS(SVG_NS, 'text');
    t.setAttribute('x', String(x));
    t.setAttribute('y', String(y));
    if (className) t.setAttribute('class', className);
    t.textContent = String(text == null ? '' : text);
    svg.appendChild(t);
    return t;
  }

  /** Serialize a list of page SVG elements into joined markup, page breaks between topics/dates. */
  _serializeExportPages(pages) {
    if (pages.length === 0) return '<svg class="document-page" viewBox="' + PAGE_VIEWBOX + '"></svg>';
    if (typeof XMLSerializer !== 'undefined') {
      const serializer = new XMLSerializer();
      return pages.map(svg => serializer.serializeToString(svg)).join('\n\n');
    }
    // Fallback for environments without XMLSerializer (mirrors document-shell's DOM output shape).
    return pages.map(svg => svg.outerHTML).join('\n\n');
  }
}
