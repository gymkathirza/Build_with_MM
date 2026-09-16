export const GAME_TITLE = "Build with Manon Mani"
export const GAME_SHORT = "Manon Mani"
export const GAME_TAGLINE = "Four banners. Four epochs. One treaty left to break."

export const AGES = [
  {
    id: "ember",
    name: "Ember Age",
    blurb: "Hearth-fires and first banners. Villages, spears, and the oldest oaths.",
  },
  {
    id: "forge",
    name: "Forge Age",
    blurb: "Ore sings. Roads stitch the basins. Cavalry and true walls.",
  },
  {
    id: "citadel",
    name: "Citadel Age",
    blurb: "Keeps rise. Relic vaults open. Siege craft learns its name.",
  },
  {
    id: "dominion",
    name: "Dominion Age",
    blurb: "Empires claim the horizon. Wonder-works decide who the chroniclers remember.",
  },
] as const

export type AgeId = (typeof AGES)[number]["id"]

export const RESOURCES = [
  {
    id: "grain",
    name: "Grain",
    hint: "Feeds hearths, trains levy, and keeps the granary from going silent.",
  },
  {
    id: "timber",
    name: "Timber",
    hint: "Frames halls, palisades, and every keel the Saltwind still dares to float.",
  },
  {
    id: "ore",
    name: "Ore",
    hint: "Armour, tools, and the price of advancing an age.",
  },
  {
    id: "relics",
    name: "Relics",
    hint: "Shard-coins of the first accord. Spend them on wonders, seers, and age rites.",
  },
] as const

export type ResourceId = (typeof RESOURCES)[number]["id"]

export const FACTIONS = [
  {
    id: "ashen",
    name: "Ashen Compact",
    epithet: "Highland forge-clans",
    motto: "The fire remembers who fed it.",
    summary:
      "Volcanic highlanders bound by ember-oaths. Infantry holds the ridge; forges turn ore into stubborn steel.",
    bonus: "Forge halls produce Banner Guard 15% faster. Ore pits near lava seams yield extra.",
    color: "#c45c2a",
    accent: "#f0b27a",
  },
  {
    id: "verdant",
    name: "Verdant Conclave",
    epithet: "Grove-keepers of the rings",
    motto: "Time is measured in rings, not crowns.",
    summary:
      "Scholar-wardens of the living woods. Timber camps sing, and Grove Wardens root buildings that refuse to burn.",
    bonus: "Timber regenerates on claimed groves. Reliquaries research rites at half grain cost.",
    color: "#2f6a45",
    accent: "#9dcf8a",
  },
  {
    id: "saltwind",
    name: "Saltwind Khanate",
    epithet: "Riders of the inner sea",
    motto: "Where the tide turns, so do we.",
    summary:
      "Coastal nomads who treat shoreline as open steppe. Raiding fleets and Spur Lodge cavalry strike, then vanish.",
    bonus: "Tide Slips build one age early. Cavalry ignore shallow-water slow.",
    color: "#2a6d7a",
    accent: "#8fd4dc",
  },
  {
    id: "gilded",
    name: "Gilded Synod",
    epithet: "Merchant-priests of the sun vaults",
    motto: "Gold is a prayer the desert answers.",
    summary:
      "Desert syndics who trade relic-light for loyalty. Seers and vault-guards buy time the other banners spend in blood.",
    bonus: "Markets mint Relics from surplus Grain. Age rites cost less Ore.",
    color: "#b8862b",
    accent: "#f3d48a",
  },
] as const

export type FactionId = (typeof FACTIONS)[number]["id"]

