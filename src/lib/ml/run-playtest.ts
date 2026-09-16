import { createWorld, tick, type World } from "../sim/engine"
import { tickAi } from "../sim/ai"
import { DEFAULT_TUNED, improveFromScore, scoreTelemetry, type LiveObs, type Tuned } from "./score"
import { createTelemetry, pushFrame } from "../obs/telemetry"
import { TICK_HZ } from "../sim/catalog"
import { HUGE_MAP_ID } from "../sim/maps"
import { nextPersona, personaById, type Persona } from "../sim/personas"
import { readLiveObs } from "./live-obs"

export type GameResult = {
  winner: 0 | 1 | null
  ticks: number
  seconds: number
  peakEntities: number
  deaths: number
  simMsAvg: number
  wallMs: number
  swap: boolean
  southWon: boolean
  p0Age: number
  p1Age: number
  persona: string
  mapId: string
  p0Grain: number
  p1Grain: number
  p0Timber: number
  p1Timber: number
  p0Guards: number
  p0Upgrades: number
}

function westOwnerWon(w: World, winner: 0 | 1 | null) {
  if (winner === null) return false
  const hall = w.buildings.find((b) => b.owner === winner && b.type === "hearth")
  return !!hall && hall.x < w.size / 2
}

function runGame(
  tuned: Tuned,
  maxSeconds: number,
  playerBot: boolean,
  swap: boolean,
  persona: Persona,
  mapId = HUGE_MAP_ID,
  axis: "w-e" | "e-w" = "w-e",
): GameResult {
  const w: World = createWorld("ashen", "gilded", tuned.ai, {
    mapId,
    swap,
    persona: persona.id,
    axis,
  })
  const maxTicks = maxSeconds * TICK_HZ
  let peak = 0
  let deaths = 0
  let simAcc = 0
  const student = { ...tuned.ai }
  const rival = { ...persona.params }
  const t0 = performance.now()
  for (let i = 0; i < maxTicks && w.winner === null; i++) {
    const a = performance.now()
    if (playerBot) tickAi(w, 0, student, personaById("balanced"))
    tickAi(w, 1, rival, persona)
    tick(w)
    simAcc += performance.now() - a
    peak = Math.max(peak, w.units.length + w.buildings.length + w.nodes.length)
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
    southWon: westOwnerWon(w, w.winner),
    p0Age: w.players[0].age,
    p1Age: w.players[1].age,
    persona: persona.id,
    mapId: w.mapId,
    p0Grain: w.players[0].grain,
    p1Grain: w.players[1].grain,
    p0Timber: w.players[0].timber,
    p1Timber: w.players[1].timber,
    p0Guards: w.units.filter((u) => u.owner === 0 && u.type === "guard").length,
    p0Upgrades: w.buildings.filter((b) => b.owner === 0 && b.tier >= 1).length,
  }
}

export type RoundRecord = {
  round: number
  games: GameResult[]
  score: ReturnType<typeof scoreTelemetry>
  tunedAfter: Tuned
  elapsedMs: number
}

function estimateHeadlessFps(simMs: number, entities: number): number {
  const renderMs = 2 + entities * 0.012
  const frame = simMs * TICK_HZ * (1 / 60) + renderMs
  return Math.max(20, Math.min(60, 1000 / Math.max(8, frame)))
}

function closeRound(
  round: number,
  games: GameResult[],
  tuned: Tuned,
  started: number,
  live: LiveObs | null,
): RoundRecord {
  const tel = createTelemetry()
  const avgSim = games.reduce((s, x) => s + x.simMsAvg, 0) / games.length
  const peak = Math.max(...games.map((x) => x.peakEntities))
  const fpsEst = live?.fps ?? estimateHeadlessFps(avgSim, peak)
  const inputMs = live?.inputMs ?? 8
  pushFrame(tel, {
    fps: fpsEst,
    frameMs: live?.frameMs ?? 1000 / fpsEst,
    simMs: avgSim,
    inputMs,
    entities: peak,
  })
  const finished = games.filter((g) => g.winner !== null)
  const southWins = games.filter((g) => g.winner !== null && g.southWon).length
  const northWins = games.filter((g) => g.winner !== null && !g.southWon).length
  const score = scoreTelemetry(tel, {
    winner: finished[0]?.winner ?? null,
    ticks: Math.max(...games.map((x) => x.ticks)),
    peakEntities: peak,
    southWins,
    northWins,
    live,
  })
  score.finishable = finished.length / games.length
  const tunedAfter = improveFromScore(
    tuned,
    score,
    games.map((x) => ({ winner: x.winner, ticks: x.ticks, southWon: x.southWon, swap: x.swap, p0Age: x.p0Age })),
    live,
  )
  return { round, games, score, tunedAfter, elapsedMs: Date.now() - started }
}

export function runPlaytestLoop(rounds = 2, gamesPerRound = 2, maxSeconds = 90): {
  tuned: Tuned
  history: RoundRecord[]
} {
  let tuned = { ...DEFAULT_TUNED, ai: { ...DEFAULT_TUNED.ai } }
  const history: RoundRecord[] = []
  const t0 = Date.now()
  const live = readLiveObs()
  for (let r = 0; r < rounds; r++) {
    const games: GameResult[] = []
    for (let g = 0; g < gamesPerRound; g++) {
      games.push(runGame(tuned, maxSeconds, true, g % 2 === 1, nextPersona(r + g), HUGE_MAP_ID))
    }
    const rec = closeRound(r + 1, games, tuned, t0, live)
    history.push(rec)
    tuned = rec.tunedAfter
  }
  return { tuned, history }
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
  south: number
  north: number
  fps: number
  inputMs: number
  persona: string
  mapId: string
  aged: number
}

