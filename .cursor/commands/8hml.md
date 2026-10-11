---
description: 8-hour Vast Mere observability+ML loop
---

# /8hml

Wall-clock **≥ 480 minutes** of observability + ML on **Vast Mere**. Do not skip the eight hours.

## Meaning

1. Improve **graphics, UX, animation, characters, buildings, landscapes, and tactics**.
2. From the repo root, run `npm run ml:8h` if that script exists, else `BENCH_MINUTES=485 npm run benchmark`. Leave it until it prints `Done`. Do not skip, kill, or shorten the window.
3. Write the store report at `/cursor/stores/bc-8367d7dc-4ef2-486d-b05c-4dfaf0d7f1ab/docs/benchmark.md` when that store is mounted.
4. Open or update a pull request. **Do not merge** unless asked.
5. If `gh` is logged out, print a GitHub device code immediately (`https://github.com/login/device`).
6. Work on this cloud checkout and branch. Do not use the user's Mac.
7. After the window: commit the tuner snapshot (`src/lib/ml/tuned.json`) plus any art/tactics; do not commit `src/lib/ml/benchmark-latest.json`. Push, then return the command name, PR URL, head SHA, headlines, and bench start confirmation.
8. Leave a dev / Observatory server on an uncommon port if useful (`:43147` via `npm run start` after `npm run build`, or another free port).

## Notes

- Map: Vast Mere (huge, pop 100). Headless 20 Hz sim.
- `npm run ml:8h` sets `BENCH_MINUTES=485`.
- Tuner snapshot: `src/lib/ml/tuned.json`. Raw dump: `src/lib/ml/benchmark-latest.json` (gitignored).
