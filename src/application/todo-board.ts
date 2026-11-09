import { daysUntil, dueStateOf } from "../domain/calendar.ts";
import type { NoteMeta } from "../domain/note.ts";
import type { Clock, NoteRepository, Notifier } from "../domain/ports.ts";
import { isCompleted, passesFilter, taskKey, type Task, type TaskFilter, type TaskStatus } from "../domain/task.ts";
import { parseTasks } from "../domain/task-parser.ts";
import { parseTaskText } from "../domain/task-text.ts";

export interface NoteTasks {
  note: NoteMeta;
  tasks: Task[];
}

export interface Totals {
  open: number;
  done: number;
  overdue: number;
  today: number;
  total: number;
}

export interface BoardOptions {
  showRecentNotes: boolean;
  recentNotesCount: number;
  initialFilter: TaskFilter;
  onFilterChange?(filter: TaskFilter): void;
}

/** What changed, so a view can redraw only what it must. */
export type BoardEvent = "loaded" | "pending" | "view";

/**
 * The todo rollup as a model: loads notes through the repository, keeps filter/search/pending state,
 * and answers questions about it. No DOM, so it is testable with fakes.
 */
export class TodoBoard {
  filter: TaskFilter;
  query = "";
  notes: NoteTasks[] = [];
  recent: NoteMeta[] = [];
  loaded = false;
  disposed = false;

  /** Optimistic checkbox state while a write is in flight. */
  private pending = new Map<string, boolean>();
  private parseCache = new Map<string, { content: string; tasks: Task[] }>();
  private loadId = 0;
  private listeners = new Set<(e: BoardEvent) => void>();

  constructor(
    private repo: NoteRepository,
    private notifier: Notifier,
    private clock: Clock,
    private opts: BoardOptions,
  ) {
    this.filter = opts.initialFilter;
  }

  subscribe(fn: (e: BoardEvent) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(e: BoardEvent) {
    this.listeners.forEach((fn) => fn(e));
  }

  dispose(): void {
    this.disposed = true;
    this.loadId++;
    this.listeners.clear();
  }

  // ───────────────────────────────── loading

  /** Re-scan the vault. Safe to call often; stale results are dropped. */
  async refresh(): Promise<void> {
    const id = ++this.loadId;
    let loaded;
    try {
      loaded = await this.repo.loadTaskNotes();
    } catch (e) {
      console.error("[todos-rollup] failed to load notes", e);
      return;
    }
    if (id !== this.loadId) return;

    const seen = new Set<string>();
    this.notes = loaded
      .map((n) => {
        seen.add(n.path);
        // Keyed on the content itself: mtime and length can both stay the same after a sync rewrite.
        const cached = this.parseCache.get(n.path);
        let tasks: Task[];
        if (cached && cached.content === n.content) tasks = cached.tasks;
        else {
          tasks = parseTasks(n.path, n.content);
          this.parseCache.set(n.path, { content: n.content, tasks });
        }
        const note: NoteMeta = { path: n.path, title: n.title, folder: n.folder, mtime: n.mtime };
        return { note, tasks };
      })
      .filter((n) => n.tasks.length > 0)
      .sort((a, b) => b.note.mtime - a.note.mtime);
    for (const p of this.parseCache.keys()) if (!seen.has(p)) this.parseCache.delete(p);

    if (this.opts.showRecentNotes) this.recent = this.repo.loadRecentNotes(this.opts.recentNotesCount);
    this.loaded = true;
    this.emit("loaded");
  }

  // ───────────────────────────────── view state

  setFilter(f: TaskFilter): void {
    if (f === this.filter) return;
    this.filter = f;
    this.opts.onFilterChange?.(f);
    this.emit("view");
  }

  setQuery(q: string): void {
    if (q === this.query) return;
    this.query = q;
    this.emit("view");
  }

  // ───────────────────────────────── queries

  statusOf(t: Task): TaskStatus {
    const p = this.pending.get(taskKey(t));
    return p === undefined ? t.status : p ? "done" : "open";
  }

  isDone(t: Task): boolean {
    return isCompleted(this.statusOf(t));
  }

  private matchesFilter(t: Task): boolean {
    if (this.pending.has(taskKey(t))) return true; // never yank a row mid-interaction
    return passesFilter(this.filter, this.isDone(t));
  }

  openCount(g: NoteTasks): number {
    return g.tasks.filter((t) => !this.isDone(t)).length;
  }

  totals(): Totals {
    let open = 0;
    let done = 0;
    let overdue = 0;
    let today = 0;
    const now = this.clock.now();
    for (const { tasks } of this.notes)
      for (const t of tasks) {
        if (this.isDone(t)) {
          done++;
          continue;
        }
        open++;
        const { due } = parseTaskText(t.text);
        if (due) {
          const s = dueStateOf(daysUntil(due, now));
          if (s === "overdue") overdue++;
          else if (s === "today") today++;
        }
      }
    return { open, done, overdue, today, total: open + done };
  }

  /** Notes with the tasks that pass the current filter and search. */
  visibleGroups(): NoteTasks[] {
    const q = this.query.trim().toLowerCase();
    const out: NoteTasks[] = [];
    for (const g of this.notes) {
      const noteHit = q !== "" && (g.note.title.toLowerCase().includes(q) || g.note.folder.toLowerCase().includes(q));
      const tasks = g.tasks.filter((t) => this.matchesFilter(t) && (q === "" || noteHit || t.text.toLowerCase().includes(q)));
      if (tasks.length) out.push({ note: g.note, tasks });
    }
    return out;
  }

  // ───────────────────────────────── commands

  /**
   * Flip a task. The optimistic state is visible immediately (before the first await), the write happens
   * next, then `settle` runs (the view uses it to animate the row away), and finally the board refreshes.
   */
  async toggle(task: Task, settle?: (done: boolean) => Promise<void>): Promise<void> {
    const key = taskKey(task);
    if (this.pending.has(key)) return;
    const done = !this.isDone(task);
    this.pending.set(key, done);
    this.emit("pending");
    try {
      await this.repo.toggleTask(task, done);
      if (!this.disposed) await settle?.(done);
    } catch (e) {
      this.notifier.notify(e instanceof Error ? e.message : "Couldn't update that todo.");
    } finally {
      this.pending.delete(key);
    }
    if (!this.disposed) await this.refresh();
  }
}
