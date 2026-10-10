#!/usr/bin/env python3
"""Which Mac runs which scheduled job: schedule.json is the one record, and each Mac installs only its own lines.

    schedule.py show      print every job, marking the ones this Mac runs
    schedule.py install   rewrite this Mac's Lukeatron crontab lines from schedule.json; other crontab lines are kept
    schedule.py check     exit 1 when this Mac's crontab differs from schedule.json, or schedule.json is invalid

A job runs on one Mac unless it only reads that Mac's own state (usage.sh): two Macs running the same job would send
two emails and write the same files at once. The Macs are named by `scutil --get ComputerName`.
"""
import json
import socket
import subprocess
import sys
from pathlib import Path

CRON_DIR = Path(__file__).resolve().parent
SCHEDULE = CRON_DIR / "schedule.json"
MARK = "_Lukeatron/System/Tools/cron/"
BEGIN, END = "# BEGIN Lukeatron (System/Tools/cron/schedule.py install)", "# END Lukeatron"


def mac_name():
    try:
        return subprocess.run(["scutil", "--get", "ComputerName"], capture_output=True, text=True, timeout=5).stdout.strip() or socket.gethostname()
    except (OSError, subprocess.SubprocessError):
        return socket.gethostname()


def load(path=SCHEDULE):
    return json.loads(path.read_text(encoding="utf-8"))


def problems(schedule, cron_dir=CRON_DIR):
    """What is wrong with schedule.json itself: unknown Macs, missing scripts, scripts with no job."""
    found = []
    named = {job["script"] for job in schedule["jobs"]}
    for job in schedule["jobs"]:
        if not (cron_dir / job["script"]).is_file():
            found.append(f"{job['script']}: no such script in {cron_dir.name}/")
        if len(job["cron"].split()) != 5:
            found.append(f"{job['script']}: cron '{job['cron']}' does not have five fields")
        for mac in job["runs_on"]:
            if mac not in schedule["macs"]:
                found.append(f"{job['script']}: runs_on names '{mac}', which is not in macs")
    for script in sorted(p.name for p in cron_dir.glob("*.sh")):
        if script not in named:
            found.append(f"{script}: has no job in schedule.json, so it never runs")
    return found


def lines_for(schedule, mac, cron_dir=CRON_DIR):
    return [f'{job["cron"]}  /bin/zsh "{cron_dir / job["script"]}"' for job in schedule["jobs"] if mac in job["runs_on"]]


def merge(current, lines):
    """The crontab text with every Lukeatron line replaced by one marked block of `lines`; other lines are kept."""
    kept, inside = [], False
    for line in current.splitlines():
        if line == BEGIN:
            inside = True
        elif line == END:
            inside = False
        elif not inside and MARK not in line:
            kept.append(line)
    while kept and not kept[-1].strip():
        kept.pop()
    block = [BEGIN, *lines, END] if lines else []
    return "\n".join(kept + ([""] if kept and block else []) + block) + "\n"


def installed(current):
    """The Lukeatron job lines in a crontab, inside the block or not."""
    return [line for line in current.splitlines() if MARK in line and not line.startswith("#")]


def read_crontab():
    result = subprocess.run(["crontab", "-l"], capture_output=True, text=True)
    return result.stdout if result.returncode == 0 else ""


def main(argv):
    command = argv[0] if argv else "show"
    schedule, mac = load(), mac_name()
    if command == "show":
        for job in schedule["jobs"]:
            here = "▶" if mac in job["runs_on"] else " "
            print(f"{here} {job['cron']:<16} {job['script']:<18} {', '.join(job['runs_on'])}")
        print(f"▶ = runs on this Mac ({mac})")
        return 0
    found = problems(schedule)
    if mac not in schedule["macs"]:
        found.append(f"this Mac is '{mac}', which schedule.json does not name; add it to macs")
    if found:
        print("schedule.json: " + "; ".join(found))
        return 1
    wanted, current = lines_for(schedule, mac), read_crontab()
    if command == "install":
        subprocess.run(["crontab", "-"], input=merge(current, wanted), text=True, check=True)
        print(f"{mac}: {len(wanted)} Lukeatron job(s) installed")
        return 0
    if command == "check":
        have = installed(current)
        if sorted(have) == sorted(wanted):
            return 0
        missing = [line.split('"')[1].rsplit("/", 1)[-1] for line in wanted if line not in have]
        extra = [line.split("/")[-1].rstrip('"') for line in have if line not in wanted]
        print(f"{mac}: crontab differs from schedule.json — missing {missing or 'none'}, extra {extra or 'none'}; "
              "run `python3 System/Tools/cron/schedule.py install`")
        return 1
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
