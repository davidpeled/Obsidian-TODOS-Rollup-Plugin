export type TaskStatus = "open" | "done" | "cancelled" | "in-progress";

export interface Task {
  path: string;
  /** 0-based line number in the note */
  line: number;
  /** The exact raw line, used to verify the file hasn't shifted before writing */
  raw: string;
  /** Which identical `raw` line this is (0-based), so duplicate todos can be told apart after a shift */
  occurrence: number;
  /** How many identical `raw` lines the note had when parsed */
  occurrences: number;
  /** Nesting depth among tasks (0 = top level) */
  depth: number;
  statusChar: string;
  status: TaskStatus;
  /** Task text with the checkbox removed */
  text: string;
}

export type TaskFilter = "open" | "done" | "all";

export function statusFromChar(ch: string): TaskStatus {
  if (ch === " ") return "open";
  if (ch === "x" || ch === "X") return "done";
  if (ch === "-") return "cancelled";
  return "in-progress"; // "/", ">", "!", "?" etc. are still things to do
}

export function isCompleted(status: TaskStatus): boolean {
  return status === "done" || status === "cancelled";
}

/** Identity of a task within one scan. */
export const taskKey = (t: Pick<Task, "path" | "line">) => `${t.path}\u0000${t.line}`;

export function passesFilter(filter: TaskFilter, completed: boolean): boolean {
  return filter === "all" || (filter === "done" ? completed : !completed);
}
