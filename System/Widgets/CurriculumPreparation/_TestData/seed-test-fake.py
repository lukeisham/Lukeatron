#!/usr/bin/env python3
"""
seed-test-fake.py

Builds `_test/` — the TEST-labelled refactor sandbox that sits beside `_template/`
under the !AppDevelopment Phase 4 layout — and fills it with data that is
obviously, unmistakably invented.

WHY THIS EXISTS SEPARATELY FROM seed-testunit.py:
  The two test corpora answer different questions and must not be merged.

    seed-testunit.py  →  _TestData/vic-f10-v2-history/AustraliansAtWar-testunit/
        REAL Victorian curriculum, REAL messy teacher paste. A measurement
        instrument: it is what the importer is scored against, and the score is
        only comparable over time because the input never changes. Its realism
        IS the point.

    seed-test-fake.py →  _test/
        WHOLLY FICTIONAL curriculum ("Dragonology", jurisdiction TESTLAND). The
        place refactor changes are tried before they are ported into _template/.
        Nothing in it could be mistaken for Luke's real teaching work, which is
        the point — a refactor sandbox gets edited, broken and thrown around.

HOW IT WORKS:
  Rather than hand-authoring a unit against 44 INV-DM-* invariants, this script
  takes the STRUCTURE of the AustraliansAtWar fixture and substitutes every
  human-readable string. Ids, kinds, enums, coverage values, tiers and cross-
  references are preserved exactly, so the result is guaranteed schema-valid and
  exercises the same code paths (crib-sheet overflow, coverage grid, matrix
  allocation, image loading, lesson reorder, traceability). Curriculum CODES are
  remapped and every reference to them is rewritten with them.

  It asserts the top-level key set against _template/unit.json, exactly as
  seed-testunit.py does, so schema drift is caught here too.

Usage:
    python3 seed-test-fake.py

Deterministic: no randomness, no wall-clock. Safe to re-run — overwrites
_test/unit.json and _test/images/dragon-swatch.png.
"""

import json
import struct
import zlib
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CP_ROOT = ROOT.parent                                   # CurriculumPreparation/
TEMPLATE = CP_ROOT / "_template" / "unit.json"
SOURCE = ROOT / "vic-f10-v2-history" / "AustraliansAtWar-testunit" / "unit.json"
TEST_DIR = CP_ROOT / "_test"
OUT = TEST_DIR / "unit.json"
IMAGES = TEST_DIR / "images"

FIXED_CREATED = "2099-01-01T00:00:00.000Z"
FIXED_MODIFIED = "2099-01-02T00:00:00.000Z"


# ---------------------------------------------------------------------------
# A tiny real PNG (valid, decodable — not a stub), dragon-scale green.
# ---------------------------------------------------------------------------

def _png_chunk(tag: bytes, data: bytes) -> bytes:
    return (struct.pack(">I", len(data)) + tag + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF))


def make_png(width: int, height: int, rgb=(46, 110, 74)) -> bytes:
    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    row = bytes(rgb) * width
    raw = b"".join(b"\x00" + row for _ in range(height))
    return (sig + _png_chunk(b"IHDR", ihdr)
            + _png_chunk(b"IDAT", zlib.compress(raw, level=9))
            + _png_chunk(b"IEND", b""))


# ---------------------------------------------------------------------------
# The fictional lexicon. Everything a human can read comes from here.
# ---------------------------------------------------------------------------

KNOWLEDGE_TEXT = [
    "the six recognised dragon families and where each one nests",
    "why wyverns are counted separately from true dragons",
    "the hoard cycle and what a dragon does with treasure it cannot spend",
    "the role of dragons in the founding stories of the Northern Marches",
    "significant dragon-riders and the councils that opposed them",
    "the long peace of the Third Marches and how it was negotiated",
    "the causes of the Cinder Winter and the Second Scale War",
    "the reasons villagers of the Marches chose to keep a dragon-watch",
    "significant places where dragons were sighted and recorded",
    "the experiences and perspectives of those who lived beside a nesting site",
    "significant events and turning points of the Second Scale War",
    "continuities and changes in the practice of dragon-keeping",
    "the causes of the Great Hoard Dispersal",
    "the diverse experiences of hoard-keepers and hoard-less households",
    "different interpretations and debates about the significance of the Scale Wars",
]

