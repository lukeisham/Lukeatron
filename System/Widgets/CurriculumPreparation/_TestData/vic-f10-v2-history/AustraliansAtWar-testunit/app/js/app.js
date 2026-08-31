// app.js — Bootstrap: loads the unit, builds nav, mounts the selected part
// into #app-content. This is the top-level composition script that wires
// the independently-built part modules together (none of them do this
// themselves — see _closeout/REVIEW-A.md).
//
// Vanilla ES modules only (JS-7). No innerHTML with store text (JS-6).
// Never call fetch() directly — all disk access goes through LocalStore.

import { LocalStore, ServerClient } from './local-store.js';
import { DocumentShell } from './document-shell.js';
import { ArborTree } from './arbor-tree.js';
import CoverageGrid from './coverage-grid.js';
import { LessonsAndTopicsView } from './lessons-and-topics.js';
import { renderLessonPlan } from './lesson-plan-document.js';
import { UnitAssessmentDocument } from './unit-assessment-document.js';
import MarkingMatrix from './marking-matrix.js';
import { openPopulateFromCurriculumModal } from './marking-matrix-populate.js';
import { CribSheet } from './crib-sheet.js';
import { ResourcesPage } from './resources-page.js';
import { getBigIdeas, initBigIdeasModule, addBigIdea } from './bigidea-list.js';
import { openLessonGenerator } from './lesson-plan-generator.js';
import { renderMiniAssessmentManager } from './mini-assessment-manager.js';
import { mountToolbar, extractSurfaceText } from './toolbar-actions.js';

/**
 * Parts shown in the nav. Each entry names the #app-nav label and the
 * mount function that draws into #app-content.
 */
const PARTS = [
  { id: 'curriculum-map', label: 'Curriculum Map', mount: mountCurriculumMap },
  { id: 'coverage-grid', label: 'Coverage Grid', mount: mountCoverageGrid },
  { id: 'lessons-topics', label: 'Lessons & Topics', mount: mountLessonsAndTopics },
  { id: 'lesson-plans', label: 'Lesson Plans', mount: mountLessonPlans },
  { id: 'unit-assessment', label: 'Unit Assessment', mount: mountUnitAssessment },
  { id: 'marking-matrix', label: 'Marking Matrix', mount: mountMarkingMatrix },
  { id: 'crib-sheet', label: 'Crib Sheet', mount: mountCribSheet },
  { id: 'resources', label: 'Resources Page', mount: mountResources }
];

let localStore = null;
let currentPartId = null;

// ===== Boot =====

async function boot() {
  const port = window.location.port || 8800;
  const serverClient = new ServerClient(port, {
    onLoading: showLoading,
    onLoadingDone: hideLoading,
    onError: showError,
    onUnitLoaded: onUnitLoaded
  });
  localStore = new LocalStore(serverClient, {
    onLoading: showLoading,
    onLoadingDone: hideLoading,
    onError: showError,
    onUnitLoaded: onUnitLoaded
  });

  try {
    await localStore.loadUnit();
  } catch (err) {
    // onError callback already rendered the error state; nothing further
    // to do here except stop the boot sequence (JS-5: no silent failure).
    console.error('Boot: unit failed to load', err);
    return;
  }
}

function onUnitLoaded(unit) {
  // Wire the bigidea-list hub before anything reads getBigIdeas()/coverage
  // helpers (bigidea-list is the sole owner of coverage[] writes).
  initBigIdeasModule(localStore, unit);

  setDocumentTitle(unit);
  buildNav();
  const firstPart = PARTS[0].id;
  mountPart(firstPart);
}

/**
 * Show the unit's real name instead of the hardcoded placeholder that
 * previously sat in index.html. meta.unitName was, until now, read only by
 * marking-matrix.js and the CSV filename slug, so every other page showed
 * "Curriculum Unit" regardless of the loaded unit. Falls back sensibly when
 * unitName is blank; subject/level are appended as a subtitle when present.
 */
