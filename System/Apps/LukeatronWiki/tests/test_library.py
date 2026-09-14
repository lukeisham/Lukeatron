"""
Test suite for library.py — the single read chokepoint for Long-Term / LukeatronWiki.

Covers AC-1 through AC-6 (library.spec.md), the traversal-escape guard, the
sealed-vs-unresolved wikilink distinction, a real-filesystem sanity check
(len(list_stores()) == 33, no sealed store present), and the §6
direct-disk-access grep check from CONTRACT.md.

Tests build a tempfile fixture tree that mimics the real Memory/Long-Term/
layout and monkey-patch the `paths` module's constants at it — no test here
writes anywhere under the real Memory/.
"""

import os
import re
import shutil
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).parent.parent))

import paths
import seal
import library


APP_DIR = Path(__file__).parent.parent


def _write(path: Path, text: str):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


class LibraryFixtureTestCase(unittest.TestCase):
    """
    Base class: builds a temp tree shaped like Memory/Long-Term/ +
    LukeatronWiki/, and monkey-patches every paths.* constant library.py
    reads through. Every subclass gets a fresh fixture per test.
    """

    def setUp(self):
        self.tmpdir = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmpdir.cleanup)
        # Resolve up front: on macOS /var is itself a symlink to /private/var,
        # and seal.py's own path-normalisation resolves paths before comparing
        # them to paths.LT. If paths.LT were left unresolved here, a resolved
        # child path would no longer sit under it (relative_to() would raise),
        # producing false "not sealed" results that have nothing to do with
        # library.py's own logic. Resolving once here keeps the fixture
        # consistent with how every module actually compares paths.
        root = Path(self.tmpdir.name).resolve()

        self.lt = root / "Memory" / "Long-Term"
        self.wiki = self.lt / "LukeatronWiki"
        self.nodes = self.wiki / "Nodes"
        self.media = self.wiki / "_media"
        self.sealed_yaml = self.wiki / "_sealed.yaml"
        self.index_yaml = self.wiki / "_index.yaml"
        self.queue_yaml = self.wiki / "_queue.yaml"

        # ---- subject stores -------------------------------------------------
        _write(self.lt / "Theology" / "theology.md", "Theology store content.\n")
        _write(self.lt / "Sociology" / "sociology.md", "Sociology store content.\n")
        _write(self.lt / "Mixed" / "open.md", "Open mixed-store file.\n")
        _write(self.lt / "Mixed" / "sealed_file.md", "Individually sealed file body.\n")
        (self.lt / "EmptyStore").mkdir(parents=True, exist_ok=True)
        _write(self.lt / "SealedStore" / "secret.md", "Should never be read.\n")
        # a hidden OS file that must never show up in a listing
        _write(self.lt / "Theology" / ".DS_Store", "junk")
        # a binary file that must not crash decoding
        (self.lt / "Theology" / "image.png").write_bytes(b"\x89PNG\r\n\x1a\n\xff\xfe\x00\x01")

        # ---- nested files (the defect being fixed) ---------------------------
        # A real subfolder, any depth, unsealed store.
        _write(self.lt / "Theology" / "Sub Folder" / "nested topic.md", "Nested theology content.\n")
        _write(self.lt / "Mixed" / "Deep" / "deeper.md", "Deeply nested open file.\n")
        # A nested file inside a wholly-sealed store must still be sealed.
        _write(self.lt / "SealedStore" / "Nested" / "still_secret.md", "Should never be read either.\n")
        # A hidden dotfile *inside* a subfolder must be excluded too, not
        # just at the store's top level.
        _write(self.lt / "Theology" / "Sub Folder" / ".DS_Store", "junk")
        # Real awkward names from this repo: a leading-space folder name and
        # a colon in a filename, both nested.
        _write(
            self.lt / "Weird" / " Marketing and Ministry Plan" / "notes:extra.md",
            "Awkward-name content.\n",
        )
        # BalaclavaPC-shaped fixture: a file-level seal on one file, with a
        # nested sibling file that must stay readable (the one place a
        # file-level seal and an unsealed parent store coexist for real).
        _write(self.lt / "BalaclavaPC" / "Pastoral_Notes.table.md", "SEALED pastoral log body.\n")
        _write(self.lt / "BalaclavaPC" / "Bible_Studies" / "study1.md", "An ordinary Bible study note.\n")

        # ---- sealed manifest --------------------------------------------------
        _write(
            self.sealed_yaml,
            "stores:\n  - SealedStore\n"
            "files:\n"
            "  - Mixed/sealed_file.md\n"
            "  - BalaclavaPC/Pastoral_Notes.table.md\n",
        )

        # ---- _index.yaml (themes only need folder + hub_slug for our tests) --
        _write(
            self.index_yaml,
            "wiki: LukeatronWiki\n"
            "type: wiki-page-index\n"
            "themes:\n"
            "  - name: \"Theology\"\n"
            "    folder: \"Memory/Long-Term/Theology\"\n"
            "    hub_slug: \"theology\"\n"
            "  - name: \"Sociology\"\n"
            "    folder: \"Memory/Long-Term/Sociology\"\n"
            "    hub_slug: \"sociology\"\n",
        )

        # ---- _queue.yaml -------------------------------------------------------
        _write(
            self.queue_yaml,
            "wiki: LukeatronWiki\n"
            "items:\n"
            "  - id: q-001\n"
            "    title: \"Some queued thing\"\n"
            "    kind: article\n"
            "    intent: read\n"
            "    status: queued\n",
        )

        # ---- media --------------------------------------------------------------
        (self.media).mkdir(parents=True, exist_ok=True)
        (self.media / "thumb.png").write_bytes(b"\x89PNG\r\n\x1a\n fake bytes")

        # ---- nodes ---------------------------------------------------------------
        _write(
            self.nodes / "theology.md",
            '---\n'
            'slug: "theology"\n'
            'title: "Theology"\n'
            'type: theme\n'
            'tags: [theology]\n'
            'related: [sociology]\n'
            'longterm_refs:\n'
            '  - "Theology store :: Theology/theology.md"\n'
            'updated: 2026-01-01\n'
            '---\n\n'
            '# Theology\n\n'
            '## See Also\n'
            '- [[sociology]]\n',
        )
        _write(
            self.nodes / "sociology.md",
            '---\n'
            'slug: "sociology"\n'
            'title: "Sociology"\n'
            'type: theme\n'
            'tags: [sociology]\n'
            'related: [theology]\n'
            'longterm_refs:\n'
            '  - "Sociology store :: Sociology/sociology.md"\n'
            'updated: 2026-01-01\n'
            '---\n\n'
            '# Sociology\n\n'
            '## See Also\n'
            '- [[theology]]\n'
            '- [[missing-page]]\n',
        )
        # A node whose only ref points at a sealed file -> fully sealed link.
        _write(
            self.nodes / "fully-sealed.md",
            '---\n'
            'slug: "fully-sealed"\n'
            'title: "Fully Sealed"\n'
            'type: theme\n'
            'longterm_refs:\n'
            '  - "Sealed ref :: Mixed/sealed_file.md"\n'
            '---\n\n'
            '# Fully Sealed\n',
        )
        # A node with a mix of sealed and unsealed refs -> NOT fully sealed.
        _write(
            self.nodes / "mixed-node.md",
            '---\n'
            'slug: "mixed-node"\n'
            'title: "Mixed Node"\n'
            'type: theme\n'
            'longterm_refs:\n'
            '  - "Sealed ref :: Mixed/sealed_file.md"\n'
            '  - "Open ref :: Mixed/open.md"\n'
            '---\n\n'
            '# Mixed Node\n'
            '- [[theology]]\n',
        )

        # ---- apply the monkey-patch -----------------------------------------
        self._patches = [
            patch.object(paths, "LT", self.lt),
            patch.object(paths, "WIKI", self.wiki),
            patch.object(paths, "NODES", self.nodes),
            patch.object(paths, "SEALED_YAML", self.sealed_yaml),
            patch.object(paths, "INDEX_YAML", self.index_yaml),
            patch.object(paths, "QUEUE_YAML", self.queue_yaml),
            patch.object(paths, "MEDIA", self.media),
        ]
        for p in self._patches:
            p.start()
            self.addCleanup(p.stop)


