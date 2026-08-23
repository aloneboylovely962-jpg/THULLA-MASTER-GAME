# Phase 3 — Online Multiplayer

This phase adds the online room and real-time multiplayer foundation.

## Included
- Authoritative Node.js WebSocket server
- Six-digit room codes
- 3–5 player lobby
- Host and ready controls
- Private player hands
- Server-side turn/follow-suit validation
- Real-time state broadcast
- Disconnect/reconnect window
- Browser reconnect token

## Local setup

`npm install`

`npm run server`

In another terminal:

`npm run dev`

The client defaults to `ws://localhost:8080`. For deployment, set `VITE_SERVER_URL` to the WebSocket server URL.
