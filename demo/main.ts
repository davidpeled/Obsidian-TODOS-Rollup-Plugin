import "../styles.css";
import "./demo.css";
import { TodoBoard } from "../src/application/todo-board.ts";
import type { TaskFilter } from "../src/domain/task.ts";
import { h, icon } from "../src/presentation/dom.ts";
import { TodoPage } from "../src/presentation/todo-page.ts";
import { InMemoryNoteRepository } from "./in-memory-note-repository.ts";
import { DemoVault, noteMeta } from "./vault.ts";

type Device = "desktop" | "mobile";
type Theme = "dark" | "light";
type Tab = { kind: "todos" } | { kind: "note"; path: string; line?: number };

const vault = new DemoVault();

const store = {
  get<T extends string>(k: string, fallback: T, ok: readonly T[]): T {
    try {
      const v = localStorage.getItem(`tr-demo:${k}`) as T | null;
      return v !== null && ok.includes(v) ? v : fallback;
    } catch {
      return fallback;
    }
  },
  set(k: string, v: string) {
    try {
      localStorage.setItem(`tr-demo:${k}`, v);
    } catch {
      /* private mode */
    }
  },
};

// ?device=mobile&theme=light override the remembered choice
const params = new URLSearchParams(location.search);
const pick = <T extends string>(v: string | null, ok: T[]) => (ok.includes(v as T) ? (v as T) : null);