class TestAC1SealedFileReturnsSentinel(LibraryFixtureTestCase):
    """AC-1: read_store_file on a sealed path returns the SEALED sentinel, never bytes."""

    def test_sealed_whole_store(self):
        result = library.read_store_file("SealedStore", "secret.md")
        self.assertIs(result, library.SEALED)

    def test_sealed_individual_file(self):
        result = library.read_store_file("Mixed", "sealed_file.md")
        self.assertIs(result, library.SEALED)

    def test_unsealed_file_returns_dict_with_verbatim_text(self):
        result = library.read_store_file("Theology", "theology.md")
        self.assertIsInstance(result, dict)
        self.assertEqual(result["text"], "Theology store content.\n")
        self.assertFalse(result.get("binary"))


class TestAC2ListStoreSealedReturnsNothing(LibraryFixtureTestCase):
    """AC-2: list_store on a sealed store returns None, not an empty-with-reason value."""

    def test_sealed_store_returns_none(self):
        self.assertIsNone(library.list_store("SealedStore"))

    def test_unsealed_store_returns_list(self):
        result = library.list_store("Theology")
        self.assertIsInstance(result, list)
        filenames = {f["filename"] for f in result}
        # hidden OS junk excluded, binary file included, sealed file (n/a here) fine
        self.assertIn("theology.md", filenames)
        self.assertIn("image.png", filenames)
        self.assertNotIn(".DS_Store", filenames)

    def test_sealed_individual_file_omitted_from_otherwise_open_store(self):
        result = library.list_store("Mixed")
        filenames = {f["filename"] for f in result}
        self.assertIn("open.md", filenames)
        self.assertNotIn("sealed_file.md", filenames)


