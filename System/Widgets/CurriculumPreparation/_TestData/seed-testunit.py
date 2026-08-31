#!/usr/bin/env python3
"""
seed-testunit.py

Populates the AustraliansAtWar-testunit fixture with realistic, deterministic
content so the CurriculumPreparation app can actually be exercised end to end
(Marking Matrix, Resources Page, image loading, lesson reorder modes, crib
sheet overflow, coverage grid, traceability).

WHY A SEED SCRIPT (not hardcoded template data, not a runtime --demo mode):
  - _template/unit.json is what "Start Unit.command" clones for a REAL
    teacher's unit. Sample data must never leak into a real new unit, so it
    cannot live in _template/.
  - A runtime demo mode would bake permanent test-only complexity into the
    production app. Keeping it a standalone script means the app has zero
    knowledge this fixture exists.
  - Re-running this script is how schema drift between _template/unit.json
    and the fixture gets caught automatically: the top-level key-set assert
    below is the point of the script, not an afterthought.

Usage:
    python3 seed-testunit.py

Deterministic: no randomness, no wall-clock in content (fixed dates only).
Safe to re-run — always overwrites unit.json and images/aif-poster.png.
"""

import json
import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CP_ROOT = ROOT.parent  # CurriculumPreparation/
TEMPLATE_PATH = CP_ROOT / "_template" / "unit.json"
UNIT_DIR = ROOT / "vic-f10-v2-history" / "AustraliansAtWar-testunit"
UNIT_PATH = UNIT_DIR / "unit.json"
IMAGES_DIR = UNIT_DIR / "images"

FIXED_CREATED = "2026-07-14T00:00:00.000Z"
FIXED_MODIFIED = "2026-08-01T00:00:00.000Z"


# ---------------------------------------------------------------------------
# 1. Tiny real PNG, generated deterministically (no external asset, no
#    base64 blob checked in — this writes actual bytes to disk). A single
#    solid-colour 40x30 8-bit RGB PNG: valid, small, and genuinely decodable
#    by any image library, unlike a stub file.
# ---------------------------------------------------------------------------

def _png_chunk(tag: bytes, data: bytes) -> bytes:
    return (
        struct.pack(">I", len(data))
        + tag
        + data
        + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
    )


def make_png(width: int, height: int, rgb=(58, 74, 51)) -> bytes:
    """Build a minimal valid solid-colour PNG (khaki/AIF-slouch-hat green)."""
    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)  # 8-bit RGB
    raw = b""
    row = bytes(rgb) * width
    for _ in range(height):
        raw += b"\x00" + row  # filter type 0 (None) per scanline
    idat = zlib.compress(raw, level=9)
    return (
        sig
        + _png_chunk(b"IHDR", ihdr)
        + _png_chunk(b"IDAT", idat)
        + _png_chunk(b"IEND", b"")
    )


# ---------------------------------------------------------------------------
# 2. Curriculum nodes / topics — reuse the existing ingested node set (real
#    VC2HH10 codes already present in the fixture), just fix the two typo'd
#    topic titles flagged in the audit.
# ---------------------------------------------------------------------------

TOPIC_WAR = "topic-b39d1544ae23c5fa"          # Investigations: Australians at War
TOPIC_METHOD = "topic-7f17270932d1c79f"       # Concepts, Skills & Historical Method
TOPIC_CONTINUITY = "topic-6962bbff188c6d5d"   # was "Contunity and change"
TOPIC_CAUSES = "topic-8dc874033d457402"       # was "causes and consquences"
TOPIC_SIGNIFICANCE = "topic-69fef3c4ad066e1b"
TOPIC_COMMUNITY = "topic-f354ee99e2bc863c"

