"use client"

import Link from "next/link"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import {
  Anvil,
  Coins,
  Flag,
  Hammer,
  Map as MapIcon,
  Pause,
  Scroll,
  Trees,
  Wheat,
  X,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { EmptyState, ErrorState, LoadingState } from "@/components/game/screen-states"
import { Overlay } from "@/components/game/overlay"
import {
  AGES,
  BUILDINGS,
  UNITS,
  chapterById,
  difficultyById,
  factionById,
  mapById,
} from "@/lib/game-data"
import { cn } from "@/lib/utils"

type Token = {
  id: string
  kind: "unit" | "building"
  catalogId: string
  x: number
  y: number
  hpPct: number
}

type QueueItem = { id: string; name: string; progress: number }

const START_TOKENS: Token[] = [
  { id: "hall", kind: "building", catalogId: "hearth-hall", x: 28, y: 58, hpPct: 100 },
  { id: "yard", kind: "building", catalogId: "banner-yard", x: 38, y: 64, hpPct: 86 },
  { id: "levy-1", kind: "unit", catalogId: "levy", x: 24, y: 50, hpPct: 100 },
  { id: "levy-2", kind: "unit", catalogId: "levy", x: 32, y: 48, hpPct: 92 },
  { id: "guard-1", kind: "unit", catalogId: "guard", x: 44, y: 55, hpPct: 78 },
  { id: "guard-2", kind: "unit", catalogId: "guard", x: 47, y: 61, hpPct: 100 },
  { id: "ash-1", kind: "unit", catalogId: "ashrider", x: 58, y: 42, hpPct: 64 },
  { id: "warden-1", kind: "unit", catalogId: "warden", x: 18, y: 36, hpPct: 88 },
  { id: "seer-1", kind: "unit", catalogId: "seer", x: 34, y: 70, hpPct: 100 },
]

export function MatchHud({
  factionId,
  mapId,
  difficultyId,
  chapterId,
  source,
  ageId,
}: {
  factionId: string
  mapId: string
  difficultyId?: string
  chapterId?: string
  source: string
  ageId?: string
}) {
  const faction = factionById(factionId)
  const map = mapById(mapId)
  const difficulty = difficultyId ? difficultyById(difficultyId) : null
  const chapter = chapterId ? chapterById(chapterId) : null
  const ageIndex = Math.max(0, AGES.findIndex((a) => a.id === (ageId ?? "forge")))
  const age = AGES[ageIndex] ?? AGES[1]

  const [selectedId, setSelectedId] = useState<string | null>("guard-1")
  const [paused, setPaused] = useState(false)
  const [ageRite, setAgeRite] = useState<"idle" | "channeling" | "error">("idle")
  const [queue, setQueue] = useState<QueueItem[]>([
    { id: "q1", name: "Banner Guard", progress: 62 },
    { id: "q2", name: "Hearth Levy", progress: 18 },
  ])
  const [resources, setResources] = useState({ grain: 812, timber: 640, ore: 355, relics: 4 })
  const [pop] = useState({ used: 24, cap: 50 })
  const [commandTab, setCommandTab] = useState<"orders" | "build" | "train">("orders")

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return
      if (ageRite !== "idle") {
        setAgeRite("idle")
        return
      }
      setPaused((open) => !open)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [ageRite])

  const selected = START_TOKENS.find((t) => t.id === selectedId) ?? null
  const catalog = selected
    ? selected.kind === "unit"
      ? UNITS.find((u) => u.id === selected.catalogId)
      : BUILDINGS.find((b) => b.id === selected.catalogId)
    : undefined

  const orders = useMemo(
    () => [
      { id: "move", name: "March", key: "M" },
      { id: "halt", name: "Hold", key: "H" },
      { id: "patrol", name: "Patrol", key: "P" },
      { id: "garrison", name: "Garrison", key: "G" },
      { id: "strike", name: "Strike", key: "A" },
      { id: "stance", name: "Stance", key: "T" },
    ],
    [],
  )
  const builds = [
    { id: "granary", name: "Granary" },
    { id: "timber", name: "Timber Camp" },
    { id: "ore", name: "Ore Pit" },
    { id: "reliquary", name: "Reliquary" },
  ]
  const trains = [
    { id: "levy", name: "Hearth Levy" },
    { id: "guard", name: "Banner Guard" },
    { id: "ashrider", name: "Ashrider" },
    { id: "warden", name: "Grove Warden" },
  ]

  function enqueue(name: string) {
    setQueue((q) => [...q, { id: `q-${Date.now()}`, name, progress: 4 }])
    setResources((r) => ({ ...r, grain: Math.max(0, r.grain - 50), ore: Math.max(0, r.ore - 20) }))
  }

  return (
    <div className="relative flex min-h-dvh flex-col cinematic-bg text-foreground">
      <div className="grain-overlay opacity-10" />

      <header className="relative z-20 flex flex-wrap items-center gap-2 border-b border-primary/25 bg-black/45 px-2 py-1.5 backdrop-blur-sm sm:gap-4 sm:px-3">
        <p className="font-heading hidden text-[11px] tracking-[0.28em] text-primary uppercase sm:block">
          {faction.name}
        </p>
        <ResourceChip icon={<Wheat className="size-3.5" />} label="Grain" value={resources.grain} />
        <ResourceChip icon={<Trees className="size-3.5" />} label="Timber" value={resources.timber} />
        <ResourceChip icon={<Anvil className="size-3.5" />} label="Ore" value={resources.ore} />
        <ResourceChip icon={<Coins className="size-3.5" />} label="Relics" value={resources.relics} />
        <Badge variant="secondary" className="ml-auto font-heading tracking-wide">
          {age.name}
        </Badge>
        <span className="text-xs tabular-nums text-muted-foreground">
          Banners {pop.used}/{pop.cap}
        </span>
        <Button
          size="icon-sm"
          variant="outline"
          aria-label="Pause"
          onClick={() => setPaused(true)}
        >
          <Pause />
        </Button>
      </header>

      <div className="relative z-10 grid min-h-0 flex-1 grid-cols-1 grid-rows-[1fr_auto] lg:grid-cols-[1fr_11rem]">
        <div className="relative min-h-[42vh] overflow-hidden lg:min-h-0">
          <Battlefield
            accent={faction.color}
            tokens={START_TOKENS}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
          <div className="pointer-events-none absolute top-3 left-3 max-w-[min(100%-6rem,22rem)] rounded-sm border border-primary/25 bg-black/50 px-3 py-2 text-xs backdrop-blur-sm">
            <p className="font-heading tracking-widest text-primary uppercase">{map.name}</p>
            <p className="mt-0.5 text-muted-foreground">
              {source === "campaign" && chapter
                ? `${chapter.title} · ${faction.epithet}`
                : `${difficulty?.name ?? "Skirmish"} · ${faction.epithet}`}
            </p>
          </div>
          {ageRite === "channeling" ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/55">
              <LoadingState
                title={`Channeling ${AGES[Math.min(ageIndex + 1, AGES.length - 1)].name}`}
                detail="The Hearth Hall drinks Ore and Relics. This mock will not finish the rite — cancel to return to the field."
              />
              <Button className="absolute top-6 right-6" variant="outline" onClick={() => setAgeRite("idle")}>
                Cancel rite
              </Button>
            </div>
          ) : null}
          {ageRite === "error" ? (
            <div className="absolute inset-x-4 top-16 z-10 mx-auto max-w-lg">
              <ErrorState
                title="The reliquary will not answer"
                detail="Citadel Age requires a standing Reliquary. Yours still stands — the rite failed because this mock has no engine behind it."
                onRetry={() => setAgeRite("idle")}
                retryLabel="Dismiss"
              />
            </div>
          ) : null}
        </div>

        <aside className="hidden border-l border-primary/20 bg-black/40 p-2 lg:block">
          <p className="mb-2 text-[10px] tracking-[0.3em] text-primary/80 uppercase">Cartograph</p>
          <Minimap accent={faction.color} tokens={START_TOKENS} selectedId={selectedId} />
          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">{map.notes}</p>
        </aside>
      </div>

      <footer className="relative z-20 border-t border-primary/25 bg-black/70">
        <div className="grid gap-3 p-2 sm:p-3 lg:grid-cols-[9rem_minmax(0,1fr)_14rem_13rem]">
          <Portrait token={selected} catalogName={catalog?.name} accent={faction.color} />
          <SelectionPanel selected={selected} catalog={catalog} />
          <CommandGrid
            tab={commandTab}
            onTab={setCommandTab}
            orders={orders}
            builds={builds}
            trains={trains}
            onTrain={enqueue}
            onAge={() => setAgeRite(ageIndex >= 2 ? "error" : "channeling")}
          />
          <BuildQueue
            items={queue}
            onCancel={(id) => setQueue((q) => q.filter((i) => i.id !== id))}
          />
        </div>
        <div className="flex items-center justify-between border-t border-primary/10 px-3 py-1.5 lg:hidden">
          <Sheet>
            <SheetTrigger render={<Button size="sm" variant="outline" />}>
              <MapIcon />
              Minimap
            </SheetTrigger>
            <SheetContent side="right" className="bg-card">
              <SheetHeader>
                <SheetTitle className="font-heading text-primary">Cartograph</SheetTitle>
              </SheetHeader>
              <Minimap accent={faction.color} tokens={START_TOKENS} selectedId={selectedId} />
            </SheetContent>
          </Sheet>
          <p className="text-[11px] text-muted-foreground">{GAME_FOOTER}</p>
        </div>
      </footer>

      {paused ? (
        <Overlay
          title="The field is held"
          description="Pause does not freeze a simulation — there is none. Use it as a steward would: to read the map, open settings, or resign the banner."
        >
          <Button className="w-full" onClick={() => setPaused(false)}>
            Resume
          </Button>
          <Button className="w-full" variant="outline" render={<Link href="/settings" />}>
            Settings
          </Button>
          <Button className="w-full" variant="destructive" render={<Link href="/" />}>
            Resign to menu
          </Button>
        </Overlay>
      ) : null}
    </div>
  )
}

