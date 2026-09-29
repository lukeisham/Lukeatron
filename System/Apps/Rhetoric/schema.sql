-- Canonical schema for rhetoric.db (MIG-4). Three independent hierarchies (category, form,
-- function) share one `nodes` table; each device links into exactly one node of each.
-- Every connection must run `PRAGMA foreign_keys = ON` itself (SQL-8) — SQLite defaults it off.
-- Cross-hierarchy invariants (a node's parent and a device's three links sit in the correct
-- hierarchy) are checked by the seed pipeline's verification step, not by triggers: it is the
-- only writer.
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
    category_node_id  INTEGER NOT NULL REFERENCES nodes(id),
    form_node_id      INTEGER NOT NULL REFERENCES nodes(id),
    function_node_id  INTEGER NOT NULL REFERENCES nodes(id),
    popularity        INTEGER,
    topical_rank      INTEGER
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
CREATE INDEX IF NOT EXISTS idx_devices_category_node_id ON devices(category_node_id);
CREATE INDEX IF NOT EXISTS idx_devices_form_node_id     ON devices(form_node_id);
CREATE INDEX IF NOT EXISTS idx_devices_function_node_id ON devices(function_node_id);
CREATE INDEX IF NOT EXISTS idx_devices_popularity       ON devices(popularity);
CREATE INDEX IF NOT EXISTS idx_devices_topical_rank     ON devices(topical_rank);
CREATE INDEX IF NOT EXISTS idx_examples_device_id       ON examples(device_id);