NODES = [
    {"id": "root", "code": None, "title": "Unit", "text": None, "kind": "strand",
     "parentId": None, "confidence": "high", "edited": False, "original": None, "domain": None},
    {"id": "strand-083b674764d7577c", "code": None, "title": None, "text": None, "kind": "strand",
     "parentId": "root", "confidence": "low", "edited": False, "original": None, "domain": None},
    {"id": "VC2HH10K01", "code": "VC2HH10K01", "kind": "outcome", "parentId": "strand-083b674764d7577c",
     "title": None, "text": "causes and consequences of the Industrial Revolution, the movement of people and European imperialism",
     "confidence": "high", "edited": False, "original": None, "domain": "knowledge"},
    {"id": "VC2HH10K02", "code": "VC2HH10K02", "kind": "outcome", "parentId": "strand-083b674764d7577c",
     "title": None, "text": "significant ideas and developments and their impacts on societies", "confidence": "high",
     "edited": False, "original": None, "domain": "knowledge"},
    {"id": "VC2HH10K03", "code": "VC2HH10K03", "kind": "outcome", "parentId": "strand-083b674764d7577c",
     "title": None, "text": "significant developments and events since 1945 that have contributed to change",
     "confidence": "high", "edited": False, "original": None, "domain": "knowledge"},
    {"id": "VC2HH10K04", "code": "VC2HH10K04", "kind": "outcome", "parentId": "strand-083b674764d7577c",
     "title": None, "text": "the contribution of significant movements for social and political change",
     "confidence": "high", "edited": False, "original": None, "domain": "knowledge"},
    {"id": "VC2HH10K05", "code": "VC2HH10K05", "kind": "outcome", "parentId": "strand-083b674764d7577c",
     "title": None, "text": "the significant events, individuals and groups in the women’s movement",
     "confidence": "high", "edited": False, "original": None, "domain": "knowledge"},
    {"id": "VC2HH10K06", "code": "VC2HH10K06", "kind": "outcome", "parentId": "strand-083b674764d7577c",
     "title": None, "text": "the continuing efforts to create change in the civil rights movement",
     "confidence": "high", "edited": False, "original": None, "domain": "knowledge"},
    {"id": "strand-f467a13d6bd18506", "code": None, "title": "Investigations: Australians at War 1914-1945",
     "text": None, "kind": "strand", "parentId": "root", "confidence": "high", "edited": False,
     "original": None, "domain": None},
    {"id": "VC2HH10K13", "code": "VC2HH10K13", "kind": "outcome", "parentId": "strand-f467a13d6bd18506",
     "title": None, "text": "the causes of World War I and World War II", "confidence": "high", "edited": False,
     "original": None, "domain": "knowledge"},
    {"id": "VC2HH10K14", "code": "VC2HH10K14", "kind": "outcome", "parentId": "strand-f467a13d6bd18506",
     "title": None, "text": "the reasons that Australians, including Aboriginal and Torres Strait Islander Peoples, enlisted to fight",
     "confidence": "high", "edited": False, "original": None, "domain": "knowledge"},
    {"id": "VC2HH10K15", "code": "VC2HH10K15", "kind": "outcome", "parentId": "strand-f467a13d6bd18506",
     "title": None, "text": "significant places where Australians fought", "confidence": "high", "edited": False,
     "original": None, "domain": "knowledge"},
    {"id": "VC2HH10K16", "code": "VC2HH10K16", "kind": "outcome", "parentId": "strand-f467a13d6bd18506",
     "title": None, "text": "the experiences and perspectives of those who fought or were affected by the world wars",
     "confidence": "high", "edited": False, "original": None, "domain": "knowledge"},
    {"id": "VC2HH10K17", "code": "VC2HH10K17", "kind": "outcome", "parentId": "strand-f467a13d6bd18506",
     "title": None, "text": "significant events and turning points of the world wars", "confidence": "high", "edited": False,
     "original": None, "domain": "knowledge"},
    {"id": "VC2HH10K18", "code": "VC2HH10K18", "kind": "outcome", "parentId": "strand-f467a13d6bd18506",
     "title": None, "text": "continuities and changes in the nature of warfare", "confidence": "high", "edited": False,
     "original": None, "domain": "knowledge"},
    {"id": "VC2HH10K20", "code": "VC2HH10K20", "kind": "outcome", "parentId": "strand-f467a13d6bd18506",
     "title": None, "text": "the causes of the Holocaust", "confidence": "high", "edited": False,
     "original": None, "domain": "knowledge"},
    {"id": "VC2HH10K22", "code": "VC2HH10K22", "kind": "outcome", "parentId": "strand-f467a13d6bd18506",
     "title": None, "text": "the diverse experiences and perspectives of Jewish and non-Jewish people", "confidence": "high",
     "edited": False, "original": None, "domain": "knowledge"},
    {"id": "VC2HH10K23", "code": "VC2HH10K23", "kind": "outcome", "parentId": "strand-f467a13d6bd18506",
     "title": None, "text": "different interpretations and debates about the significance of the world wars",
     "confidence": "high", "edited": False, "original": None, "domain": "knowledge"},
    {"id": "strand-2197be9f7aedcbcf", "code": None, "title": "concepts and skills", "text": None,
     "kind": "strand", "parentId": "root", "confidence": "high", "edited": False, "original": None, "domain": None},
    {"id": "VC2HH10S01", "code": "VC2HH10S01", "kind": "outcome", "parentId": "strand-2197be9f7aedcbcf",
     "title": None, "text": "formulate, refine and use historical questions to inform historical inquiry",
     "confidence": "high", "edited": False, "original": None, "domain": "skill"},
    {"id": "VC2HH10S02", "code": "VC2HH10S02", "kind": "outcome", "parentId": "strand-2197be9f7aedcbcf",
     "title": None, "text": "sequence significant events, individuals, ideas, movements and developments",
     "confidence": "high", "edited": False, "original": None, "domain": "skill"},
    {"id": "VC2HH10S03", "code": "VC2HH10S03", "kind": "outcome", "parentId": "strand-2197be9f7aedcbcf",
     "title": None, "text": "analyse the purpose, features, content and context of historical sources",
     "confidence": "high", "edited": False, "original": None, "domain": "skill"},
    {"id": "VC2HH10S05", "code": "VC2HH10S05", "kind": "outcome", "parentId": "strand-2197be9f7aedcbcf",
     "title": None, "text": "analyse the perspectives, beliefs, values and attitudes of people in the past",
     "confidence": "high", "edited": False, "original": None, "domain": "skill"},
    {"id": "VC2HH10S06", "code": "VC2HH10S06", "kind": "outcome", "parentId": "strand-2197be9f7aedcbcf",
     "title": None, "text": "evaluate historical interpretations and debates", "confidence": "high", "edited": False,
     "original": None, "domain": "skill"},
    {"id": "strand-431f5c6a9dde150f", "code": None, "title": "Continuity and change", "text": None,
     "kind": "strand", "parentId": "root", "confidence": "high", "edited": False, "original": None, "domain": None},
    {"id": "VC2HH10S07", "code": "VC2HH10S07", "kind": "outcome", "parentId": "strand-431f5c6a9dde150f",
     "title": None, "text": "analyse continuity and change", "confidence": "high", "edited": False,
     "original": None, "domain": "skill"},
    {"id": "strand-b5b749c3094a2ddf", "code": None, "title": "causes and consequences", "text": None,
     "kind": "strand", "parentId": "root", "confidence": "high", "edited": False, "original": None, "domain": None},
    {"id": "VC2HH10S08", "code": "VC2HH10S08", "kind": "outcome", "parentId": "strand-b5b749c3094a2ddf",
     "title": None, "text": "analyse short- and long-term causes and the intended and unintended consequences of events",
     "confidence": "high", "edited": False, "original": None, "domain": "skill"},
    {"id": "strand-bd6fe113af802f09", "code": None, "title": "Historical significance", "text": None,
     "kind": "strand", "parentId": "root", "confidence": "high", "edited": False, "original": None, "domain": None},
    {"id": "VC2HH10S09", "code": "VC2HH10S09", "kind": "outcome", "parentId": "strand-bd6fe113af802f09",
     "title": None, "text": "evaluate the significance of individuals, groups, movements, ideas or events",
     "confidence": "high", "edited": False, "original": None, "domain": "skill"},
    {"id": "strand-137b55444a360a1f", "code": None, "title": "community", "text": None, "kind": "strand",
     "parentId": "root", "confidence": "high", "edited": False, "original": None, "domain": None},
    {"id": "VC2HH10S10", "code": "VC2HH10S10", "kind": "outcome", "parentId": "strand-137b55444a360a1f",
     "title": None, "text": "construct sustained historical interpretations and arguments", "confidence": "high",
     "edited": False, "original": None, "domain": "skill"},
]

