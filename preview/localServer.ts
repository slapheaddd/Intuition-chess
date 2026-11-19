// The preview's stand-in for app/api/chess/* -- same rules code, run in the browser.
// The real game keeps all of this on the server (§11.3 rule 1) and awards slaps (§8).
import { REWARD_HUNDREDTHS, SKILL } from "@/config/chess.config";
import { applyUci, checkMove, legalTargets, outcome, parseUci, pieces, replay, START_FEN } from "@/server/chess/rules";
import type { Difficulty, EndReason, GameView, Result } from "@/shared/chess";
import { computerMove } from "./engine";

interface Game {
  id: string; difficulty: Difficulty; startFen: string; moves: string[];
  status: "active" | "ended"; result: Result | null; endReason: EndReason | null; reward: number | null;
}
const games = new Map<string, Game>();

function view(g: Game): GameView {
  const chess = replay(g.startFen, g.moves);
  const last = g.moves.length ? parseUci(g.moves[g.moves.length - 1]) : null;
  const active = g.status === "active";
  return {
    gameId: g.id, difficulty: g.difficulty, status: g.status, turn: chess.turn(), inCheck: chess.inCheck(),
    pieces: pieces(chess), legal: active && chess.turn() === "w" ? legalTargets(chess) : {},
    lastMove: last ? { from: last.from, to: last.to } : null, moveCount: Math.ceil(g.moves.length / 2),
    result: g.result, endReason: g.endReason, rewardHundredths: g.reward,
  };
}

function end(g: Game, result: Result, reason: EndReason) {
  g.status = "ended"; g.result = result; g.endReason = reason; g.reward = REWARD_HUNDREDTHS[result];
}

function finishIfOver(g: Game) {
  const o = outcome(replay(g.startFen, g.moves));
  if (!o) return false;
  end(g, o.loser === null ? "draw" : o.loser === "w" ? "loss" : "win", o.reason);
  return true;
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

async function handle(path: string, body: Record<string, unknown>): Promise<Response> {
  if (path === "new") {
    const d = body.difficulty;
    if (typeof d !== "string" || !Object.hasOwn(SKILL, d)) return json(400, { error: "bad_difficulty" });
    const g: Game = { id: crypto.randomUUID(), difficulty: d as Difficulty, startFen: START_FEN, moves: [], status: "active", result: null, endReason: null, reward: null };
    games.set(g.id, g);
    return json(200, view(g));
  }
  const g = games.get(String(body.gameId));
  if (!g) return json(404, { error: "game_not_found" });
  if (g.status !== "active") return json(409, { error: "game_over", view: view(g) });
  if (path === "resign") { end(g, "loss", "resignation"); return json(200, view(g)); }
  if (path !== "move") return json(404, { error: "not_found" });

  const chess = replay(g.startFen, g.moves);
  const retryOnly = body.from === undefined && body.to === undefined;
  if (chess.turn() === "w") {
    if (retryOnly) return json(400, { error: "bad_request", view: view(g) });
    const check = checkMove(chess, body.from, body.to, body.promotion);
    if (!check.ok) return json(422, { error: check.error, view: view(g) });
    applyUci(chess, check.uci);
    g.moves.push(check.uci);
    if (finishIfOver(g)) return json(200, view(g));
  }
  let reply: string | null = null;
  try { reply = await computerMove(g.startFen, g.moves, g.difficulty); } catch { /* reported below */ }
  if (!reply) return json(503, { error: "engine_unavailable", view: view(g) });
  g.moves.push(reply);
  finishIfOver(g);
  return json(200, view(g));
}

/** Route the game's /api/chess/* calls to the in-browser stand-in. */
export function installLocalServer() {
  const real = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const m = /\/api\/chess\/(new|move|resign)$/.exec(new URL(url, location.href).pathname);
    if (!m) return real(input, init);
    let body: Record<string, unknown> = {};
    try { body = JSON.parse(String(init?.body ?? "{}")); } catch { /* empty */ }
    return handle(m[1], body);
  };
}
