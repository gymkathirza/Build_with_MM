import { createWorld, tick, type World } from "../sim/engine"
import { tickAi } from "../sim/ai"
import { DEFAULT_TUNED, improveFromScore, scoreTelemetry, type Tuned } from "./score"
import { createTelemetry, pushFrame, type Telemetry } from "../obs/telemetry"
import { TICK_HZ } from "../sim/catalog"

export type GameResult = {
  winner: 0 | 1 | null
  ticks: number
  seconds: number
  peakEntities: number
  deaths: number
  simMsAvg: number
}

function runGame(tuned: Tuned, maxSeconds: number, playerBot: boolean): GameResult {
  const w: World = createWorld("ashen", "gilded", tuned.ai)
  const tel: Telemetry = createTelemetry()
  const maxTicks = maxSeconds * TICK_HZ
  let peak = 0
  let deaths = 0
  let simAcc = 0
  const t0 =
    typeof performance !== "undefined" ? performance.now() : Date.now()
  for (let i = 0; i < maxTicks && w.winner === null; i++) {
    const a = typeof performance !== "undefined" ? performance.now() : Date.now()
    if (playerBot) tickAi(w, 0, tuned.ai)
    tickAi(w, 1, tuned.ai)
    tick(w)
    const b = typeof performance !== "undefined" ? performance.now() : Date.now()
    simAcc += b - a
    peak = Math.max(peak, w.units.length + w.buildings.length)
    deaths += w.events.filter((e) => e.k === "death" && e.id > 0).length
    w.events = w.events.filter((e) => e.k !== "death")
  }
  const elapsed = (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0
  const simMsAvg = simAcc / Math.max(1, w.tick)
  pushFrame(tel, {
    fps: 60,
    frameMs: 16.6,
    simMs: simMsAvg,
    inputMs: 8,
    entities: peak,
  })
  void elapsed
  return {
    winner: w.winner,
    ticks: w.tick,
    seconds: w.tick / TICK_HZ,
    peakEntities: peak,
    deaths,
    simMsAvg,
  }
}

export function runPlaytestLoop(rounds = 3, gamesPerRound = 4, maxSeconds = 180): {
  tuned: Tuned
  history: { round: number; games: GameResult[]; score: ReturnType<typeof scoreTelemetry> }[]
} {
  let tuned = { ...DEFAULT_TUNED, ai: { ...DEFAULT_TUNED.ai } }
  const history: { round: number; games: GameResult[]; score: ReturnType<typeof scoreTelemetry> }[] = []
  for (let r = 0; r < rounds; r++) {
    const games: GameResult[] = []
    for (let g = 0; g < gamesPerRound; g++) games.push(runGame(tuned, maxSeconds, true))
    const tel = createTelemetry()
    const avgSim = games.reduce((s, x) => s + x.simMsAvg, 0) / games.length
    pushFrame(tel, { fps: 60, frameMs: 16.6, simMs: avgSim, inputMs: 8, entities: games[0].peakEntities })
    const score = scoreTelemetry(tel, {
      winner: games.find((x) => x.winner !== null)?.winner ?? null,
      ticks: Math.max(...games.map((x) => x.ticks)),
      peakEntities: Math.max(...games.map((x) => x.peakEntities)),
    })
    history.push({ round: r + 1, games, score })
    tuned = improveFromScore(
      tuned,
      score,
      games.map((x) => ({ winner: x.winner, ticks: x.ticks })),
    )
  }
  return { tuned, history }
}

export function formatLoopReport(data: ReturnType<typeof runPlaytestLoop>) {
  const lines: string[] = []
  for (const h of data.history) {
    const wins = [0, 1].map((p) => h.games.filter((g) => g.winner === p).length)
    const unfinished = h.games.filter((g) => g.winner === null).length
    const avgSec = h.games.reduce((s, g) => s + g.seconds, 0) / h.games.length
    lines.push(
      `Round ${h.round}: score ${(h.score.total * 100).toFixed(0)} · P0/P1/draw ${wins[0]}/${wins[1]}/${unfinished} · avg ${avgSec.toFixed(0)}s · sim ${h.score.simMs.toFixed(2)}ms · ${h.score.notes[0]}`,
    )
  }
  lines.push(
    `Tuned AI attackAtArmy=${data.tuned.ai.attackAtArmy} gather=${data.tuned.ai.gatherBias.toFixed(2)} quality=${data.tuned.quality} lod=${data.tuned.lodDistance}`,
  )
  return lines.join("\n")
}
