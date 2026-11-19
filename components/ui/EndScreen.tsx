// Result, moves, slap count-up, Play again / Back to menu. Spec §2.3, §8.
"use client";
import { useEffect, useState } from "react";
import { FLOW } from "@/config/chess.config";
import { PALETTE } from "@/config/palette";
import type { EndReason, GameView } from "@/shared/chess";

const RESULT = { win: "Win", loss: "Loss", draw: "Draw" } as const;
const REASON: Record<EndReason, string> = {
  checkmate: "Checkmate", stalemate: "Stalemate", insufficient_material: "Insufficient material",
  threefold_repetition: "Threefold repetition", fifty_move_rule: "50-move rule", resignation: "Resigned",
};

function useCountUp(target: number) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      // The first frame's timestamp can be slightly earlier than `start`; never go below 0.
      const t = Math.min(1, Math.max(0, (now - start) / FLOW.slapCountUpMs));
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return value;
}

export default function EndScreen({ view, onPlayAgain, onMenu, busy }:
  { view: GameView; onPlayAgain: () => void; onMenu: () => void; busy: boolean }) {
  const slaps = useCountUp(view.rewardHundredths ?? 0);
  const glow = view.result === "win" ? PALETTE.ruby : PALETTE.rustyPurple;
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.55)", padding: 16 }}>
      <div role="dialog" aria-label="Game over" style={{ background: PALETTE.black, border: `1px solid ${glow}`,
        boxShadow: `0 0 40px ${glow}`, borderRadius: 10, padding: "28px 24px", width: "min(360px, 100%)",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 14, textAlign: "center" }}>
        <div style={{ fontSize: 40, color: PALETTE.blindingWhite }}>{view.result ? RESULT[view.result] : ""}</div>
        {view.endReason && <div style={{ color: PALETTE.matrixGreen, opacity: 0.8 }}>{REASON[view.endReason]}</div>}
        <div style={{ color: PALETTE.matrixGreen }}>Moves: {view.moveCount}</div>
        <div style={{ color: PALETTE.blindingWhite, fontSize: 22 }}>
          +{(slaps / 100).toFixed(2)} <span style={{ color: PALETTE.matrixGreen, fontSize: 16 }}>slaps</span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", marginTop: 6 }}>
          <button className="ic-btn" disabled={busy} onClick={onPlayAgain}>Play again</button>
          <button className="ic-btn ic-secondary" disabled={busy} onClick={onMenu}>Back to menu</button>
        </div>
      </div>
    </div>
  );
}
