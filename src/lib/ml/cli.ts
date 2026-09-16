import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { DEFAULT_TUNED, type Tuned } from "./score"
import { formatLoopReport, runHourBenchmark, runPlaytestLoop, summarizeBenchmark } from "./run-playtest"

const root = process.cwd()
const tunedPath = join(root, "src/lib/ml/tuned.json")
const hour = process.argv.includes("--hour")
const minutes = Number(process.env.BENCH_MINUTES ?? (hour ? 60 : 0))

function loadTuned(): Tuned {
  try {
    const raw = JSON.parse(readFileSync(tunedPath, "utf8")) as Tuned
    return { ...DEFAULT_TUNED, ...raw, ai: { ...DEFAULT_TUNED.ai, ...raw.ai } }
  } catch {
    return { ...DEFAULT_TUNED, ai: { ...DEFAULT_TUNED.ai } }
  }
}

if (hour) {
  const seed = loadTuned()
  const ms = Math.max(60_000, minutes * 60_000)
  console.log(`Hour benchmark: ${minutes} min wall-clock, seed round ${seed.round}`)
  const result = runHourBenchmark(ms, seed, 6, 200, (rec, tuned) => {
    if (rec.round === 1 || rec.round % 20 === 0) {
      console.log(
        `t+${(rec.elapsedMs / 60000).toFixed(1)}m round ${rec.round} P0/P1/draw ${rec.p0}/${rec.p1}/${rec.draw} south/north ${rec.south}/${rec.north} sim ${rec.simMs.toFixed(3)}ms peak ${rec.peak} fps~${rec.fps.toFixed(0)} q=${tuned.quality} lod=${tuned.lodDistance} persona=${rec.persona}`,
      )
    }
    if (rec.round === 1 || rec.round % 80 === 0) {
      writeFileSync(tunedPath, JSON.stringify(tuned, null, 2))
    }
  })
  const summary = summarizeBenchmark(result)
  writeFileSync(tunedPath, JSON.stringify(result.tuned, null, 2))
  writeFileSync(join(root, "src/lib/ml/benchmark-latest.json"), JSON.stringify(summary, null, 2))
  console.log(
    `Done: ${summary.games} games in ${summary.wallMinutes.toFixed(2)} min · finish ${(1 - summary.drawRate) * 100}% · P0/P1 ${summary.p0Wins}/${summary.p1Wins} · south ${(summary.southWinRate * 100).toFixed(1)}% · avg ${summary.avgDurationSec.toFixed(0)}s · sim ${summary.avgSimMs.toFixed(3)}ms · peak ${summary.avgPeakEntities.toFixed(0)}`,
  )
} else {
  const result = runPlaytestLoop(2, 2, 75)
  console.log(formatLoopReport(result))
  writeFileSync(tunedPath, JSON.stringify(result.tuned, null, 2))
}
