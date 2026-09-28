/**
 * Poster "furniture": everything printed on the poster that is not a tile (diagram.spec FR-D2),
 * plus the fixed wording the app adds around the poster (Rogue card, About panel).
 *
 * DATA ONLY. Every export is deep-frozen. All positions are poster pixels in the viewBox
 * `0 0 1303 1632` (the source PNG's pixel space). Measurements were taken from
 * `reference/periodic-table-of-storytelling.png` and are good to about +-1 px; font sizes are
 * approximate (the poster's fonts are not reproduced), so `textLength` is given for the long
 * runs so a generator can fit them exactly. Grid constants: origin (29, 49), cell 62.1 x 75,
 * tile (col,row) = x 29+62.1*col, y 49+75*row.
 *
 * Text is transcribed exactly as printed (case, punctuation, spelling). Franchise logos and the
 * tvtropes wordmark are NOT reproduced (OQ-D1): plain-text titles / a plain credit line instead.
 *
 * ── Conventions ──────────────────────────────────────────────────────────────────────────────
 * - `block` is a block key of `layout.js` (structureA, setting, storymod, plotdev, heroes,
 *   charmod, archetypes, villains, metatropes, production, fandom). `posterCols` is that block's
 *   inclusive column range on the poster. A generator re-anchors a heading, label or connector
 *   in the revised layout from `block` (FR-D11 d); this file holds no revised-layout numbers,
 *   so FURNITURE_ANCHORS is NOT defined here — anchors belong to layout.js.
 * - `popKey: true` marks an item that must carry `class="pop-key"` so it hides with the
 *   popularity numbers (FR-D13).
 * - `tone` is "ink" (normal text) or "muted" (the grey words in the title).
 * - Text anchors are "start" | "middle" | "end" (SVG text-anchor); `baseline` is the SVG `y`.
 *
 * ── Exports ──────────────────────────────────────────────────────────────────────────────────
 * POSTER_VIEWBOX          { width, height }
 * POSTER_TITLE            { text, box, runs: [{ text, x, baseline, fontSize, textLength, tone }] }
 * COLUMN_HEADINGS         [{ id, block, posterCols, centreX, baseline, lineHeight, fontSize, lines }]
 *                         one per heading printed above/inside a column block (10 headings)
 * CHARACTER_MODIFIERS_LABEL  { id, block, posterCols, box, centreX, baseline, lineHeight, fontSize, lines }
 *                         the boxed "Character Modifiers" label above the P and A tiles
 * KEY_CALLOUT             { box, badge, identifier, tropeName, popularity }
 *                         the "Ae" key: sample tile + three rows; `badge` and `popularity` are popKey
 * SUBTROPE_BOXES          [ callToAdventure, fourthWall ] — { id, title, box, columns/items, connector tile }
 * CONNECTORS              [{ id, kind, from, to, points, dash, width }] — six dashed lines
 * OUTLINE_EXAMPLES        { frame, heading, franchises: [{ id, title, titleBox, chips, links }] }
 * POSTER_CREDITS          { centreX, baseline, lineHeight, fontSize, lines } — "Chart by ComputerSherpa…"
 * TVTROPES_CREDIT         { text, lead, site, x, baseline, fontSize, underline } — plain text, no wordmark
 * ROGUE_CAPTION           "Rogue — when nothing fits"          (FR-D14)
 * ROGUE_DETAIL_TEXT       fixed explanatory text for the Rogue card's detail panel (viewport FR-V11)
 * ADDED_ELEMENT_CREDIT    "Added for this app — not on the original chart"   (FR-D12)
 * ABOUT                   { appName, versionLabel, statements, licenceNotes } (distribution FR-X7, OQ-X1, OQ-X3)
 */

/** Freezes an object graph so no reader can edit the shared poster text. */
function freezeFurnitureData(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const inner of Object.values(value)) freezeFurnitureData(inner);
  }
  return value;
}

