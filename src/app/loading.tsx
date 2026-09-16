import { LoadingState } from "@/components/game/screen-states"
import { CinematicShell } from "@/components/game/cinematic-shell"

export default function Loading() {
  return (
    <CinematicShell>
      <LoadingState />
    </CinematicShell>
  )
}
