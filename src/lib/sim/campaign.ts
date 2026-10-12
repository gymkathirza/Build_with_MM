import { CAMPAIGN_MISSIONS, missionById, type MissionId } from "../campaign/missions"
import { type BrotherId } from "../campaign/family"
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

export type CampaignPhase = "briefing" | "patricide" | "play" | "diplomacy" | "victory" | "defeat"
export type RelicChoice = "keep" | "return"
export type PortFaction = "arab" | "chinese"

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
  yuvaraja: number
  konerin: number
  portAllocated: boolean
  portFaction: PortFaction | null
  portIntegrated: boolean
  irrigated: boolean
  grainCaravans: number
  templeDebt: number
  veteranArmy: boolean
  chaturvedi: number
  scriptorium: number
  dredged: boolean
  palayam: boolean
  altibi: boolean
  cholaEnded: boolean
  viraWest: number
  vikkiraman: number
  sundaraInterior: number
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

export function campaignConstructBonus(w: World) {
  if (!w.campaign) return 1
  const k = w.campaign.konerin
  const academy = 1 + (w.campaign.chaturvedi + w.campaign.scriptorium) / 280
  if (w.campaign.missionId === "edicts") {
    if (k >= 50) return 1.55 * academy
    if (k >= 25) return 1.12 * academy
    return 0.72 * academy
  }
  if (k >= 50) return 1.2 * academy
  return academy
}

export function campaignHitBonus(w: World, type: string, x: number, y: number, owner?: 0 | 1) {
  if (!w.campaign) return 1
  const c = w.campaign
  let m = 1
  if (type === "rowther" && (isBeach(w, x, y) || isWater(w, x, y))) m *= c.palayam ? 1.7 : 1.45
  if (c.relicHeld && owner === 1) m *= 0.82
  if (c.relicChoice === "keep" && owner === 0) m *= 1.12
  if (owner === 0 && c.yuvaraja >= 50) m *= 1.08
  if (owner === 0 && confederacyAvg(c) >= 60) m *= 1.06
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
  c.escortsUnlocked = c.altibi || (c.manigramam >= 50 && c.anjuvannam >= 50)
  if (c.escortsUnlocked) {
    const quay = w.buildings.find((b) => b.owner === 0 && b.type === "quay" && b.done)
    if (quay) spawnUnit(w, 0, "marzban", quay.x - 2, quay.y)
  }
  return true
}

export function fundYuvaraja(w: World) {
  const c = w.campaign
  if (!c || c.phase !== "play") return false
  const p = w.players[0]
  if (p.grain < 55) {
    w.events.push({ k: "failed", owner: 0, why: "Yuvaraja orders want Grain." })
    return false
  }
  p.grain -= 55
  c.yuvaraja = clamp01(c.yuvaraja + 24)
  c.loyalty = clamp01(c.loyalty + 8)
  const hall = p0Hall(w)
  if (hall) spawnUnit(w, 0, "guard", hall.x + 1, hall.y - 2)
  return true
}

export function fundKonerin(w: World) {
  const c = w.campaign
  if (!c || c.phase !== "play") return false
  const p = w.players[0]
  if (p.grain < 50) {
    w.events.push({ k: "failed", owner: 0, why: "Konerinmaikondan decrees want Grain." })
    return false
  }
  p.grain -= 50
  c.konerin = clamp01(c.konerin + 22)
  c.yuvaraja = clamp01(c.yuvaraja + 10)
  c.loyalty = clamp01(c.loyalty + 8)
  c.unrest = clamp01(c.unrest - 10)
  return true
}

