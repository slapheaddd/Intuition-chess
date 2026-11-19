// Start a game (server). Spec §2.3. Reads prize_tag via getWheelFor(session).
import { NextResponse } from "next/server";
import { SKILL } from "@/config/chess.config";
import { createGame, toView } from "@/server/chess/games";
import { currentPrizeTag, fail, readBody } from "@/server/chess/http";
import { withLock } from "@/server/platform/storage";
import type { Difficulty, GameView } from "@/shared/chess";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await readBody(req);
  const difficulty = body?.difficulty;
  if (typeof difficulty !== "string" || !Object.hasOwn(SKILL, difficulty)) return fail(400, "bad_difficulty");
  const prizeTag = await currentPrizeTag();
  const game = await withLock(`tag:${prizeTag}`, () => createGame(prizeTag, difficulty as Difficulty));
  return NextResponse.json<GameView>(toView(game));
}
