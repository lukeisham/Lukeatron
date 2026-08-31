# CurriculumPreparation — Data Model Digest

Research distillation of CurriculumPreparation-datamodel.spec.md, CurriculumPreparation-prd.spec.md, and bundle-template.build.spec.md.

---

## 1. Complete `unit.json` Schema (Commented JSON Skeleton)

```json
{
  "schemaVersion": "1.0.0",
  "generatedFrom": "template-version-string-or-empty",
  
  "meta": {
    "subject": "string",
    "level": "string",
    "unitName": "string",
    "teacher": "string",
    "dateCreated": "YYYY-MM-DD or null",
    "dateModified": "YYYY-MM-DD or null"
  },
  
  "curriculum": {
    "profileId": "string (e.g. 'vic-f10-v2' or 'generic')",
    "name": "string",
    "jurisdiction": "string",
    "version": "string",
    "sourceRef": "string (ingested filename)",
    "licence": "string",
    "attribution": "string (printed on outputs)",
    "labels": {
      "strand": "string",
      "outcome": "string",
      "task": "string",
      "cribSheetHalves": {
        "upper": "string (optional, display label)",
        "lower": "string (optional, display label)"
      }
    },
    "description": "string or null (optional curriculum orientation prose, renders only on curriculum map)",
    "ingestedAt": "ISO date"
  },
  
  "nodes": [
    {
      "id": "string (internal, stable, ours)",
      "code": "string (verbatim from source, never rewritten)",
      "title": "string (verbatim from source)",
      "text": "string (full description)",
      "kind": "outcome | task | strand",
      "parentId": "string (nodeId) | null (null = unit root)",
      "confidence": "high | low (set by ingest parser)",
      "edited": "boolean (true once user changes title/text)",
      "original": {
        "code": "string",
        "title": "string",
        "text": "string"
      },
      "domain": "skill | knowledge | null (set only on kind: strand nodes; outcome/task nodes leave unset and inherit by walking parentId)"
    }
  ],
  
  "topics": [
    {
      "id": "string",
      "title": "string",
      "text": "string or null (optional elaboration)",
      "order": "number (explicit ordering, curated not alphabetical)",
      "coverage": [
        {
          "nodeId": "string (resolves to Node)",
          "coverage": "full | partial (exactly two values)",
          "note": "string or null (optional free text)"
        }
      ]
    }
  ],
  
  "bigIdeas": [
    {
      "id": "string",
      "title": "string (the idea itself)",
      "text": "string (optional elaboration)",
      "parentId": "string (bigIdeaId) | null (null = big idea; set = sub-big idea; exactly two levels total)",
      "order": "number (explicit ordering)",
      "topicId": "string (mandatory on every top-level big idea, resolves to Topic; sub-big ideas carry no topicId)",
      "coverage": [
        {
          "nodeId": "string (resolves to Node)",
          "coverage": "full | partial (exactly two values)",
          "note": "string or null (optional free text)"
        }
      ]
    }
  ],
  
  "unitAssessment": {
    "id": "string",
    "title": "string",
    "bigIdeaId": "string (mandatory big-idea binding for final assessment specifically; resolves to BigIdea)",
    "coverage": [
      {
        "nodeId": "string (resolves to Node)",
        "coverage": "full | partial (exactly two values)",
        "note": "string or null (optional free text)"
      }
    ],
    "finalAssessment": {
      "pass": {
        "tier": "pass",
        "material": "string or null",
        "studentTask": "string or null",
        "workspaceLines": "number or null",
        "imageRefs": [
          {
            "imageId": "string (resolves to images[] entry)",
            "x": "number (placement)",
            "y": "number (placement)",
            "width": "number (placement)",
            "height": "number (placement)"
          }
        ]
      },
      "intermediate": {
        "tier": "intermediate",
        "material": "string or null",
        "studentTask": "string or null",
        "workspaceLines": "number or null",
        "imageRefs": []
      },
      "advanced": {
        "tier": "advanced",
        "material": "string or null",
        "studentTask": "string or null",
        "workspaceLines": "number or null",
        "imageRefs": []
      }
    },
    "finalAssessmentCompleted": "boolean (never derived, never affects scoring)",
    "finalAssessmentDate": "YYYY-MM-DD or null (optional calendar date)",
    "finalAssessmentPeriod": "string or null (optional freeform timetable slot)",
    "miniAssessments": [
      {
        "id": "string",
        "name": "string",
        "weighting": "number or null (optional)",
        "bigIdeaId": "string (mandatory, independent big-idea binding per mini assessment; resolves to BigIdea)",
        "coverage": [
          {
            "nodeId": "string (resolves to Node)",
            "coverage": "full | partial (exactly two values)",
            "note": "string or null (optional free text)"
          }
        ],
        "tiers": {
          "pass": {
            "tier": "pass",
            "material": "string or null",
            "studentTask": "string or null",
            "workspaceLines": "number or null",
            "imageRefs": []
          },
          "intermediate": {
            "tier": "intermediate",
            "material": "string or null",
            "studentTask": "string or null",
            "workspaceLines": "number or null",
            "imageRefs": []
          },
          "advanced": {
            "tier": "advanced",
            "material": "string or null",
            "studentTask": "string or null",
            "workspaceLines": "number or null",
            "imageRefs": []
          }
        },
        "completed": "boolean (never derived, never affects scoring)",
        "date": "YYYY-MM-DD or null (optional calendar date)",
        "lessonPeriod": "string or null (optional freeform timetable slot)"
      }
    ]
  },
  
  "lessons": [
    {
      "id": "string",
      "number": "number (position in unit, 1..N unique and contiguous)",
      "nodeIds": [
        "string (resolves to Node; axis 1 curriculum part(s))"
      ],
      "bigIdeaId": "string (mandatory, resolves to BigIdea or sub-BigIdea; axis 2 exactly one)",
      "bigIdeaNote": "string or null (optional lesson-specific gloss on that idea)",
      "keyExample": "string (FR-LP-3)",
      "practiceQuestion": "string (FR-LP-4)",
      "assessmentLink": {
        "miniAssessmentIds": [
          "string (resolves to unitAssessment.miniAssessments[].id; zero-or-more)"
        ],
        "finalAssessment": "boolean (true to link to the unit's one final assessment)",
        "note": "string or null (optional)"
      },
      "tiers": {
        "pass": {
          "tier": "pass",
          "material": "string or null",
          "studentTask": "string or null",
          "workspaceLines": "number or null",
          "imageRefs": []
        },
        "intermediate": {
          "tier": "intermediate",
          "material": "string or null",
          "studentTask": "string or null",
          "workspaceLines": "number or null",
          "imageRefs": []
        },
        "advanced": {
          "tier": "advanced",
          "material": "string or null",
          "studentTask": "string or null",
          "workspaceLines": "number or null",
          "imageRefs": []
        }
      },
      "imageRefs": [],
      "sidebar": "string or null (optional freeform text, front page only; no images, no bindings; renders nothing when blank)",
      "completed": "boolean (never derived, manual 'taught' flag)",
      "date": "YYYY-MM-DD or null (optional calendar date for lesson scheduled date)",
      "lessonPeriod": "string or null (optional freeform timetable slot, e.g. 'Mon 3rd P')",
      "provenance": "generated | edited | manual (drives no-clobber rule)"
    }
  ],
  
  "cribSheet": {
    "id": "string",
    "title": "string",
    "orientation": "portrait | landscape (user's choice, remembered)",
    "sections": [
      {
        "bigIdeaId": "string (resolves to BigIdea or sub-BigIdea)",
        "half": "upper | lower (exactly one per section, required)",
        "text": "string (Markdown-style formatting: **bold**, *italic*, - bullets; unsupported syntax = literal)",
        "imageRefs": [],
        "size": "small | medium | large | null (optional, defaults to 'medium' when unset)"
      }
    ],
    "pageCount": "1 | 2 (enforced cap)",
    "provenance": "generated | edited | manual (same no-clobber rule as lessons)"
  },
  
  "resourcesPage": {
    "id": "string",
    "items": [
      {
        "id": "string",
        "kind": "link | image | text (exactly one, no fourth value)",
        "order": "number (explicit ordering, curated not alphabetical)",
        "url": "string or null (set when kind: 'link')",
        "label": "string or null (optional display text, only meaningful when kind: 'link')",
        "imageId": "string or null (set when kind: 'image'; resolves to images[] entry)",
        "text": "string or null (set when kind: 'text')",
        "note": "string or null (optional caption, available regardless of kind)"
      }
    ]
  },
  
  "matrixTemplate": {
    "orientation": "portrait | landscape (default for new student pages)",
    "criteria": [
      {
        "id": "string",
        "tier": "pass | intermediate | advanced",
        "criterion": "string (wording)",
        "draftScore": "number (per-criterion draft score)",
        "maxScore": "number (auto-allocated by tier budget unless overridden; Pass=50, Intermediate=25, Advanced=25)",
        "assessmentIds": [
          "string (one or more unitAssessment.miniAssessments[].id and/or final assessment id; resolvable)"
        ],
        "allocationOverridden": "boolean (true once teacher hand-edits maxScore in Default Full mode; excluded from automatic tier-budget allocation)"
      }
    ]
  },
  
  "matrices": [
    {
      "id": "string",
      "studentId": "string (resolves to students[]; one page per student, not per (student, lesson))",
      "orientation": "portrait | landscape | null (null = inherit the template's)",
      "scores": [
        {
          "criterionId": "string (resolves to matrixTemplate.criteria[].id)",
          "awardedScore": "number",
          "comment": "string or null"
        }
      ]
    }
  ],
  
  "students": [
    {
      "id": "string",
      "name": "string"
    }
  ],
  
  "images": [
    {
      "id": "string (32 hex characters)",
      "filename": "string (pasted image file, generated name format: img-NNNN.png)",
      "mimeType": "string (e.g. 'image/png')",
      "width": "number (pixels)",
      "height": "number (pixels)",
      "byteSize": "number",
      "addedAt": "ISO date"
    }
  ]
}
```

