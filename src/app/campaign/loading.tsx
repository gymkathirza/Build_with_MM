import { LoadingState } from "@/components/game/screen-states"
import { CinematicShell } from "@/components/game/cinematic-shell"

export default function Loading() {
  return (
    <CinematicShell>
      <LoadingState
        title="Opening the chronicles"
        detail="Wax seals and chapter plates are being sorted by act."
      />
    </CinematicShell>
  )
}
