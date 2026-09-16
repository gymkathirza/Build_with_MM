import {
  AGE_NAMES,
  BUILDING_STATS,
  COSTS,
  DT,
  GATHER,
  POP_CAP,
  UNIT_STATS,
  WORLD,
  type BuildingType,
  type UnitType,
} from "./catalog"

export type Owner = 0 | 1
export type Res = "grain" | "timber" | "ore" | "relics"
export type Age = 0 | 1 | 2

export type Order =
  | { t: "idle" }
  | { t: "move"; x: number; y: number }
  | { t: "gather"; node: number }
  | { t: "return"; drop: number }
  | { t: "build"; building: number }
  | { t: "attack"; target: number }
  | { t: "attackMove"; x: number; y: number }

export type Unit = {
  id: number
  kind: "unit"
  type: UnitType
  owner: Owner
  x: number
  y: number
  hp: number
  hpMax: number
  order: Order
  carry: { res: Res; amt: number } | null
  gatherT: number
  atkCd: number
}

export type Building = {
  id: number
  kind: "building"
  type: BuildingType
  owner: Owner
  x: number
  y: number
  hp: number
  hpMax: number
  done: boolean
  construct: number
  constructMax: number
  queue: { type: UnitType; t: number; max: number }[]
  aging: number
}

export type Node = {
  id: number
  kind: "node"
  type: Res
  x: number
  y: number
  amount: number
}

export type Entity = Unit | Building | Node

export type Player = {
  grain: number
  timber: number
  ore: number
  relics: number
  age: Age
  faction: string
}

export type AiParams = {
  gatherBias: number
  militaryRatio: number
  attackAtArmy: number
  expandCamps: number
  agePriority: number
  kite: number
}

export const DEFAULT_AI: AiParams = {
  gatherBias: 0.7,
  militaryRatio: 0.58,
  attackAtArmy: 4,
  expandCamps: 1,
  agePriority: 0.55,
  kite: 0.4,
}

export type World = {
  nextId: number
  tick: number
  units: Unit[]
  buildings: Building[]
  nodes: Node[]
  players: [Player, Player]
  winner: Owner | null
  ai: AiParams
  events: SimEvent[]
}

export type SimEvent =
  | { k: "death"; id: number; owner: Owner; type: string }
  | { k: "built"; type: BuildingType; owner: Owner }
  | { k: "trained"; type: UnitType; owner: Owner }
  | { k: "aged"; owner: Owner; age: Age }
  | { k: "failed"; owner: Owner; why: string }

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v))
}

function dist(ax: number, ay: number, bx: number, by: number) {
  return Math.hypot(ax - bx, ay - by)
}

export function popUsed(w: World, owner: Owner) {
  return w.units.filter((u) => u.owner === owner).reduce((s, u) => s + UNIT_STATS[u.type].pop, 0)
}

export function spend(
  p: Player,
  c: { grain: number; timber: number; ore: number; relics: number },
) {
  if (p.grain < c.grain || p.timber < c.timber || p.ore < c.ore || p.relics < c.relics) return false
  p.grain -= c.grain
  p.timber -= c.timber
  p.ore -= c.ore
  p.relics -= c.relics
  return true
}

function nid(w: World) {
  return w.nextId++
}

function hallOf(w: World, owner: Owner) {
  return w.buildings.find((b) => b.owner === owner && b.type === "hearth" && b.done)
}

function dropFor(w: World, u: Unit, res: Res) {
  const prefer =
    res === "timber" ? "camp" : res === "ore" ? "pit" : res === "grain" ? "granary" : "hearth"
  let best: Building | null = null
  let bestD = 1e9
  for (const b of w.buildings) {
    if (b.owner !== u.owner || !b.done) continue
    if (b.type !== prefer && b.type !== "hearth") continue
    const d = dist(u.x, u.y, b.x, b.y)
    if (d < bestD) {
      bestD = d
      best = b
    }
  }
  return best
}

function spawnUnit(w: World, owner: Owner, type: UnitType, x: number, y: number) {
  const s = UNIT_STATS[type]
  w.units.push({
    id: nid(w),
    kind: "unit",
    type,
    owner,
    x: clamp(x, 1, WORLD - 1),
    y: clamp(y, 1, WORLD - 1),
    hp: s.hp,
    hpMax: s.hp,
    order: { t: "idle" },
    carry: null,
    gatherT: 0,
    atkCd: 0,
  })
}

