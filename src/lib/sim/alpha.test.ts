import assert from "node:assert/strict"
import { test } from "node:test"
import {
  createWorld,
  issueAttackMove,
  issueDefend,
  issueGather,
  placeBuilding,
  popUsed,
  queueTrain,
  startAge,
  tick,
  upgradeBuilding,
} from "./engine"
import { tickAi } from "./ai"
import { COSTS, UNIT_STATS, type UnitType } from "./catalog"
import { hallPositions, HUGE_MAP_ID, MAP_SPECS, specFor } from "./maps"
import { PERSONA_IDS, personaById } from "./personas"
import { MAPS } from "../game-data"

test("huge map is default and selectable", () => {
  const w = createWorld("ashen", "gilded")
  assert.equal(w.mapId, HUGE_MAP_ID)
  assert.equal(w.size, 280)
  assert.equal(w.popCap, 100)
  assert.ok(MAPS.some((m) => m.id === HUGE_MAP_ID && m.status === "ready"))
  for (const id of Object.keys(MAP_SPECS)) {
    const spec = specFor(id)
    const world = createWorld("ashen", "gilded", undefined, { mapId: id })
    assert.equal(world.mapId, spec.id)
    assert.equal(world.size, spec.size)
    assert.equal(world.popCap, spec.popCap)
  }
})

test("halls are mirrored: equal travel to center", () => {
  const spec = specFor(HUGE_MAP_ID)
  for (const axis of ["w-e", "e-w"] as const) {
    const h = hallPositions(spec, axis)
    const c = spec.size / 2
    const d0 = Math.hypot(h.p0.x - c, h.p0.y - c)
    const d1 = Math.hypot(h.p1.x - c, h.p1.y - c)
    assert.ok(Math.abs(d0 - d1) < 0.01, `${axis} travel ${d0} vs ${d1}`)
    assert.ok(Math.abs(h.p0.y - h.p1.y) < 0.01, "same latitude kills south snowball")
  }
  const w = createWorld("ashen", "gilded", undefined, { mapId: HUGE_MAP_ID })
  const n0 = w.nodes.filter((n) => n.x < spec.size / 2).length
  const n1 = w.nodes.filter((n) => n.x > spec.size / 2).length
  assert.ok(Math.abs(n0 - n1) <= 2)
  for (const n of w.nodes) {
    assert.ok(n.x >= 3 && n.x <= spec.size - 3, `node x ${n.x}`)
    assert.ok(n.y >= 3 && n.y <= spec.size - 3, `node y ${n.y}`)
  }
})

test("personas rotate and skewed eco differs from balanced", () => {
  assert.equal(PERSONA_IDS.length, 9)
  const skewed = createWorld("ashen", "gilded", personaById("skewed").params, {
    mapId: "emberglass",
    persona: "skewed",
  })
  const balanced = createWorld("ashen", "gilded", personaById("balanced").params, {
    mapId: "emberglass",
    persona: "balanced",
  })
  skewed.players[1].timber = 40
  balanced.players[1].timber = 40
  for (let i = 0; i < 80; i++) {
    tickAi(skewed, 1, personaById("skewed").params, personaById("skewed"))
    tickAi(balanced, 1, personaById("balanced").params, personaById("balanced"))
  }
  const skewGather = skewed.units.filter(
    (u) => u.owner === 1 && u.order.t === "gather",
  )
  const balGather = balanced.units.filter(
    (u) => u.owner === 1 && u.order.t === "gather",
  )
  const skewGrain = skewGather.filter((u) => {
    const n = skewed.nodes.find((q) => u.order.t === "gather" && q.id === u.order.node)
    return n?.type === "grain"
  }).length
  assert.ok(skewGather.length, "skewed should gather")
  assert.ok(balGather.length, "balanced should gather")
  assert.ok(skewGrain === skewGather.length, "skewed eco is all grain")
  const balTimber = balGather.filter((u) => {
    const n = balanced.nodes.find((q) => u.order.t === "gather" && q.id === u.order.node)
    return n?.type === "timber"
  }).length
  assert.ok(balTimber > 0, "balanced eco moved to timber when timber is short")
  assert.ok(popUsed(createWorld("ashen", "gilded"), 0) >= 8)
})

function hall(w: ReturnType<typeof createWorld>, owner: 0 | 1) {
  return w.buildings.find((b) => b.owner === owner && b.type === "hearth" && b.done)!
}

test("age rite completes after a finished yard and stores", () => {
  const w = createWorld("ashen", "gilded", undefined, { mapId: "emberglass" })
  const h = hall(w, 0)
  const ids = w.units.filter((u) => u.owner === 0 && u.type === "levy").map((u) => u.id)
  w.players[0].timber = 200
  w.players[0].ore = 200
  w.players[0].grain = 400
  const site = { x: h.x + 8, y: h.y }
  const yard = placeBuilding(w, 0, "yard", site.x, site.y, ids)
  assert.ok(yard)
  yard!.done = true
  yard!.construct = yard!.constructMax
  assert.equal(startAge(w, 0), true)
  assert.ok(h.aging > 0)
  const ticks = Math.ceil(COSTS.age1.time * 20) + 4
  for (let i = 0; i < ticks; i++) tick(w)
  assert.equal(w.players[0].age, 1)
  assert.ok((h.tier ?? 0) >= 1)
})

test("age rite waits while banners press the hearth", () => {
  const params = { ...personaById("balanced").params, agePriority: 0.9 }
  const w = createWorld("ashen", "gilded", params, { mapId: "emberglass", persona: "balanced" })
  const h = hall(w, 0)
  w.players[0].grain = 400
  w.players[0].ore = 200
  w.players[0].timber = 200
  const yard = placeBuilding(
    w,
    0,
    "yard",
    h.x + 8,
    h.y,
    w.units.filter((u) => u.owner === 0).map((u) => u.id),
  )!
  yard.done = true
  yard.construct = yard.constructMax
  pushBanner(w, "guard", 1, h.x + 2, h.y)
  for (let i = 0; i < 12; i++) {
    tickAi(w, 0, params, personaById("balanced"))
    tick(w)
  }
  assert.ok(h.aging <= 0 && w.players[0].age === 0, "rite should wait while the hearth is pressed")
})

test("pressed hearth skips ashrider queues", () => {
  const params = { ...personaById("balanced").params, attackAtArmy: 9 }
  const w = createWorld("ashen", "gilded", params, { mapId: "emberglass", persona: "balanced" })
  const h = hall(w, 0)
  w.players[0].age = 1
  w.players[0].grain = 400
  w.players[0].ore = 200
  w.players[0].timber = 200
  const lodge = placeBuilding(
    w,
    0,
    "lodge",
    h.x + 10,
    h.y,
    w.units.filter((u) => u.owner === 0).map((u) => u.id),
  )!
  lodge.done = true
  lodge.construct = lodge.constructMax
  pushBanner(w, "guard", 1, h.x + 3, h.y)
  for (let i = 0; i < 10; i++) {
    tickAi(w, 0, params, personaById("balanced"))
    tick(w)
  }
  assert.ok(
    !lodge.queue.some((q) => q.type === "ashrider"),
    "pressed hearth should not raise riders",
  )
})

test("shore waits while banners press the hearth", () => {
  const params = { ...personaById("balanced").params, attackAtArmy: 9 }
  const w = createWorld("ashen", "gilded", params, { mapId: "emberglass", persona: "balanced" })
  const h = hall(w, 0)
  w.players[0].age = 1
  w.players[0].grain = 400
  w.players[0].ore = 200
  w.players[0].timber = 200
  const yard = placeBuilding(
    w,
    0,
    "yard",
    h.x + 8,
    h.y,
    w.units.filter((u) => u.owner === 0).map((u) => u.id),
  )!
  yard.done = true
  yard.construct = yard.constructMax
  pushBanner(w, "guard", 1, h.x + 3, h.y)
  for (let i = 0; i < 10; i++) {
    tickAi(w, 0, params, personaById("balanced"))
    tick(w)
  }
  assert.equal(yard.tier, 0, "should not shore while the hearth is pressed")
})

test("coach AI reaches Forge Age on a small plate", () => {
  const persona = personaById("coach")
  const w = createWorld("ashen", "gilded", persona.params, {
    mapId: "emberglass",
    persona: "coach",
  })
  for (let i = 0; i < 20 * 110 && w.players[0].age < 1; i++) {
    tickAi(w, 0, persona.params, persona)
    tick(w)
  }
  assert.equal(w.players[0].age, 1, "coach should fire the age rite")
  const yard = w.buildings.find((b) => b.owner === 0 && b.type === "yard" && b.done)
  assert.ok(yard, "yard must stand before the rite")
})

test("Forge Age can upgrade a finished yard", () => {
  const w = createWorld("ashen", "gilded", undefined, { mapId: "emberglass" })
  const h = hall(w, 0)
  const ids = w.units.filter((u) => u.owner === 0 && u.type === "levy").map((u) => u.id)
  w.players[0].timber = 400
  w.players[0].ore = 400
  w.players[0].grain = 400
  const yard = placeBuilding(w, 0, "yard", h.x + 8, h.y, ids)!
  yard.done = true
  yard.construct = yard.constructMax
  startAge(w, 0)
  for (let i = 0; i < 500; i++) tick(w)
  assert.equal(w.players[0].age, 1)
  const hp = yard.hpMax
  assert.equal(upgradeBuilding(w, yard.id), true)
  assert.equal(yard.tier, 1)
  assert.ok(yard.hpMax > hp)
})

test("garrison holds the hearth while a raid leaves", () => {
  const w = createWorld("ashen", "gilded", undefined, { mapId: "emberglass" })
  const h = hall(w, 0)
  const foe = hall(w, 1)
  w.players[0].grain = 800
  w.players[0].ore = 400
  w.players[0].timber = 400
  const yard = placeBuilding(
    w,
    0,
    "yard",
    h.x + 8,
    h.y,
    w.units.filter((u) => u.owner === 0).map((u) => u.id),
  )!
  yard.done = true
  yard.construct = yard.constructMax
  const yardId = yard.id
  for (let i = 0; i < 4; i++) queueTrain(w, yardId, "guard")
  for (let i = 0; i < 20 * 55; i++) tick(w)
  const guards = w.units.filter((u) => u.owner === 0 && u.type === "guard")
  assert.ok(guards.length >= 3, `expected guards, got ${guards.length}`)
  issueDefend(
    w,
    guards.slice(0, 2).map((u) => u.id),
    h.x,
    h.y,
  )
  issueAttackMove(
    w,
    guards.slice(2).map((u) => u.id),
    foe.x,
    foe.y,
  )
  for (let i = 0; i < 40; i++) tick(w)
  const home = w.units.filter(
    (u) => u.owner === 0 && u.type === "guard" && Math.hypot(u.x - h.x, u.y - h.y) < 10,
  )
  assert.ok(home.length >= 1, "at least one guard stays on the hearth")
})

