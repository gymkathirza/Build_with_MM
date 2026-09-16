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
  CAMPAIGN_CHAPTERS,
  SAVE_SLOTS,
  factionById,
} from "@/lib/game-data"
import { cn } from "@/lib/utils"

type Slot = (typeof SAVE_SLOTS)[number]

export function CampaignView() {
  const [slotId, setSlotId] = useState<Slot["id"]>("slot-1")
  const slot = SAVE_SLOTS.find((s) => s.id === slotId) ?? SAVE_SLOTS[0]
  const selectedSlotIsBroken = slot.status === "error"
  const selectedSlotIsEmpty = slot.status === "empty"

  const chapters = useMemo(() => {
    if (selectedSlotIsEmpty || selectedSlotIsBroken) return []
    return CAMPAIGN_CHAPTERS
  }, [selectedSlotIsBroken, selectedSlotIsEmpty])

  return (
    <CinematicShell>
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-10 sm:px-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs tracking-[0.35em] text-primary/80 uppercase">Campaign</p>
            <h1 className="font-heading text-3xl tracking-wide text-primary sm:text-4xl">
              The Unravelled Treaty
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Choose a chronicle, then a chapter. Locked plates wait on the last victory — this mock
              already holds Act I open on Chronicle I.
            </p>
          </div>
          <Button variant="outline" render={<Link href="/" />}>
            Main menu
          </Button>
        </header>

        <section aria-label="Save chronicles" className="grid gap-3 sm:grid-cols-3">
          {SAVE_SLOTS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSlotId(s.id)}
              className={cn(
                "gold-trim rounded-sm px-4 py-3 text-left transition",
                slotId === s.id ? "bg-primary/10" : "bg-card/50 hover:bg-card",
              )}
            >
              <p className="font-heading text-sm tracking-widest text-primary uppercase">{s.label}</p>
              <p className="mt-1 text-sm">
                {s.status === "empty"
                  ? "No chronicle inscribed"
                  : s.status === "error"
                    ? "Seal damaged"
                    : s.steward}
              </p>
              <p className="text-xs text-muted-foreground">
                {s.status === "active" ? `${s.age} · ${s.played}` : s.status === "empty" ? "Empty" : "Unreadable"}
              </p>
            </button>
          ))}
        </section>

        {selectedSlotIsEmpty ? (
          <EmptyState
            title="This plate is blank"
            detail="No steward has taken the oath here. Begin The Last Hearth to inscribe Chronicle II — in this mock the first chronicle already holds your campaign."
            action={
              <Button render={<Link href="/match?source=campaign&chapter=hearth&faction=ashen&map=emberglass" />}>
                Begin The Last Hearth
              </Button>
            }
          />
        ) : selectedSlotIsBroken ? (
          <ErrorState
            title="This archive is damaged"
            detail="The wax on Chronicle III cracked in transit. The other plates are intact. Choose Chronicle I, or leave this seal unrestored."
            onRetry={() => setSlotId("slot-1")}
            retryLabel="Open Chronicle I"
          />
        ) : (
          <ol className="grid gap-4 md:grid-cols-2">
            {chapters.map((chapter) => {
              const faction = factionById(chapter.faction)
              return (
                <li key={chapter.id}>
                  <Card
                    className={cn(
                      "gold-trim h-full bg-card/70",
                      !chapter.unlocked && "opacity-70",
                    )}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] tracking-[0.25em] text-primary/70 uppercase">
                            {chapter.act} · Chapter {chapter.number}
                          </p>
                          <CardTitle className="mt-1 font-heading text-xl tracking-wide text-primary">
                            {chapter.title}
                          </CardTitle>
                        </div>
                        {chapter.unlocked ? (
                          <Badge variant="secondary">Open</Badge>
                        ) : (
                          <Badge variant="outline">
                            <Lock className="size-3" />
                            Sealed
                          </Badge>
                        )}
                      </div>
                      <CardDescription>{chapter.synopsis}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs text-muted-foreground">
                        {faction.name} · {chapter.duration}
                      </p>
                      {chapter.unlocked ? (
                        <Button
                          size="sm"
                          render={
                            <Link
                              href={`/match?source=campaign&chapter=${chapter.id}&faction=${chapter.faction}&map=${chapter.map}`}
                            />
                          }
                        >
                          <Play className="size-3.5" />
                          March
                        </Button>
                      ) : (
                        <p className="text-xs text-muted-foreground">Win the previous chapter to break this seal.</p>
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