function addBuilding(
  w: World,
  owner: Owner,
  type: BuildingType,
  x: number,
  y: number,
  instant: boolean,
) {
  const s = BUILDING_STATS[type]
  const time = type === "hearth" ? 1 : COSTS[type as keyof typeof COSTS].time
  const b: Building = {
    id: nid(w),
    kind: "building",
    type,
    owner,
    x,
    y,
    hp: instant ? s.hp : s.hp * 0.15,
    hpMax: s.hp,
    done: instant,
    construct: instant ? time : 0,
    constructMax: time,
    queue: [],
    aging: 0,
  }
  w.buildings.push(b)
  return b
}

function node(w: World, type: Res, x: number, y: number, amount: number) {
  w.nodes.push({ id: nid(w), kind: "node", type, x, y, amount })
}

export function createWorld(
  faction0: string,
  faction1: string,
  ai: AiParams = DEFAULT_AI,
  swap = false,
): World {
  const w: World = {
    nextId: 1,
    tick: 0,
    units: [],
    buildings: [],
    nodes: [],
    players: [
      { grain: 240, timber: 220, ore: 110, relics: 0, age: 0, faction: faction0 },
      { grain: 240, timber: 220, ore: 110, relics: 0, age: 0, faction: faction1 },
    ],
    winner: null,
    ai: { ...ai },
    events: [],
  }
  const south: 0 | 1 = swap ? 1 : 0
  const north: 0 | 1 = swap ? 0 : 1
  addBuilding(w, south, "hearth", 16, 78, true)
  addBuilding(w, north, "hearth", 84, 20, true)
  for (let i = 0; i < 4; i++) {
    spawnUnit(w, south, "levy", 14 + i * 1.6, 74)
    spawnUnit(w, north, "levy", 82 + i * 1.6, 24)
  }
  node(w, "grain", 10, 68, 900)
  node(w, "grain", 22, 88, 900)
  node(w, "timber", 8, 86, 800)
  node(w, "timber", 28, 70, 800)
  node(w, "ore", 32, 82, 500)
  node(w, "relics", 24, 60, 6)
  node(w, "grain", 90, 30, 900)
  node(w, "grain", 76, 10, 900)
  node(w, "timber", 92, 12, 800)
  node(w, "timber", 70, 28, 800)
  node(w, "ore", 68, 16, 500)
  node(w, "relics", 76, 38, 6)
  node(w, "ore", 50, 48, 700)
  node(w, "relics", 50, 52, 8)
  node(w, "grain", 48, 62, 600)
  node(w, "timber", 54, 36, 600)
  return w
}

export function canAfford(p: Player, key: keyof typeof COSTS) {
  const c = COSTS[key]
  return p.grain >= c.grain && p.timber >= c.timber && p.ore >= c.ore && p.relics >= c.relics && p.age >= c.age
}

export function issueMove(w: World, ids: number[], x: number, y: number) {
  for (const u of w.units) {
    if (!ids.includes(u.id)) continue
    u.order = { t: "move", x: clamp(x, 1, WORLD - 1), y: clamp(y, 1, WORLD - 1) }
  }
}

export function issueAttack(w: World, ids: number[], target: number) {
  for (const u of w.units) {
    if (!ids.includes(u.id)) continue
    u.order = { t: "attack", target }
  }
}

export function issueAttackMove(w: World, ids: number[], x: number, y: number) {
  for (const u of w.units) {
    if (!ids.includes(u.id)) continue
    u.order = { t: "attackMove", x, y }
  }
}

export function issueGather(w: World, ids: number[], nodeId: number) {
  const n = w.nodes.find((q) => q.id === nodeId)
  if (!n) return false
  let ok = false
  for (const u of w.units) {
    if (!ids.includes(u.id) || u.type !== "levy") continue
    u.order = { t: "gather", node: nodeId }
    ok = true
  }
  return ok
}

export function issueHalt(w: World, ids: number[]) {
  for (const u of w.units) {
    if (ids.includes(u.id)) u.order = { t: "idle" }
  }
}

