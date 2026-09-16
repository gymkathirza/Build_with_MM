import type { ReactNode } from "react"
import { AlertTriangle, Loader2, ScrollText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function LoadingState({
  title = "Unfurling the chronicle",
  detail = "Surveyors are inking the next plate. Hold the ridge a moment.",
  className,
}: {
  title?: string
  detail?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex min-h-[40vh] flex-col items-center justify-center gap-4 px-6 text-center",
        className,
      )}
    >
      <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
      <div className="space-y-1">
        <p className="font-heading text-xl tracking-wide text-primary">{title}</p>
        <p className="max-w-md text-sm text-muted-foreground">{detail}</p>
      </div>
    </div>
  )
}

export function EmptyState({
  title,
  detail,
  action,
  className,
}: {
  title: string
  detail: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-primary/25 bg-card/40 px-6 py-12 text-center",
        className,
      )}
    >
      <ScrollText className="size-8 text-primary/70" aria-hidden />
      <div className="space-y-1">
        <p className="font-heading text-lg text-primary">{title}</p>
        <p className="max-w-md text-sm text-muted-foreground">{detail}</p>
      </div>
      {action}
    </div>
  )
}

export function ErrorState({
  title = "The plate would not open",
  detail = "A surveyor’s seal failed. The archive is intact; this page is not.",
  onRetry,
  retryLabel = "Try the seal again",
  className,
}: {
  title?: string
  detail?: string
  onRetry?: () => void
  retryLabel?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-xl border border-destructive/40 bg-destructive/5 px-6 py-12 text-center",
        className,
      )}
    >
      <AlertTriangle className="size-8 text-destructive" aria-hidden />
      <div className="space-y-1">
        <p className="font-heading text-lg text-destructive">{title}</p>
        <p className="max-w-md text-sm text-muted-foreground">{detail}</p>
      </div>
      {onRetry ? (
        <Button variant="outline" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  )
}
