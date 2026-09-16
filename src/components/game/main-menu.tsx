"use client"

import Link from "next/link"
import { useState } from "react"
import { CinematicShell } from "@/components/game/cinematic-shell"
import { GAME_SHORT, GAME_TAGLINE, GAME_TITLE } from "@/lib/game-data"

const ITEMS = [
  {
    href: "/campaign",
    label: "Campaign",
    hint: "Six chapters. Four banners. The treaty unravels in order.",
  },
  {
    href: "/skirmish",
    label: "Skirmish",
    hint: "Choose a map, a steward, and how cruel the rival banners may be.",
  },
  {
    href: "/settings",
    label: "Settings",
    hint: "Banners, horns, and how tightly the cartographer draws.",
  },
] as const

export function MainMenu() {
  const [hovered, setHovered] = useState<string | null>(ITEMS[0].hint)

  return (
    <CinematicShell>
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-between gap-10 px-6 py-16 sm:px-10 lg:flex-row lg:items-center lg:py-20">
        <div className="max-w-xl space-y-10">
          <header className="space-y-4">
            <p className="text-xs tracking-[0.42em] text-primary/80 uppercase">{GAME_TITLE}</p>
            <h1 className="font-heading text-4xl leading-tight font-semibold tracking-[0.12em] text-primary sm:text-6xl">
              {GAME_SHORT}
            </h1>
            <p className="max-w-md text-base text-muted-foreground sm:text-lg">{GAME_TAGLINE}</p>
          </header>

          <nav aria-label="Main" className="flex flex-col gap-1">
            {ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="menu-link py-2.5 font-heading text-xl text-foreground/90 sm:text-2xl"
                onMouseEnter={() => setHovered(item.hint)}
                onFocus={() => setHovered(item.hint)}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/exit"
              className="menu-link py-2.5 font-heading text-xl text-foreground/90 sm:text-2xl"
              onMouseEnter={() =>
                setHovered("Furl the banners. The chronicle stays on this device.")
              }
              onFocus={() =>
                setHovered("Furl the banners. The chronicle stays on this device.")
              }
            >
              Exit
            </Link>
          </nav>

          <p className="min-h-12 max-w-md text-sm text-muted-foreground/90">{hovered}</p>
        </div>

        <WorldPlate />
      </div>
    </CinematicShell>
  )
}

function WorldPlate() {
  return (
    <aside
      aria-hidden
      className="gold-trim relative mx-auto aspect-[4/5] w-full max-w-md overflow-hidden rounded-sm bg-[#1a1410] lg:mx-0 lg:max-w-lg"
    >
      <svg viewBox="0 0 400 500" className="h-full w-full">
        <defs>
          <linearGradient id="sea" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1c3a42" />
            <stop offset="100%" stopColor="#0e1c22" />
          </linearGradient>
          <linearGradient id="land" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3d4a32" />
            <stop offset="100%" stopColor="#2a3324" />
          </linearGradient>
        </defs>
        <rect width="400" height="500" fill="#120e0b" />
        <ellipse cx="210" cy="240" rx="170" ry="150" fill="url(#sea)" opacity="0.85" />
        <path
          d="M40 80 C120 60 160 140 90 190 C40 230 70 300 140 320 C220 345 250 280 310 300 C370 322 360 400 280 430 C180 470 80 420 60 340 C40 260 -20 180 40 80Z"
          fill="url(#land)"
        />
        <path
          d="M240 90 C300 70 360 120 340 180 C320 230 280 210 250 240 C220 270 260 330 220 360 C170 400 120 350 150 300 C180 250 160 180 200 140 C220 118 210 100 240 90Z"
          fill="#4a3a28"
        />
        <path d="M70 220 C140 200 200 250 260 240" fill="none" stroke="#c4a35a" strokeWidth="1.2" opacity="0.55" />
        <circle cx="118" cy="168" r="5" fill="#c45c2a" />
        <circle cx="214" cy="248" r="5" fill="#2f6a45" />
        <circle cx="286" cy="176" r="5" fill="#b8862b" />
        <circle cx="168" cy="332" r="5" fill="#2a6d7a" />
        <text x="128" y="158" fill="#f0b27a" fontSize="9" fontFamily="serif">
          Ashen
        </text>
        <text x="224" y="238" fill="#9dcf8a" fontSize="9" fontFamily="serif">
          Conclave
        </text>
        <text x="296" y="166" fill="#f3d48a" fontSize="9" fontFamily="serif">
          Synod
        </text>
        <text x="178" y="352" fill="#8fd4dc" fontSize="9" fontFamily="serif">
          Khanate
        </text>
      </svg>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4">
        <p className="font-heading text-sm tracking-widest text-primary uppercase">The Inner Sea, Ember year 412</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Four capitals still fly. The fords will not.
        </p>
      </div>
    </aside>
  )
}
