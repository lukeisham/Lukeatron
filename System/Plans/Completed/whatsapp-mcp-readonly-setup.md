---
plan: "whatsapp-mcp-readonly-setup"
context: Personal Productivity
secondary_contexts: [Coding]
created: 2026-06-22
status: Completed
major_because: "multi-step; installs system software; requires human input (QR code scan); modifies Claude Code system config; adds Skillbank skill"
project: "Memory/Medium-Term/Projects/PP-06-whatsapp-mcp"
skills_used: ["!CreatePlan", "!ReviewPlan"]
---

# Plan — WhatsApp MCP Read-Only Integration

## Objective
Install the lharries/whatsapp-mcp bridge, surgically remove its send capability, register it as an MCP server in Claude Code, and wire in a read-only `!WhatsApp` Skillbank entry — so Claude can read and digest Luke's WhatsApp messages with zero ability to send.

## Success criteria (measurable)
- Go bridge is running and Luke's phone shows a new companion device under Settings → Linked Devices
- `list_chats` and `list_messages` MCP tools return real data from Luke's WhatsApp in a Claude Code session
- `grep -rn "send_message"` on the Python server source returns no active (uncommented) registrations
- `System/Skillbank/!WhatsApp/skill.md` exists and is listed in `System/Skillbank/_index.yaml`
- `~/.claude/settings.json` contains a `mcpServers` entry pointing to the Python MCP server

## Resources
- **Memory to read:** none
- **Capability skills:** none
- **Domain skills (Skillbank):** none
- **Sub-agents:** none
- **Scripts:** none — Go build and QR scan are interactive; no deterministic automation to extract
- **Temp-skills:** none

## Steps

- [ ] Step 1 — Check prerequisites: `go version`, `uv --version`, `git --version`; list any missing [Bash inline]
- [ ] Step 2 — Install any missing prerequisites (Go via Homebrew: `brew install go`; uv via `curl -LsSf https://astral.sh/uv/install.sh | sh`) [Bash inline]
- [ ] Step 3 — Clone `lharries/whatsapp-mcp` to `~/Developer/whatsapp-mcp` (outside Dropbox — keeps the SQLite message DB out of cloud sync) [Bash inline]
- [ ] Step 4 — Read the Python MCP server source to locate the `send_message` tool registration [Read inline]
- [ ] Step 5 — Comment out the `send_message` tool registration in the Python server [Edit inline]
  - [ ] Test in Sandbox — `grep -n "send_message"` on the edited file; confirm no active (uncommented) calls remain
- [ ] Step 6 — Build the Go WhatsApp bridge: `cd ~/Developer/whatsapp-mcp && go build ./...` [Bash inline]
- [ ] Step 7 — Run the Go bridge; it prints a QR code in terminal — Luke scans it from WhatsApp on his phone (Settings → Linked Devices → Link a device) [human input]
  - [ ] !Checkpoint — external pairing with phone; do not proceed until Luke confirms the companion device appears under Linked Devices
- [ ] Step 8 — Verify the bridge has synced messages: query the local SQLite DB for a non-zero row count on the `messages` table [Bash inline]
- [ ] Step 9 — Register the MCP server in `~/.claude/settings.json` under `mcpServers` [Edit inline]
  - [ ] !Checkpoint — modifies global Claude Code system config; confirm with Luke before writing
- [ ] Step 10a — Instruct Luke to restart Claude Code to load the new MCP server configuration [human-gate]
- [ ] Step 10b — In the new post-restart session: call `list_chats` and `list_messages` tools and confirm real WhatsApp data is returned [agent inline — runs in new session only]
- [ ] Step 11 — Read `System/Skillbank/GeneralPurposeSkills/!ThinPortal/skill.md` for the portal build pattern, then write `System/Skillbank/!WhatsApp/skill.md` following that house style (read-only portal: triggers, logic to call list_chats/list_messages, output format, explicit send-blocked note) [Read + Write inline]
- [ ] Step 12 — Add `!WhatsApp` entry to `System/Skillbank/_index.yaml` [Edit inline]
  - [ ] !Checkpoint — modifies Lukeatron Skillbank (system configuration); confirm before writing
- [ ] Verify — all five Success criteria met? [pass/fail]

## Final step — Logging (always present)
- [ ] Append one line per skill in `skills_used` to `Memory/Long-Term/Logs/skills.log`, format:
  `[AGENT: !<SkillName>] [<SUCCESS|FAIL>] <one-line outcome> | tokens≈[N]`
