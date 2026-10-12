"use client"

import Link from "next/link"
import { useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CinematicShell } from "@/components/game/cinematic-shell"

type Steward = {
  horns: boolean
  banners: boolean
  edgePan: boolean
  master: number[]
  music: number[]
}

function loadSteward(): Steward {
  const fallback: Steward = { horns: true, banners: true, edgePan: true, master: [70], music: [55] }
  if (typeof window === "undefined") return fallback
  try {
    const raw = localStorage.getItem("mm-steward")
    if (!raw) return fallback
    const v = JSON.parse(raw) as { horns?: boolean; banners?: boolean; edgePan?: boolean; master?: number; music?: number }
    return {
      horns: typeof v.horns === "boolean" ? v.horns : fallback.horns,
      banners: typeof v.banners === "boolean" ? v.banners : fallback.banners,
      edgePan: typeof v.edgePan === "boolean" ? v.edgePan : fallback.edgePan,
      master: typeof v.master === "number" ? [v.master] : fallback.master,
      music: typeof v.music === "number" ? [v.music] : fallback.music,
    }
  } catch {
    return fallback
  }
}

export function SettingsView() {
  const [seed] = useState(loadSteward)
  const [horns, setHorns] = useState(seed.horns)
  const [banners, setBanners] = useState(seed.banners)
  const [edgePan, setEdgePan] = useState(seed.edgePan)
  const [master, setMaster] = useState(seed.master)
  const [music, setMusic] = useState(seed.music)
  const [saved, setSaved] = useState(false)

  return (
    <CinematicShell>
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10 sm:px-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs tracking-[0.35em] text-primary/80 uppercase">Settings</p>
            <h1 className="font-heading text-3xl tracking-wide text-primary">The steward’s desk</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Horns, banner dyes, and how tightly the cartographer draws. Changes apply on this
              device until you furl the page.
            </p>
          </div>
          <Button variant="outline" render={<Link href="/" />}>
            Main menu
          </Button>
        </header>

        <Tabs defaultValue="banners" className="gold-trim rounded-sm bg-card/60 p-4">
          <TabsList variant="line" className="w-full justify-start">
            <TabsTrigger value="banners">Banners</TabsTrigger>
            <TabsTrigger value="horns">Horns</TabsTrigger>
            <TabsTrigger value="table">Table</TabsTrigger>
          </TabsList>

          <TabsContent value="banners" className="space-y-5 pt-4">
            <Row
              title="Faction colours on the minimap"
              detail="When off, every rival is the same dull bronze. Easier to read; harder to tell Compact from Khanate at a glance."
            >
              <Switch checked={banners} onCheckedChange={setBanners} aria-label="Faction colours" />
            </Row>
            <Row
              title="Health numerals on portraits"
              detail="Shows exact hit points beside the painted likeness. Veterans often leave this off."
            >
              <Switch defaultChecked aria-label="Health numerals" />
            </Row>
          </TabsContent>

          <TabsContent value="horns" className="space-y-6 pt-4">
            <Row
              title="Battle horns"
              detail="Warns when a keep is struck or a relic stand is claimed. Silence if you are reading the field, not the score."
            >
              <Switch checked={horns} onCheckedChange={setHorns} aria-label="Battle horns" />
            </Row>
            <div className="space-y-2">
              <Label>Master</Label>
              <Slider
                value={master}
                onValueChange={(v) => setMaster(Array.isArray(v) ? v : [v])}
                max={100}
              />
            </div>
            <div className="space-y-2">
              <Label>Chronicle score</Label>
              <Slider
                value={music}
                onValueChange={(v) => setMusic(Array.isArray(v) ? v : [v])}
                max={100}
                disabled={!horns}
              />
            </div>
          </TabsContent>

          <TabsContent value="table" className="space-y-5 pt-4">
            <Row
              title="Edge pan"
              detail="Drag the viewport by parking the cursor at the screen’s rim. On a narrow device this stays off by default in spirit — toggle it anyway."
            >
              <Switch checked={edgePan} onCheckedChange={setEdgePan} aria-label="Edge pan" />
            </Row>
            <Row
              title="Grid overlay"
              detail="A faint surveyor’s lattice over the battlefield. Useful for placing halls; ugly in screenshots."
            >
              <Switch aria-label="Grid overlay" />
            </Row>
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {saved ? "Noted for this sitting." : "Unsaved. Record before you march."}
          </p>
          <Button
            onClick={() => {
              try {
                localStorage.setItem(
                  "mm-steward",
                  JSON.stringify({ horns, banners, edgePan, master: master[0], music: music[0] }),
                )
              } catch {
                /* private mode */
              }
              setSaved(true)
            }}
          >
            Record
          </Button>
        </div>
      </div>
    </CinematicShell>
  )
}

function Row({
  title,
  detail,
  children,
}: {
  title: string
  detail: string
  children: ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
      {children}
    </div>
  )
}
