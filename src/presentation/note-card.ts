import type { NoteTasks } from "../application/todo-board.ts";
import { h, icon } from "./dom.ts";
import { wantsNewTab, type UiContext } from "./context.ts";
import { count, fullDate, relativeTime } from "./format.ts";
import { createTaskRow } from "./task-row.ts";

export function createNoteCard(g: NoteTasks, ctx: UiContext): HTMLElement {
  const { note } = g;
  const isCollapsed = ctx.collapsed.has(note.path);
  const openCount = ctx.board.openCount(g);

  const card = h("article", { class: "tr-note", attrs: { "data-collapsed": isCollapsed ? "true" : "false" } });

  const toggle = h(
    "button",
    {
      class: "tr-collapse",
      attrs: { type: "button", "aria-expanded": String(!isCollapsed), "aria-label": `${isCollapsed ? "Expand" : "Collapse"} ${note.title}` },
      on: {
        click: () => {
          const c = !ctx.collapsed.has(note.path);
          if (c) ctx.collapsed.add(note.path);
          else ctx.collapsed.delete(note.path);
          card.dataset.collapsed = String(c);
          toggle.setAttribute("aria-expanded", String(!c));
          toggle.setAttribute("aria-label", `${c ? "Expand" : "Collapse"} ${note.title}`);
        },
      },
    },
    icon("chevron", 14),
  );

  const title = h(
    "a",
    {
      class: "tr-note-title",
      attrs: { href: "#", title: note.path, "data-path": note.path },
      on: {
        click: (e) => {
          e.preventDefault();
          ctx.opener.openNote(note.path, undefined, wantsNewTab(e));
        },
      },
    },
    note.title,
  );

  const head = h(
    "div",
    { class: "tr-note-head" },
    toggle,
    h("div", { class: "tr-note-name" }, title, note.folder ? h("span", { class: "tr-note-folder", text: note.folder }) : null),
    h(
      "div",
      { class: "tr-note-side" },
      openCount ? h("span", { class: "tr-pill", text: String(openCount), attrs: { title: count(openCount, "open todo", "open todos") } }) : null,
      h("time", {
        class: "tr-time",
        text: relativeTime(note.mtime, ctx.now()),
        attrs: { datetime: new Date(note.mtime).toISOString(), title: `Updated ${fullDate(note.mtime)}`, "data-mtime": note.mtime },
      }),
    ),
  );

  // Indent relative to what's actually shown, so filtered-out parents don't leave gaps.
  let prevDepth = -1;
  const items = g.tasks.map((t) => {
    const depth = Math.min(t.depth, prevDepth + 1);
    prevDepth = depth;
    return createTaskRow(t, depth, ctx);
  });

  const body = h("div", { class: "tr-note-body" }, h("div", { class: "tr-note-clip" }, h("ul", { class: "tr-tasks" }, ...items)));
  card.append(head, body);
  return card;
}