export function allocatePort(w: World, which: PortFaction) {
  const c = w.campaign
  if (!c || c.phase !== "play") return false
  if (c.portAllocated) {
    w.events.push({ k: "failed", owner: 0, why: "Crown land at Sonakarpalli is already granted." })
    return false
  }
  const p = w.players[0]
  if (which === "arab") {
    if (p.ore < 25) {
      w.events.push({ k: "failed", owner: 0, why: "Sonagar grants want Ore." })
      return false
    }
    p.ore -= 25
    c.csi = clamp01(c.csi + 16)
    c.unrest = clamp01(c.unrest + 8)
  } else {
    if (p.timber < 45) {
      w.events.push({ k: "failed", owner: 0, why: "Chinese merchant grants want Timber." })
      return false
    }
    p.timber -= 45
    c.csi = clamp01(c.csi + 12)
    c.unrest = clamp01(c.unrest + 12)
  }
  c.portAllocated = true
  c.portFaction = which
  const hall = p0Hall(w)
  const quay = w.buildings.find((b) => b.owner === 0 && b.type === "quay")
  const mx = (quay?.x ?? hall?.x ?? 20) + 4
  const my = (quay?.y ?? hall?.y ?? 20) - 3
  const existing = w.buildings.find((b) => b.owner === 0 && b.type === "mosque")
  if (!existing) seedBuilding(w, 0, "mosque", mx, my, false)
  return true
}

export function irrigate(w: World) {
  const c = w.campaign
  if (!c || c.phase !== "play") return false
  if (c.irrigated) {
    w.events.push({ k: "failed", owner: 0, why: "The irrigation tanks already hold." })
    return false
  }
  const p = w.players[0]
  if (p.timber < 55 || p.grain < 35) {
    w.events.push({ k: "failed", owner: 0, why: "Canals want Timber and Grain." })
    return false
  }
  p.timber -= 55
  p.grain -= 35
  c.irrigated = true
  c.unrest = clamp01(c.unrest - 18)
  c.loyalty = clamp01(c.loyalty + 10)
  return true
}

export function sendCaravan(w: World) {
  const c = w.campaign
  if (!c || c.phase !== "play") return false
  const p = w.players[0]
  if (p.grain < 35) {
    w.events.push({ k: "failed", owner: 0, why: "A grain caravan wants Grain to load." })
    return false
  }
  p.grain -= 35
  c.convoys.push({
    x: w.size * 0.12,
    y: w.size * 0.18,
    hp: 70,
    hpMax: 70,
    arrived: false,
    sunk: false,
  })
  c.convoysSpawned++
  return true
}

export function takeLoan(w: World) {
  const c = w.campaign
  if (!c || c.phase !== "play") return false
  if (c.templeDebt >= 2) {
    w.events.push({ k: "failed", owner: 0, why: "Aiyan Malavarayan will not extend another book." })
    return false
  }
  const p = w.players[0]
  p.grain += 90
  p.relics += 1
  c.templeDebt += 1
  c.loyalty = clamp01(c.loyalty - 8)
  c.unrest = clamp01(c.unrest + 6)
  return true
}

export function repayLoan(w: World) {
  const c = w.campaign
  if (!c || c.phase !== "play") return false
  if (c.templeDebt <= 0) {
    w.events.push({ k: "failed", owner: 0, why: "The Bank of Madurai holds no open book." })
    return false
  }
  const p = w.players[0]
  if (p.relics >= 1) p.relics -= 1
  else if (p.grain >= 80) p.grain -= 80
  else {
    w.events.push({ k: "failed", owner: 0, why: "Repay with Relics or Grain." })
    return false
  }
  c.templeDebt -= 1
  c.loyalty = clamp01(c.loyalty + 12)
  c.unrest = clamp01(c.unrest - 10)
  return true
}

