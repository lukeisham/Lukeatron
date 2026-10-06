-- Canonical schema for rhetoric.db (MIG-4). Three independent hierarchies (category, form,
-- function) share one `nodes` table. A device has exactly one Form tag and one Function tag
-- (columns on `devices`) and one-or-more Category tags (`device_categories`), so one device can
-- be, say, both a Fallacy and a Naming device.
-- Every connection must run `PRAGMA foreign_keys = ON` itself (SQL-8) — SQLite defaults it off.
-- Cross-hierarchy invariants (a node's parent and a device's links sit in the correct
-- hierarchy; every device has at least one Category tag) are checked by the seed pipeline's
-- verification step, not by triggers: it is the only writer.
-- `ai_confidence_rating` (high / medium / low) is the AI's confidence in the accuracy of the
-- device's definition, example and categorisation together; it defaults to 'low' so an unrated
-- device never reads as trusted.
-- `popularity` (0-100) is required. `topical_rank` is Luke's own ordering, set by hand after the
-- build, so it is NULL until then. `definition` is required; a device's examples (0 or more)
-- live in `examples`.
-- `flipside_of` is NULL for every ordinary device; a Fallacy Flipside device points at the
-- fallacy device it is the deliberate-use counterpart of (database.spec AD-7).
-- `topical_types` / `topical_placements` hold Luke's own Topical arrangement. Unlike every other
-- table they are written by server.py (granted exception, app-decisions.md); the seed pipeline
-- never touches them, so rebuilding the database from scratch discards them.
-- `grammar_labels` / `grammar_placements` hold Luke's own Grammar arrangement: grammatical-term
-- labels in a tree up to four levels deep (each with an explanation, `definition`), and the devices
-- filed under them (a device may sit under any number of labels, at any level). Like the Topical
-- tables they are written by server.py (granted exception, app-decisions.md); the seed pipeline never
-- touches them, so rebuilding the database from scratch discards them. `position` orders a label among
-- its siblings, and a placement's `position` orders a device within its label.
-- Build a fresh database, or add the topical and grammar tables to an existing one: sqlite3 rhetoric.db < schema.sql
-- (an older database whose topical_types lacks `parent_id` is rebuilt by seed/add_topical_nesting.py).
-- (an older database whose grammar_labels lacks `position`, or that still has the retired two-slot tables,
-- is brought up to date by seed/add_grammar_placements.py).

CREATE TABLE IF NOT EXISTS nodes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    hierarchy   TEXT NOT NULL CHECK (hierarchy IN ('category', 'form', 'function')),
    parent_id   INTEGER REFERENCES nodes(id),
    name        TEXT NOT NULL,
    definition  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS devices (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    name              TEXT NOT NULL,
    definition        TEXT NOT NULL,
    form_node_id      INTEGER NOT NULL REFERENCES nodes(id),
    function_node_id  INTEGER NOT NULL REFERENCES nodes(id),
    popularity        INTEGER NOT NULL CHECK (popularity BETWEEN 0 AND 100),
    ai_confidence_rating TEXT NOT NULL DEFAULT 'low' CHECK (ai_confidence_rating IN ('high', 'medium', 'low')),
    topical_rank      INTEGER,
    flipside_of       INTEGER REFERENCES devices(id)
);

-- A device's Category tags: one row per tag, at least one per device.
CREATE TABLE IF NOT EXISTS device_categories (
    device_id  INTEGER NOT NULL REFERENCES devices(id),
    node_id    INTEGER NOT NULL REFERENCES nodes(id),
    PRIMARY KEY (device_id, node_id)
);

-- `body` carries inline italics for Latin as *word*. `attribution` is the person an example's
-- words are credited to ("Julius Caesar"); the work and passage stay in `body`. 'Unattributed'
-- means no credit is recorded, not that the example is known to be invented. An existing
-- database gains the column through seed/add_example_attribution.py, not through this file.
-- `quote_date` is when a real quote's words were first said or published, as 'YYYY' or
-- 'YYYY-MM-DD' (AD, a year under 1000 padded to four digits: '0060'), or '-YYYY' for a year BC
-- ('-0935' is 935 BC; there is no year 0); NULL when not known (always NULL for a constructed
-- example). The Index group sorts by it and lists the NULLs last. An existing database gains it,
-- and the BC form, through seed/add_quote_date.py.
CREATE TABLE IF NOT EXISTS examples (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id    INTEGER NOT NULL REFERENCES devices(id),
    body         TEXT NOT NULL,
    attribution  TEXT NOT NULL DEFAULT 'Unattributed',
    quote_date   TEXT CHECK (quote_date IS NULL OR quote_date GLOB '[0-9][0-9][0-9][0-9]'
                             OR quote_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
                             OR quote_date GLOB '-[0-9][0-9][0-9][0-9]')
);

