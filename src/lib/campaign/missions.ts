export const CAMPAIGN_ID = "twin-fish-reign"
export const CAMPAIGN_TITLE = "Twin-Fish Reign"
export const CAMPAIGN_STEWARD = "Maravarman Kulasekara Pandyan I"

export type MissionId = "edicts" | "kayal" | "palk" | "tamraparani" | "fracture"

export type CampaignMission = {
  id: MissionId
  number: 1 | 2 | 3 | 4 | 5
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
    id: "edicts",
    number: 1,
    arc: "Yuvaraja Years",
    title: "Konerinmaikondan",
    year: "c. 1251–1268",
    map: "kayal",
    faction: "pandya",
    enemy: "malabar",
    duration: "short",
    briefing:
      "Seventeen years as co-ruler with Jatavarman Sundara Pandyan I at Kayal of Manon Mani and Masila Mani. Seal Konerinmaikondan on the Nadu and Sabha. Spend customs on Chaturvedimangalams and temple scriptoriums. Keep Aiyan Malavarayan’s Bank of Madurai. Back Sonakarpalli with the Sonagars. Drill the southern grain road — the drought is practice for the island later.",
    win: "Raise Konerinmaikondan, fund an academy, finish Sonakarpalli, and survive the drought.",
    lose: "The hearth falls, grain runs out, or the Nadu rebels.",
    objective: "Edicts, academies, Sonakarpalli, grain road, temple books",
  },
  {
    id: "kayal",
    number: 2,
    arc: "Kayal Emporium",
    title: "Kayal Under Sail",
    year: "from 1268",
    map: "kayal",
    faction: "pandya",
    enemy: "malabar",
    duration: "short",
    briefing:
      "The throne is yours. Korkai has silted: dredge the Tamraparani mouth of Manon Mani and Masila Mani, light Manapad and Kulasekharapatnam, and raise Rowther Palayam against beach landings. Seat Takiuddin Abdur Rahman (Al-Tibi) so Anjuvannam privateers bind to the quay. Malabar galleys ambush Hormuz horse-ships before they reach the gulf — not foreign empires. The Chola line still waits until 1279.",
    win: "Seat Al-Tibi, dredge the mouth, raise Palayam or a Manapad light, and land three horse convoys.",
    lose: "Three convoys sink, or the Kayal hearth falls.",
    objective: "Dredge, lights, Palayam, Al-Tibi, escort the horse road",
  },
  {
    id: "palk",
    number: 3,
    arc: "Chola End and Island War",
    title: "Storm of Subhagiri",
    year: "Late 1270s",
    map: "palk",
    faction: "pandya",
    enemy: "lanka",
    duration: "short",
    briefing:
      "Finish the father’s work: end the Chola line (1279 — Rajendra III, and Ramanatha of the Hoysalas). Then General Kulasekara Cinkaiariyan Aryachakravarti forces Palk Strait — Manon Mani’s crossing, Masila Mani’s war. Storm Subhagiri (Yapahuwa) and take the Tooth Relic so northern Sri Lanka can stand as a tribute buffer. Keep or return waits for Parakramabahu III.",
    win: "End the Chola line, then capture the Tooth Relic on Yapahuwa and bring it home.",
    lose: "The landing hearth is razed before the relic is deposited.",
    objective: "Close the Chola line; land with Aryachakravarti; take the Tooth Relic",
  },
  {
    id: "tamraparani",
    number: 4,
    arc: "Relic Diplomacy",
    title: "Five Brother Kings",
    year: "c. 1288–1293",
    map: "tamraparani",
    faction: "pandya",
    enemy: "malabar",
    duration: "short",
    briefing:
      "Marco Polo is in the estuary of Manon Mani and Masila Mani and names five brother kings — flavor for the court, not a win. Seat the Confederacy: Jatavarman Vira Pandyan I in the west, Maravarman Vikkiraman III in administration, Jatavarman Sundara Pandyan II in the interior. Parakramabahu III comes for the Tooth Relic Aryachakravarti took. Keep it in Madurai or return it so Jaffna stays a vassal. Spend Relics on Divine Patronage at Tirunelveli, Tharangambadi / Masilamaninathar, Madurai, and Srirangam.",
    win: "Seat the three brothers, then keep or return the Tooth Relic.",
    lose: "The estuary hearth falls before the choice is sealed.",
    objective: "Seat the Confederacy, then keep or return the Tooth Relic",
  },
  {
    id: "fracture",
    number: 5,
    arc: "The Fracture",
    title: "Kayal Open to Kafur",
    year: "1296–1323",
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