export function fundAcademy(w: World, which: "chaturvedi" | "scriptorium") {
  const c = w.campaign
  if (!c || c.phase !== "play") return false
  const p = w.players[0]
  if (which === "chaturvedi") {
    if (p.relics >= 1) p.relics -= 1
    else if (p.grain >= 45) p.grain -= 45
    else {
      w.events.push({ k: "failed", owner: 0, why: "Chaturvedimangalams want Relics or Grain." })
      return false
    }
    c.chaturvedi = clamp01(c.chaturvedi + 28)
    c.konerin = clamp01(c.konerin + 14)
  } else {
    if (p.timber < 40) {
      w.events.push({ k: "failed", owner: 0, why: "Temple scriptoriums want Timber." })
      return false
    }
    p.timber -= 40
    c.scriptorium = clamp01(c.scriptorium + 28)
    c.konerin = clamp01(c.konerin + 10)
  }
  if (c.portAllocated) c.csi = clamp01(c.csi + 10)
  c.loyalty = clamp01(c.loyalty + 6)
  return true
}

export function seatAltibi(w: World) {
  const c = w.campaign
  if (!c || c.phase !== "play") return false
  if (c.altibi) {
    w.events.push({ k: "failed", owner: 0, why: "Al-Tibi already holds Kayal’s books." })
    return false
  }
  const p = w.players[0]
  if (p.ore < 35) {
    w.events.push({ k: "failed", owner: 0, why: "Al-Tibi’s autonomy wants Ore." })
    return false
  }
  p.ore -= 35
  c.altibi = true
  c.escortsUnlocked = true
  c.csi = clamp01(c.csi + 14)
  c.anjuvannam = clamp01(c.anjuvannam + 18)
  const quay = w.buildings.find((b) => b.owner === 0 && b.type === "quay" && b.done)
  if (quay) spawnUnit(w, 0, "marzban", quay.x - 2, quay.y)
  return true
}

export function dredgeMouth(w: World) {
  const c = w.campaign
  if (!c || c.phase !== "play") return false
  if (c.dredged) {
    w.events.push({ k: "failed", owner: 0, why: "The Tamraparani mouth is already clear." })
    return false
  }
  const p = w.players[0]
  if (p.timber < 55 || p.ore < 20) {
    w.events.push({ k: "failed", owner: 0, why: "Dredging wants Timber and Ore." })
    return false
  }
  p.timber -= 55
  p.ore -= 20
  c.dredged = true
  c.csi = clamp01(c.csi + 8)
  return true
}

export function raisePalayam(w: World) {
  const c = w.campaign
  if (!c || c.phase !== "play") return false
  if (c.palayam) {
    w.events.push({ k: "failed", owner: 0, why: "Rowther Palayam already stands." })
    return false
  }
  const p = w.players[0]
  if (p.timber < 45 || p.ore < 25) {
    w.events.push({ k: "failed", owner: 0, why: "The canton wants Timber and Ore." })
    return false
  }
  p.timber -= 45
  p.ore -= 25
  c.palayam = true
  const hall = p0Hall(w)
  const quay = w.buildings.find((b) => b.owner === 0 && b.type === "quay")
  const x = (quay?.x ?? hall?.x ?? 20) + 3
  const y = (quay?.y ?? hall?.y ?? 24) - 2
  if (!w.buildings.some((b) => b.owner === 0 && b.type === "lodge")) {
    seedBuilding(w, 0, "lodge", x, y, true)
  }
  spawnUnit(w, 0, "rowther", x + 1, y)
  spawnUnit(w, 0, "rowther", x + 2, y - 1)
  return true
}

export function endCholaLine(w: World) {
  const c = w.campaign
  if (!c || c.phase !== "play") return false
  if (c.cholaEnded) {
    w.events.push({ k: "failed", owner: 0, why: "The Chola line is already closed." })
    return false
  }
  const p = w.players[0]
  if (p.ore < 30 || p.grain < 40) {
    w.events.push({ k: "failed", owner: 0, why: "Closing the Chola line wants Ore and Grain." })
    return false
  }
  p.ore -= 30
  p.grain -= 40
  c.cholaEnded = true
  c.loyalty = clamp01(c.loyalty + 12)
  c.yuvaraja = clamp01(c.yuvaraja + 16)
  const hall = p0Hall(w)
  if (hall) spawnUnit(w, 0, "guard", hall.x + 2, hall.y)
  return true
}

