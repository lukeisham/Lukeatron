-- Canonical schema for grammar.db. An entry is a plain entry (`kind` 'entry', shown as a pattern, the smallest item) or a TYPE (`kind` 'type'): a type has the same
-- fields as a pattern and is listed beside patterns, but in the four hierarchies (templates, brainstorming, research,
-- topical) it works as a heading that can hold patterns and other types. `placements` is the one table of that holding:
-- a row says that in one hierarchy `member_id` sits under the type `parent_id` (NULL = at the top level). A member may sit
-- in any number of hierarchies and under any number of types; what a type holds in a hierarchy is the same wherever it is
-- shown. Labels are separate (below): Luke's own organisers.
-- Every connection must run `PRAGMA foreign_keys = ON` itself (SQL-8) — SQLite defaults it off.
-- A parent must be a type and a type may not hold itself, directly or through other types, in one hierarchy: triggers
-- below enforce both.
-- `ai_confidence_rating` (high / medium / low) is the AI's confidence in the accuracy of the entry's definition,
-- example and classification together; it defaults to 'low' so an unrated entry never reads as trusted.
-- An entry with no placement in a hierarchy simply does not appear in that tree.
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
-- Build a fresh database, or add any missing table to an existing one: sqlite3 grammar.db < schema.sql

CREATE TABLE IF NOT EXISTS entries (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    kind              TEXT NOT NULL DEFAULT 'entry' CHECK (kind IN ('entry', 'type')),
    name              TEXT NOT NULL,
    definition        TEXT NOT NULL,
    ai_confidence_rating TEXT NOT NULL DEFAULT 'low' CHECK (ai_confidence_rating IN ('high', 'medium', 'low')),
    counterpart_of    INTEGER REFERENCES entries(id)
);

CREATE TABLE IF NOT EXISTS placements (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    hierarchy   TEXT NOT NULL CHECK (hierarchy IN ('templates', 'brainstorming', 'research', 'topical')),
    parent_id   INTEGER REFERENCES entries(id) ON DELETE CASCADE,
    member_id   INTEGER NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    CHECK (parent_id IS NULL OR parent_id <> member_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_placements_unique ON placements(hierarchy, COALESCE(parent_id, 0), member_id);

CREATE TRIGGER IF NOT EXISTS trg_placements_parent_is_type BEFORE INSERT ON placements
WHEN NEW.parent_id IS NOT NULL AND (SELECT kind FROM entries WHERE id = NEW.parent_id) <> 'type'
BEGIN
    SELECT RAISE(ABORT, 'a placement parent must be a type');
END;

CREATE TRIGGER IF NOT EXISTS trg_placements_no_cycle BEFORE INSERT ON placements
WHEN NEW.parent_id IS NOT NULL AND EXISTS (
    WITH RECURSIVE above(id) AS (
        SELECT NEW.parent_id
        UNION
        SELECT p.parent_id FROM placements p JOIN above a ON p.member_id = a.id
        WHERE p.hierarchy = NEW.hierarchy AND p.parent_id IS NOT NULL
    )
    SELECT 1 FROM above WHERE id = NEW.member_id
)
BEGIN
    SELECT RAISE(ABORT, 'a type cannot hold itself');
END;

CREATE TRIGGER IF NOT EXISTS trg_entries_type_in_use BEFORE UPDATE OF kind ON entries
WHEN NEW.kind = 'entry' AND EXISTS (SELECT 1 FROM placements WHERE parent_id = NEW.id)
BEGIN
    SELECT RAISE(ABORT, 'a type that holds something cannot become a plain entry');
END;

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

CREATE INDEX IF NOT EXISTS idx_entries_name               ON entries(name);
CREATE INDEX IF NOT EXISTS idx_placements_member          ON placements(member_id);
CREATE INDEX IF NOT EXISTS idx_placements_parent          ON placements(hierarchy, parent_id);
CREATE INDEX IF NOT EXISTS idx_entries_counterpart_of     ON entries(counterpart_of);
CREATE INDEX IF NOT EXISTS idx_examples_entry_id          ON examples(entry_id);
CREATE INDEX IF NOT EXISTS idx_labels_parent              ON labels(parent_id, position);
CREATE INDEX IF NOT EXISTS idx_label_placements_entry     ON label_placements(entry_id);
CREATE INDEX IF NOT EXISTS idx_label_placements_order     ON label_placements(label_id, position);
