import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SETTINGS, applySetting, isEditableSettingKey, isExcluded, parseLines, sanitizeSettings, settingToControlValue } from "./settings.ts";

test("sanitizeSettings falls back on missing or wrongly typed data", () => {
  assert.deepEqual(sanitizeSettings(null), DEFAULT_SETTINGS);
  assert.deepEqual(sanitizeSettings("nope"), DEFAULT_SETTINGS);
  const s = sanitizeSettings({
    excludedFolders: "Archive", // string instead of array
    excludedFileNames: ["A.md", 3, null],
    openOnStartup: "yes",
    recentNotesCount: 99,
    lastFilter: "weird",
    showGreeting: false,
  });
  assert.deepEqual(s.excludedFolders, DEFAULT_SETTINGS.excludedFolders);
  assert.deepEqual(s.excludedFileNames, ["A.md"]);
  assert.equal(s.openOnStartup, true);
  assert.equal(s.recentNotesCount, 12);
  assert.equal(s.lastFilter, "open");
  assert.equal(s.showGreeting, false);
});

test("isExcluded matches folders, subfolders and names case-insensitively", () => {
  const cfg = { excludedFolders: ["Templates", "Archive/Old"], excludedFileNames: ["AGENTS.md"] };
  assert.equal(isExcluded("Templates/Daily.md", cfg), true);
  assert.equal(isExcluded("Templates/sub/x.md", cfg), true);
  assert.equal(isExcluded("Archive/Old/x.md", cfg), true);
  assert.equal(isExcluded("Archive/x.md", cfg), false);
  assert.equal(isExcluded("TemplatesExtra/x.md", cfg), false);
  assert.equal(isExcluded("Deep/agents.MD", cfg), true);
  assert.equal(isExcluded("Notes/a.md", cfg), false);
});

test("parseLines trims, drops blanks and optionally strips slashes", () => {
  assert.deepEqual(parseLines(" a \n\n b.md \n"), ["a", "b.md"]);
  assert.deepEqual(parseLines("/Archive/\n Notes/Old/ ", true), ["Archive", "Notes/Old"]);
});

test("applySetting parses list text, clamps numbers and rejects wrong types", () => {
  const base = DEFAULT_SETTINGS;
  assert.deepEqual(applySetting(base, "excludedFolders", "/A/\nB").excludedFolders, ["A", "B"]);
  assert.deepEqual(applySetting(base, "excludedFileNames", " X.md \n").excludedFileNames, ["X.md"]);
  assert.equal(applySetting(base, "recentNotesCount", 99).recentNotesCount, 12);
  assert.equal(applySetting(base, "showGreeting", "nope").showGreeting, base.showGreeting);
  assert.equal(applySetting(base, "showGreeting", false).showGreeting, false);
});

test("settings round-trip through control values; unknown keys are not editable", () => {
  const s = { ...DEFAULT_SETTINGS, excludedFolders: ["A", "B/C"] };
  assert.equal(settingToControlValue(s, "excludedFolders"), "A\nB/C");
  assert.equal(settingToControlValue(s, "recentNotesCount"), s.recentNotesCount);
  assert.equal(isEditableSettingKey("openOnStartup"), true);
  assert.equal(isEditableSettingKey("lastFilter"), false);
  assert.equal(isEditableSettingKey("bogus"), false);
});
