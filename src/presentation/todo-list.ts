import type { Bucket } from "../domain/calendar.ts";
import { bucketFor } from "../domain/calendar.ts";
import { h, icon } from "./dom.ts";
import type { UiContext } from "./context.ts";
import { BUCKET_LABEL, count } from "./format.ts";
import { createNoteCard } from "./note-card.ts";

/** Draw the filtered notes, bucketed by how recently each was updated. */
export function renderTodoList(listEl: HTMLElement, ctx: UiContext): void {
  const { board } = ctx;
  if (!board.loaded) return;
  const groups = board.visibleGroups();
  if (!groups.length) {
    listEl.replaceChildren(emptyState(ctx));
    return;
  }

  const now = ctx.now();
  const frag = document.createDocumentFragment();
  let bucket: Bucket | null = null;
  let bucketEl: HTMLElement | null = null;
  for (const g of groups) {
    const b = bucketFor(g.note.mtime, now);
    if (b !== bucket) {
      bucket = b;
      bucketEl = h("div", { class: "tr-bucket" }, h("h3", { class: "tr-bucket-label", text: BUCKET_LABEL[b] }));
      frag.append(bucketEl);
    }
    bucketEl!.append(createNoteCard(g, ctx));
  }
  listEl.replaceChildren(frag);
}

function emptyState({ board }: UiContext): HTMLElement {
  const t = board.totals();
  const query = board.query.trim();
  if (query)
    return h(
      "div",
      { class: "tr-empty" },
      h("p", { class: "tr-empty-title", text: `No todos match “${query}”` }),
      h("button", { class: "tr-btn", text: "Clear filter", attrs: { type: "button" }, on: { click: () => board.setQuery("") } }),
    );
  if (t.total === 0)
    return h(
      "div",
      { class: "tr-empty" },
      icon("sparkles", 22, "tr-empty-icon"),
      h("p", { class: "tr-empty-title", text: "No todos yet" }),
      h("p", { class: "tr-empty-body" }, "Write ", h("code", { text: "- [ ] something" }), " in any note and it shows up here."),
    );
  if (board.filter === "open")
    return h(
      "div",
      { class: "tr-empty" },
      icon("sparkles", 22, "tr-empty-icon"),
      h("p", { class: "tr-empty-title", text: "All clear" }),
      h("p", { class: "tr-empty-body", text: `Every todo is done. ${count(t.done, "task", "tasks")} completed.` }),
    );
  return h("div", { class: "tr-empty" }, h("p", { class: "tr-empty-title", text: "Nothing completed yet" }));
}
