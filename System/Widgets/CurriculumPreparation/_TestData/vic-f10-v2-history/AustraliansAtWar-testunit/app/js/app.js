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
import { CribSheet } from './crib-sheet.js';
import { ResourcesPage } from './resources-page.js';
import { getBigIdeas, initBigIdeasModule } from './bigidea-list.js';

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

  buildNav();
  const firstPart = PARTS[0].id;
  mountPart(firstPart);
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
  // The next mount (or onUnitLoaded) replaces #app-content; nothing to
  // clean up eagerly here.
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

  const grid = new CoverageGrid(unit, localStore);
  grid.render();
}

function mountLessonsAndTopics(main, unit) {
  ensureSingleH1(main, 'Lessons & Topics');

  const container = document.createElement('div');
  main.appendChild(container);

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
  main.appendChild(pagesHost);

  showLesson(lessons[0]);
}

function mountUnitAssessment(main, unit) {
  ensureSingleH1(main, 'Unit Assessment');

  const unitAssessment = unit.unitAssessment || { finalAssessment: null, miniAssessments: [] };
  const lessons = unit.lessons || [];
  const bigIdeas = unit.bigIdeas || [];
  const nodes = unit.nodes || [];

  const pagesHost = document.createElement('div');
  pagesHost.className = 'unit-assessment-pages';
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
  main.appendChild(grid);
}

function mountCribSheet(main, unit) {
  ensureSingleH1(main, 'Crib Sheet');

  const cribSheet = new CribSheet(unit, localStore);
  cribSheet.generate(getBigIdeas());
  const shell = cribSheet.render();

  const container = document.createElement('div');
  main.appendChild(container);
  adoptShellPages(shell, container);
}

function mountResources(main, unit) {
  ensureSingleH1(main, 'Resources Page');

  const resourcesPage = new ResourcesPage(localStore, unit);
  const shell = resourcesPage.render();

  const container = document.createElement('div');
  main.appendChild(container);
  adoptShellPages(shell, container);
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
