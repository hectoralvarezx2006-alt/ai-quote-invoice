import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models'
const MODEL = 'gemma-3-27b-it'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { jobDescription, clientType, approximatePrice } = await request.json()
    if (!jobDescription) return NextResponse.json({ error: 'Descripción requerida' }, { status: 400 })

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'API key no configurada' }, { status: 500 })

    const prompt = `Eres un experto en presupuestos para freelancers y autónomos en España.
Un freelancer quiere generar un presupuesto para este trabajo:

DESCRIPCIÓN: ${jobDescription}
TIPO DE CLIENTE: ${clientType}
${approximatePrice ? `PRECIO APROXIMADO: ${approximatePrice}` : ''}

Tu tarea es hacer entre 3 y 5 preguntas cortas y muy específicas que ayuden a precisar mejor el presupuesto.
Las preguntas deben ser sobre aspectos concretos que NO están claros en la descripción y que afectan directamente al precio o alcance.

RESPONDE ÚNICAMENTE con un JSON válido con esta estructura exacta, sin texto adicional, sin markdown:
{
  "questions": [
    {
      "id": "q1",
      "question": "texto de la pregunta",
      "hint": "ejemplo de respuesta o contexto breve",
      "type": "text"
    }
  ]
}`

    const response = await fetch(
      `${GEMINI_API_URL}/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.5, maxOutputTokens: 1024 },
        }),
      }
    )

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Error IA: ${err}`)
    }

    const data = await response.json()
    let rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

    // Limpiar markdown si lo hay
    rawText = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (jsonMatch) rawText = jsonMatch[0]

    const parsed = JSON.parse(rawText)
    return NextResponse.json(parsed)

  } catch (err) {
    console.error('Error generando preguntas:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error desconocido' }, { status: 500 })
  }
}