import assert from "node:assert/strict"
import { test } from "node:test"
import { isUnlocked, markVictory, emptyFile } from "../campaign/save"
import { CAMPAIGN_MISSIONS } from "../campaign/missions"
import { createWorld, seedBuilding, spawnUnit, tick } from "./engine"
import { beginMission, createCampaignWorld, fundGuild } from "./campaign"

test("skirmish worlds skip campaign state", () => {
  const w = createWorld("ashen", "gilded", undefined, { mapId: "emberglass" })
  assert.equal(w.campaign, undefined)
  const t0 = w.tick
  tick(w)
  assert.equal(w.tick, t0 + 1)
})

test("briefing freezes the 20 Hz sim until March", () => {
  const w = createCampaignWorld("kayal")
  assert.equal(w.campaign?.phase, "briefing")
  const t0 = w.tick
  tick(w)
  assert.equal(w.tick, t0)
  beginMission(w)
  tick(w)
  assert.equal(w.tick, t0 + 1)
  assert.equal(w.campaign?.phase, "play")
})

test("Kayal: three horse ships at the quay win the Marzban plate", () => {
  const w = createCampaignWorld("kayal")
  beginMission(w)
  const quay = w.buildings.find((b) => b.owner === 0 && b.type === "quay")
  assert.ok(quay)
  w.campaign!.nextConvoyAt = 0
  for (let i = 0; i < 20 * 50 && w.winner === null; i++) {
    w.units = w.units.filter((u) => !(u.owner === 1 && u.type === "corsair"))
    for (const s of w.campaign!.convoys) {
      if (!s.arrived && !s.sunk) {
        s.hp = s.hpMax
        s.x = quay!.x
        s.y = quay!.y
      }
    }
    tick(w)
  }
  assert.equal(w.winner, 0)
  assert.equal(w.campaign?.phase, "victory")
  assert.ok((w.campaign?.shipsEscorted ?? 0) >= 3)
})

test("Kayal: three sunk convoys lose the plate", () => {
  const w = createCampaignWorld("kayal")
  beginMission(w)
  w.campaign!.convoys = [
    { x: 8, y: 80, hp: 1, hpMax: 90, arrived: false, sunk: false },
    { x: 10, y: 80, hp: 1, hpMax: 90, arrived: false, sunk: false },
    { x: 12, y: 80, hp: 1, hpMax: 90, arrived: false, sunk: false },
  ]
  w.campaign!.convoysSpawned = 3
  w.campaign!.nextConvoyAt = 99999
  spawnNear(w)
  for (let i = 0; i < 20 * 8 && w.winner === null; i++) tick(w)
  assert.equal(w.winner, 1)
  assert.equal(w.campaign?.phase, "defeat")
})

test("Kayal: funding both guilds unlocks Marzban escorts", () => {
  const w = createCampaignWorld("kayal")
  beginMission(w)
  w.players[0].grain = 400
  w.players[0].ore = 400
  assert.equal(fundGuild(w, "manigramam"), true)
  assert.equal(fundGuild(w, "anjuvannam"), true)
  assert.equal(fundGuild(w, "manigramam"), true)
  assert.equal(fundGuild(w, "anjuvannam"), true)
  assert.equal(w.campaign?.escortsUnlocked, true)
  assert.ok(w.units.some((u) => u.owner === 0 && u.type === "marzban"))
})

test("Palk: depositing the Tooth Relic wins Subhagiri", () => {
  const w = createCampaignWorld("palk")
  beginMission(w)
  const relic = w.nodes.find((n) => n.id === w.campaign!.relicNodeId)
  assert.ok(relic)
  relic!.amount = 0
  w.campaign!.relicHeld = true
  w.players[0].relics = 1
  for (let i = 0; i < 8 && w.winner === null; i++) tick(w)
  assert.equal(w.winner, 0)
  assert.equal(w.campaign?.phase, "victory")
})

test("Tamraparani: lighthouses and shrine plus three waves win", () => {
  const w = createCampaignWorld("tamraparani")
  beginMission(w)
  const hall = w.buildings.find((b) => b.owner === 0 && b.type === "hearth")!
  seedBuilding(w, 0, "lighthouse", hall.x + 8, hall.y - 4, true)
  seedBuilding(w, 0, "lighthouse", hall.x + 10, hall.y + 6, true)
  seedBuilding(w, 0, "charm", hall.x - 6, hall.y + 4, true)
  w.campaign!.wavesBroken = 3
  w.campaign!.wavesSpawned = 3
  w.units = w.units.filter((u) => u.owner !== 1)
  tick(w)
  assert.equal(w.winner, 0)
})

test("Fracture: Sundara down and two Kafur waves with Kayal standing", () => {
  const w = createCampaignWorld("fracture")
  beginMission(w)
  w.buildings = w.buildings.filter((b) => !(b.owner === 1 && b.type === "hearth"))
  w.units = w.units.filter((u) => !(u.owner === 1 && u.type === "corsair"))
  w.campaign!.kafurWave = 2
  w.campaign!.wavesBroken = 2
  w.campaign!.nextWaveAt = 99999
  tick(w)
  assert.equal(w.winner, 0)
})

test("plates unlock in order after victories", () => {
  let file = emptyFile()
  const slot = file.slots[0]!
  assert.equal(isUnlocked(slot, "kayal"), true)
  assert.equal(isUnlocked(slot, "palk"), false)
  file = markVictory(file, slot.id, "kayal")
  assert.equal(isUnlocked(file.slots[0]!, "palk"), true)
  assert.equal(isUnlocked(file.slots[0]!, "tamraparani"), false)
  file = markVictory(file, slot.id, "palk")
  assert.equal(file.slots[0]!.relicSecured, true)
  assert.equal(isUnlocked(file.slots[0]!, "tamraparani"), true)
  assert.equal(CAMPAIGN_MISSIONS.length, 4)
})

test("campaign tick stays cheap on Kayal", () => {
  const w = createCampaignWorld("kayal")
  beginMission(w)
  const t0 = performance.now()
  for (let i = 0; i < 400; i++) tick(w)
  const ms = performance.now() - t0
  assert.ok(ms < 250, `400 ticks took ${ms}ms`)
})

function spawnNear(w: ReturnType<typeof createCampaignWorld>) {
  for (const s of w.campaign!.convoys) {
    spawnUnit(w, 1, "corsair", s.x, s.y)
  }
}