function setDocumentTitle(unit) {
  const h1 = document.getElementById('app-title');
  const meta = unit.meta || {};
  const name = (meta.unitName || '').trim() || 'Curriculum Unit';

  const subtitleParts = [meta.subject, meta.level].filter((v) => v && String(v).trim());
  const subtitle = subtitleParts.join(' — '); // em dash

  document.title = subtitle ? `${name} — ${subtitle}` : name;

  if (!h1) return;
  h1.textContent = '';
  h1.appendChild(document.createTextNode(name));
  if (subtitle) {
    const sub = document.createElement('span');
    sub.className = 'app-title-subtitle';
    sub.textContent = ` — ${subtitle}`; // em dash, matching document.title's separator
    h1.appendChild(sub);
  }
}

// ===== Loading / error states (JS-5) =====

function showLoading(message) {
  const main = document.getElementById('app-content');
  if (!main) return;
  main.textContent = '';
  const p = document.createElement('p');
  p.className = 'app-status app-status-loading';
  p.setAttribute('role', 'status');
  p.textContent = message || 'Loading…';
  main.appendChild(p);
}

function hideLoading() {
  // Boot's initial load falls through to onUnitLoaded()'s own mount, so
  // this is a no-op there (currentPartId is still null). But a debounced
  // background autosave — triggered by any CRUD action, e.g. the Big Idea
  // toolbar — calls showLoading()/hideLoading() too, and showLoading()
  // wipes #app-content. Without this, the view is left stuck on "Saving…"
  // forever once a part is already mounted.
  if (currentPartId) {
    mountPart(currentPartId);
  }
}

function showError(message) {
  const main = document.getElementById('app-content');
  if (!main) return;
  main.textContent = '';
  const wrap = document.createElement('div');
  wrap.className = 'app-status app-status-error';
  wrap.setAttribute('role', 'alert');

  const h2 = document.createElement('h2');
  h2.textContent = 'Could not load this unit';
  wrap.appendChild(h2);

  const p = document.createElement('p');
  p.textContent = String(message || 'Unknown error.');
  wrap.appendChild(p);

  const hint = document.createElement('p');
  hint.className = 'app-status-hint';
  hint.textContent = 'Check that the bundle server (serve.py) is still running, then reload this page.';
  wrap.appendChild(hint);

  main.appendChild(wrap);
}

// ===== Navigation =====

function buildNav() {
  const nav = document.getElementById('app-nav');
  if (!nav) return;
  nav.textContent = '';

  const list = document.createElement('ul');
  list.className = 'app-nav-list';

  for (const part of PARTS) {
    const li = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'app-nav-button';
    button.textContent = part.label;
    button.dataset.partId = part.id;
    button.setAttribute('aria-current', 'false');
    button.addEventListener('click', () => mountPart(part.id));
    li.appendChild(button);
    list.appendChild(li);
  }

  nav.appendChild(list);
}

function markActiveNav(partId) {
  const nav = document.getElementById('app-nav');
  if (!nav) return;
  const buttons = nav.querySelectorAll('.app-nav-button');
  buttons.forEach((btn) => {
    const isActive = btn.dataset.partId === partId;
    btn.setAttribute('aria-current', isActive ? 'true' : 'false');
    btn.classList.toggle('is-active', isActive);
  });
}

function mountPart(partId) {
  const part = PARTS.find((p) => p.id === partId);
  if (!part) return;
  currentPartId = partId;
  markActiveNav(partId);

  const main = document.getElementById('app-content');
  if (!main) return;
  main.textContent = '';

  const unit = localStore.unit;
  if (!unit) {
    showError('No unit is loaded.');
    return;
  }

  try {
    part.mount(main, unit);
  } catch (err) {
    console.error(`Mount failed for part "${partId}":`, err);
    const p = document.createElement('p');
    p.className = 'app-status app-status-error';
    p.setAttribute('role', 'alert');
    p.textContent = `This section could not be displayed: ${err.message}`;
    main.appendChild(p);
  }
}

