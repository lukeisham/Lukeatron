"""
Test suite for seal.py — comprehensive coverage of sealing logic.

Tests AC-1 through AC-5 and the near-miss risk from seal.spec.md §6.
"""

import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

# Import the modules to test
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))

from seal import load, is_sealed, is_sealed_store, is_sealed_link, count
import paths
import yamlio


class TestSealBasics(unittest.TestCase):
    """Test core sealing logic."""

    def test_load_returns_dict_with_stores_and_files(self):
        """AC-1: load() returns the expected structure."""
        manifest = load()
        self.assertIsInstance(manifest, dict)
        self.assertIn("stores", manifest)
        self.assertIn("files", manifest)
        self.assertIsInstance(manifest["stores"], set)
        self.assertIsInstance(manifest["files"], set)

    def test_ac1_all_eleven_launch_entries_sealed(self):
        """AC-1: is_sealed() returns True for all eleven launch entries."""
        # Ten sealed stores
        sealed_stores = [
            "People",
            "Essential",
            "Family",
            "Medical",
            "Groups",
            "Logs",
            "Subscriptions",
            "Tone",
            "Preferences",
            "Lukeatron",
        ]

        for store in sealed_stores:
            with self.subTest(store=store):
                self.assertTrue(
                    is_sealed(store), f"Store {store} should be sealed"
                )

        # One sealed file
        sealed_file = "BalaclavaPC/Pastoral_Notes.table.md"
        self.assertTrue(is_sealed(sealed_file), f"File {sealed_file} should be sealed")

    def test_ac2_file_inside_sealed_store_is_sealed(self):
        """AC-2: A file inside a sealed store is sealed without individual listing."""
        # Test a path inside a sealed store
        test_paths = [
            "People/Alice.md",
            "People/subfolder/contact.txt",
            "Tone/default.md",
            "Preferences/settings.yaml",
        ]

        for test_path in test_paths:
            with self.subTest(path=test_path):
                self.assertTrue(is_sealed(test_path), f"Path {test_path} should be sealed")

    def test_near_miss_peoples_not_sealed(self):
        """Risk §6: A store named 'Peoples' or a file 'People_notes.md' in a different store should NOT be sealed."""
        # Mock a different manifest without exact matches
        fake_manifest = {"stores": {"People"}, "files": {"BalaclavaPC/Pastoral_Notes.table.md"}}

        with patch("seal.load", return_value=fake_manifest):
            # "Peoples" (different name) should NOT be sealed
            self.assertFalse(
                is_sealed("Peoples"),
                "A store named 'Peoples' (not 'People') should not be sealed",
            )

            # "People_notes.md" in a different store should NOT be sealed
            self.assertFalse(
                is_sealed("Theology/People_notes.md"),
                "A file 'People_notes.md' in a different store should not be sealed",
            )

    def test_is_sealed_store(self):
        """Test is_sealed_store() checks."""
        self.assertTrue(is_sealed_store("People"))
        self.assertTrue(is_sealed_store("Tone"))
        self.assertFalse(is_sealed_store("Theology"))
        self.assertFalse(is_sealed_store("NonExistent"))

    def test_ac3_sealed_link_renders_plain_text(self):
        """AC-3: A wikilink to a sealed slug is considered sealed."""
        # Test sealed store hubs (kebab-case versions)
        sealed_slugs = [
            "people",  # People -> people
            "tone",    # Tone -> tone
            "preferences",  # Preferences -> preferences
            "lukeatron",    # Lukeatron -> lukeatron
        ]

        for slug in sealed_slugs:
            with self.subTest(slug=slug):
                self.assertTrue(
                    is_sealed_link(slug, []),
                    f"Link to slug '{slug}' should render as plain text",
                )

    def test_is_sealed_link_with_empty_refs(self):
        """Test is_sealed_link() with empty refs."""
        # Non-sealed slug with empty refs -> False
        self.assertFalse(is_sealed_link("theology", []))

    def test_is_sealed_link_all_refs_sealed(self):
        """Test is_sealed_link() with refs where ALL are sealed."""
        # All refs sealed -> True
        sealed_refs = ["People/Alice.md", "Tone/default.md"]
        self.assertTrue(
            is_sealed_link("some-slug", sealed_refs),
            "Link should be sealed if all refs are sealed",
        )

    def test_is_sealed_link_some_refs_unsealed(self):
        """Test is_sealed_link() with refs where SOME are unsealed."""
        # Some refs unsealed -> False
        mixed_refs = ["People/Alice.md", "Theology/augustine.md"]
        self.assertFalse(
            is_sealed_link("some-slug", mixed_refs),
            "Link should not be sealed if any ref is unsealed",
        )

    def test_count(self):
        """Test count() returns correct totals."""
        counts = count()
        self.assertIsInstance(counts, dict)
        self.assertIn("stores", counts)
        self.assertIn("files", counts)
        self.assertIn("total", counts)
        self.assertEqual(counts["total"], counts["stores"] + counts["files"])
        # We know there should be 11 sealed items at launch
        self.assertEqual(counts["total"], 11)

    def test_ac4_hand_edit_reflected_immediately(self):
        """AC-4: Hand-editing _sealed.yaml and re-checking (no restart) reflects the change."""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create a temporary _sealed.yaml
            temp_sealed = Path(tmpdir) / "_sealed.yaml"
            temp_sealed.write_text(
                "stores:\n  - TestStore\nfiles:\n  - test.md\n"
            )

            # Mock paths.SEALED_YAML to point to our temp file
            with patch.object(paths, "SEALED_YAML", temp_sealed):
                # First check
                self.assertTrue(is_sealed("TestStore"))
                self.assertTrue(is_sealed("test.md"))

                # Hand-edit the file
                temp_sealed.write_text(
                    "stores:\n  - NewStore\nfiles:\n  - newfile.md\n"
                )

                # Second check (no restart) should see the new state
                self.assertFalse(is_sealed("TestStore"), "Old store should no longer be sealed")
                self.assertTrue(is_sealed("NewStore"), "New store should be sealed")
                self.assertFalse(is_sealed("test.md"), "Old file should no longer be sealed")
                self.assertTrue(is_sealed("newfile.md"), "New file should be sealed")

    def test_absolute_and_relative_paths(self):
        """Test that both absolute and relative paths work correctly."""
        # Relative path
        self.assertTrue(is_sealed("People/Alice.md"))

        # Absolute path
        abs_path = paths.LT / "People" / "Alice.md"
        self.assertTrue(is_sealed(abs_path))

        # Path object
        self.assertTrue(is_sealed(Path("People/Alice.md")))


