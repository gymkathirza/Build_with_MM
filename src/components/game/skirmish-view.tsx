"use client"

import Link from "next/link"
import { useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { CinematicShell } from "@/components/game/cinematic-shell"
import { EmptyState, ErrorState } from "@/components/game/screen-states"
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
import { cn } from "@/lib/utils"

const OPENING_AGES = AGES.filter((age) => age.id !== "dominion")

export function SkirmishView() {
  const [mapId, setMapId] = useState<MapId | "">("")
  const [factionId, setFactionId] = useState<FactionId>("ashen")
  const [difficulty, setDifficulty] = useState<DifficultyId>("marshal")
  const [startingAge, setStartingAge] = useState("ember")

  const faction = factionById(factionId)
  const map = mapId ? mapById(mapId) : null
  const diff = difficultyById(difficulty)
  const preview = !mapId
    ? "idle"
    : map?.status === "error"
      ? "error"
      : "ready"
  const canMarch = preview === "ready" && map && map.status === "ready"

  function chooseMap(id: MapId) {
    setMapId(id)
  }

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
              Pick a survey plate, a banner to steward, and how sharp the rival marshals should be.
              March opens a local 1v1 against the AI on that plate.
            </p>
          </div>
          <Button variant="outline" render={<Link href="/" />}>
            Main menu
          </Button>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <form
            className="gold-trim space-y-5 rounded-sm bg-card/60 p-4 sm:p-5"
            onSubmit={(e) => e.preventDefault()}
          >
            <Fieldset legend="Map plate">
              <div className="grid gap-2 sm:grid-cols-2">
                {MAPS.map((m) => (
                  <Choice
                    key={m.id}
                    selected={mapId === m.id}
                    title={m.name}
                    detail={`${m.size} · ${m.players > 0 ? `${m.players} banners` : "unreadable"}`}
                    onClick={() => chooseMap(m.id)}
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
            </div>
          </form>

          <section className="flex min-h-72 flex-col" aria-live="polite">
            {preview === "idle" ? (
              <EmptyState
                className="h-full min-h-72"
                title="No plate selected"
                detail="The cartographer will not ink a blank table. Choose a map to see its fords, groves, and relic stands."
              />
            ) : preview === "error" ? (
              <ErrorState
                className="h-full min-h-72"
                title="The Lost Cartograph will not open"
                detail="Surveyors marked this plate as cursed. Pick Hollowmere, Shattercoast, or any named land instead."
                onRetry={() => chooseMap("hollowmere")}
                retryLabel="Open Hollowmere Basin"
              />
            ) : map ? (
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
                </div>
              </div>
            ) : null}
          </section>
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            disabled={!canMarch}
            render={
              canMarch ? (
                <Link
                  href={`/match?source=skirmish&faction=${factionId}&enemy=${factionId === "gilded" ? "ashen" : "gilded"}&map=${mapId}&difficulty=${difficulty}&age=${startingAge}`}
                />
              ) : undefined
            }
          >
            March
          </Button>
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
}: {
  selected: boolean
  title: string
  detail?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
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

function MapPreview({ mapId, accent }: { mapId: string; accent: string }) {
  return (
    <svg viewBox="0 0 640 280" className="h-48 w-full sm:h-56" role="img" aria-label={`${mapId} preview`}>
      <defs>
        <linearGradient id="water" x1="0" x2="1">
          <stop offset="0%" stopColor="#1a3942" />
          <stop offset="100%" stopColor="#0f242a" />
        </linearGradient>
      </defs>
      <rect width="640" height="280" fill="#243022" />
      <ellipse cx="320" cy="150" rx="210" ry="70" fill="url(#water)" />
      <path d="M0 200 C120 160 200 220 320 190 C460 155 540 210 640 170 L640 280 L0 280Z" fill="#3a4a32" />
      <path d="M40 40 C120 20 180 80 140 120 C90 160 40 110 40 40Z" fill="#2d3a28" />
      <path d="M480 30 C560 10 620 70 580 120 C530 150 470 90 480 30Z" fill="#4a3b28" />
      <circle cx="160" cy="90" r="8" fill={accent} />
      <circle cx="490" cy="88" r="8" fill="#7a3a2a" />
      <circle cx="300" cy="150" r="5" fill="#d4a850" />
      <circle cx="360" cy="165" r="5" fill="#d4a850" />
      <circle cx="240" cy="200" r="4" fill="#8a7a55" />
      <circle cx="400" cy="210" r="4" fill="#8a7a55" />
    </svg>
  )
}
