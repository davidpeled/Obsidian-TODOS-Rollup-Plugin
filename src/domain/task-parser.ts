import { statusFromChar, type Task } from "./task.ts";

// Note: no regex lookbehind anywhere in the domain. Older iOS WebViews
// (Obsidian mobile on iOS < 16.4) throw a SyntaxError on it.

const TASK_RE = /^([ \t>]*)(?:[-*+]|\d+[.)])\s+\[(.)\]\s?(.*)$/;
const FENCE_RE = /^\s*(```|~~~)/;

function indentWidth(ws: string): number {
  let w = 0;
  for (const c of ws) w += c === "\t" ? 4 : c === ">" ? 0 : 1;
  return w;
}

/** Extract every markdown task from a note, skipping frontmatter and code fences. */
export function parseTasks(path: string, content: string): Task[] {
  const lines = content.split("\n");
  const tasks: Task[] = [];
  let i = 0;

  // Skip YAML frontmatter
  if (lines[0]?.replace(/\r$/, "") === "---") {
    for (i = 1; i < lines.length; i++) {
      if (/^(---|\.\.\.)\s*$/.test(lines[i])) {
        i++;
        break;
      }
    }
  }

  let fence: string | null = null;
  const stack: number[] = []; // indent widths of ancestor tasks

  for (; i < lines.length; i++) {
    const raw = lines[i].replace(/\r$/, "");
    const f = FENCE_RE.exec(raw);
    if (f) {
      if (fence === null) fence = f[1];
      else if (f[1] === fence) fence = null;
      continue;
    }
    if (fence !== null) continue;

    const m = TASK_RE.exec(raw);
    if (!m) {
      if (raw.trim() === "") continue;
      // A non-indented non-task line ends any nesting
      if (!/^\s/.test(raw)) stack.length = 0;
      continue;
    }
    const width = indentWidth(m[1]);
    while (stack.length && stack[stack.length - 1] >= width) stack.pop();
    const depth = stack.length;
    stack.push(width);

    tasks.push({
      path,
      line: i,
      raw,
      occurrence: 0,
      occurrences: 1,
      depth,
      statusChar: m[2],
      status: statusFromChar(m[2]),
      text: m[3].trim(),
    });
  }
  markDuplicates(tasks);
  return tasks;
}

function markDuplicates(tasks: Task[]): void {
  const groups = new Map<string, Task[]>();
  for (const t of tasks) {
    const g = groups.get(t.raw);
    if (g) g.push(t);
    else groups.set(t.raw, [t]);
  }
  for (const g of groups.values())
    g.forEach((t, n) => {
      t.occurrence = n;
      t.occurrences = g.length;
    });
}
