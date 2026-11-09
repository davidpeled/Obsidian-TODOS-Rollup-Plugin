import { defineConfig } from "vite";

// The demo renders the exact same todo-list code the plugin ships,
// wired to an in-memory fake vault instead of Obsidian.
export default defineConfig({
  root: "demo",
  server: { open: true, port: 5199 },
  build: { outDir: "../demo-dist", emptyOutDir: true },
});
