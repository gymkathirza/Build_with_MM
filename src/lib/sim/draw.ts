import { AGE_NAMES, BUILDING_LABEL, BUILDING_STATS } from "../sim/catalog"
import { blit, getMoss, SPR } from "../sim/atlas"
import type { Building, Node, Unit, World } from "../sim/engine"
import { factionById } from "../game-data"
import type { DrawQuality } from "../ml/score"
import { artImage, CAMPAIGN_ART } from "../campaign/artifacts"

function blitArt(
  ctx: CanvasRenderingContext2D,
  src: string,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const img = artImage(src)
  if (!img) return false
  ctx.drawImage(img, x, y, w, h)
  return true
}

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

function drawTerrain(
  ctx: CanvasRenderingContext2D,
  cam: Cam,
  w: number,
  h: number,
  quality: DrawQuality,
  world: World,
) {
  const size = world.size
  ctx.fillStyle =
    world.mapId === "nightgrove"
      ? "#243526"
      : world.mapId === "sunvault"
        ? "#5a6a3a"
        : world.mapId === "emberglass"
          ? "#4a3a28"
          : world.mapId === "shattercoast" || world.mapId === "kayal" || world.mapId === "tamraparani"
            ? "#3a4a42"
            : world.mapId === "palk"
              ? "#355248"
              : world.mapId === "madurai-fracture"
                ? "#3d4a32"
                : "#3d5a32"
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
  water.addColorStop(0, "#6aa8b4")
  water.addColorStop(0.35, "#2d6a78")
  water.addColorStop(0.72, "#1e4a54")
  water.addColorStop(1, "#16343c")
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
        const spr = hsh % 9 === 0 ? SPR.grass : hsh % 11 === 0 ? SPR.flower : hsh % 13 === 0 ? SPR.fern : SPR.rock
        blit(ctx, spr, p.sx - deco / 2, p.sy - deco * 0.65, deco, deco)
      }
    }
  }
  paintCampaignWater(ctx, cam, world, quality, w, h)
}

function paintCampaignWater(
  ctx: CanvasRenderingContext2D,
  cam: Cam,
  world: World,
  quality: DrawQuality,
  vw: number,
  vh: number,
) {
  const id = world.mapId
  if (id !== "kayal" && id !== "palk" && id !== "tamraparani" && id !== "madurai-fracture") return
  const size = world.size
  const samples = 18
  ctx.fillStyle = "rgba(30,90,110,0.55)"
  ctx.beginPath()
  let started = false
  const push = (x: number, y: number) => {
    const p = worldToScreen(cam, x, y)
    if (!started) {
      ctx.moveTo(p.sx, p.sy)
      started = true
    } else ctx.lineTo(p.sx, p.sy)
  }
  if (id === "palk") {
    for (let i = 0; i <= samples; i++) push((i / samples) * size, size * 0.39)
    for (let i = samples; i >= 0; i--) push((i / samples) * size, size * 0.61)
  } else if (id === "madurai-fracture") {
    for (let i = 0; i <= samples; i++) push(size * 0.7, (i / samples) * size)
    for (let i = samples; i >= 0; i--) push(size, (i / samples) * size)
  } else {
    for (let i = 0; i <= samples; i++) push((i / samples) * size, size * 0.6)
    for (let i = samples; i >= 0; i--) push((i / samples) * size, size)
  }
  ctx.closePath()
  ctx.fill()
  if (quality > 0) {
    ctx.strokeStyle = "rgba(180,220,210,0.22)"
    ctx.stroke()
    const now = performance.now()
    ctx.strokeStyle = `rgba(210,240,235,${0.12 + 0.08 * Math.sin(now / 900)})`
    ctx.lineWidth = 1.2
    const bands = quality > 1 ? 5 : 3
    for (let i = 0; i < bands; i++) {
      const t = (now / 1400 + i * 0.18) % 1
      ctx.beginPath()
      if (id === "palk") {
        const y = size * (0.41 + t * 0.18)
        const a = worldToScreen(cam, 0, y)
        const b = worldToScreen(cam, size, y)
        ctx.moveTo(a.sx, a.sy)
        ctx.lineTo(b.sx, b.sy)
      } else if (id === "madurai-fracture") {
        const x = size * (0.72 + t * 0.24)
        const a = worldToScreen(cam, x, 0)
        const b = worldToScreen(cam, x, size)
        ctx.moveTo(a.sx, a.sy)
        ctx.lineTo(b.sx, b.sy)
      } else {
        const y = size * (0.62 + t * 0.32)
        const a = worldToScreen(cam, 0, y)
        const b = worldToScreen(cam, size, y)
        ctx.moveTo(a.sx, a.sy)
        ctx.lineTo(b.sx, b.sy)
      }
      ctx.stroke()
    }
  }
  void vw
  void vh
}

