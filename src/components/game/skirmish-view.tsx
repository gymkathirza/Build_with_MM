"use client"

import Link from "next/link"
import { useState, type ReactNode } from "react"
import { buttonVariants } from "@/components/ui/button"
import { CinematicShell } from "@/components/game/cinematic-shell"
import { ErrorState } from "@/components/game/screen-states"
import {
  AGES,
  DIFFICULTIES,
  FACTIONS,
  MAPS,
  difficultyById,
  factionById,
  mapById,
  type DifficultyId,
  type FactionId,
  type MapId,
} from "@/lib/game-data"
import { PERSONAS, type PersonaId } from "@/lib/sim/personas"
import { hallPositions, specFor } from "@/lib/sim/maps"
import { cn } from "@/lib/utils"

const OPENING_AGES = AGES.filter((age) => age.id !== "dominion")
const DEFAULT_MAP: MapId = "vast-mere"

export function SkirmishView() {
  const [mapId, setMapId] = useState<MapId>(DEFAULT_MAP)
  const [factionId, setFactionId] = useState<FactionId>("ashen")
  const [difficulty, setDifficulty] = useState<DifficultyId>("marshal")
  const [startingAge, setStartingAge] = useState("ember")
  const [personaId, setPersonaId] = useState<PersonaId>("balanced")

  const faction = factionById(factionId)
  const map = mapById(mapId)
  const diff = difficultyById(difficulty)
  const persona = PERSONAS.find((p) => p.id === personaId) ?? PERSONAS[6]
  const preview = map.status === "error" ? "error" : "ready"
  const canMarch = preview === "ready"

  return (
    <CinematicShell>
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-10 sm:px-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs tracking-[0.35em] text-primary/80 uppercase">Skirmish</p>
            <h1 className="font-heading text-3xl tracking-wide text-primary sm:text-4xl">
              Arrange the field
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Vast Mere is the Alpha default. Pick any named plate — each preview and march URL is
              unique. Lost Cartograph stays sealed.
            </p>
          </div>
          <Link href="/" className={buttonVariants({ variant: "outline" })}>
            Main menu
          </Link>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="gold-trim space-y-5 rounded-sm bg-card/60 p-4 sm:p-5">
            <Fieldset legend="Map plate">
              <div className="grid gap-2 sm:grid-cols-2">
                {MAPS.map((m) => (
                  <Choice
                    key={m.id}
                    selected={mapId === m.id}
                    title={m.name}
                    detail={`${m.size} · ${m.players > 0 ? `${m.players} banners` : "unreadable"}`}
                    onClick={() => setMapId(m.id)}
                    dataMap={m.id}
                  />
                ))}
              </div>
            </Fieldset>

            <Fieldset legend="Your banner">
              <div className="grid gap-2 sm:grid-cols-2">
                {FACTIONS.map((f) => (
                  <Choice
                    key={f.id}
                    selected={factionId === f.id}
                    title={f.name}
                    detail={f.epithet}
                    onClick={() => setFactionId(f.id)}
                  />
                ))}
              </div>
            </Fieldset>

            <Fieldset legend="Rival persona">
              <div className="grid gap-2 sm:grid-cols-2">
                {PERSONAS.map((p) => (
                  <Choice
                    key={p.id}
                    selected={personaId === p.id}
                    title={p.name}
                    detail={p.blurb}
                    onClick={() => setPersonaId(p.id)}
                  />
                ))}
              </div>
            </Fieldset>

            <Fieldset legend="Rival sharpness">
              <div className="flex flex-wrap gap-2">
                {DIFFICULTIES.map((d) => (
                  <Choice
                    key={d.id}
                    selected={difficulty === d.id}
                    title={d.name}
                    onClick={() => setDifficulty(d.id)}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{diff.blurb}</p>
            </Fieldset>

            <Fieldset legend="Opening age">
              <div className="flex flex-wrap gap-2">
                {OPENING_AGES.map((age) => (
                  <Choice
                    key={age.id}
                    selected={startingAge === age.id}
                    title={age.name}
                    onClick={() => setStartingAge(age.id)}
                  />
                ))}
              </div>
            </Fieldset>

            <div className="rounded-md border border-primary/20 bg-background/40 p-3">
              <p className="font-heading text-sm text-primary">{faction.name}</p>
              <p className="text-xs tracking-wide text-muted-foreground">{faction.epithet}</p>
              <p className="mt-2 text-sm">{faction.summary}</p>
              <p className="mt-2 text-xs text-primary/80">{faction.bonus}</p>
              <p className="mt-2 text-xs text-muted-foreground">Facing {persona.name}.</p>
            </div>
          </div>

          <section className="flex min-h-72 flex-col" aria-live="polite">
            {preview === "error" ? (
              <ErrorState
                className="h-full min-h-72"
                title="The Lost Cartograph will not open"
                detail="Surveyors marked this plate as cursed. Pick Vast Mere, Hollowmere, or any named land instead."
                onRetry={() => setMapId("vast-mere")}
                retryLabel="Open Vast Mere"
              />
            ) : (
              <div className="gold-trim flex h-full flex-col overflow-hidden rounded-sm bg-card/60">
                <MapPreview mapId={map.id} accent={faction.color} />
                <div className="space-y-2 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-heading text-xl text-primary">{map.name}</h2>
                    <p className="text-xs tracking-widest text-muted-foreground uppercase">
                      {map.size} · {map.players} banners
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">{map.terrain}</p>
                  <p className="text-sm">{map.notes}</p>
                  <p className="text-xs text-muted-foreground">
                    Field {specFor(map.id).size} · pop {specFor(map.id).popCap}
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          {canMarch ? (
            <Link
              href={`/match?source=skirmish&faction=${factionId}&enemy=${factionId === "gilded" ? "ashen" : "gilded"}&map=${mapId}&difficulty=${difficulty}&age=${startingAge}&persona=${personaId}`}
              className={buttonVariants({ variant: "default" })}
              data-testid="march"
              data-map={mapId}
            >
              March
            </Link>
          ) : (
            <span
              className={cn(buttonVariants({ variant: "default" }), "pointer-events-none opacity-50")}
              aria-disabled
            >
              March
            </span>
          )}
        </div>
      </div>
    </CinematicShell>
  )
}

function Fieldset({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium tracking-widest uppercase">{legend}</legend>
      {children}
    </fieldset>
  )
}

function Choice({
  selected,
  title,
  detail,
  onClick,
  dataMap,
}: {
  selected: boolean
  title: string
  detail?: string
  onClick: () => void
  dataMap?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      data-map={dataMap}
      className={cn(
        "rounded-sm border px-3 py-2 text-left transition",
        selected
          ? "border-primary bg-primary/15 text-primary"
          : "border-primary/20 bg-background/30 hover:border-primary/50 hover:bg-card",
      )}
    >
      <span className="block text-sm font-medium">{title}</span>
      {detail ? <span className="mt-0.5 block text-xs text-muted-foreground">{detail}</span> : null}
    </button>
  )
}

function CaveHall({ x, y, fill }: { x: number; y: number; fill: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="0" cy="18" rx="22" ry="6" fill="rgba(20,12,8,0.35)" />
      <path d="M-20 16 Q-22 -8 -4 -14 Q4 -20 12 -10 Q28 -6 20 16Z" fill="#8a929a" stroke="#3a2414" strokeWidth="1.2" />
      <ellipse cx="-6" cy="-2" rx="6" ry="3.5" fill="#c5cbd4" />
      <ellipse cx="4" cy="-10" rx="14" ry="5" fill="#3d6a32" />
      <rect x="-5" y="0" width="10" height="14" rx="3" fill="#5a3218" />
      <rect x="10" y="-16" width="3" height="12" fill={fill} />
      <path d="M13 -16 L22 -10 L13 -6Z" fill={fill} />
    </g>
  )
}

function MapPreview({ mapId, accent }: { mapId: string; accent: string }) {
  const spec = specFor(mapId)
  const halls = hallPositions(spec)
  const toX = (x: number) => (x / spec.size) * 640
  const toY = (y: number) => (y / spec.size) * 280
  const scale = spec.size / 100
  const lakeRx = 36 + scale * 22
  const lakeRy = 18 + scale * 8
  const moss =
    mapId === "sunvault" ? "#5a6a3a" : mapId === "nightgrove" ? "#243526" : mapId === "emberglass" ? "#3a4a32" : "#35502f"
  const waterId = `water-${mapId}`
  const mossId = `moss-${mapId}`
  const trees = [
    [120, 70],
    [180, 200],
    [300, 48],
    [420, 210],
    [510, 90],
    [70, 150],
  ] as const
  return (
    <svg viewBox="0 0 640 280" className="h-48 w-full sm:h-56" role="img" aria-label={`${mapId} preview`}>
      <defs>
        <radialGradient id={waterId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={mapId === "emberglass" ? "#6a3828" : "#4a8a9a"} />
          <stop offset="100%" stopColor={mapId === "sunvault" ? "#5a4620" : "#16343c"} />
        </radialGradient>
        <pattern id={mossId} width="28" height="28" patternUnits="userSpaceOnUse">
          <rect width="28" height="28" fill={moss} />
          <ellipse cx="8" cy="10" rx="10" ry="5" fill="#4a7a38" opacity="0.45" />
          <ellipse cx="20" cy="22" rx="8" ry="4" fill="#243526" opacity="0.5" />
        </pattern>
      </defs>
      <rect width="640" height="280" fill={`url(#${mossId})`} />
      <ellipse cx={320} cy={140} rx={lakeRx} ry={lakeRy} fill={`url(#${waterId})`} />
      {trees.map(([tx, ty], i) => (
        <g key={i} transform={`translate(${tx} ${ty})`}>
          <rect x="-2" y="6" width="4" height="14" fill="#6b3d1c" />
          <ellipse cx="0" cy="2" rx="10" ry="8" fill="#2f6a28" />
        </g>
      ))}
      <ellipse cx={toX(halls.p0.x) + 28} cy={toY(halls.p0.y) + 8} rx="8" ry="5" fill="#d4b85a" />
      <polygon
        points={`${toX(halls.p0.x) + 8},${toY(halls.p0.y) - 22} ${toX(halls.p0.x) + 22},${toY(halls.p0.y) - 4} ${toX(halls.p0.x) - 4},${toY(halls.p0.y) - 4}`}
        fill="#3d6a3a"
      />
      <polygon
        points={`${toX(halls.p1.x) - 16},${toY(halls.p1.y) + 18} ${toX(halls.p1.x) - 4},${toY(halls.p1.y)} ${toX(halls.p1.x) + 10},${toY(halls.p1.y) + 6} ${toX(halls.p1.x) + 8},${toY(halls.p1.y) + 22}`}
        fill="#8a929a"
      />
      <CaveHall x={toX(halls.p0.x)} y={toY(halls.p0.y)} fill={accent} />
      <CaveHall x={toX(halls.p1.x)} y={toY(halls.p1.y)} fill="#7a3a2a" />
      <text x="16" y="24" fill="#f3d48a" fontSize="12">
        {spec.size} · pop {spec.popCap}
      </text>
    </svg>
  )
}
