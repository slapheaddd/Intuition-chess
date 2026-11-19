// 1 s out + 2 s in. Spec §7.3.
// The board lifts out of the current scene and back up through the atmosphere (1 s), then
// dives straight into the new scene (2 s). One continuous motion: no stop in space.
// Also holds the reduced-motion fallback (§7.4): no flight, a 0.5 s fade.
import gsap from "gsap";
import { DURATION_MS, TRANSITION } from "@/config/chess.config";
import type { Flight } from "./flight";

export function sceneToSceneTimeline(f: Flight, swapToSpace: () => void, swapToScene: () => void): gsap.core.Timeline {
  const OUT = DURATION_MS.sceneOut / 1000, IN = DURATION_MS.sceneIn / 1000;
  const tl = gsap.timeline();
  const to = (vars: gsap.TweenVars, from: Partial<Flight>, start: number, end: number) =>
    tl.fromTo(f, from, { ...vars, duration: end - start, immediateRender: false }, start);
  const peak = 1 - TRANSITION.sceneToSceneRise;

  // Out (1 s): lift off and break back out of the atmosphere.
  to({ c: 1, ease: "power2.inOut" }, { c: 0 }, 0, OUT * 0.35);
  to({ h: 1, ease: "power2.in" }, { h: 0 }, 0, OUT * 0.5);
  to({ streaks: 1 }, { streaks: 0 }, OUT * 0.3, OUT * 0.5);
  to({ glow: 1, ease: "power2.in" }, { glow: 0 }, OUT * 0.35, OUT * 0.5);
  tl.call(() => { f.a = 1; f.p = 1; f.h = 0; swapToSpace(); }, undefined, OUT * 0.5);
  to({ glow: 0, ease: "power2.out" }, { glow: 1 }, OUT * 0.5, OUT * 0.65);
  to({ streaks: 0 }, { streaks: 1 }, OUT * 0.55, OUT * 0.75);
  to({ a: peak, ease: "power2.out" }, { a: 1 }, OUT * 0.5, OUT);
  // In (2 s): straight back down into the new scene.
  to({ a: 1, ease: "power2.in" }, { a: peak }, OUT, OUT + IN * 0.425);
  to({ streaks: 1 }, { streaks: 0 }, OUT + IN * 0.3, OUT + IN * 0.425);
  to({ glow: 1, ease: "power2.in" }, { glow: 0 }, OUT + IN * 0.35, OUT + IN * 0.425);
  tl.call(() => { f.h = 1; swapToScene(); }, undefined, OUT + IN * 0.425);
  to({ glow: 0, ease: "power2.out" }, { glow: 1 }, OUT + IN * 0.425, OUT + IN * 0.55);
  to({ streaks: 0 }, { streaks: 1 }, OUT + IN * 0.45, OUT + IN * 0.6);
  to({ h: 0, ease: "power3.out" }, { h: 1 }, OUT + IN * 0.425, OUT + IN);
  to({ c: 0, ease: "power2.inOut" }, { c: 1 }, OUT + IN * 0.6, OUT + IN);
  return tl;
}

/** Reduced motion (§7.4): skip the flight; fade out and back in over 0.5 s, swapping at the midpoint. */
export function fadeTimeline(el: HTMLElement, swap: () => void): gsap.core.Timeline {
  const half = DURATION_MS.reducedFade / 2000;
  const tl = gsap.timeline();
  tl.fromTo(el, { opacity: 0 }, { opacity: 1, duration: half, ease: "power1.in", immediateRender: false }, 0);
  tl.call(swap, undefined, half);
  tl.fromTo(el, { opacity: 1 }, { opacity: 0, duration: half, ease: "power1.out", immediateRender: false }, half);
  return tl;
}