/** The source image's pixel space; the original layout's viewBox. */
export const POSTER_VIEWBOX = freezeFurnitureData({ width: 1303, height: 1632 });

/**
 * The poster title, two lines, right-aligned to x = 1272.5. "The" and "of" are grey and smaller.
 * `box` is the block the layout moves as one (top-right on the poster, top-left in the revised
 * layout, where the runs keep their offsets from `box.x`/`box.y`).
 */
export const POSTER_TITLE = freezeFurnitureData({
  text: "The Periodic Table of Storytelling",
  box: { x: 775, y: 20, width: 498, height: 130 },
  runs: [
    { text: "The", x: 775, baseline: 74.5, fontSize: 41, textLength: 64, tone: "muted" },
    { text: "Periodic Table", x: 852, baseline: 74.5, fontSize: 66, textLength: 420, tone: "ink" },
    { text: "of", x: 886, baseline: 134, fontSize: 26, textLength: 25, tone: "muted" },
    { text: "Storytelling", x: 922, baseline: 134, fontSize: 66, textLength: 350, tone: "ink" },
  ],
});

/**
 * Headings printed at the head of each column block. Multi-line headings list every printed
 * line; `baseline` is the first line's, then add `lineHeight` per line. All are centred on
 * `centreX`, which is the centre of the block's poster columns. Heroes, Archetypes and
 * Villains sit in the empty cells above their blocks (row 6, y = 564); the other headings sit
 * above the block's first tile.
 */
export const COLUMN_HEADINGS = freezeFurnitureData([
  { id: "structure", block: "structureA", posterCols: [0, 0], centreX: 59, baseline: 39, lineHeight: 14.4, fontSize: 12, lines: ["Structure"] },
  { id: "setting", block: "setting", posterCols: [1, 1], centreX: 122, baseline: 83.5, lineHeight: 14.4, fontSize: 12, lines: ["Setting,", "laws,", "plots"] },
  { id: "story-modifiers", block: "storymod", posterCols: [2, 2], centreX: 185, baseline: 175.5, lineHeight: 14.4, fontSize: 12, lines: ["Story", "modifiers"] },
  { id: "plot-devices", block: "plotdev", posterCols: [3, 3], centreX: 247, baseline: 173.8, lineHeight: 14.4, fontSize: 12, lines: ["Plot", "devices"] },
  { id: "heroes", block: "heroes", posterCols: [4, 6], centreX: 371, baseline: 564, lineHeight: 14.4, fontSize: 12, lines: ["Heroes"] },
  { id: "archetypes", block: "archetypes", posterCols: [9, 11], centreX: 681.5, baseline: 564, lineHeight: 14.4, fontSize: 12, lines: ["Archetypes"] },
  { id: "villains", block: "villains", posterCols: [12, 15], centreX: 898.5, baseline: 564, lineHeight: 14.4, fontSize: 12, lines: ["Villains"] },
  { id: "metatropes", block: "metatropes", posterCols: [16, 17], centreX: 1086, baseline: 412.5, lineHeight: 14.4, fontSize: 12, lines: ["Metatropes"] },
  { id: "production", block: "production", posterCols: [18, 18], centreX: 1177, baseline: 335.5, lineHeight: 14.4, fontSize: 12, lines: ["Production"] },
  { id: "fandom", block: "fandom", posterCols: [19, 19], centreX: 1241, baseline: 307, lineHeight: 14.4, fontSize: 12, lines: ["Fandom &", "Audience", "Reactions"] },
]);

/**
 * The white label box over the P and A tiles. Its centre is the seam between poster columns 7
 * and 8; its bottom edge floats 6.5 px above the top of those tiles (row 6 starts at y = 499).
 * On the poster it is drawn over the corner of the Call to Adventure box, so it belongs in the
 * furniture layer above the subtrope boxes. Fill is a translucent white (style spec's call).
 */