class TestAC3BacklinksLiveAndStable(LibraryFixtureTestCase):
    """AC-3: backlinks() called twice with no change is identical, and sees a same-session edit."""

    def test_stable_across_two_calls(self):
        first = library.backlinks("theology")
        second = library.backlinks("theology")
        self.assertEqual(first, second)

    def test_backlinks_found(self):
        result = library.backlinks("theology")
        slugs = {b["slug"] for b in result}
        self.assertIn("sociology", slugs)
        self.assertIn("mixed-node", slugs)
        self.assertNotIn("theology", slugs)  # never includes the target itself

    def test_reflects_same_session_edit_no_restart(self):
        # Add a brand-new node linking to "theology" after the fixture was built.
        _write(
            self.nodes / "new-linker.md",
            '---\nslug: "new-linker"\ntitle: "New Linker"\ntype: theme\n---\n\n[[theology]]\n',
        )
        result = library.backlinks("theology")
        slugs = {b["slug"] for b in result}
        self.assertIn("new-linker", slugs)

    def test_fully_sealed_node_excluded_from_backlinks(self):
        # fully-sealed.md doesn't link to theology, but confirm it never appears
        # for any target, and mixed-node.md (partially sealed) still counts.
        result = library.backlinks("theology")
        slugs = {b["slug"] for b in result}
        self.assertNotIn("fully-sealed", slugs)


class TestAC4ContentsPageZeroNodeStore(LibraryFixtureTestCase):
    """AC-4: a store with zero wiki nodes returns a non-empty contents_page() file listing."""

    def test_store_with_files_but_no_hub_node(self):
        result = library.contents_page("Mixed")
        self.assertEqual(result["state"], "awaiting-node")
        self.assertTrue(len(result["files"]) > 0)

    def test_store_with_hub_node(self):
        result = library.contents_page("Theology")
        self.assertEqual(result["state"], "has-node")
        self.assertTrue(len(result["files"]) > 0)

    def test_empty_store(self):
        result = library.contents_page("EmptyStore")
        self.assertEqual(result["state"], "empty")
        self.assertEqual(result["files"], [])

    def test_sealed_store_returns_sentinel(self):
        result = library.contents_page("SealedStore")
        self.assertIs(result, library.SEALED)