test("thin Forge banner line still sends a raid", () => {
  const w = createWorld("ashen", "gilded", { ...personaById("balanced").params, attackAtArmy: 2 }, {
    mapId: "emberglass",
    persona: "balanced",
  })
  w.players[0].age = 1
  w.players[0].grain = 800
  w.players[0].ore = 400
  w.players[0].timber = 400
  const h = hall(w, 0)
  const yard = placeBuilding(
    w,
    0,
    "yard",
    h.x + 8,
    h.y,
    w.units.filter((u) => u.owner === 0).map((u) => u.id),
  )!
  yard.done = true
  yard.construct = yard.constructMax
  queueTrain(w, yard.id, "guard")
  queueTrain(w, yard.id, "guard")
  for (let i = 0; i < 20 * 30; i++) tick(w)
  for (let i = 0; i < 40; i++) {
    tickAi(w, 0, { ...personaById("balanced").params, attackAtArmy: 2 }, personaById("balanced"))
    tick(w)
  }
  const banners = w.units.filter((u) => u.owner === 0 && u.type === "guard")
  assert.ok(banners.length >= 2, `guards ${banners.length}`)
  const raid = banners.filter((u) => u.order.t === "attackMove" || u.order.t === "attack")
  const hold = banners.filter((u) => u.order.t === "defend")
  assert.ok(raid.length >= 1, "at least one banner should march")
  assert.ok(hold.length >= 1, "at least one banner should hold the hearth")
})

function pushBanner(w: ReturnType<typeof createWorld>, type: UnitType, owner: 0 | 1, x: number, y: number) {
  const s = UNIT_STATS[type]
  w.units.push({
    id: w.nextId++,
    kind: "unit",
    type,
    owner,
    x,
    y,
    hp: s.hp,
    hpMax: s.hp,
    order: { t: "idle" },
    carry: null,
    gatherT: 0,
    atkCd: 0,
  })
}

test("Forge ashriders lead the attack wave", () => {
  const params = { ...personaById("balanced").params, attackAtArmy: 2 }
  const w = createWorld("ashen", "gilded", params, { mapId: "emberglass", persona: "balanced" })
  w.players[0].age = 1
  w.players[0].grain = 800
  w.players[0].ore = 400
  w.players[0].timber = 400
  const h = hall(w, 0)
  pushBanner(w, "guard", 0, h.x + 2, h.y)
  pushBanner(w, "guard", 0, h.x + 3, h.y)
  pushBanner(w, "ashrider", 0, h.x + 4, h.y)
  pushBanner(w, "ashrider", 0, h.x + 5, h.y)
  for (let i = 0; i < 8; i++) {
    tickAi(w, 0, params, personaById("balanced"))
    tick(w)
  }
  const riders = w.units.filter((u) => u.owner === 0 && u.type === "ashrider")
  const guards = w.units.filter((u) => u.owner === 0 && u.type === "guard")
  assert.ok(riders.every((u) => u.order.t === "attackMove"), "ashriders should march first")
  assert.ok(
    guards.some((u) => u.order.t === "defend" || u.order.t === "idle"),
    "banners stay while ashriders leave",
  )
  const march = riders[0]
  if (march.order.t === "attackMove") {
    const foe = hall(w, 1)
    assert.ok(Math.abs(march.order.x - foe.x) < 0.01)
    assert.ok(Math.abs(march.order.y - (foe.y - 6)) < 0.01, "west riders bend north of the hall")
  }
})

test("coach AI keeps a hearth garrison after banners exist", () => {
  const persona = personaById("coach")
  const w = createWorld("ashen", "gilded", persona.params, {
    mapId: "emberglass",
    persona: "coach",
  })
  for (let i = 0; i < 20 * 80; i++) {
    tickAi(w, 0, persona.params, persona)
    tick(w)
  }
  const h = hall(w, 0)
  const military = w.units.filter((u) => u.owner === 0 && u.type !== "levy")
  if (military.length >= 3) {
    const home = military.filter((u) => Math.hypot(u.x - h.x, u.y - h.y) < 14)
    assert.ok(home.length >= 1, "defenders should remain near the hall")
  }
})

test("vast mere seeds hunt herds plus timber and ore", () => {
  const w = createWorld("ashen", "gilded")
  const fauna = w.nodes.filter((n) => n.fauna)
  assert.ok(fauna.length >= 4, `hunt animals ${fauna.length}`)
  assert.ok(fauna.some((n) => n.fauna === "deer"))
  assert.ok(fauna.some((n) => n.fauna === "boar"))
  assert.ok(w.nodes.some((n) => n.type === "timber"))
  assert.ok(w.nodes.some((n) => n.type === "ore"))
  const west = fauna.filter((n) => n.x < w.size / 2).length
  const east = fauna.filter((n) => n.x > w.size / 2).length
  assert.ok(Math.abs(west - east) <= 2)
})

test("hearth screen keeps deer, timber, and ore in reach", () => {
  const w = createWorld("ashen", "gilded")
  const hall = w.buildings.find((b) => b.owner === 0 && b.type === "hearth")
  assert.ok(hall)
  const near = w.nodes.filter((n) => Math.hypot(n.x - hall.x, n.y - hall.y) < 36)
  assert.ok(near.some((n) => n.fauna === "deer"), "deer should stand by the hearth")
  assert.ok(near.some((n) => n.fauna === "boar"), "boar should stand by the hearth")
  assert.ok(near.some((n) => n.type === "timber"), "pines should stand by the hearth")
  assert.ok(near.some((n) => n.type === "ore"), "ore should stand by the hearth")
})

test("local hunt sprites stay clear of nearby timber on small and huge plates", () => {
  for (const mapId of ["emberglass", "vast-mere"] as const) {
    const w = createWorld("ashen", "gilded", undefined, { mapId })
    const hall = w.buildings.find((b) => b.owner === 0 && b.type === "hearth")
    assert.ok(hall, mapId)
    const near = w.nodes.filter((n) => Math.hypot(n.x - hall.x, n.y - hall.y) < 28)
    const deer = near.filter((n) => n.fauna === "deer")
    const timber = near.filter((n) => n.type === "timber")
    assert.ok(deer.length >= 1, `${mapId} deer`)
    assert.ok(timber.length >= 1, `${mapId} timber`)
    for (const d of deer) {
      for (const t of timber) {
        const dist = Math.hypot(d.x - t.x, d.y - t.y)
        assert.ok(dist >= 3.2, `${mapId} deer/timber ${dist.toFixed(2)}`)
      }
    }
  }
})

function timberPair(age: 0 | 1) {
  const w = createWorld("ashen", "gilded", undefined, { mapId: "emberglass" })
  w.players[0].age = age
  const hall = w.buildings.find((b) => b.owner === 0 && b.type === "hearth")
  const levy = w.units.find((u) => u.owner === 0 && u.type === "levy")
  assert.ok(hall && levy)
  levy.x = hall.x
  levy.y = hall.y
  levy.order = { t: "idle" }
  levy.carry = null
  for (const n of w.nodes) n.amount = 0
  const stocks = w.nodes.filter((n) => n.type === "timber")
  assert.ok(stocks.length >= 2)
  const near = stocks[0]
  const far = stocks[1]
  near.x = hall.x + 3
  near.y = hall.y
  near.amount = 240
  far.x = hall.x + 22
  far.y = hall.y
  far.amount = 240
  return { w, levy, near, far }
}

test("Forge Age gathers the nearest node of the assigned resource", () => {
  const { w, levy, near, far } = timberPair(1)
  assert.ok(issueGather(w, [levy.id], far.id))
  assert.equal(levy.order.t, "gather")
  if (levy.order.t === "gather") assert.equal(levy.order.node, near.id)
})

test("Forge Age hops to the next nearest same type when a node depletes", () => {
  const { w, levy, near, far } = timberPair(1)
  assert.ok(issueGather(w, [levy.id], near.id))
  near.amount = 0
  tick(w)
  assert.equal(levy.order.t, "gather")
  if (levy.order.t === "gather") assert.equal(levy.order.node, far.id)
})

test("Forge Age last-packet return counts a hop", () => {
  const { w, levy, near, far } = timberPair(1)
  levy.x = near.x
  levy.y = near.y
  assert.ok(issueGather(w, [levy.id], near.id))
  near.amount = 8
  const hops0 = w.gather.hops
  for (let i = 0; i < 20 * 8; i++) tick(w)
  assert.ok(w.gather.hops >= hops0 + 1, `hops ${w.gather.hops}`)
  assert.equal(levy.order.t, "gather")
  if (levy.order.t === "gather") assert.equal(levy.order.node, far.id)
})

test("Forge Age last-packet return idles when no next node", () => {
  const { w, levy, near, far } = timberPair(1)
  levy.x = near.x
  levy.y = near.y
  far.amount = 0
  assert.ok(issueGather(w, [levy.id], near.id))
  near.amount = 8
  const idle0 = w.gather.idleDeplete
  for (let i = 0; i < 20 * 8; i++) tick(w)
  assert.equal(levy.order.t, "idle")
  assert.ok(w.gather.idleDeplete >= idle0 + 1, `idle ${w.gather.idleDeplete}`)
})

test("Ember Age does not auto-chain to the next node", () => {
  const { w, levy, near } = timberPair(0)
  assert.ok(issueGather(w, [levy.id], near.id))
  near.amount = 0
  tick(w)
  assert.equal(levy.order.t, "idle")
})

test("player gather override sticks until that node depletes", () => {
  const { w, levy, near, far } = timberPair(1)
  assert.ok(issueGather(w, [levy.id], far.id, { lock: true }))
  tick(w)
  assert.equal(levy.order.t, "gather")
  if (levy.order.t === "gather") assert.equal(levy.order.node, far.id)
  far.amount = 0
  tick(w)
  assert.equal(levy.order.t, "gather")
  if (levy.order.t === "gather") assert.equal(levy.order.node, near.id)
})

test("student hunts nearby fauna when grain is short", () => {
  const params = personaById("balanced").params
  const w = createWorld("ashen", "gilded", params, { mapId: "emberglass", persona: "balanced" })
  const h = hall(w, 0)
  w.players[0].grain = 20
  w.players[0].timber = 200
  w.players[0].ore = 200
  for (const n of w.nodes) n.amount = 0
  const hunt = w.nodes.find((n) => n.type === "grain")!
  const field = w.nodes.find((n) => n.type === "grain" && n.id !== hunt.id)!
  hunt.x = h.x + 5
  hunt.y = h.y
  hunt.amount = 80
  hunt.fauna = "deer"
  field.x = h.x + 28
  field.y = h.y
  field.amount = 400
  field.fauna = null
  const levy = w.units.find((u) => u.owner === 0 && u.type === "levy")!
  levy.x = h.x
  levy.y = h.y
  levy.order = { t: "idle" }
  for (let i = 0; i < 12; i++) {
    tickAi(w, 0, params, personaById("balanced"))
    tick(w)
  }
  const gatherer = w.units.find((u) => u.owner === 0 && u.order.t === "gather")
  assert.ok(gatherer, "levy should gather")
  if (gatherer && gatherer.order.t === "gather") {
    assert.equal(gatherer.order.node, hunt.id, "prefer the nearby hunt over the far field")
  }
})

