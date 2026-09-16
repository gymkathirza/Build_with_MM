import { LoadingState } from "@/components/game/screen-states"
import { CinematicShell } from "@/components/game/cinematic-shell"

export default function Loading() {
  return (
    <CinematicShell>
      <LoadingState
        title="Unrolling the survey table"
        detail="Map plates are being fetched from the cartographer’s chest."
      />
    </CinematicShell>
  )
}
