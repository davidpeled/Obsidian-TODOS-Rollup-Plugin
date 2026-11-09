import type { TodoBoard } from "../application/todo-board.ts";
import type { NoteOpener } from "../domain/ports.ts";

/** What every component needs; passed down instead of reaching for globals. */
export interface UiContext {
  board: TodoBoard;
  opener: NoteOpener;
  now(): number;
  /** Notes whose card the user folded. UI-only state, so it lives here and not in the board. */
  collapsed: Set<string>;
}

/** Cmd/Ctrl-click opens in a new tab. */
export const wantsNewTab = (e: MouseEvent) => e.metaKey || e.ctrlKey;
