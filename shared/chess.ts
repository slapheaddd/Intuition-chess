// Types shared by server and browser. The browser never runs chess rules (§11.3 rule 1).
import type { SKILL } from "@/config/chess.config";

export type Difficulty = keyof typeof SKILL;
export type Color = "w" | "b";
export type PieceType = "p" | "n" | "b" | "r" | "q" | "k";
export type PromotionPiece = "q" | "r" | "b" | "n";
export type Result = "win" | "loss" | "draw";
export type EndReason =
  | "checkmate" | "stalemate" | "insufficient_material"
  | "threefold_repetition" | "fifty_move_rule" | "resignation";

export interface PieceView { square: string; type: PieceType; color: Color }
export interface LegalTarget { to: string; promotion: boolean }

export interface GameView {
  gameId: string;
  difficulty: Difficulty;
  status: "active" | "ended";
  turn: Color;
  inCheck: boolean;
  pieces: PieceView[];
  legal: Record<string, LegalTarget[]>;   // from-square -> targets (only when it's the player's turn)
  lastMove: { from: string; to: string } | null;
  moveCount: number;                      // full moves played
  result: Result | null;                  // from the player's (White's) side
  endReason: EndReason | null;
  rewardHundredths: number | null;
}

export interface ApiError { error: string; view?: GameView }
