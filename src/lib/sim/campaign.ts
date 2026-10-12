import { CAMPAIGN_MISSIONS, missionById, type MissionId } from "../campaign/missions"
import { BUILDING_STATS, DT } from "./catalog"
import {
  createWorld,
  issueAttackMove,
  seedBuilding,
  spawnUnit,
  type AiParams,
  type Owner,
  type World,
} from "./engine"

export type HorseConvoy = {
  x: number
  y: number
  hp: number
  hpMax: number
  arrived: boolean
  sunk: boolean
}

export type CampaignPhase = "briefing" | "play" | "diplomacy" | "victory" | "defeat"
export type RelicChoice = "keep" | "return"

export type CampaignRuntime = {
  missionId: MissionId
  phase: CampaignPhase
  manigramam: number
  anjuvannam: number
  escortsUnlocked: boolean
  convoys: HorseConvoy[]
  shipsEscorted: number
  shipsLost: number
  shipsNeeded: number
  relicHeld: boolean
  relicNodeId: number | null
  relicChoice: RelicChoice | null
  pirateScale: number
  night: boolean
  sharkKills: number
  wavesBroken: number
  wavesNeeded: number
  kafurWave: number
  nextSpawnAt: number
  nextConvoyAt: number
  nextWaveAt: number
  nextRevoltAt: number
  convoysSpawned: number
  wavesSpawned: number
  shaiva: number
  vaishnava: number
  csi: number
  stupa: number
  loyalty: number
  unrest: number
  tribute: boolean
  objective: string
  failWhy: string
  winWhy: string
  kayalHearthId: number | null
}

export function isWater(w: World, x: number, y: number) {
  const id = w.mapId
  if (id === "kayal" || id === "tamraparani") return y > w.size * 0.6
  if (id === "palk") return Math.abs(y - w.size * 0.5) < w.size * 0.11
  if (id === "madurai-fracture") return x > w.size * 0.7
  return false
}

export function isBeach(w: World, x: number, y: number) {
  if (isWater(w, x, y)) return false
  const n = [
    [x + 3, y],
    [x - 3, y],
    [x, y + 3],
    [x, y - 3],
  ]
  return n.some(([nx, ny]) => isWater(w, nx, ny))
}

function dist(ax: number, ay: number, bx: number, by: number) {
  return Math.hypot(ax - bx, ay - by)
}

function clamp01(v: number) {
  return Math.max(0, Math.min(100, v))
}

function p0Hall(w: World, id?: number | null) {
  if (id != null) return w.buildings.find((b) => b.id === id && b.owner === 0 && b.type === "hearth") ?? null
  return w.buildings.find((b) => b.owner === 0 && b.type === "hearth") ?? null
}

function countDone(w: World, type: "lighthouse" | "charm" | "quay", owner: Owner = 0) {
  return w.buildings.filter((b) => b.owner === owner && b.type === type && b.done).length
}

function lighthouseCount(w: World) {
  return countDone(w, "lighthouse")
}

function corsairCap(c: CampaignRuntime) {
  return c.missionId === "fracture" ? 10 : 7
}

function spawnCorsair(w: World, x: number, y: number) {
  const c = w.campaign
  if (!c) return
  const live = w.units.filter((u) => u.owner === 1 && u.type === "corsair").length
  if (live >= corsairCap(c)) return
  spawnUnit(w, 1, "corsair", x, y)
}

export function campaignSpeed(w: World, type: string, x: number, y: number) {
  if (!w.campaign) return 1
  const water = isWater(w, x, y)
  if (type === "dhoni" || type === "corsair") return water ? 1.35 : 0.55
  if (type === "rowther" && isBeach(w, x, y)) return 1.22
  if (type === "marzban" && water) return 1.12
  return 1
}

