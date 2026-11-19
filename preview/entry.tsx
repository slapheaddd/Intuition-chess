// Phone preview entry: the real game UI and 3D, with the server swapped for an in-browser stand-in.
import { createRoot } from "react-dom/client";
import ChessGame from "@/components/ui/ChessGame";
import { PALETTE } from "@/config/palette";
import { installLocalServer } from "./localServer";
import { warmUp } from "./engine";

installLocalServer();
warmUp();

function PreviewTag() {
  return (
    <div style={{ position: "fixed", top: "calc(60px + env(safe-area-inset-top, 0px))", left: "max(16px, env(safe-area-inset-left, 0px))",
      zIndex: 40, pointerEvents: "none", fontSize: 11, letterSpacing: "0.04em", color: PALETTE.pink,
      background: "rgba(0,0,0,0.6)", border: `1px solid ${PALETTE.rustyPurple}`, borderRadius: 4, padding: "3px 7px" }}>
      PREVIEW · no slaps awarded
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<><ChessGame /><PreviewTag /></>);
