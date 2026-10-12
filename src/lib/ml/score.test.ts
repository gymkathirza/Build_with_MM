import assert from "node:assert/strict"
import { test } from "node:test"
import { DEFAULT_TUNED, improveFromScore, scoreTelemetry } from "./score"
import { trustedLive } from "./live-obs"
import { createTelemetry } from "../obs/telemetry"

test("mild unfinished rounds do not crash attack below 6", () => {
  const tel = createTelemetry()
  const score = scoreTelemetry(tel, {
    winner: 0,
    ticks: 400,
    peakEntities: 40,
    southWins: 2,
    northWins: 1,
    live: { fps: 60, frameMs: 16, simMs: 0.02, inputMs: 8, entities: 40 },
  })
  const seed = { ...DEFAULT_TUNED, ai: { ...DEFAULT_TUNED.ai, attackAtArmy: 9 } }
  const games = [
    { winner: 0 as const, ticks: 400 },
    { winner: 1 as const, ticks: 400 },
    { winner: null, ticks: 400 },
    { winner: null, ticks: 400 },
    { winner: null, ticks: 400 },
    { winner: 0 as const, ticks: 400 },
  ]
  const next = improveFromScore(seed, score, games, {
    fps: 60,
    frameMs: 16,
    simMs: 0.02,
    inputMs: 8,
    entities: 40,
  })
  assert.ok(next.ai.attackAtArmy >= 6, `attack ${next.ai.attackAtArmy}`)
  assert.ok(next.lodDistance >= seed.lodDistance, "smooth frames should grow LOD")
})

test("trustedLive drops hidden-tab fps", () => {
  assert.equal(trustedLive({ fps: 1, frameMs: 800, simMs: 0.02, inputMs: 8, entities: 40, at: Date.now() }), null)
  assert.ok(trustedLive({ fps: 60, frameMs: 16, simMs: 0.02, inputMs: 8, entities: 40, at: Date.now() }))
})

test("live gather idle and wrong move gatherBias", () => {
  const tel = createTelemetry()
  const score = scoreTelemetry(tel, {
    winner: 0,
    ticks: 400,
    peakEntities: 40,
    southWins: 3,
    northWins: 3,
    live: { fps: 60, frameMs: 16, simMs: 0.02, inputMs: 8, entities: 40, gatherIdle: 5, gatherHops: 0, gatherWrong: 6 },
  })
  assert.ok(score.notes.some((n) => n.includes("idling after deplete")))
  assert.ok(score.notes.some((n) => n.includes("far nodes")))
  const next = improveFromScore(DEFAULT_TUNED, score, [{ winner: 0, ticks: 400 }, { winner: 1, ticks: 400 }], {
    fps: 60,
    frameMs: 16,
    simMs: 0.02,
    inputMs: 8,
    entities: 40,
    gatherIdle: 5,
    gatherWrong: 6,
  })
  assert.ok(next.ai.gatherBias > DEFAULT_TUNED.ai.gatherBias)
})
