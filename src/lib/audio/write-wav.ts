import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { generateSeaCrest } from "./sea-crest"

function encodeWavPcm16(samples: Float32Array, sampleRate: number): Buffer {
  const dataSize = samples.length * 2
  const buf = Buffer.alloc(44 + dataSize)
  buf.write("RIFF", 0)
  buf.writeUInt32LE(36 + dataSize, 4)
  buf.write("WAVE", 8)
  buf.write("fmt ", 12)
  buf.writeUInt32LE(16, 16)
  buf.writeUInt16LE(1, 20)
  buf.writeUInt16LE(1, 22)
  buf.writeUInt32LE(sampleRate, 24)
  buf.writeUInt32LE(sampleRate * 2, 28)
  buf.writeUInt16LE(2, 32)
  buf.writeUInt16LE(16, 34)
  buf.write("data", 36)
  buf.writeUInt32LE(dataSize, 40)
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    buf.writeInt16LE(Math.round(s * 32767), 44 + i * 2)
  }
  return buf
}

const rate = 22050
const wav = encodeWavPcm16(generateSeaCrest(rate), rate)

function write(path: string) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, wav)
}

write(join(process.cwd(), "public/audio/sea-crest.wav"))
const store = process.env.STORE_MEDIA
if (store) write(join(store, "sea-crest.wav"))
console.log(`wrote sea-crest.wav (${wav.length} bytes)`)
