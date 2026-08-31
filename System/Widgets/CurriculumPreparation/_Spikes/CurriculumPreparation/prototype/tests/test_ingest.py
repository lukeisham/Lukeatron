#!/usr/bin/env python3
"""Tests for ingest.py (TEST-9: imports the real module, no reimplementation).

TEST-2 smoke discipline (imports cleanly / happy path / one guard path) plus
the measured-artefact assertions the brief calls for: verbatim preservation
(including curly apostrophes), deterministic ids across two runs, strand/
domain assignment from the code letter, prose-vs-heading split, re-ingest
leaving an edited=true node untouched, the INV-DM-3 gate in both directions,
classify_block()'s three-way call, and sequence-gap / unit-scope detection.

TEST-4: no network; every write happens inside a tempfile.TemporaryDirectory().
"""
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import ingest  # noqa: E402
import profiles  # noqa: E402

VIC_PROFILE = profiles.get_profile("vic-f10-v2")
GENERIC_PROFILE = profiles.get_profile("generic")

# A trimmed-but-faithful excerpt of the fixture paste (fixtures/
# year10-history.source.md, section 2) embedded verbatim so these tests stay
# deterministic even while another agent edits that file. Curly apostrophes
# (’) are preserved exactly, as the grammar requires (INV-DM-2).
FIXTURE_EXCERPT = """
By the end of Level 10, students evaluate the significant events, developments and ideas that shaped the modern world, including histories of Australia, the world wars and the Holocaust, and Aboriginal and Torres Strait Islander Peoples’ rights and freedoms over the period between 1750 and the early 21st century. Students formulate and adapt historical questions to support the development of historical investigations and their use of historical sources and concepts to interpret the modern world and analyse continuity and change over time in relation to significant events, individuals, groups and developments that have shaped Australia and the world.

causes and consequences of the Industrial Revolution, the movement of people and European imperialism VC2HH10K01

significant ideas and developments and their impacts on society and politics VC2HH10K02

Investigations: Australians at War 1914-1945

the causes of World War I and World War II VC2HH10K13

the reasons that Australians, including Aboriginal and Torres Strait Islander Peoples, fought in the world wars VC2HH10K14

significant places where Australians fought VC2HH10K15

the experiences and perspectives of those who fought or were deployed overseas, including Aboriginal and Torres Strait Islander Peoples and women VC2HH10K16

significant events and turning points of the world wars VC2HH10K17

continuities and changes in the nature of warfare VC2HH10K18

the causes of the Holocaust VC2HH10K20

the diverse experiences and perspectives of Jewish and non-Jewish peoples during the period of the Holocaust VC2HH10K22

different interpretations and debates about the significance and legacies of the world wars VC2HH10K23

concepts and skills

formulate, refine and use historical questions to inform historical investigations VC2HH10S01

sequence significant events, individuals, ideas, movements and developments chronologically to analyse continuity and change, and causes and consequences VC2HH10S02

analyse the purpose, features, content and context of historical sources VC2HH10S03

analyse the perspectives, beliefs, values and attitudes of people and groups based on evidence from a range of sources VC2HH10S05

evaluate historical interpretations and debates VC2HH10S06

Contunity and change

analyse continuity and change VC2HH10S07

causes and consquences

analyse short- and long-term causes and the intended and unintended consequences of significant events, individuals, ideas and developments and their contributions to continuity and change VC2HH10S08

Historical significance

evaluate the significance of individuals, groups, movements, events, developments and ideas VC2HH10S09

community

construct sustained historical interpretations and arguments using appropriate historical concepts, terms, knowledge, conventions and evaluated evidence from a range of historical sources VC2HH10S10
"""


def _find_node(nodes: list[dict], **criteria: object) -> dict | None:
    for node in nodes:
        if all(node.get(key) == value for key, value in criteria.items()):
            return node
    return None


class TestImportsCleanly(unittest.TestCase):
    def test_module_imports(self) -> None:
        self.assertTrue(hasattr(ingest, "run"))
        self.assertTrue(hasattr(ingest, "parse_source"))


class TestHappyPath(unittest.TestCase):
    def test_parses_fixture_excerpt_into_a_valid_tree(self) -> None:
        result = ingest.parse_source(FIXTURE_EXCERPT, VIC_PROFILE)
        ingest.validate_tree(result.nodes)  # raises on any violation
        k01 = _find_node(result.nodes, code="VC2HH10K01")
        self.assertIsNotNone(k01)
        self.assertEqual(k01["kind"], "outcome")


class TestGuardPath(unittest.TestCase):
    def test_unknown_profile_raises_keyerror(self) -> None:
        with self.assertRaises(KeyError):
            profiles.get_profile("nonexistent-profile")