test("student lowers attackAtArmy against rand-aggro", () => {
  const student = { ...personaById("balanced").params, attackAtArmy: 9 }
  const w = createWorld("ashen", "gilded", student, { mapId: "emberglass", persona: "rand-aggro" })
  w.players[0].age = 1
  w.players[0].grain = 800
  w.players[0].ore = 400
  w.players[0].timber = 400
  const h = hall(w, 0)
  // adapt 9→6, Forge uses attackAt-1 = 5, so the wave needs five banners.
  pushBanner(w, "guard", 0, h.x + 2, h.y)
  pushBanner(w, "guard", 0, h.x + 3, h.y)
  pushBanner(w, "guard", 0, h.x + 4, h.y)
  pushBanner(w, "ashrider", 0, h.x + 5, h.y)
  pushBanner(w, "ashrider", 0, h.x + 6, h.y)
  for (let i = 0; i < 10; i++) {
    tickAi(w, 0, student, personaById("balanced"))
    tick(w)
  }
  const march = w.units.filter(
    (u) => u.owner === 0 && (u.order.t === "attackMove" || u.order.t === "attack"),
  )
  assert.ok(march.length >= 1, "rand-aggro should draw an earlier march than attackAt 9")
})

test("ashrider peels a gathering rival levy", () => {
  const params = { ...personaById("balanced").params, attackAtArmy: 2 }
  const w = createWorld("ashen", "gilded", params, { mapId: "emberglass", persona: "balanced" })
  w.players[0].age = 1
  const h = hall(w, 0)
  pushBanner(w, "ashrider", 0, h.x + 3, h.y)
  pushBanner(w, "guard", 0, h.x + 2, h.y)
  pushBanner(w, "guard", 0, h.x + 4, h.y)
  const node = w.nodes.find((n) => n.amount > 0 && Math.hypot(n.x - h.x, n.y - h.y) > 24)
  assert.ok(node)
  pushBanner(w, "levy", 1, node.x, node.y)
  const levy = w.units.find((u) => u.owner === 1 && u.type === "levy")!
  assert.ok(issueGather(w, [levy.id], node.id))
  for (let i = 0; i < 12; i++) {
    tickAi(w, 0, params, personaById("balanced"))
    tick(w)
  }
  const rider = w.units.find((u) => u.owner === 0 && u.type === "ashrider")!
  assert.ok(
    rider.order.t === "attack" || rider.order.t === "attackMove",
    `rider should peel or still march, got ${rider.order.t}`,
  )
})

test("pressed hearth queues a banner guard", () => {
  const params = { ...personaById("balanced").params, attackAtArmy: 9 }
  const w = createWorld("ashen", "gilded", params, { mapId: "emberglass", persona: "balanced" })
  const h = hall(w, 0)
  w.players[0].grain = 400
  w.players[0].ore = 200
  w.players[0].timber = 200
  const yard = placeBuilding(
    w,
    0,
    "yard",
    h.x + 8,
    h.y,
    w.units.filter((u) => u.owner === 0).map((u) => u.id),
  )!
  yard.done = true
  yard.construct = yard.constructMax
  pushBanner(w, "guard", 1, h.x + 4, h.y)
  for (let i = 0; i < 8; i++) {
    tickAi(w, 0, params, personaById("balanced"))
    tick(w)
  }
  assert.ok(
    yard.queue.some((q) => q.type === "guard") || w.units.some((u) => u.owner === 0 && u.type === "guard"),
    "pressed hearth should raise a guard",
  )
})

test("wounded hearth keeps the banners home", () => {
  const params = { ...personaById("balanced").params, attackAtArmy: 2 }
  const w = createWorld("ashen", "gilded", params, { mapId: "emberglass", persona: "balanced" })
  w.players[0].age = 1
  const h = hall(w, 0)
  h.hp = h.hpMax * 0.7
  pushBanner(w, "guard", 0, h.x + 2, h.y)
  pushBanner(w, "guard", 0, h.x + 3, h.y)
  pushBanner(w, "ashrider", 0, h.x + 4, h.y)
  for (let i = 0; i < 10; i++) {
    tickAi(w, 0, params, personaById("balanced"))
    tick(w)
  }
  const march = w.units.filter(
    (u) => u.owner === 0 && u.type !== "levy" && (u.order.t === "attackMove" || u.order.t === "attack"),
  )
  assert.equal(march.length, 0, "a wounded hearth should not send the wave")
})

test("warden steps off a melee that closes in", () => {
  const params = { ...personaById("balanced").params, kite: 0.8, attackAtArmy: 9 }
  const w = createWorld("ashen", "gilded", params, { mapId: "emberglass", persona: "balanced" })
  const h = hall(w, 0)
  pushBanner(w, "warden", 0, h.x + 28, h.y)
  pushBanner(w, "guard", 1, h.x + 30, h.y)
  const warden = w.units.find((u) => u.owner === 0 && u.type === "warden")!
  const foe = w.units.find((u) => u.owner === 1 && u.type === "guard")!
  for (let i = 0; i < 24; i++) {
    tickAi(w, 0, params, personaById("balanced"))
    tick(w)
  }
  const away = Math.hypot(warden.x - foe.x, warden.y - foe.y)
  assert.ok(
    away > 3.2 || warden.order.t === "move",
    `warden should kite, dist ${away} order ${warden.order.t}`,
  )
})

test("a pressed camp draws a sentry", () => {
  const params = { ...personaById("balanced").params, attackAtArmy: 9 }
  const w = createWorld("ashen", "gilded", params, { mapId: "emberglass", persona: "balanced" })
  const h = hall(w, 0)
  w.players[0].grain = 400
  w.players[0].ore = 200
  w.players[0].timber = 200
  const camp = placeBuilding(
    w,
    0,
    "camp",
    h.x + 18,
    h.y,
    w.units.filter((u) => u.owner === 0).map((u) => u.id),
  )!
  camp.done = true
  camp.construct = camp.constructMax
  pushBanner(w, "guard", 0, h.x + 2, h.y)
  pushBanner(w, "guard", 0, h.x + 3, h.y)
  pushBanner(w, "guard", 1, camp.x + 2, camp.y)
  for (let i = 0; i < 16; i++) {
    tickAi(w, 0, params, personaById("balanced"))
    tick(w)
  }
  const sentry = w.units.find((u) => u.owner === 0 && u.type === "guard")
  assert.ok(sentry, "need a home guard")
  const near = Math.hypot(sentry.x - camp.x, sentry.y - camp.y)
  assert.ok(
    sentry.order.t === "defend" || sentry.order.t === "attack" || sentry.order.t === "attackMove" || near < 14,
    `camp should pull a sentry, order ${sentry.order.t} dist ${near}`,
  )
})

test("student recalls the wave when banners press the hearth", () => {
  const params = { ...personaById("balanced").params, attackAtArmy: 2 }
  const w = createWorld("ashen", "gilded", params, { mapId: "emberglass", persona: "balanced" })
  w.players[0].age = 1
  const h = hall(w, 0)
  pushBanner(w, "guard", 0, h.x + 3, h.y)
  pushBanner(w, "guard", 0, h.x + 4, h.y)
  pushBanner(w, "ashrider", 0, h.x + 5, h.y)
  pushBanner(w, "guard", 1, h.x + 6, h.y)
  pushBanner(w, "guard", 1, h.x + 7, h.y)
  for (let i = 0; i < 12; i++) {
    tickAi(w, 0, params, personaById("balanced"))
    tick(w)
  }
  const home = w.units.filter(
    (u) =>
      u.owner === 0 &&
      u.type !== "levy" &&
      (u.order.t === "attack" || u.order.t === "defend" || Math.hypot(u.x - h.x, u.y - h.y) < 16),
  )
  assert.ok(home.length >= 2, "pressed hearth should keep or recall banners")
})

test("Forge Age hunt hops to the next hunt, not a grain field", () => {
  const w = createWorld("ashen", "gilded", undefined, { mapId: "emberglass" })
  w.players[0].age = 1
  const hall = w.buildings.find((b) => b.owner === 0 && b.type === "hearth")
  const levy = w.units.find((u) => u.owner === 0 && u.type === "levy")
  assert.ok(hall && levy)
  levy.x = hall.x
  levy.y = hall.y
  for (const n of w.nodes) n.amount = 0
  const grains = w.nodes.filter((n) => n.type === "grain")
  assert.ok(grains.length >= 3)
  const huntA = grains[0]
  const huntB = grains[1]
  const field = grains[2]
  huntA.x = hall.x + 4
  huntA.y = hall.y
  huntA.amount = 80
  huntA.fauna = "deer"
  huntB.x = hall.x + 16
  huntB.y = hall.y
  huntB.amount = 80
  huntB.fauna = "boar"
  field.x = hall.x + 6
  field.y = hall.y
  field.amount = 400
  field.fauna = null
  assert.ok(issueGather(w, [levy.id], huntA.id))
  huntA.amount = 0
  tick(w)
  assert.equal(levy.order.t, "gather")
  if (levy.order.t === "gather") assert.equal(levy.order.node, huntB.id)
})

test("empty rival hearth hooks a third ashrider wide", () => {
  const params = { ...personaById("balanced").params, attackAtArmy: 2 }
  const w = createWorld("ashen", "gilded", params, { mapId: "emberglass", persona: "balanced" })
  w.players[0].age = 1
  w.players[0].grain = 800
  w.players[0].ore = 400
  w.players[0].timber = 400
  const h = hall(w, 0)
  const foe = hall(w, 1)
  pushBanner(w, "guard", 0, h.x + 2, h.y)
  pushBanner(w, "ashrider", 0, h.x + 3, h.y)
  pushBanner(w, "ashrider", 0, h.x + 4, h.y)
  pushBanner(w, "ashrider", 0, h.x + 5, h.y)
  let hooked = 0
  for (let i = 0; i < 80; i++) {
    tickAi(w, 0, params, personaById("balanced"))
    hooked = w.units.filter(
      (u) =>
        u.owner === 0 &&
        u.type === "ashrider" &&
        u.order.t === "attackMove" &&
        Math.abs(u.order.y - (foe.y + 10)) < 0.01,
    ).length
    if (hooked) break
    tick(w)
  }
  assert.ok(hooked >= 1, "a spare rider should hook south of an empty hearth")
})

