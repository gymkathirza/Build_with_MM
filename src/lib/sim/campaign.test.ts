import assert from "node:assert/strict"
import { test } from "node:test"
import { isUnlocked, markVictory, emptyFile } from "../campaign/save"
import { CAMPAIGN_MISSIONS } from "../campaign/missions"
import { createWorld, seedBuilding, spawnUnit, tick } from "./engine"
import {
  allocatePort,
  beginMission,
  campaignConstructBonus,
  chooseRelic,
  confirmPatricide,
  createCampaignWorld,
  dredgeMouth,
  endCholaLine,
  fundAcademy,
  fundBrother,
  fundCosmopolitan,
  fundGuild,
  fundKonerin,
  fundPatronage,
  fundYuvaraja,
  irrigate,
  raisePalayam,
  repayLoan,
  seatAltibi,
  sendCaravan,
  takeLoan,
} from "./campaign"

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

test("Kayal does not auto-win on March", () => {
  const w = createCampaignWorld("kayal")
  beginMission(w)
  const quay = w.buildings.find((b) => b.owner === 0 && b.type === "quay")
  assert.ok(quay)
  for (let i = 0; i < 20 * 20; i++) tick(w)
  assert.equal(w.winner, null)
  assert.ok((w.campaign?.shipsEscorted ?? 0) < 3)
  const live = w.campaign!.convoys.find((s) => !s.arrived && !s.sunk)
  if (live) {
    const d = Math.hypot(live.x - quay!.x, live.y - quay!.y)
    assert.ok(d > 8, `convoy too close to quay (${d})`)
  }
})

