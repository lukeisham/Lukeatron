"""One verse a day: the NIV verse of the day when online, a Berean Standard Bible verse from disk
when not — each labelled for what it is.

Only an NIV result is cached, so a day that starts offline still picks up the NIV once the Mac is
back online. The BSB choice is a day-seeded pick from verses.txt, looked up in the BSB text file
that lives in Memory/Long-Term/Bible/.
"""

from __future__ import annotations

import html
import json
import logging
import re
import urllib.request
from dataclasses import asdict, dataclass
from datetime import date
from pathlib import Path
from typing import Any, Callable

log = logging.getLogger("home.verse")

FEED_URL = "https://www.biblegateway.com/votd/get/?format=json&version=NIV"
FETCH_TIMEOUT_S = 2.5

NIV_NOTICE = (
    "Scripture quotations taken from The Holy Bible, New International Version® NIV® "
    "Copyright © 1973, 1978, 1984, 2011 by Biblica, Inc.™ Used by permission. "
    "All rights reserved worldwide."
)
BSB_NOTICE = (
    "The Holy Bible, Berean Standard Bible, BSB is produced in cooperation with Bible Hub, "
    "Discovery Bible, OpenBible.com, and the Berean Bible Translation Committee. This text of "
    "God's Word has been dedicated to the public domain."
)
BSB_LABEL = "Berean Standard Bible · offline"

# The book codes used by engbsb_vpl.txt (not the usual USFM codes: JOH, MAR, EZE, SOL, …).
BOOK_NAMES = {
    "GEN": "Genesis", "EXO": "Exodus", "LEV": "Leviticus", "NUM": "Numbers", "DEU": "Deuteronomy",
    "JOS": "Joshua", "JDG": "Judges", "RUT": "Ruth", "1SA": "1 Samuel", "2SA": "2 Samuel",
    "1KI": "1 Kings", "2KI": "2 Kings", "1CH": "1 Chronicles", "2CH": "2 Chronicles", "EZR": "Ezra",
    "NEH": "Nehemiah", "EST": "Esther", "JOB": "Job", "PSA": "Psalm", "PRO": "Proverbs",
    "ECC": "Ecclesiastes", "SOL": "Song of Songs", "ISA": "Isaiah", "JER": "Jeremiah",
    "LAM": "Lamentations", "EZE": "Ezekiel", "DAN": "Daniel", "HOS": "Hosea", "JOE": "Joel",
    "AMO": "Amos", "OBA": "Obadiah", "JON": "Jonah", "MIC": "Micah", "NAH": "Nahum",
    "HAB": "Habakkuk", "ZEP": "Zephaniah", "HAG": "Haggai", "ZEC": "Zechariah", "MAL": "Malachi",
    "MAT": "Matthew", "MAR": "Mark", "LUK": "Luke", "JOH": "John", "ACT": "Acts", "ROM": "Romans",
    "1CO": "1 Corinthians", "2CO": "2 Corinthians", "GAL": "Galatians", "EPH": "Ephesians",
    "PHI": "Philippians", "COL": "Colossians", "1TH": "1 Thessalonians", "2TH": "2 Thessalonians",
    "1TI": "1 Timothy", "2TI": "2 Timothy", "TIT": "Titus", "PHM": "Philemon", "HEB": "Hebrews",
    "JAM": "James", "1PE": "1 Peter", "2PE": "2 Peter", "1JO": "1 John", "2JO": "2 John",
    "3JO": "3 John", "JUD": "Jude", "REV": "Revelation",
}

_REFERENCE = re.compile(r"^([1-3]?[A-Z]{2,3}) (\d+):(\d+)(?:-(\d+))?$")
_TAG = re.compile(r"<[^>]+>")


class VerseError(Exception):
    pass


@dataclass(frozen=True)
class Verse:
    text: str
    reference: str
    version: str  # NIV · BSB
    label: str
    notice: str
    link: str | None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class Reference:
    book: str
    chapter: int
    first: int
    last: int

    def display(self) -> str:
        verses = f"{self.first}" if self.first == self.last else f"{self.first}–{self.last}"
        return f"{BOOK_NAMES[self.book]} {self.chapter}:{verses}"


