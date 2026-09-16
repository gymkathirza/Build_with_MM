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

function drawTerrain(
  ctx: CanvasRenderingContext2D,
  cam: Cam,
  w: number,
  h: number,
  quality: DrawQuality,
  size: number,
) {
  ctx.fillStyle = "#3d5a32"
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
  const water = ctx.createRadialGradient(lake.sx, lake.sy, 2, lake.sx, lake.sy, lrx)
  water.addColorStop(0, "#4a8a9a")
  water.addColorStop(0.45, "#1e4a54")
  water.addColorStop(1, "#16343c")
  ctx.fillStyle = water
  ctx.beginPath()
  ctx.ellipse(lake.sx, lake.sy, lrx, lry, 0.2, 0, Math.PI * 2)
  ctx.fill()
  if (quality > 0) {
    ctx.strokeStyle = "rgba(180,220,210,0.22)"
    ctx.lineWidth = 1.5
    ctx.stroke()
  }

  if (quality > 0) {
    const cell = 12
    const wx0 = cam.x - cam.w / (2 * cam.z) - cell
    const wy0 = cam.y - cam.h / (2 * cam.z) - cell
    const wx1 = cam.x + cam.w / (2 * cam.z) + cell
    const wy1 = cam.y + cam.h / (2 * cam.z) + cell
    const x0 = Math.max(0, Math.floor(wx0 / cell) * cell)
    const y0 = Math.max(0, Math.floor(wy0 / cell) * cell)
    const x1 = Math.min(size, Math.ceil(wx1 / cell) * cell)
    const y1 = Math.min(size, Math.ceil(wy1 / cell) * cell)
    const deco = quality > 1 ? Math.max(16, cam.z * 1.35) : Math.max(12, cam.z * 1.05)
    for (let gy = y0; gy < y1; gy += cell) {
      for (let gx = x0; gx < x1; gx += cell) {
        const hsh = hash(gx, gy)
        const kind = hsh % 11
        if (kind > 3) continue
        const p = worldToScreen(cam, gx + (hsh % 5), gy + ((hsh >> 3) % 5))
        if (culled(p.sx, p.sy, deco, w, h)) continue
        const spr = kind === 0 ? SPR.pine : kind === 1 ? SPR.rock : kind === 2 ? SPR.timber : SPR.grass
        blit(ctx, spr, p.sx - deco / 2, p.sy - deco * 0.75, deco, deco)
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

function drawNode(ctx: CanvasRenderingContext2D, n: Node, cam: Cam, quality: DrawQuality, w: number, h: number) {
  const p = worldToScreen(cam, n.x, n.y)
  const s = Math.max(20, cam.z * (n.fauna ? 2.15 : 1.85))
  if (culled(p.sx, p.sy, s, w, h)) return
  if (quality === 0) {
    ctx.fillStyle = n.fauna
      ? "#c47a3a"
      : n.type === "grain"
        ? "#d4b85a"
        : n.type === "timber"
          ? "#3d6a3a"
          : n.type === "ore"
            ? "#8a8f9a"
            : "#e0c36a"
    ctx.fillRect(p.sx - 3, p.sy - 3, 6, 6)
    return
  }
  const bob = n.fauna && quality > 1 ? Math.sin(n.id + performance.now() / 420) * 1.4 : 0
  blit(ctx, nodeSpr(n), p.sx - s / 2, p.sy - s * 0.72 + bob, s, s)
  if (quality > 0) {
    ctx.fillStyle = "rgba(20,12,8,0.72)"
    ctx.font = `${Math.max(9, cam.z * 0.5)}px sans-serif`
    ctx.textAlign = "center"
    ctx.fillText(String(Math.floor(n.amount)), p.sx, p.sy + s * 0.38)
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
) {
  const p = worldToScreen(cam, b.x, b.y)
  const r = BUILDING_STATS[b.type].radius * cam.z
  const s = Math.max(36, r * 1.75)
  if (culled(p.sx, p.sy, s, w, h)) return
  if (quality === 0) {
    ctx.fillStyle = color
    ctx.fillRect(p.sx - r * 0.7, p.sy - r * 0.7, r * 1.4, r * 1.4)
    return
  }
  if (!b.done) ctx.globalAlpha = 0.58
  blit(ctx, buildingSpr(b.type), p.sx - s / 2, p.sy - s * 0.78, s, s)
  ctx.globalAlpha = 1
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(p.sx + s * 0.18, p.sy - s * 0.62)
  ctx.lineTo(p.sx + s * 0.18, p.sy - s * 0.38)
  ctx.lineTo(p.sx + s * 0.34, p.sy - s * 0.46)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = trim
  ctx.fillRect(p.sx + s * 0.16, p.sy - s * 0.62, 3, s * 0.26)
  if (b.type === "hearth" && b.aging > 0) {
    ctx.strokeStyle = `rgba(243,212,138,${0.4 + 0.4 * Math.sin(now / 180)})`
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(p.sx, p.sy, r * 1.05, 0, Math.PI * 2)
    ctx.stroke()
  }
  if (!b.done) {
    hpBar(ctx, p.sx - r, p.sy + r * 0.8, r * 2, b.construct / b.constructMax)
  } else if (b.hp < b.hpMax) {
    hpBar(ctx, p.sx - r, p.sy + r * 0.85, r * 2, b.hp / b.hpMax)
  }
  if (quality > 1 && r > 14) {
    ctx.fillStyle = "rgba(255,246,212,0.9)"
    ctx.font = `${Math.max(9, Math.min(13, r * 0.28))}px sans-serif`
    ctx.textAlign = "center"
    const label = b.type === "hearth" ? AGE_NAMES[age as 0 | 1 | 2] : BUILDING_LABEL[b.type]
    ctx.fillText(label, p.sx, p.sy + r + 12)
  }
  if (selected) {
    ctx.strokeStyle = "#f3d48a"
    ctx.lineWidth = 2
    ctx.strokeRect(p.sx - r - 3, p.sy - r - 3, r * 2 + 6, r * 2 + 6)
  }
}

function unitSpr(u: Unit) {
  if (u.type === "guard") return SPR.guard
  if (u.type === "warden") return SPR.warden
  if (u.type === "ashrider") return SPR.ashrider
  if (u.carry) return SPR.levyCarry
  return u.id & 1 ? SPR.levyAxe : SPR.levyClub
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
) {
  const p = worldToScreen(cam, u.x, u.y)
  const size = Math.max(22, cam.z * 2.35)
  if (culled(p.sx, p.sy, size, w, h)) return
  if (quality === 0) {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(p.sx, p.sy, Math.max(3, size * 0.18), 0, Math.PI * 2)
    ctx.fill()
    return
  }
  const bob = quality > 1 ? Math.sin(t / 180 + u.id) * 1.2 : 0
  const y = p.sy + bob
  blit(ctx, unitSpr(u), p.sx - size / 2, y - size * 0.82, size, size)
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.ellipse(p.sx, y + size * 0.14, 5, 2.2, 0, 0, Math.PI * 2)
  ctx.fill()
  if (selected) {
    ctx.strokeStyle = "#fff6d4"
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(p.sx, y, size * 0.48, 0, Math.PI * 2)
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
  ctx.fillStyle = "rgba(8,6,4,0.72)"
  ctx.fillRect(x, y, mw, mh)
  ctx.strokeStyle = "rgba(243,212,138,0.45)"
  ctx.strokeRect(x, y, mw, mh)
  const size = Math.max(1, world.size)
  const sx = mw / size
  const sy = mh / size
  for (const n of world.nodes) {
    if (n.amount <= 0) continue
    ctx.fillStyle =
      n.type === "grain" ? "#d4b85a" : n.type === "timber" ? "#3d6a3a" : n.type === "ore" ? "#8a8f9a" : "#e0c36a"
    ctx.fillRect(x + n.x * sx - 1, y + n.y * sy - 1, 2, 2)
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
  drawTerrain(ctx, cam, w, h, quality, world.size)
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
    drawUnit(ctx, u, cam, team(world, u.owner), selected.has(u.id), quality, now, w, h)
  }
  if (quality > 0) drawMinimap(ctx, world, cam, w, h)
}
