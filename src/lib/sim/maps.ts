import type { Res } from "./engine"

export const HUGE_MAP_ID = "vast-mere"

export type MapSpec = {
  id: string
  size: number
  popCap: number
  startLevies: number
  pad: number
}

export const MAP_SPECS: Record<string, MapSpec> = {
  emberglass: { id: "emberglass", size: 88, popCap: 28, startLevies: 4, pad: 14 },
  shattercoast: { id: "shattercoast", size: 120, popCap: 40, startLevies: 5, pad: 16 },
  nightgrove: { id: "nightgrove", size: 140, popCap: 48, startLevies: 5, pad: 18 },
  hollowmere: { id: "hollowmere", size: 170, popCap: 56, startLevies: 6, pad: 20 },
  sunvault: { id: "sunvault", size: 200, popCap: 72, startLevies: 8, pad: 24 },
  [HUGE_MAP_ID]: { id: HUGE_MAP_ID, size: 280, popCap: 100, startLevies: 12, pad: 32 },
}

export function specFor(mapId: string): MapSpec {
  return MAP_SPECS[mapId] ?? MAP_SPECS[HUGE_MAP_ID]
}

export type NodeSeed = { type: Res; ox: number; oy: number; amount: number }

/** Offsets from the south-west hall, biased inward so 180° copies stay on the plate. */
export function localNodes(size: number): NodeSeed[] {
  const s = size / 100
  const extra: NodeSeed[] =
    size >= 200
      ? [
          { type: "grain", ox: 14 * s, oy: -4 * s, amount: 1400 },
          { type: "timber", ox: 4 * s, oy: -16 * s, amount: 1200 },
          { type: "ore", ox: 18 * s, oy: 6 * s, amount: 820 },
        ]
      : []
  return [
    { type: "grain", ox: 6 * s, oy: -10 * s, amount: 1100 },
    { type: "grain", ox: 10 * s, oy: 8 * s, amount: 1100 },
    { type: "timber", ox: 10 * s, oy: -8 * s, amount: 980 },
    { type: "timber", ox: 12 * s, oy: 6 * s, amount: 980 },
    { type: "ore", ox: 16 * s, oy: -4 * s, amount: 640 },
    { type: "relics", ox: 8 * s, oy: -18 * s, amount: 8 },
    ...extra,
  ]
}

/** Center contest nodes, 180° symmetric pairs. */
export function contestNodes(size: number): NodeSeed[] {
  const c = size / 2
  const pairs: [number, number, Res, number][] = [
    [0, -6, "ore", 900],
    [4, 5, "relics", 10],
    [-14, 12, "grain", 700],
    [14, -12, "timber", 700],
  ]
  if (size >= 200) {
    pairs.push(
      [-32, -22, "ore", 860],
      [32, 22, "ore", 860],
      [-28, 26, "timber", 920],
      [28, -26, "timber", 920],
      [22, 34, "grain", 840],
      [-22, -34, "grain", 840],
      [-10, 28, "relics", 12],
      [10, -28, "relics", 12],
    )
  }
  return pairs.map(([dx, dy, type, amount]) => ({ type, ox: c + dx, oy: c + dy, amount }))
}

export type HallAxis = "w-e" | "e-w"

export function hallPositions(spec: MapSpec, axis: HallAxis = "w-e") {
  const mid = spec.size / 2
  if (axis === "e-w") {
    return {
      p0: { x: spec.size - spec.pad, y: mid },
      p1: { x: spec.pad, y: mid },
    }
  }
  return {
    p0: { x: spec.pad, y: mid },
    p1: { x: spec.size - spec.pad, y: mid },
  }
}