export function placeBuilding(
  w: World,
  owner: Owner,
  type: BuildingType,
  x: number,
  y: number,
  builderIds: number[],
): Building | null {
  if (type === "hearth") return null
  const cost = COSTS[type]
  const p = w.players[owner]
  if (p.age < cost.age) {
    w.events.push({ k: "failed", owner, why: "Age too early for that hall." })
    return null
  }
  for (const b of w.buildings) {
    if (dist(b.x, b.y, x, y) < BUILDING_STATS[b.type].radius + BUILDING_STATS[type].radius + 0.8) {
      w.events.push({ k: "failed", owner, why: "Too close to another hall." })
      return null
    }
  }
  if (!spend(p, cost)) {
    w.events.push({ k: "failed", owner, why: "Not enough stores to raise that." })
    return null
  }
  const b = addBuilding(w, owner, type, clamp(x, 4, WORLD - 4), clamp(y, 4, WORLD - 4), false)
  const levies = w.units.filter((u) => builderIds.includes(u.id) && u.type === "levy")
  const backup = w.units.filter((u) => u.owner === owner && u.type === "levy").slice(0, 3)
  const crew = (levies.length ? levies : backup).slice(0, 3)
  for (const u of crew) u.order = { t: "build", building: b.id }
  return b
}

export function queueTrain(w: World, buildingId: number, type: UnitType): boolean {
  const b = w.buildings.find((x) => x.id === buildingId)
  if (!b || !b.done) return false
  const allowed =
    (b.type === "hearth" && type === "levy") ||
    (b.type === "yard" && (type === "guard" || type === "warden")) ||
    (b.type === "lodge" && type === "ashrider")
  if (!allowed) {
    w.events.push({ k: "failed", owner: b.owner, why: "That yard cannot train this banner." })
    return false
  }
  const p = w.players[b.owner]
  const c = COSTS[type]
  if (p.age < c.age) {
    w.events.push({ k: "failed", owner: b.owner, why: "Forge Age is required." })
    return false
  }
  if (popUsed(w, b.owner) + c.pop > POP_CAP) {
    w.events.push({ k: "failed", owner: b.owner, why: "Population cap." })
    return false
  }
  if (b.queue.length >= 5) {
    w.events.push({ k: "failed", owner: b.owner, why: "Queue is full." })
    return false
  }
  if (!spend(p, c)) {
    w.events.push({ k: "failed", owner: b.owner, why: "Not enough stores to train." })
    return false
  }
  b.queue.push({ type, t: 0, max: c.time })
  return true
}

export function startAge(w: World, owner: Owner): boolean {
  const p = w.players[owner]
  if (p.age >= 1) {
    w.events.push({ k: "failed", owner, why: "Citadel Age is sealed in this slice." })
    return false
  }
  const hall = hallOf(w, owner)
  if (!hall) return false
  if (hall.aging > 0) return false
  const hasYard = w.buildings.some((b) => b.owner === owner && b.type === "yard" && b.done)
  if (!hasYard) {
    w.events.push({ k: "failed", owner, why: "Raise a Banner Yard before the age rite." })
    return false
  }
  if (!spend(p, COSTS.age1)) {
    w.events.push({ k: "failed", owner, why: "The rite needs more Grain and Ore." })
    return false
  }
  hall.aging = COSTS.age1.time
  return true
}

function nearestEnemy(w: World, u: Unit, range: number) {
  let best: Unit | Building | null = null
  let bestD = range
  for (const o of w.units) {
    if (o.owner === u.owner) continue
    const d = dist(u.x, u.y, o.x, o.y)
    if (d < bestD) {
      bestD = d
      best = o
    }
  }
  for (const o of w.buildings) {
    if (o.owner === u.owner || !o.done) continue
    const d = dist(u.x, u.y, o.x, o.y) - BUILDING_STATS[o.type].radius
    if (d < bestD) {
      bestD = d
      best = o
    }
  }
  return best
}

function steer(u: Unit, tx: number, ty: number, speed: number, buildings: Building[]) {
  const d = dist(u.x, u.y, tx, ty)
  if (d < 0.35) return true
  const vx = ((tx - u.x) / d) * speed * DT
  const vy = ((ty - u.y) / d) * speed * DT
  let nx = u.x + vx
  let ny = u.y + vy
  for (const b of buildings) {
    const r = BUILDING_STATS[b.type].radius + 0.55
    const dd = dist(nx, ny, b.x, b.y)
    if (dd < r && dd > 0.01) {
      const px = (nx - b.x) / dd
      const py = (ny - b.y) / dd
      nx = b.x + px * r
      ny = b.y + py * r
    }
  }
  u.x = clamp(nx, 0.5, WORLD - 0.5)
  u.y = clamp(ny, 0.5, WORLD - 0.5)
  return dist(u.x, u.y, tx, ty) < 0.45
}

