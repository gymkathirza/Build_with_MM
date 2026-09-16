"use client"

import Link from "next/link"
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { Anvil, Coins, Hammer, Pause, Trees, Wheat } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Overlay } from "@/components/game/overlay"
import {
  AGE_NAMES,
  BUILDING_LABEL,
  POP_CAP,
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
import { DEFAULT_TUNED, scoreTelemetry, type DrawQuality, type Tuned } from "@/lib/ml/score"
import { factionById } from "@/lib/game-data"
import tunedJson from "@/lib/ml/tuned.json"

type Pending = { kind: "build"; type: BuildingType } | { kind: "attackMove" } | null

type Obs = {
  fps: number
  frameMs: number
  simMs: number
  inputMs: number
  clicks: number
  failed: number
  deaths: number
  camera: number
  score: number
  quality: DrawQuality
}

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
}: {
  factionId: string
  enemyFaction?: string
  bot?: boolean
  difficulty?: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const camRef = useRef<Cam>({ x: 22, y: 74, z: 16, w: 800, h: 480 })
  const keysRef = useRef<Set<string>>(new Set())
  const telRef = useRef(createTelemetry())
  const pendingRef = useRef<Pending>(null)
  const dragRef = useRef<{ x: number; y: number; sx: number; sy: number } | null>(null)
  const pausedRef = useRef(false)
  const selectedDrawRef = useRef<Set<number>>(new Set())
  const qualityRef = useRef<DrawQuality>(LOADED_TUNED.quality)

  const [tuned] = useState<Tuned>(() => ({
    ...LOADED_TUNED,
    ai: difficultyAi(difficulty, LOADED_TUNED.ai),
  }))
  const [world] = useState<World>(() => createWorld(factionId, enemyFaction, tuned.ai))
  const [selected, setSelected] = useState<number[]>([])
  const [paused, setPaused] = useState(false)
  const [pending, setPending] = useState<Pending>(null)
  const [winner, setWinner] = useState<0 | 1 | null>(null)
  const [obs, setObs] = useState<Obs>({
    fps: 60,
    frameMs: 16,
    simMs: 0,
    inputMs: 0,
    clicks: 0,
    failed: 0,
    deaths: 0,
    camera: 0,
    score: 0.7,
    quality: LOADED_TUNED.quality,
  })

  useEffect(() => {
    pausedRef.current = paused
  }, [paused])
  useEffect(() => {
    pendingRef.current = pending
  }, [pending])
  useEffect(() => {
    selectedDrawRef.current = new Set(selected)
  }, [selected])

  const snapshot = useCallback(() => {
    const tel = telRef.current
    const last = tel.frames.at(-1)
    const scored = scoreTelemetry(tel, {
      winner: world.winner,
      ticks: world.tick,
      peakEntities: last?.entities ?? world.units.length + world.buildings.length,
    })
    setWinner(world.winner)
    setObs({
      fps: last?.fps ?? 60,
      frameMs: last?.frameMs ?? 16,
      simMs: last?.simMs ?? 0,
      inputMs: last?.inputMs ?? 0,
      clicks: tel.clicks,
      failed: tel.failedOrders,
      deaths: tel.deaths,
      camera: tel.cameraMoves,
      score: scored.total,
      quality: qualityRef.current,
    })
  }, [world])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    let raf = 0
    let last = performance.now()
    let acc = 0
    let frames = 0
    let fpsT = last
    let fps = 60
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
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
      const dpr = Math.min(2, window.devicePixelRatio || 1)
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
      if (keys.has("KeyW") || keys.has("ArrowUp")) {
        cam.y -= pan * dt * 60
        pushEvent(telRef.current, "camera", "pan")
      }
      if (keys.has("KeyS") || keys.has("ArrowDown")) {
        cam.y += pan * dt * 60
        pushEvent(telRef.current, "camera", "pan")
      }
      if (keys.has("KeyA") || keys.has("ArrowLeft")) cam.x -= pan * dt * 60
      if (keys.has("KeyD") || keys.has("ArrowRight")) cam.x += pan * dt * 60
      cam.x = Math.max(8, Math.min(92, cam.x))
      cam.y = Math.max(8, Math.min(92, cam.y))

      let simMs = 0
      if (!pausedRef.current && world.winner === null) {
        acc += dt
        const step = 1 / TICK_HZ
        let safety = 0
        while (acc >= step && safety++ < 5) {
          const a = performance.now()
          if (bot) tickAi(world, 0, { ...tuned.ai, gatherBias: 0.8, attackAtArmy: tuned.ai.attackAtArmy + 2 })
          tickAi(world, 1, tuned.ai)
          tick(world)
          simMs += performance.now() - a
          acc -= step
          for (const ev of world.events) {
            if (ev.k === "death") pushEvent(telRef.current, "death", ev.type)
            if (ev.k === "failed") pushEvent(telRef.current, "failed", ev.why)
          }
          world.events = world.events.filter((e) => e.k !== "death" && e.k !== "failed")
        }
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
      pushFrame(telRef.current, {
        fps,
        frameMs,
        simMs,
        inputMs: telRef.current.lastInputMs,
        entities: world.units.length + world.buildings.length,
      })
      if (Math.floor(now / 200) !== Math.floor((now - dt * 1000) / 200)) snapshot()
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [bot, snapshot, tuned, world])

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
      snapshot()
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
        <p className="font-heading hidden text-[11px] tracking-[0.28em] text-primary uppercase sm:block">
          {faction.name}
        </p>
        <Chip icon={<Wheat className="size-3.5" />} label="Grain" value={Math.floor(p.grain)} />
        <Chip icon={<Trees className="size-3.5" />} label="Timber" value={Math.floor(p.timber)} />
        <Chip icon={<Anvil className="size-3.5" />} label="Ore" value={Math.floor(p.ore)} />
        <Chip icon={<Coins className="size-3.5" />} label="Relics" value={Math.floor(p.relics)} />
        <Badge variant="secondary" className="ml-auto font-heading tracking-wide">
          {AGE_NAMES[p.age]}
        </Badge>
        <span className="text-xs tabular-nums text-muted-foreground">
          Banners {popUsed(world, 0)}/{POP_CAP}
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
        <aside className="pointer-events-none absolute top-2 right-2 z-10 hidden w-44 rounded-sm border border-primary/25 bg-black/60 p-2 text-[10px] text-primary sm:block">
          <p className="font-heading tracking-widest uppercase">Observatory</p>
          <p className="mt-1 tabular-nums text-muted-foreground">
            {obs.fps.toFixed(0)} fps · {obs.frameMs.toFixed(1)} ms
          </p>
          <p className="tabular-nums text-muted-foreground">
            sim {obs.simMs.toFixed(2)} ms · in {obs.inputMs.toFixed(0)} ms
          </p>
          <p className="tabular-nums text-muted-foreground">
            score {(obs.score * 100).toFixed(0)} · clicks {obs.clicks} · fail {obs.failed}
          </p>
          <p className="tabular-nums text-muted-foreground">
            deaths {obs.deaths} · pan {obs.camera} · lod {obs.quality}
          </p>
        </aside>
        {winner !== null ? (
          <Overlay
            title={winner === 0 ? "The field is yours" : "The hearth is gone"}
            description={
              winner === 0
                ? "The rival banner is broken. Build with Manon Mani records the skirmish as a win."
                : "Your Hearth Hall fell. Resign, or return to the hall and raise another."
            }
          >
            <Button className="w-full" render={<Link href="/skirmish" />}>
              Another skirmish
            </Button>
            <Button className="w-full" variant="outline" render={<Link href="/" />}>
              Main menu
            </Button>
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
          <TrainPanel world={world} selected={selBuild} onTrain={snapshot} />
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
          <Button className="w-full" variant="outline" render={<Link href="/settings" />}>
            Settings
          </Button>
          <Button className="w-full" variant="destructive" render={<Link href="/" />}>
            Resign to menu
          </Button>
        </Overlay>
      ) : null}
    </div>
  )
}

function Chip({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs tabular-nums">
      <span className="text-primary">{icon}</span>
      <span className="hidden sm:inline text-muted-foreground">{label}</span>
      {value}
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
