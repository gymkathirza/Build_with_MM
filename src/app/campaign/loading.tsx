import { LoadingState } from "@/components/game/screen-states"
import { CinematicShell } from "@/components/game/cinematic-shell"

export default function Loading() {
  return (
    <CinematicShell>
      <LoadingState
        title="Opening Kayal’s chronicle"
        detail="Twin-fish plates are being sorted: Marzban, Palk, Tamraparani, Fracture."
      />
    </CinematicShell>
  )
}