export const CHARACTER_MODIFIERS_LABEL = freezeFurnitureData({
  id: "character-modifiers",
  block: "charmod",
  posterCols: [7, 8],
  box: { x: 491, y: 460.5, width: 70, height: 32.5 },
  centreX: 526,
  baseline: 473,
  lineHeight: 14,
  fontSize: 12,
  lines: ["Character", "Modifiers"],
});

/**
 * The "Ae" key. A sample tile (white box, no group colour), a circled sample popularity number,
 * and three labelled rows with short leader lines. Row three ("Popularity in kilowicks", its
 * leader and its two-line note) and the circled number are `popKey` (FR-D13).
 * `leader` is an SVG path in poster pixels.
 */
export const KEY_CALLOUT = freezeFurnitureData({
  box: { x: 711, y: 195, width: 89, height: 107 },
  sampleSymbol: { text: "Ae", x: 755, baseline: 248, fontSize: 37 },
  sampleName: { text: "An Aesop", x: 755.5, baseline: 281.5, fontSize: 11 },
  badge: { text: "2.0", cx: 781.6, cy: 209.4, r: 11.2, fontSize: 10, popKey: true },
  identifier: {
    text: "Identifier",
    x: 812,
    baseline: 238,
    fontSize: 21,
    textLength: 89,
    leader: "M781.2,234.3 L806.8,234.3",
  },
  tropeName: {
    text: "Trope name",
    x: 812,
    baseline: 281,
    fontSize: 21,
    textLength: 117,
    leader: "M785.8,277.7 L806.8,277.7",
  },
  popularity: {
    popKey: true,
    text: "Popularity in kilowicks",
    x: 812,
    baseline: 319.7,
    fontSize: 21,
    textLength: 220,
    leader: "M790.3,219.6 L790.3,306 Q790.3,316.5 800,316.5 L806.8,316.5",
    note: [
      { text: "(thousands of links to", x: 812, baseline: 342, fontSize: 17, textLength: 159 },
      { text: "its page within the wiki)", x: 812, baseline: 363.8, fontSize: 17, textLength: 177 },
    ],
  },
});

/**
 * The two subtrope boxes. Static, not clickable (OQ-D2). `box` is the rectangle; text starts at
 * `textX` with the first item's baseline at `firstBaseline`, then `lineHeight` per item.
 * `connectedTile` is the tile the box's dashed lines fan out from (see CONNECTORS).
 * `sitsAround` says which blocks/tiles frame it on the poster, for the layout to keep near.
 */
export const SUBTROPE_BOXES = freezeFurnitureData([
  {
    id: "call-to-adventure-box",
    title: "“Call to Adventure” primary subtropes:",
    connectedTile: "Cal",
    box: { x: 315, y: 209, width: 220, height: 327 },
    textX: 332,
    titleBaseline: 230.5,
    firstBaseline: 245,
    lineHeight: 13.2,
    fontSize: 11,
    sitsAround: {
      leftOfTiles: ["Phl", "Tb", "Wav", "Dx", "Ass"],
      aboveBlock: "heroes",
      tuckedBehindTiles: ["P", "A"],
      note: "fills the empty notch above Heroes; its lower-right corner is covered by the P and A tiles",
    },
    items: [
      "Adventure Rebuff",
      "Burning Building Rescue",
      "The Call Has Bad Reception",
      "The Call Knows Where You Live",
      "The Call Left A Message",
      "The Call Put Me On Hold",
      "Call Reception Area",
      "Desperately Looking For A Purpose In Life",
      "Forgot The Call",
      "Got The Call On Speed Dial",
      "I'm Dying, Please Take My MacGuffin",
      "Ignorant Of The Call",
      "Jumped At The Call",
      "Missed The Call",
      "Red Pill Blue Pill",
      "Refusal Of The Call",
      "Refused By The Call",
      "Regular Caller",
      "Resigned To The Call",
      "Screening The Call",
      "Take Up My Sword",
      "Two Roads Before You",
    ],
  },
  {
    id: "fourth-wall-box",
    title: "The Fourth Wall subtropes:",
    connectedTile: "4wl",
    box: { x: 645, y: 1123.5, width: 590.5, height: 83.5 },
    textX: 655.5,
    titleBaseline: 1140.5,
    firstBaseline: 1157,
    lineHeight: 13.2,
    fontSize: 11,
    sitsAround: {
      belowTilesInRow: 13,
      belowPosterCols: [10, 19],
      note: "hangs in the free zone below the last tile row, right of Hft and Fht",
    },
    // Four columns; each column's left edge is `x`, items run top to bottom.
    columns: [
      { x: 655.5, items: ["Audience What Audience", "Breaking the Fourth Wall", "Breaking The Reviewers Wall"] },
      { x: 794.5, items: ["Fourth Wall Mail Slot", "Fourth Wall Observer", "Fourth Wall Portrait", "Fourth Wall Psych"] },
      { x: 904, items: ["Leaning on the Fourth Wall", "Logging Onto The Fourth Wall", "No Fourth Wall", "No Inner Fourth Wall"] },
      {
        x: 1054,
        items: [
          "Noticing The Fourth Wall",
          "Painting the Fourth Wall",
          "Sliding Scale Of Fourth Wall Hardness",
          "The Fourth Wall Will Not Protect You",
        ],
      },
    ],
  },
]);

