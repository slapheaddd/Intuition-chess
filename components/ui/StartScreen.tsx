// Difficulty pick (Spec §2.3 step 2). Scene pick joins in Phase 3 (§5).
"use client";
import { SKILL } from "@/config/chess.config";
import { PALETTE } from "@/config/palette";
import type { Difficulty } from "@/shared/chess";

const LABEL: Record<Difficulty, string> = { easy: "Easy", medium: "Medium", hard: "Hard" };

export default function StartScreen({ onStart, busy }: { onStart: (d: Difficulty) => void; busy: boolean }) {
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: 28, padding: 16, background: "rgba(0,0,0,0.45)" }}>
      <h1 style={{ margin: 0, fontSize: 28, fontWeight: 400, color: PALETTE.blindingWhite, letterSpacing: 2, textAlign: "center" }}>
        Intuition Chess
      </h1>
      <p style={{ margin: 0, color: PALETTE.matrixGreen }}>Choose difficulty</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
        {(Object.keys(SKILL) as Difficulty[]).map((d) => (
          <button key={d} className="ic-btn" disabled={busy} onClick={() => onStart(d)}>{LABEL[d]}</button>
        ))}
      </div>
    </div>
  );
}