export function findBuildSite(w: World, type: BuildingType, nearX: number, nearY: number) {
  const need = BUILDING_STATS[type].radius
  for (let ring = 5; ring <= 16; ring += 2) {
    for (let a = 0; a < 14; a++) {
      const x = nearX + Math.cos((a / 14) * Math.PI * 2) * ring
      const y = nearY + Math.sin((a / 14) * Math.PI * 2) * ring
      if (x < 4 || y < 4 || x > WORLD - 4 || y > WORLD - 4) continue
      let ok = true
      for (const b of w.buildings) {
        if (dist(b.x, b.y, x, y) < BUILDING_STATS[b.type].radius + need + 0.9) ok = false
      }
      if (ok) return { x, y }
    }
  }
  return null
}

function hit(w: World, u: Unit, target: Unit | Building) {
  const stats = UNIT_STATS[u.type]
  if (u.atkCd > 0) return
  const range =
    target.kind === "building" ? stats.range + BUILDING_STATS[target.type].radius : stats.range
  if (dist(u.x, u.y, target.x, target.y) > range + 0.2) return
  const armor = target.kind === "unit" ? UNIT_STATS[target.type].armor : 2
  const dmg = Math.max(1, stats.atk - armor) * (target.kind === "building" ? 1.4 : 1)
  target.hp -= dmg
  u.atkCd = stats.cd
  if (target.hp <= 0) {
    if (target.kind === "unit") {
      w.units = w.units.filter((x) => x.id !== target.id)
      w.events.push({ k: "death", id: target.id, owner: target.owner, type: target.type })
    } else {
      w.buildings = w.buildings.filter((x) => x.id !== target.id)
      w.events.push({ k: "death", id: target.id, owner: target.owner, type: target.type })
    }
  }
}

function tickUnit(w: World, u: Unit) {
  u.atkCd = Math.max(0, u.atkCd - DT)
  const speed = UNIT_STATS[u.type].speed
  const o = u.order

  if (o.t === "move") {
    if (steer(u, o.x, o.y, speed, w.buildings)) u.order = { t: "idle" }
    return
  }
  if (o.t === "attackMove") {
    const foe = nearestEnemy(w, u, 9)
    if (foe) {
      const r = UNIT_STATS[u.type].range
      const reach = foe.kind === "building" ? r + BUILDING_STATS[foe.type].radius : r
      if (dist(u.x, u.y, foe.x, foe.y) > reach) steer(u, foe.x, foe.y, speed, w.buildings)
      else hit(w, u, foe)
    } else if (steer(u, o.x, o.y, speed, w.buildings)) u.order = { t: "idle" }
    return
  }
  if (o.t === "attack") {
    const t =
      w.units.find((x) => x.id === o.target) ?? w.buildings.find((x) => x.id === o.target) ?? null
    if (!t) {
      u.order = { t: "idle" }
      return
    }
    const r = UNIT_STATS[u.type].range
    const reach = t.kind === "building" ? r + BUILDING_STATS[t.type].radius : r
    if (dist(u.x, u.y, t.x, t.y) > reach) steer(u, t.x, t.y, speed, w.buildings)
    else hit(w, u, t)
    return
  }
  if (o.t === "build") {
    const b = w.buildings.find((x) => x.id === o.building)
    if (!b || b.done) {
      u.order = { t: "idle" }
      return
    }
    const reach = BUILDING_STATS[b.type].radius + 0.7
    if (dist(u.x, u.y, b.x, b.y) > reach) steer(u, b.x, b.y, speed, w.buildings)
    else {
      b.construct += DT * 1.15
      if (b.construct >= b.constructMax) {
        b.done = true
        b.hp = b.hpMax
        w.events.push({ k: "built", type: b.type, owner: b.owner })
        u.order = { t: "idle" }
      }
    }
    return
  }
  if (o.t === "gather") {
    if (u.type !== "levy") {
      u.order = { t: "idle" }
      return
    }
    const n = w.nodes.find((x) => x.id === o.node)
    if (!n || n.amount <= 0) {
      u.order = { t: "idle" }
      return
    }
    if (u.carry) {
      const drop = dropFor(w, u, u.carry.res)
      if (!drop) {
        u.order = { t: "idle" }
        return
      }
      u.order = { t: "return", drop: drop.id }
      return
    }
    if (dist(u.x, u.y, n.x, n.y) > 1.4) {
      steer(u, n.x, n.y, speed, w.buildings)
      return
    }
    u.gatherT += DT
    const g = GATHER[n.type]
    if (u.gatherT >= g.trip) {
      u.gatherT = 0
      const take = Math.min(g.rate, n.amount)
      n.amount -= take
      u.carry = { res: n.type, amt: take }
      const drop = dropFor(w, u, n.type)
      if (drop) u.order = { t: "return", drop: drop.id }
    }
    return
  }
  if (o.t === "return") {
    const drop = w.buildings.find((x) => x.id === o.drop && x.done)
    if (!drop || !u.carry) {
      u.order = { t: "idle" }
      return
    }
    const reach = BUILDING_STATS[drop.type].radius + 0.6
    if (dist(u.x, u.y, drop.x, drop.y) > reach) {
      steer(u, drop.x, drop.y, speed, w.buildings)
      return
    }
    const p = w.players[u.owner]
    p[u.carry.res] += u.carry.amt
    const res = u.carry.res
    u.carry = null
    const next = w.nodes.find((n) => n.amount > 0 && n.type === res)
    u.order = next ? { t: "gather", node: next.id } : { t: "idle" }
    return
  }

  if (u.type !== "levy") {
    const foe = nearestEnemy(w, u, 7)
    if (foe) {
      const r = UNIT_STATS[u.type].range
      const reach = foe.kind === "building" ? r + BUILDING_STATS[foe.type].radius : r
      if (dist(u.x, u.y, foe.x, foe.y) > reach) steer(u, foe.x, foe.y, speed, w.buildings)
      else hit(w, u, foe)
    }
  }
}

