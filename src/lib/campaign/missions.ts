export const CAMPAIGN_ID = "twin-fish-reign"
export const CAMPAIGN_TITLE = "Twin-Fish Reign"
export const CAMPAIGN_STEWARD = "Maravarman Kulasekara Pandyan I"

export type MissionId = "kayal" | "palk" | "tamraparani" | "fracture"

export type CampaignMission = {
  id: MissionId
  number: 1 | 2 | 3 | 4
  arc: string
  title: string
  year: string
  map: string
  faction: string
  enemy: string
  duration: string
  briefing: string
  win: string
  lose: string
  objective: string
}

export const CAMPAIGN_MISSIONS: CampaignMission[] = [
  {
    id: "kayal",
    number: 1,
    arc: "The Marzban Coalition",
    title: "Kayal Under Sail",
    year: "c. 1268–1270",
    map: "kayal",
    faction: "pandya",
    enemy: "malabar",
    duration: "short",
    briefing:
      "Appoint Takiuddin Abdur Rahman (Al-Tibi) as Prime Minister and port governor over Kayal, Kulasekharapatnam, Fattan, and Malifattan. Malabar corsairs are cutting horse ships from Hormuz and Aden. Fund Manigramam and Anjuvannam together so Marzban escorts may sail with the Pandya dhoni.",
    win: "Three horse convoys reach the Kayal quay.",
    lose: "Three convoys sink, or the Kayal hearth falls.",
    objective: "Escort horse ships from Hormuz into Kayal",
  },
  {
    id: "palk",
    number: 2,
    arc: "Preemptive Strike",
    title: "Storm of Subhagiri",
    year: "Late 1270s",
    map: "palk",
    faction: "pandya",
    enemy: "lanka",
    duration: "short",
    briefing:
      "Bhuvanaikabahu I and Savakanmaindan sit astride Palk Strait. General Kulasekara Cinkaiariyan Aryacakravarti will land, storm Subhagiri (Yapahuwa), and take the Sacred Tooth Relic of the Buddha to the landing hearth. Northern Sri Lanka is to be held as a client.",
    win: "Capture the Tooth Relic on Yapahuwa and deposit it at the landing hearth.",
    lose: "The landing hearth is razed.",
    objective: "Land, storm Yapahuwa, bring the Tooth Relic home",
  },
  {
    id: "tamraparani",
    number: 3,
    arc: "Port Defense",
    title: "Lights on the Tamraparani",
    year: "c. 1288–1293",
    map: "tamraparani",
    faction: "pandya",
    enemy: "malabar",
    duration: "short",
    briefing:
      "Marco Polo is in the estuary. Raise stone lighthouses toward Kulasekharapatnam and Manapad so night corsairs cannot ambush the sand. Fund the Kadalkatti — shark charmers — or pearl divers die. Station Rowther cavalry at the coast to crush beach landings.",
    win: "Two lighthouses and one Kadalkatti shrine standing after three beach waves.",
    lose: "Kayal hearth falls, or six pearl divers are taken by sharks.",
    objective: "Light the coast, charm the gulf, hold the sand",
  },
  {
    id: "fracture",
    number: 4,
    arc: "The Fracture",
    title: "Kayal Open to Kafur",
    year: "1308",
    map: "madurai-fracture",
    faction: "pandya",
    enemy: "delhi",
    duration: "short",
    briefing:
      "The emperor favored illegitimate Vira Pandya over legitimate Sundara Pandya III. Civil war splits the coast. Sundara holds a rival camp; Malik Kafur of the Delhi Sultanate comes for Kayal. Hold Madurai and the port, or the Second Pandyan Empire ends here.",
    win: "Raze Sundara’s camp and break two Malik Kafur waves with Kayal still standing.",
    lose: "Madurai or Kayal hearth falls.",
    objective: "Hold both hearths; break Sundara and Kafur",
  },
]

export function missionById(id: string): CampaignMission | undefined {
  return CAMPAIGN_MISSIONS.find((m) => m.id === id)
}

export function previousMission(id: MissionId): CampaignMission | undefined {
  const i = CAMPAIGN_MISSIONS.findIndex((m) => m.id === id)
  return i > 0 ? CAMPAIGN_MISSIONS[i - 1] : undefined
}

export function nextMission(id: MissionId): CampaignMission | undefined {
  const i = CAMPAIGN_MISSIONS.findIndex((m) => m.id === id)
  return i >= 0 ? CAMPAIGN_MISSIONS[i + 1] : undefined
}