/**
 * The dashed connector lines. `points` is the polyline as drawn on the poster (original layout).
 * `from` / `to` name what each end is fixed to, so the revised layout can re-anchor them:
 * `{ tileId, corner }` (corner: "tl" | "tr" | "bl" | "br", in POSTER orientation — the layout
 * mirrors left/right where it mirrors the block) or `{ furnitureId, corner }` (a SUBTROPE_BOXES id).
 * `block` is the block of the tile end. On the poster the Cal-to-box lines are drawn under the
 * tiles where they cross them; `visibleUntil` records where the second line vanishes behind the
 * Ib tile (the line's true end is the box's bottom-right corner, hidden behind the P and A tiles).
 */
export const CONNECTORS = freezeFurnitureData([
  {
    id: "cal-to-call-box-top",
    kind: "dashed",
    block: "setting",
    from: { tileId: "Cal", corner: "tl" },
    to: { furnitureId: "call-to-adventure-box", corner: "tl" },
    points: [[91.1, 724], [315, 209]],
    dash: "9 6",
    width: 1,
  },
  {
    id: "cal-to-call-box-bottom",
    kind: "dashed",
    block: "setting",
    from: { tileId: "Cal", corner: "br" },
    to: { furnitureId: "call-to-adventure-box", corner: "br" },
    points: [[153.2, 799], [464, 586]],
    visibleUntil: [464, 586],
    fullEnd: [535, 536],
    dash: "9 6",
    width: 1,
  },
  {
    id: "5ma-to-band-left",
    kind: "dashed",
    block: "heroes",
    from: { tileId: "5ma", corner: "bl" },
    to: { tileId: "5maH", corner: "tl" },
    points: [[339.5, 1099], [135, 1125]],
    dash: "9 6",
    width: 1,
  },
  {
    id: "5ma-to-band-right",
    kind: "dashed",
    block: "heroes",
    from: { tileId: "5ma", corner: "br" },
    to: { tileId: "Ch", corner: "tr" },
    points: [[401.6, 1099], [445, 1125]],
    dash: "9 6",
    width: 1,
  },
  {
    id: "4wl-to-fourth-wall-box-left",
    kind: "dashed",
    block: "metatropes",
    from: { tileId: "4wl", corner: "bl" },
    to: { furnitureId: "fourth-wall-box", corner: "tl" },
    points: [[1022.6, 1099], [645, 1123.5]],
    dash: "9 6",
    width: 1,
  },
  {
    id: "4wl-to-fourth-wall-box-right",
    kind: "dashed",
    block: "metatropes",
    from: { tileId: "4wl", corner: "br" },
    to: { furnitureId: "fourth-wall-box", corner: "tr" },
    points: [[1084.7, 1099], [1235.5, 1123.5]],
    dash: "9 6",
    width: 1,
  },
]);