export function fundBrother(w: World, which: BrotherId) {
  const c = w.campaign
  if (!c || c.phase !== "play") return false
  const p = w.players[0]
  if (which === "vira-west") {
    if (p.ore < 30) {
      w.events.push({ k: "failed", owner: 0, why: "Vira I’s west wants Ore." })
      return false
    }
    p.ore -= 30
    c.viraWest = clamp01(c.viraWest + 22)
  } else if (which === "vikkiraman") {
    if (p.grain < 60) {
      w.events.push({ k: "failed", owner: 0, why: "Vikkiraman’s administration wants Grain." })
      return false
    }
    p.grain -= 60
    c.vikkiraman = clamp01(c.vikkiraman + 22)
  } else {
    if (p.timber < 50) {
      w.events.push({ k: "failed", owner: 0, why: "Sundara II’s interior wants Timber." })
      return false
    }
    p.timber -= 50
    c.sundaraInterior = clamp01(c.sundaraInterior + 22)
  }
  c.loyalty = clamp01(c.loyalty + 10)
  c.csi = clamp01(c.csi + 6)
  c.unrest = clamp01(c.unrest - 8)
  return true
}

export function confederacyAvg(c: CampaignRuntime) {
  return (c.viraWest + c.vikkiraman + c.sundaraInterior) / 3
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
  if (w.campaign.phase !== "briefing") return
  w.campaign.phase = w.campaign.missionId === "fracture" ? "patricide" : "play"
}

