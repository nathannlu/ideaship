import { NextResponse } from "next/server"
import { z } from "zod"
import { deployChatSession } from "@/actions/chat-conversations"

export const runtime = 'nodejs'

const deploySchema = z.object({
  id: z.string(),
  /**
   * HTML bundle (uncompressed)
   */
  html: z.string(),
})

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const parsed = deploySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors.map((e) => e.message).join(", ") },
      { status: 400 }
    )
  }
  const { id, html } = parsed.data
  try {
    const deployedUrl = await deployChatSession(id, html)
    return NextResponse.json({ ok: true, deployedUrl })
  } catch (err: any) {
    console.error("Deployment error:", err)
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 })
  }
}