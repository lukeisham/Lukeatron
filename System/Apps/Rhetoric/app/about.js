/** Print and Copy on the About page — the whole page, or only the section chosen in the picker. The jump links, back link and buttons are never part of either. */

const root = document.querySelector('.about');
const sections = [...root.querySelectorAll('section')];
const picker = document.getElementById('about-part');
const status = document.getElementById('about-status');

for (const section of sections) {
  const option = document.createElement('option');
  option.value = section.id;
  option.textContent = section.querySelector('h2').textContent;
  picker.appendChild(option);
}

const chosen = () => sections.find((section) => section.id === picker.value) ?? null;
const tidy = (node) => node.textContent.replace(/\s+/g, ' ').trim();

/** The page as text. `numbered` heading text mirrors the CSS counters: "2. Title", "2.1 Title". */
function blockToText(block, lines) {
  const tag = block.tagName;
  if (tag === 'UL' || tag === 'OL') {
    [...block.children].forEach((item, index) => lines.push(`${tag === 'OL' ? `${index + 1}.` : '•'} ${tidy(item)}`));
  } else if (tag === 'TABLE') {
    if (block.caption) lines.push(tidy(block.caption));
    for (const row of block.rows) lines.push([...row.cells].map(tidy).join(' | '));
  } else if (tag === 'DL') {
    [...block.children].filter((child) => child.tagName === 'DT').forEach((term) => lines.push(`${tidy(term)}: ${tidy(term.nextElementSibling)}`));
  } else if (tag !== 'NAV') {
    lines.push(tidy(block));
  }
}

function sectionToText(section, number) {
  const lines = [];
  let sub = 0;
  for (const child of section.children) {
    if (child.tagName === 'H2') lines.push(`${number}. ${tidy(child)}`);
    else if (child.tagName === 'H3') lines.push('', `${number}.${++sub} ${tidy(child)}`);
    else blockToText(child, lines);
  }
  return lines.join('\n');
}

export function aboutToText(only = null) {
  const parts = [];
  if (!only) {
    const lines = [];
    for (const child of root.querySelector('.intro').children) blockToText(child, lines);
    parts.push(lines.join('\n'));
  }
  sections.forEach((section, index) => {
    if (!only || section === only) parts.push(sectionToText(section, index + 1));
  });
  return parts.join('\n\n');
}

function flash(text) {
  status.textContent = text;
  setTimeout(() => { status.textContent = ''; }, 2000);
}

// beforeprint/afterprint, so the browser's own Print command honours the picker too.
window.addEventListener('beforeprint', () => {
  const section = chosen();
  if (!section) return;
  root.classList.add('part-only');
  section.classList.add('is-part');
  root.style.counterReset = `part ${sections.indexOf(section)}`;
});
window.addEventListener('afterprint', () => {
  root.classList.remove('part-only');
  sections.forEach((section) => section.classList.remove('is-part'));
  root.style.counterReset = '';
});

document.getElementById('about-print').addEventListener('click', () => window.print());
document.getElementById('about-copy').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(aboutToText(chosen()));
    flash('Copied');
  } catch (error) {
    console.warn('copy: clipboard write refused', error);
    flash('Copy failed');
  }
});
