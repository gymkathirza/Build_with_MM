import {
  type AiParams,
  type Owner,
  type Res,
  type World,
  findBuildSite,
  issueAttack,
  issueAttackMove,
  issueDefend,
  issueGather,
  issueMove,
  placeBuilding,
  popUsed,
  queueTrain,
  startAge,
  upgradeBuilding,
} from "./engine"
import { COSTS } from "./catalog"
import { personaById, type Persona } from "./personas"

function ownerFarOutposts(w: World, owner: Owner) {
  const h = hall(w, owner)
  if (!h) return []
  return w.buildings.filter(
    (b) =>
      b.owner === owner &&
      b.done &&
      (b.type === "camp" ||
        b.type === "pit" ||
        b.type === "granary" ||
        b.type === "yard" ||
        b.type === "lodge") &&
      Math.hypot(b.x - h.x, b.y - h.y) > 16,
  )
}

function isFarCampCrew(w: World, u: World["units"][number], owner: Owner) {
  if (u.owner !== owner || u.type !== "levy") return false
  const sites = ownerFarOutposts(w, owner)
  if (!sites.length) return false
  const order = u.order
  if (order.t === "move") {
    return sites.some((c) => Math.hypot(order.x - c.x, order.y - c.y) < 4)
  }
  return sites.some((c) => Math.hypot(u.x - c.x, u.y - c.y) < 8)
}

function idleLevies(w: World, owner: Owner) {
  return w.units.filter(
    (u) =>
      u.owner === owner &&
      u.type === "levy" &&
      (u.order.t === "idle" || u.order.t === "move") &&
      !isFarCampCrew(w, u, owner),
  )
}

function nearestNode(w: World, x: number, y: number, type?: Res, hunt?: boolean) {
  let best = null as (typeof w.nodes)[number] | null
  let bestD = 1e9
  for (const n of w.nodes) {
    if (n.amount <= 0) continue
    if (type && n.type !== type) continue
    if (hunt === true && !n.fauna) continue
    if (hunt === false && n.fauna) continue
    const d = Math.hypot(n.x - x, n.y - y)
    if (d < bestD) {
      bestD = d
      best = n
    }
  }
  if (best) return best
  if (hunt != null) return nearestNode(w, x, y, type)
  return w.nodes.find((n) => n.amount > 0) ?? null
}

function pickGatherNode(w: World, x: number, y: number, need?: Res) {
  if (need === "grain") {
    const hunt = nearestNode(w, x, y, "grain", true)
    const field = nearestNode(w, x, y, "grain", false)
    if (hunt && field) {
      const hd = Math.hypot(hunt.x - x, hunt.y - y)
      const fd = Math.hypot(field.x - x, field.y - y)
      return hd <= fd + 10 ? hunt : field
    }
    return hunt ?? field ?? nearestNode(w, x, y)
  }
  return nearestNode(w, x, y, need)
}

function adaptToRival(params: AiParams, rivalId: string): AiParams {
  if (rivalId === "rand-aggro" || rivalId === "challenging" || rivalId === "rand-dominant") {
    return {
      ...params,
      attackAtArmy: Math.max(3, params.attackAtArmy - 3),
      kite: Math.max(params.kite, 0.78),
      militaryRatio: Math.max(params.militaryRatio, 0.72),
      gatherBias: Math.min(params.gatherBias, 0.78),
    }
  }
  if (rivalId === "forgiving" || rivalId === "coach") {
    return {
      ...params,
      agePriority: Math.max(params.agePriority, 0.85),
      attackAtArmy: Math.max(params.attackAtArmy, 6),
    }
  }
  return params
}

function hall(w: World, owner: Owner) {
  return w.buildings.find((b) => b.owner === owner && b.type === "hearth" && b.done)
}

function foesNear(w: World, x: number, y: number, r: number, owner: Owner) {
  const out: World["units"] = []
  for (const u of w.units) {
    if (u.owner === owner) continue
    if (Math.hypot(u.x - x, u.y - y) < r) out.push(u)
  }
  return out
}

