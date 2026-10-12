import { createCampaignWorld, type RelicChoice } from "../sim/campaign"
import { CAMPAIGN_MISSIONS, type MissionId } from "../campaign/missions"
import { tick, type World } from "../sim/engine"
import { tickAi } from "../sim/ai"
import { TICK_HZ } from "../sim/catalog"
import { personaById } from "../sim/personas"
import { createTelemetry, pushFrame } from "../obs/telemetry"
import { readLiveObs } from "./live-obs"
import { DEFAULT_TUNED, improveFromCampaign, improveFromScore, scoreTelemetry, type Tuned } from "./score"
import { tickCampaignCoach } from "./campaign-coach"

export type CampaignGameResult = {
  missionId: MissionId
  winner: 0 | 1 | null
  phase: string
  ticks: number
  seconds: number
  peakEntities: number
  deaths: number
  simMsAvg: number
  wallMs: number
  shipsEscorted: number
  shipsLost: number
  unrest: number
  relicChoice: RelicChoice | null
  failWhy: string
  winWhy: string
  southWon: boolean
  p0Age: number
}

export type CampaignCompactRound = {
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
  escortRadius: number
  irrigateFirst: number
  relicReturnBias: number
  fps: number
  inputMs: number
  mission: string
  aged: number
  south: number
  north: number
  persona: string
  mapId: string
}

function runCampaignGame(
  tuned: Tuned,
  missionId: MissionId,
  maxSeconds: number,
  salt: number,
  opts?: { relicSecured?: boolean; relicChoice?: RelicChoice | null; pirateScale?: number },
): CampaignGameResult {
  const w: World = createCampaignWorld(missionId, tuned.ai, {
    pirateScale: opts?.pirateScale ?? 1,
    relicSecured: opts?.relicSecured,
    relicChoice: opts?.relicChoice ?? null,
    veteranArmy: missionId !== "edicts" && missionId !== "kayal",
    konerin: missionId === "edicts" ? undefined : 52,
    portIntegrated: missionId !== "edicts",
  })
  if (w.campaign) w.campaign.escortRadius = tuned.campaign.escortRadius
  const maxTicks = maxSeconds * TICK_HZ
  let peak = 0
  let deaths = 0
  let simAcc = 0
  const student = { ...tuned.ai }
  const rival = { ...personaById("balanced").params }
  const t0 = performance.now()
  for (let i = 0; i < maxTicks && w.winner === null; i++) {
    const a = performance.now()
    tickCampaignCoach(w, tuned.campaign, salt + i)
    if (w.campaign?.phase === "play") {
      tickAi(w, 0, student, personaById("coach"))
      tickAi(w, 1, rival, personaById("balanced"))
    }
    tick(w)
    simAcc += performance.now() - a
    peak = Math.max(peak, w.units.length + w.buildings.length + w.nodes.length)
    for (const e of w.events) {
      if (e.k === "death") deaths++
    }
    w.events.length = 0
  }
  const wallMs = performance.now() - t0
  const c = w.campaign
  return {
    missionId,
    winner: w.winner,
    phase: c?.phase ?? "none",
    ticks: w.tick,
    seconds: w.tick / TICK_HZ,
    peakEntities: peak,
    deaths,
    simMsAvg: simAcc / Math.max(1, w.tick),
    wallMs,
    shipsEscorted: c?.shipsEscorted ?? 0,
    shipsLost: c?.shipsLost ?? 0,
    unrest: c?.unrest ?? 0,
    relicChoice: c?.relicChoice ?? null,
    failWhy: c?.failWhy ?? "",
    winWhy: c?.winWhy ?? "",
    southWon: w.winner === 0,
    p0Age: w.players[0].age,
  }
}

