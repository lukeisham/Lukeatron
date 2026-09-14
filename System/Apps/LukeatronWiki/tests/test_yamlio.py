"""
Test suite for yamlio.py — YAML reading and writing.
"""

import tempfile
import unittest
from pathlib import Path

# Import the module to test
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))

import yamlio


class TestYamlioScalars(unittest.TestCase):
    """Test scalar parsing."""

    def test_parse_quoted_strings(self):
        """Test quoted string parsing."""
        result = yamlio.parse('key: "hello world"')
        self.assertEqual(result["key"], "hello world")

    def test_parse_single_quoted_strings(self):
        """Test single-quoted string parsing."""
        result = yamlio.parse("key: 'hello world'")
        self.assertEqual(result["key"], "hello world")

    def test_parse_bare_strings(self):
        """Test bare string parsing."""
        result = yamlio.parse("key: hello")
        self.assertEqual(result["key"], "hello")

    def test_parse_null_values(self):
        """Test null value parsing."""
        self.assertEqual(yamlio.parse("key: null")["key"], None)
        self.assertEqual(yamlio.parse("key: ~")["key"], None)
        self.assertEqual(yamlio.parse("key: ")["key"], None)

    def test_parse_booleans(self):
        """Test boolean parsing."""
        self.assertTrue(yamlio.parse("key: true")["key"])
        self.assertFalse(yamlio.parse("key: false")["key"])

    def test_parse_numbers(self):
        """Test number parsing."""
        self.assertEqual(yamlio.parse("key: 42")["key"], 42)
        self.assertEqual(yamlio.parse("key: -5")["key"], -5)

    def test_parse_inline_lists(self):
        """Test inline list parsing."""
        result = yamlio.parse("key: [a, b, c]")
        self.assertEqual(result["key"], ["a", "b", "c"])

    def test_parse_inline_empty_list(self):
        """Test inline empty list."""
        result = yamlio.parse("key: []")
        self.assertEqual(result["key"], [])

    def test_parse_inline_empty_dict(self):
        """Test inline empty dict."""
        result = yamlio.parse("key: {}")
        self.assertEqual(result["key"], {})


class TestYamlioBlockLists(unittest.TestCase):
    """Test block list parsing."""

    def test_parse_block_list_of_scalars(self):
        """Test block list of scalar values."""
        yaml_text = """items:
  - one
  - two
  - three"""
        result = yamlio.parse(yaml_text)
        self.assertEqual(result["items"], ["one", "two", "three"])

    def test_parse_block_list_of_dicts(self):
        """Test block list of dicts."""
        yaml_text = """items:
  - id: q-001
    title: First Item
  - id: q-002
    title: Second Item"""
        result = yamlio.parse(yaml_text)
        self.assertEqual(len(result["items"]), 2)
        self.assertEqual(result["items"][0]["id"], "q-001")
        self.assertEqual(result["items"][0]["title"], "First Item")
        self.assertEqual(result["items"][1]["id"], "q-002")

    def test_parse_nested_block_lists(self):
        """Test nested block lists."""
        yaml_text = """pages:
  - slug: page1
    tags: [tag1, tag2]
  - slug: page2
    tags: [tag3, tag4]"""
        result = yamlio.parse(yaml_text)
        self.assertEqual(len(result["pages"]), 2)
        self.assertEqual(result["pages"][0]["slug"], "page1")


class TestYamlioComplexStructures(unittest.TestCase):
    """Test parsing complex structures."""

    def test_parse_mixed_content(self):
        """Test parsing mixed scalars and lists."""
        yaml_text = """wiki: MyWiki
count: 25
stores:
  - Store1
  - Store2
files:
  - file1.md
  - file2.md"""
        result = yamlio.parse(yaml_text)
        self.assertEqual(result["wiki"], "MyWiki")
        self.assertEqual(result["count"], 25)
        self.assertEqual(result["stores"], ["Store1", "Store2"])
        self.assertEqual(result["files"], ["file1.md", "file2.md"])

    def test_parse_with_comments(self):
        """Test that comments are ignored."""
        yaml_text = """key: value  # this is a comment
other: test  # another comment"""
        result = yamlio.parse(yaml_text)
        self.assertEqual(result["key"], "value")
        self.assertEqual(result["other"], "test")

    def test_parse_with_empty_lines(self):
        """Test parsing with empty lines."""
        yaml_text = """key1: value1

key2: value2

key3: value3"""
        result = yamlio.parse(yaml_text)
        self.assertEqual(result["key1"], "value1")
        self.assertEqual(result["key2"], "value2")
        self.assertEqual(result["key3"], "value3")

    def test_parse_real_sealed_yaml(self):
        """Test parsing the actual _sealed.yaml format."""
        yaml_text = """stores:
  - People
  - Essential
  - Family
  - Medical
  - Groups
  - Logs
  - Subscriptions
  - Tone
  - Preferences
  - Lukeatron

files:
  - BalaclavaPC/Pastoral_Notes.table.md"""
        result = yamlio.parse(yaml_text)
        self.assertEqual(len(result["stores"]), 10)
        self.assertEqual(len(result["files"]), 1)
        self.assertIn("People", result["stores"])
        self.assertEqual(result["files"][0], "BalaclavaPC/Pastoral_Notes.table.md")


