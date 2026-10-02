"""The Scrape skill's code. Needs the AiCharacteristics app folder on sys.path (it imports `criteria`)."""

from aichar_scrape.merge import MergeError
from aichar_scrape.pipeline import ScrapeFailed, ScrapeSummary, run_scrape

__all__ = ["MergeError", "ScrapeFailed", "ScrapeSummary", "run_scrape"]
