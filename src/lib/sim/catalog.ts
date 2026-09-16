export const WORLD = 100
export const TICK_HZ = 20
export const DT = 1 / TICK_HZ
export const POP_CAP = 32

export const UNIT_STATS = {
  levy: { hp: 40, atk: 3, armor: 0, range: 1.6, speed: 11, pop: 1, cd: 1.1 },
  guard: { hp: 75, atk: 8, armor: 2, range: 1.8, speed: 8.5, pop: 1, cd: 1.05 },
  ashrider: { hp: 110, atk: 12, armor: 1, range: 1.7, speed: 15, pop: 2, cd: 1.0 },
  warden: { hp: 55, atk: 9, armor: 0, range: 7.5, speed: 10, pop: 1, cd: 1.2 },
} as const

export type UnitType = keyof typeof UNIT_STATS

export const BUILDING_STATS = {
  hearth: { hp: 1200, radius: 3.2, pop: 0 },
  yard: { hp: 900, radius: 2.4, pop: 0 },
  lodge: { hp: 850, radius: 2.4, pop: 0 },
  camp: { hp: 500, radius: 2.0, pop: 0 },
  pit: { hp: 500, radius: 2.0, pop: 0 },
  granary: { hp: 450, radius: 2.0, pop: 0 },
} as const

export type BuildingType = keyof typeof BUILDING_STATS

export const COSTS = {
  levy: { grain: 50, timber: 0, ore: 0, relics: 0, time: 10, pop: 1, age: 0 },
  guard: { grain: 55, timber: 0, ore: 20, relics: 0, time: 12, pop: 1, age: 0 },
  ashrider: { grain: 70, timber: 20, ore: 45, relics: 0, time: 16, pop: 2, age: 1 },
  warden: { grain: 40, timber: 35, ore: 0, relics: 0, time: 13, pop: 1, age: 0 },
  yard: { grain: 0, timber: 90, ore: 20, relics: 0, time: 18, pop: 0, age: 0 },
  lodge: { grain: 0, timber: 110, ore: 40, relics: 0, time: 22, pop: 0, age: 1 },
  camp: { grain: 0, timber: 50, ore: 0, relics: 0, time: 12, pop: 0, age: 0 },
  pit: { grain: 0, timber: 60, ore: 15, relics: 0, time: 14, pop: 0, age: 0 },
  granary: { grain: 0, timber: 45, ore: 0, relics: 0, time: 12, pop: 0, age: 0 },
  age1: { grain: 280, timber: 0, ore: 140, relics: 0, time: 22, pop: 0, age: 0 },
  upgrade: { grain: 60, timber: 50, ore: 30, relics: 0, time: 0, pop: 0, age: 1 },
} as const

export const GATHER = {
  grain: { rate: 14, trip: 1.6 },
  timber: { rate: 12, trip: 1.8 },
  ore: { rate: 10, trip: 2.0 },
  relics: { rate: 1, trip: 3.2 },
} as const

export const AGE_NAMES = ["Ember Age", "Forge Age", "Citadel Age"] as const

export const UNIT_LABEL: Record<UnitType, string> = {
  levy: "Hearth Levy",
  guard: "Banner Guard",
  ashrider: "Ashrider",
  warden: "Grove Warden",
}

export const BUILDING_LABEL: Record<BuildingType, string> = {
  hearth: "Hearth Hall",
  yard: "Banner Yard",
  lodge: "Spur Lodge",
  camp: "Timber Camp",
  pit: "Ore Pit",
  granary: "Granary",
}