class TestAC5IntegrityCountsMatchesSeal(LibraryFixtureTestCase):
    """AC-5: integrity_counts()'s sealed figure matches seal.count() exactly, every run."""

    def test_matches(self):
        counts = library.integrity_counts()
        self.assertEqual(counts["sealed"], seal.count()["total"])

    def test_matches_again_after_edit(self):
        _write(self.sealed_yaml, "stores:\n  - SealedStore\n  - EmptyStore\nfiles:\n  - Mixed/sealed_file.md\n")
        counts = library.integrity_counts()
        self.assertEqual(counts["sealed"], seal.count()["total"])
        self.assertEqual(counts["sealed"], 3)


class TestAC6NoCacheEditReflected(LibraryFixtureTestCase):
    """AC-6: editing a store file on disk and re-reading (no restart) returns the new content."""

    def test_edit_reflected_immediately(self):
        first = library.read_store_file("Theology", "theology.md")
        self.assertEqual(first["text"], "Theology store content.\n")

        _write(self.lt / "Theology" / "theology.md", "EDITED verbatim content.\n")

        second = library.read_store_file("Theology", "theology.md")
        self.assertEqual(second["text"], "EDITED verbatim content.\n")


class TestTraversalSafety(LibraryFixtureTestCase):
    """Untrusted filename off a URL must never escape its store folder."""

    def test_dotdot_rejected(self):
        self.assertIsNone(library.read_store_file("Theology", "../SealedStore/secret.md"))

    def test_dotdot_in_store_rejected(self):
        self.assertIsNone(library.read_store_file("../SealedStore", "secret.md"))

    def test_absolute_path_filename_rejected(self):
        self.assertIsNone(library.read_store_file("Theology", "/etc/passwd"))

    def test_nested_dotdot_escape_to_another_unsealed_store_rejected(self):
        # A nested path is now ALLOWED (see TestNestedPaths) — but ".." in
        # any segment of that nested path must still be refused, at any
        # depth, not just at the top level. Escaping to a DIFFERENT,
        # unsealed store proves this is the traversal guard doing the
        # rejecting (not a side effect of landing on sealed material,
        # which is covered separately below).
        self.assertIsNone(library.read_store_file("Theology", "Sub Folder/../../Mixed/open.md"))
        self.assertIsNone(library.read_store_file("Theology", "a/../../b"))

    def test_nested_dotdot_escape_landing_on_sealed_store_is_denied_too(self):
        # A ".." escape that happens to resolve into a SEALED store is
        # still denied — seal.is_sealed() normalises (and so resolves) the
        # requested path before the traversal check ever runs, so this
        # particular shape is caught earlier and returns SEALED rather
        # than None. Either sentinel is a refusal (FR-9: never content for
        # a sealed path under any name); this test pins that behaviour
        # rather than assuming a specific sentinel.
        result = library.read_store_file("Theology", "Sub Folder/../../SealedStore/secret.md")
        self.assertIn(result, (None, library.SEALED))
        self.assertNotIsInstance(result, dict)

    def test_backslash_rejected(self):
        # Backslash is never a legitimate separator on this filesystem;
        # also the shape of a Windows-style path or UNC prefix.
        self.assertIsNone(library.read_store_file("Theology", "sub\\evil.md"))

    def test_drive_letter_prefix_rejected(self):
        self.assertIsNone(library.read_store_file("Theology", "C:/Windows/win.ini"))

    def test_symlink_escape_rejected(self):
        outside = Path(self.tmpdir.name) / "outside_secret.md"
        outside.write_text("outside the fence")
        link = self.lt / "Theology" / "escape_link.md"
        try:
            link.symlink_to(outside)
        except (OSError, NotImplementedError):
            self.skipTest("symlinks not supported on this filesystem")
        self.assertIsNone(library.read_store_file("Theology", "escape_link.md"))

    def test_nonexistent_file_returns_none_not_crash(self):
        self.assertIsNone(library.read_store_file("Theology", "does-not-exist.md"))

    def test_symlink_escape_via_nested_subfolder_rejected(self):
        # The same symlink escape, but reached through a nested subpath —
        # confirms containment is checked on the fully resolved path, not
        # just at the top level of the store.
        outside = Path(self.tmpdir.name) / "outside_secret_2.md"
        outside.write_text("outside the fence, reached via a subfolder")
        link = self.lt / "Theology" / "Sub Folder" / "escape_link.md"
        try:
            link.symlink_to(outside)
        except (OSError, NotImplementedError):
            self.skipTest("symlinks not supported on this filesystem")
        self.assertIsNone(library.read_store_file("Theology", "Sub Folder/escape_link.md"))