const GAME_FOOTER = "Interface mock · no engine"

function ResourceChip({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: number
}) {
  return (
    <Tooltip>
      <TooltipTrigger className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs tabular-nums">
        <span className="text-primary">{icon}</span>
        <span className="hidden sm:inline text-muted-foreground">{label}</span>
        <span>{value.toLocaleString()}</span>
      </TooltipTrigger>
      <TooltipContent>
        {label}: {value.toLocaleString()}
      </TooltipContent>
    </Tooltip>
  )
}

function Battlefield({
  accent,
  tokens,
  selectedId,
  onSelect,
}: {
  accent: string
  tokens: Token[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <div className="relative h-full min-h-[42vh] w-full bg-[#1d2a1c]">
      <svg viewBox="0 0 100 70" className="absolute inset-0 h-full w-full" aria-hidden>
        <rect width="100" height="70" fill="#243224" />
        <path d="M0 40 C20 32 40 48 60 38 C78 30 90 44 100 40 L100 70 L0 70Z" fill="#1a3a42" opacity="0.85" />
        <path d="M0 0 C18 8 22 22 8 28 C-2 20 0 8 0 0Z" fill="#2f4a32" />
        <path d="M70 4 C88 0 100 12 96 24 C84 30 70 16 70 4Z" fill="#4a3b26" />
        <path d="M12 8 C18 6 22 14 16 16 C12 16 10 10 12 8Z" fill="#1f3324" />
        <circle cx="72" cy="22" r="3" fill="#8a6a32" />
        <circle cx="78" cy="18" r="2.2" fill="#d4a850" />
        <circle cx="54" cy="36" r="1.6" fill="#d4a850" />
      </svg>
      {tokens.map((token) => (
        <button
          key={token.id}
          type="button"
          onClick={() => onSelect(token.id)}
          aria-pressed={selectedId === token.id}
          aria-label={token.catalogId}
          className={cn(
            "absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-sm border sm:size-5",
            token.kind === "building" ? "rounded-[3px]" : "rounded-full",
            selectedId === token.id ? "ring-2 ring-primary" : "ring-0",
          )}
          style={{
            left: `${token.x}%`,
            top: `${token.y}%`,
            background: token.kind === "building" ? accent : "#e8d5a3",
            borderColor: selectedId === token.id ? "var(--primary)" : "#1a120c",
          }}
        />
      ))}
    </div>
  )
}

function Minimap({
  accent,
  tokens,
  selectedId,
}: {
  accent: string
  tokens: Token[]
  selectedId: string | null
}) {
  return (
    <div className="gold-trim relative aspect-square overflow-hidden rounded-sm bg-[#1d2a1c]">
      <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden>
        <rect width="100" height="100" fill="#243224" />
        <path d="M0 58 C30 48 55 70 100 58 L100 100 L0 100Z" fill="#1a3a42" />
        <rect x="18" y="18" width="28" height="20" fill="none" stroke="#d4a850" strokeWidth="1.2" />
      </svg>
      {tokens.map((t) => (
        <span
          key={t.id}
          className="absolute size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            left: `${t.x}%`,
            top: `${t.y}%`,
            background: t.id === selectedId ? "#fff" : t.kind === "building" ? accent : "#e8d5a3",
          }}
        />
      ))}
    </div>
  )
}