---

## 2. All Invariants (INV-DM-*)

1. **INV-DM-1** — Exactly three tiers, always, with fixed keys pass, intermediate, advanced and fixed colours Green / Blue / Orange.

2. **INV-DM-2** — A node's code and title as ingested are never destroyed. An edit sets edited and preserves original.

3. **INV-DM-3** — nodes[] forms a tree: exactly one root, no cycles, every non-root parentId resolves.

4. **INV-DM-4** — Every stored reference resolves — lesson.nodeIds[], lesson.bigIdeaId, lesson.assessmentLink.miniAssessmentIds[], miniAssessment.coverage[].nodeId, unitAssessment.bigIdeaId, cribSheet.sections[].bigIdeaId, resourceItem.imageId (when kind: "image"), bigIdea.topicId (top-level big ideas only), topic.coverage[].nodeId, miniAssessment.bigIdeaId, every ImageRef.imageId.

5. **INV-DM-5** — A lesson's tier pages render in fixed order: Pass (p2), Intermediate (p3), Advanced (p4).

6. **INV-DM-6** — Exactly one marking matrix per unit; within it, exactly one instance (page) per student.

7. **INV-DM-7** — A matrix's rows cover all three tiers.

8. **INV-DM-8** — The unit folder is self-contained: unit.json plus images/ is everything.

