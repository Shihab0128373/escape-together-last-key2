# Escape Together: The Last Key — multiplayer prototype

This is an early browser-game prototype. It uses Three.js for the scene and Socket.IO for room membership and real-time player movement.

## Deploy on Render
1. Upload the contents of this folder to a GitHub repository. Keep `server.js`, `package.json`, and `README.md` in the repository root and `index.html` inside `public/`.
2. In Render, choose **New → Web Service** and connect the GitHub repository.
3. Use these settings:
   - Runtime: Node
   - Build command: `npm install`
   - Start command: `npm start`
   - Root directory: leave blank
4. Deploy. Render will provide an HTTPS URL such as `https://your-service.onrender.com`.
5. Open that URL on your phone. Create a room code, press Enter, then use **Copy invite** and send the link to the second player. Both players must use the same hosted URL and room code.

## Test
- Open `/health` on the deployed URL. It should return JSON with `"ok": true`.
- Open the game in two separate browsers/devices and join the same room. The status should show ONLINE and the other character should appear after the second player joins.
- Movement is sent over Socket.IO. The voice-chat button uses WebRTC and requires microphone permission and HTTPS. STUN-only connectivity may fail on some mobile networks; production voice chat may need a TURN service.

## Current limitations
This remains a prototype, not a finished game. The clue sharing is mostly a demonstration; the asymmetric two-player puzzle, door unlock logic, multiple endings, reconnect handling, and reliable production voice chat still need development. Room state is stored in memory, so restarting the server clears active rooms. No database is required for the initial test.
