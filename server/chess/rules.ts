// chess.js wrapper: legal moves, check, mate, all draws. Spec §2.1.
// Standard FIDE chess. No draw offers. Automatic draws: stalemate, insufficient
// material, threefold repetition, 50-move rule.
import "server-only";
import { Chess, DEFAULT_POSITION } from "chess.js";
import type { EndReason, LegalTarget, PieceView, PromotionPiece } from "@/shared/chess";

export const START_FEN = DEFAULT_POSITION;

const SQUARE = /^[a-h][1-8]$/;
const PROMOTIONS: readonly PromotionPiece[] = ["q", "r", "b", "n"];

/** Rebuild the board from the start position + move log (Spec §12, Phase 1). */
export function replay(startFen: string, moves: readonly string[]): Chess {
  const chess = new Chess(startFen);
  for (const uci of moves) {
    const m = parseUci(uci);
    if (!m) throw new Error(`Corrupt move log entry: ${uci}`);
    chess.move(m); // throws if illegal — the log must only ever hold legal moves
  }
  return chess;
}

export function parseUci(uci: string): { from: string; to: string; promotion?: PromotionPiece } | null {
  const m = /^([a-h][1-8])([a-h][1-8])([qrbn])?$/.exec(uci);
  return m ? { from: m[1], to: m[2], promotion: m[3] as PromotionPiece | undefined } : null;
}

export type MoveCheck =
  | { ok: true; uci: string }
  | { ok: false; error: "bad_square" | "illegal_move" | "promotion_required" | "bad_promotion" };

/** Validate a requested move against the current position. Does not apply it. */
export function checkMove(chess: Chess, from: unknown, to: unknown, promotion: unknown): MoveCheck {
  if (typeof from !== "string" || typeof to !== "string" || !SQUARE.test(from) || !SQUARE.test(to)) {
    return { ok: false, error: "bad_square" };
  }
  const candidates = chess.moves({ square: from as never, verbose: true }).filter((m) => m.to === to);
  if (candidates.length === 0) return { ok: false, error: "illegal_move" };
  const isPromotion = candidates.some((m) => m.promotion);
  if (!isPromotion) return { ok: true, uci: from + to };
  if (promotion === undefined || promotion === null) return { ok: false, error: "promotion_required" };
  if (typeof promotion !== "string" || !PROMOTIONS.includes(promotion as PromotionPiece)) {
    return { ok: false, error: "bad_promotion" };
  }
  return { ok: true, uci: from + to + promotion };
}

export function applyUci(chess: Chess, uci: string): void {
  const m = parseUci(uci);
  if (!m) throw new Error(`Bad UCI move: ${uci}`);
  chess.move(m);
}

/** null while the game is still going. `loser` is the side that lost, or null for a draw. */
export function outcome(chess: Chess): { reason: EndReason; loser: "w" | "b" | null } | null {
  if (chess.isCheckmate()) return { reason: "checkmate", loser: chess.turn() };
  if (chess.isStalemate()) return { reason: "stalemate", loser: null };
  if (chess.isInsufficientMaterial()) return { reason: "insufficient_material", loser: null };
  if (chess.isThreefoldRepetition()) return { reason: "threefold_repetition", loser: null };
  if (chess.isDrawByFiftyMoves()) return { reason: "fifty_move_rule", loser: null };
  return null;
}

export function pieces(chess: Chess): PieceView[] {
  const out: PieceView[] = [];
  for (const row of chess.board()) {
    for (const p of row) if (p) out.push({ square: p.square, type: p.type, color: p.color });
  }
  return out;
}

export function legalTargets(chess: Chess): Record<string, LegalTarget[]> {
  const out: Record<string, LegalTarget[]> = {};
  for (const m of chess.moves({ verbose: true })) {
    const list = (out[m.from] ??= []);
    if (!list.some((t) => t.to === m.to)) list.push({ to: m.to, promotion: Boolean(m.promotion) });
  }
  return out;
}