9. **INV-DM-9** — unit.json carries a schemaVersion. A reader meeting a higher version refuses to open.

10. **INV-DM-10** — Nothing in the schema is specific to one curriculum. Curriculum-specific concepts live in unit.curriculum, never in a field name or enum value.

11. **INV-DM-11** — Every unit records the profile it was ingested under, even the generic one.

12. **INV-DM-12** — Reverse links are derived, never stored. A file containing a stored reverse edge is invalid.

13. **INV-DM-13** — Orientation is stored only where it varies — on marking matrices and crib sheets.

14. **INV-DM-14** — The big-idea list is exactly two levels. A BigIdea whose parentId points at another BigIdea that itself has a parentId is invalid.

15. **INV-DM-15** — Every lesson has a resolvable bigIdeaId. A lesson without one is invalid.

16. **INV-DM-16** — A crib sheet's pageCount is 1 or 2 (REINSTATED by Change AF; formerly retired by Change AC).

17. **INV-DM-17** — Every images[] manifest entry has a real file in images/, and every ImageRef resolves to a manifest entry. Missing file renders a placeholder; missing manifest entry is invalid.

18. **INV-DM-18** — Singular parts are singular: exactly one curriculum root, one bigIdeas[] list, one cribSheet object, one matrixTemplate, one unitAssessment object, one resourcesPage object, one marking matrix per unit.

