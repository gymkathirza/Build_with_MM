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
  frameN: number
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
    frameN: 0,
  }
}

export function pushEvent(tel: Telemetry, kind: string, detail: string) {
  if (kind === "click") tel.clicks++
  else if (kind === "failed") tel.failedOrders++
  else if (kind === "camera") {
    tel.cameraMoves++
    return
  } else if (kind === "death") tel.deaths++
  tel.events.push({ t: performance.now(), kind, detail })
  if (tel.events.length > 80) tel.events.length = 48
}

export function pushFrame(tel: Telemetry, sample: FrameSample) {
  tel.frameN++
  const frames = tel.frames
  if (frames.length >= 48) frames.shift()
  frames.push(sample)
}

export function latestFrame(tel: Telemetry): FrameSample | null {
  return tel.frames.at(-1) ?? null
}

export function avg(tel: Telemetry, key: keyof FrameSample) {
  const n = tel.frames.length
  if (!n) return 0
  let s = 0
  for (let i = 0; i < n; i++) s += Number(tel.frames[i][key])
  return s / n
}
