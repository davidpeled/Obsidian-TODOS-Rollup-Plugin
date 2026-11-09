// Copies the built plugin into a vault: npm run install-plugin -- /path/to/vault
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

const vault = process.argv[2] ?? process.env.OBSIDIAN_VAULT;
if (!vault) {
  console.error("Usage: npm run install-plugin -- /path/to/your/vault  (or set OBSIDIAN_VAULT)");
  process.exit(1);
}
if (!existsSync(join(vault, ".obsidian"))) {
  console.error(`No .obsidian folder in ${resolve(vault)}. Is that a vault?`);
  process.exit(1);
}
if (!existsSync("main.js")) {
  console.error("main.js not found. Run `npm run build` first.");
  process.exit(1);
}
const target = join(vault, ".obsidian", "plugins", "todos-rollup");
mkdirSync(target, { recursive: true });
for (const f of ["main.js", "manifest.json", "styles.css"]) copyFileSync(f, join(target, f));
console.log(`Installed to ${target}. Enable "TODOs rollup" in Settings → Community plugins.`);
