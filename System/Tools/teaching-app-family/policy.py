"""Whether a change should be carried to the other apps: the rules Luke has set (policy.json), applied to the files a
change touched. 'ask' is the default and the only answer that interrupts him."""

from __future__ import annotations

import fnmatch
import json
from pathlib import Path

from registry import TOOL_DIR, Family, is_only_in

POLICY_PATH = TOOL_DIR / "policy.json"
ASK, ALL, NONE = "ask", "all", "none"


def load_policy(path: Path = POLICY_PATH) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def rule_for(policy: dict, app: str, rel: str) -> str:
    """What the first rule matching this file in this app says (`all`, `none`, `ask`, or the default)."""
    for rule in policy["rules"]:
        if fnmatch.fnmatch(app, rule.get("app", "*")) and fnmatch.fnmatch(rel, rule["files"]):
            return rule["propagate"]
    return policy["default"]


def outcome(family: Family, policy: dict, app: str, files: list[str]) -> str:
    """`none` when nothing in the change can travel (only app-only files, or every rule says none), `all` when every
    file that can travel is set to go everywhere, else `ask`."""
    travelling = [rel for rel in files if not is_only_in(family, app, rel)]
    if not travelling:
        return NONE
    answers = {rule_for(policy, app, rel) for rel in travelling}
    return answers.pop() if len(answers) == 1 and answers <= {ALL, NONE} else ASK


def remember(policy: dict, app: str, files_glob: str, propagate: str, path: Path = POLICY_PATH) -> None:
    """Adds a rule at the front, so a newer answer beats an older one, and saves the policy."""
    policy["rules"].insert(0, {"app": app, "files": files_glob, "propagate": propagate})
    path.write_text(json.dumps(policy, indent=2) + "\n", encoding="utf-8")
