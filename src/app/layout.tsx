import { Cinzel, Source_Sans_3 } from "next/font/google"
import type { Metadata } from "next"
import type { ReactNode } from "react"
import Script from "next/script"
import { Providers } from "@/components/providers"
import { GAME_CHANNEL, GAME_TAGLINE, GAME_TITLE, GAME_VERSION } from "@/lib/game-data"
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
  description: `${GAME_TITLE} ${GAME_CHANNEL} ${GAME_VERSION} — ${GAME_TAGLINE} Local 1v1 skirmish vs AI.`,
  icons: { icon: "/icon.svg" },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`dark ${heading.variable} ${sans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background font-sans text-foreground">
        <Script id="raf-watchdog" strategy="beforeInteractive">
          {`(function(){
            var native = window.requestAnimationFrame && window.requestAnimationFrame.bind(window);
            var cancel = window.cancelAnimationFrame && window.cancelAnimationFrame.bind(window);
            if (!native) {
              window.requestAnimationFrame = function(cb){ return window.setTimeout(function(){ cb(performance.now()); }, 16); };
              window.cancelAnimationFrame = function(id){ window.clearTimeout(id); };
              return;
            }
            var pending = new Map();
            var seq = 0;
            var lastFire = 0;
            window.requestAnimationFrame = function(cb){
              var id = ++seq;
              var nativeId = native(function(t){
                lastFire = t;
                pending.delete(id);
                cb(t);
              });
              pending.set(id, { cb: cb, nativeId: nativeId });
              return id;
            };
            window.cancelAnimationFrame = function(id){
              var p = pending.get(id);
              if (!p) return;
              pending.delete(id);
              cancel(p.nativeId);
            };
            window.setInterval(function(){
              if (performance.now() - lastFire < 250) return;
              var now = performance.now();
              lastFire = now;
              var batch = Array.from(pending.entries());
              pending.clear();
              batch.forEach(function(entry){
                cancel(entry[1].nativeId);
                try { entry[1].cb(now); } catch (err) { console.error(err); }
              });
            }, 50);
          })();`}
        </Script>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
