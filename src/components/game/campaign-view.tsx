"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Lock, Play } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CinematicShell } from "@/components/game/cinematic-shell"
import { EmptyState, ErrorState } from "@/components/game/screen-states"
import {
  CAMPAIGN_MISSIONS,
  CAMPAIGN_STEWARD,
  CAMPAIGN_TITLE,
  type MissionId,
} from "@/lib/campaign/missions"
import {
  clearFile,
  isUnlocked,
  loadFile,
  markStarted,
  writeFile,
  type ChronicleSlot,
} from "@/lib/campaign/save"
import { missionArt } from "@/lib/campaign/artifacts"
import { HOUSE_PROFILES } from "@/lib/campaign/family"
import { factionById, GAME_PAIR } from "@/lib/game-data"
import { cn } from "@/lib/utils"

export function CampaignView() {
  const boot = useMemo(() => loadFile(), [])
  const [corrupt, setCorrupt] = useState(boot.corrupt)
  const [file, setFile] = useState(boot.file)
  const [slotId, setSlotId] = useState(file.slots[0]?.id ?? "slot-1")
  const slot = file.slots.find((s) => s.id === slotId) ?? file.slots[0]!
  const empty = !slot.started && slot.completed.length === 0

  function selectSlot(id: string) {
    setSlotId(id)
  }

  function beginSlot(s: ChronicleSlot) {
    const next = markStarted(file, s.id)
    writeFile(next)
    setFile(next)
  }

  function recast() {
    clearFile()
    const fresh = loadFile()
    setCorrupt(false)
    setFile(fresh.file)
    setSlotId("slot-1")
  }

  return (
    <CinematicShell footer={`Twin-Fish Reign · ${GAME_PAIR}`}>
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-8 sm:py-10">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs tracking-[0.35em] text-primary/80 uppercase">Campaign</p>
            <h1 className="font-heading text-3xl tracking-wide text-primary sm:text-4xl">
              {CAMPAIGN_TITLE}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Four plates in order. {CAMPAIGN_STEWARD} — Yuvaraja in his father’s shadow, then five
              brother kings, then two queens and two sons. {GAME_PAIR} on every shore. Aryachakravarti
              takes the Tooth Relic. 1308 is patricide, civil war, and Malik Kafur.
            </p>
          </div>
          <Button variant="outline" render={<Link href="/" />}>
            Main menu
          </Button>
        </header>

        <section aria-label="House of the Twin-Fish" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {HOUSE_PROFILES.map((p) => (
            <article key={p.id} className="gold-trim rounded-sm bg-card/50 px-3 py-3">
              <p className="text-[10px] tracking-[0.22em] text-primary/70 uppercase">{p.role}</p>
              <h2 className="font-heading mt-1 text-sm tracking-wide text-primary">{p.name}</h2>
              <p className="text-[11px] text-muted-foreground">{p.years}</p>
              <p className="mt-1 text-xs text-muted-foreground">{p.blurb}</p>
            </article>
          ))}
        </section>

        <section aria-label="Chronicles" className="grid gap-3 sm:grid-cols-3">
          {file.slots.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => selectSlot(s.id)}
              aria-pressed={slotId === s.id}
              className={cn(
                "gold-trim rounded-sm px-4 py-3 text-left transition",
                slotId === s.id ? "bg-primary/15 ring-1 ring-primary" : "bg-card/50 hover:bg-card",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-heading text-sm tracking-widest text-primary uppercase">{s.label}</p>
                {slotId === s.id ? (
                  <span className="text-[10px] tracking-widest text-primary uppercase">Selected</span>
                ) : null}
              </div>
              <p className="mt-1 text-sm">
                {!s.started && s.completed.length === 0
                  ? "No chronicle inscribed"
                  : CAMPAIGN_STEWARD}
              </p>
              <p className="text-xs text-muted-foreground">
                {s.completed.length
                  ? `${s.completed.length}/4 plates · ${s.relicSecured ? "Tooth Relic secured" : "relic still in Yapahuwa"}`
                  : s.started
                    ? "Kayal waits"
                    : "Empty"}
              </p>
            </button>
          ))}
        </section>

        {corrupt ? (
          <ErrorState
            title="This archive is damaged"
            detail="The wax on this chronicle cracked. Recast the seal to start Twin-Fish Reign again. Skirmish plates are untouched."
            onRetry={recast}
            retryLabel="Recast the seal"
          />
        ) : empty ? (
          <EmptyState
            title="This plate is blank"
            detail="No steward has taken the oath here. Begin as Yuvaraja leaving Jatavarman Sundara Pandyan I’s shadow — Kayal of Manon Mani’s quay and Masila Mani’s Twin-Fish gate — and seat Takiuddin Abdur Rahman."
            action={
              <Button
                render={<Link href={`/match?source=campaign&mission=kayal&slot=${slot.id}`} />}
                onClick={() => beginSlot(slot)}
              >
                Begin Kayal Under Sail
              </Button>
            }
          />
        ) : (
          <ol className="grid gap-4 md:grid-cols-2">
            {CAMPAIGN_MISSIONS.map((mission) => {
              const open = isUnlocked(slot, mission.id)
              const done = slot.completed.includes(mission.id)
              const faction = factionById(mission.faction)
              return (
                <li key={mission.id}>
                  <Card className={cn("gold-trim h-full overflow-hidden bg-card/70", !open && "opacity-70")}>
                    <div className="relative aspect-[16/9] w-full bg-[#1a1410]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={missionArt(mission.id).card}
                        alt={missionArt(mission.id).caption}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] tracking-[0.25em] text-primary/70 uppercase">
                            {mission.arc} · Plate {mission.number}
                          </p>
                          <CardTitle className="mt-1 font-heading text-xl tracking-wide text-primary">
                            {mission.title}
                          </CardTitle>
                        </div>
                        {done ? (
                          <Badge variant="secondary">Won</Badge>
                        ) : open ? (
                          <Badge variant="secondary">Open</Badge>
                        ) : (
                          <Badge variant="outline">
                            <Lock className="size-3" />
                            Sealed
                          </Badge>
                        )}
                      </div>
                      <CardDescription>{mission.briefing}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs text-muted-foreground">
                        {faction.name} · {mission.year}
                      </p>
                      {open ? (
                        <Button
                          size="sm"
                          className="w-full sm:w-auto"
                          render={
                            <Link
                              href={`/match?source=campaign&mission=${mission.id}&slot=${slot.id}`}
                            />
                          }
                          onClick={() => beginSlot(slot)}
                        >
                          <Play className="size-3.5" />
                          {done ? "March again" : "March"}
                        </Button>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Win the previous plate to break this seal.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </CinematicShell>
  )
}

export type { MissionId }