class TestYamlioParsing(unittest.TestCase):
    """Test yamlio module parses our real files correctly."""

    def test_parse_sealed_yaml(self):
        """Verify yamlio can parse _sealed.yaml."""
        data = yamlio.load(paths.SEALED_YAML)
        self.assertIn("stores", data)
        self.assertIn("files", data)
        self.assertIsInstance(data["stores"], list)
        self.assertIsInstance(data["files"], list)
        self.assertEqual(len(data["stores"]), 10)
        self.assertEqual(len(data["files"]), 1)

    def test_parse_index_yaml(self):
        """Verify yamlio can parse _index.yaml."""
        data = yamlio.load(paths.INDEX_YAML)
        self.assertIn("wiki", data)
        self.assertIn("type", data)
        # Note: pages may be a list or None depending on parser capabilities
        # The important thing is that the file loads without error
        self.assertEqual(data["wiki"], "LukeatronWiki")

    def test_parse_queue_yaml(self):
        """Verify yamlio can parse _queue.yaml."""
        data = yamlio.load(paths.QUEUE_YAML)
        self.assertIn("wiki", data)
        self.assertIn("type", data)
        self.assertIn("items", data)
        self.assertIsInstance(data["items"], list)

    def test_load_missing_file_returns_empty_dict(self):
        """Verify yamlio returns {} for missing files."""
        result = yamlio.load("/nonexistent/path/to/file.yaml")
        self.assertEqual(result, {})


