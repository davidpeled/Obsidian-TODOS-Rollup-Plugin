import type { App, CachedMetadata, TFile as TFileType } from "obsidian";
import { TFile } from "obsidian";
import type { NoteMeta, NoteWithContent } from "../../domain/note.ts";
import type { NoteRepository } from "../../domain/ports.ts";
import { isExcluded, type TodosRollupSettings } from "../../domain/settings.ts";
import type { Task } from "../../domain/task.ts";
import { toggleTaskInContent } from "../../domain/task-toggle.ts";

/** NoteRepository over the Obsidian vault. */
export class VaultNoteRepository implements NoteRepository {
  /** Paths that had tasks at the last scan; lets us ignore edits to notes that never mattered. */
  private taskPaths = new Set<string>();

  constructor(
    private app: App,
    private settings: () => TodosRollupSettings,
  ) {}

  get vaultName() {
    return this.app.vault.getName();
  }

  /**
   * Whether a changed note could alter the todo list: it has tasks now, or had them at the last scan.
   * Without this, every save anywhere in the vault would trigger a full rescan.
   * Scaling limit: a relevant change still rescans every note with tasks (reads are cached, parses are memoised).
   */
  affectsTasks(file: TFileType, cache: CachedMetadata | null): boolean {
    if (file.extension !== "md" || isExcluded(file.path, this.settings())) return false;
    return this.taskPaths.has(file.path) || !!cache?.listItems?.some((li) => li.task !== undefined);
  }

  async loadTaskNotes(): Promise<NoteWithContent[]> {
    const files = this.app.vault.getMarkdownFiles().filter((f) => !isExcluded(f.path, this.settings()) && this.hasTasks(f));
    this.taskPaths = new Set(files.map((f) => f.path));
    return Promise.all(files.map(async (f) => ({ ...this.meta(f), content: await this.app.vault.cachedRead(f) })));
  }

  loadRecentNotes(limit: number): NoteMeta[] {
    return this.app.vault
      .getMarkdownFiles()
      .filter((f) => !isExcluded(f.path, this.settings()))
      .sort((a, b) => b.stat.mtime - a.stat.mtime)
      .slice(0, limit)
      .map((f) => this.meta(f));
  }

  async toggleTask(task: Task, done: boolean): Promise<void> {
    const file = this.app.vault.getAbstractFileByPath(task.path);
    if (!(file instanceof TFile)) throw new Error(`Couldn't find ${task.path}`);
    await this.app.vault.process(file, (data) => toggleTaskInContent(data, task, done));
  }

  private meta(f: TFileType): NoteMeta {
    return {
      path: f.path,
      title: f.basename,
      folder: f.parent && f.parent.path !== "/" ? f.parent.path : "",
      mtime: f.stat.mtime,
    };
  }

  /** Use Obsidian's metadata index to skip notes without tasks, so we only read what we need. */
  private hasTasks(f: TFileType): boolean {
    const cache = this.app.metadataCache.getFileCache(f);
    if (!cache) return true; // not indexed yet; read it to be safe
    return !!cache.listItems?.some((li) => li.task !== undefined);
  }
}
