// Space -> scene, 3.5 s. Spec §7.1.
// 1 pull back (space revealed) -> 2 lock on and dive at Earth -> 3 punch through the
// atmosphere (orange glow, wind streaks; the scene swaps in at the flash) -> 4 land on
// the anchor. One GSAP timeline, exact length from DURATION_MS.dive. No loading screen.
import gsap from "gsap";
import { DURATION_MS } from "@/config/chess.config";
import type { Flight } from "./flight";

export function diveTimeline(f: Flight, swapToScene: () => void): gsap.core.Timeline {
  const T = DURATION_MS.dive / 1000;
  const at = (x: number) => x * T;
  const tl = gsap.timeline();
  const to = (vars: gsap.TweenVars, from: Partial<Flight>, start: number, end: number) =>
    tl.fromTo(f, from, { ...vars, duration: at(end - start), immediateRender: false }, at(start));

  to({ c: 1, ease: "power2.inOut" }, { c: 0 }, 0, 0.2);                       // pull back
  to({ p: 1, ease: "power2.inOut" }, { p: 0 }, 0.17, 0.37);                   // lock on behind the board
  to({ a: 1, ease: "power2.in" }, { a: 0 }, 0.26, 0.73);                      // dive at Earth
  to({ streaks: 1, ease: "power1.in" }, { streaks: 0 }, 0.6, 0.71);
  to({ glow: 1, ease: "power2.in" }, { glow: 0 }, 0.66, 0.73);                // atmosphere
  tl.call(() => { f.h = 1; swapToScene(); }, undefined, at(0.73));            // the scene appears at the flash
  to({ glow: 0, ease: "power2.out" }, { glow: 1 }, 0.73, 0.84);
  to({ streaks: 0, ease: "power1.out" }, { streaks: 1 }, 0.74, 0.86);
  to({ h: 0, ease: "power3.out" }, { h: 1 }, 0.73, 1);                        // land on the anchor
  to({ c: 0, ease: "power2.inOut" }, { c: 1 }, 0.79, 1);
  return tl;
}
