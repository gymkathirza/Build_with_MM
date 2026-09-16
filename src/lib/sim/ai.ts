import {
  type AiParams,
  type Owner,
  type Res,
  type World,
  findBuildSite,
  issueAttack,
  issueAttackMove,
  issueGather,
  issueMove,
  placeBuilding,
  popUsed,
  queueTrain,
  startAge,
} from "./engine"
import { personaById, type Persona } from "./personas"

function idleLevies(w: World, owner: Owner) {
  return w.units.filter(
    (u) => u.owner === owner && u.type === "levy" && (u.order.t === "idle" || u.order.t === "move"),
  )
}

function nearestNode(w: World, x: number, y: number, type?: Res) {
  let best = w.nodes.find((n) => n.amount > 0 && (!type || n.type === type)) ?? null
  if (!best) return w.nodes.find((n) => n.amount > 0) ?? null
  let bestD = Math.hypot(best.x - x, best.y - y)
  for (const n of w.nodes) {
    if (n.amount <= 0) continue
    if (type && n.type !== type) continue
    const d = Math.hypot(n.x - x, n.y - y)
    if (d < bestD) {
      bestD = d
      best = n
    }
  }
  return best
}

function hall(w: World, owner: Owner) {
  return w.buildings.find((b) => b.owner === owner && b.type === "hearth" && b.done)
}

function countType(w: World, owner: Owner, type: string) {
  return w.units.filter((u) => u.owner === owner && u.type === type).length
}

function crewIds(w: World, owner: Owner) {
  const idle = idleLevies(w, owner)
  if (idle.length) return idle.slice(0, 3).map((u) => u.id)
  return w.units
    .filter((u) => u.owner === owner && u.type === "levy")
    .slice(0, 2)
    .map((u) => u.id)
}

function noiseRoll(noise: number, salt: number) {
  const n = ((salt * 17) % 1000) / 1000
  return n < noise
}

function gatherNeed(w: World, owner: Owner, persona: Persona): Res | undefined {
  const p = w.players[owner]
  if (persona.gather === "skewed") return persona.skewRes
  const counts: Record<Res, number> = { grain: 0, timber: 0, ore: 0, relics: 0 }
  for (const u of w.units) {
    if (u.owner !== owner) continue
    if (u.order.t === "gather") {
      const nodeId = u.order.node
      const n = w.nodes.find((q) => q.id === nodeId)
      if (n) counts[n.type]++
    } else if (u.order.t === "return" && u.carry) {
      counts[u.carry.res]++
    }
  }
  if (p.timber < 80) return "timber"
  if (p.grain < 140) return "grain"
  if (p.ore < 90) return "ore"
  const order: Res[] = ["grain", "timber", "ore", "relics"]
  order.sort((a, b) => counts[a] - counts[b])
  return order[0]
}

function applyNoise(params: AiParams, persona: Persona, tick: number): AiParams {
  if (persona.noise <= 0) return params
  const n = ((tick * 13 + persona.noise * 100) % 100) / 100 - 0.5
  return {
    ...params,
    gatherBias: Math.max(0.4, Math.min(0.95, params.gatherBias + n * persona.noise * 0.25)),
    militaryRatio: Math.max(0.35, Math.min(0.9, params.militaryRatio + n * persona.noise * 0.2)),
    attackAtArmy: Math.max(2, params.attackAtArmy + (n > 0.2 ? 1 : n < -0.2 ? -1 : 0)),
    kite: Math.max(0, Math.min(1, params.kite + n * persona.noise)),
  }
}

