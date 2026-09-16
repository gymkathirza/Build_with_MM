# Build with Manon Mani

Local single-player RTS (original IP). Skirmish vs AI: gather Grain, Timber, Ore, and Relics; raise halls; age up; train banners; raze the rival Hearth Hall.

Requires Node 20+.

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43147](http://127.0.0.1:43147).

```bash
npm run playtest
npm run benchmark   # wall-clock hour of AI vs AI (BENCH_MINUTES=60)
```

| Route | What it is |
| --- | --- |
| `/` | Main menu |
| `/skirmish` | 1v1 setup, then March |
| `/match` | Playable field (WASD, select, right-click) |
| `/settings` | Options |

This slice caps population at 32 (design target ~200) so the sim stays smooth. The observatory overlay reports FPS, frame time, sim tick, and input latency.
