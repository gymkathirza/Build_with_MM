import assert from "node:assert/strict"
import { test } from "node:test"
import { DEFAULT_TUNED, improveFromCampaign, improveFromScore, scoreTelemetry } from "./score"
import { createTelemetry } from "../obs/telemetry"

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

test("campaign grain losses raise irrigation bias", () => {
  const next = improveFromCampaign(DEFAULT_TUNED, [
    { missionId: "edicts", winner: 1, unrest: 80, failWhy: "The southern breadbasket ran dry." },
  ])
  assert.ok(next.campaign.irrigateFirst > DEFAULT_TUNED.campaign.irrigateFirst)
  assert.ok(next.campaign.loanGrainFloor > DEFAULT_TUNED.campaign.loanGrainFloor)
})
