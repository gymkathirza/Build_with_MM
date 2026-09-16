"use client"

import Link from "next/link"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { CinematicShell } from "@/components/game/cinematic-shell"
import { ErrorState } from "@/components/game/screen-states"

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <CinematicShell>
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6">
        <ErrorState
          title="A page of the chronicle tore"
          detail={
            error.message
              ? `The steward’s note reads: ${error.message}`
              : "This plate failed while opening. Retry, or return to the hall."
          }
          onRetry={retry}
        />
        <div className="mt-4 flex justify-center">
          <Button variant="ghost" render={<Link href="/" />}>
            Main menu
          </Button>
        </div>
      </div>
    </CinematicShell>
  )
}
