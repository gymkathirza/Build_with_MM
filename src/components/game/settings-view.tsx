"use client"

import Link from "next/link"
import { useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CinematicShell } from "@/components/game/cinematic-shell"

export function SettingsView() {
  const [horns, setHorns] = useState(true)
  const [banners, setBanners] = useState(true)
  const [edgePan, setEdgePan] = useState(true)
  const [master, setMaster] = useState([70])
  const [music, setMusic] = useState([55])
  const [saved, setSaved] = useState(false)

  return (
    <CinematicShell>
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10 sm:px-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs tracking-[0.35em] text-primary/80 uppercase">Settings</p>
            <h1 className="font-heading text-3xl tracking-wide text-primary">The steward’s desk</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              These controls remember nothing beyond this page. They exist so the mock feels like a
              real options hall, not a settings dump.
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
            {saved ? "Noted. Nothing was written to disk." : "Unsaved — as all mock ledgers are."}
          </p>
          <Button onClick={() => setSaved(true)}>Record</Button>
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
