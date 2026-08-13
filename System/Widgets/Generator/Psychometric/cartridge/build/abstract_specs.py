#!/usr/bin/env python3
"""Hand-authored rule specs for the 12 Abstract/Diagrammatic Reasoning items
(DECISIONS.md D-3): each item is **structured data** — a grid/sequence/
odd-one-out declaration plus the rule(s) that generate it — never literal
SVG markup and never a hand-recorded answer letter. ``engine.js``'s
``deriveAnswerId()`` walks each item's ``rules``/``priority`` at render and
check-answer time to work out which lettered option is correct; nothing in
this module (or in ``pool.json``) stores that letter directly.

Cell descriptor fields (all optional, defaults applied by the renderer):
  shape    "circle"|"square"|"triangle"|"pentagon"|"hexagon"|"star"|"dot"
           |"rectangle"
  count    int, shapes drawn side-by-side in the cell (default 1)
  fill     "filled"|"outline"|"half"
  rotation degrees, clockwise from upright (default 0)
  size     1-5 relative scale (default 3), or "small"/"medium"/"large"
  position named cell-anchor: "center","left","right","center-left",
           "center-right","top-left","top-center","top-right",
           "bottom-left","bottom-center","bottom-right"
  layout   "row" (default) | "square" — how multiple shapes/counts arrange

Matrix/series rule entries: {"attr": <cell field>, "by": "row"|"col"|
"row-increment"|"col-increment"|"constant"|"path", ...}. Odd-one-out items
carry ``items`` (5 cells) plus ``priority`` — an ordered list of attributes;
``deriveAnswerId`` checks each in turn and returns the item whose value is
the lone 4-1 minority on the first attribute that produces one.
"""
from __future__ import annotations

