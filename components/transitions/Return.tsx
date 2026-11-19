// Scene -> space, 2.5 s. Spec §7.2.
// The board lifts off, the camera follows it up through the atmosphere (space swaps in
// at the flash), and the board settles into its floating place in space.
import gsap from "gsap";
import { DURATION_MS } from "@/config/chess.config";
import type { Flight } from "./flight";

export function returnTimeline(f: Flight, swapToSpace: () => void): gsap.core.Timeline {
  const T = DURATION_MS.ret / 1000;
  const at = (x: number) => x * T;
  const tl = gsap.timeline();
  const to = (vars: gsap.TweenVars, from: Partial<Flight>, start: number, end: number) =>
    tl.fromTo(f, from, { ...vars, duration: at(end - start), immediateRender: false }, at(start));

  to({ c: 1, ease: "power2.inOut" }, { c: 0 }, 0, 0.24);
  to({ h: 1, ease: "power2.in" }, { h: 0 }, 0, 0.34);                         // lift off
  to({ streaks: 1 }, { streaks: 0 }, 0.2, 0.34);
  to({ glow: 1, ease: "power2.in" }, { glow: 0 }, 0.24, 0.34);
  tl.call(() => { f.a = 1; f.p = 1; f.h = 0; swapToSpace(); }, undefined, at(0.34));
  to({ glow: 0, ease: "power2.out" }, { glow: 1 }, 0.34, 0.48);
  to({ streaks: 0 }, { streaks: 1 }, 0.36, 0.5);
  to({ a: 0, ease: "power3.out" }, { a: 1 }, 0.34, 0.92);                     // climb away from Earth
  to({ c: 0, ease: "power2.inOut" }, { c: 1 }, 0.64, 1);                      // settle into place
  return tl;
}
