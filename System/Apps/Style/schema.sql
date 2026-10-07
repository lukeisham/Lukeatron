-- Canonical schema for style.db. Three independent hierarchies (category, form, function) share one `nodes`
-- table. An entry has at most one Form tag and one Function tag (columns on `entries`) and any number of Category
-- tags (`entry_categories`).
-- Every connection must run `PRAGMA foreign_keys = ON` itself (SQL-8) — SQLite defaults it off.
-- Cross-hierarchy invariants (a node's parent and an entry's links sit in the correct hierarchy) are checked by the
-- agent that writes the entries, not by triggers.
-- `ai_confidence_rating` (high / medium / low) is the AI's confidence in the accuracy of the entry's definition,
-- example and classification together; it defaults to 'low' so an unrated entry never reads as trusted.
-- `popularity` (0-100), `form_node_id` and `function_node_id` are NULL until the entry is scored or classified; an
-- entry with no Form or Function simply does not appear in that tree, and sorts after every scored entry by Popularity.
-- `counterpart_of` is NULL for every ordinary entry; an entry that is the deliberate counterpart of another points at it.
-- `labels` / `label_placements` hold Luke's own arrangement: labels in a tree up to five levels deep (each with an
-- explanation, `definition`, blank when none), and the entries filed under them (an entry may sit under any number of
-- labels, at any level). Unlike every other table they are written by server.py (granted exception, app-decisions.md);
-- rebuilding the database from scratch discards them. `position` orders a label among its siblings, and a placement's
-- `position` orders an entry within its label.
-- `tables_json` holds the tables Luke attaches to a label: a JSON list, shape and limits in labeltables.py. It is written
-- only through labels.set_tables and goes with its row.
-- `about_section` makes a row a LINK label: it is the id of the row's own section in app/about.html ('link-<name>'), the
-- name shows as a link to it, and the row holds no entries, tables or sub-rows (labeltree.py enforces that). NULL on every
-- ordinary label. Written only by labeltree.create_link, which also adds the section to the page (aboutpage.py).
-- `entry_images` holds an entry's thumbnails: small PNG files in images/ (never in the database), each marked `issue` (what
-- the problem looks like) or `fix` (the same problem solved). `width` and `height` are the file's own pixel size, so the page can
-- reserve each thumbnail's space before it loads. images/ and these rows are written only by seed/add_image.py, which refuses a
-- file that is not a small PNG; the app only reads them. Deleting an entry removes its rows, not its files.
-- Build a fresh database, or add any missing table to an existing one: sqlite3 style.db < schema.sql

CREATE TABLE IF NOT EXISTS nodes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    hierarchy   TEXT NOT NULL CHECK (hierarchy IN ('category', 'form', 'function')),
    parent_id   INTEGER REFERENCES nodes(id),
    name        TEXT NOT NULL,
    definition  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS entries (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    name              TEXT NOT NULL,
    definition        TEXT NOT NULL,
    form_node_id      INTEGER REFERENCES nodes(id),
    function_node_id  INTEGER REFERENCES nodes(id),
    popularity        INTEGER CHECK (popularity IS NULL OR popularity BETWEEN 0 AND 100),
    ai_confidence_rating TEXT NOT NULL DEFAULT 'low' CHECK (ai_confidence_rating IN ('high', 'medium', 'low')),
    counterpart_of    INTEGER REFERENCES entries(id)
);

-- An entry's Category tags: one row per tag.
CREATE TABLE IF NOT EXISTS entry_categories (
    entry_id  INTEGER NOT NULL REFERENCES entries(id),
    node_id   INTEGER NOT NULL REFERENCES nodes(id),
    PRIMARY KEY (entry_id, node_id)
);

-- `body` carries inline italics as *word* and bold as _word_. `attribution` is the person an example's
-- words are credited to ("Julius Caesar"); the work and passage stay in `body`. 'Unattributed'
-- means no credit is recorded, not that the example is known to be invented.
-- `quote_date` is when a real quote's words were first said or published, as 'YYYY' or
-- 'YYYY-MM-DD' (AD, a year under 1000 padded to four digits: '0060'), or '-YYYY' for a year BC
-- ('-0935' is 935 BC; there is no year 0); NULL when not known (always NULL for a constructed
-- example). The Index group sorts by it and lists the NULLs last.
CREATE TABLE IF NOT EXISTS examples (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id     INTEGER NOT NULL REFERENCES entries(id),
    body         TEXT NOT NULL,
    attribution  TEXT NOT NULL DEFAULT 'Unattributed',
    quote_date   TEXT CHECK (quote_date IS NULL OR quote_date GLOB '[0-9][0-9][0-9][0-9]'
                             OR quote_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
                             OR quote_date GLOB '-[0-9][0-9][0-9][0-9]')
);