const state = {
  device:
    pick<Device>(params.get("device"), ["desktop", "mobile"]) ??
    store.get<Device>("device", window.innerWidth < 760 ? "mobile" : "desktop", ["desktop", "mobile"]),
  theme:
    pick<Theme>(params.get("theme"), ["light", "dark"]) ??
    store.get<Theme>("theme", matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark", ["light", "dark"]),
  filter: store.get<TaskFilter>("filter", "open", ["open", "done", "all"]),
  // TodoPage settings the real plugin exposes, so the demo can exercise each combination
  showGreeting: store.get<"on" | "off">("greeting", "on", ["on", "off"]) === "on",
  showRecent: store.get<"on" | "off">("recent", "on", ["on", "off"]) === "on",
  // desktop: tabs; mobile: navigation stack
  tabs: [{ kind: "todos" }] as Tab[],
  active: 0,
  stack: [{ kind: "todos" }] as Tab[],
};

let todoPage: TodoPage | null = null;
let todosEl: HTMLElement | null = null;
const app = document.getElementById("app")!;

// ─────────────────────────────── host: the fake Obsidian

const repository = new InMemoryNoteRepository(vault);
const notifier = { notify: (m: string) => toast(m) };
const clock = { now: () => Date.now() };
const opener = {
  openNote: (path: string, line?: number, newTab?: boolean) => openNote(path, line, newTab),
  openLink(link: string, _source: string, newTab?: boolean) {
    const path = vault.resolve(link);
    if (path) openNote(path, undefined, newTab);
    else toast(`\u201c${link}\u201d doesn't exist yet`);
  },
};

let refreshTimer: number | undefined;
vault.onChange(() => {
  window.clearTimeout(refreshTimer);
  refreshTimer = window.setTimeout(() => void todoPage?.refresh(), 250);
  renderExplorer();
});

// ─────────────────────────────── navigation

function openNote(path: string, line?: number, _newTab?: boolean) {
  const tab: Tab = { kind: "note", path, line };
  if (state.device === "mobile") {
    state.stack.push(tab);
  } else {
    const i = state.tabs.findIndex((t) => t.kind === "note" && t.path === path);
    if (i >= 0) {
      state.tabs[i] = tab;
      state.active = i;
    } else {
      state.tabs.push(tab);
      state.active = state.tabs.length - 1;
    }
  }
  renderWorkspace();
}

function tabTitle(path: string): string {
  const n = vault.get(path);
  return n ? noteMeta(n).title : (path.split("/").pop() ?? path).replace(/\.md$/, "");
}

function currentTab(): Tab {
  return state.device === "mobile" ? state.stack[state.stack.length - 1] : state.tabs[state.active];
}

function goToTodos() {
  if (state.device === "mobile") state.stack = [{ kind: "todos" }];
  else state.active = 0;
  renderWorkspace();
}

// ─────────────────────────────── chrome

let workspaceEl: HTMLElement;
let explorerEl: HTMLElement | null = null;
let tabsEl: HTMLElement | null = null;
let headerTitleEl: HTMLElement | null = null;
let backBtn: HTMLButtonElement | null = null;

function segmented<T extends string>(label: string, value: T, options: { id: T; label: string }[], onChange: (v: T) => void) {
  const el = h("div", { class: "demo-seg", attrs: { role: "radiogroup", "aria-label": label } });
  const idx = options.findIndex((o) => o.id === value);
  el.style.setProperty("--i", String(idx));
  el.style.setProperty("--n", String(options.length));
  el.append(
    h("span", { class: "demo-seg-ind", attrs: { "aria-hidden": "true" } }),
    ...options.map((o) =>
      h("button", {
        class: "demo-seg-btn",
        text: o.label,
        attrs: { type: "button", role: "radio", "aria-checked": String(o.id === value) },
        on: {
          click: (e) => {
            if ((e.currentTarget as HTMLElement).getAttribute("aria-checked") === "true") return;
            el.style.setProperty("--i", String(options.indexOf(o)));
            el.querySelectorAll("[role=radio]").forEach((b) => b.setAttribute("aria-checked", String(b === e.currentTarget)));
            onChange(o.id);
          },
        },
      }),
    ),
  );
  return el;
}

function renderBar() {
  return h(
    "header",
    { class: "demo-bar" },
    h(
      "div",
      { class: "demo-brand" },
      h("span", { class: "demo-logo" }, icon("checks", 14)),
      h("strong", { text: "TODOs rollup" }),
      h("span", { class: "demo-sub", text: "Live demo · runs the plugin\u2019s shared core" }),
    ),
    h(
      "div",
      { class: "demo-controls" },
      segmented<Device>("Device", state.device, [
        { id: "desktop", label: "Desktop" },
        { id: "mobile", label: "Mobile" },
      ], (d) => {
        state.device = d;
        store.set("device", d);
        render();
      }),
      segmented<Theme>("Theme", state.theme, [
        { id: "light", label: "Light" },
        { id: "dark", label: "Dark" },
      ], (t) => {
        state.theme = t;
        store.set("theme", t);
        applyTheme();
      }),
      segmented<"on" | "off">("Greeting", state.showGreeting ? "on" : "off", [
        { id: "on", label: "Greeting" },
        { id: "off", label: "No greeting" },
      ], (v) => {
        state.showGreeting = v === "on";
        store.set("greeting", v);
        render();
      }),
      segmented<"on" | "off">("Recent notes", state.showRecent ? "on" : "off", [
        { id: "on", label: "Recent" },
        { id: "off", label: "No recent" },
      ], (v) => {
        state.showRecent = v === "on";
        store.set("recent", v);
        render();
      }),
      h(
        "button",
        {
          class: "demo-btn",
          attrs: { type: "button", title: "Restore the sample notes" },
          on: {
            click: () => {
              vault.reset();
              state.tabs = [{ kind: "todos" }];
              state.active = 0;
              state.stack = [{ kind: "todos" }];
              renderWorkspace();
              toast("Sample vault restored");
            },
          },
        },
        icon("refresh", 14),
        "Reset",
      ),
    ),
  );
}

function renderExplorer() {
  if (!explorerEl) return;
  const active = currentTab();
  const byFolder = new Map<string, ReturnType<typeof noteMeta>[]>();
  for (const n of vault.all().map(noteMeta)) {
    const list = byFolder.get(n.folder) ?? [];
    list.push(n);
    byFolder.set(n.folder, list);
  }
  const folders = [...byFolder.keys()].filter(Boolean).sort();
  const file = (n: ReturnType<typeof noteMeta>, nested: boolean) =>
    h(
      "button",
      {
        class: `nav-file${nested ? " is-nested" : ""}${active.kind === "note" && active.path === n.path ? " is-active" : ""}`,
        attrs: { type: "button", title: n.path },
        on: { click: () => openNote(n.path) },
      },
      n.title,
    );

  explorerEl.replaceChildren(
    h("div", { class: "nav-header", text: "My Vault" }),
    ...folders.map((f) =>
      h(
        "div",
        { class: "nav-folder" },
        h("div", { class: "nav-folder-title" }, icon("chevron", 12, "nav-chevron"), f),
        ...[...byFolder.get(f)!].sort((a, b) => a.title.localeCompare(b.title)).map((n) => file(n, true)),
      ),
    ),
    ...[...(byFolder.get("") ?? [])].sort((a, b) => a.title.localeCompare(b.title)).map((n) => file(n, false)),
  );
}

function renderTabs() {
  if (!tabsEl) return;
  tabsEl.replaceChildren(
    ...state.tabs.map((t, i) => {
      const title = t.kind === "todos" ? "Todo" : tabTitle(t.path);
      const tab = h(
        "div",
        {
          class: `ws-tab${i === state.active ? " is-active" : ""}`,
          attrs: { role: "tab", "aria-selected": String(i === state.active) },
          on: {
            click: () => {
              state.active = i;
              renderWorkspace();
            },
          },
        },
        t.kind === "todos" ? icon("checks", 13) : icon("file", 13),
        h("span", { class: "ws-tab-title", text: title }),
      );
      if (t.kind !== "todos")
        tab.append(
          h(
            "button",
            {
              class: "ws-tab-close",
              attrs: { type: "button", "aria-label": `Close ${title}` },
              on: {
                click: (e) => {
                  e.stopPropagation();
                  state.tabs.splice(i, 1);
                  if (state.active >= i) state.active = Math.max(0, state.active - 1);
                  renderWorkspace();
                },
              },
            },
            icon("x", 12),
          ),
        );
      return tab;
    }),
  );
}

function noteView(tab: Extract<Tab, { kind: "note" }>): HTMLElement {
  const n = vault.get(tab.path);
  if (!n) return h("div", { class: "note-view" }, h("p", { text: "This note no longer exists." }));
  const meta = noteMeta(n);
  const editor = h("textarea", {
    class: "note-editor",
    attrs: { spellcheck: "false", "aria-label": `Edit ${meta.title}` },
    on: { input: () => vault.update(tab.path, editor.value) },
  });
  editor.value = n.content;

  requestAnimationFrame(() => {
    if (tab.line === undefined) return;
    const lines = n.content.split("\n");
    const start = lines.slice(0, tab.line).reduce((s, l) => s + l.length + 1, 0);
    const end = start + (lines[tab.line]?.length ?? 0);
    const lh = parseFloat(getComputedStyle(editor).lineHeight) || 24;
    editor.scrollTop = Math.max(0, (tab.line - 4) * lh);
    if (state.device === "desktop") editor.focus({ preventScroll: true });
    editor.setSelectionRange(start, end);
  });

  return h(
    "div",
    { class: "note-view" },
    h(
      "div",
      { class: "note-crumbs" },
      meta.folder ? h("span", { class: "note-crumb", text: meta.folder.replace(/\//g, " / ") }) : null,
      meta.folder ? h("span", { class: "note-crumb-sep", text: "/" }) : null,
      h("span", { class: "note-crumb is-current", text: meta.title }),
    ),
    h("div", { class: "note-hint", text: "Edit this note — the todo list updates live." }),
    editor,
  );
}

function renderWorkspace() {
  const tab = currentTab();
  workspaceEl.replaceChildren(tab.kind === "todos" ? todosEl! : noteView(tab));
  workspaceEl.scrollTop = 0;
  renderTabs();
  renderExplorer();
  if (headerTitleEl) headerTitleEl.textContent = tab.kind === "todos" ? "Todo" : tabTitle(tab.path);
  if (backBtn) backBtn.disabled = state.stack.length <= 1;
}

function ribbon() {
  return h(
    "div",
    { class: "ribbon" },
    h("button", { class: "ribbon-btn is-active", attrs: { type: "button", title: "Open todos", "aria-label": "Open todos" }, on: { click: goToTodos } }, icon("checks", 18)),
    h("button", { class: "ribbon-btn", attrs: { type: "button", "aria-label": "Search", tabindex: "-1" } }, icon("search", 18)),
    h("button", { class: "ribbon-btn", attrs: { type: "button", "aria-label": "Daily note", tabindex: "-1" } }, icon("calendar", 18)),
  );
}

function desktopShell() {
  explorerEl = h("nav", { class: "explorer", attrs: { "aria-label": "Files" } });
  tabsEl = h("div", { class: "ws-tabs", attrs: { role: "tablist" } });
  workspaceEl = h("div", { class: "ws-content" });
  headerTitleEl = null;
  backBtn = null;
  return h(
    "div",
    { class: "window" },
    h(
      "div",
      { class: "titlebar" },
      h("span", { class: "dot r" }),
      h("span", { class: "dot y" }),
      h("span", { class: "dot g" }),
    ),
    h(
      "div",
      { class: "window-body" },
      ribbon(),
      explorerEl,
      h("main", { class: "ws" }, tabsEl, workspaceEl),
    ),
  );
}

function mobileShell() {
  explorerEl = null;
  tabsEl = null;
  workspaceEl = h("div", { class: "ws-content is-mobile" });
  headerTitleEl = h("div", { class: "m-title" });
  backBtn = h(
    "button",
    {
      class: "m-icon-btn m-back",
      attrs: { type: "button", "aria-label": "Back" },
      on: {
        click: () => {
          if (state.stack.length > 1) state.stack.pop();
          renderWorkspace();
        },
      },
    },
    icon("chevron", 20),
  );
  const time = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date()).replace(/\s?[AP]M$/i, "");
  return h(
    "div",
    { class: "phone" },
    h(
      "div",
      { class: "phone-screen" },
      h(
        "div",
        { class: "m-status" },
        h("span", { class: "m-time", text: time }),
        h("span", { class: "m-island" }),
        h("span", { class: "m-status-icons" }, h("span", { class: "m-signal" }), h("span", { class: "m-battery" })),
      ),
      h("div", { class: "m-header" }, backBtn, headerTitleEl, h("span", { class: "m-icon-btn", attrs: { "aria-hidden": "true" } })),
      workspaceEl,
      h(
        "nav",
        { class: "m-toolbar" },
        h("button", { class: "m-icon-btn", attrs: { type: "button", "aria-label": "Todos" }, on: { click: goToTodos } }, icon("checks", 20)),
        h("button", { class: "m-icon-btn", attrs: { type: "button", "aria-label": "Search", tabindex: "-1" } }, icon("search", 20)),
        h("button", { class: "m-icon-btn", attrs: { type: "button", "aria-label": "Daily note", tabindex: "-1" } }, icon("calendar", 20)),
        h("button", { class: "m-icon-btn", attrs: { type: "button", "aria-label": "Files", tabindex: "-1" } }, icon("file", 20)),
      ),
      h("div", { class: "m-home-indicator" }),
    ),
  );
}

function applyTheme() {
  document.documentElement.dataset.theme = state.theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", state.theme === "dark" ? "#161616" : "#f2f2f2");
}

function render() {
  todoPage?.destroy();
  todosEl = h("div", { class: "todos-host" });
  const board = new TodoBoard(repository, notifier, clock, {
    showRecentNotes: state.showRecent,
    recentNotesCount: 6,
    initialFilter: state.filter,
    onFilterChange: (f) => {
      state.filter = f;
      store.set("filter", f);
    },
  });
  todoPage = new TodoPage(todosEl, {
    board,
    opener,
    clock,
    vaultName: "My Vault",
    showGreeting: state.showGreeting,
    showRecentNotes: state.showRecent,
  });

  // Translate navigation between device modes
  if (state.device === "mobile") {
    const t = state.tabs[state.active];
    state.stack = t.kind === "todos" ? [{ kind: "todos" }] : [{ kind: "todos" }, t];
  } else {
    const t = state.stack[state.stack.length - 1];
    if (t.kind === "note" && !state.tabs.some((x) => x.kind === "note" && x.path === t.path)) state.tabs.push(t);
    state.active = t.kind === "todos" ? 0 : state.tabs.findIndex((x) => x.kind === "note" && x.path === t.path);
  }

  const shell = state.device === "desktop" ? desktopShell() : mobileShell();
  stageEl.dataset.device = state.device;
  stageEl.replaceChildren(shell);
  renderWorkspace();
  void todoPage.mount();
}

// ─────────────────────────────── toast

let toastEl: HTMLElement | null = null;
let toastTimer: number | undefined;
function toast(message: string) {
  toastEl?.remove();
  toastEl = h("div", { class: "toast", attrs: { role: "status" }, text: message });
  document.body.append(toastEl);
  const el = toastEl;
  requestAnimationFrame(() => el.classList.add("is-in"));
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    el.classList.remove("is-in");
    window.setTimeout(() => el.remove(), 250);
  }, 2400);
}

const stageEl = h("div", { class: "stage" });
app.replaceChildren(renderBar(), stageEl);
applyTheme();
render();