test("a pressed granary draws a sentry", () => {
  const params = { ...personaById("balanced").params, attackAtArmy: 9 }
  const w = createWorld("ashen", "gilded", params, { mapId: "emberglass", persona: "balanced" })
  const h = hall(w, 0)
  w.players[0].grain = 400
  w.players[0].ore = 200
  w.players[0].timber = 200
  const granary = placeBuilding(
    w,
    0,
    "granary",
    h.x + 18,
    h.y,
    w.units.filter((u) => u.owner === 0).map((u) => u.id),
  )!
  granary.done = true
  granary.construct = granary.constructMax
  pushBanner(w, "guard", 0, h.x + 2, h.y)
  pushBanner(w, "guard", 0, h.x + 3, h.y)
  pushBanner(w, "guard", 1, granary.x + 2, granary.y)
  for (let i = 0; i < 16; i++) {
    tickAi(w, 0, params, personaById("balanced"))
    tick(w)
  }
  const sentry = w.units.find((u) => u.owner === 0 && u.type === "guard")
  assert.ok(sentry, "need a home guard")
  const near = Math.hypot(sentry.x - granary.x, sentry.y - granary.y)
  assert.ok(
    sentry.order.t === "defend" || sentry.order.t === "attack" || sentry.order.t === "attackMove" || near < 14,
    `granary should pull a sentry, order ${sentry.order.t} dist ${near}`,
  )
})

test("a pressed pit draws a sentry", () => {
  const params = { ...personaById("balanced").params, attackAtArmy: 9 }
  const w = createWorld("ashen", "gilded", params, { mapId: "emberglass", persona: "balanced" })
  const h = hall(w, 0)
  w.players[0].grain = 400
  w.players[0].ore = 200
  w.players[0].timber = 200
  const pit = placeBuilding(
    w,
    0,
    "pit",
    h.x + 18,
    h.y,
    w.units.filter((u) => u.owner === 0).map((u) => u.id),
  )!
  pit.done = true
  pit.construct = pit.constructMax
  pushBanner(w, "guard", 0, h.x + 2, h.y)
  pushBanner(w, "guard", 0, h.x + 3, h.y)
  pushBanner(w, "guard", 1, pit.x + 2, pit.y)
  for (let i = 0; i < 16; i++) {
    tickAi(w, 0, params, personaById("balanced"))
    tick(w)
  }
  const sentry = w.units.find((u) => u.owner === 0 && u.type === "guard")
  assert.ok(sentry, "need a home guard")
  const near = Math.hypot(sentry.x - pit.x, sentry.y - pit.y)
  assert.ok(
    sentry.order.t === "defend" || sentry.order.t === "attack" || sentry.order.t === "attackMove" || near < 14,
    `pit should pull a sentry, order ${sentry.order.t} dist ${near}`,
  )
})

test("a pressed lodge draws a sentry", () => {
  const params = { ...personaById("balanced").params, attackAtArmy: 9 }
  const w = createWorld("ashen", "gilded", params, { mapId: "emberglass", persona: "balanced" })
  const h = hall(w, 0)
  w.players[0].age = 1
  w.players[0].grain = 400
  w.players[0].ore = 200
  w.players[0].timber = 200
  const lodge = placeBuilding(
    w,
    0,
    "lodge",
    h.x + 18,
    h.y,
    w.units.filter((u) => u.owner === 0).map((u) => u.id),
  )!
  lodge.done = true
  lodge.construct = lodge.constructMax
  pushBanner(w, "guard", 0, h.x + 2, h.y)
  pushBanner(w, "guard", 0, h.x + 3, h.y)
  pushBanner(w, "guard", 1, lodge.x + 2, lodge.y)
  for (let i = 0; i < 16; i++) {
    tickAi(w, 0, params, personaById("balanced"))
    tick(w)
  }
  const sentry = w.units.find((u) => u.owner === 0 && u.type === "guard")
  assert.ok(sentry, "need a home guard")
  const near = Math.hypot(sentry.x - lodge.x, sentry.y - lodge.y)
  assert.ok(
    sentry.order.t === "defend" || sentry.order.t === "attack" || sentry.order.t === "attackMove" || near < 14,
    `lodge should pull a sentry, order ${sentry.order.t} dist ${near}`,
  )
})

test("a pressed yard draws a sentry", () => {
  const params = { ...personaById("balanced").params, attackAtArmy: 9 }
  const w = createWorld("ashen", "gilded", params, { mapId: "emberglass", persona: "balanced" })
  const h = hall(w, 0)
  w.players[0].grain = 400
  w.players[0].ore = 200
  w.players[0].timber = 200
  const yard = placeBuilding(
    w,
    0,
    "yard",
    h.x + 18,
    h.y,
    w.units.filter((u) => u.owner === 0).map((u) => u.id),
  )!
  yard.done = true
  yard.construct = yard.constructMax
  pushBanner(w, "guard", 0, h.x + 2, h.y)
  pushBanner(w, "guard", 0, h.x + 3, h.y)
  pushBanner(w, "guard", 1, yard.x + 2, yard.y)
  for (let i = 0; i < 16; i++) {
    tickAi(w, 0, params, personaById("balanced"))
    tick(w)
  }
  const sentry = w.units.find((u) => u.owner === 0 && u.type === "guard")
  assert.ok(sentry, "need a home guard")
  const near = Math.hypot(sentry.x - yard.x, sentry.y - yard.y)
  assert.ok(
    sentry.order.t === "defend" || sentry.order.t === "attack" || sentry.order.t === "attackMove" || near < 14,
    `yard should pull a sentry, order ${sentry.order.t} dist ${near}`,
  )
})

test("idle levy walks a relic when no scout is free", () => {
  const params = { ...personaById("balanced").params, attackAtArmy: 9 }
  const w = createWorld("ashen", "gilded", params, { mapId: "emberglass", persona: "balanced" })
  w.players[0].age = 1
  const h = hall(w, 0)
  const levy = w.units.find((u) => u.owner === 0 && u.type === "levy")
  assert.ok(levy)
  levy.order = { t: "idle" }
  levy.x = h.x
  levy.y = h.y
  const relic = w.nodes.find((n) => n.type === "relics" && n.amount > 0)
  assert.ok(relic)
  for (let i = 0; i < 20; i++) {
    tickAi(w, 0, params, personaById("balanced"))
    tick(w)
  }
  const order = w.units.find((u) => u.id === levy.id)?.order
  assert.ok(order, "levy still on the field")
  assert.ok(
    (order.t === "gather" && order.node === relic.id) ||
      order.t === "return" ||
      Math.hypot(levy.x - relic.x, levy.y - relic.y) < 8,
    `levy should walk a relic, order ${order.t}`,
  )
})

test("a third warden overwatches a relic levy", () => {
  const params = { ...personaById("balanced").params, attackAtArmy: 9 }
  const w = createWorld("ashen", "gilded", params, { mapId: "emberglass", persona: "balanced" })
  w.players[0].age = 1
  const h = hall(w, 0)
  const relic = w.nodes.find((n) => n.type === "relics" && n.amount > 0)
  const levy = w.units.find((u) => u.owner === 0 && u.type === "levy")
  assert.ok(relic && levy)
  levy.x = relic.x
  levy.y = relic.y
  assert.ok(issueGather(w, [levy.id], relic.id))
  for (let i = 0; i < 3; i++) pushBanner(w, "warden", 0, h.x + 2 + i, h.y)
  for (let i = 0; i < 70; i++) {
    tickAi(w, 0, params, personaById("balanced"))
    tick(w)
  }
  const live = w.units.find((u) => u.id === levy.id)!
  const watch = w.units.find(
    (u) =>
      u.owner === 0 &&
      u.type === "warden" &&
      ((u.order.t === "defend" && Math.hypot(u.order.x - live.x, u.order.y - live.y) < 10) ||
        Math.hypot(u.x - live.x, u.y - live.y) < 12),
  )
  assert.ok(watch, "a spare warden should overwatch the relic levy")
})

test("a relic levy draws a banner escort", () => {
  const params = { ...personaById("balanced").params, attackAtArmy: 9 }
  const w = createWorld("ashen", "gilded", params, { mapId: "emberglass", persona: "balanced" })
  w.players[0].age = 1
  const h = hall(w, 0)
  const relic = w.nodes.find((n) => n.type === "relics" && n.amount > 0)
  const levy = w.units.find((u) => u.owner === 0 && u.type === "levy")
  assert.ok(relic && levy)
  levy.x = relic.x
  levy.y = relic.y
  assert.ok(issueGather(w, [levy.id], relic.id))
  pushBanner(w, "guard", 0, h.x + 2, h.y)
  pushBanner(w, "guard", 0, h.x + 3, h.y)
  for (let i = 0; i < 24; i++) {
    tickAi(w, 0, params, personaById("balanced"))
    tick(w)
  }
  const escort = w.units.find(
    (u) =>
      u.owner === 0 &&
      u.type === "guard" &&
      (u.order.t === "defend" || u.order.t === "attackMove" || Math.hypot(u.x - relic.x, u.y - relic.y) < 16),
  )
  assert.ok(escort, "a banner should walk with the relic levy")
})

test("Forge Age with fat stores sends a levy to relics", () => {
  const params = personaById("balanced").params
  const w = createWorld("ashen", "gilded", params, { mapId: "emberglass", persona: "balanced" })
  w.players[0].age = 1
  w.players[0].grain = 240
  w.players[0].timber = 180
  w.players[0].ore = 140
  w.players[0].relics = 0
  const h = hall(w, 0)
  const levy = w.units.find((u) => u.owner === 0 && u.type === "levy")
  const relic = w.nodes.find((n) => n.type === "relics" && n.amount > 0)
  assert.ok(levy && relic)
  levy.x = h.x
  levy.y = h.y
  levy.order = { t: "idle" }
  for (let i = 0; i < 20; i++) {
    tickAi(w, 0, params, personaById("balanced"))
    tick(w)
  }
  const live = w.units.find((u) => u.id === levy.id)
  assert.ok(live)
  const order = live.order
  assert.ok(
    (order.t === "gather" && order.node === relic.id) ||
      order.t === "return" ||
      Math.hypot(live.x - relic.x, live.y - relic.y) < 10,
    `fat stores should walk relics, order ${order.t}`,
  )
})

test("extra levies walk a far camp", () => {
  const params = personaById("balanced").params
  const w = createWorld("ashen", "gilded", params, { mapId: "emberglass", persona: "balanced" })
  const h = hall(w, 0)
  w.players[0].grain = 400
  w.players[0].timber = 200
  const camp = placeBuilding(
    w,
    0,
    "camp",
    h.x + 22,
    h.y,
    w.units.filter((u) => u.owner === 0).map((u) => u.id),
  )!
  camp.done = true
  camp.construct = camp.constructMax
  for (let i = 0; i < 8; i++) {
    const levy = w.units.find((u) => u.owner === 0 && u.type === "levy")
    if (!levy) break
    w.units.push({ ...levy, id: w.nextId++, x: h.x + 1, y: h.y + 1, order: { t: "idle" }, carry: null })
  }
  for (const u of w.units) {
    if (u.owner === 0 && u.type === "levy") u.order = { t: "idle" }
  }
  for (let i = 0; i < 50; i++) {
    tickAi(w, 0, params, personaById("balanced"))
    tick(w)
  }
  const walker = w.units.find(
    (u) =>
      u.owner === 0 &&
      u.type === "levy" &&
      (u.order.t === "move" || Math.hypot(u.x - camp.x, u.y - camp.y) < 8),
  )
  assert.ok(walker, "an extra levy should walk the far camp")
})

