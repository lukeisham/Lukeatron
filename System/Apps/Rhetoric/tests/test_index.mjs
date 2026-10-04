import test from 'node:test';
import assert from 'node:assert/strict';
import { INDEX, createState, setIndexOrder, setSortOrder } from '../app/state.js';
import { renderIndexOrders, renderList } from '../app/render.js';
import { INDEX_ORDERS, creditedName, firstLine, formatDate, sourceHeading, sourceShort } from '../app/quoteindex.js';
import { currentView, viewToText } from '../app/view.js';
import { fakeDoc, findAll, withClass } from './fake-dom.mjs';
import { payload } from './fixture.mjs';

function indexState(order = 'first_line') {
  const state = createState(payload());
  setSortOrder(state, INDEX);
  setIndexOrder(state, order);
  return state;
}

const headings = (state) => currentView(state).items.map((group) => group.heading);
const lines = (state) => currentView(state).items.flatMap((group) => group.entries.map((entry) => entry.firstLine));

test('first line: A to Z by opening words, ignoring quotation marks, with a heading per letter', () => {
  const state = indexState('first_line');
  assert.deepEqual(headings(state), ['A', 'B', 'W']);
  assert.deepEqual(lines(state), ['"All the world\'s a stage"', '"Am I to praise a man who..."', '"Beneath the rule of men entirely great', '"We shall fight on the beaches"']);
});

test('a first line ends at a verse break, or is cut at a word near 72 characters with an ellipsis', () => {
  assert.equal(firstLine('"Beneath the rule of men entirely great / The pen is mightier than the sword."'), '"Beneath the rule of men entirely great');
  assert.equal(firstLine('"All the *world\'s* a stage"'), '"All the world\'s a stage"');
  const long = `"${'word '.repeat(30)}end"`;
  const cut = firstLine(long);
  assert.ok(cut.endsWith('…'));
  assert.ok(cut.length <= 73);
  assert.ok(!cut.slice(0, -1).endsWith(' '));
});

test('source: A to Z by the credited name, with the author written surname first', () => {
  const state = indexState('source');
  assert.deepEqual(headings(state), ['Bulwer-Lytton, Edward', 'Churchill, Winston', 'Rhetorica ad Herennium', 'Shakespeare, William']);
});

test('the short source and the heading are filed by the author, whoever the source line credits', () => {
  const lear = { source: 'Lear, *King Lear*, 3.2', author: 'William Shakespeare' };
  assert.equal(creditedName(lear.source), 'Lear');
  assert.equal(sourceHeading(lear), 'Shakespeare, William');
  assert.equal(sourceShort(lear), 'Shakespeare, King Lear');
  const speech = { source: 'Churchill, House of Commons speech, 4 June 1940', author: 'Winston Churchill' };
  assert.equal(sourceShort(speech), 'Churchill');
  assert.equal(sourceHeading({ source: 'x', author: 'Austin Bradford Hill' }), 'Hill, Austin Bradford');
  assert.equal(sourceHeading({ source: 'x', author: 'Richard Doll and A. Bradford Hill' }), 'Doll, Richard and A. Bradford Hill');
  assert.equal(sourceHeading({ source: 'x', author: 'Alfred, Lord Tennyson' }), 'Tennyson, Alfred, Lord');
  assert.equal(sourceHeading({ source: 'x', author: 'T. S. Eliot' }), 'Eliot, T. S.');
});

test('a long short source is cut with an ellipsis so the first line keeps its room', () => {
  const title = 'Smoking and Health: Report of the Advisory Committee to the Surgeon General of the Public Health Service';
  const short = sourceShort({ source: `*${title}*, 1964`, author: 'Advisory Committee to the Surgeon General' });
  assert.ok(short.length <= 48);
  assert.ok(short.endsWith('…'));
});

test('a single name, a body and an unattributed quote file under the name as written', () => {
  assert.equal(sourceHeading({ source: 'Paul to the council, Acts 23:6, KJV', author: 'Paul' }), 'Paul');
  assert.equal(sourceShort({ source: 'Paul to the council, Acts 23:6, KJV', author: 'Paul' }), 'Paul');
  assert.equal(sourceHeading({ source: '*Smoking and Health*, 1964', author: 'Advisory Committee to the Surgeon General' }), 'Advisory Committee to the Surgeon General');
  assert.equal(sourceHeading({ source: 'x', author: 'The Preacher' }), 'Preacher');
  assert.equal(sourceHeading({ source: 'an unnamed reviewer, *The Quarterly Review*', author: null }), 'An unnamed reviewer');
  assert.equal(sourceShort({ source: '*Rhetorica ad Herennium*, book 4', author: null }), 'Rhetorica ad Herennium');
});