export function tickAi(w: World, owner: Owner, params: AiParams, personaOverride?: Persona) {
  if (w.winner !== null) return
  if (w.tick > 3 && w.tick % 10 !== owner) return
  const persona = personaOverride ?? (owner === 1 ? personaById(w.persona) : personaById("balanced"))
  const p = w.players[owner]
  const h = hall(w, owner)
  if (!h) return
  const tuned = applyNoise(params, persona, w.tick)

  const levies = w.units.filter((u) => u.owner === owner && u.type === "levy")
  const military = w.units.filter((u) => u.owner === owner && u.type !== "levy")
  const incomplete = w.buildings.filter((b) => b.owner === owner && !b.done)
  if (incomplete.length) {
    const target = incomplete[0]
    const already = w.units.filter((u) => u.owner === owner && u.order.t === "build").length
    if (already < 2) {
      for (const id of crewIds(w, owner)) {
        const u = w.units.find((x) => x.id === id)
        if (u) u.order = { t: "build", building: target.id }
      }
    }
  }

  const wantsGather = Math.max(3, Math.floor(levies.length * tuned.gatherBias))
  const gathering = levies.filter((u) => u.order.t === "gather" || u.order.t === "return")
  if (!incomplete.length && gathering.length < wantsGather) {
    for (const u of idleLevies(w, owner)) {
      if (gathering.length >= wantsGather) break
      let need = gatherNeed(w, owner, persona)
      if (persona.noise > 0.3 && noiseRoll(persona.noise, w.tick + u.id)) {
        const bag: Res[] = ["grain", "timber", "ore", "relics"]
        need = bag[(w.tick + u.id) % 4]
      }
      const n = nearestNode(w, u.x, u.y, need)
      if (n) {
        issueGather(w, [u.id], n.id)
        gathering.push(u)
      }
    }
  }

  const has = (type: string, done = false) =>
    w.buildings.some((b) => b.owner === owner && b.type === type && (!done || b.done))
  const ids = crewIds(w, owner)
  const camps = w.buildings.filter((b) => b.owner === owner && b.type === "camp").length
  const wantCamps = w.size >= 200 ? 3 : tuned.expandCamps > 0 ? 1 : 0

  if (!incomplete.length && ids.length && !noiseRoll(persona.noise * 0.4, w.tick)) {
    if (camps < wantCamps && p.timber >= 50) {
      const trees = nearestNode(w, h.x, h.y, "timber")
      const site = trees ? findBuildSite(w, "camp", trees.x, trees.y) : findBuildSite(w, "camp", h.x, h.y)
      if (site) placeBuilding(w, owner, "camp", site.x, site.y, ids)
    } else if (!has("yard") && p.timber >= 90 && p.ore >= 20) {
      const site = findBuildSite(w, "yard", h.x, h.y)
      if (site) placeBuilding(w, owner, "yard", site.x, site.y, ids)
    } else if (!has("pit") && p.timber >= 60 && p.ore >= 15) {
      const ore = nearestNode(w, h.x, h.y, "ore")
      const site = ore ? findBuildSite(w, "pit", ore.x, ore.y) : null
      if (site) placeBuilding(w, owner, "pit", site.x, site.y, ids)
    } else if (!has("granary") && p.timber >= 45 && persona.gather !== "skewed") {
      const grain = nearestNode(w, h.x, h.y, "grain")
      const site = grain ? findBuildSite(w, "granary", grain.x, grain.y) : findBuildSite(w, "granary", h.x, h.y)
      if (site) placeBuilding(w, owner, "granary", site.x, site.y, ids)
    } else if (p.age >= 1 && !has("lodge") && p.timber >= 110 && p.ore >= 40) {
      const site = findBuildSite(w, "lodge", h.x, h.y)
      if (site) placeBuilding(w, owner, "lodge", site.x, site.y, ids)
    }
  }

  const ageReady = p.age === 0 && has("yard", true) && p.grain >= 280 && p.ore >= 140
  if (ageReady && (persona.coach || tuned.agePriority > 0.4)) {
    startAge(w, owner)
  }

  const yard = w.buildings.find((b) => b.owner === owner && b.type === "yard" && b.done)
  const lodge = w.buildings.find((b) => b.owner === owner && b.type === "lodge" && b.done)
  const pop = popUsed(w, owner)
  const wantMil = pop < w.popCap * tuned.militaryRatio
  const levyTarget = Math.max(8, Math.floor(w.popCap * 0.22))
  const savingForAge = p.age === 0 && has("yard", true) && tuned.agePriority > 0.5 && p.grain < 280

  if (h.queue.length < 2 && levies.length < levyTarget && p.grain >= 50 && !savingForAge) {
    queueTrain(w, h.id, "levy")
  }
  if (yard && wantMil && yard.queue.length < 4 && !savingForAge) {
    if (countType(w, owner, "warden") < Math.max(2, Math.floor(w.popCap / 20)) && p.timber >= 35) {
      queueTrain(w, yard.id, "warden")
    } else if (p.grain >= 55 && p.ore >= 20) {
      queueTrain(w, yard.id, "guard")
    }
  }
  if (lodge && wantMil && lodge.queue.length < 3 && p.age >= 1) {
    queueTrain(w, lodge.id, "ashrider")
  }

  const enemyHall = hall(w, owner === 0 ? 1 : 0)

  if (persona.tease && military.length >= 1 && w.tick % 40 === owner) {
    const prey = w.units.find((u) => u.owner !== owner && u.type === "levy")
    const raiders = military.filter((u) => u.order.t === "idle" || u.order.t === "move").slice(0, 2)
    if (prey && raiders.length) {
      issueAttack(
        w,
        raiders.map((u) => u.id),
        prey.id,
      )
    } else if (raiders.length && tuned.kite > 0.5) {
      issueMove(
        w,
        raiders.map((u) => u.id),
        h.x + (owner === 0 ? 8 : -8),
        h.y + (owner === 0 ? -8 : 8),
      )
    }
  }

  if (enemyHall && military.length >= tuned.attackAtArmy) {
    const soldiers = military.filter((u) => u.order.t === "idle" || u.order.t === "move")
    if (soldiers.length) {
      issueAttackMove(
        w,
        soldiers.map((u) => u.id),
        enemyHall.x,
        enemyHall.y,
      )
    }
  }
}

export function tickBothAi(w: World, humanIs0: boolean, p0?: AiParams, p1?: AiParams) {
  if (!humanIs0) tickAi(w, 0, p0 ?? w.ai, personaById("balanced"))
  tickAi(w, 1, p1 ?? w.ai)
}
