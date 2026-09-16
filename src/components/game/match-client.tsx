"use client"

import dynamic from "next/dynamic"
import { LoadingState } from "@/components/game/screen-states"

const MatchView = dynamic(() => import("@/components/game/match-view").then((m) => m.MatchView), {
  ssr: false,
  loading: () => (
    <div className="flex h-dvh items-center justify-center bg-[#140e0a]">
      <LoadingState
        title="Taking the field"
        detail="Hearth, banners, and the cartograph are being laid on the plate."
      />
    </div>
  ),
})

export function MatchClient({
  factionId,
  enemyFaction,
  bot,
  difficulty,
  mapId,
  personaId,
}: {
  factionId: string
  enemyFaction: string
  bot: boolean
  difficulty: string
  mapId: string
  personaId: string
}) {
  return (
    <MatchView
      factionId={factionId}
      enemyFaction={enemyFaction}
      bot={bot}
      difficulty={difficulty}
      mapId={mapId}
      personaId={personaId}
    />
  )
}
