/** CC0 original cards. File names stay as shipped; display copy uses Aryachakravarti. */

export const CAMPAIGN_ART = {
  kayalDockyard: "/campaign/kayal-dockyard.png",
  coastalDhoni: "/campaign/coastal-dhoni.png",
  altibiMerchantman: "/campaign/altibi-merchantman.png",
  escortShip: "/campaign/escort-ship.png",
  flagship: "/campaign/aryacakravarti-flagship.png",
  arabWarhorse: "/campaign/arab-warhorse.png",
  mannarPearls: "/campaign/mannar-pearls.png",
  toothRelic: "/campaign/tooth-relic.png",
  palkChart: "/campaign/palk-strait-chart.png",
  tradeRoutes: "/campaign/trade-routes.png",
  lighthouse: "/campaign/lighthouse.png",
  sharkCharmer: "/campaign/shark-charmer.png",
  rowtherCavalry: "/campaign/rowther-cavalry.png",
} as const

export type MissionArt = {
  card: string
  briefing: string
  caption: string
}

export const MISSION_ART: Record<string, MissionArt> = {
  edicts: {
    card: CAMPAIGN_ART.kayalDockyard,
    briefing: CAMPAIGN_ART.tradeRoutes,
    caption:
      "Kayal of Manon Mani and Masila Mani in the Yuvaraja years — academies, Sonakarpalli, grain road, temple books.",
  },
  kayal: {
    card: CAMPAIGN_ART.kayalDockyard,
    briefing: CAMPAIGN_ART.tradeRoutes,
    caption: "Kayal dockyard of Manon Mani and Masila Mani — dredged mouth, Palayam, Al-Tibi’s horse quay.",
  },
  palk: {
    card: CAMPAIGN_ART.palkChart,
    briefing: CAMPAIGN_ART.flagship,
    caption: "Palk Strait chart and Aryachakravarti’s flagship. Yapahuwa, Jaffna, the Tooth Relic.",
  },
  tamraparani: {
    card: CAMPAIGN_ART.lighthouse,
    briefing: CAMPAIGN_ART.sharkCharmer,
    caption: "Marco Polo’s estuary — five brother kings, then Parakramabahu at court.",
  },
  fracture: {
    card: CAMPAIGN_ART.tradeRoutes,
    briefing: CAMPAIGN_ART.kayalDockyard,
    caption: "Indian Ocean routes. Kayal of Manon Mani and Masila Mani lies open.",
  },
}

export function missionArt(id: string): MissionArt {
  return MISSION_ART[id] ?? MISSION_ART.kayal!
}

const cache = new Map<string, HTMLImageElement>()

export function artImage(src: string): HTMLImageElement | null {
  if (typeof Image === "undefined") return null
  let img = cache.get(src)
  if (!img) {
    img = new Image()
    img.src = src
    cache.set(src, img)
  }
  return img.complete && img.naturalWidth > 0 ? img : null
}
