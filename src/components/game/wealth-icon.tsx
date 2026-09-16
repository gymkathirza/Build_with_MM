"use client"

import { useId } from "react"

export function WealthIcon({ className }: { className?: string }) {
  const gid = `wealth-pearl-${useId().replace(/:/g, "")}`
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      className={className}
      aria-hidden
      role="img"
    >
      <defs>
        <radialGradient id={gid} cx="38%" cy="32%" r="70%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#e8d8c8" />
          <stop offset="100%" stopColor="#b89a82" />
        </radialGradient>
      </defs>
      <path
        d="M3.5 14.2c.4-3.6 3.2-6.4 8.5-6.4s8.1 2.8 8.5 6.4c.1 1.2-.6 2.2-1.8 2.6-2.2.7-4.4 1.1-6.7 1.1s-4.5-.4-6.7-1.1c-1.2-.4-1.9-1.4-1.8-2.6Z"
        fill="#c9b08a"
        stroke="#8a6a3a"
        strokeWidth="1.1"
      />
      <path
        d="M5 13.4c1.4-2.6 3.6-3.8 7-3.8s5.6 1.2 7 3.8"
        fill="none"
        stroke="#7a5530"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <path
        d="M6.2 15.1c1.6.6 3.6.9 5.8.9s4.2-.3 5.8-.9"
        fill="none"
        stroke="#a88858"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <ellipse cx="12" cy="13.4" rx="3.1" ry="2.7" fill="#f4efe6" />
      <ellipse cx="12" cy="13.4" rx="3.1" ry="2.7" fill={`url(#${gid})`} />
      <ellipse cx="11.1" cy="12.5" rx="1.1" ry="0.7" fill="#fff" opacity="0.85" />
    </svg>
  )
}
