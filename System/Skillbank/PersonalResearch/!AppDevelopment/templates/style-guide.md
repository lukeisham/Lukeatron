<!-- Template — an app's Style Guide, written by !AppDevelopment Phase 4 STEP 4B and kept
     current through the refactor loop (STEP 7's Health Check row 8). Lives permanently beside
     README.md in _template/ — never folded into it, never deleted. Apps only; a widget's visual
     contract lives with its host chassis instead (see STEP 4B). Source every value from the
     app's actual code as it stands, never from memory, intention, or the PRD. Delete these
     comment lines. -->

# <Name> — Style Guide

<One or two sentences: what this document is for, and !HouseStyle's verdict for this surface —
EXEMPT / SUBORDINATE / UNCLASSIFIED, from `.Claude/skills/!HouseStyle/reference/sources.md` — and
what that verdict means here: whole surface governed directly (UNCLASSIFIED), or a shared
chassis's rules apply and this file only records the local landing (SUBORDINATE).>

## The one rule

<Where every visual value must live — normally one token file that every other file in the app
cites in its own header rather than writing a literal colour, size, or duration. State the rule
and name whatever enforces it, if anything (a contrast script, a lint check, a shared chassis).>

## Palettes

<Every named token this app defines, and its value in each mode it supports (light/dark/paper/
print/…), read off the real CSS — never redrafted from memory or intention.>

| Token | <mode> | <mode> | <mode> |
|---|---|---|---|
| | | | |

<Note how each mode is reached (explicit toggle, `prefers-color-scheme`, both) and anything that
must never share a value with anything else (e.g. a focus ring never sharing a hue with an
accent colour).>

## Type

<Font stack(s) and the fixed size scale, stated explicitly. Say "never add a Nth size/stack" if
that is the rule here.>

## Spacing, radii, motion

<The fixed scales this app uses — spacing steps, radii, motion durations — and what each is
rooted to, if anything (e.g. a 4px grid). State the ceiling explicitly (how many steps, no more).>

## Layout scope, by file

<Only if styling is split across more than one file. What each file owns, what it must never
touch, so a future change lands in the file that owns the thing being styled. Omit this section
entirely for a single-stylesheet app.>

| File | Owns | Never touches |
|---|---|---|
| | | |

## Before shipping a visual change

<A short checklist a future agent can run without re-deriving the rules above — token-vs-literal,
contrast, any never-share-a-hue rule, motion budget, file ownership if split. Keep it to what
this app specifically needs checked; do not restate generic HouseStyle doctrine here.>
