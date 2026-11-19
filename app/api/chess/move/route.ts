// Player move -> validate (rules.ts) -> computer reply (engine.ts). Spec §2.1-2.2.
// POST { gameId, from, to, promotion? }. Send { gameId } alone to retry a computer
// reply that failed earlier (the engine owes a move).
import { NextResponse } from "next/server";
import { computerMove } from "@/server/chess/engine";
import { finishIfOver, saveGame, toView } from "@/server/chess/games";
import { currentPrizeTag, fail, ownedGame, readBody } from "@/server/chess/http";
import { applyUci, checkMove, replay } from "@/server/chess/rules";
import { withLock } from "@/server/platform/storage";
import type { GameView } from "@/shared/chess";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await readBody(req);
  if (!body) return fail(400, "bad_request");
  const prizeTag = await currentPrizeTag();

  return withLock(`game:${String(body.gameId)}`, async () => {
    const game = await ownedGame(body.gameId, prizeTag);
    if (!game) return fail(404, "game_not_found");
    const chess = replay(game.startFen, game.moves);
    if (game.status !== "active") return fail(409, "game_over", toView(game, chess));

    const retryOnly = body.from === undefined && body.to === undefined;

    if (chess.turn() === "w") {
      if (retryOnly) return fail(400, "bad_request", toView(game, chess));
      const check = checkMove(chess, body.from, body.to, body.promotion);
      if (!check.ok) return fail(422, check.error, toView(game, chess));
      applyUci(chess, check.uci);
      game.moves.push(check.uci);
      const over = await finishIfOver(game, chess);
      await saveGame(game);
      if (over) return NextResponse.json<GameView>(toView(game, chess));
    } else if (!retryOnly) {
      return fail(409, "not_your_turn", toView(game, chess));
    }

    // Computer (Black) replies.
    let reply: string | null;
    try {
      reply = await computerMove(game.startFen, game.moves, game.difficulty);
    } catch (e) {
      console.error("[chess] engine error", e);
      return fail(503, "engine_unavailable", toView(game, chess));
    }
    if (!reply) return fail(503, "engine_no_move", toView(game, chess));
    applyUci(chess, reply); // throws if Stockfish ever returned an illegal move
    game.moves.push(reply);
    await finishIfOver(game, chess);
    await saveGame(game);
    return NextResponse.json<GameView>(toView(game, chess));
  });
}
