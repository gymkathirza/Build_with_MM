# Build with Manon Mani

**Version:** 0.1.0-alpha (**Alpha pre-release**). Original RTS. Local 1v1 vs AI only — not Age of Empires, not Microsoft IP.

[![Alpha CI](https://github.com/gymkathirza/Build_with_MM/actions/workflows/alpha.yml/badge.svg)](https://github.com/gymkathirza/Build_with_MM/actions/workflows/alpha.yml)

Clone: [github.com/gymkathirza/Build_with_MM](https://github.com/gymkathirza/Build_with_MM)

## Mac local (KATHIREZA)

Need **Node.js 20 or 22** (`node -v`). From [nodejs.org](https://nodejs.org) or `brew install node`.

```bash
git clone https://github.com/gymkathirza/Build_with_MM.git
cd Build_with_MM
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

GitHub Actions (`.github/workflows/alpha.yml`) on every **push** and **pull request**:

`npm ci` → lint → `tsc --noEmit` → unit tests → short headless playtest → production build.

Tag `v0.1.0-alpha` also uploads the Next `.next` build artifact. The hour ML job is **manual**, not PR CI.

## Deploy (optional)

**Do not use GitHub Pages as the app host.** The Observatory posts to `/api/obs`, which Pages cannot run.

**Vercel Hobby** is the recommended free host for this Next.js app (clone this repo, Framework Preset: Next.js, no extra env required for Alpha). itch.io can wait until there is a static HTML5 export.

## License

MIT. See `LICENSE`.