export const MAPS = [
  {
    id: "hollowmere",
    name: "Hollowmere Basin",
    size: "Large",
    terrain: "Lakes, reed flats, twin fords",
    notes: "Four relic stands around a drowned keep. Control the fords or starve.",
    players: 4,
    status: "ready" as const,
  },
  {
    id: "shattercoast",
    name: "The Shattercoast",
    size: "Medium",
    terrain: "Cliffs, coves, timbered headlands",
    notes: "Naval lanes matter. Inland ore is scarce; wreck-beaches hide relics.",
    players: 2,
    status: "ready" as const,
  },
  {
    id: "emberglass",
    name: "Emberglass Pass",
    size: "Small",
    terrain: "Volcanic ridge, glass fields",
    notes: "Tight chokes. Ashen Compact starts with a claimed lava seam.",
    players: 2,
    status: "ready" as const,
  },
  {
    id: "sunvault",
    name: "Sunvault Dunes",
    size: "Large",
    terrain: "Erg, oasis rings, buried vaults",
    notes: "Long sightlines. Relics cluster in the old synod ruins.",
    players: 6,
    status: "ready" as const,
  },
  {
    id: "nightgrove",
    name: "Nightgrove",
    size: "Medium",
    terrain: "Deep wood, river braids",
    notes: "Fog sits until Citadel Age. Perfect for Conclave ambush doctrine.",
    players: 4,
    status: "ready" as const,
  },
  {
    id: "lost-cartograph",
    name: "The Lost Cartograph",
    size: "Unknown",
    terrain: "Unreadable",
    notes: "The surveyors never returned. This plate cannot be opened.",
    players: 0,
    status: "error" as const,
  },
] as const

export type MapId = (typeof MAPS)[number]["id"]

export const DIFFICULTIES = [
  {
    id: "squire",
    name: "Squire",
    blurb: "Rival banners expand slowly and rarely raid.",
  },
  {
    id: "captain",
    name: "Captain",
    blurb: "Honest pressure. Expect contested relics by Forge Age.",
  },
  {
    id: "marshal",
    name: "Marshal",
    blurb: "The AI plays the map. Fords, coasts, and age timing all matter.",
  },
  {
    id: "warlord",
    name: "Warlord",
    blurb: "Early harassment, greedy relics, and no wasted idle hearths.",
  },
  {
    id: "mythic",
    name: "Mythic",
    blurb: "The chroniclers will not be kind. One mistake ends the accord.",
  },
] as const

export type DifficultyId = (typeof DIFFICULTIES)[number]["id"]

export const CAMPAIGN_CHAPTERS = [
  {
    id: "hearth",
    number: 1,
    title: "The Last Hearth",
    act: "Act I — Kindling",
    synopsis:
      "Winter takes the upland villages. Hold Emberglass Pass long enough for the Compact to light a second forge.",
    unlocked: true,
    duration: "22 min",
    faction: "ashen" as FactionId,
    map: "emberglass" as MapId,
  },
  {
    id: "ash-wind",
    number: 2,
    title: "Ash on the Wind",
    act: "Act I — Kindling",
    synopsis:
      "A Conclave embassy arrives with timber and terms. Escort them through Nightgrove before the Khanate riders close the river.",
    unlocked: true,
    duration: "28 min",
    faction: "verdant" as FactionId,
    map: "nightgrove" as MapId,
  },
  {
    id: "salt-treaty",
    number: 3,
    title: "Treaty of Salt",
    act: "Act II — Accord",
    synopsis:
      "On the Shattercoast, three banners try to write peace in tide-ink. The fourth is already landing.",
    unlocked: true,
    duration: "34 min",
    faction: "saltwind" as FactionId,
    map: "shattercoast" as MapId,
  },
  {
    id: "grove-burns",
    number: 4,
    title: "The Grove Burns",
    act: "Act II — Accord",
    synopsis:
      "Relic-fire catches in the old rings. Choose which groves to drown, and which to let become ash.",
    unlocked: false,
    duration: "31 min",
    faction: "verdant" as FactionId,
    map: "nightgrove" as MapId,
  },
  {
    id: "reliquary-night",
    number: 5,
    title: "Reliquary Night",
    act: "Act III — Dominion",
    synopsis:
      "The Synod opens a sun vault under Hollowmere. Whatever is inside does not honour the accord.",
    unlocked: false,
    duration: "40 min",
    faction: "gilded" as FactionId,
    map: "hollowmere" as MapId,
  },
  {
    id: "dominion-price",
    number: 6,
    title: "Dominion's Price",
    act: "Act III — Dominion",
    synopsis:
      "Four ages later, the same four banners meet on Sunvault Dunes to decide whether the treaty was ever real.",
    unlocked: false,
    duration: "48 min",
    faction: "gilded" as FactionId,
    map: "sunvault" as MapId,
  },
] as const

