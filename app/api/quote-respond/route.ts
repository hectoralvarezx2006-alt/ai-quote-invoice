import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { sendResponseNotification } from '@/services/email'

// Usamos service role para poder actualizar sin RLS
function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
}

export async function POST(request: NextRequest) {
  try {
    const { token, response } = await request.json()

    if (!token || !['accepted', 'rejected'].includes(response)) {
      return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Buscar presupuesto por token público
    const { data: quote, error: qError } = await supabase
      .from('quotes')
      .select('*, quote_items(*)')
      .eq('public_token', token)
      .single()

    if (qError || !quote) {
      return NextResponse.json({ error: 'Presupuesto no encontrado' }, { status: 404 })
    }

    // Actualizar estado
    const { error: updateError } = await supabase
      .from('quotes')
      .update({ status: response, updated_at: new Date().toISOString() })
      .eq('public_token', token)

    if (updateError) throw updateError

    // Notificar al emisor
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', quote.user_id)
      .single()

    const quoteWithItems = { ...quote, items: quote.quote_items ?? [] }
    await sendResponseNotification(quoteWithItems as any, profile, response)

    return NextResponse.json({ ok: true, status: response })
  } catch (err) {
    console.error('Error procesando respuesta:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
