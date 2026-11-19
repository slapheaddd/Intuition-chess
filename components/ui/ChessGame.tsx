// Game flow (Spec §2.3): difficulty pick -> turn loop -> end screen -> play again / menu.
// The browser only shows the board and sends taps; the server decides everything (§11.3 rule 1).
"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SCENES } from "@/config/chess.config";
import type { SceneId } from "@/components/scenes";
import { PALETTE } from "@/config/palette";
import type { ApiError, Difficulty, GameView, PieceView, PromotionPiece } from "@/shared/chess";
import EndScreen from "./EndScreen";
import PromotionPicker from "./PromotionPicker";
import SceneMenu from "./SceneMenu";
import StartScreen from "./StartScreen";

const BoardCanvas = dynamic(() => import("@/components/board/BoardCanvas"), { ssr: false });

const ERRORS: Record<string, string> = {
  engine_unavailable: "The computer couldn't answer.",
  engine_no_move: "The computer couldn't answer.",
  game_not_found: "That game no longer exists.",
};

async function post<T>(url: string, body: unknown): Promise<{ ok: true; data: T } | { ok: false; err: ApiError }> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({ error: "bad_response" }));
    return res.ok ? { ok: true, data: data as T } : { ok: false, err: data as ApiError };
  } catch {
    return { ok: false, err: { error: "network" } };
  }
}

/** Cosmetic only: show the player's piece on its new square while the server answers. */
function previewMove(pieces: PieceView[], from: string, to: string, promotion?: PromotionPiece): PieceView[] {
  return pieces.filter((p) => p.square !== to).map((p) =>
    p.square === from ? { ...p, square: to, type: promotion ?? p.type } : p);
}

const SCENE_KEY = "intuition-chess.scene";   // §5.3: remembered for the browser session

function loadScene(): SceneId {
  try {
    const s = sessionStorage.getItem(SCENE_KEY);
    if (s && (SCENES as readonly string[]).includes(s)) return s as SceneId;
  } catch { /* storage blocked: fall back to Space */ }
  return "space";
}

