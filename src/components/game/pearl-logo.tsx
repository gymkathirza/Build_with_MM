"use client"

import { useId } from "react"
import { cn } from "@/lib/utils"

export function PearlLogo({
  className,
  size = 96,
  sparkle = true,
  decorative = true,
}: {
  className?: string
  size?: number
  sparkle?: boolean
  decorative?: boolean
}) {
  const raw = useId().replace(/:/g, "")
  const body = `pearl-body-${raw}`
  const iris = `pearl-iris-${raw}`
  const sheen = `pearl-sheen-${raw}`
  const spark = `pearl-spark-${raw}`
  const shade = `pearl-shade-${raw}`

  return (
    <svg
      viewBox="0 0 128 128"
      width={size}
      height={size}
      className={cn("pearl-logo", className)}
      role={decorative ? "presentation" : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : "Pearl of Manon Mani"}
    >
      <defs>
        <radialGradient id={body} cx="38%" cy="30%" r="72%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="16%" stopColor="#fffaf4" />
          <stop offset="38%" stopColor="#f4ebe3" />
          <stop offset="62%" stopColor="#e4d4c8" />
          <stop offset="84%" stopColor="#c9b4a6" />
          <stop offset="100%" stopColor="#9e8778" />
        </radialGradient>
        <radialGradient id={iris} cx="62%" cy="48%" r="70%">
          <stop offset="0%" stopColor="rgb(232 214 255 / 0)" />
          <stop offset="45%" stopColor="rgb(210 186 230 / 0.18)" />
          <stop offset="70%" stopColor="rgb(186 214 232 / 0.28)" />
          <stop offset="100%" stopColor="rgb(255 236 220 / 0)" />
        </radialGradient>
        <linearGradient id={sheen} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgb(255 255 255 / 0)" />
          <stop offset="45%" stopColor="rgb(255 255 255 / 0.55)" />
          <stop offset="55%" stopColor="rgb(255 255 255 / 0)" />
        </linearGradient>
        <radialGradient id={spark} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="35%" stopColor="#fff6e8" />
          <stop offset="100%" stopColor="rgb(255 236 200 / 0)" />
        </radialGradient>
        <radialGradient id={shade} cx="50%" cy="20%" r="80%">
          <stop offset="0%" stopColor="rgb(20 12 8 / 0)" />
          <stop offset="70%" stopColor="rgb(20 12 8 / 0.08)" />
          <stop offset="100%" stopColor="rgb(20 12 8 / 0.28)" />
        </radialGradient>
      </defs>
      <ellipse cx="64" cy="108" rx="34" ry="8" fill="rgb(12 8 6 / 0.35)" />
      <circle cx="64" cy="68" r="38" fill={`url(#${body})`} />
      <circle cx="64" cy="68" r="38" fill={`url(#${iris})`} />
      <circle cx="64" cy="68" r="38" fill={`url(#${shade})`} />
      <ellipse cx="50" cy="52" rx="14" ry="9" fill="rgb(255 255 255 / 0.72)" />
      <ellipse cx="46" cy="48" rx="5.5" ry="3.2" fill="rgb(255 255 255 / 0.95)" />
      <g className="pearl-gleam" style={{ transformOrigin: "64px 68px" }}>
        <ellipse cx="64" cy="68" rx="38" ry="12" fill={`url(#${sheen})`} opacity="0.65" />
      </g>
      {sparkle ? (
        <g className="pearl-sparkle" style={{ transformOrigin: "96px 38px" }}>
          <circle cx="96" cy="38" r="10" fill={`url(#${spark})`} />
          <path
            d="M96 22 L98.4 34.2 L110 36.5 L98.4 38.8 L96 51 L93.6 38.8 L82 36.5 L93.6 34.2 Z"
            fill="#fffef8"
          />
          <path
            d="M96 28 L97.2 34.6 L104 36 L97.2 37.4 L96 44 L94.8 37.4 L88 36 L94.8 34.6 Z"
            fill="#fff8e8"
            opacity="0.9"
          />
          <circle cx="104" cy="30" r="1.4" fill="#fff" />
          <circle cx="108" cy="42" r="0.9" fill="#fff" />
        </g>
      ) : null}
    </svg>
  )
}