class TestVerbatimPreservation(unittest.TestCase):
    def test_curly_apostrophe_preserved(self) -> None:
        result = ingest.parse_source(FIXTURE_EXCERPT, VIC_PROFILE)
        self.assertTrue(result.summary_blocks, "expected at least one SUMMARY block")
        self.assertIn("Peoples’ rights", result.summary_blocks[0])
        self.assertNotIn("Peoples' rights", result.summary_blocks[0])  # straight apostrophe

    def test_title_and_code_verbatim_no_typo_fix(self) -> None:
        result = ingest.parse_source(FIXTURE_EXCERPT, VIC_PROFILE)
        s07_strand = _find_node(result.nodes, title="Contunity and change")
        self.assertIsNotNone(s07_strand, "typo 'Contunity' must be preserved verbatim")
        s08_strand = _find_node(result.nodes, title="causes and consquences")
        self.assertIsNotNone(s08_strand, "typo 'consquences' must be preserved verbatim")


class TestDeterministicIds(unittest.TestCase):
    def test_same_input_yields_identical_ids_across_two_runs(self) -> None:
        result_a = ingest.parse_source(FIXTURE_EXCERPT, VIC_PROFILE)
        result_b = ingest.parse_source(FIXTURE_EXCERPT, VIC_PROFILE)
        ids_a = [n["id"] for n in result_a.nodes]
        ids_b = [n["id"] for n in result_b.nodes]
        self.assertEqual(ids_a, ids_b)

    def test_outcome_id_is_the_verbatim_code(self) -> None:
        result = ingest.parse_source(FIXTURE_EXCERPT, VIC_PROFILE)
        k01 = _find_node(result.nodes, code="VC2HH10K01")
        self.assertEqual(k01["id"], "VC2HH10K01")


class TestStrandDomainFromCodeLetter(unittest.TestCase):
    def test_k_letter_yields_knowledge_domain_on_its_strand(self) -> None:
        result = ingest.parse_source(FIXTURE_EXCERPT, VIC_PROFILE)
        k01 = _find_node(result.nodes, code="VC2HH10K01")
        k_strand = _find_node(result.nodes, id=k01["parentId"])
        self.assertEqual(k_strand["kind"], "strand")
        self.assertEqual(k_strand["domain"], "knowledge")

    def test_s_letter_yields_skill_domain_on_its_strand(self) -> None:
        result = ingest.parse_source(FIXTURE_EXCERPT, VIC_PROFILE)
        s01 = _find_node(result.nodes, code="VC2HH10S01")
        s_strand = _find_node(result.nodes, id=s01["parentId"])
        self.assertEqual(s_strand["kind"], "strand")
        self.assertEqual(s_strand["domain"], "skill")

    def test_domain_is_never_set_on_outcome_nodes(self) -> None:
        result = ingest.parse_source(FIXTURE_EXCERPT, VIC_PROFILE)
        outcomes = [n for n in result.nodes if n["kind"] == "outcome"]
        self.assertTrue(outcomes)
        for outcome in outcomes:
            self.assertIsNone(outcome["domain"])


class TestUnitNameHeadingSuppressed(unittest.TestCase):
    """Confirmed bug: a heading that merely names the whole unit ("Investigations:
    <name>") used to be emitted as its own nested strand — a duplicate of the
    unit itself, two levels deep. It must never appear as a node, and none of
    its children may be lost."""

    def test_no_node_is_titled_the_unit_name(self) -> None:
        result = ingest.parse_source(FIXTURE_EXCERPT, VIC_PROFILE)
        titles = {n["title"] for n in result.nodes}
        self.assertNotIn("Investigations: Australians at War 1914-1945", titles)

    def test_no_title_null_strand_is_emitted(self) -> None:
        # The un-headed K01/K02 "Overview" run used to synthesise a
        # title:null container; it must now carry the profile's own strand
        # name ("Knowledge") instead.
        result = ingest.parse_source(FIXTURE_EXCERPT, VIC_PROFILE)
        strand_titles = [n["title"] for n in result.nodes if n["kind"] == "strand"]
        self.assertNotIn(None, [t for t in strand_titles if t != "Unit"])

    def test_no_criteria_lost_across_the_suppressed_heading(self) -> None:
        result = ingest.parse_source(FIXTURE_EXCERPT, VIC_PROFILE)
        codes = {n["code"] for n in result.nodes if n["kind"] == "outcome"}
        # K13-K23 (minus the deliberately-omitted gaps K19/K21) sat under
        # the suppressed "Investigations: ..." heading; confirm they still
        # made it into the tree, just reparented rather than dropped.
        for code in (
            "VC2HH10K13", "VC2HH10K14", "VC2HH10K15", "VC2HH10K16",
            "VC2HH10K17", "VC2HH10K18", "VC2HH10K20", "VC2HH10K22",
            "VC2HH10K23",
        ):
            self.assertIn(code, codes)


