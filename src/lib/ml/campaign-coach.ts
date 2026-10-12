import {
  allocatePort,
  beginMission,
  chooseRelic,
  confirmPatricide,
  dredgeMouth,
  endCholaLine,
  fundAcademy,
  fundBrother,
  fundGuild,
  fundKonerin,
  fundPatronage,
  irrigate,
  raiseKadalkatti,
  raiseManapadLight,
  raisePalayam,
  repayLoan,
  seatAltibi,
  sendCaravan,
  takeLoan,
  type RelicChoice,
} from "../sim/campaign"
import { findBuildSite, issueAttackMove, issueDefend, issueGather, placeBuilding, type World } from "../sim/engine"
import { DEFAULT_CAMPAIGN, type CampaignKnobs } from "./score"

function dist(ax: number, ay: number, bx: number, by: number) {
  return Math.hypot(ax - bx, ay - by)
}

function hall(w: World, owner: 0 | 1) {
  return w.buildings.find((b) => b.owner === owner && b.type === "hearth") ?? null
}

function crew(w: World) {
  return w.units.filter((u) => u.owner === 0 && u.type === "levy").slice(0, 3).map((u) => u.id)
}

function military(w: World) {
  return w.units.filter((u) => u.owner === 0 && u.type !== "levy")
}

function raiseYardIfNeeded(w: World) {
  if (w.buildings.some((b) => b.owner === 0 && b.type === "yard")) return
  const h = hall(w, 0)
  if (!h) return
  const site = findBuildSite(w, "yard", h.x, h.y)
  if (site) placeBuilding(w, 0, "yard", site.x, site.y, crew(w))
}

function coachEdicts(w: World, knobs: CampaignKnobs) {
  const c = w.campaign!
  const p = w.players[0]
  if (p.grain < knobs.loanGrainFloor && !c.irrigated && c.templeDebt < 2) takeLoan(w)
  if (c.konerin < 50) fundKonerin(w)
  if (!c.portAllocated) allocatePort(w, knobs.arabPortBias >= 0.5 ? "arab" : "chinese")
  if (knobs.irrigateFirst >= 0.5) {
    if (!c.irrigated) irrigate(w)
  } else if (c.grainCaravans + c.convoys.filter((s) => !s.arrived && !s.sunk).length < 2) {
    sendCaravan(w)
  }
  if (c.chaturvedi < 24) fundAcademy(w, "chaturvedi")
  else if (c.scriptorium < 24) fundAcademy(w, "scriptorium")
  if (c.templeDebt > 0 && (p.relics >= 1 || p.grain >= 80)) repayLoan(w)
  const mosque = w.buildings.find((b) => b.owner === 0 && b.type === "mosque" && !b.done)
  if (mosque) {
    for (const u of w.units) {
      if (u.owner === 0 && u.type === "levy" && u.order.t === "idle") {
        u.order = { t: "build", building: mosque.id }
      }
    }
  }
}

function coachKayal(w: World, knobs: CampaignKnobs) {
  const c = w.campaign!
  if (!c.altibi) seatAltibi(w)
  if (!c.dredged) dredgeMouth(w)
  if (!c.palayam) raisePalayam(w)
  if (!w.buildings.some((b) => b.owner === 0 && b.type === "lighthouse")) raiseManapadLight(w)
  if (c.manigramam < 50) fundGuild(w, "manigramam")
  if (c.anjuvannam < 50) fundGuild(w, "anjuvannam")
  c.escortRadius = knobs.escortRadius
  const live = c.convoys.find((s) => !s.arrived && !s.sunk)
  if (live) {
    const escorts = w.units.filter((u) => u.owner === 0 && (u.type === "dhoni" || u.type === "marzban"))
    issueAttackMove(
      w,
      escorts.map((u) => u.id),
      live.x,
      live.y,
    )
    if (knobs.escortAggro > 0.5) {
      const riders = w.units.filter((u) => u.owner === 0 && u.type === "rowther")
      const corsair = w.units.find((u) => u.owner === 1 && u.type === "corsair")
      if (corsair) issueAttackMove(w, riders.map((u) => u.id), corsair.x, corsair.y)
      else issueAttackMove(w, riders.map((u) => u.id), live.x, live.y)
    }
  }
}