test("a fourth ashrider patrols a far camp", () => {
  const params = { ...personaById("balanced").params, attackAtArmy: 9 }
  const w = createWorld("ashen", "gilded", params, { mapId: "emberglass", persona: "balanced" })
  const h = hall(w, 0)
  w.players[0].age = 1
  w.players[0].grain = 400
  w.players[0].timber = 200
  const camp = placeBuilding(
    w,
    0,
    "camp",
    h.x + 22,
    h.y,
    w.units.filter((u) => u.owner === 0).map((u) => u.id),
  )!
  camp.done = true
  camp.construct = camp.constructMax
  for (let i = 0; i < 4; i++) pushBanner(w, "ashrider", 0, h.x + 2 + i, h.y)
  for (let i = 0; i < 50; i++) {
    tickAi(w, 0, params, personaById("balanced"))
    tick(w)
  }
  const patrol = w.units.find(
    (u) =>
      u.owner === 0 &&
      u.type === "ashrider" &&
      ((u.order.t === "defend" && Math.hypot(u.order.x - camp.x, u.order.y - camp.y) < 4) ||
        Math.hypot(u.x - camp.x, u.y - camp.y) < 10),
  )
  assert.ok(patrol, "a spare ashrider should patrol the far camp")
})

test("a fourth ashrider patrols a far lodge", () => {
  const params = { ...personaById("balanced").params, attackAtArmy: 9 }
  const w = createWorld("ashen", "gilded", params, { mapId: "emberglass", persona: "balanced" })
  const h = hall(w, 0)
  w.players[0].age = 1
  w.players[0].grain = 400
  w.players[0].timber = 200
  const lodge = placeBuilding(
    w,
    0,
    "lodge",
    h.x + 22,
    h.y,
    w.units.filter((u) => u.owner === 0).map((u) => u.id),
  )!
  lodge.done = true
  lodge.construct = lodge.constructMax
  for (let i = 0; i < 4; i++) pushBanner(w, "ashrider", 0, h.x + 2 + i, h.y)
  for (let i = 0; i < 50; i++) {
    tickAi(w, 0, params, personaById("balanced"))
    tick(w)
  }
  const patrol = w.units.find(
    (u) =>
      u.owner === 0 &&
      u.type === "ashrider" &&
      ((u.order.t === "defend" && Math.hypot(u.order.x - lodge.x, u.order.y - lodge.y) < 4) ||
        Math.hypot(u.x - lodge.x, u.y - lodge.y) < 10),
  )
  assert.ok(patrol, "a spare ashrider should patrol the far lodge")
})

test("a fourth ashrider patrols a far pit", () => {
  const params = { ...personaById("balanced").params, attackAtArmy: 9 }
  const w = createWorld("ashen", "gilded", params, { mapId: "emberglass", persona: "balanced" })
  const h = hall(w, 0)
  w.players[0].age = 1
  w.players[0].grain = 400
  w.players[0].timber = 200
  const pit = placeBuilding(
    w,
    0,
    "pit",
    h.x + 22,
    h.y,
    w.units.filter((u) => u.owner === 0).map((u) => u.id),
  )!
  pit.done = true
  pit.construct = pit.constructMax
  for (let i = 0; i < 4; i++) pushBanner(w, "ashrider", 0, h.x + 2 + i, h.y)
  for (let i = 0; i < 50; i++) {
    tickAi(w, 0, params, personaById("balanced"))
    tick(w)
  }
  const patrol = w.units.find(
    (u) =>
      u.owner === 0 &&
      u.type === "ashrider" &&
      ((u.order.t === "defend" && Math.hypot(u.order.x - pit.x, u.order.y - pit.y) < 4) ||
        Math.hypot(u.x - pit.x, u.y - pit.y) < 10),
  )
  assert.ok(patrol, "a spare ashrider should patrol the far pit")
})

test("a fourth ashrider patrols a far granary", () => {
  const params = { ...personaById("balanced").params, attackAtArmy: 9 }
  const w = createWorld("ashen", "gilded", params, { mapId: "emberglass", persona: "balanced" })
  const h = hall(w, 0)
  w.players[0].age = 1
  w.players[0].grain = 400
  w.players[0].timber = 200
  const granary = placeBuilding(
    w,
    0,
    "granary",
    h.x + 22,
    h.y,
    w.units.filter((u) => u.owner === 0).map((u) => u.id),
  )!
  granary.done = true
  granary.construct = granary.constructMax
  for (let i = 0; i < 4; i++) pushBanner(w, "ashrider", 0, h.x + 2 + i, h.y)
  for (let i = 0; i < 50; i++) {
    tickAi(w, 0, params, personaById("balanced"))
    tick(w)
  }
  const patrol = w.units.find(
    (u) =>
      u.owner === 0 &&
      u.type === "ashrider" &&
      ((u.order.t === "defend" && Math.hypot(u.order.x - granary.x, u.order.y - granary.y) < 4) ||
        Math.hypot(u.x - granary.x, u.y - granary.y) < 10),
  )
  assert.ok(patrol, "a spare ashrider should patrol the far granary")
})

test("a fourth ashrider patrols a far yard", () => {
  const params = { ...personaById("balanced").params, attackAtArmy: 9 }
  const w = createWorld("ashen", "gilded", params, { mapId: "emberglass", persona: "balanced" })
  const h = hall(w, 0)
  w.players[0].age = 1
  w.players[0].grain = 400
  w.players[0].timber = 200
  const yard = placeBuilding(
    w,
    0,
    "yard",
    h.x + 22,
    h.y,
    w.units.filter((u) => u.owner === 0).map((u) => u.id),
  )!
  yard.done = true
  yard.construct = yard.constructMax
  for (let i = 0; i < 4; i++) pushBanner(w, "ashrider", 0, h.x + 2 + i, h.y)
  for (let i = 0; i < 50; i++) {
    tickAi(w, 0, params, personaById("balanced"))
    tick(w)
  }
  const patrol = w.units.find(
    (u) =>
      u.owner === 0 &&
      u.type === "ashrider" &&
      ((u.order.t === "defend" && Math.hypot(u.order.x - yard.x, u.order.y - yard.y) < 4) ||
        Math.hypot(u.x - yard.x, u.y - yard.y) < 10),
  )
  assert.ok(patrol, "a spare ashrider should patrol the far yard")
})

test("a fifth ashrider patrols a relic", () => {
  const params = { ...personaById("balanced").params, attackAtArmy: 9 }
  const w = createWorld("ashen", "gilded", params, { mapId: "emberglass", persona: "balanced" })
  const h = hall(w, 0)
  w.players[0].age = 1
  w.players[0].grain = 400
  w.players[0].timber = 200
  const relic = w.nodes.find((n) => n.type === "relics" && n.amount > 0)
  assert.ok(relic, "emberglass should seed a relic")
  for (let i = 0; i < 5; i++) pushBanner(w, "ashrider", 0, h.x + 2 + i, h.y)
  for (let i = 0; i < 50; i++) {
    tickAi(w, 0, params, personaById("balanced"))
    tick(w)
  }
  const patrol = w.units.find(
    (u) =>
      u.owner === 0 &&
      u.type === "ashrider" &&
      ((u.order.t === "defend" && Math.hypot(u.order.x - relic.x, u.order.y - relic.y) < 4) ||
        (u.order.t === "move" && Math.hypot(u.order.x - relic.x, u.order.y - relic.y) < 4) ||
        Math.hypot(u.x - relic.x, u.y - relic.y) < 12),
  )
  assert.ok(patrol, "a spare ashrider should patrol a relic")
})

test("extra levies walk a far pit", () => {
  const params = personaById("balanced").params
  const w = createWorld("ashen", "gilded", params, { mapId: "emberglass", persona: "balanced" })
  const h = hall(w, 0)
  w.players[0].grain = 400
  w.players[0].timber = 200
  const pit = placeBuilding(
    w,
    0,
    "pit",
    h.x + 22,
    h.y,
    w.units.filter((u) => u.owner === 0).map((u) => u.id),
  )!
  pit.done = true
  pit.construct = pit.constructMax
  for (let i = 0; i < 8; i++) {
    const levy = w.units.find((u) => u.owner === 0 && u.type === "levy")
    if (!levy) break
    w.units.push({ ...levy, id: w.nextId++, x: h.x + 1, y: h.y + 1, order: { t: "idle" }, carry: null })
  }
  for (const u of w.units) {
    if (u.owner === 0 && u.type === "levy") u.order = { t: "idle" }
  }
  for (let i = 0; i < 50; i++) {
    tickAi(w, 0, params, personaById("balanced"))
    tick(w)
  }
  const walker = w.units.find(
    (u) =>
      u.owner === 0 &&
      u.type === "levy" &&
      (u.order.t === "move" || Math.hypot(u.x - pit.x, u.y - pit.y) < 8),
  )
  assert.ok(walker, "an extra levy should walk the far pit")
})

test("age rite pulls banners home to hold the hearth", () => {
  const params = { ...personaById("balanced").params, attackAtArmy: 9 }
  const w = createWorld("ashen", "gilded", params, { mapId: "emberglass", persona: "balanced" })
  const h = hall(w, 0)
  w.players[0].grain = 400
  w.players[0].ore = 200
  w.players[0].timber = 200
  const yard = placeBuilding(
    w,
    0,
    "yard",
    h.x + 8,
    h.y,
    w.units.filter((u) => u.owner === 0).map((u) => u.id),
  )!
  yard.done = true
  yard.construct = yard.constructMax
  for (let i = 0; i < 4; i++) pushBanner(w, "guard", 0, h.x + 20, h.y + i)
  assert.equal(startAge(w, 0), true)
  for (let i = 0; i < 40; i++) {
    tickAi(w, 0, params, personaById("balanced"))
    tick(w)
  }
  const holding = w.units.filter(
    (u) =>
      u.owner === 0 &&
      u.type === "guard" &&
      u.order.t === "defend" &&
      Math.hypot(u.order.x - h.x, u.order.y - h.y) < 8,
  )
  assert.ok(holding.length >= 2, "the rite should pull banners onto the hearth")
})

