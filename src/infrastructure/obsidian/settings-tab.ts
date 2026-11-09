import { PluginSettingTab, Setting, type App, type Plugin } from "obsidian";
import type { TodosRollupSettings } from "../../domain/settings.ts";

/** What the settings tab needs from the plugin. */
export interface SettingsHost {
  settings: TodosRollupSettings;
  saveSettings(): Promise<void>;
  rerenderViews(): void;
}

export class TodosRollupSettingTab extends PluginSettingTab {
  constructor(app: App, private plugin: Plugin & SettingsHost) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    const s = this.plugin.settings;
    const save = async () => {
      await this.plugin.saveSettings();
      this.plugin.rerenderViews();
    };

    new Setting(containerEl)
      .setName("Open on startup")
      .setDesc("Open the todo list when the vault opens, on desktop and mobile.")
      .addToggle((t) => t.setValue(s.openOnStartup).onChange(async (v) => ((s.openOnStartup = v), save())));

    new Setting(containerEl)
      .setName("Open notes in a new tab")
      .setDesc("Desktop only. On mobile, notes open in place and the back button returns to the todo list.")
      .addToggle((t) => t.setValue(s.openNotesInNewTab).onChange(async (v) => ((s.openNotesInNewTab = v), save())));

    new Setting(containerEl)
      .setName("Show greeting")
      .addToggle((t) => t.setValue(s.showGreeting).onChange(async (v) => ((s.showGreeting = v), save())));

    new Setting(containerEl)
      .setName("Show recently edited notes")
      .addToggle((t) => t.setValue(s.showRecentNotes).onChange(async (v) => ((s.showRecentNotes = v), save())));

    new Setting(containerEl)
      .setName("Recently edited count")
      .addSlider((sl) =>
        sl
          .setLimits(3, 12, 1)
          .setValue(s.recentNotesCount)
          .setDynamicTooltip()
          .onChange(async (v) => ((s.recentNotesCount = v), save())),
      );

    new Setting(containerEl)
      .setName("Excluded folders")
      .setDesc("Todos in these folders (and their subfolders) are ignored. One per line.")
      .addTextArea((ta) => {
        ta.setPlaceholder("Templates\nArchive")
          .setValue(s.excludedFolders.join("\n"))
          .onChange(async (v) => {
            s.excludedFolders = v
              .split("\n")
              .map((x) => x.trim().replace(/^\/+|\/+$/g, ""))
              .filter(Boolean);
            await save();
          });
        ta.inputEl.rows = 4;
      });

    new Setting(containerEl)
      .setName("Excluded note names")
      .setDesc("Notes with these file names are ignored in every folder. Not case-sensitive. One per line.")
      .addTextArea((ta) => {
        ta.setPlaceholder("AGENTS.md\nSKILL.md")
          .setValue(s.excludedFileNames.join("\n"))
          .onChange(async (v) => {
            s.excludedFileNames = v
              .split("\n")
              .map((x) => x.trim())
              .filter(Boolean);
            await save();
          });
        ta.inputEl.rows = 3;
      });
  }
}
