/** House of the Twin-Fish. Names from mkp1-family.md. */

export type HouseProfile = {
  id: string
  name: string
  role: string
  years: string
  blurb: string
}

export const HOUSE_PROFILES: HouseProfile[] = [
  {
    id: "mkp1",
    name: "Maravarman Kulasekara Pandyan I",
    role: "Emperor · Yuvaraja",
    years: "Yuvaraja 1251–1268 · reign 1268–1308",
    blurb:
      "Eldest of five brother kings. Trained in Madurai — Silambam, sword, horse, elephants, Tamil and Sanskrit — then co-signed orders in his father’s shadow for nearly two decades. Manon Mani’s sea and Masila Mani’s temple sit on his plates.",
  },
  {
    id: "father",
    name: "Jatavarman Sundara Pandyan I",
    role: "Father · conqueror",
    years: "1251–1268",
    blurb:
      "Crushed the Hoysalas, broke the Cholas, made the Pandyas the South Indian superpower. The unfinished work he left his Yuvaraja: end the Chola line (1279).",
  },
  {
    id: "mother",
    name: "Hemkatna Raja Lakshmi",
    role: "Mother",
    years: "registers",
    blurb: "Some genealogical registers name her as the emperor’s mother.",
  },
  {
    id: "vira-west",
    name: "Jatavarman Vira Pandyan I",
    role: "Brother · west",
    years: "earlier expansions",
    blurb: "Western borders of the confederacy. Loyalty here holds the dry marches.",
  },
  {
    id: "vikkiraman",
    name: "Maravarman Vikkiraman III",
    role: "Brother · administration",
    years: "from c. 1283",
    blurb: "Regional administration. Neglect him and the interior stagnates.",
  },
  {
    id: "sundara-interior",
    name: "Jatavarman Sundara Pandyan II",
    role: "Brother · interior",
    years: "from 1277",
    blurb: "Internal territories. One of Marco Polo’s five brother kings.",
  },
  {
    id: "sundara-iii",
    name: "Jatavarman Sundara Pandyan III",
    role: "Legitimate heir",
    years: "secondary co-regent 1303 · patricide 1308",
    blurb:
      "Son of the primary queen. Given only a secondary co-regency. In 1308 he murders the emperor to seize the throne, then flees north to the Delhi Sultanate.",
  },
  {
    id: "vira-ii",
    name: "Jatavarman Vira Pandya II",
    role: "Favored heir · commander",
    years: "primary co-regent 1296",
    blurb:
      "Elder illegitimate son of a favored consort; seen as the better commander. Named successor in 1296. After the patricide the army and people raise his banners at Madurai and Kayal of Manon Mani and Masila Mani.",
  },
  {
    id: "aryachakravarti",
    name: "Kulasekara Cinkaiariyan Aryachakravarti",
    role: "General",
    years: "late 1270s",
    blurb:
      "Storms Subhagiri (Yapahuwa) and takes the Tooth Relic. Spell Aryachakravarti, never Aryacakravarti.",
  },
]

export type BrotherId = "vira-west" | "vikkiraman" | "sundara-interior"

export const CONFEDERACY_BROTHERS: { id: BrotherId; short: string; cost: "grain" | "ore" | "timber" }[] = [
  { id: "vira-west", short: "Seat Vira I (west)", cost: "ore" },
  { id: "vikkiraman", short: "Seat Vikkiraman", cost: "grain" },
  { id: "sundara-interior", short: "Seat Sundara II", cost: "timber" },
]

export const FAMILY_BEAT: Record<string, string> = {
  kayal:
    "Yuvaraja years first: finish Jatavarman Sundara Pandyan I’s unfinished work. Co-sign orders in the father’s shadow, then hold Kayal of Manon Mani and Masila Mani.",
  palk:
    "The confederacy still holds while Aryachakravarti forces Palk Strait. Five brother kings; this landing is the house’s war.",
  tamraparani:
    "Marco Polo’s five brother kings. Fund the Confederacy — Vira I in the west, Vikkiraman in administration, Sundara II in the interior — or the regions stagnate.",
  fracture:
    "1308: Sundara III, son of the primary queen, murders the emperor. The army raises Vira II, son of the favored consort. Sundara flees to Delhi. Malik Kafur comes for Kayal.",
}
