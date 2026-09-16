import assert from "node:assert/strict"
import { test } from "node:test"
import { createWorld, popUsed } from "./engine"
import { tickAi } from "./ai"
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
  for (const axis of ["sw-ne", "se-nw"] as const) {
    const h = hallPositions(spec, axis)
    const c = spec.size / 2
    const d0 = Math.hypot(h.p0.x - c, h.p0.y - c)
    const d1 = Math.hypot(h.p1.x - c, h.p1.y - c)
    assert.ok(Math.abs(d0 - d1) < 0.01, `${axis} travel ${d0} vs ${d1}`)
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
