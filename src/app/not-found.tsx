import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CinematicShell } from "@/components/game/cinematic-shell"
import { EmptyState } from "@/components/game/screen-states"

export default function NotFound() {
  return (
    <CinematicShell>
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6">
        <EmptyState
          title="This ford is not on the plate"
          detail="The path you asked for was never surveyed. The hall, the campaign, and the skirmish table still stand."
          action={
            <Button render={<Link href="/" />}>Return to the hall</Button>
          }
        />
      </div>
    </CinematicShell>
  )
}
