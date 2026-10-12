import type { Metadata } from "next"
import { CampaignView } from "@/components/game/campaign-view"

export const metadata: Metadata = { title: "Twin-Fish Reign" }

export default function CampaignPage() {
  return <CampaignView />
}
