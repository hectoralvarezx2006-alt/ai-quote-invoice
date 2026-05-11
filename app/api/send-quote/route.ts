import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendQuoteToClient } from '@/services/email'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { quoteId } = await request.json()
    if (!quoteId) return NextResponse.json({ error: 'quoteId requerido' }, { status: 400 })

    // Cargar presupuesto con items
    const { data: quote, error: qError } = await supabase
      .from('quotes')
      .select('*, quote_items(*)')
      .eq('id', quoteId)
      .eq('user_id', user.id)
      .single()

    if (qError || !quote) return NextResponse.json({ error: 'Presupuesto no encontrado' }, { status: 404 })
    if (!quote.client_email) return NextResponse.json({ error: 'El presupuesto no tiene email de cliente' }, { status: 400 })

    // Cargar perfil del usuario
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    // Asegurarse de que tiene token público
    if (!quote.public_token) {
      const token = crypto.randomUUID()
      await supabase.from('quotes').update({ public_token: token }).eq('id', quoteId)
      quote.public_token = token
    }

    const quoteWithItems = { ...quote, items: quote.quote_items ?? [] }

    await sendQuoteToClient(quoteWithItems as any, profile)

    // Actualizar estado a "sent"
    await supabase
      .from('quotes')
      .update({ status: 'sent', updated_at: new Date().toISOString() })
      .eq('id', quoteId)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Error enviando email:', err)
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
