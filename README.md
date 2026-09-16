# Build with Manon Mani

**Version:** 0.1.0-alpha (**Alpha pre-release**). Original RTS. Local 1v1 vs AI only — not Age of Empires, not Microsoft IP.

KATHIREZA: this is how you run the Alpha on a Mac.

## Need

- **Node.js 20 or 22** (`node -v`). Install from [nodejs.org](https://nodejs.org) or `brew install node`.
- Git, and this repo cloned once GitHub exists. Until then, use the Live desktop from the agent session.

## Install, dev, play

```bash
cd /path/to/build-with-manon-mani
npm ci
npm run dev
```

Open [http://127.0.0.1:43147](http://127.0.0.1:43147) (port **43147**, not 3000).

1. Skirmish
2. **Vast Mere** is selected by default (huge plate, pop 100). Click any other named plate — the preview and March URL must change.
3. Pick a rival persona, then **March**.
4. WASD pan, wheel zoom, left-select, right-order. Relics use the clam-and-pearl icon.

```bash
npm run start          # after npm run build, still port 43147
npm run lint
npm run typecheck
npm test
npm run playtest       # short headless games (CI uses this)
npm run benchmark      # wall-clock hour: BENCH_MINUTES=60 npm run benchmark
```

## What Alpha includes

- Playable skirmish on six maps (Lost Cartograph stays sealed).
- Nine AI personas (challenging through random-dominant).
- Observatory FPS / sim / input latency, posted to `/api/obs` for the tuner.
- Pearl flourish (center of screen, sparkle top-right) with original sea/bird audio at match start and end.

## CI/CD

GitHub Actions (`.github/workflows/alpha.yml`): lint, typecheck, unit tests, headless playtest, production build. Tag `v0.1.0-alpha` also uploads the Next build artifact. The hour ML job is **manual**, not PR CI.

If this Project is still `agent_temp` with no GitHub host, the workflow files are in the tree but no PR can open until you create a GitHub repo.