export function campaignHitBonus(w: World, type: string, x: number, y: number, owner?: 0 | 1) {
  if (!w.campaign) return 1
  const c = w.campaign
  let m = 1
  if (type === "rowther" && (isBeach(w, x, y) || isWater(w, x, y))) m *= 1.45
  if (c.relicHeld && owner === 1) m *= 0.82
  if (c.relicChoice === "keep" && owner === 0) m *= 1.12
  const temple = w.buildings.find((b) => b.owner === 0 && b.type === "temple" && b.done)
  if (temple && owner === 0 && dist(x, y, temple.x, temple.y) < 12) {
    m *= 1 + Math.min(0.2, (c.shaiva + c.vaishnava) / 500)
  }
  return m
}

export function fundGuild(w: World, which: "manigramam" | "anjuvannam") {
  const c = w.campaign
  if (!c || c.phase !== "play") return false
  const p = w.players[0]
  if (which === "manigramam") {
    if (p.grain < 70) {
      w.events.push({ k: "failed", owner: 0, why: "Manigramam wants Grain." })
      return false
    }
    p.grain -= 70
    c.manigramam = clamp01(c.manigramam + 22)
    const hall = p0Hall(w)
    if (hall) spawnUnit(w, 0, "guard", hall.x + 2, hall.y + 1)
  } else {
    if (p.ore < 35) {
      w.events.push({ k: "failed", owner: 0, why: "Anjuvannam wants Ore." })
      return false
    }
    p.ore -= 35
    c.anjuvannam = clamp01(c.anjuvannam + 22)
  }
  c.escortsUnlocked = c.manigramam >= 50 && c.anjuvannam >= 50
  if (c.escortsUnlocked) {
    const quay = w.buildings.find((b) => b.owner === 0 && b.type === "quay" && b.done)
    if (quay) spawnUnit(w, 0, "marzban", quay.x - 2, quay.y)
  }
  return true
}

export function fundPatronage(w: World, which: "shaiva" | "vaishnava") {
  const c = w.campaign
  if (!c || c.phase !== "play") return false
  const p = w.players[0]
  if (p.relics < 1) {
    w.events.push({ k: "failed", owner: 0, why: "Kayal customs gold (Relics) funds Divine Patronage." })
    return false
  }
  p.relics -= 1
  if (which === "shaiva") c.shaiva = clamp01(c.shaiva + 24)
  else c.vaishnava = clamp01(c.vaishnava + 24)
  c.csi = clamp01(c.csi + 8)
  c.loyalty = clamp01(c.loyalty + 14)
  c.unrest = clamp01(c.unrest - 12)
  return true
}

export function fundCosmopolitan(w: World, which: "mosque" | "stupa") {
  const c = w.campaign
  if (!c || c.phase !== "play") return false
  const p = w.players[0]
  if (which === "mosque") {
    if (p.ore < 25) {
      w.events.push({ k: "failed", owner: 0, why: "The Sonakarpalli mosque wants Ore." })
      return false
    }
    p.ore -= 25
    c.csi = clamp01(c.csi + 18)
  } else {
    if (p.grain < 60) {
      w.events.push({ k: "failed", owner: 0, why: "A Buddhist shrine wants Grain." })
      return false
    }
    p.grain -= 60
    c.stupa = clamp01(c.stupa + 22)
    c.csi = clamp01(c.csi + 14)
  }
  c.unrest = clamp01(c.unrest - 6)
  return true
}

export function chooseRelic(w: World, choice: RelicChoice) {
  const c = w.campaign
  if (!c || c.phase !== "diplomacy") return false
  c.relicChoice = choice
  if (choice === "keep") {
    c.loyalty = clamp01(c.loyalty + 10)
    win(
      w,
      "The Tooth Relic stays in Madurai. Masila Mani’s court and Manon Mani’s sea hold it; Jaffna still watches.",
    )
  } else {
    c.tribute = true
    c.pirateScale *= 1.2
    w.players[0].grain += 80
    w.players[0].relics += 2
    win(
      w,
      "Parakramabahu III takes the Tooth Relic home. Jaffna stays a vassal; tribute follows Manon Mani and Masila Mani.",
    )
  }
  return true
}

export function beginMission(w: World) {
  if (!w.campaign) return
  if (w.campaign.phase === "briefing") w.campaign.phase = "play"
}

