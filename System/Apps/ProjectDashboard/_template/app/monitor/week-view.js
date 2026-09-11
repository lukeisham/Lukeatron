// The week rail (FR-16 family): one rounded row of `model`'s week set, the
// reading strip beneath it, the overdue cap off the left end, and the day view
// (FR-16's `[week | day]` control).
//
// This module draws only what `model` hands it (FR-13's four sources); it has
// no calendar logic of its own and never re-derives a date's urgency — a
// `due` item inside the fetched week is always within the seven-day window by
// construction (model.py's week_set already pulls anything overdue into the
// separate cap before this ever sees a day), so the only fluorescent this view
// ever applies to a rail entry is the this-week colour, never overdue's — the
// overdue cap carries that one on its own count instead (FR-16c, FR-16d).

import { el, svgEl, clear, token } from "../shared/dom.js";
import { formatShortDate, weekdayLabel, kindName } from "../shared/format.js";
import { kindColour } from "./colour.js";

const MARK_SIZE = 11;

function localTodayISO() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isWeekend(isoDate) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return day === 0 || day === 6;
}

/** One entry's shape — FR-16a: a due is a circle, a wake a square, an incoming
 * a diamond, so the three separate without spending a colour. */
function markShape(source, x, y, kind) {
  const fill = kind != null ? kindColour(kind) : "var(--ink-guessed)";
  if (source === "wake") {
    const half = MARK_SIZE / 2;
    return svgEl("rect", { x: x - half, y: y - half, width: MARK_SIZE, height: MARK_SIZE, fill });
  }
  if (source === "incoming") {
    const half = MARK_SIZE / 2;
    return svgEl("rect", {
      x: x - half,
      y: y - half,
      width: MARK_SIZE,
      height: MARK_SIZE,
      fill,
      transform: `rotate(45 ${x} ${y})`,
    });
  }
  // "due" and "event" both read as a circle — an event carries no fluorescent
  // and no wrapper kind of its own, so it takes the plain circle too.
  return svgEl("circle", { cx: x, cy: y, r: MARK_SIZE / 2, fill });
}

/** The two-ring halo (STYLE.md, "The small-mark halo") — this-week only, per
 * FR-16d: a rail entry that reaches this view already excludes overdue (it
 * lives in the cap instead), and a wake/incoming never fluoresces at all. */
function haloRings(source, x, y) {
  if (source !== "due") return [];
  return [
    svgEl("circle", { cx: x, cy: y, r: MARK_SIZE / 2 + 3, fill: "none", stroke: "var(--bg)", "stroke-width": "var(--halo-inner)" }),
    svgEl("circle", {
      cx: x,
      cy: y,
      r: MARK_SIZE / 2 + 3 + 2,
      fill: "none",
      stroke: "var(--fluoro-week)",
      "stroke-width": "var(--halo-outer-week)",
    }),
  ];
}

