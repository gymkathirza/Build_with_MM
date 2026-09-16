/** Off-hot-path cartoon cave atlas. Inspired by the civilian sheet, original drawing. */

export const CELL = 64
const COLS = 8
const ROWS = 4

export const SPR = {
  levyClub: 0,
  levyAxe: 1,
  levyCarry: 2,
  guard: 3,
  warden: 4,
  ashrider: 5,
  hearth: 6,
  yard: 7,
  lodge: 8,
  camp: 9,
  pit: 10,
  granary: 11,
  grain: 12,
  timber: 13,
  ore: 14,
  relic: 15,
  palm: 16,
  rock: 17,
  grass: 18,
  pine: 19,
  oreGold: 20,
  deer: 21,
  boar: 22,
  bear: 23,
  wolf: 24,
} as const

const SKIN = "#f0c09a"
const SKIN_D = "#d49a72"
const HAIR = "#4a2c18"
const HAIR_B = "#2a1810"
const FUR = "#8a4e2a"
const FUR_L = "#c49a5a"
const LINE = "#3a2414"
const WHITE = "#fff8ee"
const PUPIL = "#1a120c"
const WOOD = "#6b3d1c"
const STONE = "#9aa3ad"
const MOSS = "#4a7a38"
const GRASS = "#3d6a32"
const ROCK = "#7a838c"
const ROCK_L = "#c5cbd4"
const DOOR = "#5a3218"

let atlas: HTMLCanvasElement | OffscreenCanvas | null = null
let moss: HTMLCanvasElement | OffscreenCanvas | null = null

function makeCanvas(w: number, h: number) {
  if (typeof document !== "undefined") {
    const c = document.createElement("canvas")
    c.width = w
    c.height = h
    return c
  }
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h)
  throw new Error("no canvas")
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (typeof ctx.roundRect === "function") ctx.roundRect(x, y, w, h, r)
  else ctx.rect(x, y, w, h)
}

function ctx2d(c: HTMLCanvasElement | OffscreenCanvas) {
  const ctx = c.getContext("2d")
  if (!ctx) throw new Error("no 2d")
  return ctx as CanvasRenderingContext2D
}

function ellipse(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  fill: string,
  stroke = true,
) {
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
  ctx.fillStyle = fill
  ctx.fill()
  if (stroke) {
    ctx.strokeStyle = LINE
    ctx.lineWidth = 1.2
    ctx.stroke()
  }
}

