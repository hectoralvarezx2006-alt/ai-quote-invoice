import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateQuote } from '@/services/ai'
import type { GenerateQuoteParams } from '@/types'

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await request.json() as GenerateQuoteParams

    if (!body.jobDescription || !body.clientType) {
      return NextResponse.json(
        { error: 'Se requiere descripción del trabajo y tipo de cliente' },
        { status: 400 }
      )
    }

    const result = await generateQuote(body)
    return NextResponse.json(result)

  } catch (error) {
    console.error('Error generando presupuesto:', error)
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