-- A Topical Type label, in a tree up to four levels deep (`parent_id` is NULL for a top-level Type).
-- A Type's name is unique among its siblings, ignoring case, by the index below. `position` is the
-- display order among siblings (ties fall back to id; gaps are fine, topical.py renumbers on a move).
CREATE TABLE IF NOT EXISTS topical_types (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_id INTEGER REFERENCES topical_types(id),
    name      TEXT NOT NULL,
    position  INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_topical_types_sibling_name ON topical_types(COALESCE(parent_id, 0), name COLLATE NOCASE);

-- A device may sit under several Types; deleting a Type deletes its placements, never the device.
-- `position` orders the devices within one Type.
CREATE TABLE IF NOT EXISTS topical_placements (
    type_id    INTEGER NOT NULL REFERENCES topical_types(id) ON DELETE CASCADE,
    device_id  INTEGER NOT NULL REFERENCES devices(id),
    position   INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (type_id, device_id)
);

-- REVIEW TAG. One row per device: Claude's private review ledger. It is never read by items.py,
-- server.py or the app (they select named columns), never copied to devices.json, and never shown
-- to Luke in the interface; only the agent reads it, straight from the database.
--   definition_reviewed  1 once the device's definition has been read against the README
--                        "Definitions" rules (and the sources they name); 0 until then.
--   ai_example_reviewed  1 once the device's AI-written (constructed) example has been checked
--                        against the README "Constructed examples" rules; 0 until then.
--   quote_changes        how many times a credited quote has been written for the device: every
--                        insert of, or edit to, a credited example adds 1 (a deletion adds 0), so
--                        1 is the original quote and more than 1 means it has been replaced or edited.
-- A device's row is created by trigger when the device is added; seed/add_device_review.py
-- back-fills a database that already has devices. Like the Topical tables, a rebuild from scratch
-- discards it (back it up first).
CREATE TABLE IF NOT EXISTS device_review (
    device_id            INTEGER PRIMARY KEY REFERENCES devices(id),
    definition_reviewed  INTEGER NOT NULL DEFAULT 0 CHECK (definition_reviewed IN (0, 1)),
    ai_example_reviewed  INTEGER NOT NULL DEFAULT 0 CHECK (ai_example_reviewed IN (0, 1)),
    quote_changes        INTEGER NOT NULL DEFAULT 0 CHECK (quote_changes >= 0)
);

CREATE TRIGGER IF NOT EXISTS trg_device_review_new_device AFTER INSERT ON devices
BEGIN
    INSERT OR IGNORE INTO device_review (device_id) VALUES (NEW.id);
END;

CREATE TRIGGER IF NOT EXISTS trg_device_review_quote_added AFTER INSERT ON examples
WHEN NEW.attribution <> 'Unattributed'
BEGIN
    INSERT OR IGNORE INTO device_review (device_id) VALUES (NEW.device_id);
    UPDATE device_review SET quote_changes = quote_changes + 1 WHERE device_id = NEW.device_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_device_review_quote_edited AFTER UPDATE OF body, attribution ON examples
WHEN NEW.attribution <> 'Unattributed' AND (NEW.body IS NOT OLD.body OR NEW.attribution IS NOT OLD.attribution)
BEGIN
    INSERT OR IGNORE INTO device_review (device_id) VALUES (NEW.device_id);
    UPDATE device_review SET quote_changes = quote_changes + 1 WHERE device_id = NEW.device_id;
END;

CREATE TABLE IF NOT EXISTS grammar_labels (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_id   INTEGER REFERENCES grammar_labels(id),
    name        TEXT NOT NULL,
    definition  TEXT NOT NULL,
    position    INTEGER NOT NULL DEFAULT 0
);

-- A device filed under a label; deleting the label (or the device) removes its placements.
CREATE TABLE IF NOT EXISTS grammar_placements (
    label_id   INTEGER NOT NULL REFERENCES grammar_labels(id) ON DELETE CASCADE,
    device_id  INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    position   INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (label_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_nodes_parent_id          ON nodes(parent_id);
CREATE INDEX IF NOT EXISTS idx_nodes_hierarchy          ON nodes(hierarchy);
CREATE INDEX IF NOT EXISTS idx_devices_name             ON devices(name);
CREATE INDEX IF NOT EXISTS idx_device_categories_node   ON device_categories(node_id);
CREATE INDEX IF NOT EXISTS idx_devices_form_node_id     ON devices(form_node_id);
CREATE INDEX IF NOT EXISTS idx_devices_function_node_id ON devices(function_node_id);
CREATE INDEX IF NOT EXISTS idx_devices_popularity       ON devices(popularity);
CREATE INDEX IF NOT EXISTS idx_devices_topical_rank     ON devices(topical_rank);
CREATE INDEX IF NOT EXISTS idx_devices_flipside_of      ON devices(flipside_of);
CREATE INDEX IF NOT EXISTS idx_examples_device_id       ON examples(device_id);
CREATE INDEX IF NOT EXISTS idx_topical_placements_device ON topical_placements(device_id);
CREATE INDEX IF NOT EXISTS idx_topical_types_parent ON topical_types(parent_id, position);
CREATE INDEX IF NOT EXISTS idx_topical_placements_order ON topical_placements(type_id, position);
CREATE INDEX IF NOT EXISTS idx_grammar_labels_parent    ON grammar_labels(parent_id);
CREATE INDEX IF NOT EXISTS idx_grammar_placements_device ON grammar_placements(device_id);
CREATE INDEX IF NOT EXISTS idx_grammar_placements_order  ON grammar_placements(label_id, position);
