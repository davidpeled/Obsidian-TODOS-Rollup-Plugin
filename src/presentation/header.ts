import type { UiContext } from "./context.ts";
import { h } from "./dom.ts";
import { formatHeaderDate, greeting } from "./format.ts";

export interface Header {
  el: HTMLElement;
  renderTitle(): void;
  renderStats(): void;
}

const stat = (n: number, label: string, tone = "") =>
  h("div", { class: `tr-stat ${tone}`.trim() }, h("span", { class: "tr-stat-n", text: String(n) }), h("span", { class: "tr-stat-l", text: label }));

export function createHeader(ctx: UiContext, vaultName: string, showGreeting: boolean): Header {
  const eyebrowEl = h("p", { class: "tr-eyebrow" });
  const titleEl = h("h1", { class: "tr-title" });
  const statsEl = h("div", { class: "tr-stats", attrs: { "aria-live": "polite" } });

  const el = h("header", { class: "tr-section tr-header", style: { "--i": "0" } }, eyebrowEl, showGreeting ? titleEl : null, statsEl);

  return {
    el,
    renderTitle() {
      const now = ctx.now();
      eyebrowEl.textContent = `${formatHeaderDate(now)} · ${vaultName}`;
      titleEl.textContent = greeting(now);
    },
    renderStats() {
      const t = ctx.board.totals();
      const pct = t.total ? Math.round((t.done / t.total) * 100) : 0;
      statsEl.replaceChildren(
        h(
          "div",
          { class: "tr-stat-row" },
          stat(t.open, "open"),
          t.today ? stat(t.today, "due today", "is-today") : null,
          t.overdue ? stat(t.overdue, "overdue", "is-overdue") : null,
          stat(t.done, "done", "is-muted"),
        ),
        h(
          "div",
          {
            class: "tr-progress",
            attrs: { role: "progressbar", "aria-valuenow": pct, "aria-valuemin": 0, "aria-valuemax": 100, "aria-label": "Todos completed" },
          },
          h("div", { class: "tr-progress-bar", style: { transform: `scaleX(${pct / 100})` } }),
        ),
      );
    },
  };
}
