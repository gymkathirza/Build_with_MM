"use client"

import type { ReactNode } from "react"

export function Overlay({
  title,
  description,
  children,
  wide = false,
}: {
  title: string
  description: string
  children: ReactNode
  wide?: boolean
}) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="overlay-title"
    >
      <div
        className={`gold-trim w-full rounded-sm bg-card/95 p-5 shadow-2xl ring-1 ring-primary/20 ${wide ? "max-w-lg max-h-[90dvh] overflow-y-auto" : "max-w-md"}`}
      >
        <h2 id="overlay-title" className="font-heading text-xl tracking-wide text-primary">
          {title}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <div className="mt-5 flex flex-col gap-2">{children}</div>
      </div>
    </div>
  )
}