function tickBuildings(w: World) {
  for (const b of w.buildings) {
    if (!b.done) continue
    if (b.aging > 0) {
      b.aging -= DT
      if (b.aging <= 0) {
        const p = w.players[b.owner]
        p.age = 1
        b.aging = 0
        w.events.push({ k: "aged", owner: b.owner, age: 1 })
      }
    }
    if (!b.queue.length) continue
    const q = b.queue[0]
    q.t += DT
    if (q.t >= q.max) {
      if (popUsed(w, b.owner) + UNIT_STATS[q.type].pop > POP_CAP) {
        q.t = q.max - 0.2
        continue
      }
      const ang = Math.random() * Math.PI * 2
      const r = BUILDING_STATS[b.type].radius + 1.2
      spawnUnit(w, b.owner, q.type, b.x + Math.cos(ang) * r, b.y + Math.sin(ang) * r)
      w.events.push({ k: "trained", type: q.type, owner: b.owner })
      b.queue.shift()
    }
  }
}

export function tick(w: World) {
  if (w.winner !== null) return
  w.tick++
  if (w.events.length > 40) w.events.length = 0
  tickBuildings(w)
  for (const u of [...w.units]) tickUnit(w, u)
  for (const owner of [0, 1] as Owner[]) {
    if (!w.buildings.some((b) => b.owner === owner && b.type === "hearth")) {
      w.winner = owner === 0 ? 1 : 0
    }
  }
}

export function entityAt(w: World, x: number, y: number, r = 1.6): Entity | null {
  let best: Entity | null = null
  let bestD = r
  for (const u of w.units) {
    const d = dist(u.x, u.y, x, y)
    if (d < bestD) {
      bestD = d
      best = u
    }
  }
  for (const b of w.buildings) {
    const d = dist(b.x, b.y, x, y) - BUILDING_STATS[b.type].radius * 0.6
    if (d < bestD) {
      bestD = d
      best = b
    }
  }
  for (const n of w.nodes) {
    const d = dist(n.x, n.y, x, y)
    if (d < Math.min(bestD, 1.8)) {
      bestD = d
      best = n
    }
  }
  return best
}

export function ageName(age: Age) {
  return AGE_NAMES[age]
}