function win(w: World, why: string) {
  const c = w.campaign
  if (!c || (c.phase !== "play" && c.phase !== "diplomacy")) return
  c.phase = "victory"
  c.winWhy = why
  w.winner = 0
}

function lose(w: World, why: string) {
  const c = w.campaign
  if (!c || c.phase !== "play") return
  c.phase = "defeat"
  c.failWhy = why
  w.winner = 1
}

function tickKayal(w: World, c: CampaignRuntime) {
  const quay = w.buildings.find((b) => b.owner === 0 && b.type === "quay")
  const hx = quay?.x ?? w.size * 0.22
  const hy = quay?.y ?? w.size * 0.68
  if (w.tick >= c.nextConvoyAt && c.convoysSpawned < c.shipsNeeded + 1) {
    c.convoys.push({
      x: 4,
      y: w.size * 0.78,
      hp: 90,
      hpMax: 90,
      arrived: false,
      sunk: false,
    })
    c.convoysSpawned++
    c.nextConvoyAt = w.tick + 20 * 9
  }
  const escorts = w.units.filter(
    (u) => u.owner === 0 && (u.type === "dhoni" || u.type === "marzban"),
  )
  for (const ship of c.convoys) {
    if (ship.arrived || ship.sunk) continue
    const dx = hx - ship.x
    const dy = hy - ship.y
    const d = Math.hypot(dx, dy) || 1
    const hull = c.csi < 22 ? 5.2 : 7.5
    ship.x += (dx / d) * hull * DT
    ship.y += (dy / d) * hull * DT
    for (const u of w.units) {
      if (u.owner !== 1) continue
      if (dist(u.x, u.y, ship.x, ship.y) < 2.2) ship.hp -= 11 * DT
    }
    const cover = escorts.some((u) => dist(u.x, u.y, ship.x, ship.y) < 4.5)
    if (cover) ship.hp += 4 * DT
    if (ship.hp <= 0) {
      ship.sunk = true
      c.shipsLost++
    } else if (d < 3.2) {
      ship.arrived = true
      c.shipsEscorted++
      w.players[0].relics += 1
    }
  }
  if (w.tick >= c.nextSpawnAt) {
    const scale = c.pirateScale
    spawnCorsair(w, w.size * (0.45 + (w.tick % 7) * 0.04), w.size * 0.86)
    c.nextSpawnAt = w.tick + Math.floor(20 * 6 * scale)
  }
  for (const u of w.units) {
    if (u.owner !== 1 || u.type !== "corsair") continue
    if (u.order.t !== "idle" && u.order.t !== "attackMove") continue
    const live = c.convoys.find((s) => !s.arrived && !s.sunk)
    if (live) issueAttackMove(w, [u.id], live.x, live.y)
    else issueAttackMove(w, [u.id], hx, hy)
  }
  c.objective = `Horse ships ${c.shipsEscorted}/${c.shipsNeeded} · lost ${c.shipsLost}/3 · CSI ${c.csi | 0}`
  if (c.shipsEscorted >= c.shipsNeeded) {
    win(w, "The Hormuz hulls are under Kayal’s lamps — Manon Mani’s quay, Masila Mani’s Twin-Fish gate.")
  }
  else if (c.shipsLost >= 3) lose(w, "Malabar corsairs emptied the horse road.")
}

function tickPalk(w: World, c: CampaignRuntime) {
  const relic = c.relicNodeId != null ? w.nodes.find((n) => n.id === c.relicNodeId) : null
  const hall = p0Hall(w)
  if (relic && relic.amount <= 0) c.relicHeld = true
  if (c.relicHeld && hall && c.phase === "play") {
    const home = w.units.some(
      (u) => u.owner === 0 && u.carry?.res === "relics" && dist(u.x, u.y, hall.x, hall.y) < 4,
    )
    if (home || w.players[0].relics >= 1) {
      c.phase = "diplomacy"
      c.objective =
        "Keep the Tooth Relic in Madurai, or return it when Parakramabahu III comes — Aryachakravarti’s prize."
      return
    }
  }
  if (w.tick >= c.nextSpawnAt) {
    spawnCorsair(w, w.size * 0.78, w.size * 0.42)
    c.nextSpawnAt = w.tick + Math.floor(20 * 8 * c.pirateScale)
  }
  c.objective = c.relicHeld
    ? "Carry the Tooth Relic to the landing hearth"
    : "Storm Yapahuwa with Aryachakravarti and take the Tooth Relic"
}

