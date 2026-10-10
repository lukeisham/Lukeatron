import test from 'node:test';
import assert from 'node:assert/strict';
import { GRID, GRID_ROLES, createState, entryView, setActiveView, setGridRole, setSortOrder } from '../app/state.js';
import { renderGridRoles, renderList } from '../app/render.js';
import { currentView, viewToText } from '../app/view.js';
import { loadToggles, saveToggles } from '../app/settings.js';
import { fakeDoc, findAll, withClass } from './fake-dom.mjs';
import { payload } from './fixture.mjs';

// Metaphor (1) has an issue then a fix; Anaphora (2) has one issue with no caption.
function imagesState() {
  const data = payload();
  data.entries[1].images = [
    { file: '1-cramped.png', role: 'issue', caption: 'Cramped leading', width: 160, height: 90 },
    { file: '1-airy.png', role: 'fix', caption: 'Leading opened up', width: 160, height: 90 },
  ];
  data.entries[2].images = [{ file: '2-clash.png', role: 'issue', caption: '', width: 80, height: 80 }];
  const state = createState(data);
  state.reveal = false;
  setSortOrder(state, GRID);
  return state;
}

function draw(state) {
  const container = fakeDoc.createElement('div');
  renderList(fakeDoc, container, state, currentView(state));
  return container;
}

test('the Grid lists every thumbnail, A to Z by entry then in the order filed', () => {
  const view = currentView(imagesState());
  assert.equal(view.mode, 'grid');
  assert.deepEqual(view.items.map((tile) => [tile.entry.name, tile.image.file]),
    [['Anaphora', '2-clash.png'], ['Metaphor', '1-cramped.png'], ['Metaphor', '1-airy.png']]);
});

test('the filter keeps only issues or only fixes, and search matches an entry name or a caption', () => {
  const state = imagesState();
  setGridRole(state, 'fix');
  assert.deepEqual(currentView(state).items.map((tile) => tile.image.file), ['1-airy.png']);
  setGridRole(state, 'issue');
  assert.equal(currentView(state).items.length, 2);
  setGridRole(state, 'all');
  state.query = 'leading';
  assert.deepEqual(currentView(state).items.map((tile) => tile.image.file), ['1-cramped.png', '1-airy.png']);
  state.query = 'anaph';
  assert.deepEqual(currentView(state).items.map((tile) => tile.image.file), ['2-clash.png']);
  state.query = 'nothing like it';
  assert.equal(draw(state).textContent, 'No images match.');
});

test('a tile is one button naming its entry, with a light, lazy, sized thumbnail and its role', () => {
  const container = draw(imagesState());
  const tiles = findAll(container, withClass('grid-tile'));
  assert.equal(tiles.length, 3);
  const [open] = findAll(tiles[1], withClass('grid-open'));
  assert.equal(open.dataset.entryId, '1');
  const [thumb] = findAll(tiles[1], withClass('grid-thumb'));
  assert.deepEqual(
    [thumb.tag, thumb.attributes.src, thumb.attributes.width, thumb.attributes.height, thumb.attributes.loading, thumb.attributes.alt],
    ['img', '/images/1-cramped.png', '160', '90', 'lazy', 'Cramped leading'],
  );
  assert.deepEqual(findAll(tiles[1], withClass('image-role')).map((n) => [n.textContent, n.dataset.role]), [['Issue', 'issue']]);
  assert.equal(findAll(tiles[1], withClass('grid-entry'))[0].textContent, 'Metaphor');
  assert.equal(findAll(tiles[0], withClass('image-caption')).length, 0); // no caption, no caption line
  assert.equal(findAll(tiles[0], withClass('grid-thumb'))[0].attributes.alt, 'Issue image of Anaphora'); // alt text falls back to the entry
});

test('the filter buttons are drawn from GRID_ROLES with the active one pressed', () => {
  const bar = fakeDoc.createElement('span');
  renderGridRoles(fakeDoc, bar, GRID_ROLES, 'fix');
  assert.deepEqual(bar.children.map((b) => [b.textContent, b.attributes['aria-pressed'], b.dataset.gridRole]),
    [['All', 'false', 'all'], ['Issues', 'false', 'issue'], ['Fixes', 'true', 'fix']]);
});

test('an entry lists its thumbnails with their roles and captions, and one with none shows no strip', () => {
  const state = imagesState();
  setSortOrder(state, 'alphabetical');
  const container = draw(state);
  const strips = findAll(container, withClass('entry-images'));
  assert.equal(strips.length, 2);
  assert.deepEqual(findAll(strips[1], withClass('image-caption')).map((n) => n.textContent), ['Cramped leading', 'Leading opened up']);
  const bare = createState(payload());
  bare.reveal = false;
  setSortOrder(bare, 'alphabetical');
  assert.equal(findAll(draw(bare), withClass('entry-images')).length, 0);
});

test('a tile opens its entry on its own, as the Index link does', () => {
  const state = imagesState();
  setActiveView(state, entryView(1));
  const view = currentView(state);
  assert.equal(view.mode, 'entry');
  assert.equal(findAll(draw(state), withClass('entry-image')).length, 2);
});

test('Copy writes the Grid as a line per thumbnail, and an entry lists its images while Show images is on', () => {
  const state = imagesState();
  assert.equal(viewToText(state, currentView(state)), [
    '• Anaphora — issue: 2-clash.png',
    '• Metaphor — issue: Cramped leading',
    '• Metaphor — fix: Leading opened up',
  ].join('\n'));
  setSortOrder(state, 'alphabetical');
  state.showDefinitions = false;
  state.showAiExamples = false;
  state.showQuotes = false;
  assert.match(viewToText(state, currentView(state)), /▣ issue: Cramped leading\n\s+▣ fix: Leading opened up/);
  state.showImages = false;
  assert.doesNotMatch(viewToText(state, currentView(state)), /▣/);
});

test('Show images is remembered between visits and is on by default', () => {
  assert.equal(imagesState().showImages, true);
  const store = {};
  const storage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v; } };
  saveToggles(storage, { showImages: false });
  assert.equal(loadToggles(storage).showImages, false);
});
