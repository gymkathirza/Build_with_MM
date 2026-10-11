"use client"

import Link from "next/link"
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react"
import { Anvil, Hammer, Pause, Trees, Wheat } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Overlay } from "@/components/game/overlay"
import { PearlFlourish } from "@/components/game/pearl-flourish"
import { PearlLogo } from "@/components/game/pearl-logo"
import { WealthIcon } from "@/components/game/wealth-icon"
import {
  AGE_NAMES,
  BUILDING_LABEL,
  COSTS,
  TICK_HZ,
  UNIT_LABEL,
  type BuildingType,
  type UnitType,
} from "@/lib/sim/catalog"
import {
  type Building,
  type Unit,
  type World,
  canAfford,
  createWorld,
  entityAt,
  issueAttack,
  issueAttackMove,
  issueDefend,
  issueGather,
  issueHalt,
  issueMove,
  placeBuilding,
  popUsed,
  queueTrain,
  startAge,
  tick,
  upgradeBuilding,
} from "@/lib/sim/engine"
import { tickAi } from "@/lib/sim/ai"
import { type Cam, drawWorld, nodeLabel, plateGround, screenToWorld } from "@/lib/sim/draw"
import { createTelemetry, pushEvent, pushFrame } from "@/lib/obs/telemetry"
import { DEFAULT_TUNED, type DrawQuality, type Tuned } from "@/lib/ml/score"
import { factionById, mapById } from "@/lib/game-data"
import { hallPositions, specFor } from "@/lib/sim/maps"
import { personaById } from "@/lib/sim/personas"
import tunedJson from "@/lib/ml/tuned.json"

type Pending = { kind: "build"; type: BuildingType } | { kind: "attackMove" } | null

const LOADED_TUNED: Tuned = {
  ai: { ...DEFAULT_TUNED.ai, ...tunedJson.ai },
  quality: tunedJson.quality as DrawQuality,
  lodDistance: tunedJson.lodDistance,
  round: tunedJson.round,
}

function difficultyAi(id: string, base: Tuned["ai"]): Tuned["ai"] {
  if (id === "squire") return { ...base, attackAtArmy: base.attackAtArmy + 3, gatherBias: 0.82 }
  if (id === "captain") return { ...base, attackAtArmy: base.attackAtArmy + 1 }
  if (id === "warlord") return { ...base, attackAtArmy: Math.max(3, base.attackAtArmy - 1), militaryRatio: 0.65 }
  if (id === "mythic") return { ...base, attackAtArmy: 3, militaryRatio: 0.72, agePriority: 0.85 }
  return base
}