ABSTRACT_SPECS: dict[str, dict] = {
    "AR-01": {
        "kind": "matrix",
        "rows": 3,
        "cols": 3,
        "grid": [
            [
                {"shape": "circle", "fill": "filled", "rotation": 0},
                {"shape": "circle", "fill": "filled", "rotation": 0},
                {"shape": "circle", "fill": "filled", "rotation": 0},
            ],
            [
                {"shape": "square", "fill": "outline", "rotation": 0},
                {"shape": "square", "fill": "outline", "rotation": 0},
                {"shape": "square", "fill": "outline", "rotation": 0},
            ],
            [
                {"shape": "triangle", "fill": "filled", "rotation": 0},
                {"shape": "triangle", "fill": "filled", "rotation": 0},
                None,
            ],
        ],
        "missing": {"r": 2, "c": 2},
        "rules": [
            {"attr": "shape", "by": "row"},
            {"attr": "fill", "by": "row"},
            {"attr": "rotation", "by": "row"},
        ],
        "options": {
            "A": {"shape": "triangle", "fill": "filled", "rotation": 0},
            "B": {"shape": "triangle", "fill": "filled", "rotation": 180},
            "C": {"shape": "triangle", "fill": "outline", "rotation": 0},
            "D": {"shape": "circle", "fill": "filled", "rotation": 0},
            "E": {"shape": "square", "fill": "filled", "rotation": 0},
        },
        "optionLabels": {
            "A": "Large triangle, apex-up, filled black",
            "B": "Large triangle, apex-down, filled black",
            "C": "Large triangle, apex-up, outline only",
            "D": "Large circle, apex-up, filled black",
            "E": "Large square, apex-up, filled black",
        },
    },
    "AR-02": {
        "kind": "matrix",
        "rows": 3,
        "cols": 3,
        "grid": [
            [
                {"shape": "circle", "size": 1, "position": "center-left"},
                {"shape": "circle", "size": 1, "position": "center"},
                {"shape": "circle", "size": 1, "position": "center-right"},
            ],
            [
                {"shape": "circle", "size": 3, "position": "center-left"},
                {"shape": "circle", "size": 3, "position": "center"},
                {"shape": "circle", "size": 3, "position": "center-right"},
            ],
            [
                {"shape": "circle", "size": 5, "position": "center-left"},
                {"shape": "circle", "size": 5, "position": "center"},
                None,
            ],
        ],
        "missing": {"r": 2, "c": 2},
        "rules": [
            {"attr": "size", "by": "row"},
            {"attr": "position", "by": "col"},
        ],
        "options": {
            "A": {"shape": "circle", "size": 5, "position": "center"},
            "B": {"shape": "circle", "size": 5, "position": "center-left"},
            "C": {"shape": "circle", "size": 5, "position": "center-right"},
            "D": {"shape": "circle", "size": 3, "position": "center-right"},
            "E": {"shape": "circle", "size": 8, "position": "center"},
        },
        "optionLabels": {
            "A": "Large circle, center position",
            "B": "Large circle, center-left position",
            "C": "Large circle, center-right position",
            "D": "Medium circle, center-right position",
            "E": "Large circle, center position (2x larger than 3,2)",
        },
    },
    "AR-03": {
        "kind": "series",
        "sequence": [
            {"shape": "square", "fill": "outline", "rotation": 0},
            {"shape": "square", "fill": "outline", "rotation": 45},
            {"shape": "square", "fill": "outline", "rotation": 90},
            {"shape": "square", "fill": "outline", "rotation": 135},
            None,
        ],
        "rules": [
            {"attr": "shape", "by": "constant"},
            {"attr": "fill", "by": "constant"},
            {"attr": "rotation", "by": "sequence-increment"},
        ],
        "options": {
            "A": {"shape": "square", "fill": "outline", "rotation": 180},
            "B": {"shape": "square", "fill": "outline", "rotation": 45},
            "C": {"shape": "square", "fill": "filled", "rotation": 135},
            "D": {"shape": "square", "fill": "filled", "rotation": 0},
            "E": {"shape": "circle", "fill": "outline", "rotation": 180},
        },
        "optionLabels": {
            "A": "Square, 180 degree rotation, outline",
            "B": "Square, 45 degree rotation, outline",
            "C": "Square, 135 degree rotation, filled black",
            "D": "Square, 0 degree rotation, filled black",
            "E": "Circle, 180 degree rotation, outline",
        },
    },
    "AR-04": {
        "kind": "oddOneOut",
        "items": {
            "A": {"shape": "circle", "fill": "outline", "layout": "overlap-pair"},
            "B": {"shape": "square", "fill": "outline", "layout": "overlap-pair"},
            "C": {"shape": "triangle", "fill": "outline", "layout": "overlap-pair"},
            "D": {"shape": "circle", "fill": "filled", "layout": "overlap-pair"},
            "E": {"shape": "star", "fill": "outline", "layout": "overlap-pair"},
        },
        "priority": ["fill", "shape"],
        "optionLabels": {
            "A": "Two overlapping circles, outline only",
            "B": "Two overlapping squares, outline only",
            "C": "Two overlapping triangles, outline only",
            "D": "Two overlapping circles, filled black",
            "E": "Two overlapping stars, outline only",
        },
    },
    "AR-05": {
        "kind": "matrix",
        "rows": 3,
        "cols": 3,
        "grid": [
            [
                {"shape": "circle", "fill": "filled", "count": 2},
                {"shape": "circle", "fill": "filled", "count": 3},
                {"shape": "circle", "fill": "filled", "count": 4},
            ],
            [
                {"shape": "square", "fill": "outline", "count": 2},
                {"shape": "square", "fill": "outline", "count": 3},
                {"shape": "square", "fill": "outline", "count": 4},
            ],
            [
                {"shape": "triangle", "fill": "filled", "count": 2},
                {"shape": "triangle", "fill": "filled", "count": 3},
                None,
            ],
        ],
        "missing": {"r": 2, "c": 2},
        "rules": [
            {"attr": "shape", "by": "row"},
            {"attr": "fill", "by": "row"},
            {"attr": "count", "by": "row-increment"},
        ],
        "options": {
            "A": {"shape": "triangle", "fill": "filled", "count": 4, "layout": "row"},
            "B": {"shape": "triangle", "fill": "outline", "count": 4, "layout": "row"},
            "C": {"shape": "triangle", "fill": "filled", "count": 4, "layout": "square"},
            "D": {"shape": "triangle", "fill": "filled", "count": 3, "layout": "row"},
            "E": {"shape": "triangle", "fill": "filled", "count": 5, "layout": "row"},
        },
        "optionLabels": {
            "A": "Four small triangles, in a row, filled black",
            "B": "Four small triangles, in a row, outline only",
            "C": "Four small triangles, arranged in a square, filled black",
            "D": "Three small triangles, in a row, filled black",
            "E": "Five small triangles, in a row, filled black",
        },
    },
    "AR-06": {
        "kind": "series",
        "sequence": [
            {"shape": "dot", "fill": "filled", "position": "top-left"},
            {"shape": "dot", "fill": "filled", "position": "top-center"},
            {"shape": "dot", "fill": "filled", "position": "top-right"},
            None,
        ],
        "rules": [
            {"attr": "shape", "by": "constant"},
            {"attr": "fill", "by": "constant"},
            {
                "attr": "position",
                "by": "path",
                "path": [
                    "top-left", "top-center", "top-right", "center",
                    "bottom-right", "bottom-center", "bottom-left", "center-left",
                ],
            },
        ],
        "options": {
            "A": {"shape": "dot", "fill": "filled", "position": "center-left"},
            "B": {"shape": "dot", "fill": "filled", "position": "center"},
            "C": {"shape": "dot", "fill": "filled", "position": "center-right"},
            "D": {"shape": "dot", "fill": "filled", "position": "bottom-right"},
            "E": {"shape": "dot", "fill": "filled", "position": "top-left"},
        },
        "optionLabels": {
            "A": "Center-left of the cell",
            "B": "Center of the cell",
            "C": "Center-right of the cell",
            "D": "Bottom-right of the cell",
            "E": "Top-left again (sequence repeats)",
        },
    },
    "AR-07": {
        "kind": "matrix",
        "rows": 3,
        "cols": 3,
        "grid": [
            [
                {"shape": "square", "fill": "outline"},
                {"shape": "pentagon", "fill": "outline"},
                {"shape": "hexagon", "fill": "outline"},
            ],
            [
                {"shape": "square", "fill": "filled"},
                None,
                {"shape": "hexagon", "fill": "filled"},
            ],
            [
                {"shape": "square", "fill": "outline"},
                {"shape": "pentagon", "fill": "outline"},
                {"shape": "hexagon", "fill": "outline"},
            ],
        ],
        "missing": {"r": 1, "c": 1},
        "rules": [
            {"attr": "shape", "by": "col"},
            {"attr": "fill", "by": "row"},
        ],
        "options": {
            "A": {"shape": "pentagon", "fill": "filled"},
            "B": {"shape": "pentagon", "fill": "outline"},
            "C": {"shape": "square", "fill": "filled"},
            "D": {"shape": "hexagon", "fill": "filled"},
            "E": {"shape": "pentagon", "fill": "half"},
        },
        "optionLabels": {
            "A": "Pentagon, filled black",
            "B": "Pentagon, outline only",
            "C": "Square, filled black",
            "D": "Hexagon, filled black",
            "E": "Pentagon, half-filled",
        },
    },
    "AR-08": {
        "kind": "oddOneOut",
        "items": {
            "A": {"arrangementFamily": "triangle", "spacing": "even"},
            "B": {"arrangementFamily": "line", "spacing": "even"},
            "C": {"arrangementFamily": "triangle", "spacing": "even", "inverted": True},
            "D": {"arrangementFamily": "triangle", "spacing": "uneven"},
            "E": {"arrangementFamily": "triangle", "spacing": "even"},
        },
        "priority": ["arrangementFamily", "spacing"],
        "optionLabels": {
            "A": "Three dots, triangle, even spacing",
            "B": "Three dots, straight line, even spacing",
            "C": "Three dots, inverted triangle, even spacing",
            "D": "Three dots, triangle, uneven spacing",
            "E": "Three dots, triangle, even spacing",
        },
    },
    "AR-09": {
        "kind": "series",
        "sequence": [
            {"shape": "square", "fill": "outline", "size": 1},
            {"shape": "square", "fill": "outline", "size": 2},
            {"shape": "square", "fill": "outline", "size": 3},
            {"shape": "square", "fill": "outline", "size": 4},
            None,
        ],
        "rules": [
            {"attr": "shape", "by": "constant"},
            {"attr": "fill", "by": "constant"},
            {"attr": "size", "by": "sequence-increment"},
        ],
        "options": {
            "A": {"shape": "square", "fill": "outline", "size": 5, "count": 1},
            "B": {"shape": "square", "fill": "outline", "size": 3, "count": 1},
            "C": {"shape": "square", "fill": "outline", "size": 4, "count": 2},
            "D": {"shape": "square", "fill": "outline", "size": 4, "rotation": 45, "count": 1},
            "E": {"shape": "circle", "fill": "outline", "size": 5, "count": 1},
        },
        "optionLabels": {
            "A": "Single square, size 5 units",
            "B": "Single square, size 3 units",
            "C": "Two squares, size 4 units each",
            "D": "Single square, size 4 units, rotated 45 degrees",
            "E": "Circle, size 5 units",
        },
    },
    "AR-10": {
        "kind": "matrix",
        "rows": 3,
        "cols": 3,
        "grid": [
            [
                {"shape": "circle", "count": 1},
                {"shape": "circle", "count": 2},
                {"shape": "circle", "count": 3},
            ],
            [
                {"shape": "square", "count": 1},
                {"shape": "square", "count": 2},
                {"shape": "square", "count": 3},
            ],
            [
                {"shape": "triangle", "count": 1},
                None,
                {"shape": "triangle", "count": 3},
            ],
        ],
        "missing": {"r": 2, "c": 1},
        "rules": [
            {"attr": "shape", "by": "row"},
            {"attr": "count", "by": "col"},
        ],
        "options": {
            "A": {"shape": "triangle", "count": 2},
            "B": {"shape": "triangle", "count": 1},
            "C": {"shape": "triangle", "count": 3},
            "D": {"shape": "square", "count": 2},
            "E": {"shape": "circle", "count": 2},
        },
        "optionLabels": {
            "A": "Two triangles",
            "B": "One triangle",
            "C": "Three triangles",
            "D": "Two squares",
            "E": "Two circles",
        },
    },
    "AR-11": {
        "kind": "series",
        "sequence": [
            {"shape": "rectangle", "fill": "outline", "rotation": 0},
            {"shape": "rectangle", "fill": "outline", "rotation": 45},
            {"shape": "rectangle", "fill": "outline", "rotation": 90},
            {"shape": "rectangle", "fill": "outline", "rotation": 135},
            None,
        ],
        "rules": [
            {"attr": "shape", "by": "constant"},
            {"attr": "fill", "by": "constant"},
            {"attr": "rotation", "by": "sequence-increment"},
        ],
        "options": {
            "A": {"shape": "rectangle", "fill": "outline", "rotation": 0},
            "B": {"shape": "rectangle", "fill": "outline", "rotation": 180},
            "C": {"shape": "rectangle", "fill": "filled", "rotation": 45},
            "D": {"shape": "rectangle", "fill": "outline", "rotation": 135},
            "E": {"shape": "square", "fill": "outline", "rotation": 0},
        },
        "optionLabels": {
            "A": "Rectangle, 0 degrees (horizontal), outline",
            "B": "Rectangle, 180 degrees, outline",
            "C": "Rectangle, 45 degrees, filled black",
            "D": "Rectangle, 135 degrees, outline (repeats previous)",
            "E": "Square, 0 degrees, outline",
        },
    },
    "AR-12": {
        "kind": "oddOneOut",
        "items": {
            "A": {"closed": True, "sizeUniform": True, "shapeType": "square"},
            "B": {"closed": True, "sizeUniform": True, "shapeType": "diamond"},
            "C": {"closed": True, "sizeUniform": True, "shapeType": "rectangle"},
            "D": {"closed": True, "sizeUniform": False, "shapeType": "square"},
            "E": {"closed": False, "sizeUniform": True, "shapeType": "line"},
        },
        "priority": ["closed", "sizeUniform", "shapeType"],
        "optionLabels": {
            "A": "Four dots forming a square, evenly spaced, same size",
            "B": "Four dots forming a diamond, evenly spaced, same size",
            "C": "Four dots forming a rectangle, evenly spaced, same size",
            "D": "Four dots forming a square, one dot larger",
            "E": "Four dots forming a line, evenly spaced, same size",
        },
    },
}
