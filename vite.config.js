import { defineConfig } from "vite";
import { readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { applyIncludes } from "./scripts/partials.mjs";

const root = process.cwd();
const skip = new Set(["node_modules", "dist", "public", ".git", "scripts", "worker", ".wrangler"]);

// Every index.html (and 404.html) in the project is a page.
function findPages(dir = root, out = {}) {
  for (const name of readdirSync(dir)) {
    if (skip.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) findPages(full, out);
    else if (name === "index.html" || (dir === root && name === "404.html")) {
      const rel = full.slice(root.length + 1).replace(/\\/g, "/");
      out[rel.replace(/\.html$/, "").replace(/\//g, "_") || "index"] = resolve(full);
    }
  }
  return out;
}

// Replaces <!--@header--> style markers with shared partials.
const includes = () => ({
  name: "adu-includes",
  transformIndexHtml: { order: "pre", handler: applyIncludes },
});

export default defineConfig({
  plugins: [includes()],
  server: { port: 5173, open: false },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    rollupOptions: { input: findPages() },
  },
});
