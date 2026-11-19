// Stockfish wrapper, Skill Levels from config. Spec §2.2.
// Runs on the server only. One engine instance, one search at a time.
import "server-only";
import { createRequire } from "node:module";
import { ENGINE, SKILL } from "@/config/chess.config";
import type { Difficulty } from "@/shared/chess";

interface SfEngine {
  sendCommand(cmd: string): void;
  listener?: (line: string) => void;
}

const g = globalThis as unknown as { __chessEngine?: Promise<SfEngine>; __chessEngineQueue?: Promise<unknown> };

function waitFor(engine: SfEngine, match: (line: string) => boolean, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      engine.listener = undefined;
      reject(new Error("Stockfish timed out"));
    }, timeoutMs);
    engine.listener = (line) => {
      if (match(line)) {
        clearTimeout(timer);
        engine.listener = undefined;
        resolve(line);
      }
    };
  });
}

async function boot(): Promise<SfEngine> {
  const load = createRequire(import.meta.url)("stockfish") as (flavor: string) => Promise<SfEngine>;
  const engine = await load(ENGINE.flavor);
  const ok = waitFor(engine, (l) => l === "uciok", ENGINE.readyTimeoutMs);
  engine.sendCommand("uci");
  await ok;
  return engine;
}

function getEngine(): Promise<SfEngine> {
  if (!g.__chessEngine) {
    g.__chessEngine = boot().catch((e) => {
      g.__chessEngine = undefined; // allow a retry on the next request
      throw e;
    });
  }
  return g.__chessEngine;
}

/** Ask Stockfish for its move. Returns a UCI move, or null if it has none. */
export async function computerMove(startFen: string, moves: readonly string[], difficulty: Difficulty): Promise<string | null> {
  const run = async () => {
    const engine = await getEngine();
    const ready = waitFor(engine, (l) => l === "readyok", ENGINE.readyTimeoutMs);
    engine.sendCommand(`setoption name Skill Level value ${SKILL[difficulty]}`);
    engine.sendCommand(`position fen ${startFen}${moves.length ? " moves " + moves.join(" ") : ""}`);
    engine.sendCommand("isready");
    await ready;
    const best = waitFor(engine, (l) => l.startsWith("bestmove"), ENGINE.searchTimeoutMs);
    engine.sendCommand(`go movetime ${ENGINE.moveTimeMs}`);
    const line = await best.catch((e) => {
      engine.sendCommand("stop");
      throw e;
    });
    const uci = line.split(/\s+/)[1];
    return uci && uci !== "(none)" ? uci : null;
  };
  const prev = g.__chessEngineQueue ?? Promise.resolve();
  const job = prev.catch(() => undefined).then(run);
  g.__chessEngineQueue = job.catch(() => undefined);
  return job;
}