-- REVIEW TAG. One row per entry: the agent's private review ledger. It is never read by items.py, server.py or the
-- app (they select named columns) and never shown to Luke in the interface; only the agent reads it, straight from the
-- database.
--   definition_reviewed  1 once the entry's definition has been checked against its sources; 0 until then.
--   ai_example_reviewed  1 once the entry's AI-written (constructed) example has been checked; 0 until then.
--   quote_changes        how many times a credited quote has been written for the entry: every insert of, or edit
--                        to, a credited example adds 1 (a deletion adds 0), so 1 is the original quote and more than
--                        1 means it has been replaced or edited.
-- An entry's row is created by trigger when the entry is added.
CREATE TABLE IF NOT EXISTS entry_review (
    entry_id             INTEGER PRIMARY KEY REFERENCES entries(id),
    definition_reviewed  INTEGER NOT NULL DEFAULT 0 CHECK (definition_reviewed IN (0, 1)),
    ai_example_reviewed  INTEGER NOT NULL DEFAULT 0 CHECK (ai_example_reviewed IN (0, 1)),
    quote_changes        INTEGER NOT NULL DEFAULT 0 CHECK (quote_changes >= 0)
);

CREATE TRIGGER IF NOT EXISTS trg_entry_review_new_entry AFTER INSERT ON entries
BEGIN
    INSERT OR IGNORE INTO entry_review (entry_id) VALUES (NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS trg_entry_review_quote_added AFTER INSERT ON examples
WHEN NEW.attribution <> 'Unattributed'
BEGIN
    INSERT OR IGNORE INTO entry_review (entry_id) VALUES (NEW.entry_id);
    UPDATE entry_review SET quote_changes = quote_changes + 1 WHERE entry_id = NEW.entry_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_entry_review_quote_edited AFTER UPDATE OF body, attribution ON examples
WHEN NEW.attribution <> 'Unattributed' AND (NEW.body IS NOT OLD.body OR NEW.attribution IS NOT OLD.attribution)
BEGIN
    INSERT OR IGNORE INTO entry_review (entry_id) VALUES (NEW.entry_id);
    UPDATE entry_review SET quote_changes = quote_changes + 1 WHERE entry_id = NEW.entry_id;
END;

-- A label's name need not be unique: two labels, even siblings, may share one.
CREATE TABLE IF NOT EXISTS labels (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_id   INTEGER REFERENCES labels(id),
    name        TEXT NOT NULL,
    definition  TEXT NOT NULL DEFAULT '',
    position    INTEGER NOT NULL DEFAULT 0,
    tables_json TEXT NOT NULL DEFAULT '[]',
    about_section TEXT
);

-- An entry filed under a label; deleting the label (or the entry) removes its placements.
CREATE TABLE IF NOT EXISTS label_placements (
    label_id   INTEGER NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
    entry_id   INTEGER NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    position   INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (label_id, entry_id)
);

CREATE TABLE IF NOT EXISTS entry_images (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id  INTEGER NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    file      TEXT NOT NULL UNIQUE CHECK (file GLOB '*.png' AND file NOT GLOB '*[^A-Za-z0-9._-]*' AND file NOT GLOB '.*' AND file NOT GLOB '*..*'),
    role      TEXT NOT NULL CHECK (role IN ('issue', 'fix')),
    caption   TEXT NOT NULL DEFAULT '',
    width     INTEGER NOT NULL CHECK (width BETWEEN 1 AND 480),
    height    INTEGER NOT NULL CHECK (height BETWEEN 1 AND 480),
    position  INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_nodes_parent_id            ON nodes(parent_id);
CREATE INDEX IF NOT EXISTS idx_nodes_hierarchy            ON nodes(hierarchy);
CREATE INDEX IF NOT EXISTS idx_entries_name               ON entries(name);
CREATE INDEX IF NOT EXISTS idx_entry_categories_node      ON entry_categories(node_id);
CREATE INDEX IF NOT EXISTS idx_entries_form_node_id       ON entries(form_node_id);
CREATE INDEX IF NOT EXISTS idx_entries_function_node_id   ON entries(function_node_id);
CREATE INDEX IF NOT EXISTS idx_entries_popularity         ON entries(popularity);
CREATE INDEX IF NOT EXISTS idx_entries_counterpart_of     ON entries(counterpart_of);
CREATE INDEX IF NOT EXISTS idx_examples_entry_id          ON examples(entry_id);
CREATE INDEX IF NOT EXISTS idx_labels_parent              ON labels(parent_id, position);
CREATE INDEX IF NOT EXISTS idx_label_placements_entry     ON label_placements(entry_id);
CREATE INDEX IF NOT EXISTS idx_label_placements_order     ON label_placements(label_id, position);
CREATE INDEX IF NOT EXISTS idx_entry_images_entry         ON entry_images(entry_id, position);
