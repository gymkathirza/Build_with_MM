import { AGE_NAMES, BUILDING_LABEL, BUILDING_STATS } from "../sim/catalog"
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

function drawTerrain(
  ctx: CanvasRenderingContext2D,
  cam: Cam,
  w: number,
  h: number,
  quality: DrawQuality,
  size: number,
) {
  ctx.fillStyle = "#1c2a1c"
  ctx.fillRect(0, 0, w, h)
  const c0 = worldToScreen(cam, 0, 0)
  const c1 = worldToScreen(cam, size, size)
  const grd = ctx.createLinearGradient(c0.sx, c0.sy, c1.sx, c1.sy)
  grd.addColorStop(0, "#2a3d28")
  grd.addColorStop(0.45, "#243526")
  grd.addColorStop(1, "#1e3328")
  ctx.fillStyle = grd
  ctx.fillRect(c0.sx, c0.sy, c1.sx - c0.sx, c1.sy - c0.sy)
  ctx.fillStyle = "#16343c"
  const lake = worldToScreen(cam, size / 2, size / 2)
  const lakeR = Math.max(6, size * 0.045)
  ctx.beginPath()
  ctx.ellipse(lake.sx, lake.sy, lakeR * cam.z, lakeR * 0.55 * cam.z, 0.2, 0, Math.PI * 2)
  ctx.fill()
  if (quality > 0) {
    ctx.strokeStyle = "rgba(212,168,80,0.18)"
    ctx.lineWidth = 1
    const step = size >= 200 ? 20 : 10
    for (let i = step; i < size; i += step) {
      const a = worldToScreen(cam, i, 0)
      const b = worldToScreen(cam, i, size)
      ctx.beginPath()
      ctx.moveTo(a.sx, a.sy)
      ctx.lineTo(b.sx, b.sy)
      ctx.stroke()
    }
  }
}

function drawNode(ctx: CanvasRenderingContext2D, n: Node, cam: Cam, quality: DrawQuality) {
  const p = worldToScreen(cam, n.x, n.y)
  const r = Math.max(4, cam.z * 0.9)
  const colors: Record<Node["type"], string> = {
    grain: "#d4b85a",
    timber: "#3d6a3a",
    ore: "#8a8f9a",
    relics: "#e0c36a",
  }
  ctx.fillStyle = colors[n.type]
  ctx.beginPath()
  if (n.type === "timber") {
    ctx.moveTo(p.sx, p.sy - r * 1.6)
    ctx.lineTo(p.sx + r, p.sy + r * 0.6)
    ctx.lineTo(p.sx - r, p.sy + r * 0.6)
    ctx.closePath()
  } else if (n.type === "ore") {
    ctx.rect(p.sx - r, p.sy - r, r * 2, r * 2)
  } else if (n.type === "relics") {
    ctx.moveTo(p.sx, p.sy - r)
    ctx.lineTo(p.sx + r, p.sy)
    ctx.lineTo(p.sx, p.sy + r)
    ctx.lineTo(p.sx - r, p.sy)
    ctx.closePath()
  } else {
    ctx.ellipse(p.sx, p.sy, r * 1.2, r * 0.7, 0, 0, Math.PI * 2)
  }
  ctx.fill()
  if (quality > 0) {
    ctx.fillStyle = "rgba(20,12,8,0.7)"
    ctx.font = `${Math.max(9, cam.z * 0.55)}px sans-serif`
    ctx.textAlign = "center"
    ctx.fillText(String(Math.floor(n.amount)), p.sx, p.sy + r + 10)
  }
}

function hpBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  ratio: number,
) {
  ctx.fillStyle = "rgba(0,0,0,0.55)"
  ctx.fillRect(x, y, w, 3)
  ctx.fillStyle = ratio > 0.45 ? "#7dca6a" : "#d45c3a"
  ctx.fillRect(x, y, w * Math.max(0, ratio), 3)
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
) {
  const p = worldToScreen(cam, b.x, b.y)
  const r = BUILDING_STATS[b.type].radius * cam.z
  if (quality === 0 || r < 6) {
    ctx.fillStyle = color
    ctx.fillRect(p.sx - r * 0.7, p.sy - r * 0.7, r * 1.4, r * 1.4)
    return
  }
  ctx.fillStyle = "rgba(0,0,0,0.28)"
  ctx.beginPath()
  ctx.ellipse(p.sx, p.sy + r * 0.35, r, r * 0.45, 0, 0, Math.PI * 2)
  ctx.fill()
  const fill = b.done ? color : "rgba(180,180,180,0.45)"
  ctx.fillStyle = fill
  if (b.type === "hearth") {
    ctx.beginPath()
    ctx.moveTo(p.sx, p.sy - r * (age >= 1 ? 1.35 : 1.1))
    ctx.lineTo(p.sx + r, p.sy + r * 0.4)
    ctx.lineTo(p.sx - r, p.sy + r * 0.4)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = age >= 1 ? trim : "#f0c36a"
    ctx.fillRect(p.sx - r * 0.15, p.sy - r * 0.2, r * 0.3, r * 0.7)
    if (quality > 1 && age >= 1) {
      ctx.fillStyle = trim
      ctx.beginPath()
      ctx.arc(p.sx, p.sy - r * 1.2, r * 0.22, 0, Math.PI * 2)
      ctx.fill()
    }
    if (b.aging > 0) {
      ctx.strokeStyle = `rgba(243,212,138,${0.4 + 0.4 * Math.sin(now / 180)})`
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(p.sx, p.sy, r * 1.05, 0, Math.PI * 2)
      ctx.stroke()
    }
  } else if (b.type === "yard") {
    ctx.fillRect(p.sx - r, p.sy - r * 0.7, r * 2, r * 1.4)
    ctx.fillStyle = "#1a120c"
    ctx.fillRect(p.sx - r * 0.7, p.sy - r * 0.3, r * 0.4, r * 0.7)
    ctx.fillStyle = trim
    ctx.fillRect(p.sx + r * 0.55, p.sy - r * 1.15, 3, r * 1.1)
    ctx.beginPath()
    ctx.moveTo(p.sx + r * 0.55, p.sy - r * 1.15)
    ctx.lineTo(p.sx + r * 1.15, p.sy - r * 0.85)
    ctx.lineTo(p.sx + r * 0.55, p.sy - r * 0.55)
    ctx.closePath()
    ctx.fill()
  } else if (b.type === "lodge") {
    ctx.beginPath()
    ctx.moveTo(p.sx - r, p.sy + r * 0.4)
    ctx.lineTo(p.sx - r * 0.2, p.sy - r * 0.85)
    ctx.lineTo(p.sx + r, p.sy + r * 0.4)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = "#1a120c"
    ctx.fillRect(p.sx - r * 0.25, p.sy - r * 0.1, r * 0.5, r * 0.5)
  } else if (b.type === "camp") {
    ctx.fillStyle = "#5a3a22"
    ctx.beginPath()
    ctx.arc(p.sx, p.sy, r * 0.85, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = "#3d6a3a"
    ctx.fillRect(p.sx - r * 0.7, p.sy - r * 0.15, r * 0.4, r * 0.55)
    ctx.fillRect(p.sx + r * 0.2, p.sy - r * 0.05, r * 0.45, r * 0.4)
  } else if (b.type === "pit") {
    ctx.fillStyle = "#6a6f78"
    ctx.beginPath()
    ctx.ellipse(p.sx, p.sy, r * 0.95, r * 0.55, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = "#c9ced8"
    ctx.fillRect(p.sx - r * 0.25, p.sy - r * 0.2, r * 0.5, r * 0.4)
  } else {
    ctx.fillStyle = "#c4a45a"
    ctx.beginPath()
    ctx.ellipse(p.sx, p.sy, r * 0.9, r * 0.7, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = "#8a6a28"
    ctx.beginPath()
    ctx.arc(p.sx, p.sy - r * 0.15, r * 0.45, 0, Math.PI * 2)
    ctx.fill()
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

function drawUnit(
  ctx: CanvasRenderingContext2D,
  u: Unit,
  cam: Cam,
  color: string,
  selected: boolean,
  quality: DrawQuality,
  t: number,
  lod: number,
) {
  const p = worldToScreen(cam, u.x, u.y)
  const size = Math.max(3, cam.z * 0.42)
  if (size < lod * 0.12 || quality === 0) {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(p.sx, p.sy, Math.max(2, size * 0.7), 0, Math.PI * 2)
    ctx.fill()
    return
  }
  const bob = quality > 1 ? Math.sin(t / 180 + u.id) * 1.2 : 0
  const y = p.sy + bob
  ctx.fillStyle = "rgba(0,0,0,0.3)"
  ctx.beginPath()
  ctx.ellipse(p.sx, y + size * 0.7, size * 0.7, size * 0.25, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = color
  if (u.type === "ashrider") {
    ctx.beginPath()
    ctx.ellipse(p.sx, y, size * 1.2, size * 0.7, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = "#f3d48a"
    ctx.fillRect(p.sx - size * 0.25, y - size * 1.3, size * 0.5, size * 0.9)
  } else if (u.type === "warden") {
    ctx.beginPath()
    ctx.arc(p.sx, y - size * 0.2, size * 0.7, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = "#e8d5a3"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(p.sx + size * 0.8, y + size)
    ctx.lineTo(p.sx + size * 0.8, y - size)
    ctx.stroke()
  } else if (u.type === "guard") {
    ctx.fillRect(p.sx - size * 0.45, y - size, size * 0.9, size * 1.6)
    ctx.fillStyle = "#e8d5a3"
    ctx.fillRect(p.sx + size * 0.35, y - size * 1.1, 2, size * 1.8)
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(p.sx - size * 0.5, y - size)
    ctx.lineTo(p.sx, y - size * 1.45)
    ctx.lineTo(p.sx + size * 0.5, y - size)
    ctx.fill()
  } else {
    ctx.beginPath()
    ctx.arc(p.sx, y - size * 0.35, size * 0.55, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillRect(p.sx - size * 0.35, y - size * 0.1, size * 0.7, size)
    if (u.carry) {
      ctx.fillStyle = u.carry.res === "grain" ? "#d4b85a" : u.carry.res === "timber" ? "#3d6a3a" : u.carry.res === "ore" ? "#8a8f9a" : "#e0c36a"
      ctx.fillRect(p.sx + size * 0.4, y, size * 0.45, size * 0.4)
    }
  }
  if (selected) {
    ctx.strokeStyle = "#fff6d4"
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(p.sx, y, size * 1.5, 0, Math.PI * 2)
    ctx.stroke()
    hpBar(ctx, p.sx - size, y + size * 1.4, size * 2, u.hp / u.hpMax)
  } else if (u.hp < u.hpMax && quality > 0) {
    hpBar(ctx, p.sx - size, y + size * 1.3, size * 2, u.hp / u.hpMax)
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
  lod: number,
  now: number,
  w: number,
  h: number,
) {
  drawTerrain(ctx, cam, w, h, quality, world.size)
  for (const n of world.nodes) {
    if (n.amount > 0) drawNode(ctx, n, cam, quality)
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
    )
  }
  for (const u of world.units) {
    drawUnit(ctx, u, cam, team(world, u.owner), selected.has(u.id), quality, now, lod)
  }
  if (quality > 0) drawMinimap(ctx, world, cam, w, h)
}
