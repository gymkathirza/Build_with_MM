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
import { COSTS } from "./catalog"
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