// ===== Helpers =====

/**
 * Move every SVG page a DocumentShell rendered (it appends them to
 * document.body per its own contract) into our part container instead,
 * so the printable pages sit inside #app-content rather than trailing
 * off the end of <body>.
 */
function adoptShellPages(shell, container) {
  if (!shell || !Array.isArray(shell.svgPages)) return;
  for (const svg of shell.svgPages) {
    container.appendChild(svg);
  }
}

// ===== Part mounts =====

function mountCurriculumMap(main, unit) {
  const h1check = ensureSingleH1(main, 'Curriculum Map');

  const section = document.createElement('section');
  section.setAttribute('aria-label', 'Curriculum map');
  main.appendChild(section);

  main.insertBefore(
    mountToolbar({ label: 'Curriculum Map', getText: () => extractSurfaceText(section) }),
    section
  );

  const arborTree = new ArborTree(localStore);
  // ArborTree.init() is async; render what we can once it resolves.
  arborTree.init().then(() => {
    if (arborTree.documentShell) {
      adoptShellPages(arborTree.documentShell, section);
    }
    if (!section.hasChildNodes()) {
      const p = document.createElement('p');
      p.className = 'app-status';
      p.textContent = 'The curriculum map has no content to display yet.';
      section.appendChild(p);
    }
  }).catch((err) => {
    console.error('ArborTree init failed:', err);
    const p = document.createElement('p');
    p.className = 'app-status app-status-error';
    p.textContent = `Curriculum map could not render: ${err.message}`;
    section.appendChild(p);
  });
}

function mountCoverageGrid(main, unit) {
  ensureSingleH1(main, 'Coverage Grid');

  // coverage-grid.js hard-codes this container id (CoverageGrid.render()).
  const container = document.createElement('div');
  container.id = 'coverage-grid-container';
  main.appendChild(container);

  main.insertBefore(
    mountToolbar({ label: 'Coverage Grid', getText: () => extractSurfaceText(container) }),
    container
  );

  const grid = new CoverageGrid(unit, localStore);
  grid.render();
}

function mountLessonsAndTopics(main, unit) {
  ensureSingleH1(main, 'Lessons & Topics');

  main.appendChild(buildBigIdeaAndLessonToolbar(unit));

  const container = document.createElement('div');
  main.appendChild(container);

  main.insertBefore(
    mountToolbar({ label: 'Lessons & Topics', getText: () => extractSurfaceText(container) }),
    container
  );

  const view = new LessonsAndTopicsView(
    unit.lessons || [],
    (unit.unitAssessment && unit.unitAssessment.miniAssessments) || [],
    unit.unitAssessment || {},
    unit.bigIdeas || [],
    unit.topics || [],
    unit.nodes || [],
    'topic',
    localStore
  );
  view.render(container);
}

function mountLessonPlans(main, unit) {
  ensureSingleH1(main, 'Lesson Plans');

  const lessons = unit.lessons || [];
  if (lessons.length === 0) {
    const p = document.createElement('p');
    p.className = 'app-status';
    p.textContent = 'No lessons exist in this unit yet.';
    main.appendChild(p);
    return;
  }

  const picker = document.createElement('div');
  picker.className = 'lesson-picker';
  const label = document.createElement('span');
  label.textContent = 'Jump to lesson: ';
  picker.appendChild(label);

  const pagesHost = document.createElement('div');
  pagesHost.className = 'lesson-plan-pages';

  function showLesson(lesson) {
    pagesHost.textContent = '';
    const { pages, renderFn } = renderLessonPlan(
      lesson,
      lessons,
      unit.bigIdeas || [],
      unit.topics || [],
      unit.nodes || [],
      unit.unitAssessment || {}
    );
    const shell = new DocumentShell({ pages }, renderFn, 'portrait');
    adoptShellPages(shell, pagesHost);
  }

  lessons.forEach((lesson, index) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'app-nav-button';
    btn.textContent = `Lesson ${lesson.number != null ? lesson.number : index + 1}`;
    btn.addEventListener('click', () => showLesson(lesson));
    picker.appendChild(btn);
  });

  main.appendChild(picker);
  main.appendChild(
    mountToolbar({ label: 'Lesson Plan', getText: () => extractSurfaceText(pagesHost) })
  );
  main.appendChild(pagesHost);

  showLesson(lessons[0]);
}

