import type { Metadata } from "next"
import { MatchClient } from "@/components/game/match-client"

export const metadata: Metadata = { title: "Skirmish" }

export default async function MatchPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const q = await searchParams
  const one = (v: string | string[] | undefined, fallback: string) =>
    (Array.isArray(v) ? v[0] : v) || fallback

  return (
    <MatchClient
      factionId={one(q.faction, "ashen")}
      enemyFaction={one(q.enemy, "gilded")}
      bot={one(q.bot, "") === "1"}
      difficulty={one(q.difficulty, "marshal")}
      mapId={one(q.map, "vast-mere")}
      personaId={one(q.persona, "balanced")}
    />
  )
}
