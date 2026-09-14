/**
 * app.js — minimal click-only vanilla JS for LukeatronWiki
 * Per render.spec.md AD-1: "a small click-only JS layer posts to the server
 * and reloads — no client-side state computation."
 *
 * Scope:
 * - Theme toggle: flip data-theme on <html>, persist in localStorage
 * - Print button: window.print()
 * - UI preferences in localStorage (open rail sections, filter text)
 * - Submit forms as real POSTs (prefer <form method="post">)
 * - Guard all localStorage access in try/catch
 *
 * NO fetch of any remote URL, NO client-side slot state, NO framework.
 */

// ── theme toggle ──────────────────────────────────────────────────────
function initTheme() {
  const themeToggle = document.querySelector('.btn-theme-toggle');
  if (!themeToggle) return;

  // Read stored theme, default to system preference
  let storedTheme = null;
  try {
    storedTheme = localStorage.getItem('lukeatronwiki-theme');
  } catch (e) {
    // localStorage unavailable, silent
  }

  if (storedTheme) {
    document.documentElement.setAttribute('data-theme', storedTheme);
  }

  // Toggle button
  themeToggle.addEventListener('click', function (e) {
    e.preventDefault();
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);

    try {
      localStorage.setItem('lukeatronwiki-theme', newTheme);
    } catch (e) {
      // localStorage unavailable, silent
    }
  });
}

// ── print button ──────────────────────────────────────────────────────
function initPrint() {
  const printBtn = document.querySelector('.btn-print');
  if (!printBtn) return;

  printBtn.addEventListener('click', function (e) {
    e.preventDefault();
    window.print();
  });
}

// ── rail sections collapse/expand ──────────────────────────────────────
function initRailSections() {
  const railSections = document.querySelectorAll('.rail-section');
  railSections.forEach(function (section) {
    const title = section.querySelector('.rail-section-title');
    if (!title) return;

    const sectionId = section.id || section.className.replace(/rail-section/g, '').trim();

    // Read stored state
    let isOpen = true; // default open
    try {
      const stored = localStorage.getItem('lukeatronwiki-rail-' + sectionId);
      if (stored === 'closed') {
        isOpen = false;
      }
    } catch (e) {
      // localStorage unavailable, silent
    }

    // Apply stored state
    updateSectionVisibility(section, isOpen);

    // Toggle on click
    title.addEventListener('click', function (e) {
      e.preventDefault();
      const items = section.querySelector('.rail-items');
      if (!items) return;

      isOpen = !isOpen;
      updateSectionVisibility(section, isOpen);

      try {
        localStorage.setItem(
          'lukeatronwiki-rail-' + sectionId,
          isOpen ? 'open' : 'closed'
        );
      } catch (e) {
        // localStorage unavailable, silent
      }
    });
  });
}

function updateSectionVisibility(section, isOpen) {
  const items = section.querySelector('.rail-items');
  const title = section.querySelector('.rail-section-title');
  if (!items || !title) return;

  items.style.display = isOpen ? 'block' : 'none';
  title.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
}

// ── store filter (client-side filtering of store nav list) ──────────────
function initStoreFilter() {
  const storesSection = document.querySelector('#stores');
  if (!storesSection) return;

  const filterInput = storesSection.querySelector('.rail-filter input');
  const storesList = storesSection.querySelector('.rail-items');

  if (!filterInput || !storesList) return;

  // Restore filter text from localStorage
  let filterText = '';
  try {
    filterText = localStorage.getItem('lukeatronwiki-store-filter') || '';
  } catch (e) {
    // localStorage unavailable
  }

  if (filterText) {
    filterInput.value = filterText;
    applyStoreFilter(storesList, filterText);
  }

  // Update filter on input
  filterInput.addEventListener('input', function (e) {
    const text = e.target.value.toLowerCase();
    try {
      localStorage.setItem('lukeatronwiki-store-filter', text);
    } catch (e) {
      // localStorage unavailable
    }
    applyStoreFilter(storesList, text);
  });
}

function applyStoreFilter(storesList, filterText) {
  const items = storesList.querySelectorAll('li');

  items.forEach(function (item) {
    const text = item.textContent.toLowerCase();
    const visible = filterText === '' || text.includes(filterText);
    item.style.display = visible ? '' : 'none';
  });
}

// ── form submission (POST via standard <form>, JS only adds aria) ───────
function initForms() {
  const forms = document.querySelectorAll('form[method="post"]');
  forms.forEach(function (form) {
    // Standard form submission; no JS needed unless form has class .ajax
    // which is NOT used here per spec.
    form.addEventListener('submit', function (e) {
      // Let the form POST naturally; this is just for any future enhancements
      // We do NOT prevent the default or use fetch.
    });
  });
}

// ── slot accept/reject buttons ─────────────────────────────────────────
function initSlotActions() {
  const acceptBtns = document.querySelectorAll('.slot-draft-actions button.accept');
  const rejectBtns = document.querySelectorAll('.slot-draft-actions button.reject');

  acceptBtns.forEach(function (btn) {
    // Form submission handled by <form method="post">
    // Button is inside the form, natural POST on click
  });

  rejectBtns.forEach(function (btn) {
    // Form submission handled by <form method="post">
    // Button is inside the form, natural POST on click
  });
}

// ── capture form ───────────────────────────────────────────────────────
function initCaptureForm() {
  const captureForm = document.querySelector('.capture-form');
  if (!captureForm) return;

  // The form itself is a standard POST form.
  // No client-side validation or computation needed per spec.
  // Server returns 303 redirect, page reloads with new queue row.
}

// ── init all ───────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
  initTheme();
  initPrint();
  initRailSections();
  initStoreFilter();
  initForms();
  initSlotActions();
  initCaptureForm();
});