function mountUnitAssessment(main, unit) {
  ensureSingleH1(main, 'Unit Assessment');

  const unitAssessment = unit.unitAssessment || { finalAssessment: null, miniAssessments: [] };
  const lessons = unit.lessons || [];
  const bigIdeas = unit.bigIdeas || [];
  const nodes = unit.nodes || [];

  const manager = renderMiniAssessmentManager(unitAssessment, lessons, bigIdeas, (updated) => {
    localStore.setData({ unitAssessment: updated });
    mountPart(currentPartId);
  });
  main.appendChild(manager);

  const pagesHost = document.createElement('div');
  pagesHost.className = 'unit-assessment-pages';
  main.appendChild(
    mountToolbar({ label: 'Unit Assessment', getText: () => extractSurfaceText(pagesHost) })
  );
  main.appendChild(pagesHost);

  function renderOnePage(mode, miniIndex) {
    const doc = new UnitAssessmentDocument(unitAssessment, lessons, bigIdeas, nodes, mode, miniIndex);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 210 297');
    svg.setAttribute('width', '210mm');
    svg.setAttribute('height', '297mm');
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svg.classList.add('document-page');
    doc.render(svg);
    pagesHost.appendChild(svg);
  }

  if (unitAssessment.finalAssessment) {
    renderOnePage('final', 0);
  }
  const minis = unitAssessment.miniAssessments || [];
  minis.forEach((_, i) => renderOnePage('mini', i));

  if (!unitAssessment.finalAssessment && minis.length === 0) {
    const p = document.createElement('p');
    p.className = 'app-status';
    p.textContent = 'No assessments exist in this unit yet.';
    pagesHost.appendChild(p);
  }
}

function mountMarkingMatrix(main, unit) {
  ensureSingleH1(main, 'Marking Matrix');

  const matrix = new MarkingMatrix(unit, localStore);
  const grid = matrix.renderClassGrid();

  main.appendChild(
    mountToolbar({
      label: 'Marking Matrix',
      getText: () => extractSurfaceText(grid),
      getCSVSource: () => ({ unit, markingMatrix: matrix })
    })
  );
  main.appendChild(buildPopulateFromCurriculumButton(matrix));
  main.appendChild(grid);
}

/**
 * "+ Populate from Curriculum" control (criteria-populate-the-marking-matrix
 * feature): lets a teacher choose curriculum outcomes and add them as rubric
 * rows, instead of retyping curriculum criteria into the matrix by hand.
 * Same "re-mount after mutation" pattern as buildBigIdeaAndLessonToolbar.
 * @param {MarkingMatrix} matrix
 * @returns {HTMLElement}
 */
function buildPopulateFromCurriculumButton(matrix) {
  const wrap = document.createElement('div');
  wrap.className = 'app-bigidea-toolbar';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'app-toolbar-button';
  btn.textContent = '+ Populate from Curriculum';
  btn.addEventListener('click', async () => {
    const result = await openPopulateFromCurriculumModal(matrix);
    if (result) {
      mountPart(currentPartId);
    }
  });
  wrap.appendChild(btn);

  return wrap;
}

function mountCribSheet(main, unit) {
  ensureSingleH1(main, 'Crib Sheet');

  const cribSheet = new CribSheet(unit, localStore);
  cribSheet.generate(getBigIdeas());
  const shell = cribSheet.render();

  const container = document.createElement('div');
  main.appendChild(
    mountToolbar({ label: 'Crib Sheet', getText: () => extractSurfaceText(container) })
  );
  main.appendChild(container);
  adoptShellPages(shell, container);
}