function hairTufts(ctx: CanvasRenderingContext2D, hx: number, hy: number, r: number, dark: boolean) {
  ctx.fillStyle = dark ? HAIR_B : HAIR
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI + (i / 8) * Math.PI
    const tx = hx + Math.cos(a) * r * 0.92
    const ty = hy + Math.sin(a) * r * 0.72 - 2
    ctx.beginPath()
    ctx.ellipse(tx, ty, 5.2, 6.4, a + 0.4, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.strokeStyle = LINE
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(hx, hy, r + 1, Math.PI * 1.05, Math.PI * 1.95)
  ctx.stroke()
}

function face(ctx: CanvasRenderingContext2D, hx: number, hy: number, r: number) {
  ellipse(ctx, hx, hy, r, r * 1.02, SKIN)
  ellipse(ctx, hx - 2, hy + 3, r * 0.55, r * 0.42, SKIN_D, false)
  hairTufts(ctx, hx, hy - 1, r, false)
  ellipse(ctx, hx - 5, hy - 1, 4.2, 5, WHITE)
  ellipse(ctx, hx + 5.2, hy - 1, 4.2, 5, WHITE)
  ctx.fillStyle = PUPIL
  ctx.beginPath()
  ctx.arc(hx - 4.4, hy - 0.6, 1.7, 0, Math.PI * 2)
  ctx.arc(hx + 5.8, hy - 0.6, 1.7, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = WHITE
  ctx.beginPath()
  ctx.arc(hx - 3.6, hy - 1.6, 0.7, 0, Math.PI * 2)
  ctx.arc(hx + 6.6, hy - 1.6, 0.7, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = SKIN_D
  ctx.beginPath()
  ctx.moveTo(hx, hy + 2)
  ctx.lineTo(hx + 2.2, hy + 5)
  ctx.lineTo(hx - 1.4, hy + 5)
  ctx.fill()
  ctx.strokeStyle = "#c45c4a"
  ctx.lineWidth = 1.4
  ctx.beginPath()
  ctx.arc(hx, hy + 7.2, 3.4, 0.15, Math.PI - 0.15)
  ctx.stroke()
}

function skirt(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, leopard = false) {
  ctx.fillStyle = leopard ? "#d4a24a" : FUR
  ctx.beginPath()
  ctx.moveTo(x - w, y)
  for (let i = 0; i <= 8; i++) {
    const px = x - w + (i / 8) * w * 2
    const py = y + h + (i % 2 === 0 ? 3.5 : -0.5)
    ctx.lineTo(px, py)
  }
  ctx.lineTo(x + w, y)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = LINE
  ctx.lineWidth = 1
  ctx.stroke()
  if (leopard) {
    ctx.fillStyle = "#3a2410"
    for (const s of [
      [-6, 4],
      [2, 6],
      [7, 3],
      [-1, 9],
    ]) {
      ctx.beginPath()
      ctx.ellipse(x + s[0], y + s[1], 2.1, 1.6, 0.3, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

function limb(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  thick: number,
) {
  ctx.strokeStyle = SKIN_D
  ctx.lineCap = "round"
  ctx.lineWidth = thick + 1.4
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
  ctx.strokeStyle = SKIN
  ctx.lineWidth = thick
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
  ellipse(ctx, x2, y2, thick * 0.48, thick * 0.36, SKIN)
}

function club(ctx: CanvasRenderingContext2D, x: number, y: number, up: boolean) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(up ? -0.7 : 0.35)
  ctx.fillStyle = WOOD
  ctx.fillRect(-2, 0, 4, 18)
  ellipse(ctx, 0, 22, 6, 7, WOOD)
  ctx.restore()
}

function axe(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(-0.85)
  ctx.fillStyle = WOOD
  ctx.fillRect(-1.5, 0, 3, 20)
  ctx.fillStyle = STONE
  ctx.beginPath()
  ctx.moveTo(-8, 2)
  ctx.lineTo(8, 2)
  ctx.lineTo(1, 10)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = LINE
  ctx.stroke()
  ctx.restore()
}

function spear(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.strokeStyle = WOOD
  ctx.lineWidth = 2.4
  ctx.beginPath()
  ctx.moveTo(x, y + 22)
  ctx.lineTo(x, y - 24)
  ctx.stroke()
  ctx.fillStyle = ROCK_L
  ctx.beginPath()
  ctx.moveTo(x, y - 30)
  ctx.lineTo(x + 4.5, y - 20)
  ctx.lineTo(x - 4.5, y - 20)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = LINE
  ctx.lineWidth = 1
  ctx.stroke()
}

function bow(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.strokeStyle = WOOD
  ctx.lineWidth = 2.2
  ctx.beginPath()
  ctx.arc(x, y, 14, -1.1, 1.1)
  ctx.stroke()
  ctx.strokeStyle = "#e8d5a3"
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(x + 6, y - 12)
  ctx.lineTo(x + 6, y + 12)
  ctx.stroke()
}

function caveHuman(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  kind: "club" | "axe" | "carry" | "spear" | "bow" | "ride",
) {
  const cx = ox + 32
  const feet = oy + 58
  ctx.fillStyle = "rgba(20,12,8,0.28)"
  ctx.beginPath()
  ctx.ellipse(cx, feet + 1, 14, 4, 0, 0, Math.PI * 2)
  ctx.fill()

  if (kind === "ride") {
    ellipse(ctx, cx + 2, feet - 10, 18, 10, "#6a4428")
    ellipse(ctx, cx + 16, feet - 14, 8, 6, "#5a341c")
    ctx.fillStyle = HAIR
    ctx.fillRect(cx - 16, feet - 14, 6, 8)
    ctx.fillRect(cx + 10, feet - 8, 5, 8)
  }

  const hip = kind === "ride" ? feet - 18 : feet - 16
  if (kind !== "ride") {
    ellipse(ctx, cx - 8, feet, 3.2, 1.8, SKIN_D, false)
    ellipse(ctx, cx + 9, feet, 3.2, 1.8, SKIN_D, false)
  }
  limb(ctx, cx - 5, hip, cx - 8, kind === "ride" ? hip + 8 : feet - 2, 6.2)
  limb(ctx, cx + 5, hip, cx + 9, kind === "ride" ? hip + 8 : feet - 2, 6.2)

  const torsoY = hip - 11
  ellipse(ctx, cx, torsoY, 11, 10, SKIN)
  skirt(ctx, cx, torsoY + 2, 13, 12, kind === "club" || kind === "ride")

  const hx = cx
  const hy = torsoY - 14
  const armY = torsoY - 2
  if (kind === "spear") {
    spear(ctx, cx + 16, hy + 8)
    limb(ctx, cx + 8, armY, cx + 16, hy + 4, 5)
    limb(ctx, cx - 8, armY, cx - 14, hip - 2, 5)
  } else if (kind === "bow") {
    bow(ctx, cx + 16, hy + 6)
    limb(ctx, cx + 8, armY, cx + 14, hy + 8, 5)
    limb(ctx, cx - 8, armY, cx - 12, hip, 5)
  } else if (kind === "axe") {
    limb(ctx, cx - 7, armY, cx - 16, hy - 2, 5.5)
    axe(ctx, cx - 16, hy - 4)
    limb(ctx, cx + 7, armY, cx + 13, hip + 2, 5)
  } else if (kind === "carry") {
    limb(ctx, cx - 7, armY, cx - 12, hip, 5)
    limb(ctx, cx + 8, armY, cx + 16, torsoY + 6, 5.5)
    ellipse(ctx, cx + 18, torsoY + 8, 7, 6, FUR_L)
  } else {
    limb(ctx, cx + 8, armY, cx + 15, hy - 6, 5.5)
    club(ctx, cx + 15, hy - 8, true)
    limb(ctx, cx - 8, armY, cx - 14, hip + 4, 5)
  }

  face(ctx, hx, hy, 12)
  if (kind === "spear" || kind === "bow") {
    ctx.strokeStyle = "#c45c2a"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(hx, hy - 2, 12.4, Math.PI * 1.05, Math.PI * 1.95)
    ctx.stroke()
  }
}

function mossDots(ctx: CanvasRenderingContext2D, x: number, y: number, n: number) {
  ctx.fillStyle = MOSS
  for (let i = 0; i < n; i++) {
    const px = x + ((i * 17) % 50) - 22
    const py = y + ((i * 11) % 28) - 12
    ctx.beginPath()
    ctx.ellipse(px, py, 3 + (i % 3), 2, 0.4, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawLegs(
  ctx: CanvasRenderingContext2D,
  cx: number,
  feet: number,
  span: number,
  thick: number,
  color: string,
) {
  ctx.strokeStyle = color
  ctx.lineCap = "round"
  ctx.lineWidth = thick
  ctx.beginPath()
  ctx.moveTo(cx - span, feet - 10)
  ctx.lineTo(cx - span - 1, feet)
  ctx.moveTo(cx - span * 0.35, feet - 10)
  ctx.lineTo(cx - span * 0.35 + 1, feet)
  ctx.moveTo(cx + span * 0.35, feet - 10)
  ctx.lineTo(cx + span * 0.35 - 1, feet)
  ctx.moveTo(cx + span, feet - 10)
  ctx.lineTo(cx + span + 1, feet)
  ctx.stroke()
}

function animalShadow(ctx: CanvasRenderingContext2D, cx: number, feet: number, rx: number) {
  ctx.fillStyle = "rgba(20,12,8,0.28)"
  ctx.beginPath()
  ctx.ellipse(cx, feet + 1, rx, 4, 0, 0, Math.PI * 2)
  ctx.fill()
}

function drawDeer(ctx: CanvasRenderingContext2D, ox: number, oy: number) {
  const cx = ox + 32
  const feet = oy + 56
  animalShadow(ctx, cx, feet, 16)
  const body = "#c47a3a"
  const dark = "#8a4a22"
  drawLegs(ctx, cx, feet, 10, 3.2, dark)
  ellipse(ctx, cx, feet - 16, 16, 10, body)
  ellipse(ctx, cx + 14, feet - 22, 7, 6, body)
  ctx.strokeStyle = dark
  ctx.lineWidth = 1.8
  ctx.beginPath()
  ctx.moveTo(cx + 16, feet - 28)
  ctx.lineTo(cx + 14, feet - 36)
  ctx.lineTo(cx + 10, feet - 32)
  ctx.moveTo(cx + 16, feet - 28)
  ctx.lineTo(cx + 20, feet - 36)
  ctx.lineTo(cx + 23, feet - 31)
  ctx.stroke()
  ctx.fillStyle = WHITE
  ctx.beginPath()
  ctx.arc(cx + 16, feet - 23, 1.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = PUPIL
  ctx.beginPath()
  ctx.arc(cx + 16.4, feet - 23, 0.6, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = body
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(cx - 14, feet - 16)
  ctx.quadraticCurveTo(cx - 20, feet - 10, cx - 16, feet - 8)
  ctx.stroke()
}

function drawBoar(ctx: CanvasRenderingContext2D, ox: number, oy: number) {
  const cx = ox + 32
  const feet = oy + 56
  animalShadow(ctx, cx, feet, 15)
  const body = "#6a4428"
  drawLegs(ctx, cx, feet, 9, 3.6, "#4a2e18")
  ellipse(ctx, cx, feet - 14, 16, 9, body)
  ellipse(ctx, cx + 14, feet - 16, 8, 6, "#8a5a32")
  ctx.fillStyle = WHITE
  ctx.beginPath()
  ctx.moveTo(cx + 20, feet - 14)
  ctx.lineTo(cx + 26, feet - 12)
  ctx.lineTo(cx + 20, feet - 11)
  ctx.fill()
  ctx.fillStyle = PUPIL
  ctx.beginPath()
  ctx.arc(cx + 16, feet - 18, 1.1, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = "#3a2414"
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(cx - 8 + i * 3, feet - 24, 2, 5)
  }
}

function drawBear(ctx: CanvasRenderingContext2D, ox: number, oy: number) {
  const cx = ox + 32
  const feet = oy + 56
  animalShadow(ctx, cx, feet, 17)
  const body = "#6b3d1c"
  drawLegs(ctx, cx, feet, 9, 4.2, "#4a2810")
  ellipse(ctx, cx, feet - 16, 17, 12, body)
  ellipse(ctx, cx + 12, feet - 22, 9, 8, body)
  ellipse(ctx, cx + 8, feet - 30, 3.2, 2.6, body)
  ellipse(ctx, cx + 16, feet - 30, 3.2, 2.6, body)
  ctx.fillStyle = PUPIL
  ctx.beginPath()
  ctx.arc(cx + 14, feet - 23, 1.3, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = "#d4a07a"
  ctx.beginPath()
  ctx.ellipse(cx + 18, feet - 18, 3.5, 2.4, 0, 0, Math.PI * 2)
  ctx.fill()
}

function drawWolf(ctx: CanvasRenderingContext2D, ox: number, oy: number) {
  const cx = ox + 32
  const feet = oy + 56
  animalShadow(ctx, cx, feet, 15)
  const body = "#8a8f9a"
  drawLegs(ctx, cx, feet, 10, 2.8, "#5a6068")
  ellipse(ctx, cx, feet - 16, 15, 8, body)
  ellipse(ctx, cx + 14, feet - 22, 7, 5.5, body)
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.moveTo(cx + 10, feet - 26)
  ctx.lineTo(cx + 8, feet - 34)
  ctx.lineTo(cx + 14, feet - 26)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(cx + 16, feet - 26)
  ctx.lineTo(cx + 20, feet - 34)
  ctx.lineTo(cx + 20, feet - 24)
  ctx.fill()
  ctx.fillStyle = PUPIL
  ctx.beginPath()
  ctx.arc(cx + 16, feet - 22, 1.1, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = body
  ctx.lineWidth = 2.4
  ctx.beginPath()
  ctx.moveTo(cx - 14, feet - 16)
  ctx.quadraticCurveTo(cx - 22, feet - 8, cx - 10, feet - 10)
  ctx.stroke()
}

function drawPine(ctx: CanvasRenderingContext2D, ox: number, oy: number) {
  ctx.fillStyle = WOOD
  ctx.fillRect(ox + 29, oy + 44, 6, 14)
  ctx.fillStyle = "#1f4a28"
  for (const [y, w] of [
    [18, 22],
    [28, 26],
    [38, 22],
  ] as const) {
    ctx.beginPath()
    ctx.moveTo(ox + 32, oy + y)
    ctx.lineTo(ox + 32 + w / 2, oy + y + 16)
    ctx.lineTo(ox + 32 - w / 2, oy + y + 16)
    ctx.closePath()
    ctx.fill()
  }
  ctx.fillStyle = "#3d6a32"
  ctx.beginPath()
  ctx.moveTo(ox + 32, oy + 12)
  ctx.lineTo(ox + 44, oy + 30)
  ctx.lineTo(ox + 20, oy + 30)
  ctx.closePath()
  ctx.fill()
}

function drawOreGold(ctx: CanvasRenderingContext2D, ox: number, oy: number) {
  ctx.fillStyle = ROCK
  ctx.beginPath()
  ctx.moveTo(ox + 16, oy + 50)
  ctx.lineTo(ox + 12, oy + 30)
  ctx.lineTo(ox + 30, oy + 18)
  ctx.lineTo(ox + 52, oy + 28)
  ctx.lineTo(ox + 50, oy + 50)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = "#e0c36a"
  ctx.beginPath()
  ctx.moveTo(ox + 24, oy + 36)
  ctx.lineTo(ox + 30, oy + 22)
  ctx.lineTo(ox + 42, oy + 28)
  ctx.lineTo(ox + 38, oy + 42)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = "#fff6d4"
  ctx.beginPath()
  ctx.moveTo(ox + 28, oy + 30)
  ctx.lineTo(ox + 32, oy + 24)
  ctx.lineTo(ox + 36, oy + 30)
  ctx.closePath()
  ctx.fill()
}

function caveHall(ctx: CanvasRenderingContext2D, ox: number, oy: number, variant: number) {
  const cx = ox + 32
  const base = oy + 56
  ctx.fillStyle = "rgba(20,12,8,0.3)"
  ctx.beginPath()
  ctx.ellipse(cx, base + 2, 26, 6, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = ROCK
  ctx.beginPath()
  if (variant === 0) {
    ctx.moveTo(cx - 26, base)
    ctx.quadraticCurveTo(cx - 28, oy + 18, cx - 6, oy + 10)
    ctx.quadraticCurveTo(cx, oy + 4, cx + 10, oy + 12)
    ctx.quadraticCurveTo(cx + 30, oy + 16, cx + 26, base)
  } else if (variant === 1) {
    rr(ctx, cx - 24, oy + 14, 48, 42, 8)
  } else {
    ctx.moveTo(cx - 20, base)
    ctx.lineTo(cx - 16, oy + 12)
    ctx.lineTo(cx + 8, oy + 8)
    ctx.lineTo(cx + 24, oy + 18)
    ctx.lineTo(cx + 22, base)
  }
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = LINE
  ctx.lineWidth = 1.3
  ctx.stroke()
  ctx.fillStyle = ROCK_L
  ctx.beginPath()
  ctx.ellipse(cx - 8, oy + 24, 8, 5, -0.4, 0, Math.PI * 2)
  ctx.fill()
  mossDots(ctx, cx + 4, oy + 16, 6)
  ctx.fillStyle = GRASS
  ctx.beginPath()
  ctx.ellipse(cx, oy + 14, 18, 6, 0, 0, Math.PI)
  ctx.fill()
  ctx.fillStyle = DOOR
  ctx.beginPath()
  rr(ctx, cx - 6, base - 22, 12, 20, 4)
  ctx.fill()
  ctx.strokeStyle = LINE
  ctx.stroke()
  ctx.fillStyle = "#c9a45a"
  ctx.beginPath()
  ctx.arc(cx + 3, base - 12, 1.4, 0, Math.PI * 2)
  ctx.fill()
  if (variant === 0) {
    ctx.fillStyle = "#f0c36a"
    ctx.beginPath()
    ctx.arc(cx, oy + 22, 3.2, 0, Math.PI * 2)
    ctx.fill()
  }
}

function bakeAtlas() {
  const c = makeCanvas(COLS * CELL, ROWS * CELL)
  const ctx = ctx2d(c)
  ctx.clearRect(0, 0, COLS * CELL, ROWS * CELL)
  const cell = (i: number) => ({ x: (i % COLS) * CELL, y: Math.floor(i / COLS) * CELL })
  const put = (i: number, fn: (x: number, y: number) => void) => {
    const p = cell(i)
    fn(p.x, p.y)
  }

  put(SPR.levyClub, (x, y) => caveHuman(ctx, x, y, "club"))
  put(SPR.levyAxe, (x, y) => caveHuman(ctx, x, y, "axe"))
  put(SPR.levyCarry, (x, y) => caveHuman(ctx, x, y, "carry"))
  put(SPR.guard, (x, y) => caveHuman(ctx, x, y, "spear"))
  put(SPR.warden, (x, y) => caveHuman(ctx, x, y, "bow"))
  put(SPR.ashrider, (x, y) => caveHuman(ctx, x, y, "ride"))
  put(SPR.hearth, (x, y) => caveHall(ctx, x, y, 0))
  put(SPR.yard, (x, y) => {
    caveHall(ctx, x, y, 1)
    ctx.fillStyle = FUR_L
    ctx.fillRect(x + 44, y + 18, 3, 22)
    ctx.beginPath()
    ctx.moveTo(x + 47, y + 18)
    ctx.lineTo(x + 58, y + 24)
    ctx.lineTo(x + 47, y + 30)
    ctx.fill()
  })
  put(SPR.lodge, (x, y) => caveHall(ctx, x, y, 2))
  put(SPR.camp, (x, y) => {
    ctx.fillStyle = WOOD
    ctx.fillRect(x + 14, y + 36, 36, 8)
    ctx.fillRect(x + 18, y + 28, 28, 8)
    ctx.fillStyle = MOSS
    ctx.fillRect(x + 20, y + 22, 8, 16)
    ctx.fillRect(x + 36, y + 24, 10, 14)
    ellipse(ctx, x + 32, y + 52, 16, 5, "rgba(20,12,8,0.25)", false)
  })
  put(SPR.pit, (x, y) => {
    ellipse(ctx, x + 32, y + 40, 22, 12, "#5a6068")
    ellipse(ctx, x + 32, y + 40, 12, 6, "#2a2e34", false)
    ctx.fillStyle = ROCK_L
    ctx.fillRect(x + 26, y + 28, 12, 8)
    mossDots(ctx, x + 32, y + 22, 4)
  })
  put(SPR.granary, (x, y) => {
    ellipse(ctx, x + 32, y + 40, 18, 16, FUR_L)
    ellipse(ctx, x + 32, y + 32, 12, 10, "#8a6a28")
    ctx.fillStyle = DOOR
    ctx.beginPath()
    ctx.arc(x + 32, y + 44, 5, 0, Math.PI * 2)
    ctx.fill()
  })
  put(SPR.grain, (x, y) => {
    ctx.fillStyle = "#d4b85a"
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2
      ctx.beginPath()
      ctx.ellipse(x + 32 + Math.cos(a) * 8, y + 40 + Math.sin(a) * 4, 5, 10, a, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = GRASS
    ctx.fillRect(x + 28, y + 46, 8, 8)
  })
  put(SPR.timber, (x, y) => {
    ctx.fillStyle = WOOD
    ctx.fillRect(x + 29, y + 46, 6, 12)
    ctx.fillStyle = "#2f5a28"
    ctx.beginPath()
    ctx.ellipse(x + 32, y + 28, 18, 16, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = "#3d6a3a"
    ctx.beginPath()
    ctx.ellipse(x + 26, y + 24, 12, 11, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = "#4a8a38"
    ctx.beginPath()
    ctx.ellipse(x + 38, y + 26, 10, 9, 0, 0, Math.PI * 2)
    ctx.fill()
  })
  put(SPR.ore, (x, y) => {
    ctx.fillStyle = ROCK
    ctx.beginPath()
    ctx.moveTo(x + 18, y + 50)
    ctx.lineTo(x + 12, y + 28)
    ctx.lineTo(x + 26, y + 14)
    ctx.lineTo(x + 50, y + 22)
    ctx.lineTo(x + 54, y + 50)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = ROCK_L
    ctx.beginPath()
    ctx.moveTo(x + 22, y + 32)
    ctx.lineTo(x + 30, y + 18)
    ctx.lineTo(x + 42, y + 26)
    ctx.lineTo(x + 36, y + 40)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = "#9aa8b8"
    ctx.beginPath()
    ctx.moveTo(x + 28, y + 28)
    ctx.lineTo(x + 34, y + 20)
    ctx.lineTo(x + 38, y + 28)
    ctx.closePath()
    ctx.fill()
  })
  put(SPR.relic, (x, y) => {
    ctx.fillStyle = "#e0c36a"
    ctx.beginPath()
    ctx.moveTo(x + 32, y + 14)
    ctx.lineTo(x + 44, y + 32)
    ctx.lineTo(x + 32, y + 50)
    ctx.lineTo(x + 20, y + 32)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = "#8a6a28"
    ctx.stroke()
    ellipse(ctx, x + 32, y + 32, 6, 6, "#fff6d4", false)
  })
  put(SPR.palm, (x, y) => {
    ctx.fillStyle = WOOD
    ctx.fillRect(x + 29, y + 28, 6, 26)
    ctx.fillStyle = "#2f6a28"
    for (let i = 0; i < 6; i++) {
      const a = -2.4 + i * 0.8
      ctx.beginPath()
      ctx.ellipse(x + 32 + Math.cos(a) * 10, y + 24 + Math.sin(a) * 4, 10, 3.4, a, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = "#4a8a38"
    ctx.beginPath()
    ctx.ellipse(x + 32, y + 20, 8, 5, 0, 0, Math.PI * 2)
    ctx.fill()
  })
  put(SPR.rock, (x, y) => {
    ctx.fillStyle = ROCK
    ctx.beginPath()
    ctx.moveTo(x + 16, y + 50)
    ctx.lineTo(x + 12, y + 32)
    ctx.lineTo(x + 28, y + 22)
    ctx.lineTo(x + 48, y + 28)
    ctx.lineTo(x + 50, y + 50)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = ROCK_L
    ctx.beginPath()
    ctx.moveTo(x + 24, y + 34)
    ctx.lineTo(x + 30, y + 26)
    ctx.lineTo(x + 40, y + 32)
    ctx.closePath()
    ctx.fill()
    mossDots(ctx, x + 30, y + 26, 3)
  })
  put(SPR.grass, (x, y) => {
    ctx.fillStyle = GRASS
    for (let i = 0; i < 7; i++) {
      ctx.beginPath()
      ctx.moveTo(x + 16 + i * 5, y + 48)
      ctx.quadraticCurveTo(x + 18 + i * 5, y + 28, x + 14 + i * 5 + (i % 2) * 4, y + 18)
      ctx.quadraticCurveTo(x + 20 + i * 5, y + 30, x + 18 + i * 5, y + 48)
      ctx.fill()
    }
  })
  put(SPR.pine, (x, y) => drawPine(ctx, x, y))
  put(SPR.oreGold, (x, y) => drawOreGold(ctx, x, y))
  put(SPR.deer, (x, y) => drawDeer(ctx, x, y))
  put(SPR.boar, (x, y) => drawBoar(ctx, x, y))
  put(SPR.bear, (x, y) => drawBear(ctx, x, y))
  put(SPR.wolf, (x, y) => drawWolf(ctx, x, y))
  return c
}

function bakeMoss() {
  const c = makeCanvas(128, 128)
  const ctx = ctx2d(c)
  ctx.fillStyle = "#2c4328"
  ctx.fillRect(0, 0, 128, 128)
  for (let i = 0; i < 48; i++) {
    ctx.fillStyle = i % 4 === 0 ? "#3d5a32" : i % 4 === 1 ? "#243526" : "#35502f"
    ctx.beginPath()
    ctx.ellipse((i * 47) % 128, (i * 91) % 128, 16 + (i % 7), 9 + (i % 5), i * 0.4, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = "rgba(74,122,56,0.4)"
  for (let i = 0; i < 22; i++) {
    ctx.beginPath()
    ctx.ellipse((i * 23) % 128, (i * 61) % 128, 7, 3.5, 0.5, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = "rgba(90,70,40,0.18)"
  for (let i = 0; i < 8; i++) {
    ctx.beginPath()
    ctx.ellipse((i * 37) % 128, (i * 53) % 128, 10, 4, 0.2, 0, Math.PI * 2)
    ctx.fill()
  }
  return c
}

export function getAtlas() {
  if (!atlas) atlas = bakeAtlas()
  return atlas
}

export function getMoss() {
  if (!moss) moss = bakeMoss()
  return moss
}

export function blit(
  ctx: CanvasRenderingContext2D,
  id: number,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
) {
  const a = getAtlas()
  const sx = (id % COLS) * CELL
  const sy = Math.floor(id / COLS) * CELL
  ctx.drawImage(a, sx, sy, CELL, CELL, dx, dy, dw, dh)
}