TOPICS = [
    {"id": TOPIC_WAR, "title": "Investigations: Australians at War 1914-1945", "text": None, "order": 0,
     "coverage": [
         {"nodeId": "VC2HH10K13", "coverage": "full", "note": None},
         {"nodeId": "VC2HH10K14", "coverage": "full", "note": None},
         {"nodeId": "VC2HH10K15", "coverage": "full", "note": None},
         {"nodeId": "VC2HH10K16", "coverage": "full", "note": None},
         {"nodeId": "VC2HH10K17", "coverage": "full", "note": None},
         {"nodeId": "VC2HH10K18", "coverage": "full", "note": None},
         {"nodeId": "VC2HH10K20", "coverage": "full", "note": None},
         {"nodeId": "VC2HH10K22", "coverage": "full", "note": None},
         {"nodeId": "VC2HH10K23", "coverage": "full", "note": None},
     ]},
    {"id": TOPIC_METHOD, "title": "Concepts, Skills & Historical Method", "text": None, "order": 1,
     "coverage": [
         {"nodeId": "VC2HH10S01", "coverage": "full", "note": None},
         {"nodeId": "VC2HH10S02", "coverage": "full", "note": None},
         {"nodeId": "VC2HH10S03", "coverage": "full", "note": None},
         {"nodeId": "VC2HH10S05", "coverage": "full", "note": None},
         {"nodeId": "VC2HH10S06", "coverage": "full", "note": None},
     ]},
    # Typos fixed per audit: "Contunity" -> "Continuity", "consquences" -> "consequences"
    {"id": TOPIC_CONTINUITY, "title": "Continuity and change", "text": None, "order": 2,
     "coverage": [{"nodeId": "VC2HH10S07", "coverage": "full", "note": None}]},
    {"id": TOPIC_CAUSES, "title": "Causes and consequences", "text": None, "order": 3,
     "coverage": [{"nodeId": "VC2HH10S08", "coverage": "full", "note": None}]},
    {"id": TOPIC_SIGNIFICANCE, "title": "Historical significance", "text": None, "order": 4,
     "coverage": [{"nodeId": "VC2HH10S09", "coverage": "full", "note": None}]},
    {"id": TOPIC_COMMUNITY, "title": "Community", "text": None, "order": 5,
     "coverage": [{"nodeId": "VC2HH10S10", "coverage": "full", "note": None}]},
]


# ---------------------------------------------------------------------------
# 3. Big ideas — 4 across the war topic + the method topic. Two extra beyond
#    the pre-existing pair, to hit the 3-4 across 2-3 topics target and give
#    the Coverage Grid / traceability views more than one row of substance.
# ---------------------------------------------------------------------------

BI_WAR_CAUSES = "bi--31e71080"     # existing: Why nations go to war, and what it costs
BI_METHOD = "bi--6da9b6d1"         # existing: How historians know what they know
BI_HOMEFRONT = "bi--home-dissent"  # new: Loyalty and dissent on the home front
BI_IDENTITY = "bi--identity"       # new: How war reshaped Australian identity

BIG_IDEAS = [
    {"id": BI_WAR_CAUSES, "title": "Why nations go to war, and what it costs", "text": None,
     "parentId": None, "order": 0, "topicId": TOPIC_WAR,
     "coverage": [
         {"nodeId": "VC2HH10K13", "coverage": "full", "note": "Alliances, empire, arms race — direct causal chain to 1914."},
         {"nodeId": "VC2HH10K17", "coverage": "full", "note": "Gallipoli and the Western Front as the human cost of the causes studied."},
         {"nodeId": "VC2HH10K18", "coverage": "partial", "note": "Trench warfare covered; naval/air change-in-warfare left for extension."},
     ]},
    {"id": BI_METHOD, "title": "How historians know what they know", "text": None,
     "parentId": None, "order": 1, "topicId": TOPIC_METHOD,
     "coverage": [
         {"nodeId": "VC2HH10S03", "coverage": "full", "note": "Source analysis skill drilled across every mini-assessment."},
         {"nodeId": "VC2HH10S06", "coverage": "full", "note": "Anzac legend debate is the vehicle for evaluating interpretations."},
     ]},
    {"id": BI_HOMEFRONT, "title": "Loyalty and dissent on the home front", "text": None,
     "parentId": None, "order": 2, "topicId": TOPIC_WAR,
     "coverage": [
         {"nodeId": "VC2HH10K14", "coverage": "full", "note": "Why people enlisted vs why they resisted conscription."},
         {"nodeId": "VC2HH10K16", "coverage": "partial", "note": "Women's and workers' experiences covered; internment left uncovered — deliberate gap for Coverage Grid."},
     ]},
    {"id": BI_IDENTITY, "title": "How war reshaped Australian identity", "text": None,
     "parentId": None, "order": 3, "topicId": TOPIC_WAR,
     "coverage": [
         {"nodeId": "VC2HH10K23", "coverage": "full", "note": "The Anzac legend as contested national myth."},
     ]},
]


# ---------------------------------------------------------------------------
# 4. Lessons — 8 total. 6 dated across Term 3 (Mon 20 Jul -> Wed 5 Aug 2026,
#    a real VIC school week pattern), 2 unscheduled (date: null). This is the
#    exact fork lesson-reorder-date-mode.js / lesson-reorder-topic-mode.js
#    group on. One lesson is a deliberate orphan (nodeIds: [] — no coverage)
#    to exercise orphan-cleanup.js / topic-status-computer.js. Note: it still
#    carries a bigIdeaId because INV-DM-15 (local-store.js) hard-requires
#    every lesson to have one — see report for this deviation from spec.
# ---------------------------------------------------------------------------

