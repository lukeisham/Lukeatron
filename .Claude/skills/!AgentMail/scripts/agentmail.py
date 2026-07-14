#!/usr/bin/env python3
"""
agentmail.py — thin, zero-dependency portal over the AgentMail API (agentmail.to).

This is PLUMBING. It exposes canonical verbs and returns JSON. It holds no opinions:
the *decision* to send anything lives in the calling skill/sub-agent (which must run
!OutgoingContentCheck first). Stdlib only — no pip install required.

Auth: reads AGENT_EMAIL_API_KEY from the environment, else from
System/Credentials/credentials.md (dotenv: KEY=value lines).

Output contract: a single JSON object on stdout.
  success -> {"ok": true,  "verb": "<verb>", "data": <api-payload>}
  failure -> {"ok": false, "verb": "<verb>", "error": "<message>", "status": <int|null>}
Exit code 0 on success, 1 on failure.

SAFETY: `send`, `reply`, and `send-draft` TRANSMIT real email and are irreversible.
  - `send`/`reply` REFUSE to run without non-empty body content (--text/--html/--text-file).
    (The raw API `reply` endpoint sends even on an empty body — this guard closes that footgun.)
  - The caller is responsible for human approval (!OutgoingContentCheck) before invoking them.
"""

import argparse
import json
import os
import sys
import base64
import mimetypes
import urllib.error
import urllib.parse
import urllib.request

API_BASE = os.environ.get("AGENT_EMAIL_API_BASE", "https://api.agentmail.to/v0")
TIMEOUT = int(os.environ.get("AGENT_EMAIL_TIMEOUT", "30"))


def repo_root():
    # .../.Claude/skills/!AgentMail/scripts/agentmail.py -> repo root is 5 levels up
    return os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))