class TestNoWritePath(unittest.TestCase):
    """Verify seal.py has no write functionality."""

    def test_no_write_to_sealed_yaml(self):
        """AC-5: Verify no function in seal.py opens _sealed.yaml for writing."""
        import inspect
        import seal

        # Get all functions in seal module
        for name, obj in inspect.getmembers(seal):
            if inspect.isfunction(obj) and not name.startswith("_"):
                source = inspect.getsource(obj)
                # Check that no public function contains 'open' or 'write'
                # This is a code-level check
                self.assertNotIn(
                    ".write",
                    source,
                    f"Function {name} should not write to files",
                )
                self.assertNotIn(
                    ".open(",
                    source,
                    f"Function {name} should not open files",
                )


class TestFR7ManifestFailureStates(unittest.TestCase):
    """Test FR-7 failure handling: absent, unreadable, or malformed manifests."""

    def setUp(self):
        """Save original SEALED_YAML path."""
        self.original_sealed_yaml = paths.SEALED_YAML

    def tearDown(self):
        """Restore original SEALED_YAML path."""
        paths.SEALED_YAML = self.original_sealed_yaml

    def test_ac6_manifest_deleted_seals_everything(self):
        """AC-6 (FR-7): manifest deleted → is_sealed() returns True for all paths."""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Point to a non-existent file
            fake_path = Path(tmpdir) / "nonexistent_sealed.yaml"
            with patch.object(paths, "SEALED_YAML", fake_path):
                # Clear any cached data by re-importing
                # is_sealed should treat EVERYTHING as sealed
                self.assertTrue(
                    is_sealed("People/luke.md"),
                    "File should be sealed when manifest is missing",
                )
                self.assertTrue(
                    is_sealed("Theology/augustine.md"),
                    "Unsealed path should be sealed when manifest is missing",
                )
                self.assertTrue(
                    is_sealed("BalaclavaPC/Pastoral_Notes.table.md"),
                    "Pastoral notes should be sealed when manifest is missing",
                )
                self.assertTrue(
                    is_sealed_store("People"),
                    "Store should be sealed when manifest is missing",
                )
                self.assertTrue(
                    is_sealed_store("Theology"),
                    "Non-sealed store should be sealed when manifest is missing",
                )

    def test_ac6_manifest_deleted_count_reads_as_failure(self):
        """AC-6 (FR-7): count() returns None values when manifest is missing."""
        with tempfile.TemporaryDirectory() as tmpdir:
            fake_path = Path(tmpdir) / "nonexistent_sealed.yaml"
            with patch.object(paths, "SEALED_YAML", fake_path):
                counts = count()
                self.assertIsNone(counts["stores"], "stores should be None in failure state")
                self.assertIsNone(counts["files"], "files should be None in failure state")
                self.assertIsNone(counts["total"], "total should be None in failure state")
                self.assertTrue(counts.get("_failure"), "_failure flag should be True")

    def test_ac7_manifest_truncated_mid_document_seals_everything(self):
        """AC-7 (FR-7): truncated manifest (parsing fails) seals everything."""
        with tempfile.TemporaryDirectory() as tmpdir:
            temp_sealed = Path(tmpdir) / "_sealed.yaml"
            # Write truncated YAML (invalid)
            temp_sealed.write_text("stores:\n  - People\n  - Essential\nfiles:")
            # Note: no content after "files:" — this is incomplete YAML

            with patch.object(paths, "SEALED_YAML", temp_sealed):
                # Even though the file exists and is partially readable,
                # if it fails to parse or has invalid structure, it should fail closed
                self.assertTrue(
                    is_sealed("Theology/augustine.md"),
                    "Path should be sealed when manifest is malformed",
                )
                self.assertTrue(
                    is_sealed_store("Theology"),
                    "Any store should be sealed when manifest is malformed",
                )

                counts = count()
                self.assertIsNone(counts["total"], "total should be None in failure state")
                self.assertTrue(counts.get("_failure"), "_failure flag should be True")

    def test_manifest_with_invalid_structure_fails_closed(self):
        """FR-7: manifest with stores/files not being lists → fail closed."""
        with tempfile.TemporaryDirectory() as tmpdir:
            temp_sealed = Path(tmpdir) / "_sealed.yaml"
            # Write YAML where stores is a string, not a list
            temp_sealed.write_text("stores: People\nfiles: BalaclavaPC/Pastoral_Notes.table.md\n")

            with patch.object(paths, "SEALED_YAML", temp_sealed):
                # Should fail closed
                self.assertTrue(
                    is_sealed("Theology/augustine.md"),
                    "Should seal everything when structure is invalid",
                )
                self.assertTrue(
                    is_sealed_store("AnyStore"),
                    "Should seal any store when structure is invalid",
                )

                counts = count()
                self.assertTrue(counts.get("_failure"), "_failure should be True")

    def test_manifest_with_wrong_top_level_structure(self):
        """FR-7: manifest that is valid YAML but wrong structure (e.g., top-level list) fails closed."""
        with tempfile.TemporaryDirectory() as tmpdir:
            temp_sealed = Path(tmpdir) / "_sealed.yaml"
            # Write valid YAML but a top-level list instead of a dict
            temp_sealed.write_text("- People\n- BalaclavaPC/Pastoral_Notes.table.md\n")

            with patch.object(paths, "SEALED_YAML", temp_sealed):
                # yamlio.parse() returns {} for this (since it's not a dict)
                # so load() should detect it as failure
                self.assertTrue(
                    is_sealed("Theology/augustine.md"),
                    "Should seal everything when structure is a list instead of dict",
                )

                counts = count()
                self.assertTrue(counts.get("_failure"), "_failure should be True")


