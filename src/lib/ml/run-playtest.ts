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

export type CompactRound = {
  round: number
  p0: number
  p1: number
  draw: number
  n: number
  avgSec: number
  simMs: number
  peak: number
  deaths: number
  score: number
  quality: number
  lod: number
  attackAtArmy: number
  gather: number
  military: number
  age: number
  elapsedMs: number
}

function jitterAi(base: Tuned["ai"], salt: number) {
  const n = ((salt * 17) % 100) / 100
  return {
    ...base,
    gatherBias: Math.max(0.5, Math.min(0.88, base.gatherBias + (n - 0.5) * 0.1)),
    attackAtArmy: Math.max(3, base.attackAtArmy + (n > 0.7 ? 1 : n < 0.3 ? -1 : 0)),
  }
}

export function runHourBenchmark(
  minMs: number,
  seed: Tuned = DEFAULT_TUNED,
  gamesPerRound = 8,
  maxSeconds = 180,
  onRound?: (rec: CompactRound, tuned: Tuned) => void,
): {
  tuned: Tuned
  history: CompactRound[]
  wallMs: number
  games: number
  rounds: number
  totals: {
    p0: number
    p1: number
    draw: number
    sec: number
    sim: number
    wall: number
    peak: number
    deaths: number
  }
} {
  let tuned: Tuned = { ...seed, ai: { ...seed.ai } }
  const history: CompactRound[] = []
  const totals = { p0: 0, p1: 0, draw: 0, sec: 0, sim: 0, wall: 0, peak: 0, deaths: 0 }
  const t0 = Date.now()
  let round = 0
  let gamesN = 0
  while (Date.now() - t0 < minMs) {
    round++
    const games: GameResult[] = []
    for (let g = 0; g < gamesPerRound; g++) {
      const slice: Tuned = { ...tuned, ai: g % 2 ? jitterAi(tuned.ai, round + g) : tuned.ai }
      games.push(runGame(slice, maxSeconds, true, g % 2 === 1))
    }
    const rec = closeRound(round, games, tuned, t0)
    tuned = rec.tunedAfter
    const compact: CompactRound = {
      round,
      p0: games.filter((g) => g.winner === 0).length,
      p1: games.filter((g) => g.winner === 1).length,
      draw: games.filter((g) => g.winner === null).length,
      n: games.length,
      avgSec: games.reduce((s, g) => s + g.seconds, 0) / games.length,
      simMs: rec.score.simMs,
      peak: Math.max(...games.map((g) => g.peakEntities)),
      deaths: games.reduce((s, g) => s + g.deaths, 0) / games.length,
      score: rec.score.total,
      quality: tuned.quality,
      lod: tuned.lodDistance,
      attackAtArmy: tuned.ai.attackAtArmy,
      gather: tuned.ai.gatherBias,
      military: tuned.ai.militaryRatio,
      age: tuned.ai.agePriority,
      elapsedMs: rec.elapsedMs,
    }
    totals.p0 += compact.p0
    totals.p1 += compact.p1
    totals.draw += compact.draw
    totals.sec += compact.avgSec * compact.n
    totals.sim += compact.simMs * compact.n
    totals.wall += games.reduce((s, g) => s + g.wallMs, 0)
    totals.peak += compact.peak
    totals.deaths += compact.deaths * compact.n
    gamesN += compact.n
    if (round % 15 === 1 || Date.now() - t0 > minMs - 1000) history.push(compact)
    onRound?.(compact, tuned)
  }
  return { tuned, history, wallMs: Date.now() - t0, games: gamesN, rounds: round, totals }
}

export function summarizeBenchmark(data: ReturnType<typeof runHourBenchmark>) {
  const n = Math.max(1, data.games)
  return {
    wallMinutes: data.wallMs / 60000,
    games: data.games,
    finished: data.totals.p0 + data.totals.p1,
    unfinished: data.totals.draw,
    p0Wins: data.totals.p0,
    p1Wins: data.totals.p1,
    p0Rate: data.totals.p0 / n,
    p1Rate: data.totals.p1 / n,
    drawRate: data.totals.draw / n,
    avgDurationSec: data.totals.sec / n,
    avgSimMs: data.totals.sim / n,
    avgGameWallMs: data.totals.wall / n,
    avgPeakEntities: data.totals.peak / Math.max(1, data.rounds),
    avgDeaths: data.totals.deaths / n,
    final: data.tuned,
    trajectory: data.history,
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
