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
      "Yuvaraja no longer: Jatavarman Sundara Pandyan I is dead, and his shadow still sits on Madurai. Appoint Takiuddin Abdur Rahman (Al-Tibi) as Prime Minister over Kayal of Manon Mani and Masila Mani, Kulasekharapatnam, Fattan, and Malifattan. Co-sign the old Yuvaraja orders, fund Manigramam and Anjuvannam, and get Hormuz horse ships past Malabar corsairs. Finish the father’s work — the Chola line still waits until 1279.",
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
      "The five brother kings still share the house while General Kulasekara Cinkaiariyan Aryachakravarti forces Palk Strait — Manon Mani’s crossing, Masila Mani’s war. Bhuvanaikabahu I and Savakanmaindan sit astride the water. Storm Subhagiri (Yapahuwa), take the Sacred Tooth Relic, then keep it in Madurai or return it when Parakramabahu III comes so Jaffna stays a vassal.",
    win: "Capture the Tooth Relic on Yapahuwa, deposit it, then keep or return.",
    lose: "The landing hearth is razed before the choice is sealed.",
    objective: "Land with Aryachakravarti, take the Tooth Relic, then keep or return",
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
      "Marco Polo is in the estuary of Manon Mani and Masila Mani and names five brother kings. Light Kulasekharapatnam and Manapad. Seat the Confederacy — Jatavarman Vira Pandyan I in the west, Maravarman Vikkiraman III in administration, Jatavarman Sundara Pandyan II in the interior — or those regions stagnate. Fund Kadalkatti shark charmers. Spend Relics on Divine Patronage at Tirunelveli, Tharangambadi / Masilamaninathar, Madurai, and Srirangam.",
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
      "Two queens, two sons. In 1296 the emperor named Jatavarman Vira Pandya II — elder son of a favored consort, the better commander — primary co-regent. In 1303 Jatavarman Sundara Pandyan III, legitimate son of the primary queen, received only a secondary co-regency. In 1308 Sundara murders the emperor. The public and the army revolt and raise Vira. Sundara flees north to the Delhi Sultanate. Malik Kafur comes for Kayal of Manon Mani and Masila Mani. Patricide, then civil war, then the Sultanate.",
    win: "Hold Vira’s Madurai and Kayal, raze Sundara’s camp, and break two Malik Kafur waves.",
    lose: "Madurai or Kayal hearth falls after the patricide.",
    objective: "Survive the patricide; hold both hearths; break Sundara and Kafur",
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
