import { createWorld, emptyGatherObs, tick, type GatherObs } from "../sim/engine"
import { tickAi } from "../sim/ai"
import { TICK_HZ } from "../sim/catalog"
import { DEFAULT_TUNED, type Tuned } from "./score"
import { personaById } from "../sim/personas"

export type GatherProbe = {
  games: number
  seconds: number
  travel: number
  nearest: number
  waste: number
  wrong: number
  hops: number
  idleDeplete: number
  notes: string[]
  tuned: Tuned
}

function runForgeGatherGame(tuned: Tuned, seconds: number): GatherObs {
  const w = createWorld("ashen", "gilded", tuned.ai, { mapId: "vast-mere", persona: "balanced" })
  w.players[0].age = 1
  w.players[1].age = 1
  const maxTicks = seconds * TICK_HZ
  const student = personaById("balanced")
  for (let i = 0; i < maxTicks && w.winner === null; i++) {
    tickAi(w, 0, tuned.ai, student)
    tickAi(w, 1, student.params, student)
    tick(w)
  }
  return { ...w.gather }
}

export function runGatherLoop(games = 4, seconds = 28, seed: Tuned = DEFAULT_TUNED): GatherProbe {
  const tuned: Tuned = { ...seed, ai: { ...seed.ai } }
  const acc = emptyGatherObs()
  for (let g = 0; g < games; g++) {
    const obs = runForgeGatherGame(tuned, seconds)
    acc.travel += obs.travel
    acc.nearest += obs.nearest
    acc.wrong += obs.wrong
    acc.hops += obs.hops
    acc.idleDeplete += obs.idleDeplete
    if (obs.idleDeplete > 2) {
      tuned.ai.gatherBias = Number(Math.min(0.86, tuned.ai.gatherBias + 0.01).toFixed(2))
    }
  }
  const waste = acc.travel - acc.nearest
  const notes: string[] = []
  if (acc.idleDeplete > 2) notes.push(`Idle after deplete ${acc.idleDeplete} (Forge should hop).`)
  if (acc.wrong > 4) notes.push(`Wrong-node picks ${acc.wrong}.`)
  if (waste > acc.nearest * 0.25 && acc.nearest > 0) {
    notes.push(`Travel waste ${waste.toFixed(0)} vs nearest ${acc.nearest.toFixed(0)}.`)
  }
  if (!notes.length) notes.push("Forge gather chain: hops after deplete, travel near nearest.")
  return {
    games,
    seconds,
    travel: acc.travel,
    nearest: acc.nearest,
    waste,
    wrong: acc.wrong,
    hops: acc.hops,
    idleDeplete: acc.idleDeplete,
    notes,
    tuned,
  }
}

export function formatGatherReport(p: GatherProbe) {
  return [
    `Gather probe ${p.games}×${p.seconds}s Forge: travel ${p.travel.toFixed(0)} nearest ${p.nearest.toFixed(0)} waste ${p.waste.toFixed(0)}`,
    `hops ${p.hops} · idle-deplete ${p.idleDeplete} · wrong ${p.wrong} · ${p.notes[0]}`,
    `Tuned gatherBias=${p.tuned.ai.gatherBias.toFixed(2)}`,
  ].join("\n")
}
