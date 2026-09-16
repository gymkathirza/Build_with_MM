import Link from "next/link"
import type { Metadata } from "next"
import { Button } from "@/components/ui/button"
import { CinematicShell } from "@/components/game/cinematic-shell"

export const metadata: Metadata = { title: "Furl the banners" }

export default function ExitPage() {
  return (
    <CinematicShell>
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
        <p className="text-xs tracking-[0.4em] text-primary/80 uppercase">Leave the hall</p>
        <h1 className="font-heading text-4xl tracking-wide text-primary">Furl the banners?</h1>
        <p className="text-muted-foreground">
          This is an interface mock, not a running match. Leaving returns you to a quiet hall. No
          progress is written beyond this browser.
        </p>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
          <Button variant="outline" render={<Link href="/" />}>
            Remain
          </Button>
          <Button render={<Link href="/farewell" />}>Exit</Button>
        </div>
      </div>
    </CinematicShell>
  )
}
