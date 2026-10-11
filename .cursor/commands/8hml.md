Run a wall-clock **≥480 minute** Vast Mere observability + ML tuner loop for Build with Manon Mani.

Do this:

1. From the repo root, start `npm run ml:8h` (`BENCH_MINUTES=485`) and leave it running until it prints `Done`. Do not skip, kill, or shorten the 8 hours.
2. While it runs, improve graphics, UX, animation, characters, buildings, landscapes, and tactics. Keep `:43147` serving (`npm run start` after `npm run build` if needed).
3. After the window: commit the tuner snapshot (`src/lib/ml/tuned.json`) plus any art/tactics; do not commit `src/lib/ml/benchmark-latest.json`. Update `/cursor/stores/bc-8367d7dc-4ef2-486d-b05c-4dfaf0d7f1ab/docs/benchmark.md` when that store is mounted.
4. Push to the current working branch / open PR. Do not merge unless asked. If `gh` is logged out, print a new `gh auth login` device code immediately.

Return the command name, PR URL, SHA, and bench start confirmation.
