import type { Metadata } from "next"
import { CampaignView } from "@/components/game/campaign-view"

export const metadata: Metadata = { title: "Campaign" }

export default function CampaignPage() {
  return <CampaignView />
}