def parse_reference(line: str) -> Reference:
    match = _REFERENCE.match(line.strip())
    if not match or match.group(1) not in BOOK_NAMES:
        raise VerseError(f"not a reference: {line!r}")
    book, chapter, first, last = match.groups()
    return Reference(book, int(chapter), int(first), int(last or first))


def parse_feed(raw: bytes) -> Verse:
    try:
        votd = json.loads(raw)["votd"]
        text = html.unescape(_TAG.sub("", votd["content"])).strip()
        reference = html.unescape(votd["display_ref"]).strip()
        link = html.unescape(votd.get("permalink") or "") or None
    except (ValueError, KeyError, TypeError) as exc:
        raise VerseError(f"unexpected feed shape: {exc}") from exc
    if not text or not reference:
        raise VerseError("feed returned an empty verse")
    return Verse(text, reference, "NIV", "NIV", NIV_NOTICE, link)


def fetch_niv(timeout: float = FETCH_TIMEOUT_S) -> Verse:
    request = urllib.request.Request(FEED_URL, headers={"User-Agent": "Lukeatron-Home/1"})
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return parse_feed(response.read(65536))
    except OSError as exc:
        raise VerseError(f"feed unreachable: {exc}") from exc


def read_cache(cache_file: Path, today: date) -> Verse | None:
    try:
        with cache_file.open(encoding="utf-8") as handle:
            raw = json.load(handle)
    except (OSError, ValueError):
        return None
    if raw.get("date") != today.isoformat():
        return None
    return Verse(**raw["verse"])


def write_cache(cache_file: Path, today: date, verse: Verse) -> None:
    cache_file.parent.mkdir(parents=True, exist_ok=True)
    temp = cache_file.with_suffix(".tmp")
    with temp.open("w", encoding="utf-8") as handle:
        json.dump({"date": today.isoformat(), "verse": verse.to_dict()}, handle)
    temp.replace(cache_file)


def load_references(refs_file: Path) -> list[Reference]:
    with refs_file.open(encoding="utf-8") as handle:
        return [parse_reference(line) for line in handle if line.strip() and not line.startswith("#")]


def bsb_text(bsb_file: Path, ref: Reference) -> str:
    """Scans the BSB file once, stopping as soon as the range is passed (the file is 31k lines)."""
    prefix = f"{ref.book} {ref.chapter}:"
    parts: list[str] = []
    with bsb_file.open(encoding="utf-8") as handle:
        for line in handle:
            if not line.startswith(prefix):
                if parts:
                    break
                continue
            verse_no, _, text = line[len(prefix):].partition(" ")
            number = int(verse_no)
            if number > ref.last:
                break
            if number >= ref.first:
                parts.append(text.strip())
    if not parts:
        raise VerseError(f"{ref.display()} not found in {bsb_file.name}")
    return " ".join(parts)


def offline_verse(refs_file: Path, bsb_file: Path, today: date) -> Verse:
    refs = load_references(refs_file)
    ref = refs[(today.timetuple().tm_yday - 1) % len(refs)]
    return Verse(bsb_text(bsb_file, ref), ref.display(), "BSB", BSB_LABEL, BSB_NOTICE, None)


def todays_verse(
    *,
    today: date,
    cache_file: Path,
    refs_file: Path,
    bsb_file: Path,
    fetch: Callable[[], Verse] = fetch_niv,
) -> Verse | None:
    cached = read_cache(cache_file, today)
    if cached:
        return cached
    try:
        verse = fetch()
    except VerseError as exc:
        log.info("NIV verse unavailable, using BSB: %s", exc)
    else:
        try:
            write_cache(cache_file, today, verse)
        except OSError as exc:
            log.warning("could not cache today's verse: %s", exc)
        return verse
    try:
        return offline_verse(refs_file, bsb_file, today)
    except (OSError, VerseError) as exc:
        log.warning("no verse today, online or offline: %s", exc)
        return None