export function MatchView({
  factionId,
  enemyFaction = "gilded",
  bot = false,
  difficulty = "marshal",
  mapId = "vast-mere",
  personaId = "balanced",
}: {
  factionId: string
  enemyFaction?: string
  bot?: boolean
  difficulty?: string
  mapId?: string
  personaId?: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const spec = specFor(mapId)
  const halls = hallPositions(spec)
  const camRef = useRef<Cam>({ x: halls.p0.x + 6, y: halls.p0.y, z: spec.size >= 200 ? 12 : 16, w: 800, h: 480 })
  const keysRef = useRef<Set<string>>(new Set())
  const telRef = useRef(createTelemetry())
  const pendingRef = useRef<Pending>(null)
  const dragRef = useRef<{ x: number; y: number; sx: number; sy: number } | null>(null)
  const pausedRef = useRef(false)
  const selectedDrawRef = useRef<Set<number>>(new Set())
  const qualityRef = useRef<DrawQuality>(LOADED_TUNED.quality)
  const obsLineRef = useRef<HTMLParagraphElement>(null)
  const grainRef = useRef<HTMLSpanElement>(null)
  const timberRef = useRef<HTMLSpanElement>(null)
  const oreRef = useRef<HTMLSpanElement>(null)
  const relicsRef = useRef<HTMLSpanElement>(null)
  const ageRef = useRef<HTMLSpanElement>(null)
  const popRef = useRef<HTMLSpanElement>(null)
  const pressRef = useRef<HTMLSpanElement>(null)
  const orderChipRef = useRef<HTMLSpanElement>(null)
  const camEventAt = useRef(0)

  const [tuned] = useState<Tuned>(() => {
    const persona = personaById(personaId)
    return {
      ...LOADED_TUNED,
      ai: difficultyAi(difficulty, { ...LOADED_TUNED.ai, ...persona.params }),
    }
  })
  const [world] = useState<World>(() =>
    createWorld(factionId, enemyFaction, tuned.ai, { mapId, persona: personaId }),
  )
  const [selected, setSelected] = useState<number[]>([])
  const [paused, setPaused] = useState(false)
  const [pending, setPending] = useState<Pending>(null)
  const [winner, setWinner] = useState<0 | 1 | null>(null)
  const [endPearl, setEndPearl] = useState(false)
  const [hudPulse, setHudPulse] = useState(0)
  const [startPearl, setStartPearl] = useState(true)

  useEffect(() => {
    const t = window.setTimeout(() => setStartPearl(false), 1900)
    return () => window.clearTimeout(t)
  }, [])

  useEffect(() => {
    pausedRef.current = paused
  }, [paused])
  useEffect(() => {
    pendingRef.current = pending
  }, [pending])
  useEffect(() => {
    selectedDrawRef.current = new Set(selected)
  }, [selected])

  const paintHud = useCallback((fps: number, frameMs: number, simMs: number) => {
    const tel = telRef.current
    const p0 = world.players[0]
    if (grainRef.current) {
      grainRef.current.textContent = String(Math.floor(p0.grain))
      grainRef.current.classList.toggle("text-destructive", p0.grain < 80)
    }
    if (timberRef.current) {
      timberRef.current.textContent = String(Math.floor(p0.timber))
      timberRef.current.classList.toggle("text-destructive", p0.timber < 60)
    }
    if (oreRef.current) {
      oreRef.current.textContent = String(Math.floor(p0.ore))
      oreRef.current.classList.toggle("text-destructive", p0.ore < 40)
    }
    if (relicsRef.current) relicsRef.current.textContent = String(Math.floor(p0.relics))
    if (ageRef.current) ageRef.current.textContent = AGE_NAMES[p0.age]
    if (popRef.current) popRef.current.textContent = `Banners ${popUsed(world, 0)}/${world.popCap}`
    if (obsLineRef.current) {
      const last = tel.frames.at(-1)
      obsLineRef.current.textContent = last
        ? `${fps.toFixed(0)} fps · ${frameMs.toFixed(1)} ms\nsim ${simMs.toFixed(2)} ms · in ${tel.lastInputMs.toFixed(0)} ms\nclicks ${tel.clicks} · fail ${tel.failedOrders} · deaths ${tel.deaths}\npan ${tel.cameraMoves} · lod ${qualityRef.current}\ngather hop ${world.gather.hops} · idle ${world.gather.idleDeplete} · wrong ${world.gather.wrong}\nbanners ${world.units.filter((u) => u.owner === 0 && u.type !== "levy").length} · ashriders ${world.units.filter((u) => u.owner === 0 && u.type === "ashrider").length}\n${(() => {
            const hall = world.buildings.find((b) => b.owner === 0 && b.type === "hearth" && b.done)
            if (!hall) return "hearth lost"
            const press = world.units.filter(
              (u) => u.owner === 1 && Math.hypot(u.x - hall.x, u.y - hall.y) < 22,
            ).length
            return press ? `hearth pressed ×${press}` : "hearth clear"
          })()}\nplate ${mapId}`
        : "warming…"
    }
    if (pressRef.current) {
      const hall = world.buildings.find((b) => b.owner === 0 && b.type === "hearth" && b.done)
      const press = hall
        ? world.units.filter((u) => u.owner === 1 && Math.hypot(u.x - hall.x, u.y - hall.y) < 22).length
        : 0
      pressRef.current.hidden = press === 0
      pressRef.current.textContent = press ? `Hearth pressed ×${press}` : ""
    }
    if (orderChipRef.current) {
      const id = [...selectedDrawRef.current][0]
      const u = world.units.find((x) => x.id === id)
      const b = world.buildings.find((x) => x.id === id)
      if (u) {
        orderChipRef.current.hidden = false
        orderChipRef.current.textContent =
          u.order.t === "gather"
            ? gatherLine(world, u)
            : u.order.t === "return"
              ? "Hauling home"
              : u.order.t === "attack"
                ? "In the fray"
                : u.order.t === "attackMove"
                  ? u.type === "ashrider"
                    ? "Riders hooking"
                    : "Marching"
                  : u.order.t === "defend"
                    ? "Holding"
                    : u.order.t === "build"
                      ? "Raising"
                      : u.order.t === "move"
                        ? "On the path"
                        : "Idle"
      } else if (b) {
        orderChipRef.current.hidden = false
        orderChipRef.current.textContent = BUILDING_LABEL[b.type]
      } else {
        orderChipRef.current.hidden = true
        orderChipRef.current.textContent = ""
      }
    }
    setHudPulse((n) => n + 1)
  }, [world, mapId])

  useLayoutEffect(() => {
    let canvas = canvasRef.current
    let ctx = canvas?.getContext("2d") ?? null
    let raf = 0
    let watchdog = 0
    let retry = 0
    let last = performance.now()
    let acc = 0
    let frames = 0
    let fpsT = last
    let fps = 60
    let hudAt = performance.now()
    let postedWin = false
    let sampleN = 0
    let lastObsPost = 0
    let stopped = false
    const p0Ai = bot
      ? { ...tuned.ai, gatherBias: 0.8, attackAtArmy: tuned.ai.attackAtArmy + 2 }
      : null

    const attach = () => {
      if (stopped) return false
      canvas = canvasRef.current
      ctx = canvas?.getContext("2d") ?? null
      return Boolean(canvas && ctx)
    }

    const loop = (now: number) => {
      if (stopped) return
      if (!canvas || !ctx) {
        attach()
        raf = requestAnimationFrame(loop)
        return
      }
      try {
      const dt = Math.min(0.033, (now - last) / 1000)
      last = now
      frames++
      if (now - fpsT > 500) {
        fps = (frames * 1000) / (now - fpsT)
        frames = 0
        fpsT = now
        if (fps < 40) qualityRef.current = 0
        else if (fps < 52) qualityRef.current = 1
        else qualityRef.current = tuned.quality
      }
      const cam = camRef.current
      const parent = canvas.parentElement
      const w = Math.max(parent?.clientWidth || 0, 320)
      const h = Math.max(parent?.clientHeight || 0, 200)
      const dpr = Math.min(1.5, window.devicePixelRatio || 1)
      const bw = Math.floor(w * dpr)
      const bh = Math.floor(h * dpr)
      if (canvas.width !== bw || canvas.height !== bh) {
        canvas.width = bw
        canvas.height = bh
      }
      cam.w = w
      cam.h = h
      const keys = keysRef.current
      const pan = 28 / cam.z
      let panning = false
      if (keys.has("KeyW") || keys.has("ArrowUp")) {
        cam.y -= pan * dt * 60
        panning = true
      }
      if (keys.has("KeyS") || keys.has("ArrowDown")) {
        cam.y += pan * dt * 60
        panning = true
      }
      if (keys.has("KeyA") || keys.has("ArrowLeft")) {
        cam.x -= pan * dt * 60
        panning = true
      }
      if (keys.has("KeyD") || keys.has("ArrowRight")) {
        cam.x += pan * dt * 60
        panning = true
      }
      if (panning && now - camEventAt.current > 280) {
        camEventAt.current = now
        pushEvent(telRef.current, "camera", "pan")
      }
      cam.x = Math.max(8, Math.min(world.size - 8, cam.x))
      cam.y = Math.max(8, Math.min(world.size - 8, cam.y))

      let simMs = 0
      if (!pausedRef.current && world.winner === null) {
        acc += dt
        const step = 1 / TICK_HZ
        let safety = 0
        while (acc >= step && safety++ < 2) {
          const a = performance.now()
          if (p0Ai) tickAi(world, 0, p0Ai)
          tickAi(world, 1, tuned.ai, personaById(personaId))
          tick(world)
          simMs += performance.now() - a
          acc -= step
          const evs = world.events
          for (let i = 0; i < evs.length; i++) {
            const ev = evs[i]
            if (ev.k === "death") pushEvent(telRef.current, "death", ev.type)
            else if (ev.k === "failed") pushEvent(telRef.current, "failed", ev.why)
          }
          evs.length = 0
        }
        if (acc > step * 2) acc = 0
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.fillStyle = plateGround(world.mapId)
      ctx.fillRect(0, 0, w, h)
      const t0 = performance.now()
      try {
        drawWorld(ctx, world, cam, selectedDrawRef.current, qualityRef.current, tuned.lodDistance, now, w, h)
      } catch (err) {
        console.error(err)
      }
      const drag = dragRef.current
      if (drag) {
        ctx.fillStyle = "rgba(243,212,138,0.12)"
        ctx.fillRect(drag.sx, drag.sy, drag.x - drag.sx, drag.y - drag.sy)
        ctx.strokeStyle = "rgba(243,212,138,0.9)"
        ctx.strokeRect(drag.sx, drag.sy, drag.x - drag.sx, drag.y - drag.sy)
      }
      const frameMs = performance.now() - t0 + simMs
      if ((++sampleN & 3) === 0) {
        pushFrame(telRef.current, {
          fps,
          frameMs,
          simMs,
          inputMs: telRef.current.lastInputMs,
          entities: world.units.length + world.buildings.length,
        })
      }
      if (now - hudAt > 400) {
        hudAt = now
        try {
          paintHud(fps, frameMs, simMs)
        } catch (err) {
          console.error(err)
        }
        if (now - lastObsPost > 2500 && fps >= 24) {
          lastObsPost = now
          const body = JSON.stringify({
            fps,
            frameMs,
            simMs,
            inputMs: telRef.current.lastInputMs,
            entities: world.units.length + world.buildings.length,
            quality: qualityRef.current,
            lod: tuned.lodDistance,
            mapId: world.mapId,
            persona: world.persona,
            pop: popUsed(world, 0),
            popCap: world.popCap,
            gatherTravel: world.gather.travel,
            gatherNearest: world.gather.nearest,
            gatherWrong: world.gather.wrong,
            gatherHops: world.gather.hops,
            gatherIdle: world.gather.idleDeplete,
          })
          if (navigator.sendBeacon) {
            navigator.sendBeacon("/api/obs", new Blob([body], { type: "application/json" }))
          } else {
            void fetch("/api/obs", { method: "POST", body, keepalive: true })
          }
        }
      }
      if (!postedWin && world.winner !== null) {
        postedWin = true
        setWinner(world.winner)
        setEndPearl(true)
      }
      } catch (err) {
        console.error(err)
      }
      raf = requestAnimationFrame(loop)
    }
    if (!attach()) {
      retry = window.setInterval(() => {
        if (attach()) {
          window.clearInterval(retry)
          retry = 0
          loop(performance.now())
        }
      }, 50)
    } else {
      loop(performance.now())
    }
    watchdog = window.setInterval(() => {
      if (!stopped && performance.now() - last > 250) loop(performance.now())
    }, 100)
    return () => {
      stopped = true
      cancelAnimationFrame(raf)
      window.clearInterval(watchdog)
      if (retry) window.clearInterval(retry)
    }
  }, [bot, paintHud, personaId, tuned, world])

  useEffect(() => {
    const canvas = canvasRef.current
    const down = (e: KeyboardEvent) => {
      keysRef.current.add(e.code)
      if (e.code === "Escape") {
        if (pendingRef.current) setPending(null)
        else setPaused((p) => !p)
      }
      if (e.code === "KeyH") issueHalt(world, selectedDrawRef.current.size ? [...selectedDrawRef.current] : [])
      if (e.code === "KeyG") {
        const hall = world.buildings.find((b) => b.owner === 0 && b.type === "hearth" && b.done)
        const ids = selectedDrawRef.current.size ? [...selectedDrawRef.current] : []
        if (hall && ids.length) issueDefend(world, ids, hall.x, hall.y)
      }
      if (e.code === "KeyF") setPending({ kind: "attackMove" })
      if (e.code === "Space") {
        e.preventDefault()
        setPaused((p) => !p)
      }
    }
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.code)
    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      const cam = camRef.current
      cam.z = Math.max(6, Math.min(36, cam.z * (e.deltaY > 0 ? 0.92 : 1.08)))
      pushEvent(telRef.current, "camera", "zoom")
    }
    window.addEventListener("keydown", down)
    window.addEventListener("keyup", up)
    canvas?.addEventListener("wheel", wheel, { passive: false })
    return () => {
      window.removeEventListener("keydown", down)
      window.removeEventListener("keyup", up)
      canvas?.removeEventListener("wheel", wheel)
    }
  }, [world])

  const selUnits = world.units.filter((u) => selected.includes(u.id))
  const selBuild = world.buildings.find((b) => selected.includes(b.id))
  const p = world.players[0]
  const faction = factionById(factionId)

  function orderAt(sx: number, sy: number, ids: number[]) {
    const t0 = performance.now()
    const cam = camRef.current
    const pos = screenToWorld(cam, sx, sy)
    const hit = entityAt(world, pos.x, pos.y, 2.2)
    const own = world.units.filter((u) => ids.includes(u.id) && u.owner === 0).map((u) => u.id)
    pushEvent(telRef.current, "click", "order")
    if (pending?.kind === "build") {
      const b = placeBuilding(world, 0, pending.type, pos.x, pos.y, own)
      setPending(null)
      if (!b) pushEvent(telRef.current, "failed", "build")
      telRef.current.lastInputMs = performance.now() - t0
      return
    }
    if (!own.length) {
      telRef.current.lastInputMs = performance.now() - t0
      return
    }
    if (hit && hit.kind === "node") {
      if (!issueGather(world, own, hit.id, { lock: true })) pushEvent(telRef.current, "failed", "gather")
    } else if (hit && hit.owner === 1) {
      issueAttack(world, own, hit.id)
    } else if (pending?.kind === "attackMove") {
      issueAttackMove(world, own, pos.x, pos.y)
      setPending(null)
    } else {
      issueMove(world, own, pos.x, pos.y)
    }
    telRef.current.lastInputMs = performance.now() - t0
  }

  function selectAt(sx: number, sy: number, additive: boolean) {
    const pos = screenToWorld(camRef.current, sx, sy)
    const hit = entityAt(world, pos.x, pos.y, 2.1)
    pushEvent(telRef.current, "click", "select")
    const next = additive ? [...selected] : []
    if (hit && hit.kind !== "node") next.push(hit.id)
    setSelected(next)
  }

  return (
    <div className="relative flex h-dvh max-h-dvh flex-col overflow-hidden bg-[#140e0a] text-foreground">
      <header className="relative z-20 flex shrink-0 flex-wrap items-center gap-2 border-b border-primary/25 bg-black/55 px-2 py-1.5">
        <PearlLogo size={28} className="hidden shrink-0 sm:block" />
        <p className="font-heading hidden text-[11px] tracking-[0.28em] text-primary uppercase sm:block">
          {faction.name}
        </p>
        <p className="hidden max-w-[12rem] truncate text-[11px] text-muted-foreground sm:block">
          {mapById(mapId).name} · {personaById(personaId).name}
        </p>
        <Chip icon={<Wheat className="size-3.5" />} label="Grain" valueRef={grainRef} initial={240} />
        <Chip icon={<Trees className="size-3.5" />} label="Timber" valueRef={timberRef} initial={220} />
        <Chip icon={<Anvil className="size-3.5" />} label="Ore" valueRef={oreRef} initial={110} />
        <Chip icon={<WealthIcon />} label="Relics" valueRef={relicsRef} initial={0} />
        <Badge variant="secondary" className="ml-auto font-heading tracking-wide">
          <span ref={ageRef}>{AGE_NAMES[p.age]}</span>
        </Badge>
        <span ref={popRef} className="text-xs tabular-nums text-muted-foreground">
          Banners {popUsed(world, 0)}/{world.popCap}
        </span>
        <Badge variant="outline" className="hidden tabular-nums sm:inline-flex">
          {selected.length ? `${selected.length} selected` : "none selected"}
        </Badge>
        <span
          ref={orderChipRef}
          hidden
          className="hidden max-w-[10rem] truncate text-[11px] text-primary sm:inline"
        />
        <span
          ref={pressRef}
          hidden
          className="font-heading text-[11px] tracking-wide text-destructive uppercase"
        />
        <Button size="icon-sm" variant="outline" aria-label="Pause" onClick={() => setPaused(true)}>
          <Pause />
        </Button>
      </header>

      <div
        className="relative min-h-0 flex-1 overflow-hidden"
        style={{ background: plateGround(mapId) }}
      >
        <canvas
          ref={(el) => {
            canvasRef.current = el
          }}
          className="absolute inset-0 block h-full w-full cursor-crosshair"
          style={{ background: plateGround(mapId) }}
          onContextMenu={(e) => e.preventDefault()}
          onPointerDown={(e) => {
            const r = e.currentTarget.getBoundingClientRect()
            const x = e.clientX - r.left
            const y = e.clientY - r.top
            if (e.button === 2 || e.ctrlKey) {
              orderAt(x, y, selected)
              return
            }
            dragRef.current = { x, y, sx: x, sy: y }
          }}
          onPointerMove={(e) => {
            if (!dragRef.current) return
            const r = e.currentTarget.getBoundingClientRect()
            dragRef.current.x = e.clientX - r.left
            dragRef.current.y = e.clientY - r.top
          }}
          onPointerUp={(e) => {
            const drag = dragRef.current
            dragRef.current = null
            if (!drag) return
            const r = e.currentTarget.getBoundingClientRect()
            const x = e.clientX - r.left
            const y = e.clientY - r.top
            const dx = Math.abs(x - drag.sx)
            const dy = Math.abs(y - drag.sy)
            if (dx < 4 && dy < 4) {
              if (pending) orderAt(x, y, selected)
              else selectAt(x, y, e.shiftKey)
              return
            }
            const a = screenToWorld(camRef.current, drag.sx, drag.sy)
            const b = screenToWorld(camRef.current, x, y)
            const minx = Math.min(a.x, b.x)
            const maxx = Math.max(a.x, b.x)
            const miny = Math.min(a.y, b.y)
            const maxy = Math.max(a.y, b.y)
            const ids = e.shiftKey ? [...selected] : []
            for (const u of world.units) {
              if (u.owner === 0 && u.x >= minx && u.x <= maxx && u.y >= miny && u.y <= maxy) {
                ids.push(u.id)
              }
            }
            setSelected(ids)
          }}
        />
        <aside className="pointer-events-none absolute top-2 right-2 z-10 w-[min(11rem,42vw)] rounded-sm border border-primary/25 bg-black/60 p-2 text-[10px] whitespace-pre-line text-primary">
          <p className="font-heading tracking-widest uppercase">Observatory</p>
          <p ref={obsLineRef} className="mt-1 tabular-nums text-muted-foreground">
            60 fps
          </p>
        </aside>
        {pending ? (
          <div className="pointer-events-none absolute top-2 left-2 z-10 max-w-[min(18rem,70vw)] rounded-sm border border-primary/40 bg-black/70 px-3 py-2 text-xs text-primary">
            <p className="font-heading tracking-widest uppercase">
              {pending.kind === "build" ? `Raise ${BUILDING_LABEL[pending.type]}` : "Strike-move"}
            </p>
            <p className="mt-0.5 text-muted-foreground">
              Click the field to place the order. Esc cancels.
            </p>
          </div>
        ) : null}
        <PearlFlourish play={startPearl} variant="start" />
        <PearlFlourish play={endPearl} variant="end" />
        {winner !== null ? (
          <Overlay
            title={winner === 0 ? "The field is yours" : "The hearth is gone"}
            description={
              winner === 0
                ? "The rival banner is broken. Build with Manon Mani records the skirmish as a win."
                : "Your Hearth Hall fell. Resign, or return to the hall and raise another."
            }
          >
            <Link href="/skirmish" className={buttonVariants({ className: "w-full" })}>
              Another skirmish
            </Link>
            <Link href="/" className={buttonVariants({ variant: "outline", className: "w-full" })}>
              Main menu
            </Link>
          </Overlay>
        ) : null}
      </div>

      <footer className="relative z-20 shrink-0 border-t border-primary/25 bg-black/75">
        <div className="grid gap-2 p-2 lg:grid-cols-[minmax(0,1.1fr)_14rem_13rem]" data-hud={hudPulse}>
          <Selection world={world} selectedUnits={selUnits} building={selBuild} />
          <div className="rounded-sm border border-primary/20 bg-card/50 p-2">
            <p className="mb-2 font-heading text-xs tracking-widest text-primary uppercase">Orders</p>
            <div className="grid grid-cols-3 gap-1.5">
              <Button size="sm" variant="outline" onClick={() => issueHalt(world, selected)}>
                Hold
              </Button>
              <Button
                size="sm"
                variant={pending?.kind === "attackMove" ? "default" : "outline"}
                onClick={() => setPending({ kind: "attackMove" })}
              >
                Strike-move
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const h = world.buildings.find((b) => b.owner === 0 && b.type === "hearth" && b.done)
                  if (h) issueDefend(world, selected.length ? selected : [...selectedDrawRef.current], h.x, h.y)
                }}
              >
                Defend
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const h = world.buildings.find((b) => b.owner === 0 && b.type === "hearth" && b.done)
                  const ids = selected.length ? selected : [...selectedDrawRef.current]
                  if (h && ids.length) issueMove(world, ids, h.x + 2, h.y)
                }}
              >
                Recall
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={
                  p.age >= 1 ||
                  !canAfford(p, "age1") ||
                  !world.buildings.some((b) => b.owner === 0 && b.type === "yard" && b.done)
                }
                onClick={() => startAge(world, 0)}
              >
                Advance Age
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={
                  !selBuild ||
                  selBuild.owner !== 0 ||
                  !selBuild.done ||
                  selBuild.tier >= 1 ||
                  (selBuild.type === "hearth" ? p.age >= 1 || !canAfford(p, "age1") : p.age < 1 || !canAfford(p, "upgrade"))
                }
                onClick={() => {
                  if (selBuild) upgradeBuilding(world, selBuild.id)
                }}
              >
                Shore hall
              </Button>
              {(["yard", "camp", "pit", "lodge", "granary"] as const).map((type) => (
                <Button
                  key={type}
                  size="sm"
                  variant={pending?.kind === "build" && pending.type === type ? "default" : "outline"}
                  className="h-auto flex-col py-1.5 text-[11px]"
                  disabled={!canAfford(p, type)}
                  onClick={() => setPending({ kind: "build", type })}
                >
                  <Hammer className="size-3.5" />
                  {BUILDING_LABEL[type]}
                </Button>
              ))}
            </div>
          </div>
          <TrainPanel world={world} selected={selBuild} onTrain={() => paintHud(60, 16, 0)} />
        </div>
        <p className="px-3 pb-1.5 text-[11px] text-muted-foreground">
          WASD pan · wheel zoom · left select · right order · F strike-move · G defend hearth · H hold ·
          Space pause · Esc cancel
        </p>
      </footer>

      {paused && winner === null ? (
        <Overlay
          title="The field is held"
          description="The plate is held. Resume the march, open the steward’s desk, or resign and furl the banners."
        >
          <Button className="w-full" onClick={() => setPaused(false)}>
            Resume
          </Button>
          <Link href="/settings" className={buttonVariants({ variant: "outline", className: "w-full" })}>
            Settings
          </Link>
          <Link href="/" className={buttonVariants({ variant: "destructive", className: "w-full" })}>
            Resign to menu
          </Link>
        </Overlay>
      ) : null}
    </div>
  )
}

