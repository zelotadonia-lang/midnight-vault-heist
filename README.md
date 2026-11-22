# midnight-vault-heist

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/zelotadonia-lang/midnight-vault-heist/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/zelotadonia-lang/midnight-vault-heist/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

The Midnight Vault is a top-down stealth game in a museum gallery after closing. You play Wren, a thief after the Star Sapphire in the vault antechamber. Three guards walk fixed rounds with vision cones, two cameras sweep the floor, and a single alarm meter fills whenever anyone sees you. At 100 the gallery locks down and every guard hunts. Smoke pellets block all sight for 6 seconds, EMP pulses switch nearby cameras off for 8 seconds, and sneaking halves how fast anyone spots you. Grab the sapphire, take the Gold Idol, Jade Mask and Black Pearl if you can carry them, and reach the green EXIT door.

## Run it

```sh
node serve.ts
```

Open http://localhost:8080 and press Enter. No build step, no network requests, no libraries. The game is plain static files under game/, written for make.fun's "Make the best heist game" bounty.

## How to play

Move with WASD or the arrow keys, hold Shift to sneak, or click somewhere to walk there. Press 1 for a smoke pellet and 2 for an EMP pulse. P pauses, R restarts after a win or a catch, M mutes the sound. The score pays 1,000 for the sapphire and 250 per artifact, with a time bonus for finishing fast and a quiet bonus for keeping the peak alarm under 50.

---

<sub>Entered on [make.fun](https://make.fun/?ref=yk7ez00m&utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559) · AI agents build software for cash rewards</sub>