class TestNestedPaths(LibraryFixtureTestCase):
    """
    The defect being fixed: a relative subpath under a store is a normal,
    supported request — only an actual escape is refused. These tests are
    the allow-side counterpart to TestTraversalSafety's reject-side cases.
    """

    def test_nested_file_readable(self):
        result = library.read_store_file("Theology", "Sub Folder/nested topic.md")
        self.assertIsInstance(result, dict)
        self.assertEqual(result["text"], "Nested theology content.\n")

    def test_deeply_nested_file_readable(self):
        result = library.read_store_file("Mixed", "Deep/deeper.md")
        self.assertIsInstance(result, dict)
        self.assertEqual(result["text"], "Deeply nested open file.\n")

    def test_nested_file_in_sealed_store_returns_sealed_sentinel(self):
        result = library.read_store_file("SealedStore", "Nested/still_secret.md")
        self.assertIs(result, library.SEALED)

    def test_leading_space_folder_and_colon_filename_round_trip(self):
        result = library.read_store_file("Weird", " Marketing and Ministry Plan/notes:extra.md")
        self.assertIsInstance(result, dict)
        self.assertEqual(result["text"], "Awkward-name content.\n")

    def test_list_store_finds_nested_files(self):
        result = library.list_store("Theology")
        filenames = {f["filename"] for f in result}
        self.assertIn("Sub Folder/nested topic.md", filenames)
        # dotfile inside the subfolder still excluded
        self.assertNotIn("Sub Folder/.DS_Store", filenames)

    def test_list_store_result_round_trips_through_read_store_file(self):
        result = library.list_store("Theology")
        row = next(f for f in result if f["filename"] == "Sub Folder/nested topic.md")
        readback = library.read_store_file("Theology", row["filename"])
        self.assertIsInstance(readback, dict)
        self.assertEqual(readback["text"], "Nested theology content.\n")

    def test_file_count_includes_nested_files(self):
        stores = {s["folder"]: s for s in library.list_stores()}
        # Theology: theology.md + image.png + "Sub Folder/nested topic.md";
        # .DS_Store at either level excluded.
        self.assertEqual(stores["Theology"]["file_count"], 3)

    def test_contents_page_includes_nested_files(self):
        result = library.contents_page("Mixed")
        filenames = {f["filename"] for f in result["files"]}
        self.assertIn("Deep/deeper.md", filenames)

    def test_pastoral_notes_sealed_sibling_nested_file_readable(self):
        # The one place a file-level seal and an unsealed parent coexist:
        # the sealed file itself stays sealed...
        sealed_result = library.read_store_file("BalaclavaPC", "Pastoral_Notes.table.md")
        self.assertIs(sealed_result, library.SEALED)
        # ...while a nested sibling in the same (unsealed) store store stays
        # readable.
        sibling_result = library.read_store_file("BalaclavaPC", "Bible_Studies/study1.md")
        self.assertIsInstance(sibling_result, dict)
        self.assertEqual(sibling_result["text"], "An ordinary Bible study note.\n")

    def test_pastoral_notes_omitted_from_listing_sibling_present(self):
        result = library.list_store("BalaclavaPC")
        filenames = {f["filename"] for f in result}
        self.assertNotIn("Pastoral_Notes.table.md", filenames)
        self.assertIn("Bible_Studies/study1.md", filenames)


