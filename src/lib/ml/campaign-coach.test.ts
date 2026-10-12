import assert from "node:assert/strict"
import { test } from "node:test"
import { tick } from "../sim/engine"
import { tickAi } from "../sim/ai"
import { personaById } from "../sim/personas"
import { createCampaignWorld } from "../sim/campaign"
import { DEFAULT_CAMPAIGN, DEFAULT_TUNED, improveFromCampaign } from "./score"
import { tickCampaignCoach } from "./campaign-coach"

function play(mission: "edicts" | "kayal" | "tamraparani", seconds: number) {
  const w = createCampaignWorld(mission, DEFAULT_TUNED.ai)
  const student = { ...DEFAULT_TUNED.ai }
  const rival = personaById("balanced")
  const max = seconds * 20
  for (let i = 0; i < max && w.winner === null; i++) {
    tickCampaignCoach(w, DEFAULT_CAMPAIGN, i)
    if (w.campaign?.phase === "play") {
      tickAi(w, 0, student, personaById("coach"))
      tickAi(w, 1, rival.params, rival)
    }
    tick(w)
  }
  return w
}

test("campaign coach wins the Yuvaraja plate", () => {
  const w = play("edicts", 90)
  assert.equal(w.campaign?.phase, "victory")
  assert.equal(w.winner, 0)
  assert.ok((w.campaign?.konerin ?? 0) >= 50)
})

test("campaign coach seats Al-Tibi, dredge, and Palayam on Kayal", () => {
  const w = play("kayal", 40)
  assert.equal(w.campaign?.altibi, true)
  assert.equal(w.campaign?.dredged, true)
  assert.equal(w.campaign?.palayam, true)
})

test("campaign coach seats the confederacy on Tamraparani", () => {
  const w = play("tamraparani", 50)
  assert.ok(w.winner === 0 || w.campaign?.phase === "diplomacy" || w.campaign?.phase === "victory")
})

test("Kayal losses widen escort radius", () => {
  const next = improveFromCampaign(DEFAULT_TUNED, [
    { missionId: "kayal", winner: 1, shipsLost: 3, failWhy: "Malabar galleys emptied the horse road before the gulf." },
  ])
  assert.ok(next.campaign.escortRadius > DEFAULT_TUNED.campaign.escortRadius)
})
