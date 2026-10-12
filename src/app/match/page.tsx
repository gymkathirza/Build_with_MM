import type { Metadata } from "next"
import { MatchView } from "@/components/game/match-view"

export const metadata: Metadata = { title: "Match" }

export default async function MatchPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const q = await searchParams
  const one = (v: string | string[] | undefined, fallback: string) =>
    (Array.isArray(v) ? v[0] : v) || fallback
  const mission = one(q.mission, "")
  const source = one(q.source, "")

  return (
    <MatchView
      factionId={one(q.faction, mission ? "pandya" : "ashen")}
      enemyFaction={one(q.enemy, "gilded")}
      bot={one(q.bot, "") === "1"}
      difficulty={one(q.difficulty, "marshal")}
      mapId={one(q.map, "vast-mere")}
      personaId={one(q.persona, "balanced")}
      missionId={source === "campaign" || mission ? mission : ""}
      slotId={one(q.slot, "slot-1")}
    />
  )
}