function tickTamra(w: World, c: CampaignRuntime) {
  const lights = lighthouseCount(w)
  c.night = lights === 0 && Math.floor(w.tick / (20 * 16)) % 2 === 1
  const shrine = countDone(w, "charm") > 0
  if (w.tick >= c.nextWaveAt && c.wavesSpawned < c.wavesNeeded) {
    const y = w.size * 0.82
    for (let i = 0; i < (c.night ? 3 : 2); i++) {
      spawnCorsair(w, w.size * (0.35 + i * 0.12), y)
    }
    c.wavesSpawned++
    c.nextWaveAt = w.tick + 20 * 12
  }
  if (!c.night && c.wavesSpawned > c.wavesBroken) {
    const raiders = w.units.filter((u) => u.owner === 1 && u.type === "corsair").length
    if (raiders === 0) c.wavesBroken = c.wavesSpawned
  }
  if (!shrine) {
    for (const u of w.units) {
      if (u.owner !== 0 || u.type !== "levy") continue
      if (u.order.t !== "gather") continue
      const n = w.nodes.find((q) => u.order.t === "gather" && q.id === u.order.node)
      if (!n || n.fauna !== "shark") continue
      u.hp -= 9 * DT
      if (u.hp <= 0) {
        w.units = w.units.filter((x) => x.id !== u.id)
        w.events.push({ k: "death", id: u.id, owner: 0, type: "levy" })
        c.sharkKills++
      }
    }
  }
  if (c.night && lights === 0 && w.tick >= c.nextSpawnAt) {
    spawnCorsair(w, w.size * 0.2, w.size * 0.7)
    c.nextSpawnAt = w.tick + 20 * 5
  } else if (lights > 0) {
    c.nextSpawnAt = w.tick + 20 * 14
  }
  c.objective = `Lights ${lights}/2 · shrine ${shrine ? 1 : 0}/1 · waves ${c.wavesBroken}/${c.wavesNeeded}`
  if (lights >= 2 && shrine && c.wavesBroken >= c.wavesNeeded) {
    win(w, "Kulasekharapatnam and Manapad are lit. The gulf is charmed.")
  } else if (c.sharkKills >= 6) lose(w, "Pearl divers were taken in the Gulf of Mannar.")
}

function tickFracture(w: World, c: CampaignRuntime) {
  const kayal = p0Hall(w, c.kayalHearthId)
  const madurai = w.buildings.find(
    (b) => b.owner === 0 && b.type === "hearth" && b.id !== c.kayalHearthId,
  )
  if (!kayal) {
    lose(w, "Kayal is open. Malik Kafur has the port.")
    return
  }
  if (!madurai) {
    lose(w, "Madurai fell in the brothers’ war.")
    return
  }
  if (w.tick >= c.nextWaveAt && c.kafurWave < 2) {
    const n = 3 + c.kafurWave * 2
    for (let i = 0; i < n; i++) {
      spawnUnit(w, 1, i % 2 === 0 ? "corsair" : "guard", w.size * 0.55 + i * 2, 6)
    }
    spawnUnit(w, 1, "ashrider", w.size * 0.62, 8)
    c.kafurWave++
    c.nextWaveAt = w.tick + 20 * 16
  }
  const sundaraDown = !w.buildings.some((b) => b.owner === 1 && b.type === "hearth")
  const kafurLive = w.units.filter((u) => u.owner === 1 && u.type === "corsair").length
  if (c.kafurWave >= 2 && kafurLive === 0) c.wavesBroken = 2
  c.objective = `Kayal holds · Sundara ${sundaraDown ? "broken" : "camps"} · Kafur ${c.wavesBroken}/2`
  if (sundaraDown && c.wavesBroken >= 2) win(w, "Vira’s camp stands. Kafur’s waves broke on Kayal.")
}