export function runCampaignBenchmark(
  minMs: number,
  seed: Tuned = DEFAULT_TUNED,
  gamesPerRound = 5,
  maxSeconds = 160,
  onRound?: (rec: CampaignCompactRound, tuned: Tuned) => void,
): {
  tuned: Tuned
  history: CampaignCompactRound[]
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
  missions: Record<string, { n: number; p0: number; p1: number; draw: number }>
} {
  let tuned: Tuned = {
    ...seed,
    ai: { ...seed.ai },
    campaign: { ...seed.campaign },
  }
  const history: CampaignCompactRound[] = []
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
  const missions: Record<string, { n: number; p0: number; p1: number; draw: number }> = {}
  const t0 = Date.now()
  let round = 0
  let gamesN = 0
  while (Date.now() - t0 < minMs) {
    round++
    const live = readLiveObs()
    const games: CampaignGameResult[] = []
    for (let g = 0; g < gamesPerRound; g++) {
      const spec = CAMPAIGN_MISSIONS[g % CAMPAIGN_MISSIONS.length]!
      const relicSecured = spec.id === "tamraparani" && round % 2 === 0
      const pirateScale = 1 + ((round + g) % 5) * 0.22
      games.push(
        runCampaignGame(tuned, spec.id, maxSeconds, round * 17 + g, {
          relicSecured,
          pirateScale,
        }),
      )
    }
    const tel = createTelemetry()
    const avgSim = games.reduce((s, x) => s + x.simMsAvg, 0) / games.length
    const peak = Math.max(...games.map((x) => x.peakEntities))
    const fpsEst = live?.fps ?? 60
    pushFrame(tel, {
      fps: fpsEst,
      frameMs: live?.frameMs ?? 1000 / fpsEst,
      simMs: avgSim,
      inputMs: live?.inputMs ?? 8,
      entities: peak,
    })
    const finished = games.filter((g) => g.winner !== null)
    const score = scoreTelemetry(tel, {
      winner: finished[0]?.winner ?? null,
      ticks: Math.max(...games.map((x) => x.ticks)),
      peakEntities: peak,
      southWins: games.filter((g) => g.winner === 0).length,
      northWins: games.filter((g) => g.winner === 1).length,
      live,
    })
    score.finishable = finished.length / games.length
    tuned = improveFromScore(
      tuned,
      score,
      games.map((x) => ({ winner: x.winner, ticks: x.ticks, southWon: x.southWon, p0Age: x.p0Age })),
      live,
    )
    tuned = improveFromCampaign(tuned, games)
    const compact: CampaignCompactRound = {
      round,
      p0: games.filter((g) => g.winner === 0).length,
      p1: games.filter((g) => g.winner === 1).length,
      draw: games.filter((g) => g.winner === null).length,
      n: games.length,
      avgSec: games.reduce((s, g) => s + g.seconds, 0) / games.length,
      simMs: score.simMs,
      peak,
      deaths: games.reduce((s, g) => s + g.deaths, 0) / games.length,
      score: score.total,
      quality: tuned.quality,
      lod: tuned.lodDistance,
      attackAtArmy: tuned.ai.attackAtArmy,
      gather: tuned.ai.gatherBias,
      military: tuned.ai.militaryRatio,
      age: tuned.ai.agePriority,
      elapsedMs: Date.now() - t0,
      escortRadius: tuned.campaign.escortRadius,
      irrigateFirst: tuned.campaign.irrigateFirst,
      relicReturnBias: tuned.campaign.relicReturnBias,
      fps: score.fps,
      inputMs: score.inputMs,
      mission: games[0]?.missionId ?? "",
      aged: games.filter((g) => g.p0Age >= 1).length,
      south: games.filter((g) => g.winner === 0).length,
      north: games.filter((g) => g.winner === 1).length,
      persona: "campaign-coach",
      mapId: "twin-fish-reign",
    }
    totals.p0 += compact.p0
    totals.p1 += compact.p1
    totals.draw += compact.draw
    totals.sec += compact.avgSec * compact.n
    totals.sim += compact.simMs * compact.n
    totals.wall += games.reduce((s, g) => s + g.wallMs, 0)
    totals.peak += compact.peak
    totals.deaths += compact.deaths * compact.n
    totals.south += compact.south
    totals.north += compact.north
    for (const g of games) {
      const slot = (missions[g.missionId] ??= { n: 0, p0: 0, p1: 0, draw: 0 })
      slot.n++
      if (g.winner === 0) slot.p0++
      else if (g.winner === 1) slot.p1++
      else slot.draw++
    }
    gamesN += compact.n
    if (round % 8 === 1 || Date.now() - t0 > minMs - 1000) history.push(compact)
    onRound?.(compact, tuned)
  }
  return { tuned, history, wallMs: Date.now() - t0, games: gamesN, rounds: round, totals, missions }
}

export function summarizeCampaignBenchmark(data: ReturnType<typeof runCampaignBenchmark>) {
  const n = Math.max(1, data.games)
  return {
    wallMinutes: data.wallMs / 60000,
    mode: "campaign",
    mapId: "twin-fish-reign",
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
    missions: data.missions,
    final: data.tuned,
    trajectory: data.history,
  }
}