function Chip({
  icon,
  label,
  valueRef,
  initial,
}: {
  icon: ReactNode
  label: string
  valueRef: RefObject<HTMLSpanElement | null>
  initial: number
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs tabular-nums">
      <span className="text-primary">{icon}</span>
      <span className="hidden sm:inline text-muted-foreground">{label}</span>
      <span ref={valueRef}>{initial}</span>
    </span>
  )
}

function gatherLine(world: World, u: Unit) {
  const order = u.order
  if (order.t !== "gather") return "Gathering"
  const n = world.nodes.find((q) => q.id === order.node)
  const name = n ? nodeLabel(n) : "a node"
  return order.lock ? `Locked on ${name}` : `Gathering nearest ${name}`
}

function Selection({
  world,
  selectedUnits,
  building,
}: {
  world: World
  selectedUnits: Unit[]
  building?: Building
}) {
  if (building) {
    return (
      <div className="rounded-sm border border-primary/20 bg-card/50 px-3 py-2">
        <h2 className="font-heading text-base text-primary">{BUILDING_LABEL[building.type]}</h2>
        <p className="text-xs text-muted-foreground">
          {building.done
            ? building.aging > 0
              ? `Age rite ${Math.max(0, Math.min(100, (1 - building.aging / COSTS.age1.time) * 100)).toFixed(0)}%`
              : world.units.some((u) => u.owner !== building.owner && Math.hypot(u.x - building.x, u.y - building.y) < 10)
                ? "Pressed — a sentry should hold this yard"
                : building.tier >= 1
                  ? "Shored"
                  : building.type === "camp" || building.type === "pit"
                    ? (() => {
                        const hearth = world.buildings.find((b) => b.owner === building.owner && b.type === "hearth")
                        const far = hearth && Math.hypot(building.x - hearth.x, building.y - hearth.y) > 16
                        return far ? "Far outpost — a levy should walk this trail" : "Standing"
                      })()
                    : "Standing"
            : `Raising ${((building.construct / building.constructMax) * 100).toFixed(0)}%`}
        </p>
        <Progress value={(building.hp / building.hpMax) * 100} className="mt-2" />
      </div>
    )
  }
  if (!selectedUnits.length) {
    return (
      <div className="rounded-sm border border-dashed border-primary/25 px-3 py-5 text-center text-sm text-muted-foreground">
        Select a levy or hall. Right-click grain, timber, ore, hunt, or relics to gather. Forge Age
        levies hop to the next nearest of that job; a right-click lock holds the node you picked.
        Ashriders ride first. Three riders hook an empty hearth. Idle levies walk a relic if no
        scout is free. A spare levy crews a far camp or pit. Pressed camps and pits draw a sentry.
        Recall
        walks banners home. The age rite waits if the hearth is struck.
      </div>
    )
  }
  const u = selectedUnits[0]
  return (
    <div className="rounded-sm border border-primary/20 bg-card/50 px-3 py-2">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-base text-primary">{UNIT_LABEL[u.type]}</h2>
        <Badge variant="outline">{selectedUnits.length} selected</Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        {u.hp < u.hpMax * 0.38
          ? "Wounded — falling back if the student holds the kite"
          : u.order.t === "gather"
            ? gatherLine(world, u)
            : u.order.t === "return"
              ? "Hauling home"
              : u.order.t === "build"
                ? "Raising"
                : u.order.t === "defend"
                  ? Math.hypot(
                      u.x - (world.buildings.find((b) => b.owner === 0 && b.type === "hearth")?.x ?? u.x),
                      u.y - (world.buildings.find((b) => b.owner === 0 && b.type === "hearth")?.y ?? u.y),
                    ) > 12
                    ? "Sentry on an outpost"
                    : "Holding the hearth"
                  : u.order.t === "attackMove"
                    ? u.type === "ashrider"
                      ? "Ashriders on the march"
                      : "Marching"
                    : u.order.t === "attack"
                      ? "In the fray"
                      : u.order.t === "move"
                        ? (() => {
                            const order = u.order
                            if (order.t !== "move") return "On the path"
                            const hearth = world.buildings.find((b) => b.owner === u.owner && b.type === "hearth")
                            const camp = world.buildings.find(
                              (b) =>
                                b.owner === u.owner &&
                                b.done &&
                                b.type === "camp" &&
                                Math.hypot(order.x - b.x, order.y - b.y) < 4 &&
                                hearth &&
                                Math.hypot(b.x - hearth.x, b.y - hearth.y) > 16,
                            )
                            return camp ? "Crewing a far camp" : "On the path"
                          })()
                        : "Idle"}
      </p>
      <Progress value={(u.hp / u.hpMax) * 100} className="mt-2" />
    </div>
  )
}

