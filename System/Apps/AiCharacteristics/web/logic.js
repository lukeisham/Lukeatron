/** Pure page logic — no DOM, no network — so it can be tested directly. */

export const MAX_WORDS = 700;

export const countWords = (text) => (text.trim() === "" ? 0 : text.trim().split(/\s+/).length);

export const isCheckable = (text) => {
  const words = countWords(text);
  return words > 0 && words <= MAX_WORDS;
};

export const splitCriteria = (criteria) => ({
  live: criteria.filter((criterion) => criterion.status !== "retired"),
  retired: criteria.filter((criterion) => criterion.status === "retired"),
});

/** Verdicts joined to their criterion, "seen" first, then by the judge's confidence (ties keep list order). */
export function joinVerdicts(live, verdicts) {
  const byId = new Map(verdicts.map((verdict) => [verdict.id, verdict]));
  return live
    .filter((criterion) => byId.has(criterion.id))
    .map((criterion) => {
      const { answer, confidence } = byId.get(criterion.id);
      return { id: criterion.id, title: criterion.title, plain: criterion.plain || criterion.description, answer, confidence };
    })
    .sort((a, b) => (b.answer === "yes") - (a.answer === "yes") || b.confidence - a.confidence);
}

export const summarise = (rows) => ({ seen: rows.filter((row) => row.answer === "yes").length, total: rows.length });

export const percent = (confidence) => Math.round(confidence * 100);

export function formatWhen(iso, timeZone) {
  return new Date(iso).toLocaleString("en-AU", {
    day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone,
  });
}

export function sourceLine(saved, timeZone) {
  if (!saved.scraped_at) return "Not scraped yet";
  const title = (saved.article_title ?? "").replace(/^Wikipedia:/, "");
  const source = title ? `Wikipedia, “${title}”` : "Wikipedia";
  return `Built from ${source} · scraped ${formatWhen(saved.scraped_at, timeZone)}`;
}

/** The one line shown under the Scrape button when a Scrape has finished. */
export function scrapeStatus(summary) {
  if (summary.total > 0 && summary.new.length === summary.total) return `Built ${summary.total} criteria from the article.`;
  const parts = [
    [summary.new.length, "added"],
    [summary.changed.length, "reworded"],
    [summary.retired.length, "retired"],
  ].filter(([count]) => count > 0).map(([count, what]) => `${count} ${what}`);
  return parts.length === 0 ? "Checked just now. Nothing has changed." : `Updated just now: ${parts.join(", ")}.`;
}

/** A server message as a sentence: capital first, full stop last. */
export function sentence(message) {
  const capitalised = message.charAt(0).toUpperCase() + message.slice(1);
  return capitalised.endsWith(".") ? capitalised : `${capitalised}.`;
}

export const scrapeFailure = (message) => `${sentence(message)} Nothing was changed.`;
