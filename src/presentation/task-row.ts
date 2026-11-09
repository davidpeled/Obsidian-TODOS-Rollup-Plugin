import type { Task } from "../domain/task.ts";
import { parseTaskText } from "../domain/task-text.ts";
import { h, icon, prefersReducedMotion, wait } from "./dom.ts";
import { wantsNewTab, type UiContext } from "./context.ts";
import { describeDue } from "./format.ts";
import { renderTokens } from "./task-tokens.ts";

export function createTaskRow(t: Task, depth: number, ctx: UiContext): HTMLElement {
  const { board } = ctx;
  const done = board.isDone(t);
  const parsed = parseTaskText(t.text);
  const plain = parsed.tokens.map((k) => ("value" in k ? k.value : k.label)).join("");

  const li = h("li", {
    class: "tr-task",
    attrs: { "data-status": board.statusOf(t), "data-priority": parsed.priority },
    style: { "--depth": String(depth) },
  });

  const check = h(
    "button",
    {
      class: "tr-check",
      attrs: { type: "button", role: "checkbox", "aria-checked": String(done), "aria-label": plain || "Todo" },
      on: { click: () => toggle(t, li, check, ctx) },
    },
    icon("check", 12, "tr-check-icon"),
  );

  const meta = h("span", { class: "tr-task-meta" });
  if (parsed.due) {
    const d = describeDue(parsed.due, ctx.now());
    meta.append(h("span", { class: "tr-due", attrs: { "data-state": done ? "done" : d.state, title: d.title } }, icon("calendar", 12), d.label));
  }

  const text = h(
    "span",
    {
      class: "tr-task-text",
      attrs: { title: "Open in note" },
      on: {
        click: (e) => {
          if ((e.target as HTMLElement).closest("a, .tr-tag")) return;
          ctx.opener.openNote(t.path, t.line, wantsNewTab(e));
        },
      },
    },
    ...renderTokens(parsed.tokens, t.path, ctx),
  );

  li.append(h("div", { class: "tr-task-inner" }, check, h("div", { class: "tr-task-main" }, text, meta.childElementCount ? meta : null)));
  return li;
}

function toggle(t: Task, li: HTMLElement, check: HTMLElement, ctx: UiContext) {
  const { board } = ctx;
  const willBeDone = !board.isDone(t);
  const leaves = (board.filter === "open" && willBeDone) || (board.filter === "done" && !willBeDone);

  const settled = board.toggle(t, async () => {
    if (!leaves || prefersReducedMotion()) return;
    // Let the check register before the row collapses away.
    await wait(600);
    li.classList.add("is-leaving");
    await wait(220);
  });

  // Instant feedback: the board already holds the optimistic state.
  li.dataset.status = board.statusOf(t);
  check.setAttribute("aria-checked", String(board.isDone(t)));
  return settled;
}