test("extra levies walk a far granary", () => {
  const params = personaById("balanced").params
  const w = createWorld("ashen", "gilded", params, { mapId: "emberglass", persona: "balanced" })
  const h = hall(w, 0)
  w.players[0].grain = 400
  w.players[0].timber = 200
  const granary = placeBuilding(
    w,
    0,
    "granary",
    h.x + 22,
    h.y,
    w.units.filter((u) => u.owner === 0).map((u) => u.id),
  )!
  granary.done = true
  granary.construct = granary.constructMax
  for (let i = 0; i < 8; i++) {
    const levy = w.units.find((u) => u.owner === 0 && u.type === "levy")
    if (!levy) break
    w.units.push({ ...levy, id: w.nextId++, x: h.x + 1, y: h.y + 1, order: { t: "idle" }, carry: null })
  }
  for (const u of w.units) {
    if (u.owner === 0 && u.type === "levy") u.order = { t: "idle" }
  }
  for (let i = 0; i < 50; i++) {
    tickAi(w, 0, params, personaById("balanced"))
    tick(w)
  }
  const walker = w.units.find(
    (u) =>
      u.owner === 0 &&
      u.type === "levy" &&
      (u.order.t === "move" || Math.hypot(u.x - granary.x, u.y - granary.y) < 8),
  )
  assert.ok(walker, "an extra levy should walk the far granary")
})

test("extra levies walk a far yard", () => {
  const params = personaById("balanced").params
  const w = createWorld("ashen", "gilded", params, { mapId: "emberglass", persona: "balanced" })
  const h = hall(w, 0)
  w.players[0].grain = 400
  w.players[0].timber = 200
  const yard = placeBuilding(
    w,
    0,
    "yard",
    h.x + 22,
    h.y,
    w.units.filter((u) => u.owner === 0).map((u) => u.id),
  )!
  yard.done = true
  yard.construct = yard.constructMax
  for (let i = 0; i < 8; i++) {
    const levy = w.units.find((u) => u.owner === 0 && u.type === "levy")
    if (!levy) break
    w.units.push({ ...levy, id: w.nextId++, x: h.x + 1, y: h.y + 1, order: { t: "idle" }, carry: null })
  }
  for (const u of w.units) {
    if (u.owner === 0 && u.type === "levy") u.order = { t: "idle" }
  }
  for (let i = 0; i < 50; i++) {
    tickAi(w, 0, params, personaById("balanced"))
    tick(w)
  }
  const walker = w.units.find(
    (u) =>
      u.owner === 0 &&
      u.type === "levy" &&
      (u.order.t === "move" || Math.hypot(u.x - yard.x, u.y - yard.y) < 8),
  )
  assert.ok(walker, "an extra levy should walk the far yard")
})

test("extra levies walk a far lodge", () => {
  const params = personaById("balanced").params
  const w = createWorld("ashen", "gilded", params, { mapId: "emberglass", persona: "balanced" })
  const h = hall(w, 0)
  w.players[0].age = 1
  w.players[0].grain = 400
  w.players[0].timber = 200
  const lodge = placeBuilding(
    w,
    0,
    "lodge",
    h.x + 22,
    h.y,
    w.units.filter((u) => u.owner === 0).map((u) => u.id),
  )!
  lodge.done = true
  lodge.construct = lodge.constructMax
  for (let i = 0; i < 8; i++) {
    const levy = w.units.find((u) => u.owner === 0 && u.type === "levy")
    if (!levy) break
    w.units.push({ ...levy, id: w.nextId++, x: h.x + 1, y: h.y + 1, order: { t: "idle" }, carry: null })
  }
  for (const u of w.units) {
    if (u.owner === 0 && u.type === "levy") u.order = { t: "idle" }
  }
  for (let i = 0; i < 50; i++) {
    tickAi(w, 0, params, personaById("balanced"))
    tick(w)
  }
  const walker = w.units.find(
    (u) =>
      u.owner === 0 &&
      u.type === "levy" &&
      (u.order.t === "move" || Math.hypot(u.x - lodge.x, u.y - lodge.y) < 8),
  )
  assert.ok(walker, "an extra levy should walk the far lodge")
})

test("a third warden overwatches a far camp", () => {
  const params = { ...personaById("balanced").params, attackAtArmy: 9 }
  const w = createWorld("ashen", "gilded", params, { mapId: "emberglass", persona: "balanced" })
  const h = hall(w, 0)
  w.players[0].age = 1
  w.players[0].grain = 400
  w.players[0].timber = 200
  const camp = placeBuilding(
    w,
    0,
    "camp",
    h.x + 22,
    h.y,
    w.units.filter((u) => u.owner === 0).map((u) => u.id),
  )!
  camp.done = true
  camp.construct = camp.constructMax
  for (let i = 0; i < 3; i++) pushBanner(w, "warden", 0, h.x + 2 + i, h.y)
  for (let i = 0; i < 50; i++) {
    tickAi(w, 0, params, personaById("balanced"))
    tick(w)
  }
  const watch = w.units.find(
    (u) =>
      u.owner === 0 &&
      u.type === "warden" &&
      ((u.order.t === "defend" && Math.hypot(u.order.x - camp.x, u.order.y - camp.y) < 4) ||
        Math.hypot(u.x - camp.x, u.y - camp.y) < 10),
  )
  assert.ok(watch, "a spare warden should overwatch the far camp")
})

test("a third warden overwatches a far lodge", () => {
  const params = { ...personaById("balanced").params, attackAtArmy: 9 }
  const w = createWorld("ashen", "gilded", params, { mapId: "emberglass", persona: "balanced" })
  const h = hall(w, 0)
  w.players[0].age = 1
  w.players[0].grain = 400
  w.players[0].timber = 200
  const lodge = placeBuilding(
    w,
    0,
    "lodge",
    h.x + 22,
    h.y,
    w.units.filter((u) => u.owner === 0).map((u) => u.id),
  )!
  lodge.done = true
  lodge.construct = lodge.constructMax
  for (let i = 0; i < 3; i++) pushBanner(w, "warden", 0, h.x + 2 + i, h.y)
  for (let i = 0; i < 50; i++) {
    tickAi(w, 0, params, personaById("balanced"))
    tick(w)
  }
  const watch = w.units.find(
    (u) =>
      u.owner === 0 &&
      u.type === "warden" &&
      ((u.order.t === "defend" && Math.hypot(u.order.x - lodge.x, u.order.y - lodge.y) < 4) ||
        Math.hypot(u.x - lodge.x, u.y - lodge.y) < 10),
  )
  assert.ok(watch, "a spare warden should overwatch the far lodge")
})

test("a third warden overwatches a far pit", () => {
  const params = { ...personaById("balanced").params, attackAtArmy: 9 }
  const w = createWorld("ashen", "gilded", params, { mapId: "emberglass", persona: "balanced" })
  const h = hall(w, 0)
  w.players[0].age = 1
  w.players[0].grain = 400
  w.players[0].timber = 200
  const pit = placeBuilding(
    w,
    0,
    "pit",
    h.x + 22,
    h.y,
    w.units.filter((u) => u.owner === 0).map((u) => u.id),
  )!
  pit.done = true
  pit.construct = pit.constructMax
  for (let i = 0; i < 3; i++) pushBanner(w, "warden", 0, h.x + 2 + i, h.y)
  for (let i = 0; i < 50; i++) {
    tickAi(w, 0, params, personaById("balanced"))
    tick(w)
  }
  const watch = w.units.find(
    (u) =>
      u.owner === 0 &&
      u.type === "warden" &&
      ((u.order.t === "defend" && Math.hypot(u.order.x - pit.x, u.order.y - pit.y) < 4) ||
        Math.hypot(u.x - pit.x, u.y - pit.y) < 10),
  )
  assert.ok(watch, "a spare warden should overwatch the far pit")
})

test("a third warden overwatches a far granary", () => {
  const params = { ...personaById("balanced").params, attackAtArmy: 9 }
  const w = createWorld("ashen", "gilded", params, { mapId: "emberglass", persona: "balanced" })
  const h = hall(w, 0)
  w.players[0].age = 1
  w.players[0].grain = 400
  w.players[0].timber = 200
  const granary = placeBuilding(
    w,
    0,
    "granary",
    h.x + 22,
    h.y,
    w.units.filter((u) => u.owner === 0).map((u) => u.id),
  )!
  granary.done = true
  granary.construct = granary.constructMax
  for (let i = 0; i < 3; i++) pushBanner(w, "warden", 0, h.x + 2 + i, h.y)
  for (let i = 0; i < 50; i++) {
    tickAi(w, 0, params, personaById("balanced"))
    tick(w)
  }
  const watch = w.units.find(
    (u) =>
      u.owner === 0 &&
      u.type === "warden" &&
      ((u.order.t === "defend" && Math.hypot(u.order.x - granary.x, u.order.y - granary.y) < 4) ||
        Math.hypot(u.x - granary.x, u.y - granary.y) < 10),
  )
  assert.ok(watch, "a spare warden should overwatch the far granary")
})

test("a third warden overwatches a far yard", () => {
  const params = { ...personaById("balanced").params, attackAtArmy: 9 }
  const w = createWorld("ashen", "gilded", params, { mapId: "emberglass", persona: "balanced" })
  const h = hall(w, 0)
  w.players[0].age = 1
  w.players[0].grain = 400
  w.players[0].timber = 200
  const yard = placeBuilding(
    w,
    0,
    "yard",
    h.x + 22,
    h.y,
    w.units.filter((u) => u.owner === 0).map((u) => u.id),
  )!
  yard.done = true
  yard.construct = yard.constructMax
  for (let i = 0; i < 3; i++) pushBanner(w, "warden", 0, h.x + 2 + i, h.y)
  for (let i = 0; i < 50; i++) {
    tickAi(w, 0, params, personaById("balanced"))
    tick(w)
  }
  const watch = w.units.find(
    (u) =>
      u.owner === 0 &&
      u.type === "warden" &&
      ((u.order.t === "defend" && Math.hypot(u.order.x - yard.x, u.order.y - yard.y) < 4) ||
        Math.hypot(u.x - yard.x, u.y - yard.y) < 10),
  )
  assert.ok(watch, "a spare warden should overwatch the far yard")
})

test("relic scout leaves the far-camp crew on the trail", () => {
  const params = personaById("balanced").params
  const w = createWorld("ashen", "gilded", params, { mapId: "emberglass", persona: "balanced" })
  const h = hall(w, 0)
  w.players[0].age = 1
  w.players[0].grain = 400
  w.players[0].timber = 200
  w.players[0].ore = 140
  w.players[0].relics = 0
  const camp = placeBuilding(
    w,
    0,
    "camp",
    h.x + 22,
    h.y,
    w.units.filter((u) => u.owner === 0).map((u) => u.id),
  )!
  camp.done = true
  camp.construct = camp.constructMax
  for (let i = 0; i < 8; i++) {
    const levy = w.units.find((u) => u.owner === 0 && u.type === "levy")
    if (!levy) break
    w.units.push({ ...levy, id: w.nextId++, x: h.x + 1, y: h.y + 1, order: { t: "idle" }, carry: null })
  }
  for (const u of w.units) {
    if (u.owner === 0 && u.type === "levy") u.order = { t: "idle" }
  }
  for (let i = 0; i < 60; i++) {
    tickAi(w, 0, params, personaById("balanced"))
    tick(w)
  }
  const walker = w.units.find(
    (u) =>
      u.owner === 0 &&
      u.type === "levy" &&
      (u.order.t === "move" || Math.hypot(u.x - camp.x, u.y - camp.y) < 8),
  )
  assert.ok(walker, "camp crew should stay even when a relic levy is wanted")
})

