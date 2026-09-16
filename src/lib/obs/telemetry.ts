export type UxEvent = {
  t: number
  kind: string
  detail: string
}

export type FrameSample = {
  fps: number
  frameMs: number
  simMs: number
  inputMs: number
  entities: number
}

export type Telemetry = {
  frames: FrameSample[]
  events: UxEvent[]
  clicks: number
  failedOrders: number
  cameraMoves: number
  deaths: number
  lastInputMs: number
}

export function createTelemetry(): Telemetry {
  return {
    frames: [],
    events: [],
    clicks: 0,
    failedOrders: 0,
    cameraMoves: 0,
    deaths: 0,
    lastInputMs: 0,
  }
}

export function pushEvent(tel: Telemetry, kind: string, detail: string) {
  tel.events.push({ t: performance.now(), kind, detail })
  if (tel.events.length > 120) tel.events.splice(0, tel.events.length - 80)
  if (kind === "click") tel.clicks++
  if (kind === "failed") tel.failedOrders++
  if (kind === "camera") tel.cameraMoves++
  if (kind === "death") tel.deaths++
}

export function pushFrame(tel: Telemetry, sample: FrameSample) {
  tel.frames.push(sample)
  if (tel.frames.length > 180) tel.frames.splice(0, tel.frames.length - 120)
}

export function latestFrame(tel: Telemetry): FrameSample | null {
  return tel.frames.at(-1) ?? null
}

export function avg(tel: Telemetry, key: keyof FrameSample) {
  if (!tel.frames.length) return 0
  return tel.frames.reduce((s, f) => s + Number(f[key]), 0) / tel.frames.length
}