function weakest(units: World["units"]) {
  let best = units[0]
  for (const u of units) {
    if (u.hp < best.hp) best = u
  }
  return best
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
  if (p.grain < 40 && persona.gather !== "skewed") return "grain"
  if (p.timber < 25 && persona.gather !== "skewed") return "timber"
  if (p.ore < 20 && persona.gather !== "skewed") return "ore"
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
  if (p.age === 0 && !w.buildings.some((b) => b.owner === owner && b.type === "yard")) {
    if (p.timber < 90) return "timber"
    if (p.ore < 20) return "ore"
  }
  if (p.age === 0 && p.ore < COSTS.age1.ore) {
    if (p.timber < 90) return "timber"
    return "ore"
  }
  if (p.timber < 80) return "timber"
  if (p.grain < 140) return "grain"
  if (p.ore < 90) return "ore"
  if (p.age >= 1 && p.relics < 1 && p.grain >= 180 && p.timber >= 100 && p.ore >= 80) {
    return "relics"
  }
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
  const tuned = adaptToRival(applyNoise(params, persona, w.tick), owner === 0 ? w.persona : persona.id)

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
      const n = pickGatherNode(w, u.x, u.y, need)
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

  if (!incomplete.length && ids.length && !noiseRoll(persona.noise * 0.4, w.tick) && foesNear(w, h.x, h.y, 18, owner).length === 0) {
    if (!has("yard") && p.timber >= 90 && p.ore >= 20) {
      const site = findBuildSite(w, "yard", h.x, h.y)
      if (site) placeBuilding(w, owner, "yard", site.x, site.y, ids)
    } else if (camps < wantCamps && p.timber >= 50 && (p.age >= 1 || p.timber >= 140)) {
      const trees = nearestNode(w, h.x, h.y, "timber")
      const site = trees ? findBuildSite(w, "camp", trees.x, trees.y) : findBuildSite(w, "camp", h.x, h.y)
      if (site) placeBuilding(w, owner, "camp", site.x, site.y, ids)
    } else if (!has("pit") && p.timber >= 60 && p.ore >= 15 && (p.age >= 1 || p.ore >= 155)) {
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

  const ageReady = p.age === 0 && has("yard", true) && p.grain >= COSTS.age1.grain && p.ore >= COSTS.age1.ore
  if (
    ageReady &&
    h.aging <= 0 &&
    (persona.coach || tuned.agePriority > 0.32) &&
    foesNear(w, h.x, h.y, 18, owner).length === 0
  ) {
    startAge(w, owner)
  }

  if (p.age >= 1 && !incomplete.length && foesNear(w, h.x, h.y, 18, owner).length === 0) {
    const shorable = w.buildings.find((b) => b.owner === owner && b.done && b.type !== "hearth" && b.tier < 1)
    if (shorable && p.grain >= COSTS.upgrade.grain && p.timber >= COSTS.upgrade.timber && p.ore >= COSTS.upgrade.ore) {
      upgradeBuilding(w, shorable.id)
    }
  }

  const yard = w.buildings.find((b) => b.owner === owner && b.type === "yard" && b.done)
  const lodge = w.buildings.find((b) => b.owner === owner && b.type === "lodge" && b.done)
  const pop = popUsed(w, owner)
  const wantMil = pop < w.popCap * tuned.militaryRatio
  const levyTarget = Math.max(8, Math.floor(w.popCap * 0.22))
  const raiders = foesNear(w, h.x, h.y, 22, owner)
  const hallWounded = h.hp < h.hpMax * 0.82
  const hallPressed = raiders.length > 0 || hallWounded
  const savingForAge =
    p.age === 0 &&
    tuned.agePriority > 0.35 &&
    (h.aging > 0 ||
      (has("yard", true) && (p.grain < COSTS.age1.grain || p.ore < COSTS.age1.ore)))

  if (h.queue.length < 2 && levies.length < levyTarget && p.grain >= 50 && !savingForAge && !hallPressed) {
    queueTrain(w, h.id, "levy")
  }
  if (yard && wantMil && yard.queue.length < 4 && !savingForAge) {
    if (countType(w, owner, "warden") < Math.max(2, Math.floor(w.popCap / 20)) && p.timber >= 35 && !hallPressed) {
      queueTrain(w, yard.id, "warden")
    } else if (p.grain >= 55 && p.ore >= 20) {
      queueTrain(w, yard.id, "guard")
    }
  }
  if (lodge && wantMil && lodge.queue.length < 3 && p.age >= 1 && !hallPressed) {
    queueTrain(w, lodge.id, "ashrider")
  }

  const enemyHall = hall(w, owner === 0 ? 1 : 0)
  const guards = military.filter((u) => u.type === "guard")
  if (hallPressed && yard && yard.queue.length < 4 && p.grain >= 55 && p.ore >= 20) {
    queueTrain(w, yard.id, "guard")
  }
  const attackAt = p.age >= 1 ? Math.max(2, tuned.attackAtArmy - 1) : tuned.attackAtArmy
  const keepRaid = !hallPressed && military.length >= attackAt ? 1 : 0
  const wantHold = Math.max(1, Math.floor(guards.length * (hallPressed || h.aging > 0 ? 0.7 : 0.35)))
  const garrisonN = Math.max(0, Math.min(guards.length - keepRaid, wantHold))
  const garrison = guards.slice(0, garrisonN)
  if (garrison.length && w.tick % 20 === owner) {
    garrison.forEach((g, i) => {
      const a = (i / Math.max(1, garrison.length)) * Math.PI * 2
      issueDefend(w, [g.id], h.x + Math.cos(a) * 5, h.y + Math.sin(a) * 4)
    })
  }
  if (hallPressed && w.tick % 10 === owner) {
    const prey = weakest(raiders)
    const responders = military.filter((u) => !garrison.some((g) => g.id === u.id) && u.hp >= u.hpMax * 0.28)
    if (prey && responders.length) {
      issueAttack(
        w,
        responders.map((u) => u.id),
        prey.id,
      )
    }
  }
  if (w.tick % 20 === owner) {
    for (const u of levies) {
      if (u.order.t !== "gather" && u.order.t !== "return") continue
      const threat = foesNear(w, u.x, u.y, 9, owner).find((f) => f.type !== "levy")
      if (threat) issueMove(w, [u.id], h.x + (owner === 0 ? 2 : -2), h.y)
    }
    if (!hallPressed) {
      const threatened = levies.find((u) => {
        if (u.order.t !== "gather" && u.order.t !== "return") return false
        return foesNear(w, u.x, u.y, 12, owner).some((f) => f.type !== "levy")
      })
      const escort = military.find(
        (u) =>
          u.type === "warden" &&
          !garrison.some((g) => g.id === u.id) &&
          (u.order.t === "idle" || u.order.t === "move" || u.order.t === "defend"),
      )
      if (threatened && escort) issueAttackMove(w, [escort.id], threatened.x, threatened.y)
    }
  }
  if (tuned.kite > 0.45 && w.tick % 20 === owner) {
    for (const u of military) {
      if (u.type !== "warden") continue
      const melee = foesNear(w, u.x, u.y, 4, owner).find((f) => f.type !== "warden")
      if (!melee) continue
      const dx = u.x - melee.x
      const dy = u.y - melee.y
      const len = Math.hypot(dx, dy) || 1
      issueMove(w, [u.id], u.x + (dx / len) * 6, u.y + (dy / len) * 6)
    }
  }

  if (persona.tease && military.length >= 1 && w.tick % 40 === owner) {
    const prey = w.units.find((u) => u.owner !== owner && u.type === "levy")
    const raiders = military
      .filter((u) => u.order.t === "idle" || u.order.t === "move")
      .filter((u) => !garrison.some((g) => g.id === u.id))
      .slice(0, 2)
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

  if (tuned.kite >= 0.5 && w.tick % 20 === owner) {
    const wounded = military.filter((u) => u.hp < u.hpMax * 0.38 && !garrison.some((g) => g.id === u.id))
    if (wounded.length) {
      const riders = wounded.filter((u) => u.type === "ashrider" || u.type === "warden")
      const rest = wounded.filter((u) => u.type !== "ashrider" && u.type !== "warden")
      if (riders.length && lodge) issueMove(w, riders.map((u) => u.id), lodge.x, lodge.y)
      else if (riders.length) {
        issueMove(w, riders.map((u) => u.id), h.x + (owner === 0 ? 3 : -3), h.y)
      }
      if (rest.length && yard) issueMove(w, rest.map((u) => u.id), yard.x, yard.y)
      else if (rest.length) issueMove(w, rest.map((u) => u.id), h.x + (owner === 0 ? 3 : -3), h.y)
    }
    const scared = levies.filter(
      (u) =>
        u.hp < u.hpMax * 0.38 &&
        !isFarCampCrew(w, u, owner) &&
        foesNear(w, u.x, u.y, 8, owner).length > 0,
    )
    if (scared.length) {
      const grainHouse = w.buildings.find((b) => b.owner === owner && b.type === "granary" && b.done)
      const shelter = grainHouse ?? h
      issueMove(w, scared.map((u) => u.id), shelter.x, shelter.y)
    }
  }

  const foeMilitaryHome = enemyHall
    ? w.units.filter(
        (u) =>
          u.owner !== owner &&
          u.type !== "levy" &&
          Math.hypot(u.x - enemyHall.x, u.y - enemyHall.y) < 18,
      ).length
    : 99

  if (!hallPressed && enemyHall && military.length >= attackAt) {
    const soldiers = military.filter(
      (u) =>
        (u.order.t === "idle" || u.order.t === "move" || u.order.t === "attackMove" || u.order.t === "defend") &&
        !garrison.some((g) => g.id === u.id) &&
        u.hp >= u.hpMax * 0.38,
    )
    if (soldiers.length) {
      const midX = soldiers.reduce((s, u) => s + u.x, 0) / soldiers.length
      const midY = soldiers.reduce((s, u) => s + u.y, 0) / soldiers.length
      const closeFoes = foesNear(w, midX, midY, 16, owner)
      if (closeFoes.length) {
        const prey = weakest(closeFoes)
        issueAttack(
          w,
          soldiers.map((u) => u.id),
          prey.id,
        )
      } else {
        const riders = soldiers.filter((u) => u.type === "ashrider")
        const wave = riders.length ? riders : soldiers
        const bend = riders.length ? (owner === 0 ? -6 : 6) : 0
        issueAttackMove(
          w,
          wave.map((u) => u.id),
          enemyHall.x,
          enemyHall.y + bend,
        )
        const foot = soldiers.filter((u) => u.type !== "ashrider")
        const preyLevy = w.units.find(
          (u) => u.owner !== owner && (u.order.t === "gather" || u.order.t === "return"),
        )
        if (riders.length && preyLevy && w.tick % 40 === owner) {
          issueAttack(
            w,
            riders.slice(0, 2).map((u) => u.id),
            preyLevy.id,
          )
        }
        if (riders.length && foot.length && w.tick % 40 === owner) {
          const shields = foot.filter((u) => u.type === "guard")
          const bows = foot.filter((u) => u.type !== "guard")
          if (shields.length) {
            issueAttackMove(
              w,
              shields.map((u) => u.id),
              enemyHall.x + (owner === 0 ? 3 : -3),
              enemyHall.y + (owner === 0 ? 2 : -2),
            )
          }
          if (bows.length) {
            issueAttackMove(
              w,
              bows.map((u) => u.id),
              enemyHall.x + (owner === 0 ? 8 : -8),
              enemyHall.y + (owner === 0 ? 6 : -6),
            )
          }
        }
        if (foeMilitaryHome === 0 && riders.length >= 3 && w.tick % 40 === owner) {
          issueAttackMove(
            w,
            riders.slice(-2).map((u) => u.id),
            enemyHall.x + (owner === 0 ? 8 : -8),
            enemyHall.y + (owner === 0 ? 10 : -10),
          )
        }
      }
    }
  } else if (
    !hallPressed &&
    p.age >= 1 &&
    enemyHall &&
    military.length >= 2 &&
    w.tick % 80 === owner &&
    p.timber >= 80 &&
    p.ore >= 40 &&
    foeMilitaryHome === 0
  ) {
    const scout = military.find(
      (u) =>
        u.type === "ashrider" &&
        (u.order.t === "idle" || u.order.t === "defend") &&
        !garrison.some((g) => g.id === u.id) &&
        u.hp >= u.hpMax * 0.6,
    ) ??
      military.find(
        (u) =>
          (u.order.t === "idle" || u.order.t === "defend") &&
          !garrison.some((g) => g.id === u.id) &&
          u.hp >= u.hpMax * 0.6,
      )
    if (scout) issueAttackMove(w, [scout.id], enemyHall.x, enemyHall.y)
  }

  if (p.age >= 1 && w.tick % 60 === owner) {
    let relic = null as (typeof w.nodes)[number] | null
    let relicD = 1e9
    for (const n of w.nodes) {
      if (n.type !== "relics" || n.amount <= 0) continue
      const d = Math.hypot(n.x - h.x, n.y - h.y)
      if (d < relicD) {
        relicD = d
        relic = n
      }
    }
    const scout = military.find(
      (u) =>
        (u.type === "warden" || u.type === "ashrider") &&
        (u.order.t === "idle" || u.order.t === "move") &&
        !garrison.some((g) => g.id === u.id),
    )
    if (relic && scout) issueMove(w, [scout.id], relic.x, relic.y)
    else if (relic && !scout && !hallPressed) {
      const already = levies.some((u) => u.order.t === "gather" && u.order.node === relic.id)
      const levyScout = already
        ? null
        : levies.find(
            (u) =>
              !isFarCampCrew(w, u, owner) &&
              (u.order.t === "idle" || u.order.t === "move" || u.order.t === "gather"),
          )
      if (levyScout) issueGather(w, [levyScout.id], relic.id)
    }
    const contested = w.nodes.find(
      (n) =>
        n.type === "relics" &&
        n.amount > 0 &&
        w.units.some(
          (u) => u.owner !== owner && u.order.t === "gather" && u.order.node === n.id,
        ),
    )
    const takers = military.filter(
      (u) =>
        (u.type === "warden" || u.type === "guard" || u.type === "ashrider") &&
        !garrison.some((g) => g.id === u.id) &&
        (u.order.t === "idle" || u.order.t === "move" || u.order.t === "defend"),
    ).slice(0, 2)
    if (contested && takers.length && !hallPressed) {
      issueAttackMove(
        w,
        takers.map((u) => u.id),
        contested.x,
        contested.y,
      )
    } else if (!hallPressed && !contested) {
      const relicLevy = levies.find((u) => {
        const order = u.order
        if (order.t !== "gather") return false
        const n = w.nodes.find((q) => q.id === order.node)
        return n?.type === "relics"
      })
      const escort = military.find(
        (u) =>
          u.type === "guard" &&
          !garrison.some((g) => g.id === u.id) &&
          (u.order.t === "idle" || u.order.t === "move" || u.order.t === "defend"),
      )
      if (relicLevy && escort) issueDefend(w, [escort.id], relicLevy.x, relicLevy.y)
      const relicWardenCount = military.filter((u) => u.type === "warden").length
      const relicWatch =
        relicLevy && relicWardenCount >= 3
          ? military.find(
              (u) =>
                u.type === "warden" &&
                !garrison.some((g) => g.id === u.id) &&
                (u.order.t === "idle" || u.order.t === "move" || u.order.t === "defend"),
            )
          : undefined
      if (relicLevy && relicWatch) issueDefend(w, [relicWatch.id], relicLevy.x, relicLevy.y)
      const hauler = levies.find((u) => u.order.t === "return" && u.carry?.res === "relics")
      const haulEscort =
        hauler && guards.length >= 5
          ? military.find(
              (u) =>
                u.type === "guard" &&
                !garrison.some((g) => g.id === u.id) &&
                (u.order.t === "idle" || u.order.t === "move" || u.order.t === "defend"),
            )
          : undefined
      if (hauler && haulEscort) issueDefend(w, [haulEscort.id], hauler.x, hauler.y)
      const haulWatch =
        hauler && relicWardenCount >= 3
          ? military.find(
              (u) =>
                u.type === "warden" &&
                !garrison.some((g) => g.id === u.id) &&
                (u.order.t === "idle" || u.order.t === "move" || u.order.t === "defend"),
            )
          : undefined
      if (hauler && haulWatch) issueDefend(w, [haulWatch.id], hauler.x, hauler.y)
    }
  }

  if (!hallPressed && w.tick % 40 === owner) {
    const outpost = w.buildings.find(
      (b) =>
        b.owner === owner &&
        b.done &&
        (b.type === "camp" || b.type === "pit" || b.type === "granary" || b.type === "lodge" || b.type === "yard") &&
        foesNear(w, b.x, b.y, 10, owner).length > 0,
    )
    const sentry = military.find(
      (u) =>
        u.type === "guard" &&
        !garrison.some((g) => g.id === u.id) &&
        (u.order.t === "idle" || u.order.t === "move" || u.order.t === "defend"),
    )
    if (outpost && sentry) issueDefend(w, [sentry.id], outpost.x, outpost.y)
    const farSites = ownerFarOutposts(w, owner)
    const farCamp = farSites.find((b) => b.type === "camp")
    for (const site of farSites) {
      const crewed = levies.some((u) => {
        const order = u.order
        return (
          Math.hypot(u.x - site.x, u.y - site.y) < 8 ||
          (order.t === "move" && Math.hypot(order.x - site.x, order.y - site.y) < 4)
        )
      })
      const extra =
        !crewed
          ? idleLevies(w, owner)[0] ??
            (levies.length > wantsGather + 1
              ? levies.find((u) => !isFarCampCrew(w, u, owner) && (u.order.t === "gather" || u.order.t === "move"))
              : undefined)
          : undefined
      if (extra) {
        issueMove(w, [extra.id], site.x, site.y)
        break
      }
    }
    const riderCount = military.filter((u) => u.type === "ashrider").length
    const spareRiders = military.filter(
      (u) =>
        u.type === "ashrider" &&
        !garrison.some((g) => g.id === u.id) &&
        (u.order.t === "idle" || u.order.t === "defend" || u.order.t === "move"),
    )
    const spareRider = riderCount >= 4 ? spareRiders[0] : undefined
    const relicRider = riderCount >= 5 ? spareRiders[1] ?? spareRiders[0] : undefined
    const farLodge = w.buildings.find(
      (b) =>
        b.owner === owner &&
        b.done &&
        b.type === "lodge" &&
        Math.hypot(b.x - h.x, b.y - h.y) > 16,
    )
    const farPit = farSites.find((b) => b.type === "pit")
    const farGranary = farSites.find((b) => b.type === "granary")
    const farYard = farSites.find((b) => b.type === "yard")
    if (farLodge && spareRider) {
      issueDefend(w, [spareRider.id], farLodge.x, farLodge.y)
    } else if (farPit && spareRider) {
      issueDefend(w, [spareRider.id], farPit.x, farPit.y)
    } else if (farGranary && spareRider) {
      issueDefend(w, [spareRider.id], farGranary.x, farGranary.y)
    } else if (farYard && spareRider) {
      issueDefend(w, [spareRider.id], farYard.x, farYard.y)
    } else if (farCamp && spareRider) {
      issueDefend(w, [spareRider.id], farCamp.x, farCamp.y)
    }
    const relicNode = w.nodes.find((n) => n.type === "relics" && n.amount > 0)
    if (relicNode && relicRider) issueDefend(w, [relicRider.id], relicNode.x, relicNode.y)
    const wardenCount = military.filter((u) => u.type === "warden").length
    const spareWardens = military.filter(
      (u) =>
        u.type === "warden" &&
        !garrison.some((g) => g.id === u.id) &&
        (u.order.t === "idle" || u.order.t === "defend" || u.order.t === "move"),
    )
    const spareWarden = wardenCount >= 3 ? spareWardens[0] : undefined
    const huntWarden = wardenCount >= 4 ? spareWardens[1] ?? spareWardens[0] : undefined
    if (farLodge && spareWarden) {
      issueDefend(w, [spareWarden.id], farLodge.x, farLodge.y)
    } else if (farPit && spareWarden) {
      issueDefend(w, [spareWarden.id], farPit.x, farPit.y)
    } else if (farGranary && spareWarden) {
      issueDefend(w, [spareWarden.id], farGranary.x, farGranary.y)
    } else if (farYard && spareWarden) {
      issueDefend(w, [spareWarden.id], farYard.x, farYard.y)
    } else if (farCamp && spareWarden) {
      issueDefend(w, [spareWarden.id], farCamp.x, farCamp.y)
    }
    const crewLevy = levies.find((u) => isFarCampCrew(w, u, owner))
    const escortGuard =
      guards.length >= 4 && crewLevy
        ? military.find(
            (u) =>
              u.type === "guard" &&
              !garrison.some((g) => g.id === u.id) &&
              (u.order.t === "idle" || u.order.t === "move" || u.order.t === "defend"),
          )
        : undefined
    if (crewLevy && escortGuard) {
      issueDefend(w, [escortGuard.id], crewLevy.x, crewLevy.y)
    }
    const hunter = levies.find((u) => {
      const order = u.order
      if (order.t !== "gather") return false
      const n = w.nodes.find((q) => q.id === order.node)
      return n?.fauna === "wolf" || n?.fauna === "bear" || n?.fauna === "boar"
    })
    const huntGuard =
      hunter && guards.length >= 3
        ? military.find(
            (u) =>
              u.type === "guard" &&
              !garrison.some((g) => g.id === u.id) &&
              (u.order.t === "idle" || u.order.t === "move" || u.order.t === "defend"),
          )
        : undefined
    if (hunter && huntGuard) issueDefend(w, [huntGuard.id], hunter.x, hunter.y)
    const deerHunter = levies.find((u) => {
      const order = u.order
      if (order.t !== "gather") return false
      const n = w.nodes.find((q) => q.id === order.node)
      return n?.fauna === "deer"
    })
    const deerGuard =
      deerHunter && guards.length >= 5
        ? military.find(
            (u) =>
              u.type === "guard" &&
              !garrison.some((g) => g.id === u.id) &&
              (u.order.t === "idle" || u.order.t === "move" || u.order.t === "defend"),
          )
        : undefined
    if (deerHunter && deerGuard) issueDefend(w, [deerGuard.id], deerHunter.x, deerHunter.y)
    const huntMark = hunter ?? deerHunter
    if (huntMark && huntWarden) issueDefend(w, [huntWarden.id], huntMark.x, huntMark.y)
    const huntHauler = levies.find((u) => {
      if (u.order.t !== "return" || u.carry?.res !== "grain") return false
      return w.nodes.some((n) => n.fauna && Math.hypot(n.x - u.x, n.y - u.y) < 14)
    })
    const huntHaulGuard =
      huntHauler && guards.length >= 3
        ? military.find(
            (u) =>
              u.type === "guard" &&
              !garrison.some((g) => g.id === u.id) &&
              (u.order.t === "idle" || u.order.t === "move" || u.order.t === "defend"),
          )
        : undefined
    if (huntHauler && huntHaulGuard) issueDefend(w, [huntHaulGuard.id], huntHauler.x, huntHauler.y)
    const storeHauler = levies.find(
      (u) =>
        u.order.t === "return" &&
        (u.carry?.res === "timber" || u.carry?.res === "ore" || u.carry?.res === "grain") &&
        Math.hypot(u.x - h.x, u.y - h.y) > 16,
    )
    const storeEscort =
      storeHauler && guards.length >= 4
        ? military.find(
            (u) =>
              u.type === "guard" &&
              !garrison.some((g) => g.id === u.id) &&
              (u.order.t === "idle" || u.order.t === "move" || u.order.t === "defend"),
          )
        : undefined
    if (storeHauler && storeEscort) issueDefend(w, [storeEscort.id], storeHauler.x, storeHauler.y)
  }
}

export function tickBothAi(w: World, humanIs0: boolean, p0?: AiParams, p1?: AiParams) {
  if (!humanIs0) tickAi(w, 0, p0 ?? w.ai, personaById("balanced"))
  tickAi(w, 1, p1 ?? w.ai)
}
