import type { TaskFilter } from "./task.ts";

export interface TodosRollupSettings {
  openOnStartup: boolean;
  openNotesInNewTab: boolean;
  showGreeting: boolean;
  showRecentNotes: boolean;
  recentNotesCount: number;
  excludedFolders: string[];
  /** File names (with extension) to ignore anywhere in the vault, case-insensitive. */
  excludedFileNames: string[];
  lastFilter: TaskFilter;
}

export const DEFAULT_SETTINGS: TodosRollupSettings = {
  openOnStartup: true,
  openNotesInNewTab: true,
  showGreeting: true,
  showRecentNotes: true,
  recentNotesCount: 6,
  excludedFolders: ["Templates"],
  excludedFileNames: ["AGENTS.md", "SKILL.md"],
  lastFilter: "open",
};

const FILTERS: TaskFilter[] = ["open", "done", "all"];

const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);
const strings = (v: unknown, fallback: string[]) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [...fallback];

/** Merge saved data over the defaults, ignoring anything with the wrong type (data.json is hand-editable). */
export function sanitizeSettings(raw: unknown): TodosRollupSettings {
  const d = DEFAULT_SETTINGS;
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const count = typeof r.recentNotesCount === "number" && Number.isFinite(r.recentNotesCount) ? r.recentNotesCount : d.recentNotesCount;
  return {
    openOnStartup: bool(r.openOnStartup, d.openOnStartup),
    openNotesInNewTab: bool(r.openNotesInNewTab, d.openNotesInNewTab),
    showGreeting: bool(r.showGreeting, d.showGreeting),
    showRecentNotes: bool(r.showRecentNotes, d.showRecentNotes),
    recentNotesCount: Math.min(12, Math.max(3, Math.round(count))),
    excludedFolders: strings(r.excludedFolders, d.excludedFolders),
    excludedFileNames: strings(r.excludedFileNames, d.excludedFileNames),
    lastFilter: FILTERS.includes(r.lastFilter as TaskFilter) ? (r.lastFilter as TaskFilter) : d.lastFilter,
  };
}

/** True when a note should be ignored: its file name is excluded, or it lives in an excluded folder. */
export function isExcluded(
  path: string,
  { excludedFolders, excludedFileNames }: Pick<TodosRollupSettings, "excludedFolders" | "excludedFileNames">,
): boolean {
  const name = path.slice(path.lastIndexOf("/") + 1).toLowerCase();
  if (excludedFileNames.some((n) => n.toLowerCase() === name)) return true;
  return excludedFolders.some((f) => path === f || path.startsWith(f + "/"));
}

/** One entry per line, trimmed, blanks dropped. With `trimSlashes`, leading/trailing `/` are removed (folder paths). */
export function parseLines(text: string, trimSlashes = false): string[] {
  return text
    .split("\n")
    .map((x) => (trimSlashes ? x.trim().replace(/^\/+|\/+$/g, "") : x.trim()))
    .filter(Boolean);
}

/** Settings editable from the settings tab (everything except internal state like `lastFilter`). */
export const EDITABLE_SETTING_KEYS = [
  "openOnStartup",
  "openNotesInNewTab",
  "showGreeting",
  "showRecentNotes",
  "recentNotesCount",
  "excludedFolders",
  "excludedFileNames",
] as const satisfies readonly (keyof TodosRollupSettings)[];

export type EditableSettingKey = (typeof EDITABLE_SETTING_KEYS)[number];

export const isEditableSettingKey = (key: string): key is EditableSettingKey =>
  (EDITABLE_SETTING_KEYS as readonly string[]).includes(key);

/** Settings as shown in a text control: list settings become one entry per line. */
export function settingToControlValue(settings: TodosRollupSettings, key: EditableSettingKey): boolean | number | string {
  const v = settings[key];
  return Array.isArray(v) ? v.join("\n") : v;
}

/** Apply one control value. Text for the list settings is parsed into lines; the result is always sanitized. */
export function applySetting(settings: TodosRollupSettings, key: EditableSettingKey, value: unknown): TodosRollupSettings {
  const next: Record<string, unknown> = { ...settings };
  if (key === "excludedFolders") next[key] = parseLines(String(value), true);
  else if (key === "excludedFileNames") next[key] = parseLines(String(value));
  else next[key] = value;
  return sanitizeSettings(next);
}
