// All tunable numbers. Spec §11.3 rule 3. Nothing hard-coded elsewhere.
export const SKILL = { easy: 1, medium: 8, hard: 15 } as const;          // §2.2
export const REWARD_HUNDREDTHS = { win: 1000, loss: 1000, draw: 1000 };   // §8 placeholder
export const DURATION_MS = { dive: 3500, ret: 2500, sceneOut: 1000, sceneIn: 2000, reducedFade: 500 }; // §7
export const CAMERA = {                                                                                // §4.3
  defaultElevationDeg: 35, tiltRangeDeg: 10, tapThresholdPx: 10,
  distance: 11.5,           // minimum distance from board centre (no zoom)
  fovDeg: 45, near: 0.1, far: 6000,
  fitMargin: 1.06,          // on narrow (portrait) screens, back off until the whole board fits
  orbitDegPerPx: 0.4,       // horizontal drag -> orbit
  tiltDegPerPx: 0.15,       // vertical drag -> tilt
  followRate: 9,            // how quickly the camera catches up with the finger (per second)
  inertiaDecay: 3.2,        // how quickly a flick glides to a stop (per second)
  maxSpinDegPerSec: 600,    // cap on flick speed
  // In the five scenes (§6) the camera stays 35° above the board but frames it low on screen,
  // so the scene shows above it. Not a zoom: fixed framing, eased when the scene changes.
  sceneDistanceScale: 1.4,  // scenes: camera at least distance × this (phones already sit further back)
  sceneAimMargin: 0.9,      // how close to the bottom edge the board's near edge sits (1 = touching)
  framingRate: 3,           // how quickly framing eases between Space and a scene (per second)
} as const;
export const SCENES = ["space","motorcycle","football","class","swamp","truck"] as const;             // §5.2

// ---- Phase 1 additions ----

// §2.2 Stockfish (server). "lite-single" = Stockfish 18 Lite, single-threaded WASM (~7 MB).
export const ENGINE = {
  flavor: "lite-single",
  moveTimeMs: 400,          // think time per computer move
  readyTimeoutMs: 15000,    // max wait for the engine to load / answer isready
  searchTimeoutMs: 15000,   // max wait for a bestmove
} as const;

// §2.3 Game flow / UI timing.
export const FLOW = {
  slapCountUpMs: 1200,        // §8 end-screen count-up animation
} as const;

// §3.4 Board geometry (world units; one square = squareSize).
export const BOARD = {
  squareSize: 1,
  tileHeight: 0.12,
  tileInset: 0.94,          // top face size relative to the square (faceted chamfer)
  frameWidth: 0.42,
  frameHeight: 0.22,
  frameBevel: 0.06,
  textureSize: 256,         // px per square texture
  textureVariants: 6,       // distinct cosmic textures per colour
  starsPerTexture: 70,
} as const;

// §3.4 Pieces.
export const PIECES = {
  scale: 0.42,              // piece height multiplier relative to a square
  radialSegments: 8,        // low-poly facets around each piece
  whiteGlow: 0.18,          // emissive strength, white pieces
  blackGlow: 0.12,          // emissive strength, black pieces
} as const;

// §3.4 Move highlights.
export const HIGHLIGHT = {
  pulseHz: 1.1,
  minOpacity: 0.18,
  maxOpacity: 0.6,
  beamHeight: 3.2,
  beamRadius: 0.3,
  beamOpacity: 0.35,
  glow: 1.8,                // >1 = HDR, so highlights catch the bloom (§3.3)
} as const;

// ---- Phase 2: Space scene (§3.3, §4, §12 "HDR + ACES Filmic + bloom on the brightest pixels") ----

export const RENDER = {
  dprMax: 2,
  bloomThreshold: 1.0,      // only HDR values above this bloom
  bloomSmoothing: 0.3,
  bloomIntensity: 0.85,
  bloomRadius: 0.75,
  envIntensity: 0.4,        // reflections for specular gleams
} as const;

// Sun: off-screen, low, behind-right at the default view -> long shadows across the board.
export const SUN = {
  azimuthDeg: 110,          // 0 = towards the default camera, 90 = screen right
  elevationDeg: 22,
  intensity: 3.2,
  distance: 30,
  shadowMapSize: 2048,
  shadowExtent: 10,
  shadowBias: -0.0004,
  flareFovDeg: 35,          // flare shows when the camera faces within this many degrees of the sun
  flareSize: 0.22,          // relative to screen height
  flareStrength: 1.5,
} as const;

export const BOARD_LIGHT = {
  // Piece rim light (green on White, ruby on Black) comes from the pieces' own material: PIECE_RIM.
  rimPurple: 0.4, rimPurplePosition: [-8, 2, 0] as const,    // rusty purple board-edge light
  earthGlow: 0.5,           // soft blue light from Earth's side
  nebulaGlow: 0.18,         // soft purple fill from the nebula
  ambient: 0.05,
} as const;