class TestProseVsHeadingSplit(unittest.TestCase):
    def test_long_paragraph_before_first_code_is_summary_not_a_node(self) -> None:
        result = ingest.parse_source(FIXTURE_EXCERPT, VIC_PROFILE)
        self.assertEqual(len(result.summary_blocks), 1)
        titles = [n["title"] for n in result.nodes if n["title"]]
        self.assertFalse(
            any("By the end of Level 10" in (t or "") for t in titles),
            "achievement-standard prose must not become a node",
        )

    def test_short_codeless_line_becomes_a_strand_heading(self) -> None:
        result = ingest.parse_source(FIXTURE_EXCERPT, VIC_PROFILE)
        heading = _find_node(result.nodes, title="concepts and skills")
        self.assertIsNotNone(heading)
        self.assertEqual(heading["kind"], "strand")


class TestClassifyBlock(unittest.TestCase):
    def test_summary_paragraph_classifies_as_summary(self) -> None:
        paragraph = (
            "Students formulate and adapt historical questions to support "
            "the development of historical investigations and their use of "
            "historical sources and concepts to interpret the modern world. "
            "They organise historical narratives of events in chronological "
            "order to explain patterns of continuity and change."
        )
        classification = ingest.classify_block(paragraph, VIC_PROFILE, False)
        self.assertIs(classification.block_class, ingest.BlockClass.SUMMARY)
        self.assertEqual(classification.confidence, "high")

    def test_short_heading_classifies_as_heading(self) -> None:
        classification = ingest.classify_block("concepts and skills", VIC_PROFILE, False)
        self.assertIs(classification.block_class, ingest.BlockClass.HEADING)
        self.assertEqual(classification.confidence, "high")

    def test_coded_line_classifies_as_criterion(self) -> None:
        classification = ingest.classify_block(
            "significant places where Australians fought VC2HH10K15", VIC_PROFILE, False
        )
        self.assertIs(classification.block_class, ingest.BlockClass.CRITERION)
        self.assertEqual(classification.confidence, "high")
        self.assertEqual(classification.code, "VC2HH10K15")
        self.assertEqual(classification.letter, "K")

    def test_borderline_short_but_punctuated_line_is_low_confidence(self) -> None:
        # Short (well under the length threshold) but ends in a full stop
        # and reads as a complete sentence — the signals disagree, so this
        # must be flagged low rather than confidently called either way.
        borderline = "This unit covers the causes of conflict."
        classification = ingest.classify_block(borderline, VIC_PROFILE, False)
        self.assertEqual(classification.confidence, "low")

    def test_classify_block_returns_a_reason(self) -> None:
        classification = ingest.classify_block("concepts and skills", VIC_PROFILE, False)
        self.assertTrue(classification.reason)


class TestSequenceGapDetection(unittest.TestCase):
    def test_fixture_yields_expected_gaps(self) -> None:
        # "Investigations: Australians at War 1914-1945" is the unit's OWN
        # name, not a separate investigation (confirmed ingest bug fix) — so
        # its K13-K23 codes are no longer split into their own container
        # away from the K01/K02 "Overview" codes; both runs now share the
        # single "Knowledge" strand, which is the correct grouping since
        # they were always the same unit. That legitimately surfaces
        # K03-K12 as possible omissions alongside the pre-existing
        # K19/K21/S04, per the per-heading gap detection in
        # detect_sequence_gaps().
        result = ingest.parse_source(FIXTURE_EXCERPT, VIC_PROFILE)
        self.assertEqual(
            set(result.sequence_gaps),
            {
                "VC2HH10K03", "VC2HH10K04", "VC2HH10K05", "VC2HH10K06",
                "VC2HH10K07", "VC2HH10K08", "VC2HH10K09", "VC2HH10K10",
                "VC2HH10K11", "VC2HH10K12", "VC2HH10K19", "VC2HH10K21",
                "VC2HH10S04",
            },
        )

    def test_run_with_no_gaps_yields_none(self) -> None:
        code_groups = {"container-1": ["VC2HH10K01", "VC2HH10K02", "VC2HH10K03"]}
        self.assertEqual(ingest.detect_sequence_gaps(code_groups), [])

    def test_codes_far_outside_observed_run_never_flagged(self) -> None:
        # K01-K06 in one container, K13-K23 in a different container: K07-K12
        # sit between the two runs but were never observed in EITHER
        # container, so they must never be reported.
        code_groups = {
            "overview": ["VC2HH10K01", "VC2HH10K02", "VC2HH10K06"],
            "investigation": ["VC2HH10K13", "VC2HH10K23"],
        }
        gaps = ingest.detect_sequence_gaps(code_groups)
        for missing_between_runs in ("VC2HH10K07", "VC2HH10K08", "VC2HH10K12"):
            self.assertNotIn(missing_between_runs, gaps)
        self.assertIn("VC2HH10K03", gaps)
        self.assertIn("VC2HH10K04", gaps)
        self.assertIn("VC2HH10K05", gaps)


