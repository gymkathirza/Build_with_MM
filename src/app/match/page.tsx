import type { Metadata } from "next"
import { MatchHud } from "@/components/game/match-hud"

export const metadata: Metadata = { title: "The field" }

export default async function MatchPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const q = await searchParams
  const one = (v: string | string[] | undefined, fallback: string) =>
    (Array.isArray(v) ? v[0] : v) || fallback

  return (
    <MatchHud
      factionId={one(q.faction, "ashen")}
      mapId={one(q.map, "hollowmere")}
      difficultyId={one(q.difficulty, "marshal")}
      chapterId={typeof q.chapter === "string" ? q.chapter : undefined}
      source={one(q.source, "skirmish")}
      ageId={one(q.age, "forge")}
    />
  )
}