function coachPalk(w: World) {
  const c = w.campaign!
  const h = hall(w, 0)
  if (!c.cholaEnded) endCholaLine(w)
  raiseYardIfNeeded(w)
  if (c.relicNodeId != null && !c.relicHeld) {
    const levies = w.units.filter((u) => u.owner === 0 && u.type === "levy")
    issueGather(
      w,
      levies.map((u) => u.id),
      c.relicNodeId,
      { lock: true },
    )
    const relic = w.nodes.find((n) => n.id === c.relicNodeId)
    if (relic) issueAttackMove(w, military(w).map((u) => u.id), relic.x, relic.y)
  } else if (h) {
    const carriers = w.units.filter((u) => u.owner === 0 && u.carry?.res === "relics")
    if (carriers.length) issueAttackMove(w, military(w).map((u) => u.id), h.x, h.y)
  }
}

function coachTamra(w: World, knobs: CampaignKnobs) {
  const c = w.campaign!
  if (c.viraWest <= c.vikkiraman && c.viraWest <= c.sundaraInterior) fundBrother(w, "vira-west")
  else if (c.vikkiraman <= c.sundaraInterior) fundBrother(w, "vikkiraman")
  else fundBrother(w, "sundara-interior")
  if (knobs.charmFirst >= 0.5) raiseKadalkatti(w)
  if (!w.buildings.some((b) => b.owner === 0 && b.type === "lighthouse")) raiseManapadLight(w)
  if (w.players[0].relics >= 1) {
    fundPatronage(w, c.shaiva <= c.vaishnava ? "shaiva" : "vaishnava")
  }
}

function coachFracture(w: World, knobs: CampaignKnobs) {
  const c = w.campaign!
  const kayal = w.buildings.find((b) => b.owner === 0 && b.id === c.kayalHearthId)
  const sundara = hall(w, 1)
  const mil = military(w)
  if (kayal) {
    const hold = Math.max(1, Math.floor(mil.length * (1 - knobs.escortAggro * 0.5)))
    issueDefend(
      w,
      mil.slice(0, hold).map((u) => u.id),
      kayal.x,
      kayal.y,
    )
    const raiders = w.units.filter((u) => u.owner === 1 && dist(u.x, u.y, kayal.x, kayal.y) < 18)
    if (raiders.length) {
      issueAttackMove(
        w,
        mil.slice(hold).map((u) => u.id),
        raiders[0]!.x,
        raiders[0]!.y,
      )
      return
    }
  }
  if (sundara) {
    issueAttackMove(
      w,
      mil.map((u) => u.id),
      sundara.x,
      sundara.y,
    )
  }
}

export function relicChoiceFromKnobs(knobs: CampaignKnobs, salt: number): RelicChoice {
  const n = ((salt * 17) % 1000) / 1000
  return n < knobs.relicReturnBias ? "return" : "keep"
}

export function tickCampaignCoach(w: World, knobs: CampaignKnobs = DEFAULT_CAMPAIGN, salt = 0) {
  const c = w.campaign
  if (!c) return
  if (c.phase === "briefing") {
    beginMission(w)
    return
  }
  if (c.phase === "patricide") {
    confirmPatricide(w)
    return
  }
  if (c.phase === "diplomacy") {
    chooseRelic(w, relicChoiceFromKnobs(knobs, salt + w.tick))
    return
  }
  if (c.phase !== "play") return
  if (w.tick % 8 !== 0 && w.tick > 4) return
  if (c.missionId === "edicts") coachEdicts(w, knobs)
  else if (c.missionId === "kayal") coachKayal(w, knobs)
  else if (c.missionId === "palk") coachPalk(w)
  else if (c.missionId === "tamraparani") coachTamra(w, knobs)
  else coachFracture(w, knobs)
}