function tickGovernance(w: World, c: CampaignRuntime) {
  if (c.tribute && w.tick % 40 === 0) w.players[0].grain += 2
  if (c.csi >= 78 && c.shaiva + c.vaishnava < 40 && w.tick >= c.nextRevoltAt) {
    const hall = p0Hall(w)
    if (hall) spawnUnit(w, 1, "guard", hall.x + 10, hall.y - 8)
    c.nextRevoltAt = w.tick + 20 * 14
    c.unrest = clamp01(c.unrest + 10)
  }
}

export function tickCampaign(w: World) {
  const c = w.campaign
  if (!c) return
  if (c.phase === "briefing" || c.phase === "diplomacy") return
  if (c.phase !== "play") return
  const halls = w.buildings.filter((b) => b.owner === 0 && b.type === "hearth")
  if (!halls.length) {
    lose(w, "The hearth is gone.")
    return
  }
  tickGovernance(w, c)
  if (c.missionId === "kayal") tickKayal(w, c)
  else if (c.missionId === "palk") tickPalk(w, c)
  else if (c.missionId === "tamraparani") tickTamra(w, c)
  else tickFracture(w, c)
}

function stripRelics(w: World) {
  w.nodes = w.nodes.filter((n) => n.type !== "relics")
}

function convertP1ToCorsairs(w: World, keep = 2) {
  const levies = w.units.filter((u) => u.owner === 1 && u.type === "levy")
  for (const u of levies) {
    w.units = w.units.filter((x) => x.id !== u.id)
  }
  const hall = w.buildings.find((b) => b.owner === 1 && b.type === "hearth")
  if (!hall) return
  for (let i = 0; i < keep; i++) spawnUnit(w, 1, "corsair", hall.x - 2 - i, hall.y)
}

