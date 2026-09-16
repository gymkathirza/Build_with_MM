import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import type { LiveObs } from "./score"

export type { LiveObs }

const livePath = join(process.cwd(), "src/lib/ml/live-obs.json")

export function writeLiveObs(sample: LiveObs) {
  mkdirSync(dirname(livePath), { recursive: true })
  writeFileSync(livePath, JSON.stringify({ ...sample, at: Date.now() }, null, 2))
}

export function readLiveObs(): LiveObs | null {
  try {
    const raw = JSON.parse(readFileSync(livePath, "utf8")) as LiveObs
    if (!raw || typeof raw.fps !== "number") return null
    if (raw.at && Date.now() - raw.at > 15 * 60_000) return null
    return raw
  } catch {
    return null
  }
}