19. **INV-DM-19** — Matrix instances carry no shared structure. Every scores[].criterionId resolves to matrixTemplate.criteria[] entry; no instance stores its own criteria, tiers or draft scores.

20. **INV-DM-20** — The bundle is self-contained: nothing in unit.json, in app/, or in any script references a path outside the bundle root.

21. **INV-DM-21** — Every coverage[].nodeId on a BigIdea resolves to a real entry in nodes[].

22. **INV-DM-22** — coverage[].coverage is one of exactly two values, "full" or "partial".

23. **INV-DM-23** — A BigIdea's coverage[] carries no duplicate nodeId.

24. **INV-DM-24** — A unit's unitAssessment holds exactly one finalAssessment.

25. **INV-DM-25** — Every tier set is complete: lesson.tiers, unitAssessment.finalAssessment.tiers, and every miniAssessment.tiers each carry all three fixed keys.

26. **INV-DM-26** — Every miniAssessment.coverage[].nodeId entry resolves to a real entry in nodes[].

27. **INV-DM-27** — Every lesson.assessmentLink resolves: each miniAssessmentIds[] entry names a real unitAssessment.miniAssessments[].id.

28. **INV-DM-28** — Every resourceItem of kind: "image" resolves its imageId to a real entry in images[].

29. **INV-DM-29** — A resourceItem.kind is one of exactly three values — "link", "image", "text".

30. **INV-DM-30** — A unit's resourcesPage is exactly one object.

31. **INV-DM-31** — Every cribSheet.sections[].half is one of exactly two values, "upper" or "lower". A section belongs to exactly one half; it cannot be unassigned and cannot appear in both.

32. **INV-DM-32** — A unit's lesson numbers are unique and contiguous from 1. Reordering renumbers every affected lesson.

33. **INV-DM-33** — A TierPage is empty exactly when material, studentTask and workspaceLines are all unset or blank AND imageRefs[] is empty. An empty tier page is not emitted in print; the tier's key always exists in the schema.

34. **INV-DM-34** — Every top-level BigIdea (parentId: null) has a resolvable topicId. A sub-big idea carries no topicId of its own.

35. **INV-DM-35** — Every coverage[].nodeId on a Topic resolves to a real entry in nodes[].

36. **INV-DM-36** — A Topic's coverage[] carries no duplicate nodeId.

37. **INV-DM-37** — Every MiniAssessment has a resolvable bigIdeaId, independent of unitAssessment.bigIdeaId.

38. **INV-DM-38** — For every tier, the sum of every non-overridden criterion's auto-allocated maxScore equals the tier's fixed budget (Pass 50, Intermediate 25, Advanced 25), with every allocation on a 0.5 boundary.

39. **INV-DM-39** — A criterion with allocationOverridden: true is excluded from automatic allocation. Its maxScore stays hand-entered until changed again.

40. **INV-DM-40** — Marking matrix scope (full-unit vs per-assessment) is never stored as duplicate criteria or data. Per-assessment view is a computed filter.

41. **INV-DM-41** — Every cribSheet.sections[].size field is one of exactly three values — "small", "medium", "large" — or unset (defaults to "medium").

42. **INV-DM-42** — (Superseded by Change AF; historically enforced "exactly 1 page" during Change AC; now INV-DM-16 governs.)

43. **INV-DM-43** — Node.domain is set only on kind: strand nodes and is one of exactly two values or unset — "skill" | "knowledge" | unset. outcome/task nodes inherit via walking parentId.

44. **INV-DM-44** — Every date field (Lesson.date, MiniAssessment.date, UnitAssessment.finalAssessmentDate) is, when set, a valid ISO calendar date (YYYY-MM-DD). Paired lessonPeriod fields are plain free text with no format constraint.

---

## 3. Forward-Reference Fields (Must Be Stored From Start)

Every build must initialize and maintain these reference fields because they form the link graph (§1b of datamodel spec):