export function confirmPatricide(w: World) {
  const c = w.campaign
  if (!c || c.phase !== "patricide") return false
  c.phase = "play"
  c.objective = "Hold Vira’s hearths; break Sundara and Kafur"
  const hall = p0Hall(w)
  if (hall) {
    spawnUnit(w, 0, "guard", hall.x + 2, hall.y)
    spawnUnit(w, 0, "rowther", hall.x + 3, hall.y - 1)
  }
  return true
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

function tickEdicts(w: World, c: CampaignRuntime) {
  const p = w.players[0]
  const hall = p0Hall(w)
  const hx = hall?.x ?? w.size * 0.22
  const hy = hall?.y ?? w.size * 0.4
  if (!c.irrigated) {
    p.grain = Math.max(0, p.grain - 2.6 * DT)
    c.unrest = clamp01(c.unrest + 0.85 * DT)
  } else if (w.tick % 40 === 0) {
    p.grain += 3
    c.unrest = clamp01(c.unrest - 2)
  }
  if (c.templeDebt > 0) {
    c.loyalty = clamp01(c.loyalty - 1.6 * DT)
    c.unrest = clamp01(c.unrest + 1.4 * DT)
  }
  const mosque = w.buildings.find((b) => b.owner === 0 && b.type === "mosque")
  if (mosque && !mosque.done && c.portAllocated) {
    mosque.construct += DT * (0.4 + c.konerin / 80 + c.scriptorium / 120)
    if (mosque.construct >= mosque.constructMax) {
      mosque.done = true
      mosque.hp = mosque.hpMax
      c.portIntegrated = true
      c.csi = clamp01(c.csi + 14)
    }
  }
  if (mosque?.done) c.portIntegrated = true
  for (const ship of c.convoys) {
    if (ship.arrived || ship.sunk) continue
    const dx = hx - ship.x
    const dy = hy - ship.y
    const d = Math.hypot(dx, dy) || 1
    ship.x += (dx / d) * 2.1 * DT
    ship.y += (dy / d) * 2.1 * DT
    for (const u of w.units) {
      if (u.owner !== 1) continue
      if (dist(u.x, u.y, ship.x, ship.y) < 2.2) ship.hp -= 7 * DT
    }
    if (ship.hp <= 0) {
      ship.sunk = true
      c.shipsLost++
    } else if (d < 3.2) {
      ship.arrived = true
      c.grainCaravans++
      p.grain += 45
    }
  }
  if (c.portAllocated && c.konerin < 50 && w.tick >= c.nextRevoltAt) {
    spawnUnit(w, 1, "guard", hx + 12, hy - 7)
    c.nextRevoltAt = w.tick + 20 * 16
    c.unrest = clamp01(c.unrest + 8)
  }
  const tanks = c.irrigated ? "tanks" : `${c.grainCaravans}/2 caravans`
  const academy = c.chaturvedi >= 24 || c.scriptorium >= 24
  c.objective = `Konerin ${c.konerin | 0}/50 · academy ${academy ? 1 : 0}/1 · mosque ${c.portIntegrated ? 1 : 0}/1 · ${tanks} · debt ${c.templeDebt}`
  if (c.konerin >= 50 && c.portIntegrated && academy && (c.irrigated || c.grainCaravans >= 2)) {
    c.veteranArmy = true
    win(
      w,
      "Konerinmaikondan stands on the decrees. Academies and Sonakarpalli hold, the breadbasket is drilled, and a veteran cadre waits on Kayal.",
    )
  } else if (c.unrest >= 100) lose(w, "The Nadu and Sabha rebel. The prince’s word is not law.")
  else if (p.grain <= 0 && !c.irrigated) lose(w, "The southern breadbasket ran dry.")
}

function tickKayal(w: World, c: CampaignRuntime) {
  const quay = w.buildings.find((b) => b.owner === 0 && b.type === "quay")
  const hx = quay?.x ?? w.size * 0.22
  const hy = quay?.y ?? w.size * 0.68
  if (w.tick >= c.nextConvoyAt && c.convoysSpawned < c.shipsNeeded + 1) {
    c.convoys.push({
      x: w.size * 0.9,
      y: w.size * 0.84,
      hp: 90,
      hpMax: 90,
      arrived: false,
      sunk: false,
    })
    c.convoysSpawned++
    c.nextConvoyAt = w.tick + 20 * 16
  }
  const escorts = w.units.filter(
    (u) => u.owner === 0 && (u.type === "dhoni" || u.type === "marzban"),
  )
  const lights = lighthouseCount(w)
  for (const ship of c.convoys) {
    if (ship.arrived || ship.sunk) continue
    const dx = hx - ship.x
    const dy = hy - ship.y
    const d = Math.hypot(dx, dy) || 1
    let hull = c.dredged ? 2.45 : 1.65
    if (c.csi >= 22) hull += 0.25
    if (lights >= 1) hull += 0.15
    ship.x += (dx / d) * hull * DT
    ship.y += (dy / d) * hull * DT
    let dmg = lights >= 1 ? 8 : 14
    if (c.palayam && d < 10) dmg *= 0.72
    for (const u of w.units) {
      if (u.owner !== 1) continue
      if (dist(u.x, u.y, ship.x, ship.y) < 2.2) ship.hp -= dmg * DT
    }
    const cover = escorts.some((u) => dist(u.x, u.y, ship.x, ship.y) < 4.5)
    if (cover) ship.hp += 5 * DT
    if (ship.hp <= 0) {
      ship.sunk = true
      c.shipsLost++
    } else if (d < 3.2) {
      ship.arrived = true
      c.shipsEscorted++
      w.players[0].relics += 1
    }
  }
  if (c.palayam) {
    for (const u of w.units) {
      if (u.owner !== 1 || u.type !== "corsair") continue
      if (!isWater(w, u.x, u.y)) u.hp -= 14 * DT
    }
  }
  if (w.tick >= c.nextSpawnAt) {
    const live = c.convoys.find((s) => !s.arrived && !s.sunk)
    spawnCorsair(w, live ? live.x + 3 : w.size * 0.88, live ? live.y : w.size * 0.84)
    const gap = lights >= 1 ? 20 * 8 : 20 * 4.8
    c.nextSpawnAt = w.tick + Math.floor(gap * c.pirateScale)
  }
  for (const u of w.units) {
    if (u.owner !== 1 || u.type !== "corsair") continue
    if (u.order.t !== "idle" && u.order.t !== "attackMove") continue
    const live = c.convoys.find((s) => !s.arrived && !s.sunk)
    if (live) issueAttackMove(w, [u.id], live.x, live.y)
    else issueAttackMove(w, [u.id], hx, hy)
  }
  const works = c.dredged && (c.palayam || lights >= 1)
  c.objective = `Horse ships ${c.shipsEscorted}/${c.shipsNeeded} · Al-Tibi ${c.altibi ? 1 : 0} · dredge ${c.dredged ? 1 : 0} · Palayam/light ${c.palayam || lights >= 1 ? 1 : 0} · lost ${c.shipsLost}/3`
  if (c.shipsEscorted >= c.shipsNeeded && c.altibi && works) {
    win(
      w,
      "Al-Tibi holds Kayal of Manon Mani and Masila Mani. The mouth is clear, Palayam and the lamps watch the gulf, and the horse road is open.",
    )
  } else if (c.shipsLost >= 3) lose(w, "Malabar galleys emptied the horse road before the gulf.")
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
      if (c.cholaEnded) {
        win(
          w,
          "The Chola line is closed. Aryachakravarti’s prize lies at the landing of Manon Mani and Masila Mani — Parakramabahu’s appeal waits on the next plate.",
        )
        return
      }
      c.objective = "The Tooth Relic is home. End the Chola line (1279) to seal the landing."
    }
  }
  if (w.tick >= c.nextSpawnAt) {
    spawnCorsair(w, w.size * 0.78, w.size * 0.42)
    c.nextSpawnAt = w.tick + Math.floor(20 * 8 * c.pirateScale)
  }
  if (c.phase !== "victory") {
    c.objective = c.relicHeld
      ? c.cholaEnded
        ? "The relic is home and the Chola line is closed"
        : "End the Chola line (1279) to seal Aryachakravarti’s landing"
      : c.cholaEnded
        ? "Storm Yapahuwa with Aryachakravarti and take the Tooth Relic"
        : "Close the Chola line, then take the Tooth Relic with Aryachakravarti"
  }
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
  const seated = confederacyAvg(c) >= 50
  c.objective = seated
    ? "Parakramabahu III is at court — keep or return the Tooth Relic"
    : `Confederacy ${confederacyAvg(c) | 0}/50 · lights ${lights} · shrine ${shrine ? 1 : 0}`
  if (c.sharkKills >= 6) lose(w, "Pearl divers were taken in the Gulf of Mannar.")
  else if (seated && c.relicChoice) {
    win(w, c.winWhy)
  } else if (seated && c.relicHeld) {
    c.phase = "diplomacy"
    c.objective =
      "Keep the Tooth Relic in Madurai, or return it when Parakramabahu III comes — Aryachakravarti’s prize."
  } else if (seated && !c.relicHeld) {
    win(
      w,
      "The five brother kings hold. Without the relic, the estuary of Manon Mani and Masila Mani still stands.",
    )
  }
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
  if (sundaraDown && c.wavesBroken >= 2) {
    win(
      w,
      "The army held for Vira after the patricide. Kafur broke on Kayal of Manon Mani and Masila Mani — the house is split.",
    )
  }
}