export const PIECE_RIM = {
  whitePower: 2.4, whiteStrength: 1.4,   // green fresnel edge on White
  blackPower: 2.0, blackStrength: 1.8,   // ruby/purple fresnel edge on Black
  clearcoat: 0.8, clearcoatRoughness: 0.15,
} as const;

export const GLOW_POOL = { y: -0.9, size: 12, strength: 0.22 } as const;   // §4.2

export const STARS = {
  count: 4000,
  radius: 1500,
  minSize: 1.0, maxSize: 2.4,          // px (before device pixel ratio)
  brightFraction: 0.015, brightSize: 4.2,
  baseBrightness: 1.1, brightBoost: 3.5,
  twinkleAmount: 0.3, twinkleSpeed: 1.7,
  pulseAmount: 0.45, pulseSpeed: 0.45,
} as const;

export const NEBULA = {
  radius: 2000,
  strength: 0.5,
  driftSpeed: 0.006,
  bandWidth: 0.28,
} as const;

// Earth and Moon are placed by where they should appear at the default camera angle
// (screen position in -1..1 units), then stay fixed in the world (§4.1).
export const EARTH = {
  screenX: -1.0, screenY: -1.05,       // centre just off the bottom-left corner -> about a quarter shows
  sizeOfView: 0.95,                    // angular radius relative to the narrower half-field-of-view
  distance: 600,
  detail: 20,                          // icosphere subdivisions: low-poly coastlines
  noiseScale: 1.7, landLevel: 0.06,
  cloudLift: 1.012, cloudOpacity: 0.6, cloudTextureWidth: 512, cloudSpeed: 0.006,  // rad/s
  atmosphereLift: 1.05, atmosphereStrength: 1.5,
  atmosphereBlueGain: 9,               // palette deep blue is very dark; lift it so the sunlit limb reads blue
} as const;

export const MOON = {
  screenX: 0.72, screenY: 0.72,
  sizeOfView: 0.075,
  distance: 800,
  detail: 4,
  craters: 45, craterDepth: 0.07,
  glow: 0.08, haloScale: 2.2, haloStrength: 0.12,
} as const;

// ---- Phase 3: Scenes + menu (§5, §6, §12 "data-driven scenes") ----
// Scene layouts (where props sit) live in each scene's config object in components/scenes/.
// The numbers people tune -- speeds, light strengths, counts, blur, sway -- live here.

export const SCENE_SCALE = { unitsPerMeter: 20 } as const;   // the board is ~0.44 m across

export const SCENE_TUNING = {
  propGlow: 1,                         // multiplier on every glowing prop (bulbs, screens, lightbars)
  dof: { focusRange: 9, bokehScale: 3.2 },   // §6.3/§6.4 depth-of-field blur (world units around the board)
  motorcycle: { speedMps: 18, oncomingMps: 32, moon: 0.9, streetLight: 2.2, oncomingLight: 3.5, windStreaks: 45 },
  football: { crowdBobM: 0.06, crowdHz: 1.3, floodlights: 2.4, crowdGlow: 1.3 },
  class: { daylight: 2.6, fluorescent: 1.5, teacherWriteHz: 0.8 },
  swamp: { sunset: 1.7, waterGreen: 1.6, fireflies: 45, fogDriftMps: 0.25 },
  truck: { speedMps: 24, strobe: 2.2, strobeHz: 2.4, streetLight: 2, swayMaxDeg: 2, swayHz: 0.55, policeWeaveM: 0.7 },
} as const;

// ---- Phase 4: Transitions (§7). Lengths are DURATION_MS above; this is the flight's shape. ----
export const TRANSITION = {
  pullBackScale: 3.2,       // §7.1 step 2: camera pulls back to this × its distance, revealing space
  chaseBack: 16,            // §7.1 step 3: camera rides this far behind the board...
  chaseUp: 7,               // ...and this far above it, looking past it towards Earth
  chaseLook: 60,
  surfaceGap: 0.015,        // the dive ends this fraction of Earth's radius above the surface
  liftMeters: 8,            // §7.1 step 5 / §7.2 step 1: how high above the scene the board flies in/out
  aboveBack: 7, aboveUp: 24,          // camera above the falling board, in scene units
  sceneToSceneRise: 0.25,   // §7.3: how far back out towards space the board climbs before diving again
  glowPeak: 0.9,            // §7.1 step 4: strength of the orange atmosphere flash (0..1)
  streakCount: 90, streakLength: 7, streakSpeed: 240,   // wind streaks during entry
} as const;
