import type { Metadata } from "next"
import { SkirmishView } from "@/components/game/skirmish-view"

export const metadata: Metadata = { title: "Skirmish" }

export default function SkirmishPage() {
  return <SkirmishView />
}
