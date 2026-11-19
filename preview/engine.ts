// Stockfish in the browser for the preview build (the real game runs it on the server, §2.2).
import { Chess } from "chess.js";
import { ENGINE, SKILL } from "@/config/chess.config";
import type { Difficulty } from "@/shared/chess";

const SCRIPT = "stockfish-18-lite-single.js";
let booting: Promise<Worker | null> | null = null;
let queue: Promise<unknown> = Promise.resolve();
export let engineMode: "stockfish" | "fallback" | "starting" = "starting";

function waitFor(w: Worker, match: (line: string) => boolean, ms: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { w.removeEventListener("message", on); reject(new Error("timeout")); }, ms);
    const on = (e: MessageEvent) => {
      const line = String(e.data);
      if (match(line)) { clearTimeout(timer); w.removeEventListener("message", on); resolve(line); }
    };
    w.addEventListener("message", on);
  });
}

async function tryWorker(make: () => Worker | Promise<Worker>): Promise<Worker | null> {
  try {
    const w = await make();
    const ok = waitFor(w, (l) => l === "uciok", ENGINE.readyTimeoutMs);
    w.postMessage("uci");
    await ok;
    return w;
  } catch {
    return null;
  }
}

function boot(): Promise<Worker | null> {
  booting ??= (async () => {
    const base = new URL(SCRIPT, document.baseURI).href;
    // 1) Worker straight from the published file; 2) the same code from a blob: URL,
    // told where the .wasm lives via the URL hash (how Stockfish.js finds it).
    const w = (await tryWorker(() => new Worker(base)))
      ?? (await tryWorker(async () => {
        const src = await (await fetch(base)).text();
        const url = URL.createObjectURL(new Blob([src], { type: "text/javascript" }));
        return new Worker(url + "#" + encodeURIComponent(base.replace(/\.js$/, ".wasm")));
      }));
    engineMode = w ? "stockfish" : "fallback";
    return w;
  })();
  return booting;
}

/** If Stockfish can't start here, a simple opponent: takes the best capture, else a random move. */
function fallbackMove(startFen: string, moves: readonly string[]): string | null {
  const c = new Chess(startFen);
  for (const m of moves) c.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4] });
  const all = c.moves({ verbose: true });
  if (!all.length) return null;
  const value: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  const best = all.filter((m) => m.captured).sort((a, b) => value[b.captured!] - value[a.captured!])[0]
    ?? all[Math.floor(Math.random() * all.length)];
  return best.from + best.to + (best.promotion ?? "");
}

export function computerMove(startFen: string, moves: readonly string[], difficulty: Difficulty): Promise<string | null> {
  const job = queue.catch(() => undefined).then(async () => {
    const w = await boot();
    if (!w) return fallbackMove(startFen, moves);
    const ready = waitFor(w, (l) => l === "readyok", ENGINE.readyTimeoutMs);
    w.postMessage(`setoption name Skill Level value ${SKILL[difficulty]}`);
    w.postMessage(`position fen ${startFen}${moves.length ? " moves " + moves.join(" ") : ""}`);
    w.postMessage("isready");
    await ready;
    const best = waitFor(w, (l) => l.startsWith("bestmove"), ENGINE.searchTimeoutMs);
    w.postMessage(`go movetime ${ENGINE.moveTimeMs}`);
    const uci = (await best).split(/\s+/)[1];
    return uci && uci !== "(none)" ? uci : null;
  });
  queue = job;
  return job;
}

/** Start loading the engine early so the first reply is quick. */
export const warmUp = () => { void boot(); };
