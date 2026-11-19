# Intuition Chess - scaffold
Governing doc: Intuition Chess - Game Spec. Every file names the section it implements.

Phase 1 (Core Chess): server/chess/*, app/api/chess/*, components/board/*, components/ui/EndScreen.tsx
Phase 2 (Space Scene): components/space/*, components/camera/*
Phase 3 (Scenes + Menu): components/scenes/*, components/ui/SceneMenu.tsx
Phase 4 (Transitions): components/transitions/*

Run: npm install, then npm run dev, open http://localhost:3000/chess
Expected: black screen, green text "Intuition Chess — scaffold". Nothing else.
Rules: server checks every move; no Vault ID anywhere (games keyed to prize_tag); numbers live in config/ only.

## Phase 1 status: built
- Server: server/chess/{rules,engine,games,reward}.ts; routes app/api/chess/{new,move,resign}.
- Each game = start FEN + add-only UCI move log, rebuilt on every request (Spec §12).
- Data folder: set CHESS_DATA_DIR to a folder on the external drive (default ./data).
- STUBS to replace on merge into Bumphead:
  - server/platform/session.ts: getSession / getWheelFor (Part 2). Dev cookie session for now.
  - server/chess/reward.ts: awardSlaps (Slaps part). Writes data/slaps/balances.json + ledger.jsonl.
- Engine: stockfish@18 "lite-single" WASM (v16 package does not answer UCI under Node 22).
- Phase 1 camera is fixed at the default 35° angle; Phase 2 replaces it with OrbitCamera.

## Phase 2 status: built
- components/camera/OrbitCamera.tsx: drag = 360° orbit, ±10° tilt, glide-to-stop, 10 px tap rule, resets each new game. framing.ts: shared camera maths.
- components/space/SpaceScene.tsx + Stars, Nebula, Earth, Moon, SunFlare, GlowPool. Earth/Moon are placed by where they should sit on screen at the default angle, then stay fixed in the world.
- components/board/BoardCanvas.tsx: HDR pipeline (§12): bloom on values above 1.0, then ACES Filmic tone mapping. Reflection environment for gleams.
- Textures are generated in code (no image files yet); public/textures/ is still empty.
- All tunables: RENDER, SUN, BOARD_LIGHT, PIECE_RIM, GLOW_POOL, STARS, NEBULA, EARTH, MOON, CAMERA in config/chess.config.ts.

## Phase 3 status: built
- components/scenes/types.ts: the scene data shape. SceneFrame.tsx draws any scene from it
  (sky, fog, lighting override, props, movers, crowds, particles, lights). Scenes add data, never code (§12).
- Scene configs: Motorcycle, FootballGame, InClass, Swamp, TruckBedChase (.tsx files hold data only).
  kit.ts: shared low-poly prop builders (person, car, lamp, tree, desk, chair, building).
  index.ts: the registry. A new scene = one config object + one line there.
- Units are metres; SCENE_SCALE.unitsPerMeter places the scene around the board's anchor point.
- Tunables (speeds, light strengths, counts, blur, sway) in SCENE_TUNING; framing in CAMERA.scene*.
- components/ui/SceneMenu.tsx: top-left drop-down (§5). Locked from the first move to game end;
  remembered for the browser session (sessionStorage); closes on pick, outside tap or Escape.
- Scene framing: in scenes the camera stays 35° above the board but frames it low on screen and a
  little further back, so the scene shows. Space keeps the Phase 2 framing.
- Scene changes are instant until Phase 4 adds the dive / return / scene-to-scene flights.

## Phase 4 status: built
- components/transitions/Dive.tsx (3.5 s), Return.tsx (2.5 s), SceneToScene.tsx (1 s + 2 s, plus the
  0.5 s reduced-motion fade): each builds one GSAP timeline that tweens the flight values.
- components/transitions/flight.tsx: FlightDirector turns those values into the camera path each frame
  (pull back, ride behind the board towards Earth, drop onto the anchor); EntryStreaks = wind streaks.
- components/board/BoardCanvas.tsx: `scene` = where the board should be; it flies there by itself.
  FlightClock sets each timeline's playhead from the real clock every frame, so flights last exactly
  their set length on any device. The target scene is built (hidden) the moment the flight starts.
- ChessGame: `chosen` (menu, remembered for the session) vs `place` (where the board is). The game opens
  in Space; starting a game dives to the chosen scene (before move 1); Back to menu returns to Space;
  Play again never flies; picking Space while in Space does nothing.
- The game never pauses: board, pieces and server moves carry on during a flight.
- Shape of the flights (pull-back, chase offsets, lift height, glow, streaks): TRANSITION in config.
- Development builds expose window.__icFlightSpeed / __icFlights / __icFlightState for automated tests;
  production builds strip them.

## Online (Render)
- `render.yaml` deploys the real game: build `npm ci && npm run build`, start `npm start`
  (Next.js reads Render's PORT). Open `/chess` on the service URL.
- Free plan: sleeps when idle; disk is temporary, so games and STUB slap balances reset on restart.
  For lasting data, use a paid plan with a persistent disk and point CHESS_DATA_DIR at it
  (or replace the file storage when merging into Bumphead).
- Anyone with the URL can play: the dev session stub gives each browser its own test prize_tag.