SKILL_TEXT = [
    "formulate, refine and use dragonological questions to inform an inquiry",
    "sequence significant sightings, individuals, ideas and developments",
    "analyse the purpose, features, content and context of scale-record sources",
    "analyse the perspectives, beliefs and attitudes of people in the Marches",
    "evaluate competing dragonological interpretations and debates",
    "analyse continuity and change in nesting behaviour",
    "analyse short- and long-term causes and the unintended consequences of a hoard dispersal",
    "evaluate the significance of individuals, flights, movements or events",
    "construct sustained dragonological interpretations and arguments",
    "communicate findings using appropriate dragonological terminology",
]

STRAND_TITLES = [
    "Knowledge", "concepts and skills", "Continuity and change",
    "causes and consequences", "Dragonological significance", "community",
]

TOPIC_TITLES = [
    "Knowledge", "Concepts, Skills & Dragonological Method",
    "Continuity and change", "causes and consequences",
    "Dragonological significance", "community",
]

BIGIDEA_TITLES = [
    "A hoard is a claim, not a fortune",
    "Every sighting record is written by someone with a reason",
    "The Marches changed the dragons as much as the dragons changed the Marches",
    "Significance is argued, never simply found",
]

STUDENTS = [
    "Testy McTestface", "Alpha Testcase", "Beta Placeholder",
    "Gamma Sampleson", "Delta Dummydata", "Epsilon Notreal",
    "Zeta Fakename",
]

CRITERIA = [
    "Identifies relevant scale-records",
    "States the main argument",
    "Explains cause and consequence",
    "Corroborates across two records",
    "Evaluates competing interpretations",
    "Constructs a sustained, evidenced argument",
    "Uses dragonological terminology accurately",
]

KEY_EXAMPLES = [
    "The Ashfell nesting site, 1102",
    "Warden Grimsby's dragon-watch ledger",
    "The Cinder Winter petition",
    "Three conflicting accounts of the Ridgeback sighting",
    "The Hoard Dispersal Register",
    "A wyvern misfiled as a true dragon",
    "The Scale War memorial at Northgate",
    "Two maps of the same nesting range, forty years apart",
]

PRACTICE_QUESTIONS = [
    "Whose interests does this record serve, and how can you tell?",
    "What changed in the Marches, and what stubbornly did not?",
    "Which of these two accounts would you trust further, and why?",
    "Is this event significant, or merely well documented?",
    "What would you need to find to prove this claim wrong?",
    "How would a hoard-keeper have described this differently?",
    "What does the silence in this source tell you?",
]

SIDEBARS = [
    "TEST DATA — invented for refactor work. Bring the scale-record facsimiles.",
    "TEST DATA — remind the class that wyverns are not dragons.",
    "TEST DATA — short lesson; the Northgate excursion runs over.",
]

MATERIAL = {
    "pass": "TEST — one-page summary of the topic, with the key terms glossed in the margin.",
    "intermediate": "TEST — two contrasting scale-records, with a comparison frame.",
    "advanced": "TEST — an unedited archive extract and a modern dragonologist's rebuttal.",
}
TASK = {
    "pass": "TEST — list the three main points and define each key term in your own words.",
    "intermediate": "TEST — explain how the two records disagree, and suggest why.",
    "advanced": "TEST — argue which interpretation is better supported, citing both records.",
}

CRIB_TEXT = {
    "large": (
        "TEST DATA — NOT REAL TEACHING CONTENT. Six dragon families: Ridgeback, "
        "Emberwing, Silt-crawler, Northern Frill, Hollowscale, and the disputed "
        "Marches Grey. Wyverns are counted separately (two legs, no forelimbs) and "
        "are a common misfiling in older records. A hoard is a territorial claim "
        "rather than stored wealth, which is why a dispersal reads as a political "
        "event and not an economic one. The Cinder Winter (1098-1101) is the "
        "conventional dividing line between the early and late Marches record."
    ),
    "medium": (
        "TEST DATA — NOT REAL TEACHING CONTENT. Ask of every scale-record: who "
        "wrote it, for whom, and what were they trying to obtain? Ledger entries "
        "were kept for compensation claims, so they systematically over-report "
        "damage and under-report ordinary sightings."
    ),
}

