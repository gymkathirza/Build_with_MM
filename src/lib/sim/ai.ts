import {
  type AiParams,
  type Owner,
  type World,
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

function buildersFor(w: World, owner: Owner) {
  const idle = idleLevies(w, owner)
  if (idle.length) return idle
  const gathering = w.units.filter(
    (u) => u.owner === owner && u.type === "levy" && (u.order.t === "gather" || u.order.t === "return"),
  )
  return gathering.slice(0, 1)
}

export function tickAi(w: World, owner: Owner, params: AiParams) {
  if (w.winner !== null) return
  if (w.tick > 3 && w.tick % 10 !== owner) return
  const p = w.players[owner]
  const h = hall(w, owner)
  if (!h) return

  const levies = w.units.filter((u) => u.owner === owner && u.type === "levy")
  const military = w.units.filter((u) => u.owner === owner && u.type !== "levy")
  const wantsGather = Math.max(2, Math.floor(levies.length * params.gatherBias))

  const gathering = levies.filter((u) => u.order.t === "gather" || u.order.t === "return")
  if (gathering.length < wantsGather) {
    for (const u of idleLevies(w, owner)) {
      if (gathering.length >= wantsGather) break
      const need =
        p.timber < 80 ? "timber" : p.grain < 140 ? "grain" : p.ore < 90 ? "ore" : undefined
      const n = nearestNode(w, u.x, u.y, need)
      if (n) {
        issueGather(w, [u.id], n.id)
        gathering.push(u)
      }
    }
  }

  const hasCamp = w.buildings.some((b) => b.owner === owner && b.type === "camp")
  const hasPit = w.buildings.some((b) => b.owner === owner && b.type === "pit")
  const hasYard = w.buildings.some((b) => b.owner === owner && b.type === "yard")
  const hasLodge = w.buildings.some((b) => b.owner === owner && b.type === "lodge")
  const hasGranary = w.buildings.some((b) => b.owner === owner && b.type === "granary")
  const builders = buildersFor(w, owner)
  const side = owner === 0 ? 1 : -1

  if (!hasCamp && params.expandCamps > 0 && p.timber >= 50 && builders.length) {
    const trees = nearestNode(w, h.x, h.y, "timber")
    if (trees) placeBuilding(w, owner, "camp", trees.x + 3 * side, trees.y + 2, [builders[0].id])
  } else if (!hasPit && p.timber >= 60 && p.ore >= 15 && builders.length) {
    const ore = nearestNode(w, h.x, h.y, "ore")
    if (ore) placeBuilding(w, owner, "pit", ore.x - 3 * side, ore.y + 2, [builders[0].id])
  } else if (!hasYard && p.timber >= 90 && p.ore >= 20 && builders.length) {
    placeBuilding(w, owner, "yard", h.x + 6 * side, h.y - 5 * side, [builders[0].id])
  } else if (!hasGranary && p.timber >= 45 && builders.length) {
    const grain = nearestNode(w, h.x, h.y, "grain")
    if (grain) placeBuilding(w, owner, "granary", grain.x + 2.5 * side, grain.y - 2, [builders[0].id])
  } else if (p.age >= 1 && !hasLodge && p.timber >= 110 && p.ore >= 40 && builders.length) {
    placeBuilding(w, owner, "lodge", h.x + 8 * side, h.y, [builders[0].id])
  }

  if (p.age === 0 && hasYard && params.agePriority > 0.4) startAge(w, owner)

  const yard = w.buildings.find((b) => b.owner === owner && b.type === "yard" && b.done)
  const lodge = w.buildings.find((b) => b.owner === owner && b.type === "lodge" && b.done)
  const pop = popUsed(w, owner)
  const wantMil = pop < POP_CAP * params.militaryRatio + 8

  if (h.queue.length < 2 && levies.length < 9 && p.grain >= 50) {
    queueTrain(w, h.id, "levy")
  }
  if (yard && wantMil && yard.queue.length < 3) {
    if (countType(w, owner, "warden") < 3 && p.timber >= 35) {
      queueTrain(w, yard.id, "warden")
    } else {
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
