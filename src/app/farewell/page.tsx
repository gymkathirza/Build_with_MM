import Link from "next/link"
import type { Metadata } from "next"
import { Button } from "@/components/ui/button"
import { CinematicShell } from "@/components/game/cinematic-shell"
import { GAME_TITLE } from "@/lib/game-data"

export const metadata: Metadata = { title: "Banners furled" }

export default function FarewellPage() {
  return (
    <CinematicShell footer="The hall is empty">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
        <p className="text-xs tracking-[0.4em] text-primary/80 uppercase">Session ended</p>
        <h1 className="font-heading text-4xl tracking-wide text-primary">The banners are furled</h1>
        <p className="text-muted-foreground">
          {GAME_TITLE} keeps no garrison in this browser. Return when you want to walk the menu, the
          campaign plates, or the HUD mock again.
        </p>
        <Button render={<Link href="/" />}>Light the hall</Button>
      </div>
    </CinematicShell>
  )
}