RESOURCES = [
    dict(label="Museum of Invented Dragonology (TEST LINK — does not resolve)",
         url="https://example.invalid/test-dragonology",
         note="TEST DATA — placeholder link. Deliberately unresolvable."),
    dict(label="Neverwhere National Archive — hoard registers (TEST LINK)",
         url="https://example.invalid/test-hoard-registers",
         note="TEST DATA — placeholder link. Deliberately unresolvable."),
    dict(text=("TEST DATA — Glossary: hoard (a territorial claim), scale-record "
               "(a written sighting), dragon-watch (a village rota), wyvern (not "
               "a dragon), dispersal (the breaking up of a hoard)."),
         note="TEST DATA — hand out before lesson 2."),
    dict(text=("TEST DATA — Excursion note: Northgate Memorial, Neverwhere. "
               "Entirely fictional; do not attempt to book."),
         note="TEST DATA — fictional venue, fictional booking process."),
    dict(note="TEST DATA — dragon-scale colour swatch, standing in for a real image."),
    dict(note="TEST DATA — same image, resources-page thumbnail."),
]


# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------

def counter():
    """Cycle a list without ever running off the end."""
    def pick(seq, i):
        return seq[i % len(seq)]
    return pick


pick = counter()


def remap_codes(unit):
    """VC2HH10K01 -> TESTDRK01, VC2HH10S01 -> TESTDRS01. Rewrites every
    reference to a node id anywhere in the document, not just nodes[]."""
    mapping = {}
    for n in unit["nodes"]:
        code = n.get("code")
        if not code:
            continue
        tail = code[len("VC2HH10"):] if code.startswith("VC2HH10") else code
        mapping[code] = "TESTDR" + tail
    return mapping


def apply_map(obj, mapping):
    if isinstance(obj, dict):
        return {k: apply_map(v, mapping) for k, v in obj.items()}
    if isinstance(obj, list):
        return [apply_map(v, mapping) for v in obj]
    if isinstance(obj, str):
        return mapping.get(obj, obj)
    return obj


