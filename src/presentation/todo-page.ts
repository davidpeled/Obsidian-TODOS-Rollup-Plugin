import type { TodoBoard } from "../application/todo-board.ts";
import type { Clock, NoteOpener } from "../domain/ports.ts";
import type { UiContext } from "./context.ts";
import { h } from "./dom.ts";
import { createHeader } from "./header.ts";
import { createRecentNotes } from "./recent-notes.ts";
import { relativeTime } from "./format.ts";
import { renderTodoList } from "./todo-list.ts";
import { createToolbar } from "./toolbar.ts";

export interface TodoPageDeps {
  board: TodoBoard;
  opener: NoteOpener;
  clock: Clock;
  vaultName: string;
  showGreeting: boolean;
  showRecentNotes: boolean;
}

/**
 * Lays out the page and wires the board's events to the components.
 * Framework-free DOM, so the same code runs inside Obsidian and in the browser demo.
 */
export class TodoPage {
  private root = h("div", { class: "tr-root" });
  private ctx: UiContext;
  private timer: number | undefined;
  private destroyed = false;

  constructor(
    private container: HTMLElement,
    private deps: TodoPageDeps,
  ) {
    this.ctx = { board: deps.board, opener: deps.opener, now: () => deps.clock.now(), collapsed: new Set() };
  }

  async mount(): Promise<void> {
    const { ctx, deps } = this;
    const header = createHeader(ctx, deps.vaultName, deps.showGreeting);
    const toolbar = createToolbar(ctx);
    const listEl = h("div", { class: "tr-list" });
    const recent = deps.showRecentNotes ? createRecentNotes(ctx) : null;

    const todos = h(
      "section",
      { class: "tr-section tr-todos", style: { "--i": "1" }, attrs: { "aria-label": "Todos" } },
      h(
        "div",
        { class: "tr-section-head" },
        h("h2", { class: "tr-h2", text: "Todos" }),
        h("span", { class: "tr-h2-hint", text: "Grouped by note · last updated first" }),
      ),
      toolbar.el,
      listEl,
    );

    this.container.textContent = "";
    this.root.append(h("div", { class: "tr-page" }, header.el, todos, recent?.el));
    this.container.append(this.root);

    deps.board.subscribe((event) => {
      if (event === "loaded") {
        header.renderTitle();
        header.renderStats();
        toolbar.renderSegments();
        renderTodoList(listEl, ctx);
        recent?.render();
      } else if (event === "pending") {
        header.renderStats();
        toolbar.renderSegments();
      } else {
        toolbar.syncQuery();
        toolbar.renderSegments();
        renderTodoList(listEl, ctx);
      }
    });

    toolbar.renderSegments();
    await deps.board.refresh();
    // destroy() may have run while the first scan was in flight; don't start timers for a dead view.
    if (this.destroyed) return;

    // Entrance: once per open, short and subtle.
    window.requestAnimationFrame(() => this.root.classList.add("is-ready"));

    // Keep "5m ago" labels honest.
    this.timer = window.setInterval(() => this.tick(header.renderTitle), 60_000);
  }

  /** Re-scan the vault. Safe to call often; stale results are dropped. */
  refresh(): Promise<void> {
    return this.deps.board.refresh();
  }

  destroy(): void {
    this.destroyed = true;
    window.clearInterval(this.timer);
    this.deps.board.dispose();
    this.root.remove();
  }

  private tick(renderTitle: () => void) {
    const now = this.ctx.now();
    this.root.querySelectorAll<HTMLElement>("[data-mtime]").forEach((el) => {
      el.textContent = relativeTime(Number(el.dataset.mtime), now);
    });
    renderTitle();
  }
}
