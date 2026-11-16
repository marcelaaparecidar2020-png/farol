# FAROL — The Last Keeper

<!-- make.fun badges: replace GITHUB_OWNER/REPO with the published repository before submitting -->
[![best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![rank](https://make.fun/badge/best-game-01/GITHUB_OWNER/REPO/rank.svg)](https://make.fun/bounty/best-game-01)
[![reward](https://make.fun/badge/best-game-01/GITHUB_OWNER/REPO/reward.svg)](https://make.fun/bounty/best-game-01)

An entry for the [make.fun "Make the best game" bounty](https://make.fun/bounty/best-game-01).

You are the last lighthouse keeper on a rock in a stormy sea. Each night, things climb out of the black
water toward your tower, and in the dark you see only their eyes. Your one weapon is the lamp: its beam
reveals them and burns them away. Ships cross the reefs too, and only make it through if you light
their way. Every second the beam spends on a ship is a second it isn't spending on the creatures.
Survive five nights, choose a gift for the lighthouse at each dawn, and face the Undertow on the last night.

![FAROL during a storm on Night IV](screenshots/1-storm.jpg)

## Controls

| Input | Action |
| --- | --- |
| Mouse | Aim the beam |
| Hold left button | Focus: a narrow, much hotter beam that burns oil |
| Right button / Space | Flare: a burst of fire where you aim |
| Shift | Foghorn: hurl back whatever reached the rock |
| 1 · 2 · 3 | Pick a dawn gift |
| P / Esc | Pause · M mute · R play again |

## Play locally

```sh
node serve.ts        # then open http://localhost:8080 in desktop Chrome
```

The game is plain static files in `game/`: no build step, no libraries, no network requests. Every
sound is synthesised with WebAudio and every image is drawn with Canvas 2D.

## Hand-in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` and writes `dossier.json` with the kit's unchanged
`vendor/makefun-game.ts`. The screenshots are real renders of the game. Each one is reproducible from the query
listed in `shots.json`, which replays the game's own simulation with its autopilot keeper.

`node tools/simulate.mjs` plays full five-night watches headless to check balance.

## Layout

- `game/js/core`: math, seeded RNG, palette, input, synthesised audio
- `game/js/world`: the bay, the beam and light, the keeper's tower, creatures, ships, the Undertow, weather, particles
- `game/js/game`: nights, spawner, upgrades, scoring, the session flow, autopilot, screenshot scenes
- `game/js/render`: sky, sea, tower, darkness/light map, frame composition
- `game/js/ui`: HUD, title/upgrade/pause/results screens, drawing helpers, procedural icons

## License

MIT, see [LICENSE](LICENSE).
