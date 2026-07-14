#!/usr/bin/env python3
"""
browser.py — thin, backend-agnostic headless-browser portal for Lukeatron.

This is PLUMBING. Other skills/sub-agents call canonical verbs (open, snapshot,
click, fill, ...) and this layer decides WHICH browser engine runs them. Backends
are not hard-coded: they are read at runtime from `registry.md` (fenced ```json
blocks under a "## BACKEND:" heading), so you swap or add an engine by editing that
file — no code change. Default backend: Vercel `agent-browser` (stateful daemon over
Chrome DevTools Protocol, purpose-built for AI agents). Playwright is registered as a
dormant fallback.

Stdlib only — no dependencies.

OUTPUT CONTRACT (pass-through, not a JSON envelope):
  The backend's stdout/stderr are streamed through verbatim, because their value
  (snapshot trees, extracted text, JSON) must not be mangled. The process exit code
  is propagated. IMPORTANT: agent-browser marks logical failures with a leading "✗"
  glyph while STILL exiting 0 — callers must inspect the ✓/✗ marker, not exit code
  alone, to judge success of an individual action.
"""

import os
import shlex
import subprocess
import sys
from datetime import datetime

WORKER = "!HeadlessChromeBrowser"

# Canonical placeholder -> CLI flag that supplies it. Append "?" in a template
# token (e.g. "{ref?}") to make it OPTIONAL — dropped silently when not supplied.
PLACEHOLDERS = {"url": "url", "ref": "ref", "value": "value", "out": "out", "js": "js"}
FLAG_TOKENS = ("--backend", "--raw", "--url", "--ref", "--value", "--out", "--js")


def repo_root():
    # .../.Claude/skills/!HeadlessChromeBrowser/scripts/browser.py -> root is 5 up
    return os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))


def registry_path():
    return os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "registry.md")


def log_event(status, message):
    path = os.path.join(repo_root(), "Memory", "Long-Term", "Logs", "skills.log")
    line = "[%s] [WORKER: %s] [%s] %s\n" % (datetime.now().isoformat(), WORKER, status, message)
    try:
        with open(path, "a", encoding="utf-8") as fh:
            fh.write(line)
    except OSError:
        pass  # logging is best-effort; never block the action


def _backend_blocks(md):
    """Yield raw text of each ```json block under a '## BACKEND:' heading."""
    blocks, in_backend, in_json, buf = [], False, False, []
    for line in md.splitlines():
        s = line.strip()
        if not in_json and s.startswith("#"):
            in_backend = s.lstrip("#").strip().upper().startswith("BACKEND:")
            continue
        if in_backend and s.startswith("```json"):
            in_json, buf = True, []
            continue
        if in_json and s.startswith("```"):
            in_json = False
            blocks.append("\n".join(buf))
            continue
        if in_json:
            buf.append(line)
    return blocks


def load_backends():
    import json
    try:
        with open(registry_path(), "r", encoding="utf-8") as fh:
            md = fh.read()
    except OSError as e:
        sys.stderr.write("⚠️ Browser registry unreachable: %s (%s)\n" % (registry_path(), e))
        sys.exit(1)
    backends = {}
    for block in _backend_blocks(md):
        try:
            obj = json.loads(block)
        except ValueError:
            continue
        if isinstance(obj, dict) and "name" in obj and "actions" in obj:
            backends[obj["name"]] = obj
    if not backends:
        sys.stderr.write("⚠️ No backends defined in registry.md\n")
        sys.exit(1)
    return backends


def pick_backend(backends, requested):
    if requested:
        if requested not in backends:
            sys.stderr.write("⚠️ Unknown backend '%s'. Available: %s\n"
                             % (requested, ", ".join(backends)))
            sys.exit(1)
        return backends[requested]
    for b in backends.values():
        if b.get("default"):
            return b
    return next(iter(backends.values()))