def main() -> int:
    if not SOURCE.exists():
        print(f"ERROR: structural source missing: {SOURCE}", file=sys.stderr)
        return 1
    if not TEMPLATE.exists():
        print(f"ERROR: template missing: {TEMPLATE}", file=sys.stderr)
        return 1

    unit = json.loads(SOURCE.read_text(encoding="utf-8"))
    template = json.loads(TEMPLATE.read_text(encoding="utf-8"))

    # --- the point of the script: schema drift check (mirrors seed-testunit.py)
    assert set(unit) == set(template), (
        "Top-level key drift between the fixture and _template/unit.json:\n"
        f"  only in fixture: {sorted(set(unit) - set(template))}\n"
        f"  only in template: {sorted(set(template) - set(unit))}"
    )

    unit = apply_map(unit, remap_codes(unit))

    # --- meta / curriculum -------------------------------------------------
    unit["generatedFrom"] = "seed-test-fake.py"
    unit["meta"] = {
        "subject": "Dragonology",
        "level": "Year 9",
        "unitName": "TEST UNIT — Dragons of the Northern Marches",
        "teacher": "Ms Testerina Faketeacher",
        "dateCreated": FIXED_CREATED,
        "dateModified": FIXED_MODIFIED,
    }
    unit["curriculum"].update({
        "profileId": "test-fake-v0",
        "name": "TEST CURRICULUM — Neverwhere F-10 Version 0.0 (not a real curriculum)",
        "jurisdiction": "TESTLAND",
        "version": "0.0",
        "sourceRef": "https://example.invalid/test-curriculum",
        "licence": "TEST DATA — no licence; wholly invented content",
        "attribution": "TEST DATA — invented for refactor work; no real authority",
        "description": "TEST CURRICULUM. Wholly fictional. Dragonology, Level 9.",
        "ingestedAt": FIXED_CREATED,
        "suggestedName": "TEST UNIT — Dragons of the Northern Marches",
    })
    unit["curriculum"]["labels"].update({
        "strand": "Strand", "outcome": "Criterion", "task": "Task",
        "cribSheetHalves": {"upper": "Know", "lower": "Do"},
    })

    # --- nodes -------------------------------------------------------------
    k = s = t = 0
    for n in unit["nodes"]:
        if n["kind"] == "strand":
            if n["id"] == "root":
                n["title"] = "Unit"
            else:
                n["title"] = pick(STRAND_TITLES, t)
                t += 1
        elif n["kind"] == "outcome":
            if n.get("domain") == "skill":
                n["text"] = pick(SKILL_TEXT, s); s += 1
            else:
                n["text"] = pick(KNOWLEDGE_TEXT, k); k += 1

    for i, tp in enumerate(unit["topics"]):
        tp["title"] = pick(TOPIC_TITLES, i)
        if tp.get("text"):
            tp["text"] = "TEST DATA — invented topic note."

    for i, bi in enumerate(unit["bigIdeas"]):
        bi["title"] = pick(BIGIDEA_TITLES, i)
        for cov in bi.get("coverage", []):
            if cov.get("note"):
                cov["note"] = "TEST DATA — invented coverage note."

    # --- lessons -----------------------------------------------------------
    for i, ls in enumerate(unit["lessons"]):
        ls["keyExample"] = pick(KEY_EXAMPLES, i)
        if ls.get("practiceQuestion"):
            ls["practiceQuestion"] = pick(PRACTICE_QUESTIONS, i)
        if ls.get("sidebar"):
            ls["sidebar"] = pick(SIDEBARS, i)
        if ls.get("bigIdeaNote"):
            ls["bigIdeaNote"] = "TEST DATA — invented note linking the lesson to its big idea."
        for tier in ("pass", "intermediate", "advanced"):
            block = ls.get("tiers", {}).get(tier) or {}
            if block.get("material"):
                block["material"] = MATERIAL[tier]
            if block.get("studentTask"):
                block["studentTask"] = TASK[tier]

    # --- crib sheet --------------------------------------------------------
    unit["cribSheet"]["title"] = "TEST UNIT — Crib Sheet (invented data)"
    for sec in unit["cribSheet"]["sections"]:
        sec["text"] = CRIB_TEXT.get(sec.get("size"), CRIB_TEXT["medium"])

    # --- resources ---------------------------------------------------------
    for i, item in enumerate(unit["resourcesPage"]["items"]):
        spec = pick(RESOURCES, i)
        for field in ("label", "url", "text", "note"):
            if field in item and item[field] is not None:
                item[field] = spec.get(field, f"TEST DATA — invented {field}.")

    # --- assessment --------------------------------------------------------
    ua = unit["unitAssessment"]
    ua["title"] = "TEST UNIT — Major Assessment (invented)"
    for tier in ("pass", "intermediate", "advanced"):
        block = ua.get("majorAssessment", {}).get(tier) or {}
        if block.get("material"):
            block["material"] = MATERIAL[tier]
        if block.get("studentTask"):
            block["studentTask"] = TASK[tier]
    for cov in ua.get("coverage", []):
        if cov.get("note"):
            cov["note"] = "TEST DATA — invented coverage note."
    for i, mini in enumerate(ua.get("miniAssessments", [])):
        mini["name"] = f"TEST Mini Assessment {i + 1}"
        for cov in mini.get("coverage", []):
            if cov.get("note"):
                cov["note"] = "TEST DATA — invented coverage note."
        for tier in ("pass", "intermediate", "advanced"):
            block = mini.get("tiers", {}).get(tier) or {}
            if block.get("material"):
                block["material"] = MATERIAL[tier]
            if block.get("studentTask"):
                block["studentTask"] = TASK[tier]

    # --- matrix + students -------------------------------------------------
    # Student ids in the real fixture are slugs of real-ish names ("stu-priya"),
    # so they are remapped too — a name must not survive anywhere, id included.
    for i, c in enumerate(unit["matrixTemplate"]["criteria"]):
        c["criterion"] = pick(CRITERIA, i)
    id_map = {}
    for i, st in enumerate(unit["students"]):
        st["name"] = pick(STUDENTS, i)
        id_map[st["id"]] = f"stu-test-{i + 1:02d}"
    for i, mx in enumerate(unit["matrices"]):
        id_map[mx["id"]] = f"mtx-test-{i + 1:02d}"
    unit = apply_map(unit, id_map)

    # --- image -------------------------------------------------------------
    IMAGES.mkdir(parents=True, exist_ok=True)
    png = make_png(40, 30)
    old_ids = {img["id"] for img in unit["images"]}
    (IMAGES / "dragon-swatch.png").write_bytes(png)
    for img in unit["images"]:
        img.update({"id": "dragon-swatch", "filename": "dragon-swatch.png",
                    "mimeType": "image/png", "width": 40, "height": 30,
                    "byteSize": len(png), "addedAt": FIXED_CREATED})
    unit = apply_map(unit, {old: "dragon-swatch" for old in old_ids})
    for stale in IMAGES.glob("*.png"):
        if stale.name != "dragon-swatch.png":
            stale.unlink()

    OUT.write_text(json.dumps(unit, indent=2, ensure_ascii=False) + "\n",
                   encoding="utf-8")
    print(f"wrote {OUT.relative_to(CP_ROOT)}  "
          f"({len(unit['nodes'])} nodes, {len(unit['lessons'])} lessons, "
          f"{len(unit['students'])} students)")
    print(f"wrote {(IMAGES / 'dragon-swatch.png').relative_to(CP_ROOT)} ({len(png)} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