test("Kayal: three horse ships at the quay win the Marzban plate", () => {
  const w = createCampaignWorld("kayal")
  beginMission(w)
  const quay = w.buildings.find((b) => b.owner === 0 && b.type === "quay")
  assert.ok(quay)
  w.campaign!.nextConvoyAt = 0
  w.players[0].timber = 200
  w.players[0].ore = 120
  assert.equal(seatAltibi(w), true)
  assert.equal(dredgeMouth(w), true)
  assert.equal(raisePalayam(w), true)
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
  assert.equal(w.campaign?.altibi, true)
  assert.equal(w.campaign?.dredged, true)
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

test("Kayal: Yuvaraja orders spend Grain and raise the shadow meter", () => {
  const w = createCampaignWorld("kayal")
  beginMission(w)
  w.players[0].grain = 200
  const y0 = w.campaign!.yuvaraja
  assert.equal(fundYuvaraja(w), true)
  assert.ok(w.campaign!.yuvaraja > y0)
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

test("Palk: Chola line plus deposited relic wins without Relic Diplomacy", () => {
  const w = createCampaignWorld("palk")
  beginMission(w)
  w.players[0].grain = 200
  w.players[0].ore = 80
  assert.equal(endCholaLine(w), true)
  const relic = w.nodes.find((n) => n.id === w.campaign!.relicNodeId)
  assert.ok(relic)
  relic!.amount = 0
  w.campaign!.relicHeld = true
  w.players[0].relics = 1
  for (let i = 0; i < 8 && w.winner === null; i++) tick(w)
  assert.equal(w.winner, 0)
  assert.equal(w.campaign?.phase, "victory")
  assert.equal(w.campaign?.relicChoice, null)
})

test("Brother kings: seating the Confederacy opens Relic Diplomacy when the relic is held", () => {
  const w = createCampaignWorld("tamraparani", undefined, { relicSecured: true })
  beginMission(w)
  w.players[0].grain = 200
  w.players[0].ore = 80
  w.players[0].timber = 120
  assert.equal(fundBrother(w, "vira-west"), true)
  assert.equal(fundBrother(w, "vikkiraman"), true)
  assert.equal(fundBrother(w, "sundara-interior"), true)
  for (let i = 0; i < 8 && w.campaign?.phase === "play"; i++) tick(w)
  assert.equal(w.winner, null)
  assert.equal(w.campaign?.phase, "diplomacy")
  const frozen = w.tick
  tick(w)
  assert.equal(w.tick, frozen)
  assert.equal(chooseRelic(w, "return"), true)
  assert.equal(w.campaign?.tribute, true)
  assert.equal(w.campaign?.relicChoice, "return")
  assert.equal(w.winner, 0)
})

test("Divine Patronage and CSI spend customs gold", () => {
  const w = createCampaignWorld("tamraparani")
  beginMission(w)
  w.players[0].relics = 3
  w.players[0].ore = 80
  w.players[0].grain = 200
  const shaiva = w.campaign!.shaiva
  assert.equal(fundPatronage(w, "shaiva"), true)
  assert.ok(w.campaign!.shaiva > shaiva)
  const csi = w.campaign!.csi
  assert.equal(fundCosmopolitan(w, "mosque"), true)
  assert.ok(w.campaign!.csi > csi)
})

test("Brother kings: lights and waves no longer win the Polo plate", () => {
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
  assert.equal(w.winner, null)
})

test("Tamraparani: seating brothers raises Confederacy loyalty", () => {
  const w = createCampaignWorld("tamraparani")
  beginMission(w)
  w.players[0].grain = 200
  w.players[0].ore = 80
  w.players[0].timber = 120
  assert.equal(fundBrother(w, "vira-west"), true)
  assert.equal(fundBrother(w, "vikkiraman"), true)
  assert.equal(fundBrother(w, "sundara-interior"), true)
  assert.ok(w.campaign!.viraWest >= 50)
  assert.ok(w.campaign!.vikkiraman >= 50)
  assert.ok(w.campaign!.sundaraInterior >= 50)
})

test("Fracture: March opens the 1308 patricide beat", () => {
  const w = createCampaignWorld("fracture")
  beginMission(w)
  assert.equal(w.campaign?.phase, "patricide")
  const frozen = w.tick
  tick(w)
  assert.equal(w.tick, frozen)
  assert.equal(confirmPatricide(w), true)
  assert.equal(w.campaign?.phase, "play")
})

test("Fracture: Sundara down and two Kafur waves with Kayal standing", () => {
  const w = createCampaignWorld("fracture")
  beginMission(w)
  confirmPatricide(w)
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
  assert.equal(isUnlocked(slot, "edicts"), true)
  assert.equal(isUnlocked(slot, "kayal"), false)
  assert.equal(isUnlocked(slot, "palk"), false)
  file = markVictory(file, slot.id, "edicts")
  assert.equal(isUnlocked(file.slots[0]!, "kayal"), true)
  assert.equal(isUnlocked(file.slots[0]!, "palk"), false)
  file = markVictory(file, slot.id, "kayal")
  assert.equal(isUnlocked(file.slots[0]!, "palk"), true)
  assert.equal(isUnlocked(file.slots[0]!, "tamraparani"), false)
  file = markVictory(file, slot.id, "palk")
  assert.equal(file.slots[0]!.relicSecured, true)
  assert.equal(isUnlocked(file.slots[0]!, "tamraparani"), true)
  assert.equal(CAMPAIGN_MISSIONS.length, 5)
})

test("a fresh chronicle starts on the Yuvaraja plate", () => {
  const slot = emptyFile().slots[0]!
  assert.equal(isUnlocked(slot, "edicts"), true)
  assert.equal(isUnlocked(slot, "kayal"), false)
  assert.equal(CAMPAIGN_MISSIONS[0]!.id, "edicts")
  assert.equal(CAMPAIGN_MISSIONS[0]!.year, "c. 1251–1268")
})

test("briefing freezes edicts until March", () => {
  const w = createCampaignWorld("edicts")
  assert.equal(w.campaign?.phase, "briefing")
  const t0 = w.tick
  tick(w)
  assert.equal(w.tick, t0)
  beginMission(w)
  tick(w)
  assert.equal(w.tick, t0 + 1)
  assert.equal(w.campaign?.phase, "play")
})

test("Konerinmaikondan: prestige, Sonakarpalli, tanks, and a repaid book win the Yuvaraja plate", () => {
  const w = createCampaignWorld("edicts")
  beginMission(w)
  w.players[0].grain = 400
  w.players[0].timber = 200
  w.players[0].ore = 80
  assert.equal(fundKonerin(w), true)
  assert.equal(fundKonerin(w), true)
  assert.ok(w.campaign!.konerin >= 50)
  assert.ok(campaignConstructBonus(w) > 1.4)
  assert.equal(allocatePort(w, "arab"), true)
  assert.equal(w.campaign!.portAllocated, true)
  assert.ok(w.buildings.some((b) => b.owner === 0 && b.type === "mosque"))
  assert.equal(irrigate(w), true)
  w.players[0].grain = 80
  w.players[0].timber = 80
  assert.equal(fundAcademy(w, "chaturvedi"), true)
  assert.ok(w.campaign!.chaturvedi >= 24)
  const mosque = w.buildings.find((b) => b.owner === 0 && b.type === "mosque")!
  mosque.done = true
  mosque.construct = mosque.constructMax
  w.campaign!.portIntegrated = true
  assert.equal(takeLoan(w), true)
  assert.equal(w.campaign!.templeDebt, 1)
  w.players[0].relics = 1
  assert.equal(repayLoan(w), true)
  assert.equal(w.campaign!.templeDebt, 0)
  tick(w)
  assert.equal(w.winner, 0)
  assert.equal(w.campaign?.veteranArmy, true)
  assert.equal(w.campaign?.phase, "victory")
})

test("Konerinmaikondan: two grain caravans can replace irrigation tanks", () => {
  const w = createCampaignWorld("edicts")
  beginMission(w)
  w.players[0].grain = 400
  w.players[0].ore = 80
  fundKonerin(w)
  fundKonerin(w)
  allocatePort(w, "arab")
  const mosque = w.buildings.find((b) => b.owner === 0 && b.type === "mosque")!
  mosque.done = true
  mosque.construct = mosque.constructMax
  w.campaign!.portIntegrated = true
  w.players[0].timber = 80
  assert.equal(fundAcademy(w, "scriptorium"), true)
  assert.equal(sendCaravan(w), true)
  assert.equal(sendCaravan(w), true)
  const hall = w.buildings.find((b) => b.owner === 0 && b.type === "hearth")!
  for (const s of w.campaign!.convoys) {
    s.x = hall.x
    s.y = hall.y
  }
  for (let i = 0; i < 8 && w.winner === null; i++) tick(w)
  assert.equal(w.winner, 0)
  assert.ok((w.campaign?.grainCaravans ?? 0) >= 2)
})

test("Konerinmaikondan: empty granaries lose the drought", () => {
  const w = createCampaignWorld("edicts")
  beginMission(w)
  w.players[0].grain = 0
  tick(w)
  assert.equal(w.winner, 1)
  assert.equal(w.campaign?.phase, "defeat")
})

test("Konerinmaikondan: Nadu revolt at full unrest", () => {
  const w = createCampaignWorld("edicts")
  beginMission(w)
  w.campaign!.unrest = 100
  w.players[0].grain = 200
  tick(w)
  assert.equal(w.winner, 1)
})

test("edicts victory carries a veteran army onto Palk", () => {
  const w = createCampaignWorld("palk", undefined, { veteranArmy: true })
  beginMission(w)
  assert.ok(w.units.some((u) => u.owner === 0 && u.type === "rowther"))
  assert.ok(w.units.filter((u) => u.owner === 0 && u.type === "guard").length >= 3)
})

test("markVictory persists Konerin, debt, and veteran army", () => {
  let file = emptyFile()
  file = markVictory(file, file.slots[0]!.id, "edicts", {
    veteranArmy: true,
    templeDebt: 1,
    konerin: 56,
    portIntegrated: true,
  })
  const slot = file.slots[0]!
  assert.equal(slot.veteranArmy, true)
  assert.equal(slot.templeDebt, 1)
  assert.equal(slot.konerin, 56)
  assert.equal(slot.portIntegrated, true)
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
