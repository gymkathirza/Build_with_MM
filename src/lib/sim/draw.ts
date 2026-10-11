import { AGE_NAMES, BUILDING_LABEL, BUILDING_STATS } from "../sim/catalog"
import { blit, getMoss, SPR } from "../sim/atlas"
import type { Building, Node, Unit, World } from "../sim/engine"
import { factionById } from "../game-data"
import type { DrawQuality } from "../ml/score"

export type Cam = { x: number; y: number; z: number; w: number; h: number }

export function worldToScreen(cam: Cam, x: number, y: number) {
  return {
    sx: (x - cam.x) * cam.z + cam.w / 2,
    sy: (y - cam.y) * cam.z + cam.h * 0.42,
  }
}

export function screenToWorld(cam: Cam, sx: number, sy: number) {
  return {
    x: (sx - cam.w / 2) / cam.z + cam.x,
    y: (sy - cam.h * 0.42) / cam.z + cam.y,
  }
}

function team(world: World, owner: 0 | 1) {
  return factionById(world.players[owner].faction).color
}

function accent(world: World, owner: 0 | 1) {
  return factionById(world.players[owner].faction).accent
}

function culled(sx: number, sy: number, pad: number, w: number, h: number) {
  return sx < -pad || sy < -pad || sx > w + pad || sy > h + pad
}

function hash(x: number, y: number) {
  return (Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263)) >>> 0
}

export function plateGround(mapId: string) {
  if (mapId === "nightgrove") return "#243526"
  if (mapId === "sunvault") return "#5a6a3a"
  if (mapId === "emberglass") return "#4a3a28"
  if (mapId === "shattercoast") return "#3a4a42"
  if (mapId === "hollowmere") return "#2e4a3a"
  return "#3d5a32"
}

function lakePalette(mapId: string) {
  if (mapId === "nightgrove") return { a: "#3a6a72", b: "#1a3a42", c: "#102830", d: "#0c1c22" }
  if (mapId === "emberglass") return { a: "#6a8a84", b: "#3a5a50", c: "#2a3a30", d: "#1c2820" }
  if (mapId === "shattercoast") return { a: "#7ab8c4", b: "#2d7a88", c: "#1e5a64", d: "#16444c" }
  if (mapId === "sunvault") return { a: "#8ac4b0", b: "#3a8a78", c: "#246454", d: "#184838" }
  if (mapId === "hollowmere") return { a: "#5a9aa4", b: "#245860", c: "#163840", d: "#102830" }
  return { a: "#6aa8b4", b: "#2d6a78", c: "#1e4a54", d: "#16343c" }
}

