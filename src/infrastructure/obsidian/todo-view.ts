import { ItemView, debounce, type WorkspaceLeaf } from "obsidian";
import { TodoBoard } from "../../application/todo-board.ts";
import type { TodosRollupSettings } from "../../domain/settings.ts";
import { TodoPage } from "../../presentation/todo-page.ts";
import { VaultNoteRepository } from "./vault-note-repository.ts";
import { NoticeNotifier, WorkspaceNoteOpener } from "./workspace-note-opener.ts";

export const VIEW_TYPE_TODOS = "todos-rollup-view";

/** What the view needs from the plugin. */
export interface TodoViewHost {
  settings: TodosRollupSettings;
  saveSettings(): Promise<void>;
}

/** Composition root for one todo list: wires Obsidian adapters into the application and UI. */
export class TodoView extends ItemView {
  navigation = true;
  private todoPage?: TodoPage;
  private repo: VaultNoteRepository;
  private notifier = new NoticeNotifier();

  constructor(leaf: WorkspaceLeaf, private host: TodoViewHost) {
    super(leaf);
    this.repo = new VaultNoteRepository(this.app, () => host.settings);
  }

  getViewType() {
    return VIEW_TYPE_TODOS;
  }
  getDisplayText() {
    return "Todo";
  }
  getIcon() {
    return "list-checks";
  }

  async onOpen() {
    this.contentEl.addClass("tr-view");

    const refresh = debounce(() => void this.todoPage?.refresh(), 300, true);
    this.registerEvent(
      this.app.metadataCache.on("changed", (file, _data, cache) => {
        if (this.repo.affectsTasks(file, cache)) refresh();
      }),
    );
    this.registerEvent(this.app.metadataCache.on("resolved", refresh));
    this.registerEvent(this.app.vault.on("delete", refresh));
    this.registerEvent(this.app.vault.on("rename", refresh));
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", (leaf) => {
        if (leaf === this.leaf) refresh();
      }),
    );

    await this.render();
  }

  async render() {
    this.todoPage?.destroy();
    const s = this.host.settings;
    const board = new TodoBoard(this.repo, this.notifier, { now: () => Date.now() }, {
      showRecentNotes: s.showRecentNotes,
      recentNotesCount: s.recentNotesCount,
      initialFilter: s.lastFilter,
      onFilterChange: (f) => {
        s.lastFilter = f;
        void this.host.saveSettings();
      },
    });
    this.todoPage = new TodoPage(this.contentEl, {
      board,
      opener: new WorkspaceNoteOpener(this.app, () => this.host.settings, this.notifier),
      clock: { now: () => Date.now() },
      vaultName: this.repo.vaultName,
      showGreeting: s.showGreeting,
      showRecentNotes: s.showRecentNotes,
    });
    await this.todoPage.mount();
  }

  async onClose() {
    this.todoPage?.destroy();
    this.todoPage = undefined;
  }
}