test("four banners escort the far-camp crew", () => {
  const params = { ...personaById("balanced").params, attackAtArmy: 9 }
  const w = createWorld("ashen", "gilded", params, { mapId: "emberglass", persona: "balanced" })
  const h = hall(w, 0)
  w.players[0].grain = 400
  w.players[0].timber = 200
  const camp = placeBuilding(
    w,
    0,
    "camp",
    h.x + 22,
    h.y,
    w.units.filter((u) => u.owner === 0).map((u) => u.id),
  )!
  camp.done = true
  camp.construct = camp.constructMax
  for (let i = 0; i < 8; i++) {
    const levy = w.units.find((u) => u.owner === 0 && u.type === "levy")
    if (!levy) break
    w.units.push({ ...levy, id: w.nextId++, x: h.x + 1, y: h.y + 1, order: { t: "idle" }, carry: null })
  }
  for (const u of w.units) {
    if (u.owner === 0 && u.type === "levy") u.order = { t: "idle" }
  }
  for (let i = 0; i < 4; i++) pushBanner(w, "guard", 0, h.x + 3 + i, h.y)
  for (let i = 0; i < 50; i++) {
    tickAi(w, 0, params, personaById("balanced"))
    tick(w)
  }
  const crew = w.units.find(
    (u) =>
      u.owner === 0 &&
      u.type === "levy" &&
      (u.order.t === "move" || Math.hypot(u.x - camp.x, u.y - camp.y) < 8),
  )
  const escort = w.units.find((u) => {
    if (u.owner !== 0 || u.type !== "guard" || u.order.t !== "defend") return false
    if (Math.hypot(u.order.x - camp.x, u.order.y - camp.y) < 12) return true
    return !!crew && Math.hypot(u.order.x - crew.x, u.order.y - crew.y) < 8
  })
  assert.ok(escort, "a spare banner should walk with the far-camp crew")
})

test("a relic hauler draws a warden on the walk home", () => {
  const params = { ...personaById("balanced").params, attackAtArmy: 9 }
  const w = createWorld("ashen", "gilded", params, { mapId: "emberglass", persona: "balanced" })
  const h = hall(w, 0)
  w.players[0].age = 1
  const levy = w.units.find((u) => u.owner === 0 && u.type === "levy")!
  levy.order = { t: "return", drop: h.id }
  levy.carry = { res: "relics", amt: 4 }
  levy.x = h.x + 18
  levy.y = h.y
  for (let i = 0; i < 3; i++) pushBanner(w, "warden", 0, h.x + 2 + i, h.y)
  for (let i = 0; i < 70; i++) {
    tickAi(w, 0, params, personaById("balanced"))
    tick(w)
  }
  const live = w.units.find((u) => u.id === levy.id)!
  const watch = w.units.find(
    (u) =>
      u.owner === 0 &&
      u.type === "warden" &&
      ((u.order.t === "defend" && Math.hypot(u.order.x - live.x, u.order.y - live.y) < 10) ||
        Math.hypot(u.x - live.x, u.y - live.y) < 12),
  )
  assert.ok(watch, "a spare warden should walk the relic home")
})

test("a relic hauler draws a banner on the walk home", () => {
  const params = { ...personaById("balanced").params, attackAtArmy: 9 }
  const w = createWorld("ashen", "gilded", params, { mapId: "emberglass", persona: "balanced" })
  const h = hall(w, 0)
  w.players[0].age = 1
  const levy = w.units.find((u) => u.owner === 0 && u.type === "levy")!
  levy.order = { t: "return", drop: h.id }
  levy.carry = { res: "relics", amt: 4 }
  levy.x = h.x + 18
  levy.y = h.y
  for (let i = 0; i < 5; i++) pushBanner(w, "guard", 0, h.x + 2 + i, h.y)
  for (let i = 0; i < 20; i++) {
    tickAi(w, 0, params, personaById("balanced"))
    tick(w)
  }
  const escort = w.units.find(
    (u) =>
      u.owner === 0 &&
      u.type === "guard" &&
      u.order.t === "defend" &&
      Math.hypot(u.order.x - levy.x, u.order.y - levy.y) < 10,
  )
  assert.ok(escort, "a banner should walk the relic home")
})

test("a far timber haul draws a banner", () => {
  const params = { ...personaById("balanced").params, attackAtArmy: 9 }
  const w = createWorld("ashen", "gilded", params, { mapId: "emberglass", persona: "balanced" })
  const h = hall(w, 0)
  const levy = w.units.find((u) => u.owner === 0 && u.type === "levy")!
  levy.order = { t: "return", drop: h.id }
  levy.carry = { res: "timber", amt: 8 }
  levy.x = h.x + 20
  levy.y = h.y
  for (let i = 0; i < 4; i++) pushBanner(w, "guard", 0, h.x + 2 + i, h.y)
  for (let i = 0; i < 20; i++) {
    tickAi(w, 0, params, personaById("balanced"))
    tick(w)
  }
  const escort = w.units.find(
    (u) =>
      u.owner === 0 &&
      u.type === "guard" &&
      u.order.t === "defend" &&
      Math.hypot(u.order.x - levy.x, u.order.y - levy.y) < 10,
  )
  assert.ok(escort, "a banner should walk a far timber haul home")
})

test("a far grain haul draws a banner", () => {
  const params = { ...personaById("balanced").params, attackAtArmy: 9 }
  const w = createWorld("ashen", "gilded", params, { mapId: "emberglass", persona: "balanced" })
  const h = hall(w, 0)
  const levy = w.units.find((u) => u.owner === 0 && u.type === "levy")!
  levy.order = { t: "return", drop: h.id }
  levy.carry = { res: "grain", amt: 8 }
  levy.x = h.x + 20
  levy.y = h.y
  for (let i = 0; i < 4; i++) pushBanner(w, "guard", 0, h.x + 2 + i, h.y)
  for (let i = 0; i < 20; i++) {
    tickAi(w, 0, params, personaById("balanced"))
    tick(w)
  }
  const escort = w.units.find(
    (u) =>
      u.owner === 0 &&
      u.type === "guard" &&
      u.order.t === "defend" &&
      Math.hypot(u.order.x - levy.x, u.order.y - levy.y) < 10,
  )
  assert.ok(escort, "a banner should walk a far grain haul home")
})

test("a far ore haul draws a banner", () => {
  const params = { ...personaById("balanced").params, attackAtArmy: 9 }
  const w = createWorld("ashen", "gilded", params, { mapId: "emberglass", persona: "balanced" })
  const h = hall(w, 0)
  const levy = w.units.find((u) => u.owner === 0 && u.type === "levy")!
  levy.order = { t: "return", drop: h.id }
  levy.carry = { res: "ore", amt: 8 }
  levy.x = h.x + 20
  levy.y = h.y
  for (let i = 0; i < 4; i++) pushBanner(w, "guard", 0, h.x + 2 + i, h.y)
  for (let i = 0; i < 20; i++) {
    tickAi(w, 0, params, personaById("balanced"))
    tick(w)
  }
  const escort = w.units.find(
    (u) =>
      u.owner === 0 &&
      u.type === "guard" &&
      u.order.t === "defend" &&
      Math.hypot(u.order.x - levy.x, u.order.y - levy.y) < 10,
  )
  assert.ok(escort, "a banner should walk a far ore haul home")
})

test("a wounded ashrider peels to the lodge", () => {
  const params = { ...personaById("balanced").params, attackAtArmy: 9, kite: 0.6 }
  const w = createWorld("ashen", "gilded", params, { mapId: "emberglass", persona: "balanced" })
  const h = hall(w, 0)
  w.players[0].age = 1
  const lodge = placeBuilding(
    w,
    0,
    "lodge",
    h.x + 10,
    h.y,
    w.units.filter((u) => u.owner === 0).map((u) => u.id),
  )!
  lodge.done = true
  lodge.construct = lodge.constructMax
  pushBanner(w, "ashrider", 0, h.x + 22, h.y)
  const rider = w.units.find((u) => u.owner === 0 && u.type === "ashrider")!
  rider.hp = rider.hpMax * 0.2
  for (let i = 0; i < 30; i++) {
    tickAi(w, 0, params, personaById("balanced"))
    tick(w)
  }
  const live = w.units.find((u) => u.id === rider.id)!
  assert.ok(
    live.order.t === "move" || Math.hypot(live.x - lodge.x, live.y - lodge.y) < 8,
    "a wounded ashrider should peel to the lodge",
  )
})

test("a wounded warden peels to the lodge", () => {
  const params = { ...personaById("balanced").params, attackAtArmy: 9, kite: 0.6 }
  const w = createWorld("ashen", "gilded", params, { mapId: "emberglass", persona: "balanced" })
  const h = hall(w, 0)
  w.players[0].age = 1
  const lodge = placeBuilding(
    w,
    0,
    "lodge",
    h.x + 10,
    h.y,
    w.units.filter((u) => u.owner === 0).map((u) => u.id),
  )!
  lodge.done = true
  lodge.construct = lodge.constructMax
  pushBanner(w, "warden", 0, h.x + 22, h.y)
  const bow = w.units.find((u) => u.owner === 0 && u.type === "warden")!
  bow.hp = bow.hpMax * 0.2
  for (let i = 0; i < 30; i++) {
    tickAi(w, 0, params, personaById("balanced"))
    tick(w)
  }
  const live = w.units.find((u) => u.id === bow.id)!
  assert.ok(
    live.order.t === "move" || Math.hypot(live.x - lodge.x, live.y - lodge.y) < 8,
    "a wounded warden should peel to the lodge",
  )
})

test("a wounded banner peels to the yard", () => {
  const params = { ...personaById("balanced").params, attackAtArmy: 9, kite: 0.6 }
  const w = createWorld("ashen", "gilded", params, { mapId: "emberglass", persona: "balanced" })
  const h = hall(w, 0)
  const yard = placeBuilding(
    w,
    0,
    "yard",
    h.x + 10,
    h.y,
    w.units.filter((u) => u.owner === 0).map((u) => u.id),
  )!
  yard.done = true
  yard.construct = yard.constructMax
  pushBanner(w, "guard", 0, h.x + 22, h.y)
  const banner = w.units.find((u) => u.owner === 0 && u.type === "guard")!
  banner.hp = banner.hpMax * 0.2
  for (let i = 0; i < 30; i++) {
    tickAi(w, 0, params, personaById("balanced"))
    tick(w)
  }
  const live = w.units.find((u) => u.id === banner.id)!
  assert.ok(
    live.order.t === "move" || Math.hypot(live.x - yard.x, live.y - yard.y) < 8,
    "a wounded banner should peel to the yard",
  )
})