export const SAVE_SLOTS = [
  {
    id: "slot-1",
    label: "Chronicle I",
    steward: "Marshal Ilya Venn",
    chapterId: "salt-treaty",
    age: "Forge Age",
    played: "6h 14m",
    status: "active" as const,
  },
  {
    id: "slot-2",
    label: "Chronicle II",
    steward: null,
    chapterId: null,
    age: null,
    played: null,
    status: "empty" as const,
  },
  {
    id: "slot-3",
    label: "Chronicle III",
    steward: "Unreadable seal",
    chapterId: null,
    age: null,
    played: "—",
    status: "error" as const,
  },
] as const

export const COMMANDS = [
  { id: "move", name: "March", hotkey: "M", group: "orders" },
  { id: "halt", name: "Hold", hotkey: "H", group: "orders" },
  { id: "patrol", name: "Patrol", hotkey: "P", group: "orders" },
  { id: "garrison", name: "Garrison", hotkey: "G", group: "orders" },
  { id: "attack", name: "Strike", hotkey: "A", group: "orders" },
  { id: "stance", name: "Stance", hotkey: "T", group: "orders" },
  { id: "hearth", name: "Hearth Hall", hotkey: "Q", group: "build" },
  { id: "granary", name: "Granary", hotkey: "W", group: "build" },
  { id: "timber", name: "Timber Camp", hotkey: "E", group: "build" },
  { id: "ore", name: "Ore Pit", hotkey: "R", group: "build" },
  { id: "yard", name: "Banner Yard", hotkey: "A", group: "train" },
  { id: "spur", name: "Spur Lodge", hotkey: "S", group: "train" },
  { id: "reliquary", name: "Reliquary", hotkey: "D", group: "train" },
  { id: "age", name: "Advance Age", hotkey: "C", group: "age" },
] as const

export const UNITS = [
  {
    id: "levy",
    name: "Hearth Levy",
    kind: "Villager",
    hp: 40,
    attack: 3,
    armor: 0,
    pop: 1,
    lore: "Every banner's first tool. Gathers Grain, Timber, Ore, and Relics; constructs the settlement.",
  },
  {
    id: "guard",
    name: "Banner Guard",
    kind: "Infantry",
    hp: 75,
    attack: 8,
    armor: 2,
    pop: 1,
    lore: "Oath-sworn spears. Hold the ridge, the ford, and the gate until the chroniclers arrive.",
  },
  {
    id: "ashrider",
    name: "Ashrider",
    kind: "Cavalry",
    hp: 110,
    attack: 12,
    armor: 1,
    pop: 2,
    lore: "Compact outriders whose mounts are trained on glass fields. Punishes exposed gatherers.",
  },
  {
    id: "warden",
    name: "Grove Warden",
    kind: "Ranged",
    hp: 55,
    attack: 9,
    armor: 0,
    pop: 1,
    lore: "Conclave bows strung with living gut. Best from the treeline, worse in the open dune.",
  },
  {
    id: "seer",
    name: "Relic Seer",
    kind: "Support",
    hp: 45,
    attack: 4,
    armor: 0,
    pop: 1,
    lore: "Synod adepts who spend Relics to mend banners or unmake a single keep-stone.",
  },
] as const

export const BUILDINGS = [
  {
    id: "hearth-hall",
    name: "Hearth Hall",
    kind: "Civic",
    hp: 1800,
    lore: "The town's pulse. Trains Levy, stores the age rite, and is the last building you can afford to lose.",
  },
  {
    id: "banner-yard",
    name: "Banner Yard",
    kind: "Military",
    hp: 900,
    lore: "Spears, shields, and the Compact's stubborn line. Queue Guard here.",
  },
  {
    id: "spur-lodge",
    name: "Spur Lodge",
    kind: "Military",
    hp: 850,
    lore: "Stables of the Khanate pattern, adopted by every banner that has been raided once.",
  },
  {
    id: "reliquary",
    name: "Reliquary",
    kind: "Faith",
    hp: 700,
    lore: "A vault-chapel. Holds Relics, trains Seers, and is required to step into Citadel Age.",
  },
] as const

export function factionById(id: string) {
  return FACTIONS.find((f) => f.id === id) ?? FACTIONS[0]
}

export function mapById(id: string) {
  return MAPS.find((m) => m.id === id) ?? MAPS[0]
}

export function difficultyById(id: string) {
  return DIFFICULTIES.find((d) => d.id === id) ?? DIFFICULTIES[2]
}

export function chapterById(id: string) {
  return CAMPAIGN_CHAPTERS.find((c) => c.id === id)
}
