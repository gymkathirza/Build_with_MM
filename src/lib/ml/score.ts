import type { AiParams } from "../sim/engine"
import { DEFAULT_AI } from "../sim/engine"
import type { Telemetry } from "../obs/telemetry"
import { avg } from "../obs/telemetry"

export type LoopScore = {
  fps: number
  frameMs: number
  simMs: number
  inputMs: number
  failedRate: number
  finishable: number
  readability: number
  southWinRate: number
  total: number
  notes: string[]
}

export type DrawQuality = 0 | 1 | 2

export type LiveObs = {
  fps: number
  frameMs: number
  simMs: number
  inputMs: number
  entities: number
  quality?: number
  lod?: number
  at?: number
}

export type Tuned = {
  ai: AiParams
  quality: DrawQuality
  lodDistance: number
  round: number
}

export const DEFAULT_TUNED: Tuned = {
  ai: { ...DEFAULT_AI },
  quality: 2,
  lodDistance: 28,
  round: 0,
}

export function scoreTelemetry(
  tel: Telemetry,
  opts: {
    winner: 0 | 1 | null
    ticks: number
    peakEntities: number
    southWins?: number
    northWins?: number
    live?: LiveObs | null
  },
): LoopScore {
  const live = opts.live
  const fps = live?.fps || avg(tel, "fps") || 60
  const frameMs = live?.frameMs || avg(tel, "frameMs") || 16
  const simMs = avg(tel, "simMs") || live?.simMs || 1
  const inputMs = live?.inputMs ?? (avg(tel, "inputMs") || tel.lastInputMs || 8)
  const failedRate = tel.clicks ? tel.failedOrders / tel.clicks : 0
  const fpsScore = Math.max(0, Math.min(1, fps / 60))
  const simScore = Math.max(0, Math.min(1, 1 - simMs / 8))
  const inputScore = Math.max(0, Math.min(1, 1 - inputMs / 80))
  const failScore = Math.max(0, 1 - failedRate * 4)
  const finishable = opts.winner !== null ? 1 : opts.ticks > 20 * 60 * 8 ? 0.2 : 0.6
  const readability = Math.max(0.35, 1 - Math.max(0, opts.peakEntities - 120) / 160)
  const decided = (opts.southWins ?? 0) + (opts.northWins ?? 0)
  const southWinRate = decided ? (opts.southWins ?? 0) / decided : 0.5
  const fairness = 1 - Math.abs(southWinRate - 0.5) * 1.6
  const total =
    fpsScore * 0.24 +
    simScore * 0.16 +
    inputScore * 0.12 +
    failScore * 0.1 +
    finishable * 0.18 +
    readability * 0.08 +
    Math.max(0, fairness) * 0.12
  const notes: string[] = []
  if (fps < 50) notes.push("Frame rate under 50; drop distant LOD.")
  if (simMs > 4) notes.push("Sim tick heavy; keep pop cap or drop quality.")
  if (failedRate > 0.15) notes.push("Too many failed orders; tighten click targets.")
  if (opts.winner === null) notes.push("Match did not finish in the sample window.")
  if (Math.abs(southWinRate - 0.5) > 0.12 && decided >= 4) {
    notes.push(`South win rate ${(southWinRate * 100).toFixed(0)}% — map bias, not P0/P1 swap.`)
  }
  if (inputMs > 40) notes.push("Input latency high; skip work on the click path.")
  if (!notes.length) notes.push("Core loop within target smoothness.")
  return {
    fps,
    frameMs,
    simMs,
    inputMs,
    failedRate,
    finishable,
    readability,
    southWinRate,
    total,
    notes,
  }
}

export function improveFromScore(
  prev: Tuned,
  score: LoopScore,
  games: { winner: 0 | 1 | null; ticks: number; southWon?: boolean; swap?: boolean; p0Age?: number }[],
  live?: LiveObs | null,
): Tuned {
  const next: Tuned = {
    ai: { ...prev.ai },
    quality: prev.quality,
    lodDistance: prev.lodDistance,
    round: prev.round + 1,
  }
  const fps = live?.fps ?? score.fps
  const inputMs = live?.inputMs ?? score.inputMs
  if (fps < 50 || score.frameMs > 22) {
    next.quality = Math.max(0, prev.quality - 1) as DrawQuality
    next.lodDistance = Math.max(14, prev.lodDistance - 6)
  } else if (fps > 58 && prev.quality < 2 && score.simMs < 3) {
    next.quality = Math.min(2, prev.quality + 1) as DrawQuality
  }
  if (inputMs > 45) {
    next.lodDistance = Math.max(14, next.lodDistance - 4)
  }

  const p0Wins = games.filter((g) => g.winner === 0).length
  const p1Wins = games.filter((g) => g.winner === 1).length
  const unfinished = games.filter((g) => g.winner === null).length
  const aged = games.filter((g) => (g as { p0Age?: number }).p0Age).length
  const southKnown = games.filter((g) => typeof g.southWon === "boolean" && g.winner !== null)
  const southWins = southKnown.filter((g) => g.southWon).length
  const mapBiased = southKnown.length >= 4 && Math.abs(southWins / southKnown.length - 0.5) > 0.18

  if (unfinished > games.length / 2) {
    next.ai.attackAtArmy = Math.max(3, prev.ai.attackAtArmy - 1)
    next.ai.militaryRatio = Math.min(0.8, prev.ai.militaryRatio + 0.05)
    next.ai.agePriority = Math.min(0.9, prev.ai.agePriority + 0.04)
  } else if (aged < games.length / 3) {
    next.ai.agePriority = Math.min(0.9, prev.ai.agePriority + 0.05)
    next.ai.gatherBias = Math.min(0.8, prev.ai.gatherBias + 0.02)
  } else if (mapBiased) {
    next.ai.kite = Math.min(0.7, prev.ai.kite + 0.04)
  } else if (p0Wins > p1Wins + games.length * 0.25) {
    next.ai.militaryRatio = Math.min(0.82, prev.ai.militaryRatio + 0.03)
    next.ai.gatherBias = Math.max(0.5, prev.ai.gatherBias - 0.03)
    next.ai.agePriority = Math.min(0.85, prev.ai.agePriority + 0.03)
  } else if (p1Wins > p0Wins + games.length * 0.25) {
    next.ai.attackAtArmy = Math.min(9, prev.ai.attackAtArmy + 1)
    next.ai.gatherBias = Math.min(0.84, prev.ai.gatherBias + 0.03)
  }
  next.ai.gatherBias = Number(next.ai.gatherBias.toFixed(2))
  next.ai.militaryRatio = Number(next.ai.militaryRatio.toFixed(2))
  next.ai.agePriority = Number(next.ai.agePriority.toFixed(2))
  next.ai.kite = Number(next.ai.kite.toFixed(2))
  return next
}
