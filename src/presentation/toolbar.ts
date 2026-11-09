import type { TaskFilter } from "../domain/task.ts";
import type { UiContext } from "./context.ts";
import { h, icon } from "./dom.ts";

const FILTERS: { id: TaskFilter; label: string }[] = [
  { id: "open", label: "Open" },
  { id: "done", label: "Done" },
  { id: "all", label: "All" },
];

export interface Toolbar {
  el: HTMLElement;
  renderSegments(): void;
  /** Mirror a query that changed elsewhere (a tag click, "clear filter") into the input. */
  syncQuery(): void;
}

export function createToolbar({ board }: UiContext): Toolbar {
  const segEl = h("div", { class: "tr-seg", attrs: { role: "tablist", "aria-label": "Filter todos" } });
  const input = h("input", {
    class: "tr-search-input",
    attrs: {
      type: "search",
      placeholder: "Filter todos, notes, #tags",
      "aria-label": "Filter todos",
      enterkeyhint: "search",
      autocomplete: "off",
      autocorrect: "off",
      autocapitalize: "none",
      spellcheck: "false",
    },
    on: {
      input: () => board.setQuery(input.value),
      keydown: (e) => {
        if (e.key === "Escape" && input.value) {
          e.stopPropagation();
          board.setQuery("");
        }
      },
    },
  });

  return {
    el: h("div", { class: "tr-toolbar" }, segEl, h("label", { class: "tr-search" }, icon("search", 15), input)),
    syncQuery() {
      if (input.value !== board.query) input.value = board.query;
    },
    renderSegments() {
      const t = board.loaded ? board.totals() : null;
      const n: Record<TaskFilter, number | null> = t ? { open: t.open, done: t.done, all: t.total } : { open: null, done: null, all: null };
      segEl.style.setProperty("--seg-index", String(FILTERS.findIndex((f) => f.id === board.filter)));
      segEl.style.setProperty("--seg-count", String(FILTERS.length));
      segEl.replaceChildren(
        h("span", { class: "tr-seg-indicator", attrs: { "aria-hidden": "true" } }),
        ...FILTERS.map((f) =>
          h(
            "button",
            {
              class: "tr-seg-btn",
              attrs: { role: "tab", "aria-selected": String(f.id === board.filter), type: "button" },
              on: { click: () => board.setFilter(f.id) },
            },
            f.label,
            n[f.id] !== null ? h("span", { class: "tr-seg-count", text: String(n[f.id]) }) : null,
          ),
        ),
      );
    },
  };
}