LESSONS = [
    {
        "id": "les--339571e3", "number": 1, "nodeIds": ["VC2HH10K13"], "bigIdeaId": BI_WAR_CAUSES,
        "keyExample": "The alliance system, imperial rivalry and the July Crisis of 1914 (VC2HH10K13)",
        "practiceQuestion": "Which single alliance obligation, if removed, would most likely have prevented a continent-wide war in 1914?",
        "assessmentLink": {"miniAssessmentIds": [], "finalAssessment": False, "note": None},
        "tiers": {
            "pass": {"material": "Map of the alliance blocs in 1914; short timeline of the July Crisis.",
                      "studentTask": "Label the alliance blocs and circle the trigger event.", "workspaceLines": 8, "imageRefs": []},
            "intermediate": {"material": "Same map plus excerpts from the Triple Entente and Triple Alliance treaties.",
                              "studentTask": "Explain in two paragraphs how the alliance system turned a regional crisis into a European war.", "workspaceLines": 14, "imageRefs": []},
            "advanced": {"material": "Treaty excerpts plus a historian's extract on 'sleepwalking to war'.",
                         "studentTask": "Evaluate whether the alliance system caused the war or merely widened it.", "workspaceLines": 20, "imageRefs": []},
        },
        "sidebar": "Key term: casus belli", "completed": True, "date": "2026-07-20",
        "lessonPeriod": "P3", "provenance": "manual", "bigIdeaNote": None, "imageRefs": [],
    },
    {
        "id": "les--enlist01", "number": 2, "nodeIds": ["VC2HH10K14"], "bigIdeaId": BI_HOMEFRONT,
        "keyExample": "Why Australians, including Aboriginal and Torres Strait Islander men, volunteered in 1914-15 (VC2HH10K14)",
        "practiceQuestion": "List three different motives that led Australians to enlist, and rank them by how well-evidenced they are.",
        "assessmentLink": {"miniAssessmentIds": ["mini-70a5c085"], "finalAssessment": False, "note": None},
        "tiers": {
            "pass": {"material": "Recruitment poster gallery (three posters).",
                      "studentTask": "Identify the appeal each poster makes (duty, adventure, mateship).", "workspaceLines": 8, "imageRefs": []},
            "intermediate": {"material": "Posters plus a recruitment sergeant's diary extract.",
                              "studentTask": "Compare the poster message with the lived recruiting-office experience.", "workspaceLines": 14, "imageRefs": []},
            "advanced": {"material": "Posters, diary extract, and Defence Act 1909 exclusion clauses.",
                         "studentTask": "Explain why Aboriginal men who wanted to enlist were formally barred, then often accepted anyway.", "workspaceLines": 20, "imageRefs": []},
        },
        "sidebar": None, "completed": True, "date": "2026-07-21", "lessonPeriod": "P3",
        "provenance": "generated", "bigIdeaNote": None, "imageRefs": [],
    },
    {
        "id": "les--gallipoli", "number": 3, "nodeIds": ["VC2HH10K15", "VC2HH10K17"], "bigIdeaId": BI_METHOD,
        "keyExample": "Gallipoli: competing accounts of the 25 April 1915 landing (VC2HH10K15, VC2HH10K17)",
        "practiceQuestion": "Two soldiers' letters describe the same landing differently. What in each source explains the difference?",
        "assessmentLink": {"miniAssessmentIds": ["mini-70a5c085"], "finalAssessment": False, "note": None},
        "tiers": {
            "pass": {"material": "Two short soldier letters describing the landing.",
                      "studentTask": "Underline one factual claim and one opinion in each letter.", "workspaceLines": 8, "imageRefs": []},
            "intermediate": {"material": "Letters plus Bean's official history extract.",
                              "studentTask": "Explain why the official history and the letters differ in tone and detail.", "workspaceLines": 14, "imageRefs": []},
            "advanced": {"material": "Letters, Bean extract, and a 2015 historian's revisionist critique.",
                         "studentTask": "Argue which account is most reliable for reconstructing the landing, with reasons.", "workspaceLines": 20, "imageRefs": []},
        },
        "sidebar": "Key term: provenance", "completed": True, "date": "2026-07-22", "lessonPeriod": "P4",
        "provenance": "manual", "bigIdeaNote": "Central case study for source reliability.", "imageRefs": [],
    },
    {
        "id": "les--westfront", "number": 4, "nodeIds": ["VC2HH10K16", "VC2HH10K18"], "bigIdeaId": BI_WAR_CAUSES,
        "keyExample": "Trench conditions on the Western Front and continuity/change in warfare (VC2HH10K16, VC2HH10K18)",
        "practiceQuestion": "What changed about warfare on the Western Front between 1914 and 1918, and what stayed the same?",
        "assessmentLink": {"miniAssessmentIds": [], "finalAssessment": False, "note": None},
        "tiers": {
            "pass": {"material": "Diagram of a WWI trench system.",
                      "studentTask": "Label the trench diagram (fire trench, support, reserve, no man's land).", "workspaceLines": 8, "imageRefs": []},
            "intermediate": {"material": "Trench diagram plus a soldier's field diary on daily routine.",
                              "studentTask": "Describe a typical 24 hours in the trenches using the diary.", "workspaceLines": 14, "imageRefs": []},
            "advanced": {"material": "Diagram, diary, and casualty statistics 1914 vs 1918.",
                         "studentTask": "Analyse how tactics changed in response to trench stalemate, citing the statistics.", "workspaceLines": 20, "imageRefs": []},
        },
        "sidebar": None, "completed": True, "date": "2026-07-27", "lessonPeriod": "P3",
        "provenance": "generated", "bigIdeaNote": None, "imageRefs": [],
    },
    {
        "id": "les--conscript", "number": 5, "nodeIds": ["VC2HH10K14", "VC2HH10S08"], "bigIdeaId": BI_HOMEFRONT,
        "keyExample": "The 1916 and 1917 conscription referenda and why they split the nation (VC2HH10K14, VC2HH10S08)",
        "practiceQuestion": "Identify one short-term and one long-term cause of the conscription referenda being called.",
        "assessmentLink": {"miniAssessmentIds": ["mini-conscript"], "finalAssessment": False, "note": None},
        "tiers": {
            "pass": {"material": "Yes/No campaign postcards from 1916.",
                      "studentTask": "Sort the postcards into Yes and No and note one argument each makes.", "workspaceLines": 8, "imageRefs": []},
            "intermediate": {"material": "Postcards plus Hughes's campaign speech extract.",
                              "studentTask": "Explain why the Labor Party split over conscription.", "workspaceLines": 14, "imageRefs": []},
            "advanced": {"material": "Postcards, speech extract, and referendum result tables for both votes.",
                         "studentTask": "Analyse why the No vote won twice despite government campaigning.", "workspaceLines": 20, "imageRefs": []},
        },
        "sidebar": "Key term: plebiscite", "completed": False, "date": "2026-07-28", "lessonPeriod": "P4",
        "provenance": "manual", "bigIdeaNote": None, "imageRefs": [],
    },
    {
        "id": "les--homefront", "number": 6, "nodeIds": ["VC2HH10K16", "VC2HH10S05"], "bigIdeaId": BI_HOMEFRONT,
        "keyExample": "Women, war work and propaganda on the Australian home front (VC2HH10K16, VC2HH10S05)",
        "practiceQuestion": "How did propaganda posters try to shape what women should feel about the war effort?",
        "assessmentLink": {"miniAssessmentIds": ["mini-propaganda"], "finalAssessment": False, "note": None},
        "tiers": {
            "pass": {"material": "Three home-front propaganda posters aimed at women.",
                      "studentTask": "Describe what each poster is asking women to do.", "workspaceLines": 8, "imageRefs": []},
            "intermediate": {"material": "Posters plus a Red Cross volunteer's letter home.",
                              "studentTask": "Compare the poster ideal with the volunteer's own account of her work.", "workspaceLines": 14, "imageRefs": []},
            "advanced": {"material": "Posters, letter, and post-war female workforce statistics.",
                         "studentTask": "Evaluate how far the war permanently changed women's roles, using the statistics.", "workspaceLines": 20, "imageRefs": []},
        },
        "sidebar": None, "completed": False, "date": "2026-08-05", "lessonPeriod": "P2",
        "provenance": "generated", "bigIdeaNote": None, "imageRefs": [],
    },
    {
        # Unscheduled #1
        "id": "les--interwar", "number": 7, "nodeIds": ["VC2HH10K13", "VC2HH10S02"], "bigIdeaId": BI_IDENTITY,
        "keyExample": "Interwar Australia and rising international tensions through the 1920s-30s",
        "practiceQuestion": "Sequence three events between 1919 and 1939 that made a second world war more likely.",
        "assessmentLink": {"miniAssessmentIds": [], "finalAssessment": False, "note": None},
        "tiers": {
            "pass": {"material": "Interwar timeline strip (blank).",
                      "studentTask": "Place five given events on the timeline.", "workspaceLines": 8, "imageRefs": []},
            "intermediate": {"material": "Timeline strip plus a Treaty of Versailles summary.",
                              "studentTask": "Explain how the Treaty's terms fed resentment in Germany.", "workspaceLines": 14, "imageRefs": []},
            "advanced": {"material": "Timeline, Treaty summary, and Depression-era unemployment data.",
                         "studentTask": "Assess how far economic collapse, not just the Treaty, drove the path to a second war.", "workspaceLines": 20, "imageRefs": []},
        },
        "sidebar": None, "completed": False, "date": None, "lessonPeriod": None,
        "provenance": "manual", "bigIdeaNote": None, "imageRefs": [],
    },
    {
        # Unscheduled #2 — deliberate orphan: no curriculum coverage (nodeIds
        # empty) so orphan-cleanup.js / topic-status-computer.js have a real
        # case to flag. bigIdeaId is set (not null) only because INV-DM-15
        # requires it — see report.
        "id": "les--kokoda", "number": 8, "nodeIds": [], "bigIdeaId": BI_WAR_CAUSES,
        "keyExample": "WWII: Kokoda and the fall of Singapore — not yet mapped to a curriculum outcome",
        "practiceQuestion": "",
        "assessmentLink": {"miniAssessmentIds": [], "finalAssessment": False, "note": None},
        "tiers": {
            "pass": {"material": "", "studentTask": "", "workspaceLines": 0, "imageRefs": []},
            "intermediate": {"material": "", "studentTask": "", "workspaceLines": 0, "imageRefs": []},
            "advanced": {"material": "", "studentTask": "", "workspaceLines": 0, "imageRefs": []},
        },
        "sidebar": None, "completed": False, "date": None, "lessonPeriod": None,
        "provenance": "manual", "bigIdeaNote": "Placeholder — not linked to a big idea's curriculum coverage yet; deliberate orphan for orphan-cleanup testing.",
        "imageRefs": [],
    },
]


