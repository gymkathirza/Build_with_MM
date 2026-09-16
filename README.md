# Ages of Accord

A **sample UI mock** for an original RTS in the spirit of classic age-advancement strategy games. It is **not** Age of Empires, does not use Microsoft IP, and does **not** include a game engine or combat simulation.

Four original banners (Ashen Compact, Verdant Conclave, Saltwind Khanate, Gilded Synod) spend Grain, Timber, Ore, and Relics through Ember, Forge, Citadel, and Dominion ages. You can walk a cinematic main menu, campaign chapter select, skirmish setup, settings, and an in-match HUD with resources, minimap, selection, command panel, and a building queue.

## Run locally

Requires Node 20+.

```bash
npm install
npm run dev
```

Then open [http://127.0.0.1:43147](http://127.0.0.1:43147).

```bash
npm run build
npm run start -- --port 43147
```

## Screens

| Route | What it is |
| --- | --- |
| `/` | Main menu — Campaign, Skirmish, Settings, Exit |
| `/exit` | Confirm leaving the hall |
| `/campaign` | Chapter select with locked/unlocked plates and save-slot empty/error states |
| `/skirmish` | Map, difficulty, and banner setup, plus map preview empty/error states |
| `/match` | HUD mock (query: `faction`, `map`, `difficulty`, `chapter`, `age`, `source`) |
| `/settings` | Banners, horns, and table options |
| `/farewell` | Banners furled |

This repository is interface only: clicking March, Train, or Advance Age updates the mock chrome, not a simulation.
