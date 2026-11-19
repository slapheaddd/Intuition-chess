# Phone preview build

A browser-only build of Intuition Chess for trying it on a phone without a server.
It is NOT the real game: moves are checked in the browser (not on the server),
no slaps are awarded and nothing is saved.

- `localServer.ts` answers the three `/api/chess/*` calls inside the browser, using the
  same `server/chess/rules.ts` and the same config.
- `engine.ts` runs Stockfish 18 Lite in a Web Worker (Skill Levels from config), with a
  simple fallback opponent if the worker can't start.
- `build.mjs` bundles everything into one page: `npm run build:preview` -> `preview/dist/`.
