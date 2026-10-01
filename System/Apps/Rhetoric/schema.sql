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
-- Build a fresh database: sqlite3 rhetoric.db < schema.sql

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

-- `body` carries inline italics for Latin as *word*.
CREATE TABLE IF NOT EXISTS examples (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id  INTEGER NOT NULL REFERENCES devices(id),
    body       TEXT NOT NULL
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
