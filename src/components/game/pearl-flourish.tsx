"use client"

import { useEffect, useRef } from "react"
import { PearlLogo } from "@/components/game/pearl-logo"
import { playSeaCrestFromContext, SEA_CREST_SECONDS } from "@/lib/audio/sea-crest"
import { cn } from "@/lib/utils"

export function PearlFlourish({
  play,
  variant = "start",
}: {
  play: boolean
  variant?: "start" | "end"
}) {
  const stopRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!play) return
    let stop: (() => void) | null = null
    let ctx: AudioContext | null = null
    const run = async () => {
      const AC = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return
      ctx = new AC()
      if (ctx.state === "suspended") {
        try {
          await ctx.resume()
        } catch {
          /* autoplay blocked until a later gesture */
        }
      }
      stop = playSeaCrestFromContext(ctx)
      stopRef.current = stop
    }
    void run()
    const kill = window.setTimeout(() => {
      stop?.()
      void ctx?.close()
    }, SEA_CREST_SECONDS * 1000 + 80)
    return () => {
      window.clearTimeout(kill)
      stop?.()
      stopRef.current = null
      void ctx?.close()
    }
  }, [play, variant])

  if (!play) return null
  return (
    <div
      className={cn("pearl-flourish", variant === "end" && "pearl-flourish-end")}
      role="presentation"
      aria-hidden
    >
      <div className="pearl-flourish-stage">
        <PearlLogo size={variant === "end" ? 176 : 152} sparkle />
      </div>
    </div>
  )
}
