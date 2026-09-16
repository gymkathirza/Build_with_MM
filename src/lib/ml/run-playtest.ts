import { createWorld, tick, type World } from "../sim/engine"
import { tickAi } from "../sim/ai"
import { DEFAULT_TUNED, improveFromScore, scoreTelemetry, type Tuned } from "./score"
import { createTelemetry, pushFrame } from "../obs/telemetry"
import { TICK_HZ } from "../sim/catalog"

export type GameResult = {
  winner: 0 | 1 | null
  ticks: number
  seconds: number
  peakEntities: number
  deaths: number
  simMsAvg: number
  wallMs: number
  swap: boolean
  p0Age: number
  p1Age: number
}

function runGame(tuned: Tuned, maxSeconds: number, playerBot: boolean, swap: boolean): GameResult {
  const w: World = createWorld("ashen", "gilded", tuned.ai, swap)
  const maxTicks = maxSeconds * TICK_HZ
  let peak = 0
  let deaths = 0
  let simAcc = 0
  const t0 = performance.now()
  for (let i = 0; i < maxTicks && w.winner === null; i++) {
    const a = performance.now()
    if (playerBot) tickAi(w, 0, tuned.ai)
    tickAi(w, 1, tuned.ai)
    tick(w)
    simAcc += performance.now() - a
    peak = Math.max(peak, w.units.length + w.buildings.length)
    for (const e of w.events) {
      if (e.k === "death") deaths++
    }
    w.events.length = 0
  }
  const wallMs = performance.now() - t0
  const simMsAvg = simAcc / Math.max(1, w.tick)
  return {
    winner: w.winner,
    ticks: w.tick,
    seconds: w.tick / TICK_HZ,
    peakEntities: peak,
    deaths,
    simMsAvg,
    wallMs,
    swap,
    p0Age: w.players[0].age,
    p1Age: w.players[1].age,
  }
}

export type RoundRecord = {
  round: number
  games: GameResult[]
  score: ReturnType<typeof scoreTelemetry>
  tunedAfter: Tuned
  elapsedMs: number
}

export function runPlaytestLoop(rounds = 3, gamesPerRound = 4, maxSeconds = 180): {
  tuned: Tuned
  history: RoundRecord[]
} {
  let tuned = { ...DEFAULT_TUNED, ai: { ...DEFAULT_TUNED.ai } }
  const history: RoundRecord[] = []
  const t0 = Date.now()
  for (let r = 0; r < rounds; r++) {
    const games: GameResult[] = []
    for (let g = 0; g < gamesPerRound; g++) games.push(runGame(tuned, maxSeconds, true, g % 2 === 1))
    const rec = closeRound(r + 1, games, tuned, t0)
    history.push(rec)
    tuned = rec.tunedAfter
  }
  return { tuned, history }
}

function closeRound(round: number, games: GameResult[], tuned: Tuned, started: number): RoundRecord {
  const tel = createTelemetry()
  const avgSim = games.reduce((s, x) => s + x.simMsAvg, 0) / games.length
  const peak = Math.max(...games.map((x) => x.peakEntities))
  pushFrame(tel, { fps: 60, frameMs: 16.6, simMs: avgSim, inputMs: 8, entities: peak })
  const finished = games.filter((g) => g.winner !== null)
  const score = scoreTelemetry(tel, {
    winner: finished[0]?.winner ?? null,
    ticks: Math.max(...games.map((x) => x.ticks)),
    peakEntities: peak,
  })
  score.finishable = finished.length / games.length
  const tunedAfter = improveFromScore(
    tuned,
    score,
    games.map((x) => ({ winner: x.winner, ticks: x.ticks })),
  )
  return { round, games, score, tunedAfter, elapsedMs: Date.now() - started }
}

export function runHourBenchmark(
  minMs: number,
  seed: Tuned = DEFAULT_TUNED,
  gamesPerRound = 8,
  maxSeconds = 180,
  onRound?: (rec: RoundRecord, tuned: Tuned) => void,
): {
  tuned: Tuned
  history: RoundRecord[]
  wallMs: number
  games: number
} {
  let tuned: Tuned = { ...seed, ai: { ...seed.ai } }
  const history: RoundRecord[] = []
  const t0 = Date.now()
  let round = 0
  while (Date.now() - t0 < minMs) {
    round++
    const games: GameResult[] = []
    for (let g = 0; g < gamesPerRound; g++) {
      games.push(runGame(tuned, maxSeconds, true, g % 2 === 1))
    }
    const rec = closeRound(round, games, tuned, t0)
    history.push(rec)
    tuned = rec.tunedAfter
    onRound?.(rec, tuned)
  }
  return { tuned, history, wallMs: Date.now() - t0, games: history.reduce((s, h) => s + h.games.length, 0) }
}

export function summarizeBenchmark(data: ReturnType<typeof runHourBenchmark>) {
  const all = data.history.flatMap((h) => h.games)
  const p0 = all.filter((g) => g.winner === 0).length
  const p1 = all.filter((g) => g.winner === 1).length
  const draw = all.filter((g) => g.winner === null).length
  const avgSec = all.reduce((s, g) => s + g.seconds, 0) / Math.max(1, all.length)
  const avgSim = all.reduce((s, g) => s + g.simMsAvg, 0) / Math.max(1, all.length)
  const avgWall = all.reduce((s, g) => s + g.wallMs, 0) / Math.max(1, all.length)
  const avgPeak = all.reduce((s, g) => s + g.peakEntities, 0) / Math.max(1, all.length)
  const avgDeaths = all.reduce((s, g) => s + g.deaths, 0) / Math.max(1, all.length)
  const trajectory = data.history.map((h) => ({
    round: h.round,
    elapsedMin: h.elapsedMs / 60000,
    p0: h.games.filter((g) => g.winner === 0).length,
    p1: h.games.filter((g) => g.winner === 1).length,
    draw: h.games.filter((g) => g.winner === null).length,
    avgSec: h.games.reduce((s, g) => s + g.seconds, 0) / h.games.length,
    simMs: h.score.simMs,
    quality: h.tunedAfter.quality,
    lod: h.tunedAfter.lodDistance,
    attackAtArmy: h.tunedAfter.ai.attackAtArmy,
    gather: h.tunedAfter.ai.gatherBias,
    military: h.tunedAfter.ai.militaryRatio,
    age: h.tunedAfter.ai.agePriority,
    score: h.score.total,
  }))
  return {
    wallMinutes: data.wallMs / 60000,
    games: data.games,
    finished: p0 + p1,
    unfinished: draw,
    p0Wins: p0,
    p1Wins: p1,
    p0Rate: p0 / Math.max(1, all.length),
    p1Rate: p1 / Math.max(1, all.length),
    drawRate: draw / Math.max(1, all.length),
    avgDurationSec: avgSec,
    avgSimMs: avgSim,
    avgGameWallMs: avgWall,
    avgPeakEntities: avgPeak,
    avgDeaths,
    final: data.tuned,
    trajectory,
  }
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
