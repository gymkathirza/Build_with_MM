import type { ReactNode } from "react"
import { GAME_TITLE } from "@/lib/game-data"
import { cn } from "@/lib/utils"

export function CinematicShell({
  children,
  className,
  footer,
}: {
  children: ReactNode
  className?: string
  footer?: ReactNode
}) {
  return (
    <div className={cn("relative flex min-h-dvh flex-col cinematic-bg text-foreground", className)}>
      <div className="grain-overlay" />
      <div className="vignette" />
      <CornerMarks />
      <div className="relative z-10 flex min-h-dvh flex-col">{children}</div>
      {footer ? (
        <p className="relative z-10 px-4 pb-3 text-center text-[11px] tracking-widest text-muted-foreground/70 uppercase">
          {footer}
        </p>
      ) : (
        <p className="relative z-10 px-4 pb-3 text-center text-[11px] tracking-widest text-muted-foreground/70 uppercase">
          {GAME_TITLE} · local skirmish vs AI
        </p>
      )}
    </div>
  )
}

function CornerMarks() {
  return (
    <>
      <span className="pointer-events-none absolute top-3 left-3 z-20 size-8 border-t border-l border-primary/50" />
      <span className="pointer-events-none absolute top-3 right-3 z-20 size-8 border-t border-r border-primary/50" />
      <span className="pointer-events-none absolute bottom-3 left-3 z-20 size-8 border-b border-l border-primary/50" />
      <span className="pointer-events-none absolute bottom-3 right-3 z-20 size-8 border-b border-r border-primary/50" />
    </>
  )
}
