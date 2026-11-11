import { PluginSettingTab, Setting, type App, type Plugin, type SettingDefinitionItem } from "obsidian";
import {
  applySetting,
  isEditableSettingKey,
  parseLines,
  settingToControlValue,
  type TodosRollupSettings,
} from "../../domain/settings.ts";

/** What the settings tab needs from the plugin. */
export interface SettingsHost {
  settings: TodosRollupSettings;
  /** Resolves false (after telling the user) when the settings could not be written. */
  saveSettings: () => Promise<boolean>;
  rerenderViews: () => void;
}

export class TodosRollupSettingTab extends PluginSettingTab {
  // Typed as SettingsHost only: on `Plugin & SettingsHost`, `.settings` would resolve to
  // Plugin.settings, which exists only since Obsidian 1.13.0.
  private readonly host: SettingsHost;

  constructor(app: App, plugin: Plugin & SettingsHost) {
    super(app, plugin);
    this.host = plugin;
  }

  /** Declarative settings (Obsidian 1.13+): makes them show up in settings search. */
  override getSettingDefinitions(): SettingDefinitionItem[] {
    return [
      {
        name: "Open on startup",
        desc: "Open the todo list when the vault opens, on desktop and mobile.",
        control: { type: "toggle", key: "openOnStartup" },
      },
      {
        name: "Open notes in a new tab",
        desc: "Desktop only. On mobile, notes open in place and the back button returns to the todo list.",
        control: { type: "toggle", key: "openNotesInNewTab" },
      },
      { name: "Show greeting", control: { type: "toggle", key: "showGreeting" } },
      { name: "Show recently edited notes", control: { type: "toggle", key: "showRecentNotes" } },
      {
        name: "Recently edited count",
        control: { type: "slider", key: "recentNotesCount", min: 3, max: 12, step: 1 },
      },
      {
        name: "Excluded folders",
        desc: "Todos in these folders (and their subfolders) are ignored. One per line.",
        control: { type: "textarea", key: "excludedFolders", placeholder: "Templates\nArchive", rows: 4 },
      },
      {
        name: "Excluded note names",
        desc: "Notes with these file names are ignored in every folder. Not case-sensitive. One per line.",
        control: { type: "textarea", key: "excludedFileNames", placeholder: "AGENTS.md\nSKILL.md", rows: 3 },
      },
    ];
  }

  override getControlValue(key: string): unknown {
    return isEditableSettingKey(key) ? settingToControlValue(this.host.settings, key) : undefined;
  }

  override async setControlValue(key: string, value: unknown): Promise<void> {
    if (!isEditableSettingKey(key)) return;
    Object.assign(this.host.settings, applySetting(this.host.settings, key, value));
    if (await this.host.saveSettings()) this.host.rerenderViews();
  }

  /** Fallback for Obsidian versions before 1.13. */
  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    const s = this.host.settings;
    const save = () => {
      void this.host.saveSettings().then((ok) => ok && this.host.rerenderViews());
    };

    new Setting(containerEl)
      .setName("Open on startup")
      .setDesc("Open the todo list when the vault opens, on desktop and mobile.")
      .addToggle((t) => t.setValue(s.openOnStartup).onChange((v) => {
        s.openOnStartup = v;
        save();
      }));

    new Setting(containerEl)
      .setName("Open notes in a new tab")
      .setDesc("Desktop only. On mobile, notes open in place and the back button returns to the todo list.")
      .addToggle((t) => t.setValue(s.openNotesInNewTab).onChange((v) => {
        s.openNotesInNewTab = v;
        save();
      }));

    new Setting(containerEl)
      .setName("Show greeting")
      .addToggle((t) => t.setValue(s.showGreeting).onChange((v) => {
        s.showGreeting = v;
        save();
      }));

    new Setting(containerEl)
      .setName("Show recently edited notes")
      .addToggle((t) => t.setValue(s.showRecentNotes).onChange((v) => {
        s.showRecentNotes = v;
        save();
      }));

    new Setting(containerEl)
      .setName("Recently edited count")
      .addSlider((sl) =>
        sl
          .setLimits(3, 12, 1)
          .setValue(s.recentNotesCount)
          .setDynamicTooltip()
          .onChange((v) => {
        s.recentNotesCount = v;
        save();
      }),
      );

    new Setting(containerEl)
      .setName("Excluded folders")
      .setDesc("Todos in these folders (and their subfolders) are ignored. One per line.")
      .addTextArea((ta) => {
        ta.setPlaceholder("Templates\nArchive")
          .setValue(s.excludedFolders.join("\n"))
          .onChange((v) => {
            s.excludedFolders = parseLines(v, true);
            save();
          });
        ta.inputEl.rows = 4;
      });

    new Setting(containerEl)
      .setName("Excluded note names")
      .setDesc("Notes with these file names are ignored in every folder. Not case-sensitive. One per line.")
      .addTextArea((ta) => {
        ta.setPlaceholder("AGENTS.md\nSKILL.md")
          .setValue(s.excludedFileNames.join("\n"))
          .onChange((v) => {
            s.excludedFileNames = parseLines(v, false);
            save();
          });
        ta.inputEl.rows = 3;
      });
  }
}
