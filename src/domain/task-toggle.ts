import type { Task } from "./task.ts";

/**
 * Return new file content with the task's checkbox flipped.
 * Finds the task by exact text. Identical lines are told apart by their order, but only while the note
 * still has the same number of them.
 * Throws if the task can't be located unambiguously, so we never edit the wrong line.
 */
export function toggleTaskInContent(
  content: string,
  task: Pick<Task, "line" | "raw"> & Partial<Pick<Task, "occurrence" | "occurrences">>,
  done: boolean,
): string {
  const lines = content.split("\n");
  const matches: number[] = [];
  lines.forEach((l, n) => l.replace(/\r$/, "") === task.raw && matches.push(n));

  let idx = -1;
  if (matches.length === 1) idx = matches[0];
  else if (matches.length > 1) {
    if (task.occurrence !== undefined && task.occurrences === matches.length) idx = matches[task.occurrence];
    else if (task.occurrences === undefined && matches.includes(task.line)) idx = task.line;
  }
  if (idx === -1) throw new Error("This todo changed since the page loaded. Try again.");

  lines[idx] = lines[idx].replace(
    /^([ \t>]*(?:[-*+]|\d+[.)])\s+)\[.\]/,
    (_m, prefix: string) => `${prefix}[${done ? "x" : " "}]`,
  );
  return lines.join("\n");
}
