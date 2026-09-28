// The shipped library: twelve narrative types, one story map each (library.spec FR-L1).
// Every entry uses the saved-story shape plus a one-line `note` on each bead.
// Adding an entry is a data edit only (FR-L7). Element ids must exist in ELEMENTS;
// notes are facts about the lead work, at most 80 characters (FR-L6).

const POSTER_CREDIT =
  "Built from the outline in the Periodic Table of Storytelling (ComputerSherpa)";

/** Credit line for an entry we authored ourselves (FR-L5). */
function authoredCredit(lead, type) {
  return `Our reading of ${lead} as ${type} — an interpretation`;
}

/**
 * Freezes a value and everything reachable from it, so no entry can be edited (FR-L4).
 * Recursion is safe here: the library is plain nested arrays and objects with no cycles.
 */
function deepFreezeLibrary(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreezeLibrary(child);
  return Object.freeze(value);
}

const ENTRIES = [
  {
    // Poster outline: Five Man Band - Conflict - Empire, then Dragon+Chosen One and You Have Failed Me
    // (the three-element chip is a tandem plus a bead, story-map OQ-T1). Cal, Mcg, Cmx and Den extend it.
    id: "quest-heros-journey",
    title: "Quest / Hero's Journey",
    examples: ["Star Wars", "The Hobbit", "Avatar: The Last Airbender", "The Wizard of Oz"],
    lead: "Star Wars",
    origin: "poster",
    credit: POSTER_CREDIT,
    beads: [
      { uid: "b1", elementId: "Cal", note: "Luke first refuses Obi-Wan's call, then accepts after his family dies." },
      { uid: "b2", elementId: "Mcg", note: "The stolen Death Star plans hidden in R2-D2 set the plot moving." },
      { uid: "b3", elementId: "5ma", note: "Luke, Han, Leia and Chewbacca form the band that gathers around the hero." },
      { uid: "b4", elementId: "C", note: "The Rebellion's war against the Empire is the central conflict." },
      { uid: "b5", elementId: "Emp", note: "The Galactic Empire rules through fear and the Death Star." },
      { uid: "b6", elementId: "Dra", with: "Neo", note: "Darth Vader serves the Emperor as his Dragon; Anakin is the Chosen One." },
      { uid: "b7", elementId: "Fai", note: "Vader chokes Admiral Ozzel for failure in The Empire Strikes Back." },
      { uid: "b8", elementId: "Cmx", note: "Luke's shot down the trench destroys the Death Star." },
      { uid: "b9", elementId: "Den", note: "A medal ceremony on Yavin 4 closes the film." },
    ],
    ribbons: [
      ["b1", "b2"], ["b2", "b3"], ["b3", "b4"], ["b4", "b5"],
      ["b5", "b6"], ["b6", "b7"], ["b7", "b8"], ["b8", "b9"],
    ],
  },
  {
    id: "voyage-and-return",
    title: "Voyage & Return",
    examples: ["The Wizard of Oz", "The Hobbit", "Avatar: The Last Airbender"],
    lead: "The Wizard of Oz",
    origin: "authored",
    credit: authoredCredit("The Wizard of Oz", "Voyage & Return"),
    beads: [
      { uid: "b1", elementId: "Inc", note: "A tornado carries Dorothy's house to Oz." },
      { uid: "b2", elementId: "Fnt", note: "In Oz she meets witches, Munchkins and a talking Scarecrow." },
      { uid: "b3", elementId: "Rdt", note: "She follows the Yellow Brick Road toward the Emerald City." },
      { uid: "b4", elementId: "Bad", note: "The Wicked Witch of the West hunts her for the ruby slippers." },
      { uid: "b5", elementId: "Tck", note: "In the witch's castle an hourglass counts down Dorothy's time." },
      { uid: "b6", elementId: "Re", note: "Toto pulls back the curtain on the Wizard, an ordinary man." },
      { uid: "b7", elementId: "Chk", note: "The ruby slippers, given early, take her home when she clicks them." },
      { uid: "b8", elementId: "Ae", note: "Dorothy learns there is no place like home." },
      { uid: "b9", elementId: "Sq", note: "She wakes in Kansas, back where she began." },
    ],
    ribbons: [
      ["b1", "b2"], ["b2", "b3"], ["b3", "b4"], ["b4", "b5"],
      ["b5", "b6"], ["b6", "b7"], ["b7", "b8"], ["b8", "b9"],
    ],
  },
  {
    id: "overcoming-the-monster",
    title: "Overcoming the Monster",
    examples: ["Jaws", "Ghostbusters", "Frankenstein"],
    lead: "Jaws",
    origin: "authored",
    credit: authoredCredit("Jaws", "Overcoming the Monster"),
    beads: [
      { uid: "b1", elementId: "Inc", note: "A shark kills a swimmer off Amity Island, opening the film." },
      { uid: "b2", elementId: "Ob", note: "Mayor Vaughn keeps the beaches open for the summer trade." },
      { uid: "b3", elementId: "Rts", note: "A July fourth attack on a crowded beach raises the stakes." },
      { uid: "b4", elementId: "P", note: "Chief Brody, afraid of the water, must go out to sea." },
      { uid: "b5", elementId: "A", note: "The shark is a wordless antagonist, barely seen until late." },
      { uid: "b6", elementId: "Cap", note: "Quint, captain of the Orca, leads the hunt." },
      { uid: "b7", elementId: "Chk", note: "Hooper's scuba tanks, set up earlier, end up killing the shark." },
      { uid: "b8", elementId: "Cmx", note: "Brody's rifle shot destroys the shark at the film's climax." },
      { uid: "b9", elementId: "Den", note: "Brody and Hooper paddle back to shore." },
    ],
    ribbons: [
      ["b1", "b2"], ["b2", "b3"], ["b3", "b4"], ["b4", "b5"],
      ["b5", "b6"], ["b6", "b7"], ["b7", "b8"], ["b8", "b9"],
    ],
  },
  {
    // Fork at the arrival (the two courtships) and a merge at the weddings.
    id: "comedy-satire",
    title: "Comedy / Satire",
    examples: ["Pride & Prejudice", "Dilbert", "The Hitchhiker's Guide to the Galaxy"],
    lead: "Pride & Prejudice",
    origin: "authored",
    credit: authoredCredit("Pride & Prejudice", "Comedy / Satire"),
    beads: [
      { uid: "b1", elementId: "Sat", note: "Its opening line ironically mocks the marriage market." },
      { uid: "b2", elementId: "Inc", note: "Mr Bingley's arrival at Netherfield sets the plot moving." },
      { uid: "b3", elementId: "Foo", note: "Mr Collins's pompous proposal to Elizabeth is played for laughs." },
      { uid: "b4", elementId: "Sbp", note: "Jane and Bingley's courtship runs alongside Elizabeth's story." },
      { uid: "b5", elementId: "Re", note: "Darcy's letter reveals what Wickham really did." },
      { uid: "b6", elementId: "Pt", note: "Lydia's elopement with Wickham threatens the whole family's standing." },
      { uid: "b7", elementId: "Ae", note: "Austen sets marriage for love against marriage for money." },
      { uid: "b8", elementId: "Com", note: "It ends in weddings: Elizabeth and Darcy, Jane and Bingley." },
    ],
    ribbons: [
      ["b1", "b2"], ["b2", "b3"], ["b2", "b4"], ["b3", "b5"],
      ["b5", "b6"], ["b6", "b7"], ["b7", "b8"], ["b4", "b8"],
    ],
  },
  {
    id: "tragedy-dystopia",
    title: "Tragedy / Dystopia",
    examples: ["Nineteen Eighty-Four", "To Kill a Mockingbird"],
    lead: "Nineteen Eighty-Four",
    origin: "authored",
    credit: authoredCredit("Nineteen Eighty-Four", "Tragedy / Dystopia"),
    beads: [
      { uid: "b1", elementId: "Dys", note: "Airstrip One is a surveillance state ruled by the Party." },
      { uid: "b2", elementId: "P", note: "Winston Smith rewrites old records at the Ministry of Truth." },
      { uid: "b3", elementId: "Bad", note: "Big Brother, the Party's face, watches from posters everywhere." },
      { uid: "b4", elementId: "Rar", note: "Winston and Julia begin a secret love affair." },
      { uid: "b5", elementId: "Mol", note: "O'Brien poses as a fellow rebel before arresting them." },
      { uid: "b6", elementId: "Cmx", note: "In Room 101, Winston begs that Julia suffer in his place." },
      { uid: "b7", elementId: "Sq", note: "The Party's power is unchanged; Winston is released, broken." },
      { uid: "b8", elementId: "Tra", note: "The book ends with Winston loving Big Brother." },
    ],
    ribbons: [
      ["b1", "b2"], ["b2", "b3"], ["b3", "b4"], ["b4", "b5"],
      ["b5", "b6"], ["b6", "b7"], ["b7", "b8"],
    ],
  },
  {
    id: "mystery-closed-circle",
    title: "Mystery / Closed circle",
    examples: ["And Then There Were None"],
    lead: "And Then There Were None",
    origin: "authored",
    credit: authoredCredit("And Then There Were None", "Mystery / Closed circle"),
    beads: [
      { uid: "b1", elementId: "Ccs", note: "The guests are stranded on Soldier Island with no boat." },
      { uid: "b2", elementId: "Bks", note: "A recorded voice accuses each guest of a past killing." },
      { uid: "b3", elementId: "Fsh", note: "A nursery rhyme in each room foretells the deaths." },
      { uid: "b4", elementId: "Rsa", note: "Guests die one by one, each following a verse of the rhyme." },
      { uid: "b5", elementId: "Ewi", note: "The survivors realise the killer must be one of them." },
      { uid: "b6", elementId: "Pt", note: "Judge Wargrave fakes his death to hide among the suspects." },
      { uid: "b7", elementId: "Re", note: "A confession found in a bottle reveals Wargrave's whole plan." },
      { uid: "b8", elementId: "Chs", note: "Wargrave, a retired judge, stage-manages every death in advance." },
    ],
    ribbons: [
      ["b1", "b2"], ["b2", "b3"], ["b3", "b4"], ["b4", "b5"],
      ["b5", "b6"], ["b6", "b7"], ["b7", "b8"],
    ],
  },
  {
    // Poster ring re-read for Zuko: Empire - Redemption Quest - Determinator+Anti-Villain - Heel Face Turn -
    // Five Man Band. Bks, Fht, Cmx and Den extend it (Zuko's first turn to the villains' side, the finale).
    id: "rebirth-redemption",
    title: "Rebirth / Redemption",
    examples: ["Avatar: The Last Airbender (Zuko)", "The Matrix"],
    lead: "Avatar: The Last Airbender (Zuko)",
    origin: "poster",
    credit: POSTER_CREDIT,
    beads: [
      { uid: "b1", elementId: "Bks", note: "Ozai scarred Zuko in an Agni Kai and banished him." },
      { uid: "b2", elementId: "Emp", note: "Zuko is prince of the Fire Nation, the empire at war with the world." },
      { uid: "b3", elementId: "Rq", note: "He must capture the Avatar to win back his honour." },
      { uid: "b4", elementId: "Det", with: "Av", note: "Zuko hunts the Avatar relentlessly yet is a sympathetic antagonist." },
      { uid: "b5", elementId: "Fht", note: "In the season two finale he sides with Azula against Iroh." },
      { uid: "b6", elementId: "Hft", note: "In season three he turns against the Fire Lord and joins Aang." },
      { uid: "b7", elementId: "5ma", note: "Zuko joins Aang's group and teaches him firebending." },
      { uid: "b8", elementId: "Cmx", note: "Zuko duels Azula in the finale, taking lightning meant for Katara." },
      { uid: "b9", elementId: "Den", note: "After Ozai's defeat, Zuko is crowned Fire Lord." },
    ],
    ribbons: [
      ["b1", "b2"], ["b2", "b3"], ["b3", "b4"], ["b4", "b5"],
      ["b5", "b6"], ["b6", "b7"], ["b7", "b8"], ["b8", "b9"],
    ],
  },
  {
    // Fork after the break-in (the hunter and the thieves run in parallel) and a merge at the hostage.
    id: "confined-space-heist",
    title: "Confined-space / Heist-ish",
    examples: ["Die Hard", "Parasite"],
    lead: "Die Hard",
    origin: "authored",
    credit: authoredCredit("Die Hard", "Confined-space / Heist-ish"),
    beads: [
      { uid: "b1", elementId: "Inc", note: "Terrorists seize Nakatomi Plaza during the Christmas party." },
      { uid: "b2", elementId: "Ccs", note: "McClane is trapped in the tower with the hostages." },
      { uid: "b3", elementId: "Hei", note: "Hans Gruber's real aim is the vault's bearer bonds, not politics." },
      { uid: "b4", elementId: "Det", note: "Barefoot McClane picks off the thieves and keeps fighting hurt." },
      { uid: "b5", elementId: "Tck", note: "The heist runs on a clock as police close in on the tower." },
      { uid: "b6", elementId: "Rts", note: "Hans learns Holly is McClane's wife and takes her hostage." },
      { uid: "b7", elementId: "Cmx", note: "McClane beats Hans, who falls from the tower." },
    ],
    ribbons: [
      ["b1", "b2"], ["b2", "b3"], ["b2", "b4"], ["b3", "b5"],
      ["b4", "b6"], ["b5", "b6"], ["b6", "b7"],
    ],
  },
  {
    id: "romance-dynamics",
    title: "Romance dynamics",
    examples: ["Pride & Prejudice (enemies-to-lovers)"],
    lead: "Pride & Prejudice (enemies-to-lovers)",
    origin: "authored",
    credit: authoredCredit("Pride & Prejudice (enemies-to-lovers)", "Romance dynamics"),
    beads: [
      { uid: "b1", elementId: "Rar", note: "Elizabeth and Darcy's relationship is the novel's main line." },
      { uid: "b2", elementId: "Jhg", note: "Darcy's cold manner at the Meryton ball hides a generous nature." },
      { uid: "b3", elementId: "Tri", note: "Wickham's charm turns Elizabeth further against Darcy." },
      { uid: "b4", elementId: "Pt", note: "Elizabeth refuses Darcy's first proposal at Hunsford." },
      { uid: "b5", elementId: "Re", note: "Darcy's letter forces Elizabeth to reconsider both men." },
      { uid: "b6", elementId: "Pet", note: "Darcy quietly settles Lydia's scandal; Elizabeth learns later." },
      { uid: "b7", elementId: "Dyn", note: "Both change: she judges more carefully, he becomes less proud." },
      { uid: "b8", elementId: "Cmx", note: "Elizabeth accepts Darcy's second proposal." },
    ],
    ribbons: [
      ["b1", "b2"], ["b2", "b3"], ["b3", "b4"], ["b4", "b5"],
      ["b5", "b6"], ["b6", "b7"], ["b7", "b8"],
    ],
  },
  {
    // Poster ring: the group (Five Man Band + Chosen One) heads a chain to the Empire, then round
    // through Redemption Quest and the Heel Face Turn, which closes back on the group (a loop ribbon).
    id: "found-family-ensemble",
    title: "Found family / Ensemble",
    examples: ["Avatar: The Last Airbender", "Ghostbusters", "Mass Effect"],
    lead: "Avatar: The Last Airbender",
    origin: "poster",
    credit: POSTER_CREDIT,
    beads: [
      { uid: "b1", elementId: "5ma", with: "Neo", note: "Aang, the Avatar, is the Chosen One at the centre of Team Avatar." },
      { uid: "b2", elementId: "Stw", note: "Their goal is to end the Fire Nation's hundred-year war." },
      { uid: "b3", elementId: "Emp", note: "The Fire Nation is the empire they oppose." },
      { uid: "b4", elementId: "Rq", note: "Zuko's redemption quest runs alongside the main plot." },
      { uid: "b5", elementId: "Det", with: "Av", note: "Zuko pursues the Avatar relentlessly yet is a sympathetic antagonist." },
      { uid: "b6", elementId: "Hft", note: "Zuko switches sides and joins the group in season three." },
    ],
    ribbons: [
      ["b1", "b2"], ["b2", "b3"], ["b3", "b4"], ["b4", "b5"], ["b5", "b6"], ["b6", "b1"],
    ],
  },
  {
    // Poster triangle: Static Character - Status Quo Is God - Hilarity Ensues, closing on itself (loop).
    // Sat, Ivc and Ob lead in, as the type needs.
    id: "workplace-everyday",
    title: "Workplace / Everyday",
    examples: ["Dilbert"],
    lead: "Dilbert",
    origin: "poster",
    credit: POSTER_CREDIT,
    beads: [
      { uid: "b1", elementId: "Sat", note: "Dilbert satirises corporate office culture." },
      { uid: "b2", elementId: "Ivc", note: "Its tone sits at the cynical end: management is rarely competent." },
      { uid: "b3", elementId: "Ob", note: "The Pointy-Haired Boss obstructs sensible work with pointless demands." },
      { uid: "b4", elementId: "Sta", note: "Dilbert, Wally and Alice stay the same from strip to strip." },
      { uid: "b5", elementId: "Sq", note: "The office never changes; each strip resets to the same cubicles." },
      { uid: "b6", elementId: "Hil", note: "Each strip's comedy comes from the same office trap springing again." },
    ],
    ribbons: [
      ["b1", "b2"], ["b2", "b3"], ["b3", "b4"], ["b4", "b5"], ["b5", "b6"], ["b6", "b4"],
    ],
  },
  {
    // Poster outline: Hero - Saving the World - Omnicidal Maniac+Eldritch Abomination, with Justified
    // Trope hanging off Saving the World. Pet/Kik fork and Cmx merge extend it to show the choice.
    id: "interactive-choice",
    title: "Interactive / Choice",
    examples: ["Mass Effect"],
    lead: "Mass Effect",
    origin: "poster",
    credit: POSTER_CREDIT,
    beads: [
      { uid: "b1", elementId: "H", note: "Commander Shepard is a customisable hero the player steps into." },
      { uid: "b2", elementId: "Stw", note: "Shepard must stop the Reapers before they destroy galactic civilisation." },
      { uid: "b3", elementId: "Om", with: "Eld", note: "The Reapers: ancient machines that periodically wipe out advanced life." },
      { uid: "b4", elementId: "Jt", note: "In-universe technology, like the mass relays, explains its space travel." },
      { uid: "b5", elementId: "Pet", note: "Paragon dialogue and choices show compassion." },
      { uid: "b6", elementId: "Kik", note: "Renegade choices are ruthless; the game tracks both paths." },
      { uid: "b7", elementId: "Cmx", note: "The finale has the player choose between several endings." },
    ],
    ribbons: [
      ["b1", "b2"], ["b2", "b3"], ["b2", "b4"], ["b3", "b5"],
      ["b3", "b6"], ["b5", "b7"], ["b6", "b7"],
    ],
  },
];

/** The twelve ready-made story maps, in seed-list order. Deep-frozen: never edit an entry. */
export const LIBRARY = deepFreezeLibrary(ENTRIES);