function TrainPanel({
  world,
  selected,
  onTrain,
}: {
  world: World
  selected?: Building
  onTrain: () => void
}) {
  const owned = world.buildings.filter((x) => x.owner === 0 && x.done)
  const b =
    selected && selected.owner === 0 && selected.done
      ? selected
      : owned.find((x) => x.type === "hearth")
  const options: { type: UnitType; buildingId: number }[] = []
  for (const hall of owned) {
    if (hall.type === "hearth") options.push({ type: "levy", buildingId: hall.id })
    if (hall.type === "yard") {
      options.push({ type: "guard", buildingId: hall.id }, { type: "warden", buildingId: hall.id })
    }
    if (hall.type === "lodge") options.push({ type: "ashrider", buildingId: hall.id })
  }
  return (
    <div className="rounded-sm border border-primary/20 bg-card/50 p-2">
      <p className="mb-2 font-heading text-xs tracking-widest text-primary uppercase">Hall queue</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <Button
            key={`${opt.buildingId}-${opt.type}`}
            size="sm"
            variant="outline"
            onClick={() => {
              queueTrain(world, opt.buildingId, opt.type)
              onTrain()
            }}
          >
            {UNIT_LABEL[opt.type]}
          </Button>
        ))}
      </div>
      <ul className="mt-2 space-y-1">
        {(b?.queue ?? []).map((q, i) => (
          <li key={i} className="text-xs">
            {UNIT_LABEL[q.type]} · {Math.max(0, q.max - q.t).toFixed(0)}s
            <Progress value={(q.t / q.max) * 100} className="mt-1" />
          </li>
        ))}
        {b && !b.queue.length ? (
          <li className="text-xs text-muted-foreground">
            {b.type === "yard" ? "Yard idle." : b.type === "lodge" ? "Lodge idle." : "Hall idle."}
          </li>
        ) : null}
      </ul>
    </div>
  )
}
