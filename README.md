# Snug

An endless block-fitting game built with [Catalyst](https://catalyst.1mg.com). Drag pieces onto an 8×8 board, fill a row or a column to clear it, and keep going until nothing in the tray fits.

One codebase ships as a server-rendered website, an installable offline web app, and Android and iOS apps.

```bash
npm install
npm start          # dev server on http://localhost:3012
npm run build      # production build
npm run serve      # serve the production build
npm run buildApp:android
npm run buildApp:ios
```

## How the game works

- `src/js/game/engine.js` is the whole game as pure functions over a plain state object, with no React in it. It runs on the server (first render, `/api/deal`) and in the browser.
- Pieces come from 15 families (41 shapes with rotations). They cannot be rotated by the player.
- Each tray of three is dealt from a seed. Early on the dealer retries until the three pieces can all be placed in some order; it gets fewer retries as the score climbs, and awkward pieces become more common. A tray never arrives with nothing playable.
- Scoring: 1 per block, 10 / 30 / 60 / 100 for 1 to 4 lines at once, multiplied by the streak of back-to-back clears. A streak survives two pieces without a clear. Emptying the board adds 150.
- The game in progress, past scores and settings live in `localStorage` (`src/js/game/storage.js`). There are no accounts.
- Sound effects are square-wave chiptune, synthesised with the Web Audio API in `src/js/game/sound.js`, so there are no audio files.
- The look is a retro arcade cabinet: pixel type (Press Start 2P), square bevelled blocks, hard shadows, stepped animation and faint scanlines.

## Catalyst features used

| Feature | Where |
| --- | --- |
| SSR with `serverFetcher` / `clientFetcher` | The Play fetcher picks a seed, so the first paint is a real board with a real opening tray. |
| `split()` routes with inlined CSS | `src/js/routes/index.js` |
| `setMetaData` + `MetaTag` | Titles, description and Open Graph tags per page. |
| `offline: true` routes | The service worker (web) and route cache (native) keep every page playable offline. |
| Server middlewares | `server/server.js`: `/api/health` and `/api/deal/:seed`, which runs the same engine as the browser. |
| Server lifecycle hooks | `server/index.js` |
| `useHapticFeedback` | A tap when a piece lands, stronger when lines clear. |
| `useSafeArea`, `useNetworkStatus`, `useDeviceInfo` | Shell padding, the offline badge and the "Under the hood" panel on the How page. |
| `useNativeTransition` | Tab changes. |
| WebMCP `useTool` | `snug_read_board`, `snug_place_piece`, `snug_new_game`: an agent can play by the same rules. |
| HTML splash screen, edge to edge | `public/splashscreen.html`, `config/config.json` |

## Deploying

`render.yaml` is a Render Blueprint for the free plan. Catalyst listens on `NODE_SERVER_PORT` from `config/config.json` (3012), so the Blueprint sets `PORT` to match.