function Portrait({
  token,
  catalogName,
  accent,
}: {
  token: Token | null
  catalogName?: string
  accent: string
}) {
  return (
    <div className="gold-trim hidden h-28 overflow-hidden rounded-sm bg-[#1a1410] sm:block">
      {token ? (
        <div className="flex h-full flex-col items-center justify-center gap-1" style={{ background: `${accent}22` }}>
          <Flag className="size-10 text-primary" />
          <p className="px-2 text-center font-heading text-xs tracking-wide text-primary">{catalogName}</p>
        </div>
      ) : (
        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No likeness</div>
      )}
    </div>
  )
}

function SelectionPanel({
  selected,
  catalog,
}: {
  selected: Token | null
  catalog?: {
    name: string
    kind: string
    lore: string
    hp?: number
    attack?: number
    armor?: number
  }
}) {
  if (!selected || !catalog) {
    return (
      <EmptyState
        className="min-h-28 py-6"
        title="Nothing selected"
        detail="Click a banner on the field — a hall, a levy, a rider — to fill this panel. The mock will not path them."
      />
    )
  }
  return (
    <div className="min-h-28 rounded-sm border border-primary/20 bg-card/50 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-heading text-base text-primary">{catalog.name}</h2>
        <Badge variant="outline">{catalog.kind}</Badge>
      </div>
      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{catalog.lore}</p>
      <div className="mt-2 flex flex-wrap gap-3 text-xs tabular-nums">
        <span>Integrity {selected.hpPct}%</span>
        {"attack" in catalog && catalog.attack != null ? <span>Strike {catalog.attack}</span> : null}
        {"armor" in catalog && catalog.armor != null ? <span>Plate {catalog.armor}</span> : null}
      </div>
      <Progress value={selected.hpPct} className="mt-2 w-full">
        <span className="sr-only">Hit points</span>
      </Progress>
    </div>
  )
}