export function createCampaignWorld(
  missionId: string,
  ai?: AiParams,
  opts?: { pirateScale?: number; relicChoice?: RelicChoice | null },
): World {
  const spec = missionById(missionId) ?? CAMPAIGN_MISSIONS[0]!
  const pirateScale = opts?.pirateScale ?? 1
  const w = createWorld(spec.faction, spec.enemy, ai, { mapId: spec.map, persona: "balanced" })
  const p0 = w.buildings.find((b) => b.owner === 0 && b.type === "hearth")!
  const p1 = w.buildings.find((b) => b.owner === 1 && b.type === "hearth")!
  const c: CampaignRuntime = {
    missionId: spec.id,
    phase: "briefing",
    manigramam: 28,
    anjuvannam: 28,
    escortsUnlocked: false,
    convoys: [],
    shipsEscorted: 0,
    shipsLost: 0,
    shipsNeeded: 3,
    relicHeld: false,
    relicNodeId: null,
    relicChoice: opts?.relicChoice ?? null,
    pirateScale,
    night: false,
    sharkKills: 0,
    wavesBroken: 0,
    wavesNeeded: 3,
    kafurWave: 0,
    nextSpawnAt: 20 * 4,
    nextConvoyAt: 20 * 3,
    nextWaveAt: 20 * 8,
    nextRevoltAt: 20 * 18,
    convoysSpawned: 0,
    wavesSpawned: 0,
    shaiva: 18,
    vaishnava: 12,
    csi: 42,
    stupa: 0,
    loyalty: 40,
    unrest: 18,
    tribute: opts?.relicChoice === "return",
    objective: spec.objective,
    failWhy: spec.lose,
    winWhy: spec.win,
    kayalHearthId: null,
  }
  w.campaign = c
  w.players[0].grain = 320
  w.players[0].timber = 280
  w.players[0].ore = 160
  w.popCap = Math.max(w.popCap, 40)

  if (spec.id === "kayal") {
    const quay = seedBuilding(w, 0, "quay", p0.x + 6, p0.y + 8, true)
    spawnUnit(w, 0, "dhoni", quay.x + 2, quay.y + 3)
    spawnUnit(w, 0, "dhoni", quay.x + 4, quay.y + 2)
    spawnUnit(w, 0, "guard", p0.x + 2, p0.y - 2)
    spawnUnit(w, 0, "guard", p0.x + 3, p0.y - 1)
    convertP1ToCorsairs(w, 3)
    w.players[1].grain = 80
    w.players[1].timber = 40
  }

  if (spec.id === "palk") {
    seedBuilding(w, 0, "quay", p0.x + 5, p0.y + 6, true)
    spawnUnit(w, 0, "dhoni", p0.x + 8, p0.y + 10)
    spawnUnit(w, 0, "dhoni", p0.x + 10, p0.y + 9)
    spawnUnit(w, 0, "guard", p0.x + 3, p0.y)
    spawnUnit(w, 0, "guard", p0.x + 4, p0.y - 1)
    spawnUnit(w, 0, "warden", p0.x + 2, p0.y + 2)
    stripRelics(w)
    const rx = p1.x - 5
    const ry = p1.y - 2
    w.nodes.push({
      id: w.nextId++,
      kind: "node",
      type: "relics",
      x: rx,
      y: ry,
      amount: 1,
      fauna: null,
    })
    c.relicNodeId = w.nextId - 1
    p1.hpMax = Math.floor(BUILDING_STATS.hearth.hp * 1.15)
    p1.hp = p1.hpMax
    spawnUnit(w, 1, "guard", p1.x - 3, p1.y)
    spawnUnit(w, 1, "guard", p1.x - 2, p1.y + 2)
    spawnUnit(w, 1, "warden", p1.x - 1, p1.y - 3)
  }

  if (spec.id === "tamraparani") {
    seedBuilding(w, 0, "quay", p0.x + 5, p0.y + 7, true)
    spawnUnit(w, 0, "rowther", p0.x + 4, p0.y + 3)
    spawnUnit(w, 0, "rowther", p0.x + 6, p0.y + 2)
    spawnUnit(w, 0, "dhoni", p0.x + 8, p0.y + 10)
    w.nodes.push(
      {
        id: w.nextId++,
        kind: "node",
        type: "relics",
        x: p0.x + 10,
        y: w.size * 0.72,
        amount: 6,
        fauna: "shark",
      },
      {
        id: w.nextId++,
        kind: "node",
        type: "relics",
        x: p0.x + 16,
        y: w.size * 0.76,
        amount: 6,
        fauna: "shark",
      },
    )
    convertP1ToCorsairs(w, 2)
    w.players[0].timber += 80
    w.players[0].relics = 2
  }

  if (spec.id === "fracture") {
    const kayal = seedBuilding(w, 0, "hearth", w.size * 0.78, w.size * 0.55, true)
    c.kayalHearthId = kayal.id
    seedBuilding(w, 0, "quay", kayal.x - 5, kayal.y + 6, true)
    spawnUnit(w, 0, "levy", kayal.x - 2, kayal.y)
    spawnUnit(w, 0, "levy", kayal.x - 3, kayal.y + 1)
    spawnUnit(w, 0, "rowther", p0.x + 3, p0.y)
    spawnUnit(w, 0, "guard", p0.x + 2, p0.y - 2)
    spawnUnit(w, 0, "guard", kayal.x - 1, kayal.y - 2)
    spawnUnit(w, 0, "dhoni", kayal.x - 4, kayal.y + 8)
    spawnUnit(w, 1, "guard", p1.x - 3, p1.y)
    spawnUnit(w, 1, "ashrider", p1.x - 4, p1.y + 2)
    c.nextWaveAt = 20 * 12
    if (pirateScale > 1.01) c.nextWaveAt += 20 * 4
  }

  return w
}

export function campaignBuildTypes(missionId: string) {
  const extra: Array<"quay" | "lighthouse" | "charm" | "lodge" | "temple" | "mosque"> = [
    "quay",
    "lighthouse",
    "temple",
    "mosque",
  ]
  if (missionId === "tamraparani" || missionId === "fracture") extra.push("charm", "lodge")
  if (missionId === "kayal" || missionId === "palk") extra.push("lodge")
  return extra
}