| Field | Entity | Target | Shape | Notes |
|-------|--------|--------|-------|-------|
| `lesson.nodeIds[]` | Lesson | Node[] | string array | Axis 1: curriculum node(s) the lesson serves (FR-TR-1) |
| `lesson.bigIdeaId` | Lesson | BigIdea or sub-BigIdea | string (single ref) | Axis 2: mandatory, exactly one (FR-BI-4, INV-DM-15) |
| `lesson.assessmentLink` | Lesson | UnitAssessment | `{ miniAssessmentIds[], finalAssessment, note }` | Links lesson to mini/final assessments (FR-UA-8, FR-LP-5) |
| `bigIdea.topicId` | BigIdea | Topic | string (top-level only) | Mandatory on every top-level big idea; sub-big ideas inherit transitively (FR-TOP-3, INV-DM-34) |
| `bigIdea.coverage[]` | BigIdea | Node[] | `[{ nodeId, coverage: "full"\|"partial", note }]` | Qualified coverage: which nodes this big idea serves (FR-BI-7, AD-21) |
| `topic.coverage[]` | Topic | Node[] | `[{ nodeId, coverage: "full"\|"partial", note }]` | Qualified coverage: independent of big idea coverage (FR-TOP-6, AD-35) |
| `unitAssessment.bigIdeaId` | UnitAssessment | BigIdea or sub-BigIdea | string (single ref) | For final assessment specifically; narrowed by Change S (FR-UA-5) |
| `unitAssessment.coverage[]` | UnitAssessment | Node[] | `[{ nodeId, coverage: "full"\|"partial", note }]` | Unit assessment's curriculum links (FR-UA-6) |
| `miniAssessment.bigIdeaId` | MiniAssessment | BigIdea or sub-BigIdea | string (single ref) | Mandatory, independent per mini assessment (FR-UA-13, INV-DM-37) |
| `miniAssessment.coverage[]` | MiniAssessment | Node[] | `[{ nodeId, coverage: "full"\|"partial", note }]` | Qualified coverage: which nodes this mini covers (Change I, AD-27) |
| `cribSheet.sections[].bigIdeaId` | CribSheet.Section | BigIdea or sub-BigIdea | string (single ref) | Each section binds to a big idea (FR-CS-2) |
| `resourceItem.imageId` | ResourceItem | Image (manifest) | string (single ref) | Resolves to images[] manifest entry; never base64 or separate path (FR-RES-2b) |
| `matrix.studentId` | Matrix | Student | string (single ref) | One page per student (FR-MM-4, INV-DM-6) |
| `matrix.scores[].criterionId` | Matrix.Score | MatrixTemplate.Criterion | string (single ref) | References shared template criterion (INV-DM-19) |
| `matrixTemplate.criteria[].assessmentIds[]` | MatrixTemplate.Criterion | MiniAssessment or final | string array | Which assessment(s) this criterion marks (Change T, AD-MMB-3) |
| All `ImageRef.imageId` | (in lessons, assessments, cribsheet, matrix) | Image (manifest) | string (single ref) | Resolves to images[] manifest entry (INV-DM-17) |

**Derived (Never Stored):**
- Node → Lessons (which lessons cover a node) — derived from lesson.nodeIds[]
- BigIdea → Lessons (which lessons bind to this idea) — derived from lesson.bigIdeaId
- Topic → BigIdeas (which big ideas bind to this topic) — derived from bigIdea.topicId
- Lesson → Topic (transitively via lesson.bigIdeaId → BigIdea.topicId) — never stored on Lesson
- Taught-vs-assessed gaps — derived by comparing bigIdea.coverage[] and miniAssessment.coverage[] (FR-BI-12)
- BigIdea glyph set (domain union) — derived from coverage[].nodeId → Node.domain (FR-BI-15)
- Topic completion status — derived from lesson/assessment completion flags (FR-TOP-11)

---

## 4. ID Formats and Generation Rules