function mountResources(main, unit) {
  ensureSingleH1(main, 'Resources Page');

  const resourcesPage = new ResourcesPage(localStore, unit);
  const shell = resourcesPage.render();

  const container = document.createElement('div');
  main.appendChild(
    mountToolbar({ label: 'Resources Page', getText: () => extractSurfaceText(container) })
  );
  main.appendChild(container);
  adoptShellPages(shell, container);
}

/**
 * Big Idea creation and lesson generation both have working, unit-tested
 * modules (bigidea-list.js, lesson-plan-generator.js) that were never
 * mounted anywhere — this toolbar is their entry point. addBigIdea() and
 * openLessonGenerator() mutate/save independently of each other, so every
 * action here re-mounts the current part rather than patching the DOM.
 */
function buildBigIdeaAndLessonToolbar(unit) {
  const toolbar = document.createElement('div');
  toolbar.className = 'app-bigidea-toolbar';

  const heading = document.createElement('h3');
  heading.textContent = 'Big Ideas';
  toolbar.appendChild(heading);

  const topicList = document.createElement('ul');
  topicList.className = 'app-bigidea-topic-list';

  for (const topic of unit.topics || []) {
    const li = document.createElement('li');

    const topicLabel = document.createElement('strong');
    topicLabel.textContent = topic.title;
    li.appendChild(topicLabel);

    const ideasForTopic = (unit.bigIdeas || []).filter((bi) => bi.topicId === topic.id);
    if (ideasForTopic.length > 0) {
      const ideaNames = document.createElement('span');
      ideaNames.className = 'app-bigidea-names';
      ideaNames.textContent = ` — ${ideasForTopic.map((bi) => bi.title).join(', ')}`;
      li.appendChild(ideaNames);
    }

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'app-toolbar-button';
    addBtn.textContent = '+ Add Big Idea';
    addBtn.addEventListener('click', async () => {
      const title = await openTextPrompt(`New big idea for "${topic.title}"`);
      if (!title) return;
      addBigIdea(title, topic.id);
      mountPart(currentPartId);
    });
    li.appendChild(addBtn);

    topicList.appendChild(li);
  }
  toolbar.appendChild(topicList);

  const generateBtn = document.createElement('button');
  generateBtn.type = 'button';
  generateBtn.className = 'app-toolbar-button';
  generateBtn.textContent = '+ Generate Lesson';
  generateBtn.addEventListener('click', async () => {
    await openLessonGenerator(
      localStore,
      unit.lessons || [],
      unit.nodes || [],
      unit.bigIdeas || [],
      null,
      () => mountPart(currentPartId)
    );
  });
  toolbar.appendChild(generateBtn);

  return toolbar;
}

/**
 * A single-field text modal. window.prompt() is unusable here — it blocks
 * the tab entirely, which any UI-driving test harness (and some browser
 * automation) can't dismiss. Built on the same overlay/content classes as
 * node-picker.js so it needs no CSS of its own. Built via createElement,
 * not innerHTML, since the label carries store text (JS-6).
 *
 * @param {string} labelText
 * @returns {Promise<string|null>} Trimmed input on confirm, null on cancel
 */
function openTextPrompt(labelText) {
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

/**
 * Every mounted part gets exactly one <h1> (HTML-3). The document's own
 * <h1> ("Curriculum Unit") stays as the app title; each part heading is
 * an <h2> instead so the page never carries two <h1>s at once.
 */
function ensureSingleH1(main, partLabel) {
  const h2 = document.createElement('h2');
  h2.textContent = partLabel;
  main.appendChild(h2);
  return h2;
}

// Exported for smoke tests (TEST-8: hand-built fake DOM, no jsdom). Boot itself
// only auto-runs in a real browser — importing this module under node:test
// must not immediately try to fetch() or touch `window`.
export { adoptShellPages, ensureSingleH1, buildNav, markActiveNav, PARTS };

if (typeof window !== 'undefined') {
  boot();
}
