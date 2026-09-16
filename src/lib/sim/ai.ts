import {
  type AiParams,
  type Owner,
  type World,
  findBuildSite,
  issueAttackMove,
  issueGather,
  placeBuilding,
  popUsed,
  queueTrain,
  startAge,
} from "./engine"
import { POP_CAP } from "./catalog"

function idleLevies(w: World, owner: Owner) {
  return w.units.filter(
    (u) => u.owner === owner && u.type === "levy" && (u.order.t === "idle" || u.order.t === "move"),
  )
}

function nearestNode(w: World, x: number, y: number, type?: "grain" | "timber" | "ore" | "relics") {
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

export function tickAi(w: World, owner: Owner, params: AiParams) {
  if (w.winner !== null) return
  if (w.tick > 3 && w.tick % 10 !== owner) return
  const p = w.players[owner]
  const h = hall(w, owner)
  if (!h) return

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

  const wantsGather = Math.max(2, Math.floor(levies.length * params.gatherBias))
  const gathering = levies.filter((u) => u.order.t === "gather" || u.order.t === "return")
  if (!incomplete.length && gathering.length < wantsGather) {
    for (const u of idleLevies(w, owner)) {
      if (gathering.length >= wantsGather) break
      const need =
        p.timber < 90 ? "timber" : p.grain < 160 ? "grain" : p.ore < 100 ? "ore" : undefined
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

  if (!incomplete.length && ids.length) {
    if (!has("camp") && params.expandCamps > 0 && p.timber >= 50) {
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
    } else if (!has("granary") && p.timber >= 45) {
      const grain = nearestNode(w, h.x, h.y, "grain")
      const site = grain ? findBuildSite(w, "granary", grain.x, grain.y) : findBuildSite(w, "granary", h.x, h.y)
      if (site) placeBuilding(w, owner, "granary", site.x, site.y, ids)
    } else if (p.age >= 1 && !has("lodge") && p.timber >= 110 && p.ore >= 40) {
      const site = findBuildSite(w, "lodge", h.x, h.y)
      if (site) placeBuilding(w, owner, "lodge", site.x, site.y, ids)
    }
  }

  if (p.age === 0 && has("yard", true) && p.grain >= 280 && p.ore >= 140 && params.agePriority > 0.4) {
    startAge(w, owner)
  }

  const yard = w.buildings.find((b) => b.owner === owner && b.type === "yard" && b.done)
  const lodge = w.buildings.find((b) => b.owner === owner && b.type === "lodge" && b.done)
  const pop = popUsed(w, owner)
  const wantMil = pop < POP_CAP * params.militaryRatio + 8
  const savingForAge = p.age === 0 && has("yard", true) && params.agePriority > 0.5 && p.grain < 280

  if (h.queue.length < 1 && levies.length < 7 && p.grain >= 50 && !savingForAge) {
    queueTrain(w, h.id, "levy")
  }
  if (yard && wantMil && yard.queue.length < 3 && !savingForAge) {
    if (countType(w, owner, "warden") < 2 && p.timber >= 35) {
      queueTrain(w, yard.id, "warden")
    } else if (p.grain >= 55 && p.ore >= 20) {
      queueTrain(w, yard.id, "guard")
    }
  }
  if (lodge && wantMil && lodge.queue.length < 2 && p.age >= 1) {
    queueTrain(w, lodge.id, "ashrider")
  }

  const enemyHall = hall(w, owner === 0 ? 1 : 0)
  if (enemyHall && military.length >= params.attackAtArmy) {
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
  if (!humanIs0) tickAi(w, 0, p0 ?? w.ai)
  tickAi(w, 1, p1 ?? w.ai)
}
