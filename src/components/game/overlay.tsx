"use client"

import type { ReactNode } from "react"

export function Overlay({
  title,
  description,
  children,
  wide = false,
  image,
  imageAlt,
}: {
  title: string
  description: string
  children: ReactNode
  wide?: boolean
  image?: string
  imageAlt?: string
}) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="overlay-title"
    >
      <div
        className={`gold-trim w-full rounded-sm bg-card/95 p-5 shadow-2xl ring-1 ring-primary/20 ${wide ? "max-w-xl max-h-[90dvh] overflow-y-auto" : "max-w-md"}`}
      >
        {image ? (
          <div className="mb-4 overflow-hidden rounded-sm border border-primary/20 bg-[#1a1410]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt={imageAlt ?? ""} className="aspect-[16/9] w-full object-cover" />
          </div>
        ) : null}
        <h2 id="overlay-title" className="font-heading text-xl tracking-wide text-primary">
          {title}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <div className="mt-5 flex flex-col gap-2">{children}</div>
      </div>
    </div>
  )
}
