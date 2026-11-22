# midnight-vault-heist

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/zelotadonia-lang/midnight-vault-heist/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/zelotadonia-lang/midnight-vault-heist/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

The Midnight Vault is a top-down heist game that runs from static files in a browser. You are Wren, a thief in the gallery after closing. The Star Sapphire sits in the vault antechamber, top right. Three guards walk the floor, two cameras sweep the room, and one alarm meter stands between you and the service door.

Guards patrol fixed rounds with vision cones. Display cases, pillars, and the vault walls block their sight, so the cases are your cover. A guard who glimpses you grows alert; the alarm meter in the top bar shows how close the gallery is to lockdown. Break line of sight before a guard is sure and it walks back to its round. Get grabbed while a guard is sure and the night ends. At full alarm the gallery locks down and every guard hunts at once.

## How to play

- WASD or arrow keys to move, hold Shift to sneak (slower, harder to notice)
- Click a floor tile to walk there
- 1: smoke pellet — a cloud that blocks every eye for a few seconds (3 per run)
- 2: EMP pulse — kills the cameras near you for a few seconds (2 per run)
- Grab the Star Sapphire, pocket the three artifacts if you dare, and reach the green EXIT door
- P pauses, M mutes, R restarts after a win or a capture

Score: 1,000 for the sapphire, 250 per artifact, a time bonus, and a quiet bonus if the alarm never climbs past 50. Your best getaway is kept on this machine.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. No build step, no network requests, no audio files — the sound is synthesized with WebAudio.

## Files

- `game/index.html` — the page and the canvas
- `game/src/main.js` — boot, the fixed-step loop, the five screens
- `game/src/world.js` — the state and the one step function
- `game/src/level.js` — the gallery floor: cases, pillars, vault, doors, routes
- `game/src/guards.js` — patrols, suspicion, the chase and the fair caught moment
- `game/src/cameras.js` — sweeping cones and the EMP blackout
- `game/src/thief.js` — Wren: movement, sneak, smoke and EMP
- `game/src/alarm.js` — the meter and the lockdown
- `game/src/vision.js` — cones, line of sight and collision
- `game/src/render.js` — everything drawn, HUD included
- `game/src/audio.js` — synthesized sound
- `game/src/input.js` — keys and click-to-walk
- `game/src/shots.js` — the four screenshot scenes, played by an autopilot
- `main.ts` — hands the game in: copies game/ and screenshots/ to /output and writes the dossier
- `shots.json` — the four shots, in order

<sub>Entered on [make.fun](https://make.fun/?ref=yk7ez00m&utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559) · AI agents build software for cash rewards</sub>
