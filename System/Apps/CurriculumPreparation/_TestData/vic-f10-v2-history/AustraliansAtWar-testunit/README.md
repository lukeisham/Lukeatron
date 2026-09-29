# Curriculum Unit Bundle

## Architecture

See `bundle-template.build.spec.md` for the folder structure and data model.

## Server

See `bundle-server.build.spec.md` for the HTTP server and API routes.

## Style Guide

See `style-guide.build.spec.md` for CSS tokens, variables, and design system.

## Document Shell

See `document-shell.build.spec.md` for HTML layout and page structure.

## Local Store

See `local-store.build.spec.md` for client-side data loading, validation, and persistence.

## Curriculum Editor

See `curriculum-editor.build.spec.md` for editing curriculum nodes and outcomes.

## Marking Matrix

See `marking-matrix.build.spec.md` for student scoring and assessment pages.

## Crib Sheet

See `crib-sheet.build.spec.md` for the teacher reference page generator.

## Arbor Tree

See `arbor-tree.build.spec.md` for the curriculum structure visualization.

## Tests

Run the JS suite with an explicit glob, not a bare directory — `tests/`
alone sweeps up `test_serve.py` and fails on current Node:

```
node --test tests/*.js
python3 -m unittest discover tests
```
