// grouping.js — FR-3/AD-1: where three or more sibling tasks share a leading
// stem, lift it to a heading and leave only what differs. Pure and
// store-agnostic (D-12): the store keeps every row; this only decides how
// actions.js draws them. Nothing here truncates or clones a task — the same
// TaskView objects a caller hands in come back out, so a chip's full text
// (FR-6) is always the source task's own `.action`.

// One shared word ("Email") is not a stem — the risk table's own adversarial
// case is three actions that happen to open with the same single verb but
// are otherwise unrelated. Requiring at least two shared words is what keeps
// that case from forming a false group.
const MIN_STEM_WORDS = 2;

function wordsOf(action) {
  if (typeof action !== "string") {
    console.warn("grouping.js: a task's action is not a string — treating it as empty for grouping", action);
    return [];
  }
  return action.trim().split(/\s+/).filter(Boolean);
}

/**
 * Groups sibling tasks by the longest leading word-sequence at least three
 * of them share verbatim. Tries the longest possible stem first and works
 * down, so a task is always claimed by the most specific group it qualifies
 * for, never the vaguest one. Returns entries in the callers' original
 * order — a grouped entry sits at the position of its first member; an
 * ungrouped task comes back as its own `{ stem: null, tasks: [task] }`.
 */
export function groupByStem(tasks) {
  const list = tasks ?? [];
  const wordCache = new Map(list.map((task) => [task, wordsOf(task?.action)]));
  const claimedBy = new Map(); // task -> groupKey
  const groups = new Map(); // groupKey -> { stem, wordCount, tasks: [] }

  const maxWords = Math.max(0, ...[...wordCache.values()].map((words) => words.length));
  for (let wordCount = maxWords - 1; wordCount >= MIN_STEM_WORDS; wordCount--) {
    const buckets = new Map(); // stem text at this length -> tasks sharing it
    for (const task of list) {
      if (claimedBy.has(task)) continue;
      const words = wordCache.get(task);
      if (words.length <= wordCount) continue; // must leave something to differ
      const stem = words.slice(0, wordCount).join(" ");
      if (!buckets.has(stem)) buckets.set(stem, []);
      buckets.get(stem).push(task);
    }
    for (const [stem, members] of buckets) {
      if (members.length < 3) continue;
      const groupKey = `${wordCount}:${stem}`;
      groups.set(groupKey, { stem, wordCount, tasks: [] });
      for (const task of members) claimedBy.set(task, groupKey);
    }
  }

  const output = [];
  const emitted = new Set();
  for (const task of list) {
    const groupKey = claimedBy.get(task);
    if (!groupKey) {
      output.push({ stem: null, tasks: [task] });
      continue;
    }
    const group = groups.get(groupKey);
    group.tasks.push(task);
    if (!emitted.has(groupKey)) {
      emitted.add(groupKey);
      output.push(group);
    }
  }
  return output;
}

/**
 * The part of `task.action` after a group's stem — display only. FR-6
 * requires a chip's *copy* to stay the full action, stem included; callers
 * must reach for `task.action` itself for that, never this function.
 */
export function stemDifference(group, task) {
  if (group.stem === null) return task.action ?? "";
  const words = wordsOf(task.action);
  return words.slice(group.wordCount).join(" ");
}