# ---------------------------------------------------------------------------
# 5. Marking matrix — 7 criteria across all three tiers, one overridden, to
#    exercise allocateMaxScores + isTierUnbalanced.
# ---------------------------------------------------------------------------

MATRIX_CRITERIA = [
    {"id": "crit-p1", "tier": "pass", "criterion": "Identifies relevant sources", "maxScore": 5,
     "assessmentIds": ["final-assessment"], "allocationOverridden": False},
    {"id": "crit-p2", "tier": "pass", "criterion": "States the main argument", "maxScore": 5,
     "assessmentIds": ["final-assessment"], "allocationOverridden": False},
    {"id": "crit-i1", "tier": "intermediate", "criterion": "Explains cause and consequence", "maxScore": 8,
     "assessmentIds": ["final-assessment"], "allocationOverridden": False},
    {"id": "crit-i2", "tier": "intermediate", "criterion": "Corroborates across two sources", "maxScore": 6,
     "assessmentIds": ["final-assessment"], "allocationOverridden": True},  # deliberately overridden
    {"id": "crit-a1", "tier": "advanced", "criterion": "Evaluates competing interpretations", "maxScore": 10,
     "assessmentIds": ["final-assessment"], "allocationOverridden": False},
    {"id": "crit-a2", "tier": "advanced", "criterion": "Constructs a sustained, evidenced argument", "maxScore": 10,
     "assessmentIds": ["final-assessment"], "allocationOverridden": False},
    {"id": "crit-a3", "tier": "advanced", "criterion": "Uses historical terminology accurately", "maxScore": 6,
     "assessmentIds": ["final-assessment"], "allocationOverridden": False},
]