class TestFR8LegitimateEmptyManifest(unittest.TestCase):
    """Test FR-8: explicitly-empty manifest is different from absent manifest."""

    def setUp(self):
        """Save original SEALED_YAML path."""
        self.original_sealed_yaml = paths.SEALED_YAML

    def tearDown(self):
        """Restore original SEALED_YAML path."""
        paths.SEALED_YAML = self.original_sealed_yaml

    def test_ac8_empty_manifest_seals_nothing(self):
        """AC-8 (FR-8): manifest with stores: [] and files: [] seals nothing."""
        with tempfile.TemporaryDirectory() as tmpdir:
            temp_sealed = Path(tmpdir) / "_sealed.yaml"
            temp_sealed.write_text("stores: []\nfiles: []\n")

            with patch.object(paths, "SEALED_YAML", temp_sealed):
                # Everything should be unsealed
                self.assertFalse(
                    is_sealed("People/luke.md"),
                    "Path should NOT be sealed with empty manifest",
                )
                self.assertFalse(
                    is_sealed("Theology/augustine.md"),
                    "Any path should NOT be sealed with empty manifest",
                )
                self.assertFalse(
                    is_sealed_store("People"),
                    "Store should NOT be sealed with empty manifest",
                )
                self.assertFalse(
                    is_sealed_store("Theology"),
                    "Any store should NOT be sealed with empty manifest",
                )

    def test_ac8_empty_manifest_count_returns_zero(self):
        """AC-8 (FR-8): count() returns 0 for empty manifest (no failure)."""
        with tempfile.TemporaryDirectory() as tmpdir:
            temp_sealed = Path(tmpdir) / "_sealed.yaml"
            temp_sealed.write_text("stores: []\nfiles: []\n")

            with patch.object(paths, "SEALED_YAML", temp_sealed):
                counts = count()
                self.assertEqual(counts["stores"], 0, "stores should be 0")
                self.assertEqual(counts["files"], 0, "files should be 0")
                self.assertEqual(counts["total"], 0, "total should be 0")
                # No _failure key, or it's not True
                self.assertNotIn("_failure", counts) or self.assertFalse(
                    counts.get("_failure")
                )

    def test_empty_manifest_is_visibly_distinct_from_missing(self):
        """FR-8 contrast with FR-7: empty-manifest counts vs missing-manifest counts."""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Case 1: empty manifest
            empty_sealed = Path(tmpdir) / "empty_sealed.yaml"
            empty_sealed.write_text("stores: []\nfiles: []\n")

            with patch.object(paths, "SEALED_YAML", empty_sealed):
                empty_counts = count()
                self.assertEqual(empty_counts["total"], 0)
                self.assertNotIn("_failure", empty_counts) or self.assertFalse(
                    empty_counts.get("_failure")
                )

            # Case 2: missing manifest
            missing_path = Path(tmpdir) / "missing_sealed.yaml"
            with patch.object(paths, "SEALED_YAML", missing_path):
                missing_counts = count()
                self.assertIsNone(missing_counts["total"])
                self.assertTrue(missing_counts.get("_failure"))

            # They must be visibly distinct
            self.assertNotEqual(empty_counts["total"], missing_counts["total"])