function tickGovernance(w: World, c: CampaignRuntime) {
  if (c.tribute && w.tick % 40 === 0) w.players[0].grain += 2
  const avg = confederacyAvg(c)
  if (avg < 28 && (c.missionId === "tamraparani" || c.missionId === "fracture")) {
    c.unrest = clamp01(c.unrest + 4 * DT)
    if (w.tick % 40 === 0 && w.players[0].grain > 0) w.players[0].grain -= 1
  } else if (avg >= 60 && w.tick % 40 === 0) {
    c.csi = clamp01(c.csi + 1)
    w.players[0].grain += 1
  }
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
  if (c.phase === "briefing" || c.phase === "diplomacy" || c.phase === "patricide") return
  if (c.phase !== "play") return
  const halls = w.buildings.filter((b) => b.owner === 0 && b.type === "hearth")
  if (!halls.length) {
    lose(w, "The hearth is gone.")
    return
  }
  tickGovernance(w, c)
  if (c.missionId === "edicts") tickEdicts(w, c)
  else if (c.missionId === "kayal") tickKayal(w, c)
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
  opts?: {
    pirateScale?: number
    relicChoice?: RelicChoice | null
    relicSecured?: boolean
    veteranArmy?: boolean
    templeDebt?: number
    konerin?: number
    portIntegrated?: boolean
  },
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
    relicHeld: spec.id === "tamraparani" && opts?.relicSecured === true,
    relicNodeId: null,
    relicChoice: opts?.relicChoice ?? null,
    pirateScale,
    night: false,
    sharkKills: 0,
    wavesBroken: 0,
    wavesNeeded: 3,
    kafurWave: 0,
    nextSpawnAt: 20 * 4,
    nextConvoyAt: 20 * 12,
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
    yuvaraja: spec.id === "edicts" ? 18 : spec.id === "kayal" ? Math.max(22, opts?.konerin ?? 22) : Math.max(48, opts?.konerin ?? 48),
    konerin: opts?.konerin ?? (spec.id === "edicts" ? 12 : 40),
    portAllocated: false,
    portFaction: null,
    portIntegrated: opts?.portIntegrated ?? false,
    irrigated: false,
    grainCaravans: 0,
    templeDebt: opts?.templeDebt ?? 0,
    veteranArmy: opts?.veteranArmy ?? false,
    chaturvedi: spec.id === "edicts" ? 0 : 28,
    scriptorium: spec.id === "edicts" ? 0 : 22,
    dredged: false,
    palayam: false,
    altibi: false,
    cholaEnded: spec.id === "palk" ? false : spec.id === "tamraparani" || spec.id === "fracture",
    viraWest: spec.id === "tamraparani" || spec.id === "fracture" ? 32 : 40,
    vikkiraman: spec.id === "tamraparani" || spec.id === "fracture" ? 30 : 40,
    sundaraInterior: spec.id === "tamraparani" || spec.id === "fracture" ? 34 : 40,
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
  if (c.templeDebt > 0) {
    c.loyalty = clamp01(c.loyalty - 12 * c.templeDebt)
    c.unrest = clamp01(c.unrest + 10 * c.templeDebt)
  }

  if (spec.id === "edicts") {
    const quay = seedBuilding(w, 0, "quay", p0.x + 6, p0.y + 8, true)
    seedBuilding(w, 0, "granary", p0.x - 4, p0.y + 2, true)
    spawnUnit(w, 0, "levy", p0.x + 2, p0.y)
    spawnUnit(w, 0, "levy", p0.x + 3, p0.y - 1)
    spawnUnit(w, 0, "guard", p0.x + 2, p0.y - 2)
    spawnUnit(w, 0, "dhoni", quay.x + 2, quay.y + 3)
    convertP1ToCorsairs(w, 0)
    spawnUnit(w, 1, "guard", p1.x - 3, p1.y)
    spawnUnit(w, 1, "guard", p1.x - 2, p1.y + 2)
    w.players[1].grain = 60
    w.players[1].timber = 40
    c.csi = 28
    c.unrest = 22
    c.nextRevoltAt = 20 * 18
  }

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
    if (c.veteranArmy) {
      spawnUnit(w, 0, "guard", p0.x + 5, p0.y - 2)
      spawnUnit(w, 0, "rowther", p0.x + 3, p0.y + 1)
    }
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
    w.players[0].relics = opts?.relicSecured ? 3 : 2
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
  if (missionId === "kayal" || missionId === "palk" || missionId === "edicts") extra.push("lodge")
  return extra
}