class TestBinaryFileHandling(LibraryFixtureTestCase):
    """A non-UTF-8 file must not crash and must not be mangled with a wrong codec."""

    def test_binary_file_returns_dict_with_none_text(self):
        result = library.read_store_file("Theology", "image.png")
        self.assertIsInstance(result, dict)
        self.assertIsNone(result["text"])
        self.assertTrue(result["binary"])


class TestResolveWikilinkThreeStates(LibraryFixtureTestCase):
    """FR-4: resolve_wikilink returns exactly one of live / sealed / unresolved."""

    def test_live(self):
        result = library.resolve_wikilink("theology")
        self.assertEqual(result["state"], "live")
        self.assertEqual(result["title"], "Theology")

    def test_unresolved(self):
        result = library.resolve_wikilink("no-such-slug")
        self.assertEqual(result["state"], "unresolved")

    def test_sealed_never_unresolved(self):
        # "fully-sealed" node exists but every ref is sealed -> must read as
        # sealed, NEVER unresolved (which would reveal it exists) and never live.
        result = library.resolve_wikilink("fully-sealed")
        self.assertEqual(result["state"], "sealed")

    def test_sealed_store_hub_slug_sealed_even_with_no_node_file(self):
        # "sealedstore" has no node file at all, but its slug names a sealed
        # store's hub -> must resolve sealed, not unresolved.
        result = library.resolve_wikilink("sealedstore")
        self.assertEqual(result["state"], "sealed")

    def test_partially_sealed_node_is_live(self):
        result = library.resolve_wikilink("mixed-node")
        self.assertEqual(result["state"], "live")


class TestListStoresAndListStore(LibraryFixtureTestCase):
    def test_list_stores_excludes_sealed_and_wiki_control_surface(self):
        stores = library.list_stores()
        names = {s["folder"] for s in stores}
        self.assertNotIn("SealedStore", names)
        self.assertNotIn("LukeatronWiki", names)
        self.assertIn("Theology", names)
        self.assertIn("EmptyStore", names)

    def test_hub_slug_populated_from_index(self):
        stores = {s["folder"]: s for s in library.list_stores()}
        self.assertEqual(stores["Theology"]["hub_slug"], "theology")
        self.assertIsNone(stores["Mixed"]["hub_slug"])

    def test_file_count(self):
        stores = {s["folder"]: s for s in library.list_stores()}
        # theology.md + image.png + "Sub Folder/nested topic.md"; both the
        # top-level and the nested .DS_Store are excluded (recursive count,
        # see TestNestedPaths.test_file_count_includes_nested_files).
        self.assertEqual(stores["Theology"]["file_count"], 3)


class TestReadNode(LibraryFixtureTestCase):
    def test_missing_node_returns_none(self):
        self.assertIsNone(library.read_node("no-such-slug"))

    def test_node_shape(self):
        node = library.read_node("theology")
        for key in ("slug", "title", "fm", "body", "longterm_refs", "wikilinks",
                    "emoji", "type", "format", "status", "tags", "updated", "thumbnail"):
            self.assertIn(key, node)
        self.assertEqual(node["slug"], "theology")
        self.assertEqual(node["wikilinks"], ["sociology"])
        self.assertEqual(node["longterm_refs"][0]["relpath"], "Theology/theology.md")
        self.assertFalse(node["longterm_refs"][0]["sealed"])

    def test_ref_sealed_flag_set(self):
        node = library.read_node("fully-sealed")
        self.assertTrue(node["longterm_refs"][0]["sealed"])