function renderDayColumn(day, { today, onHover, onOpenStack, wide }) {
  const isToday = day.date === today;
  const isPast = day.date < today;
  const weekend = isWeekend(day.date);
  const width = wide ? 220 : 92;
  const height = 132;

  const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}`, width, height, class: "week-day-marks" });
  // styleguide FR-13: three radii only — --r-swatch is the closest of the
  // three to this background's own scale, so it is reused rather than a
  // fourth, un-tokenized radius being introduced silently.
  if (weekend) svg.appendChild(svgEl("rect", { x: 0, y: 0, width, height, fill: "var(--panel)", rx: parseFloat(token("--r-swatch")) || 2 }));
  if (isToday) svg.appendChild(svgEl("rect", { x: 0, y: 0, width, height: 4, fill: "var(--k3)" }));

  const perRow = wide ? 6 : 3;
  const cellW = width / perRow;
  day.items.forEach((item, i) => {
    const col = i % perRow;
    const row = Math.floor(i / perRow);
    const x = cellW * col + cellW / 2;
    const y = 26 + row * (MARK_SIZE + 10);
    for (const ring of haloRings(item.source, x, y)) svg.appendChild(ring);
    svg.appendChild(markShape(item.source, x, y, item.kind));
  });

  const dateLabel = el(
    "span",
    { class: `week-date${isPast ? " week-date-past" : ""}${isToday ? " week-date-today" : ""}` },
    formatShortDate(day.date)
  );
  const countLabel = day.items.length > 0 ? el("span", { class: "week-count" }, ` (${day.items.length})`) : null;

  const column = el("button", { class: "week-day", type: "button", onMouseenter: () => onHover(day), onFocus: () => onHover(day) }, [
    el("div", { class: "week-weekday" }, weekdayLabel(day.date)),
    el("div", { class: "week-date-row" }, [dateLabel, countLabel]),
    svg,
  ]);
  column.addEventListener("click", () => onHover(day));
  return column;
}

function renderReadingStrip(day, { onOpenStack }) {
  if (!day || day.items.length === 0) {
    return el("div", { class: "week-strip week-strip-empty" }, day ? "Nothing on this day." : "");
  }
  const rows = day.items.map((item) =>
    el("li", { class: "week-strip-row" }, [
      el("span", { class: "week-strip-source" }, item.source === "event" ? "event" : item.source),
      item.kind != null ? el("span", { class: "week-strip-kind" }, kindName(item.kind)) : null,
      item.project_id
        ? el("button", { class: "link-button", type: "button", onClick: () => onOpenStack(item.project_id) }, item.project_id)
        : el("span", {}, "—"),
    ])
  );
  return el("div", { class: "week-strip" }, [el("div", { class: "week-strip-heading" }, formatShortDate(day.date)), el("ul", {}, rows)]);
}

/**
 * Renders the week rail (or, in `span: "day"` mode, one day at a time) into
 * `container`. `board.week` is model's WeekSet — seven days plus the overdue
 * cap (FR-13). `onOpenStack(projectId)` is called when an entry — or the
 * overdue cap's own entries — is drilled into (FR-16, "each entry drills to
 * its project like any other").
 */
export function renderWeekView(container, board, { span = "week", onOpenStack, onSpanChange, dayIndex = 0, onDayIndexChange }) {
  clear(container);
  const today = localTodayISO();
  const week = board.week;
  const todayDay = week.days.find((d) => d.date === today) ?? null;
  let hoveredDay = todayDay;

  const strip = el("div", {});
  const setHover = (day) => {
    hoveredDay = day;
    clear(strip);
    strip.appendChild(renderReadingStrip(day, { onOpenStack }));
  };

  const capButton = el(
    "button",
    { class: "week-overdue-cap", type: "button", title: `${week.overdue.length} overdue`, onClick: () => setHover({ date: "overdue", items: week.overdue }) },
    [el("span", { class: "week-overdue-count" }, String(week.overdue.length)), el("span", {}, " overdue")]
  );

  let body;
  if (span === "day") {
    const day = week.days[Math.min(dayIndex, week.days.length - 1)];
    const prevBtn = el("button", { class: "week-nav", type: "button", disabled: dayIndex <= 0, onClick: () => onDayIndexChange(dayIndex - 1) }, "‹");
    const nextBtn = el(
      "button",
      { class: "week-nav", type: "button", disabled: dayIndex >= week.days.length - 1, onClick: () => onDayIndexChange(dayIndex + 1) },
      "›"
    );
    body = el("div", { class: "week-rail week-rail-day" }, [prevBtn, renderDayColumn(day, { today, onHover: setHover, wide: true }), nextBtn]);
  } else {
    const columns = week.days.map((day) => renderDayColumn(day, { today, onHover: setHover }));
    body = el("div", { class: "week-rail" }, [capButton, ...columns]);
  }
  // AC-12a: the reading strip rests on today when nothing is hovered (FR-16b)
  // — leaving the whole rail, not moving between its own day buttons, is what
  // counts as "nothing hovered", so this listens on the rail as a group rather
  // than on each day button (which would flicker back to today mid-crossing).
  body.addEventListener("mouseleave", () => setHover(todayDay));

  const spanToggle = el("div", { class: "toggle-group", role: "group", "aria-label": "week or day" }, [
    el(
      "button",
      { class: `toggle${span === "week" ? " toggle-active" : ""}`, type: "button", onClick: () => onSpanChange("week") },
      "🗓 week"
    ),
    el("button", { class: `toggle${span === "day" ? " toggle-active" : ""}`, type: "button", onClick: () => onSpanChange("day") }, "day"),
  ]);

  setHover(hoveredDay);
  container.appendChild(el("div", { class: "week-view" }, [spanToggle, body, strip]));
}
