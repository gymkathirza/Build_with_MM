"use client"

import Link from "next/link"
import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from "react"
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
  issueGather,
  issueHalt,
  issueMove,
  placeBuilding,
  popUsed,
  queueTrain,
  startAge,
  tick,
} from "@/lib/sim/engine"
import { tickAi } from "@/lib/sim/ai"
import { type Cam, drawWorld, screenToWorld } from "@/lib/sim/draw"
import { createTelemetry, pushEvent, pushFrame } from "@/lib/obs/telemetry"
import { DEFAULT_TUNED, type DrawQuality, type Tuned } from "@/lib/ml/score"
import { factionById } from "@/lib/game-data"
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
  const camRef = useRef<Cam>({ x: halls.p0.x, y: halls.p0.y, z: spec.size >= 200 ? 11 : 16, w: 800, h: 480 })
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
    if (grainRef.current) grainRef.current.textContent = String(Math.floor(p0.grain))
    if (timberRef.current) timberRef.current.textContent = String(Math.floor(p0.timber))
    if (oreRef.current) oreRef.current.textContent = String(Math.floor(p0.ore))
    if (relicsRef.current) relicsRef.current.textContent = String(Math.floor(p0.relics))
    if (ageRef.current) ageRef.current.textContent = AGE_NAMES[p0.age]
    if (popRef.current) popRef.current.textContent = `Banners ${popUsed(world, 0)}/${world.popCap}`
    if (obsLineRef.current) {
      const last = tel.frames.at(-1)
      obsLineRef.current.textContent = last
        ? `${fps.toFixed(0)} fps · ${frameMs.toFixed(1)} ms\nsim ${simMs.toFixed(2)} ms · in ${tel.lastInputMs.toFixed(0)} ms\nclicks ${tel.clicks} · fail ${tel.failedOrders} · deaths ${tel.deaths}\npan ${tel.cameraMoves} · lod ${qualityRef.current}`
        : "warming…"
    }
  }, [world])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true })
    if (!ctx) return
    let raf = 0
    let last = performance.now()
    let acc = 0
    let frames = 0
    let fpsT = last
    let fps = 60
    let hudAt = 0
    let postedWin = false
    let sampleN = 0
    let lastObsPost = 0
    const p0Ai = bot
      ? { ...tuned.ai, gatherBias: 0.8, attackAtArmy: tuned.ai.attackAtArmy + 2 }
      : null
    const loop = (now: number) => {
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
      const w = parent?.clientWidth ?? 800
      const h = parent?.clientHeight ?? 480
      const dpr = Math.min(1.5, window.devicePixelRatio || 1)
      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr)
        canvas.height = Math.floor(h * dpr)
        canvas.style.width = `${w}px`
        canvas.style.height = `${h}px`
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
      const t0 = performance.now()
      drawWorld(ctx, world, cam, selectedDrawRef.current, qualityRef.current, tuned.lodDistance, now, w, h)
      const drag = dragRef.current
      if (drag) {
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
        paintHud(fps, frameMs, simMs)
        if (now - lastObsPost > 2500) {
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
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
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
    }
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.code)
    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      const cam = camRef.current
      cam.z = Math.max(8, Math.min(36, cam.z * (e.deltaY > 0 ? 0.92 : 1.08)))
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
      if (!issueGather(world, own, hit.id)) pushEvent(telRef.current, "failed", "gather")
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
    <div className="relative flex min-h-dvh flex-col bg-[#140e0a] text-foreground">
      <header className="relative z-20 flex flex-wrap items-center gap-2 border-b border-primary/25 bg-black/55 px-2 py-1.5">
        <PearlLogo size={28} className="hidden shrink-0 sm:block" />
        <p className="font-heading hidden text-[11px] tracking-[0.28em] text-primary uppercase sm:block">
          {faction.name}
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
        <Button size="icon-sm" variant="outline" aria-label="Pause" onClick={() => setPaused(true)}>
          <Pause />
        </Button>
      </header>

      <div className="relative min-h-0 flex-1">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full cursor-crosshair"
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
        <aside className="pointer-events-none absolute top-2 right-2 z-10 hidden w-44 rounded-sm border border-primary/25 bg-black/60 p-2 text-[10px] whitespace-pre-line text-primary sm:block">
          <p className="font-heading tracking-widest uppercase">Observatory</p>
          <p ref={obsLineRef} className="mt-1 tabular-nums text-muted-foreground">
            60 fps
          </p>
        </aside>
        <PearlFlourish play variant="start" />
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

      <footer className="relative z-20 border-t border-primary/25 bg-black/75">
        <div className="grid gap-2 p-2 lg:grid-cols-[minmax(0,1.1fr)_14rem_13rem]">
          <Selection selectedUnits={selUnits} building={selBuild} />
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
              <Button size="sm" variant="secondary" onClick={() => startAge(world, 0)}>
                Advance Age
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
          WASD pan · wheel zoom · left select · right order · Build with Manon Mani
        </p>
      </footer>

      {paused && winner === null ? (
        <Overlay
          title="The field is held"
          description="Simulation is paused. Resume, change banners, or resign the match."
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

function Selection({
  selectedUnits,
  building,
}: {
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
              ? "Age rite in progress"
              : "Standing"
            : `Raising ${((building.construct / building.constructMax) * 100).toFixed(0)}%`}
        </p>
        <Progress value={(building.hp / building.hpMax) * 100} className="mt-2" />
      </div>
    )
  }
  if (!selectedUnits.length) {
    return (
      <div className="rounded-sm border border-dashed border-primary/25 px-3 py-6 text-center text-sm text-muted-foreground">
        Select a levy or hall. Right-click grain, timber, ore, or relics to gather. Raise a Banner Yard,
        then Advance Age.
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
        {u.order.t === "gather" ? "Gathering" : u.order.t === "build" ? "Raising" : u.order.t}
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
  const b =
    selected && selected.owner === 0 && selected.done
      ? selected
      : world.buildings.find((x) => x.owner === 0 && x.type === "hearth" && x.done)
  const options: UnitType[] =
    b?.type === "hearth" ? ["levy"] : b?.type === "yard" ? ["guard", "warden"] : b?.type === "lodge" ? ["ashrider"] : []
  return (
    <div className="rounded-sm border border-primary/20 bg-card/50 p-2">
      <p className="mb-2 font-heading text-xs tracking-widest text-primary uppercase">Hall queue</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((type) => (
          <Button
            key={type}
            size="sm"
            variant="outline"
            onClick={() => {
              if (b) queueTrain(world, b.id, type)
              onTrain()
            }}
          >
            {UNIT_LABEL[type]}
          </Button>
        ))}
      </div>
      <ul className="mt-2 space-y-1">
        {(b?.queue ?? []).map((q, i) => (
          <li key={i} className="text-xs">
            {UNIT_LABEL[q.type]}
            <Progress value={(q.t / q.max) * 100} className="mt-1" />
          </li>
        ))}
        {b && !b.queue.length ? <li className="text-xs text-muted-foreground">Yard idle.</li> : null}
      </ul>
    </div>
  )
}
