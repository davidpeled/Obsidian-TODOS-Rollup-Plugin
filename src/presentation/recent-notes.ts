import type { UiContext } from "./context.ts";
import { wantsNewTab } from "./context.ts";
import { h, icon } from "./dom.ts";
import { fullDate, relativeTime } from "./format.ts";

export interface RecentNotes {
  el: HTMLElement;
  render(): void;
}

export function createRecentNotes(ctx: UiContext): RecentNotes {
  const listEl = h("div", { class: "tr-recent" });
  const el = h(
    "section",
    { class: "tr-section tr-recent-section", style: { "--i": "2" }, attrs: { "aria-label": "Recently edited" } },
    h("div", { class: "tr-section-head" }, h("h2", { class: "tr-h2", text: "Recently edited" })),
    listEl,
  );

  return {
    el,
    render() {
      const now = ctx.now();
      el.hidden = ctx.board.recent.length === 0;
      listEl.replaceChildren(
        ...ctx.board.recent.map((n) =>
          h(
            "a",
            {
              class: "tr-recent-card",
              attrs: { href: "#", title: n.path, "data-path": n.path },
              on: {
                click: (e) => {
                  e.preventDefault();
                  ctx.opener.openNote(n.path, undefined, wantsNewTab(e));
                },
              },
            },
            icon("file", 15, "tr-recent-icon"),
            h(
              "span",
              { class: "tr-recent-text" },
              h("span", { class: "tr-recent-title", text: n.title }),
              h(
                "span",
                { class: "tr-recent-meta" },
                n.folder ? `${n.folder} · ` : "",
                h("time", { class: "tr-time", text: relativeTime(n.mtime, now), attrs: { "data-mtime": n.mtime, title: `Updated ${fullDate(n.mtime)}` } }),
              ),
            ),
          ),
        ),
      );
    },
  };
}