/**
 * The outline-examples panel. Each franchise is a plain-text `title` (no logo, OQ-D1) centred in
 * `titleBox` (where the logo sat), with element `chips` and the `links` between them.
 *
 * Chip: `{ id, group, x, y, width, height }` — `id` is an element id (the "H" in Mass Effect is
 * the grid Hero, not the Five Man Band sub-tile 5maH). `group` is the colour the poster PRINTED
 * on the chip, which is not always the element's tile group: 5ma is yellow on the table but blue
 * in the panel, Hil is grey on the table but tan in the panel, Fai is the paler villain tile but
 * a normal villain chip. Chips run in reading order (rows top to bottom, left to right). Abutting
 * chips (DraNeoFai, OmEld, DetAv) touch and have no link between them; where two same-colour chips
 * touch (Om|Eld) the split is estimated.
 *
 * Link: `{ a, b, kind, width, d }` — `a`/`b` are chip ids, `d` is SVG path data in poster pixels
 * (a link may draw several strokes). `kind`: "line" | "double" | "loop". The Avatar loop joins 5ma
 * and Neo (arcs above and below); its tail leads on to Hft, recorded as a second link 5ma to Hft.
 */
export const OUTLINE_EXAMPLES = freezeFurnitureData({
  frame: { x: 104, y: 1247, width: 1094, height: 243, strokeWidth: 3 },
  heading: {
    text: "These blocks allow for the construction of simple story outlines:",
    x: 142,
    baseline: 1283.4,
    fontSize: 15,
    textLength: 474,
  },
  franchises: [
    {
      id: "star-wars",
      title: "Star Wars",
      titleBox: { x: 139.6, y: 1303, width: 109, height: 66 },
      chips: [
        { id: "Dra", group: "villains", x: 198, y: 1388, width: 23, height: 15.6 },
        { id: "Neo", group: "heroes", x: 221, y: 1388, width: 24, height: 15.6 },
        { id: "Fai", group: "villains", x: 245, y: 1388, width: 23.8, height: 15.6 },
        { id: "5ma", group: "heroes", x: 134, y: 1423, width: 31.6, height: 15.5 },
        { id: "C", group: "structure", x: 183, y: 1423, width: 11.8, height: 15.5 },
        { id: "Emp", group: "villains", x: 213, y: 1423, width: 31.8, height: 15.5 },
      ],
      links: [
        { a: "Neo", b: "Emp", kind: "line", width: 1.5, d: "M228.8,1405 L228.8,1423" },
        { a: "5ma", b: "C", kind: "line", width: 1.5, d: "M166,1431.8 L180.6,1431.8" },
        { a: "C", b: "Emp", kind: "line", width: 1.5, d: "M197,1431.8 L212,1431.8" },
      ],
    },
    {
      id: "kim-possible",
      title: "Kim Possible",
      titleBox: { x: 299.7, y: 1317.8, width: 149, height: 38 },
      chips: [
        { id: "Kz", group: "archetypes", x: 359, y: 1389, width: 17.8, height: 15.8 },
        { id: "Tfc", group: "setting", x: 386.3, y: 1407.3, width: 21.7, height: 15.4 },
        { id: "Ag", group: "heroes", x: 359, y: 1420, width: 17.8, height: 15.8 },
      ],
      links: [
        { a: "Kz", b: "Ag", kind: "double", width: 1, d: "M366.8,1404.8 L366.8,1420 M369.8,1404.8 L369.8,1420" },
        { a: "Kz", b: "Tfc", kind: "line", width: 1, d: "M377.2,1400 L387,1408.8" },
        { a: "Ag", b: "Tfc", kind: "line", width: 1, d: "M377.2,1428.5 L386.8,1420" },
      ],
    },
    {
      id: "dilbert",
      title: "Dilbert",
      titleBox: { x: 499.8, y: 1303, width: 173, height: 65 },
      chips: [
        { id: "Sta", group: "charmod", x: 558, y: 1397, width: 19, height: 14.8 },
        { id: "Sq", group: "setting", x: 602, y: 1397, width: 16.8, height: 14.8 },
        { id: "Hil", group: "setting", x: 580, y: 1423.5, width: 17, height: 15 },
      ],
      links: [
        { a: "Sta", b: "Sq", kind: "line", width: 1, d: "M581,1404.5 L599.8,1404.5" },
        { a: "Sta", b: "Hil", kind: "line", width: 1, d: "M573.2,1413.5 L582,1422.5" },
        { a: "Sq", b: "Hil", kind: "line", width: 1, d: "M603.8,1414 L595.2,1422.5" },
      ],
    },
    {
      id: "mass-effect",
      title: "Mass Effect",
      titleBox: { x: 726, y: 1303, width: 223, height: 62 },
      chips: [
        { id: "H", group: "heroes", x: 773, y: 1400, width: 15, height: 15.5 },
        { id: "Stw", group: "setting", x: 808.8, y: 1400, width: 27, height: 15.5 },
        { id: "Om", group: "villains", x: 858, y: 1400, width: 16.5, height: 15.5 },
        { id: "Eld", group: "villains", x: 874.5, y: 1400, width: 23, height: 15.5 },
        { id: "Jt", group: "metatropes", x: 816.5, y: 1439.6, width: 13.3, height: 15 },
      ],
      links: [
        { a: "H", b: "Stw", kind: "line", width: 1.25, d: "M790.4,1407.5 L805.6,1407.5" },
        { a: "Stw", b: "Om", kind: "line", width: 1.25, d: "M839,1407.5 L854,1407.5" },
        { a: "Stw", b: "Jt", kind: "line", width: 1.75, d: "M823.9,1418 L823.9,1434" },
      ],
    },
    {
      id: "avatar",
      title: "Avatar: The Last Airbender",
      titleBox: { x: 1003.4, y: 1300, width: 172, height: 62 },
      chips: [
        { id: "5ma", group: "heroes", x: 1010, y: 1400, width: 30.7, height: 15.4 },
        { id: "Neo", group: "heroes", x: 1050, y: 1400, width: 28.6, height: 15.4 },
        { id: "Stw", group: "setting", x: 1090, y: 1400, width: 25.4, height: 15.4 },
        { id: "Emp", group: "villains", x: 1126, y: 1400, width: 30.7, height: 15.4 },
        { id: "Rq", group: "setting", x: 1121, y: 1426.4, width: 18.7, height: 15.3 },
        { id: "Hft", group: "charmod", x: 1050.3, y: 1435, width: 22.6, height: 15.4 },
        { id: "Det", group: "heroes", x: 1081, y: 1446.7, width: 23.7, height: 15.2 },
        { id: "Av", group: "villains", x: 1104.7, y: 1446.7, width: 17, height: 15.2 },
      ],
      links: [
        {
          a: "5ma",
          b: "Neo",
          kind: "loop",
          width: 1,
          d: "M1031.1,1398.6 C1031.1,1388.5 1055.4,1388.5 1055.4,1398.6 M1031.1,1415.6 C1031.1,1428 1055.4,1428 1055.4,1415.6",
        },
        { a: "5ma", b: "Hft", kind: "line", width: 1, d: "M1044.7,1422.4 L1050.7,1440.7" },
        { a: "Neo", b: "Stw", kind: "line", width: 1.5, d: "M1078.9,1408.6 L1089.7,1408.6" },
        { a: "Stw", b: "Emp", kind: "line", width: 1.5, d: "M1115.7,1408.6 L1125.7,1408.6" },
        { a: "Emp", b: "Rq", kind: "line", width: 1, d: "M1139.7,1416.4 L1133.6,1427.4" },
        { a: "Rq", b: "Av", kind: "line", width: 1, d: "M1127.6,1442.9 L1121.7,1454.3" },
        { a: "Hft", b: "Det", kind: "line", width: 1, d: "M1072.6,1442.9 L1081.1,1454.6" },
      ],
    },
  ],
});

