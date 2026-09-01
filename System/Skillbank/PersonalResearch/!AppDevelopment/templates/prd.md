<!-- Template — Product Requirements Document for !AppDevelopment Phase 1.
     Plain simple English. Brevity AND comprehensiveness — short, with nothing a builder needs
     left out. ASCII diagrams where a shape is easier seen than read; never for decoration.
     Delete any section that would be empty, including Notes. Delete these comment lines. -->

# <Name> — PRD

version: 0.1
kind: <app | widget>
host: <what it runs inside — widgets only>
status: <drafting | approved>

## Purpose
<One or two sentences. What this is for, who uses it, when.>

## The core job
<The single thing it must do well. If there are two, one of them is a different project.>

## Inputs and outputs
| In | From | Out | To |
|---|---|---|---|
| | | | |

## On screen
```
+--------------------------------------------------+
|  <ASCII sketch of the layout. Correct it with     |
|   Luke before writing a single spec — it is       |
|   cheaper than a mockup and catches more.>        |
+--------------------------------------------------+
```

## Key behaviours
- <The handful of interactions that define it. Not an exhaustive list.>

## Boundaries — what it does not do
- <This section earns its place every time. Name the tempting things it will not do.>

## Data
<What it stores, where, and what happens to it when the app closes.>

## Host contract
<!-- Widgets only. Delete for an app. -->
<How it is embedded, what it receives from the host, what it emits back.>

## Constraints
- <Offline? Standard library only? A file it must read? A size it must fit? A speed it must hit?>

## Done looks like
- [ ] <Checkable statement.>
- [ ] <Checkable statement.>

## Notes
<!-- Optional. Stray characteristics, nice-to-haves, worries, references Luke likes.
     Verbatim and unpolished. If empty, delete this whole section. -->
