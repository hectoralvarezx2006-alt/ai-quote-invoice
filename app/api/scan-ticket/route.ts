import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models'
const MODEL = 'gemma-3-27b-it'

const SYSTEM_PROMPT = `Eres un experto en contabilidad española. Analiza esta imagen de ticket o factura y extrae los datos.

RESPONDE ÚNICAMENTE con un JSON válido, sin texto extra, sin markdown:
{
  "description": "descripción breve del gasto",
  "provider": "nombre del comercio o empresa emisora",
  "date": "YYYY-MM-DD (fecha del ticket, si no se ve usa hoy)",
  "amount": número (base imponible SIN IVA),
  "tax_rate": número (tipo de IVA: 0, 4, 10 o 21),
  "tax_amount": número (cuota de IVA),
  "total": número (importe total CON IVA),
  "category": "una de estas: material, software, transporte, telefono, oficina, marketing, formacion, seguros, asesoria, otros",
  "invoice_ref": "número de factura o ticket si aparece, sino null",
  "confidence": "alta, media o baja (confianza en la extracción)"
}

REGLAS:
- Si el ticket no muestra IVA desglosado, asume 21% para la mayoría de productos
- Para restaurantes/comida: IVA 10%
- Para medicamentos/libros: IVA 4%
- Para gasolina: IVA 21%
- El campo amount es SIEMPRE la base sin IVA
- Si no puedes leer algún dato, usa null
- La fecha debe estar en formato YYYY-MM-DD`

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'API key no configurada' }, { status: 500 })

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })

    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'El archivo no puede superar 10MB' }, { status: 400 })
    }

    // Convertir a base64
    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    // Determinar tipo MIME
    const mimeType = file.type || 'image/jpeg'
    const isImage = mimeType.startsWith('image/')
    const isPDF   = mimeType === 'application/pdf'

    if (!isImage && !isPDF) {
      return NextResponse.json({ error: 'Solo se aceptan imágenes y PDFs' }, { status: 400 })
    }

    // Construir el mensaje para Gemini Vision
    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              inline_data: {
                mime_type: mimeType,
                data: base64,
              },
            },
            {
              text: SYSTEM_PROMPT,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1, // baja temperatura para más precisión
        maxOutputTokens: 1024,
      },
    }

    // Intentar con gemini-2.0-flash-exp que soporta visión mejor
    const modelsToTry = ['gemini-2.0-flash', 'gemma-3-27b-it']
    let rawText = ''
    let lastError = ''

    for (const model of modelsToTry) {
      const response = await fetch(
        `${GEMINI_API_URL}/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      )

      if (response.ok) {
        const data = await response.json()
        rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
        if (rawText) break
      } else {
        lastError = await response.text()
      }
    }

    if (!rawText) {
      throw new Error(`Error en la IA: ${lastError}`)
    }

    // Limpiar y parsear JSON
    let cleaned = rawText.trim()
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (jsonMatch) cleaned = jsonMatch[0]

    const parsed = JSON.parse(cleaned)

    // Validar y normalizar
    const today = new Date().toISOString().split('T')[0]
    const amount   = parseFloat(parsed.amount) || 0
    const taxRate  = parseFloat(parsed.tax_rate) ?? 21
    const taxAmount = parseFloat(parsed.tax_amount) || amount * (taxRate / 100)
    const total    = parseFloat(parsed.total) || amount + taxAmount

    const result = {
      description:  parsed.description || 'Gasto escaneado',
      provider:     parsed.provider || null,
      date:         parsed.date || today,
      amount:       Math.round(amount * 100) / 100,
      tax_rate:     taxRate,
      tax_amount:   Math.round(taxAmount * 100) / 100,
      total:        Math.round(total * 100) / 100,
      category:     parsed.category || 'otros',
      invoice_ref:  parsed.invoice_ref || null,
      confidence:   parsed.confidence || 'media',
    }

    return NextResponse.json(result)

  } catch (err) {
    console.error('Error escaneando ticket:', err)
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}