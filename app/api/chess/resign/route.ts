// Resign. Ends game, triggers reward. Spec §2.3, §8.
import { NextResponse } from "next/server";
import { endGame, saveGame, toView } from "@/server/chess/games";
import { currentPrizeTag, fail, ownedGame, readBody } from "@/server/chess/http";
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
    if (game.status !== "active") return fail(409, "game_over", toView(game));
    await endGame(game, "loss", "resignation");
    await saveGame(game);
    return NextResponse.json<GameView>(toView(game));
  });
}