# name kept fictional and deliberately diverse
STUDENTS = [
    {"id": "stu-priya", "name": "Priya Nandakumar"},
    {"id": "stu-kai", "name": "Kai Whetu-Robinson"},
    {"id": "stu-zainab", "name": "Zainab Osei"},
    {"id": "stu-lachlan", "name": "Lachlan Petrov"},
    {"id": "stu-amara", "name": "Amara Diallo-Smith"},
    {"id": "stu-ren", "name": "Ren Nakamura-Jones"},
    {"id": "stu-theo", "name": "Théo Marchetti"},  # deliberately UNMARKED — no matrix row below
]

# awardedScore mix of whole and fractional numbers -> hasAnyFractionalScore
MARKS = {
    "stu-priya":  [5, 4.5, 8, 6, 9, 9.5, 5],
    "stu-kai":    [4, 4, 7, 5, 8, 8, 5],
    "stu-zainab": [5, 5, 8, 6, 10, 9, 6],
    "stu-lachlan":[3, 3.5, 6, 4, 6, 6.5, 3],
    "stu-amara":  [4.5, 4, 7.5, 5, 8.5, 9, 5.5],
    "stu-ren":    [5, 5, 8, 6, 9, 10, 6],
}

MATRICES = [
    {
        "id": f"mtx-{sid.split('-', 1)[1]}",
        "studentId": sid,
        "scores": [
            {"criterionId": crit["id"], "awardedScore": mark, "comment": ""}
            for crit, mark in zip(MATRIX_CRITERIA, marks)
        ],
    }
    for sid, marks in MARKS.items()
]


# ---------------------------------------------------------------------------
# 6. Resources page — 6 items, at least 2 of each kind. URLs are real,
#    https-scheme (passes validateURLScheme).
# ---------------------------------------------------------------------------

def build_resources_page(image_id: str) -> dict:
    return {
        "id": "resources-page",
        "items": [
            {"id": "ri-awm", "kind": "link", "order": 0,
             "url": "https://www.awm.gov.au/", "label": "Australian War Memorial",
             "note": "Primary source collections, unit histories and the Roll of Honour."},
            {"id": "ri-naa", "kind": "link", "order": 1,
             "url": "https://www.naa.gov.au/", "label": "National Archives of Australia — conscription records",
             "note": "Digitised WWI attestation papers and referendum campaign material."},
            {"id": "ri-glossary", "kind": "text", "order": 2,
             "text": ("Glossary — AIF (Australian Imperial Force, the volunteer expeditionary force raised "
                       "for overseas service); Anzac (Australian and New Zealand Army Corps, later a term "
                       "for the shared military tradition); conscription (compulsory military service, "
                       "twice rejected by referendum in 1916 and 1917); propaganda (information, often "
                       "one-sided, designed to shape public opinion); home front (the civilian side of a "
                       "country during wartime, encompassing work, rationing and morale)."),
             "note": "Key terms for the unit — hand out before Lesson 1."},
            {"id": "ri-excursion", "kind": "text", "order": 3,
             "text": ("Excursion note: Shrine of Remembrance, Melbourne. Half-day visit recommended after "
                       "the Gallipoli lesson — Sanctuary, Galleries of Remembrance and the WWI display "
                       "connect directly to the source-reliability case study."),
             "note": "Book via the Shrine's Learning Programs team at least 6 weeks ahead."},
            {"id": "ri-image-poster", "kind": "image", "order": 4,
             "imageId": image_id, "x": 20, "y": 20, "width": 160, "height": 120,
             "note": "AIF slouch-hat colour swatch, standing in for a recruitment-poster scan."},
            {"id": "ri-image-poster2", "kind": "image", "order": 5,
             "imageId": image_id, "x": 220, "y": 20, "width": 100, "height": 75,
             "note": "Same source image, resources-page thumbnail placement."},
        ],
    }


# ---------------------------------------------------------------------------
# 7. Unit assessment — final assessment (all three tiers, completed) plus
#    4 mini-assessments tied to different big ideas.
# ---------------------------------------------------------------------------

