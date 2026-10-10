#!/usr/bin/env python3
"""lint_skills — deterministic structural checks over the core skills in .claude/skills/.

Catches these classes of defect before they reach a live run:
  frontmatter   every skill has a parseable `name` + `description` the harness can show
  contexts      every System/Context/*.md is known to !DetermineContext, !Tone and !Review
  logging       no skill points at a removed log or tool (skills.log, workers.log, skilllog.py); the logs are history.log and issues.log
  evals         safety-critical skills ship a valid evals/evals.json (skill-creator schema)
  disclosure    every reference/ file a skill points at exists, and none is orphaned
  fixtures      every eval fixture address ends in .test (cannot reach a real person)
  size          warn (not fail) when a skill file is over 200 lines
  one home      warn when CLAUDE.md, memory.md and the core skills repeat the same 15-word run

Usage:  python3 System/Tools/skill-evals/lint_skills.py [--quiet]
Exit 0 = no failures (warnings allowed), 1 = at least one failure.
The behavioural evals themselves (evals/evals.json) are run with the skill-creator skill.
"""
import json
import re
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    sys.exit("lint_skills: needs PyYAML (pip3 install pyyaml)")

ROOT = next(p for p in Path(__file__).resolve().parents if (p / ".claude" / "CLAUDE.md").exists())
SKILLS = ROOT / ".claude" / "skills"
FIXTURES = Path(__file__).resolve().parent / "fixtures"
NEEDS_EVALS = ["!Checkpoint", "!OutgoingContentCheck", "!Tone", "!ArchiveMemory", "!DetermineContext", "!PastoralNote"]
SIZE_WARN = 200
REPEAT_WORDS = 15

fails, warns = [], []


def fail(where, msg):
    fails.append("FAIL  %-24s %s" % (where, msg))


def warn(where, msg):
    warns.append("warn  %-24s %s" % (where, msg))


def skill_file(folder: Path):
    found = [f for f in folder.iterdir() if f.name == "SKILL.md"]
    return found[0] if len(found) == 1 else None


def frontmatter(text: str):
    if not text.startswith("---\n"):
        return None
    end = text.find("\n---", 4)
    return yaml.safe_load(text[4:end]) if end > 0 else None


def contexts():
    names = {}
    for f in sorted((ROOT / "System" / "Context").glob("*.md")):
        names[f.name] = " ".join(w.capitalize() for w in f.stem.split("-"))
    return names


def body(text: str) -> str:
    return text.split("---", 2)[2] if text.startswith("---") and text.count("---") >= 2 else text


def repeated_runs():
    """Yield (file a, file b, phrase) for every run of REPEAT_WORDS words two rule files share."""
    files = [ROOT / ".claude" / "CLAUDE.md", ROOT / ".claude" / "memory.md"] + sorted(SKILLS.glob("*/SKILL.md"))
    words = {f: re.findall(r"[a-z0-9!_/.'-]+", re.sub(r"[`*]", "", body(f.read_text(encoding="utf-8")).lower())) for f in files}
    grams = {f: {tuple(w[i:i + REPEAT_WORDS]): i for i in range(len(w) - REPEAT_WORDS + 1)} for f, w in words.items()}
    for i, a in enumerate(files):
        for b in files[i + 1:]:
            shared = sorted(grams[a][g] for g in set(grams[a]) & set(grams[b]))
            start = prev = None
            for pos in shared + [None]:
                if pos is not None and prev is not None and pos == prev + 1:
                    prev = pos
                    continue
                if start is not None:
                    yield a, b, " ".join(words[a][start:prev + REPEAT_WORDS])
                start = prev = pos


def label(path: Path) -> str:
    return path.parent.name if path.name == "SKILL.md" else path.name