| ID Type | Format | Generation | Stored In | Scope | Notes |
|---------|--------|-----------|-----------|-------|-------|
| `schemaVersion` | semantic version string | hardcoded in template | Unit root | global | e.g. "1.0.0" |
| `generatedFrom` | template version string | stamped by `!NewUnit` skill | Unit.generatedFrom | per-bundle | empty in template; filled at bundle creation |
| `Node.id` | string (internal, ours) | by ingest parser or UUID generator | Node | within unit | source code and title are verbatim (FR-CUR-5); id is generated |
| `BigIdea.id` | string (internal, ours) | generated on creation | BigIdea | within unit | **Spec silent on format** |
| `Topic.id` | string (internal, ours) | generated on creation | Topic | within unit | **Spec silent on format** |
| `Lesson.id` | string (internal, ours) | generated on creation | Lesson | within unit | **Spec silent on format** |
| `Lesson.number` | 1..N contiguous integers | assigned on creation, renumbered on reorder | Lesson.number | within unit | unique and contiguous from 1 (INV-DM-32) |
| `UnitAssessment.id` | string (internal, ours) | generated on creation | UnitAssessment | per unit (singular) | **Spec silent on format** |
| `MiniAssessment.id` | string (internal, ours) | generated on creation | MiniAssessment | within unit | part of unitAssessment (FR-UA-4 absorption) |
| `CribSheet.id` | string (internal, ours) | generated on creation | CribSheet | per unit (singular) | **Spec silent on format** |
| `ResourcesPage.id` | string (internal, ours) | generated on creation | ResourcesPage | per unit (singular) | **Spec silent on format** |
| `ResourceItem.id` | string (internal, ours) | generated on creation | ResourceItem | within resourcesPage | **Spec silent on format** |
| `MatrixTemplate.id` | implicit (not stored) | — | MatrixTemplate | per unit (singular) | template is referred to structurally; no stored id needed (INV-DM-18) |
| `MatrixTemplate.Criterion.id` | string (internal, ours) | generated on creation | MatrixTemplate.Criterion | within template | **Spec silent on format** |
| `Matrix.id` | string (internal, ours) | generated on creation | Matrix | per student | one per student page (INV-DM-6) |
| `Student.id` | string (internal, ours) | generated on creation | Student | within students[] | roster in the unit file (INV-DM-8) |
| `Image.id` | 32 hex characters (UUID-like) | generated on paste | Image manifest | within images[] | used in ImageRef and resourceItem.imageId |
| `Image.filename` | `img-NNNN.ext` | generated from id + source extension | Image manifest | within images/ folder | generated, not clipboard-preserved (OQ-DM-9 default) |
| `curriculum.profileId` | string (e.g. `vic-f10-v2`, `generic`) | set by ingest; recorded in unit | Curriculum | per unit | identifies the adapter used (FR-CUR-1e) |

**Gaps (Spec Silent):**
- Exact format for id generation (UUID, nanoid, sequential?) — not specified
- Whether id is persisted or generated fresh (likely persisted) — not specified
- How imageId formats relate to Image.id (likely identical) — stated as resolving but not explicitly named

---

## 5. Genuine Undefined Gaps

1. **ID generation format:** The spec requires every entity to carry an `id` field and states that references must resolve, but does not specify whether ids are UUIDs, sequential numbers, nanoids, or another format. Template/bundle-template builds the structure; later builds will decide.

2. **Date formats for `meta` fields:** Unit.meta carries `dateCreated` and `dateModified` (implied by "dates" in FR-LP-1), but schema details are not in this spec — format, whether stored at all, whether auto-managed or manual.

3. **Student roster size limits:** No maximum stated for the students[] array or the resulting matrices[] count.

4. **Image file size limits:** No byte-size cap stated for individual images or aggregate folder size.

5. **Text field length limits:** No character limits stated for title, text, or description fields.

6. **Concurrent edit safety:** The spec assumes a single editor per bundle; no locking or conflict-resolution scheme is defined.

7. **Version migration strategy:** INV-DM-9 requires refusing a higher schema version, but does not define a migration path for a schema change (e.g., adding a field) — v1 by design (AD-18 and bundle-template.spec §2 "not a new design decision").

8. **Image deletion:** The spec forbids dangling ImageRef entries (INV-DM-17) but does not specify cascade/refuse behavior when deleting an Image from the manifest.

9. **Curriculum profile validation:** The spec states which profile is recorded but does not validate that the profile exists or is correctly formed.

10. **Tier wording length:** No constraint on the character count of `matrixTemplate.criteria[].criterion` text (the rubric wording).

---

## Notes

- **Change Timeline:** Datamodel spec is rev 16 (2026-08-22, Change AJ). Most recent in PRD is rev 17 (2026-08-22, Change AJ). Bundle-template spec is 2026-08-23.
- **Coordinate Specs:** All three specs link back to `CurriculumPreparation.project.spec.md` as parent; architectural decisions documented in `CurriculumPreparation.arch.spec.md` (referenced as AD-* throughout).
- **Invariants & Requirements:** Every invariant has a corresponding requirement in FR-* (Product Requirements, §FR) or acceptance criterion AC-* linking back to it.
