import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
}

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token')
    if (!token) return NextResponse.json({ error: 'Token requerido' }, { status: 400 })

    const supabase = createServiceClient()

    const { data: quote, error } = await supabase
      .from('quotes')
      .select('*, quote_items(*)')
      .eq('public_token', token)
      .single()

    if (error || !quote) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('company_name, email, phone, nif, address, city, logo_url, brand_color, iban, website')
      .eq('id', quote.user_id)
      .single()

    const quoteWithItems = { ...quote, items: quote.quote_items ?? [] }

    return NextResponse.json({ quote: quoteWithItems, profile })
  } catch (err) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