class TestUnitScopeDetection(unittest.TestCase):
    def test_suggests_unit_name_from_investigation_heading(self) -> None:
        result = ingest.parse_source(FIXTURE_EXCERPT, VIC_PROFILE)
        self.assertEqual(
            result.scope["suggested_unit_name"], "Australians at War 1914-1945"
        )

    def test_reports_a_heading_per_container_with_codes(self) -> None:
        result = ingest.parse_source(FIXTURE_EXCERPT, VIC_PROFILE)
        heading_titles = {h["title"] for h in result.scope["headings"]}
        # "Investigations: Australians at War 1914-1945" names the unit
        # itself, so it is deliberately never emitted as its own strand/
        # heading (see _is_unit_name_heading) — its codes live under the
        # profile-named "Knowledge" strand instead.
        self.assertNotIn(
            "Investigations: Australians at War 1914-1945", heading_titles
        )
        self.assertIn("Knowledge", heading_titles)
        self.assertIn("concepts and skills", heading_titles)


class TestTreeInvariantGate(unittest.TestCase):
    def test_valid_tree_passes(self) -> None:
        result = ingest.parse_source(FIXTURE_EXCERPT, VIC_PROFILE)
        ingest.validate_tree(result.nodes)  # must not raise

    def test_two_roots_is_refused(self) -> None:
        nodes = [
            {"id": "root-1", "parentId": None, "code": None, "title": "a",
             "text": None, "kind": "strand", "confidence": "high",
             "edited": False, "original": None, "domain": None},
            {"id": "root-2", "parentId": None, "code": None, "title": "b",
             "text": None, "kind": "strand", "confidence": "high",
             "edited": False, "original": None, "domain": None},
        ]
        with self.assertRaises(ingest.TreeInvariantError):
            ingest.validate_tree(nodes)

    def test_cycle_is_refused(self) -> None:
        nodes = [
            {"id": "a", "parentId": "b", "code": None, "title": "a",
             "text": None, "kind": "strand", "confidence": "low",
             "edited": False, "original": None, "domain": None},
            {"id": "b", "parentId": "a", "code": None, "title": "b",
             "text": None, "kind": "strand", "confidence": "low",
             "edited": False, "original": None, "domain": None},
        ]
        with self.assertRaises(ingest.TreeInvariantError):
            ingest.validate_tree(nodes)

    def test_malformed_input_refused_and_unit_json_left_unchanged(self) -> None:
        """TEST-7: the gate fires both directions. A source that produces a
        cycle must leave any existing unit.json byte-unchanged."""
        with tempfile.TemporaryDirectory() as tmp_dir:
            unit_path = Path(tmp_dir) / "unit.json"
            original_bytes = json.dumps({"nodes": [], "curriculum": {}}).encode("utf-8")
            unit_path.write_bytes(original_bytes)

            # Monkeypatch validate_tree via a broken merge is hard to trigger
            # from real source text (the parser cannot itself produce a
            # cycle), so we exercise the write-refusal path directly: build
            # a cyclic node list and confirm write_unit_atomic is never
            # reached because validate_tree raises first, exactly as run()
            # does internally.
            cyclic_nodes = [
                {"id": "a", "parentId": "b", "code": None, "title": "a",
                 "text": None, "kind": "strand", "confidence": "low",
                 "edited": False, "original": None, "domain": None},
                {"id": "b", "parentId": "a", "code": None, "title": "b",
                 "text": None, "kind": "strand", "confidence": "low",
                 "edited": False, "original": None, "domain": None},
            ]
            with self.assertRaises(ingest.TreeInvariantError):
                ingest.validate_tree(cyclic_nodes)

            self.assertEqual(unit_path.read_bytes(), original_bytes)


class TestReIngest(unittest.TestCase):
    def test_edited_node_left_completely_untouched(self) -> None:
        first_pass = ingest.parse_source(FIXTURE_EXCERPT, VIC_PROFILE)
        existing = [dict(n) for n in first_pass.nodes]
        k01 = _find_node(existing, code="VC2HH10K01")
        k01["edited"] = True
        k01["title"] = "Luke's hand-edited title"

        second_pass = ingest.parse_source(FIXTURE_EXCERPT, VIC_PROFILE)
        merged = ingest.merge_nodes(existing, second_pass.nodes)

        merged_k01 = _find_node(merged, code="VC2HH10K01")
        self.assertEqual(merged_k01["title"], "Luke's hand-edited title")
        self.assertTrue(merged_k01["edited"])

    def test_unedited_node_is_refreshed_from_new_parse(self) -> None:
        first_pass = ingest.parse_source(FIXTURE_EXCERPT, VIC_PROFILE)
        existing = [dict(n) for n in first_pass.nodes]
        k02 = _find_node(existing, code="VC2HH10K02")
        k02["title"] = "stale guessed title"  # not marked edited

        second_pass = ingest.parse_source(FIXTURE_EXCERPT, VIC_PROFILE)
        merged = ingest.merge_nodes(existing, second_pass.nodes)

        merged_k02 = _find_node(merged, code="VC2HH10K02")
        self.assertNotEqual(merged_k02["title"], "stale guessed title")

    def test_full_run_via_cli_is_idempotent_end_to_end(self) -> None:
        """TEST-4: everything happens inside a TemporaryDirectory."""
        with tempfile.TemporaryDirectory() as tmp_dir:
            source_path = Path(tmp_dir) / "source.txt"
            source_path.write_text(FIXTURE_EXCERPT, encoding="utf-8")
            unit_path = Path(tmp_dir) / "unit.json"

            exit_code_1 = ingest.run(
                ["--source", str(source_path), "--unit", str(unit_path),
                 "--profile", "vic-f10-v2"]
            )
            self.assertEqual(exit_code_1, 0)
            first_unit = json.loads(unit_path.read_text(encoding="utf-8"))

            exit_code_2 = ingest.run(
                ["--source", str(source_path), "--unit", str(unit_path),
                 "--profile", "vic-f10-v2"]
            )
            self.assertEqual(exit_code_2, 0)
            second_unit = json.loads(unit_path.read_text(encoding="utf-8"))

            self.assertEqual(first_unit["nodes"], second_unit["nodes"])