def load_dotenv_value(key):
    path = os.path.join(repo_root(), "System", "Credentials", "credentials.md")
    try:
        with open(path, "r", encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, _, v = line.partition("=")
                if k.strip() == key:
                    return v.strip().strip('"').strip("'")
    except FileNotFoundError:
        return None
    return None


def api_key():
    return os.environ.get("AGENT_EMAIL_API_KEY") or load_dotenv_value("AGENT_EMAIL_API_KEY")


def fail(verb, message, status=None):
    print(json.dumps({"ok": False, "verb": verb, "error": message, "status": status}))
    sys.exit(1)


def ok(verb, data):
    print(json.dumps({"ok": True, "verb": verb, "data": data}))
    sys.exit(0)


def request(verb, method, path, key, params=None, body=None, raw_bytes=False):
    url = API_BASE + path
    if params:
        clean = {k: v for k, v in params.items() if v is not None}
        if clean:
            url += "?" + urllib.parse.urlencode(clean)
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Authorization", "Bearer " + key)
    if data is not None:
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            resp_data = resp.read()
            if raw_bytes:
                return resp_data
            text = resp_data.decode("utf-8") if resp_data else ""
            return json.loads(text) if text else {}
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")
        try:
            detail = json.loads(detail)
        except ValueError:
            pass
        fail(verb, "HTTP error from AgentMail API", status=e.code)
    except urllib.error.URLError as e:
        fail(verb, "network error: %s" % e.reason)


def enc(message_id):
    return urllib.parse.quote(message_id, safe="")


def resolve_inbox(verb, key, given):
    if given:
        return given
    env_inbox = os.environ.get("AGENT_EMAIL_INBOX")
    if env_inbox:
        return env_inbox
    listing = request(verb, "GET", "/inboxes", key)
    inboxes = listing.get("inboxes", [])
    if len(inboxes) == 1:
        return inboxes[0]["inbox_id"]
    fail(verb, "multiple or zero inboxes; pass --inbox <email>")


def strip_frontmatter(content):
    # Strip YAML frontmatter (--- ... ---) from the top of a file before sending.
    # Outbox drafts carry metadata in frontmatter for review; it must not reach recipients.
    lines = content.splitlines(keepends=True)
    if lines and lines[0].strip() == "---":
        for i, line in enumerate(lines[1:], start=1):
            if line.strip() == "---":
                return "".join(lines[i + 1:]).lstrip("\n")
    return content


def read_body_arg(text, text_file):
    if text_file:
        with open(text_file, "r", encoding="utf-8") as fh:
            return strip_frontmatter(fh.read())
    return text


def main():
    p = argparse.ArgumentParser(prog="agentmail", description="AgentMail portal (plumbing).")
    p.add_argument("--inbox", help="inbox id (email). Defaults to the sole inbox if only one exists.")
    sub = p.add_subparsers(dest="verb", required=True)

    sub.add_parser("inboxes", help="list inboxes")
    sp = sub.add_parser("create-inbox", help="create a new inbox")
    sp.add_argument("--username")
    sp.add_argument("--domain")
    sp.add_argument("--display-name")

    sp = sub.add_parser("messages", help="list messages")
    sp.add_argument("--limit", type=int, default=20)
    sp.add_argument("--labels", help="comma-separated label filter, e.g. received,unread")

    sp = sub.add_parser("message", help="read one message in full")
    sp.add_argument("--id", required=True, help="message_id")

    sp = sub.add_parser("threads", help="list threads")
    sp.add_argument("--limit", type=int, default=20)

    sp = sub.add_parser("thread", help="read one thread in full")
    sp.add_argument("--id", required=True, help="thread_id")

    sub.add_parser("drafts", help="list drafts")
    sp = sub.add_parser("delete-draft", help="delete a draft")
    sp.add_argument("--id", required=True, help="draft_id")

    sp = sub.add_parser("mark-read", help="mark a message as read by removing the 'unread' label (PATCH /messages/{id})")
    sp.add_argument("--id", required=True, help="message_id")

    sp = sub.add_parser("delete-message", help="permanently delete a message")
    sp.add_argument("--id", required=True, help="message_id")

    sp = sub.add_parser("get-attachment", help="download an attachment from a message or thread to a local file")
    sp.add_argument("--message-id", help="message containing the attachment")
    sp.add_argument("--thread-id", help="thread containing the attachment (alternative to --message-id)")
    sp.add_argument("--attachment-id", required=True, help="attachment_id from the message/thread object")
    sp.add_argument("--out", help="output file path (defaults to attachment_id in current directory)")

    for name, helptext in (("send", "send a NEW message (transmits)"),
                           ("draft", "create a draft (does NOT transmit)")):
        sp = sub.add_parser(name, help=helptext)
        sp.add_argument("--to", help="comma-separated recipients")
        sp.add_argument("--cc")
        sp.add_argument("--bcc")
        sp.add_argument("--subject", default="")
        sp.add_argument("--text")
        sp.add_argument("--text-file")
        sp.add_argument("--html")
        sp.add_argument("--html-file")
        sp.add_argument("--attach", action="append", metavar="FILE",
                        help="path to a local file to attach (repeatable)")

    sp = sub.add_parser("reply", help="reply within a thread (transmits)")
    sp.add_argument("--message-id", required=True)
    sp.add_argument("--text")
    sp.add_argument("--text-file")
    sp.add_argument("--html")
    sp.add_argument("--html-file")

    sp = sub.add_parser("send-draft", help="send an existing draft (transmits)")
    sp.add_argument("--id", required=True, help="draft_id")

    args = p.parse_args()
    verb = args.verb
    key = api_key()
    if not key:
        fail(verb, "no AGENT_EMAIL_API_KEY (env or System/Credentials/credentials.md)")

    if verb == "inboxes":
        ok(verb, request(verb, "GET", "/inboxes", key))

    if verb == "create-inbox":
        body = {k: v for k, v in (("username", args.username), ("domain", args.domain),
                                  ("display_name", args.display_name)) if v}
        ok(verb, request(verb, "POST", "/inboxes", key, body=body))

    inbox = resolve_inbox(verb, key, args.inbox)
    base = "/inboxes/" + enc(inbox)

    if verb == "messages":
        ok(verb, request(verb, "GET", base + "/messages", key,
                         params={"limit": args.limit, "labels": args.labels}))

    if verb == "message":
        ok(verb, request(verb, "GET", base + "/messages/" + enc(args.id), key))

    if verb == "threads":
        ok(verb, request(verb, "GET", base + "/threads", key, params={"limit": args.limit}))

    if verb == "thread":
        ok(verb, request(verb, "GET", base + "/threads/" + enc(args.id), key))

    if verb == "drafts":
        ok(verb, request(verb, "GET", base + "/drafts", key))

    if verb == "delete-draft":
        request(verb, "DELETE", base + "/drafts/" + enc(args.id), key)
        ok(verb, {"deleted": args.id})

    if verb == "mark-read":
        body = {"remove_labels": ["unread"]}
        ok(verb, request(verb, "PATCH", base + "/messages/" + enc(args.id), key, body=body))

    if verb == "delete-message":
        request(verb, "DELETE", base + "/messages/" + enc(args.id), key)
        ok(verb, {"deleted": args.id})

    if verb == "get-attachment":
        if not (args.message_id or args.thread_id):
            fail(verb, "provide --message-id or --thread-id")
        if args.message_id and args.thread_id:
            fail(verb, "provide --message-id or --thread-id, not both")
        att_id = enc(args.attachment_id)
        if args.message_id:
            att_path = base + "/messages/" + enc(args.message_id) + "/attachments/" + att_id
        else:
            att_path = base + "/threads/" + enc(args.thread_id) + "/attachments/" + att_id
        meta = request(verb, "GET", att_path, key)
        download_url = meta.get("download_url")
        if not download_url:
            fail(verb, "API returned no download_url in attachment metadata")
        dl_req = urllib.request.Request(download_url)
        try:
            with urllib.request.urlopen(dl_req, timeout=TIMEOUT) as dl_resp:
                file_bytes = dl_resp.read()
        except urllib.error.HTTPError as e:
            fail(verb, "CDN download failed: HTTP %d" % e.code)
        except urllib.error.URLError as e:
            fail(verb, "CDN download failed: %s" % e.reason)
        out_path = args.out or meta.get("filename") or args.attachment_id
        with open(out_path, "wb") as fh:
            fh.write(file_bytes)
        ok(verb, {"saved_to": os.path.abspath(out_path), "size_bytes": len(file_bytes),
                  "filename": meta.get("filename"), "content_type": meta.get("content_type")})

    if verb in ("send", "draft"):
        text = read_body_arg(args.text, args.text_file)
        html = read_body_arg(args.html, args.html_file)
        if verb == "send" and not (text or html):
            fail(verb, "refusing to send empty content; provide --text/--text-file/--html")
        if verb == "send" and not (args.to or args.cc or args.bcc):
            fail(verb, "send requires at least one of --to/--cc/--bcc")
        body = {"subject": args.subject}
        if args.to:
            body["to"] = [a.strip() for a in args.to.split(",") if a.strip()]
        if args.cc:
            body["cc"] = [a.strip() for a in args.cc.split(",") if a.strip()]
        if args.bcc:
            body["bcc"] = [a.strip() for a in args.bcc.split(",") if a.strip()]
        if text:
            body["text"] = text
        if html:
            body["html"] = html
        if args.attach:
            attachments = []
            for filepath in args.attach:
                with open(filepath, "rb") as fh:
                    content = base64.b64encode(fh.read()).decode("ascii")
                filename = os.path.basename(filepath)
                content_type, _ = mimetypes.guess_type(filepath)
                att = {"content": content, "filename": filename}
                if content_type:
                    att["content_type"] = content_type
                attachments.append(att)
            body["attachments"] = attachments
        path = base + ("/messages/send" if verb == "send" else "/drafts")
        ok(verb, request(verb, "POST", path, key, body=body))

    if verb == "reply":
        text = read_body_arg(args.text, args.text_file)
        html = read_body_arg(args.html, args.html_file)
        if not (text or html):
            fail(verb, "refusing to send empty reply; provide --text/--text-file/--html")
        body = {}
        if text:
            body["text"] = text
        if html:
            body["html"] = html
        ok(verb, request(verb, "POST", base + "/messages/" + enc(args.message_id) + "/reply",
                        key, body=body))

    if verb == "send-draft":
        ok(verb, request(verb, "POST", base + "/drafts/" + enc(args.id) + "/send", key))


if __name__ == "__main__":
    main()
