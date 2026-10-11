import assert from "node:assert/strict"
import { test } from "node:test"
import { generateSeaCrest, SEA_CREST_SECONDS, safeCloseAudioContext } from "./sea-crest"

test("sea crest has two wave peaks and a mid bird", () => {
  const rate = 8000
  const samples = generateSeaCrest(rate, SEA_CREST_SECONDS, () => 0.37)
  const energy = (a: number, b: number) => {
    let s = 0
    for (let i = a; i < b; i++) s += samples[i] * samples[i]
    return s / Math.max(1, b - a)
  }
  const n = samples.length
  const start = energy(0, Math.floor(n * 0.25))
  const mid = energy(Math.floor(n * 0.4), Math.floor(n * 0.6))
  const end = energy(Math.floor(n * 0.75), n)
  const trough = energy(Math.floor(n * 0.28), Math.floor(n * 0.38))
  assert.ok(start > trough, `start ${start} vs trough ${trough}`)
  assert.ok(end > trough, `end ${end} vs trough ${trough}`)
  assert.ok(mid > 0)
})

test("safeCloseAudioContext never closes a closed context", () => {
  let closes = 0
  const ctx = {
    state: "running",
    close() {
      if (this.state === "closed") {
        throw new Error("InvalidStateError: Cannot close a closed AudioContext")
      }
      this.state = "closed"
      closes++
      return Promise.resolve()
    },
  }
  safeCloseAudioContext(ctx)
  safeCloseAudioContext(ctx)
  safeCloseAudioContext(null)
  assert.equal(closes, 1)
  assert.equal(ctx.state, "closed")
})
