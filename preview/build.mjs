// Builds the phone preview into preview/dist/: one page (index.html, game code inlined)
// plus Stockfish's worker script and .wasm next to it.
import { build } from "esbuild";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "preview", "dist");
await mkdir(out, { recursive: true });

const result = await build({
  entryPoints: [path.join(root, "preview", "entry.tsx")],
  bundle: true, minify: true, write: false, format: "iife", target: "es2020", platform: "browser",
  jsx: "automatic", legalComments: "none",
  tsconfig: path.join(root, "tsconfig.json"),
  define: { "process.env.NODE_ENV": '"production"' },
  alias: {
    "server-only": path.join(root, "preview", "shims", "empty.ts"),
    "next/dynamic": path.join(root, "preview", "shims", "dynamic.tsx"),
  },
});
const js = result.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
const css = await readFile(path.join(root, "app", "globals.css"), "utf8");

const html = `<title>Intuition Chess</title>
<style>
/* Single dark look: deep space, Matrix-green type (Spec §3.2). */
:root { --bg: #000000; --fg: #00ff41; color-scheme: dark; }
html, body { height: 100%; background: var(--bg); color: var(--fg); overflow: hidden; overscroll-behavior: none; }
#root { position: fixed; inset: 0; }
#root main { width: 100% !important; height: 100% !important; }
${css}
</style>
<div id="root"></div>
<script>${js}</script>
`;
await writeFile(path.join(out, "index.html"), html);
for (const f of ["stockfish-18-lite-single.js", "stockfish-18-lite-single.wasm"]) {
  await copyFile(path.join(root, "node_modules", "stockfish", "bin", f), path.join(out, f));
}
console.log(`preview built: index.html ${(html.length / 1e6).toFixed(2)} MB + Stockfish worker`);
