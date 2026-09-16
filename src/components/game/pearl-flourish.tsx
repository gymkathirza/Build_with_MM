"use client"

import { PearlLogo } from "@/components/game/pearl-logo"
import { cn } from "@/lib/utils"

export function PearlFlourish({
  play,
  variant = "start",
}: {
  play: boolean
  variant?: "start" | "end"
}) {
  if (!play) return null
  return (
    <div
      className={cn("pearl-flourish", variant === "end" && "pearl-flourish-end")}
      role="presentation"
    >
      <PearlLogo size={variant === "end" ? 168 : 144} />
    </div>
  )
}
