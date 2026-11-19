// Square <-> world position. White's back rank (rank 1) is nearest the camera. Spec §3.4, §4.3.
import { BOARD } from "@/config/chess.config";

export const FILES = "abcdefgh";

export function squareToXZ(square: string): [number, number] {
  const file = FILES.indexOf(square[0]);
  const rank = Number(square[1]) - 1;
  return [(file - 3.5) * BOARD.squareSize, (3.5 - rank) * BOARD.squareSize];
}

export const ALL_SQUARES: string[] = Array.from({ length: 64 }, (_, i) => FILES[i % 8] + String(Math.floor(i / 8) + 1));

export const isLightSquare = (square: string) => (FILES.indexOf(square[0]) + Number(square[1])) % 2 === 0;