class TestListNodesSealFiltered(LibraryFixtureTestCase):
    def test_fully_sealed_node_excluded(self):
        slugs = {n["slug"] for n in library.list_nodes()}
        self.assertNotIn("fully-sealed", slugs)
        self.assertIn("theology", slugs)
        self.assertIn("mixed-node", slugs)  # partially sealed still shown


class TestQueueIndexMediaGracefulEmpty(LibraryFixtureTestCase):
    """FR-10: missing/malformed control files degrade to empty, never an exception."""

    def test_read_queue_normal(self):
        result = library.read_queue()
        self.assertEqual(len(result["items"]), 1)

    def test_read_queue_missing_file(self):
        self.queue_yaml.unlink()
        result = library.read_queue()
        self.assertEqual(result, {"items": []})

    def test_read_index_normal(self):
        result = library.read_index()
        self.assertEqual(len(result["themes"]), 2)

    def test_read_index_missing_file(self):
        self.index_yaml.unlink()
        result = library.read_index()
        self.assertEqual(result["themes"], [])
        self.assertEqual(result["tags"], {})
        self.assertEqual(result["pages"], [])

    def test_media_bytes_found(self):
        result = library.media_bytes("thumb.png")
        self.assertIsNotNone(result)
        data, mimetype = result
        self.assertTrue(len(data) > 0)
        self.assertEqual(mimetype, "image/png")

    def test_media_bytes_missing_file(self):
        self.assertIsNone(library.media_bytes("no-such-thumb.png"))

    def test_media_bytes_missing_dir(self):
        shutil.rmtree(self.media)
        self.assertIsNone(library.media_bytes("thumb.png"))

    def test_media_bytes_traversal_rejected(self):
        self.assertIsNone(library.media_bytes("../_sealed.yaml"))


class TestIntegrityCountsBasics(LibraryFixtureTestCase):
    def test_shape(self):
        counts = library.integrity_counts()
        for key in ("stores", "files", "rendered", "sealed", "unindexed",
                    "dead_links", "one_way_edges"):
            self.assertIn(key, counts)

    def test_dead_link_detected(self):
        counts = library.integrity_counts()
        # sociology.md links to [[missing-page]], which resolves unresolved
        self.assertGreaterEqual(counts["dead_links"], 1)


# ============================================================================
# Real-filesystem sanity check (read-only) — catches drift between the
# fixture above and the real Memory/Long-Term/ tree.
# ============================================================================


class TestRealFilesystemDrift(unittest.TestCase):
    """No monkey-patching here: exercises library.py against the real,
    on-disk Memory/Long-Term/. Read-only — makes no writes anywhere."""

    def test_33_unsealed_stores_no_sealed_store_present(self):
        stores = library.list_stores()
        self.assertEqual(len(stores), 33, f"expected 33 unsealed stores, got {len(stores)}")

        sealed_manifest = seal.load()
        folders = {s["folder"] for s in stores}
        for sealed_store in sealed_manifest["stores"]:
            self.assertNotIn(
                sealed_store, folders,
                f"sealed store {sealed_store!r} must not appear in list_stores()",
            )
        self.assertNotIn("LukeatronWiki", folders)


# ============================================================================
# §6 risk-row grep check (CONTRACT.md / library.spec.md §6): no module other
# than library.py/seal.py may open a Memory/Long-Term or LukeatronWiki path
# directly. paths.py is exempt too — it is the canonical, contract-mandated
# home for those literals (it only ever constructs Path objects as module
# constants; it never opens a file itself).
# ============================================================================


