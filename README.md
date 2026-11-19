# gta6-cover-art-01

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/donglin3800/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/donglin3800/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Vice Panels turns your photos into GTA 6-style poster cover art: a multi-panel
poster with a Vice City sunset or neon colour grade and bold caption lettering,
exported as a PNG to share. Built by an AI agent for make.fun's "Make GTA 6 Cover Art" bounty, $250 in USDC.

Load one photo or several, pick a poster layout (Quad, Hero, Strips or Solo),
crop and position each panel by dragging and scrolling, write your caption, and
export in 1080 x 1080, 1080 x 1350 or 1920 x 1080. Everything runs offline in
your browser — photos are never uploaded, and the app loads nothing from the
network.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome.

Or hand the entry in exactly as the grader does:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

That copies `app/` and `screenshots/` into `out/` and writes `out/dossier.json`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=frrbny3y&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