class TestYamlioLoad(unittest.TestCase):
    """Test file loading."""

    def test_load_file(self):
        """Test loading a YAML file."""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".yaml", delete=False) as f:
            f.write("key: value\nother: test")
            temp_path = f.name

        try:
            result = yamlio.load(temp_path)
            self.assertEqual(result["key"], "value")
            self.assertEqual(result["other"], "test")
        finally:
            Path(temp_path).unlink()

    def test_load_missing_file(self):
        """Test that loading a missing file returns empty dict."""
        result = yamlio.load("/nonexistent/path/to/file.yaml")
        self.assertEqual(result, {})

    def test_load_with_path_object(self):
        """Test loading with Path object."""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".yaml", delete=False) as f:
            f.write("test: data")
            temp_path = Path(f.name)

        try:
            result = yamlio.load(temp_path)
            self.assertEqual(result["test"], "data")
        finally:
            temp_path.unlink()


class TestYamlioDumpScalar(unittest.TestCase):
    """Test scalar value dumping/quoting for YAML."""

    def test_dump_scalar_none(self):
        """Test dumping None."""
        self.assertEqual(yamlio.dump_scalar(None), "~")

    def test_dump_scalar_booleans(self):
        """Test dumping booleans."""
        self.assertEqual(yamlio.dump_scalar(True), "true")
        self.assertEqual(yamlio.dump_scalar(False), "false")

    def test_dump_scalar_numbers(self):
        """Test dumping numbers."""
        self.assertEqual(yamlio.dump_scalar(42), "42")
        self.assertEqual(yamlio.dump_scalar(-5), "-5")

    def test_dump_scalar_simple_string(self):
        """Test dumping simple strings (no special chars)."""
        self.assertEqual(yamlio.dump_scalar("hello"), "hello")
        self.assertEqual(yamlio.dump_scalar("world"), "world")

    def test_dump_scalar_string_with_special_chars(self):
        """Test dumping strings with special characters."""
        # Should be quoted if it contains special YAML chars
        result = yamlio.dump_scalar("key: value")
        self.assertIn('"', result)

    def test_dump_scalar_empty_string(self):
        """Test dumping empty string."""
        result = yamlio.dump_scalar("")
        # Should be quoted
        self.assertIn('"', result)

    def test_dump_scalar_string_starting_with_dash(self):
        """Test dumping string starting with dash."""
        result = yamlio.dump_scalar("- item")
        # Should be quoted
        self.assertIn('"', result)

    def test_dump_scalar_reserved_words(self):
        """Test dumping reserved YAML words."""
        # These should be quoted
        for word in ["null", "true", "false", "yes", "no", "on", "off"]:
            result = yamlio.dump_scalar(word)
            self.assertIn('"', result)

    def test_dump_scalar_with_quotes_inside(self):
        """Test dumping string with quotes inside."""
        result = yamlio.dump_scalar('say "hello"')
        # Should be quoted and escaped
        self.assertIn('"', result)


class TestYamlioRoundTrip(unittest.TestCase):
    """Test round-trip parsing and dumping."""

    def test_roundtrip_simple_values(self):
        """Test that simple values survive round-trip."""
        yaml_text = "key: value"
        parsed = yamlio.parse(yaml_text)
        self.assertEqual(parsed["key"], "value")

    def test_roundtrip_complex_structure(self):
        """Test round-trip of complex structures."""
        yaml_text = """stores:
  - Store1
  - Store2
files:
  - file1.md
  - file2.md"""
        parsed = yamlio.parse(yaml_text)
        self.assertEqual(len(parsed["stores"]), 2)
        self.assertEqual(len(parsed["files"]), 2)