def build_unit_assessment() -> dict:
    return {
        "id": "final-assessment",
        "title": "Investigation essay — Was the Anzac legend earned?",
        "bigIdeaId": BI_IDENTITY,
        "coverage": [
            {"nodeId": "VC2HH10K23", "coverage": "full", "note": "Direct assessment of the debate over significance."},
            {"nodeId": "VC2HH10S06", "coverage": "full", "note": "Evaluating historical interpretations is the essay's core skill."},
        ],
        "finalAssessment": {
            "pass": {"tier": "pass",
                     "material": "Three short extracts: a 1915 newspaper report, a 2010 textbook summary, and the Anzac Day dawn service order of service.",
                     "studentTask": "State what the Anzac legend claims about Australian character, using one quote from each extract.",
                     "workspaceLines": 20, "imageRefs": []},
            "intermediate": {"tier": "intermediate",
                              "material": "The pass extracts plus a 1980s revisionist historian's critique of the legend.",
                              "studentTask": "Explain two ways the revisionist critique challenges the popular legend.",
                              "workspaceLines": 24, "imageRefs": []},
            "advanced": {"tier": "advanced",
                         "material": "All prior sources plus a comparative extract on the Kiwi 'Anzac' tradition.",
                         "studentTask": "Argue, with evidence from at least four sources, whether the Anzac legend is historically earned or a national myth.",
                         "workspaceLines": 28, "imageRefs": []},
        },
        "finalAssessmentCompleted": True,
        "finalAssessmentDate": "2026-08-12",
        "finalAssessmentPeriod": "P3-P4 (double)",
        "miniAssessments": [
            {"id": "mini-70a5c085", "name": "Source analysis check-in", "bigIdeaId": BI_METHOD,
             "coverage": [{"nodeId": "VC2HH10S03", "coverage": "full", "note": "Direct check of source-analysis skill."}],
             "order": 0,
             "tiers": {
                 "pass": {"material": "One Gallipoli-landing letter.", "studentTask": "Identify fact vs opinion.", "workspaceLines": 6, "imageRefs": []},
                 "intermediate": {"material": "Letter plus official history extract.", "studentTask": "Explain one difference in tone.", "workspaceLines": 10, "imageRefs": []},
                 "advanced": {"material": "Letter, official history, revisionist critique.", "studentTask": "Rank the three sources by reliability with reasons.", "workspaceLines": 14, "imageRefs": []},
             }},
            {"id": "mini-propaganda", "name": "Propaganda poster analysis", "bigIdeaId": BI_HOMEFRONT,
             "coverage": [{"nodeId": "VC2HH10S05", "coverage": "full", "note": "Perspectives/values analysis via posters."}],
             "order": 1,
             "tiers": {
                 "pass": {"material": "One home-front propaganda poster.", "studentTask": "Describe the poster's message.", "workspaceLines": 6, "imageRefs": []},
                 "intermediate": {"material": "Poster plus a Red Cross volunteer letter.", "studentTask": "Compare the poster's ideal with the letter's reality.", "workspaceLines": 10, "imageRefs": []},
                 "advanced": {"material": "Poster, letter, and workforce statistics.", "studentTask": "Evaluate how effectively propaganda shaped behaviour, citing the statistics.", "workspaceLines": 14, "imageRefs": []},
             }},
            {"id": "mini-conscript", "name": "Conscription debate source pack", "bigIdeaId": BI_HOMEFRONT,
             "coverage": [{"nodeId": "VC2HH10K14", "coverage": "partial", "note": "Enlistment motive covered; referendum campaign mechanics left for the final essay."}],
             "order": 2,
             "tiers": {
                 "pass": {"material": "Yes/No campaign postcards.", "studentTask": "Sort postcards Yes/No and give one reason each.", "workspaceLines": 6, "imageRefs": []},
                 "intermediate": {"material": "Postcards plus a Hughes speech extract.", "studentTask": "Explain the Labor Party split over conscription.", "workspaceLines": 10, "imageRefs": []},
                 "advanced": {"material": "Postcards, speech extract, referendum result tables.", "studentTask": "Analyse why the No vote won twice.", "workspaceLines": 14, "imageRefs": []},
             }},
            {"id": "mini-identity", "name": "Home front source study", "bigIdeaId": BI_IDENTITY,
             "coverage": [],  # deliberately uncovered — keeps a visible gap in the Coverage Grid
             "order": 3,
             "tiers": {
                 "pass": {"material": "", "studentTask": "", "workspaceLines": 0, "imageRefs": []},
                 "intermediate": {"material": "", "studentTask": "", "workspaceLines": 0, "imageRefs": []},
                 "advanced": {"material": "", "studentTask": "", "workspaceLines": 0, "imageRefs": []},
             }},
        ],
    }


# ---------------------------------------------------------------------------
# 8. Crib sheet — one section per big idea, real text, long enough that
#    isOverflow (computed at crib-sheet.js:657, pageCount > 2) is genuinely
#    reachable once the app renders it. isOverflow itself is NOT hand-set.
# ---------------------------------------------------------------------------

def build_crib_sheet() -> dict:
    long_text = (
        "Trace the chain from alliance system to July Crisis to general war. Students should be able to "
        "name at least three alliance blocs, one flashpoint (Sarajevo), and explain why a regional dispute "
        "escalated. Link forward to the human cost studied at Gallipoli and the Western Front, and back to "
        "the Industrial Revolution's role in enabling total war (mass production of munitions, rail "
        "mobilisation, mechanised killing). Common misconception to correct: the war was not caused by any "
        "single assassination alone — the alliance obligations made a wider war structurally likely once "
        "mobilisation began."
    )
    return {
        "id": "crib-sheet-1",
        "title": "Australians at War — Crib Sheet",
        "orientation": "portrait",
        "sections": [
            {"bigIdeaId": BI_WAR_CAUSES, "half": "upper", "text": long_text,
             "imageRefs": [], "size": "large", "provenance": "edited"},
            {"bigIdeaId": BI_METHOD, "half": "lower",
             "text": ("Every source has a purpose, an audience and a context. Model the routine: who made "
                       "this, when, why, for whom, and what does that mean for how much we trust it. The "
                       "Gallipoli letters-vs-official-history contrast is the reusable worked example."),
             "imageRefs": [], "size": "medium", "provenance": "edited"},
            {"bigIdeaId": BI_HOMEFRONT, "half": "upper",
             "text": ("Two referenda, both lost by the government, both deeply divisive. Enlistment was "
                       "voluntary throughout the war in Australia — uniquely among the major combatants. "
                       "Connect the propaganda posters aimed at women to the conscription campaign posters: "
                       "same techniques, different targets."),
             "imageRefs": [], "size": "medium", "provenance": "edited"},
            {"bigIdeaId": BI_IDENTITY, "half": "lower",
             "text": ("The Anzac legend formed almost immediately after the Gallipoli landing (Bean's "
                       "despatches) and has been contested ever since. Keep the essay question front of mind: "
                       "earned tradition, or convenient myth? Both readings need evidence, not assertion."),
             "imageRefs": [], "size": "medium", "provenance": "edited"},
        ],
        "pageCount": 1,       # left as authored default; app recomputes on render
        "provenance": "manual",
        "isOverflow": False,  # computed field — never hand-set; see crib-sheet.js:657
    }


# ---------------------------------------------------------------------------
# Assemble and write
# ---------------------------------------------------------------------------

