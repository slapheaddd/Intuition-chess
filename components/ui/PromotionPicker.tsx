// Pawn promotion choice (Spec §2.1). The server checks the choice.
"use client";
import { PALETTE } from "@/config/palette";
import type { PromotionPiece } from "@/shared/chess";

const OPTIONS: { piece: PromotionPiece; label: string }[] = [
  { piece: "q", label: "Queen" }, { piece: "r", label: "Rook" }, { piece: "b", label: "Bishop" }, { piece: "n", label: "Knight" },
];

export default function PromotionPicker({ onPick, onCancel }: { onPick: (p: PromotionPiece) => void; onCancel: () => void }) {
  return (
    <div onClick={onCancel} style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.6)", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: PALETTE.black, border: `1px solid ${PALETTE.matrixGreen}`,
        borderRadius: 8, padding: 20, display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
        <span style={{ color: PALETTE.blindingWhite }}>Promote to</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
          {OPTIONS.map((o) => <button key={o.piece} className="ic-btn" onClick={() => onPick(o.piece)}>{o.label}</button>)}
        </div>
      </div>
    </div>
  );
}
