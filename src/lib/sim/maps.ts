import type { Fauna, Res } from "./engine"

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

export type NodeSeed = { type: Res; ox: number; oy: number; amount: number; fauna?: Fauna }

/** Offsets from the west hall, kept tight so the opening camera actually sees them. */
export function localNodes(size: number): NodeSeed[] {
  const s = size / 100
  const extra: NodeSeed[] =
    size >= 200
      ? [
          { type: "grain", ox: 8 * s, oy: -3 * s, amount: 1400 },
          { type: "timber", ox: 4 * s, oy: -6 * s, amount: 1200 },
          { type: "ore", ox: 10 * s, oy: 3 * s, amount: 820 },
          { type: "grain", ox: 7 * s, oy: -5 * s, amount: 520, fauna: "deer" },
          { type: "grain", ox: 6 * s, oy: 6 * s, amount: 480, fauna: "boar" },
        ]
      : [{ type: "grain", ox: 6 * s, oy: -4 * s, amount: 360, fauna: "deer" }]
  return [
    { type: "grain", ox: 4 * s, oy: -5 * s, amount: 1100 },
    { type: "grain", ox: 6 * s, oy: 4 * s, amount: 1100 },
    { type: "timber", ox: 5 * s, oy: -4 * s, amount: 980 },
    { type: "timber", ox: 7 * s, oy: 3 * s, amount: 980 },
    { type: "ore", ox: 8 * s, oy: -2 * s, amount: 640 },
    { type: "relics", ox: 4 * s, oy: -3 * s, amount: 8 },
    { type: "grain", ox: 3 * s, oy: -6 * s, amount: 420, fauna: "deer" },
    { type: "grain", ox: 8 * s, oy: 5 * s, amount: 380, fauna: "boar" },
    ...extra,
  ]
}

/** Center contest nodes, 180° symmetric pairs. */
export function contestNodes(size: number): NodeSeed[] {
  const c = size / 2
  const pairs: NodeSeed[] = [
    { type: "ore", ox: c, oy: c - 6, amount: 900 },
    { type: "relics", ox: c + 4, oy: c + 5, amount: 10 },
    { type: "grain", ox: c - 14, oy: c + 12, amount: 700 },
    { type: "timber", ox: c + 14, oy: c - 12, amount: 700 },
    { type: "grain", ox: c - 8, oy: c - 16, amount: 280, fauna: "wolf" },
    { type: "grain", ox: c + 8, oy: c + 16, amount: 280, fauna: "wolf" },
  ]
  if (size >= 200) {
    pairs.push(
      { type: "ore", ox: c - 32, oy: c - 22, amount: 860 },
      { type: "ore", ox: c + 32, oy: c + 22, amount: 860 },
      { type: "timber", ox: c - 28, oy: c + 26, amount: 920 },
      { type: "timber", ox: c + 28, oy: c - 26, amount: 920 },
      { type: "grain", ox: c + 22, oy: c + 34, amount: 840 },
      { type: "grain", ox: c - 22, oy: c - 34, amount: 840 },
      { type: "relics", ox: c - 10, oy: c + 28, amount: 12 },
      { type: "relics", ox: c + 10, oy: c - 28, amount: 12 },
      { type: "grain", ox: c - 18, oy: c + 6, amount: 360, fauna: "bear" },
      { type: "grain", ox: c + 18, oy: c - 6, amount: 360, fauna: "bear" },
    )
  }
  return pairs
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
