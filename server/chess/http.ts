// Shared bits for the /api/chess routes (Spec §2.3, §11.3 rules 1–2).
import "server-only";
import { NextResponse } from "next/server";
import { getSession, getWheelFor } from "@/server/platform/session";
import type { ApiError, GameView } from "@/shared/chess";
import { loadGame, type GameRecord } from "./games";

export async function currentPrizeTag(): Promise<string> {
  const { prize_tag } = await getWheelFor(await getSession());
  return prize_tag;
}

export function fail(status: number, error: string, view?: GameView) {
  return NextResponse.json<ApiError>(view ? { error, view } : { error }, { status });
}

export async function readBody(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json();
    return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Load a game and make sure it belongs to this prize_tag. Unknown or foreign games look the same. */
export async function ownedGame(gameId: unknown, prizeTag: string): Promise<GameRecord | null> {
  const game = await loadGame(gameId as string);
  return game && game.prizeTag === prizeTag ? game : null;
}
