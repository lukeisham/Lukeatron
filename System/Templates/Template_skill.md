# LUKEATRON SKILL WRITING TEMPLATE
For vibe-coding skill.md files that are lean and agent-executable.

> **Everything above the YAML frontmatter is guidance for the author — do not copy it into the skill.**
> A real skill begins at the `---` frontmatter and contains only the three body sections below.

## THE PRIME DIRECTIVE
A skill.md is not documentation. It is an instruction set. Every line must earn its place. If it doesn't change agent behaviour, cut it.

## THE THREE-PART STRUCTURE
Every skill.md has exactly three sections — **⚡ TRIGGER**, **🛠️ VERB**, **✅ OUTPUT** — plus YAML frontmatter.

---

## REQUIRED YAML FRONT MATTER
```yaml
name: skill-name                                                        # kebab-case; becomes the slash command. REQUIRED for Claude Code discovery.
description: "When to invoke this skill — the harness reads this to decide relevance. REQUIRED."
type: Skill
status: Active
core_function: [Receive | Find | Categorise | Synthesize | Generate | Track | Distribute | System]
intent: "One sentence. The agent's why. No fluff."
version: 1.0.0                                                          # Increment patch version on every rewrite
dependencies: [scripts/Script.py, Template_Name]                       # Paths relative to this skill folder; omit if none
calibration:
  context: [Any | Personal | Church | Teaching | Hybrid]                          # Matches Step 1 of Operating Loop
  level: [Brief | Extended]
  scope: [Global | Local]                                              # Global = usable in any domain; Local = one domain only
memory_footprint:
  read: [Memory/Medium-Term, Memory/Long-Term/Logs]                    # Match sitemap paths exactly
  write: [Memory/Medium-Term]                                          # Omit if read-only
```

## ⚡ WRITING THE TRIGGER
State the exact slash command and any secondary triggers.

## 🛠️ WRITING THE LOGIC

```
// EXECUTION_START
[Your logic here]
// EXECUTION_END
```

**Flow Control**
```
IF [condition] THEN [action] ELSE [fallback]
MATCH [state] CASE [A] THEN [action] DEFAULT [default_action]
REPEAT [refinement] UNTIL [goal] OR [limit]
BREAK / RETURN [result]
```

**Data Operations**
```
MAP [collection] TO [transformation] INTO [output]
FILTER [collection] BY [predicate] INTO [output]
REDUCE [collection] USING [operation] INTO [accumulator]
SET [memory_path | variable] = [value]
```

**System & Interaction**
```
TRY [action] CATCH [error_type] THEN [recovery]
AWAIT [user_confirmation | event] THEN [action] TIMEOUT [duration] ELSE [fallback]
DELEGATE [task] TO [tool | sub-agent] WITH [parameters] INTO [result]
ASSERT [pre-condition] ELSE [error_path]
```

**Pipeline (Preferred for linear tasks)**
```
[Action 1] ➔ PIPE result TO [Action 2]
```

No prose. Use indentation for MATCH [state] CASE logic.

## ✅ WRITING THE OUTPUT
Describe the expected terminal state and define the validation check.

**Validation Check (Self-Test)**
```
VERIFY [metric/state == expected_value] ELSE [error_path]
```

**Error Path**
```
CATCH [*] ➔ [Fallback action, user alert protocol, or graceful degradation script]
```
