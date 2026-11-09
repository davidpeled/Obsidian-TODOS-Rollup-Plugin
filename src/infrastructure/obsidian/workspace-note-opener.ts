import { Notice, Platform, TFile, type App, type WorkspaceLeaf } from "obsidian";
import type { NoteOpener, Notifier } from "../../domain/ports.ts";
import type { TodosRollupSettings } from "../../domain/settings.ts";

export class NoticeNotifier implements Notifier {
  notify(message: string): void {
    const notice = new Notice(message);
    void notice;
  }
}

/** NoteOpener over the Obsidian workspace. */
export class WorkspaceNoteOpener implements NoteOpener {
  constructor(
    private app: App,
    private settings: () => TodosRollupSettings,
    private notifier: Notifier,
  ) {}

  openNote(path: string, line?: number, newTab?: boolean): void {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) {
      this.notifier.notify(`Couldn't find ${path}`);
      return;
    }
    void this.leafFor(newTab).openFile(file, {
      active: true,
      eState: line !== undefined ? { line } : undefined,
    });
  }

  openLink(linktext: string, sourcePath: string, newTab?: boolean): void {
    void this.app.workspace.openLinkText(linktext, sourcePath, this.shouldOpenInTab(newTab) ? "tab" : false);
  }

  /** Mobile: navigate in place (back button returns to the todo list). Desktop: keep the todo list open. */
  private shouldOpenInTab(newTab?: boolean): boolean {
    return !!newTab || (!Platform.isMobile && this.settings().openNotesInNewTab);
  }

  private leafFor(newTab?: boolean): WorkspaceLeaf {
    return this.app.workspace.getLeaf(this.shouldOpenInTab(newTab) ? "tab" : false);
  }
}
