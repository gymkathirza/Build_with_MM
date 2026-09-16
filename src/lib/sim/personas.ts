import type { AiParams, Res } from "./engine"

export const PERSONA_IDS = [
  "challenging",
  "forgiving",
  "teasing",
  "coach",
  "randomness",
  "skewed",
  "balanced",
  "rand-aggro",
  "rand-dominant",
] as const

export type PersonaId = (typeof PERSONA_IDS)[number]

export type GatherMode = "balanced" | "skewed"

export type Persona = {
  id: PersonaId
  name: string
  blurb: string
  params: AiParams
  gather: GatherMode
  skewRes: Res
  tease: boolean
  coach: boolean
  noise: number
}

const base: AiParams = {
  gatherBias: 0.7,
  militaryRatio: 0.58,
  attackAtArmy: 4,
  expandCamps: 1,
  agePriority: 0.55,
  kite: 0.4,
}

export const PERSONAS: Persona[] = [
  {
    id: "challenging",
    name: "Challenging",
    blurb: "Early banners, short fuse. Learn to wall or lose the hearth.",
    params: { ...base, gatherBias: 0.58, militaryRatio: 0.74, attackAtArmy: 3, agePriority: 0.45, kite: 0.2 },
    gather: "balanced",
    skewRes: "grain",
    tease: false,
    coach: false,
    noise: 0.05,
  },
  {
    id: "forgiving",
    name: "Forgiving",
    blurb: "Booms slowly and waits. Room to try a bad build and recover.",
    params: { ...base, gatherBias: 0.84, militaryRatio: 0.42, attackAtArmy: 10, agePriority: 0.7, kite: 0.6 },
    gather: "balanced",
    skewRes: "grain",
    tease: false,
    coach: false,
    noise: 0.04,
  },
  {
    id: "teasing",
    name: "Teasing",
    blurb: "Nips levies, steals relics, then slips home. Chase or ignore?",
    params: { ...base, gatherBias: 0.66, militaryRatio: 0.6, attackAtArmy: 2, agePriority: 0.5, kite: 0.85 },
    gather: "balanced",
    skewRes: "relics",
    tease: true,
    coach: false,
    noise: 0.2,
  },
  {
    id: "coach",
    name: "Show better play",
    blurb: "Ages on time, keeps a clean eco, then attacks. Copy the pattern.",
    params: { ...base, gatherBias: 0.72, militaryRatio: 0.55, attackAtArmy: 7, agePriority: 0.88, kite: 0.35 },
    gather: "balanced",
    skewRes: "grain",
    tease: false,
    coach: true,
    noise: 0,
  },
  {
    id: "randomness",
    name: "Randomness",
    blurb: "Dice on gather, build order, and when to march. Nothing twice.",
    params: { ...base, gatherBias: 0.7, militaryRatio: 0.55, attackAtArmy: 5, agePriority: 0.55, kite: 0.5 },
    gather: "balanced",
    skewRes: "grain",
    tease: false,
    coach: false,
    noise: 0.55,
  },
  {
    id: "skewed",
    name: "Skewed resources",
    blurb: "Piles one store (grain) and starves the rest. Punish the hole, or copy the greed.",
    params: { ...base, gatherBias: 0.9, militaryRatio: 0.48, attackAtArmy: 6, agePriority: 0.35, kite: 0.3 },
    gather: "skewed",
    skewRes: "grain",
    tease: false,
    coach: false,
    noise: 0.08,
  },
  {
    id: "balanced",
    name: "Balanced handling",
    blurb: "Splits levy across grain, timber, ore, and relics. The honest eco.",
    params: { ...base, gatherBias: 0.76, militaryRatio: 0.56, attackAtArmy: 5, agePriority: 0.62, kite: 0.4 },
    gather: "balanced",
    skewRes: "grain",
    tease: false,
    coach: false,
    noise: 0.02,
  },
  {
    id: "rand-aggro",
    name: "Random, bit aggressive",
    blurb: "Dice rolls, but the army leaves camp earlier than it should.",
    params: { ...base, gatherBias: 0.62, militaryRatio: 0.66, attackAtArmy: 3, agePriority: 0.4, kite: 0.25 },
    gather: "balanced",
    skewRes: "timber",
    tease: false,
    coach: false,
    noise: 0.4,
  },
  {
    id: "rand-dominant",
    name: "Random dominant",
    blurb: "Loud, greedy, and lucky. Forces you to scout and adapt.",
    params: { ...base, gatherBias: 0.5, militaryRatio: 0.8, attackAtArmy: 2, agePriority: 0.3, kite: 0.15 },
    gather: "skewed",
    skewRes: "ore",
    tease: true,
    coach: false,
    noise: 0.45,
  },
]

export function personaById(id: string): Persona {
  return PERSONAS.find((p) => p.id === id) ?? PERSONAS[6]
}

export function nextPersona(round: number): Persona {
  return PERSONAS[round % PERSONAS.length]
}
