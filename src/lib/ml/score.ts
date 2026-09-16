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
  total: number
  notes: string[]
}

export type DrawQuality = 0 | 1 | 2

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
  opts: { winner: 0 | 1 | null; ticks: number; peakEntities: number },
): LoopScore {
  const fps = avg(tel, "fps") || 60
  const frameMs = avg(tel, "frameMs") || 16
  const simMs = avg(tel, "simMs") || 1
  const inputMs = avg(tel, "inputMs") || tel.lastInputMs
  const failedRate = tel.clicks ? tel.failedOrders / tel.clicks : 0
  const fpsScore = Math.max(0, Math.min(1, fps / 60))
  const simScore = Math.max(0, Math.min(1, 1 - simMs / 8))
  const inputScore = Math.max(0, Math.min(1, 1 - inputMs / 80))
  const failScore = Math.max(0, 1 - failedRate * 4)
  const finishable = opts.winner !== null ? 1 : opts.ticks > 20 * 60 * 8 ? 0.2 : 0.6
  const readability = Math.max(0.35, 1 - Math.max(0, opts.peakEntities - 50) / 80)
  const total =
    fpsScore * 0.28 +
    simScore * 0.18 +
    inputScore * 0.12 +
    failScore * 0.12 +
    finishable * 0.2 +
    readability * 0.1
  const notes: string[] = []
  if (fps < 50) notes.push("Frame rate under 50; drop distant LOD.")
  if (simMs > 4) notes.push("Sim tick heavy; keep pop cap.")
  if (failedRate > 0.15) notes.push("Too many failed orders; tighten click targets.")
  if (opts.winner === null) notes.push("Match did not finish in the sample window.")
  if (!notes.length) notes.push("Core loop within target smoothness.")
  return {
    fps,
    frameMs,
    simMs,
    inputMs,
    failedRate,
    finishable,
    readability,
    total,
    notes,
  }
}

export function improveFromScore(prev: Tuned, score: LoopScore, games: { winner: 0 | 1 | null; ticks: number }[]): Tuned {
  const next: Tuned = {
    ai: { ...prev.ai },
    quality: prev.quality,
    lodDistance: prev.lodDistance,
    round: prev.round + 1,
  }
  if (score.fps < 50) {
    next.quality = Math.max(0, prev.quality - 1) as DrawQuality
    next.lodDistance = Math.max(16, prev.lodDistance - 6)
  } else if (score.fps > 58 && prev.quality < 2) {
    next.quality = Math.min(2, prev.quality + 1) as DrawQuality
  }
  const p0Wins = games.filter((g) => g.winner === 0).length
  const p1Wins = games.filter((g) => g.winner === 1).length
  const unfinished = games.filter((g) => g.winner === null).length
  if (unfinished > games.length / 2) {
    next.ai.attackAtArmy = Math.max(4, prev.ai.attackAtArmy - 1)
    next.ai.militaryRatio = Math.min(0.75, prev.ai.militaryRatio + 0.06)
  } else if (p1Wins >= games.length && games.length) {
    next.ai.attackAtArmy = Math.min(10, prev.ai.attackAtArmy + 1)
    next.ai.gatherBias = Math.min(0.85, prev.ai.gatherBias + 0.04)
  } else if (p0Wins >= games.length && games.length) {
    next.ai.militaryRatio = Math.min(0.78, prev.ai.militaryRatio + 0.05)
    next.ai.gatherBias = Math.max(0.58, prev.ai.gatherBias - 0.03)
    next.ai.agePriority = Math.min(0.85, prev.ai.agePriority + 0.04)
  }
  return next
}
