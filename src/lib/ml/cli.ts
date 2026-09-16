import { writeFileSync } from "node:fs"
import { join } from "node:path"
import { formatLoopReport, runPlaytestLoop } from "./run-playtest"

const result = runPlaytestLoop(3, 4, 180)
console.log(formatLoopReport(result))
writeFileSync(join(process.cwd(), "src/lib/ml/tuned.json"), JSON.stringify(result.tuned, null, 2))
