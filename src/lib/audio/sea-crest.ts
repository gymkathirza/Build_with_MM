export const SEA_CREST_SECONDS = 2.4

/** Two wave crests with one distinct seabird in the middle. Original, not a sample. */
export function generateSeaCrest(
  sampleRate: number,
  seconds = SEA_CREST_SECONDS,
  rng: () => number = Math.random,
): Float32Array {
  const n = Math.floor(sampleRate * seconds)
  const out = new Float32Array(n)
  let brown = 0
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate
    const u = t / seconds
    const crestA = Math.exp(-Math.pow((u - 0.14) / 0.12, 2))
    const crestB = Math.exp(-Math.pow((u - 0.86) / 0.12, 2))
    const bed = 0.1
    const wave = crestA * 0.95 + crestB * 1 + bed
    brown += (rng() * 2 - 1) * 0.07
    brown *= 0.97
    const surf = brown * wave * 0.62

    const birdWindow = Math.exp(-Math.pow((u - 0.5) / 0.1, 2))
    const cry = gullCry(t)
    const bird = birdWindow * cry * 0.28
    out[i] = Math.max(-1, Math.min(1, surf + bird))
  }
  return out
}

/** One bird: a falling-then-rise gull cry, pulsed three times in the mid window. */
function gullCry(t: number): number {
  const local = t % 0.42
  const pulse = local < 0.16 ? Math.pow(Math.sin((local / 0.16) * Math.PI), 1.4) : 0
  const freq = 2350 - 900 * (local / 0.16) + 220 * Math.sin(t * 9)
  return pulse * Math.sin(2 * Math.PI * freq * t)
}

export function playSeaCrestFromContext(ctx: AudioContext) {
  const rate = ctx.sampleRate
  const samples = generateSeaCrest(rate)
  const buffer = ctx.createBuffer(1, samples.length, rate)
  buffer.getChannelData(0).set(samples)
  const src = ctx.createBufferSource()
  const gain = ctx.createGain()
  gain.gain.value = 0.55
  src.buffer = buffer
  src.connect(gain)
  gain.connect(ctx.destination)
  src.start()
  return () => {
    try {
      src.stop()
    } catch {
      /* already ended */
    }
  }
}
