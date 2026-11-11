/**
 * Minimal stand-ins for the Obsidian globals the plugin's DOM helpers use (`createEl`,
 * `createSvg`), so the same code runs in the browser demo and under happy-dom tests.
 */
/** Marks this file as a module (side effects happen on import). */
export const installed = true;
const g = globalThis as unknown as Record<string, unknown>;
const doc = () => (g.activeDocument ?? g.document) as Document;

if (typeof g.createEl !== "function") {
  g.createEl = (tag: string) => doc().createElement(tag);
}
if (typeof g.createSvg !== "function") {
  g.createSvg = (tag: string) => doc().createElementNS("http://www.w3.org/2000/svg", tag);
}