def main():
    template = json.loads(TEMPLATE_PATH.read_text())
    template_keys = set(template.keys())

    # --- image file on disk (not base64) ---
    # serve.py's GET /api/images/<id> resolves by filename PREFIX match
    # (images/<id>.<ext>) — the id is NOT an arbitrary manifest key, it must
    # equal the filename stem, or the server silently falls back to the
    # 1x1 placeholder (serve.py:255-279). id == filename stem here so the
    # real file actually round-trips.
    image_id = "aif-poster"
    image_filename = f"{image_id}.png"
    png_bytes = make_png(40, 30)
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    (IMAGES_DIR / image_filename).write_bytes(png_bytes)

    unit = {
        "schemaVersion": template["schemaVersion"],
        "generatedFrom": "seed-testunit.py",
        "meta": {
            "subject": "History",
            "level": "Year 10",
            "unitName": "Australians at War 1914-1945",
            "teacher": "Luke Isham",
            "dateCreated": FIXED_CREATED,
            "dateModified": FIXED_MODIFIED,
        },
        "curriculum": {
            "profileId": "vic-f10-v2",
            "name": "Victorian Curriculum F-10 Version 2.0",
            "jurisdiction": "VIC",
            "version": "2.0",
            "sourceRef": "https://victoriancurriculum.vcaa.vic.edu.au/",
            "licence": "CC BY 4.0",
            "attribution": "© VCAA",
            "labels": {
                "strand": "Strand",
                # Renames "Content Description" -> the agreed "Criteria"
                # terminology. Stored SINGULAR, matching "Strand"/"Task":
                # coverage-grid.js pluralises via getKindLabelPlural(), which
                # maps the irregular "Criterion" -> "Criteria". (The earlier
                # naive `${label}s` append, which would have rendered
                # "Criterias", was fixed in curriculum-editor.js.)
                "outcome": "Criterion",
                "task": "Task",
                "cribSheetHalves": {"upper": "Know", "lower": "Do"},
            },
            "description": "Victorian Curriculum F-10 Version 2.0, History, Level 10.",
            "ingestedAt": FIXED_CREATED,
        },
        # nodes: fixed at 32 — the full ingested outcome set for this unit's
        # two strands (Australians at War + concepts/skills), unchanged in
        # count from the original ingest, typo'd strand titles fixed in place.
        "nodes": NODES,
        # topics: 6 — matches the 6 ingested strands; unlocks topic-status
        # and coverage-grid grouping by strand rather than a single bucket.
        "topics": TOPICS,
        # bigIdeas: 4 across 2 topics (3 under the war strand, 1 under
        # method) — enough for arbor-tree/bigidea-list to show real
        # hierarchy and for lesson-reorder topic-mode to have >1 group.
        "bigIdeas": BIG_IDEAS,
        # lessons: 8 — 6 dated across a real Term 3 week pattern (exercises
        # date-mode grouping + completed/provenance variation), 2 unscheduled
        # (exercises the unscheduled bucket in date-mode), 1 of the 8 is a
        # deliberate coverage orphan (nodeIds: []) for orphan-cleanup.js.
        "lessons": LESSONS,
        "cribSheet": build_crib_sheet(),
        "resourcesPage": build_resources_page(image_id),
        "unitAssessment": build_unit_assessment(),
        # matrixTemplate.criteria: 7 — spans all three tiers (2 pass /
        # 2 intermediate / 1... adjusted to 2/2/3 below) with one
        # allocationOverridden:true criterion, the minimum needed to
        # exercise both allocateMaxScores (auto-allocation excluding the
        # override) and isTierUnbalanced (override alone can blow the tier
        # budget).
        "matrixTemplate": {"orientation": "portrait", "criteria": MATRIX_CRITERIA},
        # matrices: one row per MARKED student (6) — Théo intentionally
        # has no row at all, which is what isUnmarked()/the unmarked-student
        # path in marking-matrix.js actually checks for.
        "matrices": MATRICES,
        # students: 7 — 6 marked with a mix of whole/fractional scores
        # (hasAnyFractionalScore), 1 (Théo Marchetti) deliberately
        # unmarked; his accented name also exercises the
        # Content-Length-in-bytes-not-characters path in test_serve.py.
        "students": STUDENTS,
        # images: 1 real PNG on disk + its manifest row. Referenced twice
        # from resourcesPage.items so the same imageId is resolved from two
        # call sites.
        "images": [{
            "id": image_id,
            "filename": image_filename,
            "mimeType": "image/png",
            "width": 40,
            "height": 30,
            "byteSize": len(png_bytes),
            "addedAt": FIXED_CREATED,
        }],
    }

    # --- THE POINT OF THIS SCRIPT: schema-drift guard -----------------
    output_keys = set(unit.keys())
    if output_keys != template_keys:
        missing = template_keys - output_keys
        extra = output_keys - template_keys
        raise AssertionError(
            "Seed output top-level keys do not match _template/unit.json — "
            "schema drift detected.\n"
            f"  Missing from seed output (present in template): {sorted(missing)}\n"
            f"  Extra in seed output (absent from template):     {sorted(extra)}\n"
            "If this is intentional, update _template/unit.json first (the "
            "schema contract), then re-run this script."
        )

    UNIT_PATH.write_text(json.dumps(unit, indent=2, ensure_ascii=False) + "\n")

    print(f"Wrote {UNIT_PATH}")
    print(f"Wrote {IMAGES_DIR / image_filename} ({len(png_bytes)} bytes)")
    print("Counts:")
    print(f"  nodes             = {len(unit['nodes'])}")
    print(f"  topics            = {len(unit['topics'])}")
    print(f"  bigIdeas          = {len(unit['bigIdeas'])}")
    print(f"  lessons           = {len(unit['lessons'])}")
    print(f"  resourcesPage     = {len(unit['resourcesPage']['items'])}")
    print(f"  miniAssessments   = {len(unit['unitAssessment']['miniAssessments'])}")
    print(f"  students          = {len(unit['students'])}")
    print(f"  matrices          = {len(unit['matrices'])}")
    print(f"  matrixTemplate    = {len(unit['matrixTemplate']['criteria'])} criteria")
    print(f"  images            = {len(unit['images'])}")


if __name__ == "__main__":
    main()