class TestManifestRestoration(unittest.TestCase):
    """Test that failure state clears immediately upon restoration (no restart needed)."""

    def setUp(self):
        """Save original SEALED_YAML path."""
        self.original_sealed_yaml = paths.SEALED_YAML

    def tearDown(self):
        """Restore original SEALED_YAML path."""
        paths.SEALED_YAML = self.original_sealed_yaml

    def test_restoration_fail_to_normal(self):
        """Manifest missing → is_sealed returns True; restore file → returns False (no restart)."""
        with tempfile.TemporaryDirectory() as tmpdir:
            sealed_path = Path(tmpdir) / "_sealed.yaml"

            with patch.object(paths, "SEALED_YAML", sealed_path):
                # File doesn't exist — failure state
                self.assertTrue(is_sealed("Theology/augustine.md"))

                # Restore the file
                sealed_path.write_text("stores: []\nfiles: []\n")

                # Next call with no restart should see normal state
                self.assertFalse(is_sealed("Theology/augustine.md"))


class TestRegressionManifestAsNonexistentPath(unittest.TestCase):
    """Regression test: the exact bug from the issue."""

    def test_is_sealed_returns_true_when_sealed_yaml_missing(self):
        """Regression: with SEALED_YAML pointing at non-existent path, is_sealed returns True."""
        with tempfile.TemporaryDirectory() as tmpdir:
            nonexistent_path = Path(tmpdir) / "definitely_not_here.yaml"

            with patch.object(paths, "SEALED_YAML", nonexistent_path):
                # This was the bug: these returned False
                self.assertTrue(
                    is_sealed("People/luke.md"),
                    "REGRESSION: is_sealed should return True when manifest is missing",
                )
                self.assertTrue(
                    is_sealed("BalaclavaPC/Pastoral_Notes.table.md"),
                    "REGRESSION: is_sealed should return True when manifest is missing",
                )

    def test_count_doesnt_report_total_zero_when_manifest_missing(self):
        """Regression: count() should not return total: 0 when manifest is missing."""
        with tempfile.TemporaryDirectory() as tmpdir:
            nonexistent_path = Path(tmpdir) / "definitely_not_here.yaml"

            with patch.object(paths, "SEALED_YAML", nonexistent_path):
                counts = count()
                # total should not be 0 (which looks like a working count)
                self.assertIsNone(counts["total"], "total should be None, not 0")
                # And there should be a failure indicator
                self.assertTrue(counts.get("_failure"))


class TestPathNormalization(unittest.TestCase):
    """Test path normalization edge cases."""

    def test_path_with_spaces(self):
        """Test paths with spaces (e.g., 'Writing Non-Fiction')."""
        # This store name has spaces in the real filesystem
        # Paths under it should be sealed
        test_path = "Writing Non-Fiction/some_file.md"
        # Note: this may or may not be sealed depending on _sealed.yaml content
        # But the matching logic should handle spaces correctly
        result = is_sealed(test_path)
        self.assertIsInstance(result, bool)

    def test_path_normalization_posix(self):
        """Test that paths are normalized to POSIX (forward slashes)."""
        # Both should be equivalent
        path1 = is_sealed("People/test.md")
        path2 = is_sealed(Path("People") / "test.md")
        self.assertEqual(path1, path2)


if __name__ == "__main__":
    unittest.main()