class TestYamlioRegressions(unittest.TestCase):
    """Regression tests for the two confirmed defects, using the exact
    failing inputs from the bug report."""

    def test_bug1_comment_before_block_list_of_dicts(self):
        """A comment between a key and its block list must not discard the list."""
        result = yamlio.parse("k:\n  - a: 1\n    b: 2\n")
        self.assertEqual(result, {"k": [{"a": 1, "b": 2}]})

        result = yamlio.parse("k:\n  # note\n  - a: 1\n    b: 2\n")
        self.assertEqual(result, {"k": [{"a": 1, "b": 2}]})

    def test_bug2_nested_mapping_of_inline_lists(self):
        """A nested mapping whose values are inline lists must actually parse."""
        result = yamlio.parse("tags:\n  theology: [x, y]\n")
        self.assertEqual(result, {"tags": {"theology": ["x", "y"]}})

    def test_bug2_nested_mapping_of_scalars(self):
        """A nested mapping of plain scalars must actually parse."""
        result = yamlio.parse("m:\n  a: 1\n  b: 2\n")
        self.assertEqual(result, {"m": {"a": 1, "b": 2}})


class TestYamlioNestedMaps(unittest.TestCase):
    """Nested mappings to arbitrary depth."""

    def test_nested_map_two_levels(self):
        yaml_text = "outer:\n  inner:\n    a: 1\n    b: 2\n"
        result = yamlio.parse(yaml_text)
        self.assertEqual(result, {"outer": {"inner": {"a": 1, "b": 2}}})

    def test_nested_map_three_levels(self):
        yaml_text = "a:\n  b:\n    c:\n      d: 1\n      e: 2\n"
        result = yamlio.parse(yaml_text)
        self.assertEqual(result, {"a": {"b": {"c": {"d": 1, "e": 2}}}})

    def test_nested_map_with_inline_list_and_scalar_siblings(self):
        yaml_text = "tags:\n  theology: [a, b]\n  philosophy: [c]\n  empty: []\n"
        result = yamlio.parse(yaml_text)
        self.assertEqual(
            result,
            {"tags": {"theology": ["a", "b"], "philosophy": ["c"], "empty": []}},
        )

    def test_nested_map_followed_by_sibling_key(self):
        yaml_text = "m:\n  a: 1\n  b: 2\nafter: done\n"
        result = yamlio.parse(yaml_text)
        self.assertEqual(result, {"m": {"a": 1, "b": 2}, "after": "done"})

    def test_block_list_entry_with_nested_map_value(self):
        """An entry in a block list of dicts whose own value is a nested map."""
        yaml_text = (
            "items:\n"
            "  - id: x\n"
            "    meta:\n"
            "      a: 1\n"
            "      b: 2\n"
            "  - id: y\n"
        )
        result = yamlio.parse(yaml_text)
        self.assertEqual(
            result,
            {"items": [{"id": "x", "meta": {"a": 1, "b": 2}}, {"id": "y"}]},
        )


class TestYamlioCommentPlacement(unittest.TestCase):
    """Comments and blank lines anywhere: before/inside/after a list or
    nested map, at a deeper indent than the parent, and '#' inside quotes."""

    def test_comment_before_block_list(self):
        yaml_text = "k:\n  # leading comment\n  - one\n  - two\n"
        result = yamlio.parse(yaml_text)
        self.assertEqual(result, {"k": ["one", "two"]})

    def test_comment_inside_block_list(self):
        yaml_text = "k:\n  - one\n  # mid comment\n  - two\n"
        result = yamlio.parse(yaml_text)
        self.assertEqual(result, {"k": ["one", "two"]})

    def test_comment_after_block_list(self):
        yaml_text = "k:\n  - one\n  - two\n  # trailing comment\nafter: value\n"
        result = yamlio.parse(yaml_text)
        self.assertEqual(result, {"k": ["one", "two"], "after": "value"})

    def test_comment_inside_nested_map(self):
        yaml_text = "m:\n  a: 1\n  # comment between keys\n  b: 2\n"
        result = yamlio.parse(yaml_text)
        self.assertEqual(result, {"m": {"a": 1, "b": 2}})

    def test_comment_at_deeper_indent_than_parent(self):
        """A comment indented deeper than its neighbouring content is still just a comment."""
        yaml_text = "k:\n  - one\n        # deeply indented comment\n  - two\n"
        result = yamlio.parse(yaml_text)
        self.assertEqual(result, {"k": ["one", "two"]})

    def test_blank_lines_around_block_list(self):
        yaml_text = "k:\n\n  - one\n\n  - two\n\nafter: value\n"
        result = yamlio.parse(yaml_text)
        self.assertEqual(result, {"k": ["one", "two"], "after": "value"})

    def test_hash_inside_quoted_string_survives(self):
        result = yamlio.parse('key: "a # not a comment"')
        self.assertEqual(result["key"], "a # not a comment")

        result = yamlio.parse("key: 'b # also not a comment'")
        self.assertEqual(result["key"], "b # also not a comment")

    def test_hash_inside_quoted_string_within_block_list(self):
        yaml_text = 'items:\n  - text: "see # 3 above"\n    verified: true\n'
        result = yamlio.parse(yaml_text)
        self.assertEqual(result["items"][0]["text"], "see # 3 above")
        self.assertTrue(result["items"][0]["verified"])