export default function ChessGame() {
  // `chosen`: the scene in the menu, remembered for the session; the next game starts there (§5.3).
  // `place`: where the board is. The game opens in Space and returns there after each match
  // (§4, §7.2). Whenever `place` changes, the board flies there (§7).
  const [chosen, setChosen] = useState<SceneId>("space");
  const [place, setPlace] = useState<SceneId>("space");
  useEffect(() => { setChosen(loadScene()); }, []);
  const pickScene = useCallback((s: SceneId) => {
    // Picking Space while already in Space changes nothing; anything else flies there (§5.3, §7.4).
    setChosen(s);
    setPlace(s);
    try { sessionStorage.setItem(SCENE_KEY, s); } catch { /* ignore */ }
  }, []);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [view, setView] = useState<GameView | null>(null);
  const [shownPieces, setShownPieces] = useState<PieceView[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [promo, setPromo] = useState<{ from: string; to: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ text: string; retry: boolean } | null>(null);

  const show = useCallback((v: GameView) => { setView(v); setShownPieces(v.pieces); }, []);

  const start = useCallback(async (d: Difficulty) => {
    setBusy(true); setError(null); setSelected(null); setPromo(null);
    const r = await post<GameView>("/api/chess/new", { difficulty: d });
    setBusy(false);
    if (!r.ok) { setError({ text: "Couldn't start a game. Try again.", retry: false }); return; }
    setDifficulty(d);
    show(r.data);
    // §2.3 step 2: if the chosen scene isn't where the board is, the dive plays before move 1.
    // Play again keeps the same scene, so nothing flies (§7.2 step 5).
    setPlace(chosen);
  }, [show, chosen]);

  const handleFailure = useCallback((err: ApiError) => {
    if (err.view) show(err.view);
    else if (view) setShownPieces(view.pieces);
    if (err.error === "game_over") return;
    const retry = err.error === "engine_unavailable" || err.error === "engine_no_move" || err.error === "network";
    setError({ text: ERRORS[err.error] ?? "Something went wrong.", retry });
  }, [show, view]);

  const sendMove = useCallback(async (from: string, to: string, promotion?: PromotionPiece) => {
    if (!view) return;
    setSelected(null); setPromo(null); setError(null); setBusy(true);
    setShownPieces((ps) => previewMove(ps, from, to, promotion));
    const r = await post<GameView>("/api/chess/move", { gameId: view.gameId, from, to, promotion });
    setBusy(false);
    if (r.ok) show(r.data); else handleFailure(r.err);
  }, [view, show, handleFailure]);

  const retryComputer = useCallback(async () => {
    if (!view) return;
    setError(null); setBusy(true);
    const r = await post<GameView>("/api/chess/move", { gameId: view.gameId });
    setBusy(false);
    if (r.ok) show(r.data); else handleFailure(r.err);
  }, [view, show, handleFailure]);

  const resign = useCallback(async () => {
    if (!view) return;
    setSelected(null); setPromo(null);
    const r = await post<GameView>("/api/chess/resign", { gameId: view.gameId });
    if (r.ok) show(r.data); else handleFailure(r.err);
  }, [view, show, handleFailure]);

  const backToMenu = useCallback(() => {
    setView(null); setShownPieces([]); setSelected(null); setPromo(null); setError(null);
    setPlace("space");   // §2.3 step 9 / §7.2: the return plays if the board is in a scene
  }, []);

  const canAct = !!view && view.status === "active" && view.turn === "w" && !busy;
  const targets = useMemo(() => (selected && view ? (view.legal[selected] ?? []) : []), [selected, view]);

  const onSquareTap = useCallback((sq: string) => {
    if (!canAct || !view) return;
    const target = targets.find((t) => t.to === sq);
    if (selected && target) {
      if (target.promotion) setPromo({ from: selected, to: sq });
      else void sendMove(selected, sq);
      return;
    }
    setSelected(sq !== selected && view.legal[sq]?.length ? sq : null);
  }, [canAct, view, targets, selected, sendMove]);

  const canvas = (
    <BoardCanvas pieces={shownPieces} selected={selected} targets={targets.map((t) => t.to)}
      onSquareTap={onSquareTap} resetKey={view?.gameId ?? null} scene={place} />
  );
  // §5.3: the scene can change before the player's first move or after the game ends.
  const menuLocked = !!view && view.status === "active" && (view.lastMove !== null || busy);
  const menu = <SceneMenu scene={chosen} locked={menuLocked} onPick={pickScene} />;

  if (!view) {
    return (
      <main style={{ position: "relative", width: "100vw", height: "100dvh", overflow: "hidden", background: PALETTE.black }}>
        {canvas}
        <StartScreen onStart={start} busy={busy} />
        {menu}
        {error && <Banner text={error.text} />}
      </main>
    );
  }

  const status = view.status === "ended" ? "" : busy || view.turn === "b" ? "Computer thinking…" : view.inCheck ? "Check — your move" : "Your move";

  return (
    <main style={{ position: "relative", width: "100vw", height: "100dvh", overflow: "hidden", background: PALETTE.black }}>
      {canvas}
      {menu}
      <div style={{ position: "absolute", bottom: 20, left: 0, right: 0, textAlign: "center", pointerEvents: "none", textShadow: "0 0 6px #000",
        color: view.inCheck && !busy ? PALETTE.blindingWhite : PALETTE.matrixGreen }}>{status}</div>
      {view.status === "active" && (
        <button className="ic-btn ic-secondary" onClick={resign}
          style={{ position: "absolute", top: 16, right: 16, minWidth: 0, padding: "8px 14px", zIndex: 5 }}>Resign</button>
      )}
      {error && <Banner text={error.text} action={error.retry && view.status === "active" ? { label: "Retry", onClick: view.turn === "b" ? retryComputer : () => setError(null) } : undefined} />}
      {promo && <PromotionPicker onPick={(p) => sendMove(promo.from, promo.to, p)} onCancel={() => { setPromo(null); setSelected(null); }} />}
      {view.status === "ended" && (
        <EndScreen view={view} busy={busy} onPlayAgain={() => difficulty && start(difficulty)} onMenu={backToMenu} />
      )}
    </main>
  );
}

function Banner({ text, action }: { text: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div role="alert" style={{ position: "absolute", bottom: 56, left: 16, right: 16, zIndex: 25, display: "flex", gap: 12, alignItems: "center",
      justifyContent: "center", flexWrap: "wrap", color: PALETTE.blindingWhite, background: PALETTE.black,
      border: `1px solid ${PALETTE.ruby}`, borderRadius: 8, padding: "10px 14px" }}>
      <span>{text}</span>
      {action && <button className="ic-btn" style={{ minWidth: 0, padding: "6px 12px" }} onClick={action.onClick}>{action.label}</button>}
    </div>
  );
}