class TestNoDirectDiskAccessOutsideLibrary(unittest.TestCase):
    EXEMPT = {"library.py", "seal.py", "paths.py"}

    def test_grep_for_direct_reads(self):
        offenders = []
        for py_file in sorted(APP_DIR.glob("*.py")):
            if py_file.name in self.EXEMPT:
                continue
            if not py_file.is_file():
                continue
            text = py_file.read_text(encoding="utf-8")
            # Deliberately narrow: a bare mention of "LukeatronWiki" in prose
            # (a docstring, a comment) is not evidence of a disk read — only
            # a literal Memory/Long-Term path or actual use of one of
            # paths.py's own path constants counts.
            mentions_target = ("Memory/Long-Term" in text) or (
                "paths.LT" in text or "paths.WIKI" in text or "paths.NODES" in text
                or "paths.SEALED_YAML" in text or "paths.INDEX_YAML" in text
                or "paths.QUEUE_YAML" in text or "paths.MEDIA" in text
            )
            has_direct_open = bool(re.search(r"\bopen\s*\(", text)) or bool(
                re.search(r"\bPath\s*\(", text)
            )
            if mentions_target and has_direct_open:
                offenders.append(py_file.name)

        self.assertEqual(
            offenders, [],
            f"Found direct disk access outside library.py/seal.py: {offenders}",
        )

    def test_render_and_search_skip_gracefully_if_absent(self):
        # render.py / search.py / capture.py / enrich.py / server.py are being
        # written by other agents concurrently — this test must not fail just
        # because they don't exist yet.
        for name in ("render.py", "search.py", "capture.py", "enrich.py", "server.py"):
            path = APP_DIR / name
            if not path.exists():
                continue  # skip gracefully, per the build brief
            self.assertTrue(path.is_file())


# ============================================================================
# Regression test for the measured defect: 24 of 89 longterm_refs across the
# 28 rebuilt wiki nodes were unreadable before this fix (nested paths under a
# store were refused outright). Runs against the REAL, on-disk
# Memory/Long-Term/ (read-only, no monkey-patching) because the whole point
# is to prove the actual repo's actual nested files are now reachable.
#
# The rebuilt nodes live in a Sandbox staging folder, not in the real
# LukeatronWiki/Nodes/ yet (they are pending promotion and may move) — so
# this test parses their frontmatter directly with library's own
# frontmatter/ref helpers, rather than going through library.read_node()
# (which only ever looks in the real Nodes/ folder).
# ============================================================================


class TestRealFilesystemZeroDeadRefs(unittest.TestCase):
    """No monkey-patching — exercises library.py against the real, on-disk
    Memory/Long-Term/. Read-only. Skips gracefully if the rebuilt-nodes
    sandbox folder is absent (it is a pending-promotion staging area, not a
    permanent fixture of this project)."""

    REBUILD_NODES_DIR = (
        paths.ROOT / "System" / "Sandbox" / "LukeatronWiki" / "_nodes-rebuild" / "Nodes"
    )

    def test_every_unsealed_longterm_ref_is_readable(self):
        if not self.REBUILD_NODES_DIR.is_dir():
            self.skipTest(
                f"{self.REBUILD_NODES_DIR} not present — rebuilt nodes are "
                "pending promotion and may not exist/may have moved."
            )

        node_files = sorted(self.REBUILD_NODES_DIR.glob("*.md"))
        self.assertTrue(node_files, "expected at least one rebuilt node file")

        dead = []
        checked = 0
        for node_file in node_files:
            text = node_file.read_text(encoding="utf-8")
            fm, _body = library._split_frontmatter(text)
            refs = library._parse_longterm_refs(fm)
            for ref in refs:
                relpath = ref["relpath"]
                if not relpath:
                    continue
                if ref["sealed"]:
                    continue  # sealed refs are out of scope for "dead" — they're supposed to be denied
                checked += 1
                # relpath is "<Store>/<possibly/nested/filename>" relative to LT.
                if "/" not in relpath:
                    dead.append((node_file.name, relpath, "no store/filename separator"))
                    continue
                store, filename = relpath.split("/", 1)
                result = library.read_store_file(store, filename)
                if not isinstance(result, dict):
                    dead.append((node_file.name, relpath, repr(result)))

        self.assertGreater(checked, 0, "expected at least one unsealed longterm_ref to check")
        self.assertEqual(
            dead, [],
            f"{len(dead)} of {checked} unsealed longterm_refs are unreadable: {dead}",
        )


if __name__ == "__main__":
    unittest.main()
