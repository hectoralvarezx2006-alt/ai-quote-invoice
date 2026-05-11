import { AIQuoteResponse, GenerateQuoteParams } from '@/types'

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models'
// Gemma 4 disponible en Google AI Studio free tier
const MODEL = 'gemini-2.5-flash'  // fallback: 'gemini-2.0-flash'

const SYSTEM_PROMPT = `Eres un experto en elaboración de presupuestos profesionales para freelancers y autónomos en España.
Tu tarea es generar presupuestos detallados y profesionales basándote en la descripción del trabajo.
SIEMPRE debes responder ÚNICAMENTE con un objeto JSON válido, sin texto adicional, sin markdown, sin bloques de código.
El JSON debe tener exactamente esta estructura:
{
  "title": "string - título conciso del presupuesto",
  "description": "string - descripción profesional del proyecto",
  "items": [
    {
      "name": "string - nombre del item/servicio",
      "description": "string - descripción detallada del item",
      "quantity": number,
      "price": number
    }
  ],
  "total": number,
  "tone": "professional",
  "notes": "string - condiciones, plazos o notas adicionales"
}`

export async function generateQuote(params: GenerateQuoteParams): Promise<AIQuoteResponse> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY no configurada')
  }

  const userPrompt = buildPrompt(params)

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [{ text: SYSTEM_PROMPT + '\n\n' + userPrompt }],
      },
    ],
    generationConfig: {
  temperature: 0.7,
  topK: 40,
  topP: 0.95,
  maxOutputTokens: 2048,
  thinkingConfig: {
    thinkingBudget: 0
  }
},
  }

  let modelToUse = MODEL

  const response = await fetch(
    `${GEMINI_API_URL}/${modelToUse}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    }
  )

  if (!response.ok) {
    // Fallback a gemini-2.0-flash si gemma no está disponible
    if (response.status === 404 || response.status === 400) {
      return generateQuoteWithFallback(params, apiKey)
    }
    const errorText = await response.text()
    throw new Error(`Error de la API de IA: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text

  if (!rawText) {
    throw new Error('La IA no devolvió contenido')
  }

  return parseAIResponse(rawText)
}

async function generateQuoteWithFallback(
  params: GenerateQuoteParams,
  apiKey: string
): Promise<AIQuoteResponse> {
  const fallbackModel = 'gemini-2.0-flash'
  const userPrompt = buildPrompt(params)

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [{ text: SYSTEM_PROMPT + '\n\n' + userPrompt }],
      },
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
    },
  }

  const response = await fetch(
    `${GEMINI_API_URL}/${fallbackModel}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Error en fallback IA: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text

  if (!rawText) {
    throw new Error('La IA no devolvió contenido')
  }

  return parseAIResponse(rawText)
}

function buildPrompt(params: GenerateQuoteParams): string {
  const parts = [
    `DESCRIPCIÓN DEL TRABAJO: ${params.jobDescription}`,
    `TIPO DE CLIENTE: ${params.clientType}`,
  ]

  if (params.approximatePrice) {
    parts.push(`PRECIO APROXIMADO: ${params.approximatePrice}`)
  }

  if (params.clientName) {
    parts.push(`NOMBRE DEL CLIENTE: ${params.clientName}`)
  }

  parts.push(
    '',
    'Genera un presupuesto profesional detallado con entre 3 y 8 partidas/items.',
    'Los precios deben ser realistas para el mercado español (freelance).',
    'Responde SOLO con el JSON, sin ningún otro texto.'
  )

  return parts.join('\n')
}

function parseAIResponse(rawText: string): AIQuoteResponse {
  // Limpiar posibles bloques markdown
  let cleaned = rawText.trim()
  cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```\s*$/, '')
  cleaned = cleaned.replace(/^```\s*/i, '').replace(/```\s*$/, '')

  // Buscar el JSON dentro del texto si hay texto extra
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    cleaned = jsonMatch[0]
  }

  try {
    const parsed = JSON.parse(cleaned) as AIQuoteResponse

    // Validar estructura mínima
    if (!parsed.title || !Array.isArray(parsed.items)) {
      throw new Error('Estructura JSON inválida de la IA')
    }

    // Recalcular total para asegurar consistencia
    const calculatedTotal = parsed.items.reduce((sum, item) => {
      const qty = item.quantity ?? 1
      return sum + item.price * qty
    }, 0)

    return {
      ...parsed,
      total: calculatedTotal,
      items: parsed.items.map(item => ({
        ...item,
        quantity: item.quantity ?? 1,
      })),
    }
  } catch (e) {
    throw new Error(`Error al parsear respuesta de la IA: ${e instanceof Error ? e.message : 'JSON inválido'}`)
  }
}