test('date: oldest first under a heading per decade, then "Date unknown", A to Z', () => {
  const state = indexState('date');
  assert.deepEqual(headings(state), ['1830s', '1940s', 'Date unknown']);
  assert.deepEqual(lines(state), ['"Beneath the rule of men entirely great', '"We shall fight on the beaches"', '"All the world\'s a stage"', '"Am I to praise a man who..."']);
});

test('a full date reads in words and a year alone stays a year', () => {
  assert.equal(formatDate('1940-06-04'), '4 June 1940');
  assert.equal(formatDate('1839'), '1839');
  assert.equal(formatDate(null), '');
});

test('an entry carries its first line, short source, year and device', () => {
  const [group] = currentView(indexState('date')).items;
  const [entry] = group.entries;
  assert.equal(entry.sourceShort, 'Bulwer-Lytton, Richelieu');
  assert.equal(entry.year, '1839');
  assert.equal(entry.device.name, 'Metaphor');
});

test('search narrows the quotes by their words, their source or their device', () => {
  const state = indexState();
  state.query = 'churchill';
  assert.equal(lines(state).length, 1);
  state.query = 'anaphora';
  assert.equal(lines(state).length, 2);
  state.query = 'sword';
  assert.deepEqual(lines(state), ['"Beneath the rule of men entirely great']);
  state.query = 'zzz';
  const container = fakeDoc.createElement('div');
  renderList(fakeDoc, container, state, currentView(state));
  assert.equal(container.textContent, 'No quotes match.');
});

test('every entry draws both forms; the Full display form has the whole quote, its source and a link to its device', () => {
  const state = indexState('date');
  const container = fakeDoc.createElement('div');
  renderList(fakeDoc, container, state, currentView(state));
  assert.equal(findAll(container, withClass('index-entry')).length, 4);
  assert.deepEqual(findAll(container, withClass('index-heading')).map((n) => n.textContent), ['1830s', '1940s', 'Date unknown']);
  const [first] = findAll(container, withClass('index-entry'));
  assert.equal(findAll(first, withClass('index-year'))[0].textContent, '1839');
  assert.equal(findAll(first, withClass('index-quote'))[0].textContent, '"Beneath the rule of men entirely great / The pen is mightier than the sword."');
  const [link] = findAll(first, withClass('index-device-link'));
  assert.equal(link.textContent, '→ Metaphor');
  assert.equal(link.dataset.deviceId, '1');
  const undated = findAll(container, withClass('index-entry')).at(-1);
  assert.equal(findAll(undated, withClass('index-year')).length, 0);
});

test('Copy writes a line each, or with Full display the whole quote, its source and its device', () => {
  const state = indexState('date');
  assert.match(viewToText(state, currentView(state)), /^1830s\n {2}"Beneath the rule of men entirely great — Bulwer-Lytton, Richelieu, 1839\n\n1940s\n/);
  state.indexFull = true;
  const full = viewToText(state, currentView(state));
  assert.match(full, /1830s\n {2}"Beneath the rule of men entirely great \/ The pen is mightier than the sword\."\n {2}— Bulwer-Lytton, Richelieu, 2\.2, 1839\n {2}→ Metaphor/);
  assert.match(full, /— Churchill, House of Commons speech, 4 June 1940\n {2}→ Anaphora/);
  assert.doesNotMatch(full, /Date unknown\n.*\n.*\n.*\d{4}\n/); // an undated quote adds no date line
});

test('the index bar draws one button per order with the active one pressed', () => {
  const container = fakeDoc.createElement('span');
  renderIndexOrders(fakeDoc, container, INDEX_ORDERS, 'source');
  assert.deepEqual(container.children.map((b) => b.textContent), ['First line', 'Source', 'Date']);
  assert.deepEqual(container.children.map((b) => b.attributes['aria-pressed']), ['false', 'true', 'false']);
  assert.deepEqual(container.children.map((b) => b.dataset.indexOrder), ['first_line', 'source', 'date']);
});

test('the Index is a group of its own and stays out of the no-group search', () => {
  const state = createState(payload());
  state.query = 'a';
  assert.deepEqual(currentView(state).items.map((group) => group.hierarchy), ['category', 'form', 'function']);
});