/** The four small credit lines under the Call to Adventure box, centred on x = 806. */
export const POSTER_CREDITS = freezeFurnitureData({
  centreX: 806,
  baseline: 442.5,
  lineHeight: 16,
  fontSize: 11.5,
  lines: [
    "Chart by ComputerSherpa",
    "Special thanks to Elle, Micah, and the rest of the Tropers for inspiration",
    "Thanks to Madrugada, Jack Alsworth, and KirksOtherSon for corrections",
    "Permalink for this chart: goo.gl/yvSM4",
  ],
});

/**
 * The poster's footer line. The wordmark and lampshade logo are dropped (OQ-D1); the site name is
 * plain text. `text` is the whole line; `lead` and `site` are its two runs (`site` starts at
 * `siteX`, with the poster's underline drawn beneath it).
 */
export const TVTROPES_CREDIT = freezeFurnitureData({
  text: "ALL THESE TROPES AND TWENTY THOUSAND MORE ARE DETAILED ON tvtropes.org",
  lead: "ALL THESE TROPES AND TWENTY THOUSAND MORE ARE DETAILED ON",
  site: "tvtropes.org",
  x: 70,
  baseline: 1571,
  fontSize: 30,
  siteX: 951,
  underline: { x1: 951, x2: 1235, y: 1582 },
});