function CommandGrid({
  tab,
  onTab,
  orders,
  builds,
  trains,
  onTrain,
  onAge,
}: {
  tab: "orders" | "build" | "train"
  onTab: (t: "orders" | "build" | "train") => void
  orders: { id: string; name: string; key: string }[]
  builds: { id: string; name: string }[]
  trains: { id: string; name: string }[]
  onTrain: (name: string) => void
  onAge: () => void
}) {
  const items = tab === "orders" ? orders : tab === "build" ? builds : trains
  return (
    <div className="rounded-sm border border-primary/20 bg-card/50 p-2">
      <div className="mb-2 flex gap-1">
        {(["orders", "build", "train"] as const).map((t) => (
          <Button key={t} size="xs" variant={tab === t ? "default" : "ghost"} onClick={() => onTab(t)}>
            {t === "orders" ? "Orders" : t === "build" ? "Raise" : "Train"}
          </Button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-3">
        {items.map((item) => (
          <Button
            key={item.id}
            variant="outline"
            size="sm"
            className="h-auto flex-col py-2 text-[11px]"
            onClick={() => {
              if (tab === "train") onTrain(item.name)
            }}
          >
            {tab === "build" ? <Hammer className="size-3.5" /> : <Scroll className="size-3.5" />}
            {item.name}
          </Button>
        ))}
        <Button variant="secondary" size="sm" className="h-auto flex-col py-2 text-[11px]" onClick={onAge}>
          Advance Age
        </Button>
      </div>
    </div>
  )
}

function BuildQueue({
  items,
  onCancel,
}: {
  items: QueueItem[]
  onCancel: (id: string) => void
}) {
  return (
    <div className="rounded-sm border border-primary/20 bg-card/50 p-2">
      <p className="mb-2 font-heading text-xs tracking-widest text-primary uppercase">Hall queue</p>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">The yard is idle. Train a levy or a guard.</p>
      ) : (
        <ScrollArea className="h-24">
          <ul className="space-y-2 pr-2">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs">{item.name}</p>
                  <Progress value={item.progress} className="mt-1" />
                </div>
                <Button size="icon-xs" variant="ghost" aria-label={`Cancel ${item.name}`} onClick={() => onCancel(item.id)}>
                  <X />
                </Button>
              </li>
            ))}
          </ul>
        </ScrollArea>
      )}
    </div>
  )
}
