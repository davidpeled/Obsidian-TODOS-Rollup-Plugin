import type { NoteMeta, NoteWithContent } from "./note.ts";
import type { Task } from "./task.ts";

/** Where notes live. Implemented by the Obsidian vault and by the demo's in-memory vault. */
export interface NoteRepository {
  /** Notes that contain at least one task, with their contents. */
  loadTaskNotes(): Promise<NoteWithContent[]>;
  /** Most recently modified notes. */
  loadRecentNotes(limit: number): NoteMeta[];
  /** Flip a task checkbox in its note. Must throw if the line no longer matches. */
  toggleTask(task: Task, done: boolean): Promise<void>;
}

/** Navigation out of the todoPage. */
export interface NoteOpener {
  openNote(path: string, line?: number, newTab?: boolean): void;
  openLink(linktext: string, sourcePath: string, newTab?: boolean): void;
}

export interface Notifier {
  notify(message: string): void;
}

export interface Clock {
  now(): number;
}
