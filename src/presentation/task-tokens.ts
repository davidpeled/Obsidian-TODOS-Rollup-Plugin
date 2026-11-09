import type { Token } from "../domain/task-text.ts";
import { h } from "./dom.ts";
import { wantsNewTab, type UiContext } from "./context.ts";

/** Render the inline pieces of a task (bold, tags, links...) as DOM nodes. */
export function renderTokens(tokens: Token[], sourcePath: string, ctx: UiContext): Node[] {
  return tokens.map((k) => {
    switch (k.kind) {
      case "text":
        return document.createTextNode(k.value);
      case "bold":
        return h("strong", { text: k.value });
      case "italic":
        return h("em", { text: k.value });
      case "code":
        return h("code", { text: k.value });
      case "highlight":
        return h("mark", { text: k.value });
      case "tag":
        return h("button", {
          class: "tr-tag",
          text: `#${k.value}`,
          attrs: { type: "button", title: `Filter by #${k.value}` },
          on: { click: (e) => (e.stopPropagation(), ctx.board.setQuery(`#${k.value}`)) },
        });
      case "wikilink":
        return h("a", {
          class: "tr-link internal-link",
          text: k.label,
          attrs: { href: "#", "data-href": k.target },
          on: {
            click: (e) => {
              e.preventDefault();
              e.stopPropagation();
              ctx.opener.openLink(k.target, sourcePath, wantsNewTab(e));
            },
          },
        });
      case "link":
        return h("a", {
          class: "tr-link external-link",
          text: k.label,
          attrs: { href: k.href, target: "_blank", rel: "noopener" },
          on: { click: (e) => e.stopPropagation() },
        });
    }
  });
}