function nodeSpr(n: Node) {
  if (n.fauna === "deer") return SPR.deer
  if (n.fauna === "boar") return SPR.boar
  if (n.fauna === "bear") return SPR.bear
  if (n.fauna === "wolf") return SPR.wolf
  if (n.fauna === "shark") return SPR.reed
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
  if (n.fauna === "shark") return "Pearl / shark"
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
  const art =
    n.fauna === "shark"
      ? CAMPAIGN_ART.mannarPearls
      : n.type === "relics"
        ? CAMPAIGN_ART.toothRelic
        : null
  if (!art || !blitArt(ctx, art, p.sx - s / 2 + wander, p.sy - s * 0.72 + bob, s, s)) {
    blit(ctx, nodeSpr(n), p.sx - s / 2 + wander, p.sy - s * 0.72 + bob, s, s)
  }
  if (n.type === "relics") {
    const gleam = 0.2 + 0.28 * Math.sin(now / 240 + n.id)
    ctx.strokeStyle = `rgba(255,246,212,${quality > 0 ? gleam : 0.22})`
    ctx.lineWidth = quality > 1 ? 2 : 1.4
    ctx.beginPath()
    ctx.arc(p.sx + wander, p.sy - s * 0.2 + bob, s * (0.28 + (quality > 1 ? 0.06 * Math.sin(now / 180) : 0)), 0, Math.PI * 2)
    ctx.stroke()
    if (quality > 0) {
      ctx.fillStyle = `rgba(255,230,160,${0.08 + 0.1 * gleam})`
      ctx.beginPath()
      ctx.arc(p.sx + wander, p.sy - s * 0.2 + bob, s * 0.16, 0, Math.PI * 2)
      ctx.fill()
    }
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
  if (type === "quay") return SPR.camp
  if (type === "lighthouse") return SPR.pit
  if (type === "charm") return SPR.granary
  if (type === "temple" || type === "mosque") return SPR.hearth
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
  const hallArt =
    b.type === "quay"
      ? CAMPAIGN_ART.kayalDockyard
      : b.type === "lighthouse"
        ? CAMPAIGN_ART.lighthouse
        : b.type === "charm"
          ? CAMPAIGN_ART.sharkCharmer
          : null
  if (!hallArt || !blitArt(ctx, hallArt, p.sx - s / 2, p.sy - s * 0.78, s, s)) {
    blit(ctx, buildingSpr(b.type), p.sx - s / 2, p.sy - s * 0.78, s, s)
  }
  if (b.type === "lighthouse" && b.done) {
    ctx.fillStyle = "#d4c48a"
    ctx.fillRect(p.sx - s * 0.08, p.sy - s * 0.72, s * 0.16, s * 0.55)
    ctx.fillStyle = "#f3e2a0"
    ctx.beginPath()
    ctx.arc(p.sx, p.sy - s * 0.76, s * 0.1, 0, Math.PI * 2)
    ctx.fill()
    const sweep = Math.sin(now / 280 + b.id)
    const beam = 0.16 + 0.14 * sweep
    ctx.fillStyle = `rgba(255,230,140,${beam})`
    ctx.beginPath()
    ctx.moveTo(p.sx, p.sy - s * 0.76)
    ctx.lineTo(p.sx + s * (0.55 + 0.45 * sweep), p.sy - s * 0.18)
    ctx.lineTo(p.sx + s * (0.75 + 0.45 * sweep), p.sy + s * 0.08)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = `rgba(255,246,200,${0.2 + 0.18 * Math.abs(sweep)})`
    ctx.beginPath()
    ctx.arc(p.sx, p.sy - s * 0.76, s * 0.16, 0, Math.PI * 2)
    ctx.fill()
  }
  if (b.type === "charm" && b.done) {
    ctx.strokeStyle = "rgba(90,180,190,0.7)"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(p.sx, p.sy - s * 0.25, s * 0.18, 0, Math.PI * 2)
    ctx.stroke()
  }
  if (b.type === "quay" && b.done) {
    ctx.fillStyle = "rgba(90,70,40,0.55)"
    ctx.fillRect(p.sx - s * 0.4, p.sy + s * 0.02, s * 0.8, s * 0.12)
  }
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
  }
  if (quality > 1 && b.done && b.type === "granary") {
    const bob = Math.sin(now / 280 + b.id) * 2
    ctx.fillStyle = "#d4b85a"
    ctx.beginPath()
    ctx.ellipse(p.sx - s * 0.16, p.sy - s * 0.08 + bob, 5, 4, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  if (quality > 1 && b.done && b.type === "camp") {
    const flicker = 0.28 + 0.22 * Math.sin(now / 90 + b.id)
    ctx.fillStyle = `rgba(255,140,50,${flicker})`
    ctx.beginPath()
    ctx.ellipse(p.sx - s * 0.06, p.sy - s * 0.12, 4, 5, 0, 0, Math.PI * 2)
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
    const pulse = b.aging > 0 ? 0.4 + 0.4 * Math.sin(now / 180) : 0.16 + 0.08 * Math.sin(now / 420)
    ctx.strokeStyle = `rgba(243,212,138,${pulse})`
    ctx.lineWidth = b.aging > 0 ? 3 : 1.5
    ctx.beginPath()
    ctx.arc(p.sx, p.sy, r * (b.aging > 0 ? 1.05 : 0.92), 0, Math.PI * 2)
    ctx.stroke()
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
  if (selected) {
    ctx.strokeStyle = "#f3d48a"
    ctx.lineWidth = 2
    ctx.strokeRect(p.sx - r - 3, p.sy - r - 3, r * 2 + 6, r * 2 + 6)
  }
}

function unitSpr(u: Unit, moving: boolean, t: number) {
  const stride = moving && Math.sin(t / 70 + u.id) > 0
  if (u.type === "guard" || u.type === "marzban") return stride ? SPR.guardStride : SPR.guard
  if (u.type === "warden") return stride ? SPR.wardenStride : SPR.warden
  if (u.type === "ashrider" || u.type === "rowther") return SPR.ashrider
  if (u.type === "corsair") return u.id & 1 ? SPR.levyAxe : SPR.levyClub
  if (u.type === "dhoni") return SPR.reed
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
  const faceLeft = orderDestX(world, u) < u.x - 0.15
  const bob = quality > 0 ? Math.sin(t / (moving ? 90 : 180) + u.id) * (moving ? 2.2 : 1.2) : 0
  const sway = quality > 0 && moving ? Math.sin(t / 70 + u.id) * 1.6 : 0
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
  const unitArt =
    u.type === "dhoni"
      ? world.mapId === "palk" && u.id < 20
        ? CAMPAIGN_ART.flagship
        : CAMPAIGN_ART.coastalDhoni
      : u.type === "marzban"
        ? CAMPAIGN_ART.escortShip
        : u.type === "rowther"
          ? CAMPAIGN_ART.rowtherCavalry
          : u.type === "ashrider" && world.campaign
            ? CAMPAIGN_ART.arabWarhorse
            : null
  if (unitArt && blitArt(ctx, unitArt, -size / 2 + sway, y - size * 0.82, size, size)) {
    /* CC0 card */
  } else if (u.type === "dhoni") {
    ctx.fillStyle = "#6b3d1c"
    ctx.beginPath()
    ctx.ellipse(sway, y - size * 0.12, size * 0.42, size * 0.14, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = "#f0e0c0"
    ctx.beginPath()
    ctx.moveTo(sway, y - size * 0.55)
    ctx.lineTo(sway + 6, y - size * 0.18)
    ctx.lineTo(sway - 2, y - size * 0.18)
    ctx.closePath()
    ctx.fill()
  } else {
    blit(ctx, unitSpr(u, moving, t), -size / 2 + sway, y - size * 0.82, size, size)
  }
  ctx.restore()
  if (quality > 1 && (u.order.t === "attack" || u.order.t === "attackMove") && u.atkCd > 0.65) {
    const dir = faceLeft ? -1 : 1
    ctx.strokeStyle = "rgba(255,214,120,0.7)"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(p.sx + sway * dir + 4 * dir, y - size * 0.2)
    ctx.lineTo(p.sx + sway * dir + 14 * dir, y - size * 0.48)
    ctx.stroke()
  }
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.ellipse(p.sx, y + size * 0.14, 5, 2.2, 0, 0, Math.PI * 2)
  ctx.fill()
  if (selected) {
    ctx.strokeStyle = `rgba(255,246,212,${0.55 + 0.35 * Math.sin(t / 160)})`
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
  ctx.strokeStyle = "rgba(243,212,138,0.5)"
  ctx.strokeRect(x, y, mw, mh)
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
    ctx.fillStyle = team(world, b.owner)
    ctx.fillRect(x + b.x * sx - 2, y + b.y * sy - 2, 4, 4)
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
    )
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
  const campaign = world.campaign
  if (campaign) {
    for (const ship of campaign.convoys) {
      if (ship.sunk || ship.arrived) continue
      const p = worldToScreen(cam, ship.x, ship.y)
      const sw = Math.max(28, cam.z * 2.2)
      const grain = ship.kind === "grain"
      const art = grain ? CAMPAIGN_ART.arabWarhorse : CAMPAIGN_ART.altibiMerchantman
      if (!blitArt(ctx, art, p.sx - sw / 2, p.sy - sw * 0.7, sw, sw)) {
        ctx.fillStyle = grain ? "#b8894a" : "#c4a35a"
        ctx.beginPath()
        ctx.ellipse(p.sx, p.sy, Math.max(8, cam.z * 0.7), Math.max(4, cam.z * 0.28), 0.1, 0, Math.PI * 2)
        ctx.fill()
      }
      hpBar(ctx, p.sx - sw * 0.32, p.sy + 4, sw * 0.64, ship.hp / ship.hpMax)
      ctx.fillStyle = "rgba(20,12,8,0.8)"
      ctx.font = "11px sans-serif"
      ctx.textAlign = "center"
      ctx.fillText(grain ? "Grain caravan" : "Hormuz hull", p.sx, p.sy + 16)
    }
    if (campaign.night) {
      ctx.fillStyle = "rgba(6,10,28,0.38)"
      ctx.fillRect(0, 0, w, h)
    }
  }
  if (quality > 0) {
    const dusk = ctx.createRadialGradient(w * 0.5, h * 0.42, Math.min(w, h) * 0.28, w * 0.5, h * 0.5, Math.max(w, h) * 0.72)
    dusk.addColorStop(0, "rgba(0,0,0,0)")
    dusk.addColorStop(1, "rgba(12,8,4,0.32)")
    ctx.fillStyle = dusk
    ctx.fillRect(0, 0, w, h)
    if (quality > 1) {
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