function drawTerrain(
  ctx: CanvasRenderingContext2D,
  cam: Cam,
  w: number,
  h: number,
  quality: DrawQuality,
  world: World,
) {
  const size = world.size
  ctx.fillStyle = plateGround(world.mapId)
  ctx.fillRect(0, 0, w, h)
  const c0 = worldToScreen(cam, 0, 0)
  const c1 = worldToScreen(cam, size, size)
  const left = Math.min(c0.sx, c1.sx)
  const top = Math.min(c0.sy, c1.sy)
  const tw = Math.abs(c1.sx - c0.sx)
  const th = Math.abs(c1.sy - c0.sy)
  const pat = (() => {
    try {
      return ctx.createPattern(getMoss() as CanvasImageSource, "repeat")
    } catch {
      return null
    }
  })()
  if (pat) {
    ctx.save()
    ctx.translate(left, top)
    ctx.fillStyle = pat
    ctx.fillRect(0, 0, tw, th)
    ctx.restore()
  } else {
    ctx.fillStyle = "#2c4328"
    ctx.fillRect(left, top, tw, th)
  }

  const lake = worldToScreen(cam, size / 2, size / 2)
  const lakeR = Math.max(6, size * 0.045)
  const lrx = lakeR * cam.z
  const lry = lakeR * 0.55 * cam.z
  ctx.fillStyle = "rgba(196,154,90,0.5)"
  ctx.beginPath()
  ctx.ellipse(lake.sx, lake.sy, lrx * 1.22, lry * 1.32, 0.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = "rgba(168,128,72,0.38)"
  ctx.beginPath()
  ctx.ellipse(lake.sx + lrx * 0.08, lake.sy + lry * 0.12, lrx * 1.08, lry * 1.1, 0.18, 0, Math.PI * 2)
  ctx.fill()
  const water = ctx.createRadialGradient(lake.sx - lrx * 0.12, lake.sy - lry * 0.18, 2, lake.sx, lake.sy, lrx)
  const lakeTint = lakePalette(world.mapId)
  water.addColorStop(0, lakeTint.a)
  water.addColorStop(0.35, lakeTint.b)
  water.addColorStop(0.72, lakeTint.c)
  water.addColorStop(1, lakeTint.d)
  ctx.fillStyle = water
  ctx.beginPath()
  ctx.ellipse(lake.sx, lake.sy, lrx, lry, 0.2, 0, Math.PI * 2)
  ctx.fill()
  if (quality > 0) {
    ctx.strokeStyle = "rgba(180,220,210,0.22)"
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.strokeStyle = "rgba(220,240,235,0.16)"
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.ellipse(lake.sx, lake.sy, lrx * 0.72, lry * 0.72, 0.2, 0, Math.PI * 2)
    ctx.stroke()
    const t = performance.now()
    ctx.strokeStyle = `rgba(210,235,230,${0.08 + 0.08 * Math.sin(t / 700)})`
    ctx.beginPath()
    ctx.ellipse(lake.sx - 6, lake.sy - 4, lrx * 0.38, lry * 0.22, 0.15, 0, Math.PI * 2)
    ctx.stroke()
    ctx.strokeStyle = `rgba(180,220,210,${0.06 + 0.07 * Math.sin(t / 1100 + 1.2)})`
    ctx.beginPath()
    ctx.ellipse(lake.sx + 8, lake.sy + 3, lrx * 0.52, lry * 0.28, -0.2, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = `rgba(230,250,245,${0.08 + 0.06 * Math.sin(t / 520)})`
    ctx.beginPath()
    ctx.ellipse(lake.sx - lrx * 0.22, lake.sy - lry * 0.28, lrx * 0.18, lry * 0.1, 0.4, 0, Math.PI * 2)
    ctx.fill()
    if ((world.mapId === "hollowmere" || world.mapId === "vast-mere") && quality > 1) {
      for (let i = 0; i < 5; i++) {
        const a = t / 1600 + i * 1.1
        ctx.fillStyle = "rgba(40,90,50,0.45)"
        ctx.beginPath()
        ctx.ellipse(
          lake.sx + Math.cos(a) * lrx * 0.45,
          lake.sy + Math.sin(a * 0.8) * lry * 0.4,
          5,
          2.4,
          0.2,
          0,
          Math.PI * 2,
        )
        ctx.fill()
      }
    }
    if (world.mapId === "hollowmere" && quality > 1) {
      for (let i = 0; i < 4; i++) {
        const ring = (t / 16 + i * 9) % 22
        ctx.strokeStyle = `rgba(180,220,210,${0.16 - ring * 0.006})`
        ctx.lineWidth = 1.1
        ctx.beginPath()
        ctx.ellipse(
          lake.sx + Math.cos(i * 1.7) * lrx * 0.35,
          lake.sy + Math.sin(i) * lry * 0.3,
          3 + ring * 0.35,
          1.6 + ring * 0.18,
          0.2,
          0,
          Math.PI * 2,
        )
        ctx.stroke()
      }
    }
    if (world.mapId === "vast-mere" && quality > 1) {
      for (let i = 0; i < 8; i++) {
        const a = i * 0.72 + 0.35
        const rx = lake.sx + Math.cos(a) * lrx * 1.06
        const ry = lake.sy + Math.sin(a) * lry * 1.14
        const sway = Math.sin(t / 420 + i) * 2.2
        ctx.strokeStyle = "rgba(46,82,38,0.48)"
        ctx.lineWidth = 1.35
        ctx.beginPath()
        ctx.moveTo(rx, ry)
        ctx.quadraticCurveTo(rx + sway, ry - 7, rx + sway * 0.35, ry - 15)
        ctx.stroke()
      }
      for (let i = 0; i < 4; i++) {
        const a = t / 2400 + i * 1.4
        ctx.fillStyle = `rgba(210,230,220,${0.05 + 0.04 * Math.sin(t / 900 + i)})`
        ctx.beginPath()
        ctx.ellipse(
          lake.sx + Math.cos(a) * lrx * 1.4,
          lake.sy + Math.sin(a * 0.6) * lry * 1.6,
          18,
          7,
          0.15,
          0,
          Math.PI * 2,
        )
        ctx.fill()
      }
    }
    if (quality > 1) {
      for (let i = 0; i < 6; i++) {
        const foam = 0.07 + 0.08 * Math.sin(t / 380 + i)
        ctx.strokeStyle = `rgba(230,245,245,${world.mapId === "shattercoast" ? foam + 0.04 : foam})`
        ctx.lineWidth = 1.15
        ctx.beginPath()
        ctx.ellipse(
          lake.sx + Math.cos(t / 1400 + i) * lrx * 0.22,
          lake.sy + lry * (0.28 + 0.08 * Math.sin(t / 900 + i)),
          lrx * (0.14 + (i % 3) * 0.03),
          lry * 0.07,
          0.15,
          0,
          Math.PI * 2,
        )
        ctx.stroke()
      }
    }
    if (world.mapId === "shattercoast" && quality > 1) {
      for (let i = 0; i < 7; i++) {
        const spray = (t / 50 + i * 9) % 18
        ctx.fillStyle = `rgba(230,245,250,${0.18 - spray * 0.008})`
        ctx.beginPath()
        ctx.arc(lake.sx + Math.cos(i * 0.9) * lrx * 0.92, lake.sy + lry * 0.72 - spray, 1.5, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    if (quality > 1) {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2
        const palm = worldToScreen(
          cam,
          size / 2 + Math.cos(a) * lakeR * 1.55,
          size / 2 + Math.sin(a) * lakeR * 0.95,
        )
        blit(ctx, SPR.palm, palm.sx - 16, palm.sy - 28, 32, 32)
      }
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + 0.4
        const reed = worldToScreen(
          cam,
          size / 2 + Math.cos(a) * lakeR * 1.28,
          size / 2 + Math.sin(a) * lakeR * 0.78,
        )
        blit(ctx, SPR.reed, reed.sx - 10, reed.sy - 18, 20, 20)
      }
      for (let i = 0; i < 4; i++) {
        const a = t / 1800 + i * 2.1
        const bird = worldToScreen(
          cam,
          size / 2 + Math.cos(a) * lakeR * 1.35,
          size / 2 + Math.sin(a * 0.7) * lakeR * 0.45 - 4,
        )
        ctx.strokeStyle = `rgba(30,24,18,${0.35 + 0.2 * Math.sin(t / 400 + i)})`
        ctx.lineWidth = 1.2
        ctx.beginPath()
        ctx.moveTo(bird.sx - 5, bird.sy)
        ctx.quadraticCurveTo(bird.sx, bird.sy - 4 - Math.sin(t / 180 + i) * 2.4, bird.sx + 5, bird.sy)
        ctx.stroke()
      }
    }
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + 0.3
      const sway = Math.sin(t / 420 + i) * 2.4
      const rp = worldToScreen(cam, size / 2 + Math.cos(a) * lakeR * 1.15, size / 2 + Math.sin(a) * lakeR * 0.7)
      ctx.strokeStyle = `rgba(40,90,40,${0.45 + 0.2 * Math.sin(t / 380 + i)})`
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(rp.sx, rp.sy)
      ctx.quadraticCurveTo(rp.sx + sway * 0.4, rp.sy - 5, rp.sx + Math.cos(a) * 5 + sway, rp.sy - 11)
      ctx.stroke()
    }
  }

  if (quality > 1 && world.mapId === "nightgrove") {
    for (let i = 0; i < 8; i++) {
      const hx = ((hash(i * 53, 19) % 1000) / 1000) * size
      const hy = ((hash(i * 37, 29) % 1000) / 1000) * size
      const hp = worldToScreen(cam, hx, hy)
      ctx.fillStyle = `rgba(160,200,210,${0.04 + 0.04 * Math.sin(performance.now() / 900 + i)})`
      ctx.beginPath()
      ctx.ellipse(hp.sx, hp.sy, 22 * cam.z * 0.2, 10 * cam.z * 0.2, 0.2, 0, Math.PI * 2)
      ctx.fill()
    }
    const t = performance.now()
    for (let i = 0; i < 10; i++) {
      const a = t / 1400 + i * 0.7
      const fx = ((hash(i * 17, 71) % 1000) / 1000) * size
      const fy = ((hash(i * 31, 43) % 1000) / 1000) * size
      const fp = worldToScreen(cam, fx + Math.cos(a) * 3, fy + Math.sin(a * 1.3) * 2)
      ctx.fillStyle = `rgba(190,255,170,${0.16 + 0.2 * Math.sin(t / 280 + i)})`
      ctx.beginPath()
      ctx.arc(fp.sx, fp.sy, 1.6, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  if (quality > 1 && world.mapId === "sunvault") {
    for (let i = 0; i < 10; i++) {
      const hx = ((hash(i * 11, 61) % 1000) / 1000) * size
      const hy = ((hash(i * 43, 13) % 1000) / 1000) * size
      const hp = worldToScreen(cam, hx, hy)
      ctx.fillStyle = `rgba(255,220,120,${0.06 + 0.06 * Math.sin(performance.now() / 700 + i)})`
      ctx.beginPath()
      ctx.arc(hp.sx, hp.sy, 1.6, 0, Math.PI * 2)
      ctx.fill()
    }
    const t = performance.now()
    for (let i = 0; i < 6; i++) {
      const drift = (t / 40 + i * 11) % 28
      const sx = ((hash(i * 19, 5) % 1000) / 1000) * size
      const sy = ((hash(i * 7, 23) % 1000) / 1000) * size
      const p = worldToScreen(cam, sx, sy)
      ctx.fillStyle = `rgba(255,236,180,${0.16 - drift * 0.004})`
      ctx.beginPath()
      ctx.ellipse(p.sx + drift * 0.4, p.sy - drift * 0.6, 2.2, 1.1, 0.4, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  if (quality > 0 && world.mapId === "emberglass") {
    for (let i = 0; i < 7; i++) {
      const hx = ((hash(i * 41, 7) % 1000) / 1000) * size
      const hy = ((hash(i * 23, 11) % 1000) / 1000) * size
      if (Math.hypot(hx - size / 2, hy - size / 2) < lakeR * 2) continue
      const a = worldToScreen(cam, hx, hy)
      const b = worldToScreen(cam, hx + 8 + (i % 3) * 4, hy + 3)
      ctx.strokeStyle = `rgba(180,70,30,${0.18 + 0.1 * Math.sin(performance.now() / 400 + i)})`
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(a.sx, a.sy)
      ctx.lineTo(b.sx, b.sy)
      ctx.stroke()
      if (quality > 1) {
        const wobble = Math.sin(performance.now() / 180 + i) * 3
        ctx.strokeStyle = `rgba(255,140,60,${0.12 + 0.1 * Math.sin(performance.now() / 260 + i)})`
        ctx.beginPath()
        ctx.moveTo(a.sx + 2, a.sy - 4)
        ctx.quadraticCurveTo((a.sx + b.sx) / 2 + wobble, (a.sy + b.sy) / 2 - 8, b.sx, b.sy - 6)
        ctx.stroke()
        ctx.strokeStyle = `rgba(180,70,30,${0.18 + 0.1 * Math.sin(performance.now() / 400 + i)})`
      }
    }
  }
  if (quality > 0) {
    for (let i = 0; i < 16; i++) {
      const hx = ((hash(i * 19, 41) % 1000) / 1000) * size
      const hy = ((hash(i * 29, 17) % 1000) / 1000) * size
      if (Math.hypot(hx - size / 2, hy - size / 2) < lakeR * 2.4) continue
      const hp = worldToScreen(cam, hx, hy)
      ctx.fillStyle = i % 3 === 0 ? "rgba(62,52,32,0.32)" : "rgba(28,46,22,0.24)"
      ctx.beginPath()
      ctx.ellipse(hp.sx, hp.sy, (30 + (i % 4) * 5) * cam.z * 0.24, (12 + (i % 3) * 2) * cam.z * 0.24, 0.18, 0, Math.PI * 2)
      ctx.fill()
      if (quality > 1 && i % 4 === 0) {
        blit(ctx, SPR.cliff, hp.sx - 18, hp.sy - 28, 36, 32)
      }
    }
    const halls = world.buildings.filter((b) => b.type === "hearth" && b.done)
    if (halls.length >= 2) {
      const a = worldToScreen(cam, halls[0].x, halls[0].y)
      const b = worldToScreen(cam, halls[1].x, halls[1].y)
      ctx.strokeStyle = "rgba(90,70,40,0.22)"
      ctx.lineWidth = Math.max(3, cam.z * 0.35)
      ctx.beginPath()
      ctx.moveTo(a.sx, a.sy)
      ctx.quadraticCurveTo(lake.sx, lake.sy + lry * 0.8, b.sx, b.sy)
      ctx.stroke()
    }
  }

  if (quality > 0) {
    const cell = 20
    const wx0 = cam.x - cam.w / (2 * cam.z) - cell
    const wy0 = cam.y - cam.h / (2 * cam.z) - cell
    const wx1 = cam.x + cam.w / (2 * cam.z) + cell
    const wy1 = cam.y + cam.h / (2 * cam.z) + cell
    const x0 = Math.max(0, Math.floor(wx0 / cell) * cell)
    const y0 = Math.max(0, Math.floor(wy0 / cell) * cell)
    const x1 = Math.min(size, Math.ceil(wx1 / cell) * cell)
    const y1 = Math.min(size, Math.ceil(wy1 / cell) * cell)
    const deco = Math.max(14, cam.z * 1.1)
    for (let gy = y0; gy < y1; gy += cell) {
      for (let gx = x0; gx < x1; gx += cell) {
        const hsh = hash(gx, gy)
        if (hsh % 9 > 1) continue
        const p = worldToScreen(cam, gx + (hsh % 5), gy + ((hsh >> 3) % 5))
        if (culled(p.sx, p.sy, deco, w, h)) continue
        const plate = world.mapId
        const spr =
          plate === "nightgrove" && hsh % 7 === 0
            ? SPR.fern
            : plate === "sunvault" && hsh % 7 === 0
              ? SPR.flower
              : plate === "emberglass" && hsh % 7 === 0
                ? SPR.rock
                : plate === "shattercoast" && hsh % 7 === 0
                  ? SPR.reed
                  : plate === "hollowmere" && hsh % 7 === 0
                    ? SPR.fern
                    : hsh % 9 === 0
                      ? SPR.grass
                      : hsh % 11 === 0
                        ? SPR.flower
                        : hsh % 13 === 0
                          ? SPR.fern
                          : SPR.rock
        blit(ctx, spr, p.sx - deco / 2, p.sy - deco * 0.65, deco, deco)
      }
    }
  }
}

function nodeSpr(n: Node) {
  if (n.fauna === "deer") return SPR.deer
  if (n.fauna === "boar") return SPR.boar
  if (n.fauna === "bear") return SPR.bear
  if (n.fauna === "wolf") return SPR.wolf
  if (n.type === "grain") return SPR.grain
  if (n.type === "timber") return n.id & 1 ? SPR.pine : SPR.timber
  if (n.type === "ore") return n.id & 1 ? SPR.oreGold : SPR.ore
  return SPR.relic
}

export function nodeLabel(n: Node) {
  if (n.fauna === "deer") return "Deer"
  if (n.fauna === "boar") return "Boar"
  if (n.fauna === "bear") return "Bear"
  if (n.fauna === "wolf") return "Wolf"
  if (n.type === "timber") return "Pine"
  if (n.type === "ore") return "Ore"
  if (n.type === "grain") return "Grain"
  return "Relic"
}

function drawNode(ctx: CanvasRenderingContext2D, n: Node, cam: Cam, quality: DrawQuality, w: number, h: number) {
  const p = worldToScreen(cam, n.x, n.y)
  const s = Math.max(n.fauna ? 40 : 34, cam.z * (n.fauna ? 2.8 : 2.35))
  if (culled(p.sx, p.sy, s, w, h)) return
  const now = performance.now()
  const bob = n.fauna && quality > 0 ? Math.sin(n.id + now / 320) * 2.1 : 0
  const wander = n.fauna && quality > 1 ? Math.sin(n.id * 1.7 + now / 900) * 2.4 : 0
  if (n.fauna && wander < -0.4) {
    ctx.save()
    ctx.translate(p.sx + wander, 0)
    ctx.scale(-1, 1)
    blit(ctx, nodeSpr(n), -s / 2, p.sy - s * 0.72 + bob, s, s)
    ctx.restore()
  } else {
    const grainSway = !n.fauna && n.type === "grain" && quality > 1 ? Math.sin(now / 380 + n.id) * 1.8 : 0
    blit(ctx, nodeSpr(n), p.sx - s / 2 + wander + grainSway, p.sy - s * 0.72 + bob, s, s)
    if (quality > 1 && !n.fauna && n.type === "grain") {
      ctx.strokeStyle = `rgba(180,150,50,${0.28 + 0.12 * Math.sin(now / 320 + n.id)})`
      ctx.lineWidth = 1.2
      for (let i = 0; i < 3; i++) {
        ctx.beginPath()
        ctx.moveTo(p.sx - 4 + i * 4, p.sy + 2)
        ctx.quadraticCurveTo(p.sx - 3 + i * 4 + grainSway, p.sy - 6, p.sx - 2 + i * 4 + grainSway, p.sy - 12)
        ctx.stroke()
      }
    }
    if (quality > 1 && n.type === "timber") {
      const needle = (now / 80 + n.id * 3) % 16
      ctx.strokeStyle = `rgba(40,70,30,${0.28 - needle * 0.012})`
      ctx.lineWidth = 1.1
      ctx.beginPath()
      ctx.moveTo(p.sx + 6, p.sy - s * 0.4)
      ctx.lineTo(p.sx + 8, p.sy - s * 0.4 + needle)
      ctx.stroke()
    }
  }
  if (quality > 1 && n.type === "relics") {
    const gleam = 0.18 + 0.22 * Math.sin(now / 240 + n.id)
    ctx.strokeStyle = `rgba(255,246,212,${gleam})`
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.arc(p.sx + wander, p.sy - s * 0.2 + bob, s * 0.28, 0, Math.PI * 2)
    ctx.stroke()
  }
  if (quality > 1 && n.fauna) {
    const eye = 0.35 + 0.35 * Math.sin(now / 180 + n.id)
    ctx.fillStyle =
      n.fauna === "wolf" || n.fauna === "bear" ? `rgba(255,210,90,${eye})` : `rgba(255,246,212,${eye * 0.7})`
    ctx.beginPath()
    ctx.arc(p.sx + wander - 3, p.sy - s * 0.28 + bob, 1.5, 0, Math.PI * 2)
    ctx.arc(p.sx + wander + 3, p.sy - s * 0.28 + bob, 1.5, 0, Math.PI * 2)
    ctx.fill()
  }
  if (quality > 0) {
    ctx.fillStyle = "rgba(20,12,8,0.82)"
    ctx.font = `${Math.max(11, Math.min(15, cam.z * 0.7))}px sans-serif`
    ctx.textAlign = "center"
    ctx.fillText(nodeLabel(n), p.sx, p.sy + s * 0.42)
  }
}

function hpBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, ratio: number) {
  ctx.fillStyle = "rgba(0,0,0,0.55)"
  ctx.fillRect(x, y, w, 3)
  ctx.fillStyle = ratio > 0.45 ? "#7dca6a" : "#d45c3a"
  ctx.fillRect(x, y, w * Math.max(0, ratio), 3)
}

function buildingSpr(type: Building["type"]) {
  if (type === "hearth") return SPR.hearth
  if (type === "yard") return SPR.yard
  if (type === "lodge") return SPR.lodge
  if (type === "camp") return SPR.camp
  if (type === "pit") return SPR.pit
  return SPR.granary
}

function drawBuilding(
  ctx: CanvasRenderingContext2D,
  b: Building,
  cam: Cam,
  color: string,
  trim: string,
  selected: boolean,
  quality: DrawQuality,
  age: number,
  now: number,
  w: number,
  h: number,
  pressed: boolean,
) {
  const p = worldToScreen(cam, b.x, b.y)
  const r = BUILDING_STATS[b.type].radius * cam.z
  const s = Math.max(52, r * 2.05)
  if (culled(p.sx, p.sy, s, w, h)) return
  if (!b.done) ctx.globalAlpha = 0.58
  ctx.fillStyle = "rgba(18,12,8,0.28)"
  ctx.beginPath()
  ctx.ellipse(p.sx, p.sy + s * 0.08, s * 0.38, s * 0.12, 0, 0, Math.PI * 2)
  ctx.fill()
  blit(ctx, buildingSpr(b.type), p.sx - s / 2, p.sy - s * 0.78, s, s)
  ctx.globalAlpha = 1
  if (!b.done && quality > 0) {
    ctx.strokeStyle = "rgba(196,154,90,0.55)"
    ctx.lineWidth = 1.5
    ctx.strokeRect(p.sx - r * 0.7, p.sy - r * 0.9, r * 1.4, r * 1.3)
    ctx.beginPath()
    ctx.moveTo(p.sx - r * 0.7, p.sy - r * 0.9)
    ctx.lineTo(p.sx, p.sy - r * 1.25)
    ctx.lineTo(p.sx + r * 0.7, p.sy - r * 0.9)
    ctx.stroke()
    ctx.strokeStyle = "rgba(196,154,90,0.35)"
    ctx.beginPath()
    ctx.moveTo(p.sx - r * 0.55, p.sy - r * 0.2)
    ctx.lineTo(p.sx + r * 0.55, p.sy - r * 0.2)
    ctx.moveTo(p.sx, p.sy - r * 0.9)
    ctx.lineTo(p.sx, p.sy + r * 0.2)
    ctx.stroke()
    if (quality > 1) {
      const dust = (now / 16 + b.id * 11) % 20
      ctx.fillStyle = `rgba(196,154,90,${0.22 - dust * 0.008})`
      ctx.beginPath()
      ctx.ellipse(p.sx + 6, p.sy - r * 0.4 - dust * 0.4, 3 + dust * 0.08, 1.6, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  if (quality > 0 && b.done && (b.type === "hearth" || b.type === "camp" || b.type === "pit")) {
    const rise = (now / 18 + b.id * 13) % 28
    ctx.fillStyle = `rgba(220,210,200,${0.18 + (b.type === "pit" ? 0.12 : 0)})`
    ctx.beginPath()
    ctx.ellipse(p.sx + s * 0.08, p.sy - s * 0.72 - rise, 5 + rise * 0.08, 3.2 + rise * 0.05, 0, 0, Math.PI * 2)
    ctx.fill()
    if (b.type === "hearth" && quality > 1) {
      const glow = 0.22 + 0.18 * Math.sin(now / 140 + b.id)
      ctx.fillStyle = `rgba(255,170,70,${glow})`
      ctx.beginPath()
      ctx.ellipse(p.sx - s * 0.16, p.sy - s * 0.22, 7, 5, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  if (quality > 1 && b.done && b.type === "lodge") {
    const glow = 0.2 + 0.18 * Math.sin(now / 160 + b.id)
    ctx.fillStyle = `rgba(255,190,90,${glow})`
    ctx.beginPath()
    ctx.arc(p.sx + s * 0.18, p.sy - s * 0.42, 4, 0, Math.PI * 2)
    ctx.fill()
    const flap = Math.sin(now / 260 + b.id) * 3
    ctx.fillStyle = "#8a4e2a"
    ctx.beginPath()
    ctx.moveTo(p.sx - s * 0.22, p.sy - s * 0.18)
    ctx.lineTo(p.sx - s * 0.08 + flap, p.sy - s * 0.06)
    ctx.lineTo(p.sx - s * 0.22, p.sy + s * 0.02)
    ctx.closePath()
    ctx.fill()
    for (let i = 0; i < 3; i++) {
      const bead = Math.sin(now / 180 + b.id + i) * 2
      ctx.fillStyle = i === 1 ? trim : "#d4b85a"
      ctx.beginPath()
      ctx.arc(p.sx - s * 0.12 + i * 4, p.sy - s * 0.08 + bead, 1.8, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  if (quality > 1 && b.done && b.type === "granary") {
    const bob = Math.sin(now / 280 + b.id) * 2
    ctx.fillStyle = "#d4b85a"
    ctx.beginPath()
    ctx.ellipse(p.sx - s * 0.16, p.sy - s * 0.08 + bob, 5, 4, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = "rgba(30,24,18,0.4)"
    ctx.lineWidth = 1.1
    for (let i = 0; i < 2; i++) {
      const a = now / 900 + b.id + i * 2
      const bx = p.sx + Math.cos(a) * s * 0.28
      const by = p.sy - s * 0.42 + Math.sin(a * 0.7) * 6
      ctx.beginPath()
      ctx.moveTo(bx - 4, by)
      ctx.quadraticCurveTo(bx, by - 3, bx + 4, by)
      ctx.stroke()
    }
  }
  if (quality > 1 && b.done && b.type === "camp") {
    const flicker = 0.28 + 0.22 * Math.sin(now / 90 + b.id)
    ctx.fillStyle = `rgba(255,140,50,${flicker})`
    ctx.beginPath()
    ctx.ellipse(p.sx - s * 0.06, p.sy - s * 0.12, 4, 5, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = "rgba(90,60,30,0.45)"
    ctx.lineWidth = 1.4
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + now / 4000
      ctx.beginPath()
      ctx.moveTo(p.sx + Math.cos(a) * s * 0.22, p.sy + Math.sin(a) * s * 0.1)
      ctx.lineTo(p.sx + Math.cos(a) * s * 0.3, p.sy + Math.sin(a) * s * 0.14 - 6)
      ctx.stroke()
    }
    const spark = (now / 70 + b.id) % 14
    ctx.fillStyle = `rgba(255,180,70,${0.28 - spark * 0.015})`
    ctx.beginPath()
    ctx.arc(p.sx + 3, p.sy - s * 0.2 - spark * 0.7, 1.6, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = "rgba(90,70,40,0.28)"
    ctx.lineWidth = 1.1
    ctx.setLineDash([3, 4])
    ctx.beginPath()
    ctx.ellipse(p.sx, p.sy + s * 0.02, s * 0.34, s * 0.16, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])
  }
  if (quality > 1 && b.done && b.type === "pit") {
    const ember = 0.2 + 0.2 * Math.sin(now / 110 + b.id)
    ctx.fillStyle = `rgba(255,90,40,${ember})`
    ctx.beginPath()
    ctx.ellipse(p.sx, p.sy - s * 0.08, 5, 3.2, 0, 0, Math.PI * 2)
    ctx.fill()
    const slag = (now / 90 + b.id * 5) % 16
    ctx.fillStyle = `rgba(80,70,60,${0.2 - slag * 0.008})`
    ctx.beginPath()
    ctx.arc(p.sx - 4, p.sy - s * 0.16 - slag * 0.5, 2, 0, Math.PI * 2)
    ctx.fill()
  }
  if (quality > 1 && b.done && b.type === "yard") {
    const flap = Math.sin(now / 220 + b.id) * 3
    ctx.fillStyle = trim
    ctx.beginPath()
    ctx.moveTo(p.sx + s * 0.28, p.sy - s * 0.58)
    ctx.lineTo(p.sx + s * 0.42 + flap, p.sy - s * 0.5)
    ctx.lineTo(p.sx + s * 0.28, p.sy - s * 0.42)
    ctx.closePath()
    ctx.fill()
    if (b.queue.length) {
      const spark = 0.25 + 0.25 * Math.sin(now / 90 + b.id)
      ctx.fillStyle = `rgba(255,200,90,${spark})`
      ctx.beginPath()
      ctx.arc(p.sx - s * 0.1, p.sy - s * 0.18, 3.2, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(p.sx + s * 0.18, p.sy - s * 0.62)
  ctx.lineTo(p.sx + s * 0.18, p.sy - s * 0.38)
  ctx.lineTo(p.sx + s * 0.34, p.sy - s * 0.46)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = trim
  ctx.fillRect(p.sx + s * 0.16, p.sy - s * 0.62, 3, s * 0.26)
  if (b.type === "hearth" && quality > 0) {
    const wounded = b.hp < b.hpMax * 0.82
    const pulse = b.aging > 0 ? 0.4 + 0.4 * Math.sin(now / 180) : wounded ? 0.28 + 0.22 * Math.sin(now / 160) : 0.16 + 0.08 * Math.sin(now / 420)
    ctx.strokeStyle = wounded ? `rgba(212,92,58,${pulse})` : `rgba(243,212,138,${pulse})`
    ctx.lineWidth = b.aging > 0 || wounded ? 3 : 1.5
    ctx.beginPath()
    ctx.arc(p.sx, p.sy, r * (b.aging > 0 ? 1.05 : wounded ? 1.0 : 0.92), 0, Math.PI * 2)
    ctx.stroke()
    if (b.aging > 0 && quality > 1) {
      for (let i = 0; i < 5; i++) {
        const a = now / 400 + b.id + i * 1.2
        const lift = ((now / 12 + i * 7) % 22)
        ctx.fillStyle = `rgba(255,220,140,${0.28 - lift * 0.01})`
        ctx.beginPath()
        ctx.arc(p.sx + Math.cos(a) * r * 0.55, p.sy - lift, 2, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    if (age >= 1) {
      ctx.strokeStyle = "rgba(180,150,90,0.45)"
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(p.sx, p.sy + 2, r * 0.78, 0.2, Math.PI - 0.2)
      ctx.stroke()
      ctx.fillStyle = trim
      ctx.fillRect(p.sx - s * 0.28, p.sy - s * 0.72, 3, s * 0.22)
      ctx.beginPath()
      ctx.moveTo(p.sx - s * 0.28, p.sy - s * 0.72)
      ctx.lineTo(p.sx - s * 0.12, p.sy - s * 0.62)
      ctx.lineTo(p.sx - s * 0.28, p.sy - s * 0.52)
      ctx.fill()
    }
  }
  if (quality > 0 && b.done && b.tier >= 1) {
    ctx.strokeStyle = "rgba(154,163,173,0.55)"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.ellipse(p.sx, p.sy + s * 0.02, r * 0.95, r * 0.38, 0, 0, Math.PI * 2)
    ctx.stroke()
  }
  if (!b.done) {
    hpBar(ctx, p.sx - r, p.sy + r * 0.8, r * 2, b.construct / b.constructMax)
  } else if (b.hp < b.hpMax) {
    hpBar(ctx, p.sx - r, p.sy + r * 0.85, r * 2, b.hp / b.hpMax)
  }
  if (quality > 0) {
    ctx.fillStyle = "rgba(255,246,212,0.95)"
    ctx.font = `${Math.max(11, Math.min(16, r * 0.32))}px sans-serif`
    ctx.textAlign = "center"
    const label = b.type === "hearth" ? AGE_NAMES[age as 0 | 1 | 2] : BUILDING_LABEL[b.type]
    ctx.fillText(label, p.sx, p.sy + r + 14)
  }
  if (quality > 1 && b.done && b.queue.length) {
    for (let i = 0; i < Math.min(4, b.queue.length); i++) {
      ctx.fillStyle = trim
      ctx.beginPath()
      ctx.arc(p.sx - 6 + i * 5, p.sy + r * 0.72, 2.1, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  if (pressed && quality > 0) {
    ctx.strokeStyle = `rgba(212,92,58,${0.35 + 0.3 * Math.sin(now / 140)})`
    ctx.lineWidth = 2.2
    ctx.beginPath()
    ctx.arc(p.sx, p.sy, r * 1.08, 0, Math.PI * 2)
    ctx.stroke()
  }
  if (selected) {
    ctx.strokeStyle = `rgba(243,212,138,${0.55 + 0.35 * Math.sin(now / 160)})`
    ctx.lineWidth = 2
    ctx.strokeRect(p.sx - r - 3, p.sy - r - 3, r * 2 + 6, r * 2 + 6)
  }
}

function unitSpr(u: Unit, moving: boolean, t: number) {
  const stride = moving && Math.sin(t / 70 + u.id) > 0
  if (u.type === "guard") return stride ? SPR.guardStride : SPR.guard
  if (u.type === "warden") return stride ? SPR.wardenStride : SPR.warden
  if (u.type === "ashrider") return stride ? SPR.ashriderStride : SPR.ashrider
  if (u.carry) return SPR.levyCarry
  if (stride) return SPR.levyStride
  return u.id & 1 ? SPR.levyAxe : SPR.levyClub
}

function orderDestX(world: World, u: Unit): number {
  const order = u.order
  if (order.t === "move" || order.t === "attackMove" || order.t === "defend") return order.x
  if (order.t === "gather") {
    const n = world.nodes.find((q) => q.id === order.node)
    return n?.x ?? u.x
  }
  if (order.t === "return") {
    const drop = world.buildings.find((b) => b.id === order.drop)
    return drop?.x ?? u.x
  }
  if (order.t === "attack") {
    const t = world.units.find((x) => x.id === order.target) ?? world.buildings.find((x) => x.id === order.target)
    return t?.x ?? u.x
  }
  if (order.t === "build") {
    const b = world.buildings.find((q) => q.id === order.building)
    return b?.x ?? u.x
  }
  return u.x
}

function drawUnit(
  ctx: CanvasRenderingContext2D,
  u: Unit,
  cam: Cam,
  color: string,
  selected: boolean,
  quality: DrawQuality,
  t: number,
  w: number,
  h: number,
  world: World,
) {
  const p = worldToScreen(cam, u.x, u.y)
  const size = Math.max(30, cam.z * 2.7)
  if (culled(p.sx, p.sy, size, w, h)) return
  const moving = u.order.t === "move" || u.order.t === "gather" || u.order.t === "return" || u.order.t === "attackMove"
  const limp = u.hp < u.hpMax * 0.38
  const faceLeft = orderDestX(world, u) < u.x - 0.15
  const bob = quality > 0 ? Math.sin(t / (moving ? (limp ? 140 : 90) : 180) + u.id) * (moving ? (limp ? 1.2 : 2.2) : u.carry ? 1.8 : 1.2) : 0
  const sway = quality > 0 ? Math.sin(t / (moving ? (limp ? 110 : 70) : 220) + u.id) * (moving ? (limp ? 0.8 : 1.6) : 0.6) : 0
  const y = p.sy + bob
  ctx.fillStyle = "rgba(18,12,8,0.28)"
  ctx.beginPath()
  ctx.ellipse(p.sx, y + size * 0.16, size * 0.28, size * 0.08, 0, 0, Math.PI * 2)
  ctx.fill()
  if (quality > 1 && moving) {
    const puff = (t / 40 + u.id * 3) % 10
    ctx.fillStyle = `rgba(90,70,40,${0.16 - puff * 0.012})`
    ctx.beginPath()
    ctx.ellipse(p.sx - sway * 1.4, y + size * 0.16 + puff * 0.6, 4 + puff * 0.35, 1.8, 0, 0, Math.PI * 2)
    ctx.fill()
    if (u.type === "ashrider") {
      ctx.fillStyle = `rgba(120,80,40,${0.12 - puff * 0.008})`
      ctx.beginPath()
      ctx.ellipse(p.sx - sway * 2.2, y + size * 0.18 + puff, 6 + puff * 0.4, 2.2, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.save()
  ctx.translate(p.sx, 0)
  ctx.scale(faceLeft ? -1 : 1, 1)
  blit(ctx, unitSpr(u, moving, t), -size / 2 + sway, y - size * 0.82, size, size)
  ctx.restore()
  if (quality > 1 && (u.order.t === "attack" || u.order.t === "attackMove") && u.atkCd > 0.65) {
    const dir = faceLeft ? -1 : 1
    const reach = u.type === "ashrider" ? 22 : u.type === "guard" ? 12 : 16
    ctx.strokeStyle =
      u.type === "warden" ? "rgba(160,210,255,0.75)" : u.type === "ashrider" ? "rgba(255,170,90,0.8)" : "rgba(255,214,120,0.7)"
    ctx.lineWidth = u.type === "ashrider" ? 2.4 : 2
    ctx.beginPath()
    ctx.moveTo(p.sx + sway * dir + 4 * dir, y - size * 0.2)
    ctx.lineTo(p.sx + sway * dir + reach * dir, y - size * (u.type === "ashrider" ? 0.36 : 0.48))
    ctx.stroke()
    ctx.fillStyle =
      u.type === "warden" ? "rgba(190,230,255,0.55)" : u.type === "guard" ? "rgba(210,190,140,0.5)" : "rgba(255,230,160,0.55)"
    ctx.beginPath()
    ctx.arc(p.sx + sway * dir + (reach - 2) * dir, y - size * (u.type === "ashrider" ? 0.34 : 0.46), u.type === "guard" ? 3.4 : 2.4, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.ellipse(p.sx, y + size * 0.14, 5, 2.2, 0, 0, Math.PI * 2)
  ctx.fill()
  if (quality > 1 && u.order.t === "build") {
    const spark = 0.22 + 0.32 * Math.sin(t / 70 + u.id)
    ctx.fillStyle = `rgba(255,200,90,${spark})`
    ctx.beginPath()
    ctx.arc(p.sx + 7, y - size * 0.3, 2.1, 0, Math.PI * 2)
    ctx.fill()
  }
  if (quality > 1 && u.carry) {
    ctx.fillStyle = u.carry.res === "relics" ? "rgba(255,230,140,0.7)" : u.carry.res === "ore" ? "rgba(180,190,200,0.55)" : "rgba(212,184,90,0.5)"
    ctx.beginPath()
    ctx.arc(p.sx + 8, y - size * 0.12, 2.2, 0, Math.PI * 2)
    ctx.fill()
  }
  if (quality > 1 && limp) {
    ctx.strokeStyle = "rgba(212,92,58,0.7)"
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.moveTo(p.sx - 4, y - size * 0.18)
    ctx.lineTo(p.sx + 5, y - size * 0.08)
    ctx.stroke()
  }
  if (selected) {
    const ring =
      u.type === "ashrider"
        ? "255,170,90"
        : u.type === "warden"
          ? "160,210,255"
          : u.type === "guard"
            ? "210,190,140"
            : "255,246,212"
    ctx.strokeStyle = `rgba(${ring},${0.55 + 0.35 * Math.sin(t / 160)})`
    ctx.lineWidth = 1.8
    ctx.beginPath()
    ctx.arc(p.sx, y, size * 0.5, 0, Math.PI * 2)
    ctx.stroke()
    hpBar(ctx, p.sx - size * 0.35, y + size * 0.22, size * 0.7, u.hp / u.hpMax)
  } else if (u.hp < u.hpMax && quality > 0) {
    hpBar(ctx, p.sx - size * 0.32, y + size * 0.2, size * 0.64, u.hp / u.hpMax)
  }
}

function drawMinimap(ctx: CanvasRenderingContext2D, world: World, cam: Cam, w: number, h: number) {
  const mw = 128
  const mh = 90
  const x = w - mw - 12
  const y = h - mh - 12
  ctx.fillStyle = "rgba(8,6,4,0.78)"
  ctx.fillRect(x, y, mw, mh)
  ctx.fillStyle = plateGround(world.mapId)
  ctx.globalAlpha = 0.35
  ctx.fillRect(x + 1, y + 1, mw - 2, mh - 2)
  ctx.globalAlpha = 1
  ctx.strokeStyle = "rgba(243,212,138,0.5)"
  ctx.strokeRect(x, y, mw, mh)
  if (world.mapId === "nightgrove") {
    ctx.fillStyle = "rgba(80,120,140,0.12)"
    ctx.fillRect(x + 1, y + 1, mw - 2, mh - 2)
  } else if (world.mapId === "emberglass") {
    ctx.fillStyle = "rgba(180,70,30,0.1)"
    ctx.fillRect(x + 1, y + 1, mw - 2, mh - 2)
  } else if (world.mapId === "sunvault") {
    ctx.fillStyle = "rgba(255,210,90,0.08)"
    ctx.fillRect(x + 1, y + 1, mw - 2, mh - 2)
  }
  const size = Math.max(1, world.size)
  const sx = mw / size
  const sy = mh / size
  ctx.fillStyle = "rgba(45,106,120,0.55)"
  ctx.beginPath()
  ctx.ellipse(x + size * 0.5 * sx, y + size * 0.5 * sy, mw * 0.08, mh * 0.07, 0.2, 0, Math.PI * 2)
  ctx.fill()
  for (const n of world.nodes) {
    if (n.amount <= 0) continue
    ctx.fillStyle = n.fauna
      ? "#c47a3a"
      : n.type === "grain"
        ? "#d4b85a"
        : n.type === "timber"
          ? "#3d6a3a"
          : n.type === "ore"
            ? "#8a8f9a"
            : "#e0c36a"
    const dot = n.fauna ? 3 : 2
    ctx.fillRect(x + n.x * sx - dot / 2, y + n.y * sy - dot / 2, dot, dot)
  }
  for (const b of world.buildings) {
    const px = x + b.x * sx
    const py = y + b.y * sy
    ctx.fillStyle = b.hp < b.hpMax * 0.82 ? "#d45c3a" : team(world, b.owner)
    if (b.type === "hearth") {
      ctx.fillRect(px - 3, py - 3, 6, 6)
    } else if (b.type === "camp" || b.type === "pit") {
      ctx.beginPath()
      ctx.moveTo(px, py - 3)
      ctx.lineTo(px + 3, py)
      ctx.lineTo(px, py + 3)
      ctx.lineTo(px - 3, py)
      ctx.closePath()
      ctx.fill()
    } else {
      ctx.fillRect(px - 2, py - 2, 4, 4)
    }
  }
  for (const u of world.units) {
    ctx.fillStyle = team(world, u.owner)
    ctx.fillRect(x + u.x * sx, y + u.y * sy, 2, 2)
  }
  const vw = (cam.w / cam.z) * sx
  const vh = (cam.h / cam.z) * sy
  ctx.strokeStyle = "rgba(255,246,212,0.8)"
  ctx.strokeRect(x + cam.x * sx - vw / 2, y + cam.y * sy - vh * 0.42, vw, vh)
}

export function drawWorld(
  ctx: CanvasRenderingContext2D,
  world: World,
  cam: Cam,
  selected: Set<number>,
  quality: DrawQuality,
  _lod: number,
  now: number,
  w: number,
  h: number,
) {
  ctx.imageSmoothingEnabled = true
  try {
    ctx.imageSmoothingQuality = "low"
  } catch {
    /* some 2d contexts reject this setter */
  }
  drawTerrain(ctx, cam, w, h, quality, world)
  for (const n of world.nodes) {
    if (n.amount > 0) drawNode(ctx, n, cam, quality, w, h)
  }
  for (const b of world.buildings) {
    drawBuilding(
      ctx,
      b,
      cam,
      team(world, b.owner),
      accent(world, b.owner),
      selected.has(b.id),
      quality,
      world.players[b.owner].age,
      now,
      w,
      h,
      world.units.some((u) => u.owner !== b.owner && Math.hypot(u.x - b.x, u.y - b.y) < 10),
    )
  }
  if (quality > 1) {
    ctx.strokeStyle = "rgba(90,70,40,0.16)"
    ctx.lineWidth = Math.max(2, cam.z * 0.2)
    ctx.setLineDash([5, 6])
    for (const hearth of world.buildings) {
      if (hearth.type !== "hearth" || !hearth.done) continue
      for (const camp of world.buildings) {
        if (camp.owner !== hearth.owner || !camp.done || camp.type !== "camp") continue
        if (Math.hypot(camp.x - hearth.x, camp.y - hearth.y) <= 16) continue
        const a = worldToScreen(cam, hearth.x, hearth.y)
        const b = worldToScreen(cam, camp.x, camp.y)
        ctx.beginPath()
        ctx.moveTo(a.sx, a.sy)
        ctx.lineTo(b.sx, b.sy)
        ctx.stroke()
      }
    }
    ctx.setLineDash([])
  }
  for (const u of world.units) {
    drawUnit(ctx, u, cam, team(world, u.owner), selected.has(u.id), quality, now, w, h, world)
  }
  if (quality > 1) {
    ctx.lineWidth = 1
    ctx.setLineDash([4, 5])
    for (const u of world.units) {
      if (!selected.has(u.id)) continue
      const order = u.order
      let dest: { x: number; y: number } | null = null
      let stroke = "rgba(243,212,138,0.28)"
      if (order.t === "gather") {
        const n = world.nodes.find((q) => q.id === order.node)
        if (n) dest = n
      } else if (order.t === "return") {
        const drop = world.buildings.find((b) => b.id === order.drop)
        if (drop) dest = drop
        stroke = "rgba(125,202,106,0.4)"
      } else if (order.t === "attackMove" || order.t === "attack") {
        if (order.t === "attackMove") dest = { x: order.x, y: order.y }
        else {
          const t =
            world.units.find((x) => x.id === order.target) ??
            world.buildings.find((x) => x.id === order.target)
          if (t) dest = t
        }
        stroke = "rgba(212,92,58,0.45)"
      } else if (order.t === "defend" || order.t === "move") {
        dest = { x: order.x, y: order.y }
        stroke = order.t === "defend" ? "rgba(110,170,210,0.4)" : "rgba(243,212,138,0.28)"
      } else if (order.t === "build") {
        const b = world.buildings.find((q) => q.id === order.building)
        if (b) dest = b
        stroke = "rgba(196,154,90,0.4)"
      }
      if (!dest) continue
      const a = worldToScreen(cam, u.x, u.y)
      const b = worldToScreen(cam, dest.x, dest.y)
      ctx.strokeStyle = stroke
      ctx.beginPath()
      ctx.moveTo(a.sx, a.sy)
      ctx.lineTo(b.sx, b.sy)
      ctx.stroke()
    }
    ctx.setLineDash([])
  }
  if (quality > 0) {
    const dusk = ctx.createRadialGradient(w * 0.5, h * 0.42, Math.min(w, h) * 0.28, w * 0.5, h * 0.5, Math.max(w, h) * 0.72)
    dusk.addColorStop(0, "rgba(0,0,0,0)")
    dusk.addColorStop(1, "rgba(12,8,4,0.32)")
    ctx.fillStyle = dusk
    ctx.fillRect(0, 0, w, h)
    if (quality > 1) {
      const plate = world.mapId
      if (plate === "nightgrove") {
        ctx.strokeStyle = "rgba(170,190,200,0.22)"
        ctx.lineWidth = 1
        for (let i = 0; i < 28; i++) {
          const rx = ((i * 47 + (now / 8) % 80) % w)
          const ry = ((i * 31 + (now / 6) % 90) % h)
          ctx.beginPath()
          ctx.moveTo(rx, ry)
          ctx.lineTo(rx - 4, ry + 14)
          ctx.stroke()
        }
        for (let i = 0; i < 8; i++) {
          const a = now / 900 + i * 0.8
          ctx.fillStyle = `rgba(180,255,160,${0.08 + 0.12 * (0.5 + 0.5 * Math.sin(now / 280 + i))})`
          ctx.beginPath()
          ctx.arc(w * (0.15 + ((i * 19) % 70) / 100), h * (0.25 + ((i * 11) % 50) / 100) + Math.sin(a) * 6, 1.5, 0, Math.PI * 2)
          ctx.fill()
        }
      } else if (plate === "emberglass") {
        for (let i = 0; i < 12; i++) {
          const a = now / 900 + i * 0.7
          const ex = w * (0.2 + ((i * 13) % 70) / 100) + Math.sin(a) * 10
          const ey = h * (0.55 + ((i * 9) % 30) / 100) - ((now / 20 + i * 7) % 40)
          ctx.fillStyle = `rgba(255,140,60,${0.08 + 0.1 * (0.5 + 0.5 * Math.sin(now / 200 + i))})`
          ctx.beginPath()
          ctx.arc(ex, ey, 1.6, 0, Math.PI * 2)
          ctx.fill()
        }
      } else if (plate === "shattercoast") {
        for (let i = 0; i < 8; i++) {
          const a = now / 700 + i
          ctx.fillStyle = `rgba(200,230,230,${0.06 + 0.06 * Math.sin(a)})`
          ctx.beginPath()
          ctx.ellipse(w * 0.5 + Math.sin(a) * 30, h * 0.62 + i * 6, 40 + i * 4, 6, 0.1, 0, Math.PI * 2)
          ctx.fill()
        }
      } else if (plate === "sunvault") {
        ctx.fillStyle = "rgba(255,220,120,0.05)"
        for (let i = 0; i < 4; i++) {
          ctx.beginPath()
          ctx.moveTo(w * (0.18 + i * 0.16), 0)
          ctx.lineTo(w * (0.28 + i * 0.16), h)
          ctx.lineTo(w * (0.34 + i * 0.16), h)
          ctx.lineTo(w * (0.22 + i * 0.16), 0)
          ctx.fill()
        }
        for (let i = 0; i < 8; i++) {
          const a = now / 1400 + i
          ctx.fillStyle = `rgba(255,230,140,${0.08 + 0.08 * Math.sin(a)})`
          ctx.beginPath()
          ctx.arc(w * (0.2 + ((i * 11) % 60) / 100), h * (0.3 + ((i * 7) % 40) / 100) + Math.sin(a) * 8, 1.4, 0, Math.PI * 2)
          ctx.fill()
        }
      } else if (plate === "hollowmere") {
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = `rgba(180,210,200,${0.05 + 0.03 * Math.sin(now / 1600 + i)})`
          ctx.beginPath()
          ctx.ellipse(w * (0.2 + i * 0.2), h * 0.72 + Math.sin(now / 1400 + i) * 8, 90, 16, 0, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.strokeStyle = "rgba(40,70,50,0.28)"
        ctx.lineWidth = 1
        for (let i = 0; i < 7; i++) {
          const x = w * (0.12 + i * 0.12)
          ctx.beginPath()
          ctx.moveTo(x, h * 0.08)
          ctx.quadraticCurveTo(x + Math.sin(now / 900 + i) * 8, h * 0.22, x + 4, h * 0.32)
          ctx.stroke()
        }
      } else {
        for (let i = 0; i < 5; i++) {
          const a = now / 1100 + i * 1.3
          ctx.strokeStyle = `rgba(30,50,40,${0.22 + 0.1 * Math.sin(a)})`
          ctx.lineWidth = 1.1
          const dx = w * (0.2 + ((i * 17) % 60) / 100) + Math.sin(a) * 16
          const dy = h * (0.28 + ((i * 9) % 40) / 100)
          ctx.beginPath()
          ctx.moveTo(dx - 4, dy)
          ctx.quadraticCurveTo(dx, dy - 3, dx + 4, dy)
          ctx.stroke()
        }
      }
      for (let i = 0; i < 3; i++) {
        const a = now / 9000 + i * 2.1
        ctx.fillStyle = `rgba(12,10,8,${0.07 + 0.03 * Math.sin(now / 1400 + i)})`
        ctx.beginPath()
        ctx.ellipse(
          w * (0.22 + 0.28 * i) + Math.sin(a) * 40,
          h * (0.18 + 0.12 * i),
          70 + i * 12,
          18,
          0.1,
          0,
          Math.PI * 2,
        )
        ctx.fill()
      }
      for (let i = 0; i < 10; i++) {
        const a = now / 2400 + i * 0.62
        const mx = w * (0.12 + ((i * 17) % 80) / 100) + Math.sin(a) * 18
        const my = h * (0.18 + ((i * 13) % 60) / 100) + Math.cos(a * 0.8) * 10
        ctx.fillStyle = `rgba(255,220,140,${0.08 + 0.1 * (0.5 + 0.5 * Math.sin(now / 300 + i))})`
        ctx.beginPath()
        ctx.arc(mx, my, 1.4, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    drawMinimap(ctx, world, cam, w, h)
  }
}