class TestYamlioMalformedInput(unittest.TestCase):
    """Unparseable content must surface visibly (as the documented {}
    failure signal), never as a plausible-looking dict with a silently
    dropped or None-ed value."""

    def test_top_level_block_list_is_not_a_silent_partial_dict(self):
        # Top-level content isn't a mapping at all; parse() cannot return a
        # dict of it, and must not pretend by returning {} for individual
        # keys while looking otherwise fine — the whole document fails.
        result = yamlio.parse("- one\n- two\n")
        self.assertEqual(result, {})

    def test_unrecognizable_line_fails_the_whole_document(self):
        # "not a key/value, not a list item" is exactly the shape that used
        # to be silently skipped (i += 1) and vanish without a trace.
        result = yamlio.parse("k: v\nthis is not valid yaml at all\n")
        self.assertEqual(result, {})

    def test_mismatched_indent_inside_list_fails_the_whole_document(self):
        yaml_text = "k:\n  - one\n      - two\n"  # 'two' over-indented, no dash context
        result = yamlio.parse(yaml_text)
        self.assertEqual(result, {})

    def test_non_empty_inline_dict_fails_the_whole_document(self):
        # Flow mappings ({a: 1}) aren't used by any real LukeatronWiki file
        # and aren't supported; this must not silently collapse to {}.
        result = yamlio.parse("k: {a: 1}\n")
        self.assertEqual(result, {})