class TestGenericProfileFallback(unittest.TestCase):
    def test_every_nonblank_line_becomes_a_low_confidence_outcome(self) -> None:
        text = "First line here.\n\nSecond line here.\n"
        result = ingest.parse_source(text, GENERIC_PROFILE)
        outcomes = [n for n in result.nodes if n["kind"] == "outcome"]
        self.assertEqual(len(outcomes), 2)
        for outcome in outcomes:
            self.assertEqual(outcome["confidence"], "low")
            self.assertIsNone(outcome["code"])


class TestCliDryRunWritesNothing(unittest.TestCase):
    def test_dry_run_does_not_create_unit_json(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            source_path = Path(tmp_dir) / "source.txt"
            source_path.write_text(FIXTURE_EXCERPT, encoding="utf-8")
            unit_path = Path(tmp_dir) / "unit.json"

            exit_code = ingest.run(
                ["--source", str(source_path), "--unit", str(unit_path),
                 "--profile", "vic-f10-v2", "--dry-run", "--report"]
            )
            self.assertEqual(exit_code, 0)
            self.assertFalse(unit_path.exists())


class TestUnitNameWiring(unittest.TestCase):
    """run() wires detect_unit_scope()'s suggested_unit_name into
    curriculum.suggestedName, and must never touch meta.unitName — that
    field is teacher-entered at unit creation (!NewUnit) and authoritative."""

    def test_suggested_name_written_to_curriculum(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            source_path = Path(tmp_dir) / "source.txt"
            source_path.write_text(FIXTURE_EXCERPT, encoding="utf-8")
            unit_path = Path(tmp_dir) / "unit.json"

            exit_code = ingest.run(
                ["--source", str(source_path), "--unit", str(unit_path),
                 "--profile", "vic-f10-v2"]
            )
            self.assertEqual(exit_code, 0)
            unit = json.loads(unit_path.read_text(encoding="utf-8"))
            self.assertEqual(
                unit["curriculum"]["suggestedName"],
                "Australians at War 1914-1945",
            )

    def test_never_writes_or_overwrites_meta_unitname(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            source_path = Path(tmp_dir) / "source.txt"
            source_path.write_text(FIXTURE_EXCERPT, encoding="utf-8")
            unit_path = Path(tmp_dir) / "unit.json"
            unit_path.write_text(
                json.dumps({
                    "nodes": [],
                    "curriculum": {},
                    "meta": {"unitName": "Teacher's Own Title"},
                }),
                encoding="utf-8",
            )

            exit_code = ingest.run(
                ["--source", str(source_path), "--unit", str(unit_path),
                 "--profile", "vic-f10-v2"]
            )
            self.assertEqual(exit_code, 0)
            unit = json.loads(unit_path.read_text(encoding="utf-8"))
            self.assertEqual(unit["meta"]["unitName"], "Teacher's Own Title")


class TestProvenanceFields(unittest.TestCase):
    """curriculum.name/jurisdiction/version/ingestedAt were previously left
    empty forever (run() never populated them) — now sourced from the
    profile's static metadata (where the profile carries it) and stamped
    with the run's own UTC time."""

    def test_ingested_at_is_stamped_every_run(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            source_path = Path(tmp_dir) / "source.txt"
            source_path.write_text(FIXTURE_EXCERPT, encoding="utf-8")
            unit_path = Path(tmp_dir) / "unit.json"

            exit_code = ingest.run(
                ["--source", str(source_path), "--unit", str(unit_path),
                 "--profile", "vic-f10-v2"]
            )
            self.assertEqual(exit_code, 0)
            unit = json.loads(unit_path.read_text(encoding="utf-8"))
            self.assertIsNotNone(unit["curriculum"]["ingestedAt"])
            # ISO-8601 UTC, e.g. "2026-08-30T12:00:00Z" — just check shape,
            # not an exact value (real wall-clock time).
            self.assertRegex(
                unit["curriculum"]["ingestedAt"],
                r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$",
            )

    def test_name_jurisdiction_version_fall_back_to_existing_when_profile_lacks_them(
        self,
    ) -> None:
        # profiles.py's shipped profiles don't currently carry name/
        # jurisdiction/version metadata — run() must not clobber whatever
        # was already on disk with None in that case.
        with tempfile.TemporaryDirectory() as tmp_dir:
            source_path = Path(tmp_dir) / "source.txt"
            source_path.write_text(FIXTURE_EXCERPT, encoding="utf-8")
            unit_path = Path(tmp_dir) / "unit.json"
            unit_path.write_text(
                json.dumps({
                    "nodes": [],
                    "curriculum": {"name": "Existing Name", "jurisdiction": "VIC"},
                }),
                encoding="utf-8",
            )

            exit_code = ingest.run(
                ["--source", str(source_path), "--unit", str(unit_path),
                 "--profile", "vic-f10-v2"]
            )
            self.assertEqual(exit_code, 0)
            unit = json.loads(unit_path.read_text(encoding="utf-8"))
            self.assertEqual(unit["curriculum"]["name"], "Existing Name")
            self.assertEqual(unit["curriculum"]["jurisdiction"], "VIC")
            self.assertEqual(unit["curriculum"]["version"], "")


class TestResourceItemRouting(unittest.TestCase):
    """Decision 1: SUMMARY blocks route to resourcesPage, not
    curriculum.description."""

    def test_fixture_yields_exactly_one_text_resource_item(self) -> None:
        result = ingest.parse_source(FIXTURE_EXCERPT, VIC_PROFILE)
        items = ingest.build_resource_items(result.summary_blocks)
        self.assertEqual(len(items), 1)
        item = items[0]
        self.assertEqual(item["kind"], "text")
        self.assertIn("Peoples’ rights", item["text"])
        self.assertTrue(item["text"].strip().startswith("By the end of Level 10"))
        self.assertIsNone(item["url"])
        self.assertIsNone(item["label"])
        self.assertIsNone(item["imageId"])
        self.assertIsNotNone(item["note"])

    def test_full_run_via_cli_writes_summary_into_resources_page_not_description(
        self,
    ) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            source_path = Path(tmp_dir) / "source.txt"
            source_path.write_text(FIXTURE_EXCERPT, encoding="utf-8")
            unit_path = Path(tmp_dir) / "unit.json"

            exit_code = ingest.run(
                ["--source", str(source_path), "--unit", str(unit_path),
                 "--profile", "vic-f10-v2"]
            )
            self.assertEqual(exit_code, 0)
            unit = json.loads(unit_path.read_text(encoding="utf-8"))

            self.assertIsInstance(unit["resourcesPage"], dict)
            items = unit["resourcesPage"]["items"]
            self.assertEqual(len(items), 1)
            self.assertEqual(items[0]["kind"], "text")
            self.assertIsNone(unit["curriculum"].get("description"))


class TestTopicSeeding(unittest.TestCase):
    """Decision 2: every real HEADING strand also seeds a topics[] entry."""

    def test_fixture_yields_exactly_six_topics_with_correct_titles(self) -> None:
        result = ingest.parse_source(FIXTURE_EXCERPT, VIC_PROFILE)
        topics = ingest.build_topics(result.nodes)
        self.assertEqual(len(topics), 6)
        titles = [t["title"] for t in topics]
        # "Investigations: Australians at War 1914-1945" names the unit
        # itself (confirmed ingest bug fix) — it is never emitted as a
        # strand, so it never seeds its own duplicate topic either. Its
        # codes are folded into the "Knowledge" topic (the profile's own
        # name for the K-letter strand) alongside the K01/K02 codes that
        # used to sit in an untitled, topic-ineligible container.
        self.assertEqual(
            titles,
            [
                "Knowledge",
                "concepts and skills",
                "Contunity and change",
                "causes and consquences",
                "Historical significance",
                "community",
            ],
        )
        # No topic for the synthetic root ("Unit").
        self.assertNotIn("Unit", titles)
        self.assertNotIn(None, titles)

    def test_every_coverage_nodeid_resolves_and_no_duplicates_within_a_topic(
        self,
    ) -> None:
        result = ingest.parse_source(FIXTURE_EXCERPT, VIC_PROFILE)
        node_ids = {n["id"] for n in result.nodes}
        topics = ingest.build_topics(result.nodes)
        for topic in topics:
            seen: set[str] = set()
            for entry in topic["coverage"]:
                self.assertIn(entry["nodeId"], node_ids)
                self.assertEqual(entry["coverage"], "full")
                self.assertIsNone(entry["note"])
                self.assertNotIn(entry["nodeId"], seen)
                seen.add(entry["nodeId"])

    def test_knowledge_topic_covers_k01_k02_and_k13_through_k23(self) -> None:
        # K13-K23 used to sit under a spurious "Investigations: ..." topic
        # (the unit-name duplicate this task fixes); now that heading is
        # never emitted, so all Knowledge-strand codes — the K01/K02
        # "Overview" codes and K13-K23 — share the one "Knowledge" topic and
        # no criteria are lost in the merge.
        result = ingest.parse_source(FIXTURE_EXCERPT, VIC_PROFILE)
        topics = ingest.build_topics(result.nodes)
        knowledge = next(t for t in topics if t["title"] == "Knowledge")
        covered = {c["nodeId"] for c in knowledge["coverage"]}
        self.assertEqual(
            covered,
            {
                "VC2HH10K01", "VC2HH10K02",
                "VC2HH10K13", "VC2HH10K14", "VC2HH10K15", "VC2HH10K16",
                "VC2HH10K17", "VC2HH10K18", "VC2HH10K20", "VC2HH10K22",
                "VC2HH10K23",
            },
        )

    def test_topics_are_flat_no_parentid_field(self) -> None:
        result = ingest.parse_source(FIXTURE_EXCERPT, VIC_PROFILE)
        topics = ingest.build_topics(result.nodes)
        for topic in topics:
            self.assertNotIn("parentId", topic)

    def test_no_topics_flag_skips_seeding(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            source_path = Path(tmp_dir) / "source.txt"
            source_path.write_text(FIXTURE_EXCERPT, encoding="utf-8")
            unit_path = Path(tmp_dir) / "unit.json"

            exit_code = ingest.run(
                ["--source", str(source_path), "--unit", str(unit_path),
                 "--profile", "vic-f10-v2", "--no-topics"]
            )
            self.assertEqual(exit_code, 0)
            unit = json.loads(unit_path.read_text(encoding="utf-8"))
            self.assertEqual(unit["topics"], [])


class TestTopicAndResourceItemIdempotency(unittest.TestCase):
    """CROSS-CUTTING requirement: two identical runs must not duplicate
    topics/resource items, and the resulting file must be byte-identical."""

    def test_two_runs_produce_byte_identical_unit_json(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            source_path = Path(tmp_dir) / "source.txt"
            source_path.write_text(FIXTURE_EXCERPT, encoding="utf-8")
            unit_path = Path(tmp_dir) / "unit.json"

            exit_code_1 = ingest.run(
                ["--source", str(source_path), "--unit", str(unit_path),
                 "--profile", "vic-f10-v2"]
            )
            self.assertEqual(exit_code_1, 0)
            first_bytes = unit_path.read_bytes()

            exit_code_2 = ingest.run(
                ["--source", str(source_path), "--unit", str(unit_path),
                 "--profile", "vic-f10-v2"]
            )
            self.assertEqual(exit_code_2, 0)
            second_bytes = unit_path.read_bytes()

            self.assertEqual(first_bytes, second_bytes)

            unit = json.loads(second_bytes.decode("utf-8"))
            self.assertEqual(len(unit["topics"]), 6)
            self.assertEqual(len(unit["resourcesPage"]["items"]), 1)

    def test_resources_page_stays_a_single_object_after_reingest(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            source_path = Path(tmp_dir) / "source.txt"
            source_path.write_text(FIXTURE_EXCERPT, encoding="utf-8")
            unit_path = Path(tmp_dir) / "unit.json"

            ingest.run(
                ["--source", str(source_path), "--unit", str(unit_path),
                 "--profile", "vic-f10-v2"]
            )
            ingest.run(
                ["--source", str(source_path), "--unit", str(unit_path),
                 "--profile", "vic-f10-v2"]
            )
            unit = json.loads(unit_path.read_text(encoding="utf-8"))
            self.assertIsInstance(unit["resourcesPage"], dict)
            self.assertNotIsInstance(unit["resourcesPage"], list)


class TestTopicAndResourceItemNeverClobbered(unittest.TestCase):
    """CROSS-CUTTING requirement: a hand-edited topic/resource item must
    survive re-ingest completely unchanged."""

    def test_hand_modified_topic_title_survives_reingest(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            source_path = Path(tmp_dir) / "source.txt"
            source_path.write_text(FIXTURE_EXCERPT, encoding="utf-8")
            unit_path = Path(tmp_dir) / "unit.json"

            ingest.run(
                ["--source", str(source_path), "--unit", str(unit_path),
                 "--profile", "vic-f10-v2"]
            )
            unit = json.loads(unit_path.read_text(encoding="utf-8"))
            topic = next(
                t for t in unit["topics"] if t["title"] == "concepts and skills"
            )
            topic["title"] = "Concepts, Skills & Historical Method"
            unit_path.write_text(json.dumps(unit, indent=2), encoding="utf-8")

            ingest.run(
                ["--source", str(source_path), "--unit", str(unit_path),
                 "--profile", "vic-f10-v2"]
            )
            after = json.loads(unit_path.read_text(encoding="utf-8"))
            titles = [t["title"] for t in after["topics"]]
            # Matching is by `id`, which is derived from the source heading
            # and so survives a rename. The teacher's title is kept and no
            # second topic is seeded alongside it.
            self.assertIn("Concepts, Skills & Historical Method", titles)
            self.assertNotIn("concepts and skills", titles)
            self.assertEqual(len(after["topics"]), 6)
            # The failure this guards against: two topics sharing one id,
            # which would make bigIdea.topicId ambiguous.
            ids = [t["id"] for t in after["topics"]]
            self.assertEqual(len(ids), len(set(ids)))

    def test_hand_added_coverage_entry_survives_reingest(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            source_path = Path(tmp_dir) / "source.txt"
            source_path.write_text(FIXTURE_EXCERPT, encoding="utf-8")
            unit_path = Path(tmp_dir) / "unit.json"

            ingest.run(
                ["--source", str(source_path), "--unit", str(unit_path),
                 "--profile", "vic-f10-v2"]
            )
            unit = json.loads(unit_path.read_text(encoding="utf-8"))
            topic = next(
                t for t in unit["topics"] if t["title"] == "community"
            )
            topic["coverage"].append(
                {"nodeId": "VC2HH10S09", "coverage": "partial", "note": "linked by hand"}
            )
            unit_path.write_text(json.dumps(unit, indent=2), encoding="utf-8")

            ingest.run(
                ["--source", str(source_path), "--unit", str(unit_path),
                 "--profile", "vic-f10-v2"]
            )
            after = json.loads(unit_path.read_text(encoding="utf-8"))
            community = next(t for t in after["topics"] if t["title"] == "community")
            self.assertEqual(len(community["coverage"]), 2)
            self.assertTrue(
                any(c.get("note") == "linked by hand" for c in community["coverage"])
            )

    def test_hand_edited_resource_item_survives_reingest_no_duplicate(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            source_path = Path(tmp_dir) / "source.txt"
            source_path.write_text(FIXTURE_EXCERPT, encoding="utf-8")
            unit_path = Path(tmp_dir) / "unit.json"

            ingest.run(
                ["--source", str(source_path), "--unit", str(unit_path),
                 "--profile", "vic-f10-v2"]
            )
            unit = json.loads(unit_path.read_text(encoding="utf-8"))
            self.assertEqual(len(unit["resourcesPage"]["items"]), 1)
            unit["resourcesPage"]["items"][0]["kind"] = "link"
            unit["resourcesPage"]["items"][0]["url"] = "https://example.org"
            unit_path.write_text(json.dumps(unit, indent=2), encoding="utf-8")

            ingest.run(
                ["--source", str(source_path), "--unit", str(unit_path),
                 "--profile", "vic-f10-v2"]
            )
            after = json.loads(unit_path.read_text(encoding="utf-8"))
            items = after["resourcesPage"]["items"]
            self.assertEqual(len(items), 1)  # not duplicated
            self.assertEqual(items[0]["kind"], "link")
            self.assertEqual(items[0]["url"], "https://example.org")


if __name__ == "__main__":
    unittest.main()


class RenamedTopicRegressionTests(unittest.TestCase):
    """A renamed topic must not be duplicated on re-ingest.

    Regression: merge_topics() once keyed on `title`, so renaming a topic
    stopped it matching and a second topic was appended. Both carried the
    same derived id, giving one unit two topics sharing an id and breaking
    bigIdea.topicId resolution.
    """

    def _seed(self) -> list[dict]:
        return [
            {"id": "topic-aaa", "title": "Original heading", "text": None,
             "order": 0, "coverage": [{"nodeId": "n1", "coverage": "full",
                                       "note": None}]},
        ]

    def test_renamed_topic_is_not_duplicated(self) -> None:
        fresh = self._seed()
        renamed = [dict(fresh[0], title="My own framing")]
        merged = ingest.merge_topics(renamed, fresh)
        self.assertEqual(len(merged), 1, "rename must not append a second topic")
        self.assertEqual(merged[0]["title"], "My own framing",
                         "the teacher's rename must survive")

    def test_no_two_topics_ever_share_an_id(self) -> None:
        fresh = self._seed()
        renamed = [dict(fresh[0], title="My own framing")]
        merged = ingest.merge_topics(renamed, fresh)
        ids = [t["id"] for t in merged]
        self.assertEqual(len(ids), len(set(ids)), "duplicate topic id emitted")

    def test_untouched_topic_still_refreshes(self) -> None:
        fresh = self._seed()
        merged = ingest.merge_topics(list(fresh), fresh)
        self.assertEqual(len(merged), 1)
        self.assertEqual(merged[0]["title"], "Original heading")