def main() -> int:
    quiet = "--quiet" in sys.argv
    skills = {}
    for folder in sorted(p for p in SKILLS.iterdir() if p.is_dir() and not p.name.startswith((".", "_"))):
        f = skill_file(folder)
        if not f:
            fail(folder.name, "needs exactly one SKILL.md")
            continue
        text = f.read_text(encoding="utf-8")
        skills[folder.name] = (f, text)

        # frontmatter
        try:
            fm = frontmatter(text)
        except yaml.YAMLError as e:
            fail(folder.name, "frontmatter does not parse: %s" % str(e).splitlines()[0])
            continue
        if not fm:
            fail(folder.name, "no YAML frontmatter")
            continue
        desc = str(fm.get("description") or "").strip()
        if not fm.get("name"):
            fail(folder.name, "frontmatter has no `name`")
        if not desc:
            fail(folder.name, "frontmatter has no `description` — the harness will show a placeholder")
        elif desc.startswith("⚡") or len(desc) < 80:
            fail(folder.name, "description too thin to trigger on (%d chars)" % len(desc))
        elif len(desc) > 1024:
            warn(folder.name, "description over 1024 chars (%d) — may be truncated" % len(desc))

        # logging
        for m in re.finditer(r"skills\.log|workers\.log|skilllog", text):
            fail(folder.name, "points at removed %s (line %d) — the logs are history.log and issues.log, written by System/Tools/logs/logs.py" % (m.group(0), text[:m.start()].count("\n") + 1))

        # progressive disclosure
        ref_dir = folder / "reference"
        mentioned = set(re.findall(r"reference/([\w.-]+\.\w+)", text))
        for name in sorted(mentioned):
            if not (ref_dir / name).exists():
                fail(folder.name, "points at reference/%s, which does not exist" % name)
        if ref_dir.is_dir():
            for extra in sorted(p.name for p in ref_dir.iterdir() if p.is_file() and p.name not in mentioned):
                text_refs = " ".join((ref_dir / m).read_text(encoding="utf-8", errors="ignore") for m in mentioned if (ref_dir / m).exists())
                if extra not in text_refs:
                    warn(folder.name, "reference/%s is not pointed at from the skill (orphan?)" % extra)

        # size
        lines = text.count("\n") + 1
        if lines > SIZE_WARN:
            warn(folder.name, "%d lines — consider moving rare branches into reference/" % lines)

    if (ROOT / "Logs").exists():
        fail("(root)", "a root Logs/ folder exists again — the logs live only in Memory/Long-Term/Logs/")

    # contexts
    ctx = contexts()
    checks = {"!DetermineContext": "readme", "!Tone": "name", "!Review": "readme", "!ReviewPlan": "readme"}
    for skill, kind in checks.items():
        if skill not in skills:
            fail(skill, "skill missing")
            continue
        text = skills[skill][1]
        for fname, name in ctx.items():
            if kind == "readme":
                known = fname in text
            else:  # a map line such as "  Lukeatron   ➔ `Memory/Long-Term/Tone/...`"
                known = re.search(r"^\s*%s\s+(➔|→)" % re.escape(name), text, re.M) is not None
            if not known:
                fail(skill, "does not know the %s context (%s)" % (name, fname if kind == "readme" else "no map line"))
    tracking = ROOT / "Memory" / "Medium-Term" / "Projects" / "_tracking.yaml"
    if tracking.exists() and "!Review" in skills:
        prefixes = sorted(set(re.findall(r"id: ([A-Z]{2})-\d", tracking.read_text(encoding="utf-8"))))
        for prefix in prefixes:
            if "→ %s" % prefix not in skills["!Review"][1]:
                fail("!Review", "context→prefix map lacks %s (used in _tracking.yaml)" % prefix)

    # evals
    for skill in NEEDS_EVALS:
        path = SKILLS / skill / "evals" / "evals.json"
        if not path.exists():
            fail(skill, "no evals/evals.json")
            continue
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            fail(skill, "evals.json is not valid JSON: %s" % e)
            continue
        if data.get("skill_name") != skill:
            fail(skill, "evals.json skill_name is %r" % data.get("skill_name"))
        ids = [e.get("id") for e in data.get("evals", [])]
        if not ids or len(ids) != len(set(ids)) or not all(isinstance(i, int) for i in ids):
            fail(skill, "eval ids must be unique integers")
        for e in data.get("evals", []):
            if not (e.get("prompt") and e.get("expected_output") and e.get("expectations")):
                fail(skill, "eval %s lacks prompt / expected_output / expectations" % e.get("id"))

    # fixtures
    for f in FIXTURES.rglob("*"):
        if f.is_file():
            for addr in re.findall(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+", f.read_text(encoding="utf-8", errors="ignore")):
                if not addr.endswith(".test"):
                    fail("fixtures", "%s holds a real-looking address %s" % (f.relative_to(FIXTURES), addr))

    # one home: a rule stated in two places drifts
    for a, b, phrase in repeated_runs():
        warn("one home", "%s and %s both say: \"%s…\"" % (label(a), label(b), phrase[:90]))

    for line in fails + ([] if quiet else warns):
        print(line)
    print("\n%d skills checked · %d failures · %d warnings" % (len(skills), len(fails), len(warns)))
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
