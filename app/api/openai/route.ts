import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const runtime = 'nodejs'

/**
 * This route proxies requests server-side to Google Gemini (Generative Language API) using
 * an API key stored in the GOOGLE_API_KEY environment variable on Vercel.
 *
 * POST JSON body: { "prompt": "..." }
 * Response: returns the JSON response from the Generative Language API unmodified.
 *
 * IMPORTANT: set GOOGLE_API_KEY in Vercel Project Settings -> Environment Variables and redeploy.
 * If the exact Gemini endpoint or request shape differs for your account/region, update the
 * GOOGLE_GEMINI_ENDPOINT constant below or the request body format.
 */

const DEFAULT_GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1/models/text-bison-001:generate'

export async function POST(req: NextRequest) {
  const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY
  const GOOGLE_GEMINI_ENDPOINT = process.env.GOOGLE_GEMINI_ENDPOINT ?? DEFAULT_GEMINI_ENDPOINT

  if (!GOOGLE_API_KEY) {
    return NextResponse.json({ error: 'GOOGLE_API_KEY not set on server' }, { status: 500 })
  }

  let body: any
  try {
    body = await req.json()
  } catch (err) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const prompt = typeof body.prompt === 'string' ? body.prompt : (body.prompt?.content ?? 'Hola')

  try {
    const response = await fetch(GOOGLE_GEMINI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GOOGLE_API_KEY}`,
      },
      body: JSON.stringify({
        // Common REST shape for Generative Language API text generation. Adjust fields if needed.
        prompt: { text: prompt },
        // Optional tuning parameters; feel free to remove or change.
        temperature: typeof body.temperature === 'number' ? body.temperature : 0.2,
        maxOutputTokens: typeof body.maxOutputTokens === 'number' ? body.maxOutputTokens : 512,
      }),
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      return NextResponse.json({ error: 'Gemini API error', status: response.status, detail: data }, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (err: any) {
    console.error('Gemini request error:', err)
    return NextResponse.json({ error: 'Server error', detail: err?.message ?? String(err) }, { status: 500 })
  }
}
