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
