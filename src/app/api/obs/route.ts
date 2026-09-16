import { NextResponse } from "next/server"
import { writeLiveObs, type LiveObs } from "@/lib/ml/live-obs"

export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as LiveObs
    if (typeof body.fps !== "number") {
      return NextResponse.json({ ok: false }, { status: 400 })
    }
    writeLiveObs(body)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }
}
