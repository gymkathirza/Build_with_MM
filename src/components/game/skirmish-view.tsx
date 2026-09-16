"use client"

import Link from "next/link"
import { useEffect, useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CinematicShell } from "@/components/game/cinematic-shell"
import { EmptyState, ErrorState, LoadingState } from "@/components/game/screen-states"
import {
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

export function SkirmishView() {
  const [mapId, setMapId] = useState<MapId | "">("")
  const [factionId, setFactionId] = useState<FactionId>("ashen")
  const [difficulty, setDifficulty] = useState<DifficultyId>("marshal")
  const [startingAge, setStartingAge] = useState("ember")
  const [inking, setInking] = useState(false)

  useEffect(() => {
    if (!mapId || !inking) return
    const t = window.setTimeout(() => setInking(false), 700)
    return () => window.clearTimeout(t)
  }, [mapId, inking])

  const faction = factionById(factionId)
  const map = mapId ? mapById(mapId) : null
  const diff = difficultyById(difficulty)
  const preview = !mapId
    ? "idle"
    : inking
      ? "loading"
      : map?.status === "error"
        ? "error"
        : "ready"
  const canMarch = preview === "ready" && map && map.status === "ready"

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
              Nothing here simulates combat — the March button opens the HUD mock.
            </p>
          </div>
          <Button variant="outline" render={<Link href="/" />}>
            Main menu
          </Button>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <form className="gold-trim space-y-5 rounded-sm bg-card/60 p-4 sm:p-5" onSubmit={(e) => e.preventDefault()}>
            <Field label="Map plate" htmlFor="map">
              <Select
                value={mapId || null}
                onValueChange={(v) => {
                  if (!v) return
                  setMapId(v as MapId)
                  setInking(true)
                }}
              >
                <SelectTrigger id="map" className="w-full min-w-0">
                  <SelectValue placeholder="Choose a surveyed map" />
                </SelectTrigger>
                <SelectContent>
                  {MAPS.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Your banner" htmlFor="faction">
              <Select
                value={factionId}
                onValueChange={(v) => {
                  if (v) setFactionId(v as FactionId)
                }}
              >
                <SelectTrigger id="faction" className="w-full min-w-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FACTIONS.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Rival sharpness" htmlFor="diff">
              <Select
                value={difficulty}
                onValueChange={(v) => {
                  if (v) setDifficulty(v as DifficultyId)
                }}
              >
                <SelectTrigger id="diff" className="w-full min-w-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIFFICULTIES.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{diff.blurb}</p>
            </Field>

            <Field label="Opening age" htmlFor="age">
              <Select
                value={startingAge}
                onValueChange={(v) => {
                  if (v) setStartingAge(v)
                }}
              >
                <SelectTrigger id="age" className="w-full min-w-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ember">Ember Age</SelectItem>
                  <SelectItem value="forge">Forge Age</SelectItem>
                  <SelectItem value="citadel">Citadel Age</SelectItem>
                </SelectContent>
              </Select>
            </Field>

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
            ) : preview === "loading" ? (
              <div className="gold-trim flex h-full min-h-72 items-center justify-center bg-card/40">
                <LoadingState
                  title="Inking the plate"
                  detail="Rivers, seams, and relic stands are being ruled onto the table."
                />
              </div>
            ) : preview === "error" ? (
              <ErrorState
                className="h-full min-h-72"
                title="The Lost Cartograph will not open"
                detail="Surveyors marked this plate as cursed. Pick Hollowmere, Shattercoast, or any named land instead."
                onRetry={() => {
                  setMapId("hollowmere")
                  setInking(true)
                }}
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
                  href={`/match?source=skirmish&faction=${factionId}&map=${mapId}&difficulty=${difficulty}&age=${startingAge}`}
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

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor: string
  children: ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor} className="tracking-widest uppercase">
        {label}
      </Label>
      {children}
    </div>
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