export function runHourBenchmark(
  minMs: number,
  seed: Tuned = DEFAULT_TUNED,
  gamesPerRound = 6,
  maxSeconds = 200,
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
    south: number
    north: number
  }
  personas: Record<string, { n: number; p0: number; p1: number; south: number }>
} {
  let tuned: Tuned = { ...seed, ai: { ...seed.ai } }
  const history: CompactRound[] = []
  const totals = {
    p0: 0,
    p1: 0,
    draw: 0,
    sec: 0,
    sim: 0,
    wall: 0,
    peak: 0,
    deaths: 0,
    south: 0,
    north: 0,
  }
  const personas: Record<string, { n: number; p0: number; p1: number; south: number }> = {}
  const t0 = Date.now()
  let round = 0
  let gamesN = 0
  while (Date.now() - t0 < minMs) {
    round++
    const live = readLiveObs()
    const games: GameResult[] = []
    for (let g = 0; g < gamesPerRound; g++) {
      const persona = nextPersona(round + g)
      const axis = (round + g) % 2 === 0 ? "w-e" : "e-w"
      games.push(runGame(tuned, maxSeconds, true, g % 2 === 1, persona, HUGE_MAP_ID, axis))
    }
    const rec = closeRound(round, games, tuned, t0, live)
    tuned = rec.tunedAfter
    const south = games.filter((g) => g.winner !== null && g.southWon).length
    const north = games.filter((g) => g.winner !== null && !g.southWon).length
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
      south,
      north,
      fps: rec.score.fps,
      inputMs: rec.score.inputMs,
      persona: games[0]?.persona ?? "",
      mapId: HUGE_MAP_ID,
      aged: games.filter((g) => g.p0Age >= 1).length,
    }
    totals.p0 += compact.p0
    totals.p1 += compact.p1
    totals.draw += compact.draw
    totals.sec += compact.avgSec * compact.n
    totals.sim += compact.simMs * compact.n
    totals.wall += games.reduce((s, g) => s + g.wallMs, 0)
    totals.peak += compact.peak
    totals.deaths += compact.deaths * compact.n
    totals.south += south
    totals.north += north
    for (const g of games) {
      const slot = (personas[g.persona] ??= { n: 0, p0: 0, p1: 0, south: 0 })
      slot.n++
      if (g.winner === 0) slot.p0++
      if (g.winner === 1) slot.p1++
      if (g.winner !== null && g.southWon) slot.south++
    }
    gamesN += compact.n
    if (round % 12 === 1 || Date.now() - t0 > minMs - 1000) history.push(compact)
    onRound?.(compact, tuned)
  }
  return { tuned, history, wallMs: Date.now() - t0, games: gamesN, rounds: round, totals, personas }
}

export function summarizeBenchmark(data: ReturnType<typeof runHourBenchmark>) {
  const n = Math.max(1, data.games)
  const decided = data.totals.south + data.totals.north
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
    southWins: data.totals.south,
    northWins: data.totals.north,
    southWinRate: decided ? data.totals.south / decided : 0,
    avgDurationSec: data.totals.sec / n,
    avgSimMs: data.totals.sim / n,
    avgGameWallMs: data.totals.wall / n,
    avgPeakEntities: data.totals.peak / Math.max(1, data.rounds),
    avgDeaths: data.totals.deaths / n,
    mapId: HUGE_MAP_ID,
    personas: data.personas,
    final: data.tuned,
    trajectory: data.history,
    agedRounds: data.history.reduce((s, h) => s + (h.aged ?? 0), 0),
  }
}

export function formatLoopReport(data: ReturnType<typeof runPlaytestLoop>) {
  const lines: string[] = []
  for (const h of data.history) {
    const wins = [0, 1].map((p) => h.games.filter((g) => g.winner === p).length)
    const unfinished = h.games.filter((g) => g.winner === null).length
    const avgSec = h.games.reduce((s, g) => s + g.seconds, 0) / gamesAvg(h.games)
    const south = h.games.filter((g) => g.winner !== null && g.southWon).length
    lines.push(
      `Round ${h.round}: score ${(h.score.total * 100).toFixed(0)} · P0/P1/draw ${wins[0]}/${wins[1]}/${unfinished} · south ${south} · avg ${avgSec.toFixed(0)}s · sim ${h.score.simMs.toFixed(2)}ms · peak ${Math.max(...h.games.map((g) => g.peakEntities))} · ${h.score.notes[0]}`,
    )
  }
  lines.push(
    `Tuned AI attackAtArmy=${data.tuned.ai.attackAtArmy} gather=${data.tuned.ai.gatherBias.toFixed(2)} quality=${data.tuned.quality} lod=${data.tuned.lodDistance}`,
  )
  return lines.join("\n")
}

function gamesAvg(games: GameResult[]) {
  return Math.max(1, games.length)
}
