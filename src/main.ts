import { Plugin, type WorkspaceLeaf } from "obsidian";
import { DEFAULT_SETTINGS, sanitizeSettings, type TodosRollupSettings } from "./domain/settings.ts";
import { TodoView, VIEW_TYPE_TODOS } from "./infrastructure/obsidian/todo-view.ts";
import { TodosRollupSettingTab } from "./infrastructure/obsidian/settings-tab.ts";

export default class TodosRollupPlugin extends Plugin {
  settings: TodosRollupSettings = { ...DEFAULT_SETTINGS };

  async onload() {
    await this.loadSettings();

    this.registerView(VIEW_TYPE_TODOS, (leaf) => new TodoView(leaf, this));
    this.addRibbonIcon("list-checks", "Open todos", () => void this.openTodos());
    this.addCommand({
      id: "open-todos",
      name: "Open todos",
      callback: () => void this.openTodos(),
    });
    this.addSettingTab(new TodosRollupSettingTab(this.app, this));

    this.app.workspace.onLayoutReady(() => {
      if (this.settings.openOnStartup) void this.openTodos();
    });
  }

  async openTodos() {
    const { workspace } = this.app;

    const existing = workspace.getLeavesOfType(VIEW_TYPE_TODOS)[0];
    if (existing) {
      workspace.setActiveLeaf(existing, { focus: true });
      return;
    }

    // Reuse an empty tab if that's what's in front of us, otherwise open a new one.
    const recent = workspace.getMostRecentLeaf();
    const leaf: WorkspaceLeaf = recent && recent.view.getViewType() === "empty" ? recent : workspace.getLeaf("tab");
    await leaf.setViewState({ type: VIEW_TYPE_TODOS, active: true });
    workspace.setActiveLeaf(leaf, { focus: true });
  }

  rerenderViews() {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_TODOS)) {
      if (leaf.view instanceof TodoView) void leaf.view.render();
    }
  }

  async loadSettings() {
    this.settings = sanitizeSettings(await this.loadData());
  }

  async saveSettings() {
    try {
      await this.saveData(this.settings);
    } catch (e) {
      console.error("[todos-rollup] failed to save settings", e);
    }
  }
}