/** Caption drawn under the Rogue card in the revised layout (FR-D14). */
export const ROGUE_CAPTION = "Rogue — when nothing fits";

/** Fixed detail-panel text for the Rogue card (viewport-detail FR-V11). */
export const ROGUE_DETAIL_TEXT =
  "A rogue element stands in when no element on the table fits exactly. Give each one its own name.";

/** Credit line for a tile with `added: true` (FR-D12). */
export const ADDED_ELEMENT_CREDIT = "Added for this app — not on the original chart";

/**
 * About panel wording (distribution FR-X7). `statements` are the four quoted lines of FR-X7,
 * shown under the app name and version; `italic` is the substring to set in italics.
 * `licenceNotes` carry the OQ-X1 and OQ-X3 defaults: FR-X7 says the panel holds "exactly" the
 * statements, so the About author decides whether to show these two extra lines.
 * Nothing here asserts a licence for the poster itself: it says the poster's is not recorded.
 */
export const ABOUT = freezeFurnitureData({
  appName: "Storytelling",
  versionLabel: "Version",
  statements: [
    {
      id: "poster",
      text: "Poster chart: The Periodic Table of Storytelling by ComputerSherpa, via TV Tropes — this app re-draws it, re-arranges it and adds 36 elements",
      italic: "The Periodic Table of Storytelling",
    },
    {
      id: "tvtropes",
      text: "Descriptions and examples adapted from TV Tropes (tvtropes.org), licensed CC BY-NC-SA 3.0 — for personal, non-commercial sharing; not affiliated with TV Tropes",
    },
    { id: "added", text: "Elements marked with a dashed outline were added for this app" },
    { id: "privacy", text: "Everything stays on your device — nothing is sent anywhere; stories are saved in this browser only" },
  ],
  licenceNotes: [
    {
      id: "poster-licence",
      text: "The poster chart is a fan-made work; its own licence is not recorded here.",
    },
    {
      id: "share-alike",
      text: "Because the descriptions and examples are adapted from TV Tropes text, this file’s own text carries the same CC BY-NC-SA 3.0 licence.",
    },
  ],
});