class TestYamlioRealFiles(unittest.TestCase):
    """Value-asserting tests against the four real LukeatronWiki data files —
    not just 'did not raise'. These are the acceptance test for the fix."""

    ROOT = Path(__file__).resolve().parents[4]

    def test_index_yaml_themes_tags_pages(self):
        """The live index parses into real structures.

        Counts are NOT hardcoded here. This is a parser test, and the live wiki
        legitimately grows — it went from 25 pages / 13 themes to 30 / 18 when the
        rebuilt nodes were promoted on 2026-09-12, which broke the pinned numbers
        that used to be asserted here. Pin the SHAPE and the internal consistency
        (pages == count), not the size of Luke's wiki on one particular day.
        """
        idx = yamlio.load(self.ROOT / "Memory/Long-Term/LukeatronWiki/_index.yaml")
        self.assertEqual(idx["wiki"], "LukeatronWiki")

        # themes: a non-empty block list of dicts, each fully populated
        self.assertIsInstance(idx["themes"], list)
        self.assertGreater(len(idx["themes"]), 0)
        for theme in idx["themes"]:
            self.assertIsInstance(theme, dict)
            for key in ("name", "folder", "hub_slug"):
                self.assertIn(key, theme)
                self.assertTrue(theme[key], f"empty {key} in {theme!r}")
            self.assertTrue(theme["folder"].startswith("Memory/Long-Term/"))

        # tags: a nested mapping of tag -> list of slugs (bug 2's regression surface)
        self.assertIsInstance(idx["tags"], dict)
        self.assertGreater(len(idx["tags"]), 0)
        for tag, slugs in idx["tags"].items():
            self.assertIsInstance(slugs, list, f"tag {tag!r} did not parse to a list")
            self.assertTrue(all(isinstance(s, str) for s in slugs))
        self.assertIn("theology", idx["tags"])
        self.assertIn("theology", idx["tags"]["theology"])

        # pages: a block list preceded by a comment (bug 1's regression surface)
        self.assertIsInstance(idx["pages"], list)
        self.assertEqual(len(idx["pages"]), idx["count"],
                         "pages list length must match the count: field")
        for page in idx["pages"]:
            self.assertIsInstance(page, dict)
            self.assertIn("slug", page)
            self.assertTrue(page["slug"])

        # every theme's hub_slug resolves to a real page in the same file
        slugs = {p["slug"] for p in idx["pages"]}
        for theme in idx["themes"]:
            self.assertIn(theme["hub_slug"], slugs,
                          f"theme {theme['name']!r} points at a hub_slug with no page")

    def test_sandbox_rebuild_index_yaml(self):
        """The sandbox rebuild staging file, while it still exists.

        This folder is pending cleanup now that its contents were promoted into
        Memory/ on 2026-09-12, so skip rather than fail once it is gone.
        """
        path = self.ROOT / "System/Sandbox/LukeatronWiki/_nodes-rebuild/_index.yaml"
        if not path.exists():
            self.skipTest("staging folder removed after promotion")
        idx = yamlio.load(path)
        self.assertIsInstance(idx["themes"], list)
        self.assertGreater(len(idx["themes"]), 0)
        self.assertIsInstance(idx["tags"], dict)
        self.assertGreater(len(idx["tags"]), 0)
        self.assertEqual(len(idx["pages"]), idx["count"])

    def test_queue_yaml_items(self):
        q = yamlio.load(self.ROOT / "Memory/Long-Term/LukeatronWiki/_queue.yaml")
        self.assertEqual(q["wiki"], "LukeatronWiki")
        self.assertIsInstance(q["items"], list)
        self.assertEqual(len(q["items"]), 3)
        self.assertEqual(q["items"][0]["id"], "q-001")
        self.assertEqual(q["items"][0]["kind"], "article")
        self.assertEqual(q["items"][0]["page"], "theology")
        self.assertEqual(q["items"][1]["id"], "q-002")
        self.assertEqual(q["items"][2]["id"], "q-003")
        self.assertIn("Augustine", q["items"][2]["title"])

    def test_sealed_yaml_stores_and_files(self):
        s = yamlio.load(self.ROOT / "Memory/Long-Term/LukeatronWiki/_sealed.yaml")
        self.assertEqual(len(s["stores"]), 10)
        self.assertEqual(len(s["files"]), 1)
        self.assertEqual(
            s["stores"],
            [
                "People", "Essential", "Family", "Medical", "Groups", "Logs",
                "Subscriptions", "Tone", "Preferences", "Lukeatron",
            ],
        )
        self.assertEqual(s["files"][0], "BalaclavaPC/Pastoral_Notes.table.md")


class TestYamlioScalarRoundTrip(unittest.TestCase):
    """dump_scalar output must re-parse (via 'key: <dumped>') to the same value."""

    def _roundtrip(self, value):
        dumped = yamlio.dump_scalar(value)
        parsed = yamlio.parse(f"key: {dumped}")
        return parsed["key"]

    def test_roundtrip_none(self):
        self.assertIsNone(self._roundtrip(None))

    def test_roundtrip_bool(self):
        self.assertIs(self._roundtrip(True), True)
        self.assertIs(self._roundtrip(False), False)

    def test_roundtrip_int(self):
        self.assertEqual(self._roundtrip(42), 42)
        self.assertEqual(self._roundtrip(-5), -5)

    def test_roundtrip_plain_string(self):
        self.assertEqual(self._roundtrip("hello"), "hello")

    def test_roundtrip_string_with_colon(self):
        self.assertEqual(self._roundtrip("key: value"), "key: value")

    def test_roundtrip_string_with_hash(self):
        self.assertEqual(self._roundtrip("see # note"), "see # note")

    def test_roundtrip_string_with_quotes(self):
        self.assertEqual(self._roundtrip('say "hello"'), 'say "hello"')
        self.assertEqual(self._roundtrip("it's fine"), "it's fine")

    def test_roundtrip_string_with_leading_trailing_spaces(self):
        self.assertEqual(self._roundtrip("  padded  "), "  padded  ")

    def test_roundtrip_reserved_words(self):
        for word in ["null", "true", "false", "yes", "no", "on", "off"]:
            self.assertEqual(self._roundtrip(word), word)

    def test_roundtrip_empty_string(self):
        self.assertEqual(self._roundtrip(""), "")

    def test_roundtrip_string_starting_with_dash(self):
        self.assertEqual(self._roundtrip("- item"), "- item")


if __name__ == "__main__":
    unittest.main()
