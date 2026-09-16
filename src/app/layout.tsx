import { Cinzel, Source_Sans_3 } from "next/font/google"
import type { Metadata } from "next"
import { Providers } from "@/components/providers"
import { GAME_TAGLINE, GAME_TITLE } from "@/lib/game-data"
import "./globals.css"

const heading = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
})

const sans = Source_Sans_3({
  variable: "--font-source",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
})

export const metadata: Metadata = {
  title: {
    default: GAME_TITLE,
    template: `%s · ${GAME_TITLE}`,
  },
  description: `${GAME_TITLE} — ${GAME_TAGLINE} Local 1v1 skirmish vs AI.`,
  icons: { icon: "/icon.svg" },
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`dark ${heading.variable} ${sans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background font-sans text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
