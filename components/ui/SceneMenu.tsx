// Top-left drop-down; greyed out from first move to game end. Spec §5.
// Matrix green on black; cosmic palette for hover/active. Shows the current scene when
// closed. Closes on pick or on a tap outside it.
"use client";
import { useEffect, useRef, useState } from "react";
import { SCENES } from "@/config/chess.config";
import { PALETTE } from "@/config/palette";
import { SCENE_LABELS, type SceneId } from "@/components/scenes";

export default function SceneMenu({ scene, locked, onPick }: { scene: SceneId; locked: boolean; onPick: (s: SceneId) => void }) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState<SceneId | null>(null);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => { if (locked) setOpen(false); }, [locked]);
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", esc); };
  }, [open]);

  return (
    <div ref={root} style={{ position: "absolute", top: 16, left: 16, zIndex: 30, fontSize: 15 }}>
      <button type="button" aria-haspopup="listbox" aria-expanded={open} aria-disabled={locked} disabled={locked}
        title={locked ? "Scene can be changed before your first move or after the game" : "Change scene"}
        onClick={() => !locked && setOpen((o) => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", minWidth: 150, cursor: locked ? "not-allowed" : "pointer",
          background: PALETTE.black, color: PALETTE.matrixGreen, font: "inherit",
          border: `1px solid ${open ? PALETTE.pink : PALETTE.matrixGreen}`, borderRadius: 6, opacity: locked ? 0.4 : 1,
        }}>
        <span style={{ flex: 1, textAlign: "left" }}>{SCENE_LABELS[scene]}</span>
        <span aria-hidden style={{ fontSize: 11 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <ul role="listbox" aria-label="Scene" style={{
          listStyle: "none", margin: "6px 0 0", padding: 4, background: PALETTE.black,
          border: `1px solid ${PALETTE.matrixGreen}`, borderRadius: 6, minWidth: 190,
          boxShadow: `0 0 24px ${PALETTE.rustyPurple}`,
        }}>
          {SCENES.map((id) => {
            const active = id === scene;
            return (
              <li key={id} role="option" aria-selected={active}>
                <button type="button" onClick={() => { setOpen(false); onPick(id); }}
                  onPointerEnter={() => setHover(id)} onPointerLeave={() => setHover(null)}
                  style={{
                    display: "block", width: "100%", textAlign: "left", padding: "9px 10px", font: "inherit", cursor: "pointer",
                    border: 0, borderLeft: `3px solid ${active ? PALETTE.ruby : "transparent"}`, borderRadius: 3,
                    background: hover === id ? PALETTE.rustyPurple : "transparent",
                    color: active ? PALETTE.blindingWhite : PALETTE.matrixGreen,
                  }}>
                  {SCENE_LABELS[id]}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
