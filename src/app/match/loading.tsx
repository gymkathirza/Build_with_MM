import { LoadingState } from "@/components/game/screen-states"

export default function Loading() {
  return (
    <div className="flex min-h-dvh items-center justify-center cinematic-bg">
      <LoadingState
        title="Taking the field"
        detail="Banners, hearths, and the cartograph are being laid out. There is still no engine underneath."
      />
    </div>
  )
}
