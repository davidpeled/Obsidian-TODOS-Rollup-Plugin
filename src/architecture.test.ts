import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Dependencies point inward: domain <- application <- presentation / infrastructure <- main.
const ALLOWED: Record<string, string[]> = {
  domain: ["domain"],
  application: ["domain", "application"],
  presentation: ["domain", "application", "presentation"],
  infrastructure: ["domain", "application", "presentation", "infrastructure"],
};

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
const sources = (dir: string) => walk(dir).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));
const importsOf = (src: string) => [...src.matchAll(/(?:import|export)[^"']*?from\s+["']([^"']+)["']/g)].map((m) => m[1]);
const layerOf = (file: string) => file.split("/")[1];

test("layers only depend inward, and only infrastructure touches obsidian", () => {
  for (const file of sources("src")) {
    const layer = layerOf(file);
    for (const spec of importsOf(readFileSync(file, "utf8"))) {
      if (spec === "obsidian") {
        assert.ok(layer === "infrastructure" || file === "src/main.ts", `${file} imports obsidian`);
        continue;
      }
      if (!spec.startsWith(".") || !ALLOWED[layer]) continue;
      const target = join(file, "..", spec).split("/")[1];
      if (target in ALLOWED) assert.ok(ALLOWED[layer].includes(target), `${file} (${layer}) must not import ${target}: ${spec}`);
    }
  }
});

test("domain and application stay free of the DOM", () => {
  for (const file of [...sources("src/domain"), ...sources("src/application")])
    assert.doesNotMatch(readFileSync(file, "utf8"), /\b(document|window|HTMLElement|requestAnimationFrame)\b/, file);
});

test("src and demo never import the Obsidian shell; src never imports demo", () => {
  for (const file of sources("demo"))
    for (const spec of importsOf(readFileSync(file, "utf8"))) {
      assert.notEqual(spec, "obsidian", file);
      assert.doesNotMatch(spec, /infrastructure\/obsidian|src\/main/, `${file} imports ${spec}`);
    }
  for (const file of sources("src"))
    for (const spec of importsOf(readFileSync(file, "utf8"))) assert.doesNotMatch(spec, /demo/, `${file} imports ${spec}`);
});

test("no innerHTML / outerHTML / insertAdjacentHTML anywhere", () => {
  for (const f of [...sources("src"), ...sources("demo")])
    assert.doesNotMatch(readFileSync(f, "utf8"), /\b(innerHTML|outerHTML|insertAdjacentHTML)\b/, f);
});

test("test-support helpers are only used by tests and the demo", () => {
  const offenders = sources("src")
    .filter((f) => !f.startsWith("src/test-support/"))
    .filter((f) => importsOf(readFileSync(f, "utf8")).some((spec) => /test-support/.test(spec)));
  assert.deepEqual(offenders, []);
});
