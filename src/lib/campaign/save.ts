import { CAMPAIGN_MISSIONS, type MissionId } from "./missions"

export const SAVE_KEY = "mm-mkp1-chronicle-t2"

export type RelicChoiceSave = "keep" | "return"

export type ChronicleSlot = {
  id: string
  label: string
  completed: MissionId[]
  relicSecured: boolean
  relicChoice: RelicChoiceSave | null
  started: boolean
  veteranArmy: boolean
  templeDebt: number
  konerin: number
  portIntegrated: boolean
}

export type ChronicleFile = {
  slots: ChronicleSlot[]
}

const EMPTY_SLOTS: ChronicleSlot[] = [
  {
    id: "slot-1",
    label: "Chronicle I",
    completed: [],
    relicSecured: false,
    relicChoice: null,
    started: false,
    veteranArmy: false,
    templeDebt: 0,
    konerin: 0,
    portIntegrated: false,
  },
  {
    id: "slot-2",
    label: "Chronicle II",
    completed: [],
    relicSecured: false,
    relicChoice: null,
    started: false,
    veteranArmy: false,
    templeDebt: 0,
    konerin: 0,
    portIntegrated: false,
  },
  {
    id: "slot-3",
    label: "Chronicle III",
    completed: [],
    relicSecured: false,
    relicChoice: null,
    started: false,
    veteranArmy: false,
    templeDebt: 0,
    konerin: 0,
    portIntegrated: false,
  },
]

export function emptyFile(): ChronicleFile {
  return { slots: EMPTY_SLOTS.map((s) => ({ ...s, completed: [] })) }
}

function normalize(raw: unknown): ChronicleFile | null {
  if (!raw || typeof raw !== "object") return null
  const slots = (raw as ChronicleFile).slots
  if (!Array.isArray(slots) || slots.length < 1) return null
  const ids = new Set(CAMPAIGN_MISSIONS.map((m) => m.id))
  return {
    slots: EMPTY_SLOTS.map((template, i) => {
      const s = slots[i]
      if (!s || typeof s !== "object") return { ...template, completed: [] }
      const completed = Array.isArray(s.completed)
        ? s.completed.filter((id): id is MissionId => ids.has(id as MissionId))
        : []
      return {
        id: template.id,
        label: template.label,
        completed,
        relicSecured: s.relicSecured === true,
        relicChoice: s.relicChoice === "keep" || s.relicChoice === "return" ? s.relicChoice : null,
        started: s.started === true || completed.length > 0,
        veteranArmy: s.veteranArmy === true,
        templeDebt: typeof s.templeDebt === "number" && s.templeDebt > 0 ? Math.min(4, Math.floor(s.templeDebt)) : 0,
        konerin: typeof s.konerin === "number" && s.konerin > 0 ? Math.min(100, Math.floor(s.konerin)) : 0,
        portIntegrated: s.portIntegrated === true,
      }
    }),
  }
}

export function loadFile(): { file: ChronicleFile; corrupt: boolean } {
  if (typeof window === "undefined") return { file: emptyFile(), corrupt: false }
  try {
    const raw = window.localStorage.getItem(SAVE_KEY)
    if (!raw) return { file: emptyFile(), corrupt: false }
    const parsed = JSON.parse(raw) as unknown
    const file = normalize(parsed)
    if (!file) return { file: emptyFile(), corrupt: true }
    return { file, corrupt: false }
  } catch {
    return { file: emptyFile(), corrupt: true }
  }
}

export function writeFile(file: ChronicleFile) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(SAVE_KEY, JSON.stringify(file))
}

export function clearFile() {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(SAVE_KEY)
}

export function isUnlocked(slot: ChronicleSlot, missionId: MissionId) {
  const i = CAMPAIGN_MISSIONS.findIndex((m) => m.id === missionId)
  if (i <= 0) return true
  if (slot.completed.includes(missionId)) return true
  return slot.completed.includes(CAMPAIGN_MISSIONS[i - 1]!.id)
}

export function markVictory(
  file: ChronicleFile,
  slotId: string,
  missionId: MissionId,
  extras?: {
    relicChoice?: RelicChoiceSave | null
    veteranArmy?: boolean
    templeDebt?: number
    konerin?: number
    portIntegrated?: boolean
  },
): ChronicleFile {
  return {
    slots: file.slots.map((s) => {
      if (s.id !== slotId) return s
      const completed = s.completed.includes(missionId) ? s.completed : [...s.completed, missionId]
      const relicChoice = extras?.relicChoice ?? s.relicChoice
      return {
        ...s,
        started: true,
        completed,
        relicSecured: s.relicSecured || missionId === "palk",
        relicChoice: missionId === "palk" ? relicChoice : s.relicChoice,
        veteranArmy: extras?.veteranArmy ?? s.veteranArmy,
        templeDebt: extras?.templeDebt ?? s.templeDebt,
        konerin: extras?.konerin ?? s.konerin,
        portIntegrated: extras?.portIntegrated ?? s.portIntegrated,
      }
    }),
  }
}

export function markStarted(file: ChronicleFile, slotId: string): ChronicleFile {
  return {
    slots: file.slots.map((s) => (s.id === slotId ? { ...s, started: true } : s)),
  }
}