def build_argv(backend, action, args, raw):
    bin_ = backend.get("bin")
    if not bin_:
        sys.stderr.write("⚠️ Backend '%s' has no 'bin'.\n" % backend["name"])
        sys.exit(1)
    if raw is not None:
        return [bin_] + shlex.split(raw)
    template = backend.get("actions", {}).get(action)
    if template is None:
        sys.stderr.write("⚠️ Backend '%s' does not support '%s'. Supported: %s\n"
                         % (backend["name"], action, ", ".join(backend.get("actions", {}))))
        sys.exit(1)
    argv = [bin_]
    for token in template:
        if token.startswith("{") and token.endswith("}"):
            name = token[1:-1]
            optional = name.endswith("?")
            name = name.rstrip("?")
            key = PLACEHOLDERS.get(name)
            val = args.get(key) if key else None
            if val is None:
                if optional:
                    continue
                sys.stderr.write("⚠️ Action '%s' needs --%s.\n" % (action, name))
                sys.exit(1)
            argv.append(str(val))
        else:
            argv.append(token)
    return argv


def parse_args(argv):
    action, args, flags = None, {}, {"backend": None, "raw": None}
    i = 0
    while i < len(argv):
        tok = argv[i]
        if tok in FLAG_TOKENS:
            key = tok[2:]
            i += 1
            if i >= len(argv):
                sys.stderr.write("⚠️ %s needs a value.\n" % tok)
                sys.exit(1)
            (flags if key in flags else args)[key] = argv[i]
        elif tok == "--list-backends":
            flags["list"] = True
        elif tok in ("-h", "--help"):
            flags["help"] = True
        elif action is None and not tok.startswith("-"):
            action = tok
        else:
            sys.stderr.write("⚠️ Unknown argument: %s\n" % tok)
            sys.exit(1)
        i += 1
    return action, args, flags


HELP = """!HeadlessChromeBrowser — backend-agnostic headless browser portal.

Usage:
  browser.py <verb> [--url U] [--ref @e1|SEL] [--value V] [--out FILE] [--js CODE]
  browser.py --raw "<full backend subcommand>" [--backend NAME]
  browser.py --list-backends

Canonical verbs (mapped per-backend in registry.md):
  open --url U     snapshot          text --ref SEL    html --ref SEL
  click --ref @e1  fill --ref @e1 --value X            type --ref @e1 --value X
  press --value Enter   select --ref @e1 --value X     wait --value <sel|ms>
  scroll --value down   screenshot --out f.png         pdf --out f.pdf
  eval --js "code"      title    url    back    forward    reload    close    doctor

Workflow: open → snapshot (read @e refs) → click/fill @ref → eval/text to extract → close.
Refs are snapshot-scoped: re-snapshot after the page changes. Default backend: agent-browser.
"""


def main():
    action, args, flags = parse_args(sys.argv[1:])
    if flags.get("help") or (action is None and not flags.get("list") and flags.get("raw") is None):
        sys.stdout.write(HELP)
        sys.exit(0)

    backends = load_backends()
    if flags.get("list"):
        for name, b in backends.items():
            tag = " (default)" if b.get("default") else (" (dormant)" if b.get("dormant") else "")
            sys.stdout.write("%s%s -> bin: %s | actions: %s\n"
                             % (name, tag, b.get("bin"), ", ".join(b.get("actions", {}))))
        sys.exit(0)

    backend = pick_backend(backends, flags["backend"])
    argv = build_argv(backend, action, args, flags["raw"])

    env = dict(os.environ)
    extra = ["/opt/homebrew/bin", "/usr/local/bin", os.path.expanduser("~/.local/bin")]
    parts = env.get("PATH", "").split(os.pathsep)
    env["PATH"] = os.pathsep.join([p for p in extra if p not in parts] + parts)

    try:
        proc = subprocess.run(argv, capture_output=True, text=True, env=env)
    except FileNotFoundError:
        msg = ("Backend binary '%s' not found. Install per registry.md "
               "(default: npm install -g agent-browser && agent-browser install)." % backend.get("bin"))
        sys.stderr.write("⚠️ %s\n" % msg)
        log_event("FAIL", "%s: binary missing" % backend["name"])
        sys.exit(127)

    if proc.stdout:
        sys.stdout.write(proc.stdout)
    if proc.stderr:
        sys.stderr.write(proc.stderr)
    label = action or "raw"
    soft_fail = proc.stdout.lstrip().startswith("✗") if proc.stdout else False
    status = "FAIL" if (proc.returncode != 0 or soft_fail) else "SUCCESS"
    log_event(status, "%s %s rc=%s" % (backend["name"], label, proc.returncode))
    sys.exit(proc.returncode)


if __name__ == "__main__":
    main()