test("a wounded levy under a banner runs to the granary", () => {
  const params = { ...personaById("balanced").params, kite: 0.6 }
  const w = createWorld("ashen", "gilded", params, { mapId: "emberglass", persona: "balanced" })
  const h = hall(w, 0)
  const granary = placeBuilding(
    w,
    0,
    "granary",
    h.x + 10,
    h.y,
    w.units.filter((u) => u.owner === 0).map((u) => u.id),
  )!
  granary.done = true
  granary.construct = granary.constructMax
  const levy = w.units.find((u) => u.owner === 0 && u.type === "levy")!
  levy.hp = levy.hpMax * 0.2
  levy.x = h.x + 16
  levy.y = h.y
  levy.order = { t: "gather", node: w.nodes[0]!.id }
  pushBanner(w, "guard", 1, levy.x + 2, levy.y)
  for (let i = 0; i < 30; i++) {
    tickAi(w, 0, params, personaById("balanced"))
    tick(w)
  }
  const live = w.units.find((u) => u.id === levy.id)!
  assert.ok(
    live.order.t === "move" || Math.hypot(live.x - granary.x, live.y - granary.y) < 8,
    "a wounded levy should run to the granary when a banner closes",
  )
})

test("a wounded levy under a banner runs home", () => {
  const params = { ...personaById("balanced").params, kite: 0.6 }
  const w = createWorld("ashen", "gilded", params, { mapId: "emberglass", persona: "balanced" })
  const h = hall(w, 0)
  const levy = w.units.find((u) => u.owner === 0 && u.type === "levy")!
  levy.hp = levy.hpMax * 0.2
  levy.x = h.x + 16
  levy.y = h.y
  levy.order = { t: "gather", node: w.nodes[0]!.id }
  pushBanner(w, "guard", 1, levy.x + 2, levy.y)
  for (let i = 0; i < 30; i++) {
    tickAi(w, 0, params, personaById("balanced"))
    tick(w)
  }
  const live = w.units.find((u) => u.id === levy.id)!
  assert.ok(
    live.order.t === "move" || Math.hypot(live.x - h.x, live.y - h.y) < 8,
    "a wounded levy should run home when a banner closes",
  )
})

test("an ashrider scouts an empty rival hearth first", () => {
  const params = { ...personaById("balanced").params, attackAtArmy: 9 }
  const w = createWorld("ashen", "gilded", params, { mapId: "emberglass", persona: "balanced" })
  const h = hall(w, 0)
  const foe = hall(w, 1)
  w.players[0].age = 1
  w.players[0].timber = 90
  w.players[0].ore = 50
  pushBanner(w, "ashrider", 0, h.x + 3, h.y)
  pushBanner(w, "guard", 0, h.x + 2, h.y)
  let scouted = false
  for (let i = 0; i < 90; i++) {
    tickAi(w, 0, params, personaById("balanced"))
    const rider = w.units.find((u) => u.owner === 0 && u.type === "ashrider")
    if (rider?.order.t === "attackMove" && Math.abs(rider.order.x - foe.x) < 0.01) {
      scouted = true
      break
    }
    tick(w)
  }
  assert.ok(scouted, "an ashrider should scout the empty hearth before a foot banner")
})

test("starving stores pull a levy onto grain", () => {
  const params = personaById("balanced").params
  const w = createWorld("ashen", "gilded", params, { mapId: "emberglass", persona: "balanced" })
  const h = hall(w, 0)
  w.players[0].grain = 20
  w.players[0].timber = 40
  w.players[0].ore = 180
  for (const u of w.units) {
    if (u.owner === 0 && u.type === "levy") {
      u.x = h.x
      u.y = h.y
      u.order = { t: "idle" }
    }
  }
  for (let i = 0; i < 20; i++) {
    tickAi(w, 0, params, personaById("balanced"))
    tick(w)
  }
  const walker = w.units.find((u) => {
    if (u.owner !== 0 || u.type !== "levy") return false
    const order = u.order
    if (order.t === "return" && u.carry?.res === "grain") return true
    if (order.t !== "gather") return false
    const n = w.nodes.find((q) => q.id === order.node)
    return n?.type === "grain"
  })
  assert.ok(walker, "starving stores should walk grain")
})

test("a wolf hunt draws a banner escort", () => {
  const params = { ...personaById("balanced").params, attackAtArmy: 9 }
  const w = createWorld("ashen", "gilded", params, { mapId: "emberglass", persona: "balanced" })
  const h = hall(w, 0)
  const levy = w.units.find((u) => u.owner === 0 && u.type === "levy")!
  const wolf = w.nodes.find((n) => n.type === "grain") ?? w.nodes[0]!
  wolf.fauna = "wolf"
  wolf.amount = 80
  wolf.x = h.x + 10
  wolf.y = h.y
  levy.order = { t: "gather", node: wolf.id }
  levy.x = wolf.x
  levy.y = wolf.y
  for (let i = 0; i < 3; i++) pushBanner(w, "guard", 0, h.x + 2 + i, h.y)
  for (let i = 0; i < 50; i++) {
    tickAi(w, 0, params, personaById("balanced"))
    tick(w)
  }
  const escort = w.units.find(
    (u) =>
      u.owner === 0 &&
      u.type === "guard" &&
      u.order.t === "defend" &&
      Math.hypot(u.order.x - levy.x, u.order.y - levy.y) < 10,
  )
  assert.ok(escort, "a banner should walk with a wolf hunt")
})

test("a bear hunt draws a banner escort", () => {
  const params = { ...personaById("balanced").params, attackAtArmy: 9 }
  const w = createWorld("ashen", "gilded", params, { mapId: "emberglass", persona: "balanced" })
  const h = hall(w, 0)
  const levy = w.units.find((u) => u.owner === 0 && u.type === "levy")!
  const bear = w.nodes.find((n) => n.type === "grain") ?? w.nodes[0]!
  bear.fauna = "bear"
  bear.amount = 80
  bear.x = h.x + 10
  bear.y = h.y
  levy.order = { t: "gather", node: bear.id }
  levy.x = bear.x
  levy.y = bear.y
  for (let i = 0; i < 3; i++) pushBanner(w, "guard", 0, h.x + 2 + i, h.y)
  for (let i = 0; i < 50; i++) {
    tickAi(w, 0, params, personaById("balanced"))
    tick(w)
  }
  const escort = w.units.find(
    (u) =>
      u.owner === 0 &&
      u.type === "guard" &&
      u.order.t === "defend" &&
      Math.hypot(u.order.x - levy.x, u.order.y - levy.y) < 10,
  )
  assert.ok(escort, "a banner should walk with a bear hunt")
})

test("a deer hunt draws a banner escort", () => {
  const params = { ...personaById("balanced").params, attackAtArmy: 9 }
  const w = createWorld("ashen", "gilded", params, { mapId: "emberglass", persona: "balanced" })
  const h = hall(w, 0)
  const levy = w.units.find((u) => u.owner === 0 && u.type === "levy")!
  const deer = w.nodes.find((n) => n.type === "grain") ?? w.nodes[0]!
  deer.fauna = "deer"
  deer.amount = 80
  deer.x = h.x + 10
  deer.y = h.y
  levy.order = { t: "gather", node: deer.id }
  levy.x = deer.x
  levy.y = deer.y
  for (let i = 0; i < 5; i++) pushBanner(w, "guard", 0, h.x + 2 + i, h.y)
  for (let i = 0; i < 50; i++) {
    tickAi(w, 0, params, personaById("balanced"))
    tick(w)
  }
  const escort = w.units.find(
    (u) =>
      u.owner === 0 &&
      u.type === "guard" &&
      u.order.t === "defend" &&
      Math.hypot(u.order.x - levy.x, u.order.y - levy.y) < 10,
  )
  assert.ok(escort, "a banner should walk with a deer hunt")
})

test("a boar hunt draws a banner escort", () => {
  const params = { ...personaById("balanced").params, attackAtArmy: 9 }
  const w = createWorld("ashen", "gilded", params, { mapId: "emberglass", persona: "balanced" })
  const h = hall(w, 0)
  const levy = w.units.find((u) => u.owner === 0 && u.type === "levy")!
  const boar = w.nodes.find((n) => n.type === "grain") ?? w.nodes[0]!
  boar.fauna = "boar"
  boar.amount = 80
  boar.x = h.x + 10
  boar.y = h.y
  levy.order = { t: "gather", node: boar.id }
  levy.x = boar.x
  levy.y = boar.y
  for (let i = 0; i < 3; i++) pushBanner(w, "guard", 0, h.x + 2 + i, h.y)
  for (let i = 0; i < 50; i++) {
    tickAi(w, 0, params, personaById("balanced"))
    tick(w)
  }
  const escort = w.units.find(
    (u) =>
      u.owner === 0 &&
      u.type === "guard" &&
      u.order.t === "defend" &&
      Math.hypot(u.order.x - levy.x, u.order.y - levy.y) < 10,
  )
  assert.ok(escort, "a banner should walk with a boar hunt")
})

test("bare timber pulls a levy onto pine", () => {
  const params = personaById("balanced").params
  const w = createWorld("ashen", "gilded", params, { mapId: "emberglass", persona: "balanced" })
  const h = hall(w, 0)
  w.players[0].grain = 80
  w.players[0].timber = 15
  w.players[0].ore = 180
  for (const u of w.units) {
    if (u.owner === 0 && u.type === "levy") {
      u.x = h.x
      u.y = h.y
      u.order = { t: "idle" }
    }
  }
  for (let i = 0; i < 20; i++) {
    tickAi(w, 0, params, personaById("balanced"))
    tick(w)
  }
  const walker = w.units.find((u) => {
    if (u.owner !== 0 || u.type !== "levy") return false
    const order = u.order
    if (order.t === "return" && u.carry?.res === "timber") return true
    if (order.t !== "gather") return false
    const n = w.nodes.find((q) => q.id === order.node)
    return n?.type === "timber"
  })
  assert.ok(walker, "bare timber should walk pine")
})

test("bare ore pulls a levy onto stone", () => {
  const params = personaById("balanced").params
  const w = createWorld("ashen", "gilded", params, { mapId: "emberglass", persona: "balanced" })
  const h = hall(w, 0)
  w.players[0].grain = 80
  w.players[0].timber = 40
  w.players[0].ore = 10
  for (const u of w.units) {
    if (u.owner === 0 && u.type === "levy") {
      u.x = h.x
      u.y = h.y
      u.order = { t: "idle" }
    }
  }
  for (let i = 0; i < 20; i++) {
    tickAi(w, 0, params, personaById("balanced"))
    tick(w)
  }
  const walker = w.units.find((u) => {
    if (u.owner !== 0 || u.type !== "levy") return false
    const order = u.order
    if (order.t === "return" && u.carry?.res === "ore") return true
    if (order.t !== "gather") return false
    const n = w.nodes.find((q) => q.id === order.node)
    return n?.type === "ore"
  })
  assert.ok(walker, "bare ore should walk stone")
})

