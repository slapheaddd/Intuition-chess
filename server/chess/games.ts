// Game state store keyed to prize_tag. Never the Vault ID. Spec §0.
// Each game = start position (FEN) + add-only move log (Spec §12, Phase 1).
// The board is always rebuilt from that log; nothing else is trusted.
import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { REWARD_HUNDREDTHS } from "@/config/chess.config";
import type { Difficulty, EndReason, GameView, Result } from "@/shared/chess";
import { dataPath, readJson, withLock, writeJson } from "@/server/platform/storage";
import { awardSlaps } from "./reward";
import { legalTargets, outcome, parseUci, pieces, replay, START_FEN } from "./rules";
import type { Chess } from "chess.js";

export interface GameRecord {
  id: string;
  prizeTag: string;
  difficulty: Difficulty;
  startFen: string;
  moves: string[];               // UCI, add-only
  status: "active" | "ended" | "abandoned";
  result: Result | null;
  endReason: EndReason | null;
  rewardHundredths: number | null;
  createdAt: string;
  endedAt: string | null;
}

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const gameFile = (id: string) => dataPath("chess", "games", `${id}.json`);
const tagFile = (prizeTag: string) =>
  dataPath("chess", "by-prize-tag", `${createHash("sha256").update(prizeTag).digest("hex")}.json`);

export const isGameId = (id: unknown): id is string => typeof id === "string" && ID.test(id);

export async function loadGame(id: string): Promise<GameRecord | null> {
  return isGameId(id) ? readJson<GameRecord>(gameFile(id)) : null;
}

export async function saveGame(game: GameRecord): Promise<void> {
  await writeJson(gameFile(game.id), game);
}

/** Start a new game. Any unfinished game for this prize_tag is closed as abandoned (no reward). */
export async function createGame(prizeTag: string, difficulty: Difficulty): Promise<GameRecord> {
  const index = await readJson<{ activeGameId: string | null }>(tagFile(prizeTag));
  if (index?.activeGameId) {
    const old = await loadGame(index.activeGameId);
    if (old && old.status === "active") {
      old.status = "abandoned";
      old.endedAt = new Date().toISOString();
      await saveGame(old);
    }
  }
  const game: GameRecord = {
    id: randomUUID(), prizeTag, difficulty, startFen: START_FEN, moves: [],
    status: "active", result: null, endReason: null, rewardHundredths: null,
    createdAt: new Date().toISOString(), endedAt: null,
  };
  await saveGame(game);
  await writeJson(tagFile(prizeTag), { activeGameId: game.id });
  return game;
}

/** If the position is over, end the game and award slaps (Spec §8). Returns true if it ended. */
export async function finishIfOver(game: GameRecord, chess: Chess): Promise<boolean> {
  const o = outcome(chess);
  if (!o) return false;
  // The player is always White (Spec §2.3).
  await endGame(game, o.loser === null ? "draw" : o.loser === "w" ? "loss" : "win", o.reason);
  return true;
}

export async function endGame(game: GameRecord, result: Result, reason: EndReason): Promise<void> {
  const amount = REWARD_HUNDREDTHS[result];
  await awardSlaps(game.prizeTag, amount, `chess:${game.id}:${result}`);
  game.status = "ended";
  game.result = result;
  game.endReason = reason;
  game.rewardHundredths = amount;
  game.endedAt = new Date().toISOString();
  await withLock(`tag:${game.prizeTag}`, async () => {
    const index = await readJson<{ activeGameId: string | null }>(tagFile(game.prizeTag));
    if (index?.activeGameId === game.id) await writeJson(tagFile(game.prizeTag), { activeGameId: null });
  });
}

/** What the browser is allowed to see. */
export function toView(game: GameRecord, chess: Chess = replay(game.startFen, game.moves)): GameView {
  const last = game.moves.length ? parseUci(game.moves[game.moves.length - 1]) : null;
  const active = game.status === "active";
  return {
    gameId: game.id,
    difficulty: game.difficulty,
    status: active ? "active" : "ended",
    turn: chess.turn(),
    inCheck: chess.inCheck(),
    pieces: pieces(chess),
    legal: active && chess.turn() === "w" ? legalTargets(chess) : {},
    lastMove: last ? { from: last.from, to: last.to } : null,
    moveCount: Math.ceil(game.moves.length / 2),
    result: game.result,
    endReason: game.endReason,
    rewardHundredths: game.rewardHundredths,
  };
}
